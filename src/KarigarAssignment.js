import React, { useEffect, useMemo, useState } from 'react';

// If you already use axios elsewhere you can swap fetch with axios.
// This component is dependency-free (uses fetch).

const endpoint = 'https://script.google.com/macros/s/AKfycbzojcfOjNEbv1UgtGGZA747A7vd_g6T_vSb2WSNIc0T-3IiIknoWvTPXettOYBPE6HRZQ/exec';

export default function KarigarAssignment() {
  const [lots, setLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState('');
  const [shades, setShades] = useState([]);
  const [karigars, setKarigars] = useState({}); // { [shade]: karigarName }
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [previewRows, setPreviewRows] = useState([]); // rows from CuttingKarigarMap for selected lot

  // Load lot list for dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${endpoint}?action=lots`);
        const json = await res.json();
        setLots(Array.isArray(json.lots) ? json.lots : []);
      } catch (e) {
        console.error(e);
        setLots([]);
      }
    })();
  }, []);

  // When lot changes: fetch saved block to get shades; reset karigars map
  useEffect(() => {
    setShades([]);
    setKarigars({});
    setPreviewRows([]);
    setStatus('');

    if (!selectedLot) return;

    (async () => {
      try {
        const res = await fetch(`${endpoint}?lot=${encodeURIComponent(selectedLot)}&mode=saved`);
        const json = await res.json();
        if (json?.found && Array.isArray(json.shades)) {
          setShades(json.shades);
          const init = {};
          json.shades.forEach(s => (init[s] = ''));
          setKarigars(init);
          // also try reading existing saved karigars preview
          const r2 = await fetch(`${endpoint}?action=getKarigars&lot=${encodeURIComponent(selectedLot)}`);
          const j2 = await r2.json();
          if (j2?.ok && Array.isArray(j2.rows)) setPreviewRows(j2.rows);
        } else {
          setStatus('No Cutting Matrix found for this lot.');
        }
      } catch (e) {
        console.error(e);
        setStatus('Failed to load shades for selected lot.');
      }
    })();
  }, [selectedLot]);

  const canSave = useMemo(() => {
    if (!selectedLot || !shades.length) return false;
    // allow empty karigar names too (they will be saved as empty); you can enforce required if you prefer:
    // return shades.every(s => (karigars[s] || '').trim().length > 0);
    return true;
  }, [selectedLot, shades, karigars]);

  const handleInput = (shade, val) => {
    setKarigars(prev => ({ ...prev, [shade]: val }));
  };

  const handleSave = async () => {
  setSaving(true);
  setStatus('');
  try {
    const payload = {
      lot: selectedLot,
      karigars, // { shade: karigar }
    };

    // ✅ Use form-encoded body to avoid CORS preflight
    const body = new URLSearchParams({
      payload: JSON.stringify(payload),
    }).toString();

    const res = await fetch(`${endpoint}?action=saveKarigars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body,
    });

    // If the fetch reaches here, CORS was ok and Apps Script responded
    const json = await res.json();
    if (json?.ok) {
      setStatus(`Saved ${json.savedRows} rows to CuttingKarigarMap.`);
      // refresh preview
      const r2 = await fetch(`${endpoint}?action=getKarigars&lot=${encodeURIComponent(selectedLot)}`);
      const j2 = await r2.json();
      if (j2?.ok && Array.isArray(j2.rows)) setPreviewRows(j2.rows);
    } else {
      setStatus(`Failed to save: ${json?.error || 'Unknown error'}`);
    }
  } catch (e) {
    console.error(e);
    setStatus('Network error while saving.');
  } finally {
    setSaving(false);
  }
};


  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h2 style={styles.title}>Enter Karigar Details (Per Shade)</h2>

        <div style={styles.row}>
          <label style={styles.label}>Lot Number</label>
          <select
            value={selectedLot}
            onChange={(e) => setSelectedLot(e.target.value)}
            style={styles.select}
          >
            <option value="">-- Select Lot --</option>
            {lots.map((lot) => (
              <option key={lot} value={lot}>{lot}</option>
            ))}
          </select>
        </div>

        {selectedLot && (
          <>
            <div style={{ marginTop: 10, color: '#475569', fontSize: 14 }}>
              Assign a karigar for each shade of <strong>{selectedLot}</strong>.
            </div>

            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              {shades.length === 0 && (
                <div style={{ color: '#dc2626' }}>{status || 'No shades found for this lot.'}</div>
              )}
              {shades.map((shade) => (
                <div key={shade} style={styles.shadeRow}>
                  <div style={styles.shadeTag}>{shade}</div>
                  <input
                    placeholder="Karigar name"
                    value={karigars[shade] || ''}
                    onChange={(e) => handleInput(shade, e.target.value)}
                    style={styles.input}
                  />
                </div>
              ))}
            </div>

            <button
              style={{ ...styles.button, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
              onClick={handleSave}
              disabled={!canSave || saving}
            >
              {saving ? 'Saving…' : 'Save Karigar Assignments'}
            </button>

            {status && (
              <div style={{ marginTop: 12, color: status.startsWith('Saved') ? '#16a34a' : '#dc2626' }}>
                {status}
              </div>
            )}
          </>
        )}
      </div>

      {previewRows.length > 0 && (
        <div style={{ ...styles.card, marginTop: 20 }}>
          <h3 style={styles.subtitle}>Current Stored Rows (CuttingKarigarMap)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Shade</th>
                  <th>Size</th>
                  <th>Qty</th>
                  <th>Cutting Table</th>
                  <th>Karigar</th>
                  <th>Saved At</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.lot}</td>
                    <td>{r.shade}</td>
                    <td>{r.size}</td>
                    <td>{r.qty}</td>
                    <td>{r.cuttingTable}</td>
                    <td>{r.karigar}</td>
                    <td>{r.savedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
            Tip: Saving again will replace (not duplicate) rows for this lot.
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { maxWidth: 900, margin: '20px auto', padding: '0 16px' },
  card: {
    background: 'rgba(255,255,255,0.95)',
    border: '1px solid rgba(226,232,240,0.8)',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 6px 20px rgba(37,99,235,0.08)',
  },
  title: { margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' },
  subtitle: { margin: '0 0 10px 0', fontSize: 16, fontWeight: 700, color: '#1e293b' },
  row: { display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 },
  label: { width: 110, fontSize: 14, color: '#334155' },
  select: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    outline: 'none'
  },
  shadeRow: {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    alignItems: 'center',
    gap: 12,
  },
  shadeTag: {
    display: 'inline-block',
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#0f172a',
    fontWeight: 600,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    outline: 'none',
    fontSize: 14,
  },
  button: {
    marginTop: 16,
    padding: '12px 16px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontWeight: 700,
    boxShadow: '0 10px 24px rgba(37,99,235,0.2)',
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
  }
};
