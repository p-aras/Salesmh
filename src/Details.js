import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx-js-style";

/* ===== Hardcoded credentials ===== */
const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const SPREADSHEET_ID = "1Hj3JeJEKB43aYYWv8gk2UhdU6BWuEQfCg5pBlTdBMNA";
const SHEET_NAME = "Cutting";
const RANGE = "A1:I";

/* ===== Utils ===== */
const num = (v) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

const useDebounced = (v, d = 250) => {
  const [val, setVal] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setVal(v), d);
    return () => clearTimeout(t);
  }, [v, d]);
  return val;
};

/* ===== Excel helpers ===== */
function encodeCol(c) {
  let s = "", n = c + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function encodeCell(r, c) {
  return `${encodeCol(c)}${r + 1}`;
}

function buildLotAoA(sec) {
  const { lotNumber, style, fabric, garmentType } = sec.meta;

  const title = [`Cutting Matrix — Lot ${lotNumber || ""}`];
  const metaRow1 = ["Lot Number:", lotNumber || "", "Style:", style || "", "Fabric:", fabric || ""];
  const metaRow2 = ["Garment Type:", garmentType || "", "", "", "", ""];
  const header = ["Color", "Cutting Table", ...sec.sizes, "Total Pcs"];

  const rows = sec.items.map((it) => {
    const per = sec.sizes.map((sz) => {
      const v = String(it.perSizes[sz] ?? "").trim();
      const n = Number(v);
      return Number.isFinite(n) ? n : (v || "");
    });
    return [it.shade, it.cuttingTable, ...per, ""];
  });

  const footer = Array(header.length).fill("");
  footer[0] = "Total";

  return [title, [], metaRow1, metaRow2, [], header, ...rows, footer];
}

function downloadLotExcelDesigned(sec) {
  const aoa = buildLotAoA(sec);
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const headerR = 5;
  const dataStartR = headerR + 1;
  const lastColIdx = aoa[headerR].length - 1;
  const lastColLetter = encodeCol(lastColIdx);
  const footerR = aoa.length - 1;

  ws["!merges"] = (ws["!merges"] || []).concat([{ s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } }]);
  ws["!cols"] = [{ wch: 20 }, { wch: 18 }, ...Array.from({ length: lastColIdx - 1 }, () => ({ wch: 9 }))];
  ws["!freeze"] = { xSplit: 2, ySplit: headerR + 1 };
  ws["!autofilter"] = { ref: `A${headerR + 1}:${lastColLetter}${aoa.length}` };

  const firstSizeCol = 2;
  const lastSizeCol = lastColIdx - 1;
  for (let r = dataStartR; r < footerR; r++) {
    const R = r + 1;
    ws[encodeCell(r, lastColIdx)] = {
      t: "n",
      f: `SUM(${encodeCol(firstSizeCol)}${R}:${encodeCol(lastSizeCol)}${R})`,
    };
  }

  for (let c = firstSizeCol; c <= lastSizeCol; c++) {
    const C = encodeCol(c);
    ws[encodeCell(footerR, c)] = {
      t: "n",
      f: `SUM(${C}${dataStartR + 1}:${C}${footerR})`,
    };
  }
  ws[encodeCell(footerR, lastColIdx)] = {
    t: "n",
    f: `SUM(${encodeCol(lastColIdx)}${dataStartR + 1}:${encodeCol(lastColIdx)}${footerR})`,
  };

  const border = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };
  
  const put = (r, c, style) => {
    const ref = encodeCell(r, c);
    if (!ws[ref]) ws[ref] = { t: "s", v: "" };
    ws[ref].s = { ...(ws[ref].s || {}), ...style };
  };

  put(0, 0, {
    font: { bold: true, sz: 16, color: { rgb: "1F2937" } },
    alignment: { horizontal: "center", vertical: "center" },
    fill: { fgColor: { rgb: "E5E7EB" } },
  });

  for (let r = 2; r <= 3; r++) {
    for (let c = 0; c <= 5; c++) {
      const ref = encodeCell(r, c);
      if (!ws[ref]) continue;
      ws[ref].s = { ...(ws[ref].s || {}), fill: { fgColor: { rgb: "F9FAFB" } }, border };
    }
  }
  
  [[2, 0], [2, 2], [2, 4], [3, 0], [3, 2], [3, 4]].forEach(([r, c]) =>
    put(r, c, { font: { bold: true } })
  );

  for (let c = 0; c <= lastColIdx; c++) {
    put(headerR, c, {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill: {
        fgColor: {
          rgb: c === 0 ? "7C3AED" : c === 1 ? "EC4899" : c === lastColIdx ? "10B981" : "F59E0B",
        },
      },
      border,
    });
  }

  for (let r = dataStartR; r < footerR; r++) {
    const alt = (r - dataStartR) % 2 === 1;
    for (let c = 0; c <= lastColIdx; c++) {
      const base = {
        alignment: { horizontal: c >= 2 ? "center" : c === 1 ? "center" : "left", vertical: "center" },
        ...(alt ? { fill: { fgColor: { rgb: "F8FAFC" } } } : {}),
        ...(c >= 2 ? { numFmt: "0" } : {}),
        border,
      };
      put(r, c, base);
      if (c === 0) put(r, c, { fill: { fgColor: { rgb: "F0F9FF" } } });
    }
  }

  for (let c = 0; c <= lastColIdx; c++) {
    put(footerR, c, {
      font: { bold: true, color: { rgb: "111827" } },
      alignment: { horizontal: c >= 2 ? "center" : "left", vertical: "center" },
      fill: { fgColor: { rgb: "DCFCE7" } },
      ...(c >= 2 ? { numFmt: "0" } : {}),
      border,
    });
  }

  const wb = XLSX.utils.book_new();
  const safeName = String(sec.meta.lotNumber || "Sheet1").replace(/[\\/*?:\\[\\]]/g, "_").slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, `Lot_${safeName}`);
  XLSX.writeFile(wb, `CuttingMatrix_${safeName}.xlsx`);
}

/* ===== Main component ===== */
export default function StylishCuttingViewer() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);

  const [lotFilter, setLotFilter] = useState("");
  const [fabricFilter, setFabricFilter] = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [garmentFilter, setGarmentFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        `${SHEET_NAME}!${RANGE}`
      )}?valueRenderOption=UNFORMATTED_VALUE&key=${API_KEY}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const values = data?.values || [];
      if (!values.length) throw new Error("No data found.");
      setRows(values);
    } catch (e) {
      setErr(e.message || "Failed to load sheet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sections = useMemo(() => {
    if (!rows.length) return [];
    const H = (r, c) => String(rows[r]?.[c] ?? "").trim();
    const out = [];
    let r = 0;
    while (r < rows.length) {
      const title = H(r, 0);
      const m = /^Cutting Matrix\s*[-—]\s*Lot\s*(.+)$/i.exec(title);
      if (!m) {
        r += 1;
        continue;
      }
      const lotFromTitle = String(m[1]).trim();

      const meta1 = rows[r + 1] || [];
      const meta2 = rows[r + 2] || [];
      const meta = {
        lotNumber: (meta1[1] && String(meta1[1]).trim()) || lotFromTitle,
        style: (meta1[3] && String(meta1[3]).trim()) || "",
        fabric: (meta2[1] && String(meta2[1]).trim()) || "",
        garmentType: (meta2[3] && String(meta2[3]).trim()) || "",
      };

      let hdr = r + 3;
      while (hdr < rows.length && !/^color$/i.test(H(hdr, 0))) hdr += 1;
      if (hdr >= rows.length) break;

      const headerRow = rows[hdr] || [];
      const sizeStart = 2;
      let sizeEnd = headerRow.length - 1;
      for (let i = sizeStart; i < headerRow.length; i++) {
        if (/^total\s*pcs$/i.test(String(headerRow[i] ?? ""))) {
          sizeEnd = i - 1;
          break;
        }
      }

      const sizes = [];
      for (let c = sizeStart; c <= sizeEnd; c++) {
        const s = String(headerRow[c] ?? "").trim();
        if (s) sizes.push(s);
      }

      const items = [];
      let rr = hdr + 1;
      while (rr < rows.length) {
        const first = H(rr, 0);
        if (/^total$/i.test(first)) break;
        if (first) {
          const perSizes = {};
          sizes.forEach((sz, i) => (perSizes[sz] = rows[rr]?.[sizeStart + i] ?? ""));
          items.push({ shade: first, cuttingTable: H(rr, 1), perSizes });
        }
        rr += 1;
      }

      const colTotals = sizes.map((sz) =>
        items.reduce((a, it) => a + num(it.perSizes[sz]), 0)
      );
      const grand = colTotals.reduce((a, v) => a + v, 0);

      out.push({ meta, sizes, items, colTotals, grand });
      r = rr + 2;
    }
    return out;
  }, [rows]);

  const optionSets = useMemo(() => {
    const lots = new Set();
    const fabrics = new Set();
    const styles = new Set();
    const garments = new Set();
    sections.forEach((s) => {
      if (s?.meta?.lotNumber) lots.add(s.meta.lotNumber);
      if (s?.meta?.fabric) fabrics.add(s.meta.fabric);
      if (s?.meta?.style) styles.add(s.meta.style);
      if (s?.meta?.garmentType) garments.add(s.meta.garmentType);
    });
    const toSortedArray = (st) =>
      Array.from(st).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
    return {
      lots: toSortedArray(lots),
      fabrics: toSortedArray(fabrics),
      styles: toSortedArray(styles),
      garments: toSortedArray(garments),
    };
  }, [sections]);

  const filtered = useMemo(() => {
    const t = dq.trim().toLowerCase();

    const matchSearch = (sec) => {
      if (!t) return true;
      const hay = [
        sec.meta.lotNumber,
        sec.meta.style,
        sec.meta.fabric,
        sec.meta.garmentType,
        ...sec.items.map((i) => i.shade),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(t);
    };

    const matchDropdowns = (sec) => {
      if (lotFilter && sec.meta.lotNumber !== lotFilter) return false;
      if (fabricFilter && sec.meta.fabric !== fabricFilter) return false;
      if (styleFilter && sec.meta.style !== styleFilter) return false;
      if (garmentFilter && sec.meta.garmentType !== garmentFilter) return false;
      return true;
    };

    return sections.filter((sec) => matchSearch(sec) && matchDropdowns(sec));
  }, [sections, dq, lotFilter, fabricFilter, styleFilter, garmentFilter]);

  const [active, setActive] = useState(null);

  const clearFilters = () => {
    setLotFilter("");
    setFabricFilter("");
    setStyleFilter("");
    setGarmentFilter("");
    setQ("");
  };

  return (
    <div className="wrap">
      <style>{css}</style>

      <header className="hero">
        <div className="hero__top">
          <div className="hero__title-group">
            <h1 className="hero__title">
              <span className="hero__title-text">Cutting Matrix</span>
              <span className="hero__title-badge">Dashboard</span>
            </h1>
            <div className="hero__sub">Professional cutting plan management system</div>
          </div>
          <div className="hero__stats">
            <div className="stat">
              <div className="stat__value">{sections.length}</div>
              <div className="stat__label">Total Lots</div>
            </div>
            <div className="stat">
              <div className="stat__value">{filtered.length}</div>
              <div className="stat__label">Filtered</div>
            </div>
          </div>
        </div>

        <div className="hero__controls">
          <div className="search-container">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              className="search"
              placeholder="Search lots, styles, fabrics, colors..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button className="search-clear" onClick={() => setQ("")}>
                ×
              </button>
            )}
          </div>

          <div className="filter-row">
            <select
              className="select"
              value={lotFilter}
              onChange={(e) => setLotFilter(e.target.value)}
            >
              <option value="">All Lots</option>
              {optionSets.lots.map((v) => (
                <option key={v} value={v}>
                  Lot {v}
                </option>
              ))}
            </select>

            <select
              className="select"
              value={fabricFilter}
              onChange={(e) => setFabricFilter(e.target.value)}
            >
              <option value="">All Fabrics</option>
              {optionSets.fabrics.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <select
              className="select"
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
            >
              <option value="">All Styles</option>
              {optionSets.styles.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <select
              className="select"
              value={garmentFilter}
              onChange={(e) => setGarmentFilter(e.target.value)}
            >
              <option value="">All Garments</option>
              {optionSets.garments.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="action-row">
            <button
              className="btn btn--back"
              onClick={() =>
                window.history.length > 1
                  ? window.history.back()
                  : (window.location.href = "/")
              }
              title="Back"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '6px'}}>
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>

            <button
              className="btn btn--secondary"
              onClick={fetchData}
              disabled={loading}
              title="Refresh data"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '6px'}}>
                <path d="M4 4V9H4.58152M19.9381 11C19.446 7.05369 16.0796 4 12 4C8.64262 4 5.76829 6.06817 4.58152 9M4.58152 9H9M20 20V15H19.4185M19.4185 15C18.2317 17.9318 15.3574 20 12 20C7.92038 20 4.55399 16.9463 4.06189 13M19.4185 15H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button 
              className="btn btn--secondary" 
              onClick={clearFilters}
              title="Clear all filters"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '6px'}}>
                <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Clear Filters
            </button>
          </div>
        </div>

        <div className="hero__meta">
          {loading ? (
            <div className="loading-indicator">
              <div className="loading-spinner"></div>
              Loading data...
            </div>
          ) : err ? (
            <div className="error-message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{marginRight: '8px'}}>
                <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {err}
            </div>
          ) : (
            <div className="summary">
              Showing <strong>{filtered.length}</strong> of <strong>{sections.length}</strong> lots
              {dq && ` • Searching: "${dq}"`}
            </div>
          )}
        </div>
      </header>

      {loading && <SkeletonGrid />}

      {!loading && !err && (
        <>
          {filtered.length > 0 ? (
            <div className="grid">
              {filtered.map((sec, i) => (
                <LotCard key={sec.meta.lotNumber + "-" + i} sec={sec} onOpen={() => setActive(sec)} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M9.172 3.171C7.983 1.983 6.017 1.983 4.828 3.171C3.644 4.356 3.644 6.317 4.828 7.5M9.172 3.171L4.828 7.5M9.172 3.171L20.828 14.829C22.017 16.017 22.017 17.983 20.828 19.172C19.644 20.356 17.683 20.356 16.5 19.172L4.828 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14.828 9.172C16.017 7.983 17.983 7.983 19.172 9.172C20.356 10.356 20.356 12.317 19.172 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 21H4C2.895 21 2 20.105 2 19V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 3H20C21.105 3 22 3.895 22 5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="empty-state__title">No results found</h3>
              <p className="empty-state__subtitle">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <button className="btn btn--primary" onClick={clearFilters}>
                Clear all filters
              </button>
            </div>
          )}
        </>
      )}

      {active && (
        <Modal onClose={() => setActive(null)}>
          <LotModal sec={active} />
        </Modal>
      )}
    </div>
  );
}

/* ===== Fancy card ===== */
function LotCard({ sec, onOpen }) {
  const { lotNumber, style, fabric, garmentType } = sec.meta;
  const totalColors = sec.items.length;
  
  return (
    <div className="card" onClick={onOpen}>
      <div className="card__top">
        <div className="badge">LOT {lotNumber || "—"}</div>
        <div className="color-count">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{marginRight: '4px'}}>
            <path d="M7 21C4.79086 21 3 19.2091 3 17C3 14.7909 4.79086 13 7 13C9.20914 13 11 14.7909 11 17C11 19.2091 9.20914 21 7 21Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11.7 11H19C20.6569 11 22 9.65685 22 8C22 6.34315 20.6569 5 19 5H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M6.3 11H5C3.34315 11 2 9.65685 2 8C2 6.34315 3.34315 5 5 5H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M17 21C14.7909 21 13 19.2091 13 17C13 14.7909 14.7909 13 17 13C19.2091 13 21 14.7909 21 17C21 19.2091 19.2091 21 17 21Z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          {totalColors} {totalColors === 1 ? 'Color' : 'Colors'}
        </div>
      </div>
      
      <div className="card__content">
        <h3 className="card__title">{style || "Unnamed Style"}</h3>
        <div className="card__meta">
          <div className="meta-item">
            <span className="meta-label">Fabric</span>
            <span className="meta-value">{fabric || "—"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Garment</span>
            <span className="meta-value">{garmentType || "—"}</span>
          </div>
        </div>
        
        <div className="sizes-container">
          <div className="sizes-label">Sizes:</div>
          <div className="sizes-grid">
            {sec.sizes.slice(0, 4).map((s) => (
              <div key={s} className="chip">
                {s}
              </div>
            ))}
            {sec.sizes.length > 4 && (
              <div className="chip chip--more">
                +{sec.sizes.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="card__footer">
        <div className="total-label">Total Pieces</div>
        <div className="total-value">
          <span className="total-number">{sec.grand.toLocaleString()}</span>
          <span className="total-unit">pcs</span>
        </div>
      </div>
      
      <div className="card__hover">
        <span>View Details</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

/* ===== Full-screen modal ===== */
function LotModal({ sec }) {
  const rowTotal = (it) => sec.sizes.reduce((a, sz) => a + num(it.perSizes[sz]), 0);
  
  return (
    <div className="modal__body">
      <div className="modal__header">
        <div className="modal__header-content">
          <div className="modal__title-group">
            <h2 className="modal__title">
              Lot {sec.meta.lotNumber}
              <span className="modal__subtitle">
                {sec.meta.style || "—"} • {sec.meta.fabric || "—"} • {sec.meta.garmentType || "—"}
              </span>
            </h2>
            <div className="modal__stats">
              <div className="modal-stat">
                <div className="modal-stat__value">{sec.items.length}</div>
                <div className="modal-stat__label">Colors</div>
              </div>
              <div className="modal-stat">
                <div className="modal-stat__value">{sec.sizes.length}</div>
                <div className="modal-stat__label">Sizes</div>
              </div>
              <div className="modal-stat">
                <div className="modal-stat__value">{sec.grand.toLocaleString()}</div>
                <div className="modal-stat__label">Total Pieces</div>
              </div>
            </div>
          </div>
          
          <div className="modal__actions">
            <button
              className="btn btn--export"
              onClick={() => downloadLotExcelDesigned(sec)}
              title="Download Excel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '6px'}}>
                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="modal__content">
        <div className="info-grid">
          <div className="info-item">
            <label>Lot Number</label>
            <div className="info-value">{sec.meta.lotNumber || "—"}</div>
          </div>
          <div className="info-item">
            <label>Style</label>
            <div className="info-value">{sec.meta.style || "—"}</div>
          </div>
          <div className="info-item">
            <label>Fabric</label>
            <div className="info-value">{sec.meta.fabric || "—"}</div>
          </div>
          <div className="info-item">
            <label>Garment Type</label>
            <div className="info-value">{sec.meta.garmentType || "—"}</div>
          </div>
        </div>

        <div className="table-container">
          <div className="table-scroll-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th th--color">
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '8px'}}>
                        <path d="M7 21C4.79086 21 3 19.2091 3 17C3 14.7909 4.79086 13 7 13C9.20914 13 11 14.7909 11 17C11 19.2091 9.20914 21 7 21Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M11.7 11H19C20.6569 11 22 9.65685 22 8C22 6.34315 20.6569 5 19 5H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M6.3 11H5C3.34315 11 2 9.65685 2 8C2 6.34315 3.34315 5 5 5H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M17 21C14.7909 21 13 19.2091 13 17C13 14.7909 14.7909 13 17 13C19.2091 13 21 14.7909 21 17C21 19.2091 19.2091 21 17 21Z" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      Color
                    </div>
                  </th>
                  <th className="th th--table">
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '8px'}}>
                        <path d="M4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M2 10H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M2 15H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M8 4V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M16 4V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Cutting Table
                    </div>
                  </th>
                  {sec.sizes.map((s) => (
                    <th key={s} className="th th--size">
                      <div className="th-content">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{marginRight: '6px'}}>
                          <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M16 21V3C16 2.46957 15.7893 1.96086 15.4142 1.58579C15.0391 1.21071 14.5304 1 14 1H10C9.46957 1 8.96086 1.21071 8.58579 1.58579C8.21071 1.96086 8 2.46957 8 3V21" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                        {s}
                      </div>
                    </th>
                  ))}
                  <th className="th th--total">
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '8px'}}>
                        <path d="M8 17H16M8 12H16M12 17V7M7 21H17C18.1046 21 19 20.1046 19 19V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Total Pcs
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sec.items.map((it, i) => (
                  <tr key={it.shade + i} className={i % 2 ? "tr--alt" : ""}>
                    <td className="td td--color">
                      <div className="shade-indicator"></div>
                      {it.shade}
                    </td>
                    <td className="td td--table">{it.cuttingTable}</td>
                    {sec.sizes.map((s) => (
                      <td key={s} className="td td--size">
                        {String(it.perSizes[s] ?? "")}
                      </td>
                    ))}
                    <td className="td td--total">{rowTotal(it).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="tr--footer">
                  <td className="td td--footer">
                    <strong>Total</strong>
                  </td>
                  <td className="td td--footer"></td>
                  {sec.colTotals.map((v, i) => (
                    <td key={i} className="td td--footer td--total">
                      <strong>{v.toLocaleString()}</strong>
                    </td>
                  ))}
                  <td className="td td--footer td--grand">
                    <strong>{sec.grand.toLocaleString()}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Modal container ===== */
function Modal({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const html = document.documentElement;
    html.style.overflow = 'hidden';
    
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <button 
          className="modal__close" 
          onClick={onClose} 
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

/* ===== Skeleton ===== */
function SkeletonGrid() {
  return (
    <div className="grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton">
          <div className="skeleton__header"></div>
          <div className="skeleton__title"></div>
          <div className="skeleton__meta">
            <div className="skeleton__line"></div>
            <div className="skeleton__line"></div>
          </div>
          <div className="skeleton__chips"></div>
          <div className="skeleton__footer"></div>
        </div>
      ))}
    </div>
  );
}

/* ===== CSS ===== */
const css = `
:root {
  --primary: #4F46E5;
  --primary-light: #EEF2FF;
  --secondary: #7C3AED;
  --accent: #EC4899;
  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  
  --radius-sm: 6px;
  --radius: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.wrap {
  min-height: 100vh;
  color: var(--gray-800);
  padding: 24px;
}

/* Hero Section */
.hero {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-2xl);
  padding: 32px;
  margin-bottom: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: var(--shadow-xl);
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--secondary), var(--accent));
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
}

.hero__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
}

.hero__title-group {
  flex: 1;
}

.hero__title {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.hero__title-text {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.025em;
}

.hero__title-badge {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.hero__sub {
  color: var(--gray-500);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
}

.hero__stats {
  display: flex;
  gap: 24px;
}

.stat {
  text-align: right;
}

.stat__value {
  font-size: 28px;
  font-weight: 800;
  color: var(--gray-900);
  line-height: 1;
}

.stat__label {
  font-size: 14px;
  color: var(--gray-500);
  font-weight: 500;
  margin-top: 4px;
}

/* Search & Filters */
.search-container {
  position: relative;
  flex: 1;
  min-width: 300px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
  pointer-events: none;
}

.search {
  width: 100%;
  padding: 14px 48px 14px 48px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  background: white;
  color: var(--gray-800);
  font-size: 15px;
  font-weight: 500;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.search:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
  transform: translateY(-1px);
}

.search-clear {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--gray-100);
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-500);
  cursor: pointer;
  font-size: 18px;
  font-weight: 400;
  transition: all 0.2s ease;
}

.search-clear:hover {
  background: var(--gray-200);
  color: var(--gray-700);
}

.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 16px 0;
}

.select {
  min-width: 180px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--gray-200);
  background: white;
  color: var(--gray-800);
  font-size: 14px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.action-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  gap: 8px;
  box-shadow: var(--shadow-sm);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--back {
  background: var(--gray-100);
  color: var(--gray-700);
  border: 1px solid var(--gray-200);
}

.btn--back:hover:not(:disabled) {
  background: var(--gray-200);
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

.btn--secondary {
  background: white;
  color: var(--gray-700);
  border: 1px solid var(--gray-200);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--gray-50);
  transform: translateY(-1px);
  box-shadow: var(--shadow);
  border-color: var(--gray-300);
}

.btn--primary {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
}

.btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  opacity: 0.95;
}

.btn--export {
  background: linear-gradient(135deg, var(--success), #34D399);
  color: white;
}

.btn--export:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  opacity: 0.95;
}

.hero__meta {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--gray-100);
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--gray-600);
  font-weight: 500;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--gray-200);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  display: flex;
  align-items: center;
  color: var(--danger);
  font-weight: 500;
  background: rgba(239, 68, 68, 0.1);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.summary {
  color: var(--gray-600);
  font-size: 14px;
  font-weight: 500;
}

.summary strong {
  color: var(--gray-800);
  font-weight: 600;
}

/* Grid & Cards */
.grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  max-width: 1920px;
  margin: 0 auto;
}

.card {
  background: white;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  border: 1px solid var(--gray-100);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  border-color: var(--gray-200);
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
}

.card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
}

.badge {
  background: linear-gradient(135deg, var(--primary-light), #E0E7FF);
  color: var(--primary);
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.color-count {
  display: flex;
  align-items: center;
  color: var(--gray-600);
  font-size: 13px;
  font-weight: 600;
  background: var(--gray-50);
  padding: 6px 12px;
  border-radius: var(--radius);
}

.card__content {
  padding: 0 24px;
}

.card__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 16px;
  line-height: 1.3;
}

.card__meta {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--gray-100);
}

.meta-label {
  font-size: 13px;
  color: var(--gray-500);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--gray-800);
}

.sizes-container {
  margin-bottom: 20px;
}

.sizes-label {
  font-size: 13px;
  color: var(--gray-500);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.sizes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
  color: #92400E;
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 700;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.chip--more {
  background: var(--gray-100);
  color: var(--gray-600);
  border-color: var(--gray-200);
}

.card__footer {
  background: linear-gradient(135deg, #F0F9FF, #E0F2FE);
  padding: 20px 24px;
  border-top: 1px solid var(--gray-100);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-size: 14px;
  color: var(--gray-600);
  font-weight: 600;
}

.total-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.total-number {
  font-size: 28px;
  font-weight: 800;
  color: var(--gray-900);
  line-height: 1;
}

.total-unit {
  font-size: 14px;
  color: var(--gray-500);
  font-weight: 600;
}

.card__hover {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
}

.card:hover .card__hover {
  transform: translateY(0);
}

/* Empty State */
.empty-state {
  background: white;
  border-radius: var(--radius-2xl);
  padding: 64px 32px;
  text-align: center;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--gray-100);
  max-width: 600px;
  margin: 40px auto;
}

.empty-state__icon {
  color: var(--gray-300);
  margin-bottom: 24px;
}

.empty-state__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--gray-800);
  margin-bottom: 12px;
}

.empty-state__subtitle {
  color: var(--gray-500);
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 24px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 9999;
  padding: 24px;
  animation: modalFadeIn 0.2s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

.modal__panel {
  width: 100%;
  max-width: 1400px;
  max-height: 90vh;
  background: white;
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-2xl);
  overflow: hidden;
  position: relative;
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal__close {
  position: absolute;
  right: 24px;
  top: 24px;
  background: white;
  border: 1px solid var(--gray-200);
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  box-shadow: var(--shadow);
}

.modal__close:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.modal__body {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.modal__header {
  padding: 32px 32px 0;
  border-bottom: 1px solid var(--gray-100);
}

.modal__header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.modal__title-group {
  flex: 1;
}

.modal__title {
  font-size: 28px;
  font-weight: 800;
  color: var(--gray-900);
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal__subtitle {
  font-size: 16px;
  color: var(--gray-500);
  font-weight: 500;
}

.modal__stats {
  display: flex;
  gap: 24px;
  margin-top: 20px;
}

.modal-stat {
  text-align: center;
  min-width: 80px;
}

.modal-stat__value {
  font-size: 24px;
  font-weight: 800;
  color: var(--gray-900);
  line-height: 1;
}

.modal-stat__label {
  font-size: 13px;
  color: var(--gray-500);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 4px;
}

.modal__actions {
  display: flex;
  gap: 12px;
}

.modal__content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px 32px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
  background: var(--gray-50);
  padding: 24px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--gray-100);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 13px;
  color: var(--gray-500);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-800);
}

.table-container {
  background: white;
  border-radius: var(--radius-xl);
  border: 1px solid var(--gray-100);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.table-scroll-wrapper {
  max-height: 400px;
  overflow-y: auto;
  position: relative;
}

.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 800px;
}

.th {
  position: sticky;
  top: 0;
  padding: 16px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-700);
  background: white;
  border-bottom: 1px solid var(--gray-200);
  z-index: 2;
  white-space: nowrap;
}

.th-content {
  display: flex;
  align-items: center;
}

.th--color {
  background: linear-gradient(135deg, #EDE9FE, #E0E7FF);
  color: var(--secondary);
  border-right: 1px solid var(--gray-200);
}

.th--table {
  background: linear-gradient(135deg, #FCE7F3, #FBCFE8);
  color: var(--accent);
  border-right: 1px solid var(--gray-200);
}

.th--size {
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
  color: #92400E;
  border-right: 1px solid var(--gray-200);
}

.th--total {
  background: linear-gradient(135deg, #D1FAE5, #A7F3D0);
  color: #047857;
}

.td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--gray-100);
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-700);
}

.td--color {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: var(--gray-900);
  background: var(--gray-50);
  border-right: 1px solid var(--gray-100);
}

.shade-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
}

.td--table {
  border-right: 1px solid var(--gray-100);
}

.td--size {
  text-align: center;
  border-right: 1px solid var(--gray-100);
}

.td--total {
  text-align: right;
  font-weight: 600;
  color: var(--gray-900);
}

.tr--alt {
  background: var(--gray-50);
}

.tr--footer {
  position: sticky;
  bottom: 0;
  background: linear-gradient(135deg, #ECFDF5, #D1FAE5);
  z-index: 1;
}

.td--footer {
  padding: 20px 16px;
  border-bottom: none;
  border-top: 1px solid var(--gray-200);
  font-size: 15px;
}

.td--grand {
  text-align: right;
  font-size: 18px;
  color: #047857;
}

/* Skeleton */
.skeleton {
  background: white;
  border-radius: var(--radius-xl);
  padding: 24px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--gray-100);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.skeleton__header::before,
.skeleton__header::after,
.skeleton__title::before,
.skeleton__line::before,
.skeleton__chips::before,
.skeleton__footer::before {
  content: '';
  display: block;
  background: var(--gray-200);
  border-radius: var(--radius);
}

.skeleton__header::before {
  width: 80px;
  height: 28px;
}

.skeleton__header::after {
  width: 60px;
  height: 28px;
}

.skeleton__title::before {
  width: 60%;
  height: 24px;
  margin-bottom: 24px;
}

.skeleton__meta {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.skeleton__line::before {
  width: 100%;
  height: 16px;
}

.skeleton__chips::before {
  width: 100%;
  height: 32px;
  margin-bottom: 20px;
}

.skeleton__footer::before {
  width: 100%;
  height: 40px;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--gray-100);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

.table-scroll-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.table-scroll-wrapper::-webkit-scrollbar-thumb {
  background: var(--gray-400);
}

/* Responsive */
@media (max-width: 1400px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 1024px) {
  .hero__top {
    flex-direction: column;
    gap: 16px;
  }
  
  .hero__stats {
    align-self: flex-start;
  }
  
  .modal__panel {
    max-height: 95vh;
  }
}

@media (max-width: 768px) {
  .wrap {
    padding: 16px;
  }
  
  .hero {
    padding: 24px;
  }
  
  .grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .filter-row {
    flex-direction: column;
  }
  
  .select {
    min-width: 100%;
  }
  
  .modal__header-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .modal__actions {
    width: 100%;
  }
  
  .btn--export {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .hero__title {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .hero__stats {
    width: 100%;
    justify-content: space-between;
  }
}
`;