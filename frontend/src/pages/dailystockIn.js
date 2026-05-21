import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import Swal from 'sweetalert2';

const RUPEE = '\u20B9';

const DailyStockIn = () => {
  const [makeOptions, setMakeOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedMakeId, setSelectedMakeId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('filtered'); // 'filtered' or 'full'

  // New state for date fields
  const [invoiceDate, setInvoiceDate] = useState('');
  const [creditNoteDate, setCreditNoteDate] = useState('');

  useEffect(() => {
    if (reportType === 'full') {
      setSelectedMakeId('');
      setSelectedCategoryId('');
      setCategoryOptions([]);
      // When switching to full, enable both date fields (do not clear values)
    }
  }, [reportType]);

  useEffect(() => {
    axios
      .get('http://localhost:5000/make-helper')
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
      .post('http://localhost:5000/product-category-helper', { make_Id: Number(selectedMakeId) })
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

  // Group data by Purchase_Order, Invoice_No, Credit_No, Org_InvNo
  function groupStockInRows(data) {
    // Key: stringified group key, Value: { groupFields, products: [] }
    const groups = {};
    data.forEach(row => {
      // Use all 4 fields as group key (if present)
      const groupKey = [
        row.Purchase_Order || '',
        row.Invoice_No || '',
        row.Credit_No || '',
        row.Org_InvNo || ''
      ].join('||');
      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupFields: {
            Purchase_Order: row.Purchase_Order,
            Purchase_Date: row.Purchase_Date,
            Invoice_No: row.Invoice_No,
            Invoice_Date: row.Invoice_Date,
            Credit_No: row.Credit_No,
            Credit_Date: row.Credit_Date,
            Org_InvNo: row.Org_InvNo,
            Org_Invdt: row.Org_Invdt,
            Company: row.Company,
            Warehouse: row.Warehouse,
            Created_By: row.Created_By // Add Created_By to groupFields
          },
          products: []
        };
      }
      groups[groupKey].products.push({
        Product_name: row.Product_name,
        Model_no: row.Model_no,
        Cost_price: row.Cost_price,
        Quantity: row.Quantity,
        Unit: row.Unit,
        Created_By: row.Created_By, // Add Created_By to product
        Remarks: row.Remarks // Add Remarks to product
      });
    });
    return Object.values(groups);
  }

  // Helper to generate a worksheet for a make, with grouped rows
  const addMakeWorksheet = (workbook, makeName, data, headers, showCategoryRow, categoryValue) => {
    const worksheet = workbook.addWorksheet(makeName || 'Sheet');
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
    worksheet.getCell('A2').value = `Make : ${makeName}`;
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A2').font = { size: 12 };

    if (showCategoryRow) {
      worksheet.mergeCells(mergeRange3);
      worksheet.getCell('A3').value = categoryValue;
      worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getCell('A3').font = { size: 12 };
    }

    const warehouseName = getWarehouseName(data);
    worksheet.mergeCells(showCategoryRow ? mergeRange4 : mergeRange3);
    worksheet.getCell(showCategoryRow ? 'A4' : 'A3').value = `Warehouse : ${warehouseName}`;
    worksheet.getCell(showCategoryRow ? 'A4' : 'A3').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell(showCategoryRow ? 'A4' : 'A3').font = { size: 12 };

    const today = new Date();
    const todayStr = today.toLocaleDateString('en-GB');
    worksheet.mergeCells(showCategoryRow ? mergeRange5 : mergeRange4);
    worksheet.getCell(showCategoryRow ? 'A5' : 'A4').value = `Today Date : ${todayStr}`;
    worksheet.getCell(showCategoryRow ? 'A5' : 'A4').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell(showCategoryRow ? 'A5' : 'A4').font = { size: 12 };

    const headerRowNum = showCategoryRow ? 6 : 5;
    worksheet.addRow(headers);

    worksheet.getRow(headerRowNum).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF00' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Group data
    const grouped = groupStockInRows(data);

    let slNo = 1;
    let grandTotal = 0;
    grouped.forEach(group => {
      group.products.forEach((product, idx) => {
        // Only show group fields for the first product in the group, else empty
        const showFields = idx === 0;
        const quantityWithUnit = product.Quantity !== undefined && product.Unit
          ? `${product.Quantity} ${product.Unit}`
          : (product.Quantity !== undefined ? product.Quantity : '');

        const costPrice = (product.Cost_price !== undefined && product.Cost_price !== null && product.Cost_price !== '')
          ? `${RUPEE} ${product.Cost_price}`
          : '';

        let totalAmount = '';
        if (
          product.Cost_price !== undefined &&
          product.Cost_price !== null &&
          product.Quantity !== undefined &&
          product.Quantity !== null &&
          !isNaN(Number(product.Cost_price)) &&
          !isNaN(Number(product.Quantity))
        ) {
          const amount = Number(product.Cost_price) * Number(product.Quantity);
          totalAmount = `${RUPEE} ${amount}`;
          grandTotal += amount;
        }

        worksheet.addRow([
          slNo++, // SL No
          showFields ? group.groupFields.Purchase_Order : '',
          showFields ? formatDate(group.groupFields.Purchase_Date) : '',
          showFields ? group.groupFields.Invoice_No : '',
          showFields ? formatDate(group.groupFields.Invoice_Date) : '',
          showFields ? (group.groupFields.Credit_No || '') : '',
          showFields ? formatDate(group.groupFields.Credit_Date) : '',
          showFields ? (group.groupFields.Org_InvNo || '') : '',
          showFields ? formatDate(group.groupFields.Org_Invdt) : '',
          showFields ? group.groupFields.Company : '',
          product.Product_name,
          product.Model_no,
          costPrice,
          quantityWithUnit,
          totalAmount,
          product.Remarks || '', // Remarks column (after Total_Amount)
          product.Created_By || (showFields ? group.groupFields.Created_By : '') // Created By column
        ]);
      });
    });

    // Add Grand Total row under the correct column (now 17th column, Q)
    const lastRowNumber = worksheet.lastRow.number;
    const grandTotalRowNumber = lastRowNumber + 1;
    const grandTotalCell = worksheet.getCell(`O${grandTotalRowNumber}`); // O is 15th, P is 16th, Q is 17th
    grandTotalCell.value = `${RUPEE} ${grandTotal}`;
    grandTotalCell.font = { bold: true };
    grandTotalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF00' },
    };
    grandTotalCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Optionally, you can add a label in N column
    const labelCell = worksheet.getCell(`N${grandTotalRowNumber}`);
    labelCell.value = 'Grand Total';
    labelCell.font = { bold: true };
    labelCell.alignment = { vertical: 'middle', horizontal: 'right' };

    // Auto width for columns
    headers.forEach((header, idx) => {
      let maxLength = header.length;
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber < headerRowNum) return;
        const cell = row.getCell(idx + 1);
        if (cell.value && cell.value.toString().length > maxLength) {
          maxLength = cell.value.toString().length;
        }
      });
      worksheet.getColumn(idx + 1).width = Math.min(maxLength + 4, 40);
    });
  };

  // --- SweetAlert2 validation for date fields ---
  const validateDateFields = () => {
    if (!invoiceDate && !creditNoteDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select either Invoice Date or Credit Note Date before exporting.',
        confirmButtonColor: '#1976d2'
      });
      return false;
    }
    return true;
  };

  const handleExcel = async () => {
    // Validate date fields before proceeding
    if (!validateDateFields()) {
      return;
    }

    if (reportType === 'filtered' && !selectedMakeId) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select a Make before exporting the filtered stock in report.',
        confirmButtonColor: '#1976d2'
      });
      return;
    }

    setLoading(true);
    try {
      const headers = [
        'SL No',
        'Purchase_Order',
        'Purchase_Date',
        'Invoice_No',
        'Invoice_Date',
        'Credit Note No',
        'Credit Date',
        'Original Invoice No',
        'Original Invoice Date',
        'Company',
        'Product_name',
        'Model_no',
        'Cost_price',
        'Quantity',
        'Total_Amount',
        'Remarks',      // Inserted Remarks column after Total_Amount
        'Created By'    // Created By column
      ];

      if (reportType === 'full') {
        const workbook = new ExcelJS.Workbook();
        let makes = makeOptions;
        if (!makes || makes.length === 0) {
          const makeRes = await axios.get('http://localhost:5000/make-helper');
          makes = makeRes.data;
        }

        let foundAnyData = false;

        for (const make of makes) {
          // For full report, include date fields in payload as inv_date and credit_date
          const payload = { make_Id: make.Id };
          if (invoiceDate) payload.inv_date = invoiceDate;
          if (creditNoteDate) payload.credit_date = creditNoteDate;

          const response = await axios.post('http://localhost:5000/daily-stock-in', payload);
          const data = response.data;

          if (data && data.length > 0) {
            foundAnyData = true;
            // Flatten and group
            const flattenedData = [];
            data.forEach(group => {
              const warehouseName =
                group.Warehouse ||
                group.warehouse ||
                group.Name ||
                group.name ||
                (group.prod_details && group.prod_details[0] && (group.prod_details[0].Warehouse || group.prod_details[0].warehouse || group.prod_details[0].Name || group.prod_details[0].name)) ||
                '';
              group.prod_details.forEach(product => {
                flattenedData.push({
                  Purchase_Order: group.Purchase_Order,
                  Invoice_No: group.Invoice_No,
                  Company: group.Company,
                  Product_name: product.Product_name,
                  Model_no: product.Model_no,
                  Cost_price: product.Cost_price,
                  Quantity: product.Quantity,
                  Unit: product.Unit,
                  Purchase_Date: group.Purchase_Date,
                  Invoice_Date: group.Invoice_Date,
                  Credit_No: group.Credit_No,
                  Credit_Date: group.Credit_Date,
                  Org_InvNo: group.Org_InvNo,
                  Org_Invdt: group.Org_Invdt,
                  Warehouse: warehouseName,
                  Created_By: product.Created_By || group.Created_By, // Add Created_By
                  Remarks: product.Remarks || '' // Add Remarks
                });
              });
            });
            addMakeWorksheet(workbook, make.Make, flattenedData, headers, false, '');
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
        a.download = 'full_stock_in_report.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const params = {};
        if (selectedMakeId) params.make_Id = selectedMakeId;
        if (
          selectedCategoryId &&
          categoryOptions.length > 0 &&
          categoryOptions.some(cat => String(cat.Id) === String(selectedCategoryId))
        ) {
          params.pCat_Id = selectedCategoryId;
        }
        // Add date fields to params as inv_date and credit_date
        if (invoiceDate) params.inv_date = invoiceDate;
        if (creditNoteDate) params.credit_date = creditNoteDate;

        const response = await axios.post('http://localhost:5000/daily-stock-in', params);
        const data = response.data;

        if (!data || data.length === 0) {
          alert('No data found for the selected filters.');
          setLoading(false);
          return;
        }

        const flattenedData = [];
        data.forEach(group => {
          const warehouseName =
            group.Warehouse ||
            group.warehouse ||
            group.Name ||
            group.name ||
            (group.prod_details && group.prod_details[0] && (group.prod_details[0].Warehouse || group.prod_details[0].warehouse || group.prod_details[0].Name || group.prod_details[0].name)) ||
            '';
          group.prod_details.forEach(product => {
            flattenedData.push({
              Purchase_Order: group.Purchase_Order,
              Invoice_No: group.Invoice_No,
              Company: group.Company,
              Product_name: product.Product_name,
              Model_no: product.Model_no,
              Cost_price: product.Cost_price,
              Quantity: product.Quantity,
              Unit: product.Unit,
              Purchase_Date: group.Purchase_Date,
              Invoice_Date: group.Invoice_Date,
              Credit_No: group.Credit_No,
              Credit_Date: group.Credit_Date,
              Org_InvNo: group.Org_InvNo,
              Org_Invdt: group.Org_Invdt,
              Warehouse: warehouseName,
              Created_By: product.Created_By || group.Created_By, // Add Created_By
              Remarks: product.Remarks || '' // Add Remarks
            });
          });
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daily Stock In Report');

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

        const warehouseName = getWarehouseName(flattenedData);
        worksheet.mergeCells(showCategoryRow ? mergeRange4 : mergeRange3);
        worksheet.getCell(showCategoryRow ? 'A4' : 'A3').value = `Warehouse : ${warehouseName}`;
        worksheet.getCell(showCategoryRow ? 'A4' : 'A3').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell(showCategoryRow ? 'A4' : 'A3').font = { size: 12 };

        const today = new Date();
        const todayStr = today.toLocaleDateString('en-GB');
        worksheet.mergeCells(showCategoryRow ? mergeRange5 : mergeRange4);
        worksheet.getCell(showCategoryRow ? 'A5' : 'A4').value = `Today Date : ${todayStr}`;
        worksheet.getCell(showCategoryRow ? 'A5' : 'A4').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell(showCategoryRow ? 'A5' : 'A4').font = { size: 12 };

        const headerRowNum = showCategoryRow ? 6 : 5;
        worksheet.addRow(headers);

        worksheet.getRow(headerRowNum).eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        // Group data
        const grouped = groupStockInRows(flattenedData);

        let slNo = 1;
        let grandTotal = 0;
        grouped.forEach(group => {
          group.products.forEach((product, idx) => {
            const showFields = idx === 0;
            const quantityWithUnit = product.Quantity !== undefined && product.Unit
              ? `${product.Quantity} ${product.Unit}`
              : (product.Quantity !== undefined ? product.Quantity : '');

            const costPrice = (product.Cost_price !== undefined && product.Cost_price !== null && product.Cost_price !== '')
              ? `${RUPEE} ${product.Cost_price}`
              : '';

            let totalAmount = '';
            if (
              product.Cost_price !== undefined &&
              product.Cost_price !== null &&
              product.Quantity !== undefined &&
              product.Quantity !== null &&
              !isNaN(Number(product.Cost_price)) &&
              !isNaN(Number(product.Quantity))
            ) {
              const amount = Number(product.Cost_price) * Number(product.Quantity);
              totalAmount = `${RUPEE} ${amount}`;
              grandTotal += amount;
            }

            worksheet.addRow([
              slNo++,
              showFields ? group.groupFields.Purchase_Order : '',
              showFields ? formatDate(group.groupFields.Purchase_Date) : '',
              showFields ? group.groupFields.Invoice_No : '',
              showFields ? formatDate(group.groupFields.Invoice_Date) : '',
              showFields ? (group.groupFields.Credit_No || '') : '',
              showFields ? formatDate(group.groupFields.Credit_Date) : '',
              showFields ? (group.groupFields.Org_InvNo || '') : '',
              showFields ? formatDate(group.groupFields.Org_Invdt) : '',
              showFields ? group.groupFields.Company : '',
              product.Product_name,
              product.Model_no,
              costPrice,
              quantityWithUnit,
              totalAmount,
              product.Remarks || '', // Remarks column (after Total_Amount)
              product.Created_By || (showFields ? group.groupFields.Created_By : '') // Created By column
            ]);
          });
        });

        // Add Grand Total row under column O (15th column), Remarks is 16th (P), Created By is 17th (Q)
        const lastRowNumber = worksheet.lastRow.number;
        const grandTotalRowNumber = lastRowNumber + 1;
        const grandTotalCell = worksheet.getCell(`O${grandTotalRowNumber}`);
        grandTotalCell.value = `${RUPEE} ${grandTotal}`;
        grandTotalCell.font = { bold: true };
        grandTotalCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF00' },
        };
        grandTotalCell.alignment = { vertical: 'middle', horizontal: 'center' };

        // Optionally, you can add a label in N column
        const labelCell = worksheet.getCell(`N${grandTotalRowNumber}`);
        labelCell.value = 'Grand Total';
        labelCell.font = { bold: true };
        labelCell.alignment = { vertical: 'middle', horizontal: 'right' };

        headers.forEach((header, idx) => {
          let maxLength = header.length;
          worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber < headerRowNum) return;
            const cell = row.getCell(idx + 1);
            if (cell.value && cell.value.toString().length > maxLength) {
              maxLength = cell.value.toString().length;
            }
          });
          worksheet.getColumn(idx + 1).width = Math.min(maxLength + 4, 40);
        });

        const buf = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'daily_stock_in_report.xlsx';
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

  // --- UI ---
  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 32 }}>Daily Stock In Report</h2>

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
            Filtered Stock In Report
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
            Full Stock In Report
          </label>
        </div>
      </div>

      {/* Date fields row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Invoice Date</label>
          <input
            type="date"
            value={invoiceDate}
            onChange={e => {
              setInvoiceDate(e.target.value);
              // When selecting invoice date, clear credit note date
              if (e.target.value) setCreditNoteDate('');
            }}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            disabled={!!creditNoteDate}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Credit Note Date</label>
          <input
            type="date"
            value={creditNoteDate}
            onChange={e => {
              setCreditNoteDate(e.target.value);
              // When selecting credit note date, clear invoice date
              if (e.target.value) setInvoiceDate('');
            }}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            disabled={!!invoiceDate}
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

export default DailyStockIn;
