import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Stock = () => {

    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const [stockData, setStockData] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [makeOptions, setMakeOptions] = useState([]);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [warehouseOptions, setWarehouseOptions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMakeId, setSelectedMakeId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [godownName, setGodownName] = useState(''); // New state for godown name

    const API_URL = 'https://kdstocksoft.onrender.com/';

    // Define column widths for each column (in px or %)
    const columnWidths = [

        "40%",
        "15%",
        "15%",
        "15%",
        "5%",
        "25%",
        
    ];

    const tableHeaders = [
        "Product Description",
        "Model No",
        "HSN / SAC Code",
        "Unit Price",
        "Quantity",
        "Total Price",
    ];

    const sortedFiltered = [...filtered].sort((a, b) => b.Id - a.Id);

    // Fetch make options
    useEffect(() => {
        axios
            .get('https://kdstocksoft.onrender.com/make-helper')
            .then((res) => {
                setMakeOptions(res.data);
                // Don't set default makeId here, let user select
            })
            .catch((err) => console.error('❌ Error fetching make-helper:', err));
    }, []);

    // Fetch warehouse options
    useEffect(() => {
        axios
            .get('https://kdstocksoft.onrender.com/Warehouse')
            .then((res) => {
                setWarehouseOptions(res.data);
            })
            .catch((err) => {
                setWarehouseOptions([]);
                console.error('❌ Error fetching warehouse options:', err);
            });
    }, []);

    // Fetch category options whenever selectedMakeId changes
    useEffect(() => {
        if (!selectedMakeId) {
            setCategoryOptions([]);
            setSelectedCategoryId('');
            return;
        }

        axios
            .post('https://kdstocksoft.onrender.com/product-category-helper', {
                make_Id: Number(selectedMakeId),
            })
            .then((res) => {
                setCategoryOptions(res.data);
                if (res.data.length > 0) {
                    setSelectedCategoryId(res.data[0].Id.toString());
                } else {
                    setSelectedCategoryId('');
                }
            })
            .catch((err) => {
                console.error('❌ Error fetching product categories:', err);
                setCategoryOptions([]);
                setSelectedCategoryId('');
            });
    }, [selectedMakeId]);

    // Fetch stock-list and godown name when make/category/warehouse changes
    useEffect(() => {
        const fetchStock = async () => {
            // If both make and warehouse are empty, clear
            if (!selectedMakeId && !selectedWarehouseId) {
                setGodownName('');
                setStockData([]);
                return;
            }

            try {
                const params = {};
                if (selectedMakeId) {
                    params.makeId = selectedMakeId;
                    if (selectedCategoryId) {
                        params.pCat_Id = selectedCategoryId;
                    }
                }
                if (selectedWarehouseId) {
                    params.Whouse_Id = selectedWarehouseId;
                }

                const response = await axios.get('https://kdstocksoft.onrender.com/stock-list', { params });
                setStockData(response.data);

                // Set godown name if available
                if (response.data && response.data.length > 0) {
                    setGodownName(response.data[0].Name || '');
                } else {
                    setGodownName('');
                }

            } catch (error) {
                console.error('❌ Error fetching stock list:', error.message);
                setGodownName('');
                setStockData([]);
            }
        };

        fetchStock();
    }, [selectedMakeId, selectedCategoryId, selectedWarehouseId]);

    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const results = stockData.filter((stock) =>
            stock.Id.toString().includes(lowerTerm) ||
            stock.Product_name?.toLowerCase().includes(lowerTerm) ||
            stock.HSNCode?.toLowerCase().includes(lowerTerm) ||
            stock.Model_no?.toLowerCase().includes(lowerTerm)
        );
        setFiltered(results);
    }, [searchTerm, stockData]);

    // Helper to determine if a row should be red
    const isLowStock = (stock) => {
        return Number(stock.stock_qty) < 10;
    };

    // Get selected make name
    const selectedMakeName = makeOptions.find(make => make.Id.toString() === selectedMakeId)?.Make || '';

    // Determine if category dropdown should be disabled
    const isCategoryDisabled = !selectedMakeId || categoryOptions.length === 0;

    // Determine if warehouse dropdown should be disabled
    const isWarehouseDisabled = !!selectedMakeId; // If make is selected, warehouse is disabled

    // When user selects warehouse, clear make/category
    const handleWarehouseChange = (e) => {
        setSelectedWarehouseId(e.target.value);
        if (e.target.value) {
            setSelectedMakeId('');
            setSelectedCategoryId('');
        }
    };

    // When user selects make, clear warehouse
    const handleMakeChange = (e) => {
        setSelectedMakeId(e.target.value);
        setSelectedWarehouseId('');
    };

    // Calculate total amount from filtered data (visible rows)
    const totalAmount = filtered.reduce((sum, item) => {
        // Use stock_qty for display, fallback to Quantity if not present
        const qty = Number(item.stock_qty ?? item.Quantity) || 0;
        const price = Number(item.Cost_Price) || 0;
        return sum + price * qty;
    }, 0);

    return (
        <div style={{ padding: '20px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>
                    {selectedMakeName} Stock
                    {godownName ? ` - ${godownName}` : ''}
                </h2>
            </div>

            {/* Search */}
            <div style={{ textAlign: 'center', margin: '20px 0', display: 'flex', justifyContent: 'center', gap: '10px' }}>

                {/* 🔽 Make dropdown */}
                <select
                    value={selectedMakeId}
                    onChange={handleMakeChange}
                    style={styles.search}
                    disabled={!!selectedWarehouseId}
                >
                    <option value="">Select Make</option>
                    {makeOptions.map((option) => (
                        <option key={option.Id} value={option.Id}>
                            {option.Make}
                        </option>
                    ))}
                </select>

                {/* 🔽 Category dropdown */}
                <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    style={styles.search}
                    disabled={isCategoryDisabled || !!selectedWarehouseId}
                >
                    {categoryOptions.length === 0 ? (
                        <option value="">No categories</option>
                    ) : (
                        categoryOptions.map((option) => (
                            <option key={option.Id} value={option.Id}>
                                {option.Category}
                            </option>
                        ))
                    )}
                </select>

                {/* 🔽 Warehouse dropdown */}
                <select
                    value={selectedWarehouseId}
                    onChange={handleWarehouseChange}
                    style={styles.search}
                    disabled={!!selectedMakeId}
                >
                    <option value="">Select Warehouse</option>
                    {warehouseOptions.map((option) => (
                        <option key={option.Id} value={option.Id}>
                            {option.Name}
                        </option>
                    ))}
                </select>

                <input
                    type="text"
                    placeholder="Search by name or model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.search}
                />
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <colgroup>
                    {columnWidths.map((width, idx) => (
                        <col key={idx} style={{ width }} />
                    ))}
                </colgroup>
                <thead>
                    <tr style={{ backgroundColor: '#f4f4f4' }}>
                        {tableHeaders.map((header, idx) => (
                            <th key={idx} style={{ ...styles.th }}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedFiltered && sortedFiltered.length > 0 ? (
                        [...sortedFiltered]
                            .sort((a, b) => b.Id - a.Id)
                            .map((stock) => (
                                <tr
                                    key={stock.Id}
                                    style={isLowStock(stock) ? styles.lowStockRow : undefined}
                                >
                                    <td style={{ ...styles.td, width: columnWidths[0] }}>{stock.Product_name}</td>
                                    <td style={{ ...styles.td, width: columnWidths[1] }}>{stock.Model_no}</td>
                                    <td style={{ ...styles.td, width: columnWidths[2] }}>{stock.HSNCode}</td>
                                    <td style={{ ...styles.td, width: columnWidths[3] }}>₹ {stock.Cost_Price}</td>
                                    <td style={{ ...styles.td, width: columnWidths[4] }}>{(stock.stock_qty ?? stock.Quantity) + " " + (stock.Unit || "")}</td>
                                    <td style={{ ...styles.td, width: columnWidths[5] }}>
                                        ₹ {(Number(stock.Cost_Price) * Number(stock.stock_qty ?? stock.Quantity)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>

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
            {/* Total Amount below the table */}
            <div style={{ marginTop: '20px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>
                Total Amount: ₹ {totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
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
    activeTab: {
        padding: '8px 16px',
        backgroundColor: '#1ABC9C', // Highlight color
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    },
    inactiveTab: {
        padding: '8px 16px',
        backgroundColor: '#2C3E50',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        opacity: 0.85,
    },

    lowStockRow: {
        backgroundColor: '#ffeaea',
        color: '#d32f2f',
        fontWeight: 'bold',
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

export default Stock;
