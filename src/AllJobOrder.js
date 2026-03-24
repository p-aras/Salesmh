import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/** ====== set these ====== */
const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const SHEET_ID = "1fKSwGBIpzWEFk566WRQ4bzQ0anJlmasoY8TwrTLQHXI";
const TAB_NAME = "JobOrder";
// Add these tracking configuration variables
const TRACKING_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzV1WU0QyYN1brvsX1GNttlehah1eQMsgpnBshjRXpf7GxW2KfFJyYNqPGJiclE0NRX/exec"; // Replace with your deployed Apps Script Web App URL
const TRACKING_SHEET_ID = "1jTju43L6-M1_f-zl67IMsI-sj7RMiLXOXN6z0vzSyck"; // Your tracking sheet ID
const TRACKING_TAB_NAME = "PDF_Log"; // Tab name for tracking

/** ====== fetching limits ====== */
const INITIAL_LIMIT = 2000;   // first load
const LOAD_MORE_CHUNK = 1000; // "Load more" chunk size

/** ====== sheet columns ====== */
/** ====== sheet columns ====== */
/** ====== sheet columns ====== */
const HEADERS = [
  "Job Order No","Date","Fabric","Brand","Shade","Size","Quantity","Unit",
  "Party Name","Garment Type","Section","Season","Emb","Emb Details",
  "Printing","Printing Details","Pattern","Style","Remarks","Direct Stitching",
  "Submitted By","Image URL","Lot Number","Component","Priority",
  "Tape/Lace", "Bottom Type", "Zip", "Sticker"  // <-- ADDED STICKER
];
// Function to log PDF generation to Google Sheets
const logPdfGeneration = async (row, pdfType, status = "Generated", notes = "") => {
  try {
    const jobOrderNo = row?.["Job Order No"] || "";
    const lotNumber = row?.["Lot Number"] || "";
    const generatedBy = "JobOrders Component";
    const fileName = `JobOrder_${jobOrderNo}_${new Date().toISOString().slice(0,10)}.pdf`;
    
    let ipAddress = "";
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      ipAddress = ipData.ip;
    } catch (e) {
      console.log("Could not fetch IP:", e);
    }
    
    const sessionId = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
    
    const trackingData = {
      trackingSheetId: TRACKING_SHEET_ID,
      tabName: TRACKING_TAB_NAME,
      jobOrderNo: jobOrderNo,
      lotNumber: lotNumber,
      generatedBy: generatedBy,
      fileName: fileName,
      ipAddress: ipAddress,
      sessionId: sessionId,
      status: status,
      pdfType: pdfType,
      notes: notes,
      updateMainSheet: true,
      mainSheetId: SHEET_ID,
      mainTabName: TAB_NAME
    };
    
    await fetch(TRACKING_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trackingData)
    });
    
    console.log(`PDF generation logged for ${pdfType}: ${jobOrderNo}`);
  } catch (error) {
    console.error("Failed to log PDF generation:", error);
  }
};
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
function drawStar(doc, x, y, size = 12) {
  const spikeCount = 5;
  const outerRadius = size;
  const innerRadius = size / 2;
  const rotation = Math.PI / 2 * 3;
  
  // Create points for the star
  const points = [];
  for (let i = 0; i < spikeCount; i++) {
    // Outer point
    points.push([
      x + Math.cos(rotation + i * 2 * Math.PI / spikeCount) * outerRadius,
      y + Math.sin(rotation + i * 2 * Math.PI / spikeCount) * outerRadius
    ]);
    
    // Inner point
    points.push([
      x + Math.cos(rotation + (i + 0.5) * 2 * Math.PI / spikeCount) * innerRadius,
      y + Math.sin(rotation + (i + 0.5) * 2 * Math.PI / spikeCount) * innerRadius
    ]);
  }
  
  // Set drawing properties
  doc.setFillColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  
  // Create a polygon path - use lowercase 'f' for fill
  doc.setLineJoin('miter');
  doc.setLineCap('butt');
  
  // Start the path at the first point
  doc.moveTo(points[0][0], points[0][1]);
  
  // Draw lines to all other points
  for (let i = 1; i < points.length; i++) {
    doc.lineTo(points[i][0], points[i][1]);
  }
  
  // Close the path back to the start
  doc.lineTo(points[0][0], points[0][1]);
  
  // Fill and stroke the path
  doc.fill();    // Fill the shape
  doc.stroke();  // Draw the outline
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
  const [pdfLandscapeBusy, setPdfLandscapeBusy] = useState(null);

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
const [fSticker, setFSticker] = useState(""); // Add this line

const [generatedLots, setGeneratedLots] = useState(new Set()); // Track which lots have PDFs generated
const [loadingGeneratedLots, setLoadingGeneratedLots] = useState(false);


  const [preview, setPreview] = useState({ open: false, src: "", alt: "" });
const VISIBLE_HEADERS = [
  "Job Order No","Date","Party Name","Fabric","Shade","Quantity","Unit","Lot Number",
  "Priority", "Sticker"  // <-- ADDED STICKER (if you want it visible in main table)
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

const range = `${encodeURIComponent(TAB_NAME)}!A1:AQ${upto}`;
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
// Add this new function to fetch already generated lots from PDF_log
// Add this new function to fetch successfully generated lots from PDF_log
// Fetch only Lot Numbers from the tracking sheet
// Fetch only Lot Numbers from the tracking sheet
// Fetch successfully generated lots from the tracking sheet
const fetchGeneratedLots = async () => {
  try {
    setLoadingGeneratedLots(true);
    
    // Fetch all data from the tracking sheet
    const range = `${encodeURIComponent(TRACKING_TAB_NAME)}!A:Z`; // Fetch up to column Z
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${TRACKING_SHEET_ID}/values/${range}?key=${API_KEY}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    const values = data.values || [];
    
    if (values.length === 0) {
      console.log("No data found in tracking sheet");
      setGeneratedLots(new Set());
      return;
    }
    
    console.log("Tracking sheet headers:", values[0]);
    
    // Find the column indices
    const headers = values[0] || [];
    let lotNumberColIndex = -1;
    let statusColIndex = -1;
    let jobOrderColIndex = -1;
    
    // Map headers to find correct columns
    headers.forEach((header, index) => {
      const headerLower = (header || "").toString().toLowerCase().trim();
      
      // Look for Lot Number column
      if (headerLower.includes("lot") && headerLower.includes("number")) {
        lotNumberColIndex = index;
        console.log(`Found Lot Number column at index ${index}: "${header}"`);
      } else if (headerLower === "lot" || headerLower === "lot no" || headerLower === "lot #") {
        lotNumberColIndex = index;
        console.log(`Found Lot Number column at index ${index}: "${header}"`);
      }
      
      // Look for Status column
      if (headerLower.includes("status")) {
        statusColIndex = index;
        console.log(`Found Status column at index ${index}: "${header}"`);
      }
      
      // Look for Job Order column (optional, for debugging)
      if (headerLower.includes("job") || headerLower.includes("order")) {
        jobOrderColIndex = index;
      }
    });
    
    // If Lot Number column not found by header, try common positions
    if (lotNumberColIndex === -1) {
      console.warn("Lot Number column not found in headers, trying common positions");
      // Try common positions (A=0, B=1, C=2, D=3) - usually Lot Number is in column C (index 2)
      const possibleIndices = [2, 1, 3, 0]; // C, B, D, A in order of likelihood
      
      for (const idx of possibleIndices) {
        if (idx < headers.length) {
          lotNumberColIndex = idx;
          console.log(`Using column ${String.fromCharCode(65 + idx)} as Lot Number column (header: "${headers[idx] || 'empty'}")`);
          break;
        }
      }
    }
    
    // If still not found, default to column C (index 2)
    if (lotNumberColIndex === -1) {
      console.warn("Could not determine Lot Number column, defaulting to column C (index 2)");
      lotNumberColIndex = 2;
    }
    
    // Collect all lot numbers with successful status
    const lots = new Set();
    let successCount = 0;
    let totalRows = 0;
    let failedCount = 0;
    let startedCount = 0;
    
    // Start from index 1 to skip header row
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row || row.length === 0) continue;
      
      totalRows++;
      
      // Get lot number if available
      if (row.length > lotNumberColIndex) {
        const lot = row[lotNumberColIndex]?.toString().trim();
        
        if (lot) {
          // Check status if status column exists
          let includeLot = false;
          
          if (statusColIndex !== -1 && row.length > statusColIndex) {
            const status = row[statusColIndex]?.toString().toLowerCase().trim() || "";
            
            // Only include if status is successful (not "Failed" or "Started")
            if (status === "generated" || status === "success" || status === "completed" || status === "done") {
              includeLot = true;
              successCount++;
            } else if (status === "failed") {
              failedCount++;
            } else if (status === "started") {
              startedCount++;
            } else if (status) {
              // Unknown status - include it to be safe
              includeLot = true;
              console.log(`Unknown status "${status}" for lot ${lot} - including it`);
            }
          } else {
            // If no status column, include all lots that appear
            includeLot = true;
          }
          
          if (includeLot) {
            lots.add(lot);
          }
        }
      }
    }
    
    setGeneratedLots(lots);
    console.log(`=== Tracking Summary ===`);
    console.log(`Total rows in tracking sheet: ${totalRows}`);
    console.log(`Lots with successful PDFs: ${lots.size}`);
    console.log(`Success count: ${successCount}, Failed: ${failedCount}, Started: ${startedCount}`);
    console.log(`Sample of tracked lots:`, Array.from(lots).slice(0, 10));
    
  } catch (error) {
    console.error("Failed to fetch generated lots:", error);
    setGeneratedLots(new Set()); // Reset on error
  } finally {
    setLoadingGeneratedLots(false);
  }
};
useEffect(() => {
  const c = new AbortController();
  fetchData({ isRefresh: false, signal: c.signal });
  fetchGeneratedLots(); // Fetch generated lots on component mount
  return () => c.abort();
}, [rowLimit]);
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
const stickerOpts = useMemo(() => uniqueOptions("Sticker"), [rows]); // Add this line

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
const matchesSticker = !fSticker || (row["Sticker"] ?? "") === fSticker; // Add this line


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
  matchesZip &&
  matchesSticker && // Add this line
  matchesPriority
);
  });
}, [
rows, q,
  fFabric, fBrand, fShade, fParty, fSeason, fSection, fUnit, fDS, fLot,
  fPattern, fSubmittedBy, fPriority,
  fTapeLace, fBottomType, fZip, fSticker,  // Add fSticker here
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
  setFTapeLace(""); setFBottomType(""); setFZip(""); setFSticker(""); // Add setFSticker here
  setQ(""); setPage(1);
  setJoStart(""); setJoEnd("");
  setLotStart(""); setLotEnd("");
};
const exportLandscapePages = async () => {
  if (pdfLandscapeBusy) return;
  setPdfLandscapeBusy(true);

  try {
    await pause(0);
    
    // Load jsPDF - using your existing method
    const jsPDFConstructor = await loadJsPDF();

    // Create main document
    const doc = new jsPDFConstructor({
      orientation: "landscape",
      unit: "pt",
      format: "a3",
      compress: true,
    });

    // ====== LANDSCAPE PRODUCTION TABLE PAGE FUNCTION ======
  const renderLandscapeTablePage = async (doc, row, isFirstPage = false) => {
      // For first row, use existing page. For subsequent rows, create new page
      if (!isFirstPage) {
        try {
          if (typeof doc.addPage === 'function') {
            doc.addPage("a4", "landscape");
          }
        } catch (error) {
          console.warn("Could not add page:", error);
        }
      }
      
      const LANDSCAPE_W = doc.internal.pageSize.getWidth();
      const LANDSCAPE_H = doc.internal.pageSize.getHeight();
      
      // ====== SHADES INFORMATION ======
      const parseShadesForTable = (value) => {
        return String(value || "")
          .split(/[,;|/]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      };
      
      const shades = parseShadesForTable(row["Shade"] || "");
      
      // Parse sizes for column headers
      const parseSizes = (sizeText) => {
        if (!sizeText || sizeText === "—") return [];
        const sizes = String(sizeText).split(/[,;|/]+/).map(s => s.trim()).filter(Boolean);
        return sizes;
      };
      
      const sizes = parseSizes(row["Size"] || "");
      
      // Calculate table dimensions - REDUCED MARGINS
      const M = 25; // Reduced from 42 to 25 to give more space
      const tableX = M;
      const tableWidth = LANDSCAPE_W - 2 * M;
      const tableMaxHeight = LANDSCAPE_H - 100 - 90;
      
      const ROW_HEIGHT = 36;
      const HEADER_HEIGHT = ROW_HEIGHT * 1.1;
      
      const maxRowsPerPage = Math.floor(tableMaxHeight / ROW_HEIGHT) - 1;
      const colorsPerPage = Math.min(7, maxRowsPerPage - 1);
      
      const shadeBatches = [];
      for (let i = 0; i < shades.length; i += colorsPerPage) {
        shadeBatches.push(shades.slice(i, i + colorsPerPage));
      }
      
      if (shadeBatches.length === 0) {
        shadeBatches.push([]);
      }
      
      const C = {
        black: [0, 0, 0],
        white: [255, 255, 255],
      };
      
      const setFont = (weight, size) => {
        doc.setFont("Helvetica", weight);
        doc.setFontSize(size);
        doc.setTextColor(...C.black);
      };
      
      const val = (k) => (row?.[k] ?? "").toString().trim() || "—";
      const joNum = val("Job Order No");
      
      // Helper function to format date
    // Helper function to format date as "9 Dec 2026"
const formatJobDate = (dateValue) => {
  if (!dateValue) return "—";
  
  // Try to parse different date formats
  let date;
  
  // Try parsing as "9/27/202" format (month/day/year)
  if (typeof dateValue === 'string') {
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      
      // Handle 3-digit year (like 202 for 2020, 226 for 2026)
      if (year < 1000) {
        // Assuming 2000s for years like 202, 226
        year = 2000 + year;
      }
      
      // Return formatted as "27 Sep 2022"
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[month - 1] || '';
        return `${day} ${monthName} ${year}`;
      }
    }
  }
  
  // Fallback to original value
  return String(dateValue);
};

// OR update the existing vDate function to accept row parameter:
const vDate = (k, rowData) => {
  const value = rowData?.[k];
  if (!value) return "—";
  
  // Try to parse different date formats
  let date;
  
  // Try parsing as "9/27/202" format (month/day/year)
  if (typeof value === 'string') {
    const parts = value.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      
      // Handle 3-digit year
      if (year < 1000) {
        year = 2000 + year;
      }
      
      // Return formatted as "27 Sep 2022"
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[month - 1] || '';
        return `${day} ${monthName} ${year}`;
      }
    }
  }
  
  // Fallback: try the existing method
  const iso = tryParseDateToISO(value);
  if (!iso) return value;
  const d = new Date(iso);
  
  // Format: "27 Dec 2026"
  const day = d.getDate(); // No leading zero
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
};
      
      // Helper function to shorten text
      const shortenText = (text, maxLength) => {
        if (!text || text === "—") return "—";
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + "...";
      };
      

const drawPageHeader = (pageNumber, totalPages) => {
  // Add top margin
  const TOP_MARGIN = 19; // Add 15pt margin from top
  
  // Set white background for header area - extend height by TOP_MARGIN
  doc.setFillColor(...C.white);
  doc.rect(0, 0, LANDSCAPE_W, 85 + TOP_MARGIN, "F");
  
  const quantity = val("Quantity");
  const unit = val("Unit") || "sets";
  const lotNumber = val("Lot Number");
  
  // LEFT SIDE: Basic Info + Style - Add TOP_MARGIN to all Y positions
  let leftY = 22 + TOP_MARGIN;
  
  setFont("bold", 10);
  doc.text(`JOB: ${joNum} | ${vDate("Date", row)}`, M, leftY);
  leftY += 14;
  
  // STYLE on left side
  const style = val("Style");
  setFont("normal", 10);
  doc.text(`STYLE: ${style}`, M, leftY);
  leftY += 14;
  
  if (quantity) {
    setFont("bold", 10);
    doc.text(`QTY: ${quantity} ${unit}`, M, leftY);
    leftY += 14;
  }
  const season = val("Season");
if (season && season !== "—") {
  setFont("normal", 9);
  doc.text(`SEASON: ${season}`, M, leftY);
  leftY += 12;
}
   const section = val("Section");
  if (section && section !== "—") {
    setFont("normal", 9);
    doc.text(`SECTION: ${section}`, M, leftY);
    leftY += 12;
  }
  
  // RIGHT SIDE: Brand + NEW FIELDS (Tape/Lace, Zip, Bottom Type) - Add TOP_MARGIN
  let rightY = 22 + TOP_MARGIN;
  
  setFont("bold", 10);
  const brand = val("Brand");
  doc.text(`BRAND: ${brand}`, LANDSCAPE_W - M, rightY, { align: "right" });
  rightY += 14;
  
  // NEW FIELDS: Tape/Lace, Zip, Bottom Type
  const tapeLace = val("Tape/Lace") || val("Tape Lace") || val("Tape") || val("Lace") || "—";
  const zip = val("Zip") || val("Zipper") || "—";
  const bottomType = val("Bottom Type") || val("Bottom") || "—";
  
  // Add Tape/Lace if available
  if (tapeLace && tapeLace !== "—") {
    setFont("normal", 9);
    doc.text(`Tape/Lace: ${shortenText(tapeLace, 20)}`, LANDSCAPE_W - M, rightY, { align: "right" });
    rightY += 12;
  }
  
  // Add Zip if available
  if (zip && zip !== "—") {
    setFont("normal", 9);
    doc.text(`Zip: ${shortenText(zip, 20)}`, LANDSCAPE_W - M, rightY, { align: "right" });
    rightY += 12;
  }
  
  // Add Bottom Type if available
  if (bottomType && bottomType !== "—") {
    setFont("normal", 9);
    doc.text(`Bottom: ${shortenText(bottomType, 20)}`, LANDSCAPE_W - M, rightY, { align: "right" });
    rightY += 12;
  }
  
  // Pattern | Garment Type on right side
  setFont("normal", 9);
  const pattern = val("Pattern");
  const garmentType = val("Garment Type");
  const patternGarment = `${pattern} | ${garmentType}`;
  if (patternGarment !== "— | —") {
    doc.text(patternGarment, LANDSCAPE_W - M, rightY, { align: "right" });
  }
  
  // CENTER: Main Heading with LOT NUMBER - Add TOP_MARGIN
  let centerY = 22 + TOP_MARGIN;
  
  setFont("bold", 16);
  doc.text("CUTTING TABLE ______", LANDSCAPE_W / 2, centerY, { align: "center" });
  centerY += 16;
  
  // LOT NUMBER in center
  setFont("bold", 14);
  doc.text(`LOT NUMBER: ${lotNumber}`, LANDSCAPE_W / 2, centerY, { align: "center" });
  centerY += 16;
  
  // Fabric information
  setFont("bold", 10);
  const fabric = val("Fabric");
  doc.text(`Fabric: ${fabric}`, LANDSCAPE_W / 2, centerY, { align: "center" });
  centerY += 14;
  
  // REMARKS
  setFont("normal", 9);
  const remarksText = row?.["Remarks"] ? String(row["Remarks"]).trim() : "";
  if (remarksText && remarksText !== "") {
    const maxRemarksLength = 80;
    const displayRemarks = remarksText.length > maxRemarksLength 
      ? remarksText.substring(0, maxRemarksLength - 3) + "..." 
      : remarksText;
    
    doc.text(`Remarks: ${displayRemarks}`, LANDSCAPE_W / 2, centerY, { align: "center" });
    centerY += 14;
  }
  
  // Calculate header height - Add TOP_MARGIN to base
  let headerHeight = 75 + TOP_MARGIN; // Add TOP_MARGIN
  
  // Adjust header height for content
  if (remarksText && remarksText !== "") headerHeight += 14;
  
  // Separator line under header - PROPER GAP
  const separatorY = headerHeight + 5;
  doc.setDrawColor(...C.black);
  doc.setLineWidth(0.5);
  doc.line(M, separatorY, LANDSCAPE_W - M, separatorY);
  
  return separatorY + 10; // Good space between header and table
};

const drawStickerBox = (startY, pageNumber) => {
  const boxWidth = 140;
  const boxHeight = 80;
  const boxX = LANDSCAPE_W - boxWidth - M; // RIGHT side
  const boxY = startY;
  
  // NORMAL STICKER BOX (your original design)
  doc.setDrawColor(...C.black);
  doc.setLineWidth(1.5);
  doc.rect(boxX, boxY, boxWidth, boxHeight);
  
  doc.setFillColor(255, 255, 255);
  doc.rect(boxX, boxY, boxWidth, boxHeight, "F");
  
  let contentY = boxY + 12;
  
  setFont("bold", 12);
  doc.text("PARTA CHECKED", boxX + boxWidth / 2, contentY, { align: "center" });
  contentY += 18;
  
  // DATE section
  setFont("bold", 10);
  doc.text("DATE :", boxX + 15, contentY);
  
  const dateLineY = contentY + 4;
  doc.setDrawColor(...C.black);
  doc.setLineWidth(0.8);
  doc.line(boxX + 50, dateLineY, boxX + boxWidth - 15, dateLineY);
  contentY += 16;
  
  setFont("bold", 11);
  doc.text("Cutting Head Sign", boxX + boxWidth / 2, contentY, { align: "center" });
  
  // SIMPLE SIGNATURE ON LEFT SIDE (no box, just text and line)
const signatureBottomY = LANDSCAPE_H - 60; // Position at bottom of page
setFont("bold", 12);
doc.text("SIGNATURE", M + 70, signatureBottomY, { align: "center" });

// Signature line
const signatureLineY = signatureBottomY + 20;
doc.setDrawColor(...C.black);
doc.setLineWidth(0.8);
doc.line(M + 10, signatureLineY, M + 130, signatureLineY);
  
  return boxY + boxHeight;
};
      
      // Function to draw a table page
      const drawTablePage = (shadeBatch, pageIndex, totalPages, startSrNo) => {
        const tableStartY = drawPageHeader(pageIndex + 1, totalPages);
        let y = tableStartY;
        
        const tableData = [];
        const rowsNeeded = Math.max(colorsPerPage, shadeBatch.length);
        
        // Get Fabric Lot No and Rib Lot No values from the row
        const fabricLotNo = val("Fabric Lot No") || val("Fabric Lot") || "—";
        const ribLotNo = val("Rib Lot No") || val("Rib Lot") || "—";
        
        for (let i = 0; i < rowsNeeded; i++) {
          const srNo = startSrNo + i;
          const rowData = { 
            sr_no: srNo.toString(),
            shade: i < shadeBatch.length ? shadeBatch[i] : "",
            fabric_lot_no: i === 0 ? fabricLotNo : "", // Only show in first row
            rib_lot_no: i === 0 ? ribLotNo : "", // Only show in first row
            rolls: "",
            kgs: ""
          };
          
          if (sizes.length > 0) {
            sizes.forEach(size => {
              rowData[`size_${size}`] = "";
            });
          }
          
          rowData.total_pcs = "";
          rowData.kapda_layer_weight = "";
          rowData.layer_piece = "";
          rowData.layer_inch = "";
          rowData.daya = "";
          rowData.cutting_weight = "";
          rowData.kapda_vapsi = "";
          
          tableData.push(rowData);
        }
        
        if (pageIndex === totalPages - 1) {
          const totalRow = {
            sr_no: "TOTAL",
            shade: "",
            fabric_lot_no: "",
            rib_lot_no: "",
            rolls: "",
            kgs: "",
            total_pcs: "",
            kapda_layer_weight: "",
            layer_piece: "",
            layer_inch: "",
            daya: "",
            cutting_weight: "",
            kapda_vapsi: "",
            isTotalRow: true
          };
          
          sizes.forEach(size => {
            totalRow[`size_${size}`] = "";
          });
          
          tableData.push(totalRow);
        }
        
        const generateTableHeaders = () => {
          const headers = [
            { label: "SR", key: "sr_no", width: 0.5 },
            { label: "SHADE", key: "shade", width: 1.5 },
            { label: "FABRIC\nLOT NO", key: "fabric_lot_no", width: 0.9 }, // New column
            { label: "RIB\nLOT NO", key: "rib_lot_no", width: 0.9 }, // New column
            { label: "ROLLS", key: "rolls", width: 0.7 },
            { label: "KGS", key: "kgs", width: 0.7 },
          ];
          
          sizes.forEach(size => {
            headers.push({ 
              label: size, 
              key: `size_${size}`, 
              width: 0.6
            });
          });
          
          headers.push(
            { label: "TOTAL\nPCS", key: "total_pcs", width: 0.7 },
            { label: "KAPDA\nLAYER WT", key: "kapda_layer_weight", width: 0.9 },
            { label: "LAYER\nPCS", key: "layer_piece", width: 0.7 },
            { label: "LAYER\nINCH", key: "layer_inch", width: 0.7 },
            { label: "DIA", key: "daya", width: 0.6 },
            { label: "CUTTING\nWEIGHT", key: "cutting_weight", width: 0.8 },
            { label: "KAPDA\nVAPSI", key: "kapda_vapsi", width: 0.7 }
          );
          
          return headers;
        };
        
        const tableHeaders = generateTableHeaders();
        
        // Draw table header
        const drawTableHeader = () => {
          doc.setFillColor(...C.white);
          doc.rect(tableX, y, tableWidth, HEADER_HEIGHT, "F");
          
          let currentX = tableX;
          const totalRatio = tableHeaders.reduce((sum, h) => sum + (h.width || 1), 0);
          
          tableHeaders.forEach((h, i) => {
            const colWidth = (h.width / totalRatio) * tableWidth;
            
            doc.setDrawColor(...C.black);
            doc.setLineWidth(0.5);
            doc.rect(currentX, y, colWidth, HEADER_HEIGHT);
            
            setFont("bold", 7); // Slightly reduced font size to fit more columns
            
            if (h.label.length <= 3 && /^[A-Z0-9]+$/.test(h.label) && !h.label.includes('\n')) {
              doc.text(h.label, currentX + colWidth / 2, y + HEADER_HEIGHT / 2 - 4, { align: "center" });
              
              doc.setDrawColor(...C.black);
              doc.setLineWidth(0.3);
              doc.line(currentX + 2, y + HEADER_HEIGHT / 2, 
                      currentX + colWidth - 2, y + HEADER_HEIGHT / 2);
            } else {
              const lines = h.label.split('\n');
              const lineHeight = 7;
              const startY = y + (HEADER_HEIGHT - (lines.length * lineHeight)) / 2 + 5;
              
              lines.forEach((line, lineIdx) => {
                doc.text(line, currentX + colWidth / 2, startY + (lineIdx * lineHeight), { align: "center" });
              });
            }
            
            currentX += colWidth;
          });
          
          doc.setDrawColor(...C.black);
          doc.setLineWidth(1.5);
          doc.line(tableX, y + HEADER_HEIGHT, tableX + tableWidth, y + HEADER_HEIGHT);
          
          return HEADER_HEIGHT;
        };
        
        // Draw table rows
        const drawTableRows = (headerHeight) => {
          const totalRatio = tableHeaders.reduce((sum, h) => sum + (h.width || 1), 0);
          const tableStartRowY = y + headerHeight;
          
          for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
            const rowData = tableData[rowIndex];
            const rowY = tableStartRowY + (rowIndex * ROW_HEIGHT);
            
            if (rowIndex % 2 === 0) {
              doc.setFillColor(...C.white);
            } else {
              doc.setFillColor(245, 245, 245);
            }
            doc.rect(tableX, rowY, tableWidth, ROW_HEIGHT, "F");
            
            if (rowData.isTotalRow) {
              doc.setDrawColor(...C.black);
              doc.setLineWidth(1.5);
              doc.line(tableX, rowY, tableX + tableWidth, rowY);
            }
            
            let currentX = tableX;
            
            tableHeaders.forEach((h, i) => {
              const colWidth = (h.width / totalRatio) * tableWidth;
              
              doc.setDrawColor(...C.black);
              doc.setLineWidth(0.3);
              doc.rect(currentX, rowY, colWidth, ROW_HEIGHT);
              
              const cellValue = rowData[h.key] || "";
              
              if (rowData.isTotalRow) {
                setFont("bold", 8);
              } else {
                setFont("normal", 8);
              }
              
              if (h.key === "shade" || h.key === "fabric_lot_no" || h.key === "rib_lot_no") {
                const textValue = String(cellValue);
                const maxWidth = colWidth - 6;
                const lines = doc.splitTextToSize(textValue, maxWidth);
                const lineHeight = 7;
                const totalTextHeight = lines.length * lineHeight;
                const startY = rowY + (ROW_HEIGHT - totalTextHeight) / 2 + 4;
                
                lines.forEach((line, lineIdx) => {
                  doc.text(line, currentX + colWidth / 2, startY + (lineIdx * lineHeight), { align: "center" });
                });
              } else {
                doc.text(String(cellValue), currentX + colWidth / 2, rowY + ROW_HEIGHT / 2 + 2, { align: "center" });
              }
              
              currentX += colWidth;
            });
          }
          
          return tableStartRowY + (tableData.length * ROW_HEIGHT);
        };
        
        const headerHeight = drawTableHeader();
        const tableBottom = drawTableRows(headerHeight);
        
        const totalTableHeight = headerHeight + (tableData.length * ROW_HEIGHT);
        doc.setDrawColor(...C.black);
        doc.setLineWidth(1);
        doc.rect(tableX, y, tableWidth, totalTableHeight, "S");
        
        y = tableBottom + 20;
        
        const stickerBottom = drawStickerBox(y, pageIndex + 1);
        y = stickerBottom + 20;
        
        setFont("normal", 8);
        const now = new Date().toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric"
        });
        doc.text(`Printed: ${now}`, LANDSCAPE_W / 2, LANDSCAPE_H - 10, { align: "center" });
        doc.text(`JOB: ${joNum}`, LANDSCAPE_W - M, LANDSCAPE_H - 10, { align: "right" });
        
        return startSrNo + rowsNeeded;
      };
      
      let currentSrNo = 1;
      
      // Draw all shade batches for this row
      for (let index = 0; index < shadeBatches.length; index++) {
        // Add new page for subsequent batches within the same row
        if (index > 0) {
          if (typeof doc.addPage === 'function') {
            try {
              doc.addPage("a4", "landscape");
            } catch (error) {
              console.warn("Could not add page for batch:", error);
            }
          }
        }
        
        currentSrNo = drawTablePage(
          shadeBatches[index], 
          index, 
          shadeBatches.length, 
          currentSrNo
        );
      }
    };

    // Filter rows based on range filters
    const toExport = sorted.filter(r =>
      inRange(r["Job Order No"], joStart, joEnd) &&
      inRange(r["Lot Number"], lotStart, lotEnd)
    );

    let wroteAny = false;
    let skipped = 0;

    // Loop through filtered rows and create landscape pages
    for (let i = 0; i < toExport.length; i++) {
      const row = toExport[i];
      const hasLot = Boolean((row["Lot Number"] ?? "").toString().trim());
      if (!hasLot) { skipped++; continue; }

      await renderLandscapeTablePage(doc, row, !wroteAny);
      wroteAny = true;

      if (i % 2 === 0) await pause(0);
    }

    if (!wroteAny) {
      alert("No eligible rows to export (all filtered rows are missing Lot Number).");
      return;
    }

    // Save the document
    const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
    const ts = new Date().toISOString().slice(0, 10);
    const fname = `CuttingTable_Pages_${ts}.pdf`;

    try {
      doc.save(safe(fname));
    } catch (error) {
      console.error("Error saving PDF:", error);
      alert(`Error saving PDF: ${error.message}`);
    }

    if (skipped > 0) {
      console.info(`Skipped ${skipped} row(s) without Lot Number`);
    }
  } catch (e) {
    console.error(e);
    alert(`Could not create landscape PDF: ${e.message}`);
  } finally {
    setPdfLandscapeBusy(false);
  }
};
const generatePdf = async (row) => {
  const lot = (row?.["Lot Number"] ?? "").toString().trim();
  if (!lot) {
    alert("Please enter a Lot Number first (this row has none).");
    return;
  }

  const joNum = (row?.["Job Order No"] ?? "").toString().trim() || "Unknown";
  
  // ADD THIS CHECK - Prevent generation if lot already has successful PDF
  if (generatedLots.has(lot)) {
    alert(`PDF has already been successfully generated for Lot Number: ${lot}. Further generation is blocked.`);
    return;
  }
  
  if (pdfBusyId) return;
  setPdfBusyId(joNum);

  try {
    await logPdfGeneration(row, "single", "Started", "PDF generation started");
    
    await pause(0);

    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a3",
      compress: true,
      putOnlyUsedFonts: true,
    });

    // ====== DESIGN TOKENS ======
    const M = 42; // Margin
    const FOOTER_H = 44;
    const GRID_ROW_GAP = 18;
    const GRID_COL_GAP = 20;
    const IMG_MAX = 900;
    const IMG_TIMEOUT_MS = 4000;

    // ====== COLORS: PURE BLACK & WHITE ONLY ======
    const C = {
      black: [0, 0, 0],       // ALL text in black
      white: [255, 255, 255], // ALL backgrounds white
    };

    const F = { 
      h1: 30, 
      h2: 24, 
      h3: 20, 
      body: 13, 
      label: 11.5, 
      meta: 10.5, 
      small: 8.5,
      xsmall: 8.5 
    };

    // Helper functions
    const setFont = (weight, size) => {
      doc.setFont("Arial", weight);
      doc.setFontSize(size);
      doc.setTextColor(...C.black); // Always black
    };

    const asText = (v) => (v == null || String(v).trim() === "" ? "—" : String(v).trim());
    const asBool = (v) => /^(true|yes|y|1)$/i.test(String(v || "").trim());
   // Update your existing vDate function to the new format:
const vDate = (k) => {
  const value = row?.[k];
  if (!value) return "—";
  const iso = tryParseDateToISO(value);
  if (!iso) return value;
  
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
};
    const val = (k) => asText(row?.[k]);
    
    // Parse sizes from the Size column
    const parseSizes = (sizeText) => {
      if (!sizeText || sizeText === "—") return [];
      const sizes = String(sizeText).split(/[,;|/]+/).map(s => s.trim()).filter(Boolean);
      return sizes;
    };
    
    // Parse shades from comma/separated string
    const parseShades = (shadeText) => {
      if (!shadeText || shadeText === "—") return [];
      const shades = String(shadeText).split(/[,;|/]+/).map(s => s.trim()).filter(Boolean);
      return shades;
    };

    const HIGHLIGHTS = new Set(["Lot Number", "Party Name", "Garment Type", "Priority", "Tape/Lace", "Bottom Type", "Zip"]);

    // ====== PAGE SCAFFOLDS ======
    const drawPageBorder = (PAGE) => {
      doc.setDrawColor(...C.black);
      doc.setLineWidth(0.8);
      doc.rect(12, 12, PAGE.w - 24, PAGE.h - 24);
    };

    const firstPageScaffold = () => {
      const PAGE = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
      doc.setFillColor(...C.white);
      doc.rect(0, 0, PAGE.w, PAGE.h, "F");
      drawPageBorder(PAGE);
      return PAGE;
    };

    const innerPageScaffold = () => {
      const PAGE = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
      doc.setFillColor(...C.white);
      doc.rect(0, 0, PAGE.w, PAGE.h, "F");
      drawPageBorder(PAGE);
      return PAGE;
    };

    // ====== LAYOUT HELPERS ======
    let PAGE = firstPageScaffold();
    let y = 130;
    const submittedBy = asText(row?.["Submitted By"] || "—");

    const contentW = () => PAGE.w - M * 2;

    const ensurePageRoom = async (needed, topPad = 0) => {
      const bottom = PAGE.h - FOOTER_H - 40;
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

      setFont("bold", F.h3);
      doc.text(text, PAGE.w / 2, yMid, { align: "center" });

      if (opts.rightBigText) {
        setFont("bold", 28);
        const padRight = 6;
        const yOffset = 14;
        doc.text(String(opts.rightBigText), PAGE.w - M - padRight, yMid - yOffset, { align: "right" });
      }

      doc.setDrawColor(...C.black);
      doc.setLineWidth(2);
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

      doc.setDrawColor(...C.black); 
      doc.setLineWidth(1);
      doc.setFillColor(...C.white); 
      doc.rect(x, y, w, h, "FD");

      setFont("bold", F.label);
      doc.text(label.toUpperCase(), x + padX, y + padY);

      setFont("bold", F.body);
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
        
        // White background for header
        doc.setFillColor(...C.white);
        doc.rect(x, y, tableW, headerH, "F");

        let cx = x;
        headers.forEach((h, i) => {
          const wCol = colW[i];
          doc.setDrawColor(...C.black); 
          doc.setLineWidth(1);
          doc.rect(cx, y, wCol, headerH);

          setFont("bold", headerFont);
          doc.text(h.label, cx + wCol / 2, y + headerH / 2 + 3, { align: "center" });
          cx += wCol;
        });

        doc.setDrawColor(...C.black);
        doc.setLineWidth(1.5);
        doc.line(x, y + headerH, x + tableW, y + headerH);

        y += headerH;
      };

      const tableStartY = y;
      await drawHeader();

      for (let idx = 0; idx < data.length; idx++) {
        await ensurePageRoom(rowH);
        
        // White background for all rows
        doc.setFillColor(...C.white);
        doc.rect(x, y, tableW, rowH, "F");

        let cx = x;
        headers.forEach((h, i) => {
          const wCol = colW[i];
          doc.setDrawColor(...C.black);
          doc.rect(cx, y, wCol, rowH);

          setFont("bold", bodyFont);
          const cell = (data[idx][h.key] ?? "").toString();
          doc.text(cell, cx + wCol / 2, y + rowH / 2 + 3, { align: "center" });
          cx += wCol;
        });

        y += rowH;
        if (idx % 12 === 0) await pause(0);
      }

      const tableEndY = y;
      doc.setDrawColor(...C.black);
      doc.setLineWidth(1);
      doc.rect(x, tableStartY, tableW, tableEndY - tableStartY, "S");
    };

    const tryDrawImage = async ({ url, x, w, h }) => {
      const padX = 18, padY = 16, labelH = F.label * 1.6;
      const cardH = h;

      await ensurePageRoom(cardH);

      doc.setDrawColor(...C.black); 
      doc.setLineWidth(1);
      doc.setFillColor(...C.white); 
      doc.rect(x, y, w, cardH, "FD");
      
      setFont("bold", F.label);
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
            const iw = Math.max(1, p.width * ratio);
            const ih = Math.max(1, p.height * ratio);
            const ix = x + (w - iw) / 2;
            const iy = y + padY + labelH + 10 + (fitH - ih) / 2;
            doc.addImage(dataUrl, "JPEG", ix, iy, iw, ih);
            drew = true;
          }
        }
      } catch (_) { }
      if (!drew) {
        setFont("normal", F.meta);
        doc.text("No image provided / failed to load", x + w / 2, y + cardH / 2, { align: "center" });
      }

      y = y + cardH + GRID_ROW_GAP;
      await pause(0);
    };

    // ---------- RENDERERS ----------
const renderFirstPage = async () => {
  PAGE = firstPageScaffold();
  
  // Check if Priority contains any "repeated" pattern (case-insensitive)
  const priorityText = val("Priority")?.toString() || "";
  const priorityLower = priorityText.toLowerCase();
  const isLotRepeated = priorityLower.includes("lot_repeated") || 
                       priorityLower.includes("repeated_lot") || 
                       priorityLower.includes("repeated") ||
                       priorityLower.includes("repeat");
  
  // Adjust y starting position - more dynamic calculation
  let y = isLotRepeated ? 140 : 120; // Start lower to accommodate all elements

  // Header with better spacing
  setFont("bold", 30); // Slightly larger for better hierarchy
  doc.text("JOB ORDER", PAGE.w / 2, 50, { align: "center" });
  
  // Add 5-star rating below "JOB ORDER" if Priority contains any repeated pattern
  if (isLotRepeated) {
    // Draw 5 gold stars with better spacing
    const starSize = 12;
    const starSpacing = 24;
    const totalWidth = 5 * starSpacing - starSpacing/2;
    const startX = PAGE.w / 2 - totalWidth / 2;
    
    // Draw 5 stars
    for (let i = 0; i < 5; i++) {
      drawStar(doc, startX + (i * starSpacing), 75, starSize);
    }
    
    // Add "LOT REPEATED" text below stars
    setFont("bold", 16);
    doc.text("LOT REPEATED", PAGE.w / 2, 100, { align: "center" });
    
    // "Order #" positioned below LOT REPEATED text
    setFont("bold", 14);
    doc.text(`Job Order #${joNum}`, PAGE.w / 2, 120, { align: "center" });
    
  } else {
    // Normal position when not "repeated"
    setFont("bold", 14);
    doc.text(`Job Order #${joNum}`, PAGE.w / 2, 85, { align: "center" });
  }

  // JO badge - better positioned
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.black);
  doc.setLineWidth(1);
  doc.circle(M + 25, 50, 22, "FD");
  setFont("bold", 16);
  doc.text("JO", M + 25, 57, { align: "center" });

  // Generation info - better aligned
  const genDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  setFont("normal", F.meta);
  doc.text(`Generated: ${genDate}`, PAGE.w - M, 45, { align: "right" });
  doc.text(`Submitted by: ${submittedBy}`, PAGE.w - M, 60, { align: "right" });

  // Direct Stitching chip - positioned relative to y start
  const dsEnabled = asBool(row?.["Direct Stitching"]);
  if (dsEnabled) {
    const padX = 12, hChip = 26, r = 12;
    setFont("bold", 11);
    const label = "DIRECT STITCHING";
    const wChip = doc.getTextWidth(label) + padX * 2 + 12;
    const xChip = PAGE.w - M - wChip;
    const yChip = isLotRepeated ? 135 : 115; // Position below the main header area
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.black);
    doc.setLineWidth(1);
    doc.roundedRect(xChip, yChip - hChip + 2, wChip, hChip, r, r, "FD");
    doc.text(label, xChip + padX + 10, yChip - 8);
  }

  // Draw content card function with consistent spacing - FIXED CENTERING
  const drawCard = async ({ label, value, x, w, isLastInRow = false }) => {
    const padX = 14, padY = 12, labelH = F.label * 1.3;
    const maxWidth = w - padX * 2;
    const txt = value && String(value).trim() ? String(value) : "—";
    
    // Check if this is the Priority card
    const isPriorityCard = label.toLowerCase() === "priority";
    
    // Use smaller font size for Priority card to prevent overflow
    const bodyFontSize = isPriorityCard ? F.body - 2 : F.body; // Reduce by 2 for Priority
    const lineH = (bodyFontSize - 1) * 1.2;
    
    const lines = doc.splitTextToSize(txt, maxWidth);
    const contentH = Math.max(lineH, lines.length * lineH);
    const h = padY + labelH + 6 + Math.max(lineH, contentH) + padY;

    await ensurePageRoom(h);

    // Draw curved box
    doc.setDrawColor(...C.black);
    doc.setLineWidth(1);
    doc.setFillColor(...C.white);
    doc.roundedRect(x, y, w, h, 6, 6, "FD");

    const priorityValue = isPriorityCard ? txt.toLowerCase() : "";
    const isRepeatedPriority = isPriorityCard && (
      priorityValue.includes("lot_repeated") || 
      priorityValue.includes("repeated_lot") || 
      priorityValue.includes("repeated") ||
      priorityValue.includes("repeat")
    );

    // Label - CENTERED
    setFont("bold", F.label);
    doc.text(label.toUpperCase(), x + w / 2, y + padY + labelH/2 - 2, { align: "center" });

    // Draw value with stars if needed
    if (isRepeatedPriority) {
      // Draw stars above the priority text
      const starSize = 8;
      const starSpacing = 14;
      const totalStarWidth = 5 * starSpacing - starSpacing/2;
      const startX = x + w / 2 - totalStarWidth / 2;
      const starY = y + padY + labelH + 6;
      
      // Draw 5 gold stars
      for (let i = 0; i < 5; i++) {
        drawStar(doc, startX + (i * starSpacing), starY, starSize);
      }
      
      // Draw the priority text below stars - CENTERED with automatic line breaks
      // Use smaller font for Priority
      setFont("bold", bodyFontSize);
      const textY = starY + starSize + 6;
      
      // Handle multi-line text for priority
      lines.forEach((line, i) => {
        doc.text(line, x + w / 2, textY + i * lineH, { align: "center" });
      });
    } else {
      // Normal text rendering - CENTERED with automatic line breaks
      // Use smaller font for Priority card, normal for others
      setFont(isPriorityCard ? "bold" : "normal", bodyFontSize);
      const textY = y + padY + labelH + 6 + (h - (padY + labelH + 6 + lines.length * lineH)) / 2;
      
      lines.forEach((line, i) => {
        doc.text(line, x + w / 2, textY + i * lineH, { align: "center" });
      });
    }

    const bottom = y + h;
    y = bottom;
    await pause(0);
    return bottom;
  };

  // Grid row function with better spacing
  const drawGridRow = async (items, { cols = items.length, rowGap = 16 } = {}) => {
    const totalW = contentW();
    const gapW = GRID_COL_GAP * (cols - 1);
    const cardW = (totalW - gapW) / cols;

    // Calculate heights with proper estimation
    const padX = 14, padY = 12, labelH = F.label * 1.3;
    const heights = items.map(({ value, label }) => {
      const maxWidth = cardW - padX * 2;
      const txt = (value || "—").toString();
      
      // Check if this is the Priority card for font size adjustment
      const isPriorityCard = label?.toLowerCase() === "priority";
      const bodyFontSize = isPriorityCard ? F.body - 2 : F.body;
      const lineH = (bodyFontSize - 1) * 1.2;
      
      const lines = doc.splitTextToSize(txt, maxWidth);
      
      const priorityValue = isPriorityCard ? txt.toLowerCase() : "";
      const isRepeatedPriority = isPriorityCard && (
        priorityValue.includes("lot_repeated") || 
        priorityValue.includes("repeated_lot") || 
        priorityValue.includes("repeated") ||
        priorityValue.includes("repeat")
      );
      
      const extraHeight = isRepeatedPriority ? 18 : 0;
      
      return padY + labelH + 6 + Math.max(lineH, lines.length * lineH) + padY + extraHeight;
    });
    
    const rowH = Math.max(...heights);
    await ensurePageRoom(rowH + rowGap);

    const yTop = y;
    let maxBottom = yTop;
    
    for (let i = 0; i < items.length; i++) {
      const cardX = M + i * (cardW + GRID_COL_GAP);
      const oldY = y;
      y = yTop;
      const bottom = await drawCard({ 
        ...items[i], 
        x: cardX, 
        w: cardW,
        isLastInRow: i === items.length - 1
      });
      maxBottom = Math.max(maxBottom, bottom);
      y = oldY;
    }
    
    y = maxBottom + rowGap;
  };

  // Section header with better spacing
  const sectionHeader = async (text, opts = {}) => {
    await ensurePageRoom(40);
    
    const yMid = y + 8; // Add some vertical padding

    setFont("bold", F.h3);
    doc.text(text, PAGE.w / 2, yMid, { align: "center" });

    if (opts.rightBigText) {
      setFont("bold", 26);
      const padRight = 6;
      const yOffset = 14;
      doc.text(String(opts.rightBigText), PAGE.w - M - padRight, yMid - yOffset, { align: "right" });
    }

    doc.setDrawColor(...C.black);
    doc.setLineWidth(1.5);
    doc.line(PAGE.w / 2 - 80, yMid + 12, PAGE.w / 2 + 80, yMid + 12);

    y += 28; // Consistent spacing after section header
    await pause(0);
  };

  // ====== MAIN CONTENT ======
  
  // Add some spacing before first section
  y += 10;
  
  await sectionHeader("Order Details", { rightBigText: ` ${val("Lot Number")}` });
  
  // Order Details - 5 columns
  await drawGridRow([
    { label: "Job Order No", value: joNum },
    { label: "Date", value: vDate("Date") },
    { label: "Lot Number", value: val("Lot Number") },
    { label: "Party Name", value: val("Party Name") },
    { label: "Brand", value: val("Brand") },
  ], { cols: 5, rowGap: 16 });

  await drawGridRow([
    { label: "Fabric", value: val("Fabric") },
    { label: "Garment Type", value: val("Garment Type") },
    { label: "Section", value: val("Section") },
    { label: "Quantity", value: val("Quantity") },
    { label: "Unit", value: val("Unit") },
  ], { cols: 5, rowGap: 16 });

  await drawGridRow([
    { label: "Season", value: val("Season") },
    { label: "Style", value: val("Style") },
    { label: "Pattern", value: val("Pattern") },
    { label: "Size", value: val("Size") },
    { label: "Priority", value: val("Priority") },
  ], { cols: 5, rowGap: 16 });

  await drawGridRow([
    { label: "Shade", value: val("Shade") }
  ], { cols: 1, rowGap: 20 });await sectionHeader("Special Processes");

// Get the sticker value directly from the row
const stickerValue = row?.["Sticker"] ? String(row["Sticker"]).trim() : "—";

await drawGridRow([
  { label: "Embroidery", value: val("Emb") },
  { label: "Printing", value: val("Printing") },
  { label: "Direct Stitching", value: dsEnabled ? "Yes" : asText(row?.["Direct Stitching"]) },
  { label: "Component", value: val("Component") },
  { label: "Sticker", value: stickerValue }, // Use the direct value
], { cols: 5, rowGap: 16 });

  await drawGridRow([
    { label: "Embroidery Details", value: val("Emb Details") },
    { label: "Printing Details", value: val("Printing Details") },
  ], { cols: 2, rowGap: 20 });

  await sectionHeader("Remarks & Visual Reference");
  
  // Two-column layout for Remarks and Image
  const twoColW = (contentW() - GRID_COL_GAP) / 2;
  const imageHeight = 220; // Increased for better image display

  // Draw image function
  const tryDrawImage = async ({ url, x, w, h }) => {
    const padX = 14, padY = 12, labelH = F.label * 1.3;
    const cardH = h;

    await ensurePageRoom(cardH);

    // Draw curved image box
    doc.setDrawColor(...C.black);
    doc.setLineWidth(1);
    doc.setFillColor(...C.white);
    doc.roundedRect(x, y, w, cardH, 6, 6, "FD");
    
    setFont("bold", F.label);
    doc.text("VISUAL REFERENCE", x + w / 2, y + padY + labelH/2 - 2, { align: "center" });

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
          const fitW = w - 30, fitH = cardH - (padY + labelH + 6) - 20;
          const ratio = Math.min(fitW / p.width, fitH / p.height);
          const iw = Math.max(1, p.width * ratio);
          const ih = Math.max(1, p.height * ratio);
          const ix = x + (w - iw) / 2;
          const iy = y + padY + labelH + 10 + (fitH - ih) / 2;
          doc.addImage(dataUrl, "JPEG", ix, iy, iw, ih);
          drew = true;
        }
      }
    } catch (_) { }
    if (!drew) {
      setFont("normal", F.meta);
      doc.text("No image provided / failed to load", x + w / 2, y + cardH / 2, { align: "center" });
    }

    y = y + cardH + 20;
    await pause(0);
  };

  // Draw Remarks card - CENTERED
  {
    const oldY = y;
    const remarksText = (row?.["Remarks"] ?? "").toString().trim() || "No remarks provided";
    const padX = 14, padY = 12, labelH = F.label * 1.3;
    const maxWidth = twoColW - padX * 2;
    const txt = remarksText;
    const lines = doc.splitTextToSize(txt, maxWidth);
    const lineH = (F.body - 1) * 1.2;
    const contentH = Math.max(lineH, lines.length * lineH);
    const h = padY + labelH + 6 + Math.max(lineH, contentH) + padY;

    await ensurePageRoom(h);

    // Draw curved box
    doc.setDrawColor(...C.black);
    doc.setLineWidth(1);
    doc.setFillColor(...C.white);
    doc.roundedRect(M, y, twoColW, h, 6, 6, "FD");

    // Label - CENTERED
    setFont("bold", F.label);
    doc.text("REMARKS", M + twoColW / 2, y + padY + labelH/2 - 2, { align: "center" });

    // Value - CENTERED
    setFont("normal", F.body);
    const textY = y + padY + labelH + 6 + (h - (padY + labelH + 6 + lines.length * lineH)) / 2;
    
    lines.forEach((line, i) => {
      doc.text(line, M + twoColW / 2, textY + i * lineH, { align: "center" });
    });

    y = oldY;
  }

  // Draw Image card aligned with Remarks
  await tryDrawImage({
    url: row?.["Image URL"],
    x: M + twoColW + GRID_COL_GAP, 
    w: twoColW, 
    h: imageHeight
  });

  // Final page check - add footer space if needed
  const PAGE_BOTTOM_MARGIN = 30;
  if (y < PAGE.h - PAGE_BOTTOM_MARGIN) {
    // Add some empty space at bottom
    y = PAGE.h - PAGE_BOTTOM_MARGIN;
  }
};

const renderSecondPage = async () => {
  PAGE = innerPageScaffold();
  
  // Check if we should show stars (same logic as first page)
  const priorityText = val("Priority")?.toString() || "";
  const shouldStars = priorityText.toLowerCase().includes("lot_repeated") || 
                     priorityText.toLowerCase().includes("repeated_lot") || 
                     priorityText.toLowerCase().includes("repeated") ||
                     priorityText.toLowerCase().includes("repeat");
  
  // Adjust y position based on stars
  let startY = 50;
  if (shouldStars) {
    startY = 80; // Make room for stars
  }

  setFont("bold", 24);
  const lotNum = asText(row?.["Lot Number"]);
  doc.text(
    `JOB ORDER SUMMARY ${lotNum !== "—" ? `(${lotNum})` : ""}`,
    doc.internal.pageSize.getWidth() / 2,
    startY,
    { align: "center" }
  );

  // Add stars if lot is repeated
  if (shouldStars) {
    // Draw 5 gold stars below the title
    const starSize = 12;
    const starSpacing = 24;
    const totalWidth = 5 * starSpacing - starSpacing/2;
    const startX = PAGE.w / 2 - totalWidth / 2;
    const starY = startY + 25; // Position below the title
    
    // Draw 5 stars
    for (let i = 0; i < 5; i++) {
      drawStar(doc, startX + (i * starSpacing), starY, starSize);
    }
    
    // Add "LOT REPEATED" text below stars with MORE SPACING
    setFont("bold", 16);
    doc.text("LOT REPEATED", PAGE.w / 2, starY + 30, { align: "center" }); // Increased from 20 to 30
    
    // Update y position for the rest of the content - with more spacing
    y = starY + 55; // Increased from 45 to 55 for more spacing
  } else {
    y = startY + 35;
  }

  // Order Summary Box
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

    // Outer box only - use C.black for border
    doc.setDrawColor(...C.black);
    doc.setFillColor(...C.white);
    doc.setLineWidth(1);
    doc.roundedRect(boxX, boxY, boxW, boxH, 8, 8, "FD");

    // Title
    setFont("bold", F.h3);
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

        // Label: bold
        setFont("bold", F.small);
        doc.text((p.label || "").toUpperCase(), x, drawY);

        // Value: bold
        setFont("bold", F.small);

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

  // Use C.black for the vertical line
  doc.setDrawColor(...C.black);
  doc.setLineWidth(1);
  doc.line(M + colW + colGap / 2, yTop + 6, M + colW + colGap / 2, Math.max(bottomLeft, bottomRight) - 6);

  y = Math.max(bottomLeft, bottomRight) + GRID_ROW_GAP;

  await sectionHeader("Cutting Schedule");
  const shades = parseShades(val("Shade"));
  const minRows = Math.max(6, shades.length);
  const rowCount = Math.min(10, Math.max(minRows, shades.length));

  const tableHeaders = [
    { label: "Table", key: "table", width: 1 },
    { label: "Shade", key: "shade", width: 2 },
    { label: "Quantity", key: "qty", width: 1 },
    { label: "Kharcha", key: "kharcha", width: 1 },
    { label: "Date of Cutting", key: "cut", width: 1.5 },
  ];

  const tableData = Array.from({ length: rowCount }, (_, i) => ({
    table: "",
    shade: i < shades.length ? String(shades[i]) : "",
    qty: "",
    kharcha: "Yes / No",
    cut: "",
  }));

  await drawTable(tableHeaders, tableData, { rowH: 26, headerH: 32, fontScale: 0.95 });
  y += 40;
};

    const renderThirdPage = async () => {
      PAGE = innerPageScaffold();
      y = 75;

      const shortenText = (text, maxLength) => {
        if (!text || text === "—") return "—";
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + "...";
      };

      // Header
      setFont("bold", 28);
      doc.text("MATERIAL REQUISITION PLANNING", PAGE.w / 2, 55, { align: "center" });
      
      doc.setDrawColor(...C.black);
      doc.setLineWidth(3);
      doc.line(PAGE.w / 2 - 120, 65, PAGE.w / 2 + 120, 65);
      
      y += 25;
      
      // Job info - WHITE BACKGROUND ONLY
      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.black);
      doc.setLineWidth(1);
      doc.rect(M, y - 5, contentW(), 40, "FD");
      
      setFont("bold", 14);
      doc.text(`JOB ORDER: ${joNum}`, M + 25, y + 10);
      
      setFont("bold", 14);
      doc.text(`LOT NUMBER: ${val("Lot Number")}`, M + 180, y + 10);
      
      setFont("bold", 14);
      doc.text(`PARTY: ${shortenText(val("Party Name"), 22)}`, M + 350, y + 10);
      
      setFont("bold", 14);
      doc.text(`DATE: ${vDate("Date")}`, PAGE.w - M - 25, y + 10, { align: "right" });

      y += 50;

      // Two column layout
      const colGap = 25;
      const leftColW = (contentW() - colGap) * 0.55;
      const rightColW = (contentW() - colGap) * 0.45;

      // LEFT COLUMN
      const leftX = M;
      const leftStartY = y;
      
      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.black);
      doc.setLineWidth(1);
      doc.rect(leftX, y, leftColW, 38, "FD");
      
      setFont("bold", 18);
      doc.text("MATERIAL SPECIFICATIONS", leftX + leftColW / 2, y + 24, { align: "center" });
      
      y += 48;

      const materialData = [
        { label: "FABRIC", value: val("Fabric") },
        { label: "BRAND", value: val("Brand") },
        { label: "GARMENT TYPE", value: val("Garment Type") },
        { label: "QUANTITY", value: `${val("Quantity")} ${val("Unit")}` },
        { label: "SIZE", value: val("Size") },
        { label: "STYLE", value: val("Style") },
        { label: "PATTERN", value: val("Pattern") },
        { label: "TAPE/LACE", value: val("Tape/Lace") },
        { label: "BOTTOM TYPE", value: val("Bottom Type") },
        { label: "ZIP", value: val("Zip") },
        { label: "OTHER COMPONENTS", value: val("Component") },
        { label: "SECTION", value: val("Section") },
        { label: "SEASON", value: val("Season") },
        { label: "PRIORITY", value: val("Priority") },
        { label: "SUBMITTED BY", value: val("Submitted By") },
        { label: "REMARKS", value: shortenText(row?.["Remarks"] ?? "", 50) },
      ];

      const rowHeight = 23;
      const labelWidth = 130;
      
      for (let i = 0; i < materialData.length; i++) {
        const item = materialData[i];
        
        if (item.separator) {
          doc.setDrawColor(...C.black);
          doc.setLineWidth(0.5);
          doc.line(leftX + 10, y + 8, leftX + leftColW - 10, y + 8);
          y += 15;
          continue;
        }
        
        await ensurePageRoom(rowHeight);
        
        setFont("bold", 11);
        doc.text(item.label, leftX + 15, y + 15);
        
        setFont("bold", 12);
        
        const valueText = item.value || "—";
        const maxWidth = leftColW - labelWidth - 25;
        
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

      // RIGHT COLUMN
      const rightX = M + leftColW + colGap;
      const rightStartY = leftStartY;
      let rightY = rightStartY;
      
      // Image section
      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.black);
      doc.setLineWidth(1);
      doc.rect(rightX, rightY, rightColW, 38, "FD");
      
      setFont("bold", 18);
      doc.text("VISUAL REFERENCE", rightX + rightColW / 2, rightY + 24, { align: "center" });
      
      rightY += 48;
      
      await ensurePageRoom(200);
      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.black);
      doc.setLineWidth(1.5);
      doc.rect(rightX, rightY, rightColW, 190, "FD");
      
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
            setFont("normal", 13);
            doc.text("No image available", rightX + rightColW / 2, rightY + 100, { align: "center" });
          }
        } catch {
          setFont("normal", 13);
          doc.text("Image load failed", rightX + rightColW / 2, rightY + 100, { align: "center" });
        }
      } else {
        setFont("normal", 13);
        doc.text("No image provided", rightX + rightColW / 2, rightY + 100, { align: "center" });
      }
      
      rightY += 205;
      
      // Planning status
      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.black);
      doc.setLineWidth(1);
      doc.rect(rightX, rightY, rightColW, 38, "FD");
      
      setFont("bold", 18);
      doc.text("PLANNING STATUS", rightX + rightColW / 2, rightY + 24, { align: "center" });
      
      rightY += 48;
      
      const planningItems = [
        { label: "Material Ordered" },
        { label: "Zip Received" },
        { label: "Dori Received" },
        { label: "Label Received" },
        { label: "Tag Received" },
        { label: "Washcare Received" },
      ];
      
      for (let idx = 0; idx < planningItems.length; idx++) {
        const item = planningItems[idx];
        
        doc.setDrawColor(...C.black);
        doc.setLineWidth(1.2);
        doc.rect(rightX + 20, rightY - 5, 14, 14);
        
        setFont("normal", 13);
        doc.text(item.label, rightX + 45, rightY + 3);
        
        setFont("normal", 12);
        doc.text("__ / __ / ____", rightX + rightColW - 25, rightY + 3, { align: "right" });
        
        rightY += 22;
      }
      
      const rightColumnBottom = rightY;
      y = Math.max(leftColumnBottom, rightColumnBottom);
      y += 30;

      // Material requirements table
      await ensurePageRoom(50);
      
      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.black);
      doc.setLineWidth(1);
      doc.rect(M, y, contentW(), 42, "FD");
      
      setFont("bold", 18);
      doc.text("MATERIAL REQUIREMENTS", M + contentW() / 2, y + 26, { align: "center" });
      
      y += 52;

      const requirementsHeaders = [
        { label: "MATERIAL ITEM", key: "item", width: 2 },
        { label: "DESCRIPTION", key: "description", width: 2 },
        { label: "ORDERED QTY", key: "ordered", width: 1 },
        { label: "RECEIVED QTY", key: "received", width: 1 },
        { label: "STATUS", key: "status", width: 1.5 },
      ];

      const requirementsData = [
        { item: "MAIN FABRIC", description: val("Fabric"), ordered: "", received: "", status: "" },
        { item: "ZIPPERS", description: val("Zip") || "As per design", ordered: "", received: "", status: "" },
        { item: "TAPE/LACE", description: val("Tape/Lace") || "As required", ordered: "", received: "", status: "" },
        { item: "BOTTOM MATERIAL", description: val("Bottom Type") || "As per style", ordered: "", received: "", status: "" },
        { item: "THREAD", description: "Matching thread", ordered: "", received: "", status: "" },
        { item: "LABELS", description: "Brand Labels", ordered: "", received: "", status: "" },
        { item: "Tag", description: "Tag", ordered: "", received: "", status: "" },
        { item: "PACKAGING", description: "Polybags", ordered: "", received: "", status: "" },
        { item: "OTHER COMPONENTS", description: val("Component") || "Various trims", ordered: "", received: "", status: "" },
        { item: "", description: "", ordered: "", received: "", status: "" },
      ];

      await drawTable(requirementsHeaders, requirementsData, {
        rowH: 28,
        headerH: 34,
        fontScale: 0.9
      });

      // Signature section
      await ensurePageRoom(70);
      y += 25;

      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.black);
      doc.setLineWidth(1.5);
      doc.rect(M, y, contentW(), 70, "FD");

      setFont("bold", 13);
      doc.text("PREPARED BY MATERIAL PLANNING:", M + 25, y + 22);
      
      setFont("normal", 12);
      doc.text("Signature: _______________________", M + 280, y + 22);
      doc.text("Date: ______ / ______ / ______", M + 500, y + 22);

      setFont("bold", 13);
      doc.text("APPROVED BY:", M + 25, y + 48);
      
      setFont("normal", 12);
      doc.text("Signature: _______________________", M + 280, y + 48);
      doc.text("Date: ______ / ______ / ______", M + 500, y + 48);

      y += 85;
    };

  
// ====== LANDSCAPE PRODUCTION TABLE PAGE ======
const renderLandscapeTablePage = async () => {
  // Switch to landscape A4
  doc.addPage("a4", "landscape");
  
  const LANDSCAPE_W = doc.internal.pageSize.getWidth();  // ~297mm
  const LANDSCAPE_H = doc.internal.pageSize.getHeight(); // ~210mm
  
  // Check if we should show stars
  const priorityText = val("Priority")?.toString() || "";
  const shouldStars = priorityText.toLowerCase().includes("lot_repeated") || 
                     priorityText.toLowerCase().includes("repeated_lot") || 
                     priorityText.toLowerCase().includes("repeated") ||
                     priorityText.toLowerCase().includes("repeat");
  
  // Check Direct Stitching status
  const dsEnabled = asBool(row?.["Direct Stitching"]);
  
  // ====== SHADES INFORMATION ======
  const shades = parseShades(val("Shade"));
  
  // Parse sizes for column headers
  const sizes = parseSizes(val("Size"));
  
  // Calculate table dimensions - REDUCED MARGINS
  const M = 25; // Reduced from 42 to 25 to give more space
  const tableX = M;
  const tableWidth = LANDSCAPE_W - 2 * M;
  const tableMaxHeight = LANDSCAPE_H - 100 - 90; // Reduced for header and footer
  
  // Reduced row height for A4
  const ROW_HEIGHT = 36;
  const HEADER_HEIGHT = ROW_HEIGHT * 1.1;
  
  // Fewer colors per page for A4
  const maxRowsPerPage = Math.floor(tableMaxHeight / ROW_HEIGHT) - 1;
  const colorsPerPage = Math.min(7, maxRowsPerPage - 1);
  
  // Split shades into batches
  const shadeBatches = [];
  for (let i = 0; i < shades.length; i += colorsPerPage) {
    shadeBatches.push(shades.slice(i, i + colorsPerPage));
  }
  
  // If no shades, still create one page with empty rows
  if (shadeBatches.length === 0) {
    shadeBatches.push([]);
  }
  
  // Helper function to shorten text
  const shortenText = (text, maxLength) => {
    if (!text || text === "—") return "—";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };
  
  // Function to draw page header (updated with stars and Direct Stitching)
  const drawPageHeader = (pageNumber, totalPages) => {
    // Add top margin
    const TOP_MARGIN = 15; // Add 15pt margin from top
    
    // Calculate star height adjustment
    const starAdjustment = shouldStars ? 45 : 0;
    
    // Set white background for header area - extend height by TOP_MARGIN + starAdjustment
    doc.setFillColor(...C.white);
    doc.rect(0, 0, LANDSCAPE_W, 85 + TOP_MARGIN + starAdjustment, "F");
    
    // Get quantity and unit from job order
    const quantity = val("Quantity") || "";
    const unit = val("Unit") || "sets";
    
    // LEFT SIDE: Basic Info + Style - Add TOP_MARGIN to all Y positions
    let leftY = 22 + TOP_MARGIN;
    
    setFont("bold", 10);
    doc.text(`JOB: ${joNum} | ${vDate("Date")}`, M, leftY);
    leftY += 14;
    
    // STYLE on left side
    const style = val("Style") || "—";
    setFont("normal", 10);
    doc.text(`STYLE: ${style}`, M, leftY);
    leftY += 14;
    
    if (quantity) {
      setFont("bold", 10);
      const quantityText = `QTY: ${quantity} ${unit}`;
      doc.text(quantityText, M, leftY);
      leftY += 14;
    }
    
    // SEASON field on left side
    const season = val("Season") || "—";
    if (season && season !== "—") {
      setFont("normal", 9);
      doc.text(`SEASON: ${season}`, M, leftY);
      leftY += 12;
    }
    
    // SECTION field on left side
    const section = val("Section") || "—";
    if (section && section !== "—") {
      setFont("normal", 9);
      doc.text(`SECTION: ${section}`, M, leftY);
      leftY += 12;
    }
    
    // RIGHT SIDE: Brand + NEW FIELDS (Direct Stitching, Tape/Lace, Zip, Bottom Type)
    let rightY = 22 + TOP_MARGIN;
    
    setFont("bold", 10);
    const brand = val("Brand") || "—";
    doc.text(`BRAND: ${brand}`, LANDSCAPE_W - M, rightY, { align: "right" });
    rightY += 14;
    
    // ADD DIRECT STITCHING INFO HERE
    if (dsEnabled) {
      setFont("bold", 10);
      doc.text(`DIRECT STITCHING: YES`, LANDSCAPE_W - M, rightY, { align: "right" });
      rightY += 14;
    } else {
      const dsValue = asText(row?.["Direct Stitching"]);
      if (dsValue && dsValue !== "—" && dsValue.toLowerCase() !== "no") {
        setFont("bold", 10);
        doc.text(`Direct Stitching: ${dsValue}`, LANDSCAPE_W - M, rightY, { align: "right" });
        rightY += 14;
      }
    }
    
    // NEW FIELDS: Tape/Lace, Zip, Bottom Type
    const tapeLace = val("Tape/Lace") || val("Tape Lace") || val("Tape") || val("Lace") || "—";
    const zip = val("Zip") || val("Zipper") || "—";
    const bottomType = val("Bottom Type") || val("Bottom") || "—";
    
    // Add Tape/Lace if available
    if (tapeLace && tapeLace !== "—") {
      setFont("normal", 9);
      doc.text(`Tape/Lace: ${shortenText(tapeLace, 20)}`, LANDSCAPE_W - M, rightY, { align: "right" });
      rightY += 12;
    }
    
    // Add Zip if available
    if (zip && zip !== "—") {
      setFont("normal", 9);
      doc.text(`Zip: ${shortenText(zip, 20)}`, LANDSCAPE_W - M, rightY, { align: "right" });
      rightY += 12;
    }
    
    // Add Bottom Type if available
    if (bottomType && bottomType !== "—") {
      setFont("normal", 9);
      doc.text(`Bottom: ${shortenText(bottomType, 20)}`, LANDSCAPE_W - M, rightY, { align: "right" });
      rightY += 12;
    }
    
    // Pattern | Garment Type on right side
    setFont("normal", 9);
    const pattern = val("Pattern") || "—";
    const garmentType = val("Garment Type") || "—";
    const patternGarment = `${pattern} | ${garmentType}`;
    if (patternGarment !== "— | —") {
      doc.text(patternGarment, LANDSCAPE_W - M, rightY, { align: "right" });
    }
    
    // CENTER: Main Heading with LOT NUMBER
    let centerY = 22 + TOP_MARGIN;
    
    setFont("bold", 16);
    doc.text("CUTTING TABLE ______", LANDSCAPE_W / 2, centerY, { align: "center" });
    centerY += 16;
    
    // Add stars if lot is repeated
    if (shouldStars) {
      // Draw 5 gold stars below the CUTTING TABLE heading
      const starSize = 10;
      const starSpacing = 20;
      const totalWidth = 5 * starSpacing - starSpacing/2;
      const startX = LANDSCAPE_W / 2 - totalWidth / 2;
      const starY = centerY;
      
      // Draw 5 stars
      for (let i = 0; i < 5; i++) {
        drawStar(doc, startX + (i * starSpacing), starY, starSize);
      }
      
      // Add "LOT REPEATED" text below stars
      setFont("bold", 14);
      doc.text("LOT REPEATED", LANDSCAPE_W / 2, starY + 25, { align: "center" });
      centerY = starY + 40;
    }
    
    // LOT NUMBER in center (below stars if they exist)
    const lotNumber = val("Lot Number") || "—";
    setFont("bold", 14);
    doc.text(`LOT NUMBER: ${lotNumber}`, LANDSCAPE_W / 2, centerY, { align: "center" });
    centerY += 16;
    
    // Fabric information
    setFont("bold", 10);
    const fabric = val("Fabric") || "—";
    doc.text(`Fabric: ${fabric}`, LANDSCAPE_W / 2, centerY, { align: "center" });
    centerY += 14;
    
    // REMARKS
    setFont("normal", 9);
    const remarksText = row?.["Remarks"] ? String(row["Remarks"]).trim() : "";
    if (remarksText && remarksText !== "") {
      const maxRemarksLength = 80;
      const displayRemarks = remarksText.length > maxRemarksLength 
        ? remarksText.substring(0, maxRemarksLength - 3) + "..." 
        : remarksText;
      
      doc.text(`Remarks: ${displayRemarks}`, LANDSCAPE_W / 2, centerY, { align: "center" });
      centerY += 14;
    }
    
    // Calculate header height
    let headerHeight = 75 + TOP_MARGIN + starAdjustment;
    
    // Adjust header height for content
    if (remarksText && remarksText !== "") headerHeight += 14;
    
    // Separator line under header
    const separatorY = headerHeight + 5;
    doc.setDrawColor(...C.black);
    doc.setLineWidth(0.5);
    doc.line(M, separatorY, LANDSCAPE_W - M, separatorY);
    
    return separatorY + 10; // Good space between header and table
  };
  
  // Function to draw the sticker box
  const drawStickerBox = (startY, pageNumber) => {
    // Box dimensions
    const boxWidth = 140; // Slightly reduced width for right side
    const boxHeight = 80; // Reduced height
    const boxX = LANDSCAPE_W - boxWidth - M; // Right side position
    const boxY = startY;
    
    // Draw box border with thicker lines
    doc.setDrawColor(...C.black);
    doc.setLineWidth(1.5);
    doc.rect(boxX, boxY, boxWidth, boxHeight);
    
    // Box background (white color)
    doc.setFillColor(255, 255, 255);
    doc.rect(boxX, boxY, boxWidth, boxHeight, "F");
    
    // Box content with proper spacing
    let contentY = boxY + 12;
    
    // Heading: PARTA CHECKED (centered, bold and larger)
    setFont("bold", 12);
    doc.text("PARTA CHECKED", boxX + boxWidth / 2, contentY, { align: "center" });
    contentY += 18;
    
    // Separator line
    doc.setDrawColor(...C.black);
    doc.setLineWidth(0.8);
    doc.line(boxX + 10, contentY, boxX + boxWidth - 10, contentY);
    contentY += 12;
    
    // DATE section only
    setFont("bold", 10);
    doc.text("DATE :", boxX + 15, contentY);
    
    // Blank line for manual date entry
    const dateLineStartX = boxX + 50;
    const dateLineEndX = boxX + boxWidth - 15;
    
    // Draw a blank line for date
    doc.setDrawColor(...C.black);
    doc.setLineWidth(0.8);
    const dateLineY = contentY + 4;
    doc.line(dateLineStartX, dateLineY, dateLineEndX, dateLineY);
    contentY += 16;
    
    // Cutting Head Sign with more spacing
    setFont("bold", 11);
    doc.text("Cutting Head Sign", boxX + boxWidth / 2, contentY, { align: "center" });
    contentY += 8;
    
    // Line for signature
    doc.setDrawColor(...C.black);
    doc.setLineWidth(0.8);
    const signLineY = contentY + 2;
    const signLineStartX = boxX + 20;
    const signLineEndX = boxX + boxWidth - 20;
    doc.line(signLineStartX, signLineY, signLineEndX, signLineY);
    
    return boxY + boxHeight;
  };
  
  // Function to draw a table page with the two new columns
  const drawTablePage = (shadeBatch, pageIndex, totalPages, startSrNo) => {
    // Draw page header (same on every page)
    const tableStartY = drawPageHeader(pageIndex + 1, totalPages);
    let y = tableStartY;
    
    // Get Fabric Lot No and Rib Lot No values from the row
    const fabricLotNo = val("Fabric Lot No") || val("Fabric Lot") || "—";
    const ribLotNo = val("Rib Lot No") || val("Rib Lot") || "—";
    
    const tableData = [];
    const rowsNeeded = Math.max(colorsPerPage, shadeBatch.length);
    
    // Add color rows with continuous serial numbers
    for (let i = 0; i < rowsNeeded; i++) {
      const srNo = startSrNo + i;
      const row = { 
        sr_no: srNo.toString(),
        shade: i < shadeBatch.length ? shadeBatch[i] : "",
        fabric_lot_no: i === 0 ? fabricLotNo : "", // Only show in first row
        rib_lot_no: i === 0 ? ribLotNo : "", // Only show in first row
        rolls: "",
        kgs: ""
      };
      
      // Add size columns
      if (sizes.length > 0) {
        sizes.forEach(size => {
          row[`size_${size}`] = "";
        });
      }
      
      // Add the rest of the columns
      row.total_pcs = "";
      row.kapda_layer_weight = "";
      row.layer_piece = "";
      row.layer_inch = "";
      row.daya = "";
      row.cutting_weight = "";
      row.kapda_vapsi = "";
      
      tableData.push(row);
    }
    
    // Add total row (only on last page)
    if (pageIndex === totalPages - 1) {
      tableData.push({
        sr_no: "TOTAL",
        shade: "",
        fabric_lot_no: "",
        rib_lot_no: "",
        rolls: "",
        kgs: "",
        ...(sizes.reduce((acc, size) => {
          acc[`size_${size}`] = "";
          return acc;
        }, {})),
        total_pcs: "",
        kapda_layer_weight: "",
        layer_piece: "",
        layer_inch: "",
        daya: "",
        cutting_weight: "",
        kapda_vapsi: "",
        isTotalRow: true
      });
    }
    
    // Generate table headers with adjusted widths for A4 - WITH NEW COLUMNS
    const generateTableHeaders = () => {
      const headers = [
        { label: "SR", key: "sr_no", width: 0.5 },
        { label: "SHADE", key: "shade", width: 1.5 }, // Reduced from 2.0 to 1.5
        { label: "FABRIC\nLOT NO", key: "fabric_lot_no", width: 0.9 }, // New column
        { label: "RIB\nLOT NO", key: "rib_lot_no", width: 0.9 }, // New column
        { label: "ROLLS", key: "rolls", width: 0.7 },
        { label: "KGS", key: "kgs", width: 0.7 },
      ];
      
      // Add size columns with reduced width
      if (sizes.length > 0) {
        sizes.forEach(size => {
          headers.push({ 
            label: size, 
            key: `size_${size}`, 
            width: 0.6
          });
        });
      }
      
      // Add the remaining columns with English abbreviations - reduced widths
      headers.push(
        { label: "TOTAL\nPCS", key: "total_pcs", width: 0.7 },
        { label: "KAPDA\nLAYER WT", key: "kapda_layer_weight", width: 0.9 },
        { label: "LAYER\nPCS", key: "layer_piece", width: 0.7 },
        { label: "LAYER\nINCH", key: "layer_inch", width: 0.7 },
        { label: "DIA", key: "daya", width: 0.6 },
        { label: "CUTTING\nWEIGHT", key: "cutting_weight", width: 0.8 },
        { label: "KAPDA\nVAPSI", key: "kapda_vapsi", width: 0.7 }
      );
      
      return headers;
    };
    
    const tableHeaders = generateTableHeaders();
    
    // Draw table header
    const drawTableHeader = () => {
      // Header with WHITE background
      doc.setFillColor(...C.white);
      doc.rect(tableX, y, tableWidth, HEADER_HEIGHT, "F");
      
      let currentX = tableX;
      const totalRatio = tableHeaders.reduce((sum, h) => sum + (h.width || 1), 0);
      
      tableHeaders.forEach((h, i) => {
        const colWidth = (h.width / totalRatio) * tableWidth;
        
        // Draw column border
        doc.setDrawColor(...C.black);
        doc.setLineWidth(0.5);
        doc.rect(currentX, y, colWidth, HEADER_HEIGHT);
        
        // Header text - smaller font for A4
        setFont("bold", 7); // Reduced font size to fit more columns
        
        if (h.label.length <= 3 && /^[A-Z0-9]+$/.test(h.label) && !h.label.includes('\n')) {
          // Size column
          doc.text(h.label, currentX + colWidth / 2, y + HEADER_HEIGHT / 2 - 4, { align: "center" });
          
          // Draw separator line
          doc.setDrawColor(...C.black);
          doc.setLineWidth(0.3);
          doc.line(currentX + 2, y + HEADER_HEIGHT / 2, 
                  currentX + colWidth - 2, y + HEADER_HEIGHT / 2);
        } else {
          // Regular header with line breaks
          const lines = h.label.split('\n');
          const lineHeight = 7;
          const startY = y + (HEADER_HEIGHT - (lines.length * lineHeight)) / 2 + 5;
          
          lines.forEach((line, lineIdx) => {
            doc.text(line, currentX + colWidth / 2, startY + (lineIdx * lineHeight), { align: "center" });
          });
        }
        
        currentX += colWidth;
      });
      
      // Header bottom border
      doc.setDrawColor(...C.black);
      doc.setLineWidth(1.5);
      doc.line(tableX, y + HEADER_HEIGHT, tableX + tableWidth, y + HEADER_HEIGHT);
      
      return HEADER_HEIGHT;
    };
    
    // Draw table rows
    const drawTableRows = (headerHeight) => {
      const totalRatio = tableHeaders.reduce((sum, h) => sum + (h.width || 1), 0);
      const tableStartRowY = y + headerHeight;
      
      for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
        const row = tableData[rowIndex];
        const rowY = tableStartRowY + (rowIndex * ROW_HEIGHT);
        
        // Alternating row colors for better readability (pattern)
        if (rowIndex % 2 === 0) {
          doc.setFillColor(...C.white);
        } else {
          doc.setFillColor(245, 245, 245); // Light gray for alternating rows
        }
        doc.rect(tableX, rowY, tableWidth, ROW_HEIGHT, "F");
        
        // Draw thicker line for total row
        if (row.isTotalRow) {
          doc.setDrawColor(...C.black);
          doc.setLineWidth(1.5);
          doc.line(tableX, rowY, tableX + tableWidth, rowY);
        }
        
        let currentX = tableX;
        
        tableHeaders.forEach((h, i) => {
          const colWidth = (h.width / totalRatio) * tableWidth;
          
          // Draw cell border
          doc.setDrawColor(...C.black);
          doc.setLineWidth(0.3);
          doc.rect(currentX, rowY, colWidth, ROW_HEIGHT);
          
          // Cell content
          const cellValue = row[h.key] || "";
          
          // Style for total row
          if (row.isTotalRow) {
            setFont("bold", 8);
          } else {
            setFont("normal", 8);
          }
          
          // Special handling for SHADE, FABRIC_LOT_NO, and RIB_LOT_NO columns to wrap text
          if (h.key === "shade" || h.key === "fabric_lot_no" || h.key === "rib_lot_no") {
            const textValue = String(cellValue);
            
            // Split the text to fit within the cell width with some padding
            const maxWidth = colWidth - 6; // Leave some padding
            const lines = doc.splitTextToSize(textValue, maxWidth);
            const lineHeight = 7;
            const totalTextHeight = lines.length * lineHeight;
            const startY = rowY + (ROW_HEIGHT - totalTextHeight) / 2 + 4;
            
            // Draw each line
            lines.forEach((line, lineIdx) => {
              doc.text(line, currentX + colWidth / 2, startY + (lineIdx * lineHeight), { align: "center" });
            });
          } else {
            // Center text in cell for other columns
            doc.text(String(cellValue), currentX + colWidth / 2, rowY + ROW_HEIGHT / 2 + 2, { align: "center" });
          }
          
          currentX += colWidth;
        });
      }
      
      return tableStartRowY + (tableData.length * ROW_HEIGHT);
    };
    
    // Draw the complete table
    const headerHeight = drawTableHeader();
    const tableBottom = drawTableRows(headerHeight);
    
    // Draw table border
    const totalTableHeight = headerHeight + (tableData.length * ROW_HEIGHT);
    doc.setDrawColor(...C.black);
    doc.setLineWidth(1);
    doc.rect(tableX, y, tableWidth, totalTableHeight, "S");
    
    y = tableBottom + 20; // Increased spacing below table
    
    // ====== SIGNATURE/STICKER BOX ======
    // Show on EVERY page
    const stickerBottom = drawStickerBox(y, pageIndex + 1);
    
    // Update y position to be after sticker box
    y = stickerBottom + 20;
    
    // ====== BOTTOM SECTION ======
          
    // Page footer
    setFont("normal", 8);
    const now = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    });
    doc.text(`Printed: ${now}`, LANDSCAPE_W / 2, LANDSCAPE_H - 10, { align: "center" });
    
    doc.text(`JOB: ${joNum}`, LANDSCAPE_W - M, LANDSCAPE_H - 10, { align: "right" });
    
    // Return next serial number for next page
    return startSrNo + rowsNeeded;
  };
  
  // Draw all pages with continuous serial numbers
  let currentSrNo = 1;
  shadeBatches.forEach((batch, index) => {
    if (index > 0) {
      doc.addPage("a4", "landscape");
    }
    currentSrNo = drawTablePage(batch, index, shadeBatches.length, currentSrNo);
  });
};
    // ---------- BUILD ALL PAGES ----------
    await renderFirstPage();                 // Page 1
    doc.addPage(); await pause(0);
    await renderFirstPage();                 // Page 2 (duplicate)
    doc.addPage(); await pause(0);
    await renderSecondPage();                // Page 3
    doc.addPage(); await pause(0);
    await renderThirdPage();                 // Page 4
    await renderLandscapeTablePage();        // Page 5+ (Landscape with 7 colors per page)

    // ====== FOOTERS FOR ALL PAGES ======
   const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...C.black);
  doc.setLineWidth(1.5);
  doc.line(M, h - FOOTER_H - 10, M + 100, h - FOOTER_H - 10);

  setFont("normal", F.meta);
  doc.text(`Page ${i} of ${totalPages} • ${joNum}`, w - M, h - FOOTER_H, { align: "right" });

  if (i === totalPages) {
    setFont("normal", F.meta);
    doc.text(`Signature __________`, M, h - FOOTER_H);
  } else if (i === totalPages - 1) {
    setFont("normal", F.meta);
    doc.text(`Signature __________`, M, h - FOOTER_H);
  } else if (i === totalPages - 2) {
    setFont("normal", F.meta);
    doc.text(`Checked by: Production Manager`, M, h - FOOTER_H);
  }
}

// Log successful generation
await logPdfGeneration(row, "single", "Generated", "PDF generated successfully");

// Refresh the generated lots list after successful generation
await fetchGeneratedLots();

const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
try {
  await doc.save(`JobOrder_${safe(joNum)}.pdf`, { returnPromise: true });
} catch {
  doc.save(`JobOrder_${safe(joNum)}.pdf`);
}
 } catch (e) {
  // Log error
  await logPdfGeneration(row, "single", "Failed", `Error: ${e.message}`);
  alert(`Could not create PDF: ${e.message}`);
} finally {
  setPdfBusyId(null);
}
};
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
      
      // Check if we should show stars
      const priorityText = val("Priority", row)?.toString() || "";
      const shouldStars = priorityText.toLowerCase().includes("lot_repeated") || 
                         priorityText.toLowerCase().includes("repeated_lot") || 
                         priorityText.toLowerCase().includes("repeated") ||
                         priorityText.toLowerCase().includes("repeat");
      
      PAGE = firstPageScaffold();
      y = shouldStars ? 190 : 170; // Adjust Y position based on stars

      // Blue headings on white
      setFont("bold", 32, C.primary);
      doc.text("JOB ORDER", doc.internal.pageSize.getWidth() / 2, 65, { align: "center" });
      
      // Add stars if lot is repeated
      if (shouldStars) {
        // Draw 5 gold stars below the main title
        const starSize = 12;
        const starSpacing = 24;
        const totalWidth = 5 * starSpacing - starSpacing/2;
        const startX = PAGE.w / 2 - totalWidth / 2;
        const starY = 85;
        
        // Draw 5 stars
        for (let i = 0; i < 5; i++) {
          drawStar(doc, startX + (i * starSpacing), starY, starSize);
        }
        
        // Add "LOT REPEATED" text below stars
        setFont("bold", 16, C.highlight);
        doc.text("LOT REPEATED", PAGE.w / 2, 110, { align: "center" });
        
        // Order # positioned below LOT REPEATED text
        setFont("bold", 16, C.primary);
        doc.text(`Order #${joNum}`, PAGE.w / 2, 135, { align: "center" });
      } else {
        // Normal position when not "repeated"
        setFont("bold", 16, C.primary);
        doc.text(`Order #${joNum}`, doc.internal.pageSize.getWidth() / 2, 90, { align: "center" });
      }

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
        const yChip = shouldStars ? 150 : 85; // Adjust Y position based on stars
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
      const stickerValue = row?.["Sticker"] ? String(row["Sticker"]).trim() : "—";
      await contentRow([
        { label: "Embroidery", value: val("Emb", row) },
        { label: "Printing", value: val("Printing", row) },
        { label: "Direct Stitching", value: asBool(row?.["Direct Stitching"]) ? "Yes" : asText(row?.["Direct Stitching"]) },
        { label: "Component", value: val("Component", row) },
          // { label: "Sticker", value: val("Sticker") },
          { label: "Sticker", value: stickerValue },
      ], 5);
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
      
      // Check if we should show stars
      const priorityText = val("Priority", row)?.toString() || "";
      const shouldStars = priorityText.toLowerCase().includes("lot_repeated") || 
                         priorityText.toLowerCase().includes("repeated_lot") || 
                         priorityText.toLowerCase().includes("repeated") ||
                         priorityText.toLowerCase().includes("repeat");

      PAGE = innerPageScaffold();
      
      // Adjust Y position based on stars
      let startY = shouldStars ? 80 : 50;
      y = 100;

      setFont("bold", 24, C.primary);
      const lotNum = asText(row?.["Lot Number"]);
      doc.text(
        `JOB ORDER SUMMARY ${lotNum !== "—" ? `(${lotNum})` : ""}`,
        doc.internal.pageSize.getWidth() / 2,
        startY,
        { align: "center" }
      );

      // Add stars if lot is repeated
      if (shouldStars) {
        // Draw 5 gold stars below the title
        const starSize = 12;
        const starSpacing = 24;
        const totalWidth = 5 * starSpacing - starSpacing/2;
        const startX = PAGE.w / 2 - totalWidth / 2;
        const starY = startY + 25;
        
        // Draw 5 stars
        for (let i = 0; i < 5; i++) {
          drawStar(doc, startX + (i * starSpacing), starY, starSize);
        }
        
        // Add "LOT REPEATED" text below stars
        setFont("bold", 16, C.highlight);
        doc.text("LOT REPEATED", PAGE.w / 2, starY + 30, { align: "center" });
        
        // Update y position for the rest of the content
        y = starY + 60;
      } else {
        y = startY + 35;
      }

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
      
      // Check if we should show stars
      const priorityText = val("Priority", row)?.toString() || "";
      const shouldStars = priorityText.toLowerCase().includes("lot_repeated") || 
                         priorityText.toLowerCase().includes("repeated_lot") || 
                         priorityText.toLowerCase().includes("repeated") ||
                         priorityText.toLowerCase().includes("repeat");

      PAGE = innerPageScaffold();
      
      // Adjust Y position based on stars
      let startY = shouldStars ? 95 : 75;
      y = startY;

      // Helper function for shortening text
      const shortenText = (text, maxLength) => {
        if (!text || text === "—") return "—";
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + "...";
      };

      // ===== HEADER SECTION =====
      setFont("bold", 28, C.primary);
      doc.text("MATERIAL REQUISITION PLANNING", PAGE.w / 2, 55, { align: "center" });

      // Add stars if lot is repeated
      if (shouldStars) {
        // Draw 5 gold stars below the main title
        const starSize = 12;
        const starSpacing = 24;
        const totalWidth = 5 * starSpacing - starSpacing/2;
        const startX = PAGE.w / 2 - totalWidth / 2;
        const starY = 75;
        
        // Draw 5 stars
        for (let i = 0; i < 5; i++) {
          drawStar(doc, startX + (i * starSpacing), starY, starSize);
        }
        
        // Add "LOT REPEATED" text below stars
        setFont("bold", 16, C.highlight);
        doc.text("LOT REPEATED", PAGE.w / 2, starY + 25, { align: "center" });
        
        // Update y position
        y = starY + 50;
      }

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
      doc.text(`LOT NUMBER: ${val("Lot Number", row)}`, M + 180, y + 10);

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
  className="jox-btn jox-btn--light"
  onClick={() => fetchGeneratedLots()}
  disabled={loadingGeneratedLots}
  title="Refresh generated lots status"
>
  <span className="jox-ico">{loadingGeneratedLots ? "⏳" : "🔄"}</span>
  <span>{loadingGeneratedLots ? "Loading…" : "Check Generated"}</span>
</button>
            
            <button
  className="jox-btn"
  onClick={() => exportBatchPages("first")}
  disabled={loading || refreshing || pdfBatchBusy || rows.length === 0}
  title="Download a single PDF containing page 1 of every matching order"
>
  <span className="jox-ico">{pdfBatchBusy === "first" ? "⏳" : "⬇️"}</span>
  <span>{pdfBatchBusy === "first" ? "Building…" : "Download FP"}</span>
</button>
  <button
    className="jox-btn jox-btn--light"
    onClick={() => fetchData({ isRefresh: true })}
    disabled={loading || refreshing}
    title="Refresh data from Google Sheets"
  >
    <span className="jox-ico">{refreshing ? "⏳" : "🔄"}</span>
    <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
  </button>

{/* <button
  className="jox-btn"
  onClick={() => exportBatchPages("second")}
  disabled={loading || refreshing || pdfBatchBusy || rows.length === 0}
  title="Download a single PDF containing page 2 of every matching order"
>
  <span className="jox-ico">{pdfBatchBusy === "second" ? "⏳" : "⬇️"}</span>
  <span>{pdfBatchBusy === "second" ? "Building…" : "Download SP"}</span>
</button> */}
{/* <button
  className="jox-btn"
  onClick={() => exportBatchPages("material")}
  disabled={loading || refreshing || pdfBatchBusy || rows.length === 0}
  title="Download a single PDF containing Material Requisition Planning pages for every matching order"
>
  <span className="jox-ico">{pdfBatchBusy === "material" ? "⏳" : "📋"}</span>
  <span>{pdfBatchBusy === "material" ? "Building…" : "Download MRP"}</span>
</button> */}
{/* <button
  className="jox-btn"
  onClick={exportLandscapePages}
  disabled={loading || refreshing || pdfLandscapeBusy || rows.length === 0}
  title="Download Cutting Table pages (landscape) for all matching orders"
>
  <span className="jox-ico">{pdfLandscapeBusy ? "⏳" : "📊"}</span>
  <span>{pdfLandscapeBusy ? "Building…" : "Download CT"}</span>
</button> */}
 
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
<select className="jox-select" value={fSticker} onChange={(e) => { setFSticker(e.target.value); setPage(1); }} title="Filter by Sticker">
  <option value="">🏷️ All Stickers</option>
  {stickerOpts.map((v) => <option key={v} value={v}>{v}</option>)}
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
    const lotNumber = (r["Lot Number"] ?? "").toString().trim();
    const jo = (r["Job Order No"] ?? "").toString().trim();
    const isBusyThis = pdfBusyId && pdfBusyId === jo;
    
    // UPDATED - Check if lot already has at least one successful PDF generation
    const hasExistingSuccessfulPdf = generatedLots.has(lotNumber);
    
    // Determine disabled state
    const isDisabled = !hasLot || Boolean(pdfBusyId) || hasExistingSuccessfulPdf;
    
    // Determine title message
    let titleMessage = "";
    if (!hasLot) {
      titleMessage = "No Lot Number — cannot export";
    } else if (hasExistingSuccessfulPdf) {
      titleMessage = "PDF already successfully generated for this Lot Number - further generation blocked";
    } else if (isBusyThis) {
      titleMessage = "Generating…";
    } else {
      titleMessage = "Download PDF of this Job Order";
    }

    return (
      <button
        className="jox-btn"
        onClick={() => hasLot && generatePdf(r)}
        disabled={isDisabled}
        title={titleMessage}
      >
        <span className="jox-ico">
          {isBusyThis ? "⏳" : (hasExistingSuccessfulPdf ? "✅" : "📝")}
        </span>
        <span>
          {isBusyThis ? "Working…" : (hasExistingSuccessfulPdf ? "Already Generated" : "Create PDF")}
        </span>
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
