import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';

const ProductCategoryMaster = () => {
    const [products, setProducts] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [username, setUsername] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [newProduct, setNewProduct] = useState({
        category: '',
        make_Id: '',
        Created_By: '',
        Modified_By: ''
    });
    const [activeStates, setActiveStates] = useState({}); // for toggle
    const [editProduct, setEditProduct] = useState(null);   // stores product being edited
    const [showEditModal, setShowEditModal] = useState(false); // controls if modal is visible
    const [makes, setMakes] = useState([]); // For Make dropdown

    const tableHeaders = [
        // "Sl No",
        "Category",
        "Make",
        "Edit",
        "Active"
    ];

    const rowsPerPage = 10;
    const API_URL = 'https://kdstocksoft.onrender.com/product-category';
    const MAKE_API_URL = 'https://kdstocksoft.onrender.com/make-helper';

    useEffect(() => {
        // Fetch user info from localStorage
        const storedUsername = localStorage.getItem('name');
        if (storedUsername) setUsername(storedUsername);
    }, []);

    // Fetch makes for dropdown
    useEffect(() => {
        axios.get(MAKE_API_URL)
            .then((response) => {
                setMakes(response.data);
            })
            .catch((error) => {
                console.error('Error fetching makes:', error);
            });
    }, []);

    // Fix: Ensure make_Id is set correctly regardless of backend field name
    const openEditModal = (product) => {
        if (product.Active == 1) {
            // Try to get make_Id from product.make_Id, product.Make_Id, or product.Make
            let makeId = '';
            if (product.make_Id !== undefined && product.make_Id !== null) {
                makeId = product.make_Id;
            } else if (product.Make_Id !== undefined && product.Make_Id !== null) {
                makeId = product.Make_Id;
            } else if (product.Make !== undefined && product.Make !== null) {
                // If Make is a string, try to find the corresponding make object
                const foundMake = makes.find(m => m.Make === product.Make);
                if (foundMake) {
                    makeId = foundMake.Id;
                }
            }
            setEditProduct({
                id: product.Id,
                category: product.Category,
                make_Id: makeId !== undefined && makeId !== null ? String(makeId) : ''
            });
            setShowEditModal(true);
        }
        else {
            alert("Inactive records cannot be edited")
        }
    };

    const handleAddClick = () => {
        setNewProduct({
            category: '',
            make_Id: '',
            Created_By: '',
            Modified_By: ''
        }); // Reset values before showing modal
        setShowModal(true);
    };

    const handleClose = () => {
        setNewProduct({
            category: '',
            make_Id: '',
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
            product.Category?.toLowerCase().includes(lowerTerm)
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
        if (newProduct.category === "") {
            alert('Please enter Category');
            return;
        }
        if (!newProduct.make_Id) {
            alert('Please select Make');
            return;
        }

        const productToSend = {
            Category: newProduct.category,
            Make_Id: newProduct.make_Id,
            Created_By: username,
            Created_On: new Date().toISOString().slice(0, 10),
            Active: 1,
        };

        axios.post(`${API_URL}/create`, productToSend)
            .then(() => {
                fetchProducts(); // ✅ This ensures full data integrity
                setNewProduct({
                    category: '',
                    make_Id: '',
                    Created_By: '',
                    Modified_By: ''
                });
                setShowModal(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Product Category Added Successfully',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3085d6'
                });
            })
            .catch((err) => {
                console.error("❌ Error adding Category:", err.response?.data || err.message);
                alert("Failed to add Category.");
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
                alert('Failed to toggle category status.');
            });
    };

    const handleEditSubmit = () => {
        if (editProduct.category === "") {
            alert('Please enter Category');
            return;
        }
        if (!editProduct.make_Id) {
            alert('Please select Make');
            return;
        }

        const productToUpdate = {
            Category: editProduct.category,
            Make_Id: editProduct.make_Id,
            Modified_By: username,
            Modified_On: new Date().toISOString().slice(0, 10),
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
                    title: 'Product Category Updated Successfully',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3085d6'
                });
            })
            .catch((err) => {
                console.error('Update error:', err.response?.data || err.message);
                alert('Failed to update Category');
            });
    };

    // Helper to get make name by id
    const getMakeName = (makeId) => {
        const make = makes.find(m => String(m.Id) === String(makeId));
        return make ? make.Make : '';
    };

    return (
        <div style={{ padding: '20px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>

                <h2 style={{ margin: 0 }}>Product Category Master</h2>

                <button style={{ ...styles.button, padding: '6px 12px', fontSize: '14px' }} onClick={handleAddClick}>
                    Add Category
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
                        {/* <th style={{ ...styles.th, width: '3%' }}>Sl No</th> */}
                        <th style={{ ...styles.th, width: '20%' }}>Category</th>
                        <th style={{ ...styles.th, width: '20%' }}>Make</th>
                        <th style={{ ...styles.th, width: '3%' }}>Edit</th>
                        <th style={{ ...styles.th, width: '3%' }}>Active</th>
                    </tr>
                </thead>
                <tbody>
                    {currentData && currentData.length > 0 ? (
                        [...currentData]
                            .sort((a, b) => b.Id - a.Id) // Sort by most recent (assuming higher ID = newer)
                            .map((product) => (
                                <tr key={product.Id}>
                                    {/* <td style={styles.td}>{product.Id}</td> */}
                                    <td style={styles.td}>{product.Category}</td>
                                    <td style={styles.td}>{product.Make}</td>
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
                                            aria-label={`Edit ${product.Category}`}
                                        >
                                            📝
                                        </button>
                                    </td>
                                    <td style={styles.td} align="center">
                                        <div
                                            onClick={async () => {
                                                const isActive = activeStates[product.Id];
                                                const confirmMessage = isActive
                                                    ? 'Do you want to deactivate this category?'
                                                    : 'Do you want to activate this category?';

                                                if (window.confirm(confirmMessage)) {
                                                    // Call the function and wait for update
                                                    await toggleActive(product.Id);

                                                    // Show alert based on the new value
                                                    const newStatus = !isActive;
                                                    if (newStatus) {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'Product Category Data Activated',
                                                            confirmButtonText: 'OK',
                                                            confirmButtonColor: '#3085d6'
                                                        });
                                                    } else {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'Product Category Data Inactivated',
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
                            <h3 style={{ margin: 0 }}>Edit Category</h3>
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
                                <label htmlFor="edit-category" style={{ display: 'block', marginBottom: '6px', }}>
                                    Category
                                </label>
                                <input
                                    id="edit-category"
                                    type="text"
                                    name="category"
                                    value={editProduct?.category || ''}
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
                                <label htmlFor="edit-make" style={{ display: 'block', marginBottom: '6px' }}>
                                    Make
                                </label>
                                <select
                                    id="edit-make"
                                    name="make_Id"
                                    value={editProduct?.make_Id || ''}
                                    onChange={handleEditInputChange}
                                    style={{
                                        ...styles.input,
                                        width: '100%',
                                        margin: '0 0 12px 0',
                                        padding: '12px',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <option value="">Select Make</option>
                                    {makes.map((make) => (
                                        <option key={make.Id} value={make.Id}>
                                            {make.Make}
                                        </option>
                                    ))}
                                </select>
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
                            <h3 style={{ margin: 0 }}>Add Category</h3>
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
                                <label htmlFor="add-category" style={{ display: 'block', marginBottom: '6px' }}>
                                    Category
                                </label>
                                <input
                                    id="add-category"
                                    type="text"
                                    name="category"
                                    value={newProduct.category}
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
                                <label htmlFor="add-make" style={{ display: 'block', marginBottom: '6px' }}>
                                    Make
                                </label>
                                <select
                                    id="add-make"
                                    name="make_Id"
                                    value={newProduct.make_Id}
                                    onChange={handleInputChange}
                                    style={{
                                        ...styles.input,
                                        width: '100%',
                                        margin: '0 0 12px 0',
                                        padding: '12px',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <option value="">Select Make</option>
                                    {makes.map((make) => (
                                        <option key={make.Id} value={make.Id}>
                                            {make.Make}
                                        </option>
                                    ))}
                                </select>
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

export default ProductCategoryMaster;
