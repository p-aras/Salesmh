// src/pages/EmbroideryChallan.jsx
import React, { useEffect, useMemo, useState } from 'react';

/**
 * ======= CONFIG =======
 * ⚠️ For production, do NOT hardcode keys—use env vars or a backend proxy.
 */
const API_KEY = /* process.env.NEXT_PUBLIC_GSHEETS_KEY || */ 'AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk';
// ======= BACKEND (Apps Script Web App) =======
const APPSCRIPT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbz1k9jfPQ7sbBqJggliaUTcyqSHThkPHSjrP7dfD0nLHXDozD-gIKSad3A9Yp6M1jTJlw/exec';

const postJSON = async (url, data) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps Script friendly
    body: JSON.stringify(data),
  });
  return res.json();
};

/**
 * SOURCES
 * - cutting: your "Budget Report" -> "Cutting" tab (screenshot)
 * - second : your JobOrder sheet
 */
const SOURCES = {
  cutting: {
    SHEET_ID: '1Hj3JeJEKB43aYYWv8gk2UhdU6BWuEQfCg5pBlTdBMNA',
    TAB_NAME: 'Cutting',
    RANGE: 'A1:Z',
  },
  second: {
    SHEET_ID: '1fKSwGBIpzWEFk566WRQ4bzQ0anJlmasoY8TwrTLQHXI',
    TAB_NAME: 'JobOrder',
    RANGE: 'A1:ZZZ',
    lotKey: 'Lot Number',
  },
  // Add Index sheet
  index: {
    SHEET_ID: '1Hj3JeJEKB43aYYWv8gk2UhdU6BWuEQfCg5pBlTdBMNA', // Same as JobOrder sheet
    TAB_NAME: 'Index',
    RANGE: 'A1:K',
    lotKey: 'Lot Number',
  },
};


/* =======================
   Utility helpers
======================= */
const buildSheetsUrl = (sheetId, tabName, range, apiKey) => {
  const encodedRange = encodeURIComponent(`${tabName}!${range}`);
  return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?key=${apiKey}`;
};
// Material Status from Challan History
const getMaterialStatus = (row) => {
  const hist = getChallanHistoryFromRow(row);
  if (!hist.length) return ''; // nothing generated yet
  const anyUnreceived = hist.some(e => !e?.receivedDate);
  return anyUnreceived ? 'Pending' : 'Material Received';
};
const getembroiderystatus = (row) => {
  const histo = getChallanHistoryFromRow(row);
  if (!histo.length) return ''; // nothing generated yet
  const anyCompleted = histo.some(e => !e?.embCompleted);
  return anyCompleted ? 'Pending' : 'Complete Emb';
};
const getChallanCountForLot = (lotNumber, challanHistory) => {
  const baseNumber = 'CH-EMB-'; // Your base challan number prefix
  let count = 0;
  
  challanHistory.forEach(entry => {
    if (entry.number && entry.number.startsWith(baseNumber)) {
      count++;
    }
  });
  
  return count;
};
  const loadImageAsBase64ForPdf = (url) => {
    return new Promise((resolve, reject) => {
      if (!url || typeof url !== 'string') {
        console.warn('⚠️ Invalid image URL:', url);
        return reject(new Error('Invalid URL'));
      }

      const cleanUrl = url.replace(/^https?:\/\//, '');
      const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const base64 = canvas.toDataURL('image/jpeg');
          resolve(base64);
        } catch (err) {
          console.error('❌ Canvas conversion error:', err);
          reject(err);
        }
      };

      img.onerror = () => {
        console.warn('⚠️ Image failed to load:', proxiedUrl);
        reject(new Error('Image load failed'));
      };

      img.src = proxiedUrl;
    });
  };



const reserveChallanNo = async (series = 'CH-EMB-', zeroPad = 0) => {
  const res = await postJSON(APPSCRIPT_WEB_APP_URL, {
    action: 'reserveChallanNo',
    series,
    zeroPad,
  });
  if (res?.success && res?.challanNo) return res.challanNo;

  const now = new Date();
  return `CH-FB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
};
// === Challan History helpers (reuse your normalize + parseNum) ===
const parseDateLoose = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};
// --- NEW: Set/Clear challan receivedDate (ISO) ---
// - const setChallanReceivedDate = async ({ lotNumber, challanNumber, setNow }) => {
 const setChallanReceivedDate = async ({ lotNumber, challanNumber, historyIndex, setNow }) => {
   const payload = {
     action: 'setChallanReceivedDate',
     lotNumber,
     challanNumber,
    historyIndex,                // <— NEW
     receivedDate: setNow ? new Date().toISOString() : '', // set or clear
   };
   return postJSON(APPSCRIPT_WEB_APP_URL, payload);
 };
 // --- NEW: per-challan Emb status (completed / not)
const setChallanEmbStatus = async ({ lotNumber, challanNumber, historyIndex, embCompleted }) => {
  const payload = {
    action: 'setChallanEmbStatus',
    lotNumber,
    challanNumber,
    historyIndex,      // prefer exact index we computed in UI
    embCompleted: !!embCompleted
  };
  return postJSON(APPSCRIPT_WEB_APP_URL, payload);
};
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Create a service worker registration (add this to your main app file or public folder)
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered: ', registration);
    } catch (registrationError) {
      console.log('SW registration failed: ', registrationError);
    }
  }
};

// --- NEW: mark the JobOrder row as Completed (true) by Lot Number ---
// const setLotCompleted = async ({ lotNumber, completed = true }) => {
//   const payload = {
//     action: 'setLotCompleted',
//     lotNumber,
//     completed, // boolean
//   };
//   return postJSON(APPSCRIPT_WEB_APP_URL, payload);
// };

const fmtDate = (s) => {
  const d = parseDateLoose(s);
  if (!d) return String(s || '');
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(d);
};

const getChallanHistoryFromRow = (row) => {
  const key = findColumnKey(row, ['Challan History JSON', 'Challan History']);
  if (!key) return [];
  const raw = row[key];
  if (!raw || typeof raw !== 'string') return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};


const rowsToObjects = (values = []) => {
  if (!values?.length) return [];
  const [rawHeaders, ...rows] = values;

  const seen = new Set();
  const keys = rawHeaders.map((h, idx) => {
    let base = String(h || '').trim();
    if (!base) base = `Column ${idx + 1}`;
    const low = base.toLowerCase();
    if (low === 'date') base = 'Challan Date';
    if (low === 'submitted by') base = 'Challan Submitted By';

    let candidate = base;
    let n = 2;
    while (seen.has(candidate)) candidate = `${base} (${n++})`;
    seen.add(candidate);
    return candidate;
  });

  return rows.map((row) => {
    const o = {};
    keys.forEach((k, i) => (o[k] = row[i] ?? ''));
    return o;
  });
};

const normalizeHeader = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const normalizeLot = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '').trim();
const normalizeShade = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

const findColumnKey = (rowObj, desiredKeyCandidates = []) => {
  const keys = Object.keys(rowObj || {});
  if (!keys.length) return null;

  for (const cand of desiredKeyCandidates) if (Object.prototype.hasOwnProperty.call(rowObj, cand)) return cand;

  const normMap = new Map(keys.map((k) => [normalizeHeader(k), k]));
  for (const cand of desiredKeyCandidates) {
    const n = normalizeHeader(cand);
    if (normMap.has(n)) return normMap.get(n);
  }

  for (const k of keys) if (/\blot\b/.test(normalizeHeader(k))) return k;
  return null;
};

const debounce = (fn, wait = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

const toCSV = (rows, headers) => {
  const escape = (v) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = headers.map(escape).join(',');
  const body = rows.map((r) => headers.map((h) => escape(r[h])).join(',')).join('\n');
  return `${head}\n${body}`;
};

const download = (filename, text) => {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const COLS_KEY = 'mh-ec-visible-cols';
const BORDERS_KEY = 'mh-ec-borders';

const arrayBufferToBase64 = (buf) => {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const pickDefaultVisibleColumns = (allCols = []) => {
  // Your desired columns in order of priority
  const desiredColumns = [
    'Lot No.',
    'Fabric',
    'Brand',
    'Garment Type',
    'Style',
    // Note: 'Pending Challan Shades', 'Pending Qty', 'Generated Challan Qty', 
    // 'Material Status', 'Embroidery Status', 'Challan History', 'Challan', 'Job Order'
    // are special columns added in the table render, not from the data source
  ];

  // Create a map of normalized headers to actual column names
  const headerMap = new Map();
  allCols.forEach(col => {
    headerMap.set(normalizeHeader(col), col);
  });

  // Try to find your desired columns by normalizing and matching
  const foundColumns = [];
  
  // First, look for exact matches or close matches
  desiredColumns.forEach(desiredCol => {
    const normalizedDesired = normalizeHeader(desiredCol);
    
    // Try exact match first
    if (headerMap.has(normalizedDesired)) {
      foundColumns.push(headerMap.get(normalizedDesired));
      headerMap.delete(normalizedDesired); // Remove to avoid duplicates
    } else {
      // Try partial matching
      for (const [normKey, actualCol] of headerMap.entries()) {
        if (normKey.includes(normalizedDesired) || 
            normalizedDesired.includes(normKey) ||
            // Common variations
            (desiredCol === 'Lot No.' && (normKey.includes('lot') && !normKey.includes('Lot Number'))) ||
            (desiredCol === 'Garment Type' && (normKey.includes('garment') || normKey.includes('gmt'))) ||
            (desiredCol === 'Brand' && (normKey.includes('brand') || normKey.includes('buyer'))) ||
            (desiredCol === 'Fabric' && normKey.includes('fabric')) ||
            (desiredCol === 'Style' && normKey.includes('style'))) {
          foundColumns.push(actualCol);
          headerMap.delete(normKey);
          break;
        }
      }
    }
  });

  // If we couldn't find some columns, try the old pattern matching as fallback
  if (foundColumns.length < 3) {
    const groups = [
      { id: 'job', pats: ['job order', 'joborder', 'job no', 'jo no', 'job#', 'job'] },
      { id: 'lot', pats: ['lot number', 'lot no', 'Lot Number'] },
      { id: 'party', pats: ['party name', 'party', 'buyer', 'customer'] },
      { id: 'style', pats: ['style', 'style no', 'style name'] },
      { id: 'emb', pats: ['emb', 'embroidery', 'design name', 'design'] },
      { id: 'embd', pats: ['emb details', 'embroidery details', 'design details'] },
      { id: 'fabric', pats: ['fabric'] },
      { id: 'size', pats: ['size', 'sizes'] },
      { id: 'qty', pats: ['total qty', 'total quantity', 'quantity', 'qty', 'pcs', 'pieces'] },
      { id: 'remarks', pats: ['remarks', 'note', 'notes'] },
    ];

    const wanted = new Set();
    const res = [];

    const matchCol = (col) => {
      const n = normalizeHeader(col);
      return groups.find((g) => g.pats.some((p) => n.includes(p)));
    };

    for (const col of allCols) {
      const m = matchCol(col);
      if (m && !wanted.has(m.id)) {
        wanted.add(m.id);
        res.push(col);
      }
    }
    
    // Merge with found columns, avoiding duplicates
    const merged = [...new Set([...foundColumns, ...res])];
    
    if (merged.length < 5) return allCols.slice(0, Math.min(8, allCols.length));
    return merged;
  }

  return foundColumns;
};

/** Parse Cutting sheet to find lots + items (shade + qty) */
const parseCuttingSheet = (values = []) => {
  const lots = new Set();
  const itemsByLot = {};
  let currentLot = null;

  const norm = (s) => String(s || '').trim();
  const ic = (s) => norm(s).toLowerCase();

  for (let r = 0; r < values.length; r++) {
    const row = values[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = norm(row[c]);
      if (!cell) continue;
      if (/cutting\s*matrix/i.test(cell) && /lot/i.test(cell)) {
        const m = cell.match(/lot[^0-9a-z]*([0-9a-z\-]+)/i);
        if (m && m[1]) {
          currentLot = normalizeLot(m[1]);
          if (currentLot) lots.add(currentLot);
        }
      }
      if (/^lot\s*number[:\s]*$/i.test(cell)) {
        const next = norm(row[c + 1]);
        const cand = normalizeLot(next);
        if (cand) {
          currentLot = cand;
          lots.add(cand);
        }
      }
    }

    const lowerRow = row.map(ic);
  const colorCol = lowerRow.findIndex((s) =>
  s === 'color' || s === 'colour' || s === 'shade' || s === 'shade color' || s === 'shade colour'
);


 const totalCol = lowerRow.findIndex((s) =>
  /total\s*pcs/.test(s) || s === 'total' || s === 'total qty' || s === 'qty total'
);

    if (colorCol !== -1 && totalCol !== -1 && currentLot) {
      let k = r + 1;
      while (k < values.length) {
        const prow = values[k] || [];
        if (!prow.some((x) => norm(x))) break;
        if (/^total$/i.test(norm(prow[0]))) break;

        const shade = norm(prow[colorCol]);
        const qtyRaw = norm(prow[totalCol]);
        if (shade) {
          const qty = Number(String(qtyRaw).replace(/,/g, '')) || 0;
          if (!itemsByLot[currentLot]) itemsByLot[currentLot] = [];
          itemsByLot[currentLot].push({ shade, qty });
        }
        k++;
      }
    }
  }
  lots.delete('');
  return { lots, itemsByLot };
};
// --- NEW: merge helper to preserve previous challans for a lot ---
const getExistingChallanAggregateForLot = (lot, allRows) => {
   const parseNum = (v) => {
    if (v == null) return 0;
    const n = Number(String(v).toString().replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  };
  const L = normalizeLot(lot);
  if (!L) return { items: [], totalQty: 0, completeLot: false };

  // Resolve column names robustly
  const sample = allRows[0] || {};
  const keys = Object.keys(sample);
  const byNorm = new Map(keys.map(k => [normalizeHeader(k), k]));

  const lotKey =
    byNorm.get('lot number') || byNorm.get('lot no') || byNorm.get('lot') || 'Lot Number';
  const itemsKey =
    byNorm.get('challan items json') || byNorm.get('challan items') || 'Challan Items JSON';
  const totalKey =
    byNorm.get('challan total qty') || byNorm.get('challan total quantity') || 'Challan Total Qty';
  const completeKey =
    byNorm.get('challan complete lot') || byNorm.get('challan complete') || 'Challan Complete Lot';

  const aggMap = {}; // shade -> qty
  let total = 0;
  let complete = false;

  for (const r of allRows) {
    if (normalizeLot(r[lotKey]) !== L) continue;

    // total
    total += parseNum(r[totalKey]);

    // complete flag
    const c = String(r[completeKey] ?? '').trim().toLowerCase();
    if (c === 'true' || c === 'yes' || c === 'y' || c === '1') complete = true;

    // items json (merge per-shade)
    const j = r[itemsKey];
    if (j && typeof j === 'string') {
      try {
        const parsed = JSON.parse(j);
        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        for (const it of items) {
          const shadeK = normalizeShade(it?.shade || '');
          const q = parseNum(it?.qty);
          if (!shadeK || q <= 0) continue;
          aggMap[shadeK] = (aggMap[shadeK] || 0) + q;
        }
      } catch (_) {
      }
    }
  }

  const items = Object.entries(aggMap).map(([shade, qty]) => ({ shade, qty }));
  return { items, totalQty: total, completeLot: complete };
};



/* =======================
   Main Component
======================= */
const EmbroideryChallan = () => {
  const [matchedRows, setMatchedRows] = useState([]);
  const [displayRows, setDisplayRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [visibleCols, setVisibleCols] = useState([]);
// Challan History dialog
const [historyOpen, setHistoryOpen] = useState(false);
const [historyRow, setHistoryRow] = useState(null);
const [markingLotComplete, setMarkingLotComplete] = useState(false);



const [notifications, setNotifications] = useState([]);
const [showNotifications, setShowNotifications] = useState(false);
const [unreadCount, setUnreadCount] = useState(0);
const openHistoryDialog = (row) => { setHistoryRow(row); setHistoryOpen(true); };
const closeHistoryDialog = () => { setHistoryOpen(false); setHistoryRow(null); };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingEmbId, setMarkingEmbId] = useState(null);
  // Add this to your component's state
const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
const [jobOrderDialogOpen, setJobOrderDialogOpen] = useState(false);
const [selectedJobOrder, setSelectedJobOrder] = useState(null);
const openJobOrderDialog = (row) => {
  console.log('Opening job order dialog for lot:', getLotFromRow(row));
  setSelectedJobOrder(row);
  setJobOrderDialogOpen(true);
};

// Add this function to close the Job Order dialog
const closeJobOrderDialog = () => {
  setJobOrderDialogOpen(false);
  setSelectedJobOrder(null);
};

  

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);
  const [audioEnabled, setAudioEnabled] = useState(true);
const [audio, setAudio] = useState(null);

  const [colMgrOpen, setColMgrOpen] = useState(false);
  const [colMgrSearch, setColMgrSearch] = useState('');
  const [markingReceivedId, setMarkingReceivedId] = useState(null);

  const [showBorders, setShowBorders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BORDERS_KEY) || 'true');
    } catch {
      return true;
    }
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRow, setModalRow] = useState(null);
  const [items, setItems] = useState([{ shade: '', qty: '' }]);
  const [completeLot, setCompleteLot] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [cuttingItemsByLot, setCuttingItemsByLot] = useState({});

  // NEW: Generated challan qty (TOTAL) and PER-SHADE by lot, plus completeLot flags
  const [generatedByLotTotal, setGeneratedByLotTotal] = useState({});      // { [lot]: number }
  const [generatedByLotShade, setGeneratedByLotShade] = useState({});      // { [lot]: { [SHADE]: number } }
  const [completeLotByLot, setCompleteLotByLot] = useState({});            // { [lot]: boolean }

const urls = useMemo(
  () => ({
    cutting: buildSheetsUrl(SOURCES.cutting.SHEET_ID, SOURCES.cutting.TAB_NAME, SOURCES.cutting.RANGE, API_KEY),
    second: buildSheetsUrl(SOURCES.second.SHEET_ID, SOURCES.second.TAB_NAME, SOURCES.second.RANGE, API_KEY),
    // Add Index URL
    index: buildSheetsUrl(SOURCES.index.SHEET_ID, SOURCES.index.TAB_NAME, SOURCES.index.RANGE, API_KEY),
  }),
  []
);

  // ===== HELPERS: cutting + pending + generated =====
  const getLotFromRow = (row) =>
    normalizeLot(String(row['Lot Number'] ?? row['Lot No.'] ?? row['Lot'] ?? ''));

  const getPositiveQtyItemsForLot = (rowOrLot) => {
    const lot = typeof rowOrLot === 'string' ? normalizeLot(rowOrLot) : getLotFromRow(rowOrLot);
    const items = cuttingItemsByLot[lot] || [];
    return items
      .map((it) => ({
        shade: String(it.shade || '').trim(),
        qty: Number(it.qty) || 0,
      }))
      .filter((it) => it.qty > 0);
  };

  const getCuttingTotalQty = (rowOrLot) =>
    getPositiveQtyItemsForLot(rowOrLot).reduce((s, it) => s + it.qty, 0);

  const getLotGeneratedQtyTotal = (rowOrLot) => {
    const lot = typeof rowOrLot === 'string' ? normalizeLot(rowOrLot) : getLotFromRow(rowOrLot);
    return Number(generatedByLotTotal[lot] || 0);
  };

  const isLotMarkedComplete = (rowOrLot) => {
    const lot = typeof rowOrLot === 'string' ? normalizeLot(rowOrLot) : getLotFromRow(rowOrLot);
    return !!completeLotByLot[lot];
  };

  // Compute remaining per shade (Cutting − Generated per-shade), zero-clamped.
  const getRemainingItemsForLot = (rowOrLot) => {
  const lot = typeof rowOrLot === 'string' ? normalizeLot(rowOrLot) : getLotFromRow(rowOrLot);

  // If lot is marked complete, no remaining items
  if (isLotMarkedComplete(lot)) return [];

  const cutting = getPositiveQtyItemsForLot(lot);
  const genMap = generatedByLotShade[lot] || {};

  // If no cutting data but we have expected shades from job order
  if (cutting.length === 0) {
    const row = typeof rowOrLot === 'object' ? rowOrLot : matchedRows.find(r => getLotFromRow(r) === lot);
    const expectedShades = getShadeListFromRow(row);
    const missingShades = expectedShades.filter(shade => 
      !genMap[shade] || Number(genMap[shade]) <= 0
    );
    
    return missingShades.map(shade => ({ shade, qty: 1 })); // Default qty of 1 for missing shades
  }

  // Normal case: cutting data available
  const cuttingMap = {};
  for (const { shade, qty } of cutting) {
    const key = normalizeShade(shade);
    cuttingMap[key] = (cuttingMap[key] || 0) + qty;
  }

  const remaining = [];
  for (const key of Object.keys(cuttingMap)) {
    const cutQty = cuttingMap[key];
    const genQty = Number(genMap[key] || 0);
    const rem = Math.max(0, cutQty - genQty);
    if (rem > 0) {
      remaining.push({
        shade: key,
        qty: rem,
      });
    }
  }

  return remaining;
};
  // Pull expected shade names from the JobOrder row's Shade/Color cell (comma-separated)
const getShadeListFromRow = (row) => {
  if (!row) return [];
  // best-effort: find a Shade / Color column
  const key = findColumnKey(row, ['Shade', 'Shades', 'Color', 'Colour', 'Shade Color', 'Shade/Color']);
  let raw = key ? row[key] : '';

  // Fallback: scan any column whose header mentions shade/color
  if (!raw) {
    const k = Object.keys(row || {}).find((h) => /shade|color|colour/i.test(h));
    raw = k ? row[k] : '';
  }

  if (!raw) return [];
  return String(raw)
    .split(/[,|/]+/g)
    .map((s) => normalizeShade(s))
    .filter(Boolean);
};


// For display: which shades (from the job row list) are not yet generated at all
const getMissingShadesFromRowAgainstGenerated = (rowOrLot) => {
  const lot = typeof rowOrLot === 'string' ? normalizeLot(rowOrLot) : normalizeLot(getLotFromRow(rowOrLot));
  const expected = Array.isArray(rowOrLot) ? rowOrLot : getShadeListFromRow(rowOrLot);
  const genMap = generatedByLotShade[lot] || {};
  const missing = [];
  for (const sh of expected) if (!genMap[sh] || Number(genMap[sh]) <= 0) missing.push(sh);
  return missing;
};

  // Status: "Completed" when Cutting shades/qty == JSON (generated) shades/qty; else "Pending".
const getLotStatus = (rowOrLot) => {
  const lot = typeof rowOrLot === 'string' ? normalizeLot(rowOrLot) : getLotFromRow(rowOrLot);

  // Explicit complete → Completed
  if (isLotMarkedComplete(lot)) return 'Completed';

  const { set: expectedShades, fromCutting } = getExpectedShadesUnion(rowOrLot);
  const genMap = generatedByLotShade[lot] || {};

  // If we truly have no expectations and nothing generated, don't show status
  if (expectedShades.size === 0 && Object.keys(genMap).length === 0) return '';

  // Rule A: for shades that Cutting specifies with qty, Generated must match that exact qty
  for (const shade of Object.keys(fromCutting)) {
    if (Number(genMap[shade] || 0) !== Number(fromCutting[shade] || 0)) return 'Pending';
  }

  // Rule B: for shades coming only from the row (no Cutting qty), they must exist (>0) in Generated
  for (const shade of expectedShades) {
    if (!fromCutting[shade]) {
      if (!genMap[shade] || Number(genMap[shade]) <= 0) return 'Pending';
    }
  }

  // Rule C: no extra positive shades in Generated beyond what we expected
  for (const shade of Object.keys(genMap)) {
    if (!expectedShades.has(shade) && Number(genMap[shade] || 0) > 0) return 'Pending';
  }

  return 'Completed';
};

const getExpectedShadesUnion = (rowOrLot) => {
  const lot = typeof rowOrLot === 'string' ? normalizeLot(rowOrLot) : getLotFromRow(rowOrLot);

  // Cutting map: shade -> required qty
  const cuttingMap = {};
  for (const { shade, qty } of getPositiveQtyItemsForLot(lot)) {
    const k = normalizeShade(shade);
    const q = Number(qty) || 0;
    if (k && q > 0) cuttingMap[k] = (cuttingMap[k] || 0) + q;
  }

  // Row shades: only presence required (>0)
  const rowShades = typeof rowOrLot === 'object' ? getShadeListFromRow(rowOrLot) : [];
  const expSet = new Set([...Object.keys(cuttingMap), ...rowShades]);

  return { set: expSet, fromCutting: cuttingMap };
};


  const getLotPendingQtyNumber = (rowOrLot) =>
    getRemainingItemsForLot(rowOrLot).reduce((s, it) => s + it.qty, 0);

  const getLotPendingQtyDisplay = (row) => {
    const n = getLotPendingQtyNumber(row);
    return n > 0 ? n.toLocaleString('en-IN') : null;
  };

const getLotPendingShadesDisplay = (row) => {
  // First try Cutting-vs-Generated remainder
  const rem = getRemainingItemsForLot(row);
  if (rem.length) {
    const shades = [...new Set(rem.map((it) => it.shade))];
    return shades.length ? shades.join(', ') : null;
  }
  // Fallback: if Cutting didn’t help, show shades from the row that are not yet generated at all
  const missing = getMissingShadesFromRowAgainstGenerated(row);
  return missing.length ? missing.join(', ') : null;
};


  // ===== JobOrder aggregation (total, per shade, completeLot) =====
  const parseNum = (v) => {
    if (v == null) return 0;
    const n = Number(String(v).toString().replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  };

  const buildGeneratedMapsFromJobOrder = (rows, lotKeyName) => {
    const keys = rows.length ? Object.keys(rows[0]) : [];
    const headerByNorm = new Map(keys.map((k) => [normalizeHeader(k), k]));

    const challanTotalKey =
      headerByNorm.get('challan total qty') ||
      headerByNorm.get('challan total quantity') ||
      'Challan Total Qty';

    const challanItemsJSONKey =
      headerByNorm.get('challan items json') ||
      headerByNorm.get('challan items') ||
      'Challan Items JSON';

    const challanCompleteKey =
      headerByNorm.get('challan complete lot') ||
      headerByNorm.get('challan complete') ||
      'Challan Complete Lot';

    const totalByLot = {};
    const shadeByLot = {};   // { lot: { SHADE: qty } }
    const completeByLot = {};

    for (const r of rows) {
      const lot = normalizeLot(r[lotKeyName]);
      if (!lot) continue;

      // Total
      const t = parseNum(r[challanTotalKey]);
      if (t > 0) totalByLot[lot] = (totalByLot[lot] || 0) + t;

      // Complete-Lot flag
      const compRaw = String(r[challanCompleteKey] ?? '').trim().toLowerCase();
      const comp =
        compRaw === 'true' ||
        compRaw === 'yes' ||
        compRaw === 'y' ||
        compRaw === '1';
      if (comp) completeByLot[lot] = true;

      // Per-shade from JSON
      const j = r[challanItemsJSONKey];
      if (j && typeof j === 'string') {
        try {
          const parsed = JSON.parse(j);
          const items = Array.isArray(parsed?.items) ? parsed.items : [];
          for (const it of items) {
            const shadeKey = normalizeShade(it?.shade || '');
            const qty = parseNum(it?.qty);
            if (!shadeKey || qty <= 0) continue;
            if (!shadeByLot[lot]) shadeByLot[lot] = {};
            shadeByLot[lot][shadeKey] = (shadeByLot[lot][shadeKey] || 0) + qty;
          }
        } catch {
          // ignore malformed JSON
        }
      }
    }

    return { totalByLot, shadeByLot, completeByLot };
  };
  

  const fetchBoth = async () => {
    try {
      setLoading(true);
      setError('');
      setMatchedRows([]);
      setDisplayRows([]);
      setColumns([]);
      setPage(1);

      const [resCut, resSec] = await Promise.all([
        fetch(urls.cutting).then((r) => r.json()),
        fetch(urls.second).then((r) => r.json()),
      ]);

      if (resCut?.error) throw new Error(resCut.error.message || 'Cutting fetch error');
      if (resSec?.error) throw new Error(resSec.error.message || 'JobOrder fetch error');

      const cuttingVals = resCut.values || [];
      const sec = rowsToObjects(resSec.values);

      if (!cuttingVals.length) throw new Error('Cutting sheet returned no rows.');
      if (!sec.length) throw new Error('JobOrder returned no rows.');

      const secKey = findColumnKey(sec[0], [SOURCES.second.lotKey]);
      const embKey = findColumnKey(sec[0], ['Emb', 'Embroidery', 'Design', 'Design Name']);
      if (!secKey) throw new Error(`Could not find JobOrder lot column (${SOURCES.second.lotKey}).`);

      // Build Generated maps BEFORE filtering (use entire JobOrder to be safe)
      const { totalByLot, shadeByLot, completeByLot } = buildGeneratedMapsFromJobOrder(sec, secKey);
      setGeneratedByLotTotal(totalByLot);
      setGeneratedByLotShade(shadeByLot);
      setCompleteLotByLot(completeByLot);

      const { lots, itemsByLot } = parseCuttingSheet(cuttingVals);
      setCuttingItemsByLot(itemsByLot);

      const isNAish = (v) => {
        const s = String(v ?? '').trim().toLowerCase();
        return !s || s === 'na' || s === 'n/a' || s === '-' || s === 'not applicable';
      };

      const filtered = sec.filter((r) => {
        const lotOk = (() => {
          const v = normalizeLot(r[secKey]);
          return v && lots.has(v);
        })();
        if (!lotOk) return false;
        if (!embKey) return true;
        return !isNAish(r[embKey]);
      });

      const hiddenCols = new Set([
        'Direct Stitching',
        'Submitted By',
        'Image URL',
        'Printing',
        'Printing Details',
        'Challan Date',
        'Challan Submitted By',
      ]);

      const allCols = filtered.length ? Object.keys(filtered[0]).filter((c) => !hiddenCols.has(c)) : [];
      setColumns(allCols);

      const saved = (() => {
        try {
          return JSON.parse(localStorage.getItem(COLS_KEY) || 'null');
        } catch {
          return null;
        }
      })();
      const safeVisible = Array.isArray(saved) ? saved.filter((c) => allCols.includes(c)) : pickDefaultVisibleColumns(allCols);

      setVisibleCols(safeVisible);
      setMatchedRows(filtered);
      setDisplayRows(filtered);
    } catch (e) {
      setError(e.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.cutting, urls.second]);
  useEffect(() => {
  const initNotifications = async () => {
    const hasPermission = await requestNotificationPermission();
    setBrowserNotificationsEnabled(hasPermission);
    
    // Register service worker for background notifications
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }
  };
  
  initNotifications();
}, []);
const applyFilters = useMemo(
  () =>
    debounce((q, rows, cols) => {
      let next = rows;
      
      // Text search filter
      if (q.trim()) {
        const needle = q.toLowerCase();
        next = next.filter((row) => 
          cols.some((c) => String(row[c] ?? '').toLowerCase().includes(needle))
        );
      }
      
      next = next.filter((row) => {
        const materialStatus = getMaterialStatus(row);
        const embroideryStatus = getembroiderystatus(row);
        const pendingShades = getLotPendingShadesDisplay(row);
        const pendingQty = getLotPendingQtyNumber(row);
        
        // Keep row if ANY of these conditions are true:
        return !(
          embroideryStatus === 'Complete Emb' &&
          materialStatus === 'Material Received' &&
          (!pendingShades || pendingShades.trim() === '') &&
          pendingQty === 0
        );
      });

      setPage(1);
      setDisplayRows(next);
    }, 180),
  []
);

useEffect(() => {
  applyFilters(query, matchedRows, visibleCols.length ? visibleCols : columns);
}, [query, matchedRows, columns, visibleCols, applyFilters]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayRows.slice(start, start + pageSize);
  }, [displayRows, page, pageSize]);

  const renderCols = visibleCols.length ? visibleCols : columns;
const exportCSV = () => {
  if (!displayRows.length) return;
  
  // Enhanced CSV data with Material Status and Embroidery Status
  const enhancedRows = displayRows.map(row => {
    const rowData = { ...row };
    
    // Add Material Status
    const materialStatus = getMaterialStatus(row);
    rowData['Material Status'] = materialStatus || '';
    
    // Add Embroidery Status
    const embroideryStatus = getembroiderystatus(row);
    rowData['Embroidery Status'] = embroideryStatus || '';
    
    // Add Pending Qty and Generated Qty for reference
    const pendingQty = getLotPendingQtyNumber(row);
    rowData['Pending Qty'] = pendingQty > 0 ? pendingQty : '';
    
    const generatedQty = getLotGeneratedQtyTotal(row);
    rowData['Generated Challan Qty'] = generatedQty > 0 ? generatedQty : '';
    
    return rowData;
  });
  
  // Include the new columns in the export
  const exportColumns = [...renderCols, 'Material Status', 'Embroidery Status', 'Pending Qty', 'Generated Challan Qty'];
  
  const csv = toCSV(enhancedRows, exportColumns);
  const ts = new Date().toISOString().split('T')[0];
  download(`challan_matches_${ts}.csv`, csv);
};

  useEffect(() => {
    try {
      localStorage.setItem(BORDERS_KEY, JSON.stringify(showBorders));
    } catch {}
  }, [showBorders]);
  // Update the useEffect that creates notifications
useEffect(() => {
  if (matchedRows.length > 0) {
    const pendingChallans = matchedRows.filter(row => {
      const pendingQty = getLotPendingQtyNumber(row);
      return pendingQty > 0 && !isLotMarkedComplete(row);
    });
    
    const newNotifications = pendingChallans.map(row => ({
      id: Date.now() + Math.random(),
      type: 'pending',
      message: `Pending challan for Lot ${getLotFromRow(row)}`,
      lot: getLotFromRow(row),
      rowData: row,
      timestamp: new Date(),
      read: false
    }));
    
    setNotifications(prev => {
      const existingLotIds = prev.map(n => n.lot);
      const uniqueNew = newNotifications.filter(n => !existingLotIds.includes(n.lot));
      
      if (uniqueNew.length > 0) {
        playNotificationSound('pending');
        
        // Show browser notifications for new pending challans
        uniqueNew.forEach(showBrowserNotification);
      }
      
      return [...prev, ...uniqueNew];
    });
  }
}, [matchedRows]);
useEffect(() => {
  let notificationCheckInterval;
  
  if (autoRefresh) {
    notificationCheckInterval = setInterval(() => {
      // This would ideally check with a backend API for new notifications
      // For now, we'll just use the existing logic
      fetchBoth();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
  
  return () => {
    if (notificationCheckInterval) clearInterval(notificationCheckInterval);
  };
}, [autoRefresh]);
useEffect(() => {
  const unread = notifications.filter(n => !n.read).length;
  setUnreadCount(unread);
}, [notifications]);
const markAllAsRead = () => {
  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  setUnreadCount(0);
};

// Clear all notifications
const clearNotifications = () => {
  setNotifications([]);
  setUnreadCount(0);
};
useEffect(() => {
  // Create audio element
  const newAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbVtfdJivrJBhNjVgodDbq2EcBStztvLInFMcACFvq+bQpG8iABxqouLJqXUkABdmmNvDq3slABRgk9W+sIUlAA5ajNC7tY0lAAhXh8u5uJIlAANVg8i2uZUlAABTgMW1u5YlAABRf8S0vZclAABQfsOzvpglAABPfcKyv5klAABOfMGxwJolAABNe8CwwZslAABMer+vwqAlAABLeb6uw6ElAABLeL2txKIlAABLd7ysxaMlAABLdruqxqQlAABLdbqpx6UlAABLdLmoyKUlAABLc7ioyaUlAABLc7eoysUlAABLcreny8YlAABLcbaozMYlAABLcbWpzccmAABLcbSpz8gmAABLcbOq0MkmAABLcbKq0comAABLcbGq0ssmAABLcbCq1MwmAABLca+q1c0mAABLca6q1s4mAABLca2q188mAABLcayq2NAmAABLcauq2dEmAABLcaqq2tImAABLcamq29MmAABLcaiq3NQmAABLcaeq3dUmAABLcaaq3tYmAABLcaWq39cmAABLcaSq4NgmAABLcaOq4dkmAABLcaKq4tomAABLcaGq49smAABLcaCq5NwmAABLcZ+q5d0mAABLcZ6q5t4mAABLcZ2q598mAABLcZyq6OAmAABLcZuq6eEmAABLcZqq6uImAABLcZmq6+MmAABLcZiq7OQmAABLcZeq7eUmAABLcZaq7uYmAABLcZWq7+cmAABLcZSq8OgmAABLcZOq8ekmAABLcZKq8uomAABLcZGq8+smAABLcZCq9OwmAABLcY+q9e0mAABLcY6q9u4mAABLcY2q9+8mAABLcYyq+PAmAABLcYuq+fEmAABLcYqq+vImAABLcYmq+/MmAABLcYiq/PQmAABLcYeq/fUmAABLcYaq/vYmAABLcYWq//cnAABLcYSrAPgnAABLcYOrAfknAABLcYKrAvonAABLcYGrA/onAABLcYCrBPonAABLcX+rBfonAABLcX6rBvonAABLcX2rCPonAABLcXyrCfonAABLcXurCvonAABLcXqrC/onAABLcXmrDPonAABLcXirDfonAABLcXerDvonAABLcXarDvonAABLcXWrD/onAABLcXSrEPonAABLcXOrEfonAABLcXKrEvonAABLcXGrE/onAABLcXCrFPonAABLcW+rFfonAABLcW6rF/onAABLcW2rGPonAABLcWyrGfonAABLcWurGvonAABLcWqrG/onAABLcWmrHPonAABLcWirHfonAABLcWerHvonAABLcWarH/onAABLcWWrIPonAABLcWSrIfonAABLcWOrIvonAABLcWKrI/onAABLcWGrJPonAABLcWCrJfonAABLcV+rJ/onAABLcV6rKPorAABLcV2rKforAABLcVyrKvorAABLcVurK/orAABLcVqrLPorAABLcVmrLforAABLcVirLvorAABLcVerL/orAABLcVarMPorAABLcVWrMforAABLcVSrMvorAABLcVOrM/orAABLcVKrNPorAABLcVGrNforAABLcVCrNvorAABLcU+rN/orAABLcU6rOPorAABLcU2rOforAABLcUyrOvorAABLcUurO/orAABLcUqrPPr');
  newAudio.volume = 0.3;
  setAudio(newAudio);
  
  // Clean up on unmount
  return () => {
    if (newAudio) {
      newAudio.pause();
      newAudio.src = '';
    }
  };
}, []);

const playNotificationSound = (type = 'default') => {
  if (audio && audioEnabled) {
    // You could implement different sounds for different types here
    // For now, we'll use the same sound for all types
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Audio play failed:', e));
  }
};

const handleNotificationClick = (notification) => {
  setShowNotifications(false);
  // Find the row in the current display
  const rowIndex = displayRows.findIndex(row => 
    getLotFromRow(row) === notification.lot
  );
  
  if (rowIndex !== -1) {
    // Calculate which page this row is on
    const pageNumber = Math.floor(rowIndex / pageSize) + 1;
    setPage(pageNumber);
    
    // Optional: Highlight the row briefly
    const element = document.querySelector(`tr:nth-child(${rowIndex % pageSize + 1})`);
    if (element) {
      element.style.backgroundColor = 'rgba(91, 156, 255, 0.2)';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 2000);
    }
  }
};

  

const openChallanModal = (row) => {
  const lot = normalizeLot(String(row['Lot Number'] ?? row['Lot No.'] ?? row['Lot'] ?? ''));

  // Get ONLY remaining (pending) items: Cutting − Generated per-shade
  const remaining = getRemainingItemsForLot(lot);
  
  if (remaining.length > 0) {
    // Show only pending shades with their remaining quantities
    setItems(remaining.map((it) => ({ shade: it.shade, qty: String(it.qty) })));
  } else {
    // If no remaining items but lot is not marked complete, show empty row
    // If lot is marked complete, show empty but disabled
    if (isLotMarkedComplete(lot)) {
      setItems([{ shade: '', qty: '' }]);
    } else {
      // Fallback: try to get any shades from the row that haven't been generated
      const expectedShades = getShadeListFromRow(row);
      const generatedMap = generatedByLotShade[lot] || {};
      const missingShades = expectedShades.filter(shade => 
        !generatedMap[shade] || Number(generatedMap[shade]) <= 0
      );
      
      if (missingShades.length > 0) {
        setItems(missingShades.map(shade => ({ shade, qty: '' })));
      } else {
        setItems([{ shade: '', qty: '' }]);
      }
    }
  }

  setModalRow(row);
  setCompleteLot(false);
  setModalOpen(true);
};

  const closeChallanModal = () => {
    setModalOpen(false);
    setModalRow(null);
    setItems([{ shade: '', qty: '' }]);
    setCompleteLot(false);
  };

  const addItemRow = () => setItems((prev) => [...prev, { shade: '', qty: '' }]);
  const removeItemRow = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  
const handleCreateChallan = async (row, extras = {}) => {
  // ===== helpers & small constants =====
  const get = (key, fb = '-') => (row[key] ?? '').toString().trim() || fb;
  const first = (keys, fb = '-') => {
    for (const k of keys) {
      const v = (row[k] ?? '').toString().trim();
      if (v) return v;
    }
    return fb;
  };
  const parseNum = (v) => {
    const n = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const fmtNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString('en-IN') : (v ?? '-');
  };
  const normalizeShade = (s) => (s ?? '').toString().trim();
  const arrayBufferToBase64 = (buf) => {
    let binary = '';
    const bytes = new Uint8Array(buf);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  // ===== data extraction =====
  const jobOrder = first(['Job Order No', 'JobOrder', 'Job No']);
  const lot = first(['Lot Number', 'Lot No.', 'Lot']);
  const party = first(['Party Name', 'Party', 'Buyer', 'Customer']); 
  const qtySheet = first(['Quantity', 'Qty', 'Total Qty'], '0');
  const unit = first(['Unit', 'Units'], '');
  const remarks = first(['Remarks', 'Note'], '');
  const style = first(['Style', 'Style No', 'Style Name']);
  const emb = first(['Emb', 'Design', 'Design Name']);
  const embDet = first(['Emb Details', 'Embroidery Details']);
  const fabric = first(['Fabric', 'Fabric Type']);
  const size = first(['Size', 'Sizes']);
  const garmentType = first(['Garment Type', 'Garment', 'Gmt', 'Gmt Type'], '-');
  const brand = first(['Brand', 'Brand Name'], '-');

  // ===== helpers assumed available =====
  // getExistingChallanAggregateForLot, getChallanHistoryFromRow, reserveChallanNo, matchedRows, postJSON, APPSCRIPT_WEB_APP_URL, fetchBoth, loadImageAsBase64ForPdf

  // (A) existing aggregate for this lot
  const existing = getExistingChallanAggregateForLot(lot, matchedRows);

  // collect new items from extras
  const completeLotFlag = !!extras.completeLot;
  const newItems = Array.isArray(extras.items)
    ? extras.items
        .map(it => ({ shade: normalizeShade(it.shade || ''), qty: parseNum(it.qty) }))
        .filter(it => it.shade && it.qty > 0)
    : [];

  const newItemsTotal = newItems.reduce((s, it) => s + (Number(it.qty) || 0), 0);

  // ⬇️⬇️⬇️ KEY CHANGES HERE - SEPARATE PDF DISPLAY FROM DATA SAVING ⬇️⬇️⬇️
  
  // FOR PDF DISPLAY: Only show the new items being challaned now
  const pdfDisplayItems = newItems;
  const pdfDisplayTotal = newItemsTotal;

  // FOR SAVING: Merge with existing (keep your existing logic for database)
  const mergedMap = {};
  for (const it of existing.items) {
    const k = normalizeShade(it.shade || '');
    const q = parseNum(it.qty);
    if (!k || q <= 0) continue;
    mergedMap[k] = (mergedMap[k] || 0) + q;
  }
  for (const it of newItems) mergedMap[it.shade] = (mergedMap[it.shade] || 0) + it.qty;
  const mergedItems = Object.entries(mergedMap).map(([shade, qty]) => ({ shade, qty }));

  // (C) totals for saving
  const mergedTotal = completeLotFlag
    ? existing.totalQty + parseNum(qtySheet)
    : existing.totalQty + newItemsTotal;
  const mergedComplete = existing.completeLot || completeLotFlag;

  // challan no/date
  const now = new Date();
  let challanNo = first(['Challan No', 'Challan Number'], '').trim();
  if (!challanNo) {
    try { challanNo = await reserveChallanNo('CH-EMB-', 0); }
    catch { challanNo = await reserveChallanNo(); }
  }

  // ===== UPDATED CHALLAN COUNT SECTION =====
  const getChallanCountForLot = (lotNumber, baseChallanNo, challanHistory) => {
    if (!challanHistory || !Array.isArray(challanHistory)) return 0;
    
    let count = 0;
    challanHistory.forEach(entry => {
      if (entry.number && entry.number === baseChallanNo) {
        count++;
      }
    });
    
    return count;
  };

  const existingHistory = getChallanHistoryFromRow(row);
  const challanCount = getChallanCountForLot(lot, challanNo, existingHistory);
  const displayChallanNo = challanCount > 0 ? `${challanNo}(${challanCount + 1})` : challanNo;
  // ===== END UPDATED SECTION =====

  const fmtLong = (d) => {
    const day = d.getDate();
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };
  const challanDate = fmtLong(now);

  const MIN_TABLE_ROWS = 10;

  const generatedTimestamp = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());

  try {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    // Design tokens
    const M = 42;
    const FOOTER_H = 44;
    const GRID_COL_GAP = 20;
    const GRID_ROW_GAP = 18;
    const IMG_MAX = 900;
    const F = { h1: 30, h2: 22, h3: 18, body: 13, label: 11.5, meta: 10.5, small: 9.5 };
    const C = {
      primary: [0,0,0],
      accent: [0,0,0],
      dark: [0,0,0],
      grayDark: [0,0,0],
      gray: [0,0,0],
      white: [255,255,255],
      border: [0,0,0],
      tableHeader: [255,255,255],
      zebra: [250,250,250],
      highlight: [0,0,0],
    };

    const setFont = (doc, weight, size, color = C.dark) => {
      try { doc.setFont("Arial Black", weight); } catch (e) { doc.setFont("helvetica", weight); }
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
    const asText = (v) => (v == null || String(v).trim() === "" ? "—" : String(v).trim());
    const HIGHLIGHTS = new Set(["Lot Number","Garment Type","Priority"]);
    const isHighlighted = (label) => HIGHLIGHTS.has(String(label).trim());

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a3", compress: true, putOnlyUsedFonts: true });
    const PAGE = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };

    // Header & border
    doc.setFillColor(...C.white);
    doc.rect(0, 0, PAGE.w, 90, "F");
    doc.roundedRect(M, 70, PAGE.w - M * 2, PAGE.h - 160, 12, 12, "F");
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.8);
    doc.rect(12, 12, PAGE.w - 24, PAGE.h - 24);

    let y = 100;
    const contentW = () => PAGE.w - M * 2;

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.dark);
    doc.setLineWidth(1);
    doc.circle(M + 30, 60, 30, "FD");
    setFont(doc, "bold", 18, C.dark);
    doc.text("CH", M + 30, 67, { align: "center" });

    setFont(doc, "bold", 32, C.primary);
    doc.text("EMBROIDERY CHALLAN", PAGE.w / 2, 62, { align: "center" });

    setFont(doc, "bold", 18, C.dark);
    const lotText = `Lot No: ${lot || '—'}`;
    const challanText = `Challan No: ${displayChallanNo || challanNo || '—'}`;
    doc.text(`${lotText}   |   ${challanText}`, PAGE.w / 2, 90, { align: "center" });

    setFont(doc, "normal", F.meta, C.grayDark);
    doc.text(`Submitted by: ${localStorage.getItem('mh-user-name') || ''}`, PAGE.w - M, 118, { align: "right" });

    // ----- Order Summary box -----
    // ⬇️ FIX: Use pdfDisplayItems for Shade display instead of mergedItems
    const pairs = [
      { label: "Job Order No", value: jobOrder || '-' },
      { label: "Date", value: challanDate || '-' },
      { label: "Lot Number", value: lot || '-' },
      { label: "Fabric", value: first(['Fabric', 'Fabric Type']) || '-' },
      { label: "Brand", value: brand || '-' },
      { label: "Garment Type", value: garmentType || '-' },
      { label: "Section", value: first(['Section']) || '-' },
      { label: "Season", value: first(['Season']) || '-' },
      { label: "Shade", value: pdfDisplayItems && pdfDisplayItems.length ? pdfDisplayItems.map(it => it.shade).join(", ") : first(['Shade']) || '-' },
      { label: "Quantity", value: fmtNum(qtySheet || '0') },
      { label: "Unit", value: unit || '' },
      { label: "Style", value: style || '-' },
      { label: "Priority", value: first(['Priority']) || '-' },
      { label: "Pattern", value: first(['Pattern']) || '-' },
      { label: "Size", value: size || '-' },
      { label: "Embroidery", value: emb || '-' },
      { label: "Printing", value: first(['Printing']) || '-' },
      { label: "Direct Stitching", value: first(['Direct Stitching']) ? asText(first(['Direct Stitching'])) : '-' },
      { label: "Embroidery Details", value: embDet || '-' },
      { label: "Printing Details", value: first(['Printing Details']) || '-' },
      { label: "Component", value: first(['Component']) || '-' },
      { label: "Remarks", value: remarks || '-' },
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

    const boxX = M;
    const boxY = y;

    doc.setDrawColor(...C.border);
    doc.setFillColor(...C.white);
    doc.setLineWidth(1);
    doc.roundedRect(boxX, boxY, boxW, boxH, 8, 8, "FD");

    setFont(doc, "bold", F.h3, C.primary);
    doc.text("Order Summary", boxX + pad, boxY + pad + titleH - 6);

    const innerX = boxX + pad;
    const innerYStart = boxY + pad + titleH + titleGap;
    const colW = (boxW - pad * 2 - GRID_COL_GAP * (cols - 1)) / cols;

    let drawY = innerYStart;
    for (let i = 0; i < pairs.length; i += cols) {
      const rowSlice = pairs.slice(i, i + cols);
      rowSlice.forEach((p, idx) => {
        const x = innerX + idx * (colW + GRID_COL_GAP);
        setFont(doc, "bold", F.small, C.primary);
        doc.text((p.label || "").toUpperCase(), x, drawY);
        const isHL = isHighlighted(p.label);
        setFont(doc, "bold", F.small, isHL ? C.highlight : C.dark);
        const line = doc.splitTextToSize(asText(p.value), colW)[0] || "—";
        doc.text(line, x, drawY + 12);
      });
      drawY += rowHeight + rowGap;
    }

    y = boxY + boxH + GRID_ROW_GAP;

    // ------- Full Remarks & Image -------
    const colGap = GRID_COL_GAP;
    const colW2 = (contentW() - colGap) / 2;
    const leftX = M;
    const rightX = M + colW2 + colGap;
    const yTop = y;

    const remarksTextFull = remarks && remarks.trim() ? remarks : "No remarks provided";
    const padX = 18, padY = 16, labelH = F.label * 1.6;
    const maxWidth = colW2 - padX * 2;
    const linesRemarks = doc.splitTextToSize(remarksTextFull, maxWidth);
    const lineH = F.body * 1.45;
    const cardH = padY + labelH + 6 + Math.max(lineH, linesRemarks.length * lineH) + padY;
    doc.setDrawColor(...C.border); doc.setLineWidth(1.1);
    doc.setFillColor(...C.white); doc.roundedRect(leftX, yTop, colW2, cardH, 8, 8, "FD");
    setFont(doc, "bold", F.label, C.primary);
    doc.text("COMPLETE REMARKS", leftX + padX, yTop + padY);
    setFont(doc, "normal", F.body, C.dark);
    linesRemarks.forEach((t, i) => doc.text(t, leftX + padX, yTop + padY + labelH + 6 + i * lineH));

    const estRightH = Math.max(220, cardH);
    doc.setDrawColor(...C.border); doc.setLineWidth(1.1);
    doc.setFillColor(...C.white); doc.roundedRect(rightX, yTop, colW2, estRightH, 8, 8, "FD");
    setFont(doc, "bold", F.label, C.primary);
    doc.text("IMAGE", rightX + padX, yTop + padY);

    if (typeof loadImageAsBase64ForPdf === "function" && (row?.["Image URL"] || '').trim()) {
      try {
        const dataUrl = await loadImageAsBase64ForPdf(row["Image URL"], { maxWidth: IMG_MAX, maxHeight: IMG_MAX });
        if (dataUrl) {
          const p = doc.getImageProperties(dataUrl);
          const fitW = colW2 - 40, fitH = estRightH - (padY + labelH + 6) - 20;
          const ratio = Math.min(fitW / p.width, fitH / p.height);
          const iw = Math.max(1, p.width * ratio), ih = Math.max(1, p.height * ratio);
          const ix = rightX + (colW2 - iw) / 2;
          const iy = yTop + padY + labelH + 10 + (fitH - ih) / 2;
          doc.addImage(dataUrl, "JPEG", ix, iy, iw, ih);
        } else {
          setFont(doc, "normal", F.meta, C.grayDark);
          doc.text("No image provided / failed to load", rightX + colW2 / 2, yTop + estRightH / 2, { align: "center" });
        }
      } catch (err) {
        setFont(doc, "normal", F.meta, C.grayDark);
        doc.text("No image provided / failed to load", rightX + colW2 / 2, yTop + estRightH / 2, { align: "center" });
      }
    } else {
      setFont(doc, "normal", F.meta, C.grayDark);
      doc.text("No image provided", rightX + colW2 / 2, yTop + estRightH / 2, { align: "center" });
    }

    doc.setDrawColor(...C.border);
    doc.setLineWidth(1);
    doc.line(M + colW2 + colGap / 2, yTop + 6, M + colW2 + colGap / 2, Math.max(yTop + cardH, yTop + estRightH) - 6);

    y = Math.max(yTop + cardH, yTop + estRightH) + GRID_ROW_GAP;

    // ------- Cutting Schedule table (ONLY NEW ITEMS) -------
    // ⬇️ FIX: Use pdfDisplayItems instead of mergedItems for PDF display
    const shadesArr = (pdfDisplayItems || []).map(it => ({ shade: it.shade, qty: Number(it.qty) || 0 }));
    shadesArr.sort((a,b) => String(a.shade).localeCompare(String(b.shade)));

    const rowCount = Math.max(MIN_TABLE_ROWS, shadesArr.length);

    // Build table body
    const tableData = shadesArr.map((r, i) => [
      i + 1,
      r.shade,
      fmtNum(r.qty),
      challanDate
    ]);

    // Add empty rows if needed
    for (let i = tableData.length; i < rowCount; i++) {
      tableData.push([i + 1, '', '', '']);
    }

    // ===== Add TOTAL row =====
    // ⬇️ FIX: Use pdfDisplayTotal instead of mergedTotal for PDF display
    const totalQtyRow = [
      '',                 // Table # empty
      'TOTAL',            // Shade column shows "TOTAL"
      fmtNum(pdfDisplayTotal), // Quantity column - ONLY new items total
      ''                  // Date empty
    ];
    tableData.push(totalQtyRow);

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      head: [['Table', 'Shade', 'Quantity', 'Date of Issue']],
      body: tableData,
      styles: {
        fontSize: 10,
        cellPadding: 6,
        halign: 'center',
        valign: 'middle',
        lineWidth: 1,
        lineColor: [0,0,0],
        textColor: [0,0,0],
      },
      headStyles: {
        fillColor: [255,255,255],
        textColor: [0,0,0],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 48, halign: 'center' },
        1: { cellWidth: (PAGE.w - M*2) * 0.55, halign: 'center' },
        2: { cellWidth: (PAGE.w - M*2) * 0.15, halign: 'center' },
        3: { cellWidth: (PAGE.w - M*2) * 0.20, halign: 'center' },
      },
      margin: { left: M, right: M },
      tableWidth: PAGE.w - M * 2,
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          // Make TOTAL row bold + highlight
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    const finalTableY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY : (y + 200);

    const finalAfterTotalY = finalTableY + 18;

    // ---------- SIGNATURE LINES ----------
    const sigLineHeight = 1;
    const sigGap = 20;
    const sigBoxW = (contentW() - sigGap * 2) / 3;
    const bottomPreferredY = PAGE.h - FOOTER_H - 30;
    const sigY = Math.max(finalAfterTotalY + 18, bottomPreferredY);

    doc.setLineWidth(sigLineHeight);
    const sigLabels = ["Prepared By", "Verified By", "Receiver Signature"];
    for (let i = 0; i < 3; i++) {
      const x = M + i * (sigBoxW + sigGap);
      const lineX1 = x + 12;
      const lineX2 = x + sigBoxW - 12;
      doc.setDrawColor(...C.border);
      doc.line(lineX1, sigY, lineX2, sigY);
      setFont(doc, "bold", 10, C.dark);
      doc.text(sigLabels[i], x + sigBoxW / 2, sigY - 8, { align: "center" });
    }

    // Footer
    const totalPages = doc.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      setFont(doc, "normal", F.meta, C.grayDark);
      if (i === 1) {
        doc.text(`Page ${i} of ${totalPages}`, w - M - 360, h - FOOTER_H - 5, { align: "right" });
        // ⬇️ FIX: Use pdfDisplayTotal for footer display
        const totalQtyLabel = `Total Qty: ${fmtNum(pdfDisplayTotal)}${unit ? ` ${unit}` : ''}`;
        doc.text(totalQtyLabel, w - M - 200, h - FOOTER_H - 5, { align: "right" });
        doc.text(`Generated on: ${generatedTimestamp}`, w - M, h - FOOTER_H - 5, { align: "right" });
      } else {
        doc.text(`Page ${i} of ${totalPages}`, w - M, h - FOOTER_H - 5, { align: "right" });
      }
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.9);
      doc.line(M, h - FOOTER_H - 12, w - M, h - FOOTER_H - 12);
    }

    const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
    const filename = `Challan_${safe(lot || 'Challan')}_${safe(displayChallanNo || challanNo)}.pdf`;
    doc.save(filename);

    let pdfPart = null;
    try {
      const arr = doc.output('arraybuffer');
      const b64 = arrayBufferToBase64(arr);
      pdfPart = { name: filename, mimeType: 'application/pdf', base64: b64 };
    } catch { pdfPart = null; }

    const submittedBy = localStorage.getItem('mh-user-name') || '';
    const payload = {
      action: 'saveChallan',
      lotNumber: lot,
      challan: {
        number: challanNo,
        displayNumber: displayChallanNo,
        date: challanDate,
        items: mergedItems.map(it => ({ shade: it.shade, qty: it.qty })), // Keep merged for saving
        totalQty: mergedTotal, // Keep merged for saving
        completeLot: mergedComplete,
        by: submittedBy,
        pdf: pdfPart || undefined,
      },
      mergeStrategy: 'perShadeAdd',
    };

    try {
      const result = await postJSON(APPSCRIPT_WEB_APP_URL, payload);
      if (!result || !result.success) {
        console.warn('Apps Script write failed:', result);
        alert(result?.error || 'Could not update Google Sheet.');
      } else {
        fetchBoth();
      }
    } catch (err) {
      console.error(err);
      alert('PDF created, but saving challan to sheet failed.');
    }

  } catch (e) {
    console.error(e);
    alert('Failed to create challan PDF.');
  }
};






// --- helper: pull first non-empty value from row ---
const _firstFromRow = (row, keys, fb='-') => {
  for (const k of keys) {
    const v = (row?.[k] ?? '').toString().trim();
    if (v) return v;
  }
  return fb;
};
useEffect(() => {
  let intervalId;
  
  if (autoRefresh) {
    intervalId = setInterval(() => {
      fetchBoth();
    }, 30000); // Refresh every 5 minutes
  }
  
  return () => {
    if (intervalId) clearInterval(intervalId);
  };
}, [autoRefresh]);
useEffect(() => {
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);
// Add this useEffect for periodic reminders
useEffect(() => {
  let reminderInterval;
  
  if (unreadCount > 0 && audioEnabled) {
    // Play reminder sound every 5 minutes for unread notifications
    reminderInterval = setInterval(() => {
      playNotificationSound();
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  return () => {
    if (reminderInterval) clearInterval(reminderInterval);
  };
}, [unreadCount, audioEnabled]);

// Add this function to show browser notifications
// Update the browser notification function
const showBrowserNotification = (notification) => {
  if (browserNotificationsEnabled) {
    new Notification('Embroidery Challan', {
      body: notification.message,
      icon: '/icon-192x192.png', // Add an icon to your public folder
      tag: notification.lot, // Group notifications by lot
      requireInteraction: true // Keep notification visible until interacted with
    });
  }
};
// Add auto-refresh toggle to the toolbar


// === CLIENT-ONLY: Generate & Download PDF for a single history entry ===
const generateChallanPdfLocal = async (row, entry) => {
  // ===== BLACK THEME (match handleCreateChallan) =====
  const BASE = {
    ink: [0, 0, 0],
    muted: [0, 0, 0],
    line: [0, 0, 0],
    lineStrong: [0, 0, 0],
    headFill: [245, 245, 245],
    white: [255, 255, 255],
  };

  // ---------- helpers ----------
  const first = (keys, fb = '-') => {
    for (const k of keys) {
      const v = (row?.[k] ?? '').toString().trim();
      if (v) return v;
    }
    return fb;
  };
  const fmtNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString('en-IN') : (v ?? '-');
  };

  // ---------- data from row ----------
  const jobOrder    = first(['Job Order No','JobOrder','Job No']);
  const lot         = first(['Lot Number','Lot No.','Lot']);
  const party       = first(['Party Name','Party','Buyer','Customer']);
  const style       = first(['Style','Style No','Style Name']);
  const emb         = first(['Emb','Design','Design Name']);
  const embDet      = first(['Emb Details','Embroidery Details']);
  const fabric      = first(['Fabric','Fabric Type']);
  const size        = first(['Size','Sizes']);
  const garmentType = first(['Garment Type','Garment','Gmt','Gmt Type'], '-'); // "Item Name"
  const brand       = first(['Brand','Brand Name'], '-');
  const qtySheet    = first(['Quantity','Qty','Total Qty'], '0'); // used if completeLot
  const unit        = first(['Unit','Units'], '');
  const remarks     = first(['Remarks','Note'], '');

  // ---------- entry ----------
  const challanNo = (entry?.number || '').toString().trim() || 'CHALLAN';

  // ALWAYS today's date → "11 Sept 2025"
  const monthShortT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  const fmtDayMonYear = (d) => `${d.getDate()} ${monthShortT[d.getMonth()]} ${d.getFullYear()}`;
  const challanDate = fmtDayMonYear(new Date());

  const completeLotFlag = !!entry?.completeLot;

  const itemsFromEntry = Array.isArray(entry?.items)
    ? entry.items.map(it => ({
        shade: String(it?.shade || '').trim(),
        qty: Number(it?.qty) || 0
      })).filter(it => it.shade && it.qty > 0)
    : [];

  const totalItemsQty = itemsFromEntry.reduce((s, it) => s + it.qty, 0);
  const displayTotal  = completeLotFlag ? (Number(qtySheet) || 0)
                                        : (Number(entry?.totalQty) || totalItemsQty);

  // Only today's items; pad to exactly 10 rows
  const ROWS_PER_HALF = 10;
  const itemsCleanForDoc = completeLotFlag ? [] : itemsFromEntry;
  const rows10 = itemsCleanForDoc.slice(0, ROWS_PER_HALF).map(it => ({ shade: it.shade, qty: String(it.qty) }));
  while (rows10.length < ROWS_PER_HALF) rows10.push({ shade: '', qty: '' });

  // ---------- jsPDF + autotable ----------
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  // Draw one vertical half (left/right)
  const drawOneCopy = (doc, leftOffset, SCALE, copyLabel, rowsForHalf) => {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // half layout
    const padOuter = 10 * SCALE;
    const padInner = 10 * SCALE;
    const boxX = leftOffset + padOuter;
    const boxY = padOuter;
    const boxW = (pageW / 2) - padOuter * 2;
    const boxH = pageH - padOuter * 2;
    const boxBottom = boxY + boxH;

    const contentX = boxX + padInner;
    const contentW = boxW - padInner * 2;

    // border
    doc.setDrawColor(...BASE.lineStrong);
    doc.setLineWidth(0.9);
    doc.roundedRect(boxX, boxY, boxW, boxH, 6, 6);

    // caption
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5 * SCALE);
    doc.text(`${copyLabel} (Duplicate)`, boxX + boxW / 2, boxY + 12 * SCALE, { align: 'center' });

    // helpers
    const label = (t, x, yy) => {
      doc.setTextColor(...BASE.muted);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2 * SCALE);
      doc.text(t.toUpperCase(), x, yy);
    };
    const value = (t, x, yy, align = 'left', bold=false, size=10.2) => {
      doc.setTextColor(...BASE.ink);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size * SCALE);
      doc.text(String(t), x, yy, { align });
    };

    // ===== header (same look as handleCreateChallan) =====
    const HEAD_H = 54 * SCALE;
    const headY = boxY + 18 * SCALE;
    doc.setLineWidth(0.9);
    doc.roundedRect(contentX, headY, contentW, HEAD_H, 6, 6);

    // baseline alignment
    const baselineY = headY + 28 * SCALE;
    const leftX   = contentX + 12 * SCALE;
    const centerX = contentX + contentW / 2;
    const rightX  = contentX + contentW - 12 * SCALE;

    // title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.4 * SCALE);
    doc.text('EMBROIDERY CHALLAN', leftX, baselineY);

    // challan no (center)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2 * SCALE);
    doc.text('Challan No', centerX, baselineY - 12 * SCALE, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.2 * SCALE);
    doc.text(challanNo, centerX, baselineY, { align: 'center' });

    // date (right)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2 * SCALE);
    doc.text('Date', rightX, baselineY - 12 * SCALE, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.2 * SCALE);
    doc.text(challanDate, rightX, baselineY, { align: 'right' });

    // meta row
    const fy = headY + HEAD_H - 12 * SCALE;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.2 * SCALE);
    doc.text('Party:', contentX + 16 * SCALE, fy);
    doc.setFont('helvetica', 'normal'); doc.text(party, contentX + 56 * SCALE, fy);
    doc.setFont('helvetica', 'bold'); doc.text('Lot:', contentX + 220 * SCALE, fy);
    value(lot, contentX + 248 * SCALE, fy, 'left', true, 15.0);
    // If you want Total Qty here, uncomment:
    // doc.setFont('helvetica', 'bold'); doc.text('Total Qty:', contentX + 390 * SCALE, fy);
    // doc.setFont('helvetica', 'normal'); doc.text(`${fmtNum(displayTotal)}`, contentX + 448 * SCALE, fy);

    // ===== info grid =====
    const GRID_H = 70 * SCALE;
    const gridY = headY + HEAD_H + 8 * SCALE;
    const cols = 4, rows = 2;
    const colW = contentW / cols, rowH = GRID_H / rows;

    doc.setLineWidth(0.9);
    doc.roundedRect(contentX, gridY, contentW, GRID_H, 6, 6);
    for (let c = 1; c < cols; c++) doc.line(contentX + colW * c, gridY, contentX + colW * c, gridY + GRID_H);
    for (let r = 1; r < rows; r++) doc.line(contentX, gridY + rowH * r, contentX + contentW, gridY + rowH * r);

    const writeCell = (c, r, lab, val, boldVal=false) => {
      const x = contentX + colW * c, yy = gridY + rowH * r;
      label(lab, x + 7 * SCALE, yy + 14 * SCALE);
      value(val,  x + 7 * SCALE, yy + 32 * SCALE, 'left', boldVal);
    };

    // Row 1
    writeCell(0, 0, 'Job Order No', jobOrder);
    writeCell(1, 0, 'Item Name',    garmentType);
    writeCell(2, 0, 'Style',        style);
    writeCell(3, 0, 'Emb',          emb);
    // Row 2
    writeCell(0, 1, 'Size',         size);
    writeCell(1, 1, 'Fabric',       fabric);
    writeCell(2, 1, 'Emb Details',  embDet);
    writeCell(3, 1, 'Brand',        brand);

    // ===== remarks =====
    const REMARKS_H = 20 * SCALE;
    const remarksTop = gridY + GRID_H + 10 * SCALE;
    doc.setLineWidth(0.9);
    doc.roundedRect(contentX, remarksTop, contentW, REMARKS_H, 6, 6);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.4 * SCALE);
    doc.text('REMARKS:', contentX + 9 * SCALE, remarksTop + 15.5 * SCALE);
    const remTextX = contentX + 84 * SCALE;
    const remMaxW = contentW - (remTextX - contentX) - 9 * SCALE;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.4 * SCALE);
    const remLine = (doc.splitTextToSize(remarks || '-', remMaxW) || ['-'])[0];
    doc.text(remLine, remTextX, remarksTop + 15.5 * SCALE);

    // ===== Shade/Quantity table (COMPACT + page-safe) =====
    const GAP_AFTER_REMARKS = 10 * SCALE;
const tableStartY = remarksTop + REMARKS_H + GAP_AFTER_REMARKS;

// reserved space for signatures + footer (unchanged)
const SIG_H = 36 * SCALE;
const FOOTER_GAP = 14 * SCALE;
const SIG_BOTTOM_EXTRA = 10 * SCALE;

const usableBottom = boxBottom - SIG_H - FOOTER_GAP - SIG_BOTTOM_EXTRA;
const tableMaxHeight = Math.max(36 * SCALE, usableBottom - tableStartY);

// Bigger fonts & padding for better visibility
const headerFont = 12.6;
const bodyFont   = 11.2;
const pad        = 3.2;

// Make rows tall enough to consume the available height
const ROWS_PER_HALF = 10; // keep 10 rows as required
const headerReserve = (headerFont + pad * 2 + 4) * SCALE;
const footerReserve = (bodyFont   + pad * 2 + 6) * SCALE;
const availableForRows = Math.max(24 * SCALE, tableMaxHeight - headerReserve - footerReserve);
// const rowH = Math.max(14 * SCALE, availableForRows / ROWS_PER_HALF);

const itemsBody = rowsForHalf.map((it, i) => [i + 1, it.shade || '', fmtNum(it.qty || '')]);
const itemsTotal = rowsForHalf.reduce((s, r) => s + (Number(r.qty) || 0), 0);

const tableLeft = contentX + 4 * SCALE;
const tableWidth = (contentW - 8 * SCALE);
const tableRight = tableLeft + tableWidth;

// Keep the earlier narrower number/qty columns so Shade gets more width
const numColW  = 26 * SCALE;
const qtyColW  = 84 * SCALE;

window.jspdfAutoTablePrevious = undefined; // avoid carry-over

autoTable(doc, {
  startY: tableStartY,
  pageBreak: 'avoid',
  rowPageBreak: 'avoid',
  head: [['#', 'Shade', `Quantity${unit ? ` (${unit})` : ''}`]],
  body: itemsBody,
  foot: [[{ content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, fmtNum(itemsTotal)]],
  theme: 'grid',
  styles: {
    fontSize: bodyFont * SCALE,
    cellPadding: pad * SCALE,
    lineWidth: 1.0,
    lineColor: [0,0,0],
    textColor: [0,0,0],
    minCellHeight: rowH,              // ← key: rows expand to fill the space
  },
  headStyles: {
    fillColor: [255,255,255],
    textColor: [0,0,0],
    lineColor: [0,0,0],
    lineWidth: 1.1,
    fontStyle: 'bold',
    fontSize: headerFont * SCALE,     // ← larger header text
  },
  bodyStyles: { fillColor: [255,255,255], textColor: [0,0,0], lineColor: [0,0,0] },
  footStyles: { fillColor: [255,255,255], textColor: [0,0,0], lineColor: [0,0,0], fontStyle: 'bold' },
  margin: { left: tableLeft, right: doc.internal.pageSize.getWidth() - tableRight },
  tableWidth,
  tableLineColor: [0,0,0],
  tableLineWidth: 1.1,
  columnStyles: {
    0: { halign: 'center', cellWidth: numColW },
    2: { halign: 'right',  cellWidth: qtyColW },
    // Shade takes the remaining width
  },
});

    // ===== signatures =====
    const sigY = boxBottom - SIG_H - FOOTER_GAP - SIG_BOTTOM_EXTRA;
    const sigBoxW = (contentW - 24 * SCALE) / 3;

    doc.setLineWidth(0.9);
    ['Prepared By', 'Verified By', "Receiver’s Signature"].forEach((lab, i) => {
      const x = contentX + i * (sigBoxW + 12 * SCALE);
      doc.roundedRect(x, sigY, sigBoxW, SIG_H, 6, 6);
      doc.line(x + 12 * SCALE, sigY + SIG_H - 12 * SCALE, x + sigBoxW - 12 * SCALE, sigY + SIG_H - 12 * SCALE);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.8 * SCALE);
      doc.text(lab, x + sigBoxW / 2, sigY + SIG_H - 5 * SCALE, { align: 'center' });
    });

    // ===== footer =====
    doc.setDrawColor(...BASE.line);
    doc.setLineWidth(0.9);
    doc.line(contentX, boxBottom - 5 * SCALE, contentX + contentW, boxBottom - 5 * SCALE);
    doc.setFontSize(8.6 * SCALE);
    doc.text('Page 1 of 1', contentX + contentW, boxBottom, { align: 'right' });
    doc.text(
      `Prepared on ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`,
      contentX, boxBottom - 9 * SCALE
    );
  };

  // ---------- Build with a safe scale so both halves stay on ONE page ----------
  // (You can raise the first value if you want things larger; the compact table keeps it on one page.)
  const TRY_SCALES = [0.70, 0.68, 0.66, 0.64];
  let finalDoc = null;

  for (const SCALE of TRY_SCALES) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // left half
    drawOneCopy(doc, 0, SCALE, 'EMBROIDERY HEAD COPY', rows10);

    // vertical dotted divider
    const midX = pageW / 2;
    doc.setDrawColor(...BASE.lineStrong);
    if (doc.setLineDash) doc.setLineDash([3, 3], 0);
    doc.line(midX, 24, midX, pageH - 24);
    if (doc.setLineDash) doc.setLineDash([]);

    // right half
    drawOneCopy(doc, pageW / 2, SCALE, 'CUTTING HEAD COPY', rows10);

    if (doc.internal.getNumberOfPages() === 1) {
      finalDoc = doc;
      break;
    }
  }

  if (!finalDoc) {
    // fallback to smallest scale
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const SCALE = TRY_SCALES[TRY_SCALES.length - 1];

    drawOneCopy(doc, 0, SCALE, 'EMBROIDERY HEAD COPY', rows10);
    const midX = pageW / 2;
    doc.setDrawColor(...BASE.lineStrong);
    if (doc.setLineDash) doc.setLineDash([3, 3], 0);
    doc.line(midX, 24, midX, pageH - 24);
    if (doc.setLineDash) doc.setLineDash([]);
    drawOneCopy(doc, pageW / 2, SCALE, 'CUTTING HEAD COPY', rows10);

    finalDoc = doc;
  }

  // save
  const safeLot = (lot || 'Challan').replace(/[^\w\-]+/g, '_');
  const safeNo  = challanNo.replace(/[^\w\-]+/g, '_');
  finalDoc.save(`${safeNo}_${safeLot}.pdf`);
};

  const toggleCol = (col) => {
    setVisibleCols((prev) => {
      const has = prev.includes(col);
      const next = has ? prev.filter((c) => c !== col) : [...prev, col];
      try {
        localStorage.setItem(COLS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const setAllCols = () => {
    setVisibleCols(columns);
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify(columns));
    } catch {}
  };
  const clearAllCols = () => {
    setVisibleCols([]);
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify([]));
    } catch {}
  };
  const setDefaultCols = () => {
    const def = pickDefaultVisibleColumns(columns);
    setVisibleCols(def);
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify(def));
    } catch {}
  };
  

  const filteredColList = useMemo(() => {
    const q = colMgrSearch.trim().toLowerCase();
    if (!q) return columns;
    return columns.filter((c) => c.toLowerCase().includes(q));
  }, [columns, colMgrSearch]);

  return (
    <div className="mh-ec">
      {/* ===== Internal CSS (modern, responsive, dark-mode aware) ===== */}
    <style>{`
:root{
  --bg: #0b1020;
  --bg-soft: #0f1630;
  --panel: #10172a;
  --panel-2: #111a35;
  --ink: #e7ecf8;
  --ink-dim: #c7cbe0;
  --muted: #97a0b8;
  --brand: #5b9cff;
  --brand-2: #8b5bff;
  --ok: #22c55e;
  --warn: #f59e0b;
  --danger: #ef4444;
  --ring: 0 0 0 2px rgba(91,156,255,.35);
  --shadow-lg: 0 8px 30px rgba(0,0,0,.35);
  --shadow-md: 0 6px 20px rgba(0,0,0,.28);
  --shadow-sm: 0 2px 10px rgba(0,0,0,.25);
  --radius: 14px;
  --radius-sm: 10px;
  --radius-xs: 8px;
  --border: 1px solid rgba(0, 0, 0, 0.08);
  --glass: rgba(255,255,255,.06);
  --glass-2: rgba(255,255,255,.08);
  --gradient: linear-gradient(135deg,var(--brand),var(--brand-2));
  --table-border: rgba(255,255,255,.22);
  --table-border-strong: rgba(255,255,255,.28);
   --pending-strong: #ff4d6d;                 /* border/accent */
  --pending-mid:    #ff6b6b;                 /* header tint */
  --pending-weak:   rgba(255, 107, 107, .16);/* cell fill */
  --pending-weak-2: rgba(255, 77, 109, .36); /* cell border */
}
@media (prefers-color-scheme: light){
  :root{
    --bg:#f6f8ff; --bg-soft:#eef2ff; --panel:#ffffff; --panel-2:#fff;
    --ink:#0f172a; --ink-dim:#334155; --muted:#6b7280;
    --shadow-lg:0 12px 28px rgba(17,24,39,.12);
    --shadow-md:0 8px 20px rgba(17,24,39,.10);
    --shadow-sm:0 2px 10px rgba(17,24,39,.06);
    --border:1px solid rgba(2,6,23,.08);
    --glass: rgba(2,6,23,.04);
    --glass-2: rgba(2,6,23,.06);
    --table-border: rgba(2,6,23,.14);
    --table-border-strong: rgba(2,6,23,.20);
    --pending-strong: #e11d48;
    --pending-mid:    rgba(225, 29, 72, .14);
    --pending-weak:   rgba(225, 29, 72, .10);
    --pending-weak-2: rgba(225, 29, 72, .35);
  }
}

*{box-sizing:border-box}
html,body,#root{height:100%}
body{
  margin:0; background:
    radial-gradient(1800px 600px at 10% 0%, rgba(91,156,255,.18), transparent 60%),
    radial-gradient(900px 500px at 90% 10%, rgba(139,91,255,.18), transparent 60%),
    var(--bg);
  color:var(--ink);
  font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji','Segoe UI Emoji';
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
}
/* Pending Qty highlight */
th.col-pending{
  background:
    linear-gradient(180deg, var(--pending-mid), transparent),
    var(--panel-2);
  color: var(--ink);                           /* keeps text crisp */
  border-bottom-color: var(--pending-strong) !important;
  box-shadow: inset 0 -1px 0 var(--pending-strong);
}

/* Strong grid borders when table-bordered is on */
.table-bordered th.col-pending{
  border-color: var(--pending-strong) !important;
  border-bottom-color: var(--pending-strong) !important;
}
  /* Sound button styles */
.sound-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  border: var(--border);
  background: linear-gradient(180deg, var(--glass), transparent);
  color: var(--ink);
  cursor: pointer;
  transition: all 0.18s ease;
}

.sound-btn:hover {
  transform: translateY(-1px);
  background: linear-gradient(180deg, var(--glass-2), transparent);
}

/* Body cells when there IS pending qty */
td.col-pending.has{
  background: var(--pending-weak);
  box-shadow: inset 0 1px 0 var(--pending-mid);
  border-left: 1px solid var(--pending-weak-2);
  border-right: 1px solid var(--pending-weak-2);
}

/* With table-bordered on, reinforce the frame */
.table-bordered td.col-pending.has{
  border-color: var(--pending-weak-2) !important;
}
.job-order-modal {
  width: min(90vw, 1200px);
  max-height: 85vh;
}

.job-order-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
}

.job-order-field {
  background: linear-gradient(180deg, var(--glass), transparent);
  border: var(--border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.job-order-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.job-order-value {
  font-size: 14px;
  color: var(--ink);
  font-weight: 500;
  word-break: break-word;
}

.job-order-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--muted);
  font-style: italic;
}

.job-order-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px;
  border-top: 1px solid var(--border);
  background: linear-gradient(180deg, var(--glass), transparent);
}
.mh-ec{padding:28px 18px 60px; max-width:1800px; margin:0 auto}

/* HERO */
.hero{
  position:relative;
  margin-bottom:20px;
  border-radius: calc(var(--radius) + 6px);
  padding:24px;
  background:
    linear-gradient(180deg, var(--glass-2), transparent),
    radial-gradient(1800px 120px at 50% 0%, rgba(255,255,255,.08), transparent 70%),
    var(--panel);
  border:var(--border);
  box-shadow: var(--shadow-lg);
  overflow:hidden;
  isolation:isolate;
}
.hero-title{
  display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:8px;
}
.hero-title h1{ margin:0; font-size:26px; letter-spacing:.2px; }
.hero .back{
  padding:6px 10px; border-radius:10px; display:inline-flex; align-items:center; gap:6px;
}
.hero:before{
  content:''; position:absolute; inset:-2px;
  background:
    radial-gradient(600px 160px at 30% -10%, rgba(91,156,255,.25), transparent 60%),
    radial-gradient(600px 160px at 70% -10%, rgba(139,91,255,.25), transparent 60%);
  filter: blur(30px); opacity:.45; z-index:-1;
}
.hero .grid{display:grid; grid-template-columns:1fr auto; gap:18px; align-items:center}
.hero .topbar{display:flex; align-items:center; gap:8px; margin-bottom:8px}
.hero h1{margin:4px 0 8px; font-size:26px; letter-spacing:.2px}
.hero p{margin:0; color:var(--ink-dim)}
.kicker{
  position:absolute; top:14px; right:16px; font-weight:700; font-size:11px; letter-spacing:.6px;
  background:var(--gradient); -webkit-background-clip:text; background-clip:text; color:transparent;
}
.stat{
  background:linear-gradient(180deg,var(--glass), transparent), var(--panel-2);
  border:var(--border); padding:14px 16px; border-radius:var(--radius-sm);
  display:flex; flex-direction:column; align-items:flex-end; gap:4px; box-shadow:var(--shadow-sm);
}
.stat .num{font-size:22px; font-weight:800}
.stat .lbl{color:var(--muted); font-size:12px}

/* CARD / TOOLBAR */
.card{
  background: linear-gradient(180deg, rgba(255,255,255,.03), transparent), var(--panel);
  border:var(--border); border-radius:var(--radius); box-shadow:var(--shadow-md);
  padding:14px; display:flex; flex-direction:column; overflow:visible;
}
.toolbar{
  display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:12px;
  padding:8px; border-radius:var(--radius-sm);
  background:linear-gradient(180deg,var(--glass),transparent);
}
.rel{position:relative}

/* BUTTONS */
.btn{
  --pad-x:12px;
  appearance:none; border:var(--border); color:var(--ink);
  background:linear-gradient(180deg,var(--glass),transparent);
  padding:8px var(--pad-x); border-radius:10px; cursor:pointer; transition:.18s ease;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
}
.btn:hover{transform:translateY(-1px); background:linear-gradient(180deg,var(--glass-2),transparent)}
.btn:focus-visible{outline:0; box-shadow: var(--ring)}
.btn:disabled{opacity:.55; cursor:not-allowed}
.btn-primary{
  background:var(--gradient); border:1px solid transparent; color:#fff; box-shadow:0 6px 16px rgba(91,156,255,.35);
}
.btn-primary:hover{filter:saturate(1.05) brightness(1.02)}
.btn-ghost{ background:transparent; border:1px dashed rgba(255,255,255,.18) }
.btn-row{padding:6px 8px}

/* INPUTS */
.input, .select{
  width:100%; padding:10px 12px; border-radius:10px; border:var(--border);
  background:linear-gradient(180deg,var(--glass), transparent); color:var(--ink);
  outline:0; transition:.18s ease; box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
}
.input:focus, .select:focus{box-shadow: var(--ring)}
.chk{width:18px; height:18px; accent-color:#5b9cff; vertical-align:middle}

/* SEARCH */
.search-wrap{
  display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:12px;
  border:var(--border); background:linear-gradient(180deg,var(--glass),transparent);
}
.search{all:unset; width:100%; font-size:14px; line-height:1.3; color:var(--ink)}
.search::placeholder{color:var(--muted)}

/* COLUMN MANAGER POPOVER */
.cmgr-panel{
  position:absolute; top:calc(100% + 8px); right:0; width:420px; max-width:92vw;
  background:var(--panel); border:var(--border); border-radius:16px; padding:12px;
  box-shadow:var(--shadow-lg); z-index:30;
}
.cmgr-grid{
  margin-top:10px; max-height:42vh; overflow:auto;
  display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px;
  padding:6px; border-radius:12px; background:linear-gradient(180deg,var(--glass),transparent);
}
.cmgr-item{display:flex; gap:10px; align-items:center; padding:8px; border-radius:10px; transition:.18s ease}
.cmgr-item:hover{background:var(--glass)}
.cmgr-actions{display:flex; gap:8px; align-items:center; margin-top:10px}
.fill{flex:1}

/* ===== TABLE (FULL SCROLL BOTH AXES) ===== */
.table-wrap{
  /* full scroll in both directions */
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  /* vertical size of scrolling area */
  max-height: clamp(420px, 68vh, 86vh);
  border-radius:12px;
  border:var(--border);
  background: var(--panel-2);
}
table.minw{
  width:100%;
  min-width: 1100px;                 /* allow horizontal scroll on small screens */
  border-collapse: separate;         /* sticky header is more reliable with separate */
  border-spacing:0;
  background:var(--panel-2);
}
thead th{
  position:sticky; top:0; z-index:5;
  background:
    linear-gradient(180deg, rgba(7, 0, 105, 0.04), transparent),
    var(--panel-2);
  text-align:left; font-size:12px; letter-spacing:.4px; color:var(--ink-dim);
  padding:12px 14px;
  border-bottom:1px solid var(--table-border-strong);
}
tbody td{
  padding:12px 14px; color:var(--ink);
  border-bottom:1px solid var(--table-border);
  border-right:1px solid var(--table-border);
  vertical-align:top;
  word-break: break-word;
}
tbody td:last-child{ border-right:none; }
tbody tr{transition:.16s ease}
tbody tr:nth-child(even){ background: rgba(255,255,255,.03); }
tbody tr:hover{background:rgba(255,255,255,.05)}

/* stronger chrome when Borders toggle is ON, without breaking sticky header */
.table-bordered .table-wrap{
  border: 1px solid var(--table-border-strong);
  box-shadow: var(--shadow-sm);
}
.table-bordered thead th,
.table-bordered tbody td{
  border-right:1px solid var(--table-border);
}
.table-bordered thead th{ border-bottom:1px solid var(--table-border-strong); }
.table-bordered tbody td{ border-bottom:1px solid var(--table-border); }

/* nice desktop scrollbars (mobile keeps native) */
@media (pointer: fine){
  .table-wrap::-webkit-scrollbar{ height:10px; width:10px }
  .table-wrap::-webkit-scrollbar-thumb{ background:rgba(255,255,255,.18); border-radius:10px }
  .table-wrap::-webkit-scrollbar-track{ background:transparent }
}

/* PAGER */
.pager{
  display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 4px 0;
  color:var(--muted)
}
.page-badge{
  min-width:32px; text-align:center; padding:6px 8px; border-radius:999px;
  background:linear-gradient(180deg,var(--glass),transparent); color:var(--ink); border:var(--border);
}
.small{font-size:12px; color:var(--muted)}

/* ALERT */
.alert{
  margin:12px 0 16px; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.16);
  background:linear-gradient(180deg, rgba(239,68,68,.16), rgba(239,68,68,.06));
  color:#fee2e2; box-shadow:var(--shadow-sm);
}

/* EMPTY */
.empty{padding:40px 12px; text-align:center; color:var(--muted)}
.empty .emoji{font-size:34px; margin-bottom:6px}
.empty h3{margin:6px 0 6px; letter-spacing:.2px}

/* SKELETON */
.sk{padding:6px}
.sk-line{
  height:38px; margin:8px 0; border-radius:10px;
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent) 0 0/200% 100%,
    rgba(255,255,255,.04);
  animation: sk 1.2s infinite;
}
@keyframes sk{to{background-position: -200% 0}}

.footnote{margin-top:10px; color:var(--muted)}

/* BACK NAV */
.back{
  all:unset; cursor:pointer; color:var(--ink); font-weight:600; padding:6px 10px; border-radius:10px;
  background:linear-gradient(180deg,var(--glass),transparent); border:var(--border)
}
.back:hover{transform:translateY(-1px)}

/* ===== MODALS (generic) ===== */
.backdrop{
  position:fixed; inset:0; background:rgba(2,6,23,.55); backdrop-filter:saturate(1.2) blur(6px);
  display:grid; place-items:center; z-index:50; padding:16px;
}
  /* inline button spinner for 'Mark as received' */
.spin{
  width:14px; height:14px;
  border:2px solid rgba(255,255,255,.35);
  border-top-color:#fff;
  border-radius:50%;
  display:inline-block; vertical-align:-2px; margin-right:8px;
  animation:spin .8s linear infinite;
}
@keyframes spin{ to{ transform: rotate(360deg) } }

.modal{
  width:min(820px, 96vw); background:var(--panel); border:var(--border); border-radius:18px;
  box-shadow: var(--shadow-lg); overflow:hidden; display:flex; flex-direction:column;
  animation: pop .18s ease-out;
}
@keyframes pop{from{transform:translateY(8px) scale(.98); opacity:0} to{transform:none; opacity:1}}
.modal-h, .modal-f{display:flex; gap:10px; align-items:center; padding:12px 14px; background:linear-gradient(180deg,var(--glass),transparent)}
.modal-h{justify-content:space-between; border-bottom:1px solid rgba(255,255,255,.08)}
.modal-b{padding:14px}

/* Items table inside create-challan modal */
table.items{
  width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; border-radius:12px; border:var(--border)
}
table.items thead th{
  background:linear-gradient(180deg, rgba(255,255,255,.04), transparent), var(--panel-2);
  padding:10px 12px; text-align:left; font-size:12px; color:var(--ink-dim)
}
table.items tbody td{padding:8px 12px; border-top:1px solid rgba(255,255,255,.06)}
table.items tr:hover{background:rgba(255,255,255,.03)}

/* ===== CHALLAN HISTORY DIALOG ===== */
.hist-modal{
  width:min(1240px, 96vw);
  max-height: 100%;
  display:flex; flex-direction:column;
}
.hist-body{
  max-height: min(66vh, calc(100vh - 260px));
  overflow:auto;
  -webkit-overflow-scrolling: touch;
  padding:0;
}
.hist-cards{
  margin:0; padding:14px;
  display:grid; gap:12px;
}
.hist-card{
  background:linear-gradient(180deg,var(--glass),transparent), var(--panel-2);
  border:var(--border); border-radius:14px; box-shadow:var(--shadow-sm); overflow:hidden;
}
.hist-card-head{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap:10px 14px;
  padding:12px 12px 6px;
  border-bottom:1px solid var(--table-border);
}
.hc-line{ display:flex; gap:6px; align-items:center; min-height:24px }
.hc-label{ color:var(--muted); font-size:10px; letter-spacing:.3px }
.hc-val{ color:var(--ink); font-weight:700 }
.hist-items-wrap{ overflow:auto; -webkit-overflow-scrolling: touch; }
.hist-items{
  width:100%; min-width:360px;
  border-collapse: separate; border-spacing:0;
}
  /* Notification styles */
.notification-item {
  padding: 10px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item.unread {
  background-color: rgba(91, 156, 255, 0.1);
}

.notification-item:hover {
  background-color: var(--glass);
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: var(--danger);
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}
.hist-items thead th{
  text-align:left; font-size:12px; color:var(--ink-dim);
  background:linear-gradient(180deg, rgba(255,255,255,.04), transparent), var(--panel-2);
  padding:10px 12px; position:sticky; top:0; z-index:1;
  border-bottom:1px solid var(--table-border-strong);
}
.hist-items tbody td{ padding:10px 12px; border-bottom:1px solid var(--table-border) }
.hist-noitems{ padding:12px; color:var(--muted); font-size:12px }

/* RESPONSIVE (keep all columns, rely on horizontal scroll) */
@media (max-width: 980px){
  .hero .grid{grid-template-columns:1fr}
  .stat{align-items:flex-start}
}
  

`}</style>

      <div className="shell">
        {/* Header / Hero */}
     <div className="hero">
  <div className="grid">
    <div>
      {/* Title row: back + heading on the same line */}
      <div className="hero-title">
        <button className="back" onClick={() => window.history.back()} title="Back">← Back</button>
        <h1>Challan Embroidery Matchboard</h1>
      </div>

      {/* <p>
        Shows rows from <b>{SOURCES.second.TAB_NAME}</b> whose <i>Lot</i> exists in <b>{SOURCES.cutting.TAB_NAME}</b>.
        By default only <b>necessary</b> headers are shown. Use <b>Columns</b> to add more.
      </p> */}
    </div>
            <div className="stat">
              <div className="num">{matchedRows.length.toLocaleString()}</div>
              <div className="lbl">Matched Rows</div>
            </div>
            <span className="kicker">Embroidery Suite</span>
          </div>
        </div>

        {error && (
          <div role="alert" className="alert">⚠️ {error}</div>
        )}

        {/* Card */}
        <section className={`card ${showBorders ? 'table-bordered' : ''}`} aria-label="Results">
          <div className="toolbar rel">
            <label className="search-wrap" style={{ flex: '1 1 380px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 21l-4.2-4.2" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="11" cy="11" r="7" stroke="#64748b" strokeWidth="1.8" />
              </svg>
              <input
                className="search"
                placeholder="Search everything…"
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Global search"
              />
            </label>

            <div style={{ position: 'relative' }}>
              {/* <button className="btn btn-ghost" onClick={() => setColMgrOpen((v) => !v)} title="Manage columns">
                ☰ Columns
              </button> */}
              {/* {colMgrOpen && (
                <div className="cmgr-panel" role="dialog" aria-modal="true" aria-label="Column Manager">
                  <div className="row" style={{ display:'flex', gap: 8, alignItems: 'stretch' }}>
                    <input
                      className="input cmgr-search"
                      placeholder="Search columns…"
                      value={colMgrSearch}
                      onChange={(e) => setColMgrSearch(e.target.value)}
                    />
                    <button className="btn" onClick={setDefaultCols} title="Show only necessary columns">
                      Default
                    </button>
                  </div>
                  <div className="cmgr-grid" role="listbox" aria-label="Columns">
                    {filteredColList.map((c) => (
                      <label key={c} className="cmgr-item" role="option" aria-selected={visibleCols.includes(c)}>
                        <input
                          type="checkbox"
                          className="chk"
                          checked={visibleCols.includes(c)}
                          onChange={() => toggleCol(c)}
                          style={{ accentColor: '#5b9cff' }}
                        />
                        <span>{c}</span>
                      </label>
                    ))}
                    {!filteredColList.length && (
                      <div style={{ padding: '8px', color: 'var(--muted)' }}>No columns match.</div>
                    )}
                  </div>
                  <div className="cmgr-actions">
                    <button className="btn" onClick={setAllCols}>Select all</button>
                    <button className="btn" onClick={clearAllCols}>Clear all</button>
                    <div className="fill" />
                    <button className="btn btn-primary" onClick={() => setColMgrOpen(false)}>Done</button>
                  </div>
                </div>
              )} */}
            </div>

            <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                className="chk"
                checked={showBorders}
                onChange={(e) => setShowBorders(e.target.checked)}
                aria-label="Toggle table borders"
              />
              Borders
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                className="select"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                aria-label="Rows per page"
                title="Rows per page"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>

              <button className="btn btn-ghost" onClick={exportCSV} disabled={!displayRows.length} title="Export CSV">
                ⭳ Export
              </button>
              <button className="btn btn-primary" onClick={fetchBoth} title="Refresh">
                ⟳ Refresh
              </button>

              <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
  <input
    type="checkbox"
    className="chk"
    checked={autoRefresh}
    onChange={(e) => setAutoRefresh(e.target.checked)}
    aria-label="Auto refresh"
  />
  Auto Refresh
</label>
            </div>
            <div style={{ position: 'relative' }}>

  <button 
    className="btn" 
    onClick={() => setShowNotifications(!showNotifications)}
    title="Notifications"
    style={{ position: 'relative' }}
  >
    🔔
    {unreadCount > 0 && (
      <span style={{
        position: 'absolute',
        top: '-5px',
        right: '-5px',
        backgroundColor: 'var(--danger)',
        color: 'white',
        borderRadius: '50%',
        width: '18px',
        height: '18px',
        fontSize: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold'
      }}>
        {unreadCount}
      </span>
    )}
  </button>
  
  {showNotifications && (
    <div className="cmgr-panel" style={{ width: '360px', right: 0 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px',
        paddingBottom: '10px',
        borderBottom: '1px solid var(--border)'
      }}>
        <h4 style={{ margin: 0 }}>Notifications</h4>
        <div>
          {unreadCount > 0 && (
            <button 
              className="btn" 
              onClick={markAllAsRead}
              style={{ padding: '4px 8px', marginRight: '5px' }}
            >
              Mark all read
            </button>
          )}
          <button 
            className="btn" 
            onClick={clearNotifications}
            style={{ padding: '4px 8px' }}
          >
            Clear all
          </button>
        </div>
      </div>
      
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
            No notifications
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              style={{
                padding: '10px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                backgroundColor: notification.read ? 'transparent' : 'rgba(91, 156, 255, 0.1)',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--glass)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = notification.read ? 'transparent' : 'rgba(91, 156, 255, 0.1)';
              }}
            >
              <div style={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                {notification.message}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '5px' }}>
                {new Date(notification.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )}
</div>
          </div>
      


          {/* Table */}
          {loading ? (
            <div className="sk">
              <div className="sk-line" style={{ height: 44 }} />
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="sk-line" />)}
            </div>
          ) : !displayRows.length ? (
            <div className="empty">
              <div className="emoji">🧵</div>
              <h3>No results</h3>
              <p>Try clearing the search or refreshing the data.</p>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="minw">
        <thead>
  <tr>
    {renderCols.map((c) => (<th key={c}>{c}</th>))}
    <th>Pending Challan Shades</th>
    <th>Pending Qty</th>
    <th>Generated Challan Qty</th>

    {/* ⬇️ NEW */}
    <th>Material Status</th>
     <th>Embroidery Status</th>

    <th>Challan History</th>
    <th>Challan</th>
    <th>Job Order</th>
  </tr>
</thead>



                <tbody>
  {paginated.map((row, i) => {
  const pendingShades = getLotPendingShadesDisplay(row);
  const pendingQty = getLotPendingQtyDisplay(row);
  const generatedQty = getLotGeneratedQtyTotal(row);
  const status = getLotStatus(row);
  const hist = getChallanHistoryFromRow(row);
  const histCount = hist.length;

  // ⬇️ NEW
  const materialStatus = getMaterialStatus(row);
  const embstatus=getembroiderystatus(row);

  return (
    <tr key={i}>
      {renderCols.map((c) => (
        <td key={c} data-label={c}>{row[c]}</td>
      ))}

      <td data-label="Pending Challan Shades">{pendingShades ?? ''}</td>
      {(() => {
        const pNum = getLotPendingQtyNumber(row);
        const hasPending = Number(pNum) > 0;
        return (
          <td
            data-label="Pending Qty"
            className={`col-pending ${hasPending ? 'has' : ''}`}
            title={hasPending ? `${pNum.toLocaleString('en-IN')} pending` : ''}
          >
            {pendingQty ?? ''}
          </td>
        );
      })()}

      <td data-label="Generated Challan Qty">
        {generatedQty > 0 ? generatedQty.toLocaleString('en-IN') : ''}
      </td>

      {/* ⬇️ NEW Material Status cell */}
      <td data-label="Material Status">
        {materialStatus ? (
          <span
            style={{
              display:'inline-block',
              padding:'4px 8px',
              borderRadius:8,
              fontSize:12,
              fontWeight:700,
              letterSpacing:'.2px',
              background: materialStatus === 'Material Received'
                ? 'rgba(34,197,94,.15)'
                : 'rgba(245,158,11,.15)',
              border: '1px solid ' + (materialStatus === 'Material Received'
                ? 'rgba(34,197,94,.35)'
                : 'rgba(245,158,11,.35)'),
              color: materialStatus === 'Material Received' ? '#22c55e' : '#f59e0b',
            }}
            title={materialStatus}
          >
            {materialStatus}
          </span>
        ) : ''}
      </td>
      {/* ⬇️ NEW Material Status cell */}
      <td data-label="Embroidery Status">
        {embstatus ? (
          <span
            style={{
              display:'inline-block',
              padding:'4px 8px',
              borderRadius:8,
              fontSize:12,
              fontWeight:700,
              letterSpacing:'.2px',
              background: embstatus === 'Complete Emb'
                ? 'rgba(34,197,94,.15)'
                : 'rgba(245,158,11,.15)',
              border: '1px solid ' + (embstatus === 'Complete Emb'
                ? 'rgba(34,197,94,.35)'
                : 'rgba(245,158,11,.35)'),
              color: embstatus === 'Complete Emb' ? '#22c55e' : '#f59e0b',
            }}
            title={embstatus}
          >
            {embstatus}
          </span>
        ) : ''}
      </td>

      {/* existing cells */}
      <td data-label="Challan History">
        <button
          className="btn"
          onClick={() => openHistoryDialog(row)}
          disabled={!histCount}
          title={histCount ? 'View challan history' : 'No history yet'}
        >
          {histCount ? `View (${histCount})` : '—'}
        </button>
      </td>

      <td data-label="Challan">
        <button
          className="btn btn-primary"
          style={{ height: 32, padding: '0 10px', borderRadius: 8 }}
          onClick={() => openChallanModal(row)}
          disabled={!getRemainingItemsForLot(row).length && isLotMarkedComplete(row)}
          title={!getRemainingItemsForLot(row).length && isLotMarkedComplete(row) ? 'Lot complete' : 'Create Challan'}
        >
          Create Challan
        </button>
      </td>
      <td data-label="Job Order">
  <button
    className="btn"
    onClick={() => openJobOrderDialog(row)}
    title="View complete job order details"
    style={{ 
      padding: '6px 12px', 
      fontSize: '12px',
      background: 'linear-gradient(180deg, var(--glass), transparent)',
      border: 'var(--border)'
    }}
  >
    View Job Order
  </button>
</td>
    </tr>
  );
})}

</tbody>


                </table>
              </div>

              <div className="pager">
                <span className="small">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, displayRows.length)} of {displayRows.length}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button className="btn btn-ghost" onClick={() => setPage(1)} disabled={page === 1}>« First</button>
                  <button className="btn btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
                  <span className="page-badge">{page}</span>
                  <button className="btn btn-ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
                  <button className="btn btn-ghost" onClick={() => setPage(totalPages)} disabled={page === totalPages}>Last »</button>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="footnote">
          Tip: Only necessary headers are shown by default. Use <b>Columns</b> to reveal more; your choice is saved automatically.
        </div>
      </div>
{historyOpen && historyRow && (
  <div
    className="backdrop"
    onClick={(e) => { if (e.target === e.currentTarget) closeHistoryDialog(); }}
  >
    <div
      className="modal hist-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mh-ec-history-title"
      onKeyDown={(e) => { if (e.key === 'Escape') closeHistoryDialog(); }}
      style={{ maxWidth: '1440px' }}  // a bit wider so tables breathe
    >
 <div className="modal-h" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
  <h3
    id="mh-ec-history-title"
    style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '.2px' }}
  >
    Challan History — Lot {String(historyRow['Lot Number'] ?? historyRow['Lot'] ?? '').toString()}
  </h3>
  <button
    className="btn"
    style={{ width: 36, padding: 0, textAlign: 'center' }}
    onClick={closeHistoryDialog}
    aria-label="Close"
  >
    ×
  </button>
</div>
      {/* Scrollable body (both axes) */}
      <div
        className="modal-b hist-body"
        style={{
          maxHeight: 'min(72vh, calc(100vh - 220px))',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {(() => {
          const entriesRaw = getChallanHistoryFromRow(historyRow);
          if (!entriesRaw.length) return <div className="empty">No history available.</div>;
const entries = entriesRaw
  .map((e, i) => ({
    ...e,
    __idx: i,                           // original array index ✅
    __date: parseDateLoose(e?.date) || new Date(0),
  }))
  .sort((a, b) => b.__date - a.__date || b.__idx - a.__idx);


          return (
            <ol className="hist-cards" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
              {entries.map((e, i) => {
                const items = Array.isArray(e?.items)
                  ? e.items
                      .filter(it => it && it.shade && (parseNum(it.qty) > 0))
                      .map(it => ({ shade: normalizeShade(it.shade), qty: parseNum(it.qty) }))
                  : [];

                const onDownload = () => generateChallanPdfLocal(historyRow, e);

                // ---- Loading key for this entry (lot + challan) ----
                const lotId   = String(historyRow['Lot Number'] ?? historyRow['Lot'] ?? '').toString();
                const entryId = `${lotId}__${e?.number || i}`;

                // Mark/unmark handler with loading indicator
                const toggleReceived = async () => {
  try {
    setMarkingReceivedId(entryId);
    const res = await setChallanReceivedDate({
      lotNumber: lotId,
      challanNumber: e?.number,
     historyIndex: e?.__idx,      // <— NEW: tell backend which entry to touch
      setNow: !e?.receivedDate,
    });
    if (!res?.success) {
      alert(res?.error || 'Failed to update received date.');
    } else {
      fetchBoth();
    }
  } catch {
    alert('Failed to update received date.');
  } finally {
    setMarkingReceivedId(null);
  }
};


                return (
                  <li
                    key={`${e?.number || 'CH'}-${e?.date || ''}-${i}`}
                    className="hist-card"
                    style={{
                      border: 'var(--border)',
                      background: 'linear-gradient(180deg,var(--glass),transparent)',
                      borderRadius: 12,
                      boxShadow: 'var(--shadow-sm)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Head row */}
                    <div
                      className="hist-card-head"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, minmax(0,1fr)) auto', // +1 column for Received Date
                        gap: 10,
                        padding: '12px 12px',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255,255,255,.08)'
                      }}
                    >
                      <div className="hc-line">
                        <span className="hc-label">Challan No</span><br />
                        <span className="hc-val" style={{ fontWeight: 700 }}>{e?.number || '—'}</span>
                      </div>
                      <div className="hc-line">
                        <span className="hc-label">Date</span><br />
                        <span className="hc-val">{fmtDate(e?.date)}</span>
                      </div>
                      {/* <div className="hc-line">
                        <span className="hc-label">By</span><br />
                        <span className="hc-val">{e?.by || '—'}</span>
                      </div> */}
                      <div className="hc-line">
                        <span className="hc-label">Type</span><br />
                        <span className="hc-val">{e?.completeLot ? 'Complete Lot' : 'Partial'}</span>
                      </div>
                      <div className="hc-line">
                        <span className="hc-label">Total</span><br />
                        <span className="hc-val">{parseNum(e?.totalQty).toLocaleString('en-IN')}</span>
                      </div>

                      {/* Received Date display (presence = received) */}
                      <div className="hc-line">
                        <span className="hc-label">Received Date</span><br />
                        <span className="hc-val">{e?.receivedDate ? fmtDate(e.receivedDate) : '—'}</span>
                      </div>
                        <div className="hc-line">
  <span className="hc-label">Emb Status</span><br />
  <span className="hc-val">
    {e?.embCompleted ? 'Completed' : 'Pending'}
    {e?.embUpdatedAt ? ` • ${fmtDate(e.embUpdatedAt)}` : ''}
  </span>
</div>

                      {/* Actions */}
                      <div className="hc-actions" style={{ textAlign: 'right', display:'flex', gap:8, justifyContent:'flex-end' }}>
                        <button
                          className="btn"
                          onClick={toggleReceived}
                          title={e?.receivedDate ? 'Clear received date' : 'Mark as received (sets today)'}
                          disabled={markingReceivedId === entryId}
                        >
                          {markingReceivedId === entryId ? (
                            <><span className="spin" aria-hidden="true" />Updating…</>
                          ) : (
                            e?.receivedDate ? 'Unmark' : 'Mark as received'
                          )}
                        </button>
                        {/* Toggle Emb Completed */}
<button
  className="btn"
  onClick={async () => {
    try {
      const lotId = String(historyRow['Lot Number'] ?? historyRow['Lot'] ?? '').toString();
      const entryId = `${lotId}__${e?.number || i}__emb`;
      setMarkingEmbId(entryId);

      const res = await setChallanEmbStatus({
        lotNumber: lotId,
        challanNumber: e?.number,
        historyIndex: e?.__idx,              // precise index we computed
        embCompleted: !e?.embCompleted,      // toggle
      });

      if (!res?.success) {
        alert(res?.error || 'Failed to update Emb status.');
      } else {
        fetchBoth(); // refresh grid + history
      }
    } catch {
      alert('Failed to update Emb status.');
    } finally {
      setMarkingEmbId(null);
    }
  }}
  title={e?.embCompleted ? 'Clear Emb completed' : 'Mark Emb as completed'}
  disabled={markingEmbId === `${String(historyRow['Lot Number'] ?? historyRow['Lot'] ?? '')}__${e?.number || i}__emb`}
>
  {markingEmbId === `${String(historyRow['Lot Number'] ?? historyRow['Lot'] ?? '')}__${e?.number || i}__emb`
    ? (<><span className="spin" aria-hidden="true" />Updating…</>)
    : (e?.embCompleted ? 'Unmark Emb' : 'Mark Emb Completed')}
</button>

                        <button className="btn btn-primary" onClick={onDownload} title="Download PDF for this challan">
                          Generate PDF
                        </button>
                      </div>
                    </div>

                    {/* Items table */}
                    {items.length ? (
                      <div
                        className="hist-items-wrap"
                        style={{
                          overflow: 'auto',               // both axes scrollable
                          WebkitOverflowScrolling: 'touch'
                        }}
                      >
                        <table
                          className="hist-items"
                          style={{
                            width: '100%',
                            minWidth: 420,                // allow horizontal scroll on small screens
                            borderCollapse: 'separate',
                            borderSpacing: 0
                          }}
                        >
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>Shade</th>
                              <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((it, k) => (
                              <tr key={k}>
                                <td style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.06)' }}>{it.shade}</td>
                                <td style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.06)', textAlign: 'right' }}>
                                  {it.qty.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="hist-noitems" style={{ padding: 12, color: 'var(--muted)' }}>
                        No item rows (Complete Lot or none provided)
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          );
        })()}
      </div>

      <div className="modal-f" style={{ position: 'sticky', bottom: 0, zIndex: 2 }}>
        <button className="btn btn-primary" onClick={closeHistoryDialog}>Close</button>
      </div>
    </div>
  </div>
)}

      {/* Modal */}

{modalOpen && (
  <div
    className="backdrop"
    onClick={(e) => { if (e.target === e.currentTarget) closeChallanModal(); }}
  >
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mh-ec-challan-title" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      <div className="modal-h">
        <h3 id="mh-ec-challan-title" style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '.2px' }}>
          Challan Items
        </h3>
        <button className="btn" style={{ width: 36, padding: 0, textAlign: 'center' }} onClick={closeChallanModal} aria-label="Close">
          ×
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="modal-b" style={{ overflow: 'auto', flex: 1, maxHeight: 'calc(90vh - 120px)' }}>
        {/* Summary strip: Cutting / Pending / Generated */}
        {(() => {
          const lot = modalRow ? getLotFromRow(modalRow) : '';
          const posItems = lot ? getPositiveQtyItemsForLot(lot) : [];
          const cuttingTotal = posItems.reduce((s, it) => s + it.qty, 0);
          const generated = getLotGeneratedQtyTotal(lot);
          const remainingItems = getRemainingItemsForLot(lot);
          const pending = remainingItems.reduce((s, it) => s + it.qty, 0);
          const shades = remainingItems.length
            ? [...new Set(remainingItems.map(i => i.shade).filter(Boolean))]
            : [];

          return (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                alignItems: 'center',
                padding: '10px 12px',
                marginBottom: 10,
                borderRadius: 12,
                border: 'var(--border)',
                background: 'linear-gradient(180deg,var(--glass),transparent)'
              }}
              aria-live="polite"
            >
              <strong style={{ color: 'var(--ink)' }}>Status:</strong>
              <div style={{ color: 'var(--ink-dim)', display:'flex', gap:12, flexWrap:'wrap' }}>
                <span><b>Cutting Total:</b> {cuttingTotal ? cuttingTotal.toLocaleString('en-IN') : '–'}</span>
                <span><b>Generated:</b> {generated ? generated.toLocaleString('en-IN') : '–'}</span>
                <span><b>Pending:</b> {pending ? pending.toLocaleString('en-IN') : (isLotMarkedComplete(lot) ? 'Complete' : '–')}</span>
                <span><b>Pending Shades:</b> {shades.length ? shades.join(', ') : (isLotMarkedComplete(lot) ? '—' : '—')}</span>
              </div>
            </div>
          );
        })()}

        <div className="row" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <input
            id="mh-ec-completeLot"
            className="chk"
            type="checkbox"
            checked={completeLot}
            onChange={(e) => setCompleteLot(e.target.checked)}
          />
          <label htmlFor="mh-ec-completeLot" style={{ fontWeight: 700, color: 'var(--ink)' }}>
            Complete Lot (no item details)
          </label>
          <div className="fill" />
          {completeLot && <span className="small">Items table is disabled when Complete Lot is checked.</span>}
        </div>

        <div style={{ overflow: 'auto', maxHeight: '300px' }}>
          <table
            className="items"
            role="table"
            aria-label="Shades and Quantities"
            aria-disabled={completeLot}
            style={completeLot ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            <thead>
              <tr>
                <th style={{ width: 52, textAlign: 'center', position: 'sticky', top: 0, background: 'var(--panel-2)' }}>#</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--panel-2)' }}>Shade</th>
                <th style={{ width: 140, position: 'sticky', top: 0, background: 'var(--panel-2)' }}>Quantity</th>
                <th style={{ width: 60, position: 'sticky', top: 0, background: 'var(--panel-2)' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td>
                    <input
                      className="input"
                      placeholder="e.g. Navy Blue"
                      value={it.shade}
                      onChange={(e) => updateItem(idx, 'shade', e.target.value)}
                      autoFocus={idx === 0}
                      disabled={completeLot}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 120"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                      disabled={completeLot}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-ghost btn-row"
                      onClick={() => removeItemRow(idx)}
                      title="Remove"
                      aria-label={`Remove row ${idx + 1}`}
                      disabled={items.length === 1 || completeLot}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row" style={{ display:'flex', alignItems:'center', marginTop:10 }}>
          <button className="btn btn-ghost" onClick={addItemRow} disabled={completeLot}>＋ Add row</button>
          <div className="fill" />
          <span className="small">Tip: This pre-fills only the pending (remaining) shades and quantities.</span>
        </div>
      </div>

      <div className="modal-f" style={{ position: 'sticky', bottom: 0, background: 'var(--panel)' }}>
        <button className="btn" onClick={closeChallanModal}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (!modalRow) return;
            if (completeLot) {
              handleCreateChallan(modalRow, { completeLot: true, items: [] });
              closeChallanModal();
              return;
            }
            const cleanItems = items
              .map((it) => ({ shade: String(it.shade || '').trim(), qty: String(it.qty || '').trim() }))
              .filter((it) => it.shade || it.qty);
            handleCreateChallan(modalRow, { completeLot: false, items: cleanItems });
            closeChallanModal();
          }}
        >
          Create PDF
        </button>
      </div>
    
    </div>
  </div>
)}
  {/* Job Order Dialog */}
{jobOrderDialogOpen && selectedJobOrder && (
  <div
    className="backdrop"
    onClick={(e) => { if (e.target === e.currentTarget) closeJobOrderDialog(); }}
  >
    <div
      className="modal job-order-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-order-dialog-title"
      onKeyDown={(e) => { if (e.key === 'Escape') closeJobOrderDialog(); }}
      style={{ 
        width: '90%',
        maxWidth: '1200px',
        margin: '20px auto'
      }}
    >
      <div className="modal-h">
        <h3 id="job-order-dialog-title" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
          Job Order Details - Lot {getLotFromRow(selectedJobOrder)}
        </h3>
        <button
          className="btn"
          style={{ width: 36, padding: 0, textAlign: 'center' }}
          onClick={closeJobOrderDialog}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="modal-b" style={{ overflow: 'auto', maxHeight: 'calc(85vh - 120px)' }}>
        {selectedJobOrder ? (
          <div className="job-order-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {/* Selected Headers Only */}
            {[
              { key: 'Job Order No', label: 'Job Order No.' },
              { key: 'Fabric', label: 'FABRIC' },
              { key: 'Brand', label: 'BRAND' },
              { key: 'Shade', label: 'SHADE' },
              { key: 'Garment Type', label: 'GARMENT TYPE' },
              { key: 'Section', label: 'SECTION' },
              { key: 'Season', label: 'SEASON' },
              { key: 'Emb', label: 'EMB' },
              { key: 'Emb Details', label: 'EMB DETAILS' },
              { key: 'Pattern', label: 'PATTERN' },
              { key: 'Style', label: 'STYLE' },
              { key: 'Component', label: 'COMPONENT' },
              { key: 'Bottom Type', label: 'BOTTOM TYPE' },
              { key: 'Tape/Lace', label: 'TAPE/LACE' },
              { key: 'Remarks', label: 'REMARKS' },
              { key: 'Image URL', label: 'IMAGE URL' }
            ].map(({ key, label }) => {
              const value = selectedJobOrder[key];
              
              // Special handling for Remarks (make it multi-line)
              if (key === 'Remarks' && value) {
                return (
                  <div key={key} className="job-order-field" style={{ 
                    gridColumn: 'span 2',
                    minWidth: '100%'
                  }}>
                    <div className="job-order-label">{label}</div>
                    <div className="job-order-value" style={{
                      minHeight: '60px',
                      padding: '8px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '4px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {String(value).trim() || '—'}
                    </div>
                  </div>
                );
              }
              
              // Special handling for Image URL
              if (key === 'Image URL' && value) {
                return (
                  <div key={key} className="job-order-field" style={{ 
                    gridColumn: 'span 2',
                    minWidth: '100%'
                  }}>
                    <div className="job-order-label">{label}</div>
                    <div className="job-order-value">
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => window.open(value, '_blank')}
                          style={{ 
                            padding: '8px 16px', 
                            fontSize: '13px',
                            alignSelf: 'flex-start'
                          }}
                        >
                          View Full Image
                        </button>
                        
                        {/* Image Preview */}
                        <div style={{
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '8px',
                          backgroundColor: 'var(--bg-secondary)',
                          maxWidth: '400px'
                        }}>
                          <div style={{ 
                            fontSize: '12px', 
                            color: 'var(--muted)', 
                            marginBottom: '8px' 
                          }}>
                            Preview:
                          </div>
                          <img 
                            src={value} 
                            alt="Garment preview" 
                            style={{
                              maxWidth: '100%',
                              maxHeight: '200px',
                              objectFit: 'contain',
                              borderRadius: '4px'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML += `
                                <div style="color: var(--danger); font-size: 12px; padding: 8px;">
                                  Image failed to load
                                </div>
                              `;
                            }}
                          />
                        </div>
                        
                        <div style={{ 
                          fontSize: '11px', 
                          color: 'var(--muted)', 
                          wordBreak: 'break-all',
                          fontFamily: 'monospace'
                        }}>
                          {value}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Regular fields
              return (
                <div key={key} className="job-order-field" style={{
                  minHeight: '60px'
                }}>
                  <div className="job-order-label" style={{
                    fontWeight: '600',
                    fontSize: '13px',
                    marginBottom: '6px'
                  }}>
                    {label}
                  </div>
                  <div className="job-order-value" style={{
                    padding: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '4px',
                    minHeight: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    wordBreak: 'break-word'
                  }}>
                    {value && String(value).trim() !== '' ? String(value) : (
                      <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="job-order-empty">No job order data available</div>
        )}
      </div>

      <div className="modal-f" style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '16px',
        borderTop: '1px solid var(--border)',
        gap: '12px'
      }}>
        <button 
          className="btn" 
          onClick={closeJobOrderDialog}
          style={{
            padding: '8px 24px'
          }}
        >
          Close
        </button>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            // Add print or export functionality here if needed
            window.print();
          }}
          style={{
            padding: '8px 24px'
          }}
        >
          Print Details
        </button>
      </div>
    </div>
  </div>
)}
    </div>

  );
};

export default EmbroideryChallan;
