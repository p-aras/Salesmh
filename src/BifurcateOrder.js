import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, InputAdornment, TextField, MenuItem,
  Chip, LinearProgress, Tabs, Tab, Drawer, Divider, Grid, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Tooltip, Badge, useTheme, ButtonGroup, Skeleton
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  FilterAlt as FilterIcon,
  Clear as ClearIcon,
  Cached as CachedIcon,
  Download as DownloadIcon,
  ViewKanban as ViewKanbanIcon,
  TableChart as TableChartIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  Sort as SortIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { alpha, styled, keyframes } from '@mui/material/styles';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

/* ------------------------ Config / Icons / Helpers ------------------------ */

const departmentIcons = {
  CUTTING: '✂️',
  Emb: '🧵',
  Printing: '🎨',
  Stitching: '🪡',
  Packing: '📦'
};
const departmentColumns = ['CUTTING', 'Emb', 'Printing', 'Stitching', 'Packing'];

const statusIcons = {
  completed: <CheckCircleIcon fontSize="small" />,
  pending: <PendingIcon fontSize="small" />,
  error: <ErrorIcon fontSize="small" />
};

/** Department color palette (light + dark aware) */
const useDeptColors = (theme) => ({
  CUTTING: {
    base: theme.palette.mode === 'dark' ? '#F97316' : '#F97316',
    bg: alpha('#F97316', 0.1),
    ring: alpha('#F97316', 0.22)
  },
  Emb: {
    base: theme.palette.mode === 'dark' ? '#22C55E' : '#16A34A',
    bg: alpha('#22C55E', 0.1),
    ring: alpha('#22C55E', 0.22)
  },
  Printing: {
    base: theme.palette.mode === 'dark' ? '#38BDF8' : '#0284C7',
    bg: alpha('#38BDF8', 0.12),
    ring: alpha('#38BDF8', 0.24)
  },
  Stitching: {
    base: theme.palette.mode === 'dark' ? '#A78BFA' : '#7C3AED',
    bg: alpha('#A78BFA', 0.14),
    ring: alpha('#A78BFA', 0.28)
  },
  Packing: {
    base: theme.palette.mode === 'dark' ? '#F43F5E' : '#E11D48',
    bg: alpha('#F43F5E', 0.1),
    ring: alpha('#F43F5E', 0.22)
  }
});

/* ------------------------------ Styled UI Kit ----------------------------- */

const pagePattern = (theme) =>
  `radial-gradient(20rem 20rem at 10% -10%, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 60%),
   radial-gradient(18rem 18rem at 90% 10%, ${alpha(theme.palette.secondary.main, 0.06)} 0%, transparent 60%),
   linear-gradient(180deg, ${alpha(theme.palette.background.default, 0.98)}, ${alpha(theme.palette.background.paper, 0.98)})`;

const Glass = styled(Paper)(({ theme }) => ({
  borderRadius: 16,
  background: `linear-gradient(180deg,
    ${alpha(theme.palette.background.paper, 0.88)} 0%,
    ${alpha(theme.palette.background.default, 0.94)} 100%)`,
  border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
  boxShadow: `0 12px 30px ${alpha(theme.palette.common.black, 0.08)}`,
  backdropFilter: 'blur(10px)'
}));

const Sidebar = styled('aside')(({ theme }) => ({
  width: 260,
  flexShrink: 0,
  borderRight: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
  background: `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0.95)} 0%,
    ${alpha(theme.palette.background.paper, 0.98)} 100%)`
}));

const Topbar = styled('header')(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: theme.zIndex.appBar,
  backdropFilter: 'blur(10px)',
  background: `linear-gradient(180deg,
    ${alpha(theme.palette.background.paper, 0.82)} 0%,
    ${alpha(theme.palette.background.default, 0.9)} 100%)`,
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`
}));

const Title = styled(Typography)(({ theme }) => ({
  fontWeight: 900,
  letterSpacing: '-0.4px',
  lineHeight: 1.1,
  background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
}));

const SoftTabs = styled(Tabs)(({ theme }) => ({
  minHeight: 44,
  '& .MuiTabs-indicator': {
    height: 3,
    borderRadius: 3,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  }
}));

const SoftTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  minHeight: 44,
  borderRadius: 10,
  paddingInline: 14,
  marginRight: 8,
  fontWeight: 700,
  '&.Mui-selected': {
    background: alpha(theme.palette.primary.main, 0.1),
    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
  }
}));

const Pill = styled(Chip)({
  borderRadius: 10,
  fontWeight: 600
});

const Lane = styled(Glass)(({ theme }) => ({
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  height: '100%'
}));

const cardShimmer = keyframes`
  0% { opacity: .96; transform: translateY(0) }
  50% { opacity: 1; }
  100% { opacity: .96; transform: translateY(0) }
`;

const CardItem = styled(Glass)(({ theme }) => ({
  padding: 12,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  cursor: 'pointer',
  transition: 'transform .18s ease, background .18s ease, box-shadow .18s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    background: alpha(theme.palette.primary.light, 0.08),
    boxShadow: `0 10px 18px ${alpha(theme.palette.primary.main, 0.16)}`
  },
  animation: `${cardShimmer} 3.2s ease-in-out infinite`
}));

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
  70% { box-shadow: 0 0 0 12px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
`;

/* -------------------------------- Component ------------------------------- */

const BifurcateOrder = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const deptColors = useDeptColors(theme);

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState('board'); // 'board' | 'matrix'
  const [activeTab, setActiveTab] = useState(0);

  // data
  const [lotNos, setLotNos] = useState([]);
  const [departmentData, setDepartmentData] = useState({});
  const [orderDetailsMap, setOrderDetailsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // filters & sort
  const [filterLotNo, setFilterLotNo] = useState('');
  const [filterPartyName, setFilterPartyName] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'lot', direction: 'asc' });

  // drawer
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);

  // ⚠️ Move these to server-side
  const apiKey = 'AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk';
  const ordersSheet = { sheetId: '1Frg7kHPiiGeydB02LsGKJ-0UeO8N45-19skJRRvU_Qg', range: 'Orders!A1:Z' };
  const productionSheet = { sheetId: '1xD8Uy1lUgvNTQ2RGRBI4ZjOrozbinUPRq2_UfIplP98', range: 'RAW FINAL!A3:Z' };

  /* ------------------------------- Data Fetch ------------------------------ */
  const fetchSheetData = async ({ sheetId, range }) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.values?.length) return { headers: [], rows: [] };
      return { headers: data.values[0], rows: data.values.slice(1) };
    } catch {
      return { headers: [], rows: [] };
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const normalize = (s) => s?.toLowerCase().replace(/[^a-z0-9]/g, '');
      try {
        const [orders, production] = await Promise.all([
          fetchSheetData(ordersSheet),
          fetchSheetData(productionSheet)
        ]);
        if (!orders.headers.length || !production.headers.length) {
          setLoading(false);
          return;
        }
        const lotNoIdxO = orders.headers.findIndex((h) => normalize(h).includes('lotno'));
        const lotNoIdxP = production.headers.findIndex((h) => normalize(h).includes('lotno'));
        if (lotNoIdxO === -1 || lotNoIdxP === -1) {
          setLoading(false);
          return;
        }
        const partyIdx = orders.headers.findIndex((h) => normalize(h).includes('partyname'));
        const orderIdx = orders.headers.findIndex((h) => normalize(h).includes('orderno'));
        const brandIdx = orders.headers.findIndex((h) => normalize(h).includes('brand'));
        const colourIdx = orders.headers.findIndex((h) => normalize(h).includes('colour'));

        const lots = Array.from(
          new Set(orders.rows.map((r) => String(r[lotNoIdxO]).trim()).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setLotNos(lots);

        const orderMap = {};
        orders.rows.forEach((r) => {
          const lot = String(r[lotNoIdxO]).trim();
          if (!lot) return;
          orderMap[lot] = {
            partyName: r[partyIdx] || 'N/A',
            orderNo: r[orderIdx] || 'N/A',
            brand: r[brandIdx] || 'N/A',
            colour: r[colourIdx] || 'N/A'
          };
        });
        setOrderDetailsMap(orderMap);

        const deptStatus = {};
        departmentColumns.forEach((dept) => {
          const col = production.headers.findIndex((h) => normalize(h) === normalize(dept));
          if (col === -1) return;
          deptStatus[dept] = lots.map((lot) => {
            const row = production.rows.find((rr) => String(rr[lotNoIdxP]).trim() === lot);
            const value = row?.[col]?.trim() || '';
            return { lot, value: value || 'Pending', status: Boolean(value) };
          });
        });
        setDepartmentData(deptStatus);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------- Utils -------------------------------- */

  const calculateCompletion = (dept) => {
    const arr = departmentData[dept] || [];
    if (!arr.length) return 0;
    const done = arr.filter((x) => x.status).length;
    return Math.round((done / arr.length) * 100);
  };

  const parties = useMemo(() => {
    return Array.from(new Set(Object.values(orderDetailsMap).map((d) => d.partyName)))
      .filter(Boolean)
      .sort();
  }, [orderDetailsMap]);

  const handleSort = (key) => {
    const dir = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction: dir });
  };

  const sorted = (dept) => {
    const data = departmentData[dept] || [];
    return [...data].sort((a, b) => {
      if (sortConfig.key === 'lot') {
        return sortConfig.direction === 'asc'
          ? a.lot.localeCompare(b.lot, undefined, { numeric: true })
          : b.lot.localeCompare(a.lot, undefined, { numeric: true });
      }
      if (a.status === b.status) return a.lot.localeCompare(b.lot, undefined, { numeric: true });
      return sortConfig.direction === 'asc' ? (a.status ? -1 : 1) : (a.status ? 1 : -1);
    });
  };

  const filterRow = (row) => {
    const order = orderDetailsMap[row.lot];
    const partyMatch = !filterPartyName || order?.partyName === filterPartyName;
    const lotMatch = !filterLotNo || row.lot.includes(filterLotNo);
    return partyMatch && lotMatch;
  };

  const visible = (dept) =>
    (filterLotNo ? departmentData[dept]?.filter((r) => r.lot.includes(filterLotNo)) : sorted(dept)).filter(filterRow);

  const openDetails = (lot) => {
    const details = {};
    departmentColumns.forEach((d) => {
      const entry = departmentData[d]?.find((x) => x.lot === lot);
      details[d] = entry ? { status: entry.status, value: entry.value } : { status: false, value: 'Pending' };
    });
    const order = orderDetailsMap[lot] || { partyName: 'N/A', orderNo: 'N/A', brand: 'N/A', colour: 'N/A' };
    setSelectedLot({ lotNo: lot, details, ...order });
    setOpenDrawer(true);
  };

  const clearFilters = () => {
    setFilterLotNo('');
    setFilterPartyName('');
  };

  const refresh = () => window.location.reload();

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', filters: ['ASCIIHexEncode'] });
    const dept = departmentColumns[activeTab];
    const data = visible(dept);
    const colHeaders = ['Lot No', ...departmentColumns];
    const rows = [];

    const uniqueLots = Array.from(new Set(data.map((d) => d.lot)));
    uniqueLots.forEach((lot) => {
      const row = [lot];
      departmentColumns.forEach((dep) => {
        const cell = departmentData[dep]?.find((i) => i.lot === lot);
        row.push(cell?.value || 'Pending');
      });
      rows.push(row);
    });

    doc.setFillColor(32, 80, 154);
    doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`Production Report`, doc.internal.pageSize.width / 2, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(210, 220, 255);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.width / 2, 32, { align: 'center' });

    autoTable(doc, {
      startY: 45,
      head: [colHeaders],
      body: rows,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10 }
    });

    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pages}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
    }
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    doc.save(`Production_${dept}_${stamp}.pdf`);
  };

  /* --------------------------------- Loading ------------------------------- */

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box textAlign="center">
          <Skeleton variant="text" width={260} height={40} />
          <Skeleton variant="rounded" width={320} height={14} sx={{ my: 1.5 }} />
          <LinearProgress sx={{ mt: 2, width: 280, mx: 'auto', borderRadius: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Fetching live data…
          </Typography>
        </Box>
      </Box>
    );
  }

  /* --------------------------------- Render -------------------------------- */

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', background: (t) => pagePattern(t) }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge overlap="circular" variant="dot" color="success">
              <Box sx={{ width: 12, height: 12 }} />
            </Badge>
            <Typography variant="overline" color="text.secondary">
              Manufacturing Control
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ p: 2 }}>
            <Title variant="h5">Tracker</Title>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Lot-wise progress & department health
            </Typography>
          </Box>

          <Box sx={{ px: 2 }}>
            <SoftTabs value={activeTab} onChange={(e, v) => setActiveTab(v)} orientation="vertical">
              {departmentColumns.map((d) => (
                <SoftTab
                  key={d}
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 24, height: 24, borderRadius: '50%',
                          display: 'grid', placeItems: 'center',
                          background: deptColors[d].bg,
                          border: `1px solid ${deptColors[d].ring}`
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{departmentIcons[d]}</span>
                      </Box>
                      <Typography variant="body2" fontWeight={800} sx={{ color: deptColors[d].base }}>{d}</Typography>
                    </Box>
                  }
                />
              ))}
            </SoftTabs>
          </Box>

          <Divider sx={{ mt: 'auto' }} />
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Last updated: {new Date().toLocaleString()}
            </Typography>
          </Box>
        </Sidebar>
      )}

      {/* Main */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <Topbar>
          <Box sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => setSidebarOpen((s) => !s)}>
              {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
              <Title variant="h4">Production Overview</Title>

              <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  label="Lot"
                  value={filterLotNo}
                  onChange={(e) => setFilterLotNo(e.target.value)}
                  sx={{ minWidth: 180 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                >
                  <MenuItem value=""><em>All</em></MenuItem>
                  {lotNos.map((lot) => <MenuItem key={lot} value={lot}>{lot}</MenuItem>)}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Party"
                  value={filterPartyName}
                  onChange={(e) => setFilterPartyName(e.target.value)}
                  sx={{ minWidth: 200 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><FilterIcon fontSize="small" /></InputAdornment> }}
                >
                  <MenuItem value=""><em>All</em></MenuItem>
                  {parties.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
                </TextField>

                {(filterLotNo || filterPartyName) && (
                  <Button size="small" startIcon={<ClearIcon />} onClick={clearFilters}>
                    Clear
                  </Button>
                )}

                <Button size="small" variant="outlined" startIcon={<CachedIcon />} onClick={refresh}>
                  Refresh
                </Button>

                <ButtonGroup variant="outlined" size="small">
                  <Button
                    variant={mode === 'board' ? 'contained' : 'outlined'}
                    onClick={() => setMode('board')}
                    startIcon={<ViewKanbanIcon />}
                  >
                    Board
                  </Button>
                  <Button
                    variant={mode === 'matrix' ? 'contained' : 'outlined'}
                    onClick={() => setMode('matrix')}
                    startIcon={<TableChartIcon />}
                  >
                    Matrix
                  </Button>
                </ButtonGroup>

                <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportPDF}>
                  Export
                </Button>
              </Box>
            </Box>
          </Box>
        </Topbar>

        {/* Colorful Metrics Ribbon */}
        <Box sx={{ p: 2, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          <Glass sx={{ p: 2 }}>
            <Typography variant="overline" color="text.secondary">TOTAL LOTS</Typography>
            <Typography variant="h4" fontWeight={900}>{lotNos.length}</Typography>
          </Glass>

          {departmentColumns.slice(0, 3).map((d) => (
            <Glass
              key={d}
              sx={{
                p: 2,
                borderColor: deptColors[d].ring,
                background: `linear-gradient(180deg, ${alpha(deptColors[d].base, 0.08)}, ${alpha(theme.palette.background.paper, 0.92)})`
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="overline" sx={{ color: deptColors[d].base, fontWeight: 800 }}>{d}</Typography>
                <span style={{ fontSize: 18 }}>{departmentIcons[d]}</span>
              </Box>
              <LinearProgress
                variant="determinate"
                value={calculateCompletion(d)}
                sx={{
                  mt: 1.25, height: 8, borderRadius: 4,
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${alpha(deptColors[d].base, 1)}, ${alpha(deptColors[d].base, 0.6)})`,
                    ...(calculateCompletion(d) === 100 && { animation: `${pulse} 1.8s ease-out 2` })
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {calculateCompletion(d)}% complete
              </Typography>
            </Glass>
          ))}
        </Box>

        {/* Content */}
        <Box sx={{ p: 2, flex: 1 }}>
          {mode === 'board' ? (
            <Grid container spacing={2}>
              {departmentColumns.map((dept) => {
                const data = visible(dept);
                const completion = calculateCompletion(dept);
                const c = deptColors[dept];

                return (
                  <Grid item xs={12} md={6} lg={4} xl={3} key={dept}>
                    <Lane sx={{ borderColor: c.ring }}>
                      {/* Lane header */}
                      <Box
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1,
                          borderRadius: 2,
                          background: `linear-gradient(90deg, ${alpha(c.base, 0.18)}, ${alpha(c.base, 0.08)})`,
                          border: `1px solid ${c.ring}`
                        }}
                      >
                        <Box
                          sx={{
                            width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center',
                            background: c.bg, border: `1px solid ${c.ring}`
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{departmentIcons[dept]}</span>
                        </Box>
                        <Typography variant="subtitle1" fontWeight={900} sx={{ color: c.base }}>{dept}</Typography>
                        <Box ml="auto">
                          <Pill size="small" label={`${completion}%`} sx={{ borderColor: c.ring, color: c.base }} variant="outlined" />
                        </Box>
                      </Box>

                      {/* Lane progress */}
                      <LinearProgress
                        variant="determinate"
                        value={completion}
                        sx={{
                          height: 6, borderRadius: 3, mb: 1.25,
                          backgroundColor: alpha(c.base, 0.12),
                          '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${c.base}, ${alpha(c.base, 0.7)})` }
                        }}
                      />

                      {/* Cards */}
                      <Box sx={{ display: 'grid', gap: 10, maxHeight: 480, overflow: 'auto', pr: 0.5 }}>
                        {data.length === 0 ? (
                          <Glass sx={{ p: 2, textAlign: 'center', color: 'text.secondary', background: alpha(c.base, 0.04) }}>
                            <Typography variant="body2">No matching lots</Typography>
                          </Glass>
                        ) : (
                          data.map(({ lot, value, status }) => {
                            const colorKind = value?.toLowerCase() === 'pending' ? 'default' : status ? 'success' : 'warning';
                            const icon = value?.toLowerCase() === 'pending'
                              ? statusIcons.pending
                              : status ? statusIcons.completed : statusIcons.error;
                            const details = orderDetailsMap[lot];

                            return (
                              <CardItem
                                key={lot}
                                onClick={() => openDetails(lot)}
                                sx={{
                                  borderColor: alpha(c.base, 0.18),
                                  background: alpha(c.base, 0.04),
                                  '&:hover': { background: alpha(c.base, 0.08) }
                                }}
                              >
                                <Box>
                                  <Typography fontWeight={900}>{lot}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {details?.partyName || 'N/A'} • {details?.brand || 'N/A'} • {details?.colour || 'N/A'}
                                  </Typography>
                                </Box>
                                <Pill
                                  size="small"
                                  icon={icon}
                                  label={value}
                                  color={colorKind}
                                  variant={colorKind === 'default' ? 'outlined' : 'filled'}
                                />
                              </CardItem>
                            );
                          })
                        )}
                      </Box>
                    </Lane>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Glass sx={{ overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 620 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow
                      sx={{
                        '& th': {
                          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.08)} 0%, ${alpha(theme.palette.info.light, 0.08)} 100%)`,
                          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                          py: 1.25
                        }
                      }}
                    >
                      <TableCell onClick={() => handleSort('lot')} sx={{ cursor: 'pointer' }}>
                        <Box display="flex" alignItems="center">
                          <Typography fontWeight={900} color="primary.dark">Lot No</Typography>
                          <SortIcon
                            fontSize="small"
                            sx={{
                              ml: 1,
                              color: sortConfig.key === 'lot' ? theme.palette.primary.main : alpha(theme.palette.text.primary, 0.4),
                              transform: sortConfig.key === 'lot' && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                              transition: 'all 0.2s ease'
                            }}
                          />
                        </Box>
                      </TableCell>
                      {departmentColumns.map((d) => (
                        <TableCell key={d} align="center">
                          <Tooltip title={`${calculateCompletion(d)}% completed`} arrow>
                            <Box display="flex" alignItems="center" gap={1} justifyContent="center">
                              <Box
                                sx={{
                                  width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center',
                                  background: deptColors[d].bg, border: `1px solid ${deptColors[d].ring}`
                                }}
                              >
                                <span style={{ fontSize: 14 }}>{departmentIcons[d]}</span>
                              </Box>
                              <Typography sx={{ color: deptColors[d].base }} fontWeight={800}>{d}</Typography>
                            </Box>
                          </Tooltip>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(filterLotNo
                      ? departmentData[departmentColumns[activeTab]]?.filter((i) => i.lot.includes(filterLotNo))
                      : sorted(departmentColumns[activeTab])
                    )
                      .filter(filterRow)
                      .map((row) => (
                        <TableRow key={row.lot} hover onClick={() => openDetails(row.lot)} sx={{ cursor: 'pointer' }}>
                          <TableCell>
                            <Typography fontWeight={800}>{row.lot}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {orderDetailsMap[row.lot]?.partyName || 'N/A'}
                            </Typography>
                          </TableCell>
                          {departmentColumns.map((d) => {
                            const entry =
                              departmentData[d]?.find((x) => x.lot === row.lot) || { status: false, value: 'Pending' };
                            const colorKind = entry.value?.toLowerCase() === 'pending' ? 'default' : entry.status ? 'success' : 'warning';
                            const icon = entry.value?.toLowerCase() === 'pending'
                              ? statusIcons.pending
                              : entry.status ? statusIcons.completed : statusIcons.error;
                            return (
                              <TableCell key={d} align="center">
                                <Pill
                                  size="small"
                                  icon={icon}
                                  label={entry.value}
                                  color={colorKind}
                                  variant={colorKind === 'default' ? 'outlined' : 'filled'}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Glass>
          )}
        </Box>
      </Box>

      {/* Slide-over Drawer for Lot Details */}
      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 440 },
            borderLeft: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            background: `linear-gradient(180deg,
              ${alpha(theme.palette.background.paper, 0.96)} 0%,
              ${alpha(theme.palette.background.default, 0.98)} 100%)`,
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Title variant="h6">Lot Details</Title>
          <Box ml="auto">
            <IconButton onClick={() => setOpenDrawer(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
        <Divider />
        {selectedLot ? (
          <Box sx={{ p: 2, display: 'grid', gap: 12 }}>
            <Glass sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={900}>Lot: {selectedLot.lotNo}</Typography>
              <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Party</Typography>
                  <Typography fontWeight={800}>{selectedLot.partyName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Order No.</Typography>
                  <Typography fontWeight={800}>{selectedLot.orderNo}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Brand</Typography>
                  <Typography fontWeight={800}>{selectedLot.brand}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Colour</Typography>
                  <Typography fontWeight={800}>{selectedLot.colour}</Typography>
                </Grid>
              </Grid>
            </Glass>

            <Glass sx={{ overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>Department</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departmentColumns.map((d) => {
                    const detail = selectedLot.details[d] || { status: false, value: 'Pending' };
                    const colorKind =
                      detail.value?.toLowerCase() === 'pending' ? 'default' : detail.status ? 'success' : 'warning';
                    const icon =
                      detail.value?.toLowerCase() === 'pending'
                        ? statusIcons.pending
                        : detail.status
                        ? statusIcons.completed
                        : statusIcons.error;
                    const c = deptColors[d];
                    return (
                      <TableRow key={d} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box
                              sx={{
                                width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
                                background: c.bg, border: `1px solid ${c.ring}`
                              }}
                            >
                              <span style={{ fontSize: 14 }}>{departmentIcons[d]}</span>
                            </Box>
                            <Typography fontWeight={800} sx={{ color: c.base }}>{d}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Pill
                            size="small"
                            icon={icon}
                            label={detail.value}
                            color={colorKind}
                            variant={colorKind === 'default' ? 'outlined' : 'filled'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Glass>
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            <Typography color="text.secondary">Select a lot to view details.</Typography>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};

export default BifurcateOrder;
