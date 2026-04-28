import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const SHEET_ID = "1Frg7kHPiiGeydB02LsGKJ-0UeO8N45-19skJRRvU_Qg";
const DROPDOWNS_TAB = "Parties";
const JOBS_TAB = "JobOrder";
const SHEET_ID1 = "1fKSwGBIpzWEFk566WRQ4bzQ0anJlmasoY8TwrTLQHXI";


const MAX_ROWS = 10000;
const GAS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzmfWypKJuAzaS5HD5OOyK3DU-N_PrGeRnFR0RNn_Jm_tMCWJnOnE77HfgEdcL4JYNbBQ/exec";

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
const BONE_OPTIONS = ["YES", "NO"];
const COLLAR_OPTIONS = ["YES", "NO"];
const BOTTOM_TYPE_OPTIONS = ["Elastic and Stopper", "Normal Fold", "1 Inch Elastic"];
const SUBMITTERS = ["Mohit Goyal", "EA", "Chandan", "Ravinder Singh"];
const OTHER_SUBMITTER_TOKEN = "__ANY_OTHER__";
const REFERRERS = ["Mohit Goyal", "EA", "Varun Goyal"];
const TAPE_LACE_OPTIONS = ["YES", "NO", "NOT DECIDED"];
const OTHER_REFERRER_TOKEN = "__ANY_OTHER__";
const PRIORITY_OPTIONS = ["HIGH", "MEDIUM", "LOW", "REPEATED_LOT"];
const STICKER_OPTIONS = ["YES", "NO", "Silicon", "Fusing", "NOT DECIDED"];
const FULL_BAJU_OPTIONS = ["YES", "NO"];


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
  tapeLace: "",
  remarks: "",
  directStitching: "no",
  orderNo: "",
  priority: "MEDIUM",
  sticker: "",
  bone: "",
  collar: "",
  fullBaju: "", // ADD THIS LINE
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
  const [shadeRows, setShadeRows] = useState([{ shade: "", combos: "", rolls: "" }]);

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
  const [repeatedLotNumber, setRepeatedLotNumber] = useState("");
  const [showRepeatedLotDialog, setShowRepeatedLotDialog] = useState(false);

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
  "Tape/Lace",
  "Remarks",
  "Direct Stitching",
  "Sticker",
  "Bone",
  "Collar",
  "Full Baju", // ADD THIS LINE
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
    GULLA: false,
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
    GULLA: false,
    other: "",
  });

  const [showPatternDialog, setShowPatternDialog] = useState(false);
  const [patternOtherText, setPatternOtherText] = useState("");

function parseShadeString(s) {
  const src = String(s || "").trim();
  if (!src) return [{ shade: "", combos: "", rolls: "" }];
  return src.split(/\s*,\s*/).map((part) => {
    const m = part.match(/^(.+?)\s*\((.+)\)\s*\[(\d+)\]$/);
    if (m) return { shade: m[1].trim(), combos: m[2].trim(), rolls: m[3].trim() };
    const m2 = part.match(/^(.+?)\s*\((.+)\)$/);
    if (m2) return { shade: m2[1].trim(), combos: m2[2].trim(), rolls: "" };
    const m3 = part.match(/^(.+?)\s*\[(\d+)\]$/);
    if (m3) return { shade: m3[1].trim(), combos: "", rolls: m3[2].trim() };
    return { shade: part.trim(), combos: "", rolls: "" };
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
    "Bottom Type": isShirt ? "" : pick(src, "Bottom Type", "BottomType", "Bottom"),
    "Tape/Lace": pick(src, "Tape/Lace", "Tape Lace", "TapeLace"),
    Remarks: pick(src, "Remarks", "Notes", "Note"),
    "Direct Stitching": isDirect ? "yes" : directRaw || "",
    "Emb Details": pick(src, "Emb Details", "Embroidery Details"),
    "Printing Details": pick(src, "Printing Details", "Print Details"),
    "Sticker": pick(src, "Sticker", "Sticker Option"),
    "Bone": pick(src, "Bone", "Bone Option"),
    "Collar": pick(src, "Collar", "Collar Option"),
    "Full Baju": pick(src, "Full Baju", "FullBaju", "Full Baju Attribute"), // ADD THIS LINE
  };
}

  function isShirtGarment(garmentType = "") {
    const type = String(garmentType || "").trim().toUpperCase();
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
    tapeLace: "",
    remarks: "",
    directStitching: "",
    orderNo: currentOrderNo,
    priority: "MEDIUM",
    sticker: "",
    bone: "",
    collar: "",
    fullBaju: "", // ADD THIS LINE
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
      GULLA: false,
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
      const rolls = (r.rolls || "").trim();
      let result = shade;
      if (combo) result += ` (${combo})`;
      if (rolls) result += ` [${rolls}]`;
      return result;
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

  const priorityFromRow = String(row["Priority"] || "").toUpperCase();
  let priority = priorityFromRow || "MEDIUM";
  
  if (priorityFromRow.startsWith("REPEATED_LOT#")) {
    priority = priorityFromRow;
  } else if (priorityFromRow === "REPEATED_LOT") {
    priority = "REPEATED_LOT#N/A";
  }

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
    bottomType: isShirt ? "" : String(row["Bottom Type"] || ""),
    tapeLace: String(row["Tape/Lace"] || ""),
    remarks: String(row["Remarks"] || ""),
    directStitching: isDirect ? "yes" : "no",
    priority: priority,
    sticker: String(row["Sticker"] || ""),
    bone: String(row["Bone"] || ""),
    collar: String(row["Collar"] || ""),
    fullBaju: String(row["Full Baju"] || ""), // ADD THIS LINE
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
    tapeLace: "",
    remarks: "",
    directStitching: "no",
    orderNo: "",
    priority: "MEDIUM",
    sticker: "",
    bone: "",
    collar: "",
    fullBaju: "", // ADD THIS LINE
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
  setShowRepeatedLotDialog(false);
  setSubmitterName("");
  setCustomSubmitter("");
  setReferrerName("Mohit Goyal");
  setCustomReferrer("");
  setRepeatedLotNumber("");
  setPendingPayload(null);
  setError("");
  setSubmitSuccess(false);
}, []);

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "garmentType") {
      const isShirt = isShirtGarment(value);
      
      if (isShirt) {
        setFormData((prev) => ({
          ...prev,
          garmentType: value,
          bottomType: "",
        }));
      } else {
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

    if (name === "priority") {
      if (value === "REPEATED_LOT") {
        setShowRepeatedLotDialog(true);
        return;
      }
      setFormData((prev) => ({ ...prev, priority: value }));
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
    
    // ✅ MOVED THIS INSIDE THE TRY BLOCK - Rolls validation
    const shadeRowsFromForm = parseShadeString(formData.shade);
    const hasEmptyRolls = shadeRowsFromForm.some(row => !row.rolls || !row.rolls.trim());
    if (hasEmptyRolls) {
      throw new Error("Rolls quantity is required for all shades. Please open the Shade dialog and add rolls quantity for each shade.");
    }
    
    if (!formData.quantity) throw new Error("Quantity is required");
    if (!formData.unit) throw new Error("Please select a unit");
    if (!formData.priority) throw new Error("Please select a priority");
    if (!formData.fullBaju?.trim()) throw new Error("Full Baju Attribute is required");

    if (!formData.partyName?.trim()) throw new Error("Party Name is required");
    if (!formData.garmentType?.trim()) throw new Error("Garment Type is required");
    if (!formData.section?.trim()) throw new Error("Gender/Section is required");
    if (!formData.season?.trim()) throw new Error("Season is required");
    if (!formData.zip?.trim()) throw new Error("Zip is required");
    if (!formData.sticker?.trim()) throw new Error("Sticker is required");
    if (!formData.bone?.trim()) throw new Error("Bone is required");
    if (!formData.collar?.trim()) throw new Error("Collar is required");

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
      priority: formData.priority,
      zip: formData.zip || "",
      bottomType: formData.bottomType || "",
      tapeLace: formData.tapeLace || "",
      sticker: formData.sticker || "",
      bone: formData.bone || "",
      collar: formData.collar || "",
      fullBaju: formData.fullBaju || "",
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
  const getPriorityDisplay = (priority) => {
    if (priority && priority.startsWith("REPEATED_LOT#")) {
      const lotNumber = priority.split("#")[1];
      return `REPEATED LOT (${lotNumber})`;
    }
    return priority;
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {/* Enhanced Header with modern design */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.headerLeft}>
            <div style={styles.logoWrapper}>
              <div style={styles.logo}>📋</div>
            </div>
            <div style={styles.headerTitleSection}>
              <h1 style={styles.mainTitle}>Cutting Job Order</h1>
              <div style={styles.badgeContainer}>
                <span style={styles.badge}>Production</span>
                <span style={styles.badge}>Manufacturing</span>
              </div>
              <p style={styles.headerSubtitle}>Create and manage production orders with precision</p>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.orderInfo}>
              <div style={styles.orderNumber}>
                <span style={styles.orderLabel}>Order #</span>
                <span style={styles.orderValue}>{formData.jobOrderNo || "JO-PENDING"}</span>
                <button
                  type="button"
                  onClick={fetchNextJobNo}
                  style={styles.refreshOrderBtn}
                  title="Refresh Job Order No."
                >
                  ↻
                </button>
              </div>
              <div style={styles.datePicker}>
                <span style={styles.dateLabel}>Date</span>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  style={styles.dateInput}
                  required
                />
              </div>
            </div>
            
            <div style={styles.actionGroup}>
              <button
                type="button"
                onClick={() => setShowRepeatDialog(true)}
                style={styles.actionButton}
                title="Pick a previous order to repeat"
              >
                <span style={styles.actionIcon}>↻</span>
                Repeat Order
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                style={styles.actionButton}
                title="Clear all fields"
              >
                <span style={styles.actionIcon}>✕</span>
                Clear All
              </button>
              <button
                type="button"
                onClick={handleRefreshAll}
                style={styles.refreshButton}
                disabled={refreshing}
              >
                <span style={styles.refreshIcon}>{refreshing ? "⋯" : "↻"}</span>
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                style={styles.backButton}
              >
                ←
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={styles.mainGrid}>
        {/* Left Column - Product Details */}
        <div style={styles.column}>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>🧵</div>
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
                  style={styles.readOnlyInput}
                  placeholder="Auto from All Orders"
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
              <Select
                label="Style"
                emoji="👔"
                name="style"
                value={formData.style}
                options={styleOptionsWithOther}
                onChange={handleChange}
                loading={loading}
              />



              <div style={styles.rowGroup}>
                <Field label="Shades" emoji="🎨">
                  <input
                    name="shade"
                    value={formData.shade}
                    readOnly
                    onClick={() => {
                      setShadeRows(parseShadeString(formData.shade));
                      setShowShadeDialog(true);
                    }}
                    style={styles.clickableInput}
                    placeholder="Click to add shades"
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
                    style={styles.clickableInput}
                    placeholder="Click to add sizes"
                  />
                </Field>
              </div>

              <div style={styles.rowGroup}>
                <Field label="Quantity" emoji="🔢">
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="e.g., 150"
                    min="0"
                    step="1"
                    required
                  />
                </Field>
                <Field label="Unit" emoji="📦">
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    style={styles.select}
                    required
                  >
                    <option value="">Select Unit</option>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Selection Details */}
        <div style={styles.column}>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>📊</div>
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

              <div style={styles.rowGroup}>
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

              <div style={styles.radioField}>
                <label style={styles.radioLabel}>
                  <span style={styles.emoji}>🪡</span>
                  Direct Stitching
                  <span style={styles.requiredIndicator}>*</span>
                </label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioOption}>
                    <input
                      type="radio"
                      name="directStitching"
                      value="no"
                      checked={formData.directStitching === "no"}
                      onChange={handleChange}
                    />
                    <span>No</span>
                  </label>
                  <label style={styles.radioOption}>
                    <input
                      type="radio"
                      name="directStitching"
                      value="yes"
                      checked={formData.directStitching === "yes"}
                      onChange={handleChange}
                    />
                    <span>Yes</span>
                  </label>
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
             <Select
  label="Full Baju Attribute"
  emoji="👚"
  name="fullBaju"
  value={formData.fullBaju}
  options={FULL_BAJU_OPTIONS}
  onChange={handleChange}
  required={true}
/>
          </div>
         
        </div>

        {/* Right Column - Additional Information */}
        <div style={styles.column}>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>📝</div>
              <div>
                <h3 style={styles.sectionTitle}>Accessory Information</h3>
                <p style={styles.sectionSubtitle}>Style, finishing options, and attachments</p>
              </div>
            </div>

            <div style={styles.sectionContent}>
              
              <Field label="Priority" emoji="⚡">
                <select
                  name="priority"
                  value={formData.priority.startsWith("REPEATED_LOT#") ? "REPEATED_LOT" : formData.priority}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "REPEATED_LOT") {
                      setShowRepeatedLotDialog(true);
                    } else {
                      setFormData((prev) => ({ ...prev, priority: value }));
                    }
                  }}
                  style={styles.select}
                  required
                >
                  <option value="">Select Priority</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                  <option value="REPEATED_LOT">REPEATED LOT</option>
                </select>
                {formData.priority.startsWith("REPEATED_LOT#") && (
                  <div style={styles.lotBadge}>
                    <span>🔁</span>
                    <span>Lot: {formData.priority.split("#")[1] || ""}</span>
                  </div>
                )}
              </Field>

              <Field label="Zip" emoji="🤐" required={true}>
                <select
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  style={styles.select}
                  required
                >
                  <option value="">Select Zip Option</option>
                  {ZIP_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>

              <Field label="Sticker" emoji="🏷️" required={true}>
                <select
                  name="sticker"
                  value={formData.sticker}
                  onChange={handleChange}
                  style={styles.select}
                  required
                >
                  <option value="">Select Sticker Option</option>
                  {STICKER_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>

              <Field label="Bone" emoji="🦴" required={true}>
                <select
                  name="bone"
                  value={formData.bone}
                  onChange={handleChange}
                  style={styles.select}
                  required
                >
                  <option value="">Select Bone Option</option>
                  {BONE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>

              <Field label="Collar" emoji="👔" required={true}>
                <select
                  name="collar"
                  value={formData.collar}
                  onChange={handleChange}
                  style={styles.select}
                  required
                >
                  <option value="">Select Collar Option</option>
                  {COLLAR_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>

              <Field label="Bottom Type" emoji="👖" required={false}>
                <select
                  name="bottomType"
                  value={formData.bottomType}
                  onChange={handleChange}
                  style={{
                    ...styles.select,
                    ...(isShirtGarment(formData.garmentType) ? styles.disabledSelect : {})
                  }}
                  disabled={isShirtGarment(formData.garmentType)}
                >
                  <option value="">
                    {isShirtGarment(formData.garmentType) 
                      ? "Not applicable for Shirts" 
                      : "Select Bottom Type"}
                  </option>
                  {!isShirtGarment(formData.garmentType) && 
                    BOTTOM_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))
                  }
                </select>
                {isShirtGarment(formData.garmentType) && (
                  <div style={styles.fieldNote}>Not applicable for shirts</div>
                )}
              </Field>

              <Field label="Tape/Lace" emoji="🎀" required={false}>
                <select
                  name="tapeLace"
                  value={formData.tapeLace}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="">Select Tape/Lace</option>
                  {TAPE_LACE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>

              <Field label="Remarks" emoji="💬" required={false}>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  style={styles.textarea}
                  placeholder="Special instructions, urgency level, etc."
                  rows={4}
                />
              </Field>

              <Field label="Reference Image" emoji="🖼️" required={false}>
                <div style={styles.fileUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    style={styles.hiddenInput}
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" style={styles.fileUploadLabel}>
                    <span style={styles.fileIcon}>📁</span>
                    <span style={styles.fileName}>
                      {imageFile ? imageFile.name : "Choose an image"}
                    </span>
                  </label>
                  {imageFile && (
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      style={styles.fileClearButton}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={styles.errorMessage}>
          <span style={styles.messageIcon}>❌</span>
          <div>
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div style={styles.successMessage}>
          <span style={styles.messageIcon}>✅</span>
          <div>
            <strong>Success!</strong>
            <p>Order has been saved successfully</p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div style={styles.submitContainer}>
        <button
          type="submit"
          style={{
            ...styles.submitButton,
            ...(isSubmitting ? styles.submittingButton : {}),
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
              <span style={styles.submitIcon}>📤</span>
              <span>Submit Order</span>
            </>
          )}
        </button>
      </div>

      {/* Repeat Order Modal */}
      {showRepeatDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowRepeatDialog(false)}>
          <div style={{ ...styles.modal, maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Repeat a Previous Order</h3>
            <p style={styles.modalDescription}>
              Pick an existing Job Order to prefill this form
            </p>

            <div style={styles.searchContainer}>
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by JO number, Party, Fabric..."
                style={styles.searchInput}
              />
              <button
                type="button"
                style={styles.loadButton}
                onClick={() => fetchRecentOrders()}
                disabled={ordersLoading}
              >
                {ordersLoading ? "Loading…" : "Load Orders"}
              </button>
            </div>

            {ordersError && (
              <div style={styles.modalError}>
                <span>❌</span>
                <div>{ordersError}</div>
              </div>
            )}

            <div style={styles.ordersList}>
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
                    style={styles.orderItem}
                  >
                    <div style={styles.orderItemHeader}>
                      <span style={styles.orderItemNumber}>{o["Job Order No"] || "—"}</span>
                      <span style={styles.orderItemParty}>{o["Party Name"] || "—"}</span>
                    </div>
                    <div style={styles.orderItemDetails}>
                      Fabric: {o["Fabric"] || "—"} | Brand: {o["Brand"] || "—"}
                    </div>
                    <div style={styles.orderItemMeta}>
                      Qty: {o["Quantity"] || "—"} {o["Unit"] || ""}
                    </div>
                  </button>
                ))}
              {!ordersLoading && !ordersError && orders.length === 0 && (
                <div style={styles.emptyOrders}>No orders loaded yet</div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalCancelButton}
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
              Type the style name to save with this Job Order
            </p>

            <input
              autoFocus
              value={styleOtherText}
              onChange={(e) => setStyleOtherText(e.target.value)}
              style={styles.modalInput}
              placeholder="e.g., Oversized Raglan"
            />

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalSaveButton}
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
                style={styles.modalCancelButton}
                onClick={() => setShowStyleDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pattern Modal */}
      {showPatternDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowPatternDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Custom Pattern</h3>
            <p style={styles.modalDescription}>
              Type the pattern name to save with this Job Order
            </p>

            <input
              autoFocus
              value={patternOtherText}
              onChange={(e) => setPatternOtherText(e.target.value)}
              style={styles.modalInput}
              placeholder="e.g., Chevron Micro-Dobby"
            />

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalSaveButton}
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
                style={styles.modalCancelButton}
                onClick={() => setShowPatternDialog(false)}
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
              Select applicable positions and add any other instruction
            </p>

            <div style={styles.positionGrid}>
              {["FRONT", "BACK", "RIB", "ARM", "LEFT", "RIGHT", "POCKET", "COLLAR", "HOOD", "GULLA"].map(
                (k) => (
                  <label key={k} style={styles.positionItem}>
                    <input
                      type="checkbox"
                      checked={!!embPositions[k]}
                      onChange={(e) =>
                        setEmbPositions((prev) => ({ ...prev, [k]: e.target.checked }))
                      }
                    />
                    <span>{k}</span>
                  </label>
                )
              )}
            </div>

            <div style={styles.otherField}>
              <label style={styles.otherLabel}>Any Other</label>
              <textarea
                value={embPositions.other}
                onChange={(e) =>
                  setEmbPositions((prev) => ({ ...prev, other: e.target.value }))
                }
                style={styles.otherTextarea}
                placeholder="Describe any additional embroidery location or notes"
                rows={3}
              />
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalSaveButton}
                onClick={() => setShowEmbDialog(false)}
              >
                Save
              </button>
              <button
                type="button"
                style={styles.modalCancelButton}
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
                    GULLA: false,
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
              Select applicable positions and add any other instruction
            </p>

            <div style={styles.positionGrid}>
              {["FRONT", "BACK", "RIB", "ARM", "LEFT", "RIGHT", "POCKET", "COLLAR", "HOOD", "GULLA"].map(
                (k) => (
                  <label key={k} style={styles.positionItem}>
                    <input
                      type="checkbox"
                      checked={!!printPositions[k]}
                      onChange={(e) =>
                        setPrintPositions((prev) => ({ ...prev, [k]: e.target.checked }))
                      }
                    />
                    <span>{k}</span>
                  </label>
                )
              )}
            </div>

            <div style={styles.otherField}>
              <label style={styles.otherLabel}>Any Other</label>
              <textarea
                value={printPositions.other}
                onChange={(e) =>
                  setPrintPositions((prev) => ({ ...prev, other: e.target.value }))
                }
                style={styles.otherTextarea}
                placeholder="Describe any additional printing location or notes"
                rows={3}
              />
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalSaveButton}
                onClick={() => setShowPrintDialog(false)}
              >
                Save
              </button>
              <button
                type="button"
                style={styles.modalCancelButton}
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
                    GULLA: false,
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

      {/* Shade Modal */}
    {showShadeDialog && (
  <div style={styles.modalOverlay} onClick={() => setShowShadeDialog(false)}>
    <div style={{ ...styles.modal, maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
      <h3 style={styles.modalTitle}>Shades & Combinations</h3>
      <p style={styles.modalDescription}>
        Add one or more shades with optional combinations and <strong style={{color: '#ef4444'}}>required rolls</strong>
      </p>

      <div style={styles.shadeGrid}>
        <div style={styles.shadeHeader}>
          <div>Shade <span style={{color: '#ef4444'}}>*</span></div>
          <div>Combinations</div>
          <div>Rolls <span style={{color: '#ef4444'}}>*</span></div>
          <div></div>
        </div>
        
        {shadeRows.map((row, idx) => (
          <div key={idx} style={styles.shadeRow}>
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
              placeholder="e.g., BLACK"
              style={{
                ...styles.shadeInput,
                ...(!row.shade && row.shade !== "" && styles.requiredField)
              }}
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
              placeholder="e.g., OFF-WHITE, OLIVE"
              style={styles.comboInput}
            />
            <input
              value={row.rolls}
              onChange={(e) => {
                const val = e.target.value;
                // Only allow numbers
                if (val === "" || /^\d+$/.test(val)) {
                  setShadeRows((prev) => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], rolls: val };
                    return copy;
                  });
                }
              }}
              placeholder="Number of rolls"
              type="text"
              inputMode="numeric"
              style={{
                ...styles.rollsInput,
                ...(!row.rolls && row.rolls !== "" && styles.requiredField)
              }}
            />
            <button
              type="button"
              onClick={() =>
                setShadeRows((prev) =>
                  prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev
                )
              }
              style={styles.removeButton}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div style={styles.shadeActions}>
        <button
          type="button"
          style={styles.addRowButton}
          onClick={() => {
            setShadeRows((prev) => [...prev, { shade: "", combos: "", rolls: "" }]);
          }}
        >
          + Add Row
        </button>
        <button
          type="button"
          style={styles.clearAllButton}
          onClick={() => setShadeRows([{ shade: "", combos: "", rolls: "" }])}
        >
          Clear All
        </button>
      </div>

      <div style={styles.modalFooter}>
        <button
          type="button"
          style={styles.modalSaveButton}
          onClick={() => {
            // Validate that every row has both shade and rolls
            const hasEmptyShade = shadeRows.some(row => !row.shade || !row.shade.trim());
            const hasEmptyRolls = shadeRows.some(row => !row.rolls || !row.rolls.trim());
            
            if (hasEmptyShade) {
              alert("Please fill in all shade values before saving");
              return;
            }
            
            if (hasEmptyRolls) {
              alert("Please fill in rolls quantity for all shades before saving");
              return;
            }
            
            const txt = buildShadeString(shadeRows);
            setFormData((prev) => ({ ...prev, shade: txt }));
            setShowShadeDialog(false);
          }}
        >
          Save
        </button>
        <button
          type="button"
          style={styles.modalCancelButton}
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

      {/* Submitter Modal */}
      {showSubmitterDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowSubmitterDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Submitted By</h3>
            <p style={styles.modalDescription}>
              Select the submitter and the person who referred the order
            </p>

            <div style={styles.submitterField}>
              <label style={styles.submitterLabel}>Submitter</label>
              <select
                autoFocus
                value={submitterName}
                onChange={(e) => {
                  const v = e.target.value;
                  setSubmitterName(v);
                  if (v !== OTHER_SUBMITTER_TOKEN) setCustomSubmitter("");
                }}
                style={styles.submitterSelect}
              >
                <option value="">Select Submitter</option>
                {SUBMITTERS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
                <option value={OTHER_SUBMITTER_TOKEN}>Any Other…</option>
              </select>

              {submitterName === OTHER_SUBMITTER_TOKEN && (
                <input
                  autoFocus
                  placeholder="Enter submitter name"
                  value={customSubmitter}
                  onChange={(e) => setCustomSubmitter(e.target.value)}
                  style={styles.submitterInput}
                />
              )}
            </div>

            <div style={styles.submitterField}>
              <label style={styles.submitterLabel}>Order Referred By</label>
              <select
                value={referrerName}
                onChange={(e) => {
                  const v = e.target.value;
                  setReferrerName(v);
                  if (v !== OTHER_REFERRER_TOKEN) setCustomReferrer("");
                }}
                style={styles.submitterSelect}
              >
                <option value="Mohit Goyal">Mohit Goyal (default)</option>
                {REFERRERS.filter((n) => n !== "Mohit Goyal").map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
                <option value={OTHER_REFERRER_TOKEN}>Any Other…</option>
              </select>

              {referrerName === OTHER_REFERRER_TOKEN && (
                <input
                  placeholder="Enter reference person's name"
                  value={customReferrer}
                  onChange={(e) => setCustomReferrer(e.target.value)}
                  style={styles.submitterInput}
                />
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalSaveButton}
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
                      tapeLace: "",
                      remarks: "",
                      directStitching: "no",
                      priority: "MEDIUM",
                      sticker: "",
                      bone: "",
                      collar: "",
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
                    setImageFile(null);
                    setPendingPayload(null);
                    setSubmitterName("");
                    setCustomSubmitter("");
                    setReferrerName("Mohit Goyal");
                    setCustomReferrer("");
                    setRepeatedLotNumber("");
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
                style={styles.modalCancelButton}
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

      {/* Repeated Lot Dialog */}
      {showRepeatedLotDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowRepeatedLotDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Repeated Lot Details</h3>
            <p style={styles.modalDescription}>
              Enter the repeated lot number for tracking:
            </p>
            
            <input
              autoFocus
              type="text"
              value={repeatedLotNumber}
              onChange={(e) => setRepeatedLotNumber(e.target.value.toUpperCase())}
              placeholder="e.g., LOT-001, JO-123"
              style={styles.modalInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (repeatedLotNumber.trim()) {
                    setFormData((prev) => ({
                      ...prev,
                      priority: `REPEATED_LOT#${repeatedLotNumber.trim()}`
                    }));
                    setShowRepeatedLotDialog(false);
                    setRepeatedLotNumber("");
                  }
                }
              }}
            />
            
            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalSaveButton}
                onClick={() => {
                  if (repeatedLotNumber.trim()) {
                    setFormData((prev) => ({
                      ...prev,
                      priority: `REPEATED_LOT#${repeatedLotNumber.trim()}`
                    }));
                    setShowRepeatedLotDialog(false);
                    setRepeatedLotNumber("");
                  }
                }}
              >
                Save
              </button>
              <button
                type="button"
                style={styles.modalCancelButton}
                onClick={() => {
                  setShowRepeatedLotDialog(false);
                  setRepeatedLotNumber("");
                  setFormData((prev) => ({ ...prev, priority: "MEDIUM" }));
                }}
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
  <div style={styles.fieldContainer}>
    <label style={styles.fieldLabel}>
      <span style={styles.fieldEmoji}>{emoji}</span>
      {label}
      {required && <span style={styles.fieldRequired}>*</span>}
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
        style={styles.select}
        disabled={isDisabled}
        required={required}
      >
        <option value="">
          {disabled
            ? "Disabled by Direct Stitching"
            : loading
            ? "Loading options..."
            : `Select ${label}`}
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
  // Layout
  form: {
    maxWidth: 1440,
    margin: "20px auto",
    padding: "24px",
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  // Header
  header: {
    background: "linear-gradient(135deg, #090085 0%, #004181 100%)",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.05)",
    border: "1px solid rgba(226, 232, 240, 0.6)",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
  },
  headerLeft: {
    display: "flex",
    gap: "20px",
    flex: 1,
  },
  logoWrapper: {
    width: "56px",
    height: "56px",
    background: "linear-gradient(135deg, #ffffff, #8b5cf6)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
  },
  logo: {
    fontSize: "28px",
    color: "white",
  },
  headerTitleSection: {
    flex: 1,
  },
  mainTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: "-0.5px",
    lineHeight: 1.2,
  },
  badgeContainer: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
  badge: {
    background: "#e2e8f0",
    color: "#475569",
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "20px",
  },
  headerSubtitle: {
    margin: "8px 0 0",
    fontSize: "14px",
    color: "#ffffff",
  },
  headerRight: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    alignItems: "flex-end",
  },
  orderInfo: {
    display: "flex",
    gap: "16px",
    background: "#ffffff",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  orderNumber: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  orderLabel: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: 500,
  },
  orderValue: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a",
  },
  refreshOrderBtn: {
    border: "none",
    background: "#f1f5f9",
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#475569",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  datePicker: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dateLabel: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: 500,
  },
  dateInput: {
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "14px",
    color: "#0f172a",
    background: "#ffffff",
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
  },
  actionButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  actionIcon: {
    fontSize: "14px",
  },
  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  refreshIcon: {
    fontSize: "14px",
  },
  backButton: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#475569",
    fontSize: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // Main Grid
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    marginBottom: "24px",
  },
  column: {
    minWidth: 0,
  },

  // Sections
  section: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.03)",
    border: "1px solid #edf2f7",
    height: "fit-content",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "2px solid #f1f5f9",
  },
  sectionIcon: {
    width: "40px",
    height: "40px",
    background: "linear-gradient(135deg, #f1f5f9, #ffffff)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    border: "1px solid #e2e8f0",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "19px",
    fontWeight: 900,
    color: "#002b70",
  },
  sectionSubtitle: {
    margin: "2px 0 0",
    fontSize: "12px",
    color: "#000000",
  },
  sectionContent: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  // Add to styles object
glassCard: {
  background: "rgba(255, 255, 255, 0.9)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
},

gradientBorder: {
  position: "relative",
  background: "linear-gradient(white, white) padding-box, linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899) border-box",
  border: "2px solid transparent",
  borderRadius: "16px",
},

  // Form Fields
  fieldContainer: {
    width: "100%",
  },
  fieldLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "6px",
    fontSize: "15px",
    fontWeight: 500,
    color: "#002558",
  },
  fieldEmoji: {
    fontSize: "14px",
  },
  fieldRequired: {
    color: "#ef4444",
    marginLeft: "2px",
    fontSize: "12px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "17px",
    color: "#000000",
    background: "#ffffff",
    transition: "all 0.2s",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "17px",
    color: "#000000",
    background: "#ffffff",
    cursor: "pointer",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    backgroundSize: "16px",
  },
  readOnlyInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    color: "#64748b",
    background: "#f8fafc",
    cursor: "not-allowed",
  },
  clickableInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    color: "#1e293b",
    background: "#ffffff",
    cursor: "pointer",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    color: "#1e293b",
    background: "#ffffff",
    resize: "vertical",
    minHeight: "80px",
    fontFamily: "inherit",
  },
  disabledSelect: {
    background: "#f8fafc",
    color: "#94a3b8",
    cursor: "not-allowed",
  },

  // Layout Helpers
  rowGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },

  // Radio Group
  radioField: {
    marginBottom: "0",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#475569",
  },
  radioGroup: {
    display: "flex",
    gap: "16px",
  },
  radioOption: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    color: "#1e293b",
    cursor: "pointer",
    padding: "4px 0",
  },

  // File Upload
  fileUpload: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  hiddenInput: {
    display: "none",
  },
  fileUploadLabel: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px dashed #cbd5e1",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#475569",
  },
  fileIcon: {
    fontSize: "16px",
  },
  fileName: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
    rollsInput: {
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    fontSize: "13px",
    width: "100%",
  },
  fileClearButton: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },

  // Lot Badge
  lotBadge: {
    fontSize: "13px",
    color: "#b45309",
    marginTop: "4px",
    padding: "4px 8px",
    background: "rgba(251, 191, 36, 0.1)",
    borderRadius: "6px",
    border: "1px solid rgba(251, 191, 36, 0.2)",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  fieldNote: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "4px",
    fontStyle: "italic",
  },

  // Messages
  errorMessage: {
    background: "#fef2f2",
    border: "1px solid #fee2e2",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    color: "#991b1b",
  },
  successMessage: {
    background: "#f0fdf4",
    border: "1px solid #dcfce7",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    color: "#166534",
  },
  messageIcon: {
    fontSize: "20px",
  },

  // Submit Button
  submitContainer: {
    display: "flex",
    justifyContent: "center",
    marginTop: "32px",
  },
  submitButton: {
    padding: "14px 48px",
    background: "linear-gradient(135deg, #00026d, #1e0064)",
    color: "white",
    border: "none",
    borderRadius: "30px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
    transition: "all 0.2s",
  },
  submitIcon: {
    fontSize: "18px",
  },
  submittingButton: {
    background: "linear-gradient(135deg, #001061, #c7d2fe)",
    cursor: "not-allowed",
    transform: "none",
    boxShadow: "none",
  },
  spinner: {
    width: "18px",
    height: "18px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "50%",
    borderTopColor: "white",
    animation: "spin 1s ease-in-out infinite",
  },

  // Modal Styles
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modal: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    maxWidth: "500px",
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  modalTitle: {
    margin: "0 0 8px",
    fontSize: "20px",
    fontWeight: 700,
    color: "#0f172a",
  },
  modalDescription: {
    margin: "0 0 20px",
    fontSize: "14px",
    color: "#64748b",
    lineHeight: 1.5,
  },
  modalInput: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    marginBottom: "20px",
  },
  modalFooter: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "1px solid #edf2f7",
  },
  modalSaveButton: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  modalCancelButton: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#475569",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  // Repeat Order Modal
  searchContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },
  searchInput: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
  },
  loadButton: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#475569",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
  },
  modalError: {
    background: "#fef2f2",
    border: "1px solid #fee2e2",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "16px",
    color: "#991b1b",
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  ordersList: {
    maxHeight: "400px",
    overflow: "auto",
    border: "1px solid #edf2f7",
    borderRadius: "10px",
  },
  orderItem: {
    width: "100%",
    textAlign: "left",
    padding: "14px",
    border: "none",
    borderBottom: "1px solid #edf2f7",
    background: "#ffffff",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  orderItemHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },
  orderItemNumber: {
    fontWeight: 700,
    color: "#0f172a",
    fontSize: "14px",
  },
  orderItemParty: {
    color: "#64748b",
    fontSize: "13px",
  },
  orderItemDetails: {
    fontSize: "13px",
    color: "#475569",
    marginBottom: "4px",
  },
  orderItemMeta: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  emptyOrders: {
    padding: "24px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px",
  },

  // Position Grid
  positionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
    gap: "8px",
    marginBottom: "16px",
  },
  positionItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 10px",
    background: "#f8fafc",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#1e293b",
    cursor: "pointer",
  },

  // Other Field
  otherField: {
    marginTop: "12px",
  },
  otherLabel: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: "6px",
  },
  otherTextarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "13px",
    resize: "vertical",
  },

  // Shade Modal
  shadeGrid: {
    marginBottom: "12px",
  },
  shadeHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 1.5fr 0.8fr 40px",
    gap: "8px",
    padding: "8px 0",
    fontSize: "12px",
    fontWeight: 600,
    color: "#64748b",
    borderBottom: "1px solid #edf2f7",
  },
  shadeRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1.5fr 0.8fr 40px",
    gap: "8px",
    marginBottom: "8px",
  },

  shadeInput: {
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    fontSize: "13px",
  },
  comboInput: {
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    fontSize: "13px",
  },
  removeButton: {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#ef4444",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  shadeActions: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },
  addRowButton: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "1px solid #6366f1",
    background: "#ffffff",
    color: "#6366f1",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  clearAllButton: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },

  // Submitter Modal
  submitterField: {
    marginBottom: "16px",
  },
  submitterLabel: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: "6px",
  },
  submitterSelect: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    marginBottom: "8px",
  },
  submitterInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
  },

  // Size Picker Modal specific
  tabBtn: {
    padding: "8px 16px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  tabBtnActive: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white",
    border: "none",
  },
  counterBadge: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#0f172a",
    background: "#f1f5f9",
    padding: "4px 10px",
    borderRadius: "20px",
  },
  ghostButton: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#475569",
    fontSize: "12px",
    cursor: "pointer",
  },
  checkCard: {
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  checkCardChecked: {
    borderColor: "#6366f1",
    background: "#eef2ff",
  },
  stepBtn: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#475569",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stepInput: {
    width: "40px",
    textAlign: "center",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "4px",
    fontSize: "13px",
    fontWeight: 600,
  },
};

// Global styles
const globalStyles = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
    background: #f8fafc;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  
  button:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const styleElement = document.createElement("style");
styleElement.innerHTML = globalStyles;
document.head.appendChild(styleElement);

export default JobOrderForm;