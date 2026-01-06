// src/pages/IssueStitching.jsx
import React, { useMemo, useState, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiRefreshCw, FiAlertTriangle, FiUser, FiCalendar, FiX, FiCheck,
  FiScissors, FiInfo, FiPackage, FiTag, FiGrid, FiArrowLeft
} from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// ---------- Helpers (module scope, hoisted) ----------
function uniqCaseInsensitive(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr ?? []) {
    const k = String(s ?? "").trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function titleCase(str) {
  return String(str ?? "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}


// ============================
// Config (replace via .env)
// ============================
const GOOGLE_API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const SHEET_ID = "1Hj3JeJEKB43aYYWv8gk2UhdU6BWuEQfCg5pBlTdBMNA";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxwi0wrsL3EDE4RVMNYWR4VmG-1t__8MKK6W33HSPfBCJpGxFOA2bNly5cVnHikfV8ySA/exec";
const OLD_LOTS_SOURCE_TAB = "Sheet1"; // read-only
const OLD_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyMuD4XQ_kiTE59WNIY-OXwZkZzDhEuSiWy86qySeQFMrokUEy9YsoU0bBAUvbp5XNKIg/exec";
const SHEET_IDD = "18FzakygM7DVD29IRbpe68pDeCFQhFLj7t4C-XQ1MWWc";
const OLD_META_SHEET_ID = "1xD8Uy1lUgvNTQ2RGRBI4ZjOrozbinUPRq2_UfIplP98";  // <-- second sheet with Item/Fabric info
const OLD_META_TAB = "RAW FINAL";  // tab where you store mapping

// Safety guard
const MAX_RANGE = 'A1:Z';

// Suggestions (free text allowed)
const DEFAULT_SUPERVISORS = [ 'RAM CHANDER', 'PINTU','PARMOD'];

// Helpers
const norm = (v) => (v ?? '').toString().trim();
const eq = (a, b) => norm(a).toLowerCase() === norm(b).toLowerCase();
const includes = (hay, needle) => norm(hay).toLowerCase().includes(norm(needle).toLowerCase());

function todayLocalISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

// ============================
// LOT helpers (new)
// ============================
function digitsOnly(s) {
  const m = String(s ?? '').match(/\d+/g);
  return m ? m.join('') : '';
}

/** Old lot = exactly 4 digits and <10000; New/Cutting lot = 5+ digits (or 4-digit >= 10000 never happens) */
function classifyLot(lotInput) {
  const d = digitsOnly(lotInput);
  const n = parseInt(d, 10);
  const isOld = d.length === 4 && Number.isFinite(n) && n < 10000;
  const searchKey = d;                // use full digits for search in cutting
  const lot4 = d.length >= 4 ? d.slice(-4) : d; // last 4 when we need it
  return { isOld, searchKey, lot4 };
}

// ============================
// Fetch lot matrix (MAIN FUNCTION)
// ============================
async function fetchLotMatrixViaSheetsApi(lotNo, signal) {
  if (!GOOGLE_API_KEY || !SHEET_ID) {
    throw new Error('Missing API key or Sheet ID.');
  }

  const { isOld, searchKey, lot4 } = classifyLot(lotNo);
  console.log('Searching for lot:', { isOld, searchKey, lot4 });

  // ---- Old lots (strictly 4-digit < 10000)
  if (isOld) {
    const oldData = await fetchOldLotsFor(lot4, signal); // old is always 4-digit
    oldData.source = 'old';
    return oldData;
  }

  // ---- New/Cutting flow must ALWAYS use the new sheet, even if old sheet also has it
  try {
    const indexData = await fetchIndexSheet(signal);
    const lotInfo = findLotInIndex(indexData, searchKey);
    if (lotInfo) {
      const parsed = await fetchFromCuttingUsingIndex(lotInfo, signal);
      parsed.source = 'cutting';
      return parsed;
    }
  } catch (err) {
    console.warn('Index path failed:', err?.message);
  }

  try {
    const parsedAlt = await searchInCuttingSheet(searchKey, signal);
    parsedAlt.source = 'cutting';
    return parsedAlt;
  } catch (err) {
    console.warn('Cutting fallback failed:', err?.message);
  }

  // DO NOT fallback to old for 5+ digit lots
  throw new Error(`Lot ${searchKey} not found in Cutting`);
}
async function fetchOldLotMeta(lotNo, signal) {
  const range = encodeURIComponent(`${OLD_META_TAB}!A3:G`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${OLD_META_SHEET_ID}/values/${range}?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to access ${OLD_META_TAB}: ${res.status}`);

  const data = await res.json();
  const rows = data?.values || [];
  if (rows.length < 2) return { garmentType: '', style: '', fabric: '', category: '' };

  const headers = rows[0].map(norm);

  const lotIdx     = headers.findIndex(h => includes(h, 'lot'));
  const itemIdx    = headers.findIndex(h => includes(h, 'item'));   // this = garmentType
  const styleIdx   = headers.findIndex(h => includes(h, 'style'));
  const fabricIdx  = headers.findIndex(h => includes(h, 'fabric'));
  const catIdx     = headers.findIndex(h => includes(h, 'gents') || includes(h, 'ladies') || includes(h, 'kids'));

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    if (lotIdx !== -1 && norm(r[lotIdx]) === norm(lotNo)) {
      return {
        garmentType: itemIdx   !== -1 ? norm(r[itemIdx])   : '',
        style:       styleIdx  !== -1 ? norm(r[styleIdx])  : '',
        fabric:      fabricIdx !== -1 ? norm(r[fabricIdx]) : '',
        category:    catIdx    !== -1 ? norm(r[catIdx])    : ''
      };
    }
  }
  return { garmentType: '', style: '', fabric: '', category: '' };
}




// ============================
// Old lots header helpers
// ============================
function headerMapIndex(headers) {
  const H = headers.map(h => (h ?? '').toString().trim().toLowerCase());

  const synonyms = {
    item: [
      'item name','item','item description','style','style name','article','article name','itemname'
    ],
    shade: [
      'shade name','shade','colour','color','color name','shade/colour','shade/color'
    ],
    pack: [
      'pack / size','pack/size','pack','size','pack size','packet size','sizes'
    ],
    qty: [
      'quantity','qty','pcs','qty (pcs)','issue qty','issue quantity','total qty','total quantity'
    ],
    lot: [
      'issue lot number','lot','lot number','issued lot','issue lot no.','issue lot no','lotno'
    ]
  };

  const out = {};
  for (const key of Object.keys(synonyms)) {
    out[key] = -1;
    for (const candidate of synonyms[key]) {
      const idx = H.indexOf(candidate);
      if (idx !== -1) { out[key] = idx; break; }
    }
  }
  return out;
}

function headerOrThrow(idx, label) {
  if (idx === -1) throw new Error(`OldLots_Source is missing a "${label}" column (any common variant)`);
}

// ============================
// Sheets access — Index & Cutting
// ============================
async function fetchIndexSheet(signal) {
  try {
    const range = encodeURIComponent('Index!A1:Z');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${GOOGLE_API_KEY}`;
    const res = await fetch(url, { signal });

    if (!res.ok) {
      throw new Error(`Failed to access Index sheet: ${res.status}`);
    }

    const data = await res.json();
    if (!data?.values?.length) {
      throw new Error('Index sheet is empty');
    }

    console.log('Fetched Index sheet with', data.values.length, 'rows');
    return data.values;
  } catch (err) {
    console.error('Error fetching Index sheet:', err.message);
    throw err;
  }
}

function findLotInIndex(indexData, lotNo) {
  if (!indexData || indexData.length < 2) return null;

  const headers = indexData[0].map(norm);
  const lotNumberCol = headers.findIndex(h => includes(h, 'lot number'));
  const startRowCol = headers.findIndex(h => includes(h, 'startrow'));
  const numRowsCol = headers.findIndex(h => includes(h, 'numrows'));
  const headerColsCol = headers.findIndex(h => includes(h, 'headercols'));

  if (lotNumberCol === -1) {
    console.log('Lot Number column not found in Index sheet');
    return null;
  }

  for (let i = 1; i < indexData.length; i++) {
    const row = indexData[i] || [];
    const rowLotNo = norm(row[lotNumberCol]);

    if (rowLotNo === norm(lotNo)) {
      return {
        lotNumber: rowLotNo,
        startRow: startRowCol !== -1 ? parseInt(row[startRowCol]) || 1 : 1,
        numRows: numRowsCol !== -1 ? parseInt(row[numRowsCol]) || 20 : 20,
        headerCols: headerColsCol !== -1 ? parseInt(row[headerColsCol]) || 7 : 7,
        fabric: headers.includes('fabric') && row[headers.indexOf('fabric')] || '',
        garmentType: headers.includes('garment type') && row[headers.indexOf('garment type')] || '',
        style: headers.includes('style') && row[headers.indexOf('style')] || '',
        sizes: headers.includes('sizes') && row[headers.indexOf('sizes')] || '',
        shades: headers.includes('shades') && row[headers.indexOf('shades')] || ''
      };
    }
  }

  return null;
}

async function fetchFromCuttingUsingIndex(lotInfo, signal) {
  const { startRow, numRows, headerCols, lotNumber } = lotInfo;

  try {
    const endRow = startRow + numRows - 1;
    const range = encodeURIComponent(`Cutting!A${startRow}:Z${endRow}`);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${GOOGLE_API_KEY}`;
    const res = await fetch(url, { signal });

    if (!res.ok) {
      throw new Error(`Failed to access Cutting sheet: ${res.status}`);
    }

    const data = await res.json();
    if (!data?.values?.length) {
      throw new Error('No data found in the specified range');
    }

    console.log(`Fetched ${data.values.length} rows from Cutting sheet using index`);
    console.log('Raw data:', data.values);

    const parsed = parseMatrixWithIndexInfo(data.values, lotInfo);
    if (parsed && parsed.rows && parsed.rows.length > 0) {
      console.log('Successfully parsed using index information');
      return parsed;
    }

    console.log('Primary parsing failed, trying alternative approach');
    const parsedAlt = parseMatrix(data.values, lotNumber);
    if (parsedAlt && parsedAlt.rows && parsedAlt.rows.length > 0) {
      console.log('Successfully parsed with alternative method');
      return parsedAlt;
    }

    throw new Error('Failed to parse data using both methods');

  } catch (err) {
    console.error('Error fetching using index:', err.message);
    throw err;
  }
}

// ---------- Old-lots header detection (robust) ----------
// function norm(s) { return (s ?? '').toString().trim(); }

// normalize header text: lowercase, remove punctuation, collapse spaces
function normalizeHeaderKey(s) {
  return norm(s)
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')   // dashes to -
    .replace(/[\s/|]+/g, ' ')           // collapse separators to space
    .replace(/[^a-z0-9 ]/g, '')         // drop punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// header synonyms (normalized)
const HDR_SYNONYMS = {
  item: new Set([
    'item name','item','item description','style','style name','article','article name','itemname'
  ]),
  shade: new Set([
    'shade name','shade','colour','color','color name','shade colour','shade color','colour name'
  ]),
  qty: new Set([
    'quantity','qty','pcs','qty pcs','qtypcs','qty pcs','qtypcs','qty (pcs)','qtypcs',
    'issue qty','issue quantity','total qty','total quantity','qtypiece','pcs qty','pcsqty'
  ]),
  lot: new Set([
    'issue lot number','lot','lot number','issued lot','issue lot no','issue lot no.','lotno'
  ]),
  pack: new Set([
    'pack size','pack / size','pack/size','pack','size','packet size','sizes'
 ]),
  cutting: new Set([
    'cutting table','cutting','ct',
    'issue supplier/worker name','supplier/worker name','supplier/worker',
    'issue supplier','supplier','worker','karigar','issue karigar'
  ])
//  };

};

// quick numeric detector
function isMostlyNumeric(colValues) {
  let numeric = 0, total = 0;
  for (const v of colValues) {
    const t = norm(v);
    if (!t) continue;
    total++;
    const n = parseFloat(t.replace(/[, ]/g,''));
    if (Number.isFinite(n)) numeric++;
  }
  return total > 0 && (numeric / total) >= 0.6;
}

// find a header row within the first few lines and map columns
function detectOldLotsHeaderAndMap(rows) {
  // look for a row that contains at least one known synonym
  const maxScan = Math.min(rows.length, 6);
  let headerIdx = 0;
  let header = rows[0] || [];

  outer:
  for (let i = 0; i < maxScan; i++) {
    const r = rows[i] || [];
    const normed = r.map(normalizeHeaderKey);
    for (const cell of normed) {
      if (HDR_SYNONYMS.item.has(cell) || HDR_SYNONYMS.shade.has(cell) || HDR_SYNONYMS.qty.has(cell)) {
        headerIdx = i;
        header = r;
        break outer;
      }
    }
  }

  // first pass: exact synonym match
  const H = header.map(h => normalizeHeaderKey(h));
 const map = { item: -1, shade: -1, qty: -1, lot: -1, pack: -1, cutting: -1 };
  H.forEach((name, idx) => {
    if (map.item === -1 && HDR_SYNONYMS.item.has(name))  map.item  = idx;
    if (map.shade === -1 && HDR_SYNONYMS.shade.has(name)) map.shade = idx;
    if (map.qty === -1 && HDR_SYNONYMS.qty.has(name))     map.qty   = idx;
    if (map.lot === -1 && HDR_SYNONYMS.lot.has(name))     map.lot   = idx;
    if (map.pack === -1 && HDR_SYNONYMS.pack.has(name))   map.pack  = idx;
    if (map.cutting === -1 && HDR_SYNONYMS.cutting.has(name)) map.cutting = idx;
  });

  // If any of the 3 core fields are missing, try heuristics on body rows
  const body = rows.slice(headerIdx + 1);
  if (map.item === -1 || map.shade === -1 || map.qty === -1) {
    const cols = (header || []).length;
    const colValues = Array.from({ length: cols }, (_, c) => body.map(r => r?.[c]));

    // quantity: mostly numeric
    if (map.qty === -1) {
      let best = -1;
      for (let c = 0; c < cols; c++) {
        if (isMostlyNumeric(colValues[c])) { best = c; break; }
      }
      if (best !== -1) map.qty = best;
    }

    // item: pick a texty column that often contains a 4-digit token (lot snippet), or longest text
    if (map.item === -1) {
      const fourDigitCount = (vals) => vals.reduce((acc, v) => acc + (/\b\d{4}\b/.test(norm(v)) ? 1 : 0), 0);
      let best = -1, bestScore = -1;
      for (let c = 0; c < cols; c++) {
        if (c === map.qty) continue;
        const vals = colValues[c];
        const numericish = isMostlyNumeric(vals);
        if (numericish) continue;
        const score = fourDigitCount(vals);
        if (score > bestScore) { bestScore = score; best = c; }
      }
      if (best === -1) {
        // fallback: the most "texty" (long strings)
        let longest = -1, bestC = -1;
        for (let c = 0; c < cols; c++) {
          if (c === map.qty) continue;
          const vals = colValues[c].map(v => norm(v)).filter(Boolean);
          if (!vals.length) continue;
          const avg = vals.reduce((a, s) => a + s.length, 0) / vals.length;
          if (avg > longest) { longest = avg; bestC = c; }
        }
        best = bestC;
      }
      if (best !== -1) map.item = best;
    }

    // shade: a non-numeric column different from item; many distinct short text tokens
    if (map.shade === -1) {
      let best = -1, bestDistinct = -1;
      for (let c = 0; c < cols; c++) {
        if (c === map.qty || c === map.item) continue;
        const vals = colValues[c].map(v => norm(v)).filter(Boolean);
        if (!vals.length) continue;
        if (isMostlyNumeric(vals)) continue;
        const distinct = new Set(vals.map(v => v.toLowerCase())).size;
        // prefer shorter average length (typical shade/color names)
        const avgLen = vals.reduce((a,s)=>a+s.length,0)/vals.length;
        const score = distinct - avgLen * 0.05;
        if (score > bestDistinct) { bestDistinct = score; best = c; }
      }
      if (best !== -1) map.shade = best;
    }
  }
   if (map.cutting === -1 && body.length) {
    const cols = (header || []).length;
    const looksLikeCutting = (v) => /\bcutting\s*\d+/i.test(norm(v)) || /\bkarigar\b/i.test(norm(v));
    for (let c = 0; c < cols; c++) {
      const score = body.reduce((acc, r) => acc + (looksLikeCutting(r?.[c]) ? 1 : 0), 0);
      if (score >= Math.max(2, Math.ceil(body.length * 0.05))) { // some signal
        map.cutting = c; break;
      }
    }
  }

  return { headerIdx, map, headerRaw: header };
}

function extractFirst4DigitsLot(itemName) {
  const m = (itemName || '').match(/\b(\d{4})\b/);
  return m ? m[1] : '';
}

async function fetchOldLotsFor(lotNo, signal) {
  // Read a small band that covers header + body. If your header is higher/lower, this still works
  const range = encodeURIComponent(`${OLD_LOTS_SOURCE_TAB}!A2:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_IDD}/values/${range}?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to access ${OLD_LOTS_SOURCE_TAB}: ${res.status}`);

  const data = await res.json();
  const rows = data?.values || [];
  if (rows.length < 2) throw new Error(`${OLD_LOTS_SOURCE_TAB} seems empty`);

  // Find header row + map columns (robust, with heuristics)
  const { headerIdx, map, headerRaw } = detectOldLotsHeaderAndMap(rows);

  // If any of the 3 core fields are still missing, show a helpful message
  if (map.item === -1 || map.shade === -1 || map.qty === -1) {
    const seen = (headerRaw || []).map(h => norm(h)).join(' | ');
    throw new Error(
      `Source must have ITEM NAME, SHADE NAME, QUANTITY (any common variant).\n` +
      `Seen header row: ${seen}\n` +
      `Tip: Rename headers closer to: "ITEM NAME", "SHADE NAME", "QUANTITY" or add them anywhere on the header row.`
    );
  }

  // normalize to last 4 digits
  const lotDigits = (String(lotNo).match(/\d+/g) || []).join('');
  const lot4 = lotDigits.length >= 4 ? lotDigits.slice(-4) : lotDigits;

  // Build body from headerIdx+1 downward
  const bodyRows = rows.slice(headerIdx + 1);

  // Filter rows for this lot:
  const filtered = bodyRows.filter(r => {
    const itemStr  = norm(r[map.item]);
    const lotFromItem = extractFirst4DigitsLot(itemStr);
    if (lotFromItem && lotFromItem === lot4) return true;

    if (map.lot !== -1) {
      const lotCell = norm(r[map.lot]);
      if (lotCell && lotCell.includes(lot4)) return true;
    }
    return false;
  });

  if (!filtered.length) {
    const seen = (headerRaw || []).map(h => norm(h)).join(' | ');
    throw new Error(
      `Lot ${lot4} not found in ${OLD_LOTS_SOURCE_TAB}. ` +
      `Ensure ITEM NAME contains the 4-digit lot (e.g., “… 5411 …”) or there is a LOT column.\n` +
      `Seen header row: ${seen}`
    );
  }

  // Aggregate quantity by shade (old source has no sizes)
  const shadeSum = new Map();
   const shadeCutting = new Map();
  let firstItem = '';
  const cuttingIdx = map.cutting;
  function mostCommon(arr) {
    const m = new Map();
    for (const v of arr) {
      const k = norm(v);
      if (!k) continue;
      m.set(k, (m.get(k) || 0) + 1);
    }
    let best = '', bestN = 0;
    for (const [k, n] of m.entries()) if (n > bestN) { best = k; bestN = n; }
    return best || '';
  }

  for (const r of filtered) {
    const shade = norm(r[map.shade]);
    const t = norm(r[map.qty]);
    const qty = t ? parseFloat(t.replace(/[, ]/g,'')) : 0;
    shadeSum.set(shade, (shadeSum.get(shade) ?? 0) + (Number.isFinite(qty) ? qty : 0));
    if (!firstItem) firstItem = norm(r[map.item]);
    if (cuttingIdx !== -1) {
     const prev = shadeCutting.get(shade) || [];
      prev.push(r[cuttingIdx]);
      shadeCutting.set(shade, prev);
    }
  }

  const rowsOut = Array.from(shadeSum.entries())
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([shade, pcs]) => ({
      color: shade,
 cuttingTable: (cuttingIdx !== -1)
       ? (() => {
            const raw = mostCommon(shadeCutting.get(shade) || []);
            // keep only trailing digits (e.g. "CUTTING 05" -> "05")
            const m = raw.match(/(\d+)$/);
            return m ? m[1] : raw;
          })()
        : null,
      sizes: {},      // no size split on old lots
      totalPcs: pcs
    }));

const meta = await fetchOldLotMeta(lot4, signal);
return {
  source: 'old',
  lotNumber: lot4,
// - item:        meta.item || '',
// - style:       meta.style || firstItem.replace(/\b(\d{4})\b/, '').trim(),
// - fabric:      meta.fabric || '',
// - garmentType: meta.garmentType || '',
 garmentType: meta.garmentType || '',  // mapped from ITEM column
 style:       meta.style || firstItem.replace(/\b(\d{4})\b/, '').trim(),
 fabric:      meta.fabric || '',
 category:    meta.category || '',
  sizes: [],
  rows: rowsOut,
  totals: { perSize: {}, grand: rowsOut.reduce((s,r)=>s+(r.totalPcs||0),0) }
};
}

// ============================
// Cutting parsers
// ============================
function parseMatrixWithIndexInfo(rows, lotInfo) {
  console.log('Parsing with index info:', lotInfo);
  console.log('Rows to parse:', rows);

  let lotNumber = lotInfo.lotNumber;
  let style = lotInfo.style || '';
  let fabric = lotInfo.fabric || '';
  let garmentType = lotInfo.garmentType || '';
  const headerCols = lotInfo.headerCols || 7;

  // Extract style/fabric/garment type if present in the sheet
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const r = rows[i] || [];

    if (includes(r[0], 'lot number') && r[1]) {
      lotNumber = norm(r[1]);
      const idxStyle = r.findIndex((c) => includes(c, 'style'));
      if (idxStyle !== -1 && r[idxStyle + 1]) style = norm(r[idxStyle + 1]);
    }
    if (includes(r[0], 'fabric') && r[1]) {
      fabric = norm(r[1]);
      const idxGT = r.findIndex((c) => includes(c, 'garment type'));
      if (idxGT !== -1 && r[idxGT + 1]) garmentType = norm(r[idxGT + 1]);
    }

    const styleIdx = r.findIndex(c => includes(c, 'style'));
    if (styleIdx !== -1 && r[styleIdx + 1] && !style) style = norm(r[styleIdx + 1]);

    const fabricIdx = r.findIndex(c => includes(c, 'fabric'));
    if (fabricIdx !== -1 && r[fabricIdx + 1] && !fabric) fabric = norm(r[fabricIdx + 1]);

    const garmentTypeIdx = r.findIndex(c => includes(c, 'garment type'));
    if (garmentTypeIdx !== -1 && r[garmentTypeIdx + 1] && !garmentType) garmentType = norm(r[garmentTypeIdx + 1]);
  }

  let headerIdx = -1;

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const r = rows[i] || [];

    const hasColor = r.some(c => includes(c, 'color'));
    const hasCT = r.some(c => includes(c, 'cutting table') || includes(c, 'table'));
    const hasSizes = r.some(c => !isNaN(parseFloat(c)) && isFinite(c));

    if ((hasColor && hasCT) || (hasColor && hasSizes) || (hasCT && hasSizes)) {
      headerIdx = i;
      console.log('Found header at row:', i);
      break;
    }
  }

  if (headerIdx === -1) {
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const r = rows[i] || [];
      const textCols = r.filter(c => typeof c === 'string' && c.trim().length > 2);
      const numberCols = r.filter(c => !isNaN(parseFloat(c)) && isFinite(c));
      if (textCols.length >= 2 && numberCols.length >= 2) { headerIdx = i; break; }
    }
    if (headerIdx === -1) {
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const r = rows[i] || [];
        if (r.some(cell => norm(cell))) { headerIdx = i; break; }
      }
    }
  }

  if (headerIdx === -1) {
    console.error('Could not find header row in provided data');
    return null;
  }

  const header = rows[headerIdx].map(norm);

  let idxColor = header.findIndex(c => includes(c, 'color'));
  let idxCT = header.findIndex(c => includes(c, 'cutting table') || includes(c, 'table'));
  let idxTotal = header.findIndex(c => includes(c, 'total'));

  if (idxColor === -1) {
    for (let i = 0; i < header.length; i++) {
      if (header[i] && typeof header[i] === 'string' && header[i].length > 2) { idxColor = i; break; }
    }
  }
  if (idxCT === -1) {
    for (let i = (idxColor !== -1 ? idxColor + 1 : 0); i < header.length; i++) {
      if (header[i] && (includes(header[i], 'table') || includes(header[i], 'ct'))) { idxCT = i; break; }
    }
    if (idxCT === -1 && idxColor !== -1) idxCT = idxColor + 1;
  }

  const sizeCols = [];
  const startIdx = idxCT !== -1 ? idxCT + 1 : idxColor !== -1 ? idxColor + 1 : 0;
  const endIdx = idxTotal !== -1 ? idxTotal : Math.min(header.length, headerCols);

  for (let i = startIdx; i < endIdx; i++) {
    const colName = norm(header[i]);
    if (colName && !includes(colName, 'total') && !includes(colName, 'alter') && !includes(colName, 'pcs')) {
      sizeCols.push({ key: colName, index: i });
    } else if (!colName) {
      sizeCols.push({ key: `Size${i - startIdx + 1}`, index: i });
    }
  }

  if (sizeCols.length === 0) {
    for (let i = startIdx; i < endIdx; i++) {
      for (let j = headerIdx + 1; j < Math.min(headerIdx + 5, rows.length); j++) {
        const cellValue = rows[j]?.[i];
        if (cellValue && !isNaN(parseFloat(cellValue)) && isFinite(cellValue)) {
          const colName = norm(header[i]) || `Size${i - startIdx + 1}`;
          sizeCols.push({ key: colName, index: i });
          break;
        }
      }
    }
  }

  if (sizeCols.length === 0) {
    console.error('No size columns found');
    return null;
  }

  const sizeKeys = sizeCols.map(s => s.key);

  const allColors = new Set();
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const color = idxColor !== -1 && row[idxColor] !== undefined ? norm(row[idxColor]) : '';
    if (color && !includes(color, 'total')) allColors.add(color);
  }

  const body = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const color = idxColor !== -1 && row[idxColor] !== undefined ? norm(row[idxColor]) : '';
    if (!color) { if (body.length > 0) break; continue; }
    if (includes(color, 'total')) break;

    const cuttingTable = idxCT !== -1 && row[idxCT] !== undefined ? toNumOrNull(row[idxCT]) : null;

    const sizeMap = {};
    let rowTotal = 0;
    let hasData = false;

    for (const s of sizeCols) {
      const qty = row[s.index] !== undefined ? toNumOrNull(row[s.index]) : null;
      sizeMap[s.key] = qty;
      if (qty !== null) { rowTotal += qty; hasData = true; }
    }

    if (hasData) {
      const explicitTotal = idxTotal !== -1 && row[idxTotal] !== undefined ? toNumOrNull(row[idxTotal]) : null;
      const totalPcs = explicitTotal ?? rowTotal;
      body.push({ color, cuttingTable, sizes: sizeMap, totalPcs });
    }
  }

  if (allColors.size > body.length) {
    const existingColors = new Set(body.map(row => row.color));
    const missing = Array.from(allColors).filter(c => !existingColors.has(c));
    for (const color of missing) {
      const sizeMap = {};
      for (const s of sizeCols) sizeMap[s.key] = null;
      body.push({ color, cuttingTable: null, sizes: sizeMap, totalPcs: 0 });
    }
  }

  body.sort((a, b) => a.color.localeCompare(b.color));

  if (body.length === 0) return null;

  const totals = { perSize: {}, grand: 0 };
  for (const k of sizeKeys) totals.perSize[k] = 0;
  for (const row of body) {
    for (const k of sizeKeys) totals.perSize[k] += row.sizes[k] ?? 0;
    totals.grand += row.totalPcs ?? 0;
  }

  return {
    lotNumber,
    style,
    fabric,
    garmentType,
    sizes: sizeKeys,
    rows: body,
    totals
  };
}

async function searchInCuttingSheet(lotNo, signal) {
  console.log('Searching in Cutting sheet (fallback)');

  const range = encodeURIComponent('Cutting!A1:Z');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, { signal });

  if (!res.ok) throw new Error(`Failed to access Cutting sheet: ${res.status}`);

  const data = await res.json();
  if (!data?.values?.length) throw new Error('Cutting sheet is empty');

  const values = data.values;
  const section = sliceSectionForLot(values, lotNo);

  if (section?.length) {
    const parsed = parseMatrix(section, lotNo);
    if (parsed && parsed.rows.length) return parsed;
  }

  throw new Error('Lot not found in Cutting sheet');
}

function sliceSectionForLot(values, lotNo) {
  const rows = values;
  let start = -1;

  for (let i = 0; i < Math.min(rows.length, 200); i++) {
    const line = (rows[i] || []).join(' ');
    if (includes(line, 'cutting matrix') && includes(line, `lot ${lotNo}`)) { start = i; break; }
  }
  if (start === -1) {
    for (let i = 0; i < Math.min(rows.length, 200); i++) {
      const r = rows[i] || [];
      if (includes(r[0], 'lot number') && norm(r[1]) === norm(lotNo)) { start = Math.max(0, i - 1); break; }
    }
  }
  if (start === -1) return null;
  return rows.slice(start, Math.min(start + 80, rows.length));
}

const valOrEmpty = v => (v == null || v === 0 || v === '0' ? '' : v);

function toNumOrNull(v) {
  const t = norm(v);
  if (t === '') return null;
  const n = parseFloat(t.replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseMatrix(rows, lotNo) {
  let lotNumber = norm(lotNo);
  let style = '';
  let fabric = '';
  let garmentType = '';

  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const r = rows[i] || [];
    if (includes(r[0], 'lot number')) {
      if (r[1]) lotNumber = norm(r[1]);
      const idxStyle = r.findIndex((c) => includes(c, 'style'));
      if (idxStyle !== -1 && r[idxStyle + 1]) style = norm(r[idxStyle + 1]);
    }
    if (includes(r[0], 'fabric')) {
      if (r[1]) fabric = norm(r[1]);
      const idxGT = r.findIndex((c) => includes(c, 'garment type'));
      if (idxGT !== -1 && r[idxGT + 1]) garmentType = norm(r[idxGT + 1]);
    }
  }

  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || [];
    const hasColor = r.some((c) => includes(c, 'color'));
    const hasCT = r.some((c) => includes(c, 'cutting table'));
    if (hasColor && hasCT) { headerIdx = i; break; }
  }
  if (headerIdx === -1) {
    return { lotNumber, style, fabric, garmentType, sizes: [], rows: [], totals: { perSize: {}, grand: 0 } };
  }

  const header = rows[headerIdx].map(norm);
  const idxColor = header.findIndex((c) => includes(c, 'color'));
  const idxCT = header.findIndex((c) => includes(c, 'cutting table'));
  const idxTotal = header.findIndex((c) => includes(c, 'total'));

  const sizeCols = [];
  for (let i = idxCT + 1; i < header.length; i++) {
    if (i === idxTotal) break;
    if (norm(header[i])) sizeCols.push({ key: header[i], index: i });
  }
  const sizeKeys = sizeCols.map((s) => s.key);

  const allColors = new Set();
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const color = norm(row[idxColor]);
    if (color && !includes(color, 'total')) allColors.add(color);
  }

  const body = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const first = norm(row[idxColor]);
    if (!first) { if (body.length) break; continue; }
    if (includes(first, 'total')) break;

    const color = first;
    const cuttingTable = toNumOrNull(row[idxCT]);
    const sizeMap = {};
    let rowTotal = 0;
    for (const s of sizeCols) {
      const qty = toNumOrNull(row[s.index]);
      sizeMap[s.key] = qty;
      rowTotal += (qty ?? 0);
    }
    const explicitTotal = idxTotal !== -1 ? toNumOrNull(row[idxTotal]) : null;
    const totalPcs = explicitTotal ?? rowTotal;
    body.push({ color, cuttingTable, sizes: sizeMap, totalPcs });
  }

  if (allColors.size > body.length) {
    const existingColors = new Set(body.map(row => row.color));
    const missingColors = Array.from(allColors).filter(color => !existingColors.has(color));
    for (const color of missingColors) {
      const sizeMap = {};
      for (const s of sizeCols) sizeMap[s.key] = null;
      body.push({ color, cuttingTable: null, sizes: sizeMap, totalPcs: 0 });
    }
  }

  body.sort((a, b) => a.color.localeCompare(b.color));

  const totals = { perSize: {}, grand: 0 };
  for (const k of sizeKeys) totals.perSize[k] = 0;
  for (const row of body) {
    for (const k of sizeKeys) totals.perSize[k] += row.sizes[k] ?? 0;
    totals.grand += row.totalPcs ?? 0;
  }

  return { lotNumber, style, fabric, garmentType, sizes: sizeKeys, rows: body, totals };
}

function printableDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = String(dt.getFullYear()).slice(-2);
    return `${dd}.${mm}.${yy}`;
  } catch { return d; }
}

// ============================
// React component
// ============================
export default function IssuePacking() {
  const [lotInput, setLotInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [matrix, setMatrix] = useState(null);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issueDate, setIssueDate] = useState(() => todayLocalISO());
  const [supervisor, setSupervisor] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [confirming, setConfirming] = useState(false);
  // const [confirming, setConfirming] = useState(false);
  // ---- Supervisor suggestions (with persistence) ----
const LS_KEY_SUPERVISORS = 'issueStitching.supervisors';

const [supervisorOptions, setSupervisorOptions] = useState(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY_SUPERVISORS) || '[]');
    return uniqCaseInsensitive([...DEFAULT_SUPERVISORS, ...saved]);
  } catch {
    return DEFAULT_SUPERVISORS.slice();
  }
});

function saveSupervisorOptions(next) {
  const onlyCustom = next.filter(
    s => !DEFAULT_SUPERVISORS.map(x => x.toLowerCase()).includes((s || '').toLowerCase())
  );
  localStorage.setItem(LS_KEY_SUPERVISORS, JSON.stringify(onlyCustom));
}

function addSupervisorToOptions(name) {
  const t = titleCase(name);
  if (!t) return;
  const next = uniqCaseInsensitive([...supervisorOptions, t]);
  setSupervisorOptions(next);
  saveSupervisorOptions(next);
}

const typedIsNewSupervisor = useMemo(() => {
  const t = (supervisor ?? '').trim().toLowerCase();
  if (!t) return false;
  return !supervisorOptions.some(opt => (opt || '').toLowerCase() === t);
}, [supervisor, supervisorOptions]);


  const canSearch = useMemo(() => norm(lotInput).length > 0 && !loading, [lotInput, loading]);

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    if (!canSearch) return;

    setError('');
    setMatrix(null);
    setLoading(true);

    abortRef.current?.abort?.();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const data = await fetchLotMatrixViaSheetsApi(norm(lotInput), ctrl.signal);
      setMatrix(data);
    } catch (err) {
      setError(err?.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setLotInput('');
    setMatrix(null);
    setError('');
    abortRef.current?.abort?.();
  };

  const handleBack = () => {
    if (window.history?.length > 1) window.history.back();
    else window.close?.();
  };

  const openIssueDialog = () => {
    setDialogError('');
    setSupervisor('');
    setIssueDate(todayLocalISO());
    setShowIssueDialog(true);
  };
  const closeIssueDialog = () => {
    if (confirming) return;
    setShowIssueDialog(false);
  };

  const handleConfirmIssue = async () => {
  if (!norm(supervisor)) { setDialogError('Supervisor is required.'); return; }
  if (!matrix) { setDialogError('Nothing to submit. Search a lot first.'); return; }
  setDialogError('');
  setConfirming(true);

  try {
    // Only generate & download the PDF — no POST to Apps Script
    generateIssuePdf(matrix, { issueDate, supervisor });
    // (optional) remember custom supervisor for future suggestions
    addSupervisorToOptions(supervisor);
    setShowIssueDialog(false);
  } catch (e) {
    setDialogError(e?.message || 'Failed to generate PDF.');
  } finally {
    setConfirming(false);
  }
};


const displaySizes = useMemo(() => {
    if (!matrix) return [];
    return matrix.source === 'old'
      ? Array(5).fill('')     // 5 blank size headers for old lots (visual only)
      : (matrix.sizes || []);
  }, [matrix]);

  const columns = useMemo(
    () => (matrix ? ['Color', 'Cutting Table', ...displaySizes, 'Total Pcs'] : []),
    [matrix, displaySizes]
  );

  // ================= PDF (B/W, one page, new header, blanks for missing) =================
function generateIssuePdf(matrix, { issueDate, supervisor }) {
  if (!matrix) return;

  // ---------- helpers ----------
  const valOrEmpty = (v) => (v == null || v === '') ? '' : String(v);
  const numOrZero  = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
  function printableDate(d) {
    if (!d) return '';
    try {
      const dt = new Date(d);
      if (isNaN(dt)) return String(d);
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yy = dt.getFullYear();
      return `${dd}/${mm}/${yy}`;
    } catch { return String(d); }
  }
  const gcd2 = (a, b) => (!b ? a : gcd2(b, a % b));
  const gcdArr = (arr) => {
    const ints = arr.filter(x => x > 0).map(x => Math.round(x));
    if (!ints.length) return 1;
    return ints.reduce((g, x) => gcd2(g, x), ints[0]) || 1;
  };
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const mostCommon = (arr) => {
    if (!arr.length) return null;
    const freq = new Map();
    for (const x of arr) freq.set(x, (freq.get(x) || 0) + 1);
    let best = arr[0], bestC = 0;
    for (const [k, v] of freq.entries()) {
      if (v > bestC || (v === bestC && k > best)) { best = k; bestC = v; }
    }
    return best;
  };

  // ---------- sizes / set label ----------
  const sizesRaw = (matrix.source === 'old' ? Array(5).fill('') : (matrix.sizes || []));
  const sizes = sizesRaw.map(s => (s == null || s === 0 || s === '0') ? '' : String(s));

  let perSetCandidates = [];
  if (matrix.source !== 'old' && Array.isArray(matrix.rows)) {
    perSetCandidates = (matrix.rows || []).map(r => {
      const qtys = sizes.map(s => numOrZero(r?.sizes?.[s]));
      const g = gcdArr(qtys);
      if (!g || g === 0) return 0;
      const parts = qtys.map(q => q > 0 ? Math.round(q / g) : 0);
      const pcsPerSet = sum(parts);
      return pcsPerSet || 0;
    }).filter(x => x > 0);
  }
  const computedSetPieces = mostCommon(perSetCandidates);
  const setPieces = computedSetPieces ?? sizes.filter(s => String(s).trim().length > 0).length;
  const setLabel  = setPieces > 0 ? `${setPieces} Pc` : '—';

  // ---------- doc (Page 1) ----------
  const firstPageOrientation = (sizes.length + 7) > 12 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation: firstPageOrientation, unit: 'pt', format: 'A3' });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  const borderPad = 6;
  const CM = M + borderPad;
  const line = 0.9;

  doc.setDrawColor(0); doc.setTextColor(0); doc.setLineWidth(line);
  // page border (first page; rest drawn in didDrawPage)
  doc.rect(8, 8, W - 16, H - 16);

  // ---------- header (4 sections; last = big "SET") ----------
  const headerTop = CM + 12;
  const contentWidth = W - (CM * 2);
  const minSectionW = 120;
  let sectionW = Math.floor(contentWidth / 4);
  if (sectionW < minSectionW) sectionW = minSectionW;
  if (sectionW * 4 > contentWidth) sectionW = Math.floor(contentWidth / 4);

  const s1X = CM;
  const s2X = s1X + sectionW;
  const s3X = s2X + sectionW;
  const s4X = s3X + sectionW;
  const sectionH = 64;

  // outer and inner boxes
  doc.setLineWidth(0.9);
  doc.rect(CM, headerTop - 6, sectionW * 4, sectionH + 12);
  doc.setLineWidth(0.6);
  doc.rect(s1X, headerTop, sectionW, sectionH);
  doc.rect(s2X, headerTop, sectionW, sectionH);
  doc.rect(s3X, headerTop, sectionW, sectionH);
  doc.rect(s4X, headerTop, sectionW, sectionH);

  // Title above header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('Checking and Packing Order', W / 2, headerTop - 10, { align: 'center' });

  function printLabelValue(label, value, x, y, labelFont = { style: 'bold', size: 11 }, valueFont = { style: 'normal', size: 11 }, maxValueW = null) {
    const pad = 6;
    doc.setFont('helvetica', labelFont.style);
    doc.setFontSize(labelFont.size);
    doc.text(label, x, y);
    const valueX = x + doc.getTextWidth(label) + pad;
    doc.setFont('helvetica', valueFont.style);
    doc.setFontSize(valueFont.size);
    let valText = String(value ?? '');
    if (maxValueW && doc.getTextWidth(valText) > maxValueW) {
      while (valText.length && doc.getTextWidth(valText + '…') > maxValueW) valText = valText.slice(0, -1);
      valText += '…';
    }
    doc.text(valText, valueX, y);
  }

  // Section 1 (Item + Date)
  const s1InnerX = s1X + 8;
  let s1Y = headerTop + 20;
  printLabelValue('Item', matrix.garmentType || '', s1InnerX, s1Y);
  s1Y += 20;
  printLabelValue('Date of Issue', printableDate(issueDate), s1InnerX, s1Y);

  // Section 2 (Fabric + Priority)
  const s2InnerX = s2X + 8;
  let s2Y = headerTop + 20;
  const availW2 = sectionW - (s2InnerX - s2X) - 16;
  const safeText = (label, text) => {
    let t = String(text || '');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    const lblW = doc.getTextWidth(label);
    const maxValueW = availW2 - lblW - 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    while (t && doc.getTextWidth(t + '…') > maxValueW) t = t.slice(0, -1);
    return t && doc.getTextWidth(t) <= maxValueW ? t : (t ? t + '…' : '');
  };
  printLabelValue('Fabric', safeText('Fabric', matrix.fabric), s2InnerX, s2Y);
  s2Y += 20;
  printLabelValue('Priority', safeText('Priority', matrix.priority), s2InnerX, s2Y);

  // Section 3 (Lot No + C&P Supervisor)
  const s3InnerX = s3X + 8;
  let s3Y = headerTop + 20;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  const lotLabel = 'Lot No.';
  const lotLabelW = doc.getTextWidth(lotLabel);
  const lotAvail = sectionW - (s3InnerX - s3X) - lotLabelW - 16;
  let lotToPrint = String(matrix.lotNumber || '');
  let lotFs = 12; doc.setFontSize(lotFs);
  while (doc.getTextWidth(lotToPrint) > lotAvail && lotFs > 8) { lotFs -= 0.5; doc.setFontSize(lotFs); }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(lotLabel, s3InnerX, s3Y);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(lotFs);
  doc.text(lotToPrint, s3InnerX + lotLabelW + 6, s3Y);

  s3Y += 20;
  const supLabel = 'C&P Supervisor:';
  const supLabelWFull = doc.getTextWidth(supLabel);
  const supAvailW = sectionW - (s3InnerX - s3X) - supLabelWFull - 16;
  let supToPrint = (supervisor ?? '').trim() || '________';
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(supLabel, s3InnerX, s3Y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  while (supToPrint && doc.getTextWidth(supToPrint + '…') > supAvailW) supToPrint = supToPrint.slice(0, -1);
  if (doc.getTextWidth(supToPrint) > supAvailW) supToPrint += '…';
  doc.text(supToPrint, s3InnerX + supLabelWFull + 6, s3Y);

  // Section 4 (BIG SET only)
  const s4CenterX = s4X + sectionW / 2;
  const s4CenterY = headerTop + sectionH / 2 + 6;
  doc.setFont('helvetica', 'bold');
  let fs = 22; 
  doc.setFontSize(fs);
  const setText = `SET: ${setLabel}`;
  while (doc.getTextWidth(setText) > sectionW - 16 && fs > 14) { fs -= 1; doc.setFontSize(fs); }
  doc.text(setText, s4CenterX, s4CenterY, { align: 'center', baseline: 'middle' });

  // ---------- footer precompute ----------
  const hindiParagraphs = [
    'यहाँ पिंटू सर के हस्ताक्षर कराना अनिवार्य है। उनके हस्ताक्षर के बिना लॉट जारी नहीं किया जाएगा।',
    'लॉट पूरा होने के बाद पेपर को अकाउंट ऑफिस में जमा कराना है।'
  ];
  let notesImg = null, notesW = 0, notesH = 0;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontPx = 12, lineGap = 6, padding = 12;
    const maxTextW = Math.max(120, Math.min(560, W - 2 * CM - 40));
    ctx.font = `${fontPx}px "Noto Sans Devanagari", "Mangal", "Arial Unicode MS", sans-serif`;
    function wrapParagraph(paragraph) {
      const words = paragraph.split(' '), lines = [];
      let cur = '';
      for (const word of words) {
        const test = cur ? (cur + ' ' + word) : word;
        if (ctx.measureText(test).width > maxTextW && cur) { lines.push(cur); cur = word; }
        else cur = test;
      }
      if (cur) lines.push(cur);
      return lines;
    }
    const wrapped = [];
    for (const para of hindiParagraphs) {
      const lines = wrapParagraph(para);
      if (lines.length) {
        wrapped.push('• ' + lines[0]);
        for (let i = 1; i < lines.length; i++) wrapped.push('  ' + lines[i]);
      } else wrapped.push('• ' + para);
    }
    const maxLineWidth = Math.max(...wrapped.map(t => ctx.measureText(t).width));
    canvas.width  = Math.ceil(maxLineWidth + padding * 2);
    const lineHeight = Math.ceil(fontPx * 1.2);
    canvas.height = Math.ceil(padding * 2 + wrapped.length * lineHeight + (wrapped.length - 1) * lineGap);
    const ctx2 = canvas.getContext('2d');
    ctx2.fillStyle = '#000';
    ctx2.font = ctx.font;
    ctx2.textBaseline = 'top';
    let y = padding;
    for (const t of wrapped) { ctx2.fillText(t, padding, y); y += lineHeight + lineGap; }
    notesImg = canvas.toDataURL('image/png');
    notesW = Math.min(canvas.width, W - 2 * CM);
    notesH = canvas.height * (notesW / canvas.width);
  } catch { /* ignore */ }

  // Signatures (5 boxes)
  const signatureBoxes = [
    'Lot Allotment by Pintu',
    'Lot Issue (Stitching Head)',
    'Completed Lot (Stitching Sup)',
    'Completed Lot (Vinay)',
    'Completed Lot (Packing)'
  ];
  const sig = (() => {
    const gap = 18, minW = 120, prefW = 150, boxH = 52;
    const usableW = W - (CM * 2);
    const cols = signatureBoxes.length;
    let w = Math.floor((usableW - gap * (cols - 1)) / cols);
    if (w >= minW) return { rows: 1, cols, boxW: Math.min(prefW, w), boxH, gap, rowGap: 16 };
    const row1Cols = Math.ceil(cols / 2), row2Cols = cols - row1Cols;
    let w1 = Math.floor((usableW - gap * (row1Cols - 1)) / row1Cols);
    let w2 = Math.floor((usableW - gap * (row2Cols - 1)) / Math.max(1, row2Cols));
    const boxW = Math.max(Math.min(prefW, w1, w2), minW);
    return { rows: 2, colsRow1: row1Cols, colsRow2: row2Cols, boxW, boxH, gap, rowGap: 16 };
  })();

  const stickerW = 180, stickerH = 72, stickerGapAbove = 10;
  const sigBlockH = sig.rows === 1 ? sig.boxH : (sig.boxH * 2 + sig.rowGap);
  const footerPadTop = 8, footerPadBottom = 12;
  const footerHeight = stickerH + stickerGapAbove + sigBlockH + 18 + (notesH || 36) + footerPadTop + footerPadBottom;

  // ---------- main "shades" table (Page 1) ----------
  const headerBottomY = headerTop + sectionH + 6;
  const tableTop = headerBottomY + 8;

  const head = [[ 'KARIGAR', 'COLOR', ...sizes, 'PCS', 'ALTER', 'PC RECD', 'SHORT PC', 'SHORT RECD' ]];

  const body = (matrix.rows || []).map((r) => ([
    '',
    valOrEmpty(r.color),
    ...(matrix.source === 'old'
      ? Array(sizes.length).fill('')
      : sizes.map(s => valOrEmpty(r.sizes?.[s]))
    ),
    valOrEmpty(r.totalPcs),
    '',
    '',
    '',
    ''
  ]));
  const foot = [[ '', 'TOTAL', ...sizes.map(() => ''), valOrEmpty(matrix.totals?.grand), '', '', '', '' ]];

  // ---------- (PAGE 1) widths & fonts tweak ----------
  const fixedW = {
    karigar: 95,
    color:   96,
    pcs:     60,
    alter:   76,
    pcrec:   76,
    shortpc: 76,
    shortrec:76,
  };
  const fixedSum = Object.values(fixedW).reduce((a, b) => a + b, 0);
  const sizesCount = sizes.length;
  const desiredSizeW = 26; // wider size columns
  const available = W - (CM * 2);
  const sizeW = sizesCount ? Math.max(Math.floor((available - fixedSum) / sizesCount), desiredSizeW) : 0;

  const idxKarigar = 0, idxColor = 1, idxFirstSize = 2;
  const idxPcs = idxFirstSize + sizesCount;
  const idxAlter = idxPcs + 1, idxPcReceived = idxAlter + 1, idxShortPc = idxPcReceived + 1, idxShortReceived = idxShortPc + 1;

  const columnStyles = {
    [idxKarigar]:       { halign: 'left',   cellWidth: fixedW.karigar, overflow: 'linebreak' },
    [idxColor]:         { halign: 'left',   cellWidth: fixedW.color,   overflow: 'linebreak' },
    [idxPcs]:           { halign: 'center', cellWidth: fixedW.pcs,     overflow: 'linebreak' },
    [idxAlter]:         { halign: 'center', cellWidth: fixedW.alter,   overflow: 'linebreak' },
    [idxPcReceived]:    { halign: 'center', cellWidth: fixedW.pcrec,   overflow: 'linebreak' },
    [idxShortPc]:       { halign: 'center', cellWidth: fixedW.shortpc, overflow: 'linebreak' },
    [idxShortReceived]: { halign: 'center', cellWidth: fixedW.shortrec,overflow: 'linebreak' },
  };
  for (let i = 0; i < sizesCount; i++) {
    columnStyles[idxFirstSize + i] = { halign: 'center', cellWidth: sizeW, overflow: 'linebreak' };
  }

  // Slight font bump + **tighter rows** (so later signatures fit)
  const page1BodyFontSize = 10;
  const page1HeadFontSize = 11;
  const page1FootFontSize = 11;
  const rowMinH1 = 16;   // was 20
  const padY1    = 4;    // was 7

  autoTable(doc, {
    head, body, foot,
    startY: tableTop,
    theme: 'grid',
    pageBreak: 'auto',
    tableWidth: available,
    styles: {
      font: 'helvetica',
      fontSize: page1BodyFontSize,
      textColor: [0,0,0],
      lineColor: [0,0,0],
      lineWidth: line,
      minCellHeight: rowMinH1,
      cellPadding: { top: padY1, right: 5, bottom: padY1, left: 5 },
      halign: 'center',
      valign: 'middle',
      overflow: 'linebreak'
    },
    headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', fontSize: page1HeadFontSize, halign: 'center' },
    footStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', fontSize: page1FootFontSize, halign: 'center' },
    columnStyles,
    margin: { left: CM, right: CM, bottom: CM + footerHeight },
    didDrawPage: (data) => drawFooterAndBorder(doc, data, {
      CM, line, notesImg, notesW, notesH, signatureBoxes: signatureBoxes, sig,
      stickerW, stickerH, stickerGapAbove, footerHeight, footerPadTop
    })
  });

  // ===================== PAGE 2 (Landscape) =====================
  doc.addPage('A3', 'landscape');
  const W2 = doc.internal.pageSize.getWidth();
  const H2 = doc.internal.pageSize.getHeight();
  const CM2 = CM;
  const tableWidth2 = W2 - (CM2 * 2);

  // Page 2 border
  doc.setDrawColor(0); doc.setLineWidth(line);
  doc.rect(8, 8, W2 - 16, H2 - 16);

  // --- PAGE 2 top full-width header BOX (ALL FIELDS IN ONE ROW) ---
  const boxTop = CM2 + 14;
  const boxH = 46;
  const boxLeft = CM2;
  const boxRight = W2 - CM2;

  // outer box
  doc.setDrawColor(0); doc.setLineWidth(line);
  doc.rect(boxLeft, boxTop, boxRight - boxLeft, boxH);

  // split into 4 equal columns
  const colCount = 4;
  const colW = (boxRight - boxLeft) / colCount;
  const colX = (i) => boxLeft + i * colW;

  // vertical dividers
  for (let i = 1; i < colCount; i++) doc.line(colX(i), boxTop, colX(i), boxTop + boxH);

  // baseline + padding
  const padX2 = 10;
  const baseY = boxTop + 30;
  const labelFS = 14;
  const valueFS = 14;

  // helper to fit text
  function fitText(txt, maxW, fontStyle = 'normal', fontSize = valueFS) {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    let t = String(txt ?? '');
    if (doc.getTextWidth(t) <= maxW) return t;
    while (t.length && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1);
    return t ? (t + '…') : '';
  }
  // render one cell (Lot value can be bold)
  function renderCell(colIndex, label, value, valueBold = false) {
    const x = colX(colIndex) + padX2;
    const maxW = colW - padX2 * 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(labelFS);
    const lblW = doc.getTextWidth(label);
    const gap = 4;
    const valMax = Math.max(0, maxW - lblW - gap);

    const fitted = fitText(value, valMax, valueBold ? 'bold' : 'normal', valueFS);

    doc.text(label, x, baseY);
    doc.setFont('helvetica', valueBold ? 'bold' : 'normal');
    doc.setFontSize(valueFS);
    doc.text(fitted, x + lblW + gap, baseY);
  }

  // Four columns: Lot No. | Supervisor | Item | Date of Issue
  renderCell(0, 'Lot No: ', String(matrix.lotNumber || ''), true); // value bold
  renderCell(1, 'C&P Supervisor: ', (supervisor ?? '________'));
  renderCell(2, 'Item: ', String(matrix.garmentType || ''));
  renderCell(3, 'Date of Issue: ', printableDate(issueDate));

  const summaryStartY = boxTop + boxH + 18;

  // ---------- Sets Summary table (Page 2 ONLY) ----------
  const summaryHead = [[
    'SHADE',
    'NO. OF SETS',
    'PCS/SET',
    'TOTAL PCs',
    'BALANCE',
    'PER-SET BREAKDOWN',
    'VINAY WORKING'
  ]];

  const summaryBody = (matrix.rows || []).map((r) => {
    const color = valOrEmpty(r.color);
    const qtys = (matrix.source === 'old') ? [] : sizes.map(s => numOrZero(r.sizes?.[s]));
    const sets = Math.max(1, gcdArr(qtys));
    const perSetParts = sizes.map(s => numOrZero(r.sizes?.[s]) / sets);
    const perSetSum = perSetParts.reduce((a,b)=>a+b,0);
    const totalPcs = numOrZero(r.totalPcs) || qtys.reduce((a,b)=>a+b,0);

    const breakdown = sizes
      .map((s, i) => ({ s, v: perSetParts[i] || 0 }))
      .filter(x => x.s && x.v > 0)
      .map(x => `${x.s}:${x.v}`)
      .join(', ');

    const detailLine = `${sets} ${sets === 1 ? 'set' : 'sets'} × ${perSetSum} pcs/set = ${totalPcs} pcs`;
    const perSetBreakdown = breakdown ? `${breakdown}\n${detailLine}` : detailLine;

    const balance = '';
    const vinayWorking = '';

    return [color, String(sets), String(perSetSum), String(totalPcs), balance, perSetBreakdown, vinayWorking];
  });

  // widths: enlarge SHADE, BALANCE, VINAY; let BREAKDOWN fill remaining
  const shadeW = 150;
  const noSetsW = 110;
  const pcsPerSetW = 90;
  const totalPcsW = 110;
  const balanceW = 220;
  const vinayW = 260;
  const totalFixedW = shadeW + noSetsW + pcsPerSetW + totalPcsW + balanceW + vinayW;
  const breakdownW = Math.max(220, tableWidth2 - totalFixedW);

  const page2BodyFontSize = 11;
  const page2HeadFontSize = 12;

  // Reserve space for Vinay signature at bottom of page 2
  const SIG_RESERVE = 70;

  // **Tighter rows** on Page 2 so we avoid spilling to page 3
  const rowMinH2 = 16;
  const padY2    = 4;

  autoTable(doc, {
    head: summaryHead,
    body: summaryBody,
    startY: summaryStartY,
    theme: 'grid',
    pageBreak: 'auto',
    tableWidth: tableWidth2,
    styles: {
      font: 'helvetica',
      fontSize: page2BodyFontSize,
      textColor: [0,0,0],
      lineColor: [0,0,0],
      lineWidth: line,
      minCellHeight: rowMinH2,
      cellPadding: { top: padY2, right: 5, bottom: padY2, left: 5 },
      valign: 'middle'
    },
    headStyles:{ fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', fontSize: page2HeadFontSize, halign: 'center' },
    columnStyles: {
      0: { halign: 'left',   cellWidth: shadeW },
      1: { halign: 'center', cellWidth: noSetsW },
      2: { halign: 'center', cellWidth: pcsPerSetW },
      3: { halign: 'center', cellWidth: totalPcsW },
      4: { halign: 'center', cellWidth: balanceW },
      5: { halign: 'left',   cellWidth: breakdownW },
      6: { halign: 'left',   cellWidth: vinayW },
    },
    // leave room so the signature never goes to page 3
    margin: { left: CM2, right: CM2, bottom: CM2 + SIG_RESERVE },
    didDrawPage: () => {
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      doc.setDrawColor(0); doc.setLineWidth(line);
      doc.rect(8, 8, pw - 16, ph - 16);
    }
  });

  // --- PAGE 2: Vinay signature line (single row, clamped to page) ---
// --- PAGE 2: Vinay signature (bottom-right corner, stays on page 2) ---
{
  const label = 'Vinay Signature';
  const lineLen = 220;                 // length of underline
  const gap = 8;                       // gap between label and line

  // Safe bottom/right inside border
  const y = H2 - CM2 - 22;             // vertical position near bottom
  const xEnd = W2 - CM2;               // right inner margin
  const xStart = xEnd - lineLen;       // line start so it fits
  const xLabelRight = xStart - gap;    // label ends just before the line

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);

  // draw label right-aligned so it hugs the line
  doc.text(label, xLabelRight, y, { align: 'right' });

  // underline to the right of the label
  doc.setLineWidth(0.8);
  doc.line(xStart, y + 2, xEnd, y + 2);
}

  // ---------- save ----------
  const fname = `Lot_${matrix.lotNumber || 'Unknown'}_Issue_${(issueDate || '').replace(/-/g, '')}.pdf`;
  doc.save(fname);

  // ---------- footer/border renderer (Page 1 only) ----------
  function drawFooterAndBorder(doc, data, cfg) {
    const {
      CM, line, notesImg, notesW, notesH, signatureBoxes, sig,
      stickerW, stickerH, stickerGapAbove, footerHeight, footerPadTop
    } = cfg;

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // page border
    doc.setDrawColor(0); doc.setLineWidth(line);
    doc.rect(8, 8, pageW - 16, pageH - 16);

    // footer area top
    const footerTop = pageH - (CM + footerHeight) + footerPadTop;

    // ---------- Left: Quality Inspection Sticker ----------
    const stickerX = CM + 12;
    const stickerY = footerTop;
    doc.setFillColor(255,255,255);
    doc.setDrawColor(0); doc.setLineWidth(0.9);
    doc.rect(stickerX, stickerY, stickerW, stickerH, 'FD');

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Quality Inspection', stickerX + stickerW / 2, stickerY + 14, { align: 'center' });
    doc.setFontSize(12);
    doc.text('CHECKED', stickerX + stickerW / 2, stickerY + 28, { align: 'center' });

    doc.setLineWidth(0.6);
    doc.line(stickerX + 4, stickerY + 32, stickerX + stickerW - 4, stickerY + 32);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const pad = 6, fieldY = stickerY + 46, dateAreaW = 80;
    const dateAreaRight = stickerX + stickerW - pad;
    const dateAreaLeft = dateAreaRight - dateAreaW;
    doc.text('Lot No.', stickerX + pad, fieldY);
    doc.line(stickerX + pad + 36, fieldY + 2, dateAreaLeft - 8, fieldY + 2);
    const dateLabelX = dateAreaLeft + 6;
    doc.text('Date', dateLabelX, fieldY);
    doc.line(dateLabelX + 26, fieldY + 2, dateAreaRight, fieldY + 2);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('QUALITY HEAD', stickerX + stickerW - pad - 2, stickerY + stickerH - 8, { align: 'right' });

    // dashed accents on sticker border
    const dashGap = 4, dashLen = 2;
    let curX = stickerX + 4, topDashY = stickerY + 4, botDashY = stickerY + stickerH - 4;
    while (curX < stickerX + stickerW - 4) { doc.line(curX, topDashY, Math.min(curX + dashLen, stickerX + stickerW - 4), topDashY); curX += dashGap; }
    curX = stickerX + 4;
    while (curX < stickerX + stickerW - 4) { doc.line(curX, botDashY, Math.min(curX + dashLen, stickerX + stickerW - 4), botDashY); curX += dashGap; }
    let curY = stickerY + 4, leftDashX = stickerX + 4, rightDashX = stickerX + stickerW - 4;
    while (curY < stickerY + stickerH - 4) { doc.line(leftDashX, curY, leftDashX, Math.min(curY + dashLen, stickerY + stickerH - 4)); curY += dashGap; }
    curY = stickerY + 4;
    while (curY < stickerY + stickerH - 4) { doc.line(rightDashX, curY, rightDashX, Math.min(curY + dashLen, stickerY + stickerH - 4)); curY += dashGap; }

    // ---------- NEW: Right of sticker — Rate Box with divider & Pintu Signature ----------
    const rateGap = 16;
    let rateX = stickerX + stickerW + rateGap;
    const rateY = stickerY;
    const rateW = 180;
    const rateH = stickerH;
    if (rateX + rateW > pageW - CM) rateX = pageW - CM - rateW;

    doc.setFillColor(255,255,255);
    doc.setDrawColor(0); doc.setLineWidth(0.9);
    doc.rect(rateX, rateY, rateW, rateH, 'FD');

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    const rateLabel = 'Rate';
    const rateLabelX = rateX + 8;
    const rateLabelY = rateY + 22;
    doc.text(rateLabel, rateLabelX, rateLabelY);
    const underlineStart = rateLabelX + doc.getTextWidth(rateLabel) + 10;
    doc.setLineWidth(0.6);
    doc.line(underlineStart, rateLabelY + 2, rateX + rateW - 8, rateLabelY + 2);

    const dividerY = rateY + Math.round(rateH * 0.55);
    doc.line(rateX + 4, dividerY, rateX + rateW - 4, dividerY);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('PINTU SIGNATURE', rateX + rateW / 2, dividerY + 16, { align: 'center' });

    // ---------- signatures (centered, below stickers) ----------
    const sigTop = Math.max(stickerY + stickerH, rateY + rateH) + stickerGapAbove;
    const drawRow = (labels, y) => {
      const totalW = labels.length * sig.boxW + (labels.length - 1) * sig.gap;
      const startX = (pageW - totalW) / 2;
      for (let i = 0; i < labels.length; i++) {
        const x = startX + i * (sig.boxW + sig.gap);
        doc.rect(x, y, sig.boxW, sig.boxH);
        const sigLineY = y + Math.round(sig.boxH * 0.42);
        const sigPad = 12;
        doc.line(x + sigPad, sigLineY, x + sig.boxW - sigPad, sigLineY);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        doc.text(labels[i], x + sig.boxW / 2, y + sig.boxH - 8, { align: 'center' });
      }
    };
    if (sig.rows === 1) {
      drawRow(signatureBoxes, sigTop);
    } else {
      const row1 = signatureBoxes.slice(0, sig.colsRow1);
      const row2 = signatureBoxes.slice(sig.colsRow1);
      drawRow(row1, sigTop);
      drawRow(row2, sigTop + sig.boxH + sig.rowGap);
    }

    // notes image
    const notesTop = sigTop + (sig.rows === 1 ? sig.boxH : sig.boxH * 2 + sig.rowGap) + 18;
    if (notesImg) {
      const imgX = (pageW - notesW) / 2;
      doc.addImage(notesImg, 'PNG', imgX, notesTop, notesW, notesH);
    } else {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text('NOTE: Get Pintu sir’s signature. Lot cannot be issued without it.', CM, notesTop);
    }
  }
}

  return (
    <Wrap>
      <HeaderPaper>
        <TitleSection>
          <TitleIcon><FiScissors /></TitleIcon>
          <div>
            <h1>Issue to Packing</h1>
            <p>Search a Lot No. to view its Cutting Matrix and totals</p>
          </div>
        </TitleSection>

        <SearchSection>
          <Form onSubmit={handleSearch}>
            <SearchBox>
              <FiSearch />
              <input
                value={lotInput}
                onChange={(e) => setLotInput(e.target.value)}
                placeholder="Enter Lot No (e.g., 64003)"
                autoFocus
              />
            </SearchBox>

            <BtnRow>
              <GhostBtn
                as={motion.button}
                type="button"
                onClick={handleBack}
                whileTap={{ scale: 0.98 }}
                title="Go back"
              >
                <FiArrowLeft /> Back
              </GhostBtn>

              <PrimaryBtn as={motion.button} type="submit" disabled={!canSearch} whileTap={{ scale: 0.98 }}>
                {loading ? <Spinner /> : <><FiSearch /> Search</>}
              </PrimaryBtn>

              <GhostBtn as={motion.button} type="button" onClick={handleClear} whileTap={{ scale: 0.98 }}>
                <FiRefreshCw /> Reset
              </GhostBtn>
            </BtnRow>
          </Form>
        </SearchSection>
      </HeaderPaper>

      <AnimatePresence>
        {error && (
          <ErrorCard
            as={motion.div}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <FiAlertTriangle />
            <span>{error}</span>
          </ErrorCard>
        )}
      </AnimatePresence>

      {matrix ? (
        <ContentGrid>
          <InfoPanel>
            <PanelHeader><FiInfo /><h3>Lot Information</h3></PanelHeader>
            <InfoGrid>
              <InfoItem>
                <InfoIcon><FiPackage /></InfoIcon>
                <div><InfoLabel>Lot Number</InfoLabel><InfoValue>{matrix.lotNumber || '—'}</InfoValue></div>
              </InfoItem>
              <InfoItem>
                <InfoIcon><FiTag /></InfoIcon>
                <div><InfoLabel>Style</InfoLabel><InfoValue>{matrix.style || '—'}</InfoValue></div>
              </InfoItem>
              <InfoItem>
                <InfoIcon><FiGrid /></InfoIcon>
                <div><InfoLabel>Fabric</InfoLabel><InfoValue>{matrix.fabric || '—'}</InfoValue></div>
              </InfoItem>
              <InfoItem>
                <InfoIcon><FiTag /></InfoIcon>
                <div><InfoLabel>Garment Type</InfoLabel><InfoValue>{matrix.garmentType || '—'}</InfoValue></div>
              </InfoItem>
            </InfoGrid>
            <SummaryCard>
              <SummaryItem><SummaryLabel>Total Pieces</SummaryLabel><SummaryValue>{matrix.totals.grand}</SummaryValue></SummaryItem>
              <SummaryItem><SummaryLabel>Colors</SummaryLabel><SummaryValue>{matrix.rows.length}</SummaryValue></SummaryItem>
              <SummaryItem><SummaryLabel>Sizes</SummaryLabel><SummaryValue>{matrix.sizes.length}</SummaryValue></SummaryItem>
            </SummaryCard>
            <ActionsRow>
              <PrimaryBtn as={motion.button} type="button" onClick={openIssueDialog} whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }}>
                <FiCheck /> Download PDF
              </PrimaryBtn>
            </ActionsRow>
          </InfoPanel>

          <TablePanel>
            <PanelHeader><FiGrid /><h3>Cutting Matrix</h3></PanelHeader>
            <TableContainer>
              <Table>
                <thead>
                 <tr>{columns.map((c, i) => <th key={`${c || 'blank'}-${i}`}>{c || '\u00A0'}</th>)}</tr>
                </thead>
                <tbody>
                  {matrix.rows.map((r, idx) => (
                    <tr key={idx}>
                      <td>{r.color}</td>
                      <td className="num">{r.cuttingTable ?? ''}</td>
                    {matrix.source === 'old'
                        ? Array(5).fill(0).map((_, i) => <td key={`blank-${i}`} className="num"></td>)
                        : (matrix.sizes || []).map((s) => (
                            <td key={s} className="num">{r.sizes?.[s] ?? ''}</td>
                          ))
                      }
                      <td className="num strong">{r.totalPcs ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="strong">Total</td>
                    <td className="num">—</td>
{matrix.source === 'old'
                      ? Array(5).fill(0).map((_, i) => <td key={`blank-total-${i}`} className="num strong"></td>)
                      : (matrix.sizes || []).map((s) => (
                          <td key={s} className="num strong">{matrix.totals.perSize?.[s] ?? 0}</td>
                        ))
                    }                    <td className="num strong">{matrix.totals.grand}</td>
                  </tr>
                </tfoot>
              </Table>
            </TableContainer>
          </TablePanel>
        </ContentGrid>
      ) : (
        !loading && !error && (
          <HintCard>
            <FiInfo />
            <span>
              💡 Tip: If your spreadsheet has one tab per lot, name them like <code>Cutting Matrix — Lot 64003</code> or <code>Cutting Matrix - Lot 64003</code>. This component will find them automatically.
            </span>
          </HintCard>
        )
      )}

      {/* Issue dialog */}
      <AnimatePresence>
        {showIssueDialog && (
          <>
            <Backdrop initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeIssueDialog} />
            <Dialog
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
            >
              <DialogHeader>
                <h3><FiCheck /> Confirm Issue to Packing</h3>
                <IconBtn onClick={closeIssueDialog} aria-label="Close"><FiX /></IconBtn>
              </DialogHeader>

              <Field>
                <FieldLabel><FiCalendar /> Date of Issue</FieldLabel>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </Field>

            <Field>
  <FieldLabel><FiUser /> Supervisor</FieldLabel>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
    <input
      list="supervisorList"
      placeholder="Enter supervisor name"
      value={supervisor}
      onChange={(e) => setSupervisor(titleCase(e.target.value))}
    />
    {typedIsNewSupervisor && (
      <button
        type="button"
        onClick={() => addSupervisorToOptions(supervisor)}
        title="Add to suggestions"
        style={{
          whiteSpace: 'nowrap',
          borderRadius: 10,
          border: '2px solid #e2e8f0',
          background: '#fff',
          color: '#475569',
          fontWeight: 600,
          padding: '10px 12px',
          cursor: 'pointer'
        }}
      >
        + Add
      </button>
    )}
  </div>
  <datalist id="supervisorList">
    {supervisorOptions.map((name) => (
      <option key={name} value={name} />
    ))}
  </datalist>
</Field>


              {dialogError && (
                <InlineError>
                  <FiAlertTriangle />
                  <span>{dialogError}</span>
                </InlineError>
              )}

              <DialogActions>
                <GhostBtn as={motion.button} type="button" whileTap={{ scale: 0.98 }} onClick={closeIssueDialog} disabled={confirming}>Cancel</GhostBtn>
                <PrimaryBtn as={motion.button} type="button" whileTap={{ scale: 0.98 }} onClick={handleConfirmIssue} disabled={confirming} title="Confirm and save">
                  {confirming ? <Spinner /> : <><FiCheck /> Confirm Issue</>}
                </PrimaryBtn>
              </DialogActions>
            </Dialog>
          </>
        )}
      </AnimatePresence>
    </Wrap>
  );
}

/* =========================
   Styles
   ========================= */
const Wrap = styled.div`
  max-width: 1800px;
  margin: 0 auto;
  padding: 24px 20px 40px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #2d3748;
  background: #ffffffff;
  min-height: 100vh;
`;

const HeaderPaper = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: center;
  @media (max-width: 900px) { grid-template-columns: 1fr; gap: 20px; }
`;

const TitleSection = styled.div`
  display: flex; align-items: center; gap: 16px;
  h1 { margin: 0 0 6px 0; font-size: 1.8rem; font-weight: 700; color: #1e293b; }
  p { margin: 0; color: #64748b; font-size: 1rem; }
`;
const TitleIcon = styled.div`
  display: flex; align-items: center; justify-content: center;
  width: 60px; height: 60px; border-radius: 14px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white; font-size: 24px;
  box-shadow: 0 6px 12px rgba(99, 102, 241, 0.25);
`;

const SearchSection = styled.div` display: flex; flex-direction: column; gap: 16px; `;
const Form = styled.form`
  display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center;
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;
const SearchBox = styled.label`
  display: grid; grid-template-columns: 24px 1fr; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 12px; background: #f8fafc; border: 2px solid #e2e8f0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04); color: #114793ff; transition: all 0.2s ease;
  &:focus-within { border-color: #8b5cf6; box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15); }
  input { background: transparent; border: none; outline: none; color: #1e293b; font-size: 1rem; ::placeholder { color: #94a3b8; } }
`;

const BtnRow = styled.div` display: flex; gap: 10px; align-items: center; `;
const BaseBtn = styled.button`
  border-radius: 12px; padding: 12px 18px; font-weight: 600; display: inline-flex;
  align-items: center; gap: 8px; cursor: pointer; border: none; transition: all 0.2s ease; font-size: 0.95rem;
`;
const PrimaryBtn = styled(BaseBtn)`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; box-shadow: 0 4px 8px rgba(99, 102, 241, 0.3);
  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 12px rgba(99, 102, 241, 0.4); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const GhostBtn = styled(BaseBtn)` background: white; border: 2px solid #e2e8f0; color: #64748b; &:hover { background: #f8fafc; border-color: #cbd5e1; }`;

const Spinner = styled.div`
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.6); border-top-color: white;
  border-radius: 50%; animation: spin 0.8s linear infinite; @keyframes spin { to { transform: rotate(360deg); } }
`;

const ErrorCard = styled.div`
  margin-bottom: 24px; display: grid; grid-template-columns: 20px 1fr; gap: 10px; align-items: center;
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #dc2626;
  padding: 14px 16px; border-radius: 12px; font-weight: 500;
`;

const HintCard = styled.div`
  margin-top: 24px; padding: 16px; border-radius: 12px; background: white; border: 2px dashed #cbd5e1;
  color: #64748b; font-size: 0.95rem; line-height: 1.5; display: flex; align-items: center; gap: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
  code { background: #f1f5f9; padding: 3px 6px; border-radius: 6px; font-family: monospace; color: #475569; font-size: 0.9rem; }
`;

const ContentGrid = styled.div`
  display: grid; grid-template-columns: 1fr 2fr; gap: 24px;
  @media (max-width: 1100px) { grid-template-columns: 1fr; }
`;

const InfoPanel = styled.div`
  background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex; flex-direction: column; height: fit-content;
`;

const TablePanel = styled.div`
  background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden; display: flex; flex-direction: column;
`;

const PanelHeader = styled.div`
  display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;
  h3 { margin: 0; font-size: 1.2rem; font-weight: 600; color: #1e293b; }
  svg { color: #8b5cf6; }
`;

const InfoGrid = styled.div` display: grid; gap: 16px; margin-bottom: 24px; `;
const InfoItem = styled.div` display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: center; padding: 12px; background: #f8fafc; border-radius: 12px;`;
const InfoIcon = styled.div` display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; background: rgba(139, 92, 246, 0.1); color: #8b5cf6;`;
const InfoLabel = styled.div` font-size: 0.85rem; color: #64748b; font-weight: 500; margin-bottom: 4px; `;
const InfoValue = styled.div` font-weight: 600; color: #1e293b; font-size: 1rem; `;

const SummaryCard = styled.div` display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 12px;`;
const SummaryItem = styled.div` text-align: center; padding: 12px; `;
const SummaryLabel = styled.div` font-size: 0.85rem; color: #64748b; margin-bottom: 6px; `;
const SummaryValue = styled.div` font-weight: 700; color: #1e293b; font-size: 1.4rem; `;

const ActionsRow = styled.div` display: flex; justify-content: flex-end; margin-top: auto; `;
const TableContainer = styled.div` width: 100%; overflow: auto; `;

const Table = styled.table`
  width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.9rem;
  thead th { position: sticky; top: 0; background: #004f9eff; text-align: center; padding: 12px 14px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #fff; white-space: nowrap; border-radius: 1px; }
  tbody td, tfoot td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
  tbody tr { transition: background 0.2s ease; &:hover { background: #f8fafc; } }
  td.num { text-align: center; font-variant-numeric: tabular-nums; }
  td.strong, th.strong { font-weight: 700; }
  tfoot td { background: #f1f5f9; font-weight: 700; color: #1e293b; }
`;

/* ===== Modal styles ===== */
const Backdrop = styled(motion.div)` position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); z-index: 1000; `;
const Dialog = styled(motion.div)` position: fixed; top: 50%; left: 50%; width: min(500px, calc(100% - 32px)); transform: translate(-50%, -50%); background: white; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15); border-radius: 20px; padding: 24px; z-index: 1001; `;
// const DialogHeader = styled.div` display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 12px; margin-bottom: 20px; h3 { margin: 0; font-size: 1.3rem; font-weight: 600; color: #1e293b; display: flex; align-items:

const DialogHeader = styled.div` display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 12px; margin-bottom: 20px; h3 { margin: 0; font-size: 1.3rem; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 8px; }`;
const IconBtn = styled.button` display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: transparent; border: 1px solid #e2e8f0; color: #64748b; cursor: pointer; transition: all 0.2s ease; &:hover { background: #f8fafc; color: #475569; }`;
const Field = styled.label`
  display: grid; gap: 8px; margin: 16px 0 12px;
  input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 2px solid #e2e8f0; background: white; color: #1e293b; outline: none; transition: all 0.2s ease; font-size: 0.95rem;
    &:focus { border-color: #8b5cf6; box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15); } }
`;
const FieldLabel = styled.div` display: inline-flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #475569; font-weight: 500; `;
const InlineError = styled.div` margin-top: 12px; display: grid; grid-template-columns: 18px 1fr; gap: 8px; align-items: center; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #dc2626; padding: 10px 12px; border-radius: 10px; font-size: 0.9rem; `;
const DialogActions = styled.div` margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px; `;
