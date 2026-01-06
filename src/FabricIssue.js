import React, { useEffect, useMemo, useState } from "react";
import { FiSearch, FiX, FiExternalLink, FiFilter, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiEdit2, FiDatabase, FiArrowLeft } from "react-icons/fi";
import { FaTshirt, FaPalette, FaCalendarAlt, FaRuler, FaBoxOpen } from "react-icons/fa";
import { GiBasket, GiConfirmed } from "react-icons/gi";
import { MdOutlineDashboard } from "react-icons/md";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const FabricIssues = () => {
  // ========== STATE ==========
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [statFilter, setStatFilter] = useState("all");

  // Filters
  const [filterBrand, setFilterBrand] = useState("");
  const [filterColour, setFilterColour] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [filterSize, setFilterSize] = useState("");
  const [filterParty, setFilterParty] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ========== CONFIG ==========
  const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
  const SHEET_ID = "1Frg7kHPiiGeydB02LsGKJ-0UeO8N45-19skJRRvU_Qg";
  const SHEET_NAME = "Orders";
  const RANGE = `${SHEET_NAME}!A1:O`;

  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, "").replace(/\./g, "");

  const getLotKey = () => headers.find((h) => norm(h) === "lotno");
  const getReferenceKey = () => headers.find((h) => norm(h) === "referenceno");

  // ========== DATA FETCH ==========
  const fetchSheet = async () => {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(
        RANGE
      )}?key=${API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      const { values } = await res.json();

      if (values?.length > 1) {
        const [firstRow, ...rest] = values;
        setHeaders(firstRow);

        const mapped = rest.map((rowArr, i) => {
          const obj = { __rowNum: i + 2 };
          firstRow.forEach((h, ci) => {
            obj[h] = rowArr[ci] ?? "";
          });
          return obj;
        });

        const onlyWithOrder = mapped.filter((r) => {
          const val = r["Order No."]?.toString().trim();
          return val && val.length > 0;
        });

        setRows(onlyWithOrder);
      } else {
        setHeaders([]);
        setRows([]);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSheet();
  }, []);

  const refreshData = () => {
    setIsRefreshing(true);
    fetchSheet();
  };

  // ========== UPDATE CALLS ==========
  const updateLotNo = async (rowNum, newLot) => {
    const BASE =
      "https://script.google.com/macros/s/AKfycbz-mmMoBuXwcujbHzyJAopdRUJIJiXLHF8LWCrKpJixleOjAEQTGp02pOi1MUIYeCFm/exec";
    const url = `${BASE}?action=updateLotNo&row=${rowNum}&newLot=${encodeURIComponent(newLot)}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unknown error");

      setSuccessMessage("🎉 Lot number updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Update failed:", err);
      setError("❌ Could not update Lot No. Please try again.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const updateReferenceNo = async (rowNum, newRef) => {
    const BASE =
      "https://script.google.com/macros/s/AKfycbzvDLAnSnKuyC7Uux_kkbq1K_LHXhzXjSKJu2dKV_0g_upNP4gjZ2JiJEpv2bcaSXDN/exec";
    const url = `${BASE}?action=updateReferenceNo&row=${rowNum}&newRef=${encodeURIComponent(newRef)}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unknown error");

      setSuccessMessage("🎉 Reference number updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Update failed:", err);
      setError("❌ Could not update Reference No. Please try again.");
      setTimeout(() => setError(null), 3000);
    }
  };

  // ========== HELPERS ==========
  const getDriveEmbedUrl = (url) => {
    try {
      const parsed = new URL(url);
      let id = parsed.searchParams.get("id");
      if (!id) {
        const m = parsed.pathname.match(/\/d\/([^/]+)/);
        if (m) id = m[1];
      }
      return id ? `https://drive.google.com/file/d/${id}/preview` : url;
    } catch {
      return url;
    }
  };

  const handleLotChange = (e, idx) => {
    const lotKey = getLotKey();
    const val = e.target.value;
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [lotKey]: val } : r)));
  };
  const handleLotBlur = ({ __rowNum }, idx) => {
    const lotKey = getLotKey();
    updateLotNo(__rowNum, rows[idx][lotKey]);
  };

  const handleReferenceChange = (e, idx) => {
    const refKey = getReferenceKey();
    const val = e.target.value;
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [refKey]: val } : r)));
  };
  const handleReferenceBlur = ({ __rowNum }, idx) => {
    const refKey = getReferenceKey();
    updateReferenceNo(__rowNum, rows[idx][refKey]);
  };

  const visibleHeaders = headers.filter((h) => h.trim().toLowerCase() !== "rate");

  const handleViewClick = (url) => setSelectedImage(getDriveEmbedUrl(url));
  const handleCloseModal = () => setSelectedImage(null);

  const handleTotalClick = () => {
    clearFilters();
  };
  const handlePendingClick = () => {
    clearFilters();
    setStatFilter("pending");
  };
  const handleFilteredClick = () => {
    setStatFilter("all");
  };
  const handleCompletedClick = () => {
    clearFilters();
    setStatFilter("completed");
  };

  // Filter option lists
  const brands = useMemo(
    () => [...new Set(rows.map((r) => r["Brand"] || "").filter(Boolean))].sort(),
    [rows]
  );
  const colours = useMemo(
    () => [...new Set(rows.map((r) => r["Colour"] || "").filter(Boolean))].sort(),
    [rows]
  );
  const seasons = useMemo(
    () => [...new Set(rows.map((r) => r["Season"] || "").filter(Boolean))].sort(),
    [rows]
  );
  const sizes = useMemo(
    () => [...new Set(rows.map((r) => r["Size"] || "").filter(Boolean))].sort(),
    [rows]
  );
  const parties = useMemo(
    () => [...new Set(rows.map((r) => r["Party Name"] || "").filter(Boolean))].sort(),
    [rows]
  );

  // Filtering
  const filteredRows = useMemo(() => {
    const st = searchTerm.toLowerCase();
    return rows.filter((r) => {
      if (statFilter === "pending" && r["Lot No"]) return false;
      if (statFilter === "completed" && !r["Lot No"]) return false;

      const hitSearch = !st
        ? true
        : Object.values(r).some((val) => val?.toString().toLowerCase().includes(st));

      return (
        (!filterBrand || r["Brand"] === filterBrand) &&
        (!filterColour || r["Colour"] === filterColour) &&
        (!filterSeason || r["Season"] === filterSeason) &&
        (!filterSize || r["Size"] === filterSize) &&
        (!filterParty || r["Party Name"] === filterParty) &&
        hitSearch
      );
    });
  }, [rows, filterBrand, filterColour, filterSeason, filterSize, filterParty, searchTerm, statFilter]);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setPage(1);
  }, [filterBrand, filterColour, filterSeason, filterSize, filterParty, searchTerm, statFilter, rows.length]);

  // Pagination slices
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pageRows = filteredRows.slice(pageStart, pageEnd);

  // Stats
  const stats = useMemo(
    () => ({
      totalOrders: rows.length,
      pendingIssues: rows.filter((r) => !r["Lot No"]).length,
      filteredCount: filteredRows.length,
      completionRate: rows.length > 0 ? Math.round(((rows.length - rows.filter((r) => !r["Lot No"]).length) / rows.length) * 100) : 0
    }),
    [rows, filteredRows]
  );

  const clearFilters = () => {
    setFilterBrand("");
    setFilterColour("");
    setFilterSeason("");
    setFilterSize("");
    setFilterParty("");
    setSearchTerm("");
    setStatFilter("all");
  };

  // PDF Export
  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(200);
    doc.setLineWidth(1);
    doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

    const applied = [];
    if (statFilter !== "all") applied.push(`Status: ${statFilter}`);
    if (filterBrand) applied.push(`Brand: ${filterBrand}`);
    if (filterColour) applied.push(`Colour: ${filterColour}`);
    if (filterSeason) applied.push(`Season: ${filterSeason}`);
    if (filterSize) applied.push(`Size: ${filterSize}`);
    if (filterParty) applied.push(`Party: ${filterParty}`);
    if (searchTerm.trim()) applied.push(`Search: "${searchTerm.trim()}"`);
    const filterSummary = applied.length ? applied.join("  |  ") : "None";

    const anyFilter = applied.length > 0;
    const data = anyFilter ? filteredRows : rows;
    const exportH = headers.filter((h) => h.trim().toLowerCase() !== "photo url");
    const cols = exportH.map((h) => h.trim());
    const rowsArr = data.map((r) => exportH.map((h) => r[h] || "-"));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(33);
    doc.text("Fabric Lot No. Issue Report", pageWidth / 2, 50, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(`Applied Filters: ${filterSummary}`, pageWidth / 2, 70, { align: "center" });

    doc.setDrawColor(220);
    doc.setLineWidth(0.5);
    doc.line(40, 80, pageWidth - 40, 80);

    autoTable(doc, {
      startY: 90,
      head: [cols],
      body: rowsArr,
      theme: "grid",
      margin: { top: 90, left: 40, right: 40, bottom: 40 },
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 6,
        textColor: 50,
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: 20,
        fontStyle: "bold",
        lineColor: [180, 180, 180],
        lineWidth: 0.5
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.5,
      didDrawPage: () => {
        const p = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${p}`, pageWidth - 40, pageHeight - 30, { align: "right" });
        doc.text(`Generated: ${new Date().toLocaleString()}`, 40, pageHeight - 30);
      }
    });

    doc.save(anyFilter ? "fabric_issues_filtered.pdf" : "fabric_issues.pdf");
  };

  // ========== RENDER ==========
  if (loading) {
    return (
      <div className="fx-message">
        <span className="fx-spinner" /> Loading fabric data... 🧵
        <StyleTag />
      </div>
    );
  }
  if (error) {
    return (
      <div className="fx-message fx-error">🚨 Error: {error}<StyleTag /></div>
    );
  }

  return (
    <>
      <StyleTag />

      <div className="fx-wrap">
        <header className="fx-header">
          <div className="fx-title-block">
            <h1 className="fx-title">
              <GiBasket className="fx-title-icon" />
              Fabric Lot No. Issue
            </h1>
            <p className="fx-subtitle">Manage pending fabric issues and lot numbers 🏷</p>
          </div>

          <div className="fx-actions">
            <button className="btn btn-light" onClick={() => window.history.back()}>
              <FiArrowLeft />
              <span>Back</span>
            </button>
            <button className="btn btn-green" onClick={downloadPDF}>
              <FiDatabase />
              <span>Download PDF</span>
            </button>
            <button className="btn btn-primary" onClick={refreshData} disabled={isRefreshing}>
              <FiRefreshCw className={isRefreshing ? "spin" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh Data"}</span>
            </button>
          </div>
        </header>

        {(error || successMessage) && (
          <div className={`fx-alert ${successMessage ? "success" : "danger"}`}>
            {successMessage ? (
              <>
                <FiCheckCircle /> {successMessage}
              </>
            ) : (
              <>
                <FiAlertCircle /> {error}
              </>
            )}
          </div>
        )}

        {/* Stats */}
        <section className="fx-stats">
          <div className="fx-stat fx-click" onClick={handleTotalClick}>
            <div className="fx-stat-icon"><FaBoxOpen /></div>
            <div className="fx-stat-value">{stats.totalOrders}</div>
            <div className="fx-stat-label">Total Orders</div>
            <div className="fx-stat-trend">📅 All time records</div>
          </div>

          <div className="fx-stat fx-stat--warn fx-click" onClick={handlePendingClick}>
            <div className="fx-stat-icon"><GiBasket /></div>
            <div className="fx-stat-value">{stats.pendingIssues}</div>
            <div className="fx-stat-label">Pending Issues</div>
            <div className="fx-stat-trend">⚠️ Requires attention</div>
          </div>

          <div className="fx-stat fx-stat--info fx-click" onClick={handleFilteredClick}>
            <div className="fx-stat-icon"><MdOutlineDashboard /></div>
            <div className="fx-stat-value">{stats.filteredCount}</div>
            <div className="fx-stat-label">Filtered Results</div>
            <div className="fx-stat-trend">🔍 Current view</div>
          </div>

          <div className="fx-stat fx-stat--ok fx-click" onClick={handleCompletedClick}>
            <div className="fx-stat-icon"><GiConfirmed /></div>
            <div className="fx-stat-value">{stats.completionRate}%</div>
            <div className="fx-stat-label">Completion Rate</div>
            <div className="fx-progress"><div style={{ width: `${stats.completionRate}%` }} /></div>
          </div>
        </section>

        {/* Toolbar */}
        <div className="fx-toolbar">
          <div className="fx-search">
            <FiSearch className="fx-search-icon" />
            <input
              className="fx-input"
              placeholder="🔍 Search across all fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="fx-clear" onClick={() => setSearchTerm("")}>
                <FiX />
              </button>
            )}
          </div>
          <button
            className={`btn btn-toggle ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <FiFilter />
            <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="fx-filters">
            <div className="fx-filter-group">
              <label className="fx-filter-label"><FaTshirt /> Brand</label>
              <select className="fx-select" value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
                <option value="">All Brands</option>
                {brands.map((b) => (<option key={b} value={b}>{b}</option>))}
              </select>
            </div>

            <div className="fx-filter-group">
              <label className="fx-filter-label"><FaPalette /> Colour</label>
              <select className="fx-select" value={filterColour} onChange={(e) => setFilterColour(e.target.value)}>
                <option value="">All Colours</option>
                {colours.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>

            <div className="fx-filter-group">
              <label className="fx-filter-label"><FaCalendarAlt /> Season</label>
              <select className="fx-select" value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
                <option value="">All Seasons</option>
                {seasons.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>

            <div className="fx-filter-group">
              <label className="fx-filter-label"><FaBoxOpen /> Party Name</label>
              <select className="fx-select" value={filterParty} onChange={(e) => setFilterParty(e.target.value)}>
                <option value="">All Parties</option>
                {parties.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>

            <div className="fx-filter-group">
              <label className="fx-filter-label"><FaRuler /> Size</label>
              <select className="fx-select" value={filterSize} onChange={(e) => setFilterSize(e.target.value)}>
                <option value="">All Sizes</option>
                {sizes.map((sz) => (<option key={sz} value={sz}>{sz}</option>))}
              </select>
            </div>

            <button className="btn btn-clear" onClick={clearFilters}>🧹 Clear All Filters</button>
          </div>
        )}

        {/* Table Meta */}
        <div className="fx-table-head">
          <div className="fx-results">📊 Showing {filteredRows.length} of {rows.length} records</div>

          {/* Pagination Controls */}
          <div className="fx-pager">
            <div className="fx-page-size">
              <label>Rows per page:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="fx-page-buttons">
              <button className="pg-btn" disabled={page === 1} onClick={() => setPage(1)} title="First">
                «
              </button>
              <button className="pg-btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} title="Previous">
                ‹
              </button>
              <span className="pg-info">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} title="Next">
                ›
              </button>
              <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)} title="Last">
                »
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="fx-table-wrap">
          <table className="fx-table">
            <thead>
              <tr>
                {visibleHeaders.map((h) => (
                  <th key={h}>
                    <div className="fx-th">
                      <span>{h}</span>
                      {h.trim().toLowerCase() === "lot no" && <span className="fx-pill">{stats.pendingIssues} pending</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length > 0 ? (
                pageRows.map((row, idx) => (
                  <tr key={row.__rowNum} className={row["Lot No"] ? "is-complete" : ""}>
                    {visibleHeaders.map((h) => {
                      const nkey = norm(h);
                      if (nkey === "lotno") {
                        return (
                          <td key={h}>
                            <input
                              className={`fx-lot-input ${row[h] ? "done" : ""}`}
                              value={row[h] ?? ""}
                              onChange={(e) => handleLotChange(e, pageStart + idx)}
                              onBlur={() => handleLotBlur(row, pageStart + idx)}
                              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                              placeholder={row[h] ? "" : "Enter lot number..."}
                            />
                            {!row[h] && (
                              <div className="fx-edit-hint">
                                <FiEdit2 /> Click to edit
                              </div>
                            )}
                          </td>
                        );
                      }

                      if (nkey === "referenceno") {
                        return (
                          <td key={h}>
                            <input
                              className={`fx-lot-input ${row[h] ? "done" : ""}`}
                              value={row[h] ?? ""}
                              onChange={(e) => handleReferenceChange(e, pageStart + idx)}
                              onBlur={() => handleReferenceBlur(row, pageStart + idx)}
                              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                              placeholder={row[h] ? "" : "Enter reference number..."}
                            />
                            {!row[h] && (
                              <div className="fx-edit-hint">
                                <FiEdit2 /> Click to edit
                              </div>
                            )}
                          </td>
                        );
                      }

                      if (nkey === "photourl") {
                        return (
                          <td key={h}>
                            <button className="btn btn-view" onClick={() => handleViewClick(row[h])}>
                              <FiExternalLink /> View Fabric
                            </button>
                          </td>
                        );
                      }

                      if (nkey === "status") {
                        const isCreated = row[h]?.toString().toLowerCase().includes("job order created");
                        return (
                          <td key={h}>
                            {isCreated ? (
                              <span className="fx-status" title={row[h]}>
                                <FiCheckCircle />
                              </span>
                            ) : (
                              row[h] || "-"
                            )}
                          </td>
                        );
                      }

                      return <td key={h}>{row[h] || "-"}</td>;
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleHeaders.length}>
                    <div className="fx-nores">
                      <div className="emoji">🔍</div>
                      <h3>No matching records found</h3>
                      <p>Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pager duplicate for mobile ergonomics */}
        {filteredRows.length > 0 && (
          <div className="fx-pager fx-pager--bottom">
            <div className="fx-page-size">
              <label>Rows per page:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="fx-page-buttons">
              <button className="pg-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button className="pg-btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
              <span className="pg-info">
                Page <strong>{page}</strong> / <strong>{totalPages}</strong>
              </span>
              <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
              <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedImage && (
        <div className="fx-overlay" onClick={handleCloseModal}>
          <div className="fx-modal" onClick={(e) => e.stopPropagation()}>
            <button className="fx-close" onClick={handleCloseModal}><FiX /></button>
            <h2 className="fx-modal-title">🧵 Fabric Image Preview</h2>
            <iframe className="fx-iframe" src={selectedImage} title="Fabric Issue" allowFullScreen />
          </div>
        </div>
      )}
    </>
  );
};

/** ========= INLINE STYLES ========= **/
const StyleTag = () => (
  <style>{`
:root{
  --bg: #f6f8fc;
  --card: #ffffff;
  --ink: #0f172a;
  --muted: #64748b;
  --line: #e2e8f0;
  --brand: #6366f1;
  --brand-2: #8b5cf6;
  --ok: #10b981;
  --warn: #f59e0b;
  --info: #3b82f6;
  --danger: #ef4444;
  --shadow: 0 8px 28px rgba(2,6,23,.08);
  --radius: 18px;
}

*{box-sizing:border-box}
html,body,#root{height:100%}
body{margin:0;background:linear-gradient(180deg,#f7f9ff, #eef2ff 45%, #f8fafc);font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji';color:var(--ink);}

.fx-wrap{
  max-width: 2000px;
  margin: 24px auto;
  padding: clamp(12px, 2vw, 28px);
  background: color-mix(in oklab, white 92%, #f8fafc 8%);
  border-radius: 24px;
  border: 1px solid #eef2ff;
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}

.fx-wrap:before{
  content:'';
  position:absolute; inset:-1px -1px auto auto;
  width:240px;height:240px;border-radius:50%;
  background: radial-gradient(closest-side, color-mix(in oklab, var(--brand) 12%, transparent), transparent);
  filter: blur(32px); opacity:.35; pointer-events:none; translate: 10% -40%;
}

.fx-header{
  display:flex; flex-wrap:wrap; gap:16px; align-items:flex-start; justify-content:space-between; margin-bottom:20px;
}
.fx-title-block{min-width:280px; flex:1}
.fx-title{
  margin:0; font-weight:900; letter-spacing:-.02em;
  font-size: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem);
  display:flex; align-items:center; gap:.6rem;
  background: linear-gradient(90deg,#111827 0%, #334155 40%, #111827 100%);
  -webkit-background-clip:text; color: transparent;
}
.fx-title-icon{color:var(--brand); font-size:1.6em; animation: float 3s ease-in-out infinite;}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.fx-subtitle{margin:.5rem 0 0;color:var(--muted);font-size:1.05rem}

.fx-actions{display:flex;gap:10px; align-items:center; flex-wrap:wrap}
.btn{
  display:inline-flex; align-items:center; gap:.55rem;
  padding:.8rem 1.2rem; border-radius:12px; border:1px solid var(--line);
  background:var(--card); color:#475569; font-weight:700; cursor:pointer; transition:.18s ease;
  box-shadow: 0 2px 6px rgba(2,6,23,.04);
}
.btn:hover{transform:translateY(-1px); box-shadow: 0 8px 18px rgba(2,6,23,.06);}
.btn:active{transform:none}
.btn svg{font-size:1.1rem}
.btn-light:hover{background:#f8fafc}
.btn-primary{background:linear-gradient(135deg, var(--brand), var(--brand-2)); color:white; border-color:transparent}
.btn-primary:disabled{opacity:.7; cursor:not-allowed; transform:none !important}
.btn-green{background:#10b981; color:white; border-color:#10b981}
.btn-green:hover{background:#059669}
.btn-view{background:linear-gradient(90deg,#e0f2fe,#bae6fd); color:#075985; border:0; padding:.6rem 1rem; border-radius:10px; font-weight:700}
.btn-view:hover{filter:saturate(1.05); transform:translateY(-1px)}
.btn-toggle{background:var(--card)}
.btn-toggle.active{background:var(--brand); color:white; border-color:var(--brand)}

.spin{animation:spin 1s linear infinite}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

.fx-alert{
  padding:1rem 1.25rem; border-radius:14px; display:flex; align-items:center; gap:.6rem;
  margin:14px 0 18px; font-weight:600; border-left:5px solid;
  background: linear-gradient(90deg,#fff,#f8fafc);
}
.fx-alert.success{color:#166534; border-color:#22c55e; background: linear-gradient(90deg,#f0fff4,#dcfce7)}
.fx-alert.danger{color:#991b1b; border-color:#ef4444; background: linear-gradient(90deg,#fff5f5,#fee2e2)}

.fx-stats{
  display:grid; grid-template-columns: repeat(4, minmax(0,1fr));
  gap:14px; margin: 18px 0 20px;
}
.fx-stat{
  background:var(--card); border:1px solid #eef2ff; border-top:4px solid #e2e8f0;
  padding:1.2rem 1.2rem 1rem; border-radius:16px; box-shadow: var(--shadow);
  transition:.2s ease; position:relative; overflow:hidden;
}
.fx-click{cursor:pointer}
.fx-stat:hover{transform:translateY(-3px)}
.fx-stat .fx-stat-icon{font-size:1.6rem; color:var(--brand); opacity:.9; margin-bottom:.6rem}
.fx-stat .fx-stat-value{font-size:2rem; font-weight:900; line-height:1; color:#0b1220}
.fx-stat .fx-stat-label{font-weight:700; color:#475569; margin-top:.4rem}
.fx-stat .fx-stat-trend{font-size:.9rem; color:#94a3b8; margin-top:.35rem}
.fx-stat--warn{border-top-color:var(--warn)}
.fx-stat--ok{border-top-color:var(--ok)}
.fx-stat--info{border-top-color:var(--info)}
.fx-progress{height:8px; background:#e2e8f0; border-radius:999px; margin-top:12px; overflow:hidden}
.fx-progress>div{height:100%; background:linear-gradient(90deg,#10b981,#34d399)}

.fx-toolbar{display:flex; gap:12px; flex-wrap:wrap; justify-content:space-between; align-items:center; margin: 16px 0}
.fx-search{position:relative; flex:1; min-width:260px; max-width:620px}
.fx-search-icon{position:absolute; left:16px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:1.2rem}
.fx-input{
  width:100%; padding:1rem 3rem 1rem 44px; border:1px solid var(--line); border-radius:14px;
  background:white; font-size:1rem; color:#1f2937; transition:.18s;
  box-shadow: 0 2px 6px rgba(2,6,23,.03);
}
.fx-input:focus{outline:none; border-color:var(--brand); box-shadow:0 0 0 4px color-mix(in oklab, var(--brand) 22%, transparent)}
.fx-clear{
  position:absolute; right:10px; top:50%; transform:translateY(-50%);
  width:34px; height:34px; border-radius:50%; border:0; background:#f1f5f9; color:#64748b; cursor:pointer;
  display:grid; place-items:center; box-shadow:0 1px 2px rgba(2,6,23,.08);
}
.fx-clear:hover{background:#e2e8f0; transform:translateY(-50%) scale(1.08)}

.fx-filters{
  display:grid; grid-template-columns: repeat(6, minmax(0,1fr));
  gap:16px; padding:18px; background:var(--card); border:1px solid #eef2ff; border-radius:18px;
  box-shadow: var(--shadow); margin-bottom:18px;
}
.fx-filter-group{display:flex; flex-direction:column; gap:8px}
.fx-filter-label{display:flex; align-items:center; gap:8px; color:#334155; font-weight:700}
.fx-select{
  padding:.85rem 1rem; border:1px solid var(--line); border-radius:12px; background:white; font-size:1rem; color:#1f2937;
}
.btn-clear{
  grid-column:1/-1; padding:1rem; color:#ef4444; border:1px solid #fee2e2; background:white; border-radius:14px; font-weight:800;
}
.btn-clear:hover{background:#fff1f1}

.fx-table-head{
  display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-top:6px;
}
.fx-results{font-weight:800; color:#111827; background:#f8fafc; border:1px solid #eef2ff; padding:.7rem 1rem; border-radius:12px}

.fx-table-wrap{
  overflow:auto; border-radius:18px; border:1px solid #eef2ff; background:white;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,.06), 0 4px 10px -2px rgba(0,0,0,.03);
}
.fx-table{width:100%; border-collapse:separate; border-spacing:0; min-width:820px; position:relative}
.fx-table thead th{
  position:sticky; top:0; background:linear-gradient(180deg, rgba(248,250,252,.96), rgba(241,245,249,.92));
  border-bottom:1px solid #e5e7eb; padding:16px; text-align:left; z-index:2;
}
.fx-th{display:flex; align-items:center; gap:.6rem; position:relative}
.fx-th:after{content:''; position:absolute; left:0; bottom:-10px; height:2px; width:0; background:linear-gradient(90deg,var(--brand),var(--brand-2)); transition:.2s}
.fx-th:hover:after{width:100%}
.fx-pill{
  font-size:.68rem; background:linear-gradient(90deg,#ef4444,#f97316); color:white; padding:.25rem .6rem; border-radius:999px; font-weight:900; letter-spacing:.04em;
}
.fx-table tbody td{padding:14px 16px; border-bottom:1px solid rgba(226,232,240,.7); color:#0f172a; font-size:.95rem; position:relative}
.fx-table tbody tr{transition:.18s; background:linear-gradient(90deg,rgba(255,255,255,0.88), rgba(255,255,255,0.96))}
.fx-table tbody tr:hover{transform:translateY(-1px); box-shadow: 0 1px 0 0 rgba(99,102,241,.18) inset}
.fx-table tbody tr.is-complete{background:linear-gradient(90deg, rgba(240,253,244,.9), rgba(236,253,245,.9))}

.fx-lot-input{
  padding:.65rem .8rem; border:1px solid rgba(226,232,240,.9); border-radius:10px; width:min(180px, 72%); max-width:220px;
  transition:.18s; background:rgba(255,255,255,.9); font-weight:600;
}
.fx-lot-input:focus{outline:none; border-color:var(--brand); box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand) 18%, transparent)}
.fx-lot-input.done{background:rgba(240,253,244,.8); border-color:rgba(16,185,129,.35); color:#065f46}
.fx-edit-hint{font-size:.8rem; color:#94a3b8; margin-top:.35rem; display:flex; align-items:center; gap:.35rem; opacity:.9}

.fx-status svg{color:var(--ok); font-size:1.2rem}

.fx-nores{
  padding:56px 12px; text-align:center;
  background:linear-gradient(180deg, rgba(248,250,252,.6), rgba(241,245,249,.45));
}
.fx-nores .emoji{font-size:3rem; animation:float 3s ease-in-out infinite}
.fx-nores h3{margin:10px 0 8px; font-size:1.5rem; background: linear-gradient(90deg,#334155,#0f172a); -webkit-background-clip:text; color:transparent}
.fx-nores p{margin:0; color:#64748b}

.fx-pager{
  display:flex; gap:12px; align-items:center; justify-content:flex-end; flex-wrap:wrap;
  margin: 12px 0 6px;
}
.fx-pager--bottom{justify-content:space-between}
.fx-page-size{display:flex; align-items:center; gap:.5rem; color:#334155; font-weight:700}
.fx-page-size select{padding:.5rem .7rem; border-radius:10px; border:1px solid var(--line); background:white}
.fx-page-buttons{display:flex; gap:8px; align-items:center}
.pg-btn{
  width:36px; height:36px; border-radius:10px; display:grid; place-items:center; border:1px solid var(--line); background:#fff; cursor:pointer; font-weight:900;
}
.pg-btn:disabled{opacity:.5; cursor:not-allowed}
.pg-info{color:#334155}

.fx-overlay{
  position:fixed; inset:0; background:rgba(0,0,0,.68); display:grid; place-items:center; z-index:1000; backdrop-filter: blur(4px);
}
.fx-modal{
  position:relative; width:min(1000px, 92vw); max-height:90vh; background:white; border-radius:20px; padding:22px; overflow:hidden; box-shadow: var(--shadow);
  display:flex; flex-direction:column; gap:14px;
}
.fx-close{
  position:absolute; top:12px; right:12px; width:40px; height:40px; border-radius:50%; border:0; background:#f1f5f9; color:#475569; cursor:pointer; display:grid; place-items:center
}
.fx-close:hover{background:#e2e8f0; transform:rotate(90deg)}
.fx-modal-title{margin:0; font-size:1.4rem; color:#111827}
.fx-iframe{width:100%; height:70vh; border:0; border-radius:12px; background:#f8fafc}

.fx-message{
  display:flex; align-items:center; justify-content:center; gap:.6rem; padding:2rem; font-size:1.1rem; color:#64748b
}
.fx-message.fx-error{color:#ef4444; justify-content:center}
.fx-spinner{
  width:20px; height:20px; border-radius:999px; border:3px solid rgba(99,102,241,.28); border-top-color:var(--brand); display:inline-block; animation:spin 1s linear infinite
}

/* ======= RESPONSIVE ======= */
@media (max-width: 1024px){
  .fx-stats{grid-template-columns: repeat(2, minmax(0,1fr));}
  .fx-filters{grid-template-columns: repeat(3, minmax(0,1fr));}
}
@media (max-width: 720px){
  .fx-header{gap:10px}
  .fx-actions{width:100%; justify-content:flex-start}
  .fx-stats{grid-template-columns:1fr; gap:10px}
  .fx-filters{grid-template-columns:1fr}
  .fx-page-buttons .pg-info{min-width: max-content}
  .fx-table{min-width:700px}
  .fx-lot-input{width:100%}
}
`}</style>
);

export default FabricIssues;
