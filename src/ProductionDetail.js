import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import CircleIcon from '@mui/icons-material/Circle';
import { motion } from 'framer-motion';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ReceiptLong from '@mui/icons-material/ReceiptLong';
import { useNavigate } from 'react-router-dom';
import { ArrowBackIosNew } from '@mui/icons-material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';





import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Chip,
  Avatar,
  useTheme,
  useMediaQuery,
  Container,
  Button,
  ImageList,
  ImageListItem,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  IconButton
} from '@mui/material';
import {
  CalendarToday,
  Assignment,
  LocalShipping,
  CheckCircle,
  Schedule,
  Business,
  Inventory,
  Palette,
  Style,
  Checkroom,
  AllInbox,
  Star,
  ColorLens as ColorIcon,
  Straighten,
  AttachMoney,
  Info,
  Photo,
  ExpandMore,
  ExpandLess,
  Timeline,
  Factory,
  ListAlt,
  Dashboard,
  ArrowDownward,
  ArrowUpward
} from '@mui/icons-material';
import { format } from 'date-fns';

const CONFIG = {
  API_KEY: 'AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk',
  ORDERS_SHEET_ID: '1Frg7kHPiiGeydB02LsGKJ-0UeO8N45-19skJRRvU_Qg',
  PRODUCTION_SHEET_ID: '1xD8Uy1lUgvNTQ2RGRBI4ZjOrozbinUPRq2_UfIplP98',
  ORDERS_RANGE: 'Orders!A1:N',
  PRODUCTION_RANGE: 'RAW FINAL!A3:Z',
};

const extractFileId = (url) => {
  const match = url.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{10,})/);
  return match ? match[1] : '';
};

const DEPARTMENT_SHEETS = {
  CUTTING: {
    SHEET_ID: '1yHVieyNb7A5rds3oBEaUlfxxgG04QetLpb8T9g_xQPw',
    RANGE: 'cutting!A3:K',
  },
  PRINTING: {
    SHEET_ID: '1yHVieyNb7A5rds3oBEaUlfxxgG04QetLpb8T9g_xQPw',
    RANGE: 'printing!A3:U',
  },
  EMB: {
    SHEET_ID: '1yHVieyNb7A5rds3oBEaUlfxxgG04QetLpb8T9g_xQPw',
    RANGE: 'emb!A3:U',
  },
  STITCHING: {
    SHEET_ID: '1yHVieyNb7A5rds3oBEaUlfxxgG04QetLpb8T9g_xQPw',
    RANGE: 'Sheet1!A1:Z',
  },
  PACKING: {
    SHEET_ID: '1yHVieyNb7A5rds3oBEaUlfxxgG04QetLpb8T9g_xQPw',
    RANGE: 'PACK ALLOTED!A3:Z',
  },
};

const departmentIcons = {
  CUTTING: <Inventory />,
  PRINTING: <Palette />,
  EMB: <Style />,
  STITCHING: <Checkroom />,
  PACKING: <AllInbox />
};

const departmentColors = {
  CUTTING: '#4e79a7',
  PRINTING: '#f28e2b',
  EMB: '#e15759',
  STITCHING: '#76b7b2',
  PACKING: '#59a14f'
};

const fetchSheetData = async (sheetId, range) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${CONFIG.API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.values || [];
};

const mapSheetData = (values) => {
  if (!values || values.length === 0) return [];
  const [header, ...rows] = values;
  const keys = header.map((h) =>
    h.trim().replace(/\.+$/, '').replace(/\s+/g, ' ').toUpperCase()
  );
  return rows.map((row) =>
    keys.reduce((obj, key, i) => {
      obj[key] = row[i] || '';
      return obj;
    }, {})
  );
};

const StatusBadge = ({ status }) => {
  const theme = useTheme();
  const statusLower = status?.toLowerCase() || '';
  
  let color = 'default';
  if (statusLower.includes('complete')) color = 'success';
  else if (statusLower.includes('progress')) color = 'warning';
  else if (statusLower.includes('pending')) color = 'info';
  else if (statusLower.includes('cancel')) color = 'error';

  return (
    <Chip
      label={status}
      size="small"
      color={color}
      sx={{
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5
      }}
    />
  );
};

const DepartmentTimeline = ({ department, data, onOpenDetails }) => {
  const theme = useTheme();
  const fields = {
    CUTTING: ['CUTTING', 'CUTTING ISSUE', 'CUTTING RECEIPT', 'CUTTING DAYS'],
    EMB: ['EMB', 'EMB ISSUE', 'EMB RECEIPT', 'EMB DAYS'],
    PRINTING: ['PRINTING', 'PRINTING ISSUE', 'PRINTING RECEIPT', 'PRINTING DAYS'],
    STITCHING: ['STITCHING', 'STITCHING ISSUE', 'STITCHING RECEIPT', 'STITCHING DAYS'],
    PACKING: ['PACKING', 'PACKING ISSUE', 'PACKING RECEIPT', 'PACKING DAYS']
  }[department];

  const hasData = fields.some(field => data[field] && data[field].trim() !== '');
  const mainStatus = (data[department] || '').toLowerCase();
  const progress = mainStatus.includes('done') ? 100 : 0;

  return (
    <Card
      onClick={() => onOpenDetails(department)} // 🔁 Make entire card clickable
      variant="outlined"
      sx={{
        borderLeft: `4px solid ${departmentColors[department]}`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[2],
        }
      }}
    >
      <CardHeader
        avatar={
          <Avatar
            sx={{
              bgcolor: `${departmentColors[department]}20`,
              color: departmentColors[department]
            }}
          >
            {departmentIcons[department]}
          </Avatar>
        }
        title={
          <Typography variant="subtitle1" fontWeight={600}>
            {department}
          </Typography>
        }
        subheader={
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: `${departmentColors[department]}20`,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: departmentColors[department]
                }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color="textSecondary">
                Progress
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {progress}%
              </Typography>
            </Box>
          </Box>
        }
        action={
          <Info color="primary" /> // 🎯 Just an icon now (not clickable)
        }
      />
      <CardContent>
        <Grid container spacing={1}>
          {fields.map((field) =>
            data[field] && data[field].trim() !== '' ? (
              <React.Fragment key={field}>
                <Grid item xs={5}>
                  <Typography variant="caption" color="textSecondary">
                    {field.replace(department + ' ', '')}
                  </Typography>
                </Grid>
                <Grid item xs={7}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: field.includes('DAYS') ? 600 : 'normal',
                      color: field.includes('DAYS') ? departmentColors[department] : 'inherit'
                    }}
                  >
                    {data[field]}
                    {field.includes('DAYS') && ' days'}
                  </Typography>
                </Grid>
              </React.Fragment>
            ) : null
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};


const InfoRow = ({ icon, label, value, color }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', mb: 2 }}>
      <Box sx={{ 
        color: color || theme.palette.primary.main,
        mr: 2,
        mt: 0.5
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="textSecondary">
          {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
};

const SectionCard = ({ title, icon, children, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const theme = useTheme();

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {icon}
            {title}
          </Typography>
        }
        action={
          <IconButton onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        }
        sx={{
          backgroundColor: theme.palette.grey[100],
          borderBottom: expanded ? `1px solid ${theme.palette.divider}` : 'none'
        }}
      />
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent>
          {children}
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default function ProductionDetail() {
  const { orderNo } = useParams();
  const [orderData, setOrderData] = useState(null);
  const [productionData, setProductionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState([]);
  const [dialogDepartment, setDialogDepartment] = useState('');
  const navigate = useNavigate();


const orderInfoFields = [
  { key: 'DATE', label: 'Order Date', icon: <CalendarToday fontSize="small" />, format: (val) => format(new Date(val), 'PPpp') },
  { key: 'ORDER NO', label: 'Order No', icon: <Assignment fontSize="small" /> },
  { key: 'PARTY NAME', label: 'Customer', icon: <Business fontSize="small" /> },
  { key: 'SEASON', label: 'Season', icon: <Star fontSize="small" /> },
  { key: 'ITEM NAME', label: 'Item', icon: <Checkroom fontSize="small" /> },
  { key: 'BRAND', label: 'Brand', icon: <Business fontSize="small" /> },
  { key: 'COLOUR', label: 'Color', icon: <ColorIcon fontSize="small" /> },
  { key: 'SIZE', label: 'Size', icon: <Straighten fontSize="small" /> },
  { key: 'QUANTITY', label: 'Quantity', icon: <AllInbox fontSize="small" />, format: (val) => `${val} pcs` },
  { key: 'RATE', label: 'Rate', icon: <AttachMoney fontSize="small" />, format: (val) => `₹${val}` },
  { key: 'STATUS', label: 'Status', icon: <CheckCircle fontSize="small" />, format: (val) => val?.replace('\n', ' • ') },
  { key: 'REMARKS', label: 'Remarks', icon: <Info fontSize="small" /> },
  { key: 'LOT NO', label: 'Lot No', icon: <Inventory fontSize="small" /> }
];

  const lotInfoFields = [
    { key: 'LOT NO', label: 'Lot Number', icon: <Inventory fontSize="small" /> },
    { key: 'ITEM', label: 'Item', icon: <Checkroom fontSize="small" /> },
    { key: 'GENTS/ LADIES/ KIDS', label: 'Category', icon: <Checkroom fontSize="small" /> },
    { key: 'STYLE', label: 'Style', icon: <Style fontSize="small" /> },
    { key: 'FABRIC', label: 'Fabric', icon: <Inventory fontSize="small" /> },
    { key: 'BRAND', label: 'Brand', icon: <Business fontSize="small" /> },
    { key: 'PCS', label: 'Pieces', icon: <AllInbox fontSize="small" /> }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const orderValues = await fetchSheetData(CONFIG.ORDERS_SHEET_ID, CONFIG.ORDERS_RANGE);
        const orders = mapSheetData(orderValues);

        const order = orders.find((o) => (o['ORDER NO'] || '').trim() === orderNo);
        if (!order) throw new Error(`Order No. "${orderNo}" not found.`);
        setOrderData(order);

        const lotNo = (order['LOT NO'] || '').toString().trim().toLowerCase();
        if (lotNo) {
          const prodValues = await fetchSheetData(CONFIG.PRODUCTION_SHEET_ID, CONFIG.PRODUCTION_RANGE);
          const productions = mapSheetData(prodValues);
          const filtered = productions.filter(
            (p) => (p['LOT NO'] || '').toString().trim().toLowerCase() === lotNo
          );
          setProductionData(filtered);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderNo]);

const handleOpenDialog = async (department) => {
  console.log("Opening dialog for:", department); // 🔍 DEBUG

  try {
    const lotNo = (orderData?.['LOT NO'] || '').toString().trim().toLowerCase();
    const config = DEPARTMENT_SHEETS[department];
    if (!config) return;

    const values = await fetchSheetData(config.SHEET_ID, config.RANGE);
    console.log("Fetched department values:", values); // 🔍 DEBUG

    const mapped = mapSheetData(values);
    const filtered = mapped.filter(row => 
      (row['LOT NO'] || '').toString().trim().toLowerCase() === lotNo
    );

    console.log("Filtered dialog data:", filtered); // 🔍 DEBUG

    setDialogData(filtered);
    setDialogDepartment(department);
  } catch (err) {
    console.error('Dialog fetch error:', err);
    setDialogData([]);
  } finally {
    setDialogOpen(true); // ✅ Should always run
  }
};



  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogData([]);
    setDialogDepartment('');
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="300px"
        flexDirection="column"
      >
        <CircularProgress size={60} thickness={4} sx={{ color: theme.palette.primary.main }} />
        <Typography variant="h6" mt={3} color="textSecondary">
          Loading Production Details...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          sx={{ 
            fontSize: isMobile ? '0.875rem' : '1rem',
            borderRadius: 2,
            boxShadow: theme.shadows[1]
          }}
        >
          <Typography variant="h6">Error Loading Data</Typography>
          {error}
        </Alert>
      </Container>
    );
  }

  const production = productionData[0] || {};
  const hasDepartmentData = Object.keys(departmentColors).some(dept => 
    [`${dept}`, `${dept} ISSUE`, `${dept} RECEIPT`, `${dept} DAYS`].some(
      field => production[field] && production[field].trim() !== ''
    )
  );

  return (
    <Container maxWidth="xll" sx={{ py: 4 }}>
     
      {/* Header Section */}
  <Box 
  mb={4}
  sx={{
    position: 'relative',
    '&:after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: '5%',
      right: '5%',
      height: '1px',
      background: `linear-gradient(90deg, transparent, ${theme.palette.divider}, transparent)`,
      opacity: 0.7,
      transition: 'all 0.4s ease',
    },
    '&:hover:after': {
      left: '2%',
      right: '2%',
      opacity: 1
    }
  }}
>
  <Box 
    sx={{ 
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: { xs: 'flex-start', sm: 'center' },
      flexDirection: { xs: 'column', sm: 'row' },
      mb: 3,
      pb: 3,
      gap: 3,
      transition: 'all 0.3s ease',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <Button
        onClick={() => navigate(-1)}
        startIcon={<ArrowBackIosNew sx={{ fontSize: '0.9rem' }} />}
        variant="outlined"
        size="medium"
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 500,
          px: 2.5,
          py: 1,
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: alpha(theme.palette.primary.main, 0.08)
          },
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        Back
      </Button>
      
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              color: theme.palette.text.primary,
              lineHeight: 1.3,
              letterSpacing: '-0.5px',
              background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}
          >
            Order #{orderNo}
          </Typography>
          <Chip 
            label="Active" 
            size="small" 
            color="success" 
            sx={{ 
              height: 20, 
              fontSize: '0.7rem', 
              fontWeight: 600,
              ml: 1 
            }} 
          />
        </Box>
        
        {/* <Typography 
          variant="subtitle1" 
          color="text.secondary"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            letterSpacing: '0.5px'
          }}
        >
          <FiberManualRecordIcon sx={{ 
            fontSize: '10px', 
            color: theme.palette.success.main,
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.6 },
              '100%': { opacity: 1 }
            }
          }} />
          Detailed production tracking and status
        </Typography> */}
      </Box>
    </Box>
    
    <Box sx={{ 
      display: 'flex', 
      gap: 2,
      alignItems: 'center',
      mt: { xs: 1, sm: 0 }
    }}>
     
    </Box>
  </Box>
</Box>
      {/* Order Summary Section */}
  <SectionCard 
  title="Order Summary" 
  icon={<ReceiptLong color="primary" sx={{ fontSize: '28px' }} />}
  sx={{
    border: 'none',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
    background: 'linear-gradient(to bottom, #FFFFFF 0%, #F9FAFF 100%)',
    position: 'relative',
    '&:before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'linear-gradient(90deg, #3f51b5 0%, #2196f3 100%)'
    }
  }}
>
  {/* Main Table Section */}
  <Box sx={{ 
    overflowX: 'auto',
    position: 'relative',
    '&::-webkit-scrollbar': {
      height: '6px'
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderRadius: '3px'
    }
  }}>
    <Table sx={{ 
      minWidth: 650,
      '& .MuiTableCell-root': {
        borderColor: 'divider',
        py: 2
      }
    }}>
      <TableHead>
        <TableRow sx={{ 
          backgroundColor: 'rgba(63, 81, 181, 0.05)',
          '& th': {
            py: 2.5,
            fontWeight: 600,
            color: 'text.secondary',
            fontSize: '0.875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }
        }}>
          <TableCell width="30%">Field</TableCell>
          <TableCell width="70%">Value</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {orderInfoFields.map(({ key, label, icon, format }) => (
          orderData?.[key] && (
            <TableRow 
              key={key}
              hover
              sx={{
                '&:last-child td': { borderBottom: 0 },
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(63, 81, 181, 0.03)',
                  transform: 'translateX(2px)'
                }
              }}
            >
              <TableCell>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(63, 81, 181, 0.08)'
                  }}>
                    {React.cloneElement(icon, {
                      sx: {
                        color: 'primary.main',
                        fontSize: '20px'
                      }
                    })}
                  </Box>
                  <Typography variant="body2" fontWeight={500} color="text.secondary">
                    {label}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ 
                  fontWeight: 500,
                  color: 'text.primary',
                  wordBreak: 'break-word',
                  fontFamily: "'Roboto Mono', monospace"
                }}>
                  {format ? format(orderData[key]) : orderData[key]}
                </Typography>
              </TableCell>
            </TableRow>
          )
        ))}
      </TableBody>
    </Table>
  </Box>

  {/* Special Instructions */}
  {orderData?.REMARKS && (
    <Box sx={{ 
      mt: 4,
      p: 3,
      backgroundColor: 'rgba(255, 167, 38, 0.08)',
      borderLeft: '4px solid',
      borderColor: 'warning.main',
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden',
      '&:before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 10% 50%, rgba(255,167,38,0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }
    }}>
      <Box display="flex" alignItems="center" gap={2} mb={1.5}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: 'warning.main',
          color: 'common.white'
        }}>
          <Info sx={{ fontSize: '20px' }} />
        </Box>
        <Typography variant="subtitle1" fontWeight={600} color="warning.dark">
          Special Instructions
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ 
        whiteSpace: 'pre-line',
        lineHeight: 1.6,
        pl: 6,
        position: 'relative',
        '&:before': {
          content: '"❯"',
          position: 'absolute',
          left: 0,
          color: 'warning.main',
          fontWeight: 'bold'
        }
      }}>
        {orderData.REMARKS}
      </Typography>
    </Box>
  )}

  {/* Reference Image */}
  <Box sx={{ mt: 4 }}>
    <Typography variant="subtitle1" fontWeight={600} mb={2} display="flex" alignItems="center" gap={1.5}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '8px',
        backgroundColor: 'primary.main',
        color: 'common.white'
      }}>
        <Photo sx={{ fontSize: '20px' }} />
      </Box>
      Reference Image
    </Typography>
    
    {orderData?.['PHOTO URL'] ? (
      <Box sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }
      }}>
        <Box sx={{
          position: 'relative',
          paddingTop: '56.25%', // 16:9 aspect ratio
          backgroundColor: 'rgba(0,0,0,0.02)',
          '&:after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none'
          }
        }}>
          <iframe
            src={`https://drive.google.com/file/d/${extractFileId(orderData['PHOTO URL'])}/preview`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            allow="autoplay"
          />
        </Box>
        <Button 
          variant="contained" 
          fullWidth 
          href={orderData['PHOTO URL']}
          target="_blank"
          startIcon={<Photo />}
          sx={{ 
            borderRadius: '0 0 12px 12px',
            py: 1.5,
            textTransform: 'none',
            fontSize: '0.9375rem',
            fontWeight: 500,
            letterSpacing: '0.25px',
            '&:hover': {
              backgroundColor: 'primary.dark'
            }
          }}
        >
          View Full Resolution Image
        </Button>
      </Box>
    ) : (
      <Box 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: '16px',
          backgroundColor: 'rgba(0,0,0,0.02)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'rgba(63, 81, 181, 0.03)'
          }
        }}
      >
        <Box sx={{
          display: 'inline-flex',
          position: 'relative',
          mb: 2,
          '&:before': {
            content: '""',
            position: 'absolute',
            top: -8,
            left: -8,
            right: -8,
            bottom: -8,
            borderRadius: '50%',
            backgroundColor: 'rgba(63, 81, 181, 0.1)',
            animation: 'pulse 2s infinite ease-in-out',
            '@keyframes pulse': {
              '0%': { transform: 'scale(0.95)', opacity: 0.6 },
              '50%': { transform: 'scale(1.05)', opacity: 0.3 },
              '100%': { transform: 'scale(0.95)', opacity: 0.6 }
            }
          }
        }}>
          <Photo sx={{ 
            fontSize: 48, 
            color: 'text.disabled',
            position: 'relative',
            zIndex: 1
          }} />
        </Box>
        <Typography variant="body1" color="text.disabled" sx={{ mb: 1 }}>
          No reference image available
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ opacity: 0.7 }}>
          Upload an image for better reference
        </Typography>
      </Box>
    )}
  </Box>
</SectionCard>      {/* Lot Details Section */}
  <SectionCard 
  title="Lot Details" 
  icon={<Inventory color="primary" sx={{ fontSize: '28px' }} />}
  sx={{
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'transform 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)'
    }
  }}
>
  {productionData.length > 0 ? (
    <Box sx={{ overflowX: 'auto' }}>
      <Table sx={{ 
        minWidth: 650,
        '& .MuiTableCell-root': {
          borderColor: 'divider',
          py: 2
        }
      }}>
        <TableHead>
          <TableRow sx={{ 
            backgroundColor: 'white',
            '& th': {
              fontWeight: 600,
              color: 'primary.dark',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontSize: '0.75rem'
            }
          }}>
            <TableCell width="30%">Property</TableCell>
            <TableCell width="70%">Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lotInfoFields.map(({ key, label, icon, format }) => {
            const value = production[key];
            if (!value) return null;
            
            return (
              <TableRow 
                key={key}
                hover
                sx={{
                  '&:last-child td': { borderBottom: 0 },
                  transition: 'background-color 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    {React.cloneElement(icon, {
                      sx: {
                        color: 'primary.main',
                        backgroundColor: 'primary.light',
                        p: 1,
                        borderRadius: '50%',
                        fontSize: '20px'
                      }
                    })}
                    <Typography variant="body2" fontWeight={500}>
                      {label}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 600,
                      color: 'text.primary',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {format ? format(value) : value}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  ) : (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Alert 
        severity="info" 
        sx={{
          borderRadius: '8px',
          backgroundColor: 'info.light',
          color: 'info.dark',
          '& .MuiAlert-icon': {
            fontSize: '28px',
            alignItems: 'center'
          }
        }}
        iconMapping={{
          info: <InfoOutlined fontSize="inherit" />
        }}
      >
        <Typography variant="body1" fontWeight={500}>
          No production data found for this Lot No.
        </Typography>
        <Typography variant="body2" mt={0.5}>
          Please check the lot number or try again later.
        </Typography>
      </Alert>
    </motion.div>
  )}
</SectionCard>
      {/* Production Flow Section */}
      <SectionCard 
        title="Production Stages" 
        icon={<Timeline color="primary" />}
      >
        {hasDepartmentData ? (
          <Grid container spacing={3}>
            {Object.keys(departmentColors).map((dept) => (
              <Grid item xs={12} sm={6} lg={4} key={dept}>
                <DepartmentTimeline
                  department={dept}
                  data={production}
                  onOpenDetails={handleOpenDialog}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Alert severity="info">
            No production stage data available for this lot
          </Alert>
        )}
      </SectionCard>

      {/* Department Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.common.white,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}>
          {departmentIcons[dialogDepartment]}
          {dialogDepartment} Details for Lot No: {orderData?.['LOT NO']}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {dialogData.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: theme.palette.grey[50] }}>
                  <TableRow>
                    {Object.keys(dialogData[0]).map((key) => (
                      <TableCell key={key} sx={{ fontWeight: 600 }}>
                        {key}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dialogData.map((row, index) => (
                    <TableRow key={index} hover>
                      {Object.values(row).map((value, i) => (
                        <TableCell key={i}>
                          {value || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                No detailed records found for this department.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleCloseDialog}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 1 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}