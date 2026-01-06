import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/** ====== set these ====== */
const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const SHEET_ID = "1fKSwGBIpzWEFk566WRQ4bzQ0anJlmasoY8TwrTLQHXI";
const TAB_NAME = "JobOrder";

/** ====== fetching limits ====== */
const INITIAL_LIMIT = 2000;   // first load
const LOAD_MORE_CHUNK = 1000; // "Load more" chunk size

/** ====== sheet columns ====== */
/** ====== sheet columns ====== */
const HEADERS = [
  "Job Order No","Date","Fabric","Brand","Shade","Size","Quantity","Unit",
  "Party Name","Garment Type","Section","Season","Emb","Emb Details",
  "Printing","Printing Details","Pattern","Style","Remarks","Direct Stitching",
  "Submitted By","Image URL","Lot Number","Component","Priority",
  "Tape/Lace", "Bottom Type", "Zip"  // Add these 3 new headers
];
/* ---------- helpers ---------- */
async function loadJsPDF() {
  const mod = await import("jspdf");
  return mod.jsPDF || mod.default;
}
const pause = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function withTimeout(promise, ms = 4000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(""), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); })
           .catch(()  => { clearTimeout(t); resolve(""); });
  });
}

function tryParseDateToISO(s) {
  if (!s) return "";
  const d1 = new Date(s);
  if (!isNaN(d1)) return d1.toISOString();
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]), mm = Number(m[2]),
      yyyy = Number(m[3] < 100 ? 2000 + Number(m[3]) : m[3]);
    const d2 = new Date(yyyy, mm - 1, dd);
    if (!isNaN(d2)) return d2.toISOString();
  }
  return "";
}
function pickDateISO(row) {
  const candidates = [row["Created At (ISO)"], row["Date"]].filter(Boolean);
  for (const s of candidates) {
    const iso = tryParseDateToISO(s);
    if (iso) return iso;
  }
  return "";
}
function normalizePriority(v) {
  const s = String(v || "").trim().toUpperCase();
  if (s.startsWith("H")) return "HIGH";
  if (s.startsWith("M")) return "MEDIUM";
  if (s.startsWith("L")) return "LOW";
  return "";
}
function priorityClass(level) {
  switch (level) {
    case "HIGH": return "jox-prio jox-prio--high";
    case "MEDIUM": return "jox-prio jox-prio--med";
    case "LOW": return "jox-prio jox-prio--low";
    default: return "jox-prio";
  }
}

function formatDateForPdf(input) {
  const iso = tryParseDateToISO(input);
  if (!iso) return input || "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"2-digit" });
}
function getCell(row, idx) {
  if (idx == null) return "";
  return (row[idx] ?? "").toString().trim();
}
function csvCell(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function formatCell(header, value) {
  if (header === "Quantity" && typeof value === "number") {
    return new Intl.NumberFormat().format(value);
  }
  if ((header === "Date" || header === "Created At (ISO)") && value) {
    const d = new Date(value);
    if (!isNaN(d)) return d.toLocaleDateString();
  }
  return value ?? "";
}
function extractDriveFileId(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/file\/d\/([^/]+)/) || u.search.match(/[?&]id=([^&]+)/);
    return m ? m[1] : "";
  } catch { return ""; }
}
function driveUcUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
function getEmbeddableImageSrc(raw) {
  const s = (raw || "").toString().trim();
  if (!s) return "";
  const id = extractDriveFileId(s);
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  return s;
}

/** light image loader for jsPDF (downscale, jpeg) */
async function loadImageAsBase64ForPdf(url, opts = {}) {
  return new Promise((resolve) => {
    try {
      const fileId = extractDriveFileId(url);
      const direct = fileId ? driveUcUrl(fileId) : (url || "").toString().trim();
      if (!direct) return resolve("");

      const clean = direct.replace(/^https?:\/\//, "");
      const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(clean)}`;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          // A4 @ 72dpi: content width ~ 500–520pt; 880px is plenty for print
          const maxW = opts.maxWidth || 880;
          const maxH = opts.maxHeight || 880;
          let { width, height } = img;

          if (width > maxW || height > maxH) {
            const r = Math.min(maxW / width, maxH / height);
            width = Math.max(1, Math.floor(width * r));
            height = Math.max(1, Math.floor(height * r));
          }

          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve("");
              const fr = new FileReader();
              fr.onloadend = () => resolve(fr.result || "");
              fr.readAsDataURL(blob);
            },
            "image/jpeg",
            0.65
          );
        } catch { resolve(""); }
      };
      img.onerror = () => resolve("");
      img.src = proxied;
    } catch { resolve(""); }
  });
}

function parseShades(value) {
  return String(value || "")
    .split(/[,\/&+]|(?:\s{2,})/)
    .map((s) => s.trim())
    .filter(Boolean);
}
function cmpSmart(a, b) {
  const A = String(a ?? "").trim();
  const B = String(b ?? "").trim();
  // try numeric compare if both contain a number
  const nA = Number((A.match(/[\d.]+/) || [""])[0]);
  const nB = Number((B.match(/[\d.]+/) || [""])[0]);
  const bothNum = Number.isFinite(nA) && Number.isFinite(nB);
  if (bothNum) return nA - nB;
  return A.localeCompare(B, undefined, { numeric: true, sensitivity: "base" });
}
function inRange(value, start, end) {
  if (!start && !end) return true;
  if (start && cmpSmart(value, start) < 0) return false;
  if (end && cmpSmart(value, end) > 0) return false;
  return true;
}

/* ========== Main Component (lighter PDF) ========== */
const JobOrders = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // fetch window control
  const [rowLimit, setRowLimit] = useState(INITIAL_LIMIT);
  const [lastRow, setLastRow] = useState(null);

  // UI state
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "Job Order No", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [joStart, setJoStart] = useState("");
const [joEnd, setJoEnd] = useState("");
const [lotStart, setLotStart] = useState("");
const [lotEnd, setLotEnd] = useState("");

  // per-row PDF busy status (stores JO number; null = idle)
  const [pdfBusyId, setPdfBusyId] = useState(null);

  const [fFabric, setFFabric] = useState("");
  const [fBrand, setFBrand] = useState("");
  const [fShade, setFShade] = useState("");
  const [fParty, setFParty] = useState("");
  const [fSeason, setFSeason] = useState("");
  const [fSection, setFSection] = useState("");
  const [fPattern, setFPattern] = useState("");
  const [fLot, setFLot] = useState("");
  const [fUnit, setFUnit] = useState("");
  const [fDS, setFDS] = useState("");
  const [fSubmittedBy, setFSubmittedBy] = useState("");
  const [pdfBatchBusy, setPdfBatchBusy] = useState(null);
  const [fPriority, setFPriority] = useState("");
  const [fTapeLace, setFTapeLace] = useState("");
const [fBottomType, setFBottomType] = useState("");
const [fZip, setFZip] = useState("");
// const [fTapeLace, setFTapeLace] = useState("");
// const [fBottomType, setFBottomType] = useState("");
// const [fZip, setFZip] = useState("");


  const [preview, setPreview] = useState({ open: false, src: "", alt: "" });
const VISIBLE_HEADERS = [
  "Job Order No","Date","Party Name","Fabric","Shade","Quantity","Unit","Lot Number",
  "Priority"
  // You can add the new headers here if you want them visible in the main table
  // "Tape/Lace","Bottom Type","Zip"
];

  const DETAIL_HEADERS = HEADERS.filter((h) => !VISIBLE_HEADERS.includes(h));
  const [expanded, setExpanded] = useState(() => new Set());

  /** ====== fetch only REAL rows ====== */
  async function getLastPopulatedRow(signal) {
    const probe = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(
      TAB_NAME
    )}!A:A?majorDimension=ROWS&key=${API_KEY}`;
    const r = await fetch(probe, { signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return j.values?.length || 1;
  }

  const fetchData = async ({ isRefresh = false, signal } = {}) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError("");

      const last = await getLastPopulatedRow(signal);
      setLastRow(last);
      const upto = Math.min(last, rowLimit);

const range = `${encodeURIComponent(TAB_NAME)}!A1:AO${upto}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const values = data.values || [];
      if (values.length === 0) throw new Error("No data found.");
      const headerRow = values[0].map((h) => (h || "").trim());
      const body = values.slice(1);

      const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();
      const hIndex = {};
      headerRow.forEach((h, i) => {
        const exact = h.trim();
        const normalized = norm(h);
        if (!(exact in hIndex)) hIndex[exact] = i;
        if (!(normalized in hIndex)) hIndex[normalized] = i;
      });

      const parsed = body
        .filter((r) => r.some((cell) => (cell ?? "").toString().trim() !== ""))
        .map((r, i) => {
          const obj = {};
          HEADERS.forEach((H) => (obj[H] = getCell(r, hIndex[H])));
          if (obj["Quantity"] !== "") {
            const n = Number(obj["Quantity"]);
            if (Number.isFinite(n)) obj["Quantity"] = n;
          }
          obj.__dateISO = pickDateISO(obj);
          obj.__sheetRow = i + 2; // header = 1
          return obj;
        });

      setRows(parsed);
    } catch (e) {
      if (e?.name !== "AbortError") setError(`Failed to load: ${e.message}`);
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  };

  useEffect(() => {
    const c = new AbortController();
    fetchData({ isRefresh: false, signal: c.signal });
    return () => c.abort();
  }, [rowLimit]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setPreview({ open: false, src: "", alt: "" }); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* --------- Unique options --------- */
  const uniqueOptions = (key) => {
    const s = new Set();
    for (const r of rows) {
      const v = (r[key] ?? "").toString().trim();
      if (v) s.add(v);
    }
    return Array.from(s).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
  };
  const fabricOpts = useMemo(() => uniqueOptions("Fabric"), [rows]);
  const brandOpts = useMemo(() => uniqueOptions("Brand"), [rows]);
  const shadeOpts = useMemo(() => uniqueOptions("Shade"), [rows]);
  const partyOpts = useMemo(() => uniqueOptions("Party Name"), [rows]);
  const seasonOpts = useMemo(() => uniqueOptions("Season"), [rows]);
  const sectionOpts = useMemo(() => uniqueOptions("Section"), [rows]);
  const unitOpts = useMemo(() => uniqueOptions("Unit"), [rows]);
  const dsOpts = useMemo(() => uniqueOptions("Direct Stitching"), [rows]);
  const patternOpts = useMemo(() => uniqueOptions("Pattern"), [rows]);
  const submittedByOpts = useMemo(() => uniqueOptions("Submitted By"), [rows]);
  const lotOpts = useMemo(() => uniqueOptions("Lot Number"), [rows]);
  const priorityOpts = useMemo(() => uniqueOptions("Priority"), [rows]);
  // Add these near other uniqueOptions calls
const tapeLaceOpts = useMemo(() => uniqueOptions("Tape/Lace"), [rows]);
const bottomTypeOpts = useMemo(() => uniqueOptions("Bottom Type"), [rows]);
const zipOpts = useMemo(() => uniqueOptions("Zip"), [rows]);

  /* --------- Filter + search --------- */
  const filtered = useMemo(() => {
  const needle = q.trim().toLowerCase();

  return rows.filter((row) => {
    // text search across all HEADERS
    const matchesText = !needle
      ? true
      : HEADERS.some((H) => String(row[H] ?? "").toLowerCase().includes(needle));

    // exact-match select filters
    const matchesFabric      = !fFabric      || (row["Fabric"] ?? "") === fFabric;
    const matchesBrand       = !fBrand       || (row["Brand"] ?? "") === fBrand;
    const matchesShade       = !fShade       || (row["Shade"] ?? "") === fShade;
    const matchesParty       = !fParty       || (row["Party Name"] ?? "") === fParty;
    const matchesSeason      = !fSeason      || (row["Season"] ?? "") === fSeason;
    const matchesSection     = !fSection     || (row["Section"] ?? "") === fSection;
    const matchesUnit        = !fUnit        || (row["Unit"] ?? "") === fUnit;
    const matchesDS          = !fDS          || (row["Direct Stitching"] ?? "") === fDS;
    const matchesLotSelect   = !fLot         || (row["Lot Number"] ?? "") === fLot;
    const matchesPattern     = !fPattern     || (row["Pattern"] ?? "") === fPattern;
    const matchesSubmittedBy = !fSubmittedBy || (row["Submitted By"] ?? "") === fSubmittedBy;
    const matchesPriority = !fPriority || (row["Priority"] ?? "") === fPriority;
    const matchesTapeLace = !fTapeLace || (row["Tape/Lace"] ?? "") === fTapeLace;
    const matchesBottomType = !fBottomType || (row["Bottom Type"] ?? "") === fBottomType;
    const matchesZip = !fZip || (row["Zip"] ?? "") === fZip;


    // NEW: inclusive range filters for JO No and Lot Number
    const matchesJoRange  = inRange(row["Job Order No"], joStart, joEnd);
    const matchesLotRange = inRange(row["Lot Number"], lotStart, lotEnd);

    return (
      matchesText &&
      matchesFabric &&
      matchesBrand &&
      matchesShade &&
      matchesParty &&
      matchesSeason &&
      matchesSection &&
      matchesUnit &&
      matchesDS &&
      matchesLotSelect &&
      matchesPattern &&
      matchesSubmittedBy &&
      matchesJoRange &&
      matchesLotRange &&
        matchesTapeLace &&
      matchesBottomType &&
      matchesZip&&
      matchesPriority
    );
  });
}, [
rows, q,
  fFabric, fBrand, fShade, fParty, fSeason, fSection, fUnit, fDS, fLot,
  fPattern, fSubmittedBy, fPriority,
  fTapeLace, fBottomType, fZip,  // Add these
  joStart, joEnd, lotStart, lotEnd
]);

  /* --------- Sorting --------- */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { key, dir } = sort;
    const f = dir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      if (key === "Date" || key === "Created At (ISO)") {
        const A = a.__dateISO || a[key] || "";
        const B = b.__dateISO || b[key] || "";
        return A.localeCompare(B) * f;
      }
      if (key === "Job Order No") {
        const A = String(a[key] ?? "");
        const B = String(b[key] ?? "");
        return A.localeCompare(B, undefined, { numeric: true, sensitivity: "base" }) * f;
      }
      if (key === "Quantity") {
        const A = Number(a[key]);
        const B = Number(b[key]);
        if (Number.isFinite(A) && Number.isFinite(B)) return (A - B) * f;
      }
      return String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, { numeric: true }) * f;
    });
    return arr;
  }, [filtered, sort]);

  /* --------- Pagination --------- */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);

  const clickHeader = (H) => {
    setPage(1);
    setSort((prev) => {
      if (prev.key === H) return { key: H, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key: H, dir: "asc" };
    });
  };

  const exportCsv = () => {
    const rowsCsv = sorted.map((r) => HEADERS.map((H) => csvCell(r[H])).join(","));
    const csv = [HEADERS.join(","), ...rowsCsv].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job_orders_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

const clearFilters = () => {
  setFFabric(""); setFBrand(""); setFShade(""); setFParty(""); setFSeason(""); setFSection("");
  setFPattern(""); setFSubmittedBy(""); setFUnit(""); setFDS(""); setFLot("");
  setFPriority(""); 
  setFTapeLace(""); setFBottomType(""); setFZip("");  // Add these
  setQ(""); setPage(1);
  setJoStart(""); setJoEnd("");
  setLotStart(""); setLotEnd("");
};

  /* =================== LIGHT PDF (A4, async save, compressed) =================== */
/* =================== A3 “Card + Band” PDF — performance tuned =================== */
// ========================= generatePdf (UPDATED) =========================
// ========================= generatePdf (UPDATED) =========================
const generatePdf = async (row) => {
  const lot = (row?.["Lot Number"] ?? "").toString().trim();
  if (!lot) {
    alert("Please enter a Lot Number first (this row has none).");
    return;
  }

  const joNum = (row?.["Job Order No"] ?? "").toString().trim() || "Unknown";
  if (pdfBusyId) return;
  setPdfBusyId(joNum);

  try {
    await pause(0);

    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a3",
      compress: true,
      putOnlyUsedFonts: true,
    });

    // ====== DESIGN TOKENS (updated) ======
    const M = 42;
    const FOOTER_H = 44;
    const GRID_ROW_GAP = 18;
    const GRID_COL_GAP = 20;
    const IMG_MAX = 900;
    const IMG_TIMEOUT_MS = 4000;

    // ====== COLORS: pure B/W (grayscale) ======
    const C = {
      primary: [0, 0, 0],     // headings & labels -> black
      accent: [0, 0, 0],     // lines/badges -> black
      dark: [0, 0, 0],     // body text -> black
      grayDark: [0, 0, 0],   // secondary text
      gray: [0, 0, 0],
      white: [255, 255, 255],
      border: [0, 0, 0],
      tableHeader: [255, 255, 255],
      zebra: [250, 250, 250],
      success: [0, 0, 0],     // any green -> black
      highlight: [0, 0, 0],    // any red -> black
    };
    const F = { h1: 30, h2: 22, h3: 18, body: 13, label: 11.5, meta: 10.5, small: 9.5 };

    const setFont = (weight, size, color = C.dark) => {
      doc.setFont("Arial Black", weight);
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
    const asText = (v) => (v == null || String(v).trim() === "" ? "—" : String(v).trim());
    const asBool = (v) => /^(true|yes|y|1)$/i.test(String(v || "").trim());
    const vDate = (k) => (row?.[k] ? formatDateForPdf(row[k]) : "—");
    const val = (k) => asText(row?.[k]);
    const HIGHLIGHTS = new Set(["Lot Number", "Party Name", "Garment Type", "Priority", "Tape/Lace", "Bottom Type", "Zip"]);

    const isHighlighted = (label) => HIGHLIGHTS.has(String(label).trim());

    // ====== PAGE SCAFFOLDS (white header + page border) ======
    const drawPageBorder = (PAGE) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.8);
      doc.rect(12, 12, PAGE.w - 24, PAGE.h - 24);
    };

    const firstPageScaffold = () => {
      const PAGE = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
      // Header stays white (no blue band)
      doc.setFillColor(...C.white);
      doc.rect(0, 0, PAGE.w, 180, "F");
      // Content container
      doc.setFillColor(...C.white);
      doc.roundedRect(M, 100, PAGE.w - M * 2, PAGE.h - 200, 12, 12, "F");
      // Narrow black page border
      drawPageBorder(PAGE);
      return PAGE;
    };
    const innerPageScaffold = () => {
      const PAGE = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
      // Header stays white (no blue band)
      doc.setFillColor(...C.white);
      doc.rect(0, 0, PAGE.w, 90, "F");
      // Content container
      doc.setFillColor(...C.white);
      doc.roundedRect(M, 70, PAGE.w - M * 2, PAGE.h - 160, 12, 12, "F");
      // Narrow black page border
      drawPageBorder(PAGE);
      return PAGE;
    };

    // ====== LAYOUT HELPERS ======
    let PAGE = firstPageScaffold();
    let y = 130;
    const submittedBy = asText(row?.["Submitted By"] || "—");

    const contentW = () => PAGE.w - M * 2;

    const ensurePageRoom = async (needed, topPad = 0) => {
      const bottom = PAGE.h - FOOTER_H;
      if (y + needed > bottom) {
        doc.addPage();
        PAGE = innerPageScaffold();
        y = 100 + topPad;
        await pause(0);
      }
    };

    const sectionHeader = async (text, opts = {}) => {
      await ensurePageRoom(40);
      const yMid = y;

      // Blue section titles
      setFont("bold", F.h3, C.primary);
      doc.text(text, PAGE.w / 2, yMid, { align: "center" });

      if (opts.rightBigText) {
        // Keep highlight tone for big number
        setFont("bold", 28, C.highlight);
        const padRight = 6;
        const yOffset = 14;
        doc.text(String(opts.rightBigText), PAGE.w - M - padRight, yMid - yOffset, { align: "right" });
      }

      doc.setDrawColor(...C.accent);
      doc.setLineWidth(2.5);
      doc.line(PAGE.w / 2 - 70, yMid + 8, PAGE.w / 2 + 70, yMid + 8);

      y += 24;
      await pause(0);
    };

    const drawCard = async ({ label, value, x, w }) => {
      const padX = 18, padY = 16;
      const labelH = F.label * 1.6;
      const maxWidth = w - padX * 2;
      const txt = value && String(value).trim() ? String(value) : "—";
      const lines = doc.splitTextToSize(txt, maxWidth);
      const lineH = F.body * 1.45;
      const contentH = Math.max(lineH, lines.length * lineH);
      const h = padY + labelH + 6 + contentH + padY;

      await ensurePageRoom(h);

      doc.setDrawColor(...C.border); doc.setLineWidth(1.1);
      doc.setFillColor(...C.white); doc.roundedRect(x, y, w, h, 8, 8, "FD");

      // Label: bold navy
      setFont("bold", F.label, C.primary);
      doc.text(label.toUpperCase(), x + padX, y + padY);

      // Value: bold black (or highlighted red if in HIGHLIGHTS)
      const isHL = isHighlighted(label);
      const color = isHL ? C.highlight : C.dark;
      setFont("bold", F.body, color);
      const textY = y + padY + labelH + 6;
      lines.forEach((t, i) => doc.text(t, x + padX, textY + i * lineH));

      const bottom = y + h;
      y = bottom;
      await pause(0);
      return bottom;
    };

    const drawGridRow = async (items, { cols = items.length, rowGap = GRID_ROW_GAP } = {}) => {
      const totalW = contentW();
      const gapW = GRID_COL_GAP * (cols - 1);
      const cardW = (totalW - gapW) / cols;

      // Estimate tallest card
      const heights = items.map(({ value }) => {
        const padX = 18, padY = 16, labelH = F.label * 1.6;
        const maxWidth = cardW - padX * 2;
        const lines = doc.splitTextToSize((value || "—").toString(), maxWidth);
        const lineH = F.body * 1.45;
        return padY + labelH + 6 + Math.max(lineH, lines.length * lineH) + padY;
      });
      const rowH = Math.max(...heights);
      await ensurePageRoom(rowH);

      const yTop = y;
      let maxBottom = yTop;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const cardX = M + i * (cardW + GRID_COL_GAP);
        const oldY = y;
        y = yTop;
        const bottom = await drawCard({ ...item, x: cardX, w: cardW });
        maxBottom = Math.max(maxBottom, bottom);
        y = oldY;
      }

      y = maxBottom + rowGap;
    };

    const drawKVGrid = async (pairs, { cols = 4, rowGap = 8 }) => {
      const colW = (contentW() - GRID_COL_GAP * (cols - 1)) / cols;
      const rowHeight = 24;

      for (let i = 0; i < pairs.length; i += cols) {
        await ensurePageRoom(rowHeight);
        const row = pairs.slice(i, i + cols);

        row.forEach((p, idx) => {
          const x = M + idx * (colW + GRID_COL_GAP);
          const labelStr = (p.label || "").toUpperCase();

          // Label: bold navy
          setFont("bold", F.small, C.primary);
          doc.text(labelStr, x, y);

          // Value: bold black unless highlighted (then bold red)
          const isHL = isHighlighted(p.label);
          const color = isHL ? C.highlight : C.dark;
          setFont("bold", F.small, color);

          const line = doc.splitTextToSize(asText(p.value), colW)[0] || "—";
          doc.text(line, x, y + 12);
        });

        y += rowHeight + rowGap;
        if ((i / cols) % 2 === 1) await pause(0);
      }
    };

    // compact-capable table
    const drawTable = async (headers, data, opts = {}) => {
      const x = M;
      const tableW = contentW();

      const headerH = opts.headerH ?? 30;   // was 44
      const rowH = opts.rowH ?? 22;      // was 38
      const fontScale = opts.fontScale ?? 0.9; // shrink fonts a bit

      const headerFont = Math.max(8.5, F.body * fontScale); // e.g., ~11.7 -> 10.5
      const bodyFont = Math.max(8.0, F.body * (fontScale - 0.05)); // a touch smaller than header

      const totalRatio = headers.reduce((s, h) => s + (h.width || 1), 0);
      const colW = headers.map((h) => ((h.width || 1) / totalRatio) * tableW);

      const drawHeader = async () => {
        await ensurePageRoom(headerH);
        doc.setFillColor(...C.tableHeader);
        doc.roundedRect(x, y, tableW, headerH, 6, 6, "F");

        let cx = x;
        headers.forEach((h, i) => {
          const wCol = colW[i];
          doc.setDrawColor(...C.border); doc.setLineWidth(1);
          doc.rect(cx, y, wCol, headerH);

          // smaller header font (navy)
          setFont("bold", headerFont, C.primary);
          doc.text(h.label, cx + wCol / 2, y + headerH / 2 + 3, { align: "center" });
          cx += wCol;
        });

        // thin bottom rule
        doc.setDrawColor(...C.accent);
        doc.setLineWidth(1.5);
        doc.line(x, y + headerH, x + tableW, y + headerH);

        y += headerH;
      };

      const tableStartY = y;
      await drawHeader();

      for (let idx = 0; idx < data.length; idx++) {
        await ensurePageRoom(rowH);
        if (idx % 2 === 0) {
          doc.setFillColor(...C.zebra);
          doc.rect(x, y, tableW, rowH, "F");
        }

        let cx = x;
        headers.forEach((h, i) => {
          const wCol = colW[i];
          doc.setDrawColor(...C.border);
          doc.rect(cx, y, wCol, rowH);

          // compact body font (black)
          setFont("bold", bodyFont, C.dark);
          const cell = (data[idx][h.key] ?? "").toString();
          doc.text(cell, cx + wCol / 2, y + rowH / 2 + 3, { align: "center" });
          cx += wCol;
        });

        y += rowH;
        if (idx % 12 === 0) await pause(0);
      }

      const tableEndY = y;
      doc.setDrawColor(...C.border);
      doc.setLineWidth(1);
      doc.roundedRect(x, tableStartY, tableW, tableEndY - tableStartY, 6, 6, "S");
    };

    const tryDrawImage = async ({ url, x, w, h }) => {
      const padX = 18, padY = 16, labelH = F.label * 1.6;
      const cardH = h;

      await ensurePageRoom(cardH);

      doc.setDrawColor(...C.border); doc.setLineWidth(1.1);
      doc.setFillColor(...C.white); doc.roundedRect(x, y, w, cardH, 8, 8, "FD");
      // Label "IMAGE": bold navy
      setFont("bold", F.label, C.primary);
      doc.text("IMAGE", x + padX, y + padY);

      let drew = false;
      try {
        const cleanUrl = asText(url) === "—" ? "" : url;
        if (cleanUrl) {
          const dataUrl = await withTimeout(
            loadImageAsBase64ForPdf(cleanUrl, { maxWidth: IMG_MAX, maxHeight: IMG_MAX }),
            IMG_TIMEOUT_MS
          );
          if (dataUrl) {
            const p = doc.getImageProperties(dataUrl);
            const fitW = w - 40, fitH = cardH - (padY + labelH + 6) - 20;
            const ratio = Math.min(fitW / p.width, fitH / p.height);
            const iw = Math.max(1, p.width * ratio), ih = Math.max(1, p.height * ratio);
            const ix = x + (w - iw) / 2;
            const iy = y + padY + labelH + 10 + (fitH - ih) / 2;
            doc.addImage(dataUrl, "JPEG", ix, iy, iw, ih);
            drew = true;
          }
        }
      } catch (_) { }
      if (!drew) {
        setFont("normal", F.meta, C.grayDark);
        doc.text("No image provided / failed to load", x + w / 2, y + cardH / 2, { align: "center" });
      }

      y = y + cardH + GRID_ROW_GAP;
      await pause(0);
    };

    // ---------- RENDERERS ----------
    const renderFirstPage = async () => {
      PAGE = firstPageScaffold();
      y = 170;

      // Header text on white: Blue headings
      setFont("bold", 32, C.primary);
      doc.text("JOB ORDER", doc.internal.pageSize.getWidth() / 2, 65, { align: "center" });
      setFont("bold", 16, C.primary);
      doc.text(`Order #${joNum}`, doc.internal.pageSize.getWidth() / 2, 90, { align: "center" });

      // Accent badge
      // JO badge: white circle with black outline, black text
      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.dark);
      doc.setLineWidth(1);
      doc.circle(M + 30, 60, 30, "FD"); // F=fill white, D=draw black stroke
      setFont("bold", 20, C.dark);
      doc.text("JO", M + 30, 67, { align: "center" });


      const genDate = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
      setFont("normal", F.meta, C.grayDark);
      doc.text(`Generated: ${genDate}`, PAGE.w - M, 50, { align: "right" });
      doc.text(`Submitted by: ${submittedBy}`, PAGE.w - M, 70, { align: "right" });

      const dsEnabled = asBool(row?.["Direct Stitching"]);
      if (dsEnabled) {
        const padX = 14, hChip = 30, r = 15;
        setFont("bold", 12, C.white);
        const label = "DIRECT STITCHING";
        const wChip = doc.getTextWidth(label) + padX * 2 + 14;
        const xChip = PAGE.w - M - wChip;
        const yChip = 85;
        doc.setFillColor(...C.success);
        doc.roundedRect(xChip, yChip - hChip + 2, wChip, hChip, r, r, "F");
        doc.text(label, xChip + padX + 12, yChip - 8);
      }

      const contentRow = (items, cols) => drawGridRow(items, { cols });

      await sectionHeader("Order Details", { rightBigText: ` ${val("Lot Number")}` });
      await contentRow([
        { label: "Job Order No", value: joNum },
        { label: "Date", value: vDate("Date") },
        { label: "Lot Number", value: val("Lot Number") },
        { label: "Party Name", value: val("Party Name") },
        { label: "Brand", value: val("Brand") },
      ], 5);

      await contentRow([
        { label: "Fabric", value: val("Fabric") },
        { label: "Garment Type", value: val("Garment Type") },
        { label: "Section", value: val("Section") },
        { label: "Quantity", value: val("Quantity") },
        { label: "Unit", value: val("Unit") },
      ], 5);

      await contentRow([
        { label: "Season", value: val("Season") },
        { label: "Style", value: val("Style") },
        { label: "Pattern", value: val("Pattern") },
        { label: "Size", value: val("Size") },
        { label: "Priority", value: val("Priority") },
      ], 5);

      await contentRow([{ label: "Shade", value: val("Shade") }], 1);

      await sectionHeader("Special Processes");
      await contentRow([
        { label: "Embroidery", value: val("Emb") },
        { label: "Printing", value: val("Printing") },
        { label: "Direct Stitching", value: dsEnabled ? "Yes" : asText(row?.["Direct Stitching"]) },
        { label: "Component", value: val("Component") },
      ], 4);

      await contentRow([
        { label: "Embroidery Details", value: val("Emb Details") },
        { label: "Printing Details", value: val("Printing Details") },
      ], 2);

      await sectionHeader("Remarks & Visual Reference");
      const twoColW = (contentW() - GRID_COL_GAP) / 2;

      // Left: remarks
      {
        const oldY = y;
        const remarksText = (row?.["Remarks"] ?? "").toString().trim() || "No remarks provided";
        await drawCard({ label: "Remarks", value: remarksText, x: M, w: twoColW });
        y = oldY;
      }

      // Right: image
      await tryDrawImage({
        url: row?.["Image URL"],
        x: M + twoColW + GRID_COL_GAP, w: twoColW, h: 220
      });
    };

    const renderSecondPage = async () => {
      PAGE = innerPageScaffold();
      y = 100;

      // Blue heading
      setFont("bold", 24, C.primary);
      const lotNum = asText(row?.["Lot Number"]);
      doc.text(
        `JOB ORDER SUMMARY ${lotNum !== "—" ? `(${lotNum})` : ""}`,
        doc.internal.pageSize.getWidth() / 2,
        50,
        { align: "center" }
      );

      // ===== Boxed "Order Summary" (ONLY OUTER BORDER) =====
      {
        const short = (s, n) => {
          s = asText(s);
          return s === "—" || s.length <= n ? s : s.slice(0, n - 1) + "…";
        };

        const pairs = [
          { label: "Job Order No", value: joNum },
          { label: "Date", value: vDate("Date") },
          { label: "Lot Number", value: val("Lot Number") },
          { label: "Party Name", value: short(val("Party Name"), 28) },
          { label: "Fabric", value: short(val("Fabric"), 40) },
          { label: "Brand", value: short(val("Brand"), 40) },
          { label: "Garment Type", value: short(val("Garment Type"), 40) },
          { label: "Section", value: short(val("Section"), 40) },
          { label: "Season", value: short(val("Season"), 40) },
          { label: "Shade", value: short(val("Shade"), 40) },
          { label: "Quantity", value: val("Quantity") },
          { label: "Unit", value: val("Unit") },
          { label: "Style", value: short(val("Style"), 40) },
          { label: "Priority", value: val("Priority") },
          { label: "Pattern", value: short(val("Pattern"), 40) },
          { label: "Size", value: short(val("Size"), 40) },
          { label: "Embroidery", value: short(val("Emb"), 40) },
          { label: "Printing", value: short(val("Printing"), 40) },
          { label: "Direct Stitching", value: asBool(row?.["Direct Stitching"]) ? "Yes" : asText(row?.["Direct Stitching"]) },
          { label: "Embroidery Details", value: short(val("Emb Details"), 50) },
          { label: "Printing Details", value: short(val("Printing Details"), 50) },
          { label: "Component", value: short(val("Component"), 40) },
          { label: "Remarks", value: short(row?.["Remarks"] ?? "No remarks provided", 80) }
        ];

        const cols = 4;
        const rowHeight = 24;
        const rowGap = 10;
        const pad = 18;
        const titleH = 26;
        const titleGap = 10;

        const rows = Math.ceil(pairs.length / cols);
        const gridH = rows * (rowHeight + rowGap) - rowGap;
        const boxW = contentW();
        const boxH = pad + titleH + titleGap + gridH + pad;

        await ensurePageRoom(boxH);

        const boxX = M;
        const boxY = y;

        // Outer box only
        doc.setDrawColor(0, 0, 0);
        doc.setFillColor(...C.white);
        doc.setLineWidth(1);
        doc.roundedRect(boxX, boxY, boxW, boxH, 8, 8, "FD");

        // Title inside the box (left aligned)
        setFont("bold", F.h3, C.primary);
        doc.text("Order Summary", boxX + pad, boxY + pad + titleH - 6);

        // Grid content (NO inner borders)
        const innerX = boxX + pad;
        const innerYStart = boxY + pad + titleH + titleGap;
        const colW = (boxW - pad * 2 - GRID_COL_GAP * (cols - 1)) / cols;

        let drawY = innerYStart;
        for (let i = 0; i < pairs.length; i += cols) {
          const rowSlice = pairs.slice(i, i + cols);

          rowSlice.forEach((p, idx) => {
            const x = innerX + idx * (colW + GRID_COL_GAP);

            // Label: bold navy
            setFont("bold", F.small, C.primary);
            doc.text((p.label || "").toUpperCase(), x, drawY);

            // Value: bold black unless highlighted (then bold red)
            const isHL = isHighlighted(p.label);
            setFont("bold", F.small, isHL ? C.highlight : C.dark);

            const line = doc.splitTextToSize(asText(p.value), colW)[0] || "—";
            doc.text(line, x, drawY + 12);
          });

          drawY += rowHeight + rowGap;
        }

        // Advance after box
        y = boxY + boxH + GRID_ROW_GAP;
      }

      await sectionHeader("Full Remarks & Visual");
      const colGap = GRID_COL_GAP;
      const colW = (contentW() - colGap) / 2;
      const leftX = M;
      const rightX = M + colW + colGap;
      const yTop = y;

      const remarksTextFull = (row?.["Remarks"] ?? "").toString().trim() || "No remarks provided";
      await drawCard({ label: "Complete Remarks", value: remarksTextFull, x: leftX, w: colW });
      const bottomLeft = y;

      y = yTop;
      const estRightH = Math.max(220, bottomLeft - yTop);
      await tryDrawImage({
        url: row?.["Image URL"],
        x: rightX, w: colW, h: estRightH
      });
      const bottomRight = yTop + estRightH;

      doc.setDrawColor(...C.border);
      doc.setLineWidth(1);
      doc.line(M + colW + colGap / 2, yTop + 6, M + colW + colGap / 2, Math.max(bottomLeft, bottomRight) - 6);

      y = Math.max(bottomLeft, bottomRight) + GRID_ROW_GAP;

      await sectionHeader("Cutting Schedule");
      const tableHeaders = [
        { label: "Table", key: "table", width: 1 },
        { label: "Shade", key: "shade", width: 2 },
        { label: "Quantity", key: "qty", width: 1 },
        { label: "Kharcha", key: "kharcha", width: 1 }, // NEW (before Date of Cutting)
        { label: "Date of Cutting", key: "cut", width: 1.5 },
      ];

      // Parse shades (if any)
      const shadesArr = parseShades(val("Shade")).filter(s => String(s || "").trim() !== "");
      const minRows = 10;
      const rowCount = Math.max(minRows, shadesArr.length);

      const tableData = Array.from({ length: rowCount }, (_, i) => ({
        table: "",
        shade: shadesArr[i] != null ? String(shadesArr[i]) : "",
        qty: "",
        kharcha: "Yes / No",   // <- simple text
        cut: "",
      }));

      await drawTable(tableHeaders, tableData, { rowH: 26, headerH: 32, fontScale: 0.95 });
    };

// ====== RENDER THIRD PAGE (Material Acquisition Planning - Enhanced Full Page) ======
const renderThirdPage = async () => {
  PAGE = innerPageScaffold();
  y = 75;

  // Helper function for shortening text
  const shortenText = (text, maxLength) => {
    if (!text || text === "—") return "—";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  // ===== HEADER SECTION =====
  setFont("bold", 28, C.primary);
  doc.text("MATERIAL REQUISITION PLANNING", PAGE.w / 2, 55, { align: "center" });
  
  // Thicker decorative line
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(3);
  doc.line(PAGE.w / 2 - 120, 65, PAGE.w / 2 + 120, 65);
  
  // Job info - larger and better spaced
  y += 25;
  
  // Job info container
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(M, y - 5, contentW(), 40, 8, 8, "F");
  doc.setDrawColor(...C.border);
  doc.setLineWidth(1);
  doc.roundedRect(M, y - 5, contentW(), 40, 8, 8, "S");
  
  setFont("bold", 14, C.primary);
  doc.text(`JOB ORDER: ${joNum}`, M + 25, y + 10);
  
  setFont("bold", 14, C.highlight);
  doc.text(`LOT: ${val("Lot Number")}`, M + 180, y + 10);
  
  setFont("bold", 14, C.grayDark);
  doc.text(`PARTY: ${shortenText(val("Party Name"), 22)}`, M + 350, y + 10);
  
  setFont("bold", 14, C.primary);
  doc.text(`DATE: ${vDate("Date")}`, PAGE.w - M - 25, y + 10, { align: "right" });

  y += 50;

  // ===== TWO COLUMN LAYOUT WITH BETTER SPACING =====
  const colGap = 25;
  const leftColW = (contentW() - colGap) * 0.55;
  const rightColW = (contentW() - colGap) * 0.45;

  // LEFT COLUMN: Material Specifications
  const leftX = M;
  const leftStartY = y;
  
  // Material Details Header - LARGER
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(leftX, y, leftColW, 38, 8, 8, "F");
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(2);
  doc.roundedRect(leftX, y, leftColW, 38, 8, 8, "S");
  
  setFont("bold", 18, C.primary);
  doc.text("MATERIAL SPECIFICATIONS", leftX + leftColW / 2, y + 24, { align: "center" });
  
  y += 48;

  // Material Details - BETTER SPACING AND LARGER FONTS
  const materialData = [
    // Basic Details
    { label: "FABRIC", value: val("Fabric") },
    { label: "BRAND", value: val("Brand") },
    { label: "GARMENT TYPE", value: val("Garment Type") },
    { label: "QUANTITY", value: `${val("Quantity")} ${val("Unit")}` },
    { label: "SIZE", value: val("Size") },
    { label: "STYLE", value: val("Style") },
    { label: "PATTERN", value: val("Pattern") },
    
    // Separator line
    { separator: true },
    
    // Components & Trims
    { label: "TAPE/LACE", value: val("Tape/Lace"), highlight: true },
    { label: "BOTTOM TYPE", value: val("Bottom Type"), highlight: true },
    { label: "ZIP", value: val("Zip"), highlight: true },
    { label: "OTHER COMPONENTS", value: val("Component") },
    
    // Separator line
    { separator: true },
    
    // Planning Info
    { label: "SECTION", value: val("Section") },
    { label: "SEASON", value: val("Season") },
    { label: "PRIORITY", value: val("Priority"), highlight: true },
    { label: "SUBMITTED BY", value: val("Submitted By") },
    { label: "REMARKS", value: shortenText(row?.["Remarks"] ?? "", 50) },
  ];

  const rowHeight = 23; // Increased from 20
  const labelWidth = 130; // Increased from 120
  
  for (let i = 0; i < materialData.length; i++) {
    const item = materialData[i];
    
    if (item.separator) {
      // Thicker separator line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.line(leftX + 10, y + 8, leftX + leftColW - 10, y + 8);
      y += 15; // Increased spacing
      continue;
    }
    
    await ensurePageRoom(rowHeight);
    
    // Label - LARGER FONT
    setFont("bold", 11, C.grayDark); // Increased from 9
    doc.text(item.label, leftX + 15, y + 15); // Adjusted y position
    
    // Value - LARGER FONT
    const isHighlight = item.highlight;
    setFont("bold", 12, isHighlight ? C.highlight : C.dark); // Increased from 10
    
    const valueText = item.value || "—";
    const maxWidth = leftColW - labelWidth - 25;
    
    // Check if text needs to be split
    const lines = doc.splitTextToSize(valueText, maxWidth);
    if (lines.length > 1) {
      // Multi-line value
      for (let idx = 0; idx < lines.length; idx++) {
        doc.text(lines[idx], leftX + labelWidth + 15, y + 15 + (idx * 11)); // Increased line spacing
      }
      y += (lines.length * 11) + 10; // Increased spacing
    } else {
      // Single line value
      doc.text(valueText, leftX + labelWidth + 15, y + 15);
      y += rowHeight;
    }
  }
  
  const leftColumnBottom = y;

  // RIGHT COLUMN: Image & Planning Status
  const rightX = M + leftColW + colGap;
  const rightStartY = leftStartY;
  let rightY = rightStartY;
  
  // Image Section Header - LARGER
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(rightX, rightY, rightColW, 38, 8, 8, "F");
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(2);
  doc.roundedRect(rightX, rightY, rightColW, 38, 8, 8, "S");
  
  setFont("bold", 18, C.primary);
  doc.text("VISUAL REFERENCE", rightX + rightColW / 2, rightY + 24, { align: "center" });
  
  rightY += 48;
  
  // Larger image container
  await ensurePageRoom(200); // Increased from 160
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(rightX, rightY, rightColW, 190, 10, 10, "F"); // Increased height
  doc.setDrawColor(...C.border);
  doc.setLineWidth(1.5);
  doc.roundedRect(rightX, rightY, rightColW, 190, 10, 10, "S");
  
  // Try to draw image
  const hasImage = row?.["Image URL"] && String(row?.["Image URL"]).trim() !== "";
  if (hasImage) {
    try {
      const dataUrl = await withTimeout(
        loadImageAsBase64ForPdf(row["Image URL"], { maxWidth: 350, maxHeight: 150 }),
        IMG_TIMEOUT_MS
      );
      if (dataUrl) {
        const p = doc.getImageProperties(dataUrl);
        const fitW = rightColW - 50;
        const fitH = 150;
        const ratio = Math.min(fitW / p.width, fitH / p.height);
        const iw = Math.max(1, p.width * ratio);
        const ih = Math.max(1, p.height * ratio);
        const ix = rightX + (rightColW - iw) / 2;
        const iy = rightY + 20;
        doc.addImage(dataUrl, "JPEG", ix, iy, iw, ih);
      } else {
        setFont("normal", 13, C.grayDark); // Increased font
        doc.text("No image available", rightX + rightColW / 2, rightY + 100, { align: "center" });
      }
    } catch {
      setFont("normal", 13, C.grayDark); // Increased font
      doc.text("Image load failed", rightX + rightColW / 2, rightY + 100, { align: "center" });
    }
  } else {
    setFont("normal", 13, C.grayDark); // Increased font
    doc.text("No image provided", rightX + rightColW / 2, rightY + 100, { align: "center" });
  }
  
  rightY += 205; // Adjusted for larger container
  
  // Planning Status Section - MUCH LARGER
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(rightX, rightY, rightColW, 38, 8, 8, "F");
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(2);
  doc.roundedRect(rightX, rightY, rightColW, 38, 8, 8, "S");
  
  setFont("bold", 18, C.primary);
  doc.text("PLANNING STATUS", rightX + rightColW / 2, rightY + 24, { align: "center" });
  
  rightY += 48;
  
  // Planning checklist - MUCH LARGER FONT AND SPACING
  const planningItems = [
    { label: "Material Ordered" },
    // { label: "Fabric Received" },
    { label: "Zip Received" },
    { label: "Dori Received" },
    { label: "Label Received" },
    { label: "Tag Received" },
    { label: "Washcare Received" },
  ];
  
  for (let idx = 0; idx < planningItems.length; idx++) {
    const item = planningItems[idx];
    
    // Larger checkbox
    doc.setDrawColor(...C.border);
    doc.setLineWidth(1.2);
    doc.rect(rightX + 20, rightY - 5, 14, 14); // Larger checkbox
    
    // Label - MUCH LARGER FONT
    setFont("normal", 13, C.grayDark); // Increased from 11
    doc.text(item.label, rightX + 45, rightY + 3);
    
    // Date field - LARGER FONT
    setFont("normal", 12, C.dark); // Increased from 10
    doc.text("__ / __ / ____", rightX + rightColW - 25, rightY + 3, { align: "right" }); // Better spacing
    
    rightY += 22; // Increased spacing
  }
  
  const rightColumnBottom = rightY;
  
  // Set y to the maximum of both columns
  y = Math.max(leftColumnBottom, rightColumnBottom);
  
  // Add spacing after columns
  y += 30;

  // ===== MATERIAL REQUIREMENTS TABLE - LARGER =====
  await ensurePageRoom(50);
  
  // Table header - LARGER
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(M, y, contentW(), 42, 8, 8, "F");
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(2);
  doc.roundedRect(M, y, contentW(), 42, 8, 8, "S");
  
  setFont("bold", 18, C.primary);
  doc.text("MATERIAL REQUIREMENTS", M + contentW() / 2, y + 26, { align: "center" });
  
  y += 52;

  // Material Requirements Table with LARGER FONTS
  const requirementsHeaders = [
    { label: "MATERIAL ITEM", key: "item", width: 2 },
    { label: "DESCRIPTION", key: "description", width: 2 },
    { label: "ORDERED QTY", key: "ordered", width: 1 },
    { label: "RECEIVED QTY", key: "received", width: 1 },
    { label: "STATUS", key: "status", width: 1.5 },
  ];

  const requirementsData = [
    { 
      item: "MAIN FABRIC", 
      description: val("Fabric"),
      ordered: "", 
      received: "", 
      status: "" 
    },
    { 
      item: "ZIPPERS", 
      description: val("Zip") || "As per design", 
      ordered: "", 
      received: "", 
      status: "" 
    },
    { 
      item: "TAPE/LACE", 
      description: val("Tape/Lace") || "As required", 
      ordered: "", 
      received: "", 
      status: "" 
    },
    { 
      item: "BOTTOM MATERIAL", 
      description: val("Bottom Type") || "As per style", 
      ordered: "", 
      received: "", 
      status: "" 
    },
    { 
      item: "THREAD", 
      description: "Matching thread", 
      ordered: "", 
      received: "", 
      status: "" 
    },
    { 
      item: "LABELS", 
      description: "Brand Labels", 
      ordered: "", 
      received: "", 
      status: "" 
    },
        { 
      item: "Tag", 
      description: "Tag", 
      ordered: "", 
      received: "", 
      status: "" 
    },
      { 
      item: "PACKAGING", 
      description: "Polybags", 
      ordered: "", 
      received: "", 
      status: "" 
    },
 
    { 
      item: "OTHER COMPONENTS", 
      description: val("Component") || "Various trims", 
      ordered: "", 
      received: "", 
      status: "" 
    },
  
   
    { 
      item: "", 
      description: "", 
      ordered: "", 
      received: "", 
      status: "" 
    },
  ];

  await drawTable(requirementsHeaders, requirementsData, {
    rowH: 28, // Increased from 24
    headerH: 34, // Increased from 30
    fontScale: 0.9 // Increased from 0.85
  });

  // ===== SIGNATURE SECTION - LARGER =====
  await ensurePageRoom(70);
  y += 25;

  // Signature container
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(M, y, contentW(), 70, 10, 10, "F");
  doc.setDrawColor(...C.border);
  doc.setLineWidth(1.5);
  doc.roundedRect(M, y, contentW(), 70, 10, 10, "S");

  // Preparation signature - LARGER
  setFont("bold", 13, C.primary); // Increased from 11
  doc.text("PREPARED BY MATERIAL PLANNING:", M + 25, y + 22);
  
  setFont("normal", 12, C.grayDark); // Increased from 10
  doc.text("Signature: _______________________", M + 280, y + 22);
  doc.text("Date: ______ / ______ / ______", M + 500, y + 22);

  // Approval signature - LARGER
  setFont("bold", 13, C.primary); // Increased from 11
  doc.text("APPROVED BY:", M + 25, y + 48);
  
  setFont("normal", 12, C.grayDark); // Increased from 10
  doc.text("Signature: _______________________", M + 280, y + 48);
  doc.text("Date: ______ / ______ / ______", M + 500, y + 48);

  y += 85;
};

    // ---------- BUILD DOCUMENT: Page1, Page1(copy), Page2, Page3 ----------
    // ---------- BUILD DOCUMENT: Page1, Page1(copy), Page2, Page3 ----------
// ---------- BUILD DOCUMENT: Page1, Page1(copy), Page2, Page3 ----------
await renderFirstPage();                 // page 1
doc.addPage(); await pause(0);
await renderFirstPage();                 // page 2 (duplicate of p1)
doc.addPage(); await pause(0);
await renderSecondPage();                // page 3 (summary with image)
doc.addPage(); await pause(0);
await renderThirdPage();                 // page 4 (material acquisition planning) - COMPACT SINGLE PAGE

// ====== FOOTERS (all pages) ======
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...C.accent);
  doc.setLineWidth(2);
  doc.line(M, h - FOOTER_H - 24, M + 120, h - FOOTER_H - 24);

  setFont("normal", F.meta, C.grayDark);
  doc.text(`Page ${i} of ${totalPages} • ${joNum}`, w - M, h - FOOTER_H - 5, { align: "right" });

  if (i === totalPages) {
    // Fourth page footer (Material Acquisition Planning)
    setFont("normal", F.meta, C.grayDark);
    doc.text(`For Planning Department`, M, h - FOOTER_H - 5);
  } else if (i === totalPages - 1) {
    // Third page footer
    setFont("normal", F.meta, C.grayDark);
    doc.text(`Checked by: Monu Master`, M, h - FOOTER_H - 5);
  } else {
    setFont("normal", F.meta, C.grayDark);
    doc.text(`Submitted by: ${submittedBy}`, M, h - FOOTER_H - 5);
  }
}
    const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
    try {
      await doc.save(`JobOrder_${safe(joNum)}.pdf`, { returnPromise: true });
    } catch {
      doc.save(`JobOrder_${safe(joNum)}.pdf`);
    }
  } catch (e) {
    alert(`Could not create PDF: ${e.message}`);
  } finally {
    setPdfBusyId(null);
  }
};



// ADD ▼ batch exporter
// REPLACE your exportBatchPages with this version
// ====================== exportBatchPages (UPDATED) ======================
// ADD ▼ batch exporter (updated visuals + borders + label/value styling)
// Batch exporter (updated visuals + "Order Summary" box with ONLY outer border)
// ====================== exportBatchPages (UPDATED with all three page types) ======================
const exportBatchPages = async (which /* "first" | "second" | "material" */) => {
  if (pdfBatchBusy) return;
  setPdfBatchBusy(which);

  try {
    await pause(0);
    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a3",
      compress: true,
      putOnlyUsedFonts: true,
    });

    // ====== TOKENS / SCAFFOLDS / HELPERS ======
    const M = 42;
    const FOOTER_H = 44;
    const GRID_ROW_GAP = 18;
    const GRID_COL_GAP = 20;
    const IMG_MAX = 900;
    const IMG_TIMEOUT_MS = 4000;

    const C = {
      primary: [0, 0, 0],
      accent: [0, 0, 0],
      dark: [0, 0, 0],
      grayDark: [0, 0, 0],
      gray: [0, 0, 0],
      white: [255, 255, 255],
      border: [0, 0, 0],
      tableHeader: [255, 255, 255],
      zebra: [250, 250, 250],
      success: [0, 0, 0],
      highlight: [0, 0, 0],
    };
    const F = { h1: 30, h2: 22, h3: 18, body: 13, label: 11.5, meta: 10.5, small: 9.5 };

    const setFont = (weight, size, color = C.dark) => {
      doc.setFont("Arial Black", weight);
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
    const asText = (v) => (v == null || String(v).trim() === "" ? "—" : String(v).trim());
    const asBool = (v) => /^(true|yes|y|1)$/i.test(String(v || "").trim());
    const vDate = (k, row) => (row?.[k] ? formatDateForPdf(row[k]) : "—");
    const val = (k, row) => asText(row?.[k]);

    const drawPageBorder = (PAGE) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.8);
      doc.rect(12, 12, PAGE.w - 24, PAGE.h - 24);
    };

    const firstPageScaffold = () => {
      const PAGE = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
      doc.setFillColor(...C.white);
      doc.rect(0, 0, PAGE.w, 180, "F");
      doc.setFillColor(...C.white);
      doc.roundedRect(M, 100, PAGE.w - M * 2, PAGE.h - 200, 12, 12, "F");
      drawPageBorder(PAGE);
      return PAGE;
    };

    const innerPageScaffold = () => {
      const PAGE = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
      doc.setFillColor(...C.white);
      doc.rect(0, 0, PAGE.w, 90, "F");
      doc.setFillColor(...C.white);
      doc.roundedRect(M, 70, PAGE.w - M * 2, PAGE.h - 160, 12, 12, "F");
      drawPageBorder(PAGE);
      return PAGE;
    };

    let PAGE = null;
    let y = 0;
    const contentW = () => PAGE.w - M * 2;

    const ensurePageRoom = async (needed, topPad = 0) => {
      const bottom = PAGE.h - FOOTER_H;
      if (y + needed > bottom) {
        doc.addPage();
        PAGE = innerPageScaffold();
        y = 100 + topPad;
        await pause(0);
      }
    };

    const sectionHeader = async (text, opts = {}) => {
      await ensurePageRoom(40);
      const yMid = y;
      setFont("bold", F.h3, C.primary);
      doc.text(text, PAGE.w / 2, yMid, { align: "center" });

      if (opts.rightBigText) {
        setFont("bold", 28, C.highlight);
        doc.text(String(opts.rightBigText), PAGE.w - M - 6, yMid - 14, { align: "right" });
      }
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(2.5);
      doc.line(PAGE.w / 2 - 70, yMid + 8, PAGE.w / 2 + 70, yMid + 8);

      y += 32;
      await pause(0);
    };

    const drawCard = async ({ label, value, x, w }) => {
      const padX = 18, padY = 16, labelH = F.label * 1.6;
      const maxWidth = w - padX * 2;
      const txt = value && String(value).trim() ? String(value) : "—";
      const lines = doc.splitTextToSize(txt, maxWidth);
      const lineH = F.body * 1.45;
      const contentH = Math.max(lineH, lines.length * lineH);
      const h = padY + labelH + 6 + Math.max(lineH, contentH) + padY;

      await ensurePageRoom(h);
      doc.setDrawColor(...C.border);
      doc.setLineWidth(1.1);
      doc.setFillColor(...C.white);
      doc.roundedRect(x, y, w, h, 8, 8, "FD");

      // Label: bold navy
      setFont("bold", F.label, C.primary);
      doc.text(label.toUpperCase(), x + padX, y + padY);

      // Value: bold black (or bold red if highlighted)
      const isHL = new Set(["Lot Number", "Party Name", "Garment Type"]).has(String(label).trim());
      setFont("bold", F.body, isHL ? C.highlight : C.dark);
      const textY = y + padY + labelH + 6;
      lines.forEach((t, i) => doc.text(t, x + padX, textY + i * lineH));

      const bottom = y + h;
      y = bottom;
      await pause(0);
      return bottom;
    };

    const drawGridRow = async (items, { cols = items.length, rowGap = GRID_ROW_GAP } = {}) => {
      const totalW = contentW();
      const gapW = GRID_COL_GAP * (cols - 1);
      const cardW = (totalW - gapW) / cols;

      // estimate tallest height
      const padX = 18, padY = 16, labelH = F.label * 1.6, lineH = F.body * 1.45;
      const heights = items.map(({ value }) => {
        const maxWidth = cardW - padX * 2;
        const txt = (value || "—").toString();
        const lines = doc.splitTextToSize(txt, maxWidth);
        return padY + labelH + 6 + Math.max(lineH, lines.length * lineH) + padY;
      });
      const rowH = Math.max(...heights);
      await ensurePageRoom(rowH);

      const yTop = y;
      let maxBottom = yTop;
      for (let i = 0; i < items.length; i++) {
        const cardX = M + i * (cardW + GRID_COL_GAP);
        const oldY = y;
        y = yTop;
        const bottom = await drawCard({ ...items[i], x: cardX, w: cardW });
        maxBottom = Math.max(maxBottom, bottom);
        y = oldY;
      }
      y = maxBottom + rowGap;
    };

    const drawKVGrid = async (pairs, { cols = 4, rowGap = 8 }) => {
      const colW = (contentW() - GRID_COL_GAP * (cols - 1)) / cols;
      const rowHeight = 24;
      for (let i = 0; i < pairs.length; i += cols) {
        await ensurePageRoom(rowHeight);
        const row = pairs.slice(i, i + cols);
        row.forEach((p, idx) => {
          const x = M + idx * (colW + GRID_COL_GAP);
          // Label: bold navy
          setFont("bold", F.small, C.primary);
          doc.text((p.label || "").toUpperCase(), x, y);
          // Value: bold black unless highlighted
          const isHL = new Set(["Lot Number", "Party Name", "Garment Type"]).has(String(p.label || "").trim());
          setFont("bold", F.small, isHL ? C.highlight : C.dark);
          const line = doc.splitTextToSize(asText(p.value), colW)[0] || "—";
          doc.text(line, x, y + 12);
        });
        y += rowHeight + rowGap;
        if ((i / cols) % 2 === 1) await pause(0);
      }
    };

    const drawTable = async (headers, data, opts = {}) => {
      const x = M;
      const tableW = contentW();

      const headerH = opts.headerH ?? 30;
      const rowH = opts.rowH ?? 22;
      const fontScale = opts.fontScale ?? 0.9;

      const headerFont = Math.max(8.5, F.body * fontScale);
      const bodyFont = Math.max(8.0, F.body * (fontScale - 0.05));

      const totalRatio = headers.reduce((s, h) => s + (h.width || 1), 0);
      const colW = headers.map((h) => ((h.width || 1) / totalRatio) * tableW);

      const drawHeader = async () => {
        await ensurePageRoom(headerH);
        doc.setFillColor(...C.tableHeader);
        doc.roundedRect(x, y, tableW, headerH, 6, 6, "F");

        let cx = x;
        headers.forEach((h, i) => {
          const wCol = colW[i];
          doc.setDrawColor(...C.border);
          doc.setLineWidth(1);
          doc.rect(cx, y, wCol, headerH);

          setFont("bold", headerFont, C.primary);
          doc.text(h.label, cx + wCol / 2, y + headerH / 2 + 3, { align: "center" });
          cx += wCol;
        });

        doc.setDrawColor(...C.accent);
        doc.setLineWidth(1.5);
        doc.line(x, y + headerH, x + tableW, y + headerH);

        y += headerH;
      };

      const tableStartY = y;
      await drawHeader();

      for (let idx = 0; idx < data.length; idx++) {
        await ensurePageRoom(rowH);
        if (idx % 2 === 0) {
          doc.setFillColor(...C.zebra);
          doc.rect(x, y, tableW, rowH, "F");
        }

        let cx = x;
        headers.forEach((h, i) => {
          const wCol = colW[i];
          doc.setDrawColor(...C.border);
          doc.rect(cx, y, wCol, rowH);

          setFont("bold", bodyFont, C.dark);
          doc.text((data[idx][h.key] ?? "").toString(), cx + wCol / 2, y + rowH / 2 + 3, { align: "center" });
          cx += wCol;
        });

        y += rowH;
        if (idx % 12 === 0) await pause(0);
      }

      const tableEndY = y;
      doc.setDrawColor(...C.border);
      doc.setLineWidth(1);
      doc.roundedRect(x, tableStartY, tableW, tableEndY - tableStartY, 6, 6, "S");
    };

    const tryDrawImage = async ({ url, x, w, h }) => {
      const padX = 18, padY = 16, labelH = F.label * 1.6;
      const cardH = h;
      await ensurePageRoom(cardH);

      doc.setDrawColor(...C.border);
      doc.setLineWidth(1.1);
      doc.setFillColor(...C.white);
      doc.roundedRect(x, y, w, cardH, 8, 8, "FD");
      setFont("bold", F.label, C.primary);
      doc.text("IMAGE", x + padX, y + padY);

      let drew = false;
      try {
        const cleanUrl = asText(url) === "—" ? "" : url;
        if (cleanUrl) {
          const dataUrl = await withTimeout(
            loadImageAsBase64ForPdf(cleanUrl, { maxWidth: IMG_MAX, maxHeight: IMG_MAX }),
            IMG_TIMEOUT_MS
          );
          if (dataUrl) {
            const p = doc.getImageProperties(dataUrl);
            const fitW = w - 40, fitH = cardH - (padY + labelH + 6) - 20;
            const ratio = Math.min(fitW / p.width, fitH / p.height);
            const iw = Math.max(1, p.width * ratio), ih = Math.max(1, p.height * ratio);
            const ix = x + (w - iw) / 2;
            const iy = y + padY + labelH + 10 + (fitH - ih) / 2;
            doc.addImage(dataUrl, "JPEG", ix, iy, iw, ih);
            drew = true;
          }
        }
      } catch (_) { }
      if (!drew) {
        setFont("normal", F.meta, C.grayDark);
        doc.text("No image provided / failed to load", x + w / 2, y + cardH / 2, { align: "center" });
      }
      y = y + cardH + GRID_ROW_GAP;
      await pause(0);
    };

    // ====== RENDER FIRST PAGE ======
    const renderFirstPage = async (row) => {
      const joNum = (row?.["Job Order No"] ?? "").toString().trim() || "Unknown";
      PAGE = firstPageScaffold();
      y = 170;

      // Blue headings on white
      setFont("bold", 32, C.primary);
      doc.text("JOB ORDER", doc.internal.pageSize.getWidth() / 2, 65, { align: "center" });
      setFont("bold", 16, C.primary);
      doc.text(`Order #${joNum}`, doc.internal.pageSize.getWidth() / 2, 90, { align: "center" });

      // JO badge: white circle with black outline, black text
      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.dark);
      doc.setLineWidth(1);
      doc.circle(M + 30, 60, 30, "FD");
      setFont("bold", 20, C.dark);
      doc.text("JO", M + 30, 67, { align: "center" });

      const submittedBy = asText(row?.["Submitted By"] || "—");
      const genDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
      setFont("normal", F.meta, C.grayDark);
      doc.text(`Generated: ${genDate}`, PAGE.w - M, 50, { align: "right" });
      doc.text(`Submitted by: ${submittedBy}`, PAGE.w - M, 70, { align: "right" });

      if (asBool(row?.["Direct Stitching"])) {
        const padX = 14, hChip = 30, r = 15, label = "DIRECT STITCHING";
        setFont("bold", 12, C.white);
        const wChip = doc.getTextWidth(label) + padX * 2 + 14;
        const xChip = PAGE.w - M - wChip;
        const yChip = 85;
        doc.setFillColor(...C.success);
        doc.roundedRect(xChip, yChip - hChip + 2, wChip, hChip, r, r, "F");
        doc.text(label, xChip + padX + 12, yChip - 8);
      }

      const contentRow = (items, cols) => drawGridRow(items, { cols });
      await sectionHeader("Order Details", { rightBigText: ` ${val("Lot Number", row)}` });
      await contentRow([
        { label: "Job Order No", value: joNum },
        { label: "Date", value: vDate("Date", row) },
        { label: "Lot Number", value: val("Lot Number", row) },
        { label: "Party Name", value: val("Party Name", row) },
        { label: "Brand", value: val("Brand", row) },
      ], 5);
      await contentRow([
        { label: "Fabric", value: val("Fabric", row) },
        { label: "Garment Type", value: val("Garment Type", row) },
        { label: "Section", value: val("Section", row) },
        { label: "Quantity", value: val("Quantity", row) },
        { label: "Unit", value: val("Unit", row) },
      ], 5);
      await contentRow([
        { label: "Season", value: val("Season", row) },
        { label: "Style", value: val("Style", row) },
        { label: "Pattern", value: val("Pattern", row) },
        { label: "Size", value: val("Size", row) },
        { label: "Priority", value: val("Priority", row) },
      ], 5);
      await contentRow([{ label: "Shade", value: val("Shade", row) }], 1);

      await sectionHeader("Special Processes");
      await contentRow([
        { label: "Embroidery", value: val("Emb", row) },
        { label: "Printing", value: val("Printing", row) },
        { label: "Direct Stitching", value: asBool(row?.["Direct Stitching"]) ? "Yes" : asText(row?.["Direct Stitching"]) },
        { label: "Component", value: val("Component", row) },
      ], 4);
      await contentRow([
        { label: "Embroidery Details", value: val("Emb Details", row) },
        { label: "Printing Details", value: val("Printing Details", row) },
      ], 2);

      await sectionHeader("Remarks & Visual Reference");
      const twoColW = (contentW() - GRID_COL_GAP) / 2;

      // left: remarks (lock height)
      const oldY = y;
      const remarksText = (row?.["Remarks"] ?? "").toString().trim() || "No remarks provided";
      await drawCard({ label: "Remarks", value: remarksText, x: M, w: twoColW });
      y = oldY;

      // right: image
      await tryDrawImage({ url: row?.["Image URL"], x: M + twoColW + GRID_COL_GAP, w: twoColW, h: 220 });

      // footer page 1
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(2);
      doc.line(M, h - FOOTER_H - 24, M + 120, h - FOOTER_H - 24);
      setFont("normal", F.meta, C.grayDark);
      doc.text(`Page 1 • ${joNum}`, w - M, h - FOOTER_H - 5, { align: "right" });
      setFont("normal", F.meta, C.grayDark);
      doc.text(`Submitted by: ${submittedBy}`, M, h - FOOTER_H - 5);
    };

    // ====== RENDER SECOND PAGE ======
    const renderSecondPage = async (row) => {
      const joNum = (row?.["Job Order No"] ?? "").toString().trim() || "Unknown";

      PAGE = innerPageScaffold();
      y = 100;

      setFont("bold", 24, C.primary);
      const lotNum = asText(row?.["Lot Number"]);
      doc.text(
        `JOB ORDER SUMMARY ${lotNum !== "—" ? `(${lotNum})` : ""}`,
        doc.internal.pageSize.getWidth() / 2,
        50,
        { align: "center" }
      );

      // ===== Boxed "Order Summary" (ONLY OUTER BORDER) =====
      {
        const short = (s, n) => { s = asText(s); return s === "—" || s.length <= n ? s : s.slice(0, n - 1) + "…"; };

        const pairs = [
          { label: "Job Order No", value: joNum },
          { label: "Date", value: vDate("Date", row) },
          { label: "Lot Number", value: val("Lot Number", row) },
          { label: "Party Name", value: short(val("Party Name", row), 28) },
          { label: "Fabric", value: short(val("Fabric", row), 40) },
          { label: "Brand", value: short(val("Brand", row), 40) },
          { label: "Garment Type", value: short(val("Garment Type", row), 40) },
          { label: "Section", value: short(val("Section", row), 40) },
          { label: "Season", value: short(val("Season", row), 40) },
          { label: "Shade", value: short(val("Shade", row), 40) },
          { label: "Quantity", value: val("Quantity", row) },
          { label: "Unit", value: val("Unit", row) },
          { label: "Style", value: short(val("Style", row), 40) },
          { label: "Priority", value: val("Priority", row) },
          { label: "Pattern", value: short(val("Pattern", row), 40) },
          { label: "Size", value: short(val("Size", row), 40) },
          { label: "Embroidery", value: short(val("Emb", row), 40) },
          { label: "Printing", value: short(val("Printing", row), 40) },
          { label: "Direct Stitching", value: asBool(row?.["Direct Stitching"]) ? "Yes" : asText(row?.["Direct Stitching"]) },
          { label: "Embroidery Details", value: short(val("Emb Details", row), 50) },
          { label: "Printing Details", value: short(val("Printing Details", row), 50) },
          { label: "Component", value: short(val("Component", row), 40) },
          { label: "Remarks", value: short(row?.["Remarks"] ?? "No remarks provided", 80) }
        ];

        const cols = 4;
        const rowHeight = 24;
        const rowGap = 10;
        const pad = 18;
        const titleH = 26;
        const titleGap = 10;

        const rows = Math.ceil(pairs.length / cols);
        const gridH = rows * (rowHeight + rowGap) - rowGap;
        const boxW = contentW();
        const boxH = pad + titleH + titleGap + gridH + pad;

        await ensurePageRoom(boxH);

        const boxX = M;
        const boxY = y;

        // Outer box only
        doc.setDrawColor(0, 0, 0);
        doc.setFillColor(...C.white);
        doc.setLineWidth(1);
        doc.roundedRect(boxX, boxY, boxW, boxH, 8, 8, "FD");

        // Title
        setFont("bold", F.h3, C.primary);
        doc.text("Order Summary", boxX + pad, boxY + pad + titleH - 6);

        // Content (NO inner borders)
        const innerX = boxX + pad;
        const innerYStart = boxY + pad + titleH + titleGap;
        const colW = (boxW - pad * 2 - GRID_COL_GAP * (cols - 1)) / cols;

        let drawY = innerYStart;
        for (let i = 0; i < pairs.length; i += cols) {
          const rowSlice = pairs.slice(i, i + cols);

          rowSlice.forEach((p, idx) => {
            const x = innerX + idx * (colW + GRID_COL_GAP);

            // Label: bold navy
            setFont("bold", F.small, C.primary);
            doc.text((p.label || "").toUpperCase(), x, drawY);

            // Value: bold black unless highlighted
            const isHL = new Set(["Lot Number", "Party Name", "Garment Type"]).has(String(p.label || "").trim());
            setFont("bold", F.small, isHL ? C.highlight : C.dark);

            const line = doc.splitTextToSize(asText(p.value), colW)[0] || "—";
            doc.text(line, x, drawY + 12);
          });

          drawY += rowHeight + rowGap;
        }

        // Advance after box
        y = boxY + boxH + GRID_ROW_GAP;
      }

      await sectionHeader("Full Remarks & Visual");
      const colGap = GRID_COL_GAP;
      const colW = (contentW() - colGap) / 2;
      const leftX = M;
      const rightX = M + colW + colGap;
      const yTop = y;

      const remarksTextFull = (row?.["Remarks"] ?? "").toString().trim() || "No remarks provided";
      await drawCard({ label: "Complete Remarks", value: remarksTextFull, x: leftX, w: colW });
      const bottomLeft = y;

      y = yTop;
      const estRightH = Math.max(220, bottomLeft - yTop);
      await tryDrawImage({ url: row?.["Image URL"], x: rightX, w: colW, h: estRightH });
      const bottomRight = yTop + estRightH;

      doc.setDrawColor(...C.border);
      doc.setLineWidth(1);
      doc.line(M + colW + colGap / 2, yTop + 6, M + colW + colGap / 2, Math.max(bottomLeft, bottomRight) - 6);

      y = Math.max(bottomLeft, bottomRight) + GRID_ROW_GAP;

      await sectionHeader("Cutting Schedule");
      const tableHeaders = [
        { label: "Table", key: "table", width: 1 },
        { label: "Shade", key: "shade", width: 2 },
        { label: "Quantity", key: "qty", width: 1 },
        { label: "Kharcha", key: "kharcha", width: 1 },
        { label: "Date of Cutting", key: "cut", width: 1.5 },
      ];

      // Parse shades (if any)
      const shadesArr = parseShades(val("Shade", row)).filter(s => String(s || "").trim() !== "");
      const minRows = 10;
      const rowCount = Math.max(minRows, shadesArr.length);

      const tableData = Array.from({ length: rowCount }, (_, i) => ({
        table: "",
        shade: shadesArr[i] != null ? String(shadesArr[i]) : "",
        qty: "",
        kharcha: "Yes / No",
        cut: "",
      }));

      await drawTable(tableHeaders, tableData, { rowH: 26, headerH: 32, fontScale: 0.95 });

      // footer page 2
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(2);
      doc.line(M, h - FOOTER_H - 24, M + 120, h - FOOTER_H - 24);
      setFont("normal", F.meta, C.grayDark);
      doc.text(`Page 2 • ${joNum}`, w - M, h - FOOTER_H - 5, { align: "right" });
      setFont("normal", F.meta, C.grayDark);
      doc.text(`Checked by: Monu Master`, M, h - FOOTER_H - 5);
      doc.setDrawColor(...C.border);
      doc.setLineWidth(1);
      doc.line(M, h - FOOTER_H - 12, M + 160, h - FOOTER_H - 12);
    };

    // ====== RENDER MATERIAL PLANNING PAGE ======
    const renderMaterialPage = async (row) => {
      const joNum = (row?.["Job Order No"] ?? "").toString().trim() || "Unknown";

      PAGE = innerPageScaffold();
      y = 75;

      // Helper function for shortening text
      const shortenText = (text, maxLength) => {
        if (!text || text === "—") return "—";
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + "...";
      };

      // ===== HEADER SECTION =====
      setFont("bold", 28, C.primary);
      doc.text("MATERIAL REQUISITION PLANNING", PAGE.w / 2, 55, { align: "center" });

      // Thicker decorative line
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(3);
      doc.line(PAGE.w / 2 - 120, 65, PAGE.w / 2 + 120, 65);

      // Job info - larger and better spaced
      y += 25;

      // Job info container
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(M, y - 5, contentW(), 40, 8, 8, "F");
      doc.setDrawColor(...C.border);
      doc.setLineWidth(1);
      doc.roundedRect(M, y - 5, contentW(), 40, 8, 8, "S");

      setFont("bold", 14, C.primary);
      doc.text(`JOB ORDER: ${joNum}`, M + 25, y + 10);

      setFont("bold", 14, C.highlight);
      doc.text(`LOT: ${val("Lot Number", row)}`, M + 180, y + 10);

      setFont("bold", 14, C.grayDark);
      doc.text(`PARTY: ${shortenText(val("Party Name", row), 22)}`, M + 350, y + 10);

      setFont("bold", 14, C.primary);
      doc.text(`DATE: ${vDate("Date", row)}`, PAGE.w - M - 25, y + 10, { align: "right" });

      y += 50;

      // ===== TWO COLUMN LAYOUT WITH BETTER SPACING =====
      const colGap = 25;
      const leftColW = (contentW() - colGap) * 0.55;
      const rightColW = (contentW() - colGap) * 0.45;

      // LEFT COLUMN: Material Specifications
      const leftX = M;
      const leftStartY = y;

      // Material Details Header - LARGER
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(leftX, y, leftColW, 38, 8, 8, "F");
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(2);
      doc.roundedRect(leftX, y, leftColW, 38, 8, 8, "S");

      setFont("bold", 18, C.primary);
      doc.text("MATERIAL SPECIFICATIONS", leftX + leftColW / 2, y + 24, { align: "center" });

      y += 48;

      // Material Details - BETTER SPACING AND LARGER FONTS
      const materialData = [
        // Basic Details
        { label: "FABRIC", value: val("Fabric", row) },
        { label: "BRAND", value: val("Brand", row) },
        { label: "GARMENT TYPE", value: val("Garment Type", row) },
        { label: "QUANTITY", value: `${val("Quantity", row)} ${val("Unit", row)}` },
        { label: "SIZE", value: val("Size", row) },
        { label: "STYLE", value: val("Style", row) },
        { label: "PATTERN", value: val("Pattern", row) },

        // Separator line
        { separator: true },

        // Components & Trims
        { label: "TAPE/LACE", value: val("Tape/Lace", row), highlight: true },
        { label: "BOTTOM TYPE", value: val("Bottom Type", row), highlight: true },
        { label: "ZIP", value: val("Zip", row), highlight: true },
        { label: "OTHER COMPONENTS", value: val("Component", row) },

        // Separator line
        { separator: true },

        // Planning Info
        { label: "SECTION", value: val("Section", row) },
        { label: "SEASON", value: val("Season", row) },
        { label: "PRIORITY", value: val("Priority", row), highlight: true },
        { label: "SUBMITTED BY", value: val("Submitted By", row) },
        { label: "REMARKS", value: shortenText(row?.["Remarks"] ?? "", 50) },
      ];

      const rowHeight = 23;
      const labelWidth = 130;

      for (let i = 0; i < materialData.length; i++) {
        const item = materialData[i];

        if (item.separator) {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(1);
          doc.line(leftX + 10, y + 8, leftX + leftColW - 10, y + 8);
          y += 15;
          continue;
        }

        await ensurePageRoom(rowHeight);

        // Label - LARGER FONT
        setFont("bold", 11, C.grayDark);
        doc.text(item.label, leftX + 15, y + 15);

        // Value - LARGER FONT
        const isHighlight = item.highlight;
        setFont("bold", 12, isHighlight ? C.highlight : C.dark);

        const valueText = item.value || "—";
        const maxWidth = leftColW - labelWidth - 25;

        // Check if text needs to be split
        const lines = doc.splitTextToSize(valueText, maxWidth);
        if (lines.length > 1) {
          for (let idx = 0; idx < lines.length; idx++) {
            doc.text(lines[idx], leftX + labelWidth + 15, y + 15 + (idx * 11));
          }
          y += (lines.length * 11) + 10;
        } else {
          doc.text(valueText, leftX + labelWidth + 15, y + 15);
          y += rowHeight;
        }
      }

      const leftColumnBottom = y;

      // RIGHT COLUMN: Image & Planning Status
      const rightX = M + leftColW + colGap;
      const rightStartY = leftStartY;
      let rightY = rightStartY;

      // Image Section Header - LARGER
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(rightX, rightY, rightColW, 38, 8, 8, "F");
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(2);
      doc.roundedRect(rightX, rightY, rightColW, 38, 8, 8, "S");

      setFont("bold", 18, C.primary);
      doc.text("VISUAL REFERENCE", rightX + rightColW / 2, rightY + 24, { align: "center" });

      rightY += 48;

      // Larger image container
      await ensurePageRoom(200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(rightX, rightY, rightColW, 190, 10, 10, "F");
      doc.setDrawColor(...C.border);
      doc.setLineWidth(1.5);
      doc.roundedRect(rightX, rightY, rightColW, 190, 10, 10, "S");

      // Try to draw image
      const hasImage = row?.["Image URL"] && String(row?.["Image URL"]).trim() !== "";
      if (hasImage) {
        try {
          const dataUrl = await withTimeout(
            loadImageAsBase64ForPdf(row["Image URL"], { maxWidth: 350, maxHeight: 150 }),
            IMG_TIMEOUT_MS
          );
          if (dataUrl) {
            const p = doc.getImageProperties(dataUrl);
            const fitW = rightColW - 50;
            const fitH = 150;
            const ratio = Math.min(fitW / p.width, fitH / p.height);
            const iw = Math.max(1, p.width * ratio);
            const ih = Math.max(1, p.height * ratio);
            const ix = rightX + (rightColW - iw) / 2;
            const iy = rightY + 20;
            doc.addImage(dataUrl, "JPEG", ix, iy, iw, ih);
          } else {
            setFont("normal", 13, C.grayDark);
            doc.text("No image available", rightX + rightColW / 2, rightY + 100, { align: "center" });
          }
        } catch {
          setFont("normal", 13, C.grayDark);
          doc.text("Image load failed", rightX + rightColW / 2, rightY + 100, { align: "center" });
        }
      } else {
        setFont("normal", 13, C.grayDark);
        doc.text("No image provided", rightX + rightColW / 2, rightY + 100, { align: "center" });
      }

      rightY += 205;

      // Planning Status Section - MUCH LARGER
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(rightX, rightY, rightColW, 38, 8, 8, "F");
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(2);
      doc.roundedRect(rightX, rightY, rightColW, 38, 8, 8, "S");

      setFont("bold", 18, C.primary);
      doc.text("PLANNING STATUS", rightX + rightColW / 2, rightY + 24, { align: "center" });

      rightY += 48;

      // Planning checklist - MUCH LARGER FONT AND SPACING
      const planningItems = [
        { label: "Material Ordered" },
        { label: "Fabric Received" },
        { label: "Zip Received" },
        { label: "Dori Received" },
        { label: "Label Received" },
        { label: "Tag Received" },
        { label: "Washcare Received" },
      ];

      for (let idx = 0; idx < planningItems.length; idx++) {
        const item = planningItems[idx];

        // Larger checkbox
        doc.setDrawColor(...C.border);
        doc.setLineWidth(1.2);
        doc.rect(rightX + 20, rightY - 5, 14, 14);

        // Label - MUCH LARGER FONT
        setFont("normal", 13, C.grayDark);
        doc.text(item.label, rightX + 45, rightY + 3);

        // Date field - LARGER FONT
        setFont("normal", 12, C.dark);
        doc.text("__ / __ / ____", rightX + rightColW - 25, rightY + 3, { align: "right" });

        rightY += 22;
      }

      const rightColumnBottom = rightY;

      // Set y to the maximum of both columns
      y = Math.max(leftColumnBottom, rightColumnBottom);

      // Add spacing after columns
      y += 30;

      // ===== MATERIAL REQUIREMENTS TABLE - LARGER =====
      await ensurePageRoom(50);

      // Table header - LARGER
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(M, y, contentW(), 42, 8, 8, "F");
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(2);
      doc.roundedRect(M, y, contentW(), 42, 8, 8, "S");

      setFont("bold", 18, C.primary);
      doc.text("MATERIAL REQUIREMENTS", M + contentW() / 2, y + 26, { align: "center" });

      y += 52;

      // Material Requirements Table with LARGER FONTS
      const requirementsHeaders = [
        { label: "MATERIAL ITEM", key: "item", width: 2 },
        { label: "DESCRIPTION", key: "description", width: 2 },
        { label: "ORDERED QTY", key: "ordered", width: 1 },
        { label: "RECEIVED QTY", key: "received", width: 1 },
        { label: "STATUS", key: "status", width: 1.5 },
      ];

      const requirementsData = [
        {
          item: "MAIN FABRIC",
          description: val("Fabric", row),
          ordered: "",
          received: "",
          status: ""
        },
        {
          item: "ZIPPERS",
          description: val("Zip", row) || "As per design",
          ordered: "",
          received: "",
          status: ""
        },
        {
          item: "TAPE/LACE",
          description: val("Tape/Lace", row) || "As required",
          ordered: "",
          received: "",
          status: ""
        },
        {
          item: "BOTTOM MATERIAL",
          description: val("Bottom Type", row) || "As per style",
          ordered: "",
          received: "",
          status: ""
        },
        {
          item: "THREAD",
          description: "Matching thread",
          ordered: "",
          received: "",
          status: ""
        },
        {
          item: "LABELS",
          description: "Brand Labels",
          ordered: "",
          received: "",
          status: ""
        },
        {
          item: "TAGS",
          description: "Price/Style Tags",
          ordered: "",
          received: "",
          status: ""
        },
        {
          item: "PACKAGING",
          description: "Polybags/Cartons",
          ordered: "",
          received: "",
          status: ""
        },
        {
          item: "OTHER COMPONENTS",
          description: val("Component", row) || "Various trims",
          ordered: "",
          received: "",
          status: ""
        },
      ];

      await drawTable(requirementsHeaders, requirementsData, {
        rowH: 28,
        headerH: 34,
        fontScale: 0.9
      });

      // ===== SIGNATURE SECTION - LARGER =====
      await ensurePageRoom(70);
      y += 25;

      // Signature container
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(M, y, contentW(), 70, 10, 10, "F");
      doc.setDrawColor(...C.border);
      doc.setLineWidth(1.5);
      doc.roundedRect(M, y, contentW(), 70, 10, 10, "S");

      // Preparation signature - LARGER
      setFont("bold", 13, C.primary);
      doc.text("PREPARED BY MATERIAL PLANNING:", M + 25, y + 22);

      setFont("normal", 12, C.grayDark);
      doc.text("Signature: _______________________", M + 280, y + 22);
      doc.text("Date: ______ / ______ / ______", M + 500, y + 22);

      // Approval signature - LARGER
      setFont("bold", 13, C.primary);
      doc.text("APPROVED BY:", M + 25, y + 48);

      setFont("normal", 12, C.grayDark);
      doc.text("Signature: _______________________", M + 280, y + 48);
      doc.text("Date: ______ / ______ / ______", M + 500, y + 48);

      // ===== FOOTER =====
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(2);
      doc.line(M, h - FOOTER_H - 24, M + 120, h - FOOTER_H - 24);
      setFont("normal", F.meta, C.grayDark);
      doc.text(`Material Planning • ${joNum}`, w - M, h - FOOTER_H - 5, { align: "right" });
      setFont("normal", F.meta, C.grayDark);
      doc.text(`For Planning Department`, M, h - FOOTER_H - 5);
    };

    // ====== LOOP VISIBLE ROWS ======
    const toExport = sorted.filter(r =>
      inRange(r["Job Order No"], joStart, joEnd) &&
      inRange(r["Lot Number"], lotStart, lotEnd)
    );

    let wroteAny = false;
    let skipped = 0;

    for (let i = 0; i < toExport.length; i++) {
      const row = toExport[i];
      const hasLot = Boolean((row["Lot Number"] ?? "").toString().trim());
      if (!hasLot) { skipped++; continue; }

      if (wroteAny) doc.addPage(); // new page per order

      if (which === "material") {
        await renderMaterialPage(row);
      } else if (which === "first") {
        await renderFirstPage(row);
      } else {
        await renderSecondPage(row);
      }

      wroteAny = true;

      if (i % 3 === 0) await pause(0);
    }

    if (!wroteAny) {
      alert("No eligible rows to export (all filtered rows are missing Lot Number).");
      return;
    }

    const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
    const ts = new Date().toISOString().slice(0, 10);
    const fname = `JobOrders_${which === "first" ? "FirstPages" : which === "second" ? "SecondPages" : "MaterialPlanning"}_${ts}.pdf`;

    try {
      await doc.save(safe(fname), { returnPromise: true });
    } catch {
      doc.save(safe(fname));
    }

    if (skipped > 0) console.info(`Skipped ${skipped} row(s) without Lot Number`);
  } catch (e) {
    console.error(e);
    alert(`Could not create batch PDF: ${e.message}`);
  } finally {
    setPdfBatchBusy(null);
  }
};


  /* =================== UI (unchanged) =================== */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .jox-theme {
          --jox-bg:#ffffff; --jox-bg-soft:#fafbff; --jox-card:#ffffff; --jox-border:#e5e7eb;
          --jox-text:#0f172a; --jox-text-sub:#64748b; --jox-brand:#4f46e5; --jox-brand-700:#4338ca;
          --jox-ghost:#f1f5f9; --jox-shadow:0 1px 3px rgba(0,0,0,0.05), 0 6px 18px rgba(2,6,23,0.06);
          --jox-radius:14px; --jox-focus:0 0 0 3px rgba(79,70,229,0.18); --jox-table-stripe:#f8fafc;
          --jox-table-hover:#f1f5f9; --jox-danger-bg:#fee2e2; --jox-danger-border:#fecaca; --jox-danger-text:#b91c1c;
          --jox-muted:#94a3b8; --jox-badge-bg:#e2e8f0; --jox-badge-text:#334155;
        }
        @keyframes jox-fade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes jox-shimmer { 0%{background-position:-468px 0} 100%{background-position:468px 0} }
        .jox{max-width:2400px;margin:0 auto;padding:1.5rem 1rem;color:var(--jox-text);background:var(--jox-bg);
             font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;}
        @media (min-width:768px){.jox{padding:2rem}}
        .jox-header{display:grid;gap:1rem;grid-template-columns:1fr;background:var(--jox-card);border:1px solid var(--jox-border);
          border-radius:var(--jox-radius);padding:1rem;box-shadow:var(--jox-shadow);animation:jox-fade .25s ease-out;}
        @media (min-width:960px){.jox-header{grid-template-columns:1fr auto;align-items:center}}
        .jox-header__left{display:flex;align-items:center;gap:1rem}
        .jox-header__right{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
        .jox-brand{display:flex;align-items:center;gap:.9rem}
        .jox-brand__logo{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;
          background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:24px;box-shadow:0 4px 6px rgba(0,0,0,0.08);}
        @media (min-width:768px){.jox-brand__logo{width:56px;height:56px;font-size:28px}}
        .jox-brand__meta{display:grid}
        .jox-brand__title{display:flex;align-items:center;gap:.5rem;margin:0;font-size:1.4rem;font-weight:700;color:var(--jox-text)}
        .jox-brand__sub{display:flex;align-items:center;gap:.35rem;color:var(--jox-text-sub);font-size:.9rem;margin-top:.15rem}
        .jox-badge{display:inline-flex;align-items:center;gap:.25rem;background:var(--jox-badge-bg);color:var(--jox-badge-text);
          border-radius:999px;padding:.15rem .5rem;font-size:.75rem;font-weight:600}
        .jox-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--jox-brand);color:#fff;border:0;border-radius:10px;
          padding:.7rem 1rem;font-weight:700;font-size:.9rem;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);
          transition:transform .15s ease,background .15s ease,opacity .15s ease}
        .jox-btn:hover{background:var(--jox-brand-700);transform:translateY(-1px)}
        .jox-btn:active{transform:translateY(0)}
        .jox-btn:disabled{background:#e2e8f0;color:#94a3b8;cursor:not-allowed;transform:none}
        .jox-btn--light{background:#fff;color:var(--jox-brand);border:1px solid var(--jox-border)}
        .jox-btn--light:hover{background:#f8fafc;color:var(--jox-brand-700)}
        .jox-btn--ghost{background:var(--jox-ghost);color:#334155;border:1px solid transparent}
        .jox-btn--ghost:hover{background:#e2e8f0}
        .jox-ico{width:1.1em;display:inline-block;text-align:center}
        .jox-panel{background:var(--jox-card);border:1px solid var(--jox-border);border-radius:var(--jox-radius);padding:1rem;margin-top:1rem;
          box-shadow:var(--jox-shadow);animation:jox-fade .25s ease-out}
        .jox-panel__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
        .jox-panel__title{margin:0;display:flex;align-items:center;gap:.5rem;font-size:1.15rem}
        .jox-input,.jox-select{width:90%;padding:.7rem 1rem;border:1px solid var(--jox-border);border-radius:10px;background:#fff;font-size:.92rem;
          transition:box-shadow .15s ease,border-color .15s ease,background .15s ease}
        .jox-input:focus,.jox-select:focus{outline:none;border-color:var(--jox-brand);box-shadow:var(--jox-focus)}
        .jox-input--search{box-shadow:inset 0 1px 2px rgba(0,0,0,0.04)}
        .jox-filters{display:grid;gap:.9rem;grid-template-columns:1fr}
        @media (min-width:768px){.jox-filters{grid-template-columns:repeat(2,1fr)}}
        @media (min-width:1024px){.jox-filters{grid-template-columns:1.5fr repeat(3,1fr)}}
        @media (min-width:1280px){.jox-filters{grid-template-columns:1.5fr repeat(6,1fr)}}
        .jox-alert{display:flex;align-items:center;gap:.6rem;padding:.85rem 1rem;border-radius:12px;border:1px solid;animation:jox-fade .2s ease-out}
        .jox-alert--error{background:var(--jox-danger-bg);color:var(--jox-danger-text);border-color:var(--jox-danger-border)}
        .jox-skel{padding:3rem;text-align:center;border-radius:12px;color:var(--jox-muted);
          background:linear-gradient(to right,#f1f5f9 8%,#e2e8f0 18%,#f1f5f9 33%);background-size:800px 104px;animation:jox-shimmer 1.5s infinite linear}
        .jox-th--expander{width:38px;text-align:center}
        .jox-td--expander{text-align:center}
        .jox-expander{background:var(--jox-ghost);border:1px solid var(--jox-border);border-radius:8px;padding:.2rem .45rem;cursor:pointer}
        .jox-expander:hover{background:#e2e8f0}
        .jox-tr--details td{background:#f8fafc}
        .jox-td--details{padding:.8rem 1rem}
        .jox-prio{
  display:inline-flex; align-items:center; gap:.35rem;
  padding:.2rem .55rem; border-radius:999px; font-size:.78rem; font-weight:800;
  border:1px solid var(--jox-border); letter-spacing:.02em; text-transform:uppercase;
}
.jox-prio--high{ background:#fee2e2; color:#991b1b; border-color:#fecaca; }
.jox-prio--med { background:#ffedd5; color:#9a3412; border-color:#fed7aa; }
.jox-prio--low { background:#dcfce7; color:#166534; border-color:#bbf7d0; }

        .jox-detail{display:grid;grid-template-columns:repeat(2,minmax(220px,1fr));gap:10px 16px}
        @media (min-width:1280px){.jox-detail{grid-template-columns:repeat(3,minmax(220px,1fr))}}
        @media (min-width:1680px){.jox-detail{grid-template-columns:repeat(4,minmax(220px,1fr))}}
        .jox-detail__item{background:#fff;border:1px solid var(--jox-border);border-radius:10px;padding:.6rem .8rem}
        .jox-detail__label{font-size:.78rem;color:var(--jox-text-sub);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.25rem;font-weight:700}
        .jox-detail__value{color:var(--jox-text);word-break:break-word}
        .jox-btn--sm{padding:.45rem .7rem;font-size:.82rem;border-radius:8px}
        .jox-tablewrap{overflow-x:auto;border:1px solid var(--jox-border);border-radius:12px;background:var(--jox-card);
          box-shadow:var(--jox-shadow);margin-top:1rem;animation:jox-fade .25s ease-out}
        .jox-table{width:100%;min-width:1500px;border-collapse:collapse;font-size:.92rem}
        .jox-thead{position:sticky;top:0;z-index:5}
        .jox-th{text-align:left;padding:1rem;background:#f8fafc;border:1px solid var(--jox-border);white-space:nowrap;user-select:none;cursor:pointer;position:relative}
        .jox-th:hover{background:#f1f5f9}
        .jox-th--active{background:#eef2ff;color:var(--jox-brand);border-bottom:2px solid var(--jox-brand)}
        .jox-th__label{margin-right:.35rem;font-weight:700}
        .jox-th__sort{opacity:.8;font-size:.8rem}
        .jox-th--actions{width:160px;text-align:center}
        .jox-tr:nth-child(even){background:var(--jox-table-stripe)}
        .jox-tr:hover{background:var(--jox-table-hover);transition:background .15s ease}
        .jox-td{padding:1rem;border:1px solid var(--jox-border);color:black;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .jox-td:hover{background:#f8fafc}
        .jox-td.is-num{text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
        .jox-td--actions{text-align:center}
        .jox-empty{padding:3rem;text-align:center;color:var(--jox-text-sub);font-size:.95rem;border:1px solid var(--jox-border);background:#f8fafc}
        .jox-muted{color:var(--jox-muted)}
        .jox-pager{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:1rem;color:#475569;font-size:.92rem}
        .jox-pager__controls{display:flex;align-items:center;gap:.6rem}
        .jox-pager__page{padding:.35rem .6rem;border-radius:999px;background:var(--jox-bg-soft);border:1px solid var(--jox-border)}
        .jox-modal{position:fixed;inset:0;background:rgba(2,6,23,.6);display:flex;align-items:center;justify-content:center;z-index:9999;animation:jox-fade .15s ease-out}
        .jox-modal__card{background:#fff;border-radius:16px;padding:12px;width:92vw;max-width:1400px;max-height:90vh;box-shadow:0 10px 30px rgba(2,6,23,.35);display:grid;gap:10px}
        .jox-modal__head{display:flex;align-items:center;justify-content:space-between;padding:4px 6px 0 6px}
        .jox-modal__title{color:var(--jox-text)}
        .jox-modal__body{overflow:hidden}
        .jox-modal__frame{width:100%;height:80vh;border:none;border-radius:12px;background:#000}
      `}</style>

      <div className="jox jox-theme">
        {/* ===== Header ===== */}
        <header className="jox-header">
          <div className="jox-header__left">
            <button className="jox-btn jox-btn--ghost" onClick={() => navigate(-1)} title="Go back">
              <span className="jox-ico">←</span><span>Back</span>
            </button>

            <div className="jox-brand">
              <div className="jox-brand__logo" aria-hidden>📋</div>
              <div className="jox-brand__meta">
                <h1 className="jox-brand__title">
                  Job Orders <span className="jox-badge">{rows.length} records</span>
                </h1>
                <div className="jox-brand__sub">
                  <span className="jox-ico">🔗</span> All JobOrder Data
                </div>
              </div>
            </div>
          </div>

          <div className="jox-header__right">
            {lastRow != null && rowLimit < lastRow && (
              <button
                className="jox-btn jox-btn--light"
                onClick={() => setRowLimit((n) => Math.min(lastRow, n + LOAD_MORE_CHUNK))}
                disabled={loading || refreshing}
                title={`Load ${LOAD_MORE_CHUNK} more rows`}
              >
                <span className="jox-ico">➕</span>
                Load {Math.min(LOAD_MORE_CHUNK, Math.max(0, (lastRow || 0) - rowLimit))} more
              </button>
            )}

            <select
              className="jox-select"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              title="Rows per page"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>

            <button className="jox-btn" onClick={exportCsv} title="Export current view to CSV">
              <span className="jox-ico">📤</span><span>Export CSV</span>
            </button>

            <button
              className="jox-btn"
              onClick={() => {
                const controller = new AbortController();
                fetchData({ isRefresh: true, signal: controller.signal });
              }}
              disabled={loading || refreshing}
              title="Refresh data from Google Sheets"
            >
              <span className="jox-ico">{refreshing ? "⏳" : "🔄"}</span>
              <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
            </button>
            <button
  className="jox-btn"
  onClick={() => exportBatchPages("first")}
  disabled={loading || refreshing || pdfBatchBusy || rows.length === 0}
  title="Download a single PDF containing page 1 of every matching order"
>
  <span className="jox-ico">{pdfBatchBusy === "first" ? "⏳" : "⬇️"}</span>
  <span>{pdfBatchBusy === "first" ? "Building…" : "Download First Pages"}</span>
</button>

<button
  className="jox-btn"
  onClick={() => exportBatchPages("second")}
  disabled={loading || refreshing || pdfBatchBusy || rows.length === 0}
  title="Download a single PDF containing page 2 of every matching order"
>
  <span className="jox-ico">{pdfBatchBusy === "second" ? "⏳" : "⬇️"}</span>
  <span>{pdfBatchBusy === "second" ? "Building…" : "Download Second Pages"}</span>
</button>
<button
  className="jox-btn"
  onClick={() => exportBatchPages("material")}
  disabled={loading || refreshing || pdfBatchBusy || rows.length === 0}
  title="Download a single PDF containing Material Requisition Planning pages for every matching order"
>
  <span className="jox-ico">{pdfBatchBusy === "material" ? "⏳" : "📋"}</span>
  <span>{pdfBatchBusy === "material" ? "Building…" : "Download Material Planning"}</span>
</button>
          </div>
        </header>

        {/* ===== Filters ===== */}
        <section className="jox-panel">
          <div className="jox-panel__head">
            <h2 className="jox-panel__title"><span className="jox-ico">🔍</span>Filters & Search</h2>
            <button className="jox-btn jox-btn--ghost" onClick={clearFilters}>
              <span className="jox-ico">🔄</span><span>Reset Filters</span>
            </button>
          </div>

          <div className="jox-filters">
            <input
              className="jox-input jox-input--search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by party, JO no, fabric, shade…"
            />

            <select className="jox-select" value={fFabric}  onChange={(e) => { setFFabric(e.target.value); setPage(1); }} title="Filter by Fabric">
              <option value="">👗 All Fabrics</option>
              {fabricOpts.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select className="jox-select" value={fBrand}   onChange={(e) => { setFBrand(e.target.value); setPage(1); }} title="Filter by Brand">
              <option value="">🏷️ All Brands</option>
              {brandOpts.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select className="jox-select" value={fShade}   onChange={(e) => { setFShade(e.target.value); setPage(1); }} title="Filter by Shade">
              <option value="">🎨 All Shades</option>
              {shadeOpts.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select className="jox-select" value={fParty}   onChange={(e) => { setFParty(e.target.value); setPage(1); }} title="Filter by Party">
              <option value="">👥 All Parties</option>
              {partyOpts.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select className="jox-select" value={fSeason}  onChange={(e) => { setFSeason(e.target.value); setPage(1); }} title="Filter by Season">
              <option value="">🌦️ All Seasons</option>
              {seasonOpts.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select className="jox-select" value={fUnit} onChange={(e) => { setFUnit(e.target.value); setPage(1); }} title="Filter by Unit">
              <option value="">📦 All Units</option>
              {unitOpts.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="jox-select" value={fTapeLace} onChange={(e) => { setFTapeLace(e.target.value); setPage(1); }} title="Filter by Tape/Lace">
  <option value="">🎗️ All Tape/Lace</option>
  {tapeLaceOpts.map((v) => <option key={v} value={v}>{v}</option>)}
</select>

<select className="jox-select" value={fBottomType} onChange={(e) => { setFBottomType(e.target.value); setPage(1); }} title="Filter by Bottom Type">
  <option value="">👖 All Bottom Types</option>
  {bottomTypeOpts.map((v) => <option key={v} value={v}>{v}</option>)}
</select>

<select className="jox-select" value={fZip} onChange={(e) => { setFZip(e.target.value); setPage(1); }} title="Filter by Zip">
  <option value="">🤐 All Zips</option>
  {zipOpts.map((v) => <option key={v} value={v}>{v}</option>)}
</select>

            <select className="jox-select" value={fDS} onChange={(e) => { setFDS(e.target.value); setPage(1); }} title="Filter by Direct Stitching">
              <option value="">🧵 DS: Any</option>
              {dsOpts.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select className="jox-select" value={fLot} onChange={(e) => { setFLot(e.target.value); setPage(1); }} title="Filter by Lot Number">
              <option value="">🔢 All Lot Numbers</option>
              {lotOpts.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select className="jox-select" value={fSection} onChange={(e) => { setFSection(e.target.value); setPage(1); }} title="Filter by Section">
              <option value="">🏢 All Sections</option>
              {sectionOpts.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select className="jox-select" value={fPattern} onChange={(e) => { setFPattern(e.target.value); setPage(1); }} title="Filter by Pattern">
              <option value="">🧵 All Patterns</option>
              {patternOpts.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select
  className="jox-select"
  value={fPriority}
  onChange={(e) => { setFPriority(e.target.value); setPage(1); }}
  title="Filter by Priority"
>
  <option value="">⚡ All Priorities</option>
  {priorityOpts.map((v) => <option key={v} value={v}>{v}</option>)}
</select>

            <select className="jox-select" value={fSubmittedBy} onChange={(e) => { setFSubmittedBy(e.target.value); setPage(1); }} title="Filter by Submitted By">
              <option value="">👤 All Submitters</option>
              {submittedByOpts.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            {/* ===== Range Filters ===== */}
<div>
  <div style={{fontSize:'.82rem', fontWeight:700, color:'var(--jox-text-sub)', margin:'0 0 .35rem .25rem'}}>
    Job Order No — Range
  </div>
  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.5rem'}}>
    <input
      className="jox-input"
      placeholder="From (e.g., JO-100)"
      value={joStart}
      onChange={(e) => { setJoStart(e.target.value); setPage(1); }}
    />
    <input
      className="jox-input"
      placeholder="To (e.g., JO-150)"
      value={joEnd}
      onChange={(e) => { setJoEnd(e.target.value); setPage(1); }}
    />
  </div>
</div>

<div>
  <div style={{fontSize:'.82rem', fontWeight:700, color:'var(--jox-text-sub)', margin:'0 0 .35rem .25rem'}}>
    Lot Number — Range
  </div>
  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.5rem'}}>
    <input
      className="jox-input"
      placeholder="From (e.g., 1001)"
      value={lotStart}
      onChange={(e) => { setLotStart(e.target.value); setPage(1); }}
    />
    <input
      className="jox-input"
      placeholder="To (e.g., 1020)"
      value={lotEnd}
      onChange={(e) => { setLotEnd(e.target.value); setPage(1); }}
    />
  </div>
</div>

          </div>
        </section>

        {/* ===== Status / Errors ===== */}
        {error && (
          <div className="jox-alert jox-alert--error">
            <span className="jox-ico">❌</span><span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="jox-skel">Loading job orders…</div>
        ) : (
          <>
            {/* ===== Table ===== */}
            <div className="jox-tablewrap">
              <table className="jox-table">
                <thead className="jox-thead">
                  <tr>
                    <th className="jox-th jox-th--expander" aria-label="Expand/Collapse" />
                    {VISIBLE_HEADERS.map((H) => (
                      <th
                        key={H}
                        onClick={() => clickHeader(H)}
                        className={
                          "jox-th " +
                          (sort.key === H ? "jox-th--active " + (sort.dir === "asc" ? "is-asc" : "is-desc") : "")
                        }
                      >
                        <span className="jox-th__label">{H}</span>
                        <span className="jox-th__sort">{sort.key === H ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span>
                      </th>
                    ))}
                    <th className="jox-th jox-th--actions">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td className="jox-empty" colSpan={VISIBLE_HEADERS.length + 2 /* expander + actions */}>
                        No matching job orders found
                      </td>
                    </tr>
                  ) : (
                    paged.map((r, idx) => {
                      const open = expanded.has(r.__sheetRow);
                      const colSpanAll = VISIBLE_HEADERS.length + 2;

                      return (
                        <React.Fragment key={r.__sheetRow ?? idx}>
                          <tr className="jox-tr">
                            {/* Expander */}
                            <td className="jox-td jox-td--expander">
                              <button
                                className="jox-expander"
                                aria-expanded={open}
                                aria-label={open ? "Collapse details" : "Expand details"}
                                onClick={() =>
                                  setExpanded((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(r.__sheetRow)) next.delete(r.__sheetRow);
                                    else next.add(r.__sheetRow);
                                    return next;
                                  })
                                }
                              >
                                <span className="jox-ico">{open ? "▾" : "▸"}</span>
                              </button>
                            </td>

                            {/* Visible cells only */}
                           {VISIBLE_HEADERS.map((H) => (
  <td key={H} className={"jox-td " + (H === "Quantity" ? "is-num" : "")}>
{/* -   {formatCell(H, r[H])} */}
   {H === "Priority"
     ? (() => {
         const lvl = normalizePriority(r["Priority"]);
         return <span className={priorityClass(lvl)}>{lvl || "—"}</span>;
       })()
     : formatCell(H, r[H])}
  </td>
))}

                            {/* Actions */}
                            <td className="jox-td jox-td--actions">
                              {(() => {
                                const hasLot = Boolean((r["Lot Number"] ?? "").toString().trim());
                                const jo = (r["Job Order No"] ?? "").toString().trim();
                                const isBusyThis = pdfBusyId && pdfBusyId === jo;

                                return (
                                  <button
                                    className="jox-btn"
                                    onClick={() => hasLot && generatePdf(r)}
                                    disabled={!hasLot || Boolean(pdfBusyId)}
                                    title={
                                      hasLot
                                        ? (isBusyThis ? "Generating…" : "Download PDF of this Job Order")
                                        : "No Lot Number — cannot export"
                                    }
                                  >
                                    <span className="jox-ico">{isBusyThis ? "⏳" : "📝"}</span>
                                    <span>{isBusyThis ? "Working…" : "Create PDF"}</span>
                                  </button>
                                );
                              })()}
                            </td>
                          </tr>

                          {/* Details row */}
                          {open && (
                            <tr className="jox-tr jox-tr--details">
                              <td className="jox-td jox-td--details" colSpan={colSpanAll}>
                                <div className="jox-detail">
                                  {DETAIL_HEADERS.map((H) => {
                                    if (H === "Image URL") {
                                      const raw = r[H];
                                      const has = !!(raw && raw.toString().trim());
                                      return (
                                        <div key={H} className="jox-detail__item">
                                          <div className="jox-detail__label">{H}</div>
                                          <div className="jox-detail__value">
                                            {has ? (
                                              <button
                                                className="jox-btn jox-btn--light jox-btn--sm"
                                                onClick={() =>
                                                  setPreview({
                                                    open: true,
                                                    src: getEmbeddableImageSrc(raw),
                                                    alt: `Image • JO ${r["Job Order No"] || ""}`,
                                                  })
                                                }
                                              >
                                                <span className="jox-ico">🖼️</span> View
                                              </button>
                                            ) : (
                                              <span className="jox-muted">No image</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    }
                                     if (H === "Priority") {
   const lvl = normalizePriority(r["Priority"]);
   return (
     <div key={H} className="jox-detail__item">
       <div className="jox-detail__label">{H}</div>
       <div className="jox-detail__value">
         <span className={priorityClass(lvl)}>{lvl || "—"}</span>
       </div>
     </div>
   );
 }
                                    if (H === "Lot Number") return null; // already visible
                                    return (
                                      <div key={H} className="jox-detail__item">
                                        <div className="jox-detail__label">{H}</div>
                                        <div className="jox-detail__value">{formatCell(H, r[H]) || "—"}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ===== Pagination ===== */}
            <div className="jox-pager">
              <div className="jox-pager__info">
                📊 Showing {start + 1}-{Math.min(start + pageSize, sorted.length)} of {sorted.length}
              </div>
              <div className="jox-pager__controls">
                <button
                  className="jox-btn jox-btn--light"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe === 1}
                >
                  <span className="jox-ico">⬅️</span><span>Previous</span>
                </button>

                <span className="jox-pager__page">Page {pageSafe} of {totalPages}</span>

                <button
                  className="jox-btn jox-btn--light"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe === totalPages}
                >
                  <span>Next</span><span className="jox-ico">➡️</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== Modal Preview ===== */}
        {preview.open && (
          <div className="jox-modal" onClick={() => setPreview({ open: false, src: "", alt: "" })}>
            <div className="jox-modal__card" onClick={(e) => e.stopPropagation()}>
              <div className="jox-modal__head">
                <strong className="jox-modal__title">{preview.alt || "Image preview"}</strong>
                <button className="jox-btn jox-btn--ghost" onClick={() => setPreview({ open: false, src: "", alt: "" })}>✕</button>
              </div>
              <div className="jox-modal__body">
                <iframe src={preview.src} title={preview.alt || "preview"} className="jox-modal__frame" allow="fullscreen" />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default JobOrders;
