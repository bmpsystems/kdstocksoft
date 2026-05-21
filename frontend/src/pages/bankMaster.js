import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';

const BankMaster = () => {
    const [banks, setBanks] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newBank, setNewBank] = useState({
        Bank: '',
        Address: '',
        Branch: '',
        Active: true,
    });
    const [editBank, setEditBank] = useState(null);
    const [activeStates, setActiveStates] = useState({});
    const tableHeaders = ["Bank", "Address", "Branch", "Edit", "Active"];
    const rowsPerPage = 10;
    const API_URL = 'https://kdstocksoft.onrender.com/bank';

    useEffect(() => {
        fetchBanks();
    }, []);

    const fetchBanks = () => {
        axios.get(API_URL)
            .then(res => {
                setBanks(res.data);
                setFiltered(res.data);
                const actives = {};
                res.data.forEach(item => {
                    actives[item.Id] = item.Active === 1;
                });
                setActiveStates(actives);
            })
            .catch(err => {
                console.error('Error fetching bank data:', err);
            });
    };

    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const results = banks.filter((bank) =>
            (bank.Bank || '').toLowerCase().includes(lowerTerm) ||
            (bank.Address || '').toLowerCase().includes(lowerTerm) ||
            (bank.Branch || '').toLowerCase().includes(lowerTerm)
        );
        setFiltered(results);
        setCurrentPage(1);
    }, [searchTerm, banks]);

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    const sortedFiltered = [...filtered].sort((a, b) => b.Id - a.Id); // Newest first
    const currentData = sortedFiltered.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewBank(prev => ({ ...prev, [name]: value }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditBank(prev => ({ ...prev, [name]: value }));
    };

    const handleAddClick = () => {
        setNewBank({
            Bank: '',
            Address: '',
            Branch: '',
            Active: true,
        });
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setNewBank({
            Bank: '',
            Address: '',
            Branch: '',
            Active: true,
        });
    };

    const handleEditClose = () => {
        setShowEditModal(false);
        setEditBank(null);
    };

    const handleSubmit = () => {
        if (!newBank.Bank.trim()) {
            alert('Please enter Bank Name');
            return;
        }
        const bankToSend = {
            Bank: newBank.Bank,
            Address: newBank.Address,
            Branch: newBank.Branch,
            Active: 1
        };
        axios.post(`${API_URL}/create`, bankToSend)
            .then(() => {
                fetchBanks();
                setShowModal(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Bank Added Successfully',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3085d6'
                });
                setNewBank({
                    Bank: '',
                    Address: '',
                    Branch: '',
                    Active: true,
                });
            })
            .catch((err) => {
                console.error("Error adding bank:", err.response?.data || err.message);
                alert("Failed to add bank.");
            });
    };

    const openEditModal = (bank) => {
        if (bank.Active === 1) {
            setEditBank({
                id: bank.Id,
                Bank: bank.Bank,
                Address: bank.Address,
                Branch: bank.Branch,
            });
            setShowEditModal(true);
        } else {
            alert("Inactive records cannot be edited");
        }
    };

    const handleEditSubmit = () => {
        if (!editBank.Bank.trim()) {
            alert('Please enter Bank Name');
            return;
        }
        const dataToUpdate = {
            Bank: editBank.Bank,
            Address: editBank.Address,
            Branch: editBank.Branch,
        };
        axios.put(`${API_URL}/${editBank.id}`, dataToUpdate)
            .then((response) => {
                const updated = banks.map((b) =>
                    b.Id === editBank.id ? response.data : b
                );
                setBanks(updated);
                setFiltered(updated);
                setShowEditModal(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Bank Updated Successfully',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3085d6'
                });
            })
            .catch((err) => {
                console.error('Update error:', err.response?.data || err.message);
                alert('Failed to update bank');
            });
    };

    const toggleActive = (id) => {
        axios
            .post(`${API_URL}/toggle`, { id })
            .then((res) => {
                const updatedBank = res.data;
                setBanks((prev) =>
                    prev.map((b) => (b.Id === id ? updatedBank : b))
                );
                setFiltered((prev) =>
                    prev.map((b) => (b.Id === id ? updatedBank : b))
                );
                setActiveStates((prev) => ({
                    ...prev,
                    [id]: updatedBank.Active === 1,
                }));
            })
            .catch((error) => {
                console.error('Toggle active failed:', error);
                alert('Failed to toggle bank status.');
            });
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Bank Master</h2>
                <button style={{ ...styles.button, padding: '6px 12px', fontSize: '14px' }} onClick={handleAddClick}>
                    Add Bank
                </button>
            </div>
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.search}
                />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f4f4f4' }}>
                        <th style={{ ...styles.th, width: '20%' }}>Bank</th>
                        <th style={{ ...styles.th, width: '25%' }}>Address</th>
                        <th style={{ ...styles.th, width: '20%' }}>Branch</th>
                        <th style={{ ...styles.th, width: '5%' }}>Edit</th>
                        <th style={{ ...styles.th, width: '5%' }}>Active</th>
                    </tr>
                </thead>
                <tbody>
                    {currentData && currentData.length > 0 ? (
                        [...currentData]
                            .sort((a, b) => b.Id - a.Id)
                            .map((bank) => (
                                <tr key={bank.Id}>
                                    <td style={styles.td}>{bank.Bank}</td>
                                    <td style={styles.td}>{bank.Address}</td>
                                    <td style={styles.td}>{bank.Branch}</td>
                                    <td style={styles.td} align="center">
                                        <button
                                            onClick={() => openEditModal(bank)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                padding: 0,
                                            }}
                                            aria-label={`Edit ${bank.Bank}`}
                                        >
                                            📝
                                        </button>
                                    </td>
                                    <td style={styles.td} align="center">
                                        <div
                                            onClick={async () => {
                                                const isActive = activeStates[bank.Id];
                                                const confirmMessage = isActive
                                                    ? 'Do you want to deactivate this bank?'
                                                    : 'Do you want to activate this bank?';

                                                if (window.confirm(confirmMessage)) {
                                                    await toggleActive(bank.Id);
                                                    const newStatus = !isActive;
                                                    if (newStatus) {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'Bank Activated',
                                                            confirmButtonText: 'OK',
                                                            confirmButtonColor: '#3085d6'
                                                        });
                                                    } else {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'Bank Inactivated',
                                                            confirmButtonText: 'OK',
                                                            confirmButtonColor: '#3085d6'
                                                        });
                                                    }
                                                }
                                            }}
                                            style={{
                                                ...styles.toggle,
                                                backgroundColor: activeStates[bank.Id] ? '#4CAF50' : '#ccc',
                                                justifyContent: activeStates[bank.Id] ? 'flex-start' : 'flex-end',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <div style={styles.circle}></div>
                                        </div>
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

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <label>
                    Page:{' '}
                    <select value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))}>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                    </select>
                </label>
            </div>

            {showEditModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Edit Bank</h3>
                            <button
                                onClick={handleEditClose}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '22px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    color: '#888',
                                    lineHeight: 1,
                                    padding: 0,
                                }}
                                aria-label="Close"
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                            <div style={{ width: '100%' }}>
                                <label htmlFor="edit-bank-bank" style={{ display: 'block', marginBottom: '6px' }}>
                                    Bank
                                </label>
                                <input
                                    id="edit-bank-bank"
                                    type="text"
                                    name="Bank"
                                    value={editBank?.Bank || ''}
                                    onChange={handleEditInputChange}
                                    style={{
                                        ...styles.input,
                                        width: '100%',
                                        margin: '0 0 12px 0',
                                        padding: '12px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ width: '100%' }}>
                                <label htmlFor="edit-bank-branch" style={{ display: 'block', marginBottom: '6px' }}>
                                    Branch
                                </label>
                                <input
                                    id="edit-bank-branch"
                                    type="text"
                                    name="Branch"
                                    value={editBank?.Branch || ''}
                                    onChange={handleEditInputChange}
                                    style={{
                                        ...styles.input,
                                        width: '100%',
                                        margin: '0 0 12px 0',
                                        padding: '12px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ width: '100%' }}>
                                <label htmlFor="edit-bank-address" style={{ display: 'block', marginBottom: '6px' }}>
                                    Address
                                </label>
                                <textarea
                                    id="edit-bank-address"
                                    name="Address"
                                    value={editBank?.Address || ''}
                                    onChange={handleEditInputChange}
                                    style={{
                                        ...styles.input,
                                        width: '100%',
                                        margin: '0 0 12px 0',
                                        padding: '12px',
                                        boxSizing: 'border-box',
                                        resize: 'vertical',
                                        minHeight: '55px'
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={handleEditSubmit} style={styles.button}>Submit</button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Add Bank</h3>
                            <button
                                onClick={handleClose}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '22px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    color: '#888',
                                    lineHeight: 1,
                                    padding: 0,
                                }}
                                aria-label="Close"
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                            <div style={{ width: '100%' }}>
                                <label htmlFor="add-bank-bank" style={{ display: 'block', marginBottom: '6px' }}>
                                    Bank
                                </label>
                                <input
                                    id="add-bank-bank"
                                    type="text"
                                    name="Bank"
                                    value={newBank.Bank}
                                    onChange={handleInputChange}
                                    style={{
                                        ...styles.input,
                                        width: '100%',
                                        margin: '0 0 12px 0',
                                        padding: '12px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ width: '100%' }}>
                                <label htmlFor="add-bank-branch" style={{ display: 'block', marginBottom: '6px' }}>
                                    Branch
                                </label>
                                <input
                                    id="add-bank-branch"
                                    type="text"
                                    name="Branch"
                                    value={newBank.Branch}
                                    onChange={handleInputChange}
                                    style={{
                                        ...styles.input,
                                        width: '100%',
                                        margin: '0 0 12px 0',
                                        padding: '12px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ width: '100%' }}>
                                <label htmlFor="add-bank-address" style={{ display: 'block', marginBottom: '6px' }}>
                                    Address
                                </label>
                                <textarea
                                    id="add-bank-address"
                                    name="Address"
                                    value={newBank.Address}
                                    onChange={handleInputChange}
                                    style={{
                                        ...styles.input,
                                        width: '100%',
                                        margin: '0 0 12px 0',
                                        padding: '12px',
                                        boxSizing: 'border-box',
                                        resize: 'vertical',
                                        minHeight: '55px'
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={handleSubmit} style={styles.button}>Submit</button>
                        </div>
                    </div>
                </div>
            )}
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
        width: '95%',
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

export default BankMaster;
