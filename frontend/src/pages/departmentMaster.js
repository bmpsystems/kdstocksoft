import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';

const DepartmentMaster = () => {
    const [products, setProducts] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [username, setUsername] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [newProduct, setNewProduct] = useState({
        department: '',
        Created_By: '',
        Modified_By: ''
    });
    const [activeStates, setActiveStates] = useState({}); // for toggle
    const [editProduct, setEditProduct] = useState(null);   // stores product being edited
    const [showEditModal, setShowEditModal] = useState(false); // controls if modal is visible
    const tableHeaders = [

        // "Sl No",
        "Department",
        "Edit",
        "Active"

    ];

    const rowsPerPage = 10;
    const API_URL = 'http://localhost:5000/department';

    useEffect(() => {
        // Fetch user info from localStorage
        const storedUsername = localStorage.getItem('name');
        if (storedUsername) setUsername(storedUsername);
    }, []);

    const openEditModal = (product) => {
        if (product.Active == 1) {

            setEditProduct({
                id: product.Id,
                department: product.Department
            });
            setShowEditModal(true);

        }
        else {
            alert("Inactive records cannot be edited")
        }
    };

    const handleAddClick = () => {
        setNewProduct({
            department: '',
            Created_By: '',
            Modified_By: ''
        }); // Reset values before showing modal
        setShowModal(true);
    };

    const handleClose = () => {
        setNewProduct({
            department: '',
            Created_By: '',
            Modified_By: ''
        }); // Reset values
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
            product.Department?.toLowerCase().includes(lowerTerm)
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

    const handleSubmit = () => {

        if (newProduct.department == "") {
            alert('Please enter Department');
            return
        }

        const productToSend = {
            Department: newProduct.department,
            Created_By: username,
            Active: 1,
        };

        axios.post(`${API_URL}/create`, productToSend)
            .then(() => {
                fetchProducts(); // ✅ This ensures full data integrity
                setNewProduct({
                    department: '',
                    Created_By: '',
                    Modified_By: ''
                });
                setShowModal(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Department Added Successfully',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3085d6'
                });
            })
            .catch((err) => {
                console.error("❌ Error adding Department:", err.response?.data || err.message);
                alert("Failed to add Department.");
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
                alert('Failed to toggle department status.');
            });
    };


    const handleEditSubmit = () => {

        if (editProduct.department == "") {
            alert('Please enter Department');
            return
        }

        const productToUpdate = {
            Department: editProduct.department,
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

                Swal.fire({
                    icon: 'success',
                    title: 'Department Updated Successfully',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3085d6'
                });


            })
            .catch((err) => {
                console.error('Update error:', err.response?.data || err.message);
                alert('Failed to update Department');
            });
    };




    return (
        <div style={{ padding: '20px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>

                <h2 style={{ margin: 0 }}>Department Master</h2>

                <button style={{ ...styles.button, padding: '6px 12px', fontSize: '14px' }} onClick={handleAddClick}>
                    Add Department
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
                        {/* <th style={{ ...styles.th, width: '10%' }}>Sl No</th> */}
                        <th style={{ ...styles.th, width: '20%' }}>Department</th>
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
                                    <td style={styles.td}>{product.Department}</td>
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
                                            aria-label={`Edit ${product.Department}`}
                                        >
                                            📝
                                        </button>
                                    </td>
                                    <td style={styles.td} align="center">
                                        <div
                                            onClick={async () => {
                                                const isActive = activeStates[product.Id];
                                                const confirmMessage = isActive
                                                    ? 'Do you want to deactivate this department?'
                                                    : 'Do you want to activate this department?';

                                                if (window.confirm(confirmMessage)) {
                                                    // Call the function and wait for update
                                                    await toggleActive(product.Id);

                                                    // Show alert based on the new value
                                                    const newStatus = !isActive;
                                                    if (newStatus) {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'Department Data Activated',
                                                            confirmButtonText: 'OK',
                                                            confirmButtonColor: '#3085d6'
                                                        });
                                                    } else {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'Department Data Inactivated',
                                                            confirmButtonText: 'OK',
                                                            confirmButtonColor: '#3085d6'
                                                        });
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Edit Department</h3>
                            <button
                                onClick={() => setShowEditModal(false)}
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
                                <label htmlFor="edit-department" style={{ display: 'block', marginBottom: '6px', }}>
                                    Department
                                </label>
                                <input
                                    id="edit-department"
                                    type="text"
                                    name="department"
                                    value={editProduct?.department || ''}
                                    onChange={(e) =>
                                        setEditProduct((prev) => ({ ...prev, department: e.target.value }))
                                    }
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
                            <h3 style={{ margin: 0 }}>Add Department</h3>
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
                                <label htmlFor="add-department" style={{ display: 'block', marginBottom: '6px' }}>
                                    Department
                                </label>
                                <input
                                    id="add-department"
                                    type="text"
                                    name="department"
                                    value={newProduct.department}
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

export default DepartmentMaster;
