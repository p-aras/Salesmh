import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Google Sheets Configuration (for reading data)
const SPREADSHEET_ID = '1uo14nKO_yHu4AJ2rOgaJajuprcinj6xw1AUMFJ6_zYM';
const API_KEY = 'AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk';
const PACKING_REPORT_RANGE = 'Issues!A:P';

// Google Apps Script URL (for writing/updates only)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxmQfCAyFpFhf_UtElaLXWIcbPC9IyIHxlgC-PI7Lvy1cM-QUsitCxGyGMmVljLKnPRDA/exec';

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '-';
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return dateTimeString;
  }
};

const formatNumber = (num) => {
  if (!num) return '0';
  return parseInt(num).toLocaleString('en-IN');
};

const calculateProgress = (totalPcs, wipPacking, packingComplete) => {
  const total = parseInt(totalPcs) || 0;
  const wip = parseInt(wipPacking) || 0;
  const complete = parseInt(packingComplete) || 0;
  
  if (total === 0) return 0;
  return Math.round(((wip + complete) / total) * 100);
};

// Check if string is a date
const isDateString = (value) => {
  if (!value || typeof value !== 'string') return false;
  
  // Check for YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
  
  // Check for DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return true;
  
  // Check if it can be parsed as a valid date
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
};

// Check if lot number is exactly 5 digits
const isFiveDigitLot = (lotNumber) => {
  if (!lotNumber) return false;
  const cleaned = String(lotNumber).trim();
  return /^\d{5}$/.test(cleaned);
};

const UpdatePackingReport = ({ user, onNavigate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [completeDate, setCompleteDate] = useState(new Date().toISOString().split('T')[0]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [remarks, setRemarks] = useState('');
  
  const [filters, setFilters] = useState({
    packingSupervisor: '',
    brand: '',
    season: '',
    dateFrom: '',
    dateTo: '',
    status: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch data from Google Sheets API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PACKING_REPORT_RANGE}?key=${API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      
      const result = await response.json();
      const values = result.values;
      
      if (!values || values.length === 0) {
        throw new Error('No data found in the spreadsheet');
      }
      
      const rows = values.slice(1);
      
      const processedData = rows.map((row, index) => {
        const packingCompleteValue = row[9] || '';
        
        // Check if Packing Complete contains a date
        const isDate = isDateString(packingCompleteValue);
        
        let packingComplete = '0';
        let packingCompletionDate = null;
        
        if (isDate) {
          // It's a date - lot is completed
          packingCompletionDate = packingCompleteValue;
          packingComplete = row[7] || '0'; // Use total pieces as completed count
        } else {
          // It's a number
          packingComplete = packingCompleteValue;
        }
        
        const obj = { 
          id: index + 1,
          timestamp: row[0] || '',
          lotNumber: row[1] || '',
          garmentType: row[2] || '',
          fabric: row[3] || '',
          style: row[4] || '',
          packingSupervisor: row[5] || '',
          packingDate: row[6] || '',
          totalPcs: row[7] || '',
          wipPacking: row[8] || '',
          packingComplete: packingComplete,
          packingCompletionDate: packingCompletionDate,
          totalManpower: row[10] || '',
          stitchingIssueDate: row[11] || '',
          stitchingSupervisor: row[12] || '',
          brand: row[13] || '',
          season: row[14] || '',
          directStitching: row[15] || '',
          rowIndex: index + 1
        };
        
        // Calculate progress - if completed (has date), progress is 100%
        if (packingCompletionDate) {
          obj.progress = 100;
          obj.isComplete = true;
          obj.hasWIP = false;
        } else {
          obj.progress = calculateProgress(obj.totalPcs, obj.wipPacking, obj.packingComplete);
          obj.isComplete = obj.progress === 100;
          obj.hasWIP = parseInt(obj.wipPacking) > 0;
        }
        
        return obj;
      });
      
      // Filter for 5-digit lot numbers only
      const fiveDigitLotData = processedData.filter(row => isFiveDigitLot(row.lotNumber));
      
      setData(fiveDigitLotData);
      setError(null);
      
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

  // Handle complete button click
  const handleCompleteClick = (row, e) => {
    e.stopPropagation();
    setSelectedRow(row);
    setCompleteDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
    setIsCompleteDialogOpen(true);
  };

  // Handle complete lot submission
  const handleCompleteLot = async () => {
    if (!selectedRow) return;

    try {
      setIsUpdating(true);

      const supervisorName = user?.name || user?.username || 'Dashboard User';
      
      // Create URL with parameters for GET request (more reliable with Apps Script)
      const params = new URLSearchParams({
        action: 'completeLot',
        lotNumber: selectedRow.lotNumber,
        completionDate: completeDate,
        remarks: remarks,
        supervisor: supervisorName,
        timestamp: new Date().toISOString()
      });

      // Use GET request with cache busting
      const response = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}&_=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.log('Response not JSON, but request may have succeeded');
        result = { ok: true };
      }

      if (result && result.ok === false) {
        throw new Error(result.error || 'Unknown error');
      }

      // Update local state optimistically
      setData(prevData => 
        prevData.map(row => 
          row.id === selectedRow.id 
            ? { 
                ...row, 
                packingComplete: row.totalPcs,
                packingCompletionDate: completeDate,
                wipPacking: '0',
                packingDate: completeDate,
                progress: 100,
                isComplete: true,
                hasWIP: false
              } 
            : row
        )
      );

      // Close dialog
      setIsCompleteDialogOpen(false);
      setSelectedRow(null);
      setCompleteDate(new Date().toISOString().split('T')[0]);
      setRemarks('');
      
      alert(`✅ Lot #${selectedRow.lotNumber} marked as completed successfully!`);
      
      // Refresh data after 2 seconds to ensure sync
      setTimeout(() => {
        fetchData();
      }, 2000);
      
    } catch (err) {
      console.error('Error completing lot:', err);
      
      // Still update UI optimistically even if API fails
      setData(prevData => 
        prevData.map(row => 
          row.id === selectedRow.id 
            ? { 
                ...row, 
                packingComplete: row.totalPcs,
                packingCompletionDate: completeDate,
                wipPacking: '0',
                packingDate: completeDate,
                progress: 100,
                isComplete: true,
                hasWIP: false
              } 
            : row
        )
      );

      setIsCompleteDialogOpen(false);
      setSelectedRow(null);
      setCompleteDate(new Date().toISOString().split('T')[0]);
      setRemarks('');
      
      alert(`⚠️ Lot #${selectedRow.lotNumber} marked as completed in UI. Please refresh to confirm server sync.`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle cancel complete
  const handleCancelComplete = () => {
    setIsCompleteDialogOpen(false);
    setSelectedRow(null);
    setCompleteDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
  };

  // Handle back button click
  const handleBackButton = () => {
    if (onNavigate) {
      onNavigate('Welcome', user);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    const packingSupervisors = [...new Set(data.map(row => row.packingSupervisor).filter(Boolean))];
    const brands = [...new Set(data.map(row => row.brand).filter(Boolean))];
    const seasons = [...new Set(data.map(row => row.season).filter(Boolean))];
    
    return { packingSupervisors, brands, seasons };
  }, [data]);

  // Filter data based on logged-in user
  const userFilteredData = useMemo(() => {
    if (!user) return data;
    
    const supervisorName = user.name || user.username;
    if (!supervisorName) return data;
    
    return data.filter(row => {
      const rowSupervisor = row.packingSupervisor;
      return rowSupervisor && rowSupervisor.toLowerCase().includes(supervisorName.toLowerCase());
    });
  }, [data, user]);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = userFilteredData;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(row =>
        Object.entries(row).some(([key, value]) =>
          key !== 'id' && 
          String(value).toLowerCase().includes(searchLower)
        )
      );
    }

    if (filters.packingSupervisor) {
      result = result.filter(row => 
        row.packingSupervisor?.toLowerCase().includes(filters.packingSupervisor.toLowerCase())
      );
    }

    if (filters.brand) {
      result = result.filter(row => 
        row.brand?.toLowerCase().includes(filters.brand.toLowerCase())
      );
    }

    if (filters.season) {
      result = result.filter(row => 
        row.season?.toLowerCase().includes(filters.season.toLowerCase())
      );
    }

    if (filters.status) {
      switch (filters.status) {
        case 'completed':
          result = result.filter(row => row.isComplete);
          break;
        case 'in-progress':
          result = result.filter(row => !row.isComplete && row.hasWIP);
          break;
        case 'pending':
          result = result.filter(row => !row.isComplete && !row.hasWIP);
          break;
      }
    }

    if (filters.dateFrom) {
      result = result.filter(row => {
        const rowDate = new Date(row.packingDate || row.timestamp);
        const filterDate = new Date(filters.dateFrom);
        return rowDate >= filterDate;
      });
    }

    if (filters.dateTo) {
      result = result.filter(row => {
        const rowDate = new Date(row.packingDate || row.timestamp);
        const filterDate = new Date(filters.dateTo);
        return rowDate <= filterDate;
      });
    }

    return result;
  }, [userFilteredData, searchTerm, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, itemsPerPage]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredData.length;
    const totalPcs = filteredData.reduce((sum, row) => sum + (parseInt(row.totalPcs) || 0), 0);
    const totalWIP = filteredData.reduce((sum, row) => sum + (parseInt(row.wipPacking) || 0), 0);
    const totalComplete = filteredData.reduce((sum, row) => sum + (parseInt(row.packingComplete) || 0), 0);
    
    const completedOrders = filteredData.filter(row => row.isComplete).length;
    const inProgressOrders = filteredData.filter(row => !row.isComplete && row.hasWIP).length;
    const pendingOrders = filteredData.filter(row => !row.isComplete && !row.hasWIP).length;

    return {
      total,
      totalPcs,
      totalWIP,
      totalComplete,
      completedOrders,
      inProgressOrders,
      pendingOrders,
      overallProgress: totalPcs > 0 ? Math.round(((totalWIP + totalComplete) / totalPcs) * 100) : 0
    };
  }, [filteredData]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      packingSupervisor: '',
      brand: '',
      season: '',
      dateFrom: '',
      dateTo: '',
      status: ''
    });
    setSearchTerm('');
  };

  // Download Excel/CSV
  const downloadExcel = () => {
    const headers = [
      'Sr. No.',
      'Timestamp',
      'Lot Number',
      'Fabric',
      'Style',
      'Brand',
      'Season',
      'Direct Stitching',
      'Total Pcs',
      'Packing Date',
      'Packing Supervisor',
      'Status',
      'Completion Date'
    ];

    const csvData = filteredData.map((row, index) => [
      index + 1,
      formatDateTime(row.timestamp),
      row.lotNumber || '',
      row.fabric || '',
      row.style || '',
      row.brand || '',
      row.season || '',
      row.directStitching || '',
      row.totalPcs || '',
      formatDate(row.packingDate),
      row.packingSupervisor || '',
      row.isComplete ? 'Completed' : (row.hasWIP ? 'In Progress' : 'Pending'),
      row.packingCompletionDate ? formatDate(row.packingCompletionDate) : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `packing-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download PDF
  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 8;

    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.rect(margin, margin, pageWidth - (2 * margin), pageHeight - (2 * margin));

    doc.setFillColor(255, 255, 255);
    doc.rect(margin, margin, pageWidth - (2 * margin), 18, 'F');
    
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 128);
    doc.setFont('helvetica', 'bold');
    doc.text('PACKING REPORT (5-Digit Lot Numbers)', pageWidth / 2, margin + 10, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, margin + 16, { align: 'center' });

    const tableData = filteredData.map((row, index) => [
      (index + 1).toString(),
      row.lotNumber || '-',
      row.fabric || '-',
      row.style || '-',
      row.brand || '-',
      row.season || '-',
      row.directStitching || 'no',
      formatNumber(row.totalPcs),
      formatDate(row.packingDate),
      row.packingSupervisor || '-',
      row.isComplete ? 'Completed' : (row.hasWIP ? 'In Progress' : 'Pending'),
      row.packingCompletionDate ? formatDate(row.packingCompletionDate) : '-'
    ]);

    autoTable(doc, {
      head: [[
        'Sr.No.', 
        'Lot No.', 
        'Fabric', 
        'Style',
        'Brand',
        'Season',
        'Direct Stitching',
        'Total Pcs',
        'Packing Date',
        'Packing Supervisor',
        'Status',
        'Completion Date'
      ]],
      body: tableData,
      startY: margin + 25,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [80, 80, 80],
        lineWidth: 0.25,
        textColor: [0, 0, 0],
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [0, 0, 128],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        lineWidth: 0.25,
        lineColor: [150, 150, 150]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didParseCell: function(data) {
        if (data.section === 'body') {
          if (data.column.index === 6) {
            if (data.cell.raw === 'yes') {
              data.cell.styles.fillColor = [230, 230, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (data.column.index === 10) {
            const status = data.cell.raw;
            if (status === 'Completed') {
              data.cell.styles.fillColor = [200, 255, 200];
              data.cell.styles.textColor = [0, 100, 0];
            } else if (status === 'In Progress') {
              data.cell.styles.fillColor = [255, 255, 200];
              data.cell.styles.textColor = [100, 100, 0];
            } else if (status === 'Pending') {
              data.cell.styles.fillColor = [255, 200, 200];
              data.cell.styles.textColor = [100, 0, 0];
            }
          }
        }
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 18, halign: 'right' },
        8: { cellWidth: 22, halign: 'center' },
        9: { cellWidth: 25 },
        10: { cellWidth: 20, halign: 'center' },
        11: { cellWidth: 22, halign: 'center' }
      }
    });

    doc.save(`packing-report-5digit-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Get progress color
  const getProgressColor = (progress) => {
    if (progress === 100) return '#059669';
    if (progress >= 50) return '#d97706';
    if (progress > 0) return '#dc2626';
    return '#6b7280';
  };

  // User info display
  const UserInfoDisplay = () => {
    if (!user) return null;
    
    return (
      <div style={styles.userInfo}>
        <div style={styles.userAvatar}>
          {user.name?.charAt(0) || user.username?.charAt(0) || 'U'}
        </div>
        <div style={styles.userDetails}>
          <div style={styles.userName}>{user.name}</div>
          <div style={styles.userRole}>Packing Supervisor</div>
        </div>
      </div>
    );
  };

  if (loading && !data.length) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Packing Report Data (5-Digit Lots)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={styles.errorTitle}>Error Loading Data</h2>
        <p style={styles.errorText}>{error}</p>
        <button onClick={fetchData} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.dashboard}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button 
            onClick={handleBackButton}
            style={styles.backButton}
            title="Go back"
          >
            ← Back
          </button>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>Packing Report Dashboard</h1>
            <p style={styles.subtitle}>
              {user ? `Viewing packing orders for ${user.name}` : 'Showing only 5-digit lot numbers'}
            </p>
          </div>
        </div>
        <div style={styles.headerActions}>
          <UserInfoDisplay />
          <div style={styles.downloadButtons}>
            <button onClick={downloadPDF} style={styles.pdfButton}>
              📊 PDF Report
            </button>
            <button onClick={downloadExcel} style={styles.excelButton}>
              📈 Excel/CSV
            </button>
          </div>
          <button onClick={fetchData} style={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.total}</h3>
            <p style={styles.statLabel}>Total 5-Digit Lots</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👕</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{formatNumber(stats.totalPcs)}</h3>
            <p style={styles.statLabel}>Total Pieces</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{formatNumber(stats.totalComplete)}</h3>
            <p style={styles.statLabel}>Completed</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.overallProgress}%</h3>
            <p style={styles.statLabel}>Overall Progress</p>
          </div>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div style={styles.statusSummary}>
        <div style={{...styles.statusCard, backgroundColor: '#059669'}}>
          <div style={styles.statusCardContent}>
            <span style={styles.statusLabel}>Completed Orders</span>
            <span style={styles.statusValue}>{stats.completedOrders}</span>
          </div>
        </div>
        <div style={{...styles.statusCard, backgroundColor: '#d97706'}}>
          <div style={styles.statusCardContent}>
            <span style={styles.statusLabel}>In Progress</span>
            <span style={styles.statusValue}>{stats.inProgressOrders}</span>
          </div>
        </div>
        <div style={{...styles.statusCard, backgroundColor: '#dc2626'}}>
          <div style={styles.statusCardContent}>
            <span style={styles.statusLabel}>Pending</span>
            <span style={styles.statusValue}>{stats.pendingOrders}</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={styles.controlsSection}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search across all packing orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Packing Supervisor</label>
            <select
              value={filters.packingSupervisor}
              onChange={(e) => handleFilterChange('packingSupervisor', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Supervisors</option>
              {filterOptions.packingSupervisors.map(supervisor => (
                <option key={supervisor} value={supervisor}>{supervisor}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Brand</label>
            <select
              value={filters.brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Brands</option>
              {filterOptions.brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Season</label>
            <select
              value={filters.season}
              onChange={(e) => handleFilterChange('season', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Seasons</option>
              {filterOptions.seasons.map(season => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>&nbsp;</label>
            <button onClick={clearFilters} style={styles.clearButton}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Pagination Controls - Top */}
      <div style={styles.paginationSection}>
        <div style={styles.paginationInfo}>
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries (5-Digit Lots Only)
        </div>
        <div style={styles.paginationControls}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{...styles.paginationButton, ...(currentPage === 1 ? styles.disabledButton : {})}}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{...styles.paginationButton, ...(currentPage === totalPages ? styles.disabledButton : {})}}
          >
            Next
          </button>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            style={styles.pageSizeSelect}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div style={styles.tableContainer}>
        {filteredData.length === 0 ? (
          <div style={styles.noData}>
            <p style={styles.noDataText}>
              {data.length === 0 ? 'No 5-digit lot orders found' : 'No orders match your search/filters'}
            </p>
            {(searchTerm || Object.values(filters).some(f => f)) && (
              <button onClick={clearFilters} style={styles.clearSearchButton}>
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Sr. No.</th>
                  <th style={styles.tableHeader}>Timestamp</th>
                  <th style={styles.tableHeader}>Lot No.</th>
                  <th style={styles.tableHeader}>Fabric</th>
                  <th style={styles.tableHeader}>Style</th>
                  <th style={styles.tableHeader}>Brand</th>
                  <th style={styles.tableHeader}>Season</th>
                  <th style={styles.tableHeader}>Direct Stitching</th>
                  <th style={styles.tableHeader}>Total Pcs</th>
                  <th style={styles.tableHeader}>Packing Date</th>
                  <th style={styles.tableHeader}>Packing Supervisor</th>
                  <th style={styles.tableHeader}>Packing Complete</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;
                  
                  return (
                    <tr 
                      key={row.id} 
                      style={{
                        ...styles.tableRow,
                        backgroundColor: row.isComplete ? '#f0fff4' : '#ffffff',
                      }}
                    >
                      <td style={styles.srNoCell}>
                        <strong>{globalIndex + 1}</strong>
                      </td>
                      <td style={styles.tableCell}>{formatDateTime(row.timestamp)}</td>
                      <td style={styles.tableCell}>
                        <strong style={styles.lotNumber}>{row.lotNumber}</strong>
                      </td>
                      <td style={styles.tableCell}>{row.fabric}</td>
                      <td style={styles.tableCell}>{row.style}</td>
                      <td style={styles.tableCell}>{row.brand}</td>
                      <td style={styles.tableCell}>{row.season}</td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.directStitchingBadge,
                          backgroundColor: row.directStitching === 'yes' ? '#dcfce7' : '#fee2e2',
                          color: row.directStitching === 'yes' ? '#059669' : '#dc2626'
                        }}>
                          {row.directStitching}
                        </span>
                      </td>
                      <td style={styles.tableCell}><strong>{formatNumber(row.totalPcs)}</strong></td>
                      <td style={styles.tableCell}>{formatDate(row.packingDate)}</td>
                      <td style={styles.tableCell}>{row.packingSupervisor}</td>
                      <td style={styles.tableCell}>
                        {row.packingCompletionDate ? (
                          <div>
                            <span style={{color: '#059669', fontWeight: '600'}}>✓ {formatNumber(row.totalPcs)} pcs</span>
                            <div style={{fontSize: '11px', color: '#047857'}}>
                              {formatDate(row.packingCompletionDate)}
                            </div>
                          </div>
                        ) : (
                          <strong>{formatNumber(row.packingComplete)}</strong>
                        )}
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: row.packingCompletionDate ? '#dcfce7' : (row.hasWIP ? '#fef9c3' : '#fee2e2'),
                          color: row.packingCompletionDate ? '#059669' : (row.hasWIP ? '#d97706' : '#dc2626')
                        }}>
                          {row.packingCompletionDate ? 'Completed' : (row.hasWIP ? 'In Progress' : 'Pending')}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        {!row.packingCompletionDate && (
                          <button 
                            onClick={(e) => handleCompleteClick(row, e)}
                            style={styles.completeButton}
                            title="Mark as complete"
                            disabled={isUpdating}
                          >
                            ✓ Complete
                          </button>
                        )}
                        {row.packingCompletionDate && (
                          <span style={styles.completedBadge}>
                            ✓ Done
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Lot Dialog */}
      {isCompleteDialogOpen && selectedRow && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Complete Lot #{selectedRow.lotNumber}</h3>
              <button onClick={handleCancelComplete} style={styles.modalCloseButton}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.completeDialogContent}>
                <div style={styles.lotInfo}>
                  <p><strong>Lot Number:</strong> {selectedRow.lotNumber}</p>
                  <p><strong>Fabric:</strong> {selectedRow.fabric}</p>
                  <p><strong>Style:</strong> {selectedRow.style}</p>
                  <p><strong>Total Pieces:</strong> {formatNumber(selectedRow.totalPcs)}</p>
                  <p><strong>Current Progress:</strong> {selectedRow.progress}%</p>
                </div>

                <div style={styles.completeForm}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Completion Date</label>
                    <input
                      type="date"
                      value={completeDate}
                      onChange={(e) => setCompleteDate(e.target.value)}
                      style={styles.formInput}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <p style={styles.helpText}>
                      Select the date when this lot was completed
                    </p>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Remarks (Optional)</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      style={{...styles.formInput, minHeight: '80px'}}
                      placeholder="Add any remarks about the completion..."
                    />
                  </div>

                  <div style={styles.warningMessage}>
                    ⚠️ This will mark the lot as complete and set:
                    <ul style={styles.warningList}>
                      <li>Packing Complete = {formatDate(completeDate)} (completion date)</li>
                      <li>WIP Packing = 0</li>
                      <li>Packing Date = {formatDate(completeDate)}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button 
                type="button" 
                onClick={handleCancelComplete} 
                style={styles.cancelButton}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button 
                onClick={handleCompleteLot} 
                style={styles.completeConfirmButton}
                disabled={isUpdating}
              >
                {isUpdating ? 'Completing...' : '✓ Complete Lot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls - Bottom */}
      {filteredData.length > 0 && (
        <div style={styles.paginationSection}>
          <div style={styles.paginationInfo}>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries (5-Digit Lots Only)
          </div>
          <div style={styles.paginationControls}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{...styles.paginationButton, ...(currentPage === 1 ? styles.disabledButton : {})}}
            >
              Previous
            </button>
            <span style={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{...styles.paginationButton, ...(currentPage === totalPages ? styles.disabledButton : {})}}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

// Complete styles (keeping your existing styles)
const styles = {
  dashboard: {
    padding: '24px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    backgroundColor: '#ffffff',
    minHeight: '100vh',
    color: '#1e293b',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    backgroundColor: '#ffffff',
    padding: '32px',
    borderRadius: '16px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    flex: 1,
  },
  backButton: {
    padding: '12px 20px',
    backgroundColor: '#6b7280',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(107, 114, 128, 0.3)',
    minWidth: '80px',
    marginTop: '8px',
    ':hover': {
      backgroundColor: '#4b5563',
    },
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #0d007e, #00245e)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '16px',
    color: '#000000',
    margin: '0',
    fontWeight: '500',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    marginRight: '12px',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '600',
    fontSize: '14px',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
  },
  userRole: {
    fontSize: '11px',
    color: '#64748b',
  },
  downloadButtons: {
    display: 'flex',
    gap: '10px',
  },
  pdfButton: {
    padding: '12px 16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    ':hover': {
      backgroundColor: '#b91c1c',
    },
  },
  excelButton: {
    padding: '12px 16px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    ':hover': {
      backgroundColor: '#047857',
    },
  },
  refreshButton: {
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
    ':hover': {
      backgroundColor: '#2563eb',
    },
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
  },
  statIcon: {
    fontSize: '32px',
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
    lineHeight: '1',
  },
  statLabel: {
    fontSize: '14px',
    color: '#004ab3',
    margin: '0',
    fontWeight: '500',
  },
  statusSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '32px',
  },
  statusCard: {
    borderRadius: '12px',
    padding: '20px',
    color: 'white',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  statusCardContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: '16px',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: '24px',
    fontWeight: '700',
  },
  controlsSection: {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    marginBottom: '24px',
  },
  searchBox: {
    marginBottom: '20px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '16px',
    transition: 'border-color 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    ':focus': {
      borderColor: '#3b82f6',
    },
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  filterSelect: {
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    ':focus': {
      borderColor: '#3b82f6',
      outline: 'none',
    },
  },
  filterInput: {
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    ':focus': {
      borderColor: '#3b82f6',
      outline: 'none',
    },
  },
  clearButton: {
    padding: '10px 16px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '8px',
    ':hover': {
      backgroundColor: '#dc2626',
    },
  },
  paginationSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    marginBottom: '16px',
  },
  paginationInfo: {
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  paginationButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    ':hover': {
      backgroundColor: '#2563eb',
    },
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
    ':hover': {
      backgroundColor: '#9ca3af',
    },
  },
  pageInfo: {
    margin: '0 12px',
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500',
  },
  pageSizeSelect: {
    padding: '8px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    minWidth: '1600px',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    padding: '16px 12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#060038',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: '#f8fafc',
    },
  },
  srNoCell: {
    padding: '16px 12px',
    color: '#000000',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '13px',
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    padding: '16px 12px',
    color: '#000000',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
  },
  lotNumber: {
    color: '#0f172a',
    fontSize: '15px',
    fontWeight: '600',
  },
  directStitchingBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  completeButton: {
    padding: '8px 16px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: '#047857',
    },
    ':disabled': {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed',
    },
  },
  completedBadge: {
    padding: '8px 16px',
    backgroundColor: '#d1fae5',
    color: '#059669',
    border: '1px solid #a7f3d0',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#0f172a',
    margin: 0,
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#64748b',
    ':hover': {
      color: '#1e293b',
    },
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
  },
  completeDialogContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  lotInfo: {
    backgroundColor: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  completeForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  formInput: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.2s ease',
    ':focus': {
      borderColor: '#3b82f6',
      outline: 'none',
    },
  },
  helpText: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  },
  warningMessage: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '14px',
    color: '#92400e',
  },
  warningList: {
    margin: '8px 0 0 20px',
    padding: 0,
  },
  modalFooter: {
    padding: '20px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    ':hover': {
      backgroundColor: '#dc2626',
    },
    ':disabled': {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed',
    },
  },
  completeConfirmButton: {
    padding: '10px 20px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    ':hover': {
      backgroundColor: '#047857',
    },
    ':disabled': {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed',
    },
  },
  noData: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#6b7280',
  },
  noDataText: {
    fontSize: '16px',
    marginBottom: '16px',
  },
  clearSearchButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    ':hover': {
      backgroundColor: '#2563eb',
    },
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    color: '#6b7280',
  },
  spinner: {
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    fontSize: '16px',
    fontWeight: '500',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280',
  },
  errorTitle: {
    color: '#dc2626',
    marginBottom: '12px',
    fontSize: '20px',
  },
  errorText: {
    marginBottom: '20px',
    fontSize: '16px',
  },
  retryButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    ':hover': {
      backgroundColor: '#2563eb',
    },
  },
};

export default UpdatePackingReport;