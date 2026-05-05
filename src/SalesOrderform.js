import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import CameraDialog from './CameraDialog';

const initialState = {
  orderNo: '',
  partyName: '',
  season: '',
  itemName: '',
  brand: '',
  colour: '',
  size: '',
  quantity: '',
  rate: '',
  remarks: '',
  photo: null,
  photoPreview: null,
  qtyUnit: 'SETS',
};

const API_KEY = 'AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk';
const SPREADSHEET_ID = '1Frg7kHPiiGeydB02LsGKJ-0UeO8N45-19skJRRvU_Qg';
const PARTY_RANGE = 'Parties!A2:A';
const ORDER_RANGE = 'Orders!B2:B';
const ALL_ORDERS_RANGE = 'Orders!A2:M';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwh24O_HFs9ihShK5ArOOvJOXfPkveX9Tx6VFyaKSNhK0WMT_-TSZoo5p5q_k8ZlDbR/exec';

const SalesOrderForm = () => {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [formData, setFormData] = useState({ date: today, ...initialState });
  const [partyOptions, setPartyOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [submittedOrderNo, setSubmittedOrderNo] = useState(null);
  const [showRepeatOrderDialog, setShowRepeatOrderDialog] = useState(false);
  const [repeatOrderNo, setRepeatOrderNo] = useState('');
  const [repeatOrderLoading, setRepeatOrderLoading] = useState(false);
  const [repeatOrderError, setRepeatOrderError] = useState('');

  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.partyName) newErrors.partyName = 'Party name is required';
    if (!formData.season) newErrors.season = 'Season is required';
    if (!formData.itemName) newErrors.itemName = 'Item name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const cachedParties = sessionStorage.getItem('parties');
    const cachedLastOrder = sessionStorage.getItem('lastOrder');

    if (cachedParties && cachedLastOrder) {
      setPartyOptions(JSON.parse(cachedParties));
      setFormData(f => ({ ...f, orderNo: cachedLastOrder }));
      setLoading(false);
    } else {
      (async () => {
        try {
          const [pRes, oRes] = await Promise.all([
            fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(PARTY_RANGE)}?key=${API_KEY}`),
            fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(ORDER_RANGE)}?key=${API_KEY}`)
          ]);

          const { values: pRaw } = await pRes.json();
          const parties = Array.isArray(pRaw)
            ? [...new Set(pRaw.map(r => r[0]).filter(Boolean))].sort()
            : [];

          setPartyOptions(parties);
          sessionStorage.setItem('parties', JSON.stringify(parties));

          const { values: oRaw } = await oRes.json();
          const lastOrder = Array.isArray(oRaw) && oRaw.length
            ? String(+oRaw[oRaw.length - 1][0] + 1)
            : '1';

          setFormData(f => ({ ...f, orderNo: lastOrder }));
          sessionStorage.setItem('lastOrder', lastOrder);
        } catch (err) {
          console.error('❌ Error fetching party/order data:', err);
          setFormData(f => ({ ...f, orderNo: '1' }));
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []);

  const handleChange = useCallback(e => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file' && files && files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(f => ({
          ...f,
          [name]: files[0],
          photoPreview: reader.result
        }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setFormData(f => ({
        ...f,
        [name]: type === 'text' ? value.toUpperCase() : value,
      }));
    }
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const uploadImageToDrive = async (file, orderNo) => {
    try {
      const base64 = await imageCompression.getDataUrlFromFile(file);
      const imageBase64 = base64.split(',')[1];

      const uploadRes = await fetch('https://script.google.com/macros/s/AKfycbwh24O_HFs9ihShK5ArOOvJOXfPkveX9Tx6VFyaKSNhK0WMT_-TSZoo5p5q_k8ZlDbR/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          image: imageBase64,
          filename: `order_${orderNo}_${Date.now()}.jpg`,
        }),
      });

      const uploadJson = await uploadRes.json();

      if (uploadJson.status === 'success' && uploadJson.url) {
        const fileId = uploadJson.url.split('/d/')[1]?.split('/')[0];
        return fileId
          ? `https://drive.google.com/uc?id=${fileId}`
          : uploadJson.url;
      } else {
        console.error('❌ Upload response error:', uploadJson);
        throw new Error('Image upload failed');
      }
    } catch (err) {
      console.error('❌ Image upload error:', err);
      throw err;
    }
  };

  const handleRepeatOrder = async () => {
    if (!repeatOrderNo.trim()) {
      setRepeatOrderError('Please enter an Order Number');
      return;
    }

    setRepeatOrderLoading(true);
    setRepeatOrderError('');

    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(ALL_ORDERS_RANGE)}?key=${API_KEY}`
      );
      
      const data = await response.json();
      const rows = data.values;

      if (!rows || rows.length === 0) {
        throw new Error('No orders found');
      }

      const orderRow = rows.find(row => row[1] === repeatOrderNo.trim());

      if (!orderRow) {
        throw new Error(`Order #${repeatOrderNo} not found`);
      }

      const quantityStr = orderRow[9] || '';
      const quantityMatch = quantityStr.match(/^(\d+)\s+(.+)$/);
      const quantityValue = quantityMatch ? quantityMatch[1] : quantityStr;
      const quantityUnit = quantityMatch ? quantityMatch[2] : 'PCS';

      let photoUrl = orderRow[12] || null;
      
      // Convert to viewable format if it's a Google Drive link
      if (photoUrl && photoUrl.includes('uc?id=')) {
        const fileId = photoUrl.split('uc?id=')[1];
        photoUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
      
      const nextOrderNo = String(parseInt(formData.orderNo, 10));

      setFormData({
        ...formData,
        orderNo: nextOrderNo,
        date: today,
        partyName: orderRow[2] || '',
        season: orderRow[3] || '',
        itemName: orderRow[4] || '',
        brand: orderRow[6] || '',
        colour: orderRow[7] || '',
        size: orderRow[8] || '',
        quantity: quantityValue,
        rate: orderRow[10] || '',
        remarks: orderRow[11] || '',
        qtyUnit: quantityUnit,
        photo: null,
        photoPreview: photoUrl,
      });

      setShowRepeatOrderDialog(false);
      setRepeatOrderNo('');
      
      setSubmitStatus('repeat_success');
      setTimeout(() => setSubmitStatus(null), 3000);

    } catch (err) {
      console.error('❌ Repeat order error:', err);
      setRepeatOrderError(err.message);
    } finally {
      setRepeatOrderLoading(false);
    }
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitStatus(null);

    const payload = { ...formData };

    if (payload.quantity) {
      const unit = payload.qtyUnit || 'PCS';
      payload.quantity = `${String(payload.quantity).trim()} ${unit}`.trim();
    }
    delete payload.qtyUnit;

    try {
      // Only upload if it's a new file (not an existing URL)
      if (payload.photo && typeof payload.photo !== 'string' && payload.photo instanceof File) {
        setUploadingImage(true);
        const url = await uploadImageToDrive(payload.photo, payload.orderNo);
        payload.photo = url;
        setUploadingImage(false);
      } else if (payload.photoPreview && typeof payload.photoPreview === 'string' && payload.photoPreview.startsWith('http')) {
        // If it's an existing photo URL from repeat order, keep it as is
        payload.photo = payload.photoPreview;
      }

      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      
      if (json.status !== 'success') {
        throw new Error('Google Sheets Error');
      }

      setSubmittedOrderNo(payload.orderNo);
      setShowSuccess(true);
      
      sessionStorage.removeItem('lastOrder');
      setFormData(prev => ({
        date: today,
        ...initialState,
        orderNo: String(parseInt(prev.orderNo, 10) + 1),
        qtyUnit: 'PCS',
      }));
      
      setTimeout(() => {
        setShowSuccess(false);
        setSubmittedOrderNo(null);
      }, 3000);

      console.log(`✅ Order #${payload.orderNo} saved successfully`);

    } catch (err) {
      console.error('❌ Submission error:', err);
      setSubmitStatus('error');
      
      setTimeout(() => setSubmitStatus(null), 5000);
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  }, [formData, today, validateForm]);

  const removePhoto = () => {
    setFormData(f => ({ 
      ...f, 
      photo: null, 
      photoPreview: null 
    }));
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading your order form... ⏳</p>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Success Notification */}
      {showSuccess && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupBox}>
            <h2 style={styles.popupTitle}>🎉 Order Saved!</h2>
            <p style={styles.popupMessage}>
              Your order <strong>#{submittedOrderNo}</strong> has been recorded successfully.
            </p>
            <button style={styles.popupButton} onClick={() => setShowSuccess(false)}>
              OK
            </button>
          </div>
        </div>
      )}
      
      {/* Repeat Order Success Notification */}
      {submitStatus === 'repeat_success' && (
        <div style={styles.successNotification}>
          <div style={styles.notificationContent}>
            <span style={styles.emoji}>🔄</span>
            <div>
              <h3 style={styles.notificationTitle}>Order Loaded Successfully!</h3>
              <p style={styles.notificationMessage}>Order details have been copied. Review and submit.</p>
            </div>
          </div>
          <button 
            onClick={() => setSubmitStatus(null)} 
            style={styles.notificationCloseButton}
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Error Notification */}
      {submitStatus === 'error' && (
        <div style={styles.errorNotification}>
          <div style={styles.notificationContent}>
            <span style={styles.emoji}>⚠</span>
            <div>
              <h3 style={styles.notificationTitle}>Oops! Something went wrong</h3>
              <p style={styles.notificationMessage}>Failed to save order. Please try again.</p>
            </div>
          </div>
          <button 
            onClick={() => setSubmitStatus(null)} 
            style={styles.notificationCloseButton}
          >
            ✕
          </button>
        </div>
      )}

      <div style={styles.card}>
        {/* Form Header */}
        <div style={styles.header}>
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/', { replace: true });
              }
            }}
            style={styles.backButton}
            aria-label="Go back"
          >
            ← 
          </button>

          <div style={styles.headerContent}>
            <div>
              <h1 style={styles.title}>📝 Sales Order</h1>
              <p style={styles.subtitle}>Fill in the details to create a new order</p>
            </div>
            <div style={styles.badgeContainer}>
              <span style={styles.badge}>🆔 Order #{formData.orderNo}</span>
              <span style={styles.badge}>📅 {formData.date}</span>
              <button
                type="button"
                onClick={() => setShowRepeatOrderDialog(true)}
                style={styles.repeatOrderButton}
              >
                🔄 Repeat Order
              </button>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.grid}>
            {/* Party Name */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>🏢 Party Name *</label>
              <div style={styles.selectContainer}>
                <select
                  style={{
                    ...styles.select,
                    borderColor: errors.partyName ? styles.colors.error : styles.colors.border
                  }}
                  name="partyName"
                  value={formData.partyName}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  <option value="">👥 Select Party</option>
                  {partyOptions.map((p, i) => (
                    <option key={i} value={p}>🏭 {p}</option>
                  ))}
                </select>
                {errors.partyName && (
                  <p style={styles.errorText}>❌ {errors.partyName}</p>
                )}
              </div>
            </div>

            {/* Season */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>🌦 Season *</label>
              <div style={styles.selectContainer}>
                <select
                  style={{
                    ...styles.select,
                    borderColor: errors.season ? styles.colors.error : styles.colors.border
                  }}
                  name="season"
                  value={formData.season}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  <option value="">🌍 Select Season</option>
                  <option value="SUMMER">☀ SUMMER</option>
                  <option value="WINTER">❄ WINTER</option>
                </select>
                {errors.season && (
                  <p style={styles.errorText}>❌ {errors.season}</p>
                )}
              </div>
            </div>

            {/* Item Name */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>👕 Item Name/Fabric*</label>
              <div style={styles.inputContainer}>
                <input
                  type="text"
                  style={{
                    ...styles.input,
                    borderColor: errors.itemName ? styles.colors.error : styles.colors.border
                  }}
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. T-Shirt, Jeans"
                />
                {errors.itemName && (
                  <p style={styles.errorText}>❌ {errors.itemName}</p>
                )}
              </div>
            </div>

            {/* Brand */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>🏷 Brand</label>
              <input
                type="text"
                style={styles.input}
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                disabled={submitting}
                placeholder="e.g. Nike, Adidas"
              />
            </div>

            {/* Colour */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>🎨 Colour</label>
              <input
                type="text"
                style={styles.input}
                name="colour"
                value={formData.colour}
                onChange={handleChange}
                disabled={submitting}
                placeholder="e.g. Red, Navy Blue"
              />
            </div>

            {/* Size */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>📏 Size</label>
              <input
                type="text"
                style={styles.input}
                name="size"
                value={formData.size}
                onChange={handleChange}
                disabled={submitting}
                placeholder="e.g. S, M, L, XL"
              />
            </div>

            {/* Quantity */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>📦 Quantity *</label>
              <div style={styles.qtyRow}>
                <input
                  type="number"
                  style={{
                    ...styles.input,
                    ...styles.qtyNumber,
                    borderColor: errors.quantity ? styles.colors.error : styles.colors.border,
                  }}
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  disabled={submitting}
                  min="1"
                  placeholder="0"
                />
                <select
                  name="qtyUnit"
                  value={formData.qtyUnit}
                  onChange={handleChange}
                  disabled={submitting}
                  style={styles.qtyUnit}
                  aria-label="Quantity unit"
                >
                  <option value="PCS">PCS</option>
                  <option value="SETS">SETS</option>
                  <option value="DOZ">DOZ</option>
                  <option value="CARTONS">CARTONS</option>
                  <option value="ROLLS">ROLLS</option>
                </select>
              </div>
              {errors.quantity && <p style={styles.errorText}>❌ {errors.quantity}</p>}
            </div>

            {/* Rate */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>💰 Rate *</label>
              <div style={styles.inputContainer}>
                <div style={styles.currencyInput}>
                  <span style={styles.currencySymbol}>₹</span>
                  <input
                    type="number"
                    step="0.01"
                    style={{
                      ...styles.input,
                      paddingLeft: '32px',
                      borderColor: errors.rate ? styles.colors.error : styles.colors.border
                    }}
                    name="rate"
                    value={formData.rate}
                    onChange={handleChange}
                    disabled={submitting}
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                {errors.rate && (
                  <p style={styles.errorText}>❌ {errors.rate}</p>
                )}
              </div>
            </div>

            {/* Photo Upload */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>📸 Product Photo</label>
              {formData.photoPreview ? (
                <div style={styles.photoPreviewContainer}>
                  <img 
                    src={formData.photoPreview} 
                    alt="Preview" 
                    style={styles.photoPreview}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                      e.target.style.objectFit = 'contain';
                      e.target.style.opacity = '0.5';
                    }}
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    style={styles.removePhotoButton}
                    disabled={submitting}
                    aria-label="Remove photo"
                  >
                    <svg style={styles.removeIcon} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div style={styles.fileUploadLabel} onClick={() => setShowUploadDialog(true)}>
                  <div style={styles.fileUploadContent}>
                    <div style={styles.uploadIconContainer}>
                      <span style={styles.uploadEmoji}>📤</span>
                    </div>
                    <p style={styles.fileUploadText}>
                      <span style={styles.fileUploadHighlight}>Click to upload</span> or drag and drop
                    </p>
                    <p style={styles.fileUploadSubtext}>PNG, JPG, JPEG (MAX. 5MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Remarks */}
          <div style={styles.remarksGroup}>
            <label style={styles.label}>📝 Remarks</label>
            <textarea
              rows="3"
              style={styles.textarea}
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              disabled={submitting}
              placeholder="Any additional notes or comments..."
            />
          </div>

          {/* Form Actions */}
          <div style={styles.actionsContainer}>
            {uploadingImage && (
              <div style={styles.uploadingNotice}>
                📤 Uploading image to Google Drive, please wait...
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={submitting ? styles.submitButtonDisabled : styles.submitButton}
            >
              {submitting ? (
                <>
                  <span style={styles.submitSpinner}>🌀</span>
                  {uploadingImage ? 'Uploading image...' : 'Saving order...'}
                </>
              ) : (
                <>
                  <span style={styles.submitIcon}>✨</span>
                  Submit Order
                </>
              )}
            </button>
          </div>
        </form>

        {showUploadDialog && (
          <div style={styles.dialogOverlay}>
            <div style={styles.dialogBox}>
              <h3 style={{ marginBottom: '16px' }}>Upload Photo</h3>
              <button
                style={styles.dialogButton}
                onClick={() => {
                  setShowCamera(true);
                  setShowUploadDialog(false);
                }}
              >
                📷 Take Live Photo
              </button>
              <button
                style={styles.dialogButton}
                onClick={() => {
                  document.getElementById('galleryInput')?.click();
                  setShowUploadDialog(false);
                }}
              >
                🖼 Choose from Gallery
              </button>
              <button
                style={styles.dialogCancel}
                onClick={() => setShowUploadDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Repeat Order Dialog */}
        {showRepeatOrderDialog && (
          <div style={styles.dialogOverlay}>
            <div style={styles.dialogBox}>
              <h3 style={styles.dialogTitle}>🔄 Repeat Order</h3>
              <p style={styles.dialogSubtitle}>Enter the Order Number to copy all details</p>
              
              <div style={styles.repeatOrderInputGroup}>
                <input
                  type="text"
                  style={styles.repeatOrderInput}
                  placeholder="Enter Order Number (e.g., 1, 2, 3...)"
                  value={repeatOrderNo}
                  onChange={(e) => {
                    setRepeatOrderNo(e.target.value);
                    setRepeatOrderError('');
                  }}
                  disabled={repeatOrderLoading}
                  autoFocus
                />
                {repeatOrderError && (
                  <p style={styles.errorText}>❌ {repeatOrderError}</p>
                )}
              </div>

              <div style={styles.repeatOrderActions}>
                <button
                  onClick={handleRepeatOrder}
                  style={styles.repeatOrderConfirmButton}
                  disabled={repeatOrderLoading}
                >
                  {repeatOrderLoading ? (
                    <>
                      <span style={styles.submitSpinner}>🌀</span>
                      Loading...
                    </>
                  ) : (
                    'Copy Order'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowRepeatOrderDialog(false);
                    setRepeatOrderNo('');
                    setRepeatOrderError('');
                  }}
                  style={styles.dialogCancel}
                  disabled={repeatOrderLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Camera Input */}
      <input
        key={`camera-${fileInputKey}`}
        id="cameraInput"
        type="file"
        accept="image/*"
        capture="environment"
        name="photo"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          console.log('📸 Camera captured file:', file);

          try {
            const shouldCompress = file.size > 150 * 1024;

            const compressedFile = shouldCompress
              ? await imageCompression(file, {
                  maxSizeMB: 0.5,
                  maxWidthOrHeight: 800,
                  useWebWorker: true,
                })
              : file;

            const base64 = await imageCompression.getDataUrlFromFile(compressedFile);

            setFormData((f) => ({
              ...f,
              photo: compressedFile,
              photoPreview: base64,
            }));
            setFileInputKey(Date.now());
            console.log('✅ Camera image preview ready');
          } catch (err) {
            console.error('❌ Camera image error:', err);
          }
        }}
      />

      {/* Hidden Gallery Input */}
      <input
        key={`gallery-${fileInputKey}`}
        id="galleryInput"
        type="file"
        accept="image/*"
        name="photo"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          console.log('🖼 Gallery selected file:', file);
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              console.log('✅ FileReader result:', reader.result);
              setFormData(f => ({
                ...f,
                photo: file,
                photoPreview: reader.result,
              }));
            };
            reader.onerror = (err) => {
              console.error('❌ FileReader error:', err);
            };
            reader.readAsDataURL(file);
            setFileInputKey(Date.now());
          }
        }}
      />

      {showCamera && (
        <CameraDialog
          onClose={() => setShowCamera(false)}
          onCapture={(file, preview) => {
            setFormData(f => ({
              ...f,
              photo: file,
              photoPreview: preview,
            }));
            setShowCamera(false);
            setFileInputKey(Date.now());
          }}
        />
      )}
    </div>
  );
};

const styles = {
  colors: {
    primary: '#6d28d9',
    primaryDark: '#5b21b6',
    error: '#dc2626',
    success: '#059669',
    border: '#e5e7eb',
    text: '#1f2937',
    lightText: '#6b7280',
    background: '#f9fafb',
    cardBackground: '#ffffff',
    accent: '#8b5cf6',
  },
  qtyRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  qtyNumber: { flex: '1 1 60%' },
  qtyUnit: {
    flex: '0 0 120px',
    padding: '14px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    backgroundColor: '#fff',
    outline: 'none',
    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
  },
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '32px 16px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
  },
  card: {
    maxWidth: '1500px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  header: {
    background: 'linear-gradient(135deg, #4c3aedff 0%, #100f64ff 100%)',
    padding: '28px 32px',
    color: 'white',
    position: 'relative',
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  repeatOrderButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    padding: '8px 16px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(5px)',
    marginLeft: '8px',
  },
  popupOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    animation: 'fadeIn 0.2s ease-in-out',
    backdropFilter: 'blur(4px)',
  },
  popupBox: {
    backgroundColor: '#ffffff',
    padding: '32px',
    borderRadius: '16px',
    width: 'min(90vw, 400px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    textAlign: 'center',
    animation: 'scaleIn 0.25s ease',
  },
  popupTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#10b981',
    marginBottom: '10px',
  },
  popupMessage: {
    fontSize: '16px',
    color: '#374151',
    marginBottom: '20px',
  },
  popupButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginLeft: '30px'
  },
  subtitle: {
    fontSize: '14px',
    margin: '4px 0 0',
    opacity: 0.9,
    fontWeight: '400',
    marginLeft: '30px'
  },
  badgeContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(5px)',
  },
  form: {
    padding: '32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#121c2bff',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    width: '90%',
    padding: '14px 16px',
    border: '1px solid #d1cbcbff',
    borderRadius: '10px',
    fontSize: '14px',
    lineHeight: '1.5',
    transition: 'all 0.2s ease',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#000000ff',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },
  selectContainer: {
    position: 'relative',
  },
  select: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    lineHeight: '1.5',
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
    backgroundPosition: 'right 16px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
    backgroundColor: '#ffffff',
    color: '#000000ff',
    outline: 'none',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },
  currencyInput: {
    position: 'relative',
  },
  currencySymbol: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#082c75ff',
    fontWeight: '500',
  },
  textarea: {
    width: '90%',
    padding: '14px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    lineHeight: '1.5',
    minHeight: '100px',
    resize: 'vertical',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s ease',
  },
  fileUploadLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '160px',
    border: '2px dashed #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: '#f9fafb',
  },
  fileUploadContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    textAlign: 'center',
  },
  uploadIconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#ede9fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  uploadEmoji: {
    fontSize: '24px',
  },
  fileUploadText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
    lineHeight: '1.5',
  },
  fileUploadHighlight: {
    color: '#6d28d9',
    fontWeight: '600',
  },
  fileUploadSubtext: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '4px 0 0',
  },
  photoPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: '160px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  uploadingNotice: {
    marginBottom: '10px',
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'right',
    fontStyle: 'italic',
  },
  removePhotoButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: '#ef4444',
    color: 'white',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
  },
  removeIcon: {
    width: '16px',
    height: '16px',
  },
  remarksGroup: {
    marginBottom: '32px',
  },
  actionsContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 28px',
    borderRadius: '12px',
    backgroundColor: '#6d28d9',
    color: 'white',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '16px',
    gap: '10px',
    boxShadow: '0 4px 6px -1px rgba(107, 33, 168, 0.3), 0 2px 4px -1px rgba(107, 33, 168, 0.2)',
  },
  submitButtonDisabled: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 28px',
    borderRadius: '12px',
    backgroundColor: '#c4b5fd',
    color: 'white',
    fontWeight: '600',
    border: 'none',
    cursor: 'not-allowed',
    fontSize: '16px',
    gap: '10px',
  },
  submitIcon: {
    fontSize: '20px',
  },
  submitSpinner: {
    fontSize: '20px',
    animation: 'spin 1s linear infinite',
  },
  dialogOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(8px)',
  },
  dialogBox: {
    backgroundColor: '#fff',
    padding: '32px',
    borderRadius: '16px',
    width: 'min(90vw, 420px)',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  dialogTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#1f2937',
  },
  dialogSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  repeatOrderInputGroup: {
    marginBottom: '24px',
  },
  repeatOrderInput: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  repeatOrderActions: {
    display: 'flex',
    gap: '12px',
    flexDirection: 'column',
  },
  repeatOrderConfirmButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.2)',
  },
  dialogButton: {
    width: '100%',
    padding: '14px',
    marginBottom: '12px',
    backgroundColor: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.2)',
  },
  dialogCancel: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  errorText: {
    marginTop: '6px',
    fontSize: '13px',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  successNotification: {
    marginBottom: '24px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #10b981',
    color: '#065f46',
    padding: '18px 24px',
    borderRadius: '12px',
    maxWidth: '1200px',
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  errorNotification: {
    marginBottom: '24px',
    backgroundColor: '#fef2f2',
    border: '1px solid #ef4444',
    color: '#991b1b',
    padding: '18px 24px',
    borderRadius: '12px',
    maxWidth: '1200px',
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  notificationContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  emoji: {
    fontSize: '24px',
  },
  notificationTitle: {
    margin: '0',
    fontSize: '16px',
    fontWeight: '600',
  },
  notificationMessage: {
    margin: '4px 0 0',
    fontSize: '14px',
    opacity: 0.9,
  },
  notificationCloseButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    fontSize: '18px',
    cursor: 'pointer',
    opacity: 0.7,
    padding: '4px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    gap: '20px',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    border: '4px solid rgba(107, 33, 168, 0.1)',
    borderTop: '4px solid #6d28d9',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
    marginTop: '16px',
  },
};

const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleElement);

export default SalesOrderForm;