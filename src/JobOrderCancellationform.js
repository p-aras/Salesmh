import React, { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch, FiChevronLeft, FiLoader, FiAlertCircle, FiX,
  FiTrash2, FiZoomIn, FiExternalLink, FiDownload, FiCheckCircle,
  FiUser, FiPackage, FiTool, FiInfo, FiCalendar,
  FiHash, FiTag, FiLayers, FiShoppingBag, FiGrid, FiEye,
  FiArrowLeft, FiFileText, FiImage, FiClock
} from "react-icons/fi";

/** ==========================================================
 * JobOrderCancellationForm (White-Blue Professional Theme)
 * - Clean, professional white-blue design
 * - Smooth, lightweight CSS
 * - Unique classnames with 'joc-' prefix
 * - Minimal but sophisticated styling
 * ========================================================== */

// ====== CONFIG ======
const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const SPREADSHEET_ID = "1fKSwGBIpzWEFk566WRQ4bzQ0anJlmasoY8TwrTLQHXI";
const SHEET_NAME = "JobOrder";
const RANGE = `${SHEET_NAME}!A1:ZZZ`;
const CANCELS_SHEET_NAME = "Cancel";
const CANCELS_RANGE = `${CANCELS_SHEET_NAME}!A1:ZZZ`;
const CANCEL_SUBMIT_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwwUUZTxzlkAoxGjcgmmXKEdfnA7syRhxyC9GGz0yXPzcNIWZ1XrQVdUgB6v6-0PFUt_Q/exec";

// ====== CLEAN WHITE-BLUE THEME ======
const THEME = {
  colors: {
    white: "#FFFFFF",
    offWhite: "#F8FAFC",
    lightBlue: "#EFF6FF",
    softBlue: "#DBEAFE",
    primary: "#2563EB",
    primaryLight: "#3B82F6",
    primarySoft: "#60A5FA",
    primaryVeryLight: "#93C5FD",
    darkBlue: "#1E40AF",
    navy: "#1E293B",
    slate: "#334155",
    grayLight: "#F1F5F9",
    gray: "#CBD5E1",
    grayDark: "#94A3B8",
    success: "#10B981",
    successLight: "#D1FAE5",
    danger: "#EF4444",
    dangerLight: "#FEE2E2",
    text: {
      primary: "#0F172A",
      secondary: "#334155",
      tertiary: "#64748B",
      light: "#94A3B8"
    }
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)"
  },
  transitions: {
    default: "all 0.2s ease",
    smooth: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  }
};

// ====== STYLESHEET (SINGLE STYLED COMPONENT) ======
const styles = {
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "24px",
    minHeight: "100vh",
    background: THEME.colors.offWhite,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "32px"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  backButton: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: `1px solid ${THEME.colors.gray}`,
    background: THEME.colors.white,
    color: THEME.colors.text.secondary,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    transition: THEME.transitions.default
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: THEME.colors.text.primary,
    letterSpacing: "-0.3px",
    margin: 0
  },
  downloadButton: {
    height: "40px",
    padding: "0 20px",
    borderRadius: "10px",
    border: `1px solid ${THEME.colors.gray}`,
    background: THEME.colors.white,
    color: THEME.colors.text.secondary,
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    transition: THEME.transitions.default
  },
  toast: {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 1000,
    padding: "12px 20px",
    background: THEME.colors.white,
    borderLeft: `4px solid ${THEME.colors.success}`,
    borderRadius: "8px",
    boxShadow: THEME.shadows.lg,
    color: THEME.colors.text.primary,
    fontSize: "14px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer"
  },
  searchCard: {
    background: THEME.colors.white,
    border: `1px solid ${THEME.colors.gray}`,
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "24px",
    boxShadow: THEME.shadows.md
  },
  searchRow: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto auto",
    gap: "12px",
    alignItems: "center"
  },
  searchIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: THEME.colors.lightBlue,
    color: THEME.colors.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px"
  },
  searchInput: {
    height: "44px",
    borderRadius: "12px",
    border: `1px solid ${THEME.colors.gray}`,
    background: THEME.colors.white,
    color: THEME.colors.text.primary,
    padding: "0 16px",
    fontSize: "14px",
    transition: THEME.transitions.default,
    outline: "none"
  },
  clearButton: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    border: `1px solid ${THEME.colors.gray}`,
    background: THEME.colors.white,
    color: THEME.colors.text.light,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: THEME.transitions.default
  },
  searchButton: {
    height: "44px",
    padding: "0 24px",
    borderRadius: "12px",
    border: "none",
    background: THEME.colors.primary,
    color: THEME.colors.white,
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    transition: THEME.transitions.default
  },
  errorBanner: {
    marginTop: "16px",
    padding: "12px 16px",
    borderRadius: "10px",
    background: THEME.colors.dangerLight,
    border: `1px solid ${THEME.colors.danger}30`,
    color: THEME.colors.danger,
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  successBanner: {
    marginTop: "16px",
    padding: "12px 16px",
    borderRadius: "10px",
    background: THEME.colors.successLight,
    border: `1px solid ${THEME.colors.success}30`,
    color: THEME.colors.success,
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "1.4fr 0.8fr",
    gap: "24px",
    marginTop: "24px"
  },
  leftPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  sectionCard: {
    background: THEME.colors.white,
    border: `1px solid ${THEME.colors.gray}`,
    borderRadius: "16px",
    padding: "20px",
    boxShadow: THEME.shadows.md
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: `1px solid ${THEME.colors.gray}`
  },
  sectionIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: THEME.colors.lightBlue,
    color: THEME.colors.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px"
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: THEME.colors.text.primary,
    margin: 0
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px"
  },
  field: {
    background: THEME.colors.offWhite,
    border: `1px solid ${THEME.colors.gray}`,
    borderRadius: "12px",
    padding: "14px",
    transition: THEME.transitions.default
  },
  label: {
    fontSize: "11px",
    fontWeight: "500",
    color: THEME.colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    marginBottom: "6px",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  value: {
    fontSize: "14px",
    fontWeight: "500",
    color: THEME.colors.text.primary,
    lineHeight: "1.5",
    wordBreak: "break-word"
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "8px"
  },
  cancelButton: {
    height: "48px",
    padding: "0 24px",
    borderRadius: "12px",
    border: `1px solid ${THEME.colors.danger}50`,
    background: THEME.colors.dangerLight,
    color: THEME.colors.danger,
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    transition: THEME.transitions.default
  },
  rightPanel: {
    position: "sticky",
    top: "24px",
    height: "fit-content"
  },
  imageCard: {
    background: THEME.colors.white,
    border: `1px solid ${THEME.colors.gray}`,
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: THEME.shadows.md
  },
  imageHeader: {
    padding: "16px 20px",
    background: THEME.colors.offWhite,
    borderBottom: `1px solid ${THEME.colors.gray}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  imageTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: THEME.colors.text.secondary
  },
  imageActions: {
    display: "flex",
    gap: "6px"
  },
  imageActionButton: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: `1px solid ${THEME.colors.gray}`,
    background: THEME.colors.white,
    color: THEME.colors.text.light,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    transition: THEME.transitions.default
  },
  imageWrapper: {
    position: "relative",
    background: THEME.colors.offWhite,
    minHeight: "360px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  iframe: {
    width: "100%",
    height: "440px",
    border: "none",
    background: THEME.colors.white
  },
  frameSkeleton: {
    position: "absolute",
    inset: 0,
    background: `linear-gradient(90deg, ${THEME.colors.grayLight} 25%, ${THEME.colors.gray} 50%, ${THEME.colors.grayLight} 75%)`,
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite"
  },
  placeholder: {
    height: "360px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    color: THEME.colors.text.light,
    fontSize: "40px",
    background: THEME.colors.offWhite
  },
  placeholderText: {
    fontSize: "13px",
    color: THEME.colors.text.light
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  dialog: {
    width: "100%",
    maxWidth: "520px",
    background: THEME.colors.white,
    borderRadius: "20px",
    boxShadow: THEME.shadows.xl,
    overflow: "hidden"
  },
  dialogHeader: {
    padding: "20px",
    background: THEME.colors.offWhite,
    borderBottom: `1px solid ${THEME.colors.gray}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  dialogTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: THEME.colors.text.primary,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: 0
  },
  dialogBody: {
    padding: "20px"
  },
  dialogRow: {
    marginBottom: "16px"
  },
  dialogLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: "500",
    color: THEME.colors.text.tertiary,
    marginBottom: "6px"
  },
  dialogInput: {
    width: "100%",
    height: "44px",
    borderRadius: "10px",
    border: `1px solid ${THEME.colors.gray}`,
    background: THEME.colors.white,
    color: THEME.colors.text.primary,
    padding: "0 14px",
    fontSize: "14px",
    transition: THEME.transitions.default,
    outline: "none"
  },
  dialogTextarea: {
    width: "100%",
    minHeight: "100px",
    borderRadius: "10px",
    border: `1px solid ${THEME.colors.gray}`,
    background: THEME.colors.white,
    color: THEME.colors.text.primary,
    padding: "12px 14px",
    fontSize: "14px",
    fontFamily: "inherit",
    transition: THEME.transitions.default,
    outline: "none",
    resize: "vertical"
  },
  dialogActions: {
    padding: "20px",
    borderTop: `1px solid ${THEME.colors.gray}`,
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px"
  },
  button: {
    secondary: {
      height: "42px",
      padding: "0 20px",
      borderRadius: "10px",
      border: `1px solid ${THEME.colors.gray}`,
      background: THEME.colors.white,
      color: THEME.colors.text.secondary,
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      transition: THEME.transitions.default
    },
    primary: {
      height: "42px",
      padding: "0 20px",
      borderRadius: "10px",
      border: "none",
      background: THEME.colors.primary,
      color: THEME.colors.white,
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      transition: THEME.transitions.default
    }
  },
  lightbox: {
    width: "min(96vw, 1200px)",
    background: THEME.colors.white,
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: THEME.shadows.xl
  },
  lightboxHeader: {
    padding: "16px 20px",
    background: THEME.colors.offWhite,
    borderBottom: `1px solid ${THEME.colors.gray}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  lightboxBody: {
    background: THEME.colors.offWhite,
    maxHeight: "80vh"
  }
};

// ====== MAIN COMPONENT ======
const JobOrderCancellationForm = ({ onBack }) => {
  const [lotQuery, setLotQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sheetErr, setSheetErr] = useState("");
  const [record, setRecord] = useState(null);
  const [searched, setSearched] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [approvedFrom, setApprovedFrom] = useState("");
  const [cancelledBy, setCancelledBy] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const [submitOk, setSubmitOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [globalOk, setGlobalOk] = useState("");
  const [lightbox, setLightbox] = useState(false);
  const [frameLoading, setFrameLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Add keyframe animations to document
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes joc-shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
      @keyframes joc-spin {
        to { transform: rotate(360deg); }
      }
      .joc-spin {
        animation: joc-spin 1s linear infinite;
      }
      .joc-hover-lift:hover {
        transform: translateY(-1px);
        box-shadow: ${THEME.shadows.lg};
      }
      .joc-focus-ring:focus {
        outline: none;
        border-color: ${THEME.colors.primary} !important;
        box-shadow: 0 0 0 3px ${THEME.colors.primaryLight}30 !important;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Prefill from URL ?lot=XXXX
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("lot");
      if (q) setLotQuery(q);
    } catch {}
  }, []);

  const handleSearch = useCallback(async () => {
    const q = lotQuery.trim();
    setSearched(true);
    setSheetErr("");
    setRecord(null);
    if (!q) return;

    try {
      setLoading(true);
      const { records } = await fetchSheet();
      const found = records.find(
        (r) =>
          String(r["Lot Number"] || "").trim().toLowerCase() === q.toLowerCase()
      );
      if (!found) setSheetErr(`No lot found for “${q}”.`);
      else {
        setRecord(found);
        setFrameLoading(true);
      }
    } catch (e) {
      setSheetErr(e.message || "Failed to load sheet.");
    } finally {
      setLoading(false);
    }
  }, [lotQuery]);

  useEffect(() => {
    if (lotQuery && !record && !searched) {
      handleSearch();
    }
  }, [lotQuery, record, searched, handleSearch]);

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const core = useMemo(() => {
    if (!record) return [];
    return [
      { k: "Job Order No", v: record["Job Order No"], icon: <FiHash /> },
      { k: "Date", v: record["Date"], icon: <FiCalendar /> },
      { k: "Party Name", v: record["Party Name"], icon: <FiUser /> },
      { k: "Garment Type", v: record["Garment Type"], icon: <FiShoppingBag /> },
      { k: "Submitted By", v: record["Submitted By"], icon: <FiUser /> },
      { k: "Lot Number", v: record["Lot Number"], icon: <FiTag /> },
      { k: "Component", v: record["Component"], icon: <FiLayers /> },
    ];
  }, [record]);

  const qty = useMemo(() => {
    if (!record) return [];
    return [
      { k: "Fabric", v: record["Fabric"], icon: <FiPackage /> },
      { k: "Brand", v: record["Brand"], icon: <FiTag /> },
      { k: "Shade", v: record["Shade"], icon: <FiGrid /> },
      { k: "Size", v: record["Size"], icon: <FiLayers /> },
      { k: "Quantity", v: record["Quantity"], icon: <FiHash /> },
      { k: "Unit", v: record["Unit"], icon: <FiPackage /> },
      { k: "Section", v: record["Section"], icon: <FiGrid /> },
      { k: "Season", v: record["Season"], icon: <FiCalendar /> },
    ];
  }, [record]);

  const process = useMemo(() => {
    if (!record) return [];
    return [
      { k: "Emb", v: record["Emb"], icon: <FiTool /> },
      { k: "Emb Details", v: record["Emb Details"], icon: <FiInfo /> },
      { k: "Printing", v: record["Printing"], icon: <FiTool /> },
      { k: "Printing Details", v: record["Printing Details"], icon: <FiInfo /> },
      { k: "Pattern", v: record["Pattern"], icon: <FiLayers /> },
      { k: "Style", v: record["Style"], icon: <FiShoppingBag /> },
      { k: "Direct Stitching", v: record["Direct Stitching"], icon: <FiTool /> },
      { k: "Remarks", v: record["Remarks"], icon: <FiFileText /> },
    ];
  }, [record]);

  const iframeUrl = useMemo(() => {
    if (!record) return "";
    return normalizeToIframeUrl(String(record["Image URL"] || "").trim());
  }, [record]);

  useEffect(() => {
    if (!iframeUrl) return;
    setFrameLoading(true);
    const t = setTimeout(() => setFrameLoading(false), 6000);
    return () => clearTimeout(t);
  }, [iframeUrl]);

  const canConfirm = reason.trim() && approvedFrom.trim() && cancelledBy.trim();

  const confirmCancel = async () => {
    setSubmitErr("");
    setSubmitOk(false);
    setSubmitting(true);

    const payload = {
      lotNumber: record?.["Lot Number"] || "",
      jobOrderNo: record?.["Job Order No"] || "",
      reason: reason.trim(),
      approvedFrom: approvedFrom.trim(),
      cancelledBy: cancelledBy.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      if (CANCEL_SUBMIT_ENDPOINT) {
        const form = new URLSearchParams();
        form.set("payload", JSON.stringify({ action: "cancelJobOrder", data: payload }));
        const r = await fetch(CANCEL_SUBMIT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: form.toString(),
        });

        let j = {};
        try { j = await r.json(); } catch (_) {}
        if (!r.ok || j.success === false || j.status === "error") {
          const msg = j.message || `Submit error ${r.status}`;
          throw new Error(msg);
        }
      } else {
        await new Promise((r) => setTimeout(r, 300));
      }

      setSubmitOk(true);
      setGlobalOk(`Cancellation saved for Lot ${payload.lotNumber}.`);
      setTimeout(() => setGlobalOk(""), 3000);

      const rawImageUrl = String(record?.["Image URL"] || "").trim();
      setPdfBusy(true);
      buildAndDownloadCancellationPDF({
        record,
        core,
        qty,
        process,
        reason,
        approvedFrom,
        cancelledBy,
        rawImageUrl,
      })
        .catch((pdfErr) => {
          console.warn("PDF generation failed:", pdfErr);
        })
        .finally(() => setPdfBusy(false));

    } catch (e) {
      setSubmitErr(e.message || "Failed to save cancellation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAllCancelled = useCallback(async () => {
    setDownloadingAll(true);
    try {
      const rows = await fetchCancelledLots();
      if (!rows || !rows.length) {
        alert("No cancelled lots found in the 'Cancel' tab.");
        return;
      }
      const allKeys = new Set();
      rows.forEach((r) => Object.keys(r || {}).forEach((k) => allKeys.add(k)));
      const headers = Array.from(allKeys);
      const uniformRows = rows.map((r) => {
        const o = {};
        headers.forEach((h) => (o[h] = r?.[h] ?? ""));
        return o;
      });
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      downloadCsv(`All_Cancelled_Lots_${stamp}`, uniformRows);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to download cancelled lots.");
    } finally {
      setDownloadingAll(false);
    }
  }, []);

  const handleBack = () => {
    if (typeof onBack === "function") onBack();
    else if (window.history.length > 1) window.history.back();
  };

  return (
    <div className="joc-root">
      {/* Global Styles */}
      <style>{`
        .joc-root * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .joc-root {
          all: initial;
          display: block;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .joc-hover-lift:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        .joc-focus-ring:focus {
          outline: none;
          border-color: #2563EB !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
        }
      `}</style>

      {/* Toast Notification */}
      <AnimatePresence>
        {globalOk && (
          <motion.div
            style={styles.toast}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => setGlobalOk("")}
          >
            <FiCheckCircle color={THEME.colors.success} size={18} />
            {globalOk}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton}
            onClick={handleBack}
            className="joc-hover-lift"
          >
            <FiArrowLeft />
          </button>
          <h1 style={styles.title}>Job Order Cancellation</h1>
        </div>
        <button
          style={styles.downloadButton}
          onClick={handleDownloadAllCancelled}
          disabled={downloadingAll}
          className="joc-hover-lift"
        >
          {downloadingAll ? (
            <FiLoader className="joc-spin" />
          ) : (
            <FiDownload />
          )}
          Download All
        </button>
      </div>

      {/* Search Section */}
      <motion.div
        style={styles.searchCard}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div style={styles.searchRow}>
          <div style={styles.searchIcon}>
            <FiSearch />
          </div>
          <input
            style={styles.searchInput}
            placeholder="Enter Lot Number (e.g., 11028)"
            value={lotQuery}
            onChange={(e) => setLotQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="joc-focus-ring"
          />
          {lotQuery && (
            <button
              style={styles.clearButton}
              onClick={() => {
                setLotQuery("");
                setRecord(null);
                setSearched(false);
                setSheetErr("");
              }}
              className="joc-hover-lift"
            >
              <FiX />
            </button>
          )}
          <button
            style={styles.searchButton}
            onClick={handleSearch}
            disabled={loading || !lotQuery.trim()}
            className="joc-hover-lift"
          >
            {loading ? <FiLoader className="joc-spin" /> : "Search"}
          </button>
        </div>

        <AnimatePresence>
          {sheetErr && (
            <motion.div
              style={styles.errorBanner}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FiAlertCircle size={16} />
              {sheetErr}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Main Content */}
      {record && (
        <div style={styles.layout}>
          <div style={styles.leftPanel}>
            {/* Overview Section */}
            <motion.div
              style={styles.sectionCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div style={styles.sectionHeader}>
                <div style={styles.sectionIcon}>
                  <FiInfo />
                </div>
                <h2 style={styles.sectionTitle}>Overview</h2>
              </div>
              <div style={styles.grid}>
                {core.map(({ k, v, icon }) => (
                  <div key={k} style={styles.field} className="joc-hover-lift">
                    <div style={styles.label}>
                      {icon}
                      {k}
                    </div>
                    <div style={styles.value}>{val(v)}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Materials Section */}
            <motion.div
              style={styles.sectionCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div style={styles.sectionHeader}>
                <div style={styles.sectionIcon}>
                  <FiPackage />
                </div>
                <h2 style={styles.sectionTitle}>Materials & Specs</h2>
              </div>
              <div style={styles.grid}>
                {qty.map(({ k, v, icon }) => (
                  <div key={k} style={styles.field} className="joc-hover-lift">
                    <div style={styles.label}>
                      {icon}
                      {k}
                    </div>
                    <div style={styles.value}>{val(v)}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Processes Section */}
            <motion.div
              style={styles.sectionCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div style={styles.sectionHeader}>
                <div style={styles.sectionIcon}>
                  <FiTool />
                </div>
                <h2 style={styles.sectionTitle}>Processes</h2>
              </div>
              <div style={styles.grid}>
                {process.map(({ k, v, icon }) => (
                  <div key={k} style={styles.field} className="joc-hover-lift">
                    <div style={styles.label}>
                      {icon}
                      {k}
                    </div>
                    <div style={styles.value}>{val(v)}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <div style={styles.actions}>
              <button
                style={styles.cancelButton}
                onClick={() => setDialogOpen(true)}
                className="joc-hover-lift"
              >
                <FiTrash2 size={16} />
                Cancel Order
              </button>
            </div>
          </div>

          <div style={styles.rightPanel}>
            {/* Image Section */}
            <motion.div
              style={styles.imageCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div style={styles.imageHeader}>
                <div style={styles.imageTitle}>
                  <FiImage size={16} />
                  Lot Image
                </div>
                <div style={styles.imageActions}>
                  {iframeUrl && (
                    <a
                      href={iframeUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.imageActionButton}
                      className="joc-hover-lift"
                    >
                      <FiExternalLink size={14} />
                    </a>
                  )}
                  <button
                    style={styles.imageActionButton}
                    disabled={!iframeUrl}
                    onClick={() => iframeUrl && setLightbox(true)}
                    className="joc-hover-lift"
                  >
                    <FiZoomIn size={14} />
                  </button>
                </div>
              </div>

              <div style={styles.imageWrapper}>
                {iframeUrl ? (
                  <>
                    {frameLoading && <div style={styles.frameSkeleton} />}
                    <iframe
                      src={iframeUrl}
                      style={{
                        ...styles.iframe,
                        opacity: frameLoading ? 0 : 1,
                        transition: "opacity 0.3s ease"
                      }}
                      onLoad={() => setFrameLoading(false)}
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                      title="Lot Image"
                    />
                  </>
                ) : (
                  <div style={styles.placeholder}>
                    <FiImage />
                    <span style={styles.placeholderText}>No image provided</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <motion.div
            style={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDialogOpen(false)}
          >
            <motion.div
              style={styles.dialog}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.dialogHeader}>
                <h3 style={styles.dialogTitle}>
                  <FiAlertCircle size={18} />
                  Confirm Cancellation
                </h3>
                <button
                  style={styles.imageActionButton}
                  onClick={() => setDialogOpen(false)}
                >
                  <FiX size={16} />
                </button>
              </div>

              <div style={styles.dialogBody}>
                <div style={styles.dialogRow}>
                  <label style={styles.dialogLabel}>Reason for Cancellation</label>
                  <textarea
                    style={styles.dialogTextarea}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide reason..."
                    className="joc-focus-ring"
                  />
                </div>

                <div style={styles.dialogRow}>
                  <label style={styles.dialogLabel}>Approved From</label>
                  <input
                    style={styles.dialogInput}
                    value={approvedFrom}
                    onChange={(e) => setApprovedFrom(e.target.value)}
                    placeholder="Approver name/role"
                    className="joc-focus-ring"
                  />
                </div>

                <div style={styles.dialogRow}>
                  <label style={styles.dialogLabel}>Cancelled By</label>
                  <input
                    style={styles.dialogInput}
                    value={cancelledBy}
                    onChange={(e) => setCancelledBy(e.target.value)}
                    placeholder="Your name"
                    className="joc-focus-ring"
                  />
                </div>

                <AnimatePresence>
                  {submitErr && (
                    <motion.div
                      style={styles.errorBanner}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <FiAlertCircle size={14} />
                      {submitErr}
                    </motion.div>
                  )}

                  {submitOk && (
                    <motion.div
                      style={styles.successBanner}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <FiCheckCircle size={14} />
                      Cancellation recorded successfully.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div style={styles.dialogActions}>
                <button
                  style={styles.button.secondary}
                  onClick={() => setDialogOpen(false)}
                  className="joc-hover-lift"
                >
                  Cancel
                </button>
                <button
                  style={styles.button.primary}
                  onClick={confirmCancel}
                  disabled={!canConfirm || submitting || pdfBusy}
                  className="joc-hover-lift"
                >
                  {submitting ? (
                    <>
                      <FiLoader className="joc-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm & Save"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && iframeUrl && (
          <motion.div
            style={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
          >
            <motion.div
              style={styles.lightbox}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.lightboxHeader}>
                <span style={styles.imageTitle}>
                  <FiEye size={16} />
                  Image Preview
                </span>
                <button
                  style={styles.imageActionButton}
                  onClick={() => setLightbox(false)}
                >
                  <FiX size={16} />
                </button>
              </div>
              <div style={styles.lightboxBody}>
                <iframe
                  src={iframeUrl}
                  style={styles.iframe}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  title="Lot Image Preview"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ====== HELPER FUNCTIONS ======
const toRecord = (headers, row) => {
  const o = {};
  headers.forEach((h, i) => (o[h.trim()] = row?.[i] ?? ""));
  return o;
};

const fetchSheet = async () => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    RANGE
  )}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Sheets API error ${res.status}${txt ? `: ${txt}` : ""}`);
  }
  const data = await res.json();
  const rows = data.values ?? [];
  const headers = rows[0] ?? [];
  const records = rows.slice(1).map((r) => toRecord(headers, r));
  return { headers, records };
};

const isEmpty = (v) =>
  !v || String(v).trim() === "" || String(v).trim().toUpperCase() === "NA";
const val = (v, dash = "—") => (isEmpty(v) ? dash : String(v));

const normalizeToIframeUrl = (urlRaw) => {
  const url = (urlRaw || "").trim();
  if (!url) return "";
  try {
    const m1 = url.match(/\/file\/d\/([^/]+)(?:\/|$)/);
    if (m1?.[1]) return `https://drive.google.com/file/d/${m1[1]}/preview`;
    const u = new URL(url, window.location.origin);
    const id = u.searchParams.get("id");
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
    return url;
  } catch {
    return url;
  }
};

const csvEscape = (v) => {
  const s = String(v ?? "");
  const needsQuotes = /[",\n]/.test(s);
  const esc = s.replace(/"/g, '""');
  return needsQuotes ? `"${esc}"` : esc;
};

const downloadCsv = (filename, rows) => {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(csvEscape).join(",");
  const lines = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","));
  const csv = [headerLine, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const fetchCancelledLots = async () => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    CANCELS_RANGE
  )}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Sheets API error ${res.status}${txt ? `: ${txt}` : ""}`);
  }
  const data = await res.json();
  const rows = data.values ?? [];
  if (!rows.length) return [];

  const headers = rows[0] ?? [];
  const records = rows.slice(1).map((r) => toRecord(headers, r));
  return records;
};

// PDF Helpers
const ensureJsPDF = async () => {
  if (window.jspdf?.jsPDF && window.jspdf?.jsPDF.API) {
    return window.jspdf;
  }

  try {
    const jspdfMod = await import(/* @vite-ignore */ "jspdf");
    try { await import(/* @vite-ignore */ "jspdf-autotable"); } catch {}
    if (jspdfMod?.jsPDF) return jspdfMod;
  } catch {
    // fall through to CDN
  }

  const addScript = (src) =>
    new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  if (!window.jspdf?.jsPDF) {
    await addScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js");
  }
  if (!window.jspdf?.jsPDF?.API?.autoTable) {
    await addScript(
      "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.5/dist/jspdf.plugin.autotable.min.js"
    );
  }

  if (!window.jspdf?.jsPDF) {
    throw new Error("Failed to load jsPDF");
  }
  return window.jspdf;
};

const fetchImageAsDataURL = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const pad2 = (n) => String(n).padStart(2, "0");
const tsFileStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(
    d.getHours()
  )}${pad2(d.getMinutes())}`;
};

const buildAndDownloadCancellationPDF = async ({
  record,
  core,
  qty,
  process,
  reason,
  approvedFrom,
  cancelledBy,
  rawImageUrl,
}) => {
  const jsPDFmod = await ensureJsPDF();
  const { jsPDF } = jsPDFmod;

  if (!jsPDF.API.autoTable) {
    throw new Error("jspdf-autotable not loaded");
  }

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

  const accent = [37, 99, 235]; // Primary blue
  const ink = [15, 23, 42];
  const subInk = [71, 85, 105];

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 36;
  let y = M;

  doc.setFillColor(248, 250, 252); // offWhite
  doc.rect(0, 0, pageW, 90, "F");

  doc.setTextColor(15, 23, 42); // text primary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Job Order Cancellation", M, 48);

  doc.setFillColor(...accent);
  doc.roundedRect(pageW - M - 118, 24, 118, 28, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("CANCELLED", pageW - M - 98, 43);

  y = 108;

  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const lotNo = String(record?.["Lot Number"] || "");
  const joNo = String(record?.["Job Order No"] || "");
  const now = new Date();
  doc.text(`Lot: ${lotNo}`, M, y);
  doc.text(`Job Order: ${joNo}`, M + 200, y);
  doc.text(`Date: ${now.toLocaleDateString()}`, M + 420, y);
  y += 22;

  const sectionTitle = (t) => {
    doc.setTextColor(...subInk);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(t.toUpperCase(), M, y);
    y += 8;
    doc.setDrawColor(203, 213, 225); // gray
    doc.setLineWidth(0.7);
    doc.line(M, y, pageW - M, y);
    y += 10;
  };

  const toRows = (arr) => arr.map(({ k, v }) => [k, isEmpty(v) ? "—" : String(v)]);
  const ATable = jsPDF.API.autoTable.bind(doc);

  sectionTitle("Overview");
  ATable({
    startY: y,
    margin: { left: M, right: M },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: accent, textColor: [255, 255, 255] },
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "striped",
    head: [["Field", "Value"]],
    body: toRows(core),
  });
  y = doc.lastAutoTable.finalY + 16;

  sectionTitle("Materials & Specs");
  ATable({
    startY: y,
    margin: { left: M, right: M },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: accent, textColor: [255, 255, 255] },
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "striped",
    head: [["Field", "Value"]],
    body: toRows(qty),
  });
  y = doc.lastAutoTable.finalY + 16;

  sectionTitle("Processes");
  ATable({
    startY: y,
    margin: { left: M, right: M },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: accent, textColor: [255, 255, 255] },
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "striped",
    head: [["Field", "Value"]],
    body: toRows(process),
  });
  y = doc.lastAutoTable.finalY + 16;

  sectionTitle("Cancellation Details");
  ATable({
    startY: y,
    margin: { left: M, right: M },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: accent, textColor: [255, 255, 255] },
    bodyStyles: { fillColor: [255, 255, 255] },
    theme: "striped",
    head: [["Field", "Value"]],
    body: [
      ["Reason", reason || "—"],
      ["Approved From", approvedFrom || "—"],
      ["Cancelled By", cancelledBy || "—"],
      ["Timestamp", now.toLocaleString()],
    ],
  });
  y = doc.lastAutoTable.finalY + 18;

  const imgDataUrl = await fetchImageAsDataURL(rawImageUrl);
  if (imgDataUrl) {
    sectionTitle("Image");
    const maxW = pageW - M * 2;
    const imgW = maxW;
    const imgH = 260;
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(M - 2, y - 2, imgW + 4, imgH + 4, 8, 8);
    try {
      doc.addImage(imgDataUrl, "PNG", M, y, imgW, imgH, undefined, "FAST");
      y += imgH + 16;
    } catch {
      // ignore image failure
    }
  }

  doc.setFillColor(248, 250, 252);
  doc.rect(0, pageH - 50, pageW, 50, "F");
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Generated by Job Order Cancellation • ${now.toLocaleString()}`,
    M,
    pageH - 20
  );

  const fname = `Cancelled_${String(record?.["Lot Number"] || "Lot")}_${tsFileStamp()}.pdf`;

  setTimeout(() => doc.save(fname), 0);
};

export default JobOrderCancellationForm;