import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  useTransition,
} from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx-js-style";

/**
 * GoogleSheetTable — Light UI + Add Shade Dialog + Enter-as-Tab + Refresh-on-Save
 *                      + Axes Union (sheet ⊔ saved) so manual shades persist
 */
// Add these utility functions before your GoogleSheetTable component
const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // Don't retry on client errors (4xx), only on server errors (5xx) and network issues
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error;
    }
    
    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries - 1) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

const indexToCol = (index) => {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const splitMulti = (val) => {
  if (!val) return [];
  const parts = String(val)
    .split(/[,\/|]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
};

const uniq = (arr) => {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const k = String(v).trim().toLowerCase();
    if (!k) continue;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return out;
};
export default function GoogleSheetTable() {
  // ---- Config ----
  const apiKey = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
  const spreadsheetId = "1fKSwGBIpzWEFk566WRQ4bzQ0anJlmasoY8TwrTLQHXI";
  const sheetName = "JobOrder";
  const headerRange = `${sheetName}!A1:W1`;
  const rowRangePrefix = `${sheetName}!A`;

  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxTvtHG8PvIO7joStX6htOoyeQ8l0V1ItzZEEWhNFLxbXyU22KEUCD3rE8Q2TtW7verzQ/exec";
const [retryCount, setRetryCount] = useState(0);
  // ---- Server calls ----
  async function saveMatrixExpanded({ meta, sizes, shades, cutting, cells }) {
    const payload = JSON.stringify({ meta, sizes, shades, cutting, cells });

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      keepalive: true,
      body: new URLSearchParams({ payload }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Save failed");
    return json;
  }

  async function loadLatestMatrixBlock(lotNumber) {
    const url = `${APPS_SCRIPT_URL}?lot=${encodeURIComponent(lotNumber)}`;
    const res = await fetch(url, { method: "GET", keepalive: true });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Load failed");
    return json;
  }

  function mergeSavedIntoCurrentAxes({ currentSizes, currentShades, saved }) {
    const nextCutting = {};
    for (const sh of currentShades) {
      nextCutting[sh] = (saved.cutting && saved.cutting[sh]) ?? "";
    }
    const nextCells = {};
    for (const sh of currentShades) {
      for (const sz of currentSizes) {
        const key = `${sh}|${sz}`;
        nextCells[key] = (saved.cells && saved.cells[key]) ?? "";
      }
    }
    return { nextCutting, nextCells };
  }

  // ---- State ----
  const [lot, setLot] = useState("");
  const [headers, setHeaders] = useState([]);
  const [row, setRow] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [shades, setShades] = useState([]);
  const [cutting, setCutting] = useState({});
  const [cells, setCells] = useState({});
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null); // {type,text}

  const lotInputRef = useRef(null);
  const navigate = useNavigate();

  const headerCacheRef = useRef(null);
  const activeSearchAbortRef = useRef(null);

  const [, startTransition] = useTransition();

  const [meta, setMeta] = useState({
    fabric: "",
    garmentType: "",
    lotNumber: "",
    style: "",
    brand: "",
  });

  // ---- Debounced update helpers ----
  const debouncersRef = useRef(new Map());
  const debounce = (key, fn, delay = 120) => {
    const map = debouncersRef.current;
    if (map.has(key)) clearTimeout(map.get(key));
    const t = setTimeout(fn, delay);
    map.set(key, t);
  };

  const clearAll = (focus = true) => {
    setLot("");
    setRow([]);
    setSizes([]);
    setShades([]);
    setCutting({});
    setCells({});
    setMeta({ fabric: "", garmentType: "", lotNumber: "", style: "", brand: "" });
    setError(null);
    if (focus) setTimeout(() => lotInputRef.current?.focus(), 0);
  };

  const indexToCol = (index) => {
    let n = index + 1;
    let s = "";
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };

  // Safe back navigation
  const handleBackSafe = useCallback(() => {
    const canGoBack =
      (window.history && typeof window.history.length === "number" && window.history.length > 1) ||
      (window.history && window.history.state && typeof window.history.state.idx === "number" && window.history.state.idx > 0);

    if (canGoBack) navigate(-1);
    else navigate("/", { replace: true });
  }, [navigate]);

  const handleView = () => navigate("/details");

  const splitMulti = (val) => {
    if (!val) return [];
    const parts = String(val)
      .split(/[,\/|]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    const seen = new Set();
    const out = [];
    for (const p of parts) {
      const k = p.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(p);
      }
    }
    return out;
  };

  const uniq = (arr) => {
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      const k = String(v).trim().toLowerCase();
      if (!k) continue;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(v);
      }
    }
    return out;
  };

  // ---- Search (with header caching + abort control) ----
const search = useCallback(async (isRetry = false) => {
  setNotice(null);
  setError(null);
  setRow([]);
  setSizes([]);
  setShades([]);
  setCutting({});
  setCells({});
  setMeta({ fabric: "", garmentType: "", lotNumber: "", style: "", brand: "" });

  if (activeSearchAbortRef.current) activeSearchAbortRef.current.abort();
  const abortController = new AbortController();
  activeSearchAbortRef.current = abortController;

  setLoading(true);
  try {
    const lotQuery = lot.trim();
    if (!lotQuery) {
      setLoading(false);
      setError("Enter a Lot Number to search.");
      return;
    }

    // Cache key for fallback
    const cacheKey = `sheets-cache-${spreadsheetId}-${sheetName}-${lotQuery}`;

    // 1) Headers (cache with retry)
    let headerVals = headerCacheRef.current;
    if (!headerVals) {
      const headerURL = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        headerRange
      )}?key=${apiKey}`;
      
      const headRes = await fetchWithRetry(headerURL, { 
        signal: abortController.signal 
      }, 3);
      
      if (!headRes.ok) throw new Error(`Header HTTP ${headRes.status}`);
      const headJson = await headRes.json();
      headerVals = headJson?.values?.[0] || [];
      if (!headerVals.length) throw new Error("Header row is empty.");
      headerCacheRef.current = headerVals;
      setHeaders(headerVals);
    } else if (headers.length === 0) {
      setHeaders(headerVals);
    }

    const norm = (x) => String(x || "").trim().toLowerCase();
    const findCol = (names) => headerVals.findIndex((h) => names.includes(norm(h)));

    const lotColIndex = findCol(["lot number", "lot no", "lot no.", "lot"]);
    const sizeColIndex = findCol(["sizes", "size"]);
    const shadeColIndex = findCol(["shade", "shades", "color", "colour"]);
    const fabricColIndex = findCol(["fabric type", "fabric", "fabric_name"]);
    const garmentColIndex = findCol(["item", "garment type", "garment", "product"]);
    const styleColIndex = findCol(["style", "style no", "style no."]);
    const brandColIndex = findCol(["brand", "buyer", "customer", "client"]);

    if (lotColIndex === -1) throw new Error('Couldn\'t find "Lot Number" column.');
    if (sizeColIndex === -1) throw new Error('Couldn\'t find "Size" column.');
    if (shadeColIndex === -1) throw new Error('Couldn\'t find "Shade" column.');

    // 2) Find row by lot with retry
    const lotColLetter = indexToCol(lotColIndex);
    const colRange = `${sheetName}!${lotColLetter}2:${lotColLetter}`;
    const colURL = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      colRange
    )}?valueRenderOption=UNFORMATTED_VALUE&key=${apiKey}`;
    
    const colRes = await fetchWithRetry(colURL, { 
      signal: abortController.signal 
    }, 2);
    
    if (!colRes.ok) throw new Error(`Column HTTP ${colRes.status}`);
    const colJson = await colRes.json();
    const colValues = (colJson?.values || []).map((a) => a?.[0] ?? "");

    let matchedRowNumber = null;
    const isNum = !Number.isNaN(Number(lotQuery));
    for (let i = 0; i < colValues.length; i++) {
      const v = colValues[i];
      const rn = i + 2;
      const sMatch = String(v).trim().toLowerCase() === lotQuery.toLowerCase();
      const nMatch = isNum && Number(v) === Number(lotQuery);
      if (sMatch || nMatch) {
        matchedRowNumber = rn;
        break;
      }
    }
    if (!matchedRowNumber) throw new Error("No matching row found for that Lot Number.");

    // 3) Fetch matched row with retry
    const rowRange = `${rowRangePrefix}${matchedRowNumber}:W${matchedRowNumber}`;
    const rowURL = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      rowRange
    )}?valueRenderOption=UNFORMATTED_VALUE&key=${apiKey}`;
    
    const rowRes = await fetchWithRetry(rowURL, { 
      signal: abortController.signal 
    }, 2);
    
    if (!rowRes.ok) throw new Error(`Row HTTP ${rowRes.status}`);
    const rowJson = await rowRes.json();
    const theRow = rowJson?.values?.[0] || [];
    setRow(theRow);

    // 4) Parse axes from sheet row
    const parsedSizes = splitMulti(theRow[sizeColIndex] ?? "");
    const parsedShades = splitMulti(theRow[shadeColIndex] ?? "");

    // 5) Meta
    const fabricVal = fabricColIndex !== -1 ? theRow[fabricColIndex] ?? "" : "";
    const garmentVal = garmentColIndex !== -1 ? theRow[garmentColIndex] ?? "" : "";
    const styleVal = styleColIndex !== -1 ? theRow[styleColIndex] ?? "" : "";
    const brandVal = brandColIndex !== -1 ? theRow[brandColIndex] ?? "" : "";
    const lotVal = theRow[lotColIndex] ?? lotQuery;
    const baseMeta = {
      fabric: String(fabricVal || ""),
      garmentType: String(garmentVal || ""),
      lotNumber: String(lotVal || ""),
      style: String(styleVal || ""),
      brand: String(brandVal || ""),
    };
    setMeta(baseMeta);

    // 6) Try to hydrate last saved and UNION axes (sheet ⊔ saved) so manual shades persist
    let finalShades = parsedShades.slice();
    let finalSizes = parsedSizes.slice();
    let prefillCutting = {};
    let prefillCells = {};

    try {
      const loadRes = await loadLatestMatrixBlock(String(lotVal));

      if (loadRes && loadRes.ok) {
        // Prefer explicit arrays if script returns them; otherwise derive from keys
        const savedShades =
          (Array.isArray(loadRes.shades) && loadRes.shades) ||
          (loadRes.cutting ? Object.keys(loadRes.cutting) : []) ||
          [];
        const savedSizes =
          (Array.isArray(loadRes.sizes) && loadRes.sizes) ||
          (loadRes.cells
            ? uniq(
                Object.keys(loadRes.cells).map((k) => String(k).split("|")[1] ?? "").filter(Boolean)
              )
            : []) ||
          [];

        finalShades = uniq([...parsedShades, ...savedShades]);
        finalSizes = uniq([...parsedSizes, ...savedSizes]);

        // Fill from saved where possible
        if (loadRes.cutting) prefillCutting = { ...loadRes.cutting };
        if (loadRes.cells) prefillCells = { ...loadRes.cells };

        // enrich meta from saved if missing
        setMeta((prev) => ({
          fabric: prev.fabric || loadRes.meta?.fabric || "",
          garmentType: prev.garmentType || loadRes.meta?.garmentType || "",
          lotNumber: prev.lotNumber || loadRes.meta?.lotNumber || String(lotVal) || "",
          style: prev.style || loadRes.meta?.style || "",
          brand: prev.brand || loadRes.meta?.brand || "",
        }));
      }
    } catch (e) {
      console.warn("Previous matrix load failed:", e);
    }

    // 7) Initialize state using FINAL axes (union), prefilling with saved values where available
    const initCut = {};
    const initCells = {};
    for (const sh of finalShades) initCut[sh] = String(prefillCutting[sh] ?? "");
    for (const sh of finalShades)
      for (const sz of finalSizes) {
        const k = `${sh}|${sz}`;
        initCells[k] = String(prefillCells[k] ?? "");
      }

    startTransition(() => {
      setSizes(finalSizes);
      setShades(finalShades);
      setCutting(initCut);
      setCells(initCells);
    });

    // Cache successful response
    try {
      const cacheData = {
        headers: headerVals,
        row: theRow,
        sizes: finalSizes,
        shades: finalShades,
        meta: baseMeta,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (e) {
      console.warn('Failed to cache data:', e);
    }

  } catch (e) {
    if (e?.name === "AbortError") {
      return;
    }

    // Try to use cached data as fallback for server errors
    const cacheKey = `sheets-cache-${spreadsheetId}-${sheetName}-${lot.trim()}`;
    if ((e.message?.includes('HTTP 500') || e.message?.includes('Failed to fetch')) && !isRetry) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cacheData = JSON.parse(cached);
          // Use cache if it's less than 10 minutes old
          if (Date.now() - cacheData.timestamp < 10 * 60 * 1000) {
            setHeaders(cacheData.headers);
            setRow(cacheData.row);
            setSizes(cacheData.sizes);
            setShades(cacheData.shades);
            setMeta(cacheData.meta);
            setError("Using cached data (temporary server issue)");
            setLoading(false);
            return;
          }
        }
      } catch (cacheError) {
        console.warn('Cache read failed:', cacheError);
      }

      // Auto-retry once after 2 seconds
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        search(true);
      }, 2000);
      setError("Temporary server issue, retrying...");
      return;
    }

    // User-friendly error messages
    if (e.message?.includes('HTTP 500')) {
      setError("Google Sheets is temporarily unavailable. Please try again in a moment.");
    } else if (e.message?.includes('HTTP 403')) {
      setError("Access denied. Please check if the spreadsheet is shared properly.");
    } else if (e.message?.includes('HTTP 404')) {
      setError("Spreadsheet not found. Please check the spreadsheet ID.");
    } else if (e.message?.includes('Failed to fetch')) {
      setError("Network connection issue. Please check your internet connection.");
    } else {
      setError(e?.message || "Something went wrong while searching.");
    }
    
    console.error("Search error:", e);
  } finally {
    if (!abortController.signal.aborted) setLoading(false);
  }
}, [apiKey, headerRange, rowRangePrefix, sheetName, spreadsheetId, lot, headers.length]);

  // ---- Updaters (debounced) ----
  const setCut = (shade, val) => {
    debounce(`cut-${shade}`, () => {
      setCutting((p) => (p[shade] === val ? p : { ...p, [shade]: val }));
    });
  };
  const setCell = (shade, size, val) => {
    const key = `${shade}|${size}`;
    debounce(`cell-${key}`, () => {
      setCells((p) => (p[key] === val ? p : { ...p, [key]: val }));
    });
  };

  // ---- Totals ----
  const num = (v) => {
    const n = Number(String(v ?? "").trim());
    return Number.isFinite(n) ? n : 0;
  };
  const rowTotal = useCallback(
    (shade) => sizes.reduce((a, s) => a + num(cells[`${shade}|${s}`]), 0),
    [sizes, cells]
  );
  const colTotal = useCallback(
    (size) => shades.reduce((a, sh) => a + num(cells[`${sh}|${size}`]), 0),
    [shades, cells]
  );
  const grandTotal = useCallback(
    () => shades.reduce((a, sh) => a + rowTotal(sh), 0),
    [shades, rowTotal]
  );

  const minTableWidth = useMemo(() => Math.max(900, (sizes.length + 3) * 140), [sizes.length]);

  // ---- Save Matrix (refresh page on success) ----
  const handleSave = async () => {
    try {
      if (!meta.lotNumber) {
        setNotice({ type: "error", text: "Search a lot first." });
        return;
      }
      if (!sizes.length || !shades.length) {
        setNotice({ type: "error", text: "Nothing to save." });
        return;
      }
      setNotice(null);
      setSaving(true);
      await saveMatrixExpanded({ meta, sizes, shades, cutting, cells });
      setNotice({ type: "success", text: "Saved! Refreshing…" });
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", text: `Save failed: ${String(err?.message || err)}` });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // ---- Excel Export (save first, then download) ----
  const handleExport = async () => {
    try {
      if (!meta.lotNumber) {
        alert("Lot Number is required to name the worksheet/file.");
        return;
      }
      if (!meta.brand) {
        alert("Brand is required before exporting to Excel.");
        return;
      }
      if (!sizes.length || !shades.length) {
        alert("Nothing to export — load a lot and enter some data first.");
        return;
      }
      const ok = window.confirm(
        "Before downloading, we need to store the current matrix to Google Sheets.\n\nProceed to save and then download?"
      );
      if (!ok) return;
      setExporting(true);
      await saveMatrixExpanded({ meta, sizes, shades, cutting, cells });
      downloadExcelInner();
    } catch (err) {
      console.error(err);
      alert(`Save failed: ${String(err?.message || err)}\n\nExcel will not be downloaded.`);
    } finally {
      setExporting(false);
    }
  };

  // ---- Add Shade Dialog ----
  const tableScrollRef = useRef(null);
  const [showShadeDialog, setShowShadeDialog] = useState(false);
  const [newShade, setNewShade] = useState("");

  const openAddShade = () => {
    setNewShade("");
    setShowShadeDialog(true);
    setTimeout(() => {
      const el = document.getElementById("shadeNameInput");
      el?.focus();
      el?.select?.();
    }, 0);
  };
  const closeAddShade = () => setShowShadeDialog(false);

  const confirmAddShade = (e) => {
    e?.preventDefault?.();
    const shadeName = (newShade || "").trim();
    if (!shadeName) {
      setNotice({ type: "error", text: "Shade name cannot be empty." });
      setTimeout(() => setNotice(null), 2200);
      return;
    }
    const exists = shades.some((s) => s.toLowerCase() === shadeName.toLowerCase());
    if (exists) {
      setNotice({ type: "error", text: `Shade "${shadeName}" already exists.` });
      setTimeout(() => setNotice(null), 2200);
      return;
    }

    setShades((prev) => [...prev, shadeName]);
    setCutting((prev) => ({ ...prev, [shadeName]: "" }));
    setCells((prev) => {
      const next = { ...prev };
      for (const sz of sizes) next[`${shadeName}|${sz}`] = "";
      return next;
    });

    setShowShadeDialog(false);
    setNotice({ type: "success", text: `Added shade "${shadeName}".` });
    setTimeout(() => setNotice(null), 1600);
    requestAnimationFrame(() => {
      const el = tableScrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  // ---- Enter-as-Tab across matrix inputs ----
  const handleEnterNav = useCallback((e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const inputs = document.querySelectorAll(".matrix-input");
    const list = Array.from(inputs);
    const i = list.indexOf(e.currentTarget);
    if (i === -1) return;

    const next = e.shiftKey ? i - 1 : i + 1;
    if (next >= 0 && next < list.length) {
      list[next].focus();
      if (list[next].select) list[next].select();
    } else {
      document.getElementById("saveBtn")?.focus();
    }
  }, []);

  // ---- Excel builder ----
  const downloadExcelInner = () => {
    const title = `Cutting Matrix — Lot ${meta.lotNumber}`;
    const tableHeader = ["Color", "Cutting Table", ...sizes, "Total Pcs"];
    const rows2D = shades.map((shade) => {
      const perSizes = sizes.map((sz) => {
        const v = String(cells[`${shade}|${sz}`] ?? "").trim();
        const n = Number(v);
        return Number.isFinite(n) ? n : v;
      });
      const total = perSizes.reduce((a, v) => a + (Number(v) || 0), 0);
      return [shade, cutting[shade] ?? "", ...perSizes, total];
    });
    const colTotals = sizes.map((sz) =>
      shades.reduce((a, sh) => a + (Number(String(cells[`${sh}|${sz}`] ?? "").trim()) || 0), 0)
    );
    const grand = colTotals.reduce((a, v) => a + v, 0);
    const footer = ["Total", "", ...colTotals, grand];
    const metaRow1 = ["Lot Number:", meta.lotNumber || "", "Style:", meta.style || "", "Brand:", meta.brand || ""];
    const metaRow2 = ["Fabric:", meta.fabric || "", "Garment Type:", meta.garmentType || ""];

    const startOfTableRowIndex = 5;
    const data2D = [[title], [], metaRow1, metaRow2, [], tableHeader, ...rows2D, footer];

    const ws = XLSX.utils.aoa_to_sheet(data2D);
    const totalCols = tableHeader.length;
       const lastColIdx = totalCols - 1;
    const lastColLetter = XLSX.utils.encode_col(lastColIdx);

    ws["!merges"] = ws["!merges"] || [];
    ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } });
    const sizeCols = sizes.map(() => ({ wch: 8 }));
    ws["!cols"] = [{ wch: 20 }, { wch: 18 }, ...sizeCols, { wch: 12 }];

    const firstDataRowExcel = startOfTableRowIndex + 1;
    const lastRowExcel = data2D.length;
    ws["!autofilter"] = { ref: `A${firstDataRowExcel}:${lastColLetter}${lastRowExcel}` };

    const setStyle = (r, c, style) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: "" };
      ws[ref].s = { ...(ws[ref].s || {}), ...style };
    };
    const addBorderToRange = (r1, c1, r2, c2) => {
      const border = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      };
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!ws[ref]) ws[ref] = { t: "s", v: "" };
          ws[ref].s = { ...(ws[ref].s || {}), border };
        }
      }
    };

    setStyle(0, 0, {
      font: { bold: true, sz: 16, color: { rgb: "111827" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "E5E7EB" } },
    });

    const metaLabelStyle = { font: { bold: true }, alignment: { horizontal: "left" } };
    const metaValueStyle = { alignment: { horizontal: "left" } };
    [[2, 0], [2, 2], [2, 4], [3, 0], [3, 2]].forEach(([r, c]) => setStyle(r, c, metaLabelStyle));
    [[2, 1], [2, 3], [2, 5], [3, 1], [3, 3]].forEach(([r, c]) => setStyle(r, c, metaValueStyle));
    addBorderToRange(2, 0, 3, 5);

    for (let c = 0; c <= lastColIdx; c++) {
      setStyle(startOfTableRowIndex, c, {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: { rgb: "2563EB" } },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      });
    }

    const dataStartR = startOfTableRowIndex + 1;
    const dataEndR = data2D.length - 2;
    for (let r = dataStartR; r <= dataEndR; r++) {
      const isAlt = (r - dataStartR) % 2 === 1;
      for (let c = 0; c <= lastColIdx; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) continue;
        ws[ref].s = {
          ...(ws[ref].s || {}),
          alignment: { horizontal: c >= 2 ? "center" : c === 1 ? "center" : "left", vertical: "center" },
          fill: isAlt ? { fgColor: { rgb: "F8FAFC" } } : undefined,
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
          ...(c >= 2 ? { numFmt: "0" } : {})
        };
      }
    }

    const footerR = data2D.length - 1;
    for (let c = 0; c <= lastColIdx; c++) {
      setStyle(footerR, c, {
        font: { bold: true, color: { rgb: "111827" } },
        alignment: { horizontal: c >= 2 ? "center" : "left", vertical: "center" },
        fill: { fgColor: { rgb: "DCFCE7" } },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
        ...(c >= 2 ? { numFmt: "0" } : {}),
      });
    }
    addBorderToRange(startOfTableRowIndex, 0, footerR, lastColIdx);

    const wb = XLSX.utils.book_new();
    const safeName = String(meta.lotNumber).replace(/[\\/*?:\\[\]]/g, "_").slice(0, 31) || "Sheet1";
    XLSX.utils.book_append_sheet(wb, ws, safeName);
    XLSX.writeFile(wb, `CuttingMatrix_${safeName}.xlsx`);
  };

  // ---- Simple Row Virtualization ----
  const VIRT_THRESHOLD = 120;
  const ROW_HEIGHT = 56;
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    const onResize = () => setViewportH(el.clientHeight);
    onResize();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [tableScrollRef, shades.length]);

  const useVirtual = shades.length > VIRT_THRESHOLD;
  const headerRows = 1;
  const footerRows = 1;
  const totalDataRows = shades.length;
  const startIdx = useMemo(() => {
    if (!useVirtual) return 0;
    const approx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 10);
    return Math.min(approx, totalDataRows - 1);
  }, [scrollTop, useVirtual, totalDataRows]);

  const visibleCount = useMemo(() => {
    if (!useVirtual) return totalDataRows;
    const rowsVisible = Math.ceil((viewportH || 600) / ROW_HEIGHT) + 20;
    return Math.min(rowsVisible, totalDataRows - startIdx);
  }, [viewportH, useVirtual, totalDataRows, startIdx]);

  const endIdx = startIdx + visibleCount;

  // ---- UI ----
  return (
    <div className="app">
      <style>{`
        :root{
          --bg: #ffffffff;
          --card: #FFFFFF;
          --muted: #64748B;
          --text: #0F172A;
          --brand: #2563EB;
          --brand-2:#1D4ED8;
          --accent:#16A34A;
          --warning:#F59E0B;
          --danger:#EF4444;
          --ring: 0 0 0 3px rgba(37,99,235,.2);
          --shadow: 0 8px 30px rgba(2,6,23,.08);
          --border: rgba(15,23,42,.10);
        }
        *{box-sizing:border-box}
        body{background:var(--bg)}
        .app{min-height:100vh;color:var(--text);padding:12px}
        .container{max-width: 1400px; margin:0 auto}

        /* Header */
        .modern-header{
          background: linear-gradient(180deg, #FFFFFF, #F1F5F9);
          border:1px solid var(--border);
          border-radius:16px; padding:22px 24px; margin-bottom:18px;
          box-shadow: var(--shadow);
        }
        .header-content{display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap}
        .title{font-size:28px; font-weight:800; letter-spacing:-.01em; display:flex; gap:10px; align-items:center}
        .subtitle{color:var(--muted); margin-top:2px}

        /* Inputs & Buttons */
        .input-container{position:relative; min-width:280px}
        .search-input{
          width:100%; padding:12px 44px; border-radius:12px;
          border:1px solid var(--border); background:#FFFFFF;
          color:var(--text); outline: none; transition:.2s ease;
          box-shadow: inset 0 0 0 1px rgba(2,6,23,.02);
        }
        .search-input:focus{box-shadow: var(--ring); border-color: rgba(37,99,235,.35)}
        .search-icon{position:absolute; left:12px; top:50%; transform:translateY(-50%); opacity:.65}
        .search-hint{
          position:absolute; right:12px; top:50%; transform:translateY(-50%);
          font-size:12px; color:#475569; background:#EEF2FF; border:1px solid #DBEAFE;
          padding:3px 8px; border-radius:8px; font-weight:700
        }
        .btn{
          display:inline-flex; align-items:center; gap:8px; border-radius:12px; padding:12px 16px;
          font-weight:700; cursor:pointer; border:1px solid var(--border); transition:.2s ease; white-space:nowrap;
          background:#fff;
        }
        .btn-primary{background:var(--brand); color:white; border-color:transparent}
        .btn-primary:hover{background:var(--brand-2); box-shadow: var(--ring)}
        .btn:hover{border-color: rgba(37,99,235,.35)}
        .btn:disabled{opacity:.5; cursor:not-allowed}
        .ring{width:18px; height:18px; border-radius:50%; background:
          conic-gradient(from 0deg, var(--brand), #7C3AED, #EC4899, #F59E0B, var(--brand));
          animation: spin 1s linear infinite; -webkit-mask: radial-gradient(farthest-side, #0000 calc(100% - 3px), #000 0);
                  mask: radial-gradient(farthest-side, #0000 calc(100% - 3px), #000 0);
        }
        @keyframes spin{to{transform:rotate(360deg)}}

        /* Cards */
        .main-content{
          background: #FFFFFF;
          border:1px solid var(--border); border-radius:16px; padding:22px; box-shadow:var(--shadow);
        }

        /* Notices */
        .error-message, .notice{
          border-radius:12px; padding:12px 14px; margin:10px 0; font-weight:700; display:flex; gap:10px; align-items:center;
          border:1px solid;
        }
        .error-message{background: #FEF2F2; color:#991B1B; border-color: #FCA5A5}
        .notice{background: #ECFDF5; color:#065F46; border-color: #A7F3D0}
        .notice.error{background: #FEF2F2; color:#991B1B; border-color: #FCA5A5}

        /* Meta */
        .meta-container{display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin-top:14px}
        .meta-item{background: #F8FAFC; border:1px solid var(--border); border-radius:12px; padding:12px}
        .meta-label{color:var(--muted); font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.06em}
        .meta-value{font-size:16px; font-weight:700; margin-top:4px}

        /* Table */
        .table-container{margin-top:18px; background: #FFFFFF; border:1px solid var(--border); border-radius:14px; overflow:hidden}
        .table-scroll{overflow:auto; max-height: 70vh; will-change: transform}
        .data-table{width:100%; border-collapse: separate; border-spacing: 0; min-width: ${minTableWidth}px}
        thead th{
          position: sticky; top:0; background: linear-gradient(180deg, #2563EB, #1D4ED8);
          color:white; font-size:13px; text-transform:uppercase; letter-spacing:.06em; font-weight:800;
          padding:14px 12px; border-bottom:1px solid rgba(0,0,0,.06); z-index:2;
        }
        tbody td{padding:12px 10px; border-bottom:1px solid rgba(0,0,0,.06)}
        tbody tr:nth-child(even){background: #F8FAFC}
        tbody tr:hover{background: #EFF6FF}
        .shade-cell{font-weight:800}
        .cell-input{
          width:100%; padding:10px; border-radius:8px; background: #FFFFFF; color:var(--text);
          border:1px solid var(--border); outline:none; text-align:center; transition:.15s ease;
        }
        .cell-input:focus{box-shadow: var(--ring); border-color: rgba(37,99,235,.35)}
        .cutting-input{background: #FFFFFF}
        .total-cell{font-weight:900; text-align:right}
        .footer-row td{border-top:2px solid rgba(22,163,74,.5); background: #ECFDF5}

        /* Empty */
        .empty-state{ text-align:center; padding:60px 20px; color:var(--muted) }
        .empty-icon{ font-size:64px; margin-bottom:10px; opacity:.8 }

        /* Loading overlay */
        .loading-overlay{ position:fixed; inset:0; background:rgba(148,163,184,.25);
          display:flex; align-items:center; justify-content:center; z-index:50 }
        .loading-card{ background: #FFFFFF; border:1px solid var(--border); border-radius:14px;
          padding:22px; min-width:300px; display:grid; gap:10px; place-items:center; box-shadow:var(--shadow) }
        .progress{ width:100%; height:8px; border-radius:999px; background: #E2E8F0; overflow:hidden }
        .progress::after{ content:""; display:block; width:40%; height:100%; background: linear-gradient(90deg, #60a5fa, #a78bfa, #60a5fa);
          animation: slide 1.2s ease-in-out infinite; border-radius:999px }
        @keyframes slide{0%{transform: translateX(-50%)} 50%{transform: translateX(140%)} 100%{transform: translateX(-50%)}}

        /* Sticky action bar */
        .action-bar{
          position: sticky; bottom: 0; margin-top: 12px;
          background: #FFFFFF;
          border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; gap:10px; align-items:center;
          justify-content: space-between; box-shadow: var(--shadow);
        }
        .totals{display:flex; gap:12px; align-items:center; color:#334155; font-weight:800}
        .pill{padding:6px 10px; border-radius:999px; background: #EEF2FF; border:1px solid #DBEAFE}

        /* Dialog */
        .dialog-backdrop{
          position:fixed; inset:0; background:rgba(2,6,23,.35);
          display:flex; align-items:center; justify-content:center; z-index:60;
        }
        .dialog-card{
          background:#FFFFFF; border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow);
          width: min(92vw, 420px); padding:18px; display:grid; gap:12px;
        }
        .dialog-title{font-size:18px; font-weight:800}
        .dialog-actions{display:flex; justify-content:flex-end; gap:10px}

        /* Responsive */
        @media (max-width: 768px){
          .header-content{flex-direction:column; align-items:stretch}
          .title{justify-content:center}
        }
      `}</style>

      <div className="container" role="region" aria-label="Cutting Matrix Dashboard">
        {/* Header */}
        <div className="modern-header">
          <div className="header-content">
            <div>
              <h1 className="title">📊 Job Order Management</h1>
              <div className="subtitle">Cutting Matrix Dashboard</div>
            </div>

            <div className="search-section" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div className="input-container">
                <span className="search-icon">🔍</span>
                <input
                  ref={lotInputRef}
                  className="search-input"
                  type="text"
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder="Enter Lot Number..."
                  aria-label="Lot Number"
                />
                <span className="search-hint">Enter</span>
              </div>

              <button onClick={search} disabled={loading || saving} className="btn btn-primary" aria-busy={loading}>
                {loading && <div className="ring" />}
                {loading ? "Searching..." : "Search Lot"}
              </button>

              <button
                onClick={handleExport}
                className="btn btn-primary"
                disabled={exporting || saving || !meta.lotNumber || !sizes.length || !shades.length}
                title={!meta.lotNumber ? "Search a lot first" : ""}
                aria-busy={exporting}
              >
                {exporting && <div className="ring" />}
                {exporting ? "Saving & Downloading..." : "Download Excel"}
              </button>

              {/* <button
                onClick={openAddShade}
                className="btn"
                disabled={saving || loading || exporting}
                title="Add a manual shade row"
              >
                ➕ Add Shade
              </button> */}

              <button
                onClick={handleView}
                className="btn"
                disabled={saving || loading || exporting}
                title="View Details"
              >
                👁️ View
              </button>

              <button
                onClick={() => clearAll(true)}
                className="btn"
                disabled={loading || exporting || saving}
                title="Clear everything"
              >
                🔄 Refresh
              </button>

              <button
                type="button"
                onClick={handleBackSafe}
                className="btn"
                disabled={loading || exporting || saving}
                title="Go back"
                aria-label="Go back"
              >
                ⬅️ Back
              </button>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="main-content" aria-live="polite">
       {error && (
  <div className="error-message" role="alert">
    <span>⚠️</span>
    <div style={{ flex: 1 }}>
      {error}
      {(error.includes('HTTP 500') || error.includes('temporary server issue') || error.includes('retrying')) && (
        <div style={{ fontSize: '14px', marginTop: '4px', opacity: 0.8, fontWeight: 'normal' }}>
          This is usually temporary. The app will automatically retry, or you can try again in a moment.
        </div>
      )}
      {error.includes('cached data') && (
        <div style={{ fontSize: '14px', marginTop: '4px', opacity: 0.8, fontWeight: 'normal' }}>
          Showing last successful data fetch. Some information might be outdated.
        </div>
      )}
    </div>
    {!error.includes('retrying') && !error.includes('cached data') && (
      <button 
        onClick={() => search()} 
        className="btn"
        style={{ marginLeft: '12px', padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
      >
        Retry Search
      </button>
    )}
  </div>
)}

          {notice && (
            <div className={`notice ${notice.type === "error" ? "error" : ""}`} role="status">
              <span>{notice.type === "success" ? "✅" : "⚠️"}</span>
              {notice.text}
            </div>
          )}

          {(meta.fabric || meta.garmentType || meta.lotNumber || meta.style || meta.brand) && (
            <div className="meta-container">
              <div className="meta-item">
                <div className="meta-label">Brand</div>
                <div className="meta-value">{meta.brand || "—"}</div>
              </div>
              <div className="meta-item">
                <div className="meta-label">Fabric</div>
                <div className="meta-value">{meta.fabric || "—"}</div>
              </div>
              <div className="meta-item">
                <div className="meta-label">Garment Type</div>
                <div className="meta-value">{meta.garmentType || "—"}</div>
              </div>
              <div className="meta-item">
                <div className="meta-label">Lot Number</div>
                <div className="meta-value">{meta.lotNumber || "—"}</div>
              </div>
              <div className="meta-item">
                <div className="meta-label">Style</div>
                <div className="meta-value">{meta.style || "—"}</div>
              </div>
            </div>
          )}

          {/* Matrix Table */}
          {shades.length || sizes.length ? (
            <>
              <div className="table-container">
                <div className="table-scroll" ref={tableScrollRef} aria-label="Cutting matrix table">
                  <table className="data-table" role="grid" aria-rowcount={shades.length}>
                    <thead>
                      <tr>
                        <th>🎨 Color</th>
                        <th>✂️ Cutting Table</th>
                        {sizes.map((sz) => (
                          <th key={`h-${sz}`}>{sz}</th>
                        ))}
                        <th>🧮 Total Pcs</th>
                      </tr>
                    </thead>

                    <tbody>
                      {useVirtual && startIdx > 0 && (
                        <tr style={{ height: (startIdx) * ROW_HEIGHT }} aria-hidden="true">
                          <td colSpan={sizes.length + 3} />
                        </tr>
                      )}

                      {(useVirtual ? shades.slice(startIdx, endIdx) : shades).map((shade, idx) => {
                        const actualIndex = useVirtual ? startIdx + idx : idx;
                        return (
                          <tr key={`r-${shade}-${actualIndex}`} style={{ height: ROW_HEIGHT }}>
                            <td className="shade-cell">{shade}</td>
                            <td>
                              <input
                                className="cell-input cutting-input matrix-input"
                                defaultValue={cutting[shade] ?? ""}
                                onChange={(e) => setCut(shade, e.target.value)}
                                onKeyDown={handleEnterNav}
                                placeholder="—"
                                aria-label={`Cutting table for ${shade}`}
                              />
                            </td>
                            {sizes.map((sz) => {
                              const k = `${shade}|${sz}`;
                              return (
                                <td key={`c-${shade}-${sz}`}>
                                  <input
                                    className="cell-input matrix-input"
                                    inputMode="numeric"
                                    defaultValue={cells[k] ?? ""}
                                    onChange={(e) => setCell(shade, sz, e.target.value)}
                                    onKeyDown={handleEnterNav}
                                    aria-label={`Qty ${shade} ${sz}`}
                                  />
                                </td>
                              );
                            })}
                            <td className="total-cell" aria-label={`Row total for ${shade}`}>
                              {rowTotal(shade)}
                            </td>
                          </tr>
                        );
                      })}

                      {useVirtual && endIdx < totalDataRows && (
                        <tr style={{ height: (totalDataRows - endIdx) * ROW_HEIGHT }} aria-hidden="true">
                          <td colSpan={sizes.length + 3} />
                        </tr>
                      )}

                      {(!useVirtual || endIdx >= totalDataRows) && (
                        <tr className="footer-row">
                          <td>📊 Total</td>
                          <td></td>
                          {sizes.map((sz) => (
                            <td key={`tot-${sz}`} className="total-cell">
                              {colTotal(sz)}
                            </td>
                          ))}
                          <td className="total-cell">{grandTotal()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sticky action bar */}
              <div className="action-bar" role="region" aria-label="Actions">
                <div className="totals">
                  <span className="pill">Total Pcs: {grandTotal()}</span>
                  <span className="pill">Colors: {shades.length}</span>
                  <span className="pill">Sizes: {sizes.length}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={openAddShade}
                    className="btn"
                    disabled={saving || loading || exporting}
                    title="Add a manual shade row"
                  >
                    ➕ Add Shade
                  </button>

                  <button
                    id="saveBtn"
                    onClick={handleSave}
                    className="btn btn-primary"
                    disabled={saving || !meta.lotNumber || !sizes.length || !shades.length}
                    title={!meta.lotNumber ? "Search a lot first" : ""}
                    aria-busy={saving}
                  >
                    {saving ? <div className="ring" /> : "💾 Save"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-text" style={{ fontWeight: 800, fontSize: 18 }}>
                No data to display
              </div>
              <div className="empty-subtext" style={{ color: "#64748B" }}>
                Search a Lot Number to load the cutting matrix
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Shade Dialog */}
      {showShadeDialog && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="addShadeTitle">
          <form className="dialog-card" onSubmit={confirmAddShade}>
            <div className="dialog-title" id="addShadeTitle">Add Shade</div>
            <div style={{ display: "grid", gap: 8 }}>
              <label htmlFor="shadeNameInput" style={{ fontWeight: 700, color: "#334155" }}>Shade name</label>
              <input
                id="shadeNameInput"
                className="search-input"
                type="text"
                value={newShade}
                onChange={(e) => setNewShade(e.target.value)}
                placeholder="e.g., NAVY, RED 32, 011"
                aria-required="true"
              />
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={closeAddShade}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add</button>
            </div>
          </form>
        </div>
      )}

      {/* Floating toast */}
      {notice && (
        <div
          className={`notice ${notice.type === "error" ? "error" : ""}`}
          style={{ position: "fixed", top: 16, right: 16, zIndex: 70 }}
          role="status"
          aria-live="polite"
        >
          <span>{notice.type === "success" ? "✅" : "⚠️"}</span>
          <span>{notice.text}</span>
        </div>
      )}

      {/* Loading overlays */}
      {(loading || saving || exporting) && (
        <div className="loading-overlay" role="alert" aria-live="polite" aria-busy="true">
          <div className="loading-card">
            <div className="ring"></div>
            <div style={{ fontWeight: 900 }}>
              {saving ? "Saving matrix..." : exporting ? "Preparing Excel..." : "Searching lot..."}
            </div>
            <div style={{ color: "#475569", fontWeight: 700 }}>
              {saving ? "Uploading to Google Sheets" : exporting ? "Finalizing workbook" : "Fetching from Google Sheets"}
            </div>
            <div className="progress"></div>
          </div>
        </div>
      )}
    </div>
  );
}
