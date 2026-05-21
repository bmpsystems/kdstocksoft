import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import Swal from 'sweetalert2';

const RUPEE = '\u20B9';

const DefectiveReport = () => {
  const [makeOptions, setMakeOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedMakeId, setSelectedMakeId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('filtered'); // 'filtered' or 'full'

  // When switching to "full" report, reset make and category
  useEffect(() => {
    if (reportType === 'full') {
      setSelectedMakeId('');
      setSelectedCategoryId('');
      setCategoryOptions([]);
    }
  }, [reportType]);

  // Fetch Make options
  useEffect(() => {
    axios
      .get('http://localhost:5000/make-helper')
      .then((res) => setMakeOptions(res.data))
      .catch(() => setMakeOptions([]));
  }, []);

  // Fetch Product Category options when Make changes
  useEffect(() => {
    if (!selectedMakeId) {
      setCategoryOptions([]);
      setSelectedCategoryId('');
      return;
    }
    axios
      .post('http://localhost:5000/product-category-helper', { make_Id: Number(selectedMakeId) })
      .then((res) => {
        setCategoryOptions(res.data);
        // If no categories for this make, clear selectedCategoryId
        if (!res.data || res.data.length === 0) {
          setSelectedCategoryId('');
        }
      })
      .catch(() => {
        setCategoryOptions([]);
        setSelectedCategoryId('');
      });
  }, [selectedMakeId]);

  // Helper to get Make name by Id
  const getMakeName = (id) => {
    const found = makeOptions.find(m => String(m.Id) === String(id));
    return found ? found.Make : '';
  };

  // Helper to get Category name by Id
  const getCategoryName = (id) => {
    const found = categoryOptions.find(c => String(c.Id) === String(id));
    return found ? found.Category : '';
  };

  // Helper to get Warehouse name from data (if available)
  const getWarehouseName = (data) => {
    if (data && data.length > 0) {
      if (data[0].Warehouse) return data[0].Warehouse;
      if (data[0].warehouse) return data[0].warehouse;
      if (data[0].Name) return data[0].Name;
    }
    return '';
  };

  // Helper to format number to 2 decimal places
  const format2Decimal = (num) => {
    return Number(num).toFixed(2);
  };

  // Helper to apply all borders to a range of rows and columns
  const applyAllBorders = (worksheet, startRow, endRow, startCol, endCol) => {
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        worksheet.getRow(row).getCell(col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }
  };

  // Helper to group data by category, excluding Uncategorized (pCat_Id === 0)
  const groupDataByCategory = (data) => {
    const groups = {};
    data.forEach(item => {
      // Exclude items with pCat_Id === 0 (Uncategorized)
      if (item.pCat_Id === 0) return;
      const cat = item.Category || '';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  };

  // Helper to generate a worksheet for a make, grouping products by category
  const addMakeWorksheet = (workbook, makeName, data, headers) => {
    const worksheet = workbook.addWorksheet(makeName || 'Sheet');
    const colCount = headers.length;
    const lastColLetter = String.fromCharCode(65 + colCount - 1);
    const mergeRange = `A1:${lastColLetter}1`;
    const mergeRange2 = `A2:${lastColLetter}2`;
    const mergeRange3 = `A3:${lastColLetter}3`;
    const mergeRange4 = `A4:${lastColLetter}4`;
    const mergeRange5 = `A5:${lastColLetter}5`;

    worksheet.mergeCells(mergeRange);
    worksheet.getCell('A1').value = 'BMP SYSTEMS';
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A1').font = { bold: true, size: 14 };

    worksheet.mergeCells(mergeRange2);
    worksheet.getCell('A2').value = `Make : ${makeName}`;
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A2').font = { size: 12 };

    worksheet.mergeCells(mergeRange3);
    worksheet.getCell('A3').value = 'Category : All Categories';
    worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A3').font = { size: 12 };

    const warehouseName = getWarehouseName(data);
    worksheet.mergeCells(mergeRange4);
    worksheet.getCell('A4').value = `Warehouse : ${warehouseName}`;
    worksheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A4').font = { size: 12 };

    const today = new Date();
    const todayStr = today.toLocaleDateString('en-GB');
    worksheet.mergeCells(mergeRange5);
    worksheet.getCell('A5').value = `Today Date : ${todayStr}`;
    worksheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A5').font = { size: 12 };

    // Start from row 6
    let currentRow = 6;
    let grandTotal = 0;

    // Group data by category, excluding Uncategorized
    const grouped = groupDataByCategory(data);
    let slNo = 1;

    // Columns to center align: Model_no (3), HSNCode (4), Cost_Price (5), Quantity (6), Total Price (7)
    const centerAlignCols = [3, 4, 5, 6, 7];

    Object.keys(grouped).forEach((category, catIdx) => {
      // Add category header row
      worksheet.addRow([]);
      currentRow++;
      worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = category ? `Category : ${category}` : '';
      worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 13 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.getCell(`A${currentRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD966' }, // Light yellow
      };
      worksheet.getCell(`A${currentRow}`).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Add table header row for this category
      worksheet.addRow(headers);
      currentRow++;
      worksheet.getRow(currentRow).eachCell((cell, colNumber) => {
        cell.font = { bold: true, size: 13 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF00' },
        };
        // Center align for Model_no, HSNCode, Cost_Price, Quantity, Total Price
        if (centerAlignCols.includes(colNumber)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      worksheet.getCell(`B${currentRow}`).alignment = { ...worksheet.getCell(`B${currentRow}`).alignment, wrapText: true, vertical: 'middle' };

      // Add product rows for this category
      let categoryTotal = 0;
      grouped[category].forEach((row, idx) => {
        const quantityWithUnit = row.Quantity !== undefined && row.Unit
          ? `${row.Quantity} ${row.Unit}`
          : (row.Quantity !== undefined ? row.Quantity : '');

        let costPrice = Number(row.Cost_Price) || 0;
        let quantity = Number(row.Quantity) || 0;
        let totalPrice = costPrice * quantity;
        grandTotal += totalPrice;
        categoryTotal += totalPrice;

        const costPriceWithRupee = `${RUPEE} ${row.Cost_Price !== undefined ? row.Cost_Price : ''}`;
        const totalPriceWithRupee = `${RUPEE} ${format2Decimal(totalPrice)}`;

        const addedRow = worksheet.addRow([
          slNo++,
          row.Product_name,
          row.Model_no,
          row.HSNCode,
          costPriceWithRupee,
          quantityWithUnit,
          totalPriceWithRupee
        ]);
        currentRow++;

        // Apply bigger font and all borders to product rows
        for (let col = 1; col <= colCount; col++) {
          addedRow.getCell(col).font = { size: 12 };
          addedRow.getCell(col).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          // Center align for Model_no, HSNCode, Cost_Price, Quantity, Total Price
          if (centerAlignCols.includes(col)) {
            addedRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
          }
        }
        // Wrap text for Product_name column (column 2)
        addedRow.getCell(2).alignment = { ...addedRow.getCell(2).alignment, wrapText: true, vertical: 'middle' };
      });

      // Add total row for this category (only if category is present)
      if (category) {
        worksheet.addRow([]);
        currentRow++;
        const categoryTotalText = `${RUPEE} ${format2Decimal(categoryTotal)}`;
        worksheet.addRow(['', '', '', '', '', '', categoryTotalText]);
        currentRow++;
        const totalRow = worksheet.getRow(currentRow);
        totalRow.getCell(7).font = { bold: true, size: 12 };
        totalRow.getCell(7).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD966' },
        };
        totalRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
        for (let col = 1; col <= colCount; col++) {
          totalRow.getCell(col).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          // Center align for Model_no, HSNCode, Cost_Price, Quantity, Total Price
          if (centerAlignCols.includes(col)) {
            totalRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
          }
        }
      }
    });

    // Add empty row before grand total
    worksheet.addRow([]);
    currentRow++;

    // Add grand total row
    const grandTotalText = `Grand Total Price : ${RUPEE} ${format2Decimal(grandTotal)}`;
    worksheet.addRow(['', '', '', '', '', '', grandTotalText]);
    currentRow++;
    const grandTotalRow = worksheet.getRow(currentRow);
    grandTotalRow.getCell(7).font = { bold: true, size: 13 };
    grandTotalRow.getCell(7).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF00' },
    };
    // Set grand total cell to left alignment
    grandTotalRow.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };
    for (let col = 1; col <= colCount; col++) {
      grandTotalRow.getCell(col).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      // Center align for Model_no, HSNCode, Cost_Price, Quantity, Total Price
      if (centerAlignCols.includes(col)) {
        // Only set center alignment for other columns, not for grand total cell
        if (col !== 7) {
          grandTotalRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
        }
      }
    }

    // Set column widths
    headers.forEach((header, idx) => {
      let maxLength = header.length;
      data.forEach((row, rowIdx) => {
        let val = '';
        switch (header) {
          case 'SL No':
            val = (rowIdx + 1).toString();
            break;
          case 'Product Description':
            val = row.Product_name;
            break;
          case 'Model No':
            val = row.Model_no;
            break;
          case 'HSN / SAC Code':
            val = row.HSNCode;
            break;
          case 'Cost Price':
            val = `${RUPEE} ${row.Cost_Price !== undefined ? row.Cost_Price : ''}`;
            break;
          case 'Quantity':
            val = row.Quantity !== undefined && row.Unit
              ? `${row.Quantity} ${row.Unit}`
              : (row.Quantity !== undefined ? row.Quantity : '');
            break;
          case 'Total Price':
            let costPrice = Number(row.Cost_Price) || 0;
            let quantity = Number(row.Quantity) || 0;
            val = `${RUPEE} ${format2Decimal(costPrice * quantity)}`;
            break;
          default:
            val = '';
        }
        if (val && val.toString().length > maxLength) {
          maxLength = val.toString().length;
        }
      });
      worksheet.getColumn(idx + 1).width = Math.min(maxLength + 4, 40);
    });
  };

  // Helper to get today's date in dd-mm-yyyy format for filename
  const getTodayDateForFilename = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Handle Excel Export
  const handleExcel = async () => {
    // Validation for filtered report: Make must be selected
    if (reportType === 'filtered' && !selectedMakeId) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select a Make before exporting the filtered Defective Items Report.',
        confirmButtonColor: '#1976d2'
      });
      return;
    }

    setLoading(true);
    try {
      const headers = [
        'SL No', 'Product Description', 'Model No', 'HSN / SAC Code', 'Cost Price', 'Quantity', 'Total Price'
      ];

      // Get today's date for filename
      const todayDateStr = getTodayDateForFilename();

      // --- CHANGED: Set file name based on report type ---
      let excelFileName = '';
      if (reportType === 'full') {
        excelFileName = `BMP DEFECTIVE ITEMS ${todayDateStr}.xlsx`;
      } else {
        // filtered report
        const makeName = getMakeName(selectedMakeId);
        excelFileName = `BMP DEFECTIVE ITEMS ${todayDateStr}${makeName ? ' - ' + makeName : ''}.xlsx`;
      }

      if (reportType === 'full') {
        const workbook = new ExcelJS.Workbook();

        let makes = makeOptions;
        if (!makes || makes.length === 0) {
          const makeRes = await axios.get('http://localhost:5000/make-helper');
          makes = makeRes.data;
        }

        // --- Custom order for makes ---
        // New preferred order: Ravel, Amptek, Belimo, GP, Ostberg, Easyflex
        const preferredOrder = ['Ravel', 'Amptek', 'Belimo', 'GP', 'Ostberg', 'Easyflex'];
        // Separate makes into preferred and others
        const preferredMakes = [];
        const otherMakes = [];
        makes.forEach(make => {
          if (preferredOrder.includes(make.Make)) {
            preferredMakes.push(make);
          } else {
            otherMakes.push(make);
          }
        });
        // Sort preferredMakes according to preferredOrder
        preferredMakes.sort((a, b) => preferredOrder.indexOf(a.Make) - preferredOrder.indexOf(b.Make));
        // Sort otherMakes alphabetically by Make name
        otherMakes.sort((a, b) => a.Make.localeCompare(b.Make));
        // Final makes order
        const orderedMakes = [...preferredMakes, ...otherMakes];

        let foundAnyData = false;

        for (const make of orderedMakes) {
          const params = { makeId: make.Id };
          const response = await axios.get('http://localhost:5000/defective', { params });
          const data = response.data;

          if (data && data.length > 0) {
            foundAnyData = true;
            addMakeWorksheet(workbook, make.Make, data, headers);
          }
        }

        if (!foundAnyData) {
          alert('No data found for any make.');
          setLoading(false);
          return;
        }

        const buf = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = excelFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Filtered Defective Items Report (by make/category)
        // If there are no categories for the selected make, do not send pCat_Id in params
        const params = {};
        if (selectedMakeId) params.makeId = selectedMakeId;
        // Only add pCat_Id if a category is selected and categoryOptions is not empty
        if (
          selectedCategoryId &&
          categoryOptions.length > 0 &&
          categoryOptions.some(cat => String(cat.Id) === String(selectedCategoryId))
        ) {
          params.pCat_Id = selectedCategoryId;
        }

        // --- FIX: Always send makeId and pCat_Id as numbers if present ---
        if (params.makeId) params.makeId = Number(params.makeId);
        if (params.pCat_Id) params.pCat_Id = Number(params.pCat_Id);

        // --- FIX: Remove empty params (if pCat_Id is empty string) ---
        Object.keys(params).forEach(key => {
          if (params[key] === '' || params[key] === undefined || params[key] === null) {
            delete params[key];
          }
        });

        let response;
        try {
          response = await axios.get('http://localhost:5000/defective', { params });
        } catch (err) {
          setLoading(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to fetch stock list. Please try again.',
            confirmButtonColor: '#1976d2'
          });
          return;
        }
        const data = response.data;

        if (!data || data.length === 0) {
          Swal.fire({
            icon: 'info',
            title: 'No Data',
            text: 'No data found for the selected filters.',
            confirmButtonColor: '#1976d2'
          });
          setLoading(false);
          return;
        }

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Defective Items Report');

        const colCount = headers.length;
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

        worksheet.mergeCells(mergeRange3);
        worksheet.getCell('A3').value =
          selectedCategoryId && categoryOptions.length > 0
            ? `Category : ${getCategoryName(selectedCategoryId)}`
            : 'Category : All Categories';
        worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell('A3').font = { size: 12 };

        const warehouseName = getWarehouseName(data);
        worksheet.mergeCells(mergeRange4);
        worksheet.getCell('A4').value = `Warehouse : ${warehouseName}`;
        worksheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell('A4').font = { size: 12 };

        const today = new Date();
        const todayStr = today.toLocaleDateString('en-GB');
        worksheet.mergeCells(mergeRange5);
        worksheet.getCell('A5').value = `Today Date : ${todayStr}`;
        worksheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell('A5').font = { size: 12 };

        // Columns to center align: Model_no (3), HSNCode (4), Cost_Price (5), Quantity (6), Total Price (7)
        const centerAlignCols = [3, 4, 5, 6, 7];

        // Group data by category, excluding Uncategorized
        const grouped = groupDataByCategory(data);
        let currentRow = 6;
        let grandTotal = 0;
        let slNo = 1;

        Object.keys(grouped).forEach((category, catIdx) => {
          // Add category header row
          worksheet.addRow([]);
          currentRow++;
          worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
          worksheet.getCell(`A${currentRow}`).value = category ? `Category : ${category}` : '';
          worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 13 };
          worksheet.getCell(`A${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left' };
          worksheet.getCell(`A${currentRow}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD966' },
          };
          worksheet.getCell(`A${currentRow}`).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

          // Add table header row for this category
          worksheet.addRow(headers);
          currentRow++;
          worksheet.getRow(currentRow).eachCell((cell, colNumber) => {
            cell.font = { bold: true, size: 13 };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFF00' },
            };
            // Center align for Model_no, HSNCode, Cost_Price, Quantity, Total Price
            if (centerAlignCols.includes(colNumber)) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
          worksheet.getCell(`B${currentRow}`).alignment = { ...worksheet.getCell(`B${currentRow}`).alignment, wrapText: true, vertical: 'middle' };

          // Add product rows for this category
          let categoryTotal = 0;
          grouped[category].forEach((row, idx) => {
            const quantityWithUnit = row.Quantity !== undefined && row.Unit
              ? `${row.Quantity} ${row.Unit}`
              : (row.Quantity !== undefined ? row.Quantity : '');

            let costPrice = Number(row.Cost_Price) || 0;
            let quantity = Number(row.Quantity) || 0;
            let totalPrice = costPrice * quantity;
            grandTotal += totalPrice;
            categoryTotal += totalPrice;

            const costPriceWithRupee = `${RUPEE} ${row.Cost_Price !== undefined ? row.Cost_Price : ''}`;
            const totalPriceWithRupee = `${RUPEE} ${format2Decimal(totalPrice)}`;

            const addedRow = worksheet.addRow([
              slNo++,
              row.Product_name,
              row.Model_no,
              row.HSNCode,
              costPriceWithRupee,
              quantityWithUnit,
              totalPriceWithRupee
            ]);
            currentRow++;

            // Apply bigger font and all borders to product rows
            for (let col = 1; col <= colCount; col++) {
              addedRow.getCell(col).font = { size: 12 };
              addedRow.getCell(col).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
              // Center align for Model_no, HSNCode, Cost_Price, Quantity, Total Price
              if (centerAlignCols.includes(col)) {
                addedRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
              }
            }
            // Wrap text for Product_name column (column 2)
            addedRow.getCell(2).alignment = { ...addedRow.getCell(2).alignment, wrapText: true, vertical: 'middle' };
          });

          // Add total row for this category (only if category is present)
          if (category) {
            worksheet.addRow([]);
            currentRow++;
            const categoryTotalText = `${RUPEE} ${format2Decimal(categoryTotal)}`;
            worksheet.addRow(['', '', '', '', '', '', categoryTotalText]);
            currentRow++;
            const totalRow = worksheet.getRow(currentRow);
            totalRow.getCell(7).font = { bold: true, size: 12 };
            totalRow.getCell(7).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD966' },
            };
            totalRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
            for (let col = 1; col <= colCount; col++) {
              totalRow.getCell(col).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
              // Center align for Model_no, HSNCode, Cost_Price, Quantity, Total Price
              if (centerAlignCols.includes(col)) {
                totalRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
              }
            }
          }
        });

        // Add empty row before grand total
        worksheet.addRow([]);
        currentRow++;

        // Add grand total row
        const grandTotalText = `Grand Total Price : ${RUPEE} ${format2Decimal(grandTotal)}`;
        worksheet.addRow(['', '', '', '', '', '', grandTotalText]);
        currentRow++;
        const grandTotalRow = worksheet.getRow(currentRow);
        grandTotalRow.getCell(7).font = { bold: true, size: 13 };
        grandTotalRow.getCell(7).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF00' },
        };
        // Set grand total cell to left alignment
        grandTotalRow.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };
        for (let col = 1; col <= colCount; col++) {
          grandTotalRow.getCell(col).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          // Center align for Model_no, HSNCode, Cost_Price, Quantity, Total Price
          if (centerAlignCols.includes(col)) {
            // Only set center alignment for other columns, not for grand total cell
            if (col !== 7) {
              grandTotalRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
            }
          }
        }

        // Set column widths
        headers.forEach((header, idx) => {
          let maxLength = header.length;
          data.forEach((row, rowIdx) => {
            let val = '';
            switch (header) {
              case 'SL No':
                val = (rowIdx + 1).toString();
                break;
              case 'Product Description':
                val = row.Product_name;
                break;
              case 'Model No':
                val = row.Model_no;
                break;
              case 'HSN / SAC Code':
                val = row.HSNCode;
                break;
              case 'Cost Price':
                val = `${RUPEE} ${row.Cost_Price !== undefined ? row.Cost_Price : ''}`;
                break;
              case 'Quantity':
                val = row.Quantity !== undefined && row.Unit
                  ? `${row.Quantity} ${row.Unit}`
                  : (row.Quantity !== undefined ? row.Quantity : '');
                break;
              case 'Total Price':
                let costPrice = Number(row.Cost_Price) || 0;
                let quantity = Number(row.Quantity) || 0;
                val = `${RUPEE} ${format2Decimal(costPrice * quantity)}`;
                break;
              default:
                val = '';
            }
            if (val && val.toString().length > maxLength) {
              maxLength = val.toString().length;
            }
          });
          worksheet.getColumn(idx + 1).width = Math.min(maxLength + 4, 40);
        });

        // --- FIX: Download the Excel file for filtered report ---
        const buf = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = excelFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to export Excel',
        text: error?.message || 'Unknown error',
        confirmButtonColor: '#1976d2'
      });
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 32 }}>Defective Items Report</h2>

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
            Filtered Report
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
            Full Report
          </label>
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

export default DefectiveReport;
