import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs/dist/exceljs.min.js'; // Use the browser build
import BmpLogo from '../assets/Bmp_logo.png';

// Dynamically load pdfmake (for browser)
let pdfMakePromise = null;
function getPdfMake() {
    if (!pdfMakePromise) {
        pdfMakePromise = new Promise((resolve, reject) => {
            if (window.pdfMake) {
                resolve(window.pdfMake);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
            script.onload = () => {
                const vfsScript = document.createElement('script');
                vfsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js';
                vfsScript.onload = () => resolve(window.pdfMake);
                vfsScript.onerror = reject;
                document.body.appendChild(vfsScript);
            };
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    return pdfMakePromise;
}

const CustomerReport = () => {
    const [categories, setCategories] = useState([]);
    const [regions, setRegions] = useState([]);
    const [types, setTypes] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedType, setSelectedType] = useState('');

    useEffect(() => {
        const API_URL = 'https://kdstocksoft.onrender.com';
        // Fetch categories
        axios.get(API_URL + '/category')
            .then(res => setCategories(res.data))
            .catch(() => setCategories([]));
        // Fetch regions
        axios.get(API_URL + '/region')
            .then(res => setRegions(res.data))
            .catch(() => setRegions([]));
        // Fetch types
        axios.get(API_URL + '/type')
            .then(res => setTypes(res.data))
            .catch(() => setTypes([]));
    }, []);

    // Helper to fetch image as base64
    const getBase64FromUrl = async (url) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleExcel = async () => {
        try {
            const API_URL = 'https://kdstocksoft.onrender.com';
            // Prepare query params
            const params = {};
            if (selectedCategory) params.cat_Id = selectedCategory;
            if (selectedRegion) params.region_Id = selectedRegion;
            if (selectedType) params.type_Id = selectedType;

            // Fetch customer data
            const response = await axios.get(`${API_URL}/customer`, { params });

            const customers = response.data;
            if (!customers || customers.length === 0) {
                alert('No data found for the selected filters.');
                return;
            }

            // Columns to exclude
            const excludeColumns = [
                'Id', 'Comp_Id', 'Cat_Id', 'Type_Id', 'Region_Id', 'Salut_Id', 'Desig_Id', 'Created_By', 'Modified_By', 'Active'
            ];

            // Prepare headers (excluding specified columns)
            const headers = Object.keys(customers[0]).filter(
                key => !excludeColumns.includes(key)
            );

            // Create workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Customer List');

            // --- Begin: Custom Header Area (A1:L5) ---

            // Merge A1:B5 for the logo area
            worksheet.mergeCells('A1:B5');
            // Merge C1:L5 for the title area
            worksheet.mergeCells('C1:L5');

            // Insert image in A1:B5
            let imageId;
            try {
                // If BmpLogo is a file import, fetch it as a blob and convert to base64
                let base64;
                if (BmpLogo.startsWith('data:image')) {
                    // Already base64 data url
                    base64 = BmpLogo.split(',')[1];
                } else {
                    // Fetch as blob and convert to base64
                    const response = await fetch(BmpLogo);
                    const blob = await response.blob();
                    base64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            // Remove the data:image/png;base64, prefix if present
                            const result = reader.result;
                            if (result.startsWith('data:image')) {
                                resolve(result.split(',')[1]);
                            } else {
                                resolve(result);
                            }
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                }
                imageId = workbook.addImage({
                    base64: base64,
                    extension: 'png',
                });
            } catch (err) {
                imageId = null;
            }
            if (imageId !== undefined && imageId !== null) {
                worksheet.addImage(imageId, {
                    tl: { col: 0.1, row: 0.2 },
                    ext: { width: 100, height: 80 }
                });
            }

            // Set the value and style for the merged C1:L5 cell
            const titleCell = worksheet.getCell('C1');
            titleCell.value = 'Customer List';
            titleCell.font = { size: 24, bold: true, color: { argb: 'FF000000' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            titleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '00D6AB' } // R:0, G:214, B:171
            };

            // ExcelJS expects ARGB, so pad to 8 chars: FF00D6AB (FF = opaque)
            titleCell.fill.fgColor.argb = 'FF00D6AB';

            // Set fill for all cells in C1:L5 to match the title cell
            for (let row = 1; row <= 5; row++) {
                for (let col = 3; col <= 12; col++) { // C=3, L=12
                    worksheet.getCell(row, col).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF00D6AB' }
                    };
                }
            }

            // Set fill for all cells in A1:B5 to white (or transparent, so logo is visible)
            for (let row = 1; row <= 5; row++) {
                for (let col = 1; col <= 2; col++) {
                    worksheet.getCell(row, col).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFFFFF' }
                    };
                }
            }

            // Set all row heights in header area (1-5) to default (normal) height
            for (let row = 1; row <= 5; row++) {
                worksheet.getRow(row).height = undefined;
            }

            // --- End: Custom Header Area (A1:L5) ---

            // Add header row (after the custom header area)
            // Find the first empty row after row 5
            let headerRowIdx = 6;
            while (worksheet.getRow(headerRowIdx).values.length > 0) {
                headerRowIdx++;
            }
            const headerRow = worksheet.getRow(headerRowIdx);
            headerRow.values = headers;

            // Style header row: yellow fill, bold, center
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF00' }, // Yellow
                };
                cell.font = { bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // Add data rows
            customers.forEach(row => {
                const rowData = headers.map(field => row[field]);
                worksheet.addRow(rowData);
            });

            // Auto width for columns
            headers.forEach((header, idx) => {
                let maxLength = header.length;
                customers.forEach(row => {
                    const val = row[header];
                    if (val && val.toString().length > maxLength) {
                        maxLength = val.toString().length;
                    }
                });
                worksheet.getColumn(idx + 1).width = Math.min(maxLength + 4, 40);
            });

            // Download the Excel file
            const buf = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'customer_report.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert('Failed to export Excel: ' + (error?.message || 'Unknown error'));
        }
    };

    const handlePDF = async () => {
        try {
            const API_URL = 'https://kdstocksoft.onrender.com';
            // Prepare query params
            const params = {};
            if (selectedCategory) params.cat_Id = selectedCategory;
            if (selectedRegion) params.region_Id = selectedRegion;
            if (selectedType) params.type_Id = selectedType;

            // Fetch customer data
            const response = await axios.get(`${API_URL}/customer`, { params });

            const customers = response.data;
            if (!customers || customers.length === 0) {
                alert('No data found for the selected filters.');
                return;
            }

            // Columns to exclude
            const excludeColumns = [
                'Id', 'Comp_Id', 'Cat_Id', 'Type_Id', 'Region_Id', 'Salut_Id', 'Desig_Id', 'Created_By', 'Modified_By', 'Active'
            ];

            // Prepare headers (excluding specified columns)
            const headers = Object.keys(customers[0]).filter(
                key => !excludeColumns.includes(key)
            );

            // Prepare table body for pdfmake
            const tableBody = [];
            // Header row (styled)
            tableBody.push(
                headers.map(h => ({
                    text: h,
                    style: 'tableHeader',
                    fillColor: '#FFFF00',
                    alignment: 'center'
                }))
            );
            // Data rows
            customers.forEach(row => {
                tableBody.push(
                    headers.map(field => {
                        const val = row[field];
                        return val === null || val === undefined ? '' : val.toString();
                    })
                );
            });

            // Prepare logo as base64
            let logoBase64 = null;
            try {
                if (BmpLogo.startsWith('data:image')) {
                    logoBase64 = BmpLogo;
                } else {
                    const response = await fetch(BmpLogo);
                    const blob = await response.blob();
                    logoBase64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                }
            } catch (err) {
                logoBase64 = null;
            }

            // Compose pdfmake doc definition
            const docDefinition = {
                pageOrientation: 'landscape',
                pageMargins: [40, 40, 40, 40],
                content: [
                    {
                        columns: [
                            {
                                image: logoBase64,
                                width: 100,
                                height: 80,
                                margin: [0, 0, 0, 0]
                            },
                            {
                                width: '*',
                                stack: [
                                    {
                                        text: 'Customer List',
                                        style: 'title',
                                        alignment: 'center',
                                        margin: [0, 20, 0, 0]
                                    }
                                ],
                                fillColor: '#00D6AB',
                                margin: [0, 0, 0, 0]
                            }
                        ],
                        columnGap: 10,
                        margin: [0, 0, 0, 10]
                    },
                    {
                        table: {
                            headerRows: 1,
                            widths: headers.map(() => 'auto'),
                            body: tableBody
                        },
                        layout: {
                            fillColor: function (rowIndex, node, columnIndex) {
                                if (rowIndex === 0) return '#FFFF00'; // header yellow
                                return rowIndex % 2 === 0 ? '#F9F9F9' : null;
                            },
                            hLineWidth: function () { return 0.5; },
                            vLineWidth: function () { return 0.5; },
                            hLineColor: function () { return '#888'; },
                            vLineColor: function () { return '#888'; }
                        }
                    }
                ],
                styles: {
                    title: {
                        fontSize: 24,
                        bold: true,
                        color: '#000',
                        fillColor: '#00D6AB'
                    },
                    tableHeader: {
                        bold: true,
                        fontSize: 12,
                        color: '#000'
                    }
                },
                defaultStyle: {
                    fontSize: 10
                }
            };

            // Load pdfmake and create/download PDF
            const pdfMake = await getPdfMake();
            pdfMake.createPdf(docDefinition).download('customer_report.pdf');
        } catch (error) {
            alert('Failed to export PDF: ' + (error?.message || 'Unknown error'));
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
            <h2 style={{ textAlign: 'center', marginBottom: 32 }}>Customer Report</h2>

            <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Region</label>
                <select
                    value={selectedRegion}
                    onChange={e => setSelectedRegion(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                >
                    <option value="">Select Region</option>
                    {regions.map(region => (
                        <option key={region.Id || region.id} value={region.Id || region.id}>{region.Region || region.region}</option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Category</label>
                <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                        <option key={cat.Id || cat.id} value={cat.Id || cat.id}>{cat.Category || cat.category}</option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: 32 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Type</label>
                <select
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                >
                    <option value="">Select Type</option>
                    {types.map(type => (
                        <option key={type.Id || type.id} value={type.Id || type.id}>{type.Type || type.type}</option>
                    ))}
                </select>
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button
                    onClick={handleExcel}
                    style={{
                        padding: '10px 24px',
                        background: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer'
                    }}
                >
                    Print Excel
                </button>
                <button
                    onClick={handlePDF}
                    style={{
                        padding: '10px 24px',
                        background: '#388e3c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer'
                    }}
                >
                    Print PDF
                </button>
            </div>
        </div>
    );
};

export default CustomerReport;
