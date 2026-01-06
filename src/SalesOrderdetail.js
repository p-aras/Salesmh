// src/components/MDpanel/SalesOrder/SalesOrderDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import FiberManualRecord from '@mui/icons-material/FiberManualRecord';
import AccountTree from '@mui/icons-material/AccountTree';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import Replay from '@mui/icons-material/Replay';
import ArrowBackIosNew from '@mui/icons-material/ArrowBackIosNew';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'




// MUI Components
import {
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  Tooltip,
  Divider,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Paper,
  alpha,
  useTheme
} from '@mui/material';

// MUI Icons
import {
  Circle as CircleIcon,
  ArrowBack,
  Close,
  Image,
  FilterAlt,
  Search,
  CalendarToday,
  Tag,
  Palette,
  Straighten,
  Numbers,
  AttachMoney,
  Notes,
  Inventory2,
  Summarize,
  TableChart,
  GridView,
  Visibility,
  ShoppingBag,
  ColorLens,
  BrandingWatermark,
  Diversity3,
  MonetizationOn,
  Category,
  Style,
  LocalShipping,
  ExpandMore,
} from '@mui/icons-material';
import Assessment from '@mui/icons-material/Assessment';
import CheckCircle from '@mui/icons-material/CheckCircle';
import TrendingUp from '@mui/icons-material/TrendingUp';
import TrendingDown from '@mui/icons-material/TrendingDown';
import TrendingFlat from '@mui/icons-material/TrendingFlat';

import { styled } from '@mui/material/styles';

// Custom styled components
const StatusChip = styled(Chip)(({ theme }) => ({
  fontWeight: 600,
  borderRadius: 8,
  fontSize: '0.75rem',
  height: 24,
}));

const StatsCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.background.paper,
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
  transition: 'all 0.3s ease',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 30px 0 rgba(0,0,0,0.1)',
    borderColor: alpha(theme.palette.primary.main, 0.3)
  }
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  '& .MuiTabs-indicator': {
    height: 4,
    borderRadius: '4px 4px 0 0',
    backgroundColor: theme.palette.primary.main,
  }
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  minHeight: 48,
  color: theme.palette.text.secondary,
  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: 600
  }
}));
const getSeasonColor = (season) => {
  switch (season.toLowerCase()) {
    case 'summer': return 'orange';
    case 'winter': return 'blue';
    case 'spring': return 'green';
    case 'autumn': return 'brown';
    default: return 'grey';
  }
};


const GradientText = styled(Typography)(({ theme }) => ({
  background: theme.palette.mode === 'light' 
    ? 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)'
    : 'linear-gradient(90deg, #64b5f6 0%, #42a5f5 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textFillColor: 'transparent',
}));

const FloatingActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  padding: '10px 24px',
  boxShadow: theme.shadows[3],
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[6],
    transform: 'translateY(-2px)'
  }
}));

const OrderCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '12px',
  border: '1px solid',
  borderColor: alpha(theme.palette.primary.main, 0.1),
  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
    borderColor: alpha(theme.palette.primary.main, 0.2)
  }
}));

const OrderImageContainer = styled(Box)(({ theme }) => ({
  height: 0,
  paddingTop: '56.25%', // 16:9 aspect ratio
  position: 'relative',
  cursor: 'pointer',
  overflow: 'hidden',
}));

const OrderBadge = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 12,
  right: 12,
  backgroundColor: alpha(theme.palette.primary.dark, 0.9),
  color: 'white',
  borderRadius: '8px',
  px: 1.5,
  py: 0.5,
  fontSize: '0.75rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}));

const OrderAttribute = styled(Typography)(({ theme }) => ({
  display: 'flex', 
  alignItems: 'center',
  backgroundColor: alpha(theme.palette.primary.main, 0.05),
  px: 1,
  py: 0.5,
  borderRadius: '4px',
  fontSize: '0.75rem'
}));

const OrderRemarks = styled(Typography)(({ theme }) => ({
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  mt: 'auto',
  p: 1.5,
  backgroundColor: alpha(theme.palette.primary.main, 0.03),
  borderRadius: '8px',
  borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.3)}`,
  fontSize: '0.75rem',
  lineHeight: 1.4,
  minHeight: '60px'
}));

export default function SalesOrderDetail() {
  const { partyName } = useParams();
  const decodedParty = decodeURIComponent(partyName);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const [orders, setOrders] = useState(location.state?.items || []);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(!location.state?.items);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [dateSort, setDateSort] = useState('newest');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentImg, setCurrentImg] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'


  // Get unique filter options
  const seasons = [...new Set(orders.map(o => o['Season']))].filter(Boolean);
  const brands = [...new Set(orders.map(o => o['Brand']))].filter(Boolean);

  const handleView = (url) => {
    setCurrentImg(url);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setCurrentImg('');
  };

  const handleViewProduction = (orderNo) => {
    navigate(`/production/${encodeURIComponent(orderNo)}`);
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    const match = url.match(/\/file\/d\/([^/]+)\//);
    return match
      ? `https://drive.google.com/uc?export=view&id=${match[1]}`
      : url;
  };

  // Apply filters
  useEffect(() => {
    let result = [...orders];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o => 
        Object.values(o).some(val => 
          String(val).toLowerCase().includes(term)
        )
      );
    }
    
    if (seasonFilter !== 'all') {
      result = result.filter(o => o['Season'] === seasonFilter);
    }
    
    if (brandFilter !== 'all') {
      result = result.filter(o => o['Brand'] === brandFilter);
    }
    
    result.sort((a, b) => {
      const dateA = new Date(a['Date']);
      const dateB = new Date(b['Date']);
      return dateSort === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredOrders(result);
  }, [orders, searchTerm, seasonFilter, brandFilter, dateSort]);

  useEffect(() => {
    if (orders.length || !loading) return;

    async function fetchAndFilter() {
      setLoading(true);
      try {
        const API_KEY = 'AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk';
        const SPREADSHEET_ID = '1Frg7kHPiiGeydB02LsGKJ-0UeO8N45-19skJRRvU_Qg';
        const SHEET_RANGE = 'Orders!A1:Z';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();

        const [header, ...dataRows] = json.values || [];
        
        const mapped = dataRows.map(row => {
          return header.reduce((obj, col, i) => {
            const cleanKey = col.trim().replace(/\.+$/, '').replace(/\s+/g, ' ').trim();
            obj[cleanKey] = row[i] || '';
            return obj;
          }, {});
        });

        const filtered = mapped.filter(o => o['Party Name'] === decodedParty);
        
        setOrders(filtered);
        setFilteredOrders(filtered);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAndFilter();
  }, [decodedParty, loading, orders.length]);
 const exportToPDF = () => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A3' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Page Border
  doc.setDrawColor(180);
  doc.setLineWidth(1);
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

  // Header
  doc.setFontSize(18);
  doc.setTextColor(33, 37, 41);
  doc.text(`Sales Order Report`, pageWidth / 2, 50, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Party: ${decodedParty}`, 30, 75);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })}`, 30, 95);

  // Columns (Including Remarks)
  const tableColumn = [
    "Date", "Order No.", "Item", "Brand", "Season",
    "Colour", "Size", "Qty", "Rate", "Value", "Lot No", "Remarks"
  ];

  // Rows
  const tableRows = filteredOrders.map(order => [
    order['Date'],
    order['Order No.'],
    order['Item Name'],
    order['Brand'],
    order['Season'],
    order['Colour'],
    order['Size'],
    order['Quantity'],
    order['Rate'],
    order['Quantity'] * order['Rate'],
    order['Lot No'],
    order['Remarks'] || '-'
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 110,
    margin: { left: 30, right: 30 },
    styles: {
      fontSize: 8,
      overflow: 'linebreak',
      cellPadding: 4
    },
    headStyles: {
      fillColor: [25, 118, 210],
      textColor: 255,
      fontSize: 9,
      halign: 'center'
    },
    bodyStyles: {
      textColor: 50
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    didDrawPage: (data) => {
      doc.setDrawColor(180);
      doc.setLineWidth(1);
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

      const pageNumber = doc.internal.getNumberOfPages();
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Page ${pageNumber}`, pageWidth - 60, pageHeight - 20);
    }
  });

  doc.save(`SalesOrder_${decodedParty}.pdf`);
};

  const calculateStats = (orders) => {
    const uniqueItems = [...new Set(orders.map(o => o['Item Name']))].length;
    const uniqueBrands = [...new Set(orders.map(o => o['Brand']))].length;
    const uniqueColors = [...new Set(orders.map(o => o['Colour']))].length;
    const totalQuantity = orders.reduce((sum, o) => sum + Number(o['Quantity'] || 0), 0);
    const totalValue = orders.reduce((sum, o) => sum + (Number(o['Quantity'] || 0) * Number(o['Rate'] || 0)), 0);
    
    return {
      totalOrders: orders.length,
      uniqueItems,
      uniqueBrands,
      uniqueColors,
      totalQuantity,
      totalValue
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress size={60} thickness={4} color="primary" />
      </Box>
    );
  }

  if (!orders.length) {
    return (
      <Box textAlign="center" mt={5} p={3}>
        <Box sx={{
          display: 'inline-flex',
          p: 3,
          borderRadius: '50%',
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          mb: 2
        }}>
          <Inventory2 fontSize="large" color="primary" sx={{ fontSize: 60 }} />
        </Box>
        <GradientText variant="h4" fontWeight="700" gutterBottom>
          📦 No Orders Found
        </GradientText>
        <Typography variant="body1" color="text.secondary" mb={3}>
          No orders found for "{decodedParty}" or the data couldn't be loaded.
        </Typography>
        <FloatingActionButton
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
        >
          Back to Orders
        </FloatingActionButton>
      </Box>
    );
  }

  const stats = calculateStats(orders);

  return (
    <Box sx={{ 
      p: { xs: 2, md: 3 }, 
      backgroundColor: 'background.default', 
      minHeight: '100vh',
      maxWidth: 2200,
      mx: 'auto'
    }}>
      {/* Header Section */}
     <Paper
  elevation={0}
  sx={{
    mb: 4,
    p: 4,
    borderRadius: 4,
    background: theme.palette.mode === 'light'
      ? 'linear-gradient(135deg, #f5f9ff 0%, #f0f4ff 100%)'
      : 'linear-gradient(135deg, #1a1a1a 0%, #222222 100%)',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
    boxShadow: theme.palette.mode === 'light'
      ? '0 6px 24px rgba(0, 0, 0, 0.06)'
      : '0 6px 24px rgba(0, 0, 0, 0.2)',
    position: 'relative',
    overflow: 'hidden',
    '&:before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 6,
      background: 'linear-gradient(90deg, #1976d2 0%, #2196f3 50%, #00bcd4 100%)',
      opacity: 0.9
    },
    '&:after': {
      content: '""',
      position: 'absolute',
      bottom: -100,
      right: -100,
      width: 200,
      height: 200,
      borderRadius: '50%',
      background: alpha(theme.palette.primary.light, 0.08),
      zIndex: 0
    }
  }}
>
  <Box
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      justifyContent: 'space-between',
      alignItems: { xs: 'flex-start', sm: 'center' },
      gap: 3,
      position: 'relative',
      zIndex: 1
    }}
  >
    <Box>
      <Button
        startIcon={<ArrowBackIosNewIcon sx={{ fontSize: 14 }} />}
        variant="outlined"
        onClick={() => navigate(-1)}
        sx={{
          borderRadius: 3,
          textTransform: 'none',
          px: 3,
          py: 1,
          fontWeight: 600,
          color: 'text.secondary',
          borderColor: alpha(theme.palette.divider, 0.5),
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            borderColor: alpha(theme.palette.primary.main, 0.5),
            color: 'primary.main',
            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`
          },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          mb: 3
        }}
      >
        Back to Orders
      </Button>
      
      <Box>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontSize: { xs: '1.8rem', sm: '2.4rem' },
            fontWeight: 800,
            lineHeight: 1.2,
            mb: 1.5,
            background: theme.palette.mode === 'light'
              ? 'linear-gradient(75deg, #1976d2 0%, #2196f3 50%, #00bcd4 100%)'
              : 'linear-gradient(75deg, #64b5f6 0%, #4fc3f7 50%, #4dd0e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}
        >
          📋 Order Details   {decodedParty}
        </Typography>
{/*         
        <Typography 
          variant="h5" 
          component="div"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 2.5
          }}
        >
        
        </Typography> */}
        
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
            mt: 2
          }}
        >
          <Chip
            icon={
              <CircleIcon
                sx={{
                  fontSize: 8,
                  color: filteredOrders.length ? '#4caf50' : 'text.secondary'
                }}
              />
            }
            label={`${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''} found`}
            variant="outlined"
            sx={{
              borderColor: 'divider',
              backgroundColor: alpha(theme.palette.primary.main, 0.03),
              color: 'text.secondary',
              fontWeight: 500
            }}
          />
          
          {filteredOrders.length > 0 && (
            <Chip
              icon={<AttachMoneyIcon sx={{ fontSize: 16 }} />}
              label={`Total: ₹${filteredOrders.reduce(
                (sum, order) => sum + (order['Quantity'] * order['Rate']),
                0
              ).toLocaleString('en-IN')}`}
              sx={{
                backgroundColor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.dark,
                fontWeight: 600
              }}
            />
          )}
          
          <Chip
            icon={<CalendarTodayIcon sx={{ fontSize: 16 }} />}
            label={new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            sx={{
              backgroundColor: alpha(theme.palette.secondary.main, 0.1),
              color: 'text.secondary',
              fontWeight: 500
            }}
          />
        </Box>
      </Box>
    </Box>
    
    {filteredOrders.length > 0 && (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 2
      }}>
       <Button
  variant="contained"
  startIcon={<PrintIcon />}
  onClick={exportToPDF} // <-- Add this
  sx={{
    borderRadius: 3,
    px: 3,
    py: 1.5,
    fontWeight: 600,
    textTransform: 'none',
    boxShadow: 'none',
    '&:hover': {
      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`
    }
  }}
>
  Download PDF
</Button>

        
        <Button
          variant="outlined"
          startIcon={<ShareIcon />}
          sx={{
            borderRadius: 3,
            px: 3,
            py: 1.5,
            fontWeight: 600,
            textTransform: 'none',
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2
            }
          }}
        >
          Share
        </Button>
      </Box>
    )}
  </Box>
</Paper>
<Box sx={{ 
  width: '100vw',
  maxWidth: '100%',
  px: { xs: 2, sm: 3, md: 4 },
  mb: 6,
  mx: 'auto'
}}>
  {/* <Box sx={{ 
    mb: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 2
  }}>
    <Assessment sx={{ 
      fontSize: 32,
      color: 'primary.main',
      bgcolor: 'primary.light',
      p: 1,
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }} />
    <Typography variant="h5" sx={{ 
      fontWeight: 700,
      color: 'text.primary',
      letterSpacing: 0.5,
      lineHeight: 1.3
    }}>
      Production Overview
    </Typography>
  </Box> */}

  <Grid container spacing={3} sx={{ width: '90%', mx: 0 }}>
    {[
      { 
        icon: '📦', 
        title: 'Total Orders', 
        value: stats.totalOrders,
        // change: '+12%',
        description: 'All processed orders in the current period',
        color: 'primary',
        trend: 'up'
      },
      { 
        icon: '👕', 
        title: 'Unique Items', 
        value: stats.uniqueItems,
        // change: '+8%',
        description: 'Distinct Items in the Sales Order',
        color: 'success',
        trend: 'up'
      },
      { 
        icon: '🏷️', 
        title: 'Unique Brands', 
        value: stats.uniqueBrands,
        // change: '0%',
        description: 'Distinct Brand in the Sales Order',
        color: 'warning',
        trend: 'neutral'
      },
      { 
        icon: '🎨', 
        title: 'Unique Colors', 
        value: stats.uniqueColors,
        // change: '+15%',
        description: 'Distinct Color in the Sales Order',
        color: 'error',
        trend: 'up'
      }
      // { 
      //   icon: '🧮', 
      //   title: 'Total Quantity', 
      //   value: stats.totalQuantity,
      //   change: '+22%',
      //   description: 'Sum of all items across orders',
      //   color: 'info',
      //   trend: 'up'
      // },
      // { 
      //   icon: '💰', 
      //   title: 'Total Value', 
      //   value: `₹${stats.totalValue.toLocaleString()}`,
      //   change: '+18%',
      //   description: 'Monetary worth of all transactions',
      //   color: 'secondary',
      //   trend: 'up'
      // }
    ].map((stat, index) => (
      <Grid item xs={12} sm={6} md={4} lg={4} xl={2} key={index}>
        <Paper sx={{
          height: '100%',
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.06)',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: '0 12px 28px 0 rgba(0,0,0,0.12)'
          },
          background: theme.palette.mode === 'light'
            ? '#ffffff'
            : alpha(theme.palette.background.paper, 0.9),
          border: theme.palette.mode === 'light'
            ? '1px solid rgba(0,0,0,0.05)'
            : '1px solid rgba(255,255,255,0.05)'
        }}>
          {/* Accent bar */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 4,
            background: `linear-gradient(90deg, ${theme.palette[stat.color].main}, ${alpha(theme.palette[stat.color].main, 0.7)})`
          }} />
          
          <Box sx={{ p: 3, pt: 2.5 }}>
            <Box display="flex" alignItems="center">
              <Box sx={{
                mr: 2,
                width: 54,
                height: 54,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette[stat.color].main, 0.1)} 0%, ${alpha(theme.palette[stat.color].main, 0.2)} 100%)`,
                color: theme.palette[stat.color].main,
                fontSize: 24,
                flexShrink: 0
              }}>
                {stat.icon}
              </Box>
              
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ 
                  fontWeight: 600,
                  color: 'text.secondary',
                  mb: 0.5,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {stat.title}
                </Typography>
                
                <Box display="flex" alignItems="baseline">
                  <Typography variant="h5" sx={{ 
                    fontWeight: 800,
                    lineHeight: 1.2,
                    color: 'text.primary',
                    mr: 1
                  }}>
                    {stat.value}
                  </Typography>
                  
                  <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    ml: 'auto',
                    px: 1,
                    py: 0.5,
                    borderRadius: 2,
                    bgcolor: stat.trend === 'up' 
                      ? alpha(theme.palette.success.main, 0.1) 
                      : stat.trend === 'neutral' 
                        ? alpha(theme.palette.warning.main, 0.1) 
                        : alpha(theme.palette.error.main, 0.1),
                    color: stat.trend === 'up' 
                      ? theme.palette.success.main 
                      : stat.trend === 'neutral' 
                        ? theme.palette.warning.main 
                        : theme.palette.error.main,
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    {stat.trend === 'up' ? (
                      <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
                    ) : stat.trend === 'neutral' ? (
                      <TrendingFlat sx={{ fontSize: 16, mr: 0.5 }} />
                    ) : (
                      <TrendingDown sx={{ fontSize: 16, mr: 0.5 }} />
                    )}
                    {stat.change}
                  </Box>
                </Box>

                {/* Added description below the value */}
                <Typography variant="caption" sx={{
                  display: 'block',
                  color: 'text.secondary',
                  lineHeight: 1.4,
                  fontSize: '0.75rem',
                  mt: 0.5
                }}>
                  {stat.description}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Grid>
    ))}
  </Grid>
</Box>

      {/* Filters Section */}
      <Paper elevation={0} sx={{
  p: 3.5,
  mb: 4,
  borderRadius: 3,
  border: '1px solid',
  borderColor: alpha(theme.palette.primary.main, 0.08),
  backgroundColor: alpha(theme.palette.background.paper, 0.7),
  backdropFilter: 'blur(8px)',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.3s ease-out',
  '&:hover': {
    boxShadow: '0 6px 40px rgba(0, 0, 0, 0.08)',
    borderColor: alpha(theme.palette.primary.main, 0.15)
  }
}}>
  <Typography variant="subtitle1" fontWeight={600} color="text.primary" mb={3} display="flex" alignItems="center">
    <FilterAlt sx={{ 
      mr: 1.5, 
      fontSize: 22,
      color: theme.palette.primary.main,
      background: alpha(theme.palette.primary.main, 0.1),
      p: 0.5,
      borderRadius: '50%'
    }} /> 
    <Box component="span" sx={{ 
      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 700
    }}>
      Filter Orders
    </Box>
  </Typography>
  
  <Box display="flex" flexWrap="wrap" gap={3} alignItems="center">
    <TextField
      placeholder="Search orders..."
      variant="outlined"
      size="small"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search sx={{ 
              color: alpha(theme.palette.text.secondary, 0.6),
              transition: 'all 0.2s ease'
            }} />
          </InputAdornment>
        ),
        sx: { 
          borderRadius: 2.5,
          minWidth: 300,
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.3),
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.05)}`
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
            borderColor: theme.palette.primary.main
          }
        }
      }}
      sx={{ 
        flexGrow: 1,
        '& .MuiOutlinedInput-root': {
          borderRadius: 2.5,
          background: alpha(theme.palette.background.default, 0.4)
        }
      }}
    />
    
    <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" sx={{ ml: 'auto' }}>
      <Select
        value={seasonFilter}
        onChange={(e) => setSeasonFilter(e.target.value)}
        size="small"
        sx={{ 
          minWidth: 200,
          borderRadius: 2.5,
          transition: 'all 0.3s ease',
          '& .MuiSelect-select': {
            py: 1.1,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 2.5,
            background: alpha(theme.palette.background.default, 0.4)
          },
          '&:hover': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.05)}`
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`
          }
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              borderRadius: 2,
              marginTop: 1,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
            }
          }
        }}
        IconComponent={(props) => <ExpandMore {...props} sx={{ 
          color: alpha(theme.palette.text.secondary, 0.6),
          right: 10
        }} />}
        startAdornment={
          <InputAdornment position="start" sx={{ mr: 1.2, ml: 0.8 }}>
            <Style fontSize="small" sx={{ 
              color: alpha(theme.palette.text.secondary, 0.7) 
            }} />
          </InputAdornment>
        }
      >
        <MenuItem value="all" sx={{ borderRadius: 1 }}>All Seasons</MenuItem>
        {seasons.map(season => (
          <MenuItem key={season} value={season} sx={{ borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FiberManualRecord sx={{ 
                fontSize: 10, 
                mr: 1.5,
                color: getSeasonColor(season) 
              }} />
              {season}
            </Box>
          </MenuItem>
        ))}
      </Select>
      
      <Select
        value={brandFilter}
        onChange={(e) => setBrandFilter(e.target.value)}
        size="small"
        sx={{ 
          minWidth: 200,
          borderRadius: 2.5,
          transition: 'all 0.3s ease',
          '& .MuiSelect-select': {
            py: 1.1,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 2.5,
            background: alpha(theme.palette.background.default, 0.4)
          },
          '&:hover': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.05)}`
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`
          }
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              borderRadius: 2,
              marginTop: 1,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }
          }
        }}
        IconComponent={(props) => <ExpandMore {...props} sx={{ 
          color: alpha(theme.palette.text.secondary, 0.6),
          right: 10
        }} />}
        startAdornment={
          <InputAdornment position="start" sx={{ mr: 1.2, ml: 0.8 }}>
            <BrandingWatermark fontSize="small" sx={{ 
              color: alpha(theme.palette.text.secondary, 0.7) 
            }} />
          </InputAdornment>
        }
      >
        <MenuItem value="all" sx={{ borderRadius: 1 }}>All Brands</MenuItem>
        {brands.map(brand => (
          <MenuItem key={brand} value={brand} sx={{ borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccountTree sx={{ fontSize: 14, mr: 1.5 }} />
              {brand}
            </Box>
          </MenuItem>
        ))}
      </Select>
      
      <Select
        value={dateSort}
        onChange={(e) => setDateSort(e.target.value)}
        size="small"
        sx={{ 
          minWidth: 200,
          borderRadius: 2.5,
          transition: 'all 0.3s ease',
          '& .MuiSelect-select': {
            py: 1.1,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 2.5,
            background: alpha(theme.palette.background.default, 0.4)
          },
          '&:hover': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.05)}`
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`
          }
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              borderRadius: 2,
              marginTop: 1,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }
          }
        }}
        IconComponent={(props) => <ExpandMore {...props} sx={{ 
          color: alpha(theme.palette.text.secondary, 0.6),
          right: 10
        }} />}
        startAdornment={
          <InputAdornment position="start" sx={{ mr: 1.2, ml: 0.8 }}>
            <CalendarToday fontSize="small" sx={{ 
              color: alpha(theme.palette.text.secondary, 0.7) 
            }} />
          </InputAdornment>
        }
      >
        <MenuItem value="newest" sx={{ borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ArrowDownward sx={{ fontSize: 14, mr: 1.5 }} />
            Newest First
          </Box>
        </MenuItem>
        <MenuItem value="oldest" sx={{ borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ArrowUpward sx={{ fontSize: 14, mr: 1.5 }} />
            Oldest First
          </Box>
        </MenuItem>
      </Select>

      <Button
        variant="outlined"
        onClick={() => {
          setSearchTerm('');
          setSeasonFilter('all');
          setBrandFilter('all');
          setDateSort('newest');
        }}
        sx={{ 
          textTransform: 'none',
          borderRadius: 2.5,
          px: 2.5,
          py: 1,
          borderWidth: 1,
          borderColor: alpha(theme.palette.divider, 0.3),
          color: 'text.secondary',
          fontWeight: 500,
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: alpha(theme.palette.error.main, 0.3),
            backgroundColor: alpha(theme.palette.error.light, 0.05),
            color: theme.palette.error.main,
            boxShadow: `0 0 0 3px ${alpha(theme.palette.error.light, 0.1)}`,
            transform: 'translateY(-1px)'
          }
        }}
        startIcon={<Replay sx={{ fontSize: 18 }} />}
      >
        Reset Filters
      </Button>
    </Box>
  </Box>
</Paper>
<Box display="flex" justifyContent="flex-end" mb={2}>
  <StyledTabs
    value={viewMode}
    onChange={(e, val) => setViewMode(val)}
    variant="standard"
    textColor="primary"
  >
    <StyledTab label="📊 Grid View" value="grid" icon={<GridView />} iconPosition="start" />
    <StyledTab label="📋 Table View" value="table" icon={<TableChart />} iconPosition="start" />
  </StyledTabs>
</Box>
{viewMode === 'grid' ? (
  <>
    {/* Orders Grid View */}
    <Grid container spacing={3} sx={{ 
      alignItems: 'stretch',
      width: 'calc(100% + 24px)',
      marginLeft: '-12px !important',
      marginRight: '-12px !important'
    }}>
      {filteredOrders.map((order, index) => {
        const imgSrc = getImageUrl(order['Photo URL']);
        const orderValue = order['Quantity'] * order['Rate'];
        
        return (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index} sx={{
            paddingLeft: '12px !important',
            paddingRight: '12px !important',
            flexGrow: 0,
            width: {
              xs: 'calc(100% - 24px)',
              sm: 'calc(50% - 24px)',
              md: 'calc(33.3333% - 24px)',
              lg: 'calc(25% - 24px)'
            }
          }}>
            <OrderCard>
              {imgSrc && (
                <OrderImageContainer onClick={() => handleView(imgSrc)}>
                  <Box
                    component="img"
                    src={imgSrc}
                    alt={order['Item Name']}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease',
                      '&:hover': {
                        transform: 'scale(1.05)'
                      }
                    }}
                  />
                  <OrderBadge>
                    <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.5px' }}>
                      #{order['Order No.']}
                    </Typography>
                  </OrderBadge>
                </OrderImageContainer>
              )}

              <CardContent sx={{ 
                flex: '1 0 auto',
                p: 5,
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 2 
                }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      color: alpha(theme.palette.text.secondary, 0.8)
                    }}
                  >
                    📅 {order['Date']}
                  </Typography>
                  <Chip 
                    label={order['Brand']} 
                    size="small" 
                    color="blue"
                    sx={{ 
                      height: 22, 
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  />
                </Box>

                <Typography 
                  variant="subtitle1" 
                  fontWeight={700} 
                  gutterBottom 
                  sx={{ 
                    mb: 2,
                    fontSize: '1.05rem',
                    lineHeight: 1.3,
                    flex: '1 0 auto',
                    minHeight: '3em',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  👕 {order['Item Name']}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    display="block"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}
                  >
                    <Box component="span" fontWeight={600} sx={{ mr: 0.5 }}>🏷️ LOT:</Box> 
                    {order['Lot No'] || 'N/A'}
                  </Typography>
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  mb: 2.5,
                  flexWrap: 'wrap'
                }}>
                  <Chip 
                    label={`🧮 Qty: ${order['Quantity']}`} 
                    size="small" 
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      borderColor: alpha(theme.palette.text.secondary, 0.2)
                    }}
                  />
                  <Chip 
                    label={`💰 Rate: ₹${order['Rate'].toLocaleString()}`} 
                    size="small" 
                    color="primary"
                    sx={{ 
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.dark
                    }}
                  />
                  <Chip 
                    label={`💵 Value: ₹${orderValue.toLocaleString()}`} 
                    size="small" 
                    color="success"
                    sx={{ 
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.dark
                    }}
                  />
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  gap: 1.5, 
                  flexWrap: 'wrap',
                  mb: 2.5,
                  minHeight: '32px'
                }}>
                  <OrderAttribute variant="caption" color="black">
                    🎨 {order['Colour'] || 'N/A'}
                  </OrderAttribute>
                  <OrderAttribute variant="caption" color="black">
                    📏 {order['Size'] || 'N/A'}
                  </OrderAttribute>
                  <OrderAttribute variant="caption" color="black">
                    🌞 {order['Season'] || 'N/A'}
                  </OrderAttribute>
                </Box>

                {order['Remarks'] && (
                  <Tooltip title={order['Remarks']} arrow>
                    <OrderRemarks color="text.secondary">
                      <Box component="span" fontWeight={600} sx={{ mr: 0.5 }}>📝 Remarks:</Box> 
                      {order['Remarks']}
                    </OrderRemarks>
                  </Tooltip>
                )}
              </CardContent>

              <Box sx={{ 
                p: 3, 
                pt: 0,
                flex: '0 0 auto'
              }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="medium"
                  startIcon={<Visibility />}
                  onClick={() => handleViewProduction(order['Order No.'])}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    py: 1,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      backgroundColor: theme.palette.primary.dark
                    },
                    background: 'linear-gradient(to right, #1f3d69, #2a4d7a)'
                  }}
                >
                  👀 View Production
                </Button>
              </Box>
            </OrderCard>
          </Grid>
        );
      })}
    </Grid>
  </>
) : (
 <Paper 
  variant="outlined" 
  sx={{ 
    overflowX: 'auto', 
    mt: 4,
    borderRadius: '12px',
    boxShadow: '0px 2px 16px rgba(0, 0, 0, 0.08)',
    '&:hover': {
      boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.12)'
    },
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: 'none',
    background: (theme) => theme.palette.mode === 'light' 
      ? 'linear-gradient(to bottom, #ffffff, #f9fafb)'
      : 'linear-gradient(to bottom, #121212, #1a1a1a)'
  }}
>
  <Table sx={{ 
    minWidth: 1200,
    '& .MuiTableCell-root': {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      fontSize: '0.875rem'
    },
    '& .MuiTableCell-head': {
      fontSize: '0.8125rem',
      letterSpacing: '0.5px'
    }
  }}>
    <TableHead>
      <TableRow sx={{ 
        background: (theme) => theme.palette.mode === 'light' 
          ? 'linear-gradient(to right, #1f3d69, #2a4d7a)' 
          : 'linear-gradient(to right, #1e1e1e, #2a2a2a)',
        '& th:first-of-type': {
          borderTopLeftRadius: '12px'
        },
        '& th:last-of-type': {
          borderTopRightRadius: '12px'
        }
      }}>
        {[
          'Date', 'Order No.', 'Item Name', 'Brand', 
          'Season', 'Colour', 'Size', 'Qty', 
          'Rate', 'Value', 'Lot No', 'Actions', 
        ].map((header, index) => (
          <TableCell 
            key={index}
            sx={{
              fontWeight: 600,
              color: '#ffffff',
              py: 1.5,
              px: 2.5,
              border: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {header}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
    <TableBody>
      {filteredOrders.map((order, index) => (
        <TableRow 
          key={index}
          sx={{ 
            '&:nth-of-type(even)': {
              backgroundColor: (theme) => theme.palette.mode === 'light' 
                ? '#f8fafc' 
                : 'rgba(255, 255, 255, 0.02)'
            },
            '&:hover': {
              backgroundColor: (theme) => theme.palette.mode === 'light' 
                ? 'rgba(31, 61, 105, 0.04)' 
                : 'rgba(255, 255, 255, 0.04)',
              transform: 'translateY(-1px)',
              boxShadow: (theme) => theme.palette.mode === 'light' 
                ? '0 2px 8px rgba(31, 61, 105, 0.1)' 
                : '0 2px 8px rgba(0, 0, 0, 0.2)'
            },
            transition: 'all 0.2s ease',
            position: 'relative',
            '&:not(:last-child)::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: '2.5%',
              width: '95%',
              height: '1px',
              backgroundColor: (theme) => theme.palette.mode === 'light' 
                ? 'rgba(0, 0, 0, 0.05)' 
                : 'rgba(255, 255, 255, 0.05)'
            }
          }}
        >
          <TableCell sx={{ 
            color: 'text.secondary',
            px: 2.5,
            py: 1.75,
            whiteSpace: 'nowrap'
          }}>
            {order['Date']}
          </TableCell>
          <TableCell sx={{ 
            fontWeight: 600, 
            color: 'primary.main',
            px: 2.5,
            py: 1.75
          }}>
            #{order['Order No.']}
          </TableCell>
          <TableCell sx={{ 
            fontWeight: 500,
            px: 2.5,
            py: 1.75
          }}>
            {order['Item Name']}
          </TableCell>
          <TableCell sx={{ px: 2.5, py: 1.75 }}>
            <Chip 
              label={order['Brand']} 
              size="small" 
              sx={{ 
                backgroundColor: (theme) => theme.palette.mode === 'light' 
                  ? 'rgba(31, 61, 105, 0.1)' 
                  : 'rgba(255, 255, 255, 0.1)',
                fontWeight: 500
              }} 
            />
          </TableCell>
          <TableCell sx={{ px: 2.5, py: 1.75 }}>
            {order['Season']}
          </TableCell>
          <TableCell sx={{ px: 2.5, py: 1.75 }}>
            <Box 
              sx={{ 
                display: 'inline-flex', 
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <Box 
                sx={{ 
                  width: 18, 
                  height: 18, 
                  borderRadius: '4px', 
                  backgroundColor: order['Colour'].toLowerCase(),
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'light' 
                    ? 'rgba(0,0,0,0.1)' 
                    : 'rgba(255,255,255,0.1)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }} 
              />
              <Typography variant="body2">
                {order['Colour']}
              </Typography>
            </Box>
          </TableCell>
          <TableCell sx={{ px: 2.5, py: 1.75 }}>
            {order['Size']}
          </TableCell>
          <TableCell sx={{ 
            fontWeight: 600,
            px: 2.5,
            py: 1.75
          }}>
            <Chip 
              label={order['Quantity']} 
              size="small" 
              sx={{ 
                backgroundColor: (theme) => theme.palette.mode === 'light' 
                  ? 'rgba(0, 150, 136, 0.1)' 
                  : 'rgba(0, 150, 136, 0.2)',
                color: (theme) => theme.palette.mode === 'light' 
                  ? '#00796b' 
                  : '#4db6ac',
                fontWeight: 600
              }} 
            />
          </TableCell>
          <TableCell sx={{ 
            color: 'text.secondary',
            px: 2.5,
            py: 1.75
          }}>
            ₹{order['Rate']}
          </TableCell>
          <TableCell sx={{ 
            fontWeight: 700,
            px: 2.5,
            py: 1.75,
            color: (theme) => theme.palette.mode === 'light' 
              ? '#1f3d69' 
              : '#90caf9'
          }}>
            ₹{(order['Quantity'] * order['Rate']).toLocaleString()}
          </TableCell>
          <TableCell sx={{ 
            fontFamily: 'monospace',
            color: 'text.secondary',
            px: 2.5,
            py: 1.75
          }}>
            <Tooltip title="Lot Number">
              <span>{order['Lot No']}</span>
            </Tooltip>
          </TableCell>
          <TableCell sx={{ px: 2.5, py: 1.75 }}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Tooltip title="View Image">
                <IconButton 
                  onClick={() => handleView(getImageUrl(order['Photo URL']))}
                  sx={{
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.2)',
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease',
                    width: 32,
                    height: 32
                  }}
                >
                  <Image fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="View Production">
                <IconButton 
                  onClick={() => handleViewProduction(order['Order No.'])}
                  sx={{
                    backgroundColor: 'rgba(0, 150, 136, 0.08)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 150, 136, 0.2)',
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease',
                    width: 32,
                    height: 32
                  }}
                >
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</Paper>
)}
      
      {/* Empty state for filtered results */}
      {filteredOrders.length === 0 && (
        <Box 
          textAlign="center" 
          mt={5} 
          p={6}
          sx={{
            border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.primary.main, 0.03)
          }}
        >
          <Box sx={{
            display: 'inline-flex',
            p: 3,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            mb: 3
          }}>
            <FilterAlt fontSize="large" color="primary" sx={{ fontSize: 48 }} />
          </Box>
          <GradientText variant="h5" fontWeight="700" gutterBottom>
            🔍 No Orders Match Your Criteria
          </GradientText>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Try adjusting your search or filter parameters
          </Typography>
          <FloatingActionButton
            variant="contained"
            onClick={() => {
              setSearchTerm('');
              setSeasonFilter('all');
              setBrandFilter('all');
              setDateSort('newest');
            }}
            sx={{
              background: 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)'
            }}
          >
            🧹 Clear All Filters
          </FloatingActionButton>
        </Box>
      )}

      {/* Image Preview Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleClose} 
        maxWidth="lg"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 3,
            overflow: 'hidden',
            maxHeight: '90vh'
          } 
        }}
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2.5, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: 'background.paper',
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          boxShadow: '0 2px 10px 0 rgba(0,0,0,0.05)'
        }}>
          <Box display="flex" alignItems="center">
            <Image color="primary" sx={{ mr: 1.5, fontSize: 24 }} />
            <Typography variant="h6" fontWeight="600">🖼️ Order Image Preview</Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main
              }
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ 
          p: 0,
          backgroundColor: alpha(theme.palette.primary.main, 0.03),
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Box
            component="img"
            src={currentImg}
            alt="Order Photo"
            sx={{
              maxWidth: '100%',
              maxHeight: 'calc(90vh - 64px)',
              objectFit: 'contain',
              display: 'block',
              p: 2
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}