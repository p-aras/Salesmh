// SalesOrderCancellationForm.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const SPREADSHEET_ID = "1Frg7kHPiiGeydB02LsGKJ-0UeO8N45-19skJRRvU_Qg";
const ORDERS_RANGE = "Orders!A1:ZZZ";
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxuPMS0HB9wdedmJv3rG2iJYLpvcA7SSVUqE2tcX5XKvWMBWlALFVWSPkVlY90Bp29I/exec";

// Exact header names from your sheet
const HEADERS = [
  "Date",
  "Order No.",
  "Party Name",
  "Season",
  "Item Name",
  "Brand",
  "Colour",
  "Size",
  "Quantity",
  "Rate",
  "Remarks",
  "Photo URL",
  "Lot No.",
  "Status",
  "Reference No.",
  "Status Party",
];

/** Convert Drive links (uc?id=... or /file/d/...) into /file/d/<id>/preview for iframe embedding */
function toDrivePreviewUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const idParam = u.searchParams.get("id");
    if (idParam) return `https://drive.google.com/file/d/${idParam}/preview`;
    const m = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (m && m[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;
    // fallback (non-Drive or already usable)
    return url;
  } catch {
    return url;
  }
}

export default function SalesOrderCancellationForm() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // search state
  const [queryOrderNo, setQueryOrderNo] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // loaded order
  const [orderRow, setOrderRow] = useState(null); // { header:value }

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [cancelledBy, setCancelledBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);

  const styles = uiStyles;

  async function fetchOrderByNumber(orderNo) {
    setSearching(true);
    setSearchError("");
    setOrderRow(null);

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        ORDERS_RANGE
      )}?key=${API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!json.values || json.values.length === 0) {
        throw new Error("No data in Orders sheet.");
      }

      const [headers, ...rows] = json.values;
      const orderNoIdx = headers.findIndex((h) => String(h).trim() === "Order No.");
      if (orderNoIdx === -1) {
        throw new Error(`'Order No.' column not found in Orders header row.`);
      }

      const target = String(orderNo).trim();
      const row = rows.find((r) => String(r[orderNoIdx] || "").trim() === target);

      if (!row) {
        setSearchError(`Order #${orderNo} not found.`);
        return;
      }

      const obj = {};
      headers.forEach((h, i) => {
        const key = String(h || `COL_${i + 1}`);
        obj[key] = row[i] ?? "";
      });

      HEADERS.forEach((h) => {
        if (!(h in obj)) obj[h] = "";
      });

      setOrderRow(obj);
    } catch (e) {
      console.error(e);
      setSearchError(e.message || "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  async function submitCancellation() {
    setSubmitting(true);
    setSubmitMsg(null);

    try {
      if (!orderRow) throw new Error("No order loaded.");
      if (!reason.trim()) throw new Error("Cancellation reason is required.");
      if (!approvedBy.trim()) throw new Error("Cancellation approved by is required.");
      if (!cancelledBy.trim()) throw new Error("Cancelled by is required.");

      const payload = {
        action: "cancelSalesOrder",
        date: today,
        orderNo: orderRow["Order No."],
        reason: reason.trim(),
        approvedBy: approvedBy.trim(),
        cancelledBy: cancelledBy.trim(),
        partyName: orderRow["Party Name"] || "",
        lotNo: orderRow["Lot No."] || "",
        referenceNo: orderRow["Reference No."] || "",
      };

      const res = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.status !== "success") {
        throw new Error(json.message || "Cancellation failed in Apps Script.");
      }

      setSubmitMsg(`✅ Order #${payload.orderNo} cancelled successfully.`);
      setDialogOpen(false);
      setReason("");
      setApprovedBy("");
      setCancelledBy("");
      setOrderRow((prev) => (prev ? { ...prev, Status: "CANCELLED" } : prev));
    } catch (e) {
      console.error(e);
      setSubmitMsg(`⚠ ${e.message || "Error submitting cancellation."}`);
    } finally {
      setSubmitting(false);
      setTimeout(() => setSubmitMsg(null), 3500);
    }
  }

  const previewUrl = toDrivePreviewUrl(orderRow?.["Photo URL"] || "");

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <button
            type="button"
            onClick={() =>
              window.history.length > 1 ? navigate(-1) : navigate("/", { replace: true })
            }
            style={styles.backButton}
            aria-label="Go back"
          >
            ← Back
          </button>

          <div style={styles.headerContent}>
            <div>
              <h1 style={styles.title}>🧾 Sales Order Cancellation</h1>
              <p style={styles.subtitle}>Search an order and record a cancellation</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Search */}
          <div style={styles.searchRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>🔎 Search by Order No.</label>
              <input
                type="text"
                value={queryOrderNo}
                onChange={(e) => setQueryOrderNo(e.target.value)}
                placeholder="Enter Order No..."
                style={styles.input}
              />
            </div>
            <button
              type="button"
              onClick={() => fetchOrderByNumber(queryOrderNo)}
              disabled={!queryOrderNo || searching}
              style={searching ? styles.btnDisabled : styles.btn}
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {searchError && <p style={styles.errorText}>❌ {searchError}</p>}

          {/* Result */}
          {orderRow && (
            <div style={styles.resultPanel}>
              <div style={styles.resultHeader}>
                <span style={styles.badge}>🆔 Order #{orderRow["Order No."] || "—"}</span>
                <span style={styles.badge}>🗓 {orderRow["Date"] || "—"}</span>
                <span style={styles.badge}>📦 Lot {orderRow["Lot No."] || "—"}</span>
                <span style={styles.badge}>📌 Status: {orderRow["Status"] || "—"}</span>
              </div>

              {/* Split view: info left, image right */}
              <div style={styles.splitView}>
                {/* LEFT: information (exclude Photo URL row) */}
                <div style={styles.infoPanel}>
                  {HEADERS.filter((h) => h !== "Photo URL").map((k) => (
                    <div key={k} style={styles.kvItem}>
                      <div style={styles.kvKey}>{k}</div>
                      <div style={styles.kvVal}>{orderRow[k] || "—"}</div>
                    </div>
                  ))}
                </div>

                {/* RIGHT: Drive preview iframe */}
                <div style={styles.photoPanel}>
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
                      title="Order Photo"
                      style={styles.photoIframe}
                      allow="autoplay"
                    />
                  ) : (
                    <div style={styles.noPhoto}>❌ No Photo Available</div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button style={styles.cancelBtn} onClick={() => setDialogOpen(true)}>
                  🚫 Sales Order Cancellation
                </button>
              </div>
            </div>
          )}

          {submitMsg && <div style={styles.toast}>{submitMsg}</div>}
        </div>
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div style={styles.dialogOverlay}>
          <div style={styles.dialogBox}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>
              Cancel Order #{orderRow?.["Order No."]}
            </h3>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={styles.label}>📝 Cancellation Reason *</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={styles.textarea}
                  placeholder="Why is this order being cancelled?"
                />
              </div>

              <div>
                <label style={styles.label}>✅ Cancellation Approved By *</label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value.toUpperCase())}
                  style={styles.input}
                  placeholder="e.g. MOHIT GOYAL / EA"
                />
              </div>

              <div>
                <label style={styles.label}>👤 Cancelled By (who performed it) *</label>
                <input
                  type="text"
                  value={cancelledBy}
                  onChange={(e) => setCancelledBy(e.target.value.toUpperCase())}
                  style={styles.input}
                  placeholder="Your name or user id"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setDialogOpen(false)}
                style={styles.dialogCancel}
                disabled={submitting}
              >
                Close
              </button>
              <button
                onClick={submitCancellation}
                disabled={submitting}
                style={submitting ? styles.btnDisabled : styles.confirmBtn}
              >
                {submitting ? "Submitting..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- minimal styling to match your app --- */
const uiStyles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
    padding: "32px 16px",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
  },
  card: {
    maxWidth: 1500,
    margin: "0 auto",
    backgroundColor: "#fff",
    borderRadius: 16,
    boxShadow:
      "0 10px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
  },
  header: {
    background: "linear-gradient(135deg, #4c3aed 0%, #100f64 100%)",
    padding: "28px 32px",
    color: "#fff",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    border: "none",
    color: "white",
    fontSize: 16,
    fontWeight: 600,
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  title: { margin: 0, fontSize: 28, fontWeight: 700, marginLeft: 30 },
  subtitle: { margin: "4px 0 0", fontSize: 14, marginLeft: 30, opacity: 0.9 },
  body: { padding: 32 },
  searchRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
    marginBottom: 16,
  },
  label: { fontSize: 14, fontWeight: 600, color: "#121c2b" },
  input: {
    width: "100%",
    padding: "14px 16px",
    border: "1px solid #d1cbcb",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    backgroundColor: "#fff",
    color: "#000",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  textarea: {
    width: "100%",
    padding: "14px 16px",
    border: "1px solid #d1cbcb",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    backgroundColor: "#fff",
    color: "#000",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    minHeight: 90,
  },
  btn: {
    padding: "12px 18px",
    borderRadius: 10,
    border: "none",
    backgroundColor: "#6d28d9",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    minWidth: 120,
  },
  btnDisabled: {
    padding: "12px 18px",
    borderRadius: 10,
    border: "none",
    backgroundColor: "#c4b5fd",
    color: "#fff",
    fontWeight: 600,
    cursor: "not-allowed",
    minWidth: 120,
  },
  badge: {
    backgroundColor: "rgba(124,58,237,0.12)",
    color: "#4c1d95",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  },
  resultPanel: {
    marginTop: 16,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
  },
  resultHeader: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  // Split view: info left, image right
  splitView: {
    display: "grid",
    gridTemplateColumns: "1fr 420px",
    gap: 20,
    alignItems: "flex-start",
  },
  infoPanel: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 12,
  },
  kvItem: {
    border: "1px dashed #e5e7eb",
    borderRadius: 10,
    padding: 10,
    background: "#fafafa",
  },
  kvKey: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  kvVal: {
    fontSize: 14,
    color: "#111827",
    fontWeight: 600,
    wordBreak: "break-word",
  },

  // Photo panel (iframe)
  photoPanel: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fafafa",
    minHeight: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  photoIframe: {
    width: "100%",
    height: 420,
    border: "none",
  },
  noPhoto: {
    padding: 20,
    color: "#6b7280",
    fontStyle: "italic",
  },

  cancelBtn: {
    padding: "12px 18px",
    borderRadius: 10,
    border: "none",
    backgroundColor: "#ef4444",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  toast: {
    marginTop: 16,
    padding: "12px 16px",
    borderRadius: 10,
    background: "#eef2ff",
    color: "#1e3a8a",
    fontWeight: 600,
  },
  dialogOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(4px)",
  },
  dialogBox: {
    width: "min(92vw, 520px)",
    background: "#fff",
    padding: 24,
    borderRadius: 14,
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
  },
  dialogCancel: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    color: "#374151",
    fontWeight: 600,
    cursor: "pointer",
  },
  confirmBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    backgroundColor: "#ef4444",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  errorText: { marginTop: 8, color: "#dc2626", fontWeight: 600 },
};
