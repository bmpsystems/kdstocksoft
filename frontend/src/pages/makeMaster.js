import React, { useEffect, useState } from 'react';
import axios from 'axios';

const MakeMaster = () => {
    const [products, setProducts] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [username, setUsername] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newProduct, setNewProduct] = useState({ make: '', address: '', contPerson: '', contNo: '', gstin: '' });
    const [activeStates, setActiveStates] = useState({}); // for toggle
    const [editProduct, setEditProduct] = useState(null);   // stores product being edited
    const [showEditModal, setShowEditModal] = useState(false); // controls if modal is visible
    const tableHeaders = [
        // "Sl No",
        "Make",
        "Address",
        "Contact Person",
        "Contact Number",
        // "GSTIN",
        "Edit",
        "Active"
    ];

    const rowsPerPage = 10;
    const API_URL = 'http://localhost:5000/make';

    useEffect(() => {
        const storedUsername = localStorage.getItem('name');
        if (storedUsername) setUsername(storedUsername);
    }, []);

    const openEditModal = (product) => {
        if (product.Active == 1) {
            setEditProduct({
                id: product.Id,
                make: product.Make,
                address: product.Address,
                contPerson: product.Cont_Person,
                contNo: product.Cont_No,
                gstin: product.Gstin
            });
            setShowEditModal(true);
        }
        else {
            alert("Inactive records cannot be edited")
        }
    };

    const handleAddClick = () => {
        setNewProduct({ make: '', address: '', contPerson: '', contNo: '', gstin: '' }); // Reset values before showing modal
        setShowModal(true);
    };

    const handleClose = () => {
        setNewProduct({ make: '', address: '', contPerson: '', contNo: '', gstin: '' }); // Reset values
        setShowModal(false);
    };

    useEffect(() => {
        axios.get(API_URL)
            .then((response) => {
                setProducts(response.data);
                setFiltered(response.data);

                // Setup toggle states
                const actives = {};
                response.data.forEach(item => {
                    actives[item.Id] = item.Active === 1;  // interpret 1 as true
                });

                setActiveStates(actives);
            })
            .catch((error) => {
                console.error('Error fetching data:', error);
            });
    }, []);

    const fetchProducts = () => {
        axios.get(API_URL).then((response) => {
            setProducts(response.data);
            setFiltered(response.data);

            const actives = {};
            response.data.forEach(item => {
                actives[item.Id] = item.Active === 1;
            });
            setActiveStates(actives);
        }).catch((error) => {
            console.error('❌ Error fetching data:', error);
        });
    };

    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const results = products.filter((product) =>
            // product.Id.toString().includes(lowerTerm) ||
            product.Make?.toLowerCase().includes(lowerTerm) ||
            product.Address?.toLowerCase().includes(lowerTerm) ||
            product.Cont_Person?.toLowerCase().includes(lowerTerm) ||
            product.Cont_No?.toLowerCase().includes(lowerTerm) ||
            product.Gstin?.toLowerCase().includes(lowerTerm) ||
            product.Active?.toString().includes(lowerTerm)
        );
        setFiltered(results);
        setCurrentPage(1);
    }, [searchTerm, products]);


    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    const sortedFiltered = [...filtered].sort((a, b) => b.Id - a.Id); // Sort by newest first
    const currentData = sortedFiltered.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewProduct((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditProduct((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        const productToSend = {
            Make: newProduct.make,
            Address: newProduct.address,
            Cont_Person: newProduct.contPerson,
            Cont_No: newProduct.contNo,
            Gstin: newProduct.gstin,
            Created_By: username,
            Active: 1,
        };

        axios.post(`${API_URL}/create`, productToSend)
            .then(() => {
                fetchProducts(); // ✅ This ensures full data integrity
                setNewProduct({ make: '', address: '', contPerson: '', contNo: '', gstin: '' });
                setShowModal(false);
                setTimeout(() => {
                    alert("Make Added Successfully !!");
                }, 300);
            })
            .catch((err) => {
                console.error("❌ Error adding Make:", err.response?.data || err.message);
                alert("Failed to add Make.");
            });
    };

    const toggleActive = (id) => {
        axios
            .post(`${API_URL}/toggle`, { id }) // Call the backend toggle API
            .then((res) => {
                const updatedProduct = res.data;

                setProducts((prev) =>
                    prev.map((p) => (p.Id === id ? updatedProduct : p))
                );

                setFiltered((prev) =>
                    prev.map((p) => (p.Id === id ? updatedProduct : p))
                );

                setActiveStates((prev) => ({
                    ...prev,
                    [id]: updatedProduct.Active === 1, // Convert numeric to boolean
                }));
            })
            .catch((error) => {
                console.error('Toggle active failed:', error);
                alert('Failed to toggle make status.');
            });
    };

    const handleEditSubmit = () => {
        const productToUpdate = {
            Make: editProduct.make,
            Address: editProduct.address,
            Cont_Person: editProduct.contPerson,
            Cont_No: editProduct.contNo,
            Gstin: editProduct.gstin,
            Modified_By: username
        };

        axios
            .put(`${API_URL}/${editProduct.id}`, productToUpdate)
            .then((response) => {
                const updated = products.map((p) =>
                    p.Id === editProduct.id ? response.data : p
                );
                setProducts(updated);
                setFiltered(updated);
                setShowEditModal(false);

                setTimeout(() => {
                    alert("Make Updated Successfully !!");
                }, 300);
            })
            .catch((err) => {
                console.error('Update error:', err.response?.data || err.message);
                alert('Failed to update Make');
            });
    };

    // Helper for required star
    const RequiredStar = () => (
        <span style={{ color: 'red', marginLeft: 4 }}>*</span>
    );

    // Form fields config for both add and edit
    const formFields = [
        { name: 'make', label: 'Make Name' },
        { name: 'address', label: 'Address' },
        { name: 'contPerson', label: 'Contact Person' },
        { name: 'contNo', label: 'Contact Number' },
        { name: 'gstin', label: 'GSTIN' }
    ];

    return (
        <div style={{ padding: '20px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Make Master</h2>
                <button style={{ ...styles.button, padding: '6px 12px', fontSize: '14px' }} onClick={handleAddClick}>
                    Add Make
                </button>
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
                        {/* <th style={{ ...styles.th, width: '10%' }}>Sl No</th> */}
                        <th style={{ ...styles.th, width: '20%' }}>Make</th>
                        <th style={{ ...styles.th, width: '20%' }}>Address</th>
                        <th style={{ ...styles.th, width: '20%' }}>Contact Person</th>
                        <th style={{ ...styles.th, width: '20%' }}>Contact Number</th>
                       {/* <th style={{ ...styles.th, width: '5%' }}>GSTIN</th>*/}
                        <th style={{ ...styles.th, width: '5%' }}>Edit</th>
                        <th style={{ ...styles.th, width: '5%' }}>Active</th>
                    </tr>
                </thead>
                <tbody>
                    {currentData && currentData.length > 0 ? (
                        [...currentData]
                            .sort((a, b) => b.Id - a.Id) // Sort by most recent (assuming higher ID = newer)
                            .map((product) => (
                                <tr key={product.Id}>
                                    {/* <td style={styles.td}>{product.Id}</td> */}
                                    <td style={styles.td}>{product.Make}</td>
                                    <td style={styles.td}>{product.Address}</td>
                                    <td style={styles.td}>{product.Cont_Person}</td>
                                    <td style={styles.td}>{product.Cont_No}</td>
                                    {/* <td style={styles.td}>{product.Gstin}</td> */}
                                    <td style={styles.td} align="center">
                                        <button
                                            onClick={() => openEditModal(product)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                padding: 0,
                                            }}
                                            aria-label={`Edit ${product.Make}`}
                                        >
                                            📝
                                        </button>
                                    </td>
                                    <td style={styles.td} align="center">
                                        <div
                                            onClick={async () => {
                                                const isActive = activeStates[product.Id];
                                                const confirmMessage = isActive
                                                    ? 'Do you want to deactivate this make?'
                                                    : 'Do you want to activate this make?';

                                                if (window.confirm(confirmMessage)) {
                                                    // Call the function and wait for update
                                                    await toggleActive(product.Id);

                                                    // Show alert based on the new value
                                                    const newStatus = !isActive;
                                                    if (newStatus) {
                                                        setTimeout(() => {
                                                            alert('Make activated');
                                                        }, 300);
                                                    } else {
                                                        setTimeout(() => {
                                                            alert('Make inactivated');
                                                        }, 300);
                                                    }
                                                }
                                            }}

                                            style={{
                                                ...styles.toggle,
                                                backgroundColor: activeStates[product.Id] ? '#4CAF50' : '#ccc',
                                                justifyContent: activeStates[product.Id] ? 'flex-start' : 'flex-end',
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
                        <h3>Edit Make</h3>
                        {formFields.map((field) => (
                            <div key={field.name}>
                                <label htmlFor={field.name} style={{ fontWeight: 'bold', display: 'block' }}>
                                    {field.label}
                                    <RequiredStar />
                                </label>
                                <input
                                    type="text"
                                    name={field.name}
                                    value={editProduct?.[field.name] || ''}
                                    onChange={handleEditInputChange}
                                    style={styles.input}
                                />
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={handleEditSubmit} style={styles.button}>Submit</button>
                            <button onClick={() => setShowEditModal(false)} style={{ ...styles.button, backgroundColor: '#ccc' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <h3>Add Make</h3>
                        {formFields.map((field) => (
                            <div key={field.name}>
                                <label htmlFor={field.name} style={{ fontWeight: 'bold', display: 'block' }}>
                                    {field.label}
                                    <RequiredStar />
                                </label>
                                <input
                                    type="text"
                                    name={field.name}
                                    value={newProduct[field.name]}
                                    onChange={handleInputChange}
                                    style={styles.input}
                                />
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={handleSubmit} style={styles.button}>Submit</button>
                            <button onClick={handleClose} style={{ ...styles.button, backgroundColor: '#ccc' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
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

export default MakeMaster;
