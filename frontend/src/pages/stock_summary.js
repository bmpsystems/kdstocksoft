import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PAGE_SIZE = 10;

const Stocksummary = () => {
    const [stockSummary, setStockSummary] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredSummary, setFilteredSummary] = useState([]);

    useEffect(() => {
        // Fetch stock summary data from API
        fetch('http://localhost:5000/stock-summary', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then((data) => {
                setStockSummary(data);
                setFilteredSummary(data);
            })
            .catch((err) => {
                setStockSummary([]);
                setFilteredSummary([]);
                // Optionally handle error
            });
    }, []);

    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = stockSummary.filter(
            (item) =>
                (item.Company && item.Company.toLowerCase().includes(lowerTerm)) ||
                (item.Id && item.Id.toString().includes(lowerTerm)) ||
                (item.Amount && item.Amount.toString().includes(lowerTerm))
        );
        setFilteredSummary(filtered);
        setCurrentPage(1);
    }, [searchTerm, stockSummary]);

    const totalAmount = filteredSummary.reduce((sum, item) => sum + Number(item.Amount || 0), 0);
    const tableHeaders = [
        // "Sl No",
        "Make",
        "Quantity",
        "Amount (Rs)"
    ];

    // Pagination logic
    const sortedSummary = [...filteredSummary].sort((a, b) => b.Id - a.Id);
    const totalPages = Math.ceil(sortedSummary.length / PAGE_SIZE);
    const paginatedSummary = sortedSummary.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
    const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const handlePageClick = (page) => setCurrentPage(page);

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Stock Summary</h2>
            </div>

            {/* Search Field */}
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <input
                    type="text"
                    placeholder="Search by company, ID, or amount..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.search}
                />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f4f4f4' }}>
                        {/* <th style={{ ...styles.th, width: '10%' }}>Sl No</th> */}
                        <th style={{ ...styles.th, width: '30%' }}>Make</th>
                        <th style={{ ...styles.th, width: '10%' }}>Quantity</th>
                        <th style={{ ...styles.th, width: '10%' }}>Amount (Rs)</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedSummary && paginatedSummary.length > 0 ? (
                        paginatedSummary.map((stock, idx) => (
                            <tr key={stock.Id}>
                                {/* <td style={styles.td}>{stock.Id}</td> */}
                                <td style={styles.td}>{stock.Make}</td>
                                <td style={styles.td}>{stock.total_qty + " "+ stock.Unit}</td>
                                <td style={styles.td}>₹ {stock.Amount}</td>
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

            {/* Pagination Controls */}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <button
                    style={{ ...styles.button, opacity: currentPage === 1 ? 0.5 : 1 }}
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                >
                    Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                    <button
                        key={i + 1}
                        style={{
                            ...styles.button,
                            backgroundColor: currentPage === i + 1 ? '#2980b9' : '#2C3E50',
                            fontWeight: currentPage === i + 1 ? 'bold' : 'normal',
                            minWidth: '32px',
                            padding: '8px 12px'
                        }}
                        onClick={() => handlePageClick(i + 1)}
                    >
                        {i + 1}
                    </button>
                ))}
                <button
                    style={{ ...styles.button, opacity: currentPage === totalPages || totalPages === 0 ? 0.5 : 1 }}
                    onClick={handleNext}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    Next
                </button>
            </div>

            <div style={{ marginTop: '10px', textAlign: 'right', fontWeight: 'bold', marginRight: '170px' }}>
                Total Amount: ₹{totalAmount.toFixed(2)}
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
        margin: '0 2px'
    },
    search: {
        padding: '8px',
        width: '300px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        display: 'block',
        margin: '0 auto',
        marginBottom: '10px'
    }
    ,
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

export default Stocksummary;