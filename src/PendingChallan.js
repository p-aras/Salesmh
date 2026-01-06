// src/pages/PendingChallans.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';

/* ===========================
   CONFIG
   =========================== */
const API_KEY = 'AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk';
const APPSCRIPT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbz1k9jfPQ7sbBqJggliaUTcyqSHThkPHSjrP7dfD0nLHXDozD-gIKSad3A9Yp6M1jTJlw/exec';

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
  /** Index sheet used to derive 24h aging (Lot + Shade -> Saved At) */
  index: {
    SHEET_ID: '1Hj3JeJEKB43aYYWv8gk2UhdU6BWuEQfCg5pBlTdBMNA', // set to your Index Google Sheet ID
    TAB_NAME: 'Index',                                    // columns: Lot Number | ... | Shades | Saved At
    RANGE: 'A1:Z',
    lotKey: 'Lot Number',
    shadesKey: 'Shades',
    savedAtKey: 'Saved At',
  },
};

// Overdue threshold: 24 hours
const OVERDUE_HOURS = 24;

const buildSheetsUrl = (sheetId, tabName, range, apiKey) => {
  const encodedRange = encodeURIComponent(`${tabName}!${range}`);
  return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?key=${apiKey}`;
};

const rowsToObjects = (values = []) => {
  if (!values?.length) return [];
  const [rawHeaders, ...rows] = values;

  const seen = new Set();
  const keys = rawHeaders.map((h, idx) => {
    let base = String(h || '').trim();
    if (!base) base = `Column ${idx + 1}`;
    const low = base.toLowerCase();
    if (low === 'date') base = 'Order Date';
    if (low === 'submitted by') base = 'Submitted By';

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

const normalizeLot = (v) =>
  String(v ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '').trim();

const normalizeShade = (s) =>
  String(s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

const findColumnKey = (rowObj, desiredKeyCandidates = []) => {
  const keys = Object.keys(rowObj || {});
  if (!keys.length) return null;

  for (const cand of desiredKeyCandidates)
    if (Object.prototype.hasOwnProperty.call(rowObj, cand)) return cand;

  const normMap = new Map(
    keys.map((k) => [k.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(), k])
  );
  for (const cand of desiredKeyCandidates) {
    const n = cand.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (normMap.has(n)) return normMap.get(n);
  }

  for (const k of keys)
    if (/\blot\b/.test(k.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()))
      return k;
  return null;
};

// --- Date parsing + age helpers ---
const parseDateLoose = (v) => {
  if (!v) return null;
  const s = String(v).trim();

  // Try native Date.parse first (handles many formats)
  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;

  // dd/MM/yyyy or dd-MM-yyyy
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [_, dd, mm, yy] = m;
    const yyyy = yy.length === 2 ? Number(yy) + 2000 : Number(yy);
    return new Date(yyyy, Number(mm) - 1, Number(dd));
  }

  // yyyy/MM/dd or yyyy-MM-dd
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const [_, yyyy, mm, dd] = m;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }

  // dd MMM yyyy (15 Sept 2025)
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const [_, dd, monStr, yyyy] = m;
    const monthNames = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11,
    };
    const mm = monthNames[monStr.toLowerCase()];
    if (mm != null) return new Date(Number(yyyy), mm, Number(dd));
  }

  return null;
};

const hoursDiff = (fromDate, to = new Date()) => {
  if (!(fromDate instanceof Date) || Number.isNaN(fromDate)) return null;
  const ms = to.getTime() - fromDate.getTime();
  return Math.max(0, Math.floor(ms / 3600000)); // whole hours
};

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
    const colorCol = lowerRow.findIndex(
      (s) =>
        s === 'color' ||
        s === 'colour' ||
        s === 'shade' ||
        s === 'shade color' ||
        s === 'shade colour'
    );

    const totalCol = lowerRow.findIndex(
      (s) => /total\s*pcs/.test(s) || s === 'total' || s === 'total qty' || s === 'qty total'
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

const parseNum = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).toString().replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

const buildGeneratedMapsFromJobOrder = (rows, lotKeyName) => {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const headerByNorm = new Map(
    keys.map((k) => [k.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(), k])
  );

  const challanTotalKey =
    headerByNorm.get('challan total qty') ||
    headerByNorm.get('challan total quantity') ||
    'Challan Total Qty';

  const challanItemsJSONKey =
    headerByNorm.get('challan items json') ||
    headerByNorm.get('challan items') ||
    'Challan Items JSON';

  const challanHistoryKey =
    headerByNorm.get('challan history json') || 'Challan History JSON';

  const challanCompleteKey =
    headerByNorm.get('challan complete lot') ||
    headerByNorm.get('challan complete') ||
    'Challan Complete Lot';

  const totalByLot = {};
  const shadeByLot = {};
  const completeByLot = {};
  const lastDateByLotShade = {};

  for (const r of rows) {
    const lot = normalizeLot(r[lotKeyName]);
    if (!lot) continue;

    const t = parseNum(r[challanTotalKey]);
    if (t > 0) totalByLot[lot] = (totalByLot[lot] || 0) + t;

    const compRaw = String(r[challanCompleteKey] ?? '')
      .trim()
      .toLowerCase();
    const comp =
      compRaw === 'true' || compRaw === 'yes' || compRaw === 'y' || compRaw === '1';
    if (comp) completeByLot[lot] = true;

    // aggregate generated qty by shade
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
      } catch {}
    }

    // LAST challan date per shade from history (kept in case you need it)
    const h = r[challanHistoryKey];
    if (h && typeof h === 'string') {
      try {
        const histArr = JSON.parse(h);
        if (Array.isArray(histArr)) {
          for (const entry of histArr) {
            const d = parseDateLoose(entry?.date);
            if (!d) continue;
            const items = Array.isArray(entry?.items) ? entry.items : [];
            for (const it of items) {
              const shadeKey = normalizeShade(it?.shade || '');
              if (!shadeKey) continue;
              if (!lastDateByLotShade[lot]) lastDateByLotShade[lot] = {};
              const prev = lastDateByLotShade[lot][shadeKey];
              if (!prev || d > prev) lastDateByLotShade[lot][shadeKey] = d;
            }
          }
        }
      } catch {}
    }
  }

  return { totalByLot, shadeByLot, completeByLot, lastDateByLotShade };
};

/* ===========================
   Misc helpers
   =========================== */
const numberFormatIN = (n) => Number(n || 0).toLocaleString('en-IN');
const uniqueSorted = (arr) =>
  Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b))
  );

/* === Index helpers for Saved At by Lot+Shade === */
const splitMulti = (val) =>
  String(val ?? '')
    .split(/[,/|]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

const toUpperShade = (s) =>
  String(s || '').trim().replace(/\s+/g, ' ').toUpperCase();

/** Build { [lot]: { [SHADE]: Date } } from Index rows */
const buildSavedAtMapFromIndex = (rows, lotKey, shadesKey, savedAtKey) => {
  const map = {};
  if (!Array.isArray(rows) || rows.length === 0) return map;

  const keys = Object.keys(rows[0] || {});
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const idx = new Map(keys.map((k) => [norm(k), k]));

  const lotK = idx.get(norm(lotKey)) || lotKey;
  const shadesK = idx.get(norm(shadesKey)) || shadesKey;
  const savedK = idx.get(norm(savedAtKey)) || savedAtKey;

  for (const r of rows) {
    const lot = normalizeLot(r[lotK]);
    if (!lot) continue;

    const when = parseDateLoose(r[savedK]);
    if (!when) continue;

    const shades = splitMulti(r[shadesK]).map(toUpperShade);
    if (!shades.length) continue;

    if (!map[lot]) map[lot] = {};
    for (const sh of shades) {
      const prev = map[lot][sh];
      // Keep earliest "Saved At" for that (lot, shade) — change < to > to keep latest
      map[lot][sh] = !prev || when < prev ? when : prev;
    }
  }
  return map;
};

/* ===========================
   COMPONENT
   =========================== */
const PendingChallans = () => {
  const [matchedRows, setMatchedRows] = useState([]);
  const [cuttingItemsByLot, setCuttingItemsByLot] = useState({});
  const [generatedByLotShade, setGeneratedByLotShade] = useState({});
  const [completeLotByLot, setCompleteLotByLot] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Track expanded lots (for “View shades”)
  const [expandedLots, setExpandedLots] = useState(() => new Set());

  // Filters / UI state
  const [search, setSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [embFilter, setEmbFilter] = useState('');
  const [minPending, setMinPending] = useState('');
  const [maxPending, setMaxPending] = useState('');
  const [sortBy, setSortBy] = useState('lot'); // 'lot' | 'pendingAsc' | 'pendingDesc'
  const [dense, setDense] = useState(false);

  // lot -> SHADE -> Date(Saved At)
  const [savedAtByLotShade, setSavedAtByLotShade] = useState({});

  const urls = useMemo(
    () => ({
      cutting: buildSheetsUrl(
        SOURCES.cutting.SHEET_ID,
        SOURCES.cutting.TAB_NAME,
        SOURCES.cutting.RANGE,
        API_KEY
      ),
      second: buildSheetsUrl(
        SOURCES.second.SHEET_ID,
        SOURCES.second.TAB_NAME,
        SOURCES.second.RANGE,
        API_KEY
      ),
      index: buildSheetsUrl(
        SOURCES.index.SHEET_ID,
        SOURCES.index.TAB_NAME,
        SOURCES.index.RANGE,
        API_KEY
      ),
    }),
    []
  );

  const getLotFromRow = (row) =>
    normalizeLot(String(row['Lot Number'] ?? row['Lot No.'] ?? row['Lot'] ?? ''));

  const getPositiveQtyItemsForLot = useCallback(
    (rowOrLot) => {
      const lot =
        typeof rowOrLot === 'string' ? normalizeLot(rowOrLot) : getLotFromRow(rowOrLot);
      const items = cuttingItemsByLot[lot] || [];
      return items
        .map((it) => ({
          shade: String(it.shade || '').trim(),
          qty: Number(it.qty) || 0,
        }))
        .filter((it) => it.qty > 0);
    },
    [cuttingItemsByLot]
  );

  const isLotMarkedComplete = useCallback(
    (rowOrLot) => {
      const lot =
        typeof rowOrLot === 'string' ? normalizeLot(rowOrLot) : getLotFromRow(rowOrLot);
      return !!completeLotByLot[lot];
    },
    [completeLotByLot]
  );

  const getRemainingItemsForLot = useCallback(
    (rowOrLot) => {
      const lot =
        typeof rowOrLot === 'string' ? normalizeLot(rowOrLot) : getLotFromRow(rowOrLot);
      if (isLotMarkedComplete(lot)) return [];

      const cutting = getPositiveQtyItemsForLot(lot);
      const genMap = generatedByLotShade[lot] || {};

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
        if (rem > 0) remaining.push({ shade: key, qty: rem });
      }
      return remaining;
    },
    [generatedByLotShade, getPositiveQtyItemsForLot, isLotMarkedComplete]
  );

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setMatchedRows([]);

      const [resCut, resSec, resIdx] = await Promise.all([
        fetch(urls.cutting).then((r) => r.json()),
        fetch(urls.second).then((r) => r.json()),
        fetch(urls.index).then((r) => r.json()),
      ]);

      if (resCut?.error) throw new Error(resCut.error.message || 'Cutting fetch error');
      if (resSec?.error) throw new Error(resSec.error.message || 'JobOrder fetch error');
      if (resIdx?.error) throw new Error(resIdx.error.message || 'Index fetch error');

      const cuttingVals = resCut.values || [];
      const sec = rowsToObjects(resSec.values);
      const idx = rowsToObjects(resIdx.values);

      if (!cuttingVals.length) throw new Error('Cutting sheet returned no rows.');
      if (!sec.length) throw new Error('JobOrder returned no rows.');
      if (!idx.length) console.warn('Index sheet returned no rows — aging will show “—”.');

      const secKey = findColumnKey(sec[0], [SOURCES.second.lotKey]);
      const embKey = findColumnKey(sec[0], ['Emb', 'Embroidery', 'Design', 'Design Name']);
      if (!secKey) throw new Error(`Could not find JobOrder lot column (${SOURCES.second.lotKey}).`);

      const { shadeByLot, completeByLot } =
        buildGeneratedMapsFromJobOrder(sec, secKey);
      setGeneratedByLotShade(shadeByLot);
      setCompleteLotByLot(completeByLot);

      // Build Saved At map from Index
      const savedMap = buildSavedAtMapFromIndex(
        idx,
        SOURCES.index.lotKey,
        SOURCES.index.shadesKey,
        SOURCES.index.savedAtKey
      );
      setSavedAtByLotShade(savedMap);

      const { lots, itemsByLot } = parseCuttingSheet(cuttingVals);
      setCuttingItemsByLot(itemsByLot);

      const isNAish = (v) => {
        const s = String(v ?? '').trim().toLowerCase();
        return !s || s === 'na' || s === 'n/a' || s === '-' || s === 'not applicable';
      };

      const filtered = sec.filter((r) => {
        const v = normalizeLot(r[secKey]);
        if (!(v && lots.has(v))) return false;
        if (!embKey) return true;
        return !isNAish(r[embKey]);
      });

      setMatchedRows(filtered);
    } catch (e) {
      setError(e.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [urls.cutting, urls.second, urls.index]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Build pending challans (with shade-level age + lot-level max age in hours)
  const pendingChallans = useMemo(() => {
    const pending = [];
    matchedRows.forEach((row) => {
      const lot = getLotFromRow(row);
      const remainingItems = getRemainingItemsForLot(lot);
      if (remainingItems.length > 0 && !isLotMarkedComplete(lot)) {
        const party = String(
          row['Party Name'] ??
            row['Party'] ??
            row['Buyer'] ??
            row['Customer'] ??
            ''
        ).trim();
        const style = String(
          row['Style'] ?? row['Style No'] ?? row['Style Name'] ?? ''
        ).trim();
        const emb = String(
          row['Emb'] ?? row['Embroidery'] ?? row['Design'] ?? row['Design Name'] ?? ''
        ).trim();

        // Shade-level: attach ageHours from Index->Saved At
        const shadeAges = remainingItems.map((it) => {
          const shKey = toUpperShade(it.shade);
          const saved = savedAtByLotShade?.[lot]?.[shKey] || null;
          const ageHours = saved ? hoursDiff(saved) : null;
          return { shade: it.shade, qty: it.qty, savedAt: saved, ageHours };
        });

        // Lot-level: show MAX hours among pending shades (if any known)
        const anyKnown = shadeAges.some((s) => s.ageHours != null);
        const lotAgeHours = anyKnown
          ? shadeAges.reduce((mx, s) => (s.ageHours != null ? Math.max(mx, s.ageHours) : mx), 0)
          : null;

        pending.push({
          lot,
          party,
          style,
          emb,
          pendingItems: shadeAges, // includes ageHours
          totalPending: remainingItems.reduce((sum, item) => sum + item.qty, 0),
          lotAgeHours,
          rowData: row,
        });
      }
    });
    return pending.sort((a, b) => a.lot.localeCompare(b.lot));
  }, [matchedRows, getRemainingItemsForLot, isLotMarkedComplete, savedAtByLotShade]);

  // Distinct options for filters
  const partyOptions = useMemo(
    () => uniqueSorted(pendingChallans.map((d) => d.party)),
    [pendingChallans]
  );
  const styleOptions = useMemo(
    () => uniqueSorted(pendingChallans.map((d) => d.style)),
    [pendingChallans]
  );
  const embOptions = useMemo(
    () => uniqueSorted(pendingChallans.map((d) => d.emb)),
    [pendingChallans]
  );

  // Apply UI filters
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    let data = pendingChallans.filter((d) => {
      const matchesSearch =
        !q ||
        d.lot.toLowerCase().includes(q) ||
        (d.party || '').toLowerCase().includes(q) ||
        (d.style || '').toLowerCase().includes(q) ||
        (d.emb || '').toLowerCase().includes(q) ||
        d.pendingItems.some((it) => it.shade.toLowerCase().includes(q));

      const matchesParty = !partyFilter || d.party === partyFilter;
      const matchesStyle = !styleFilter || d.style === styleFilter;
      const matchesEmb = !embFilter || d.emb === embFilter;

      const minOk = !minPending || d.totalPending >= Number(minPending);
      const maxOk = !maxPending || d.totalPending <= Number(maxPending);

      return (
        matchesSearch &&
        matchesParty &&
        matchesStyle &&
        matchesEmb &&
        minOk &&
        maxOk
      );
    });

    if (sortBy === 'pendingAsc')
      data = data.slice().sort((a, b) => a.totalPending - b.totalPending);
    else if (sortBy === 'pendingDesc')
      data = data.slice().sort((a, b) => b.totalPending - a.totalPending);
    else data = data.slice().sort((a, b) => a.lot.localeCompare(b.lot));

    return data;
  }, [
    pendingChallans,
    search,
    partyFilter,
    styleFilter,
    embFilter,
    minPending,
    maxPending,
    sortBy,
  ]);

  // Stats for UI
  const stats = useMemo(() => {
    const lots = filteredData.length;
    const totalPieces = filteredData.reduce((acc, d) => acc + d.totalPending, 0);
    const parties = new Set(filteredData.map((d) => d.party).filter(Boolean)).size;
    let shadeCount = 0;
    filteredData.forEach((d) => (shadeCount += d.pendingItems.length));
    return { lots, totalPieces, parties, shades: shadeCount };
  }, [filteredData]);

  /* ===========================
     EXPORTS (unchanged)
     =========================== */
  const buildFlatRows = (rows) => {
    const flat = [];
    rows.forEach((d) => {
      if (!d.pendingItems.length) {
        flat.push({
          Lot: d.lot,
          Party: d.party,
          Style: d.style,
          Embroidery: d.emb,
          Shade: '',
          Qty: 0,
          'Total Pending (Lot)': d.totalPending,
        });
      } else {
        d.pendingItems.forEach((it) => {
          flat.push({
            Lot: d.lot,
            Party: d.party,
            Style: d.style,
            Embroidery: d.emb,
            Shade: it.shade,
            Qty: it.qty,
            'Total Pending (Lot)': d.totalPending,
          });
        });
      }
    });
    return flat;
  };

  const exportToCSV = (rows, filename = 'pending_challans_grouped.csv') => {
    if (!rows?.length) return;

    const headers = [
      'Lot',
      'Party',
      'Style',
      'Embroidery',
      'Shade',
      'Qty',
      'Total Pending (Lot)',
    ];

    const csvLines = [];
    csvLines.push(headers.join(',')); // header row

    const esc = (v) => {
      const s = String(v ?? '').replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };

    rows.forEach((d) => {
      const lot = d.lot ?? '';
      const party = d.party ?? '';
      const style = d.style ?? '';
      const emb = d.emb ?? '';
      const total = d.totalPending ?? 0;
      const items = Array.isArray(d.pendingItems) ? d.pendingItems : [];

      if (items.length === 0) {
        csvLines.push([esc(lot), esc(party), esc(style), esc(emb), '', '', esc(total)].join(','));
        return;
      }

      const first = items[0];
      csvLines.push([
        esc(lot),
        esc(party),
        esc(style),
        esc(emb),
        esc(first.shade ?? ''),
        esc(first.qty ?? 0),
        esc(total),
      ].join(','));

      for (let i = 1; i < items.length; i++) {
        const it = items[i];
        csvLines.push(['', '', '', '', esc(it.shade ?? ''), esc(it.qty ?? 0), ''].join(','));
      }
    });

    const csv = csvLines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToXLSX = async (rows) => {
    const flat = buildFlatRows(rows);
    if (!flat.length) return;
    try {
      const XLSX = (await import('xlsx')).default || (await import('xlsx'));
      const ws = XLSX.utils.json_to_sheet(flat);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pending');
      XLSX.writeFile(wb, 'pending_challans.xlsx');
    } catch (err) {
      console.warn('xlsx not available, falling back to CSV.', err);
      exportToCSV(rows, 'pending_challans.csv');
    }
  };

  const exportToPDF = async (rows) => {
    if (!rows?.length) return;
    try {
      const jsPDFmod = await import('jspdf');
      const jsPDF = jsPDFmod.default || jsPDFmod;
      const autoTableMod = await import('jspdf-autotable');
      const autoTable = autoTableMod.default || autoTableMod;

      const BRAND = [26, 86, 219];
      const INK = [255, 255, 255];
      const BORDER = [205, 210, 220];
      const SUBTLE = [245, 247, 255];
      const GRID = [220, 224, 235];
      const TEXT = [32, 33, 36];
      const TEXT_DIM = [90, 96, 110];

      const doc = new jsPDF('p', 'pt', 'a4');
      const dateStr = new Date().toLocaleString();
      const M = 40;
      const HEADER_H = 64;
      const FOOTER_H = 24;
      const PAGE_PAD = 16;

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const contentW = pageW - M * 2;

      const drawFrameHeaderFooter = () => {
        doc.setFillColor(...BRAND);
        doc.rect(0, 0, pageW, HEADER_H, 'F');

        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.9);
        doc.roundedRect(PAGE_PAD, PAGE_PAD, pageW - PAGE_PAD * 2, pageH - PAGE_PAD * 2, 8, 8);

        doc.setTextColor(...INK);
        doc.setFontSize(14);
        doc.text('Pending Challans — Grouped by Lot', M, 30);
        doc.setFontSize(9);
        doc.text(`Generated: ${dateStr}`, M, 46);

        const pageNo = String(doc.getNumberOfPages());
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.7);
        doc.line(PAGE_PAD, pageH - FOOTER_H, pageW - PAGE_PAD, pageH - FOOTER_H);
        doc.setTextColor(120);
        doc.setFontSize(9);
        doc.text(`Page ${pageNo}`, pageW - M, pageH - 10, { align: 'right' });
      };

      const didDrawPageHook = () => drawFrameHeaderFooter();

      let y = HEADER_H + 20;

      const lotsCount = rows.length;
      const totalPieces = rows.reduce((s, d) => s + (d.totalPending || 0), 0);
      const shadeLines = rows.reduce((s, d) => s + (d.pendingItems?.length || 0), 0);
      const partiesCount = new Set(rows.map((d) => d.party).filter(Boolean)).size;

      const chips = [
        `Lots: ${lotsCount}`,
        `Total pieces: ${totalPieces.toLocaleString('en-IN')}`,
        `Shade lines: ${shadeLines.toLocaleString('en-IN')}`,
        `Parties: ${partiesCount}`,
      ];

      const drawChip = (x, baselineY, text) => {
        const padX = 10;
        doc.setFontSize(10);
        const tw = doc.getTextWidth(text);
        const w = tw + padX * 2;
        const h = 22;

        doc.setFillColor(...SUBTLE);
        doc.setDrawColor(210, 220, 255);
        doc.roundedRect(x, baselineY - h + 6, w, h, 7, 7, 'FD');

        doc.setTextColor(...TEXT);
        doc.text(text, x + padX, baselineY);
        return w + 10;
      };

      let cx = M;
      const chipBaseline = y + 10;
      chips.forEach((t) => {
        const estWidth = doc.getTextWidth(t) + 10 * 2 + 10;
        if (cx + estWidth > pageW - M) {
          y += 28;
          cx = M;
        }
        cx += drawChip(cx, chipBaseline, t);
      });
      y += 34;

      const ensureSpace = (need) => {
        if (y + need > pageH - FOOTER_H - 20) {
          doc.addPage();
          y = HEADER_H + 20;
        }
      };

      const drawLotHeader = (d) => {
        ensureSpace(44);
        doc.setFillColor(240, 245, 255);
        doc.setDrawColor(185, 196, 230);
        doc.roundedRect(M, y, contentW, 24, 6, 6, 'FD');

        doc.setTextColor(...TEXT);
        doc.setFontSize(11);
        doc.text(
          `Lot ${d.lot} — ${d.pendingItems.length} pending shades — Total: ${d.totalPending.toLocaleString('en-IN')}`,
          M + 8,
          y + 16
        );

        const party = d.party || '-';
        const style = d.style || '-';
        const emb = d.emb || '-';
        doc.setTextColor(...TEXT_DIM);
        doc.setFontSize(10);
        doc.text(`Party: ${party}   •   Style: ${style}   •   Emb: ${emb}`, M, y + 36);
        y += 44;
      };

      drawFrameHeaderFooter();

      for (const d of rows) {
        drawLotHeader(d);

        const body = (d.pendingItems || []).map((it) => [
          it.shade,
          (it.qty ?? 0).toLocaleString('en-IN'),
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Shade', 'Qty']],
          body,
          margin: { left: M, right: M, top: HEADER_H + 12, bottom: FOOTER_H + 10 },
          styles: { fontSize: 9, textColor: TEXT, lineWidth: 0.4, lineColor: GRID },
          headStyles: { fillColor: BRAND, textColor: INK, fontStyle: 'bold', halign: 'left' },
          bodyStyles: { fillColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [249, 250, 255] },
          columnStyles: { 1: { halign: 'right' } },
          didDrawPage: didDrawPageHook,
        });

        y = doc.lastAutoTable.finalY + 16;
      }

      doc.save('pending_challans_grouped.pdf');
    } catch (err) {
      console.warn('jspdf not available, printing grouped view instead.', err);
      const lotsCount = rows.length;
      const totalPieces = rows.reduce((s, d) => s + (d.totalPending || 0), 0);
      const shadeLines = rows.reduce((s, d) => s + (d.pendingItems?.length || 0), 0);
      const partiesCount = new Set(rows.map((d) => d.party).filter(Boolean)).size;

      const html = `
        <html>
          <head>
            <title>Pending Challans — Grouped by Lot</title>
            <style>
              @media print { @page { margin: 18mm; } .page-border { border: 1px solid #cdd2dc; border-radius: 8px; padding: 16px; } }
              body{font:12px Arial, sans-serif; margin:0; background:#f8f9ff;}
              .banner{background:#1a56db;color:#fff;padding:14px 20px;border-radius:0 0 8px 8px}
              .wrap{padding:20px}
              .chips{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 6px}
              .chip{background:#f4f7ff;border:1px solid #d2daf3;border-radius:999px;padding:6px 10px;font-size:11px}
              .lot{margin:14px 0 18px;page-break-inside:avoid}
              .lot-head{background:#f0f5ff;border:1px solid #bcc7ea;border-radius:6px;padding:8px 10px;font-weight:600}
              .lot-sub{color:#5a606e;font-size:11px;margin:6px 2px 8px}
              table{border-collapse:collapse;width:100%;font-size:11px}
              th,td{border:1px solid #dce0eb;padding:6px 8px;text-align:left}
              th{background:#1a56db;color:#fff}
              tbody tr:nth-child(even){background:#f9faff}
              .page-border{margin:18px}
              .footer{border-top:1px solid #cdd2dc;margin-top:16px;padding-top:8px;color:#6b7280;font-size:11px;text-align:right}
            </style>
          </head>
          <body>
            <div class="page-border">
              <div class="banner">
                <div style="font-size:14px;font-weight:700">Pending Challans — Grouped by Lot</div>
                <div style="font-size:11px;opacity:.9">Generated: ${new Date().toLocaleString()}</div>
              </div>
              <div class="wrap">
                <div class="chips">
                  <div class="chip">Lots: ${lotsCount}</div>
                  <div class="chip">Total pieces: ${totalPieces.toLocaleString('en-IN')}</div>
                  <div class="chip">Shade lines: ${shadeLines.toLocaleString('en-IN')}</div>
                  <div class="chip">Parties: ${partiesCount}</div>
                </div>
                ${rows
                  .map(
                    (d) => `
                    <div class="lot">
                      <div class="lot-head">Lot ${d.lot} — ${d.pendingItems.length} pending shades — Total: ${Number(
                        d.totalPending || 0
                      ).toLocaleString('en-IN')}</div>
                      <div class="lot-sub">Party: ${d.party || '-'} • Style: ${d.style || '-'} • Emb: ${d.emb || '-'}</div>
                      <table>
                        <thead><tr><th>Shade</th><th style="text-align:right">Qty</th></tr></thead>
                        <tbody>
                          ${
                            (d.pendingItems || [])
                              .map(
                                (it) =>
                                  `<tr><td>${it.shade}</td><td style="text-align:right">${Number(
                                    it.qty || 0
                                  ).toLocaleString('en-IN')}</td></tr>`
                              )
                              .join('') || `<tr><td colspan="2">No pending shades</td></tr>`
                          }
                        </tbody>
                      </table>
                    </div>`
                  )
                  .join('')}
                <div class="footer">Printed ${new Date().toLocaleString()}</div>
              </div>
            </div>
            <script>window.onload = () => window.print();</script>
          </body>
        </html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
      }
    }
  };

  /* ===========================
     RENDER
     =========================== */

  if (loading) {
    return (
      <div className="mh-ec">
        <style>{`
          .mh-ec{padding:28px 18px 60px; max-width:1800px; margin:0 auto}
          .sk{padding:6px}
          .sk-line{
            height:38px; margin:8px 0; border-radius:10px;
            background:
              linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent) 0 0/200% 100%,
              rgba(255,255,255,.04);
            animation: sk 1.2s infinite;
          }
          @keyframes sk{to{background-position: -200% 0}}
        `}</style>
        <div className="sk">
          <div className="sk-line" style={{ height: 44 }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="sk-line" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mh-ec">
        <style>{`
          .mh-ec{padding:28px 18px 60px; max-width:1800px; margin:0 auto}
          .alert{
            margin:12px 0 16px; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.16);
            background:linear-gradient(180deg, rgba(239,68,68,.16), rgba(239,68,68,.06));
            color:red; box-shadow:var(--shadow-sm);
          }
        `}</style>
        <div role="alert" className="alert">⚠️ {error}</div>
      </div>
    );
  }

  return (
    <div className="mh-ec">
      <style>{`
        :root{
          --bg: #0b1020; --bg-soft: #0f1630; --panel: #10172a; --panel-2: #111a35;
          --ink: #e7ecf8; --ink-dim: #c7cbe0; --muted: #97a0b8; --brand: #5b9cff; --brand-2: #8b5bff;
          --ok: #22c55e; --warn: #f59e0b; --danger: #ef4444; --ring: 0 0 0 2px rgba(91,156,255,.35);
          --shadow-lg: 0 8px 30px rgba(0,0,0,.35); --shadow-md: 0 6px 20px rgba(0,0,0,.28); --shadow-sm: 0 2px 10px rgba(0,0,0,.25);
          --radius: 14px; --radius-sm: 10px; --radius-xs: 8px; --border: 1px solid rgba(255,255,255,.08);
          --glass: rgba(255,255,255,.06); --glass-2: rgba(255,255,255,.08); --gradient: linear-gradient(135deg,var(--brand),var(--brand-2));
          --table-border: rgba(255,255,255,.22); --table-border-strong: rgba(255,255,255,.28);
          color-scheme: dark; 
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
            color-scheme: light;  
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

        .mh-ec{padding:28px 18px 60px; max-width:1800px; margin:0 auto}

        /* HERO */
        .hero{
          position:relative;
          margin-bottom:16px;
          border-radius: calc(var(--radius) + 6px);
          padding:18px;
          background: linear-gradient(180deg, var(--glass-2), transparent), var(--panel);
          border:var(--border);
          box-shadow: var(--shadow-lg);
          overflow:hidden;
          isolation:isolate;
        }
        .hero .row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .hero h1{margin:0;font-size:24px}
        .hero p{margin:4px 0 0;color:var(--ink-dim)}
        .kicker{font-weight:700;font-size:11px;letter-spacing:.6px;background:var(--gradient);-webkit-background-clip:text;color:transparent}

        /* STATS GRID */
        .stats{display:grid;gap:12px;margin-top:14px;grid-template-columns:repeat(4,minmax(0,1fr))}
        @media(max-width:1100px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:640px){.stats{grid-template-columns:1fr}}
        .stat{background:linear-gradient(180deg,var(--glass),transparent),var(--panel-2);border:var(--border);padding:14px;border-radius:12px;display:flex;justify-content:space-between;align-items:center}
        .stat .num{font-weight:800;font-size:22px}
        .stat .lbl{color:var(--muted);font-size:12px}
        .stat .pill{font-size:11px;padding:4px 8px;border-radius:999px;border:1px dashed var(--table-border)}

        /* CARD / TOOLBAR */
        .card{background: linear-gradient(180deg, rgba(255,255,255,.03), transparent), var(--panel); border:var(--border); border-radius:var(--radius); box-shadow:var(--shadow-md); padding:14px; display:flex; flex-direction:column; overflow:visible;}
        .toolbar{display:grid;grid-template-columns:1fr auto;gap:10px;margin-bottom:12px}
        .filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:linear-gradient(180deg,var(--glass),transparent);border:var(--border);padding:8px;border-radius:12px}
        .actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}

        /* INPUTS */
        .input,.select{appearance:none;border:var(--border);color:var(--ink);background:linear-gradient(180deg,var(--glass),transparent);padding:8px 10px;border-radius:10px;min-width:140px}
        .input[type="number"]{width:110px}
        .search{min-width:220px;flex:1}

        /* BUTTONS */
        .btn{appearance:none;border:var(--border);color:var(--ink);background:linear-gradient(180deg,var(--glass),transparent);padding:8px 12px;border-radius:10px;cursor:pointer;transition:.18s ease;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
        .btn:hover{transform:translateY(-1px);background:linear-gradient(180deg,var(--glass-2),transparent)}
        .btn:focus-visible{outline:0;box-shadow: var(--ring)}
        .btn:disabled{opacity:.55;cursor:not-allowed}
        .btn-primary{background:var(--gradient);border:1px solid transparent;color:#fff;box-shadow:0 6px 16px rgba(91,156,255,.35)}
        .btn-ghost{background:transparent;border:1px dashed var(--table-border)}

        /* TABLE */
        .table-wrap{overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;max-height:clamp(420px,68vh,86vh);border-radius:12px;border:var(--border);background: var(--panel-2);}
        table.minw{width:100%;min-width:1100px;border-collapse:separate;border-spacing:0;background:var(--panel-2)}
        thead th{position:sticky;top:0;z-index:5;background:linear-gradient(180deg, rgba(255,255,255,.04), transparent), var(--panel-2);text-align:left;font-size:12px;letter-spacing:.4px;color:var(--ink-dim);padding:12px 14px;border-bottom:1px solid var(--table-border-strong)}
        tbody td{padding: 12px 14px; color:var(--ink); border-bottom:1px solid var(--table-border); border-right:1px solid var(--table-border); vertical-align:top; word-break: break-word;}
        tbody td:last-child{border-right:none}
        tbody tr{transition:.16s ease}
        tbody tr:nth-child(even){background:rgba(255,255,255,.03)}
        tbody tr:hover{background:rgba(255,255,255,.05)}

        /* Misc */
        .empty{padding:40px 12px;text-align:center;color:var(--muted)}
        .empty .emoji{font-size:34px;margin-bottom:6px}
        .pending-highlight{background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); padding: 4px 8px; border-radius: 6px; font-weight: 700; color: #f59e0b;}
        .shade-item{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-bottom:1px solid var(--table-border)}
        .shade-item:last-child{border-bottom:none}
        .shade-btn{display:inline-flex;align-items:center;gap:6px;margin-bottom:6px}
        .dense td{padding:8px 10px !important}

        /* Age chips */
        .shade-age{font-size:11px;padding:2px 6px;border-radius:999px;border:1px solid rgba(255,255,255,.18)}
        .shade-age.overdue{background:rgba(239,68,68,.18); border-color:#ef4444; color:#ef4444}
        .age-badge{display:inline-block;padding:4px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.18);font-weight:700}
        .age-badge.overdue{background:rgba(239,68,68,.18);border-color:#ef4444;color:#ef4444}
      `}</style>

      {/* HERO */}
      <div className="hero">
        <div className="row">
          <div>
            <div className="title-row">
              <button className="btn btn-ghost" onClick={() => window.history.back()} title="Back">← Back</button>
              <h1>Pending Embroidery Challans</h1>
            </div>
            <p>Lots with pending challans to generate, including specific shades and quantities.</p>
          </div>
          <span className="kicker">Embroidery Suite</span>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stat">
            <div>
              <div className="lbl">Pending Lots</div>
              <div className="num">{numberFormatIN(stats.lots)}</div>
            </div>
            <span className="pill">Lots</span>
          </div>
          <div className="stat">
            <div>
              <div className="lbl">Pending Pieces</div>
              <div className="num">{numberFormatIN(stats.totalPieces)}</div>
            </div>
            <span className="pill">Qty</span>
          </div>
          <div className="stat">
            <div>
              <div className="lbl">Parties</div>
              <div className="num">{numberFormatIN(stats.parties)}</div>
            </div>
            <span className="pill">Unique</span>
          </div>
          <div className="stat">
            <div>
              <div className="lbl">Shades</div>
              <div className="num">{numberFormatIN(stats.shades)}</div>
            </div>
            <span className="pill">Lines</span>
          </div>
        </div>
      </div>

      {/* Filters + Actions */}
      <section className="card" aria-label="Controls">
        <div className="toolbar">
          <div className="filters">
            <input
              className="input search"
              placeholder="Search (Lot / Party / Style / Emb / Shade)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="select" value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)}>
              <option value="">Party (All)</option>
              {partyOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select className="select" value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)}>
              <option value="">Style (All)</option>
              {styleOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select className="select" value={embFilter} onChange={(e) => setEmbFilter(e.target.value)}>
              <option value="">Embroidery (All)</option>
              {embOptions.map((e1) => (
                <option key={e1} value={e1}>{e1}</option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              placeholder="Min Pending"
              value={minPending}
              onChange={(e) => setMinPending(e.target.value)}
            />
            <input
              className="input"
              type="number"
              placeholder="Max Pending"
              value={maxPending}
              onChange={(e) => setMaxPending(e.target.value)}
            />
            <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="lot">Sort: Lot (A→Z)</option>
              <option value="pendingAsc">Sort: Pending (Low→High)</option>
              <option value="pendingDesc">Sort: Pending (High→Low)</option>
            </select>
            <label className="switch" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={dense} onChange={(e) => setDense(e.target.checked)} />
              <span>Dense rows</span>
            </label>
          </div>

          <div className="actions">
            <button
              className="btn"
              onClick={() => {
                setSearch('');
                setPartyFilter('');
                setStyleFilter('');
                setEmbFilter('');
                setMinPending('');
                setMaxPending('');
                setSortBy('lot');
                setDense(false);
              }}
            >
              Reset
            </button>
            <button className="btn" onClick={fetchAll} title="Refresh">⟳ Refresh</button>
            <button className="btn" onClick={() => exportToCSV(filteredData)}>Export CSV</button>
            {/* <button className="btn" onClick={() => exportToXLSX(filteredData)}>Export Excel (.xlsx)</button> */}
            <button className="btn btn-primary" onClick={() => exportToPDF(filteredData)}>Export PDF</button>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="card" aria-label="Pending Challans">
        {filteredData.length === 0 ? (
          <div className="empty">
            <div className="emoji">🧹</div>
            <h3>No results</h3>
            <p>Try adjusting the filters or refreshing the data.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="minw">
              <thead>
                <tr>
                  <th>Lot Number</th>
                  <th>Party</th>
                  <th>Style</th>
                  <th>Embroidery</th>
                  <th>Pending Shades & Quantities</th>
                  <th>Total Pending</th>
                  <th>Pending Age (hrs)</th>
                </tr>
              </thead>

              <tbody className={dense ? 'dense' : ''}>
                {filteredData.map((challan, i) => {
                  const isOpen = expandedLots.has(challan.lot);
                  const ageHrs = challan.lotAgeHours;
                  const isOverdue = ageHrs != null && ageHrs >= OVERDUE_HOURS;

                  return (
                    <tr key={challan.lot + '_' + i}>
                      <td data-label="Lot Number">
                        <strong>{challan.lot}</strong>
                      </td>
                      <td data-label="Party">{challan.party}</td>
                      <td data-label="Style">{challan.style}</td>
                      <td data-label="Embroidery">{challan.emb}</td>
                      <td data-label="Pending Shades & Quantities">
                        {/* View shades toggle */}
                        <button
                          className="btn shade-btn"
                          aria-expanded={isOpen}
                          aria-controls={`shades-${challan.lot}`}
                          onClick={() =>
                            setExpandedLots((prev) => {
                              const next = new Set(prev);
                              if (next.has(challan.lot)) next.delete(challan.lot);
                              else next.add(challan.lot);
                              return next;
                            })
                          }
                        >
                          {isOpen ? 'Hide shades' : 'View shades'}
                        </button>

                        {isOpen && (
                          <div
                            id={`shades-${challan.lot}`}
                            style={{
                              marginTop: 8,
                              maxHeight: 220,
                              overflowY: 'auto',
                              border: '1px dashed var(--table-border)',
                              borderRadius: 8,
                            }}
                          >
                            {challan.pendingItems.map((item, idx) => {
                              const shOverdue = item.ageHours != null && item.ageHours >= OVERDUE_HOURS;
                              return (
                                <div key={idx} className="shade-item" title={item.savedAt ? item.savedAt.toString() : ''}>
                                  <span>{item.shade}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span className={`shade-age ${shOverdue ? 'overdue' : ''}`}>
                                      {item.ageHours != null ? `${item.ageHours} h` : '—'}
                                    </span>
                                    <span>{numberFormatIN(item.qty)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td data-label="Total Pending">
                        <span className="pending-highlight">{numberFormatIN(challan.totalPending)}</span>
                      </td>
                      <td data-label="Pending Age (hrs)">
                        <span className={`age-badge ${isOverdue ? 'overdue' : ''}`}>
                          {ageHrs != null ? `${ageHrs} h` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default PendingChallans;
