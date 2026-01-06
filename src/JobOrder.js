import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const SHEET_ID = "1Frg7kHPiiGeydB02LsGKJ-0UeO8N45-19skJRRvU_Qg";
const DROPDOWNS_TAB = "Parties";
const JOBS_TAB = "JobOrder";
const SHEET_ID1 = "1fKSwGBIpzWEFk566WRQ4bzQ0anJlmasoY8TwrTLQHXI";

const MAX_ROWS = 10000;
const GAS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwQtP1YEUpTTrzXddez5Dp3kwb08Ezlpc7KQzWY13mSb-RsWThand5LooEBmiAaNNV2lA/exec";

const HEADER_MAP = {
  partyName: "Party Name",
  garmentType: "Garment Type",
  section: "Section",
  season: "Season",
  emb: "Emb",
  printing: "Printing",
  pattern: "Pattern",
  style: "Style",
};

const UNIT_OPTIONS = ["SETS", "ROLLS", "PCS"];
const ZIP_OPTIONS = ["YES", "NO", "NOT DECIDED"];
const BOTTOM_TYPE_OPTIONS = ["Elastic and Stopper", "Normal Fold", "1 Inch Elastic"]; // NEW: Bottom Type options
const SUBMITTERS = ["Mohit Goyal", "EA", "Chandan", "Ravinder Singh"];
const OTHER_SUBMITTER_TOKEN = "__ANY_OTHER__";
const REFERRERS = ["Mohit Goyal", "EA", "Varun Goyal"];
const TAPE_LACE_OPTIONS = ["YES", "NO", "NOT DECIDED"];
const OTHER_REFERRER_TOKEN = "__ANY_OTHER__";

const JobOrderForm = () => {
  const today = new Date().toISOString().split("T")[0];
  const location = useLocation();
  const [params] = useSearchParams();

 const [formData, setFormData] = useState({
  jobOrderNo: "",
  date: today,
  fabric: "",
  brand: "",
  shade: "",
  quantity: "",
  unit: "",
  size: "",
  partyName: "",
  garmentType: "",
  section: "",
  season: "",
  emb: "",
  printing: "",
  pattern: "",
  style: "",
  zip: "",
  bottomType: "",
  tapeLace: "", // ADD THIS LINE
  remarks: "",
  directStitching: "no",
  orderNo: "",
  priority: "MEDIUM",
});

  const [lists, setLists] = useState(
    Object.keys(HEADER_MAP).reduce((a, k) => ({ ...a, [k]: [] }), {})
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [showSubmitterDialog, setShowSubmitterDialog] = useState(false);
  const [submitterName, setSubmitterName] = useState("");
  const [customSubmitter, setCustomSubmitter] = useState("");
  const [pendingPayload, setPendingPayload] = useState(null);
  const [showShadeDialog, setShowShadeDialog] = useState(false);
  const [shadeRows, setShadeRows] = useState([{ shade: "", combos: "" }]);
  const [showSizeDialog, setShowSizeDialog] = useState(false);
  const [sizeRows, setSizeRows] = useState([{ value: "" }]);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressStage, setProgressStage] = useState("preparing");
  const [progressPct, setProgressPct] = useState(0);
  const [activeXhr, setActiveXhr] = useState(null);
  const [showEmbDialog, setShowEmbDialog] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [showRepeatDialog, setShowRepeatDialog] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [referrerName, setReferrerName] = useState("Mohit Goyal");
  const [customReferrer, setCustomReferrer] = useState("");
  const [showStyleDialog, setShowStyleDialog] = useState(false);
  const [styleOtherText, setStyleOtherText] = useState("");

  const JOB_HEADERS = [
  "Job Order No",
  "Order No.",
  "Date",
  "Fabric",
  "Brand",
  "Shade",
  "Size",
  "Quantity",
  "Unit",
  "Party Name",
  "Garment Type",
  "Section",
  "Season",
  "Emb",
  "Printing",
  "Emb Details",
  "Printing Details",
  "Pattern",
  "Style",
  "Zip",
  "Bottom Type",
  "Tape/Lace", // ADD THIS LINE - New field
  "Remarks",
  "Direct Stitching",
  "Submitted By",
  "Image URL",
  "Priority",
];

  const [embPositions, setEmbPositions] = useState({
    FRONT: false,
    BACK: false,
    RIB: false,
    ARM: false,
    LEFT: false,
    RIGHT: false,
    POCKET: false,
    COLLAR: false,
    HOOD: false,
    GULLA :false,
    other: "",
  });

  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printPositions, setPrintPositions] = useState({
    FRONT: false,
    BACK: false,
    RIB: false,
    ARM: false,
    LEFT: false,
    RIGHT: false,
    POCKET: false,
    COLLAR: false,
    HOOD: false,
    GULLA :false,
    other: "",
  });

  const [showPatternDialog, setShowPatternDialog] = useState(false);
  const [patternOtherText, setPatternOtherText] = useState("");

  function parseShadeString(s) {
    const src = String(s || "").trim();
    if (!src) return [{ shade: "", combos: "" }];
    return src.split(/\s*,\s*/).map((part) => {
      const m = part.match(/^(.+?)\s*\((.+)\)$/);
      if (m) return { shade: m[1].trim(), combos: m[2].trim() };
      return { shade: part.trim(), combos: "" };
    });
  }

  const incomingOrderNo =
    location.state?.orderNo ||
    location.state?.prefill?.["Order No."] ||
    params.get("ref") ||
    "";

  const SIZE_ORDER = ["S", "M", "L", "XL", "XXL", "XXL"];

  function normalizeSizeTok(s) {
    return String(s || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  function sizeSortKey(s) {
    const t = normalizeSizeTok(s);
    const ai = SIZE_ORDER.indexOf(t);
    if (ai >= 0) return `A-${ai.toString().padStart(2, "0")}`;
    if (/^\d+$/.test(t)) return `N-${parseInt(t, 10).toString().padStart(3, "0")}`;
    return `Z-${t}`;
  }

  function uniqueOrderedSizes(list) {
    const seen = new Set();
    return list
      .map(normalizeSizeTok)
      .filter(Boolean)
      .filter((x) => (seen.has(x) ? false : (seen.add(x), true)))
      .sort((a, b) => sizeSortKey(a).localeCompare(sizeSortKey(b)));
  }

  function tokensFromFreeText(input) {
    const raw = String(input || "").trim().toUpperCase();
    if (!raw) return [];
    const m = raw.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10),
        b = parseInt(m[2], 10);
      if (b >= a && b - a <= 120) {
        return Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
      }
    }
    return raw.split(/[^A-Z0-9]+/g).map(normalizeSizeTok).filter(Boolean);
  }

  function rowsToCounts(rows) {
    const m = new Map();
    (rows || []).forEach((r) => {
      const t = normalizeSizeTok(r.value);
      if (!t) return;
      m.set(t, (m.get(t) || 0) + 1);
    });
    return m;
  }

  function countsToRows(counts) {
    const rows = [];
    for (const [t, n] of counts) for (let i = 0; i < n; i++) rows.push({ value: t });
    return rows;
  }

  function pick(src, ...candidates) {
    if (!src) return "";
    const index = {};
    for (const k of Object.keys(src)) index[k.trim().toLowerCase()] = k;
    for (const want of candidates) {
      const real = index[String(want).trim().toLowerCase()];
      const v = real ? src[real] : undefined;
      if (v != null && String(v).trim() !== "") return String(v);
    }
    return "";
  }

function mapOrderRowForPrefill(src = {}) {
  const directRaw = pick(src, "Direct Stitching", "DirectStitching", "Direct_Stitching");
  const direct = String(directRaw).toLowerCase();
  const isDirect = ["yes", "true", "y", "1"].includes(direct);
  
  const garmentType = pick(src, "Garment Type", "Item Name", "Item", "Product");
  const isShirt = isShirtGarment(garmentType);

  return {
    Fabric: pick(src, "Fabric", "Material"),
    Brand: pick(src, "Brand"),
    Shade: pick(src, "Shade", "Colour", "Color"),
    Size: pick(src, "Size", "Sizes"),
    Quantity: pick(src, "Quantity", "Qty", "QTY"),
    Unit: pick(src, "Unit", "Units"),
    "Party Name": pick(src, "Party Name", "Party"),
    "Garment Type": garmentType,
    Section: pick(src, "Section", "Gender"),
    Season: pick(src, "Season"),
    Emb: isDirect ? "" : pick(src, "Emb", "Embroidery"),
    Printing: isDirect ? "" : pick(src, "Printing", "Print"),
    Pattern: pick(src, "Pattern", "Design"),
    Style: pick(src, "Style"),
    Zip: pick(src, "Zip", "ZIP"),
    "Bottom Type": isShirt ? "" : pick(src, "Bottom Type", "BottomType", "Bottom"), // Clear for shirts
    "Tape/Lace": pick(src, "Tape/Lace", "Tape Lace", "TapeLace"),
    Remarks: pick(src, "Remarks", "Notes", "Note"),
    "Direct Stitching": isDirect ? "yes" : directRaw || "",
    "Emb Details": pick(src, "Emb Details", "Embroidery Details"),
    "Printing Details": pick(src, "Printing Details", "Print Details"),
  };
}
function isShirtGarment(garmentType = "") {
  const type = String(garmentType || "").trim().toUpperCase();
  // Check if garment type contains "SHIRT" (case-insensitive)
  return type.includes("SHIRT");
}

function getEmptyForm(currentOrderNo = "") {
  return {
    jobOrderNo: "",
    date: "",
    fabric: "",
    brand: "",
    shade: "",
    quantity: "",
    unit: "",
    size: "",
    partyName: "",
    garmentType: "",
    section: "",
    season: "",
    emb: "",
    printing: "",
    pattern: "",
    style: "",
    zip: "",
    bottomType: "",
    tapeLace: "", // ADD THIS LINE
    remarks: "",
    directStitching: "",
    orderNo: currentOrderNo,
    priority: "MEDIUM",
  };
}
  function parseWithOptionalQty(input) {
    const txt = String(input || "").trim().toUpperCase();
    if (!txt) return [];
    const m = txt.match(/^(.*?)(?:\s*[X*]\s*(\d+))?$/);
    const core = (m?.[1] || "").trim();
    const qty = Math.max(1, parseInt(m?.[2] || "1", 10));
    const toks = tokensFromFreeText(core);
    const out = [];
    for (let i = 0; i < qty; i++) out.push(...toks);
    return out.map(normalizeSizeTok).filter(Boolean);
  }

  function SizePickerModal({ onClose, sizeRows, setSizeRows, setFormData, buildSizeString }) {
    const [activeTab, setActiveTab] = React.useState("ALPHA");
    const [search, setSearch] = React.useState("");
    const [customInput, setCustomInput] = React.useState("");

    const alpha = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
    const numeric = Array.from({ length: 41 }, (_, i) => String(20 + i));

    const [counts, setCounts] = React.useState(() => rowsToCounts(sizeRows));

    const master = activeTab === "ALPHA" ? alpha : numeric;
    const filtered = React.useMemo(() => {
      if (!search.trim()) return master;
      const q = search.trim().toUpperCase();
      return master.filter((s) => s.includes(q));
    }, [master, search]);

    const inc = (t) =>
      setCounts((prev) =>
        new Map(prev).set(normalizeSizeTok(t), (prev.get(normalizeSizeTok(t)) || 0) + 1)
      );
    const dec = (t) =>
      setCounts((prev) => {
        const key = normalizeSizeTok(t);
        const next = new Map(prev);
        const val = (next.get(key) || 0) - 1;
        if (val <= 0) next.delete(key);
        else next.set(key, val);
        return next;
      });
    const setOne = (t, n) =>
      setCounts((prev) => {
        const key = normalizeSizeTok(t);
        const next = new Map(prev);
        if (n <= 0) next.delete(key);
        else next.set(key, n);
        return next;
      });

    const selectAllFiltered = () =>
      setCounts((prev) => {
        const next = new Map(prev);
        filtered.forEach((s) => {
          const k = normalizeSizeTok(s);
          if (!next.has(k)) next.set(k, 1);
        });
        return next;
      });

    const clearFiltered = () =>
      setCounts((prev) => {
        const next = new Map(prev);
        filtered.forEach((s) => next.delete(normalizeSizeTok(s)));
        return next;
      });
    const clearAll = () => setCounts(new Map());

    const addCustom = () => {
      const toks = parseWithOptionalQty(customInput);
      if (!toks.length) return;
      setCounts((prev) => {
        const next = new Map(prev);
        toks.forEach((t) => next.set(t, (next.get(t) || 0) + 1));
        return next;
      });
      setCustomInput("");
    };

    const totalSelected = Array.from(counts.values()).reduce((a, b) => a + b, 0);

    const saveAndClose = () => {
      const orderedTokens = uniqueOrderedSizes(Array.from(counts.keys()));
      const orderedCounts = new Map();
      orderedTokens.forEach((tok) => {
        const n = counts.get(tok) || 0;
        if (n > 0) orderedCounts.set(tok, n);
      });
      const finalRows = countsToRows(orderedCounts);
      setSizeRows(finalRows);
      setFormData((prev) => ({ ...prev, size: buildSizeString(finalRows) }));
      onClose();
    };

    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div style={{ ...styles.modal, maxWidth: 860 }} onClick={(e) => e.stopPropagation()}>
          <h3 style={styles.modalTitle}>Pick Sizes (with quantities)</h3>
          <p style={styles.modalDescription}>
            Use <strong>+</strong>/<strong>−</strong> to adjust counts. "Select All" seeds each visible size to 1.
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            {["ALPHA", "NUMERIC"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === tab ? styles.tabBtnActive : {}),
                }}
              >
                {tab === "ALPHA" ? "Alpha" : "Numeric"}
              </button>
            ))}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sizes…"
              style={{
                ...styles.input,
                width: 220,
                textTransform: "uppercase",
                marginLeft: "auto",
              }}
            />
            <span style={styles.counterBadge}>{totalSelected} total</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button type="button" style={styles.ghostButton} onClick={selectAllFiltered}>
              Select All (Filtered → ×1)
            </button>
            <button type="button" style={styles.ghostButton} onClick={clearFiltered}>
              Clear (Filtered)
            </button>
            <button type="button" style={styles.ghostButton} onClick={clearAll}>
              Clear All
            </button>
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 10,
              background: "#fff",
              maxHeight: 360,
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 8,
              }}
            >
              {filtered.map((s) => {
                const k = normalizeSizeTok(s);
                const n = counts.get(k) || 0;
                const has = n > 0;
                return (
                  <div
                    key={s}
                    style={{
                      ...styles.checkCard,
                      ...(has ? styles.checkCardChecked : {}),
                      padding: "10px 8px",
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      gap: 8,
                    }}
                    title="Use + / − to set quantity"
                  >
                    <span style={{ fontWeight: 800, color: "#111827" }}>{s}</span>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        style={styles.stepBtn}
                        onClick={() => dec(s)}
                        aria-label={`Decrease ${s}`}
                      >
                        −
                      </button>
                      <input
                        value={n}
                        onChange={(e) => {
                          const v = parseInt(e.target.value || "0", 10);
                          setOne(s, isNaN(v) ? 0 : Math.max(0, v));
                        }}
                        onFocus={(e) => e.target.select()}
                        inputMode="numeric"
                        style={styles.stepInput}
                      />
                      <button
                        type="button"
                        style={styles.stepBtn}
                        onClick={() => inc(s)}
                        aria-label={`Increase ${s}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder='Add custom (e.g., "M x3", "28-32 x2", "S,M") and press Enter'
              style={{
                ...styles.input,
                width: "100%",
                textTransform: "uppercase",
              }}
            />
            <button
              type="button"
              style={{ ...styles.button, padding: "10px 16px", minWidth: 120 }}
              onClick={addCustom}
            >
              Add
            </button>
          </div>

          <div style={styles.modalFooter}>
            <button
              type="button"
              style={{ ...styles.button, padding: "10px 18px" }}
              onClick={saveAndClose}
            >
              Save
            </button>
            <button
              type="button"
              style={{
                ...styles.button,
                padding: "10px 18px",
                background: "#e5e7eb",
                color: "#111827",
              }}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  function parseSizeString(s) {
    const src = String(s || "").trim();
    if (!src) return [{ value: "" }];
    return src
      .split(/\s*,\s*/g)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => ({ value: x }));
  }

  function parseDetailsToPositions(str = "") {
    const base = {
      FRONT: false,
      BACK: false,
      RIB: false,
      ARM: false,
      LEFT: false,
      RIGHT: false,
      POCKET: false,
      COLLAR: false,
      HOOD: false,
      GULLA :false,
      other: "",
    };
    const parts = String(str)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const p of parts) {
      const m = p.match(/^OTHER\s*:(.*)$/i);
      if (m) {
        base.other = m[1].trim();
        continue;
      }
      const key = p.toUpperCase();
      if (key in base) base[key] = true;
    }
    return base;
  }

  function buildSizeString(rows) {
    const items = rows
      .map((r) => (r.value || "").trim().toUpperCase())
      .filter(Boolean);
    return items.join(" , ");
  }

  function buildShadeString(rows) {
    return rows
      .filter((r) => r.shade && r.shade.trim())
      .map((r) => {
        const shade = r.shade.trim().toUpperCase();
        const combo = (r.combos || "").trim().toUpperCase();
        return combo ? `${shade} (${combo})` : shade;
      })
      .join(", ");
  }

  const deriveNextIdFromSheetValues = (values) => {
    for (let i = values.length - 1; i >= 0; i--) {
      const cell = (values[i]?.[0] || "").toString().trim();
      const m = cell.match(/^JO-(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        return `JO-${n + 1}`;
      }
    }
    return "JO-1";
  };

  const refreshJobOrderNo = useCallback(async () => {
    try {
      const range = `${encodeURIComponent(JOBS_TAB)}!A2:A`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID1}/values/${range}?key=${API_KEY}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const values = data.values || [];
      const nextId = deriveNextIdFromSheetValues(values);
      setFormData((prev) => ({ ...prev, jobOrderNo: nextId }));
    } catch (e) {
      console.error("Failed to fetch next Job Order No:", e);
      setFormData((prev) => ({ ...prev, jobOrderNo: "JO-PENDING" }));
    }
  }, []);

  const fetchNextJobNo = useCallback(async () => {
    try {
      const res = await fetch(`${GAS_WEB_APP_URL}?action=nextJobOrderNo`);
      const json = await res.json();
      if (json?.success && json?.next) {
        setFormData((prev) => ({ ...prev, jobOrderNo: `JO-${json.next}` }));
        return;
      }
      await refreshJobOrderNo();
    } catch (err) {
      console.warn("GAS nextJobOrderNo failed; falling back:", err);
      await refreshJobOrderNo();
    }
  }, [refreshJobOrderNo]);

  const rangeUrl = useMemo(() => {
    const range = `${encodeURIComponent(DROPDOWNS_TAB)}!A1:Z${MAX_ROWS}`;
    return `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(rangeUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const rows = data.values || [];
        if (rows.length === 0) throw new Error("No data in sheet");
        const headers = rows[0];
        const body = rows.slice(1);

        const hIndex = {};
        headers.forEach((h, i) => {
          if (typeof h === "string" && h.trim()) hIndex[h.trim()] = i;
        });

        const colValues = (headerName) => {
          const idx = hIndex[headerName];
          if (idx == null) return [];
          const vals = body
            .map((r) => (r[idx] ?? "").toString().trim())
            .filter(Boolean);
          return Array.from(new Set(vals));
        };

        const next = {};
        for (const field in HEADER_MAP) {
          next[field] = colValues(HEADER_MAP[field]);
        }

        if (!cancelled) setLists(next);
      } catch (e) {
        if (!cancelled) setError(`Failed to load dropdowns: ${e.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rangeUrl, refreshTick]);

  useEffect(() => {
    fetchNextJobNo();
  }, [fetchNextJobNo]);

  useEffect(() => {
    let aborted = false;

    const fetchNextFromSheet = async () => {
      try {
        const range = `${encodeURIComponent(JOBS_TAB)}!A2:A`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID1}/values/${range}?key=${API_KEY}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
        const timeout = new Promise((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 2500)
        );
        const res = await Promise.race([fetch(url), timeout]);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const values = data.values || [];
        const nextId = deriveNextIdFromSheetValues(values);
        if (!aborted) setFormData((prev) => ({ ...prev, jobOrderNo: nextId }));
      } catch (err) {
        if (!aborted) {
          setFormData((prev) => ({ ...prev, jobOrderNo: "JO-PENDING" }));
        }
        console.warn("Failed to fetch JO from sheet:", err);
      }
    };

    fetchNextFromSheet();
    return () => {
      aborted = true;
    };
  }, []);

  const fetchRecentOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      setOrdersError("");
      const range = `${encodeURIComponent(JOBS_TAB)}!A1:Z${MAX_ROWS}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID1}/values/${range}?key=${API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows = data.values || [];
      if (!rows.length) {
        setOrders([]);
        return;
      }

      const hdrs = rows[0].map((h) => String(h || "").trim());
      const toIdx = (name) => {
        const i = hdrs.findIndex((h) => h.toLowerCase() === name.toLowerCase());
        return i >= 0 ? i : null;
      };
      const idx = Object.fromEntries(JOB_HEADERS.map((h) => [h, toIdx(h)]));

      const body = rows.slice(1).map((r) => {
        const obj = {};
        for (const h of JOB_HEADERS) {
          const i = idx[h];
          obj[h] = i == null ? "" : r[i] ?? "";
        }
        return obj;
      });

      body.sort((a, b) => {
        const an = String(a["Job Order No"] || "").match(/(\d+)/);
        const bn = String(b["Job Order No"] || "").match(/(\d+)/);
        const ai = an ? parseInt(an[1], 10) : -1;
        const bi = bn ? parseInt(bn[1], 10) : -1;
        return bi - ai;
      });

      setOrders(body);
    } catch (e) {
      setOrdersError(e.message || "Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    try {
      setRefreshing(true);
      setRefreshTick((t) => t + 1);
      await Promise.allSettled([fetchNextJobNo(), fetchRecentOrders()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchNextJobNo, fetchRecentOrders]);

function applyOrderToForm(row) {
  const isDirect =
    String(row["Direct Stitching"] || "").toLowerCase() === "true" ||
    String(row["Direct Stitching"] || "").toLowerCase() === "yes";

  const nextEmbPos = parseDetailsToPositions(row["Emb Details"]);
  const nextPrintPos = parseDetailsToPositions(row["Printing Details"]);
  
  const garmentType = String(row["Garment Type"] || "");
  const isShirt = isShirtGarment(garmentType);

  setFormData((prev) => ({
    ...prev,
    jobOrderNo: prev.jobOrderNo,
    date: new Date().toISOString().split("T")[0],
    fabric: String(row["Fabric"] || ""),
    brand: String(row["Brand"] || ""),
    shade: String(row["Shade"] || ""),
    size: String(row["Size"] || ""),
    quantity: String(row["Quantity"] || ""),
    unit: String(row["Unit"] || ""),
    partyName: String(row["Party Name"] || ""),
    garmentType: garmentType,
    section: String(row["Section"] || ""),
    season: String(row["Season"] || ""),
    emb: isDirect ? "" : String(row["Emb"] || ""),
    printing: isDirect ? "" : String(row["Printing"] || ""),
    pattern: String(row["Pattern"] || ""),
    style: String(row["Style"] || ""),
    zip: String(row["Zip"] || ""),
    bottomType: isShirt ? "" : String(row["Bottom Type"] || ""), // Clear for shirts
    tapeLace: String(row["Tape/Lace"] || ""),
    remarks: String(row["Remarks"] || ""),
    directStitching: isDirect ? "yes" : "no",
    priority: String(row["Priority"] || prev.priority || "MEDIUM"),
  }));
  setEmbPositions(nextEmbPos);
  setPrintPositions(nextPrintPos);
  setImageFile(null);
  if (!formData.jobOrderNo || formData.jobOrderNo === "JO-PENDING") {
    fetchNextJobNo().catch(() => {});
  }
  setShowRepeatDialog(false);
}

  useEffect(() => {
    const prefillRow = location.state?.prefill;
    if (!prefillRow) return;

    const mapped = mapOrderRowForPrefill(prefillRow);
    applyOrderToForm(mapped);
  }, [location.state]);

  useEffect(() => {
    if (incomingOrderNo) {
      setFormData((prev) => ({
        ...prev,
        orderNo: prev.orderNo || String(incomingOrderNo),
      }));
    }
  }, []);

  const styleOptionsWithOther = useMemo(() => {
    const base = lists.style || [];
    const hasAnyOther = base.some(
      (x) =>
        x.toLowerCase().replace(/\s+/g, "") === "anyother" ||
        x.toLowerCase().includes("any other")
    );
    return hasAnyOther ? base : [...base, "Any Other…"];
  }, [lists.style]);

  const patternOptionsWithOther = useMemo(() => {
    const base = lists.pattern || [];
    const hasAnyOther = base.some(
      (x) =>
        x.toLowerCase().replace(/\s+/g, "") === "anyother" ||
        x.toLowerCase().includes("any other")
    );
    return hasAnyOther ? base : [...base, "Any Other…"];
  }, [lists.pattern]);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result);
        const [prefix, base64] = res.split("base64,");
        const mimeType =
          (prefix.match(/^data:(.*);base64,?$/) || [, "application/octet-stream"])[1];
        resolve({ base64, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

const handleClearAll = useCallback(() => {
  // Clear form but preserve job order number and reset date
  setFormData((prev) => ({
    jobOrderNo: prev.jobOrderNo,
    date: new Date().toISOString().split("T")[0],
    fabric: "",
    brand: "",
    shade: "",
    quantity: "",
    unit: "",
    size: "",
    partyName: "",
    garmentType: "",
    section: "",
    season: "",
    emb: "",
    printing: "",
    pattern: "",
    style: "",
    zip: "",
    bottomType: "",
    tapeLace: "", // ADD THIS LINE
    remarks: "",
    directStitching: "no",
    orderNo: "",
    priority: "MEDIUM",
  }));
  setImageFile(null);
  setEmbPositions({
    FRONT: false,
    BACK: false,
    RIB: false,
    ARM: false,
    LEFT: false,
    RIGHT: false,
    POCKET: false,
    COLLAR: false,
    HOOD: false,
    GULLA: false,
    other: "",
  });
  setPrintPositions({
    FRONT: false,
    BACK: false,
    RIB: false,
    ARM: false,
    LEFT: false,
    RIGHT: false,
    POCKET: false,
    COLLAR: false,
    HOOD: false,
    GULLA: false,
    other: "",
  });
  setShadeRows([{ shade: "", combos: "" }]);
  setSizeRows([{ value: "" }]);
  setShowEmbDialog(false);
  setShowPrintDialog(false);
  setShowPatternDialog(false);
  setShowSubmitterDialog(false);
  setShowRepeatDialog(false);
  setSubmitterName("");
  setCustomSubmitter("");
  setReferrerName("Mohit Goyal");
  setCustomReferrer("");
  setPendingPayload(null);
  setError("");
  setSubmitSuccess(false);
}, []);

const handleChange = (e) => {
  const { name } = e.target;
  let { value } = e.target;

  // If garment type is changing, check if it's a shirt and clear/disable bottom type
  if (name === "garmentType") {
    const isShirt = isShirtGarment(value);
    
    if (isShirt) {
      // If it's a shirt, clear the bottom type
      setFormData((prev) => ({
        ...prev,
        garmentType: value,
        bottomType: "", // Clear bottom type for shirts
      }));
    } else {
      // For non-shirt garments, just update normally
      setFormData((prev) => ({ ...prev, garmentType: value }));
    }
    return;
  }

  if (name === "quantity") {
    const cleaned = value.replace(/[^\d.]/g, "");
    setFormData((prev) => ({ ...prev, [name]: cleaned }));
    return;
  }

  if (name === "directStitching") {
    if (value === "yes") {
      setFormData((prev) => ({
        ...prev,
        directStitching: "yes",
        emb: "",
        printing: "",
      }));
      setEmbPositions({
        FRONT: false,
        BACK: false,
        RIB: false,
        ARM: false,
        LEFT: false,
        RIGHT: false,
        POCKET: false,
        COLLAR: false,
        HOOD: false,
        GULLA: false,
        other: "",
      });
      setPrintPositions({
        FRONT: false,
        BACK: false,
        RIB: false,
        ARM: false,
        LEFT: false,
        RIGHT: false,
        POCKET: false,
        COLLAR: false,
        HOOD: false,
        GULLA: false,
        other: "",
      });
      setShowEmbDialog(false);
      setShowPrintDialog(false);
    } else {
      setFormData((prev) => ({ ...prev, directStitching: "no" }));
    }
    return;
  }

  if (name === "style") {
    const v = (value || "").toLowerCase().replace(/[.\u2026]/g, "").trim();
    if (v === "any other" || /^any\s*other$/.test(v)) {
      setStyleOtherText("");
      setShowStyleDialog(true);
      return;
    }
    setFormData((prev) => ({ ...prev, style: value }));
    return;
  }

  if (name === "pattern") {
    const v = (value || "").toLowerCase().replace(/[.\u2026]/g, "").trim();
    if (v === "any other" || /^any\s*other$/.test(v)) {
      setPatternOtherText("");
      setShowPatternDialog(true);
      return;
    }
    setFormData((prev) => ({ ...prev, pattern: value }));
    return;
  }

  if (name === "emb") {
    setFormData((prev) => ({ ...prev, emb: value }));
    if (value && formData.directStitching !== "yes") setShowEmbDialog(true);
    return;
  }

  if (name === "printing") {
    setFormData((prev) => ({ ...prev, printing: value }));
    if (value && formData.directStitching !== "yes") setShowPrintDialog(true);
    return;
  }

  const tag = e.target.tagName;
  const type = (e.target.type || "").toLowerCase();
  const isTextLike =
    tag === "TEXTAREA" ||
    (tag === "INPUT" && (type === "" || type === "text" || type === "search"));

  if (isTextLike) {
    value = value.toUpperCase();
  }

  setFormData((prev) => ({ ...prev, [name]: value }));
};

const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError("");
  setSubmitSuccess(false);

  try {
    if (!formData.jobOrderNo?.trim()) throw new Error("Job Order No. is required");
    if (!formData.date) throw new Error("Date is required");
    if (!formData.fabric?.trim()) throw new Error("Fabric is required");
    if (!formData.shade?.trim()) throw new Error("Shade is required");
    if (!formData.quantity) throw new Error("Quantity is required");
    if (!formData.unit) throw new Error("Please select a unit");
    if (!formData.priority) throw new Error("Please select a priority");
    
    // NEW: Validate required fields for gsheet storage
    if (!formData.partyName?.trim()) throw new Error("Party Name is required");
    if (!formData.garmentType?.trim()) throw new Error("Garment Type is required");
    if (!formData.section?.trim()) throw new Error("Gender/Section is required");
    if (!formData.season?.trim()) throw new Error("Season is required");

    const isDirect = formData.directStitching === "yes";

    let imagePayload = null;
    if (imageFile) {
      const { base64, mimeType } = await fileToBase64(imageFile);
      imagePayload = {
        name: imageFile.name,
        mimeType,
        base64,
      };
    }

 const payload = {
  action: "createJobOrder",
  jobOrderNo: formData.jobOrderNo.trim(),
  orderNo: (formData.orderNo || "").trim(),
  date: formData.date,
  fabric: formData.fabric.trim(),
  brand: formData.brand?.trim() || "",
  shade: formData.shade.trim(),
  size: formData.size?.trim() || "",
  quantity: formData.quantity ? Number(formData.quantity) : "",
  unit: formData.unit,
  partyName: formData.partyName || "",
  garmentType: formData.garmentType || "",
  section: formData.section || "",
  season: formData.season || "",
  emb: isDirect ? "" : formData.emb || "",
  printing: isDirect ? "" : formData.printing || "",
  priority: (formData.priority || "MEDIUM").toUpperCase(),
  zip: formData.zip || "",
  bottomType: formData.bottomType || "",
  tapeLace: formData.tapeLace || "", // ADD THIS LINE
  embDetails: isDirect
    ? ""
    : (() => {
        const picks = Object.entries(embPositions)
          .filter(([k, v]) => (k === "other" ? embPositions.other.trim() : v))
          .map(([k]) => (k === "other" ? `OTHER:${embPositions.other.trim()}` : k));
        return picks.join(", ");
      })(),
  printingDetails: isDirect
    ? ""
    : (() => {
        const picks = Object.entries(printPositions)
          .filter(([k, v]) => (k === "other" ? printPositions.other.trim() : v))
          .map(([k]) => (k === "other" ? `OTHER:${printPositions.other.trim()}` : k));
        return picks.join(", ");
      })(),
  pattern: formData.pattern || "",
  style: formData.style || "",
  remarks: formData.remarks || "",
  directStitching: isDirect,
  image: imagePayload,
  orderNo: formData.orderNo || "",
};

    setPendingPayload(payload);
    setReferrerName("Mohit Goyal");
    setCustomReferrer("");
    setSubmitterName("");
    setCustomSubmitter("");
    setShowSubmitterDialog(true);
    setIsSubmitting(false);
    return;
  } catch (err) {
    setError(err.message || "Something went wrong while saving.");
  } finally {
    if (!showSubmitterDialog) setIsSubmitting(false);
  }
};

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {/* Enhanced Header */}
      <div className="paper paper--header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div style={styles.headerRow}>
            <div style={styles.logo}>
              <span style={{ fontSize: 28 }}>📋</span>
            </div>
            <div>
              <div style={styles.titleContainer}>
                <h1 style={styles.title}>Cutting Job Order Form</h1>
                <div style={styles.titleBadge}>ENHANCED</div>
              </div>
              <p style={styles.subtitle}>
                Complete the form to create a new production order with enhanced features
              </p>
            </div>
          </div>

          <div style={styles.headerActions}>
            <div style={styles.headerBadges}>
              <div style={styles.badgeRow}>
                <span style={styles.badge} title="Job Order Number">
                  🔢 {formData.jobOrderNo || "JO-PENDING"}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetchNextJobNo();
                      } catch {
                        // no-op
                      }
                    }}
                    style={styles.badgeButton}
                    title="Refresh Job Order No."
                  >
                    ↻
                  </button>
                </span>

                <label style={styles.badge} title="Date of Job Order">
                  📅
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    style={styles.badgeDateInput}
                    required
                  />
                </label>

                <span style={styles.badgePriority}>
                  ⚡ Priority:{" "}
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    style={styles.prioritySelect}
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </span>
              </div>
            </div>

            <div style={styles.actionButtons}>
              <button
                type="button"
                onClick={() => setShowRepeatDialog(true)}
                style={styles.linkAction}
                title="Pick a previous order to repeat"
              >
                ⟳ Repeat Order
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                style={styles.linkAction}
                title="Clear all fields"
              >
                ✧ Clear All
              </button>
              <button
                type="button"
                onClick={handleRefreshAll}
                style={styles.refreshPill}
                title="Refresh dropdowns, next JO number & recent orders"
                disabled={refreshing}
              >
                <span style={styles.refreshIcon}>
                  {refreshing ? (
                    <span
                      style={{
                        ...styles.spinner,
                        width: 14,
                        height: 14,
                        borderWidth: 2,
                      }}
                    />
                  ) : (
                    "↻"
                  )}
                </span>
                <span>{refreshing ? "Refreshing…" : "Refresh Data"}</span>
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                style={styles.backButton}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
        <div className="paper__rule" />
      </div>

      {/* Enhanced Grid Layout */}
      <div style={styles.formGrid}>
        {/* Product Details Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIconContainer}>
              <span style={styles.sectionIcon}>🧵</span>
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Product Details</h3>
              <p style={styles.sectionSubtitle}>Material specifications and measurements</p>
            </div>
          </div>

          <div style={styles.sectionContent}>
            <Field label="Sale Order No." emoji="📑" required={false}>
              <input
                name="orderNo"
                value={formData.orderNo}
                readOnly
                style={{
                  ...styles.input,
                  backgroundColor: "rgba(248,250,252,0.9)",
                  cursor: "not-allowed",
                }}
                placeholder="(auto from All Orders)"
                title="Comes from All Orders"
              />
            </Field>

            <Field label="Fabric" emoji="🧶">
              <input
                name="fabric"
                value={formData.fabric}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., Organic Cotton 180 GSM"
                required
              />
            </Field>

            <Field label="Brand" emoji="🏷️" required={false}>
              <input
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., Alpha Fashion Co."
              />
            </Field>

            <div style={styles.inlineGroup}>
              <Field label="Shades" emoji="🎨">
                <input
                  name="shade"
                  value={formData.shade}
                  readOnly
                  onClick={() => {
                    setShadeRows(parseShadeString(formData.shade));
                    setShowShadeDialog(true);
                  }}
                  style={{
                    ...styles.input,
                    cursor: "pointer",
                    backgroundColor: "rgba(255,255,255,0.9)",
                  }}
                  placeholder="Click to add"
                  title="Click to add shades & combinations"
                />
              </Field>

              <Field label="Size" emoji="📏" required={false}>
                <input
                  name="size"
                  value={formData.size}
                  readOnly
                  onClick={() => {
                    setSizeRows(parseSizeString(formData.size));
                    setShowSizeDialog(true);
                  }}
                  style={{
                    ...styles.input,
                    cursor: "pointer",
                    backgroundColor: "rgba(255,255,255,0.9)",
                  }}
                  placeholder="Click to add"
                  title="Click to add multiple sizes"
                />
              </Field>
            </div>

            <div style={styles.inlineGroup}>
              <Field label="Quantity" emoji="🔢">
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  style={{ ...styles.input, flex: 2 }}
                  placeholder="e.g., 150"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  required
                />
              </Field>
              <Field label="Unit" emoji="📦" required={false}>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  style={{ ...styles.input, flex: 1 }}
                  required
                >
                  <option value="">Select</option>
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* Selection Details Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIconContainer}>
              <span style={styles.sectionIcon}>📊</span>
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Selection Details</h3>
              <p style={styles.sectionSubtitle}>Client and garment specifications</p>
            </div>
          </div>

          <div style={styles.sectionContent}>
            <Select
              label="Party Name"
              emoji="🏢"
              name="partyName"
              value={formData.partyName}
              options={lists.partyName}
              onChange={handleChange}
              loading={loading}
              required={true}
            />
            <Select
              label="Garment Type"
              emoji="👕"
              name="garmentType"
              value={formData.garmentType}
              options={lists.garmentType}
              onChange={handleChange}
              loading={loading}
              required={true}
            />
            <Select
              label="Gender"
              emoji="📌"
              name="section"
              value={formData.section}
              options={lists.section}
              onChange={handleChange}
              loading={loading}
              required={true}
            />
            <Select
              label="Season"
              emoji="🌤️"
              name="season"
              value={formData.season}
              options={lists.season}
              onChange={handleChange}
              loading={loading}
              required={true}
            />

            <div style={styles.inlineGroup}>
              <Select
                label="Embroidery"
                emoji="🧵"
                name="emb"
                value={formData.emb}
                options={lists.emb}
                onChange={handleChange}
                loading={loading}
                disabled={formData.directStitching === "yes"}
              />

              <Select
                label="Printing"
                emoji="🖨️"
                name="printing"
                value={formData.printing}
                options={lists.printing}
                onChange={handleChange}
                loading={loading}
                disabled={formData.directStitching === "yes"}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                <span style={styles.emoji}>🪡</span>
                Direct Stitching
                <span style={styles.requiredIndicator}>*</span>
              </label>
              <div style={styles.radioGroup}>
                {["no", "yes"].map((option) => (
                  <label
                    key={option}
                    style={{
                      ...styles.radioLabel,
                      background:
                        formData.directStitching === option
                          ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                          : "white",
                      color: formData.directStitching === option ? "white" : "#334155",
                    }}
                  >
                    <input
                      type="radio"
                      name="directStitching"
                      value={option}
                      checked={formData.directStitching === option}
                      onChange={handleChange}
                      style={styles.radioInput}
                    />
                    {option === "yes" ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>

            <Select
              label="Pattern"
              emoji="📐"
              name="pattern"
              value={formData.pattern}
              options={patternOptionsWithOther}
              onChange={handleChange}
              loading={loading}
            />
          </div>
        </div>

        {/* Additional Information Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIconContainer}>
              <span style={styles.sectionIcon}>📝</span>
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Additional Information</h3>
              <p style={styles.sectionSubtitle}>Style, finishing options, and attachments</p>
            </div>
          </div>

          <div style={styles.sectionContent}>
            <Select
              label="Style"
              emoji="👔"
              name="style"
              value={formData.style}
              options={styleOptionsWithOther}
              onChange={handleChange}
              loading={loading}
            />

            {/* Zip Field */}
            <Field label="Zip" emoji="🤐" required={false}>
              <select
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">-- Select Zip Option --</option>
                {ZIP_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            {/* NEW: Bottom Type Field */}
       {/* Bottom Type Field */}
<Field label="Bottom Type" emoji="👖" required={false}>
  <select
    name="bottomType"
    value={formData.bottomType}
    onChange={handleChange}
    style={{
      ...styles.input,
      ...(isShirtGarment(formData.garmentType) ? {
        backgroundColor: "#f3f4f6",
        cursor: "not-allowed",
        color: "#9ca3af",
      } : {})
    }}
    disabled={isShirtGarment(formData.garmentType)}
  >
    <option value="">
      {isShirtGarment(formData.garmentType) 
        ? "Not applicable for Shirts" 
        : "-- Select Bottom Type --"}
    </option>
    {!isShirtGarment(formData.garmentType) && 
      BOTTOM_TYPE_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))
    }
  </select>
  {isShirtGarment(formData.garmentType) && (
    <div style={{
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "4px",
      fontStyle: "italic"
    }}>
      Bottom type is not applicable for shirts
    </div>
  )}
</Field>
            {/* Tape/Lace Field */}
<Field label="Tape/Lace" emoji="🎀" required={false}>
  <select
    name="tapeLace"
    value={formData.tapeLace}
    onChange={handleChange}
    style={styles.input}
  >
    <option value="">-- Select Tape/Lace --</option>
    {TAPE_LACE_OPTIONS.map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>
</Field>

            <Field label="Remarks" emoji="💬" required={false}>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                style={{ ...styles.input, minHeight: 100, resize: "vertical" }}
                placeholder="Special instructions, urgency level, etc."
              />
            </Field>

            <Field label="Reference Image (optional)" emoji="🖼️" required={false}>
              <div style={styles.fileUploadContainer}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  style={styles.fileInput}
                  id="image-upload"
                />
                <label htmlFor="image-upload" style={styles.fileUploadLabel}>
                  <span style={styles.fileUploadIcon}>📁</span>
                  <span>{imageFile ? imageFile.name : "Choose an image file"}</span>
                </label>
                {imageFile && (
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    style={styles.fileClearButton}
                    title="Remove image"
                  >
                    ✕
                  </button>
                )}
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={styles.error}>
          <span style={styles.errorIcon}>❌</span>
          <div>
            <strong>Error occurred</strong>
            <p style={styles.errorText}>{error}</p>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div style={styles.success}>
          <span style={styles.successIcon}>✅</span>
          <div>
            <strong>Success!</strong>
            <p style={styles.successText}>Order has been saved successfully</p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div style={styles.buttonContainer}>
        <button
          type="submit"
          style={{
            ...styles.button,
            ...(isSubmitting ? styles.buttonSubmitting : {}),
          }}
          disabled={loading || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span style={styles.spinner}></span>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span style={styles.buttonIcon}>📤</span>
              <span>Submit Order</span>
            </>
          )}
        </button>
      </div>

      {/* Repeat Order Modal */}
      {showRepeatDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowRepeatDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Repeat a Previous Order</h3>
            <p style={styles.modalDescription}>
              Pick an existing Job Order to prefill this form (Job Order No will be refreshed).
            </p>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by JO number, Party, Fabric, Brand, Pattern…"
                style={{ ...styles.input, width: "100%" }}
              />
              <button
                type="button"
                style={{ ...styles.button, padding: "10px 14px", minWidth: 140 }}
                onClick={() => fetchRecentOrders()}
                disabled={ordersLoading}
                title="Load/refresh orders"
              >
                {ordersLoading ? "Loading…" : "Load Orders"}
              </button>
            </div>

            {ordersError && (
              <div style={{ ...styles.error, marginTop: 8 }}>
                <span style={styles.errorIcon}>❌</span>
                <div>
                  <strong>Failed</strong>
                  <p style={styles.errorText}>{ordersError}</p>
                </div>
              </div>
            )}

            <div
              style={{
                maxHeight: 360,
                overflow: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 6,
              }}
            >
              {orders
                .filter((o) => {
                  const q = orderSearch.trim().toLowerCase();
                  if (!q) return true;
                  const hay = [
                    o["Job Order No"],
                    o["Party Name"],
                    o["Fabric"],
                    o["Brand"],
                    o["Pattern"],
                    o["Shade"],
                    o["Garment Type"],
                    o["Section"],
                    o["Season"],
                  ]
                    .map((x) => String(x || "").toLowerCase())
                    .join(" • ");
                  return hay.includes(q);
                })
                .slice(0, 200)
                .map((o, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyOrderToForm(o)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      marginBottom: 6,
                      background: "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.target.style.background = "#fff")}
                    title="Click to use this order"
                  >
                    <div style={{ fontWeight: 700, color: "#1e293b" }}>
                      {o["Job Order No"] || "—"} · {o["Party Name"] || "—"}
                    </div>
                    <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                      Fabric: {o["Fabric"] || "—"} | Brand: {o["Brand"] || "—"} | Pattern:{" "}
                      {o["Pattern"] || "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      Shade: {o["Shade"] || "—"} | Size: {o["Size"] || "—"} | Qty:{" "}
                      {o["Quantity"] || "—"} {o["Unit"] || ""}
                    </div>
                  </button>
                ))}
              {!ordersLoading && !ordersError && orders.length === 0 && (
                <div style={{ padding: 8, color: "#64748b" }}>No orders loaded yet.</div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={{
                  ...styles.button,
                  padding: "10px 18px",
                  background: "#e5e7eb",
                  color: "#111827",
                }}
                onClick={() => setShowRepeatDialog(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style Modal */}
      {showStyleDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowStyleDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Custom Style</h3>
            <p style={styles.modalDescription}>
              Type the style name to save with this Job Order.
            </p>

            <input
              autoFocus
              value={styleOtherText}
              onChange={(e) => setStyleOtherText(e.target.value)}
              style={{ ...styles.input, width: "90%" }}
              placeholder="e.g., Oversized Raglan / Regular Fit"
            />

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={{ ...styles.button, padding: "10px 18px" }}
                onClick={() => {
                  const val = (styleOtherText || "").trim();
                  if (!val) return;
                  setFormData((prev) => ({ ...prev, style: val }));
                  setLists((prev) => ({
                    ...prev,
                    style: Array.from(new Set([val, ...(prev.style || [])])),
                  }));
                  setShowStyleDialog(false);
                }}
              >
                Save
              </button>
              <button
                type="button"
                style={{
                  ...styles.button,
                  padding: "10px 18px",
                  background: "#e5e7eb",
                  color: "#111827",
                }}
                onClick={() => setShowStyleDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embroidery Modal */}
      {showEmbDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowEmbDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Embroidery Positions</h3>
            <p style={styles.modalDescription}>
              Select applicable positions and add any other instruction.
            </p>

            <div style={styles.checkboxGrid}>
              {["FRONT", "BACK", "RIB", "ARM", "LEFT", "RIGHT", "POCKET", "COLLAR", "HOOD","GULLA"].map(
                (k) => (
                  <label key={k} style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={!!embPositions[k]}
                      onChange={(e) =>
                        setEmbPositions((prev) => ({ ...prev, [k]: e.target.checked }))
                      }
                    />
                    <span style={{ color: "#111827" }}>{k}</span>
                  </label>
                )
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                Any Other
              </label>
              <textarea
                value={embPositions.other}
                onChange={(e) =>
                  setEmbPositions((prev) => ({ ...prev, other: e.target.value }))
                }
                style={{ ...styles.input, width: "90%", minHeight: 80 }}
                placeholder="Describe any additional embroidery location or notes"
              />
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={{ ...styles.button, padding: "10px 18px" }}
                onClick={() => setShowEmbDialog(false)}
              >
                Save
              </button>
              <button
                type="button"
                style={{
                  ...styles.button,
                  padding: "10px 18px",
                  background: "#e5e7eb",
                  color: "#111827",
                }}
                onClick={() => {
                  setEmbPositions({
                    FRONT: false,
                    BACK: false,
                    RIB: false,
                    ARM: false,
                    LEFT: false,
                    RIGHT: false,
                    POCKET: false,
                    COLLAR: false,
                    HOOD: false,
                    GULLA :false,
                    other: "",
                  });
                  setShowEmbDialog(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printing Modal */}
      {showPrintDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowPrintDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Printing Positions</h3>
            <p style={styles.modalDescription}>
              Select applicable positions and add any other instruction.
            </p>

            <div style={styles.checkboxGrid}>
              {["FRONT", "BACK", "RIB", "ARM", "LEFT", "RIGHT", "POCKET", "COLLAR", "HOOD","GULLA"].map(
                (k) => (
                  <label key={k} style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={!!printPositions[k]}
                      onChange={(e) =>
                        setPrintPositions((prev) => ({ ...prev, [k]: e.target.checked }))
                      }
                    />
                    <span style={{ color: "#111827" }}>{k}</span>
                  </label>
                )
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                Any Other
              </label>
              <textarea
                value={printPositions.other}
                onChange={(e) =>
                  setPrintPositions((prev) => ({ ...prev, other: e.target.value }))
                }
                style={{ ...styles.input, width: "90%", minHeight: 80 }}
                placeholder="Describe any additional printing location or notes"
              />
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={{ ...styles.button, padding: "10px 18px" }}
                onClick={() => setShowPrintDialog(false)}
              >
                Save
              </button>
              <button
                type="button"
                style={{
                  ...styles.button,
                  padding: "10px 18px",
                  background: "#e5e7eb",
                  color: "#111827",
                }}
                onClick={() => {
                  setPrintPositions({
                    FRONT: false,
                    BACK: false,
                    RIB: false,
                    ARM: false,
                    LEFT: false,
                    RIGHT: false,
                    POCKET: false,
                    COLLAR: false,
                    HOOD: false,
                    GULLA :false,
                    other: "",
                  });
                  setShowPrintDialog(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitter Modal */}
      {showSubmitterDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowSubmitterDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Submitted By</h3>
            <p style={styles.modalDescription}>
              Select the submitter and the person who referred the order (defaults to Mohit
              Goyal).
            </p>

            <label
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: "#111827",
                display: "block",
                marginBottom: 6,
              }}
            >
              Submitter
            </label>
            <select
              autoFocus
              value={submitterName}
              onChange={(e) => {
                const v = e.target.value;
                setSubmitterName(v);
                if (v !== OTHER_SUBMITTER_TOKEN) setCustomSubmitter("");
              }}
              style={{ ...styles.input, width: "90%" }}
            >
              <option value="">-- Select Submitter --</option>
              {SUBMITTERS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value={OTHER_SUBMITTER_TOKEN}>Any Other…</option>
            </select>

            {submitterName === OTHER_SUBMITTER_TOKEN && (
              <input
                autoFocus
                placeholder="Enter submitter name"
                value={customSubmitter}
                onChange={(e) => setCustomSubmitter(e.target.value)}
                style={{ ...styles.input, width: "90%", marginTop: 10 }}
              />
            )}

            <label
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: "#111827",
                display: "block",
                marginTop: 14,
                marginBottom: 6,
              }}
            >
              Order Referred By
            </label>
            <select
              value={referrerName}
              onChange={(e) => {
                const v = e.target.value;
                setReferrerName(v);
                if (v !== OTHER_REFERRER_TOKEN) setCustomReferrer("");
              }}
              style={{ ...styles.input, width: "90%" }}
            >
              <option value="Mohit Goyal">Mohit Goyal (default)</option>
              {REFERRERS.filter((n) => n !== "Mohit Goyal").map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value={OTHER_REFERRER_TOKEN}>Any Other…</option>
            </select>

            {referrerName === OTHER_REFERRER_TOKEN && (
              <input
                placeholder="Enter reference person's name"
                value={customReferrer}
                onChange={(e) => setCustomReferrer(e.target.value)}
                style={{ ...styles.input, width: "90%", marginTop: 10 }}
              />
            )}

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={{
                  ...styles.button,
                  padding: "10px 18px",
                  opacity: modalSubmitting || isSubmitting ? 0.7 : 1,
                }}
                disabled={modalSubmitting || isSubmitting}
                onClick={async () => {
                  if (modalSubmitting || isSubmitting) return;
                  setModalSubmitting(true);

                  const resolvedSubmitter =
                    submitterName === OTHER_SUBMITTER_TOKEN
                      ? (customSubmitter || "").trim()
                      : (submitterName || "").trim();

                  let resolvedRef =
                    referrerName === OTHER_REFERRER_TOKEN
                      ? (customReferrer || "").trim()
                      : (referrerName || "").trim();
                  if (!resolvedRef) resolvedRef = "Mohit Goyal";

                  if (!resolvedSubmitter) {
                    setModalSubmitting(false);
                    alert("Please enter the submitter's name.");
                    return;
                  }
                  if (!pendingPayload) {
                    setModalSubmitting(false);
                    setShowSubmitterDialog(false);
                    return;
                  }

                  const submittedByCell = `${resolvedSubmitter} (Order Referred By ${resolvedRef})`;
                  setShowSubmitterDialog(false);

                  try {
                    setIsSubmitting(true);
                 const res = await fetch(GAS_WEB_APP_URL, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: `payload=${encodeURIComponent(JSON.stringify({ ...pendingPayload, submittedBy: submittedByCell }))}`,
});
                    const json = await res.json();
                    if (!res.ok || json.success === false) {
                      const msg = json?.error || `Save failed (HTTP ${res.status})`;
                      throw new Error(msg);
                    }

                    setSubmitSuccess(true);
                    setFormData({
  jobOrderNo: "",
  date: new Date().toISOString().split("T")[0],
  fabric: "",
  brand: "",
  shade: "",
  quantity: "",
  unit: "",
  size: "",
  partyName: "",
  garmentType: "",
  section: "",
  season: "",
  emb: "",
  printing: "",
  pattern: "",
  style: "",
  zip: "",
  bottomType: "",
  tapeLace: "", // ADD THIS LINE
  remarks: "",
  directStitching: "no",
  priority: "MEDIUM",
});
                    setEmbPositions({
                      FRONT: false,
                      BACK: false,
                      RIB: false,
                      ARM: false,
                      LEFT: false,
                      RIGHT: false,
                      POCKET: false,
                      COLLAR: false,
                      HOOD: false,
                      GULLA :false,
                      other: "",
                    });
                    setPrintPositions({
                      FRONT: false,
                      BACK: false,
                      RIB: false,
                      ARM: false,
                      LEFT: false,
                      RIGHT: false,
                      POCKET: false,
                      COLLAR: false,
                      HOOD: false,
                      GULLA :false,
                      other: "",
                    });
                    setImageFile(null);
                    setPendingPayload(null);
                    setSubmitterName("");
                    setCustomSubmitter("");
                    setReferrerName("Mohit Goyal");
                    setCustomReferrer("");
                    await fetchNextJobNo();
                    setTimeout(() => setSubmitSuccess(false), 3000);
                  } catch (err) {
                    setError(err.message || "Something went wrong while saving.");
                  } finally {
                    setIsSubmitting(false);
                    setModalSubmitting(false);
                  }
                }}
              >
                Confirm & Submit
              </button>

              <button
                type="button"
                style={{
                  ...styles.button,
                  padding: "10px 18px",
                  background: "#e5e7eb",
                  color: "#000000ff",
                  opacity: modalSubmitting || isSubmitting ? 0.7 : 1,
                }}
                disabled={modalSubmitting || isSubmitting}
                onClick={() => {
                  if (modalSubmitting || isSubmitting) return;
                  setShowSubmitterDialog(false);
                  setPendingPayload(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shade Modal */}
{showShadeDialog && (
  <div style={styles.modalOverlay} onClick={() => setShowShadeDialog(false)}>
    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
      <h3 style={styles.modalTitle}>Shades & Combinations</h3>
      <p style={styles.modalDescription}>
        Add one or more shades. Optionally enter combinations for each shade
        (comma-separated). Press Enter/Tab to move between fields and create new rows.
      </p>

      <div style={styles.modalBodyScroll}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 3fr auto",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 700, color: "#111827" }}>Shade</div>
          <div style={{ fontWeight: 700, color: "#111827" }}>
            Combinations (comma-separated)
          </div>
          <div />
          {shadeRows.map((row, idx) => (
            <React.Fragment key={idx}>
              <input
                value={row.shade}
                onChange={(e) => {
                  const val = e.target.value;
                  setShadeRows((prev) => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], shade: val };
                    return copy;
                  });
                }}
                onKeyDown={(e) => {
                  // Tab moves to combos field
                  if (e.key === "Tab" && !e.shiftKey) {
                    e.preventDefault();
                    // Focus on combos field of same row
                    const combosInputs = document.querySelectorAll(`input[placeholder="e.g., OFF-WHITE, OLIVE"]`);
                    if (combosInputs[idx]) {
                      combosInputs[idx].focus();
                    }
                  }
                  // Enter in shade field moves to combos field
                  else if (e.key === "Enter") {
                    e.preventDefault();
                    const combosInputs = document.querySelectorAll(`input[placeholder="e.g., OFF-WHITE, OLIVE"]`);
                    if (combosInputs[idx]) {
                      combosInputs[idx].focus();
                    }
                  }
                }}
                placeholder="e.g., BLACK"
                style={styles.input}
                autoFocus={idx === shadeRows.length - 1 && !row.shade}
              />
              <input
                value={row.combos}
                onChange={(e) => {
                  const val = e.target.value;
                  setShadeRows((prev) => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], combos: val };
                    return copy;
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    // Check if we're on the last row
                    if (idx === shadeRows.length - 1) {
                      // Add new row only if current shade is not empty
                      if (row.shade.trim()) {
                        setShadeRows((prev) => [...prev, { shade: "", combos: "" }]);
                        // The new shade field will auto-focus due to autoFocus prop
                      }
                    } else {
                      // Move focus to next row's shade field
                      const shadeInputs = document.querySelectorAll(`input[placeholder="e.g., BLACK"]`);
                      if (shadeInputs[idx + 1]) {
                        shadeInputs[idx + 1].focus();
                      }
                    }
                  }
                  // Shift+Tab from combos goes back to shade field
                  else if (e.key === "Tab" && e.shiftKey) {
                    e.preventDefault();
                    const shadeInputs = document.querySelectorAll(`input[placeholder="e.g., BLACK"]`);
                    if (shadeInputs[idx]) {
                      shadeInputs[idx].focus();
                    }
                  }
                }}
                placeholder="e.g., OFF-WHITE, OLIVE"
                style={styles.input}
              />
              <button
                type="button"
                onClick={() =>
                  setShadeRows((prev) =>
                    prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev
                  )
                }
                style={{
                  ...styles.button,
                  padding: "10px 14px",
                  background: "#e5e7eb",
                  color: "#111827",
                  minWidth: 0,
                }}
                title="Remove row"
              >
                ✕
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button
          type="button"
          style={{ ...styles.button, padding: "10px 14px" }}
          onClick={() => {
            setShadeRows((prev) => [...prev, { shade: "", combos: "" }]);
            // Focus will be set on the new shade field via autoFocus
          }}
        >
          + Add Row
        </button>
        <button
          type="button"
          style={{
            ...styles.button,
            padding: "10px 14px",
            background: "#e5e7eb",
            color: "#111827",
          }}
          onClick={() => setShadeRows([{ shade: "", combos: "" }])}
        >
          Clear All
        </button>
      </div>

      <div style={styles.modalFooter}>
        <button
          type="button"
          style={{ ...styles.button, padding: "10px 18px" }}
          onClick={() => {
            const txt = buildShadeString(shadeRows);
            setFormData((prev) => ({ ...prev, shade: txt }));
            setShowShadeDialog(false);
          }}
        >
          Save
        </button>
        <button
          type="button"
          style={{
            ...styles.button,
            padding: "10px 18px",
            background: "#e5e7eb",
            color: "#111827",
          }}
          onClick={() => setShowShadeDialog(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

      {/* Size Picker Modal */}
      {showSizeDialog && (
        <SizePickerModal
          onClose={() => setShowSizeDialog(false)}
          sizeRows={sizeRows}
          setSizeRows={setSizeRows}
          setFormData={setFormData}
          buildSizeString={buildSizeString}
        />
      )}

      {/* Pattern Modal */}
      {showPatternDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowPatternDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Custom Pattern</h3>
            <p style={styles.modalDescription}>
              Type the pattern name to save with this Job Order.
            </p>

            <input
              autoFocus
              value={patternOtherText}
              onChange={(e) => setPatternOtherText(e.target.value)}
              style={{ ...styles.input, width: "90%" }}
              placeholder="e.g., Chevron Micro-Dobby"
            />

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={{ ...styles.button, padding: "10px 18px" }}
                onClick={() => {
                  const val = (patternOtherText || "").trim();
                  if (!val) return;
                  setFormData((prev) => ({ ...prev, pattern: val }));
                  setLists((prev) => ({
                    ...prev,
                    pattern: Array.from(new Set([val, ...(prev.pattern || [])])),
                  }));
                  setShowPatternDialog(false);
                }}
              >
                Save
              </button>
              <button
                type="button"
                style={{
                  ...styles.button,
                  padding: "10px 18px",
                  background: "#e5e7eb",
                  color: "#111827",
                }}
                onClick={() => setShowPatternDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

const Field = ({ label, children, emoji, required = true }) => (
  <div style={styles.field}>
    <label style={styles.label}>
      {emoji && <span style={styles.emoji}>{emoji}</span>}
      {label}
      {required && <span style={styles.requiredIndicator}>*</span>}
    </label>
    {children}
  </div>
);

const Select = ({ label, name, value, options, onChange, loading, emoji, disabled, required = true }) => {
  const isDisabled = !!disabled || loading || options.length === 0;

  return (
    <Field label={label} emoji={emoji} required={required}>
      <select
        name={name}
        value={value}
        onChange={onChange}
        style={styles.input}
        disabled={isDisabled}
        required={required}
      >
        <option value="">
          {disabled
            ? "Disabled by Direct Stitching"
            : loading
            ? "Loading options..."
            : `-- Select ${label} --`}
        </option>
        {!isDisabled &&
          options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
      </select>
    </Field>
  );
};

const styles = {
  form: {
    maxWidth: 1400,
    margin: "40px auto",
    padding: "40px",
    borderRadius: "24px",
    background: "rgba(255, 255, 255, 1)",
    backdropFilter: "blur(10px)",
    boxShadow: `
      0 10px 40px rgba(0, 0, 0, 0.08),
      0 20px 80px rgba(99, 102, 241, 0.12),
      0 0 0 1px rgba(255, 255, 255, 0.3) inset
    `,
    border: "1px solid rgba(255, 255, 255, 0.3)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    position: "relative",
    overflow: "hidden",
    animation: "fadeIn 0.5s ease-out",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(255, 255, 255, 0.45)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    width: "min(560px, 96vw)",
    background: "#fff",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 25px 60px rgba(2, 6, 23, 0.3)",
    border: "1px solid rgba(15, 23, 42, 0.06)",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    animation: "modalSlideIn 0.3s ease-out",
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: 12,
    color: "#111827",
    fontSize: "20px",
    fontWeight: 700,
  },
  modalDescription: {
    marginTop: 0,
    color: "#111827", // Changed to black for better readability
    fontSize: 14,
    lineHeight: 1.5,
  },
  modalBodyScroll: {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    paddingRight: 8,
  },
  modalFooter: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 20,
    paddingTop: 20,
    borderTop: "1px solid #e5e7eb",
  },
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginTop: 8,
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#f8fafc",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flex: 1,
  },
  logo: {
    width: "72px",
    height: "72px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    color: "white",
    boxShadow: "0 8px 20px rgba(99, 102, 241, 0.4)",
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  title: {
    margin: 0,
    fontSize: "36px",
    fontWeight: 800,
    background: "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    letterSpacing: "-0.5px",
  },
  titleBadge: {
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "white",
    fontSize: "12px",
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: "20px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "15px",
    color: "#64748b",
    fontWeight: 500,
    maxWidth: "500px",
  },
  headerActions: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    alignItems: "flex-end",
  },
  headerBadges: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  badgeRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  badge: {
    background: "linear-gradient(135deg, #f1f5f9, #ffffff)",
    color: "#334155",
    fontSize: "14px",
    fontWeight: 600,
    padding: "10px 16px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.8) inset",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid rgba(226, 232, 240, 0.8)",
    transition: "all 0.2s",
  },
  badgePriority: {
    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
    color: "#92400e",
    fontSize: "14px",
    fontWeight: 600,
    padding: "10px 16px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid rgba(251, 191, 36, 0.3)",
  },
  prioritySelect: {
    background: "transparent",
    border: "none",
    color: "#92400e",
    fontWeight: 700,
    outline: "none",
    cursor: "pointer",
    fontSize: "14px",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  badgeButton: {
    border: "none",
    background: "rgba(255,255,255,0.3)",
    color: "#64748b",
    borderRadius: 999,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: "12px",
    transition: "all 0.2s",
  },
  badgeDateInput: {
    border: "none",
    background: "transparent",
    color: "#334155",
    fontWeight: 700,
    outline: "none",
    padding: 0,
    marginLeft: 6,
    cursor: "pointer",
    fontSize: "14px",
  },
  actionButtons: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  linkAction: {
    background: "transparent",
    border: "none",
    color: "#4f46e5",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    padding: "10px 14px",
    borderRadius: 10,
    transition: "all 0.2s",
    outline: "none",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  backButton: {
    background: "linear-gradient(135deg, #f1f5f9, #ffffff)",
    border: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    padding: "10px 18px",
    borderRadius: 10,
    transition: "all 0.2s",
    outline: "none",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  refreshPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 18px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    color: "#111827",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  refreshIcon: {
    width: 20,
    height: 20,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#f1f5f9",
    border: "1px solid #e5e7eb",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
    gap: "32px",
    marginTop: "32px",
  },
  section: {
    padding: "28px",
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.8)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04), 0 1px 0 rgba(255,255,255,0.8) inset",
    border: "1px solid rgba(241, 245, 249, 0.8)",
    transition: "all 0.3s ease",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "28px",
    paddingBottom: "20px",
    borderBottom: "2px solid rgba(226, 232, 240, 0.6)",
  },
  sectionIconContainer: {
    width: "56px",
    height: "56px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
  },
  sectionIcon: {
    fontSize: "24px",
    color: "white",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#1e293b",
    fontWeight: 700,
  },
  sectionSubtitle: {
    margin: "4px 0 0",
    fontSize: "14px",
    color: "#64748b",
    fontWeight: 500,
  },
  sectionContent: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  field: {
    marginBottom: 0,
    position: "relative",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 600,
    marginBottom: "10px",
    color: "#334155",
    fontSize: "14px",
  },
  emoji: {
    fontSize: "16px",
  },
  requiredIndicator: {
    color: "#ef4444",
    marginLeft: "2px",
    fontSize: "12px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    outline: "none",
    fontSize: "15px",
    transition: "all 0.2s",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    color: "#1e293b",
    textTransform: "uppercase",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
  },
  inlineGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    alignItems: "flex-start",
  },
  radioGroup: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  radioLabel: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    textAlign: "center",
    fontSize: "14px",
    fontWeight: 600,
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  radioInput: {
    margin: 0,
  },
  fileUploadContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  fileInput: {
    display: "none",
  },
  fileUploadLabel: {
    flex: 1,
    padding: "14px 16px",
    borderRadius: "12px",
    border: "2px dashed #e2e8f0",
    backgroundColor: "#f8fafc",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
    color: "#64748b",
    fontSize: "15px",
  },
  fileUploadIcon: {
    fontSize: "18px",
  },
  fileClearButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #ef4444",
    background: "#fee2e2",
    color: "#b91c1c",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    transition: "all 0.2s",
  },
  buttonContainer: {
    marginTop: "48px",
    display: "flex",
    justifyContent: "center",
  },
  button: {
    padding: "18px 40px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "16px",
    minWidth: "260px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    transition: "all 0.3s ease",
    boxShadow: "0 6px 20px rgba(99, 102, 241, 0.4)",
    letterSpacing: "0.5px",
  },
  buttonIcon: {
    fontSize: "20px",
  },
  buttonSubmitting: {
    background: "linear-gradient(135deg, #c7d2fe, #a5b4fc)",
    cursor: "not-allowed",
    transform: "none !important",
    boxShadow: "none !important",
  },
  spinner: {
    display: "inline-block",
    width: "20px",
    height: "20px",
    border: "3px solid rgba(255,255,255,0.3)",
    borderRadius: "50%",
    borderTopColor: "white",
    animation: "spin 1s ease-in-out infinite",
  },
  error: {
    background: "linear-gradient(135deg, #fee2e2, #fecaca)",
    color: "#b91c1c",
    border: "1px solid #fca5a5",
    padding: "20px",
    borderRadius: "14px",
    margin: "28px 0",
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    animation: "shake 0.5s ease-in-out",
  },
  errorIcon: {
    fontSize: "24px",
    marginTop: "2px",
  },
  errorText: {
    margin: "6px 0 0",
    fontSize: "14px",
    color: "#b91c1c",
  },
  success: {
    background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
    color: "#166534",
    border: "1px solid #86efac",
    padding: "20px",
    borderRadius: "14px",
    margin: "28px 0",
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    animation: "fadeIn 0.5s ease-out",
  },
  successIcon: {
    fontSize: "24px",
    marginTop: "2px",
  },
  successText: {
    margin: "6px 0 0",
    fontSize: "14px",
    color: "#166534",
  },
  stepBtn: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 8,
    width: 32,
    height: 32,
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#111827",
  },
  stepInput: {
    width: 48,
    textAlign: "center",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 6px",
    fontWeight: 800,
    background: "#fff",
    fontSize: "14px",
    color: "#111827",
  },
  tabBtn: {
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#111827",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s",
  },
  tabBtnActive: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    borderColor: "transparent",
    boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
  },
  counterBadge: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    padding: "8px 12px",
    borderRadius: 999,
  },
  checkCard: {
    userSelect: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px",
    borderRadius: 12,
    border: "1px solid #e5e7f0",
    background: "linear-gradient(180deg,#ffffff,#f8fafc)",
    fontWeight: 800,
    fontSize: 15,
    color: "#0f172a",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  checkCardChecked: {
    borderColor: "#a5b4fc",
    boxShadow: "0 0 0 2px rgba(99,102,241,0.28) inset",
    background: "linear-gradient(180deg,#ffffff,#e0e7ff)",
  },
  ghostButton: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#111827",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
};

// Enhanced Global Styles with black text for modals
const globalStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes modalSlideIn {
    from { opacity: 0; transform: translateY(-30px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
  
  body {
    background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
    min-height: 100vh;
    padding: 30px;
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #111827;
  }
  
  * {
    box-sizing: border-box;
  }
  
  select {
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 16px center;
    background-size: 18px;
    padding-right: 48px !important;
  }
  
  input:focus, select:focus, textarea:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
    outline: none;
  }
  
  .paper {
    position: relative;
    background: #ffffff;
    border-radius: 20px;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow:
      0 15px 40px rgba(0,0,0,0.08),
      0 1px 0 rgba(255,255,255,0.8) inset;
    padding: 28px;
    overflow: hidden;
  }
  
  .paper::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(
        to bottom,
        rgba(2, 6, 23, 0.06) 0px,
        rgba(2, 6, 23, 0.06) 1px,
        transparent 24px,
        transparent 26px
      );
    pointer-events: none;
    opacity: 0.3;
    mix-blend-mode: multiply;
    border-radius: inherit;
  }
  
  .paper::after {
    content: "";
    position: absolute;
    top: -12px;
    right: 20px;
    width: 120px;
    height: 30px;
    background: radial-gradient(ellipse at center, rgba(99,102,241,0.12), transparent 70%);
    transform: rotate(2.5deg);
    opacity: 0.4;
    filter: blur(4px);
    pointer-events: none;
  }
  
  .paper--header {
    padding: 32px 32px 24px 32px;
    background:
      radial-gradient(120% 100% at 0% 0%, rgba(255, 255, 255, 0.1) 0%, transparent 60%),
      radial-gradient(120% 100% at 100% 0%, rgba(139,92,246,0.12) 0%, transparent 60%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(255,255,255,0.75) 100%);
    border: 1px solid rgba(148,163,184,0.2);
    border-radius: 20px;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.8),
      0 12px 40px rgba(2,6,23,0.1);
    backdrop-filter: blur(12px);
  }
  
  .paper__rule {
    height: 2px;
    width: 100%;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.8), rgba(139,92,246,0.8), rgba(255, 255, 255, 0.8));
    margin-top: 20px;
    border-radius: 999px;
    opacity: 0.6;
  }
  
  button {
    transition: all 0.2s ease;
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  
  button:active:not(:disabled) {
    transform: translateY(0);
  }
  
  .linkAction:hover {
    background: rgba(99, 102, 241, 0.08);
  }
  
  .refreshPill:hover:not(:disabled) {
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    transform: translateY(-2px);
  }
  
  .backButton:hover {
    background: linear-gradient(135deg, #e2e8f0, #ffffff);
    border-color: #cbd5e1;
  }
  
  .checkboxRow:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  
  .fileUploadLabel:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  
  .checkCard:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
  
  /* Modal text colors */
  .modal h3,
  .modal p,
  .modal label,
  .modal span {
    color: #111827 !important;
  }
  
  .modal input,
  .modal textarea,
  .modal select {
    color: #111827 !important;
  }
`;

const styleElement = document.createElement("style");
styleElement.innerHTML = globalStyles;
document.head.appendChild(styleElement);

export default JobOrderForm;