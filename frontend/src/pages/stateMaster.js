import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';

const StateMaster = () => {
    const [states, setStates] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newState, setNewState] = useState({
        State: '',
        Active: true,
    });
    const [editState, setEditState] = useState(null);
    const [activeStates, setActiveStates] = useState({});
    const tableHeaders = ["State", "Edit", "Active"];
    const rowsPerPage = 10;
    const API_URL = 'https://kdstocksoft.onrender.com/states';

    useEffect(() => {
        fetchStates();
    }, []);

    const fetchStates = () => {
        axios.get(API_URL)
            .then(res => {
                setStates(res.data);
                setFiltered(res.data);
                const actives = {};
                res.data.forEach(item => {
                    actives[item.Id] = item.Active === 1;
                });
                setActiveStates(actives);
            })
            .catch(err => {
                console.error('Error fetching states data:', err);
            });
    };

    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const results = states.filter((state) =>
            (state.State || '').toLowerCase().includes(lowerTerm)
        );
        setFiltered(results);
        setCurrentPage(1);
    }, [searchTerm, states]);

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    const sortedFiltered = [...filtered].sort((a, b) => b.Id - a.Id); // Newest first
    const currentData = sortedFiltered.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewState(prev => ({ ...prev, [name]: value }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditState(prev => ({ ...prev, [name]: value }));
    };

    const handleAddClick = () => {
        setNewState({
            State: '',
            Active: true,
        });
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setNewState({
            State: '',
            Active: true,
        });
    };

    const handleEditClose = () => {
        setShowEditModal(false);
        setEditState(null);
    };

    const handleSubmit = () => {
        if (!newState.State.trim()) {
            alert('Please enter State Name');
            return;
        }
        const stateToSend = {
            State: newState.State,
            Active: 1
        };
        axios.post(`${API_URL}/create`, stateToSend)
            .then(() => {
                fetchStates();
                setShowModal(false);
                Swal.fire({
                    icon: 'success',
                    title: 'State Added Successfully',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3085d6'
                });
                setNewState({
                    State: '',
                    Active: true,
                });
            })
            .catch((err) => {
                console.error("Error adding state:", err.response?.data || err.message);
                alert("Failed to add state.");
            });
    };

    const openEditModal = (state) => {
        if (state.Active === 1) {
            setEditState({
                id: state.Id,
                State: state.State,
            });
            setShowEditModal(true);
        } else {
            alert("Inactive records cannot be edited");
        }
    };

    const handleEditSubmit = () => {
        if (!editState.State.trim()) {
            alert('Please enter State Name');
            return;
        }
        const dataToUpdate = {
            State: editState.State,
        };
        axios.put(`${API_URL}/${editState.id}`, dataToUpdate)
            .then((response) => {
                const updated = states.map((b) =>
                    b.Id === editState.id ? response.data : b
                );
                setStates(updated);
                setFiltered(updated);
                setShowEditModal(false);
                Swal.fire({
                    icon: 'success',
                    title: 'State Updated Successfully',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3085d6'
                });
            })
            .catch((err) => {
                console.error('Update error:', err.response?.data || err.message);
                alert('Failed to update state');
            });
    };

    const toggleActive = (id) => {
        axios
            .post(`${API_URL}/toggle`, { id })
            .then((res) => {
                const updatedItem = res.data;
                setStates((prev) =>
                    prev.map((b) => (b.Id === id ? updatedItem : b))
                );
                setFiltered((prev) =>
                    prev.map((b) => (b.Id === id ? updatedItem : b))
                );
                setActiveStates((prev) => ({
                    ...prev,
                    [id]: updatedItem.Active === 1,
                }));
            })
            .catch((error) => {
                console.error('Toggle active failed:', error);
                alert('Failed to toggle state status.');
            });
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>State Master</h2>
                <button style={{ ...styles.button, padding: '6px 12px', fontSize: '14px' }} onClick={handleAddClick}>
                    Add State
                </button>
            </div>
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <input
                    type="text"
                    placeholder="Search State"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.search}
                />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f4f4f4' }}>
                        <th style={{ ...styles.th, width: '70%' }}>State</th>
                        <th style={{ ...styles.th, width: '10%' }}>Edit</th>
                        <th style={{ ...styles.th, width: '10%' }}>Active</th>
                    </tr>
                </thead>
                <tbody>
                    {currentData && currentData.length > 0 ? (
                        [...currentData]
                            .sort((a, b) => b.Id - a.Id)
                            .map((state) => (
                                <tr key={state.Id}>
                                    <td style={styles.td}>{state.State}</td>
                                    <td style={styles.td} align="center">
                                        <button
                                            onClick={() => openEditModal(state)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                padding: 0,
                                            }}
                                            aria-label={`Edit ${state.State}`}
                                        >
                                            📝
                                        </button>
                                    </td>
                                    <td style={styles.td} align="center">
                                        <div
                                            onClick={async () => {
                                                const isActive = activeStates[state.Id];
                                                const confirmMessage = isActive
                                                    ? 'Do you want to deactivate this state?'
                                                    : 'Do you want to activate this state?';

                                                if (window.confirm(confirmMessage)) {
                                                    await toggleActive(state.Id);
                                                    const newStatus = !isActive;
                                                    if (newStatus) {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'State Activated',
                                                            confirmButtonText: 'OK',
                                                            confirmButtonColor: '#3085d6'
                                                        });
                                                    } else {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'State Inactivated',
                                                            confirmButtonText: 'OK',
                                                            confirmButtonColor: '#3085d6'
                                                        });
                                                    }
                                                }
                                            }}
                                            style={{
                                                ...styles.toggle,
                                                backgroundColor: activeStates[state.Id] ? '#4CAF50' : '#ccc',
                                                justifyContent: activeStates[state.Id] ? 'flex-start' : 'flex-end',
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
                            <h3 style={{ margin: 0 }}>Edit State</h3>
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
                                <label htmlFor="edit-state-name" style={{ display: 'block', marginBottom: '6px' }}>
                                    State
                                </label>
                                <input
                                    id="edit-state-name"
                                    type="text"
                                    name="State"
                                    value={editState?.State || ''}
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
                            <h3 style={{ margin: 0 }}>Add State</h3>
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
                                <label htmlFor="add-state-name" style={{ display: 'block', marginBottom: '6px' }}>
                                    State
                                </label>
                                <input
                                    id="add-state-name"
                                    type="text"
                                    name="State"
                                    value={newState.State}
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

export default StateMaster;
