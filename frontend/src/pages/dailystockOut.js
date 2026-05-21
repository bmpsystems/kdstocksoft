import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import Swal from 'sweetalert2';

const RUPEE = '\u20B9';

// Insert "Make" column after "Model No" and "Created On" after "Created By"
const STOCK_OUT_COLUMNS = [
  { header: 'SL No', key: 'sl_no' },
  { header: 'Invoice No', key: 'Invoice_No' },
  { header: 'Date', key: 'Invoice_Date' },
  { header: 'Delivery Challan', key: 'Delivery_Challan' },
  { header: 'Purpose', key: 'Purpose' },
  { header: 'Company', key: 'Company' },
  { header: 'Shipping Address', key: 'To_Address' },
  { header: 'Product Name', key: 'Product_name' },
  { header: 'Model No', key: 'Model_no' },
  // "Make" column will be inserted dynamically for "All" sheet
  { header: 'HSN Code', key: 'HSNCode' },
  { header: 'Rate', key: 'Cost_price' },
  { header: 'Quantity', key: 'Quantity' },
  { header: 'Total Price', key: 'Total_Price' },
  { header: 'Remarks', key: 'Remarks' },
  { header: 'Packing By', key: 'Packing_By' },
  { header: 'Checking By', key: 'Checking_By' },
  { header: 'Delivery By', key: 'Delivery_By' },
  { header: 'Created By', key: 'Created_By' },
  { header: 'Created On', key: 'Created_On' }, // New column
];

// Helper to insert "Make" column after "Model No" and "Created On" after "Created By"
const getAllSheetColumns = () => {
  // Insert "Make" after "Model_no"
  const idxModel = STOCK_OUT_COLUMNS.findIndex(col => col.key === 'Model_no');
  const beforeModel = STOCK_OUT_COLUMNS.slice(0, idxModel + 1);
  const afterModel = STOCK_OUT_COLUMNS.slice(idxModel + 1);

  // Insert "Created On" after "Created_By" if not already present
  // (already present in STOCK_OUT_COLUMNS above, so just insert "Make")
  return [
    ...beforeModel,
    { header: 'Make', key: 'Make' },
    ...afterModel
  ];
};

const DailyStockOut = () => {
  const [makeOptions, setMakeOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedMakeId, setSelectedMakeId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('filtered');
  const [userName, setUserName] = useState('');
  const [deptId, setDeptId] = useState(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj && userObj.name) {
          setUserName(userObj.name);
        }
        if (userObj && userObj.dept_Id !== undefined) {
          setDeptId(userObj.dept_Id);
        }
      }
    } catch (e) {
      setUserName('');
      setDeptId(null);
    }
  }, []);

  useEffect(() => {
    if (reportType === 'full') {
      setSelectedMakeId('');
      setSelectedCategoryId('');
      setCategoryOptions([]);
      setFromDate('');
      setToDate('');
    }
  }, [reportType]);

  useEffect(() => {
    axios
      .get('https://kdstocksoft.onrender.com/make-helper')
      .then((res) => setMakeOptions(res.data))
      .catch(() => setMakeOptions([]));
  }, []);

  useEffect(() => {
    if (!selectedMakeId) {
      setCategoryOptions([]);
      setSelectedCategoryId('');
      return;
    }
    axios
      .post('https://kdstocksoft.onrender.com/product-category-helper', { make_Id: Number(selectedMakeId) })
      .then((res) => {
        setCategoryOptions(res.data);
        if (!res.data || res.data.length === 0) {
          setSelectedCategoryId('');
        }
      })
      .catch(() => {
        setCategoryOptions([]);
        setSelectedCategoryId('');
      });
  }, [selectedMakeId]);

  const getMakeName = (id) => {
    const found = makeOptions.find(m => String(m.Id) === String(id));
    return found ? found.Make : '';
  };

  const getCategoryName = (id) => {
    const found = categoryOptions.find(c => String(c.Id) === String(id));
    return found ? found.Category : '';
  };

  const getWarehouseName = (data) => {
    if (!data || data.length === 0) return '';
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row.Warehouse) return row.Warehouse;
      if (row.warehouse) return row.warehouse;
      if (row.Name) return row.Name;
      if (row.name) return row.name;
      if (row.Warehouse_Name) return row.Warehouse_Name;
    }
    return '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getExportFileName = () => {
    let dateStr = '';
    if (fromDate && toDate) {
      const d1 = new Date(fromDate);
      const d2 = new Date(toDate);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const day1 = String(d1.getDate()).padStart(2, '0');
        const month1 = String(d1.getMonth() + 1).padStart(2, '0');
        const year1 = d1.getFullYear();
        const day2 = String(d2.getDate()).padStart(2, '0');
        const month2 = String(d2.getMonth() + 1).padStart(2, '0');
        const year2 = d2.getFullYear();
        dateStr = `${day1}-${month1}-${year1}_to_${day2}-${month2}-${year2}`;
      } else {
        dateStr = `${fromDate}_to_${toDate}`;
      }
    } else if (fromDate) {
      const d = new Date(fromDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        dateStr = `${day}-${month}-${year}`;
      } else {
        dateStr = fromDate;
      }
    } else if (toDate) {
      const d = new Date(toDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        dateStr = `${day}-${month}-${year}`;
      } else {
        dateStr = toDate;
      }
    } else {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      dateStr = `${day}-${month}-${year}`;
    }
    return `BMP Stock Out ${dateStr}.xlsx`;
  };

  const applyBorderToRange = (worksheet, columns, startRowNum, endRowNum) => {
    for (let rowIdx = startRowNum; rowIdx <= endRowNum; rowIdx++) {
      const row = worksheet.getRow(rowIdx);
      for (let colIdx = 1; colIdx <= columns.length; colIdx++) {
        const cell = row.getCell(colIdx);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }
  };

  // Helper: group by (Invoice No || Delivery Challan) && Invoice Date
  function groupByInvoiceOrChallanAndDate(groups) {
    // groups: array of { makeName, group }
    // group: { Invoice_No, Delivery_Challan, Invoice_Date, ... }
    // Key: (Invoice_No || Delivery_Challan) + Invoice_Date
    const map = new Map();
    for (const { makeName, group } of groups) {
      let key = '';
      if ((group.Invoice_No || group.Delivery_Challan) && group.Invoice_Date) {
        key = `KEY|${group.Invoice_No || group.Delivery_Challan}|${group.Invoice_Date}`;
      } else if (group.Invoice_No && !group.Invoice_Date) {
        key = `INV|${group.Invoice_No}`;
      } else if (group.Delivery_Challan && !group.Invoice_Date) {
        key = `CHL|${group.Delivery_Challan}`;
      } else if (group.Invoice_Date) {
        key = `DATE|${group.Invoice_Date}`;
      } else {
        key = `ROW|${Math.random()}`;
      }
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push({ makeName, group });
    }
    return map;
  }

  // For "All" sheet: expects an array of { makeName, data }
  // The rows should be grouped by (Invoice No || Delivery Challan) && Invoice Date
  // MODIFIED: Show invoice/delivery challan with date only once if make fields are multiple, but all product details shown
  const addAllSheetRows = (worksheet, columns, allData, startRowNum) => {
    let totalPriceSum = 0;
    let rowNum = startRowNum;
    let slNo = 1;

    // Flatten allData into a single array of { makeName, group }
    let allGroups = [];
    allData.forEach(({ makeName, data }) => {
      data.forEach(group => {
        allGroups.push({ makeName, group });
      });
    });

    // Group by (Invoice No || Delivery Challan) && Invoice Date
    const groupMap = groupByInvoiceOrChallanAndDate(allGroups);

    // Sort keys: by date ascending, then by Invoice/Challan number ascending
    const sortedKeys = Array.from(groupMap.keys()).sort((a, b) => {
      // Extract type, number, date
      const parseKey = (key) => {
        const parts = key.split('|');
        if (parts[0] === 'KEY') {
          return { type: 0, number: parts[1], date: parts[2] || '' };
        } else if (parts[0] === 'INV') {
          return { type: 1, number: parts[1], date: '' };
        } else if (parts[0] === 'CHL') {
          return { type: 2, number: parts[1], date: '' };
        } else if (parts[0] === 'DATE') {
          return { type: 3, number: '', date: parts[1] || '' };
        } else {
          return { type: 4, number: '', date: '' };
        }
      };
      const ka = parseKey(a);
      const kb = parseKey(b);
      // Sort by type (KEY first), then date, then number
      if (ka.type !== kb.type) return ka.type - kb.type;
      if (ka.date && kb.date) {
        const da = new Date(ka.date);
        const db = new Date(kb.date);
        if (!isNaN(da.getTime()) && !isNaN(db.getTime())) {
          if (da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
        }
      }
      // If both numbers are numeric, sort numerically
      if (!isNaN(Number(ka.number)) && !isNaN(Number(kb.number))) {
        return Number(ka.number) - Number(kb.number);
      }
      // Otherwise, string compare
      return String(ka.number).localeCompare(String(kb.number));
    });

    for (const key of sortedKeys) {
      const groupsForKey = groupMap.get(key);

      // Collect all product rows for this group, with makeName
      let productRows = [];
      let groupHeader = null;
      let groupHeaderMakeNames = [];
      let groupHeaderObj = null;

      // For each make/group in this invoice/challan+date group
      for (const { makeName, group } of groupsForKey) {
        // Save the first group as the group header (for invoice/challan/date etc)
        if (!groupHeader) {
          groupHeader = group;
          groupHeaderObj = { makeName, group };
        }
        if (group.prod_details && Array.isArray(group.prod_details)) {
          group.prod_details.forEach(product => {
            let total = '';
            if (
              product.Cost_price !== undefined &&
              product.Cost_price !== null &&
              product.Quantity !== undefined &&
              product.Quantity !== null &&
              !isNaN(Number(product.Cost_price)) &&
              !isNaN(Number(product.Quantity))
            ) {
              total = Number(product.Cost_price) * Number(product.Quantity);
              totalPriceSum += total;
            }
            productRows.push({
              makeName,
              product,
              group,
              total
            });
          });
        }
        if (makeName && !groupHeaderMakeNames.includes(makeName)) {
          groupHeaderMakeNames.push(makeName);
        }
      }

      // Write the group header row (invoice/challan/date etc) only once
      const mainRow = columns.map(col => {
        switch (col.key) {
          case 'sl_no': return slNo++;
          case 'Invoice_No': return groupHeader.Invoice_No || '';
          case 'Invoice_Date': return formatDate(groupHeader.Invoice_Date);
          case 'Delivery_Challan': return groupHeader.Delivery_Challan || '';
          case 'Purpose': return groupHeader.Purpose || '';
          case 'Company': return groupHeader.Company || '';
          case 'To_Address': return groupHeader.To_Address || '';
          case 'Product_name': return '';
          case 'Model_no': return '';
          case 'Make': return ''; // Only show make in product rows
          case 'HSNCode': return '';
          case 'Cost_price': return '';
          case 'Quantity': return '';
          case 'Total_Price': return '';
          case 'Remarks': return '';
          case 'Packing_By': return groupHeader.Packing_By || groupHeader.packing_by || '';
          case 'Checking_By': return groupHeader.Checking_By || groupHeader.checking_by || '';
          case 'Delivery_By': return groupHeader.Delivery_By || groupHeader.delivery_by || '';
          case 'Created_By': return groupHeader.Created_By || groupHeader.created_by || '';
          case 'Created_On': return groupHeader.Created_On ? formatDate(groupHeader.Created_On) : ''; // New column
          default: return '';
        }
      });
      worksheet.addRow(mainRow);
      rowNum++;

      // Write all product rows for this invoice/challan+date, with their make
      for (const { makeName, product, group, total } of productRows) {
        const subRow = columns.map(col => {
          switch (col.key) {
            case 'sl_no': return '';
            case 'Invoice_No': return '';
            case 'Invoice_Date': return '';
            case 'Delivery_Challan': return '';
            case 'Purpose': return '';
            case 'Company': return '';
            case 'To_Address': return '';
            case 'Product_name': return product.Product_name || '';
            case 'Model_no': return product.Model_no || '';
            case 'Make': return product.Product_name ? makeName || '' : '';
            case 'HSNCode': return product.HSNCode || '';
            case 'Cost_price':
              return product.Cost_price !== undefined && product.Cost_price !== null && product.Cost_price !== ''
                ? `${RUPEE} ${product.Cost_price}` : '';
            case 'Quantity':
              if (product.Quantity !== undefined && product.Quantity !== null && product.Unit) {
                return `${product.Quantity} ${product.Unit}`;
              } else if (product.Quantity !== undefined && product.Quantity !== null) {
                return product.Quantity;
              } else {
                return '';
              }
            case 'Total_Price':
              return total !== '' ? `${RUPEE} ${total}` : '';
            case 'Remarks':
              // Ensure Remarks from product is always shown, fallback to group if not present
              return (product.Remarks !== undefined && product.Remarks !== null)
                ? product.Remarks
                : (group.Remarks !== undefined && group.Remarks !== null ? group.Remarks : '');
            case 'Packing_By': return product.Packing_By || product.packing_by || '';
            case 'Checking_By': return product.Checking_By || product.checking_by || '';
            case 'Delivery_By': return product.Delivery_By || product.delivery_by || '';
            case 'Created_By': return product.Created_By || product.created_by || '';
            case 'Created_On': return product.Created_On ? formatDate(product.Created_On) : ''; // New column
            default: return '';
          }
        });
        worksheet.addRow(subRow);
        rowNum++;
      }
    }
    return { totalPriceSum, lastRowNum: rowNum };
  };

  // Helper: group by Invoice No + Date only for filtered/grouped sheets
  function groupDataByInvoiceNoAndDate(data) {
    // data: array of group
    // group: { Invoice_No, Invoice_Date, ... }
    // Key: Invoice_No + Invoice_Date
    const map = new Map();
    for (const group of data) {
      let key = '';
      if (group.Invoice_No && group.Invoice_Date) {
        key = `INV|${group.Invoice_No}|${group.Invoice_Date}`;
      } else if (group.Invoice_No) {
        key = `INV|${group.Invoice_No}`;
      } else if (group.Invoice_Date) {
        key = `DATE|${group.Invoice_Date}`;
      } else {
        key = `ROW|${Math.random()}`;
      }
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(group);
    }
    return map;
  }

  // For filtered/grouped sheets: group by Invoice No + Date only
  const addGroupedRows = (worksheet, columns, data, startRowNum) => {
    let totalPriceSum = 0;
    let rowNum = startRowNum;
    let slNo = 1;

    // Group data
    const groupMap = groupDataByInvoiceNoAndDate(data);

    // Sort keys: Invoice by date ascending, then by number ascending
    const sortedKeys = Array.from(groupMap.keys()).sort((a, b) => {
      // Extract type, number, date
      const parseKey = (key) => {
        const parts = key.split('|');
        if (parts[0] === 'INV') {
          return { type: 0, number: parts[1], date: parts[2] || '' };
        } else if (parts[0] === 'DATE') {
          return { type: 1, number: '', date: parts[1] || '' };
        } else {
          return { type: 2, number: '', date: '' };
        }
      };
      const ka = parseKey(a);
      const kb = parseKey(b);
      // Sort by type (INV first), then date, then number
      if (ka.type !== kb.type) return ka.type - kb.type;
      if (ka.date && kb.date) {
        const da = new Date(ka.date);
        const db = new Date(kb.date);
        if (!isNaN(da.getTime()) && !isNaN(db.getTime())) {
          if (da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
        }
      }
      // If both numbers are numeric, sort numerically
      if (!isNaN(Number(ka.number)) && !isNaN(Number(kb.number))) {
        return Number(ka.number) - Number(kb.number);
      }
      // Otherwise, string compare
      return String(ka.number).localeCompare(String(kb.number));
    });

    for (const key of sortedKeys) {
      const groupsForKey = groupMap.get(key);
      for (const group of groupsForKey) {
        // Main row (group header)
        const mainRow = columns.map(col => {
          switch (col.key) {
            case 'sl_no': return slNo++;
            case 'Invoice_No': return group.Invoice_No || '';
            case 'Invoice_Date': return formatDate(group.Invoice_Date);
            case 'Delivery_Challan': return group.Delivery_Challan || '';
            case 'Purpose': return group.Purpose || '';
            case 'Company': return group.Company || '';
            case 'To_Address': return group.To_Address || '';
            case 'Product_name': return '';
            case 'Model_no': return '';
            case 'HSNCode': return '';
            case 'Cost_price': return '';
            case 'Quantity': return '';
            case 'Total_Price': return '';
            case 'Remarks': return '';
            case 'Packing_By': return group.Packing_By || group.packing_by || '';
            case 'Checking_By': return group.Checking_By || group.checking_by || '';
            case 'Delivery_By': return group.Delivery_By || group.delivery_by || '';
            case 'Created_By': return group.Created_By || group.created_by || '';
            case 'Created_On': return group.Created_On ? formatDate(group.Created_On) : ''; // New column
            default: return '';
          }
        });
        worksheet.addRow(mainRow);
        rowNum++;

        if (group.prod_details && Array.isArray(group.prod_details)) {
          group.prod_details.forEach(product => {
            let total = '';
            if (
              product.Cost_price !== undefined &&
              product.Cost_price !== null &&
              product.Quantity !== undefined &&
              product.Quantity !== null &&
              !isNaN(Number(product.Cost_price)) &&
              !isNaN(Number(product.Quantity))
            ) {
              total = Number(product.Cost_price) * Number(product.Quantity);
              totalPriceSum += total;
            }
            const subRow = columns.map(col => {
              switch (col.key) {
                case 'sl_no': return '';
                case 'Invoice_No': return '';
                case 'Invoice_Date': return '';
                case 'Delivery_Challan': return '';
                case 'Purpose': return '';
                case 'Company': return '';
                case 'To_Address': return '';
                case 'Product_name': return product.Product_name || '';
                case 'Model_no': return product.Model_no || '';
                case 'HSNCode': return product.HSNCode || '';
                case 'Remarks':
                  // Ensure Remarks from product is always shown, fallback to group if not present
                  return (product.Remarks !== undefined && product.Remarks !== null)
                    ? product.Remarks
                    : (group.Remarks !== undefined && group.Remarks !== null ? group.Remarks : '');
                case 'Cost_price':
                  return product.Cost_price !== undefined && product.Cost_price !== null && product.Cost_price !== ''
                    ? `${RUPEE} ${product.Cost_price}` : '';
                case 'Quantity':
                  if (product.Quantity !== undefined && product.Quantity !== null && product.Unit) {
                    return `${product.Quantity} ${product.Unit}`;
                  } else if (product.Quantity !== undefined && product.Quantity !== null) {
                    return product.Quantity;
                  } else {
                    return '';
                  }
                case 'Total_Price':
                  return total !== '' ? `${RUPEE} ${total}` : '';
                case 'Packing_By': return product.Packing_By || product.packing_by || '';
                case 'Checking_By': return product.Checking_By || product.checking_by || '';
                case 'Delivery_By': return product.Delivery_By || product.delivery_by || '';
                case 'Created_By': return product.Created_By || product.created_by || '';
                case 'Created_On': return product.Created_On ? formatDate(product.Created_On) : ''; // New column
                default: return '';
              }
            });
            worksheet.addRow(subRow);
            rowNum++;
          });
        }
      }
    }
    return { totalPriceSum, lastRowNum: rowNum };
  };

  const autoSizeColumns = (worksheet, columns, dataRows) => {
    columns.forEach((col, idx) => {
      let maxLength = col.header.length;
      dataRows.forEach(row => {
        const val = row[idx];
        if (val && val.toString().length > maxLength) {
          maxLength = val.toString().length;
        }
      });
      worksheet.getColumn(idx + 1).width = Math.min(maxLength + 4, 40);
    });
  };

  const wrapTextAllColumnsFromRow = (worksheet, columns, startRowNum, endRowNum) => {
    for (let rowIdx = startRowNum; rowIdx <= endRowNum; rowIdx++) {
      const row = worksheet.getRow(rowIdx);
      for (let colIdx = 1; colIdx <= columns.length; colIdx++) {
        const cell = row.getCell(colIdx);
        cell.alignment = { ...cell.alignment, wrapText: true };
      }
    }
  };

  const addMakeWorksheet = (workbook, makeName, data, columns, showCategoryRow, categoryValue) => {
    const worksheet = workbook.addWorksheet(makeName || 'Sheet');
    const colCount = columns.length;
    const lastColLetter = String.fromCharCode(65 + colCount - 1);
    const mergeRange = `A1:${lastColLetter}1`;
    const mergeRange2 = `A2:${lastColLetter}2`;
    const mergeRange3 = `A3:${lastColLetter}3`;
    const mergeRange4 = `A4:${lastColLetter}4`;
    const mergeRange5 = `A5:${lastColLetter}5`;

    worksheet.mergeCells(mergeRange);
    worksheet.getCell('A1').value = 'Company Name : BMP Systems';
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A1').font = { bold: true, size: 14 };

    worksheet.mergeCells(mergeRange2);
    worksheet.getCell('A2').value = `Make : ${makeName}`;
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A2').font = { size: 12 };

    if (showCategoryRow) {
      worksheet.mergeCells(mergeRange3);
      worksheet.getCell('A3').value = categoryValue;
      worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getCell('A3').font = { size: 12 };
    }

    let warehouseName = '';
    for (const group of data) {
      warehouseName =
        group.Warehouse ||
        group.warehouse ||
        group.Name ||
        group.name ||
        (group.prod_details && group.prod_details[0] && (group.prod_details[0].Warehouse || group.prod_details[0].warehouse || group.prod_details[0].Name || group.prod_details[0].name)) ||
        '';
      if (warehouseName) break;
    }
    worksheet.mergeCells(showCategoryRow ? mergeRange4 : mergeRange3);
    worksheet.getCell(showCategoryRow ? 'A4' : 'A3').value = `Warehouse : ${warehouseName}`;
    worksheet.getCell(showCategoryRow ? 'A4' : 'A3').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell(showCategoryRow ? 'A4' : 'A3').font = { size: 12 };

    let invoiceDate = '';
    if (data && data.length > 0 && data[0].Invoice_Date) {
      invoiceDate = formatDate(data[0].Invoice_Date);
    } else {
      const today = new Date();
      invoiceDate = today.toLocaleDateString('en-GB');
    }
    worksheet.mergeCells(showCategoryRow ? mergeRange5 : mergeRange4);
    worksheet.getCell(showCategoryRow ? 'A5' : 'A4').value = `Date : ${invoiceDate}`;
    worksheet.getCell(showCategoryRow ? 'A5' : 'A4').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell(showCategoryRow ? 'A5' : 'A4').font = { size: 12 };

    const headerRowNum = showCategoryRow ? 6 : 5;
    worksheet.addRow(columns.map(col => col.header));
    worksheet.getRow(headerRowNum).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF00' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    const { totalPriceSum, lastRowNum } = addGroupedRows(worksheet, columns, data, headerRowNum + 1);

    const totalPriceColIdx = columns.findIndex(col => col.key === 'Total_Price') + 1;
    if (lastRowNum > headerRowNum + 1) {
      const grandTotalCell = worksheet.getCell(`${String.fromCharCode(64 + totalPriceColIdx)}${lastRowNum}`);
      grandTotalCell.value = `${RUPEE} ${totalPriceSum}`;
      grandTotalCell.font = { bold: true, size: 12 };
      grandTotalCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      grandTotalCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF00' },
      };
    }

    const allRows = [];
    for (let i = headerRowNum; i < lastRowNum; i++) {
      allRows.push(worksheet.getRow(i).values.slice(1));
    }
    autoSizeColumns(worksheet, columns, allRows);

    wrapTextAllColumnsFromRow(worksheet, columns, headerRowNum + 1, lastRowNum - 1);

    applyBorderToRange(worksheet, columns, headerRowNum, lastRowNum - 1);
    if (lastRowNum > headerRowNum + 1) {
      applyBorderToRange(worksheet, columns, lastRowNum, lastRowNum);
    }
  };

  const handleExcel = async () => {
    // Validation: At least one date (from or to) must be selected
    if (!fromDate && !toDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select a From Date or To Date before exporting the report.',
        confirmButtonColor: '#1976d2'
      });
      return;
    }
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'From Date cannot be after To Date.',
        confirmButtonColor: '#1976d2'
      });
      return;
    }
    if (reportType === 'filtered' && !selectedMakeId) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select a Make before exporting the filtered stock out report.',
        confirmButtonColor: '#1976d2'
      });
      return;
    }

    setLoading(true);
    try {
      const columns = STOCK_OUT_COLUMNS;

      if (reportType === 'full') {
        const workbook = new ExcelJS.Workbook();
        let makes = makeOptions;
        if (!makes || makes.length === 0) {
          const makeRes = await axios.get('https://kdstocksoft.onrender.com/make-helper');
          makes = makeRes.data;
        }
        let foundAnyData = false;

        // Collect all data for "All" sheet
        const allData = [];
        for (const make of makes) {
          // Build payload according to backend API: send fromDate and toDate if present
          const payload = { make_Id: make.Id };
          if (fromDate) payload.fromDate = fromDate;
          if (toDate) payload.toDate = toDate;
          // REMOVED: if (deptId !== 5 && userName) payload.name = userName;
          const response = await axios.post('https://kdstocksoft.onrender.com/daily-stock-out', payload);
          const data = response.data;

          if (data && data.length > 0) {
            foundAnyData = true;
            allData.push({ makeName: make.Make, data });
          }
        }

        if (!foundAnyData) {
          alert('No data found for any make.');
          setLoading(false);
          return;
        }

        // Add "All" sheet at first
        const allSheetColumns = getAllSheetColumns();
        // Insert "Created On" after "Created_By" if not present
        const idxCreatedBy = allSheetColumns.findIndex(col => col.key === 'Created_By');
        if (idxCreatedBy !== -1 && !allSheetColumns.some(col => col.key === 'Created_On')) {
          allSheetColumns.splice(idxCreatedBy + 1, 0, { header: 'Created On', key: 'Created_On' });
        }
        const worksheetAll = workbook.addWorksheet('All');
        const colCount = allSheetColumns.length;
        const lastColLetter = String.fromCharCode(65 + colCount - 1);
        const mergeRange = `A1:${lastColLetter}1`;
        const mergeRange2 = `A2:${lastColLetter}2`;
        const mergeRange3 = `A3:${lastColLetter}3`;
        const mergeRange4 = `A4:${lastColLetter}4`;
        const mergeRange5 = `A5:${lastColLetter}5`;

        worksheetAll.mergeCells(mergeRange);
        worksheetAll.getCell('A1').value = 'Company Name : BMP Systems';
        worksheetAll.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheetAll.getCell('A1').font = { bold: true, size: 14 };

        worksheetAll.mergeCells(mergeRange2);
        worksheetAll.getCell('A2').value = `All Makes`;
        worksheetAll.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheetAll.getCell('A2').font = { size: 12 };

        // No category row for "All" sheet
        // Warehouse name: try to get from first available group
        let warehouseName = '';
        for (const { data } of allData) {
          for (const group of data) {
            warehouseName =
              group.Warehouse ||
              group.warehouse ||
              group.Name ||
              group.name ||
              (group.prod_details && group.prod_details[0] && (group.prod_details[0].Warehouse || group.prod_details[0].warehouse || group.prod_details[0].Name || group.prod_details[0].name)) ||
              '';
            if (warehouseName) break;
          }
          if (warehouseName) break;
        }
        worksheetAll.mergeCells(mergeRange3);
        worksheetAll.getCell('A3').value = `Warehouse : ${warehouseName}`;
        worksheetAll.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheetAll.getCell('A3').font = { size: 12 };

        // Date range
        let dateHeader = '';
        if (fromDate && toDate) {
          dateHeader = `Date Range : ${formatDate(fromDate)} to ${formatDate(toDate)}`;
        } else if (fromDate) {
          dateHeader = `From Date : ${formatDate(fromDate)}`;
        } else if (toDate) {
          dateHeader = `To Date : ${formatDate(toDate)}`;
        } else {
          const today = new Date();
          dateHeader = `Today Date : ${today.toLocaleDateString('en-GB')}`;
        }
        worksheetAll.mergeCells(mergeRange4);
        worksheetAll.getCell('A4').value = dateHeader;
        worksheetAll.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheetAll.getCell('A4').font = { size: 12 };

        // Add header row
        const headerRowNum = 5;
        worksheetAll.addRow(allSheetColumns.map(col => col.header));
        worksheetAll.getRow(headerRowNum).eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        // Add all data rows (grouped by (Invoice No || Delivery Challan) && Invoice Date)
        const { totalPriceSum, lastRowNum } = addAllSheetRows(worksheetAll, allSheetColumns, allData, headerRowNum + 1);

        // Grand total
        const totalPriceColIdx = allSheetColumns.findIndex(col => col.key === 'Total_Price') + 1;
        if (lastRowNum > headerRowNum + 1) {
          const grandTotalCell = worksheetAll.getCell(`${String.fromCharCode(64 + totalPriceColIdx)}${lastRowNum}`);
          grandTotalCell.value = `${RUPEE} ${totalPriceSum}`;
          grandTotalCell.font = { bold: true, size: 12 };
          grandTotalCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          grandTotalCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' },
          };
        }

        // Auto size columns
        const allRows = [];
        for (let i = headerRowNum; i < lastRowNum; i++) {
          allRows.push(worksheetAll.getRow(i).values.slice(1));
        }
        autoSizeColumns(worksheetAll, allSheetColumns, allRows);

        wrapTextAllColumnsFromRow(worksheetAll, allSheetColumns, headerRowNum + 1, lastRowNum - 1);

        applyBorderToRange(worksheetAll, allSheetColumns, headerRowNum, lastRowNum - 1);
        if (lastRowNum > headerRowNum + 1) {
          applyBorderToRange(worksheetAll, allSheetColumns, lastRowNum, lastRowNum);
        }

        // Add each make as a separate sheet (as before)
        for (const { makeName, data } of allData) {
          addMakeWorksheet(workbook, makeName, data, columns, false, '');
        }

        const buf = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getExportFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Filtered Stock Out Report (by make/category)
        const params = {};
        if (selectedMakeId) params.make_Id = selectedMakeId;
        if (
          selectedCategoryId &&
          categoryOptions.length > 0 &&
          categoryOptions.some(cat => String(cat.Id) === String(selectedCategoryId))
        ) {
          params.pCat_Id = selectedCategoryId;
        }
        // Send fromDate and toDate if present, for correct filtering
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
        // REMOVED: if (deptId !== 5 && userName) params.name = userName;

        const response = await axios.post('https://kdstocksoft.onrender.com/daily-stock-out', params);
        const data = response.data;

        if (!data || data.length === 0) {
          alert('No data found for the selected filters.');
          setLoading(false);
          return;
        }

        // Insert "Created On" after "Created_By" if not present
        const columnsWithCreatedOn = [...columns];
        const idxCreatedBy = columnsWithCreatedOn.findIndex(col => col.key === 'Created_By');
        if (idxCreatedBy !== -1 && !columnsWithCreatedOn.some(col => col.key === 'Created_On')) {
          columnsWithCreatedOn.splice(idxCreatedBy + 1, 0, { header: 'Created On', key: 'Created_On' });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daily Stock Out Report');

        const colCount = columnsWithCreatedOn.length;
        const lastColLetter = String.fromCharCode(65 + colCount - 1);
        const mergeRange = `A1:${lastColLetter}1`;
        const mergeRange2 = `A2:${lastColLetter}2`;
        const mergeRange3 = `A3:${lastColLetter}3`;
        const mergeRange4 = `A4:${lastColLetter}4`;
        const mergeRange5 = `A5:${lastColLetter}5`;

        worksheet.mergeCells(mergeRange);
        worksheet.getCell('A1').value = 'Company Name : BMP Systems';
        worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell('A1').font = { bold: true, size: 14 };

        worksheet.mergeCells(mergeRange2);
        worksheet.getCell('A2').value = `Make : ${getMakeName(selectedMakeId)}`;
        worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell('A2').font = { size: 12 };

        let showCategoryRow = false;
        let categoryValue = '';
        if (selectedCategoryId && categoryOptions.length > 0) {
          showCategoryRow = true;
          categoryValue = `Category : ${getCategoryName(selectedCategoryId)}`;
        }

        if (showCategoryRow) {
          worksheet.mergeCells(mergeRange3);
          worksheet.getCell('A3').value = categoryValue;
          worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
          worksheet.getCell('A3').font = { size: 12 };
        }

        let warehouseName = '';
        for (const group of data) {
          warehouseName =
            group.Warehouse ||
            group.warehouse ||
            group.Name ||
            group.name ||
            (group.prod_details && group.prod_details[0] && (group.prod_details[0].Warehouse || group.prod_details[0].warehouse || group.prod_details[0].Name || group.prod_details[0].name)) ||
            '';
          if (warehouseName) break;
        }
        worksheet.mergeCells(showCategoryRow ? mergeRange4 : mergeRange3);
        worksheet.getCell(showCategoryRow ? 'A4' : 'A3').value = `Warehouse : ${warehouseName}`;
        worksheet.getCell(showCategoryRow ? 'A4' : 'A3').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell(showCategoryRow ? 'A4' : 'A3').font = { size: 12 };

        // Show date range in the header
        let dateHeader = '';
        if (fromDate && toDate) {
          dateHeader = `Date Range : ${formatDate(fromDate)} to ${formatDate(toDate)}`;
        } else if (fromDate) {
          dateHeader = `From Date : ${formatDate(fromDate)}`;
        } else if (toDate) {
          dateHeader = `To Date : ${formatDate(toDate)}`;
        } else {
          const today = new Date();
          dateHeader = `Today Date : ${today.toLocaleDateString('en-GB')}`;
        }
        worksheet.mergeCells(showCategoryRow ? mergeRange5 : mergeRange4);
        worksheet.getCell(showCategoryRow ? 'A5' : 'A4').value = dateHeader;
        worksheet.getCell(showCategoryRow ? 'A5' : 'A4').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell(showCategoryRow ? 'A5' : 'A4').font = { size: 12 };

        const headerRowNum = showCategoryRow ? 6 : 5;
        worksheet.addRow(columnsWithCreatedOn.map(col => col.header));
        worksheet.getRow(headerRowNum).eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        // Add grouped rows by Invoice No + Date, or Delivery Challan + Date
        const { totalPriceSum, lastRowNum } = addGroupedRows(worksheet, columnsWithCreatedOn, data, headerRowNum + 1);

        const totalPriceColIdx = columnsWithCreatedOn.findIndex(col => col.key === 'Total_Price') + 1;
        if (lastRowNum > headerRowNum + 1) {
          const grandTotalCell = worksheet.getCell(`${String.fromCharCode(64 + totalPriceColIdx)}${lastRowNum}`);
          grandTotalCell.value = `${RUPEE} ${totalPriceSum}`;
          grandTotalCell.font = { bold: true, size: 12 };
          grandTotalCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          grandTotalCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' },
          };
        }

        const allRows = [];
        for (let i = headerRowNum; i < lastRowNum; i++) {
          allRows.push(worksheet.getRow(i).values.slice(1));
        }
        autoSizeColumns(worksheet, columnsWithCreatedOn, allRows);

        wrapTextAllColumnsFromRow(worksheet, columnsWithCreatedOn, headerRowNum + 1, lastRowNum - 1);

        applyBorderToRange(worksheet, columnsWithCreatedOn, headerRowNum, lastRowNum - 1);
        if (lastRowNum > headerRowNum + 1) {
          applyBorderToRange(worksheet, columnsWithCreatedOn, lastRowNum, lastRowNum);
        }

        const buf = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getExportFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert('Failed to export Excel: ' + (error?.message || 'Unknown error'));
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 32 }}>Daily Stock Out Report</h2>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Report Type</label>
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          <label>
            <input
              type="radio"
              name="reportType"
              value="filtered"
              checked={reportType === 'filtered'}
              onChange={() => setReportType('filtered')}
              style={{ marginRight: 6 }}
            />
            Filtered Stock Out Report
          </label>
          <label>
            <input
              type="radio"
              name="reportType"
              value="full"
              checked={reportType === 'full'}
              onChange={() => setReportType('full')}
              style={{ marginRight: 6 }}
            />
            Full Stock Out Report
          </label>
        </div>
      </div>

      {/* From/To Date input fields */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Make</label>
        <select
          value={selectedMakeId}
          onChange={e => setSelectedMakeId(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          disabled={reportType === 'full'}
        >
          <option value="">Select Make</option>
          {makeOptions.map(make => (
            <option key={make.Id} value={make.Id}>{make.Make}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Product Category</label>
        <select
          value={selectedCategoryId}
          onChange={e => setSelectedCategoryId(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          disabled={reportType === 'full' || !selectedMakeId || categoryOptions.length === 0}
        >
          <option value="">Select Category</option>
          {categoryOptions.map(cat => (
            <option key={cat.Id} value={cat.Id}>{cat.Category}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <button
          onClick={handleExcel}
          disabled={loading}
          style={{
            padding: '10px 24px',
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          {loading ? 'Exporting...' : 'Print Excel'}
        </button>
      </div>
    </div>
  );
};

export default DailyStockOut;
