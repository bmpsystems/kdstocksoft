import React, { useEffect, useState } from 'react';
import axios from 'axios';

const EyeIcon = ({ visible, onClick }) => (
  <span
    onClick={onClick}
    style={{
      cursor: 'pointer',
      position: 'absolute',
      right: 16,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 2,
      color: '#888',
      fontSize: 18,
      userSelect: 'none',
    }}
    tabIndex={0}
    aria-label={visible ? "Hide password" : "Show password"}
    role="button"
  >
    {visible ? (
      // Eye open
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="7" ry="5"/><circle cx="12" cy="12" r="2"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/></svg>
    ) : (
      // Eye closed
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-10-7-10-7a21.77 21.77 0 0 1 5.06-7.94"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3.5 3.5 0 0 0 12 15.5a3.5 3.5 0 0 0 2.47-5.97"/><path d="M12 5c7 0 10 7 10 7a21.77 21.77 0 0 1-5.06 7.94"/></svg>
    )}
  </span>
);

const Users = () => {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]); // For roles
  // Add name field to newProduct and editProduct
  const [newProduct, setNewProduct] = useState({ name: '', username: '', password: '', dept_Id: '', role_id: '' });
  const [activeStates, setActiveStates] = useState({}); // for toggle
  const [editProduct, setEditProduct] = useState(null);   // stores product being edited
  const [showEditModal, setShowEditModal] = useState(false); // controls if modal is visible

  // Password visibility states
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const tableHeaders = [
    // "Sl No",
    "Username",
    "Name",
    "Department",
    "Role",
    "Edit",
    "Active"
  ];

  const rowsPerPage = 10;
  const API_URL = 'https://kdstocksoft.onrender.com/users';

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          axios.get(`https://kdstocksoft.onrender.com/department`),
          axios.get(`https://kdstocksoft.onrender.com/user-role`)
        ]);
        setDropdownOptions(deptRes.data); // Assuming response is an array
        setRoleOptions(roleRes.data); // Assuming response is an array
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };

    fetchOptions();
  }, []);

  // Fix: Ensure dept_Id and role_id are set correctly in editProduct for the edit popup
  const openEditModal = (product) => {
    if (product.Active === 1) {
      // Find the correct department id (Dept_Id or department)
      let deptIdValue = '';
      if (product.Dept_Id !== undefined && product.Dept_Id !== null) {
        deptIdValue = product.Dept_Id;
      } else if (product.dept_Id !== undefined && product.dept_Id !== null) {
        deptIdValue = product.dept_Id;
      } else if (product.department && dropdownOptions.length > 0) {
        // Try to find the department id from the department name
        const found = dropdownOptions.find(
          (opt) =>
            opt.Department === product.department ||
            opt.department === product.department
        );
        if (found) deptIdValue = found.Id;
      }

      // Find the correct role id (role_id or role)
      let roleIdValue = '';
      if (product.role_id !== undefined && product.role_id !== null) {
        roleIdValue = product.role_id;
      } else if (product.Role_Id !== undefined && product.Role_Id !== null) {
        roleIdValue = product.Role_Id;
      } else if (product.role && roleOptions.length > 0) {
        // Try to find the role id from the role name
        const foundRole = roleOptions.find(
          (opt) =>
            opt.Role === product.role ||
            opt.role === product.role
        );
        if (foundRole) roleIdValue = foundRole.Id;
      }

      setEditProduct({
        id: product.id,
        name: product.name || '', // Add name field
        username: product.username,
        password: product.password,
        dept_Id: deptIdValue,
        role_id: roleIdValue,
      });
      setShowEditModal(true);

      // Only fetch if dropdownOptions or roleOptions is empty
      if ((!dropdownOptions || dropdownOptions.length === 0) || (!roleOptions || roleOptions.length === 0)) {
        Promise.all([
          axios.get(`https://kdstocksoft.onrender.com/department`),
          axios.get(`https://kdstocksoft.onrender.com/user-role`)
        ])
          .then(([deptRes, roleRes]) => {
            setDropdownOptions(deptRes.data);
            setRoleOptions(roleRes.data);
            // After fetching, try to set dept_Id and role_id again if not set
            if (!deptIdValue && product.department) {
              const found = deptRes.data.find(
                (opt) =>
                  opt.Department === product.department ||
                  opt.department === product.department
              );
              setEditProduct(prev => ({
                ...prev,
                dept_Id: found ? found.Id : ''
              }));
            }
            if (!roleIdValue && product.role) {
              const foundRole = roleRes.data.find(
                (opt) =>
                  opt.Role === product.role ||
                  opt.role === product.role
              );
              setEditProduct(prev => ({
                ...prev,
                role_id: foundRole ? foundRole.Id : ''
              }));
            }
          })
          .catch((err) => {
            console.error("❌ Failed to fetch department/role options:", err.message);
            alert("🚫 Could not load departments or roles");
          });
      }
    } else {
      alert("Inactive records cannot be edited");
    }
  };

  const handleAddClick = () => {
    setNewProduct({ name: '', username: '', password: '', dept_Id: '', role_id: '' }); // Reset values before showing modal
    setShowModal(true);
  };

  const handleClose = () => {
    setNewProduct({
      name: '', username: '', password: '', dept_Id: '', role_id: ''
    }); // Reset values
    setShowModal(false);
  };

  useEffect(() => {
    axios.get(API_URL)
      .then((response) => {
        // Sort by newest first (highest Id at top)
        const sortedData = [...response.data].sort((a, b) => (b.Id || b.id) - (a.Id || a.id));
        setProducts(sortedData);
        setFiltered(sortedData);

        // Setup toggle states
        const actives = {};
        sortedData.forEach(item => {
          actives[item.id] = item.Active === 1;  // interpret 1 as true
        });

        setActiveStates(actives);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  }, []);

  const fetchProducts = () => {
    axios.get(API_URL).then((response) => {
      // Sort by newest first (highest Id at top)
      const sortedData = [...response.data].sort((a, b) => (b.Id || b.id) - (a.Id || a.id));
      setProducts(sortedData);
      setFiltered(sortedData);

      const actives = {};
      sortedData.forEach(item => {
        actives[item.id] = item.Active === 1;
      });
      setActiveStates(actives);
    }).catch((error) => {
      console.error('❌ Error fetching data:', error);
    });
  };

  useEffect(() => {
    const lowerTerm = searchTerm.toLowerCase();
    const results = products.filter((product) =>
      product.id.toString().includes(lowerTerm) ||
      product.username?.toLowerCase().includes(lowerTerm) ||
      // product.password?.toLowerCase().includes(lowerTerm) ||
      product.department?.toLowerCase().includes(lowerTerm) ||
      (product.role?.toLowerCase?.() || '').includes(lowerTerm) ||
      product.Active?.toString().includes(lowerTerm)
    );
    setFiltered(results);
    setCurrentPage(1);
  }, [searchTerm, products]);


  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  // Already sorted in fetchProducts/useEffect, so just slice
  const currentData = filtered.slice(
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
      name: newProduct.name,
      username: newProduct.username,
      // password: SHA256(newProduct.password).toString(), // Converts to string hex
      password: newProduct.password,
      Dept_Id: newProduct.dept_Id,
      role_id: newProduct.role_id,
      Active: 1,
    };

    axios.post(`${API_URL}/create`, productToSend)
      .then((res) => {
        // Instead of refetching, optimistically add new record to top
        // But to ensure full data integrity, fetch and sort again
        fetchProducts();
        setNewProduct({ name: '', username: '', password: '', dept_Id: '', role_id: '' });
        setShowModal(false);
        setTimeout(() => {
          alert("Users Added Successfully !!");
        }, 300);
      })
      .catch((err) => {
        console.error("❌ Error adding Users:", err.response?.data || err.message);
        alert("Failed to add Users.");
      });
  };


  const toggleActive = (id) => {
    axios
      .post(`${API_URL}/toggle`, { id }) // Call the backend toggle API
      .then((res) => {
        const updatedProduct = res.data;

        setProducts((prev) => {
          // Replace and keep sorted by newest first
          const updated = prev.map((p) => (p.id === id ? updatedProduct : p));
          return [...updated].sort((a, b) => (b.Id || b.id) - (a.Id || a.id));
        });

        setFiltered((prev) => {
          const updated = prev.map((p) => (p.id === id ? updatedProduct : p));
          return [...updated].sort((a, b) => (b.Id || b.id) - (a.Id || a.id));
        });

        setActiveStates((prev) => ({
          ...prev,
          [id]: updatedProduct.Active === 1, // Convert numeric to boolean
        }));
      })
      .catch((error) => {
        console.error('Toggle active failed:', error);
        alert('Failed to toggle user status.');
      });
  };


  const handleEditSubmit = () => {
    const productToUpdate = {
      name: editProduct.name,
      username: editProduct.username,
      // password: SHA256(editProduct.password).toString(), // Converts to string hex
      password: editProduct.password,
      dept_Id: editProduct.dept_Id, // Fix: use dept_Id, not Dept_Id
      role_id: editProduct.role_id,
    };

    axios
      .put(`${API_URL}/${editProduct.id}`, productToUpdate)
      .then((response) => {
        // Replace and keep sorted by newest first
        const updated = products.map((p) =>
          p.id === editProduct.id ? response.data : p
        );
        const sortedUpdated = [...updated].sort((a, b) => (b.Id || b.id) - (a.Id || a.id));
        setProducts(sortedUpdated);
        setFiltered(sortedUpdated);
        setShowEditModal(false);

        setTimeout(() => {
          alert("User Updated Successfully !!");
        }, 300);


      })
      .catch((err) => {
        console.error('Update error:', err.response?.data || err.message);
        alert('Failed to update User');
      });
  };

  return (
    <div style={{ padding: '20px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>

        <h2 style={{ margin: 0 }}>User Master</h2>

        <button style={{ ...styles.button, padding: '6px 12px', fontSize: '14px' }} onClick={handleAddClick}>
          Add User
        </button>
      </div>
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <input
          type="text"
          placeholder="Search by username, department or role"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.search}
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            {/* <th style={{ ...styles.th, width: '10%' }}>Sl No</th> */}
            <th style={{ ...styles.th, width: '20%' }}>Username</th>
            <th style={{ ...styles.th, width: '20%' }}>Name</th>
            {/* <th style={{ ...styles.th, width: '20%' }}>Password</th> */}
            <th style={{ ...styles.th, width: '20%' }}>Department</th>
            <th style={{ ...styles.th, width: '20%' }}>Role</th>
            <th style={{ ...styles.th, width: '5%' }}>Edit</th>
            <th style={{ ...styles.th, width: '5%' }}>Active</th>
          </tr>
        </thead>
        <tbody>
          {currentData && currentData.length > 0 ? (
            currentData.map((product) => (
                <tr key={product.id}>
                  {/* <td style={styles.td}>{product.id}</td> */}
                  <td style={styles.td}>{product.username}</td>
                  <td style={styles.td}>{product.name}</td>
                  {/* <td style={styles.td}>{product.password}</td> */}
                  <td style={styles.td}>{product.department}</td>
                  <td style={styles.td}>
                    {(() => {
                      // Try to show the role name from role_id or role
                      if (product.role) return product.role;
                      if (product.role_id && roleOptions.length > 0) {
                        const found = roleOptions.find(r => r.Id === product.role_id || r.id === product.role_id);
                        return found ? found.Role : product.role_id;
                      }
                      if (product.Role_Id && roleOptions.length > 0) {
                        const found = roleOptions.find(r => r.Id === product.Role_Id || r.id === product.Role_Id);
                        return found ? found.Role : product.Role_Id;
                      }
                      return '';
                    })()}
                  </td>
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
                      aria-label={`Edit ${product.username}`}
                    >
                      📝
                    </button>
                  </td>
                  <td style={styles.td} align="center">
                    <div
                      onClick={async () => {
                        const isActive = activeStates[product.id];
                        const confirmMessage = isActive
                          ? 'Do you want to deactivate this user?'
                          : 'Do you want to activate this user?';

                        if (window.confirm(confirmMessage)) {
                          // Call the function and wait for update
                          toggleActive(product.id);

                          // Show alert based on the new value
                          const newStatus = !isActive;
                          if (newStatus) {
                            setTimeout(() => {
                              alert('User activated');
                            }, 300);
                          } else {
                            setTimeout(() => {
                              alert('User inactivated');
                            }, 300);
                          }
                        }
                      }}

                      style={{
                        ...styles.toggle,
                        backgroundColor: activeStates[product.id] ? '#4CAF50' : '#ccc',
                        justifyContent: activeStates[product.id] ? 'flex-start' : 'flex-end',
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

      {showEditModal && editProduct && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Edit User</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditProduct(null);
                }}
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

            {/* Name field for edit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ width: '100%' }}>
                <label htmlFor="edit-name" style={{ display: 'block', marginBottom: '6px' }}>
                  Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  name="name"
                  value={editProduct.name || ''}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ width: '100%' }}>
                <label htmlFor="edit-username" style={{ display: 'block', marginBottom: '6px' }}>
                  Username
                </label>
                <input
                  id="edit-username"
                  type="text"
                  name="username"
                  value={editProduct.username || ''}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ width: '100%', position: 'relative' }}>
                <label htmlFor="edit-password" style={{ display: 'block', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  id="edit-password"
                  type={showEditPassword ? "text" : "password"}
                  name="password"
                  value={editProduct.password || ''}
                  onChange={handleEditInputChange}
                  style={{
                    ...styles.input,
                    width: '100%',
                    margin: '0 0 12px 0',
                    padding: '12px',
                    boxSizing: 'border-box'
                  }}
                />
                <EyeIcon
                  visible={showEditPassword}
                  onClick={() => setShowEditPassword(v => !v)}
                />
              </div>
            </div>

            <div style={{ width: '100%', marginBottom: '32px' }}>
              <label htmlFor="edit-department" style={{ display: 'block', marginBottom: '6px' }}>
                Department
              </label>
              <select
                id="edit-department"
                name="dept_Id"
                value={editProduct.dept_Id || ''}
                onChange={handleEditInputChange}
                style={styles.input}
              >
                <option value="">Select Department</option>
                {dropdownOptions.map(option => (
                  <option key={option.Id} value={option.Id}>
                    {option.Department}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: '100%', marginBottom: '32px' }}>
              <label htmlFor="edit-role" style={{ display: 'block', marginBottom: '6px' }}>
                Role
              </label>
              <select
                id="edit-role"
                name="role_id"
                value={editProduct.role_id || ''}
                onChange={handleEditInputChange}
                style={styles.input}
              >
                <option value="">Select Role</option>
                {roleOptions.map(option => (
                  <option key={option.Id} value={option.Id}>
                    {option.Role}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={handleEditSubmit} style={styles.button}>Submit</button>
              {/* <button onClick={() => setShowEditModal(false)} style={{ ...styles.button, backgroundColor: '#ccc' }}>Cancel</button> */}
            </div>
          </div>
        </div>
      )}


      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Add User</h3>
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

            {/* Name field for add */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ width: '100%' }}>
                <label htmlFor="add-name" style={{ display: 'block', marginBottom: '6px' }}>
                  Name
                </label>
                <input
                  id="add-name"
                  type="text"
                  name="name"
                  value={newProduct.name}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ width: '100%' }}>
                <label htmlFor="add-username" style={{ display: 'block', marginBottom: '6px' }}>
                  Username
                </label>
                <input
                  id="add-username"
                  type="text"
                  name="username"
                  value={newProduct.username}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ width: '100%', position: 'relative' }}>
                <label htmlFor="add-password" style={{ display: 'block', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  id="add-password"
                  type={showAddPassword ? "text" : "password"}
                  name="password"
                  value={newProduct.password}
                  onChange={handleInputChange}
                  style={{
                    ...styles.input,
                    width: '100%',
                    margin: '0 0 12px 0',
                    padding: '12px',
                    boxSizing: 'border-box'
                  }}
                />
                <EyeIcon
                  visible={showAddPassword}
                  onClick={() => setShowAddPassword(v => !v)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ width: '100%' }}>
                <label htmlFor="add-department" style={{ display: 'block', marginBottom: '6px' }}>
                  Department
                </label>
                <select
                  id="add-department"
                  name="dept_Id"
                  value={newProduct.dept_Id || ''}
                  onChange={handleInputChange}
                  style={{
                    ...styles.input,
                    width: '100%',
                    margin: '0 0 12px 0',
                    padding: '12px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select Department</option>
                  {dropdownOptions && dropdownOptions.map((option) => (
                    <option key={option.Id} value={option.Id}>
                      {option.Department}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ width: '100%' }}>
                <label htmlFor="add-role" style={{ display: 'block', marginBottom: '6px' }}>
                  Role
                </label>
                <select
                  id="add-role"
                  name="role_id"
                  value={newProduct.role_id || ''}
                  onChange={handleInputChange}
                  style={{
                    ...styles.input,
                    width: '100%',
                    margin: '0 0 12px 0',
                    padding: '12px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select Role</option>
                  {roleOptions && roleOptions.map((option) => (
                    <option key={option.Id} value={option.Id}>
                      {option.Role}
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


export default Users;
