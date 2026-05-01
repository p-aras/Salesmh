// src/components/MDpanel/SalesOrder/SalesOrderData.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { 
  Box, 
  Typography, 
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
  Avatar,
  Paper, 
  useTheme,
  useMediaQuery,
  Divider,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowForwardIcon,
  Inventory as InventoryIcon,
  Person as PersonIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  LocalShipping as LocalShippingIcon,
  MonetizationOn as MonetizationOnIcon,
  EmojiEmotions as EmojiIcon
} from '@mui/icons-material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { styled, alpha } from '@mui/material/styles';

// Custom styled components with vibrant color theme
const GlassCard = styled(Paper)(({ theme }) => ({
  backdropFilter: 'blur(16px)',
  backgroundColor: theme.palette.mode === 'dark' 
    ? alpha(theme.palette.background.paper, 0.85) 
    : 'rgba(255, 255, 255, 0.95)',
  border: `1px solid ${alpha(theme.palette.secondary.light, 0.3)}`,
  boxShadow: `0 8px 32px 0 ${alpha(theme.palette.secondary.dark, 0.1)}`,
  borderRadius: '16px',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 12px 40px 0 ${alpha(theme.palette.secondary.main, 0.2)}`,
    borderColor: alpha(theme.palette.secondary.main, 0.5)
  }
}));

const GradientText = styled(Typography)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.primary.light} 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'inline-block',
  fontWeight: 700
}));

const StatusBadge = styled(Chip)(({ status, theme }) => {
  let color, emoji;
  switch (status?.toLowerCase()) {
    case 'urgent':
      color = theme.palette.error.main;
      emoji = '🔥';
      break;
    case 'rush':
      color = theme.palette.warning.dark;
      emoji = '⚡';
      break;
    case 'pre-book':
      color = theme.palette.success.dark;
      emoji = '📅';
      break;
    default:
      color = theme.palette.primary.main;
      emoji = '📦';
  }
  return {
    backgroundColor: alpha(color, 0.15),
    color: color,
    fontWeight: 600,
    fontSize: '0.7rem',
    height: '24px',
    borderRadius: '8px',
    padding: '0 8px',
    border: `1px solid ${alpha(color, 0.3)}`,
    '& .MuiChip-label': {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    '&:before': {
      content: `"${emoji}"`,
      fontSize: '0.8rem',
      marginRight: '4px'
    }
  };
});

const HoverScaleCard = styled(Paper)(({ theme }) => ({
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.03)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.secondary.main, 0.15)}`
  }
}));

const EmojiAvatar = styled(Avatar)(({ theme, emoji }) => ({
  backgroundColor: alpha(theme.palette.secondary.main, 0.1),
  color: theme.palette.secondary.dark,
  fontSize: '1.2rem',
  '&:before': {
    content: `"${emoji}"`
  }
}));

const PartyAvatar = styled(Avatar)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.secondary.main, 0.15),
  color: theme.palette.secondary.dark,
  fontWeight: 'bold',
  fontSize: '1.2rem'
}));

export default function SalesOrderData() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Google Sheets API config
  const API_KEY = 'AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk';
  const SPREADSHEET_ID = '1Frg7kHPiiGeydB02LsGKJ-0UeO8N45-19skJRRvU_Qg';
  const SHEET_RANGE = 'Orderss!A1:K1000';

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;

    try {
      const res = await axios.get(url);
      const rows = res.data.values || [];

      if (rows.length < 2) {
        setOrders([]);
        setError('No data found in sheet');
      } else {
        const [header, ...dataRows] = rows;
        const validRows = dataRows.filter(row => row[0]);

        const mapped = validRows.map((row, idx) => {
          const obj = { id: `row-${idx + 1}` };
          header.forEach((col, i) => {
            obj[col.trim()] = row[i] || '';
          });
          return obj;
        });

        setOrders(mapped);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCardClick = (party, itemsForParty) => {
    navigate(`/sales-orders/${encodeURIComponent(party)}`, { state: { items: itemsForParty } });
  };

  const handleRefresh = () => {
    fetchData();
  };

  const filteredOrders = activeFilter === 'all' 
    ? orders 
    : orders.filter(o => o.Remarks?.toLowerCase() === activeFilter.toLowerCase());

  const byParty = filteredOrders.reduce((acc, o) => {
    const party = o['Party Name'] || 'Unknown';
    (acc[party] = acc[party] || []).push(o);
    return acc;
  }, {});

  // Calculate total value
  const totalValue = filteredOrders.reduce((sum, o) => {
    const quantity = parseInt(o.Quantity) || 0;
    const rate = parseFloat(o.Rate?.replace(/[^0-9.]/g, '')) || 0;
    return sum + (quantity * rate);
  }, 0);

  // Get random emoji for party avatar
  const getRandomEmoji = (str) => {
    const emojis = ['😊', '😎', '🤩', '🤑', '🤠', '👻', '👽', '🤖', '🐶', '🦊', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'];
    const index = str ? str.charCodeAt(0) % emojis.length : 0;
    return emojis[index];
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="calc(100vh - 64px)"
        flexDirection="column"
        gap={3}
        sx={{
          background: theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
            : 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)'
        }}
      >
        <Box textAlign="center">
      <Typography
  component="span"
  sx={{
    fontSize: '2.5rem',
    width: 80,
    height: 80,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}
>
  🛒
</Typography>

          <Typography variant="h6" color="textPrimary" mt={2}>
            Loading Sales Dashboard
          </Typography>
        </Box>
        <CircularProgress size={60} thickness={4} color="secondary" />
        <LinearProgress 
          color="secondary" 
          sx={{ 
            width: '40%', 
            height: 8, 
            borderRadius: 3,
            background: `linear-gradient(90deg, ${theme.palette.secondary.light}, ${theme.palette.primary.main})`
          }} 
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="calc(100vh - 64px)"
        gap={2}
        sx={{
          background: theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
            : 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)'
        }}
      >
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.error.light, 0.2),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2
          }}
        >
          <EmojiAvatar emoji="😵" sx={{ width: 60, height: 60, fontSize: '2rem' }} />
        </Box>
        <Typography variant="h5" fontWeight="600" color="textPrimary">
          Error Loading Data
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          {error}
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: '12px',
            fontWeight: '600',
            textTransform: 'none',
            boxShadow: `0 4px 16px ${alpha(theme.palette.secondary.main, 0.3)}`,
            background: `linear-gradient(45deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.secondary.light} 100%)`
          }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (!orders.length) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="calc(100vh - 64px)"
        gap={2}
        sx={{
          background: theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
            : 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)'
        }}
      >
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.secondary.light, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2
          }}
        >
          <EmojiAvatar emoji="📭" sx={{ width: 60, height: 60, fontSize: '2rem' }} />
        </Box>
        <Typography variant="h5" fontWeight="600" color="textPrimary">
          No Orders Found
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Start by creating a new sales order
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/sales-order')}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: '12px',
            fontWeight: '600',
            textTransform: 'none',
            boxShadow: `0 4px 16px ${alpha(theme.palette.secondary.main, 0.3)}`,
            background: `linear-gradient(45deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.secondary.light} 100%)`
          }}
        >
          Create Order
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: isMobile ? 1 : 3,
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
      background: theme.palette.mode === 'light'
        ? 'linear-gradient(135deg, #ffffffff 0%, #ffffffff 100%)'
        : 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    }}>
      {/* Header Section */}
      <GlassCard
        component={motion.div}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{
          p: isMobile ? 2 : 3,
          mb: 3,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? 2 : 0,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Tooltip title="Go back" arrow>
            <IconButton
              color="secondary"
              onClick={() => navigate(-1)}
              sx={{
                bgcolor: alpha(theme.palette.secondary.main, 0.15),
                '&:hover': {
                  bgcolor: alpha(theme.palette.secondary.main, 0.25),
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>

          <Box
            sx={{
              p: 1.5,
              bgcolor: alpha(theme.palette.secondary.main, 0.15),
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
          <Typography fontSize={isMobile ? 22 : 28} component="span">
  📊
</Typography>

          </Box>

          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              SALES ORDER DASHBOARD
            </Typography>
            <GradientText variant={isMobile ? "h5" : "h4"} fontWeight="700">
              Order Management
            </GradientText>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          {lastRefreshed && !isMobile && (
            <Chip
              icon={<AccessTimeIcon fontSize="small" />}
              label={`Updated: ${new Date(lastRefreshed).toLocaleTimeString()}`}
              variant="outlined"
              size="small"
              sx={{
                borderColor: alpha(theme.palette.secondary.main, 0.3),
                color: 'text.secondary',
                fontSize: '0.75rem'
              }}
            />
          )}

          <Tooltip title="Refresh data" arrow>
            <IconButton
              color="secondary"
              onClick={handleRefresh}
              component={motion.div}
              whileHover={{ rotate: 180, transition: { duration: 0.5 } }}
              whileTap={{ scale: 0.9 }}
              sx={{
                bgcolor: alpha(theme.palette.secondary.main, 0.15),
                '&:hover': {
                  bgcolor: alpha(theme.palette.secondary.main, 0.25),
                },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/sales-order')}
            sx={{
              px: isMobile ? 2 : 3,
              py: 1,
              fontWeight: '600',
              borderRadius: '12px',
              boxShadow: `0 4px 14px ${alpha(theme.palette.secondary.main, 0.3)}`,
              textTransform: 'none',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              background: `linear-gradient(45deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.secondary.light} 100%)`
            }}
          >
            New Order
          </Button>
        </Box>
      </GlassCard>

      {/* Stats Overview */}
     <Box 
  display="grid" 
  gridTemplateColumns={
    isMobile ? '1fr' : 
    isTablet ? 'repeat(2, 1fr)' : 
    'repeat(4, 1fr)'
  } 
  gap={3}
  mb={4}
  component={motion.div}
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {/* Total Parties */}
  <HoverScaleCard
    component={motion.div}
    variants={itemVariants}
    sx={{
      p: 3,
      borderRadius: 4,
      background: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.2)} 0%, ${alpha(theme.palette.info.main, 0.1)} 100%)`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: `1px solid ${alpha(theme.palette.info.light, 0.3)}`,
      backdropFilter: 'blur(5px)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.12)'
      }
    }}
  >
    <Box display="flex" alignItems="center" gap={2}>
      <Box
        sx={{
          fontSize: '1.8rem',
          width: 56,
          height: 56,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: alpha(theme.palette.info.main, 0.1),
          borderRadius: '50%',
          color: theme.palette.info.dark
        }}
      >
        👥
      </Box>

      <Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
          Active Parties
        </Typography>
        
        <Divider sx={{ 
          width: '40px', 
          height: '3px', 
          background: `linear-gradient(90deg, ${theme.palette.info.main}, ${theme.palette.info.light})`,
          mb: 1.5,
          borderRadius: 3
        }} />
        
        <GradientText variant="h4" fontWeight={800} sx={{ lineHeight: 1.2 }}>
          {Object.keys(byParty).length}
        </GradientText>

        <Typography variant="caption" color="text.secondary" sx={{ 
          display: 'block', 
          mt: 1,
          fontStyle: 'italic',
          opacity: 0.8
        }}>
          Managing all orders
        </Typography>
      </Box>
    </Box>
  </HoverScaleCard>

  {/* Total Orders */}
  <HoverScaleCard 
    component={motion.div}
    variants={itemVariants}
    sx={{ 
      p: 3, 
      borderRadius: 4,
      background: `linear-gradient(135deg, ${alpha(theme.palette.success.light, 0.2)} 0%, ${alpha(theme.palette.success.main, 0.1)} 100%)`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: `1px solid ${alpha(theme.palette.success.light, 0.3)}`,
      backdropFilter: 'blur(5px)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.12)'
      }
    }}
  >
    <Box display="flex" alignItems="flex-start" gap={2}>
      <Box
        sx={{
          fontSize: '1.8rem',
          width: 56,
          height: 56,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: alpha(theme.palette.success.main, 0.1),
          borderRadius: '50%',
          color: theme.palette.success.dark
        }}
      >
        📦
      </Box>
      <Box>
        <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 600, mb: 0.5 }}>
          Total Orders
        </Typography>
        
        <Divider sx={{ 
          width: '40px', 
          height: '3px', 
          background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
          mb: 1.5,
          borderRadius: 3
        }} />
        
        <Typography variant="h4" fontWeight="800" sx={{
          lineHeight: 1.2,
          background: `linear-gradient(45deg, ${theme.palette.success.dark} 0%, ${theme.palette.success.light} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {filteredOrders.length}
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ 
          display: 'block', 
          mt: 1,
          fontStyle: 'italic',
          opacity: 0.8
        }}>
          Across all parties
        </Typography>
      </Box>
    </Box>
  </HoverScaleCard>

  {/* Total Items */}
  <HoverScaleCard 
    component={motion.div}
    variants={itemVariants}
    sx={{ 
      p: 3, 
      borderRadius: 4,
      background: `linear-gradient(135deg, ${alpha(theme.palette.warning.light, 0.2)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: `1px solid ${alpha(theme.palette.warning.light, 0.3)}`,
      backdropFilter: 'blur(5px)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.12)'
      }
    }}
  >
    <Box display="flex" alignItems="flex-start" gap={2}>
      <Box
        sx={{
          fontSize: '1.8rem',
          width: 56,
          height: 56,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: alpha(theme.palette.warning.main, 0.1),
          borderRadius: '50%',
          color: theme.palette.warning.dark
        }}
      >
        🛒
      </Box>
      <Box>
        <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 600, mb: 0.5 }}>
          Items Ordered
        </Typography>
        
        <Divider sx={{ 
          width: '40px', 
          height: '3px', 
          background: `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.light})`,
          mb: 1.5,
          borderRadius: 3
        }} />
        
        <Typography variant="h4" fontWeight="800" sx={{
          lineHeight: 1.2,
          background: `linear-gradient(45deg, ${theme.palette.warning.dark} 0%, ${theme.palette.warning.light} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {filteredOrders.reduce((sum, o) => sum + (parseInt(o.Quantity) || 0), 0)}
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ 
          display: 'block', 
          mt: 1,
          fontStyle: 'italic',
          opacity: 0.8
        }}>
          Total quantity
        </Typography>
      </Box>
    </Box>
  </HoverScaleCard>

  {/* Total Value */}
  <HoverScaleCard 
    component={motion.div}
    variants={itemVariants}
    sx={{ 
      p: 3, 
      borderRadius: 4,
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: `1px solid ${alpha(theme.palette.primary.light, 0.3)}`,
      backdropFilter: 'blur(5px)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.12)'
      }
    }}
  >
    <Box display="flex" alignItems="flex-start" gap={2}>
      <Box
        sx={{
          fontSize: '1.8rem',
          width: 56,
          height: 56,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: alpha(theme.palette.primary.main, 0.1),
          borderRadius: '50%',
          color: theme.palette.primary.dark
        }}
      >
        💰
      </Box>
      <Box>
        <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 600, mb: 0.5 }}>
          Total Value
        </Typography>
        
        <Divider sx={{ 
          width: '40px', 
          height: '3px', 
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
          mb: 1.5,
          borderRadius: 3
        }} />
        
        <Typography variant="h4" fontWeight="800" sx={{
          lineHeight: 1.2,
          background: `linear-gradient(45deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.light} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          ₹{totalValue.toLocaleString()}
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ 
          display: 'block', 
          mt: 1,
          fontStyle: 'italic',
          opacity: 0.8
        }}>
          Combined order value
        </Typography>
      </Box>
    </Box>
  </HoverScaleCard>
</Box>
      {/* Filter Bar */}
      <Box 
        display="flex" 
        alignItems="center" 
        gap={1} 
        mb={3}
        flexWrap="wrap"
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Box display="flex" alignItems="center" gap={1} mr={1}>
          <FilterListIcon color="secondary" fontSize="small" />
          <Typography variant="subtitle2" color="textSecondary">
            Filter:
          </Typography>
        </Box>
        {['all', 'urgent', 'rush', 'pre-book'].map(filter => (
          <Chip
            key={filter}
            label={
              <Box display="flex" alignItems="center" gap={0.5}>
                {filter === 'all' && '🌐 All Orders'}
                {filter === 'urgent' && '🔥 Urgent'}
                {filter === 'rush' && '⚡ Rush'}
                {filter === 'pre-book' && '📅 Pre-book'}
              </Box>
            }
            size="small"
            onClick={() => setActiveFilter(filter)}
            sx={{
              textTransform: 'capitalize',
              bgcolor: activeFilter === filter ? alpha(theme.palette.secondary.main, 0.15) : 'transparent',
              border: `1px solid ${activeFilter === filter ? theme.palette.secondary.main : theme.palette.divider}`,
              color: activeFilter === filter ? theme.palette.secondary.main : 'text.secondary',
              '&:hover': {
                bgcolor: alpha(theme.palette.secondary.main, 0.1)
              },
              mb: 1
            }}
          />
        ))}
      </Box>

      {/* Orders List */}
      <Box
        component={motion.div}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          flexGrow: 1,
          overflow: 'hidden',
          overflowY: 'auto',
          pb: 2,
          pr: 1
        }}
      >
        {Object.entries(byParty).map(([party, items]) => (
          <GlassCard
            key={party}
            component={motion.div}
            variants={itemVariants}
            whileHover={{ y: -2 }}
            onClick={() => handleCardClick(party, byParty[party])}
            sx={{
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              '&:before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                background: `linear-gradient(to bottom, ${theme.palette.secondary.main}, ${theme.palette.primary.light})`,
                opacity: 0.8
              }
            }}
          >
            <Box sx={{ p: isMobile ? 1.5 : 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Box display="flex" alignItems="center" gap={2}>
                  <PartyAvatar 
                    sx={{ 
                      width: 40,
                      height: 40
                    }}
                  >
                    {getRandomEmoji(party)}
                  </PartyAvatar>
                  <Box>
                    <Typography variant="h6" fontWeight="600">{party}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {items.length} {items.length === 1 ? 'order' : 'orders'}
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <ArrowForwardIcon 
                    color="secondary" 
                    fontSize="small" 
                    sx={{
                      transition: 'transform 0.3s ease',
                      transform: 'translateX(0)'
                    }}
                  />
                </Box>
              </Box>

              <Box 
                sx={{ 
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 2,
                  mt: 2,
                  pl: isMobile ? 0 : 6
                }}
              >
                {items.slice(0, isMobile ? 2 : 3).map((o, i) => (
                  <HoverScaleCard
                    key={i}
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 1.5,
                      borderRadius: '12px',
                      bgcolor: theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.8)'
                        : 'rgba(30, 30, 30, 0.6)',
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {o['Photo URL'] ? (
                      <Box
                        component="img"
                        src={o['Photo URL']}
                        alt={o['Item Name']}
                        sx={{ 
                          width: 64, 
                          height: 64, 
                          objectFit: 'cover', 
                          borderRadius: '8px',
                          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                        }}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Avatar 
                        variant="rounded" 
                        sx={{ 
                          width: 64, 
                          height: 64, 
                          bgcolor: 'grey.100',
                          color: 'grey.400'
                        }}
                      >
                        <InventoryIcon />
                      </Avatar>
                    )}
                    <Box flex={1} minWidth={0}>
                      <Typography 
                        variant="subtitle2" 
                        fontWeight="600" 
                        noWrap
                        sx={{ color: theme.palette.text.primary }}
                      >
                        {o['Item Name']}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {o.Brand} • {o.Season} • {o.Colour}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mt={1} alignItems="center">
                        <Box>
                          <Typography variant="body2">
                            Size {o.Size} × {o.Quantity}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="600" color="secondary">
                          ₹{o.Rate}
                        </Typography>
                      </Box>
                      {o.Remarks && (
                        <Box mt={1}>
                          <StatusBadge 
                            label={o.Remarks} 
                            status={o.Remarks}
                          />
                        </Box>
                      )}
                    </Box>
                  </HoverScaleCard>
                ))}
                {items.length > (isMobile ? 2 : 3) && (
                  <HoverScaleCard
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1.5,
                      borderRadius: '12px',
                      bgcolor: theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.8)'
                        : 'rgba(30, 30, 30, 0.6)',
                      border: `1px dashed ${alpha(theme.palette.secondary.main, 0.4)}`,
                      color: 'text.secondary'
                    }}
                  >
                    <EmojiIcon fontSize="small" sx={{ mr: 1 }} />
                    +{items.length - (isMobile ? 2 : 3)} more items
                  </HoverScaleCard>
                )}
              </Box>
            </Box>
          </GlassCard>
        ))}
      </Box>
    </Box>
  );
}