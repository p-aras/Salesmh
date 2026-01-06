import React, { useMemo, useState, useCallback, useEffect } from "react";
import styled, { ThemeProvider, createGlobalStyle } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch, FiChevronLeft, FiLoader, FiAlertCircle, FiX,
  FiTrash2, FiZoomIn, FiExternalLink
} from "react-icons/fi";

/** ==========================================================
 * JobOrderCancellationForm (Iframe Image Version)
 * - Search by Lot Number (Enter/click)
 * - Fetch row from Google Sheets v4 (client-side)
 * - Left: grouped details with emoji sections
 * - Right: image panel rendered via <iframe> + zoom lightbox
 * - Drive links normalized to /preview for iframe embeds
 * - Download ALL cancelled lots from "Cancel" tab as CSV
 * - ✅ Global success toast after status update
 * - ✅ Auto-generate & download modern PDF after success
 * - ✅ Robust jsPDF loading (NPM or CDN fallback) + reliable success UI
 * ========================================================== */

// ====== CONFIG ======
const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const SPREADSHEET_ID = "1fKSwGBIpzWEFk566WRQ4bzQ0anJlmasoY8TwrTLQHXI";
const SHEET_NAME = "JobOrder"; // source tab for lot search
const RANGE = `${SHEET_NAME}!A1:ZZZ`;

// Cancellations tab
const CANCELS_SHEET_NAME = "Cancel";
const CANCELS_RANGE = `${CANCELS_SHEET_NAME}!A1:ZZZ`;

// Apps Script endpoint to log cancellations
const CANCEL_SUBMIT_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwwUUZTxzlkAoxGjcgmmXKEdfnA7syRhxyC9GGz0yXPzcNIWZ1XrQVdUgB6v6-0PFUt_Q/exec";

// ====== THEME ======
const THEME = {
  name: "dark",
  bg: "#0b1220",
  bgSoft: "#0f172a",
  card: "rgba(17,24,39,0.68)",
  glassBorder: "1px solid rgba(255,255,255,0.08)",
  fg: "#e5e7eb",
  sub: "#9ca3af",
  prime: "#00c9ff",
  primeSoft: "rgba(0,201,255,0.20)",
  line: "1px dashed rgba(255,255,255,0.12)",
  danger: "#ef4444",
  dangerSoft: "rgba(239,68,68,0.15)",
  okSoft: "rgba(34,197,94,0.15)",
  shadow: "0 24px 64px rgba(0,0,0,0.45)",
  glow: "0 10px 36px rgba(0,201,255,0.2)",
};

const GlobalStyle = createGlobalStyle`
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
    color: ${THEME.fg};
    background:
      radial-gradient(1200px 600px at -10% -10%, rgba(0,201,255,.08), transparent),
      ${THEME.bg};
  }
`;

// ====== HELPERS ======
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

/** Convert image URL to an iframe-friendly URL. */
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

// CSV helpers
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

// Read all rows from the "Cancel" tab
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

/* ===================== PDF HELPERS (ROBUST) ===================== */
/** Load jsPDF & autotable from NPM if available; else inject CDN and wait. */
const ensureJsPDF = async () => {
  // Already present?
  if (window.jspdf?.jsPDF && window.jspdf?.jsPDF.API) {
    // If autotable was loaded by CDN, it attaches to API automatically
    return window.jspdf;
  }

  // Try dynamic ESM imports (works when packages are installed)
  try {
    const jspdfMod = await import(/* @vite-ignore */ "jspdf");
    // Side-effect import to register autotable onto jsPDF.API
    try { await import(/* @vite-ignore */ "jspdf-autotable"); } catch {}
    if (jspdfMod?.jsPDF) return jspdfMod;
  } catch {
    // fall through to CDN
  }

  // CDN fallback
  const addScript = (src) =>
    new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  // jsPDF first
  if (!window.jspdf?.jsPDF) {
    await addScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js");
  }
  // autotable next
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

/** Try to fetch an image and return a dataURL (PNG). Silently fail if CORS-blocked. */
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

/** Build a modern-styled PDF and auto-download it. */
const buildAndDownloadCancellationPDF = async ({
  record,
  core,
  qty,
  process,
  reason,
  approvedFrom,
  cancelledBy,
  rawImageUrl,  // original url from sheet (best chance to embed)
}) => {
  const jsPDFmod = await ensureJsPDF();
  const { jsPDF } = jsPDFmod;

  // Ensure autotable present (CDN/side-effect import attaches to API)
  if (!jsPDF.API.autoTable) {
    throw new Error("jspdf-autotable not loaded");
  }

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

  const accent = [0, 201, 255];
  const ink = [15, 23, 42];
  const subInk = [71, 85, 105];

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 36;
  let y = M;

  // Header band
  doc.setFillColor(11, 18, 32);
  doc.rect(0, 0, pageW, 90, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Job Order Cancellation", M, 48);

  // Badge
  doc.setFillColor(...accent);
  doc.roundedRect(pageW - M - 118, 24, 118, 28, 6, 6, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("CANCELLED", pageW - M - 98, 43);

  y = 108;

  // Meta row
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
    doc.setDrawColor(230, 232, 236);
    doc.setLineWidth(0.7);
    doc.line(M, y, pageW - M, y);
    y += 10;
  };

  const toRows = (arr) => arr.map(({ k, v }) => [k, isEmpty(v) ? "—" : String(v)]);
  const ATable = jsPDF.API.autoTable.bind(doc);

  // Overview
  sectionTitle("Overview");
  ATable({
    startY: y,
    margin: { left: M, right: M },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: accent, textColor: [0, 0, 0] },
    bodyStyles: { fillColor: [250, 251, 252] },
    alternateRowStyles: { fillColor: [244, 245, 247] },
    theme: "striped",
    head: [["Field", "Value"]],
    body: toRows(core),
  });
  y = doc.lastAutoTable.finalY + 16;

  // Materials & Specs
  sectionTitle("Materials & Specs");
  ATable({
    startY: y,
    margin: { left: M, right: M },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: accent, textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [244, 245, 247] },
    theme: "striped",
    head: [["Field", "Value"]],
    body: toRows(qty),
  });
  y = doc.lastAutoTable.finalY + 16;

  // Processes
  sectionTitle("Processes");
  ATable({
    startY: y,
    margin: { left: M, right: M },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: accent, textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [244, 245, 247] },
    theme: "striped",
    head: [["Field", "Value"]],
    body: toRows(process),
  });
  y = doc.lastAutoTable.finalY + 16;

  // Cancellation details
  sectionTitle("Cancellation Details");
  ATable({
    startY: y,
    margin: { left: M, right: M },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: accent, textColor: [0, 0, 0] },
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

  // Optional Image (best-effort)
  const imgDataUrl = await fetchImageAsDataURL(rawImageUrl);
  if (imgDataUrl) {
    sectionTitle("Image");
    const maxW = pageW - M * 2;
    const imgW = maxW;
    const imgH = 260;
    doc.setDrawColor(230, 232, 236);
    doc.roundedRect(M - 2, y - 2, imgW + 4, imgH + 4, 8, 8);
    try {
      doc.addImage(imgDataUrl, "PNG", M, y, imgW, imgH, undefined, "FAST");
      y += imgH + 16;
    } catch {
      // ignore image failure
    }
  }

  // Footer
  doc.setFillColor(240, 249, 255);
  doc.rect(0, pageH - 50, pageW, 50, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Generated by Job Order Cancellation • ${now.toLocaleString()}`,
    M,
    pageH - 20
  );

  const fname = `Cancelled_${String(record?.["Lot Number"] || "Lot")}_${tsFileStamp()}.pdf`;

  // Microtask to reduce popup-blocker issues after async work
  setTimeout(() => doc.save(fname), 0);
};
/* =================== END PDF HELPERS (ROBUST) =================== */

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

  const [pdfBusy, setPdfBusy] = useState(false); // prevent double-clicks during PDF build
  const [globalOk, setGlobalOk] = useState("");  // global success toast text

  const [lightbox, setLightbox] = useState(false);
  const [frameLoading, setFrameLoading] = useState(true);

  const [downloadingAll, setDownloadingAll] = useState(false);

  // Prefill from URL ?lot=XXXX (optional)
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

  // Auto-search if URL had ?lot=...
  useEffect(() => {
    if (lotQuery && !record && !searched) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotQuery]);

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const core = useMemo(() => {
    if (!record) return [];
    return [
      { k: "🔖 Job Order No", v: record["Job Order No"] },
      { k: "📅 Date", v: record["Date"] },
      { k: "🏷️ Party Name", v: record["Party Name"] },
      { k: "👕 Garment Type", v: record["Garment Type"] },
      { k: "👤 Submitted By", v: record["Submitted By"] },
      { k: "🧾 Lot Number", v: record["Lot Number"] },
      { k: "🧩 Component", v: record["Component"] },
    ];
  }, [record]);

  const qty = useMemo(() => {
    if (!record) return [];
    return [
      { k: "🧶 Fabric", v: record["Fabric"] },
      { k: "🏛️ Brand", v: record["Brand"] },
      { k: "🎨 Shade", v: record["Shade"] },
      { k: "📏 Size", v: record["Size"] },
      { k: "🔢 Quantity", v: record["Quantity"] },
      { k: "📦 Unit", v: record["Unit"] },
      { k: "🏗️ Section", v: record["Section"] },
      { k: "❄️ Season", v: record["Season"] },
    ];
  }, [record]);

  const process = useMemo(() => {
    if (!record) return [];
    return [
      { k: "🧵 Emb", v: record["Emb"] },
      { k: "📝 Emb Details", v: record["Emb Details"] },
      { k: "🖨️ Printing", v: record["Printing"] },
      { k: "📝 Printing Details", v: record["Printing Details"] },
      { k: "🧩 Pattern", v: record["Pattern"] },
      { k: "🧥 Style", v: record["Style"] },
      { k: "🧷 Direct Stitching", v: record["Direct Stitching"] },
      { k: "💬 Remarks", v: record["Remarks"] },
    ];
  }, [record]);

  const iframeUrl = useMemo(() => {
    if (!record) return "";
    return normalizeToIframeUrl(String(record["Image URL"] || "").trim());
  }, [record]);

  // Stop skeleton after X seconds (fallback)
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

        // Try to parse JSON, but don't require it
        let j = {};
        try { j = await r.json(); } catch (_) {}
        if (!r.ok || j.success === false || j.status === "error") {
          const msg = j.message || `Submit error ${r.status}`;
          throw new Error(msg);
        }
      } else {
        await new Promise((r) => setTimeout(r, 300)); // simulate success
      }

      // ✅ Success UI (will render even if PDF later fails)
      setSubmitOk(true); // green banner inside dialog
      setGlobalOk(`Cancellation saved for Lot ${payload.lotNumber}.`); // global toast
      setTimeout(() => setGlobalOk(""), 3000); // auto-hide

      // ✅ Build & download PDF (best-effort; won't block success UI)
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

      // Optional: auto-close dialog later
      // setTimeout(() => setDialogOpen(false), 800);

    } catch (e) {
      setSubmitErr(e.message || "Failed to save cancellation.");
    } finally {
      setSubmitting(false);
    }
  };

  // Download ALL cancelled lots from "Cancel"
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
    <ThemeProvider theme={THEME}>
      <GlobalStyle />
      <Wrap>
        {/* ✅ Global success toast */}
        <AnimatePresence>
          {globalOk && (
            <ToastOk
              as={motion.div}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              onClick={() => setGlobalOk("")}
              title="Click to dismiss"
            >
              {globalOk}
            </ToastOk>
          )}
        </AnimatePresence>

        <Header>
          <Back onClick={handleBack} title="Back">
            <FiChevronLeft />
          </Back>
          <h2>🛑 Job Order Cancellation</h2>

          <HeaderSpacer />
          <TopActions>
            <DownloadBtn
              onClick={handleDownloadAllCancelled}
              disabled={downloadingAll}
              title="Download all cancelled lots (CSV)"
            >
              {downloadingAll ? <FiLoader className="spin" /> : "Download All Cancelled Lots"}
            </DownloadBtn>
          </TopActions>
        </Header>

        {/* Search Card */}
        <Card as={motion.div} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <SearchRow>
            <IconLabel htmlFor="lot">
              <FiSearch />
            </IconLabel>
            <SearchInput
              id="lot"
              placeholder="Enter Lot Number (e.g., 11028) • Press Enter"
              value={lotQuery}
              onChange={(e) => setLotQuery(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
            />
            {lotQuery && (
              <ClearBtn
                type="button"
                aria-label="Clear"
                title="Clear"
                onClick={() => {
                  setLotQuery("");
                  setRecord(null);
                  setSearched(false);
                  setSheetErr("");
                }}
              >
                <FiX />
              </ClearBtn>
            )}
            <SearchBtn onClick={handleSearch} disabled={loading || !lotQuery.trim()}>
              {loading ? <FiLoader className="spin" /> : "Search"}
            </SearchBtn>
          </SearchRow>

          {sheetErr && (
            <BannerError>
              <FiAlertCircle /> {sheetErr}
            </BannerError>
          )}
          {searched && !loading && !record && !sheetErr && (
            <SoftText>Try a Lot Number above to view details.</SoftText>
          )}
        </Card>

        {/* Two-Pane Layout */}
        {record && (
          <TwoPane
            as={motion.section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* LEFT: details */}
            <Pane>
              <SectionCard>
                <SectionTitle>📌 Overview</SectionTitle>
                <Grid>
                  {core.map(({ k, v }) => (
                    <Field key={k}>
                      <Label>{k}</Label>
                      <Value>{val(v)}</Value>
                    </Field>
                  ))}
                </Grid>
              </SectionCard>

              <SectionCard>
                <SectionTitle>📦 Materials & Specs</SectionTitle>
                <Grid>
                  {qty.map(({ k, v }) => (
                    <Field key={k}>
                      <Label>{k}</Label>
                      <Value>{val(v)}</Value>
                    </Field>
                  ))}
                </Grid>
              </SectionCard>

              <SectionCard>
                <SectionTitle>🛠️ Processes</SectionTitle>
                <Grid>
                  {process.map(({ k, v }) => (
                    <Field key={k}>
                      <Label>{k}</Label>
                      <Value>{val(v)}</Value>
                    </Field>
                  ))}
                </Grid>
              </SectionCard>

              <Actions>
                <Danger onClick={() => setDialogOpen(true)}>
                  <FiTrash2 /> Cancel the Order
                </Danger>
              </Actions>
            </Pane>

            {/* RIGHT: image (IFRAME) */}
            <PaneRight>
              <ImageCard>
                <ImageHeader>
                  <span>🖼️ Lot Image</span>
                  <ImageActions>
                    {iframeUrl && (
                      <a href={iframeUrl} target="_blank" rel="noreferrer" title="Open in new tab">
                        <FiExternalLink />
                      </a>
                    )}
                    <button title="Zoom" disabled={!iframeUrl} onClick={() => iframeUrl && setLightbox(true)}>
                      <FiZoomIn />
                    </button>
                  </ImageActions>
                </ImageHeader>

                <ImageWrap>
                  {iframeUrl ? (
                    <>
                      {frameLoading && <FrameSkeleton />}
                      <IFrame
                        title="Lot Image"
                        src={iframeUrl}
                        onLoad={() => setFrameLoading(false)}
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        style={{ opacity: frameLoading ? 0 : 1, transition: "opacity .25s ease" }}
                      />
                    </>
                  ) : (
                    <Placeholder>
                      <span>🧭</span>
                      <small>No image provided</small>
                    </Placeholder>
                  )}
                </ImageWrap>
              </ImageCard>
            </PaneRight>
          </TwoPane>
        )}

        {/* CANCEL DIALOG */}
        <AnimatePresence>
          {dialogOpen && (
            <Overlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDialogOpen(false)}
            >
              <Dialog
                as={motion.div}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 16, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <DialogHeader>
                  <h3>🧾 Confirm Cancellation</h3>
                  <Close onClick={() => setDialogOpen(false)}>
                    <FiX />
                  </Close>
                </DialogHeader>
                <DialogBody>
                  <Row>
                    <RowLabel>❗ Reason of Cancellation</RowLabel>
                    <Input
                      as="textarea"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Describe the reason…"
                    />
                  </Row>
                  <Row>
                    <RowLabel>✅ Cancellation approved from</RowLabel>
                    <Input
                      value={approvedFrom}
                      onChange={(e) => setApprovedFrom(e.target.value)}
                      placeholder="Name / Role"
                    />
                  </Row>
                  <Row>
                    <RowLabel>👤 Cancelled by whom</RowLabel>
                    <Input
                      value={cancelledBy}
                      onChange={(e) => setCancelledBy(e.target.value)}
                      placeholder="Name"
                    />
                  </Row>

                  {submitErr && (
                    <BannerError style={{ marginTop: 8 }}>
                      <FiAlertCircle /> {submitErr}
                    </BannerError>
                  )}
                  {submitOk && (
                    <BannerOk>
                      ✔️ Cancellation recorded successfully.
                    </BannerOk>
                  )}
                </DialogBody>
                <DialogActions>
                  <Ghost onClick={() => setDialogOpen(false)}>Close</Ghost>
                  <Primary disabled={!canConfirm || submitting || pdfBusy} onClick={confirmCancel}>
                    {submitting ? <FiLoader className="spin" /> : "Confirm & Save"}
                  </Primary>
                </DialogActions>
              </Dialog>
            </Overlay>
          )}
        </AnimatePresence>

        {/* LIGHTBOX (IFRAME) */}
        <AnimatePresence>
          {lightbox && iframeUrl && (
            <Overlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightbox(false)}
            >
              <Lightbox
                as={motion.div}
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <LightboxTop>
                  <span>🖼️ Image Preview</span>
                  <Close onClick={() => setLightbox(false)}>
                    <FiX />
                  </Close>
                </LightboxTop>
                <LightboxBody>
                  <IFrame
                    title="Lot Image Preview"
                    src={iframeUrl}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </LightboxBody>
              </Lightbox>
            </Overlay>
          )}
        </AnimatePresence>
      </Wrap>
    </ThemeProvider>
  );
};

/* ============ STYLES ============ */
const Wrap = styled.div`
  max-width: 1920px;
  margin: 20px auto 48px;
  padding: 0 16px;
`;

const ToastOk = styled.div`
  position: sticky;
  top: 8px;
  z-index: 100;
  margin: 0 auto 8px;
  max-width: 700px;
  padding: 10px 14px;
  border-radius: 12px;
  background: ${THEME.okSoft};
  border: 1px solid rgba(34,197,94,0.28);
  color: #bbf7d0;
  font-weight: 900;
  text-align: center;
  cursor: pointer;
  box-shadow: ${THEME.shadow};
`;

const Header = styled.div`
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
  h2 { margin: 0; font-weight: 900; letter-spacing: -0.3px; }
`;

const HeaderSpacer = styled.div`
  flex: 1;
`;

const TopActions = styled.div`
  display: inline-flex; gap: 8px; align-items: center;
`;

const DownloadBtn = styled.button`
  height: 40px; padding: 0 14px; border-radius: 10px;
  border: ${THEME.glassBorder};
  background: ${THEME.primeSoft};
  color: ${THEME.fg}; cursor: pointer; font-weight: 900;
  &:disabled { opacity: .6; cursor: not-allowed; }
  transition: transform .18s ease;
  &:hover:not(:disabled) { transform: translateY(-1px); }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const Back = styled.button`
  display: grid; place-items: center;
  width: 40px; height: 40px; border-radius: 12px;
  border: ${THEME.glassBorder}; background: rgba(255,255,255,0.05);
  color: ${THEME.fg}; cursor: pointer;
  transition: transform .18s ease, background .18s ease;
  &:hover { transform: translateX(-2px); background: rgba(255,255,255,0.09); }
`;

const Card = styled.div`
  background: ${THEME.card};
  border: ${THEME.glassBorder};
  border-radius: 16px;
  box-shadow: ${THEME.shadow};
  padding: 14px;
`;

const SearchRow = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr auto auto;
  gap: 10px; align-items: center;
`;

const IconLabel = styled.label`
  display: grid; place-items: center; color: ${THEME.sub};
`;

const SearchInput = styled.input`
  height: 44px; border-radius: 12px; border: ${THEME.glassBorder};
  background: rgba(255,255,255,0.05); color: ${THEME.fg};
  padding: 0 12px; outline: none;
  transition: box-shadow .18s ease, background .18s ease;
  &:focus { box-shadow: 0 0 0 3px ${THEME.primeSoft}; background: rgba(255,255,255,0.07); }
`;

const ClearBtn = styled.button`
  height: 44px; width: 44px; display: grid; place-items: center;
  border-radius: 12px; border: ${THEME.glassBorder};
  background: rgba(255,255,255,0.05); color: ${THEME.fg};
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.08); }
`;

const SearchBtn = styled.button`
  height: 44px; padding: 0 16px; border-radius: 12px;
  background: ${THEME.primeSoft}; color: ${THEME.fg};
  border: ${THEME.glassBorder}; cursor: pointer; font-weight: 800;
  transition: transform .18s ease, filter .18s ease;
  &:disabled { opacity: .6; cursor: not-allowed; }
  &:hover:not(:disabled) { transform: translateY(-1px); }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const SoftText = styled.div`
  margin-top: 10px; color: ${THEME.sub};
`;

const BannerError = styled.div`
  margin-top: 10px; border-radius: 12px;
  padding: 10px 12px; display: flex; align-items: center; gap: 8px;
  color: #fecaca; background: ${THEME.dangerSoft}; border: 1px solid rgba(239,68,68,0.35);
`;

const BannerOk = styled.div`
  margin-top: 10px; border-radius: 10px; padding: 8px 10px;
  color: #bbf7d0; background: ${THEME.okSoft}; border: 1px solid rgba(34,197,94,0.28);
`;

const TwoPane = styled.div`
  display: grid; gap: 14px; margin-top: 14px;
  grid-template-columns: 1.2fr .8fr;
  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

const Pane = styled.div``;

const PaneRight = styled.div`
  position: relative;
`;

const SectionCard = styled.div`
  background: ${THEME.card};
  border: ${THEME.glassBorder};
  border-radius: 16px;
  box-shadow: ${THEME.shadow};
  padding: 14px;
  margin-bottom: 14px;
`;

const SectionTitle = styled.h3`
  margin: 2px 0 10px; font-size: 1.05rem; font-weight: 900; letter-spacing: -0.2px;
`;

const Grid = styled.div`
  display: grid; gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;

const Field = styled.div`
  background: rgba(255,255,255,0.05);
  border: ${THEME.glassBorder};
  border-radius: 12px; padding: 10px 12px;
`;

const Label = styled.div`
  font-size: 12px; color: ${THEME.sub}; letter-spacing: .3px; margin-bottom: 6px; text-transform: uppercase;
`;

const Value = styled.div`
  font-weight: 800; word-break: break-word;
`;

const Actions = styled.div`
  display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;
`;

const Danger = styled.button`
  display: inline-flex; align-items: center; gap: 8px;
  height: 44px; padding: 0 16px; border-radius: 12px;
  color: #fecaca; border: 1px solid rgba(239,68,68,0.35);
  background: ${THEME.dangerSoft}; cursor: pointer; font-weight: 900;
  transition: transform .18s ease, filter .18s ease;
  &:hover { transform: translateY(-1px); }
`;

const ImageCard = styled(SectionCard)`
  position: sticky; top: 16px;
`;

const ImageHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
  span { font-weight: 900; }
`;

const ImageActions = styled.div`
  display: inline-flex; align-items: center; gap: 8px;
  a, button {
    display: grid; place-items: center; width: 36px; height: 36px;
    border-radius: 10px; border: ${THEME.glassBorder};
    background: rgba(255,255,255,0.05); color: ${THEME.fg}; cursor: pointer;
  }
  button:disabled { opacity: .6; cursor: not-allowed; }
  a:hover, button:hover { background: rgba(255,255,255,0.08); }
`;

const ImageWrap = styled.div`
  position: relative; border-radius: 12px; overflow: hidden; border: ${THEME.glassBorder};
  background: rgba(255,255,255,0.05); min-height: 260px; display: grid; place-items: center;
`;

const IFrame = styled.iframe`
  width: 100%;
  height: clamp(260px, 42vh, 560px);
  border: 0;
  display: block;
  background: #000;
`;

const FrameSkeleton = styled.div`
  position: absolute; inset: 0;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.10) 37%, rgba(255,255,255,0.04) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
  border-radius: 12px;
`;

const Placeholder = styled.div`
  width: 100%; height: 220px; display: grid; place-items: center; gap: 6px; color: ${THEME.sub};
  span { font-size: 40px; }
`;

/* Dialog */
const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 50;
  background: rgba(2,8,23,0.6); backdrop-filter: blur(6px);
  display: grid; place-items: center; padding: 16px;
`;

const Dialog = styled.div`
  width: 100%; max-width: 620px; background: ${THEME.card};
  border: ${THEME.glassBorder}; border-radius: 16px; box-shadow: ${THEME.shadow}, ${THEME.glow};
`;

const DialogHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-bottom: ${THEME.glassBorder};
  h3 { margin: 0; font-weight: 900; }
`;

const Close = styled.button`
  width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center;
  border: ${THEME.glassBorder}; background: rgba(255,255,255,0.05); color: ${THEME.fg};
  cursor: pointer; &:hover { background: rgba(255,255,255,0.09); }
`;

const DialogBody = styled.div` padding: 12px 14px; `;
const Row = styled.div` display: grid; gap: 6px; margin-bottom: 10px; `;
const RowLabel = styled.label` color: ${THEME.sub}; font-size: 12px; text-transform: uppercase; letter-spacing: .3px; `;
const Input = styled.input`
  border: ${THEME.glassBorder}; background: rgba(255,255,255,0.05);
  color: ${THEME.fg}; border-radius: 12px; padding: 10px 12px; outline: none;
  &:focus { box-shadow: 0 0 0 3px ${THEME.primeSoft}; }
`;

const DialogActions = styled.div`
  display: flex; justify-content: flex-end; gap: 10px; padding: 12px 14px; border-top: ${THEME.glassBorder};
`;

const Ghost = styled.button`
  height: 40px; padding: 0 14px; border-radius: 10px; border: ${THEME.glassBorder};
  background: rgba(255,255,255,0.05); color: ${THEME.fg}; cursor: pointer;
`;

const Primary = styled.button`
  height: 40px; padding: 0 14px; border-radius: 10px; border: ${THEME.glassBorder};
  background: ${THEME.primeSoft}; color: ${THEME.fg}; cursor: pointer; font-weight: 900;
  display: inline-flex; align-items: center; gap: 8px;
  &:disabled { opacity: .6; cursor: not-allowed; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* Lightbox */
const Lightbox = styled.div`
  width: min(96vw, 1100px);
  background: ${THEME.bgSoft};
  border: ${THEME.glassBorder};
  border-radius: 14px;
  overflow: hidden;
  box-shadow: ${THEME.shadow};
`;

const LightboxTop = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-bottom: ${THEME.glassBorder};
  span { font-weight: 900; }
`;

const LightboxBody = styled.div`
  max-height: 80vh; background: #000; display: grid; place-items: center;
  ${IFrame} {
    height: min(78vh, 900px);
  }
`;

export default JobOrderCancellationForm;
