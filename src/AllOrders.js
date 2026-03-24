import React, { useEffect, useState, useRef } from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';

const SPREADSHEET_ID = '1Frg7kHPiiGeydB02LsGKJ-0UeO8N45-19skJRRvU_Qg';
const API_KEY = 'AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk';
const RANGE = 'Orders!A1:Z';
const DRIVE_IMAGE_WEBAPP = 'https://script.google.com/macros/s/AKfycbwh24O_HFs9ihShK5ArOOvJOXfPkveX9Tx6VFyaKSNhK0WMT_-TSZoo5p5q_k8ZlDbR/exec';

const AllOrders = () => {
  const [orders, setOrders] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const brandDropdownRef = useRef(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdOrder, setPwdOrder] = useState(null);
  const [password, setPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCreatedOnly, setShowCreatedOnly] = useState(false);
  const [creatingMohitId, setCreatingMohitId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ======== Column management ========
  const DEFAULT_VISIBLE = [
    'Order No.', 'Date', 'Party Name', 'Brand',
    'Fabric', 'Shade', 'Size', 'Quantity',
    'Lot Number', 'Rate', 'Status'
  ];

  const [visibleCols, setVisibleCols] = useState(new Set());
  const [showColsPanel, setShowColsPanel] = useState(false);
  const [expandedRows, setExpandedRows] = useState(() => new Set());

  useEffect(() => {
    if (!headers.length) return;
    const initial = new Set(
      DEFAULT_VISIBLE.filter(h => headers.includes(h))
    );
    if (initial.size === 0) {
      headers.slice(0, 10).forEach(h => initial.add(h));
    }
    setVisibleCols(initial);
  }, [headers]);

  const visibleOrder = headers.filter(h => visibleCols.has(h));
  const hiddenOrder = headers.filter(h => !visibleCols.has(h));

  const toggleCol = (h) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h); else next.add(h);
      return next;
    });
  };

  const [filters, setFilters] = useState({
    season: '',
    brand: [],
    size: '',
    party: '',
    date: '',
    orderNoFrom: '',
    orderNoTo: '',
    lotNo: '',
    itemName: ''
  });

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalQuantity: 0,
    uniqueBrands: 0,
    uniqueItems: 0
  });
  const [dialogUrl, setDialogUrl] = useState(null);
  const [showPendingOnly, setShowPendingOnly] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`
      );
      const data = await response.json();

      if (data.values && data.values.length > 0) {
        const [headerRow, ...rows] = data.values;
        setHeaders(headerRow);

        const ordersData = rows.map(row => {
          const order = {};
          headerRow.forEach((header, index) => {
            order[header] = row[index] || '';
          });
          return order;
        });

        const validOrders = ordersData.filter(o =>
          o['Order No.']?.toString().trim() !== ''
        );
        setOrders(validOrders);
      } else {
        setError('No order data found.');
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to fetch orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (editingOrder) {
      setEditForm({ ...editingOrder });
    }
  }, [editingOrder]);

  useEffect(() => {
    if (showPwdModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showPwdModal]);

  const calculateStats = (ordersData) => {
    const totalOrders = ordersData.length;
    const totalQuantity = ordersData
      .reduce((sum, o) => sum + (parseInt(o['Quantity']) || 0), 0);

    const brandSet = new Set();
    const itemSet = new Set();

    ordersData.forEach(o => {
      if (o['Brand']) brandSet.add(o['Brand']);
      if (o['Item Name']) itemSet.add(o['Item Name']);
    });

    setStats({
      totalOrders,
      totalQuantity,
      uniqueBrands: brandSet.size,
      uniqueItems: itemSet.size
    });
  };

  const uploadImageToDrive = async (file, orderNo) => {
    const base64 = await imageCompression.getDataUrlFromFile(file);
    const imageBase64 = base64.split(',')[1];

    const uploadRes = await fetch(DRIVE_IMAGE_WEBAPP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        image: imageBase64,
        filename: `order_${orderNo}_${Date.now()}.jpg`,
      }),
    });
    const json = await uploadRes.json();

    if (json.status === 'success' && json.url) {
      const fileId = json.url.split('/d/')[1]?.split('/')[0];
      return fileId ? `https://drive.google.com/uc?id=${fileId}` : json.url;
    }
    throw new Error('Image upload failed');
  };

  const handleEditChange = e => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  };

  const getUniqueValues = (field) => {
    const values = orders.map(order => order[field]);
    return ['All', ...new Set(values.filter(value => value))];
  };

  // MODIFIED: createMohitAndProceed - UPDATES SHEET
  const createMohitAndProceed = async (order) => {
    const ordNo = String(order?.['Order No.'] ?? '').trim();
    if (!ordNo) {
      alert('Missing Order No. in this row.');
      return;
    }

    try {
      setCreatingMohitId(ordNo);
      
      // Generate PDF without updating status first
      await generateJobOrderPDF(order, false); // Pass false to skip status update
      
      // Now update the sheet with status
      await updateOrderStatus(ordNo);
      
      await new Promise((r) => setTimeout(r, 200));
      await fetchOrders();

      navigate(`/job-order-form?ref=${encodeURIComponent(ordNo)}`, {
        state: { prefill: order, orderNo: ordNo, fromAutoFlow: true }
      });
    } catch (e) {
      console.error(e);
      alert('Something went wrong while creating the job order. Please try again.');
    } finally {
      setCreatingMohitId(null);
    }
  };

  // NEW FUNCTION: Update order status in sheet
  const updateOrderStatus = async (orderNo) => {
    try {
      const res = await fetch('https://script.google.com/macros/s/AKfycbyJ9qo0irp3h9oiN-ODyPLeeJIBQo0CgRgwUvsHyXJ2lhPs04QwM_CtDQrF0e176Vpj/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'updateStatus', orderNo })
      });
      const result = await res.json();
      if (result.status !== 'updated') {
        console.warn('⚠️ Order not found for status update');
      }
      return result;
    } catch (err) {
      console.error('❌ Error updating order status:', err);
      throw err;
    }
  };

  // MODIFIED: generateJobOrderPDF with optional status update flag
  const generateJobOrderPDF = async (order, shouldUpdateStatus = false) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const MARGIN_X = 36;
    const MARGIN_Y = 36;
    const GAP = 18;
    const HEADER_H = 72;
    const PANEL_TOP = HEADER_H + 16;
    const PANEL_W = (pageWidth - MARGIN_X * 2 - GAP);
    const PANEL_H = pageHeight - PANEL_TOP - MARGIN_Y;
    const COL_W = (PANEL_W / 2);
    const LEFT_X = MARGIN_X;
    const RIGHT_X = MARGIN_X + COL_W + GAP;

    const PRIMARY = [30, 64, 175];
    const NEUTRAL = [55, 65, 81];
    const BORDER = [220, 223, 230];

    const normalizeKey = (obj, target) =>
      Object.keys(obj).find(k => k.trim().toLowerCase() === target.trim().toLowerCase());

    const orderNoKey = normalizeKey(order, 'Order No.');
    const referenceNoKey = normalizeKey(order, 'Reference No.');
    const photoUrlKey = normalizeKey(order, 'Photo URL');

    const orderNo = orderNoKey ? (order[orderNoKey] ?? 'N/A') : 'N/A';
    const referenceNo = referenceNoKey ? (order[referenceNoKey] ?? 'N/A') : 'N/A';
    const photoUrl = photoUrlKey ? (order[photoUrlKey]?.trim() || '') : '';

    doc.setDrawColor(200, 205, 215);
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, pageWidth, HEADER_H, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...PRIMARY);
    doc.text('JOB ORDER', MARGIN_X, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    const generatedAt = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Generated on: ${generatedAt}`, MARGIN_X, 46);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PRIMARY);
    doc.text(`Order No: ${orderNo}`, pageWidth - MARGIN_X, 26, { align: 'right' });
    doc.text(`Reference No: ${referenceNo}`, pageWidth - MARGIN_X, 42, { align: 'right' });

    const drawPanel = (x, y, w, h, title) => {
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.8);
      doc.roundedRect(x, y, w, h, 8, 8, 'S');

      const TITLE_H = 34;
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(x, y, w, TITLE_H, 8, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(title, x + 14, y + 22);

      return y + TITLE_H;
    };

    const leftContentY = drawPanel(LEFT_X, PANEL_TOP, COL_W, PANEL_H, 'Order Details');

    const excluded = ['Photo URL', 'Rate', 'Date', 'Order No.', 'Reference No.', 'Status']
      .map(k => k.trim().toLowerCase());

    const keysToDisplay = Object.keys(order).filter(
      k => !excluded.includes(k.trim().toLowerCase())
    );
    const bodyRows = keysToDisplay.map(k => [k, order[k]]);

    autoTable(doc, {
      startY: leftContentY + 10,
      head: [['Field', 'Value']],
      body: bodyRows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 10,
        textColor: [51, 51, 51],
        cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
        lineColor: [225, 229, 235],
        lineWidth: 0.5,
        halign: 'left',
        valign: 'middle'
      },
      headStyles: {
        fillColor: PRIMARY,
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [30, 64, 175],
        lineWidth: 0.5
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 160, fontStyle: 'bold' } },
      margin: { left: LEFT_X + 8, right: pageWidth - (LEFT_X + COL_W - 8) },
      tableWidth: COL_W - 16
    });

    const rightContentY = drawPanel(RIGHT_X, PANEL_TOP, COL_W, PANEL_H, 'Article Image');

    const PAD = 16;
    const APPROVAL_H = 110;
    const imgBoxX = RIGHT_X + PAD;
    const imgBoxY = rightContentY + PAD;
    const imgBoxW = COL_W - PAD * 2;
    const imgBoxH = PANEL_H - (rightContentY - PANEL_TOP) - PAD * 2 - APPROVAL_H - 8;

    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(1);
    doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 10, 10, 'S');

    if (photoUrl) {
      try {
        const base64 = await loadImageAsBase64(photoUrl);
        const measure = new Image();
        const dims = await new Promise((resolve) => {
          measure.onload = () => resolve({ w: measure.width, h: measure.height });
          measure.onerror = () => resolve(null);
          measure.src = base64;
        });

        let drawW = imgBoxW - 24;
        let drawH = imgBoxH - 24;

        if (dims && dims.w && dims.h) {
          const ratio = dims.w / dims.h;
          const boxRatio = drawW / drawH;
          if (ratio > boxRatio) drawH = drawW / ratio;
          else drawW = drawH * ratio;
        } else {
          const s = Math.min(drawW, drawH);
          drawW = s; drawH = s;
        }

        const drawX = imgBoxX + (imgBoxW - drawW) / 2;
        const drawY = imgBoxY + (imgBoxH - drawH) / 2;
        doc.addImage(base64, 'JPEG', drawX, drawY, drawW, drawH);
      } catch (_) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(11);
        doc.setTextColor(...NEUTRAL);
        doc.text('Image failed to load.', imgBoxX + 12, imgBoxY + 22);
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(...NEUTRAL);
      doc.text('No image available for this order.', imgBoxX + 12, imgBoxY + 22);
    }

    const approveY = imgBoxY + imgBoxH + 22;
    const approveX = RIGHT_X + PAD;
    const approveW = COL_W - PAD * 2;
    const approveH = APPROVAL_H;

    doc.setDrawColor(...BORDER);
    doc.roundedRect(approveX, approveY, approveW, approveH, 8, 8, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...PRIMARY);
    doc.text('MD Approval', approveX + 10, approveY + 18);

    const colGap = 14;
    const sigW = approveW * 0.68;
    const dateW = approveW - sigW - colGap;

    const sigX = approveX + 10;
    const sigY = approveY + 30;
    const sigH = 54;

    doc.setDrawColor(180);
    doc.roundedRect(sigX, sigY, sigW - 20, sigH, 6, 6, 'S');
    doc.setDrawColor(0);
    doc.line(sigX + 16, sigY + sigH - 14, sigX + sigW - 36, sigY + sigH - 14);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text('Signature (Managing Director)', sigX + (sigW - 20) / 2, sigY + sigH - 2, { align: 'center' });

    const dateX = sigX + sigW - 10 + colGap;
    const dateY = sigY;
    doc.setDrawColor(180);
    doc.roundedRect(dateX, dateY, dateW - 20, sigH, 6, 6, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text('Date:', dateX + 12, dateY + 22);
    doc.line(dateX + 48, dateY + 20, dateX + (dateW - 36), dateY + 20);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(
      'This is a computer generated document — signature not required',
      pageWidth / 2,
      pageHeight - 14,
      { align: 'center' }
    );

    doc.save(`Job_Order_${orderNo}.pdf`);

    // Only update status if flag is true
    if (shouldUpdateStatus && orderNo && orderNo !== 'N/A') {
      try {
        await updateOrderStatus(orderNo);
      } catch (err) {
        console.error('❌ Error updating order status:', err);
      }
    }
  };

  const loadImageAsBase64 = (url) => {
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

  const onGenerateClick = (order) => {
    // Regular Job Order - does NOT update sheet
    generateJobOrderPDF(order, false);
  };

  const onEdit = (order) => {
    setEditingOrder(order);
    setNewPhotoFile(null);
    setNewPhotoPreview(null);
    setUploadingPhoto(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      let nextForm = { ...editForm };

      if (newPhotoFile) {
        setUploadingPhoto(true);
        const orderNo =
          nextForm['Order No.'] ||
          editingOrder?.['Order No.'] ||
          'unknown';

        const newUrl = await uploadImageToDrive(newPhotoFile, orderNo);
        nextForm['Photo URL'] = newUrl;
      }

      const params = new URLSearchParams();
      params.append('action', 'updateOrder');
      params.append('orderNo', nextForm['Order No.']);

      headers
        .filter((h) => h !== 'Order No.')
        .forEach((header) => {
          params.append(header, nextForm[header] ?? '');
        });

      const res = await fetch(
        'https://script.google.com/macros/s/AKfycbz4N4kK3Df3BJCveOmQu2we8KW7S6lRMw0VML-hpt2aXvUYoOXeYju9AYjn-tDIwvOE/exec',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params,
        }
      );

      const json = await res.json();
      if (json.status === 'updated') {
        await fetchOrders();
        setEditingOrder(null);
        setNewPhotoFile(null);
        setNewPhotoPreview(null);
      } else {
        console.warn('Update failed', json);
        alert('Failed to update order. Please try again.');
      }
    } catch (err) {
      console.error('Error updating order:', err);
      alert('Error updating order. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value === 'All' ? '' : value
    }));
  };

  const handleBrandToggle = (brand) => {
    setFilters((prev) => {
      const alreadySelected = prev.brand.includes(brand);
      return {
        ...prev,
        brand: alreadySelected
          ? prev.brand.filter((b) => b !== brand)
          : [...prev.brand, brand]
      };
    });
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesFilters =
        (filters.season === '' || order['Season'] === filters.season) &&
        (filters.brand.length === 0 || filters.brand.includes(order['Brand'])) &&
        (filters.size === '' || order['Size'] === filters.size) &&
        (filters.party === '' || order['Party Name'] === filters.party) &&
        (filters.date === '' || order['Date'] === filters.date) &&
        (filters.itemName === '' || order['Item Name'] === filters.itemName);

      const ordNo = parseInt(order['Order No.'], 10) || 0;
      const fromOK = !filters.orderNoFrom || ordNo >= parseInt(filters.orderNoFrom, 10);
      const toOK = !filters.orderNoTo || ordNo <= parseInt(filters.orderNoTo, 10);

      const isPending = !order['Status'] || order['Status'].trim() === '';
      const isCreated = !!order['Status'] && order['Status'].trim() !== '';

      const matchesSearch =
        globalSearch.trim() === '' ||
        Object.values(order).some(value =>
          String(value).toLowerCase().includes(globalSearch.toLowerCase())
        );

      let statusCondition = true;
      if (showPendingOnly) statusCondition = isPending;
      else if (showCreatedOnly) statusCondition = isCreated;

      return matchesFilters && matchesSearch && fromOK && toOK && statusCondition;
    });
  }, [orders, filters, globalSearch, showPendingOnly, showCreatedOnly]);

  const totalRows = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRows);
  const pagedOrders = useMemo(() => filteredOrders.slice(startIndex, endIndex), [filteredOrders, startIndex, endIndex]);

  useEffect(() => {
    calculateStats(filteredOrders);
  }, [filteredOrders]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        brandDropdownRef.current &&
        !brandDropdownRef.current.contains(event.target)
      ) {
        setShowBrandDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const exportToPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a3'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 20;
    let cursorY = 40;

    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Summary Report', marginX, cursorY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleString('en-IN');
    doc.text(`Generated on: ${currentDate}`, marginX, (cursorY += 16));

    const activeFilters = Object.entries(filters)
      .filter(([_, val]) => val)
      .map(([key, val]) => `${key.toUpperCase()}: ${val}`)
      .join(' | ');

    if (activeFilters) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Filters Applied: ${activeFilters}`, marginX, (cursorY += 12));
    }

    cursorY += 12;

    const filteredHeaders = headers.filter(h => h !== 'Date' && h !== 'Status');

    const tableRows = await Promise.all(
      filteredOrders.map(async (order, rowIndex) => {
        const rowData = await Promise.all(
          filteredHeaders.map(async (header) => {
            if (header === 'Photo URL') {
              const imageUrl = order[header]?.trim();
              if (!imageUrl) return '';

              try {
                const base64 = await loadImageAsBase64(imageUrl);
                return { image: base64 };
              } catch (err) {
                console.warn('⚠️ Failed to load image:', imageUrl);
                return '';
              }
            }
            return order[header] || '';
          })
        );
        return rowData;
      })
    );

    autoTable(doc, {
      startY: cursorY,
      head: [filteredHeaders],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 9,
        fontStyle: 'bold',
        textColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
        minCellHeight: 80,
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      columnStyles: {
        'Brand': { cellWidth: 50 },
        'Colour': { cellWidth: 50 },
        'Remarks': { cellWidth: 60 },
        'Photo URL': { cellWidth: 85 }
      },
      didDrawCell: (data) => {
        const colIndex = data.column.index;
        const header = filteredHeaders[colIndex];
        const cellData = data.row.raw[colIndex];

        if (header === 'Photo URL' && cellData?.image) {
          const { x, y, height, width } = data.cell;
          const imgSize = Math.min(width - 8, 65);
          const centerX = x + (width - imgSize) / 2;
          const centerY = y + (height - imgSize) / 2;
          data.cell.text = [];

          try {
            doc.addImage(cellData.image, 'JPEG', centerX, centerY, imgSize, imgSize);
          } catch (err) {
            console.error('❌ Failed to draw image:', err);
          }
        }
      },
      margin: { left: marginX, right: marginX },
      didDrawPage: () => {
        const pageCount = doc.internal.getNumberOfPages();
        const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - marginX, pageHeight - 10, { align: 'right' });
      }
    });

    doc.save('Order_Summary_Report_A3.pdf');
  };

  return (
    <div className="orders-dashboard-container">
      {/* Internal CSS */}
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .orders-dashboard-container {
          min-height: 100vh;
          background: #f8fafc;
          position: relative;
        }

        /* Header Styles */
        .dashboard-header {
          background: white;
          padding: 1rem 2rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #f1f5f9;
          border: none;
          border-radius: 0.5rem;
          color: #334155;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-button:hover {
          background: #e2e8f0;
          transform: translateX(-2px);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .date-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #f1f5f9;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          color: #475569;
          font-size: 0.875rem;
        }

        .pdf-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          background: #3b82f6;
          color: white;
        }

        .pdf-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        /* Stats Container */
        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          padding: 1.5rem 2rem;
          background: #f8fafc;
        }

        .stat-card {
          background: white;
          border-radius: 1rem;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.3s;
          border-left: 4px solid #3b82f6;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .stat-card.green { border-left-color: #10b981; }
        .stat-card.purple { border-left-color: #8b5cf6; }
        .stat-card.orange { border-left-color: #f59e0b; }

        .stat-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          font-weight: 600;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 0.5rem;
        }

        .stat-icon {
          width: 2.5rem;
          height: 2.5rem;
          background: #eff6ff;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
        }

        .stat-icon.green { background: #d1fae5; color: #10b981; }
        .stat-icon.purple { background: #ede9fe; color: #8b5cf6; }
        .stat-icon.orange { background: #fed7aa; color: #f59e0b; }

        /* Filters Card */
        .filters-card {
          background: white;
          margin: 0 2rem 1.5rem 2rem;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .filters-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
        }

        .clear-button {
          padding: 0.5rem 1rem;
          background: #f1f5f9;
          border: none;
          border-radius: 0.5rem;
          color: #ef4444;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-button:hover {
          background: #fee2e2;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #475569;
        }

        .filter-select {
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Table Styles */
        .table-container {
          margin: 0 2rem 2rem 2rem;
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .count-display {
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.875rem;
        }

        .table-scroll-container {
          overflow-x: auto;
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
        }

        .table-header {
          background: #f1f5f9;
        }

        .table-header-cell {
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: #1e293b;
          border-bottom: 2px solid #e2e8f0;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .table-row {
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s;
        }

        .table-row:hover {
          background: #f8fafc;
        }

        .table-row.alt {
          background: #fafafa;
        }

        .table-cell {
          padding: 0.75rem 1rem;
          color: #334155;
          font-size: 0.875rem;
        }

        .remarks-scroll {
          max-width: 200px;
          max-height: 60px;
          overflow-y: auto;
          word-wrap: break-word;
          white-space: normal;
        }

        .view-button {
          padding: 0.375rem 0.75rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          background: #3b82f6;
          color: white;
        }

        .view-button.green {
          background: #10b981;
        }

        .view-button.purple {
          background: #8b5cf6;
        }

        .view-button:hover {
          transform: scale(1.05);
        }

        /* Pagination */
        .pagination-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .pagination-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .page-size {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #475569;
        }

        .pager-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .pager-btn {
          padding: 0.375rem 0.75rem;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pager-btn:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .pager-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pager-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #475569;
        }

        .pager-input {
          width: 60px;
          padding: 0.25rem;
          text-align: center;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          max-width: 90%;
          max-height: 90%;
          overflow: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.5rem;
          background: #f1f5f9;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }

        /* Password Modal */
        .pwd-modal-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .pwd-modal-card {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .pwd-modal-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .pwd-modal-sub {
          font-size: 0.875rem;
          color: #64748b;
          margin-bottom: 1rem;
        }

        .pwd-modal-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .pwd-modal-error {
          color: #ef4444;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .pwd-modal-actions {
          display: flex;
          gap: 0.75rem;
        }

        .pwd-modal-btn {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
        }

        .pwd-submit-btn {
          background: #3b82f6;
          color: white;
        }

        .pwd-cancel-btn {
          background: #f1f5f9;
          color: #475569;
        }

        /* Loading Spinner */
        .loading-spinner {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 3rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 3rem;
        }

        .empty-icon {
          margin-bottom: 1rem;
          color: #94a3b8;
        }

        .empty-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .empty-text {
          color: #64748b;
        }

        /* Dropdown Menu */
        .dropdown-menu {
          position: absolute;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 20;
          max-height: 200px;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            align-items: stretch;
          }
          
          .stats-container {
            grid-template-columns: 1fr;
          }
          
          .filters-grid {
            grid-template-columns: 1fr;
          }
          
          .pagination-bar {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="orders-wrapper">
        <div className="dashboard-header">
          <button
            onClick={() => {
              const idx = window.history.state?.idx ?? 0;
              if (idx > 0) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="back-button"
          >
            ← Back
          </button>
          <h1 className="header-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Orders Dashboard
          </h1>
          <div className="date-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Last updated: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <button onClick={exportToPDF} className="pdf-button">📄 Download PDF</button>
            <button onClick={fetchOrders} className="pdf-button" style={{ backgroundColor: '#10b981' }}>🔄 Refresh</button>
            <button
              onClick={() => {
                setShowCreatedOnly(prev => !prev);
                setShowPendingOnly(false);
              }}
              className="pdf-button"
              style={{ backgroundColor: showCreatedOnly ? '#3b82f6' : '#a5b4fc', color: '#fff' }}
            >
              {showCreatedOnly ? '📋 Show All Orders' : '✅ Orders Created'}
            </button>
            <button
              onClick={() => setShowPendingOnly(prev => !prev)}
              className="pdf-button"
              style={{ backgroundColor: showPendingOnly ? '#f97316' : '#facc15', color: '#1e293b' }}
            >
              {showPendingOnly ? '🔁 Show All Orders' : '🕗 Pending Job Orders'}
            </button>
          </div>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-content">
              <div>
                <div className="stat-label">Total Orders</div>
                <div className="stat-value">{stats.totalOrders.toLocaleString()}</div>
              </div>
              <div className="stat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-content">
              <div>
                <div className="stat-label">Total Quantity</div>
                <div className="stat-value">{stats.totalQuantity.toLocaleString()} Sets</div>
              </div>
              <div className="stat-icon green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-content">
              <div>
                <div className="stat-label">Total Unique Brands</div>
                <div className="stat-value">{stats.uniqueBrands.toLocaleString()}</div>
              </div>
              <div className="stat-icon purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h6l5 5v6a2 2 0 01-2 2h-6l-5-5V9a2 2 0 012-2z" />
                  <circle cx="11" cy="11" r="1" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-content">
              <div>
                <div className="stat-label">Total Unique Item Names</div>
                <div className="stat-value">{stats.uniqueItems.toLocaleString()}</div>
              </div>
              <div className="stat-icon orange">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 16V8a2 2 0 00-1-1.732l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.732l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.271 6.96l8.729 5.04 8.73-5.04" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22.001V12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="filters-card">
          <div className="filters-header">
            <h2 className="filters-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter Orders
            </h2>
            <button className="clear-button" onClick={() => setFilters({ season: '', brand: [], size: '', party: '', date: '', orderNoFrom: '', orderNoTo: '', lotNo: '', itemName: '' })}>
              Clear All
            </button>
          </div>
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Search</label>
              <input type="text" className="filter-select" placeholder="Search across all fields..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
            </div>
            <div className="filter-group">
              <label className="filter-label">Order No. From</label>
              <input type="number" name="orderNoFrom" className="filter-select" placeholder="Min Order No." value={filters.orderNoFrom} onChange={handleFilterChange} />
            </div>
            <div className="filter-group">
              <label className="filter-label">Order No. To</label>
              <input type="number" name="orderNoTo" className="filter-select" placeholder="Max Order No." value={filters.orderNoTo} onChange={handleFilterChange} />
            </div>
            <div className="filter-group">
              <label className="filter-label">Season</label>
              <select name="season" value={filters.season} onChange={handleFilterChange} className="filter-select">
                {getUniqueValues('Season').map((season, i) => (
                  <option key={i} value={season}>{season}</option>
                ))}
              </select>
            </div>
            <div className="filter-group" ref={brandDropdownRef}>
              <label className="filter-label">Brand</label>
              <div className="filter-select" onClick={() => setShowBrandDropdown(prev => !prev)} style={{ cursor: 'pointer' }}>
                {filters.brand.length > 0 ? filters.brand.join(', ') : 'Select Brand(s)'}
                <AnimatePresence>
                  {showBrandDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="dropdown-menu"
                    >
                      {getUniqueValues('Brand').filter(b => b !== 'All').map(brand => (
                        <label key={brand} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem' }}>
                          <input type="checkbox" checked={filters.brand.includes(brand)} onChange={() => handleBrandToggle(brand)} style={{ marginRight: '0.5rem' }} />
                          {brand}
                        </label>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="filter-group">
              <label className="filter-label">Size</label>
              <select name="size" value={filters.size} onChange={handleFilterChange} className="filter-select">
                {getUniqueValues('Size').map((size, i) => (
                  <option key={i} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Date</label>
              <select name="date" value={filters.date} onChange={handleFilterChange} className="filter-select">
                {getUniqueValues('Date').map((date, i) => (
                  <option key={i} value={date}>{date}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Item Name</label>
              <select name="itemName" value={filters.itemName} onChange={handleFilterChange} className="filter-select">
                {getUniqueValues('Item Name').map((name, i) => (
                  <option key={i} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Party Name</label>
              <select name="party" value={filters.party} onChange={handleFilterChange} className="filter-select">
                {getUniqueValues('Party Name').map((party, i) => (
                  <option key={i} value={party}>{party}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="table-container">
          {loading && (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          )}

          {error && (
            <div className="error-alert">
              <div className="error-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="error-text">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="count-display">
                Showing {filteredOrders.length} of {orders.length} orders
              </div>
              <div className="pagination-bar">
                <div className="pagination-left">
                  <span className="count-display">
                    Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of <strong>{totalRows}</strong> orders
                  </span>
                </div>
                <div className="pagination-right">
                  <label className="page-size">
                    Rows per page:&nbsp;
                    <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                      {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <div className="pager-buttons" role="navigation" aria-label="Pagination">
                    <button className="pager-btn" onClick={() => setPage(1)} disabled={safePage === 1} aria-label="First page" title="First page">«</button>
                    <button className="pager-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Previous page" title="Previous page">‹</button>
                    <span className="pager-status">
                      Page&nbsp;
                      <input type="number" min={1} max={totalPages} value={safePage} onChange={e => { setPage(Math.max(1, Math.min(totalPages, Number(e.target.value || 1)))); }} className="pager-input" aria-label="Current page" />
                      &nbsp;/&nbsp;{totalPages}
                    </span>
                    <button className="pager-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Next page" title="Next page">›</button>
                    <button className="pager-btn" onClick={() => setPage(totalPages)} disabled={safePage === totalPages} aria-label="Last page" title="Last page">»</button>
                  </div>
                </div>
              </div>

              <div className="table-scroll-container">
                <table className="orders-table">
                  <thead>
                    <tr className="table-header">
                      {headers.map((header, i) => (
                        <th key={i} className={`table-header-cell ${header === 'Remarks' ? 'remarks-col' : ''}`}>
                          {header}
                        </th>
                      ))}
                      <th className="table-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedOrders.map((order, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'table-row' : 'table-row alt'}>
                        {headers.map((header, j) => (
                          <td key={j} className={`table-cell ${header === 'Remarks' ? 'remarks-col' : ''}`}>
                            {header === 'Remarks' ? (
                              <div className="remarks-scroll">{order[header]}</div>
                            ) : header === 'Photo URL' && order[header] ? (
                              <button onClick={() => setDialogUrl(order[header])} className="view-button">View</button>
                            ) : header === 'Rate' ? (
                              <span style={{ fontWeight: 500, color: '#1e40af' }}>{formatCurrency(order[header])}</span>
                            ) : header === 'Quantity' ? (
                              <span style={{ fontWeight: 500 }}>{order[header]}</span>
                            ) : header === 'Status' && order[header]?.toLowerCase().includes('job order created') ? (
                              <span style={{ color: '#10b981', fontSize: '1.2rem', cursor: 'pointer' }} title={order[header]}>✅</span>
                            ) : (
                              order[header]
                            )}
                          </td>
                        ))}
                        <td className="table-cell">
                          <button onClick={() => onEdit(order)} className="view-button purple">✏️ Edit</button>
                          <button onClick={() => onGenerateClick(order)} className="view-button green" style={{ marginLeft: 8 }}>{order['Status'] ? '🔒 RJO' : 'Cte JO'}</button>
                          <button onClick={() => createMohitAndProceed(order)} className="view-button" style={{ backgroundColor: "#0ea5e9", color: "#fff", marginLeft: 8 }} disabled={creatingMohitId === (order?.['Order No.'] ?? '')}>
                            {creatingMohitId === (order?.['Order No.'] ?? '') ? 'Working…' : '🧩 Create MH-JO'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!loading && !error && filteredOrders.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="empty-title">No orders match your filters</h3>
              <p className="empty-text">Try adjusting your search or filter to find what you're looking for.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showPwdModal && (
          <motion.div
            className="pwd-modal-bg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwd-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowPwdModal(false); }}
          >
            <div className="pwd-modal-card" onKeyDown={(e) => {
              if (e.key === 'Escape') setShowPwdModal(false);
              if (e.key === 'Enter') {
                const SECRET = 'SECRET';
                if (password === SECRET) {
                  setShowPwdModal(false);
                  generateJobOrderPDF(pwdOrder, false);
                } else {
                  setPwdError('Incorrect password');
                }
              }
            }}>
              <h3 id="pwd-modal-title" className="pwd-modal-title">Enter password to regenerate Job Order #{pwdOrder['Order No.']}</h3>
              <div className="pwd-modal-sub">Regenerating will mark a new copy of the Job Order for this entry.</div>
              <input type="password" className="pwd-modal-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoFocus />
              {pwdError && <div className="pwd-modal-error">{pwdError}</div>}
              <div className="pwd-modal-actions">
                <button className="pwd-modal-btn pwd-submit-btn" onClick={async () => {
                  const SECRET = 'SECRET';
                  if (password === SECRET) {
                    setShowPwdModal(false);
                    await generateJobOrderPDF(pwdOrder, false);
                  } else {
                    setPwdError('Incorrect password');
                  }
                }}>Submit</button>
                <button className="pwd-modal-btn pwd-cancel-btn" onClick={() => setShowPwdModal(false)}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {dialogUrl && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-button" onClick={() => setDialogUrl(null)}>Close</button>
            <iframe src={dialogUrl.includes('uc?id=') ? `https://drive.google.com/file/d/${new URL(dialogUrl).searchParams.get('id')}/preview` : dialogUrl.replace('/view?usp=drivesdk', '/preview')} title="Image Preview" width="100%" height="500px" style={{ border: 'none', borderRadius: '0.5rem' }} allow="autoplay" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AllOrders;