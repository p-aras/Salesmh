import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';



import { 
  Button, 
  TextField, 
  Typography, 
  Box, 
  Paper, 
  LinearProgress, 
  Alert, 
  AlertTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardMedia,
  Avatar,
  Chip,
  Tooltip,
  Fade
} from '@mui/material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon, 
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { styled } from '@mui/material/styles';

// Custom styled components
const GradientPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  maxWidth: '900px',
  margin: 'auto',
  borderRadius: '24px',
  background: 'linear-gradient(145deg, #ffffff, #f8faff)',
  boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  backdropFilter: 'blur(10px)',
  position: 'relative',
  overflow: 'hidden',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '8px',
    background: 'linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)',
  }
}));

const GradientText = styled(Typography)({
  background: 'linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 700,
  display: 'inline-block'
});

const UploadZone = styled(TableCell)(({ theme, active }) => ({
  border: `2px dashed ${active ? theme.palette.primary.main : '#e0e0e0'}`,
  borderRadius: '16px',
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: active ? 'rgba(106, 17, 203, 0.03)' : '#fafafa',
  height: '220px',
  position: 'relative',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: 'rgba(106, 17, 203, 0.05)',
    transform: 'translateY(-2px)'
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  padding: theme.spacing(1.5, 4),
  fontSize: '1rem',
  fontWeight: 600,
  boxShadow: '0 4px 20px rgba(106, 17, 203, 0.2)',
  background: 'linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)',
  color: 'white',
  '&:hover': {
    boxShadow: '0 6px 24px rgba(106, 17, 203, 0.3)',
    transform: 'translateY(-2px)'
  },
  transition: 'all 0.3s ease',
  minWidth: '220px',
  '&.Mui-disabled': {
    background: '#e0e0e0',
    color: '#9e9e9e'
  }
}));

const PreviewCard = styled(Card)({
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)'
  }
});

const StatusBadge = styled(Chip)(({ theme, status }) => ({
  fontWeight: 600,
  backgroundColor: 
    status === 'error' ? 'rgba(244, 67, 54, 0.1)' : 
    status === 'success' ? 'rgba(76, 175, 80, 0.1)' : 
    'rgba(33, 150, 243, 0.1)',
  color: 
    status === 'error' ? theme.palette.error.main : 
    status === 'success' ? theme.palette.success.main : 
    theme.palette.info.main,
  borderRadius: '8px'
}));

const SampleDesignUpload = () => {
  const [sampleId, setSampleId] = useState('');
  const [partyImage, setPartyImage] = useState(null);
  const [ourImage, setOurImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [activeDropZone, setActiveDropZone] = useState(null);
  const [existingSample, setExistingSample] = useState(false);
  const [checkingSample, setCheckingSample] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showPending, setShowPending] = useState(false);
  const [hoveredImage, setHoveredImage] = useState(null);
const navigate = useNavigate();

  const handleFileChange = (e, setter) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleDragOver = (e, zone) => {
    e.preventDefault();
    setActiveDropZone(zone);
  };

  const handleDragLeave = () => {
    setActiveDropZone(null);
  };

  const handleDrop = (e, setter, zone) => {
    e.preventDefault();
    setActiveDropZone(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setter(e.dataTransfer.files[0]);
    }
  };

  const removeImage = (setter) => {
    setter(null);
  };

  const toBase64 = async (file) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      useWebWorker: true
    };
    const compressedFile = await imageCompression(file, options);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onload = () => {
        const [meta, base64] = reader.result.split(',');
        const mime = meta.match(/:(.*?);/)[1];
        resolve({ base64, type: mime, name: file.name });
      };
      reader.onerror = reject;
    });
  };

  const handleSubmit = async () => {
  if (!sampleId) {
    setStatus({ type: 'error', message: 'Please enter a unique Sample ID' });
    return;
  }

  if (!partyImage && !ourImage) {
    setStatus({ type: 'error', message: 'Please upload at least one image' });
    return;
  }

  if ((partyImage?.size || 0) > 5 * 1024 * 1024 || (ourImage?.size || 0) > 5 * 1024 * 1024) {
    setStatus({ type: 'error', message: 'Please upload images under 5MB for faster upload.' });
    return;
  }

  setLoading(true);
  setStatus({ type: '', message: '' });

  try {
    const sampleStatus = await checkSampleExists();

    if (sampleStatus.fullyUploaded) {
      setStatus({ type: 'error', message: 'Sample ID already exists with both images uploaded.' });
      setLoading(false);
      return;
    }

    if (sampleStatus.exists) {
      if ((partyImage && sampleStatus.partyExists) || (ourImage && sampleStatus.ourExists)) {
        const conflict = [];
        if (partyImage && sampleStatus.partyExists) conflict.push("Party Design");
        if (ourImage && sampleStatus.ourExists) conflict.push("Our Design");

        setStatus({
          type: 'error',
          message: `The following image(s) already exist for this Sample ID: ${conflict.join(", ")}`
        });
        setLoading(false);
        return;
      }
    }

    const partyEncoded = partyImage ? await toBase64(partyImage) : null;
    const ourEncoded = ourImage ? await toBase64(ourImage) : null;

    const formData = new FormData();
    formData.append('sampleId', sampleId);
    if (partyEncoded) {
      formData.append('partyImage', JSON.stringify(partyEncoded));
    }
    if (ourEncoded) {
      formData.append('ourImage', JSON.stringify(ourEncoded));
    }

    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbxZ97eRpvn4Yyxo4BXk1XyKB-ViEijNy0X5oo8C10z5GbIKM8kkVtI67Jo8CIj9P-b6/exec',
      {
        method: 'POST',
        body: formData
      }
    );

    const result = await response.json();

    if (result.status === 'success') {
      setStatus({ type: 'success', message: result.message || 'Uploaded successfully!' });
      setSampleId('');
      setPartyImage(null);
      setOurImage(null);

      if (showPending) {
        fetchPendingDesigns();
      }

      setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 3000);
    } else {
      throw new Error(result.message || 'Upload failed');
    }

  } catch (err) {
    console.error(err);
    setStatus({ type: 'error', message: err.message || 'An error occurred during upload' });
  } finally {
    setLoading(false);
  }
};

  const checkSampleExists = async () => {
  if (!sampleId.trim()) return { exists: false };

  setCheckingSample(true);
  try {
    const sheetId = '1Ss-DXIkFJd2XSryl_6n_tV1oVX7b_Ganf8tZBNPEY3Y';
    const apiKey = 'AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk';
    const range = 'Sheet1!A1:E';

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`
    );
    const data = await response.json();

    if (!data.values) throw new Error('Could not fetch sheet data');

    const trimmedId = sampleId.trim();
    const row = data.values.find(row => row[0] === trimmedId);

    if (row) {
      const partyExists = !!row[1]?.trim();
      const ourExists = !!row[2]?.trim();

      return {
        exists: true,
        fullyUploaded: partyExists && ourExists,
        partyExists,
        ourExists
      };
    }

    return { exists: false };
  } catch (err) {
    console.error('Error checking sample ID:', err);
    setStatus({ type: 'error', message: 'Error verifying Sample ID. Please try again.' });
    return { exists: false };
  } finally {
    setCheckingSample(false);
  }
};


  const fetchPendingDesigns = async () => {
    try {
      const sheetId = '1Ss-DXIkFJd2XSryl_6n_tV1oVX7b_Ganf8tZBNPEY3Y';
      const apiKey = 'AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk';
      const range = 'Sheet1!A2:E';

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`
      );
      const data = await response.json();

      if (!data.values) throw new Error('Could not fetch pending orders');

      const pendingMap = new Map();

      data.values.forEach(row => {
        const sampleId = row[1]?.trim();
        const type = row[2]?.trim();

        if (!sampleId || !type) return;

        if (!pendingMap.has(sampleId)) {
          pendingMap.set(sampleId, new Set(['Party Design', 'Our Design']));
        }

        pendingMap.get(sampleId).delete(type);
      });

      const pending = [];
      pendingMap.forEach((missingTypes, sampleId) => {
        if (missingTypes.size > 0) {
          pending.push({ sampleId, missing: Array.from(missingTypes) });
        }
      });

      setPendingOrders(pending);
    } catch (err) {
      console.error('Error fetching pending designs:', err);
      setStatus({ type: 'error', message: 'Failed to fetch pending designs' });
    }
  };

  useEffect(() => {
    if (showPending) fetchPendingDesigns();
  }, [showPending]);

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)', minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
      <GradientPaper>
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
    <Button
      startIcon={<ArrowBackIcon />}
      onClick={() => navigate(-1)}
      sx={{
        color: 'primary.main',
        fontWeight: 500,
        textTransform: 'none',
        px: 2
      }}
    >
      Back
    </Button>
  </Box>

  <Box textAlign="center" mb={4}>
    <GradientText variant="h3" component="h1" gutterBottom>
      Design Sample Upload
    </GradientText>
    <Typography variant="subtitle1" color="textSecondary">
      Upload and manage design samples for client approval
    </Typography>
  </Box>


          <Box textAlign="center" mb={3}>
            <Tooltip title="View pending design uploads">
              <StyledButton
                variant="outlined"
                color="secondary"
                onClick={() => setShowPending(prev => !prev)}
                startIcon={<SearchIcon />}
                sx={{
                  background: 'white',
                  color: 'primary.main',
                  '&:hover': {
                    background: 'rgba(106, 17, 203, 0.04)'
                  }
                }}
              >
                {showPending ? 'Hide Pending Uploads' : 'View Pending Uploads'}
              </StyledButton>
            </Tooltip>
          </Box>

          <Box sx={{ mb: 4 }}>
            <TextField
              fullWidth
              label="Unique Sample ID"
              variant="outlined"
              value={sampleId}
              onChange={(e) => {
                setSampleId(e.target.value);
                setExistingSample(false);
              }}
              onBlur={checkSampleExists}
              placeholder="Enter unique identifier (e.g. CL-2023-001)"
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#f8f9fa',
                  '& fieldset': {
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                    boxShadow: '0 0 0 2px rgba(106, 17, 203, 0.2)'
                  },
                }
              }}
              InputProps={{
                startAdornment: (
                  <Box sx={{ mr: 1, color: 'text.secondary' }}>
                    #
                  </Box>
                )
              }}
            />
            {checkingSample && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Verifying Sample ID...
                </Typography>
              </Box>
            )}
          </Box>

          <TableContainer component={Paper} sx={{ mb: 4, borderRadius: '16px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)' }}>
            <Table>
              <TableHead sx={{ backgroundColor: 'rgba(106, 17, 203, 0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>Design Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>Upload Area</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>Preview</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'rgba(106, 17, 203, 0.1)', mr: 2 }}>
                        <DescriptionIcon color="primary" />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>Party Design Sample</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                          Client's original design file
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <UploadZone 
                    active={activeDropZone === 'party'}
                    onDragOver={(e) => handleDragOver(e, 'party')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, setPartyImage, 'party')}
                    onClick={() => document.getElementById('party-upload').click()}
                  >
                    <input
                      id="party-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setPartyImage)}
                      style={{ display: 'none' }}
                    />
                    {!partyImage ? (
                      <motion.div
                        initial={{ opacity: 0.6 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CloudUploadIcon color="primary" sx={{ fontSize: '56px', mb: 1, opacity: 0.7 }} />
                        <Typography variant="subtitle1" fontWeight={500}>
                          Drag & drop files here
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          or click to browse (JPG, PNG, GIF)
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                          Max file size: 5MB
                        </Typography>
                      </motion.div>
                    ) : (
                      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            height: '120px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            mb: 1
                          }}
                          onMouseEnter={() => setHoveredImage('party')}
                          onMouseLeave={() => setHoveredImage(null)}
                        >
                          <CardMedia
                            component="img"
                            image={URL.createObjectURL(partyImage)}
                            alt="Party design preview"
                            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                          <Fade in={hoveredImage === 'party'}>
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <IconButton
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(setPartyImage);
                                }}
                                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </Fade>
                        </Box>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: 'block',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            px: 1
                          }}
                        >
                          {partyImage.name}
                        </Typography>
                      </Box>
                    )}
                  </UploadZone>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    {partyImage ? (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <PreviewCard>
                          <CardMedia
                            component="img"
                            image={URL.createObjectURL(partyImage)}
                            alt="Party design preview"
                            sx={{ height: '140px', objectFit: 'contain' }}
                          />
                        </PreviewCard>
                      </motion.div>
                    ) : (
                      <Box sx={{ 
                        height: '140px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        borderRadius: '8px',
                        border: '1px dashed rgba(0, 0, 0, 0.12)'
                      }}>
                        <ImageIcon sx={{ fontSize: '40px', color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                          Preview will appear here
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'rgba(37, 117, 252, 0.1)', mr: 2 }}>
                        <DescriptionIcon color="primary" />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>Our Sample Design</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                          Our interpretation of the design
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <UploadZone 
                    active={activeDropZone === 'our'}
                    onDragOver={(e) => handleDragOver(e, 'our')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, setOurImage, 'our')}
                    onClick={() => document.getElementById('our-upload').click()}
                  >
                    <input
                      id="our-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setOurImage)}
                      style={{ display: 'none' }}
                    />
                    {!ourImage ? (
                      <motion.div
                        initial={{ opacity: 0.6 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CloudUploadIcon color="primary" sx={{ fontSize: '56px', mb: 1, opacity: 0.7 }} />
                        <Typography variant="subtitle1" fontWeight={500}>
                          Drag & drop files here
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          or click to browse (JPG, PNG, GIF)
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                          Max file size: 5MB
                        </Typography>
                      </motion.div>
                    ) : (
                      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            height: '120px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            mb: 1
                          }}
                          onMouseEnter={() => setHoveredImage('our')}
                          onMouseLeave={() => setHoveredImage(null)}
                        >
                          <CardMedia
                            component="img"
                            image={URL.createObjectURL(ourImage)}
                            alt="Our design preview"
                            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                          <Fade in={hoveredImage === 'our'}>
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <IconButton
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(setOurImage);
                                }}
                                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </Fade>
                        </Box>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: 'block',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            px: 1
                          }}
                        >
                          {ourImage.name}
                        </Typography>
                      </Box>
                    )}
                  </UploadZone>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    {ourImage ? (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <PreviewCard>
                          <CardMedia
                            component="img"
                            image={URL.createObjectURL(ourImage)}
                            alt="Our design preview"
                            sx={{ height: '140px', objectFit: 'contain' }}
                          />
                        </PreviewCard>
                      </motion.div>
                    ) : (
                      <Box sx={{ 
                        height: '140px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        borderRadius: '8px',
                        border: '1px dashed rgba(0, 0, 0, 0.12)'
                      }}>
                        <ImageIcon sx={{ fontSize: '40px', color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                          Preview will appear here
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {loading && (
            <Box sx={{ mt: 3, mb: 2 }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CircularProgress size={24} sx={{ mr: 2 }} />
                  <Typography variant="body1" fontWeight={500}>
                    Uploading your designs...
                  </Typography>
                </Box>
                <LinearProgress 
                  sx={{ 
                    height: '8px', 
                    borderRadius: '4px',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)',
                    }
                  }} 
                />
              </motion.div>
            </Box>
          )}

          <AnimatePresence>
            {status.message && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ marginBottom: '24px' }}
              >
                <Alert 
                  severity={status.type} 
                  icon={status.type === 'success' ? <CheckCircleIcon fontSize="inherit" /> : null}
                  sx={{ 
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    alignItems: 'center'
                  }}
                  action={
                    <IconButton 
                      size="small" 
                      color="inherit" 
                      onClick={() => setStatus({ type: '', message: '' })}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <AlertTitle sx={{ fontWeight: 600 }}>
                    {status.type === 'success' ? 'Success!' : 
                     status.type === 'error' ? 'Error' : 'Notice'}
                  </AlertTitle>
                  {status.message}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <StyledButton
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={loading || checkingSample || existingSample || (!partyImage && !ourImage)}
              startIcon={!loading && <CloudUploadIcon />}
            >
              {loading ? (
                <>Uploading...</>
              ) : (
                <>Submit Designs</>
              )}
            </StyledButton>
          </Box>
        </GradientPaper>

        <Dialog
          open={showPending}
          onClose={() => setShowPending(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '16px',
              boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              background: 'linear-gradient(145deg, #ffffff, #f8faff)',
              '&:before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '8px',
                background: 'linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)',
              }
            }
          }}
        >
          <DialogTitle
            sx={{
              pt: 3,
              pb: 2,
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <GradientText variant="h5" component="div">
              Pending Design Uploads
            </GradientText>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Samples missing design uploads
            </Typography>
            <IconButton
              sx={{
                position: 'absolute',
                right: 16,
                top: 16,
                color: 'text.secondary'
              }}
              onClick={() => setShowPending(false)}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ px: 3, py: 2 }}>
            {pendingOrders.length > 0 ? (
              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: '12px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden'
                }}
              >
                <Table>
                  <TableHead sx={{ backgroundColor: 'rgba(106, 17, 203, 0.03)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Sample ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Missing Uploads</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingOrders.map(({ sampleId, missing }, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 500 }}>#{sampleId}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {missing.map((type, i) => (
                              <Chip 
                                key={i}
                                label={type}
                                size="small"
                                sx={{
                                  backgroundColor: 'rgba(106, 17, 203, 0.1)',
                                  color: 'primary.main',
                                  fontWeight: 500
                                }}
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <StatusBadge 
                            label="Pending" 
                            status="error" 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="200px"
                flexDirection="column"
                textAlign="center"
              >
                <CheckCircleIcon sx={{ fontSize: '60px', color: 'success.main', mb: 2 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  All designs are up-to-date!
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  No pending design uploads found.
                </Typography>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ justifyContent: 'center', pb: 3, pt: 2 }}>
            <Button
              onClick={() => fetchPendingDesigns()}
              startIcon={<RefreshIcon />}
              sx={{ mr: 2 }}
            >
              Refresh
            </Button>
            <StyledButton
              onClick={() => setShowPending(false)}
              sx={{ px: 4 }}
            >
              Close
            </StyledButton>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Box>
  );
};

export default SampleDesignUpload;