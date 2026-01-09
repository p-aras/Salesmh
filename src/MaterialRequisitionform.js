import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import jsPDF from 'jspdf';

const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const SPREADSHEET_ID = "1fKSwGBIpzWEFk566WRQ4bzQ0anJlmasoY8TwrTLQHXI";

const MaterialRequisitionForm = () => {
  // State for the form
  const [lotNumber, setLotNumber] = useState("");
  const [jobOrderData, setJobOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allJobOrders, setAllJobOrders] = useState([]);
  
  // State for garment type categories
  const [garmentCategories, setGarmentCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  
  // Material requirements state
  const [materialRequirements, setMaterialRequirements] = useState([]);
  
  // UI State
  const [notification, setNotification] = useState(null);
  
  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);
  
  const fetchAllData = async () => {
    try {
      setLoadingCategories(true);
      setError("");
      setCategoriesError("");
      
      // Fetch Job Orders
      const jobOrdersResponse = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/JobOrder?key=${API_KEY}`
      );
      
      if (jobOrdersResponse.data.values && jobOrdersResponse.data.values.length > 1) {
        const headers = jobOrdersResponse.data.values[0];
        const rows = jobOrdersResponse.data.values.slice(1);
        
        const jobOrders = rows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || "";
          });
          return obj;
        });
        
        setAllJobOrders(jobOrders);
      }
      
      // Fetch Garment Material Categories
      try {
        const categoriesResponse = await axios.get(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/GarmentMaterialCategories?key=${API_KEY}`
        );
        
        if (categoriesResponse.data.values && categoriesResponse.data.values.length > 1) {
          const catHeaders = categoriesResponse.data.values[0];
          const catRows = categoriesResponse.data.values.slice(1);
          
          const categories = catRows.map(row => {
            const obj = {};
            catHeaders.forEach((header, index) => {
              obj[header] = row[index] || "";
            });
            return obj;
          });
          
          setGarmentCategories(categories);
        } else {
          setCategoriesError("No garment categories found.");
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
        setCategoriesError("Failed to load garment categories.");
      }
      
    } catch (err) {
      console.error("Error fetching data:", err);
      if (err.response?.status === 404) {
        setCategoriesError("GarmentMaterialCategories sheet not found.");
      } else {
        setError("Failed to fetch data. Please check your connection.");
      }
    } finally {
      setLoadingCategories(false);
    }
  };
  
  // Get material categories for a specific garment type
  const getGarmentCategories = (garmentType) => {
    if (!garmentType || !garmentCategories.length) return [];
    
    const garmentData = garmentCategories.find(
      item => item["Garment Type"] && 
      item["Garment Type"].toUpperCase().trim() === garmentType.toUpperCase().trim()
    );
    
    if (!garmentData) return [];
    
    // Extract all categories (Category 1 through Category 25)
    const categories = [];
    for (let i = 1; i <= 25; i++) {
      const categoryKey = `Category ${i}`;
      const category = garmentData[categoryKey];
      if (category && category.toString().trim() !== "") {
        categories.push(category.toString().trim());
      }
    }
    
    return categories;
  };
  
  // Filter default materials
  const filterDefaultMaterials = (allMaterials, jobOrderData) => {
    const defaultKeywords = ['label', 'tag', 'zip', 'zipper', 'button', 'tape', 'lace'];
    
    const defaultMaterials = allMaterials.filter(material => {
      const lowerMaterial = material.toLowerCase();
      return defaultKeywords.some(keyword => lowerMaterial.includes(keyword));
    });
    
    return defaultMaterials;
  };
  
  // Generate description based on material type and job order data
  const generateDescription = (materialType, jobOrder) => {
    if (!jobOrder) return materialType;
    
    const lowerType = materialType.toLowerCase();
    const brand = jobOrder["Brand"] || "";
    const garmentType = jobOrder["Garment Type"] || "";
    const shade = jobOrder["Shade"] || "";
    const component = jobOrder["Component"] || "";
    const buttonType = jobOrder["Button Type"] || "";
    
    if (lowerType.includes('zip') || lowerType.includes('zipper')) {
      return `${brand ? brand + ' ' : ''}Zipper for ${garmentType}`;
    }
    
    if (lowerType.includes('tag')) {
      if (lowerType.includes('tag size')) {
        return `${brand ? brand + ' ' : ''}Size Tag for ${garmentType}`;
      }
      return `${brand ? brand + ' ' : ''}${materialType} for ${garmentType}`;
    }
    
    if (lowerType.includes('label')) {
      if (lowerType.includes('care label')) {
        return `${brand ? brand + ' ' : ''}Care Label for ${garmentType}`;
      }
      if (lowerType.includes('main label')) {
        return `${brand ? brand + ' ' : ''}Main Label for ${garmentType}`;
      }
      return `${brand ? brand + ' ' : ''}Label for ${garmentType}`;
    }
    
    if (lowerType.includes('button')) {
      const buttonDesc = buttonType ? `${buttonType} Button` : 'Button';
      return `${brand ? brand + ' ' : ''}${buttonDesc} for ${garmentType}`;
    }
    
    if (lowerType.includes('thread')) {
      return `${materialType} for ${garmentType} ${shade ? '| Shade: ' + shade : ''}`;
    }
    
    let description = `${materialType} for ${garmentType}`;
    if (component && component.trim() !== "" && component.trim() !== "Main") {
      description = `${materialType} for ${component} (${garmentType})`;
    }
    
    if (brand && !description.includes(brand)) {
      description = `${brand} ${description}`;
    }
    
    return description;
  };
  
  // Handle lot number input
  const handleLotNumberChange = (e) => {
    const value = e.target.value;
    setLotNumber(value);
    
    if (value.trim() === "") {
      setJobOrderData(null);
      setMaterialRequirements([]);
      return;
    }
    
    // Find job order by lot number
    const foundJobOrder = allJobOrders.find(order => 
      order["Lot Number"] && 
      order["Lot Number"].toString().trim() === value.trim()
    );
    
    if (foundJobOrder) {
      setJobOrderData(foundJobOrder);
      setError("");
      
      const garmentType = foundJobOrder["Garment Type"];
      const partyName = foundJobOrder["Party Name"] || "";
      const brand = foundJobOrder["Brand"] || "";
      const shade = foundJobOrder["Shade"] || "";
      const component = foundJobOrder["Component"] || "";
      const buttonType = foundJobOrder["Button Type"] || "";
      
      if (!garmentType) {
        setError("No Garment Type found in this job order");
        setMaterialRequirements([]);
        return;
      }
      
      const allCategories = getGarmentCategories(garmentType);
      
      if (allCategories.length === 0) {
        setError(`No material categories found for garment type: ${garmentType}`);
        setMaterialRequirements([]);
        return;
      }
      
      const defaultMaterials = filterDefaultMaterials(allCategories, foundJobOrder);
      
      const newRequirements = defaultMaterials.map((materialType, index) => {
        const description = generateDescription(materialType, foundJobOrder);
        
        let remarks = `Required for ${partyName} ${brand} order`;
        if (shade) remarks += ` | Shade: ${shade}`;
        if (component && component.trim() !== "" && component.trim() !== "Main") {
          remarks += ` | Component: ${component}`;
        }
        if (buttonType && materialType.toLowerCase().includes('button')) {
          remarks += ` | Button Type: ${buttonType}`;
        }
        
        return {
          id: index + 1,
          materialType: materialType,
          description: description,
          unit: getDefaultUnit(materialType),
          availableInStock: "No",
          passDate: "",
          ordered: "",
          received: "Pending",
          status: "Pending",
          remarks: remarks,
          garmentType: garmentType,
          component: component || "Main",
          isCustom: false
        };
      });
      
      setMaterialRequirements(newRequirements);
      showNotification(`Loaded ${newRequirements.length} default materials`, "success");
      
    } else {
      setJobOrderData(null);
      setMaterialRequirements([]);
      setError(`No job order found with Lot Number: ${value}`);
    }
  };
  
  // Get default unit based on material type
  const getDefaultUnit = (materialType) => {
    const lowerType = materialType.toLowerCase();
    
    if (lowerType.includes('fabric') || lowerType.includes('rib') || lowerType.includes('tape') || 
        lowerType.includes('elastic') || lowerType.includes('cord') || lowerType.includes('lace')) {
      return "Meter";
    }
    if (lowerType.includes('thread')) {
      return "Kg";
    }
    return "Piece";
  };
  
  // Update material requirement row
  const updateMaterialRow = (id, field, value) => {
    const updatedRequirements = materialRequirements.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        if (field === 'materialType') {
          updatedItem.description = generateDescription(value, jobOrderData);
          updatedItem.unit = getDefaultUnit(value);
        }
        
        if (field === 'ordered' && value && updatedItem.status === 'Pending') {
          updatedItem.status = 'Pending';
        }
        
        if (field === 'received' && value && value !== 'Pending' && value !== 'NA') {
          updatedItem.status = 'OK';
        }
        
        if (field === 'received' && value === 'NA') {
          updatedItem.status = 'Pending';
        }
        
        if (field === 'passDate' && value && updatedItem.status === 'Pending') {
          updatedItem.status = 'OK';
        }
        
        return updatedItem;
      }
      return item;
    });
    setMaterialRequirements(updatedRequirements);
  };
  
  // Remove material requirement row
  const removeMaterialRow = (id) => {
    const itemToRemove = materialRequirements.find(item => item.id === id);
    if (itemToRemove?.isCustom || materialRequirements.length > 1) {
      const updatedRequirements = materialRequirements.filter(item => item.id !== id);
      setMaterialRequirements(updatedRequirements);
      showNotification("Material removed", "info");
    }
  };
  
  // Get all unique material types from categories
  const allMaterialTypes = useMemo(() => {
    const types = new Set();
    garmentCategories.forEach(cat => {
      for (let i = 1; i <= 25; i++) {
        const type = cat[`Category ${i}`];
        if (type && type.trim()) {
          types.add(type.trim());
        }
      }
    });
    return Array.from(types).sort();
  }, [garmentCategories]);
  
  // Get available materials for dropdown
  const getAvailableMaterialsForDropdown = () => {
    const currentMaterials = materialRequirements.map(item => item.materialType);
    return allMaterialTypes.filter(type => !currentMaterials.includes(type));
  };
  
  // Add custom material row
  const addCustomMaterialRow = () => {
    const availableMaterials = getAvailableMaterialsForDropdown();
    if (availableMaterials.length === 0) {
      showNotification("All available materials have already been added!", "warning");
      return;
    }
    
    const newId = materialRequirements.length > 0 
      ? Math.max(...materialRequirements.map(item => item.id)) + 1 
      : 1;
    
    const component = jobOrderData?.Component || "Main";
    const selectedMaterial = availableMaterials[0];
    
    setMaterialRequirements([
      ...materialRequirements,
      { 
        id: newId, 
        materialType: selectedMaterial,
        description: generateDescription(selectedMaterial, jobOrderData),
        unit: getDefaultUnit(selectedMaterial),
        availableInStock: "No",
        passDate: "",
        ordered: "",
        received: "Pending",
        status: "Pending",
        remarks: "",
        component: component,
        isCustom: true
      }
    ]);
    showNotification("Custom material added", "success");
  };
  
  // Calculate totals for summary
  const calculateTotals = () => {
    const totals = {
      totalMaterials: materialRequirements.length,
      pending: 0,
      ok: 0,
      ordered: 0,
      received: 0,
      passed: 0,
      custom: 0,
      default: 0
    };
    
    materialRequirements.forEach(item => {
      if (item.status === 'Pending') totals.pending++;
      if (item.status === 'OK') totals.ok++;
      if (item.ordered) totals.ordered++;
      if (item.received && item.received !== 'Pending' && item.received !== 'NA') totals.received++;
      if (item.passDate) totals.passed++;
      if (item.isCustom) totals.custom++;
      else totals.default++;
    });
    
    return totals;
  };
  
  // Generate CSV Report
  const generateCSVReport = () => {
    if (!jobOrderData || materialRequirements.length === 0) {
      showNotification("Please enter a valid Lot Number first", "warning");
      return;
    }
    
    const totals = calculateTotals();
    const today = new Date().toISOString().split('T')[0];
    
    const csvContent = [
      ["MATERIAL REQUISITION PLAN", "", "", "", "", "", "", "", ""],
      [`Lot Number: ${lotNumber}`, `Job Order: ${jobOrderData["Job Order No"]}`, `Garment Type: ${jobOrderData["Garment Type"]}`, `Party: ${jobOrderData["Party Name"]}`, `Brand: ${jobOrderData["Brand"]}`, `Quantity: ${jobOrderData["Quantity"]}`, `Date: ${today}`, `Component: ${jobOrderData["Component"] || "Main"}`, ""],
      ["", "", "", "", "", "", "", "", ""],
      ["Sr.", "Material Type", "Description", "Unit", "Available in Stock", "Pass Date", "Ordered Date", "Received", "Status", "Remarks", "Type"]
    ];
    
    materialRequirements.forEach((item, index) => {
      csvContent.push([
        index + 1,
        item.materialType,
        item.description,
        item.unit,
        item.availableInStock,
        item.passDate || "-",
        item.ordered || "-",
        item.received,
        item.status,
        item.remarks || "-",
        item.isCustom ? "Custom" : "Default"
      ]);
    });
    
    csvContent.push(["", "", "", "", "", "", "", "", "", "", ""]);
    csvContent.push(["SUMMARY", "", "", "", "", "", "", "", "", "", ""]);
    csvContent.push(["Total Materials", totals.totalMaterials, "", "", "", "", "", "", "", "", ""]);
    csvContent.push(["Default Materials", totals.default, "", "", "", "", "", "", "", "", ""]);
    csvContent.push(["Custom Materials", totals.custom, "", "", "", "", "", "", "", "", ""]);
    csvContent.push(["Pending", totals.pending, "", "", "", "", "", "", "", "", ""]);
    csvContent.push(["Ordered", totals.ordered, "", "", "", "", "", "", "", "", ""]);
    csvContent.push(["Received", totals.received, "", "", "", "", "", "", "", "", ""]);
    csvContent.push(["Passed", totals.passed, "", "", "", "", "", "", "", "", ""]);
    csvContent.push(["OK", totals.ok, "", "", "", "", "", "", "", "", ""]);
    
    const csv = csvContent.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MRP_${lotNumber}_${today}.csv`;
    a.click();
    
    showNotification(`MRP CSV generated for Lot ${lotNumber}`, "success");
  };
  
  // Generate PDF Report
// Generate PDF Report
// Generate PDF Report
// Generate PDF Report
const generatePDFReport = () => {
  if (!jobOrderData || materialRequirements.length === 0) {
    showNotification("Please enter a valid Lot Number first", "warning");
    return;
  }

  try {
    showNotification("Generating PDF...", "info");
    
    // Create new jsPDF instance
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Header
    pdf.setFillColor(30, 58, 138);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("MATERIAL REQUISITION PLAN", pageWidth / 2, 15, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 20);
    pdf.text(`Lot No: ${lotNumber}`, pageWidth - 15, 20, { align: 'right' });
    
    // Company Info
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("FASHION PRODUCTION MANAGEMENT SYSTEM", pageWidth / 2, 35, { align: 'center' });
    
    // Job Order Details
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    let y = 45;
    
    const jobDetails = [
      `Job Order No: ${jobOrderData["Job Order No"] || "N/A"}`,
      `Party: ${jobOrderData["Party Name"] || "N/A"}`,
      `Brand: ${jobOrderData["Brand"] || "N/A"}`,
      `Garment Type: ${jobOrderData["Garment Type"] || "N/A"}`,
      `Quantity: ${jobOrderData["Quantity"] || "0"} ${jobOrderData["Unit"] || ""}`,
      `Component: ${jobOrderData["Component"] || "Main"}`,
      `Shade: ${jobOrderData["Shade"] || "N/A"}`,
      `Style: ${jobOrderData["Style"] || "N/A"}`
    ];
    
    jobDetails.forEach((detail, index) => {
      const x = index < 4 ? 15 : pageWidth / 2;
      const row = Math.floor(index % 4);
      pdf.text(detail, x, y + (row * 6));
    });
    
    y += 30;
    
    // Table Header
    pdf.setFillColor(241, 245, 249);
    pdf.rect(15, y, pageWidth - 30, 10, 'F');
    
    // Define column widths with more space for Description and Remarks
    const colWidths = [
      12,  // Sr. No
      35,  // Material Type
      45,  // Description
      15,  // Unit
      25,  // Available
      20,  // Pass Date
      20,  // Ordered
      20,  // Received
      18,  // Status (increased)
      55   // Remarks (increased significantly)
    ];
    
    const columns = ["Sr.", "Material Type", "Description", "Unit", "Available", "Pass Date", "Ordered", "Received", "Status", "Remarks"];
    let currentX = 15;
    
    pdf.setTextColor(31, 41, 55);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    columns.forEach((col, index) => {
      pdf.text(col, currentX + colWidths[index]/2, y + 6, { align: 'center' });
      currentX += colWidths[index];
    });
    
    y += 12;
    
    // Table Rows
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8); // Smaller font for better fitting
    
    materialRequirements.forEach((item, index) => {
      // Prepare data with proper formatting
      const rowData = [
        (index + 1).toString(),
        item.materialType,
        item.description,
        item.unit,
        item.availableInStock,
        item.passDate || "-",
        item.ordered || "-",
        item.received === "Pending" || item.received === "NA" ? item.received : "Received",
        item.status,
        item.remarks || "-"
      ];
      
      // Calculate maximum lines needed for this row
      let maxLines = 1;
      const allLines = [];
      
      rowData.forEach((data, colIndex) => {
        const cellWidth = colWidths[colIndex] - 3; // 1.5mm padding on each side
        const lines = pdf.splitTextToSize(data.toString(), cellWidth);
        allLines.push(lines);
        maxLines = Math.max(maxLines, lines.length);
      });
      
      // Calculate row height based on max lines (4mm per line)
      const rowHeight = Math.max(8, maxLines * 4); // Minimum 8mm, or more if needed
      
      // Check if we need a new page (with buffer for row height)
      if (y + rowHeight > pageHeight - 15) {
        pdf.addPage();
        y = 20;
        
        // Redraw table header on new page
        pdf.setFillColor(241, 245, 249);
        pdf.rect(15, y, pageWidth - 30, 10, 'F');
        
        currentX = 15;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        columns.forEach((col, i) => {
          pdf.text(col, currentX + colWidths[i]/2, y + 6, { align: 'center' });
          currentX += colWidths[i];
        });
        
        y += 12;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
      }
      
      // Alternate row colors
      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(15, y, pageWidth - 30, rowHeight, 'F');
      }
      
      // Draw each cell
      currentX = 15;
      rowData.forEach((data, colIndex) => {
        const cellWidth = colWidths[colIndex];
        const lines = allLines[colIndex];
        
        // Draw each line with proper vertical spacing
        lines.forEach((line, lineIndex) => {
          const lineY = y + 3 + (lineIndex * 4); // Start 3mm from top, 4mm between lines
          pdf.text(line, currentX + 1.5, lineY, { maxWidth: cellWidth - 3 });
        });
        
        // Draw cell border
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(currentX, y, cellWidth, rowHeight, 'S');
        
        currentX += cellWidth;
      });
      
      // Move to next row position
      y += rowHeight;
    });
    
    y += 10;
    
    // Summary Section - only if we have space
    if (y < pageHeight - 50) {
      const totals = calculateTotals();
      pdf.setFillColor(241, 245, 249);
      pdf.rect(15, y, pageWidth - 30, 25, 'F');
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("SUMMARY", pageWidth / 2, y + 8, { align: 'center' });
      
      y += 12;
      pdf.setFontSize(9);
      
      const summaryLines = [
        `Total Materials: ${totals.totalMaterials} | Default: ${totals.default} | Custom: ${totals.custom}`,
        `Status: ${totals.ok} OK | ${totals.pending} Pending`,
        `Progress: ${totals.ordered} Ordered | ${totals.received} Received | ${totals.passed} Passed`,
        `Completion: ${Math.round((totals.ok / totals.totalMaterials) * 100)}%`
      ];
      
      summaryLines.forEach((text, index) => {
        pdf.text(text, pageWidth / 2, y + (index * 4), { align: 'center' });
      });
    }
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text("Confidential - Fashion Production Management System © 2024", pageWidth / 2, pageHeight - 5, { align: 'center' });
    
    // Save PDF
    const today = new Date().toISOString().split('T')[0];
    pdf.save(`MRP_${lotNumber}_${today}.pdf`);
    showNotification("PDF report generated successfully!", "success");
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    showNotification("Failed to generate PDF. Please try again.", "error");
  }
};
  
  // Quick Actions
  const markAllAsOrdered = () => {
    const today = new Date().toISOString().split('T')[0];
    const updatedRequirements = materialRequirements.map(item => ({
      ...item,
      ordered: today,
      status: 'Pending'
    }));
    setMaterialRequirements(updatedRequirements);
    showNotification("All materials marked as ordered", "success");
  };
  
  const markAllAsReceived = () => {
    const today = new Date().toISOString().split('T')[0];
    const updatedRequirements = materialRequirements.map(item => ({
      ...item,
      received: today,
      status: 'OK'
    }));
    setMaterialRequirements(updatedRequirements);
    showNotification("All materials marked as received", "success");
  };
  
  const markAllAsPassed = () => {
    const today = new Date().toISOString().split('T')[0];
    const updatedRequirements = materialRequirements.map(item => ({
      ...item,
      passDate: today,
      status: 'OK'
    }));
    setMaterialRequirements(updatedRequirements);
    showNotification("All materials marked as passed", "success");
  };
  
  // Reset form
  const resetForm = () => {
    setLotNumber("");
    setJobOrderData(null);
    setMaterialRequirements([]);
    setError("");
    showNotification("Form reset successfully", "info");
  };
  
  // Refresh data
  const refreshData = () => {
    fetchAllData();
    showNotification("Data refreshed", "info");
  };
  
  // Get today's date
  const getToday = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  const totals = calculateTotals();
  const availableMaterialsCount = getAvailableMaterialsForDropdown().length;

  return (
    <div style={styles.container}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          
          .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease;
          }
          
          .notification.success {
            background: linear-gradient(135deg, #10b981, #059669);
          }
          
          .notification.error {
            background: linear-gradient(135deg, #ef4444, #dc2626);
          }
          
          .notification.warning {
            background: linear-gradient(135deg, #f59e0b, #d97706);
          }
          
          .notification.info {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          }
          
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .progress-bar {
            height: 8px;
            background-color: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
          }
          
          .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease;
          }
          
          .card-hover {
            transition: all 0.3s ease;
          }
          
          .card-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          }
          
          .btn-hover {
            transition: all 0.2s ease;
          }
          
          .btn-hover:hover {
            transform: translateY(-1px);
          }
          
          /* Table scroll styling */
          .table-container {
            position: relative;
          }
          
          .table-scroll {
            overflow-x: auto;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
          }
          
          /* Custom scrollbar */
          .table-scroll::-webkit-scrollbar {
            height: 8px;
          }
          
          .table-scroll::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          
          .table-scroll::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          
          .table-scroll::-webkit-scrollbar-thumb:hover {
            background: #a1a1a1;
          }
        `}
      </style>
      
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={styles.logo}>📦</div>
            <div>
              <h1 style={styles.title}>Material Requisition Planning</h1>
              <p style={styles.subtitle}>Manage and track material requirements for production orders</p>
            </div>
          </div>
          <button
            onClick={refreshData}
            style={styles.refreshBtn}
            className="btn-hover"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* Control Cards Row */}
      <div style={styles.controlCardsRow}>
        {/* Search Card */}
        <div style={styles.controlCard} className="card-hover">
          <h2 style={styles.cardTitle}>
            <span style={styles.icon}>🔍</span>
            Job Order Lookup
          </h2>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Lot Number</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>#</span>
              <input
                type="text"
                value={lotNumber}
                onChange={handleLotNumberChange}
                placeholder="Enter Lot Number..."
                style={styles.input}
              />
            </div>
            <p style={styles.helpText}>
              Enter the Lot Number from your Job Order sheet
            </p>
          </div>
          
          {error && (
            <div style={styles.errorBox}>
              <span style={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}
          
          {categoriesError && (
            <div style={styles.warningBox}>
              <span style={styles.warningIcon}>⚠️</span>
              {categoriesError}
            </div>
          )}
        </div>

        {/* Quick Actions Card */}
        {materialRequirements.length > 0 && (
          <div style={styles.controlCard} className="card-hover">
            <h2 style={styles.cardTitle}>
              <span style={styles.icon}>⚡</span>
              Quick Actions
            </h2>
            
            <div style={styles.quickActions}>
              <button
                onClick={markAllAsOrdered}
                style={styles.quickBtn}
                className="btn-hover"
              >
                <span>📅</span>
                Mark All as Ordered
              </button>
              
              <button
                onClick={markAllAsReceived}
                style={{...styles.quickBtn, backgroundColor: '#d1fae5', borderColor: '#a7f3d0'}}
                className="btn-hover"
              >
                <span>✅</span>
                Mark All as Received
              </button>
              
              <button
                onClick={markAllAsPassed}
                style={{...styles.quickBtn, backgroundColor: '#f3e8ff', borderColor: '#e9d5ff'}}
                className="btn-hover"
              >
                <span>📋</span>
                Mark All as Passed
              </button>
            </div>
          </div>
        )}

        {/* Export Card */}
        {materialRequirements.length > 0 && (
          <div style={styles.controlCard} className="card-hover">
            <h2 style={styles.cardTitle}>
              <span style={styles.icon}>📤</span>
              Export Options
            </h2>
            
            <div style={styles.exportActions}>
              <button
                onClick={generatePDFReport}
                style={styles.pdfBtn}
                className="btn-hover"
              >
                📄 Download PDF Report
              </button>
              
              <button
                onClick={generateCSVReport}
                style={styles.csvBtn}
                className="btn-hover"
              >
                📊 Download CSV Report
              </button>
              
              <button
                onClick={resetForm}
                style={styles.resetBtn}
                className="btn-hover"
              >
                🔄 Reset Form
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={styles.mainContent}>
        {/* Right Column - Full width now */}
        <div style={styles.rightColumn}>
          {/* Job Order Details */}
          {jobOrderData && (
            <div style={styles.card} className="card-hover">
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>
                  <span style={styles.icon}>📋</span>
                  Job Order Details
                </h2>
                <div style={styles.jobOrderBadge}>
                  Lot: {jobOrderData["Lot Number"]} • Order: {jobOrderData["Job Order No"]}
                </div>
              </div>
              
              <div style={styles.jobOrderGrid}>
                <div style={styles.jobOrderColumn}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Party Name</span>
                    <span style={styles.detailValue}>{jobOrderData["Party Name"] || "N/A"}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Brand</span>
                    <span style={styles.detailValue}>{jobOrderData["Brand"] || "N/A"}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Quantity</span>
                    <span style={styles.detailValue}>
                      {jobOrderData["Quantity"] || "0"} {jobOrderData["Unit"] || ""}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Shade</span>
                    <span style={styles.detailValue}>{jobOrderData["Shade"] || "N/A"}</span>
                  </div>
                </div>
                
                <div style={styles.jobOrderColumn}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Component</span>
                    <span style={styles.detailValue}>{jobOrderData["Component"] || "Main"}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Style</span>
                    <span style={styles.detailValue}>{jobOrderData["Style"] || "N/A"}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Button Type</span>
                    <span style={styles.detailValue}>{jobOrderData["Button Type"] || "N/A"}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Priority</span>
                    <span style={{
                      ...styles.priorityBadge,
                      backgroundColor: jobOrderData["Priority"] === "High" ? '#fee2e2' :
                                      jobOrderData["Priority"] === "Medium" ? '#fef3c7' : '#d1fae5',
                      color: jobOrderData["Priority"] === "High" ? '#dc2626' :
                            jobOrderData["Priority"] === "Medium" ? '#d97706' : '#059669'
                    }}>
                      {jobOrderData["Priority"] || "Normal"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Materials Table */}
          {materialRequirements.length > 0 && (
            <div style={styles.card} className="card-hover">
              <div style={styles.tableHeader}>
                <div style={styles.tableTitle}>
                  <h2 style={styles.cardTitle}>
                    <span style={styles.icon}>📦</span>
                    Material Requirements
                  </h2>
                  <span style={styles.materialCount}>
                    {materialRequirements.length} materials
                    {jobOrderData?.Component && ` • Component: ${jobOrderData.Component}`}
                  </span>
                </div>
                
                <button
                  onClick={addCustomMaterialRow}
                  disabled={availableMaterialsCount === 0}
                  style={styles.addMaterialBtn}
                  className="btn-hover"
                >
                  ➕ Add Custom Material ({availableMaterialsCount} available)
                </button>
              </div>
              
              <div className="table-container">
                <div className="table-scroll">
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeaderCell}>Sr.</th>
                        <th style={styles.tableHeaderCell}>Material Type</th>
                        <th style={styles.tableHeaderCell}>Description</th>
                        <th style={styles.tableHeaderCell}>Unit</th>
                        <th style={styles.tableHeaderCell}>Available in Stock</th>
                        <th style={styles.tableHeaderCell}>Pass Date</th>
                        <th style={styles.tableHeaderCell}>Ordered Date</th>
                        <th style={styles.tableHeaderCell}>Received</th>
                        <th style={styles.tableHeaderCell}>Status</th>
                        <th style={styles.tableHeaderCell}>Remarks</th>
                        <th style={styles.tableHeaderCell}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialRequirements.map((item, index) => (
                        <tr 
                          key={item.id} 
                          style={{
                            ...styles.tableRow,
                            backgroundColor: item.isCustom ? '#f0fdf4' : (index % 2 === 0 ? '#f8fafc' : 'white')
                          }}
                        >
                          <td style={styles.tableCell}>
                            <div style={styles.indexCell}>
                              {index + 1}
                              {item.isCustom && (
                                <span style={styles.customBadge}>Custom</span>
                              )}
                            </div>
                          </td>
                          
                          <td style={styles.tableCell}>
                            <select
                              value={item.materialType}
                              onChange={(e) => updateMaterialRow(item.id, 'materialType', e.target.value)}
                              style={styles.select}
                            >
                              {allMaterialTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </td>
                          
                          <td style={styles.tableCell}>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateMaterialRow(item.id, 'description', e.target.value)}
                              style={styles.inputSmall}
                              placeholder="Description"
                            />
                          </td>
                          
                          <td style={styles.tableCell}>
                            <select
                              value={item.unit}
                              onChange={(e) => updateMaterialRow(item.id, 'unit', e.target.value)}
                              style={styles.select}
                            >
                              <option value="Piece">Piece</option>
                              <option value="Meter">Meter</option>
                              <option value="Kg">Kg</option>
                              <option value="Roll">Roll</option>
                              <option value="Set">Set</option>
                              <option value="Dozen">Dozen</option>
                              <option value="Yard">Yard</option>
                              <option value="Bundle">Bundle</option>
                            </select>
                          </td>
                          
                          <td style={styles.tableCell}>
                            <select
                              value={item.availableInStock}
                              onChange={(e) => updateMaterialRow(item.id, 'availableInStock', e.target.value)}
                              style={{
                                ...styles.select,
                                backgroundColor: item.availableInStock === 'Yes' ? '#d1fae5' : 
                                               item.availableInStock === 'Partial' ? '#fef3c7' : '#fee2e2'
                              }}
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                              <option value="Partial">Partial</option>
                            </select>
                          </td>
                          
                          <td style={styles.tableCell}>
                            <input
                              type="date"
                              value={item.passDate}
                              onChange={(e) => updateMaterialRow(item.id, 'passDate', e.target.value)}
                              style={styles.inputSmall}
                              max={getToday()}
                            />
                          </td>
                          
                          <td style={styles.tableCell}>
                            <input
                              type="date"
                              value={item.ordered}
                              onChange={(e) => updateMaterialRow(item.id, 'ordered', e.target.value)}
                              style={styles.inputSmall}
                              max={getToday()}
                            />
                          </td>
                          
                          <td style={styles.tableCell}>
                            <div style={styles.receivedCell}>
                              <select
                                value={item.received === 'Pending' || item.received === 'NA' ? item.received : 'Date'}
                                onChange={(e) => {
                                  if (e.target.value === 'Date') {
                                    updateMaterialRow(item.id, 'received', getToday());
                                  } else {
                                    updateMaterialRow(item.id, 'received', e.target.value);
                                  }
                                }}
                                style={styles.select}
                              >
                                <option value="Pending">Pending</option>
                                <option value="NA">NA</option>
                                <option value="Date">Date</option>
                              </select>
                              {item.received !== 'Pending' && item.received !== 'NA' && (
                                <input
                                  type="date"
                                  value={item.received}
                                  onChange={(e) => updateMaterialRow(item.id, 'received', e.target.value)}
                                  style={styles.inputSmall}
                                  max={getToday()}
                                />
                              )}
                            </div>
                          </td>
                          
                          <td style={styles.tableCell}>
                            <select
                              value={item.status}
                              onChange={(e) => updateMaterialRow(item.id, 'status', e.target.value)}
                              style={{
                                ...styles.statusSelect,
                                backgroundColor: item.status === 'OK' ? '#d1fae5' :
                                              item.status === 'Pending' ? '#fef3c7' :
                                              item.status === 'Hold' ? '#fee2e2' : '#f3f4f6',
                                color: item.status === 'OK' ? '#065f46' :
                                      item.status === 'Pending' ? '#92400e' :
                                      item.status === 'Hold' ? '#991b1b' : '#374151'
                              }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="OK">OK</option>
                              <option value="Hold">Hold</option>
                            </select>
                          </td>
                          
                          <td style={styles.tableCell}>
                            <input
                              type="text"
                              value={item.remarks}
                              onChange={(e) => updateMaterialRow(item.id, 'remarks', e.target.value)}
                              style={styles.inputSmall}
                              placeholder="Remarks"
                            />
                          </td>
                          
                          <td style={styles.tableCell}>
                            {item.isCustom || materialRequirements.length > 1 ? (
                              <button
                                onClick={() => removeMaterialRow(item.id)}
                                style={styles.removeBtn}
                                title="Remove material"
                              >
                                🗑️
                              </button>
                            ) : (
                              <span style={styles.defaultText}>Default</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div style={styles.tableFooter}>
                <div style={styles.footerLeft}>
                  <div style={styles.instructions}>
                    <strong>💡 Instructions:</strong> Default materials are automatically loaded. Use "Add Custom Material" to add more.
                  </div>
                </div>
                <div style={styles.footerRight}>
                  <div style={styles.typeLegend}>
                    <div style={styles.legendItem}>
                      <div style={{...styles.legendColor, backgroundColor: '#dbeafe'}}></div>
                      <span>Default: {totals.default}</span>
                    </div>
                    <div style={styles.legendItem}>
                      <div style={{...styles.legendColor, backgroundColor: '#d1fae5'}}></div>
                      <span>Custom: {totals.custom}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Card */}
          {materialRequirements.length > 0 && (
            <div style={styles.card} className="card-hover">
              <h2 style={styles.cardTitle}>
                <span style={styles.icon}>📊</span>
                Summary
              </h2>
              
              <div style={styles.summaryGrid}>
                <div style={styles.summaryStat}>
                  <p style={styles.summaryLabel}>Total Materials</p>
                  <p style={styles.summaryValue}>{totals.totalMaterials}</p>
                </div>
                
                <div style={styles.summaryStat}>
                  <p style={styles.summaryLabel}>Completed</p>
                  <p style={{...styles.summaryValue, color: '#059669'}}>{totals.ok}</p>
                </div>
                
                <div style={styles.summaryStat}>
                  <p style={styles.summaryLabel}>Pending</p>
                  <p style={{...styles.summaryValue, color: '#d97706'}}>{totals.pending}</p>
                </div>
                
                <div style={styles.summaryStat}>
                  <p style={styles.summaryLabel}>Ordered</p>
                  <p style={{...styles.summaryValue, color: '#7c3aed'}}>{totals.ordered}</p>
                </div>
              </div>
              
              {/* Progress Bars */}
              <div style={styles.progressSection}>
                <div style={styles.progressItem}>
                  <div style={styles.progressLabel}>
                    <span>Overall Progress</span>
                    <span>{Math.round((totals.ok / totals.totalMaterials) * 100)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{
                        width: `${(totals.ok / totals.totalMaterials) * 100}%`,
                        background: 'linear-gradient(90deg, #3b82f6, #6366f1)'
                      }}
                    ></div>
                  </div>
                </div>
                
                <div style={styles.progressItem}>
                  <div style={styles.progressLabel}>
                    <span>Received Materials</span>
                    <span>{totals.received} of {totals.totalMaterials}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{
                        width: `${(totals.received / totals.totalMaterials) * 100}%`,
                        background: 'linear-gradient(90deg, #10b981, #059669)'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerContent}>
          <div>
            <p style={styles.footerText}>Fashion Production Management System • Version 2.0</p>
            <p style={styles.footerSubtext}>All material requisitions are tracked and managed in real-time</p>
          </div>
          <div>
            <p style={styles.footerText}>Last updated: {new Date().toLocaleDateString()}</p>
            <p style={styles.footerSubtext}>Total job orders loaded: {allJobOrders.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Updated Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #ffffffff 0%, #ffffffff 100%)',
    padding: '20px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  header: {
    maxWidth: '2000px',
    margin: '0 auto 30px'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  logo: {
    fontSize: '48px',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    width: '70px',
    height: '70px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '8px 0 0 0'
  },
  refreshBtn: {
    padding: '10px 20px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    color: '#374151',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
  },
  // New control cards row style
  controlCardsRow: {
    maxWidth: '2000px',
    margin: '0 auto 30px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  controlCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  },
  mainContent: {
    maxWidth: '2000px',
    margin: '0 auto',
    display: 'block'
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  icon: {
    fontSize: '20px'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: '8px'
  },
  inputIcon: {
    position: 'absolute',
    left: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
    color: '#9ca3af'
  },
  input: {
    width: '100%',
    padding: '12px 15px 12px 45px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    boxSizing: 'border-box',
    transition: 'all 0.3s'
  },
  helpText: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: '5px 0 0 0'
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px 15px',
    borderRadius: '8px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '15px'
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
    padding: '12px 15px',
    borderRadius: '8px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '15px'
  },
  errorIcon: {
    fontSize: '16px'
  },
  warningIcon: {
    fontSize: '16px'
  },
  quickActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  quickBtn: {
    padding: '12px 15px',
    backgroundColor: '#dbeafe',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e40af',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%'
  },
  exportActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  pdfBtn: {
    padding: '14px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center'
  },
  csvBtn: {
    padding: '14px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center'
  },
  resetBtn: {
    padding: '14px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  jobOrderBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500'
  },
  jobOrderGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  jobOrderColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid #f3f4f6'
  },
  detailLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937'
  },
  priorityBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  tableTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap'
  },
  materialCount: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  addMaterialBtn: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1200px'
  },
  tableHeaderCell: {
    padding: '12px 10px',
    backgroundColor: '#f8fafc',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '2px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
    whiteSpace: 'nowrap'
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb'
  },
  tableCell: {
    padding: '12px 10px',
    fontSize: '14px',
    verticalAlign: 'middle',
    borderRight: '1px solid #e5e7eb'
  },
  indexCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  customBadge: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500'
  },
  select: {
    width: '100%',
    padding: '8px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    minHeight: '38px',
    boxSizing: 'border-box'
  },
  inputSmall: {
    width: '100%',
    padding: '8px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    minHeight: '38px',
    boxSizing: 'border-box'
  },
  statusSelect: {
    padding: '8px',
    border: '1px solid transparent',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%'
  },
  receivedCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  removeBtn: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    width: '100%'
  },
  defaultText: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    display: 'block'
  },
  tableFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
    flexWrap: 'wrap',
    gap: '15px'
  },
  footerLeft: {
    flex: 1,
    minWidth: '300px'
  },
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  instructions: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '12px 15px',
    fontSize: '14px',
    color: '#0369a1'
  },
  typeLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#6b7280'
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '3px'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  summaryStat: {
    backgroundColor: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center'
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0'
  },
  summaryValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '10px 0 0 0'
  },
  progressSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  progressItem: {
    marginBottom: '10px'
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#374151',
    marginBottom: '8px'
  },
  footer: {
    maxWidth: '2000px',
    margin: '40px auto 0',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb'
  },
  footerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  footerText: {
    fontSize: '14px',
    color: '#374151',
    margin: '0'
  },
  footerSubtext: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: '5px 0 0 0'
  }
};

export default MaterialRequisitionForm;