import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Helper: Export to Excel without xlsx
function exportToExcel(data, headers, filename = "MinimumStockReport.xlsx") {
    // Prepare table
    let csv = '';
    csv += headers.join('\t') + '\n';
    data.forEach(row => {
        csv += headers.map(h => (row[h] != null ? row[h] : '')).join('\t') + '\n';
    });

    // Excel's MIME type
    const blob = new Blob([csv], { type: "application/vnd.ms-excel" });

    // Create link and trigger download
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

const MinimumStock = () => {

    const [minimumStock, setProducts] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', model: '' });
    const [editProduct, setEditProduct] = useState(null);   // stores product being edited
    const [showEditModal, setShowEditModal] = useState(false); // controls if modal is visible

    const tableHeaders = [
        "Product Name",
        "Make",
        "Model No",
        "Quantity",
        "Total Price"
    ];

    const API_URL = 'https://kdstocksoft.onrender.com/minimum-stock';

    useEffect(() => {
        axios.get(API_URL)
            .then((response) => {
                setProducts(response.data);
                setFiltered(response.data);
            })
            .catch((error) => {
                console.error('Error fetching data:', error);
            });
    }, []);

    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const results = minimumStock.filter((stock) =>
            stock.Id.toString().includes(lowerTerm) ||
            stock.Make.toLowerCase().includes(lowerTerm) ||
            stock.Product_name?.toLowerCase().includes(lowerTerm) ||
            stock.Model_no?.toLowerCase().includes(lowerTerm)
        );
        setFiltered(results);
    }, [searchTerm, minimumStock]);

    // Sort filtered data by newest first (highest Id)
    const sortedFiltered = [...filtered].sort((a, b) => b.Id - a.Id);

    // Export to Excel handler (use helper)
    const handleExportExcel = () => {
        // Prepare data to export
        const dataToExport = sortedFiltered.map(stock => ({
            "Product Name": stock.Product_name,
            "Make": stock.Make,
            "Model No": stock.Model_no,
            "Quantity": `${stock.Quantity} ${stock.Unit}`,
            "Total Price": `₹ ${stock.Quantity * stock.Cost_price}`
        }));

        exportToExcel(dataToExport, tableHeaders, "MinimumStockReport.xls");
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Minimum Stock List <span style={{ fontWeight: 400, fontSize: 26, color: '#888' }}>(Qty &lt; 50 Nos)</span></h2>
                <button style={styles.button} onClick={handleExportExcel}>Export Excel</button>
            </div>

            <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <input
                    type="text"
                    placeholder="Search by name or model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.search}
                />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f4f4f4' }}>
                        <th style={{ ...styles.th, width: '35%' }}>Product Name</th>
                        <th style={{ ...styles.th, width: '15%' }}>Make</th>
                        <th style={{ ...styles.th, width: '15%' }}>Model No</th>
                        <th style={{ ...styles.th, width: '10%' }}>Quantity</th>
                        <th style={{ ...styles.th, width: '15%' }}>Total Price</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedFiltered && sortedFiltered.length > 0 ? (
                        sortedFiltered.map((stock) => (
                            <tr key={stock.Id}>
                                <td style={styles.td}>{stock.Product_name}</td>
                                <td style={styles.td}>{stock.Make}</td>
                                <td style={styles.td}>{stock.Model_no}</td>
                                <td style={styles.td}>{stock.Quantity + " " + stock.Unit}</td>
                                <td style={styles.td}>₹ {stock.Quantity * stock.Cost_price}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={tableHeaders.length} style={styles.td} align="center">
                                No data found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

};

const styles = {
    th: {
        border: '1px solid #ccc',
        padding: '10px',
        textAlign: 'left',
    },
    td: {
        border: '1px solid #ccc',
        padding: '10px',
    },
    button: {
        padding: '8px 16px',
        backgroundColor: '#2C3E50',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    search: {
        padding: '8px',
        width: '300px',
        border: '1px solid #ccc',
        borderRadius: '4px',
    },
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modal: {
        background: '#fff',
        padding: '20px',
        width: '400px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    },
    input: {
        width: '100%',
        padding: '10px',
        margin: '10px 0',
        borderRadius: '4px',
        border: '1px solid #ccc',
    },
    toggle: {
        width: '40px',
        height: '20px',
        borderRadius: '15px',
        display: 'flex',
        alignItems: 'center',
        padding: '2px',
        cursor: 'pointer',
        transition: '0.3s ease',
    },
    circle: {
        width: '16px',
        height: '16px',
        backgroundColor: '#fff',
        borderRadius: '50%',
        transition: '0.3s ease',
    },
};

export default MinimumStock;