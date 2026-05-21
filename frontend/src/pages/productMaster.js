import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import {
  Container,
  Row,
  Col,
  Table,
  Button,
  Form,
  Modal,
  InputGroup,
  FormControl,
  Spinner,
} from 'react-bootstrap';

const PRODUCT_CATEGORY_API = 'http://localhost:5000/product-category-helper'; // <-- Use this for product category

const ProductMaster = () => {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const hasFetchedOnce = useRef(false);
  const [username, setUsername] = useState('');
  const [showModal, setShowModal] = useState(false);

  // dropdownOptions always an object with makes, warehouses, and units arrays (default to empty arrays)
  const [dropdownOptions, setDropdownOptions] = useState({ makes: [], warehouses: [], units: [] });
  const [productCategories, setProductCategories] = useState([]); // For Add modal
  const [editProductCategories, setEditProductCategories] = useState([]); // For Edit modal
  const [selectedOption, setSelectedOption] = useState('');
  // Add HSNCode to newProduct state
  const [newProduct, setNewProduct] = useState({ name: '', model: '', listprice: '', costprice: '', makeId: '', pCatId: '', whouseId: '', unitId: '', HSNCode: '' });
  const [activeStates, setActiveStates] = useState({}); // for toggle
  // Add HSNCode to editProduct state
  const [editProduct, setEditProduct] = useState(null);   // stores product being edited
  const [showEditModal, setShowEditModal] = useState(false); // controls if modal is visible
  const [makeOptions, setMakeOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const tableHeaders = [
    "Product Description",
    "Model No",
    "Make",
    "Cost Price",
    "List Price",
    "Edit",
    "Active"
  ];

  const rowsPerPage = 10;
  const API_URL = 'http://localhost:5000/products';

  useEffect(() => {
    const storedUsername = localStorage.getItem('name');
    if (storedUsername) setUsername(storedUsername);
  }, []);

  // Fetch product categories for Add modal when makeId changes
  useEffect(() => {
    if (newProduct.makeId) {
      axios.post(PRODUCT_CATEGORY_API, { make_Id: newProduct.makeId })
        .then(res => {
          setProductCategories(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => setProductCategories([]));
    } else {
      setProductCategories([]);
    }
    setNewProduct(prev => ({ ...prev, pCatId: '' }));
    // eslint-disable-next-line
  }, [newProduct.makeId]);

  // --- FIX: Product Category value not setting in Edit Modal ---
  useEffect(() => {
    if (showEditModal && editProduct?.makeId) {
      axios.post(PRODUCT_CATEGORY_API, { make_Id: editProduct.makeId })
        .then(res => {
          const categories = Array.isArray(res.data) ? res.data : [];
          setEditProductCategories(categories);

          if (editProduct?.pCatId) {
            const found = categories.some(cat => String(cat.Id) === String(editProduct.pCatId));
            if (!found) {
              setEditProduct(prev => prev ? { ...prev, pCatId: '' } : prev);
            }
          }
        })
        .catch(() => {
          setEditProductCategories([]);
          setEditProduct(prev => prev ? { ...prev, pCatId: '' } : prev);
        });
    } else if (showEditModal) {
      setEditProductCategories([]);
      setEditProduct(prev => prev ? { ...prev, pCatId: '' } : prev);
    }
    // eslint-disable-next-line
  }, [editProduct?.makeId, showEditModal]);
  // --- END FIX ---

  const openEditModal = (product) => {
    if (product.Active === 1) {
      Promise.all([
        axios.get('http://localhost:5000/make-helper'),
        axios.get('http://localhost:5000/warehouse'),
        axios.get('http://localhost:5000/unit'),
      ])
        .then(([makeRes, warehouseRes, unitRes]) => {
          const makes = Array.isArray(makeRes.data) ? makeRes.data : [];
          const warehouses = Array.isArray(warehouseRes.data) ? warehouseRes.data : [];
          const units = Array.isArray(unitRes.data) ? unitRes.data : [];
          setDropdownOptions({
            makes,
            warehouses,
            units,
          });

          const selectedMake = makes.find(m => m.Id === product.Make_Id);
          const selectedWarehouse = warehouses.find(w => w.Id === product.Whouse_Id);
          const selectedUnit = units.find(u => u.Id === product.Unit_Id);

          setEditProduct({
            id: product.Id,
            name: product.Product_name,
            model: product.Model_no,
            costprice: product.Cost_price,
            listprice: product.List_price,
            makeId: product.Make_Id?.toString() || '',
            pCatId: (product.PCat_Id !== null && product.PCat_Id !== undefined) ? product.PCat_Id.toString() : '',
            whouseId: product.Whouse_Id?.toString() || '',
            unitId: product.Unit_Id?.toString() || '',
            make: selectedMake?.Make || '',
            warehouse: selectedWarehouse?.Name || '',
            unit: selectedUnit?.Name || '',
            HSNCode: product.HSNCode || '', // Add HSNCode to editProduct
          });

          setShowEditModal(true);
        })
        .catch((err) => {
          console.error("❌ Failed to fetch make, warehouse, or unit options:", err.message);
          alert("🚫 Could not load makes, warehouses, or units");
        });
    }
    else {
      alert("❌ Inactive records cannot be edited");
    }
  };

  const handleAddClick = () => {
    setNewProduct({ name: '', model: '', listprice: '', costprice: '', makeId: '', pCatId: '', whouseId: '', unitId: '', HSNCode: '' });
    setShowModal(true);
  };

  const handleClose = () => {
    setNewProduct({ name: '', model: '', listprice: '', costprice: '', makeId: '', pCatId: '', whouseId: '', unitId: '', HSNCode: '' });
    setShowModal(false);
  };

  useEffect(() => {
    if (!hasFetchedOnce.current) {
      fetchProducts();
      hasFetchedOnce.current = true;
    }
  }, []);

  const fetchProducts = () => {
    setLoading(true);
    axios.get(API_URL)
      .then((response) => {
        setProducts(response.data);
        setFiltered(response.data);

        const actives = {};
        response.data.forEach(item => {
          actives[item.Id] = item.Active === 1;
        });

        setActiveStates(actives);
      })
      .catch((error) => {
        console.error('❌ Error fetching data:', error);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const lowerTerm = searchTerm.toLowerCase();
    const results = products.filter((product) =>
      product.Id.toString().includes(lowerTerm) ||
      product.Product_name?.toLowerCase().includes(lowerTerm) ||
      product.Model_no?.toLowerCase().includes(lowerTerm) ||
      product.Make?.toLowerCase().includes(lowerTerm) ||
      product.Cost_price?.toString().includes(lowerTerm) ||
      product.List_price?.toString().includes(lowerTerm) ||
      product.Active?.toString().includes(lowerTerm)
    );
    setFiltered(results);
    setCurrentPage(1);
  }, [searchTerm, products]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const sortedFiltered = [...filtered].sort((a, b) => b.Id - a.Id);
  const currentData = sortedFiltered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setNewProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --- FIX: Allow saving with or without Product Category (PCat_Id), submit 0 if not selected ---
  const handleSubmit = () => {
    const makes = dropdownOptions.makes || [];
    const warehouses = dropdownOptions.warehouses || [];
    const units = dropdownOptions.units || [];
    const selectedMake = makes.find(opt => opt.Id === parseInt(newProduct.makeId));
    const selectedWarehouse = warehouses.find(opt => opt.Id === parseInt(newProduct.whouseId));
    const selectedUnit = units.find(opt => opt.Id === parseInt(newProduct.unitId));

    // If pCatId is not selected or empty string or only whitespace, send 0 (not null)
    let PCatIdValue = 0;
    if (newProduct.pCatId && newProduct.pCatId.trim() !== "") {
      PCatIdValue = newProduct.pCatId;
    }

    const productToSend = {
      Product_name: newProduct.name,
      Model_no: newProduct.model,
      Cost_price: newProduct.costprice,
      List_price: newProduct.listprice,
      Make_Id: newProduct.makeId,
      PCat_Id: PCatIdValue,
      Whouse_Id: newProduct.whouseId,
      Unit_Id: newProduct.unitId,
      HSNCode: newProduct.HSNCode, // Add HSNCode to payload
      Created_By: username,
      Active: 1,
    };

    axios.post(`${API_URL}/create`, productToSend)
      .then(() => {
        fetchProducts();
        setNewProduct({ name: '', model: '', listprice: '', costprice: '', makeId: '', pCatId: '', whouseId: '', unitId: '', HSNCode: '' });
        setShowModal(false);
        setTimeout(() => {
          alert("✅ Product Added Successfully !!");
        }, 300);
      })
      .catch((err) => {
        console.error("❌ Error adding product:", err.response?.data || err.message);
        alert("🚫 Failed to add product.");
      });
  };

  const toggleActive = (id) => {
    axios
      .post(`${API_URL}/toggle`, { id })
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
          [id]: updatedProduct.Active === 1,
        }));
      })
      .catch((error) => {
        console.error('Toggle active failed:', error);
        alert('Failed to toggle product status.');
      });
  };

  // --- FIX: Allow saving with or without Product Category (PCat_Id), submit 0 if not selected ---
  const handleEditSubmit = () => {
    const makes = dropdownOptions.makes || [];
    const warehouses = dropdownOptions.warehouses || [];
    const units = dropdownOptions.units || [];
    const selectedMake = makes.find(
      (make) => make.Id === parseInt(editProduct.makeId)
    );

    const selectedWh = warehouses.find(
      (whouse) => whouse.Id === parseInt(editProduct.whouseId)
    );

    const selectedUnit = units.find(
      (unit) => unit.Id === parseInt(editProduct.unitId)
    );

    // If pCatId is not selected or empty string or only whitespace, send 0 (not null)
    let PCatIdValue = 0;
    if (editProduct?.pCatId && editProduct.pCatId.trim() !== "") {
      PCatIdValue = editProduct.pCatId;
    }

    const productToUpdate = {
      Product_name: editProduct.name,
      Model_no: editProduct.model,
      Cost_price: editProduct.costprice,
      List_price: editProduct.listprice,
      Make_Id: editProduct.makeId,
      PCat_Id: PCatIdValue,
      Whouse_Id: editProduct.whouseId,
      Unit_Id: editProduct.unitId,
      HSNCode: editProduct.HSNCode, // Add HSNCode to update payload
      Modified_By: username,
      Make: selectedMake?.Make || '',
      Warehouse: selectedWh?.Name || '',
      Unit: selectedUnit?.Name || '',
    };

    axios
      .put(`${API_URL}/${editProduct.id}`, productToUpdate)
      .then((response) => {
        const updated = products.map((p) =>
          p.Id === editProduct.id ? response.data : p
        );
        fetchProducts();
        setProducts(updated);
        setFiltered(updated);
        setShowEditModal(false);

        setTimeout(() => {
          alert("✅ Product Updated Successfully !!");
        }, 300);
      })
      .catch((err) => {
        console.error('❌ Update error:', err.response?.data || err.message);
        alert('🚫 Failed to update product');
      });
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [makeRes, warehouseRes, unitRes] = await Promise.all([
          axios.get('http://localhost:5000/make-helper'),
          axios.get('http://localhost:5000/warehouse'),
          axios.get('http://localhost:5000/unit'),
        ]);
        const makes = Array.isArray(makeRes.data) ? makeRes.data : [];
        const warehouses = Array.isArray(warehouseRes.data) ? warehouseRes.data : [];
        const units = Array.isArray(unitRes.data) ? unitRes.data : [];
        setDropdownOptions({
          makes,
          warehouses,
          units,
        });
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
        setDropdownOptions({ makes: [], warehouses: [], units: [] });
      }
    };

    fetchOptions();
  }, []);

  // Helper for required red star
  const RequiredStar = () => (
    <span style={{ color: 'red', marginLeft: 2 }}>*</span>
  );

  // Defensive helpers for dropdowns
  const makesArr = dropdownOptions.makes || [];
  const warehousesArr = dropdownOptions.warehouses || [];
  const unitsArr = dropdownOptions.units || [];

  // Bootstrap form row/col helpers
  const formRowProps = { className: "mb-3" };
  const formColProps = { xs: 12, md: 6, lg: 3 };

  // Custom row/col helpers for new layout
  const oneLineNameColProps = { xs: 12, md: 8, lg: 8 };
  const oneLineModelColProps = { xs: 12, md: 4, lg: 4 };
  const twoLineColProps = { xs: 12, md: 4, lg: 4 };
  const threeLineColProps = { xs: 12, md: 3, lg: 3 };

  return (
    <Container fluid className="py-3">
      <Row className="align-items-center mb-3">
        <Col>
          <h2 className="mb-0">Product Master</h2>
        </Col>
        <Col xs="auto">
          <Button variant="primary" size="sm" onClick={handleAddClick}>
            Add Product
          </Button>
        </Col>
      </Row>
      <Row className="mb-3">
        <Col md={{ span: 6, offset: 3 }}>
          <InputGroup>
            <FormControl
              type="text"
              placeholder="Search by name or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
      </Row>
      <Row>
        <Col>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  {tableHeaders.map((header, idx) => (
                    <th key={idx}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData && currentData.length > 0 ? (
                  [...currentData]
                    .sort((a, b) => b.Id - a.Id)
                    .map((product) => (
                      <tr key={product.Id}>
                        <td>{product.Product_name}</td>
                        <td>{product.Model_no}</td>
                        <td>{product.Make}</td>
                        <td>{product.Cost_price == null ? 'Rs 0.00' : 'Rs ' + product.Cost_price}</td>
                        <td>{product.List_price == null ? 'Rs 0.00' : 'Rs ' + product.List_price}</td>
                        <td className="text-center">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => openEditModal(product)}
                            aria-label={`Edit ${product.Product_name}`}
                            style={{ fontSize: 18, padding: 0 }}
                          >
                            📝
                          </Button>
                        </td>
                        <td className="text-center">
                          <Form.Check
                            type="switch"
                            id={`active-switch-${product.Id}`}
                            checked={!!activeStates[product.Id]}
                            onChange={async () => {
                              const isActive = activeStates[product.Id];
                              const confirmMessage = isActive
                                ? 'Do you want to deactivate this product?'
                                : 'Do you want to activate this product?';

                              if (window.confirm(confirmMessage)) {
                                await toggleActive(product.Id);
                                const newStatus = !isActive;
                                setTimeout(() => {
                                  alert(newStatus ? 'Product activated' : 'Product inactivated');
                                }, 300);
                              }
                            }}
                            label=""
                          />
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={tableHeaders.length} className="text-center">
                      No data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Col>
      </Row>
      <Row className="mt-3">
        <Col className="text-center">
          <Form.Label>
            Page:{' '}
            <Form.Select
              style={{ display: 'inline-block', width: 'auto' }}
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              size="sm"
            >
              {Array.from({ length: totalPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </Form.Select>
          </Form.Label>
        </Col>
      </Row>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Product</Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={e => { e.preventDefault(); handleEditSubmit(); }}
        >
          <Modal.Body>
            {/* 1st line: Product Name, HSN Code */}
            <Row {...formRowProps}>
              <Col {...oneLineNameColProps}>
                <Form.Group>
                  <Form.Label>
                    Product Name <RequiredStar />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={editProduct?.name || ''}
                    onChange={(e) =>
                      setEditProduct((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col {...oneLineModelColProps}>
                <Form.Group>
                  <Form.Label>
                    Model No <RequiredStar />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={editProduct?.model || ''}
                    onChange={(e) =>
                      setEditProduct((prev) => ({ ...prev, model: e.target.value }))
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            {/* 2nd line: Model No, Cost Price, List Price */}
            <Row {...formRowProps}>

              <Col {...twoLineColProps}>
                <Form.Group>
                  <Form.Label>
                    HSN / SAC Code <RequiredStar />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="HSNCode"
                    value={editProduct?.HSNCode || ''}
                    onChange={handleEditInputChange}
                    // removed required
                  />
                </Form.Group>
              </Col>
              <Col {...twoLineColProps}>
                <Form.Group>
                  <Form.Label>
                    Cost Price <RequiredStar />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={editProduct?.costprice || ''}
                    onChange={(e) =>
                      setEditProduct((prev) => ({ ...prev, costprice: e.target.value }))
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col {...twoLineColProps}>
                <Form.Group>
                  <Form.Label>
                    List Price <RequiredStar />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={editProduct?.listprice || ''}
                    onChange={(e) =>
                      setEditProduct((prev) => ({ ...prev, listprice: e.target.value }))
                    }
                    // removed required
                  />
                </Form.Group>
              </Col>
            </Row>
            {/* 3rd line: Make, Product Category, Warehouse, Unit */}
            <Row {...formRowProps}>
              <Col {...threeLineColProps}>
                <Form.Group>
                  <Form.Label>
                    Make <RequiredStar />
                  </Form.Label>
                  <Form.Select
                    name="makeId"
                    value={editProduct?.makeId || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedMake = makesArr.find(
                        (make) => make.Id === parseInt(selectedId)
                      );
                      setEditProduct((prev) => ({
                        ...prev,
                        makeId: selectedId,
                        make: selectedMake?.Make || '',
                      }));
                    }}
                    required
                  >
                    <option value="">Select Make</option>
                    {makesArr.map((option) => (
                      <option key={option.Id} value={option.Id}>
                        {option.Make}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col {...threeLineColProps}>
                <Form.Group>
                  <Form.Label>
                    Product Category <RequiredStar />
                  </Form.Label>
                  <Form.Select
                    name="pCatId"
                    value={editProduct?.pCatId || ''}
                    onChange={e =>
                      setEditProduct(prev => ({
                        ...prev,
                        pCatId: e.target.value
                      }))
                    }
                    // NOT required now; now optional so user can skip
                    // Disabled if no makeId or if editProductCategories is empty
                    disabled={!editProduct?.makeId || !editProductCategories.length}
                  >
                    <option value="">Select Category</option>
                    {editProductCategories.map((option) => (
                      <option key={option.Id} value={option.Id}>
                        {option.Category}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col {...threeLineColProps}>
                <Form.Group>
                  <Form.Label>
                    Warehouse <RequiredStar />
                  </Form.Label>
                  <Form.Select
                    name="whouseId"
                    value={editProduct?.whouseId || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedWh = warehousesArr.find(
                        (wh) => wh.Id === parseInt(selectedId)
                      );
                      setEditProduct((prev) => ({
                        ...prev,
                        whouseId: selectedId,
                        warehouse: selectedWh?.Name || '',
                      }));
                    }}
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {warehousesArr.map((option) => (
                      <option key={option.Id} value={option.Id}>
                        {option.Name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col {...threeLineColProps}>
                <Form.Group>
                  <Form.Label>
                    Unit <RequiredStar />
                  </Form.Label>
                  <Form.Select
                    name="unitId"
                    value={editProduct?.unitId || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedUnit = unitsArr.find(
                        (unit) => unit.Id === parseInt(selectedId)
                      );
                      setEditProduct((prev) => ({
                        ...prev,
                        unitId: selectedId,
                        unit: selectedUnit?.Name || '',
                      }));
                    }}
                    required
                  >
                    <option value="">Select Unit</option>
                    {unitsArr.map((option) => (
                      <option key={option.Id} value={option.Id}>
                        {option.Unit}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button type="submit" variant="primary">
              Submit
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add Modal */}
      <Modal show={showModal} onHide={handleClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Product</Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={e => { e.preventDefault(); handleSubmit(); }}
        >
          <Modal.Body>
            {/* 1st line: Product Name, HSN Code */}
            <Row {...formRowProps}>
              <Col {...oneLineNameColProps}>
                <Form.Group>
                  <Form.Label>
                    Product Name <RequiredStar />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={newProduct.name}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col {...oneLineModelColProps}>
                <Form.Group>
                  <Form.Label>
                    Model No <RequiredStar />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="model"
                    value={newProduct.model}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            {/* 2nd line: Model No, Cost Price, List Price */}
            <Row {...formRowProps}>
              <Col {...twoLineColProps}>
                <Form.Group>
                  <Form.Label>
                    HSN / SAC Code <RequiredStar />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="HSNCode"
                    value={newProduct.HSNCode}
                    onChange={handleInputChange}
                    // removed required
                  />
                </Form.Group>
              </Col>
              <Col {...twoLineColProps}>
                <Form.Group>
                  <Form.Label>
                    Cost Price <RequiredStar />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="costprice"
                    value={newProduct.costprice}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col {...twoLineColProps}>
                <Form.Group>
                  <Form.Label>
                    List Price <RequiredStar />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="listprice"
                    value={newProduct.listprice}
                    onChange={handleInputChange}
                    // removed required
                  />
                </Form.Group>
              </Col>
            </Row>
            {/* 3rd line: Make, Product Category, Warehouse, Unit */}
            <Row {...formRowProps}>
              <Col {...threeLineColProps}>
                <Form.Group>
                  <Form.Label>
                    Make <RequiredStar />
                  </Form.Label>
                  <Form.Select
                    name="makeId"
                    value={newProduct.makeId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Make</option>
                    {makesArr.map((option) => (
                      <option key={option.Id} value={option.Id}>
                        {option.Make}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col {...threeLineColProps}>
                <Form.Group>
                  <Form.Label>
                    Product Category <RequiredStar />
                  </Form.Label>
                  <Form.Select
                    name="pCatId"
                    value={newProduct.pCatId}
                    onChange={handleInputChange}
                    // NOT required now; now optional so user can skip
                    // Disabled if no makeId or if productCategories is empty
                    disabled={!newProduct.makeId || !productCategories.length}
                  >
                    <option value="">Select Category</option>
                    {productCategories.map((option) => (
                      <option key={option.Id} value={option.Id}>
                        {option.Category}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col {...threeLineColProps}>
                <Form.Group>
                  <Form.Label>
                    Warehouse <RequiredStar />
                  </Form.Label>
                  <Form.Select
                    name="whouseId"
                    value={newProduct.whouseId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {warehousesArr.map((option) => (
                      <option key={option.Id} value={option.Id}>
                        {option.Name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col {...threeLineColProps}>
                <Form.Group>
                  <Form.Label>
                    Unit <RequiredStar />
                  </Form.Label>
                  <Form.Select
                    name="unitId"
                    value={newProduct.unitId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Unit</option>
                    {unitsArr.map((option) => (
                      <option key={option.Id} value={option.Id}>
                        {option.Unit}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button type="submit" variant="primary">
              Submit
            </Button>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProductMaster;
