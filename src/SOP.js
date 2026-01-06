import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
  Paper,
  Tooltip,
  Fade,
  alpha,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  useTheme,
  Divider,
  Skeleton,
  InputAdornment,
  Menu,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Breadcrumbs
} from "@mui/material";
import {
  Visibility as PreviewIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenNewIcon,
  Description as DocIcon,
  AccessTime as TimeIcon,
  Sort as SortIcon,
  CloudOff as CloudOffIcon,
  GridView as GridIcon,
  ViewList as ListIcon,
  FilterAlt as FilterIcon,
  ArrowBack as ArrowBackIcon,
  Clear as ClearIcon
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// ====== CONFIG ======
const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const FOLDER_ID = "1ZaOl72Se3zIfbW_Gindj7tunNgvS53h5";

// ====== Styled Components ======
const styles = {
  shell: {
    minHeight: "100%",
    padding: { xs: 1.5, md: 3 },
    background: (theme) =>
      theme.palette.mode === "dark"
        ? "radial-gradient(1200px 600px at 10% -10%, rgba(59,130,246,0.08), transparent), linear-gradient(135deg, #0b1220 0%, #0f172a 50%, #111827 100%)"
        : "radial-gradient(1200px 600px at 10% -10%, rgba(59,130,246,0.08), transparent), linear-gradient(135deg, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%)"
  },
  headerWrap: {
    position: "sticky",
    top: 0,
    zIndex: 5,
  },
  header: {
    borderRadius: 3,
    padding: 2,
    pt: 1.5,
    pb: 2,
    boxShadow: "0 10px 40px rgba(0,0,0,0.05), 0 2px 10px rgba(0,0,0,0.02)",
    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    background: (theme) =>
      theme.palette.mode === "dark"
        ? `linear-gradient(145deg, ${alpha("#0b1220", 0.6)} 0%, ${alpha("#0f172a", 0.6)} 100%)`
        : `linear-gradient(145deg, ${alpha("#ffffff", 0.9)} 0%, ${alpha("#f8fafc", 0.9)} 100%)`,
    backdropFilter: "blur(10px)",
    mb: 3,
  },
  glassCard: {
    height: "100%",
    borderRadius: 2,
    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.8),
    backdropFilter: "blur(10px)",
    boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
    transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: "0 14px 36px rgba(0,0,0,0.12)",
      borderColor: (theme) => alpha(theme.palette.primary.main, 0.28)
    }
  },
  subtleChip: {
    height: 24,
    fontWeight: 700,
    fontSize: "0.7rem",
    borderRadius: 6,
    backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.06),
    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.15)}`
  },
  actionIconButton: {
    borderRadius: 10,
    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.12)}`,
    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
    transition: "all 0.18s ease",
    "&:hover": {
      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
      transform: "translateY(-1px)",
    },
    "&:active": {
      transform: "translateY(0)"
    }
  },
  previewDialog: {
    borderRadius: 3,
    overflow: "hidden",
    background: (theme) => alpha(theme.palette.background.paper, 0.98),
    boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
    height: "85vh"
  },
  emptyState: {
    p: 6,
    borderRadius: 3,
    textAlign: "center",
    border: (theme) => `1px dashed ${alpha(theme.palette.divider, 0.2)}`,
    backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.7),
    backdropFilter: "blur(8px)"
  }
};

// ====== Utilities ======
const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatFileSize = (bytes) => {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
};

const fileExt = (name) => {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
};

const extColor = (ext, theme) => {
  const colors = {
    PDF: theme.palette.error.main,
    DOCX: theme.palette.info.main,
    XLSX: theme.palette.success.main,
    PPTX: theme.palette.warning.main,
  };
  return colors[ext] ?? theme.palette.primary.main;
};

// ====== Card & List Item ======
const DocumentCard = ({ file, onPreview, onDownload, onOpenNew }) => {
  const theme = useTheme();
  const ext = fileExt(file.name);
  const color = extColor(ext, theme);

  return (
    <Card sx={styles.glassCard} component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <CardContent sx={{ p: 2.25 }}>
        <Box display="flex" alignItems="flex-start" gap={1.5}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            badgeContent={
              <Chip
                label={ext}
                sx={{
                  height: 20,
                  ".MuiChip-label": { px: 0.75, fontSize: "0.65rem", fontWeight: 800 },
                  bgcolor: alpha(color, 0.1),
                  borderColor: alpha(color, 0.2),
                  color,
                }}
              />
            }
          >
            <Avatar
              variant="rounded"
              sx={{
                width: 52,
                height: 52,
                borderRadius: 12,
                bgcolor: alpha(color, 0.12),
                color,
                border: `1px solid ${alpha(color, 0.2)}`,
              }}
            >
              <DocIcon />
            </Avatar>
          </Badge>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                mb: 0.5,
                letterSpacing: "-0.01em"
              }}
              title={file.name}
            >
              {file.name.replace(/\.[^/.]+$/, "")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatFileSize(file.size)} • Updated {formatDate(file.modifiedTime)}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <Divider sx={{ opacity: 0.5 }} />
      <CardActions sx={{ p: 1.25, display: "flex", justifyContent: "space-between" }}>
        <Button
          size="small"
          onClick={() => onPreview(file.id)}
          startIcon={<PreviewIcon />}
          sx={{ fontWeight: 800, borderRadius: 2 }}
        >
          Quick View
        </Button>
        <Box>
          <Tooltip title="Download" arrow>
            <IconButton
              sx={styles.actionIconButton}
              component="a"
              href={onDownload(file.id)}
              target="_blank"
              rel="noreferrer"
              download
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open in new tab" arrow>
            <IconButton
              sx={{ ...styles.actionIconButton, ml: 1 }}
              onClick={() => onOpenNew(file.id)}
            >
              <OpenNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
};

const DocumentListItem = ({ file, onPreview, onDownload, onOpenNew }) => {
  const theme = useTheme();
  const ext = fileExt(file.name);
  const color = extColor(ext, theme);

  return (
    <ListItem
      secondaryAction={
        <Box>
          <Tooltip title="Quick View" arrow>
            <IconButton sx={styles.actionIconButton} onClick={() => onPreview(file.id)}>
              <PreviewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download" arrow>
            <IconButton
              sx={{ ...styles.actionIconButton, ml: 1 }}
              component="a"
              href={onDownload(file.id)}
              target="_blank"
              rel="noreferrer"
              download
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open in new tab" arrow>
            <IconButton
              sx={{ ...styles.actionIconButton, ml: 1 }}
              onClick={() => onOpenNew(file.id)}
            >
              <OpenNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      }
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 2,
        border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        mb: 1,
        transition: "all 0.18s ease",
        "&:hover": {
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
          transform: "translateX(4px)"
        },
      }}
    >
      <ListItemAvatar>
        <Avatar
          variant="rounded"
          sx={{
            width: 44,
            height: 44,
            borderRadius: 10,
            bgcolor: alpha(color, 0.12),
            color,
            border: `1px solid ${alpha(color, 0.2)}`,
          }}
        >
          <FileIcon fontSize="small" />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography fontWeight={800} noWrap title={file.name}>
            {file.name.replace(/\.[^/.]+$/, "")}
          </Typography>
        }
        secondary={
          <Typography variant="body2" color="text.secondary" noWrap>
            {ext} • {formatFileSize(file.size)} • Updated {formatDate(file.modifiedTime)}
          </Typography>
        }
      />
    </ListItem>
  );
};

// ====== Skeletons ======
const SkeletonGrid = () => {
  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Grid key={i} item xs={12} sm={6} md={4} lg={3}>
          <Card sx={styles.glassCard}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" gap={1.5}>
                <Skeleton variant="rounded" width={52} height={52} sx={{ borderRadius: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton height={20} width="85%" sx={{ mb: 1 }} />
                  <Skeleton height={16} width="60%" />
                </Box>
              </Box>
            </CardContent>
            <Divider />
            <Box sx={{ p: 1.5 }}>
              <Skeleton height={32} width={110} />
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// ====== Main Component ======
const TrainingandDevelopment = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [previewId, setPreviewId] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [anchorSort, setAnchorSort] = useState(null);
  const [sortBy, setSortBy] = useState("modified_desc");
  const [view, setView] = useState("grid");
  const [extFilter, setExtFilter] = useState("ALL");
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Keyboard shortcut: Alt/Option + Left Arrow => Back
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        try {
          navigate(-1);
        } catch {
          window.history.back();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const KEYWORDS = ["Printing", "Emb", "Delay","EMB","Print","प्रिंटिंग और EMB माल प्रक्रिय1"];

  const buildEndpoint = () => {
    const orBlock = KEYWORDS
      .map(k => `name contains '${k.replace(/'/g, "\\'")}'`)
      .join(" or ");

    const query = [
      `'${FOLDER_ID}' in parents`,
      "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'",
      "trashed=false",
      "name contains 'SOP'",
      `(${orBlock})`
    ].join(" and ");

    return (
      "https://www.googleapis.com/drive/v3/files?" +
      "q=" + encodeURIComponent(query) + "&" +
      new URLSearchParams({
        key: API_KEY,
        fields: "files(id,name,size,modifiedTime,mimeType,webViewLink)",
        orderBy: "modifiedTime desc",
        pageSize: "1000",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      }).toString()
    );
  };

  const fetchFiles = async () => {
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch(buildEndpoint());
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`Drive API → ${res.status} ${body.error?.message ?? res.statusText}`);
      }
      setFiles(body.files ?? []);
      setLastLoadedAt(new Date().toISOString());
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!API_KEY || !FOLDER_ID) {
      setError("Configuration error: Missing API key or folder ID");
      setLoading(false);
      return;
    }
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSorted = useMemo(() => {
    let list = files;

    if (extFilter !== "ALL") {
      list = list.filter((f) => fileExt(f.name) === extFilter);
    }

    if (debounced) {
      list = list.filter((f) => f.name.toLowerCase().includes(debounced));
    }

    list = [...list].sort((a, b) => {
      if (sortBy === "modified_desc") {
        return new Date(b.modifiedTime) - new Date(a.modifiedTime);
      } else if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      } else if (sortBy === "size_desc") {
        return (parseInt(b.size || 0, 10) || 0) - (parseInt(a.size || 0, 10) || 0);
      }
      return 0;
    });

    return list;
  }, [files, debounced, sortBy, extFilter]);

  const getDownloadUrl = (id) => `https://drive.google.com/uc?export=download&id=${id}`;
  const getPreviewUrl = (id) => {
    const urls = [
      `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(getDownloadUrl(id))}`,
      `https://drive.google.com/file/d/${id}/preview`,
      `https://docs.google.com/document/d/${id}/preview`,
    ];
    return urls[retryCount % urls.length];
  };
  const handlePreviewError = () => {
    if (retryCount < 2) setRetryCount(retryCount + 1);
    else setPreviewError("Preview unavailable. Please download or open in a new tab.");
  };
  const handleOpenInNewTab = (id) =>
    window.open(`https://drive.google.com/file/d/${id}/view`, "_blank", "noopener,noreferrer");

  const handleBack = () => {
    try {
      navigate(-1);
    } catch {
      window.history.back();
    }
  };

  // ====== Render ======
  if (loading && !refreshing) {
    return (
      <Box sx={styles.shell}>
        <Box sx={styles.headerWrap}>
          <Paper sx={styles.header}>
            <Box display="flex" alignItems="center" gap={1.5} mb={1.25}>
              <Tooltip title="Back (Alt + ←)">
                <IconButton
                  onClick={handleBack}
                  sx={{
                    ...styles.actionIconButton,
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                  }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Breadcrumbs separator="›" sx={{ fontWeight: 700 }}>
                <Typography color="text.secondary">Library</Typography>
                <Typography>SOP</Typography>
                <Typography color="text.primary">Embroidery & Printing</Typography>
              </Breadcrumbs>
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                variant="rounded"
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <FileIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: "-0.02em" }}>
                  SOP • Embroidery & Printing
                </Typography>
                <Typography color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TimeIcon fontSize="small" /> Loading your documents…
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
        <SkeletonGrid />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={styles.shell}>
        <Box sx={styles.headerWrap}>
          <Paper sx={styles.header}>
            <Box display="flex" alignItems="center" gap={1.5} mb={1.25}>
              <Tooltip title="Back (Alt + ←)">
                <IconButton onClick={handleBack} sx={styles.actionIconButton}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Breadcrumbs separator="›" sx={{ fontWeight: 700 }}>
                <Typography color="text.secondary">Library</Typography>
                <Typography>SOP</Typography>
                <Typography color="text.primary">Embroidery & Printing</Typography>
              </Breadcrumbs>
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                variant="rounded"
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.12),
                  color: theme.palette.error.main,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                <CloudOffIcon />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight={900}>
                  Connection Error
                </Typography>
                <Typography color="text.secondary">
                  {error.includes("Configuration error")
                    ? "The application is not properly configured. Please update your keys."
                    : "We couldn't connect to Google Drive. Please try again."}
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={fetchFiles}
                sx={{ borderRadius: 2 }}
              >
                Retry
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Fade in timeout={400}>
      <Box sx={styles.shell}>
        {/* Sticky Header */}
        <Box sx={styles.headerWrap}>
          <Paper sx={styles.header}>
            <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={2} alignItems={{ xs: "stretch", md: "center" }}>
              {/* Left cluster: Back + Title */}
              <Box display="flex" alignItems="center" gap={1.25} flex={1} minWidth={0}>
                <Tooltip title="Back (Alt + ←)">
                  <IconButton onClick={handleBack} sx={styles.actionIconButton}>
                    <ArrowBackIcon />
                  </IconButton>
                </Tooltip>

                <Avatar
                  variant="rounded"
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    mr: 0.5
                  }}
                >
                  <FileIcon />
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="h5"
                    fontWeight={900}
                    sx={{ lineHeight: 1.15, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    SOP • Embroidery & Printing
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Breadcrumbs separator="›" sx={{ "& li": { fontSize: 12, fontWeight: 700 }, color: "text.secondary" }}>
                      <Typography color="text.secondary">Library</Typography>
                      <Typography color="text.secondary">SOP</Typography>
                      <Typography color="text.secondary">Embroidery & Printing</Typography>
                    </Breadcrumbs>
                    <Chip
                      size="small"
                      label={`${filteredSorted.length} ${filteredSorted.length === 1 ? "document" : "documents"}`}
                      sx={styles.subtleChip}
                    />
                    {lastLoadedAt && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                        <TimeIcon fontSize="inherit" /> Updated {formatDate(lastLoadedAt)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Right cluster: View/Filter/Sort/Refresh */}
              <Box display="flex" alignItems="center" gap={1.1} flexWrap="wrap">
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={view}
                  onChange={(_, v) => v && setView(v)}
                  sx={{
                    borderRadius: 2,
                    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                    overflow: "hidden"
                  }}
                >
                  <ToggleButton value="grid" sx={{ px: 1.4 }}>
                    <GridIcon fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="list" sx={{ px: 1.4 }}>
                    <ListIcon fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>

                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() =>
                    setExtFilter((prev) => {
                      const order = ["ALL", "DOCX", "PDF", "XLSX", "PPTX"];
                      const next = order[(order.indexOf(prev) + 1) % order.length];
                      return next;
                    })
                  }
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
                >
                  {extFilter === "ALL" ? "All Types" : extFilter}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<SortIcon />}
                  onClick={(e) => setAnchorSort(e.currentTarget)}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
                >
                  {sortBy === "modified_desc" ? "Latest" : sortBy === "name_asc" ? "A → Z" : "Size"}
                </Button>
                <Menu anchorEl={anchorSort} open={Boolean(anchorSort)} onClose={() => setAnchorSort(null)}>
                  <MenuItem
                    selected={sortBy === "modified_desc"}
                    onClick={() => {
                      setSortBy("modified_desc");
                      setAnchorSort(null);
                    }}
                  >
                    Latest updated
                  </MenuItem>
                  <MenuItem
                    selected={sortBy === "name_asc"}
                    onClick={() => {
                      setSortBy("name_asc");
                      setAnchorSort(null);
                    }}
                  >
                    Name (A → Z)
                  </MenuItem>
                  <MenuItem
                    selected={sortBy === "size_desc"}
                    onClick={() => {
                      setSortBy("size_desc");
                      setAnchorSort(null);
                    }}
                  >
                    Size (large first)
                  </MenuItem>
                </Menu>

                <Button
                  variant="contained"
                  startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                  onClick={fetchFiles}
                  disabled={refreshing}
                  sx={{ borderRadius: 2, fontWeight: 800 }}
                >
                  Refresh
                </Button>
              </Box>
            </Box>

            {/* Search */}
            <Box mt={2}>
              <TextField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents by name…"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <Tooltip title="Clear">
                        <IconButton size="small" onClick={() => setSearch("")}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    transition: "box-shadow .18s ease",
                    "&:focus-within": {
                      boxShadow: (t) => `0 0 0 3px ${alpha(t.palette.primary.main, 0.15)}`
                    }
                  },
                }}
              />
            </Box>
          </Paper>
        </Box>

        {/* Content */}
        {refreshing ? (
          <SkeletonGrid />
        ) : filteredSorted.length === 0 ? (
          <Paper sx={styles.emptyState}>
            <Box
              sx={{
                display: "inline-flex",
                p: 2,
                mb: 2,
                borderRadius: "50%",
                bgcolor: alpha(theme.palette.text.secondary, 0.1),
                color: theme.palette.text.secondary,
              }}
            >
              <FileIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h6" fontWeight={900} gutterBottom>
              {debounced ? "No matches found" : "No documents available"}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 520, mx: "auto", mb: 2 }}>
              {debounced
                ? "Try a different keyword or clear filters to see more results."
                : "The library is currently empty. Click Refresh or try again later."}
            </Typography>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchFiles} sx={{ borderRadius: 2, fontWeight: 800 }}>
              Refresh
            </Button>
          </Paper>
        ) : view === "grid" ? (
          <Grid container spacing={2.5}>
            {filteredSorted.map((file) => (
              <Grid key={file.id} item xs={12} sm={6} md={4} lg={3}>
                <DocumentCard
                  file={file}
                  onPreview={(id) => {
                    setPreviewId(id);
                    setPreviewError(null);
                    setRetryCount(0);
                  }}
                  onDownload={getDownloadUrl}
                  onOpenNew={handleOpenInNewTab}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper
            sx={{
              borderRadius: 3,
              border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(10px)",
            }}
          >
            <List sx={{ p: 1.5 }}>
              {filteredSorted.map((file) => (
                <DocumentListItem
                  key={file.id}
                  file={file}
                  onPreview={(id) => {
                    setPreviewId(id);
                    setPreviewError(null);
                    setRetryCount(0);
                  }}
                  onDownload={getDownloadUrl}
                  onOpenNew={handleOpenInNewTab}
                />
              ))}
            </List>
          </Paper>
        )}

        {/* Preview dialog */}
        <Dialog
          open={Boolean(previewId)}
          onClose={() => {
            setPreviewId(null);
            setPreviewError(null);
          }}
          fullWidth
          maxWidth="xl"
          PaperProps={{
            sx: styles.previewDialog
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              py: 1,
              px: 2,
              borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Tooltip title="Back to page">
                <IconButton
                  onClick={() => {
                    setPreviewId(null);
                    setPreviewError(null);
                  }}
                  sx={styles.actionIconButton}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography variant="subtitle1" fontWeight={900}>
                Document Preview
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenNewIcon />}
                onClick={() => previewId && handleOpenInNewTab(previewId)}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
              >
                Open in Tab
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<DownloadIcon />}
                href={previewId ? getDownloadUrl(previewId) : "#"}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
              >
                Download
              </Button>
              <IconButton
                onClick={() => {
                  setPreviewId(null);
                  setPreviewError(null);
                }}
                sx={{
                  borderRadius: 2,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.error.main, 0.12),
                    color: theme.palette.error.main,
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent
            sx={{
              p: 0,
              flex: 1,
              display: "flex",
              alignItems: "stretch",
              justifyContent: "stretch",
              backgroundColor: theme.palette.background.default,
            }}
          >
            <AnimatePresence>
              {previewError ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ width: "100%", padding: 24 }}
                >
                  <Box sx={{ maxWidth: 520, mx: "auto", textAlign: "center" }}>
                    <Box
                      sx={{
                        display: "inline-flex",
                        p: 2,
                        mb: 2,
                        borderRadius: "50%",
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: theme.palette.error.main,
                      }}
                    >
                      <ErrorIcon sx={{ fontSize: 48 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={900} gutterBottom>
                      Preview Unavailable
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      {previewError}
                    </Typography>
                    <Box display="flex" gap={1.25} justifyContent="center">
                      <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        href={previewId ? getDownloadUrl(previewId) : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
                      >
                        Download
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<OpenNewIcon />}
                        onClick={() => handleOpenInNewTab(previewId)}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
                      >
                        Open in New Tab
                      </Button>
                    </Box>
                  </Box>
                </motion.div>
              ) : (
                previewId && (
                  <motion.div
                    key={`prev-${retryCount}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <iframe
                      title="doc-preview"
                      src={getPreviewUrl(previewId)}
                      style={{ width: "100%", height: "100%", border: 0, minHeight: 600 }}
                      onError={handlePreviewError}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      allowFullScreen
                    />
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>
      </Box>
    </Fade>
  );
};

export default TrainingandDevelopment;
