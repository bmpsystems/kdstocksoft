import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
    Container,
    Row,
    Col,
    Button,
    Table,
    Form,
    InputGroup,
    FormControl,
    Pagination,
    ListGroup,
} from 'react-bootstrap';

const API_URL = 'https://kdstocksoft.onrender.com/stock-in';

const fullScreenDialogStyles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.35)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dialog: {
        background: '#fff',
        width: '98vw',
        maxWidth: '1200px',
        minHeight: '90vh',
        maxHeight: '98vh',
        borderRadius: 12,
        boxShadow: '0 2px 24px rgba(0,0,0,0.18)',
        padding: '32px 24px 24px 24px',
        overflowY: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 24,
        background: 'none',
        border: 'none',
        fontSize: '2rem',
        cursor: 'pointer',
        color: '#888',
        zIndex: 2,
    },
    footer: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
        flexWrap: 'wrap',
    },
    sectionTitle: {
        fontWeight: 600,
        fontSize: 18,
        marginBottom: 12,
        marginTop: 12,
    }
};

const utcDate = new Date('2025-07-30T18:30:00.000Z');
const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

// Helper to convert '' to null for date fields
function normalizeDateField(val) {
    if (val === undefined || val === null || val === '') return null;
    return val;
}

const StockIn = () => {
    // Table and pagination
    const [products, setProducts] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const [currentPage, setCurrentPage] = useState(1);
    const [username, setUsername] = useState('');
    const [activeStates, setActiveStates] = useState({});
    const rowsPerPage = 10;

    // Modal/dialog state
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false); // true for edit, false for add
    const [editStockInId, setEditStockInId] = useState(null);

    // Bill Details
    const [billDetails, setBillDetails] = useState({
        purchaseOrder: '',
        purchaseDate: '',
        invoiceNo: '',
        invoiceDate: '',
        // New fields for Return
        creditNoteNo: '',
        creditNoteDate: '',
        originalInvoiceNo: '',
        originalInvoiceDate: '',
    });

    // Is Return state
    const [isReturn, setIsReturn] = useState(false);

    // New: Return Purpose and Return Date state
    const [returnPurpose, setReturnPurpose] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [billFieldsDisabled, setBillFieldsDisabled] = useState(false);

    // New: Original Challan field
    const [challan, setChallan] = useState('');

    // --- New: UI state for disabling top 3 fields when credit note is filled ---
    const [disableTopReturnFields, setDisableTopReturnFields] = useState(false);

    // Company Details
    const [companyQuery, setCompanyQuery] = useState('');
    const [companySuggestions, setCompanySuggestions] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyAddress, setCompanyAddress] = useState('');
    const [fromAddress, setFromAddress] = useState('');
    const [companyInputFocused, setCompanyInputFocused] = useState(false);

    // Product Details (for form row)
    const [productQuery, setProductQuery] = useState('');
    const [productSuggestions, setProductSuggestions] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [costPrice, setCostPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [make, setMake] = useState('');
    const [unitId, setUnitId] = useState('');
    const [unit, setUnit] = useState('');
    // New: Warehouse state
    const [warehouse, setWarehouse] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    // New: Model No state
    const [modelNo, setModelNo] = useState('');
    // New: Remarks field
    const [remarks, setRemarks] = useState('');

    // Warehouses list for dropdown
    const [warehouses, setWarehouses] = useState([]);

    // Form array for product rows
    const [productRows, setProductRows] = useState([]);
    const [editProductIndex, setEditProductIndex] = useState(null);

    // Track if user has started searching for product during edit
    const [productSearchStarted, setProductSearchStarted] = useState(false);

    // Track original product IDs for edit mode to help with correct update
    const [originalProductIds, setOriginalProductIds] = useState([]);

    // --- NEW: Track if product input is focused for suggestion dropdown ---
    const [productInputFocused, setProductInputFocused] = useState(false);
    // ---

    // Table headers
    const tableHeaders = [
        "Purchase No",
        "Purchase Date",
        "Invoice No",
        "Invoice Date",
        "Company",
        "Make",
        "Quantity",
        "Total Amount",
        "Edit",

    ];

    // Credit Note table headers
    // Add "Challan" column for return stock in table
    const creditNoteTableHeaders = [
        "Credit No",
        "Credit Date",
        "Challan",
        "Return Date",
        "Company",
        "Make",
        "Quantity",
        "Total Amount",
        "Edit",
    ];

    // UI state for which table to show
    const [showCreditNoteTable, setShowCreditNoteTable] = useState(false);

    // --- EFFECTS FOR FIELD ENABLING/DISABLING LOGIC ---

    // 1. When challan is filled, bill details 4 fields are disabled
    useEffect(() => {
        if (isReturn && challan && challan.trim() !== '') {
            setBillFieldsDisabled(true);
        } else if (isReturn && returnPurpose && returnPurpose.trim() !== '') {
            setBillFieldsDisabled(true);
        } else if (isReturn && returnDate && returnDate.trim() !== '') {
            setBillFieldsDisabled(true);
        } else {
            setBillFieldsDisabled(false);
        }
    }, [challan, isReturn, returnPurpose, returnDate]);
    // ^^^^ ADDED returnDate to the dependency array and logic

    // 2. When credit note number or credit note date or original invoice no or original invoice date is filled, top 3 fields (challan, return purpose, return date) are disabled and reset
    useEffect(() => {
        if (
            isReturn &&
            (
                (billDetails.creditNoteNo && billDetails.creditNoteNo.trim() !== '') ||
                (billDetails.creditNoteDate && billDetails.creditNoteDate.trim() !== '') ||
                (billDetails.originalInvoiceNo && billDetails.originalInvoiceNo.trim() !== '') ||
                (billDetails.originalInvoiceDate && billDetails.originalInvoiceDate.trim() !== '')
            )
        ) {
            setDisableTopReturnFields(true);
            setChallan('');
            setReturnPurpose('');
            setReturnDate('');
        } else {
            setDisableTopReturnFields(false);
        }
    }, [
        billDetails.creditNoteNo,
        billDetails.creditNoteDate,
        billDetails.originalInvoiceNo,
        billDetails.originalInvoiceDate,
        isReturn
    ]);

    // Fetch products for table
    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        // Fetch user info from localStorage
        const storedUsername = localStorage.getItem('name');
        if (storedUsername) setUsername(storedUsername);
    }, []);

    useEffect(() => {
        const newActiveStates = {};
        products.forEach((p) => {
            newActiveStates[p.Id] = p.Active === 1 || p.Active === true;
        });
        setActiveStates(newActiveStates);
    }, [products]);

    // Fetch warehouses for dropdown
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const res = await axios.get('https://kdstocksoft.onrender.com/warehouse');
                setWarehouses(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                setWarehouses([]);
            }
        };
        if (showModal) {
            fetchWarehouses();
        }
    }, [showModal]);

    const fetchProducts = () => {
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
                console.error('Error fetching data:', error);
            });
    };

    // Table search
    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const results = products.filter((product) =>
            product.Id?.toString().includes(lowerTerm) ||
            product.Total_Price?.toString().includes(lowerTerm) ||
            product.Invoice_no?.toLowerCase().includes(lowerTerm) ||
            product.Purchase_Order?.toLowerCase().includes(lowerTerm) ||
            product.Make?.toLowerCase().includes(lowerTerm) ||
            product.Quantity?.toLowerCase().includes(lowerTerm) ||
            product.Company?.toLowerCase().includes(lowerTerm) ||
            product.Invoice_Date?.toLowerCase().includes(lowerTerm) ||
            product.Purchase_Date?.toLowerCase().includes(lowerTerm) ||
            product.Credit_No?.toLowerCase().includes(lowerTerm) ||
            product.Credit_Date?.toLowerCase().includes(lowerTerm) ||
            (product.Challan && product.Challan.toLowerCase().includes(lowerTerm))
        );
        setFiltered(results);
        setCurrentPage(1);
    }, [searchTerm, products]);

    // Company autocomplete
    useEffect(() => {
        if (
            companyInputFocused &&
            !selectedCompany &&
            companyQuery.length >= 3
        ) {
            const fetchSuggestions = async () => {
                try {
                    const response = await axios.get(`https://kdstocksoft.onrender.com/company-search?query=${companyQuery}`);
                    setCompanySuggestions(response.data);
                } catch (error) {
                    setCompanySuggestions([]);
                }
            };
            const debounce = setTimeout(fetchSuggestions, 300);
            return () => clearTimeout(debounce);
        } else {
            setCompanySuggestions([]);
        }
    }, [companyQuery, companyInputFocused, selectedCompany]);

    // Product autocomplete
    useEffect(() => {
        if (
            productInputFocused && // Only fetch if input is focused
            productQuery.length >= 3 &&
            (editProductIndex === null || productSearchStarted)
        ) {
            const fetchSuggestions = async () => {
                try {
                    const response = await axios.get(`https://kdstocksoft.onrender.com/product-search?query=${productQuery}`);
                    setProductSuggestions(
                        Array.isArray(response.data)
                            ? response.data.map(item => ({
                                ...item,
                                Cost_price: item.Cost_price ?? '',
                                Make: item.Make ?? '',
                                Model_no: item.Model_no ?? '',
                                Product_name: item.Product_name ?? '',
                                Unit_Id: item.Unit_Id ?? '',
                                Unit: item.Unit ?? '',
                                Warehouse: item.Name ?? '', // Use 'Name' as warehouse name
                                Whouse_Id: item.Whouse_Id ?? '', // Add warehouse id if present
                            }))
                            : []
                    );
                } catch (error) {
                    setProductSuggestions([]);
                }
            };
            const debounce = setTimeout(fetchSuggestions, 300);
            return () => clearTimeout(debounce);
        } else {
            setProductSuggestions([]);
        }
    }, [productQuery, editProductIndex, productSearchStarted, productInputFocused]);

    const wrapCellStyle = {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxWidth: 180,
    verticalAlign: "middle",
  };

  // Calculate total quantity
  const getTotalQuantity = () => {
    return productRows.reduce((sum, row) => {
      const qty = Number(row.quantity);
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
  };

  // Calculate total amount
  const getTotalAmount = () => {
    return productRows.reduce((sum, row) => {
      const qty = Number(row.quantity);
      const rate = Number(row.costPrice);
      return sum + (isNaN(qty) || isNaN(rate) ? 0 : qty * rate);
    }, 0);
  };

  // Get unit if all unitIds are the same and not empty, else return empty string
  const getCommonUnit = () => {
    if (productRows.length === 0) return "";
    const firstUnitId = productRows[0].unitId;
    if (!firstUnitId) return "";
    for (let i = 1; i < productRows.length; i++) {
      if (productRows[i].unitId !== firstUnitId) return "";
    }
    // All unitIds are the same, return the unit string (from first row)
    return productRows[0].unit ? productRows[0].unit : "";
  };

    // Handlers for Bill Details
    const handleBillChange = (e) => {
        const { name, value } = e.target;

        // If any of the 4 fields are changed, disable and reset top 3 fields
        if (
            name === "creditNoteNo" ||
            name === "creditNoteDate" ||
            name === "originalInvoiceNo" ||
            name === "originalInvoiceDate"
        ) {
            setBillDetails(prev => ({
                ...prev,
                [name]: value
            }));
            // Only trigger the reset if the value is not empty (i.e., user is inputting)
            if (value && value.trim() !== '') {
                setDisableTopReturnFields(true);
                setChallan('');
                setReturnPurpose('');
                setReturnDate('');
            } else {
                // If all 4 fields are empty, re-enable top fields
                setTimeout(() => {
                    setDisableTopReturnFields(
                        !!(
                            (name === "creditNoteNo" && value.trim() !== '') ||
                            (name === "creditNoteDate" && value.trim() !== '') ||
                            (name === "originalInvoiceNo" && value.trim() !== '') ||
                            (name === "originalInvoiceDate" && value.trim() !== '')
                        )
                    );
                }, 0);
            }
        } else {
            setBillDetails(prev => ({ ...prev, [name]: value }));
        }
    };

    // Handler for Challan field
    const handleChallanChange = (e) => {
        setChallan(e.target.value);
    };

    // Handlers for Company Details
    const handleCompanySelect = (item) => {
        setSelectedCompany(item);
        setCompanyQuery(item.Company);
        setCompanyAddress(item.Address || '');
        setCompanySuggestions([]);
    };

    // Handlers for Product Details
    const handleProductSelect = (item) => {
        setSelectedProduct(item);
        setProductQuery(item.Product_name || '');
        setMake(item.Make || '');
        setCostPrice(item.Cost_price !== undefined && item.Cost_price !== null ? item.Cost_price : '');
        setUnitId(item.Unit_Id || '');
        setUnit(item.Unit || '');
        setModelNo(item.Model_no || '');

        // Pre-select warehouse and warehouseId from product, if available
        let whId = '';
        let whName = '';
        if (item.Whouse_Id && warehouses.length > 0) {
            // Try to find warehouse by id
            const found = warehouses.find(w => String(w.Id) === String(item.Whouse_Id));
            if (found) {
                whId = found.Id;
                whName = found.Name;
            } else {
                whId = item.Whouse_Id;
                whName = item.Warehouse || item.Name || '';
            }
        } else if (item.Warehouse && warehouses.length > 0) {
            // Try to find warehouse by name
            const found = warehouses.find(w => w.Name === item.Warehouse);
            if (found) {
                whId = found.Id;
                whName = found.Name;
            } else {
                whName = item.Warehouse;
            }
        } else {
            whName = item.Warehouse || item.Name || '';
        }
        setWarehouseId(whId || '');
        setWarehouse(whName || '');
        setProductSuggestions([]);
        setProductSearchStarted(false); // Reset search started after selection
        setProductInputFocused(false); // Hide dropdown after selection
    };

    // Add product row to form array
    const handleAddProductRow = () => {
        if (!selectedProduct || !costPrice || !quantity) {
            alert('Please select product, cost price and quantity');
            return;
        }
        // Prevent negative quantity
        if (isNaN(Number(quantity)) || Number(quantity) < 0) {
            alert('Quantity must be a non-negative number');
            return;
        }
        // Do NOT append model no to product name in productRows
        const displayName = selectedProduct.Product_name || '';

        // Prevent duplicate product in the form array (by Product Id)
        const alreadyExists = productRows.some(
            row => String(row.product.Id) === String(selectedProduct.Id)
        );
        if (alreadyExists) {
            alert('This product is already added. Please edit the existing row.');
            return;
        }

        setProductRows(prev => [
            ...prev,
            {
                product: {
                    Id: selectedProduct.Id,
                    Product_name: displayName
                },
                make: make,
                modelNo: modelNo || selectedProduct.Model_no || '',
                costPrice,
                quantity,
                unitId: unitId,
                unit: unit,
                warehouse: warehouse, // warehouse name for display
                Whouse_Id: warehouseId, // warehouse id for backend (use correct case)
                remarks: remarks || '',
            }
        ]);
        setSelectedProduct(null);
        setProductQuery('');
        setCostPrice('');
        setQuantity('');
        setMake('');
        setUnitId('');
        setUnit('');
        setWarehouse('');
        setWarehouseId('');
        setModelNo('');
        setRemarks('');
        setEditProductIndex(null);
        setProductSearchStarted(false);
        setProductInputFocused(false); // Hide dropdown after add
    };

    // Edit product row
    const handleEditProductRow = (idx) => {
        const row = productRows[idx];
        setSelectedProduct({
            Id: row.product.Id,
            Product_name: row.product.Product_name,
            Model_no: row.modelNo || ''
        });
        setProductQuery(row.product.Product_name || '');
        setCostPrice(row.costPrice);
        setQuantity(row.quantity);
        setMake(row.make || '');
        setUnitId(row.unitId || '');
        setUnit(row.unit || '');
        setWarehouse(row.warehouse || '');
        setWarehouseId(row.Whouse_Id || ''); // Use correct case: Whouse_Id
        setModelNo(row.modelNo || '');
        setRemarks(row.remarks || '');
        setEditProductIndex(idx);
        setProductSearchStarted(false); // When entering edit, do not show suggestions
        setProductInputFocused(true); // Focus input for editing
    };

    // Update product row after edit
    const handleUpdateProductRow = () => {
        if (editProductIndex === null || !selectedProduct || !costPrice || !quantity) {
            alert('Please select product, cost price and quantity');
            return;
        }
        // Prevent negative quantity
        if (isNaN(Number(quantity)) || Number(quantity) < 0) {
            alert('Quantity must be a non-negative number');
            return;
        }
        // Do NOT append model no to product name in productRows
        const displayName = selectedProduct.Product_name || '';

        // Prevent duplicate product (except for the row being edited)
        const alreadyExists = productRows.some(
            (row, idx) =>
                idx !== editProductIndex &&
                String(row.product.Id) === String(selectedProduct.Id)
        );
        if (alreadyExists) {
            alert('This product is already added. Please edit the existing row.');
            return;
        }

        setProductRows(prev => prev.map((row, idx) =>
            idx === editProductIndex
                ? {
                    product: {
                        Id: selectedProduct.Id,
                        Product_name: displayName
                    },
                    make,
                    modelNo: modelNo || selectedProduct.Model_no || '',
                    costPrice,
                    quantity,
                    unitId: unitId,
                    unit: unit,
                    warehouse: warehouse,
                    Whouse_Id: warehouseId, // Use correct case
                    remarks: remarks || '',
                }
                : row
        ));
        setEditProductIndex(null);
        setSelectedProduct(null);
        setProductQuery('');
        setCostPrice('');
        setQuantity('');
        setMake('');
        setUnitId('');
        setUnit('');
        setWarehouse('');
        setWarehouseId('');
        setModelNo('');
        setRemarks('');
        setProductSearchStarted(false);
        setProductInputFocused(false); // Hide dropdown after update
    };

    // Delete product row
    const handleDeleteProductRow = (idx) => {
        setProductRows(prev => prev.filter((_, i) => i !== idx));
        if (editProductIndex === idx) {
            setEditProductIndex(null);
            setSelectedProduct(null);
            setProductQuery('');
            setCostPrice('');
            setQuantity('');
            setMake('');
            setUnitId('');
            setUnit('');
            setWarehouse('');
            setWarehouseId('');
            setModelNo('');
            setRemarks('');
            setProductSearchStarted(false);
            setProductInputFocused(false);
        }
    };

    // Modal open/close
    const handleAddClick = () => {
        setShowModal(true);
        setIsEdit(false);
        setEditStockInId(null);
        setBillDetails({
            purchaseOrder: '',
            purchaseDate: '',
            invoiceNo: '',
            invoiceDate: '',
            creditNoteNo: '',
            creditNoteDate: '',
            originalInvoiceNo: '',
            originalInvoiceDate: '',
        });
        setIsReturn(false);
        setReturnPurpose('');
        setReturnDate('');
        setBillFieldsDisabled(false);
        setChallan('');
        setDisableTopReturnFields(false);
        setCompanyQuery('');
        setCompanyAddress('');
        setFromAddress('');
        setSelectedCompany(null);
        setProductQuery('');
        setCostPrice('');
        setQuantity('');
        setMake('');
        setUnitId('');
        setUnit('');
        setWarehouse('');
        setWarehouseId('');
        setModelNo('');
        setRemarks('');
        setSelectedProduct(null);
        setProductRows([]);
        setEditProductIndex(null);
        setProductSearchStarted(false);
        setOriginalProductIds([]); // Reset original product ids
        setProductInputFocused(false);
    };

    // Handler for Credit Note Stock button
    const handleCreditNoteStockClick = () => {
        setShowCreditNoteTable(true);
        setCurrentPage(1);
    };

    // Handler for Stock In List button (to go back to normal table)
    const handleStockInListClick = () => {
        setShowCreditNoteTable(false);
        setCurrentPage(1);
    };

    // Modified openEditModal to support multiple prod_details
    const openEditModal = (stockIn) => {
        if (stockIn.Active === 1) {
            setShowModal(true);
            setIsEdit(true);
            setEditStockInId(stockIn.Id);

            setBillDetails({
                purchaseOrder: stockIn.Purchase_Order || '',
                purchaseDate: stockIn.Purchase_Date ? stockIn.Purchase_Date.split('T')[0] : '',
                invoiceNo: stockIn.Invoice_No || stockIn.Invoice_no || '',
                invoiceDate: stockIn.Invoice_Date ? stockIn.Invoice_Date.split('T')[0] : '',
                creditNoteNo: stockIn.Credit_No || '',
                creditNoteDate: stockIn.Credit_Date ? stockIn.Credit_Date.split('T')[0] : '',
                originalInvoiceNo: stockIn.Org_InvNo || '',
                originalInvoiceDate: stockIn.Org_Invdt ? stockIn.Org_Invdt.split('T')[0] : '',
            });

            setIsReturn(stockIn.Is_Return === 1 || stockIn.Is_Return === true);

            // Set Challan if present
            setChallan(stockIn.Challan || '');

            // Set Return Purpose and Return Date if present
            setReturnPurpose(stockIn.Return_Purpose || '');
            setReturnDate(stockIn.Return_Date ? stockIn.Return_Date.split('T')[0] : '');

            // If Return Purpose is set, disable bill fields
            setBillFieldsDisabled(!!stockIn.Return_Purpose);

            // If any of the 4 fields are present, disable top 3 fields and reset their values
            if (
                (stockIn.Credit_No && stockIn.Credit_No.trim() !== '') ||
                (stockIn.Credit_Date && stockIn.Credit_Date.trim() !== '') ||
                (stockIn.Org_InvNo && stockIn.Org_InvNo.trim() !== '') ||
                (stockIn.Org_Invdt && stockIn.Org_Invdt.trim() !== '')
            ) {
                setDisableTopReturnFields(true);
                setChallan('');
                setReturnPurpose('');
                setReturnDate('');
            } else {
                setDisableTopReturnFields(false);
            }

            setCompanyQuery(stockIn.Company || '');
            setCompanyAddress(stockIn.Address || '');
            setFromAddress(stockIn.From_Address || '');
            setSelectedCompany({ Company: stockIn.Company, Id: stockIn.Comp_Id || undefined });

            // Handle multiple prod_details
            const prodDetailsArr = Array.isArray(stockIn.prod_details) ? stockIn.prod_details : [];
            // Do NOT append model no to product name in productRows
            const productRowsArr = prodDetailsArr.map(prod => ({
                product: {
                    Id: prod.Prod_Id || prod.Id,
                    Product_name: prod.Product_name || ''
                },
                make: prod.Make || '',
                modelNo: prod.Model_no || '',
                costPrice: prod.Cost_price || '',
                quantity: prod.Quantity || '',
                unitId: prod.Unit_Id || '',
                unit: prod.Unit || '',
                warehouse: prod.Warehouse || prod.Name || prod.name || '', // Use warehouse name
                Whouse_Id: prod.Whouse_Id || '', // Use correct case for warehouse id
                remarks: prod.Remarks || '',
            }));

            setProductRows(productRowsArr);

            // Store the original product IDs for this stock-in (for update logic)
            setOriginalProductIds(prodDetailsArr.map(prod => String(prod.Prod_Id || prod.Id)));

            // Do NOT set product input fields on open edit modal
            setSelectedProduct(null);
            setProductQuery('');
            setCostPrice('');
            setQuantity('');
            setMake('');
            setUnitId('');
            setUnit('');
            setWarehouse('');
            setWarehouseId('');
            setModelNo('');
            setRemarks('');
            setEditProductIndex(null);
            setProductSearchStarted(false);
            setProductInputFocused(false);
        } else {
            alert("Inactive Records cannot be edited");
        }
    };

    const handleClose = () => {
        setShowModal(false);
        setIsEdit(false);
        setEditStockInId(null);
        setEditProductIndex(null);
        setProductSearchStarted(false);
        setOriginalProductIds([]);
        setProductInputFocused(false);
    };

    // Helper: Check if there are unadded product details in the input fields
    const hasUnaddedProductInput = () => {
        // If any product input field is filled (during add or edit), block submit and show validation alert
        if (
            (
                (productQuery && productQuery.trim() !== '') ||
                (selectedProduct && selectedProduct.Id) ||
                (costPrice && costPrice !== '') ||
                (quantity && quantity !== '') ||
                (warehouse && warehouse !== '') ||
                (warehouseId && warehouseId !== '') ||
                (modelNo && modelNo !== '') ||
                (remarks && remarks !== '')
            )
        ) {
            Swal.fire({
                icon: 'warning',
                title: 'Validation',
                text: 'Please add the product details to the list before submitting.',
                confirmButtonText: 'OK',
                confirmButtonColor: '#d33'
            });
            return true; // Block submit
        }
        return false; // Allow submit
    };

    // Submit handler using backend/server.js create/modify API
    const handleSubmit = async () => {
        // New validation: If there are unadded product details in the input fields, block submit
        if (hasUnaddedProductInput()) {
            Swal.fire({
                icon: 'warning',
                title: 'Submit Failed',
                text: 'Add the selected product in the formarray',
                confirmButtonText: 'OK',
                confirmButtonColor: '#d33'
            });
            return;
        }

        // Validation for Bill Details
        if (!isReturn) {
            if (
                // !billDetails.purchaseOrder ||
                // !billDetails.purchaseDate ||
                // !billDetails.invoiceNo ||
                // !billDetails.invoiceDate ||
                !selectedCompany ||
                !fromAddress ||
                productRows.length === 0
            ) {
                alert('Please fill all required fields and add at least one product.');
                return;
            }
        } else {
            // If Return Purpose is selected, allow bill details to be blank
            if (
                !selectedCompany ||
                !fromAddress ||
                productRows.length === 0
            ) {
                alert('Please fill all required fields and add at least one product.');
                return;
            }
            // If Return Purpose is selected, Return Date must be filled
            if (returnPurpose && !returnDate) {
                alert('Please select Return Date.');
                return;
            }
            // If Return Purpose is selected, Return Purpose must be filled
            if (returnPurpose && !returnPurpose.trim()) {
                alert('Please select Return Purpose.');
                return;
            }
        }

        // Validate all productRows for required fields and correct types
        for (const row of productRows) {
            if (
                !row.product ||
                !row.product.Id ||
                !row.quantity ||
                !row.unitId ||
                isNaN(Number(row.product.Id)) ||
                isNaN(Number(row.quantity)) ||
                isNaN(Number(row.unitId)) ||
                Number(row.quantity) < 0 // Prevent negative quantity in submit
            ) {
                alert('Each product must have a valid Product, Quantity (non-negative), and Unit.');
                return;
            }
            // Validate warehouse id
            if (!row.Whouse_Id) {
                alert('Each product must have a warehouse selected.');
                return;
            }
        }

        try {
            if (isEdit && editStockInId) {
                // Compose prod_details array from productRows
                const prod_details = productRows.map(row => ({
                    Prod_Id: Number(row.product.Id),
                    Quantity: Number(row.quantity),
                    Warehouse: row.warehouse || '', // warehouse name for display
                    Whouse_Id: row.Whouse_Id || '', // Use correct case for warehouse id
                    Model_no: row.modelNo || '', // Add model no to payload
                    Remarks: row.remarks || '',
                }));

                const payload = {
                    Comp_Id: selectedCompany.Id,
                    From_Address: fromAddress,
                    Active: 1,
                    Modified_By: username,
                    Modified_On: today,
                    prod_details,
                    // Add new fields for return
                    Is_Return: isReturn ? 1 : 0,
                    Credit_No: billFieldsDisabled ? '' : billDetails.creditNoteNo,
                    Credit_Date: billFieldsDisabled ? null : normalizeDateField(billDetails.creditNoteDate),
                    Org_InvNo: billFieldsDisabled ? '' : billDetails.originalInvoiceNo,
                    Org_Invdt: billFieldsDisabled ? null : normalizeDateField(billDetails.originalInvoiceDate),
                    // For non-return, also send the original fields for compatibility
                    Purchase_Order: billFieldsDisabled ? '' : billDetails.purchaseOrder,
                    Purchase_Date: billFieldsDisabled ? null : normalizeDateField(billDetails.purchaseDate),
                    Invoice_No: billFieldsDisabled ? '' : billDetails.invoiceNo,
                    Invoice_Date: billFieldsDisabled ? null : normalizeDateField(billDetails.invoiceDate),
                    // New fields for Return Purpose
                    Return_Purpose: returnPurpose,
                    Return_Date: normalizeDateField(returnDate),
                    // New: Challan field
                    Challan: challan,
                };
                await axios.put(`${API_URL}/${editStockInId}`, payload);

                setShowModal(false);
                setTimeout(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Submitted',
                        text: 'Stock In Updated Successfully !!',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#3085d6'
                    });
                }, 300);
                fetchProducts();
            } else {
                // Use backend/server.js create API: POST /stock-in/create
                const prod_details = productRows.map(row => ({
                    Prod_Id: Number(row.product.Id),
                    Quantity: Number(row.quantity),
                    Warehouse: row.warehouse || '', // warehouse name for display
                    Whouse_Id: row.Whouse_Id || '', // Use correct case for warehouse id
                    Model_no: row.modelNo || '', // Add model no to payload
                    Remarks: row.remarks || '',
                }));
                const payload = {
                    // If isReturn, send the new fields, else send the old ones
                    Is_Return: isReturn ? 1 : 0,
                    Credit_No: billFieldsDisabled ? '' : billDetails.creditNoteNo,
                    Credit_Date: billFieldsDisabled ? null : normalizeDateField(billDetails.creditNoteDate),
                    Org_InvNo: billFieldsDisabled ? '' : billDetails.originalInvoiceNo,
                    Org_Invdt: billFieldsDisabled ? null : normalizeDateField(billDetails.originalInvoiceDate),
                    Purchase_Order: billFieldsDisabled ? '' : billDetails.purchaseOrder,
                    Purchase_Date: billFieldsDisabled ? null : normalizeDateField(billDetails.purchaseDate),
                    Invoice_No: billFieldsDisabled ? '' : billDetails.invoiceNo,
                    Invoice_Date: billFieldsDisabled ? null : normalizeDateField(billDetails.invoiceDate),
                    Comp_Id: selectedCompany.Id,
                    From_Address: fromAddress,
                    Created_On: today,
                    Created_By: username,
                    Active: 1,
                    prod_details,
                    // New fields for Return Purpose
                    Return_Purpose: returnPurpose,
                    Return_Date: normalizeDateField(returnDate),
                    // New: Challan field
                    Challan: challan,
                };
                await axios.post(`${API_URL}/create`, payload);
                setShowModal(false);
                setTimeout(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Submitted',
                        text: 'Stock In Added Successfully !!',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#3085d6'
                    });
                }, 300);
                fetchProducts();
            }
        } catch (err) {
            if (
                err.response &&
                err.response.data &&
                err.response.data.details &&
                (
                    err.response.data.details.startsWith('Duplicate') ||
                    err.response.data.details.startsWith('A similar stock-in entry already exists for the given identifiers.')
                )
            ) {
                Swal.fire({
                    icon: 'error',
                    title: 'Submit Failed',
                    text: 'Duplicate Purchase Order or Invoice numbers are not allowed',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#d33'
                });
                return;
            }
            else if (
                err.response &&
                err.response.data &&
                err.response.data.details &&
                (

                    err.response.data.details.startsWith('A stock-in entry with this Credit Note Number already exists.') ||
                    err.response.data.details.startsWith('A stock-in entry with this Challan Number already exists.') ||
                    err.response.data.details.startsWith('A stock-in entry with this Original Invoice Number already exists.')
                )

            ) {
                Swal.fire({
                    icon: 'error',
                    title: 'Submit Failed',
                    text: 'Duplicate Entries are not allowed',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#d33'
                });
                return;
            }
            // Handle MySQL "Incorrect datetime value" error
            if (
                err.response &&
                err.response.data &&
                err.response.data.details &&
                err.response.data.details.includes("Incorrect datetime value")
            ) {
                Swal.fire({
                    icon: 'error',
                    title: 'Submit Failed',
                    text: 'One or more date fields are missing or invalid. Please ensure all required dates are filled.',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#d33'
                });
                return;
            }
            alert(isEdit ? "Failed to update stock in." : "Failed to save stock in.");
        }
    };

    // Toggle active
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
                alert('Failed to toggle product status.');
            });
    };

    // Table pagination
    // For both tables, filter and sort accordingly
    const filteredStockIn = filtered.filter(item => !item.Is_Return || item.Is_Return === 0);
    const filteredCreditNote = filtered.filter(item => item.Is_Return === 1);

    const totalPages = Math.ceil(
        (showCreditNoteTable ? filteredCreditNote.length : filteredStockIn.length) / rowsPerPage
    );
    const sortedFiltered = showCreditNoteTable
        ? [...filteredCreditNote].sort((a, b) => b.Id - a.Id)
        : [...filteredStockIn].sort((a, b) => b.Id - a.Id);
    const currentData = sortedFiltered.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Pagination component
    const renderPagination = () => (
        <Pagination className="justify-content-center mt-3">
            <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
            <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} />
            {Array.from({ length: totalPages }, (_, i) => (
                <Pagination.Item
                    key={i + 1}
                    active={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                >
                    {i + 1}
                </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} />
            <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
        </Pagination>
    );

    // Company suggestion dropdown
    const renderCompanySuggestions = () => (
        <ListGroup
            style={{
                position: 'absolute',
                zIndex: 10,
                width: '100%',
                maxHeight: 180,
                overflowY: 'auto'
            }}
        >
            {companySuggestions.map(item => (
                <ListGroup.Item
                    key={item.Id}
                    action
                    onClick={() => handleCompanySelect(item)}
                >
                    <strong>{item.Company}</strong>
                    {item.Address && <div className="text-muted small">{item.Address}</div>}
                </ListGroup.Item>
            ))}
        </ListGroup>
    );

    // Product suggestion dropdown
    const renderProductSuggestions = () => (
        <ListGroup
            style={{
                position: 'absolute',
                zIndex: 10,
                width: '100%',
                maxHeight: 180,
                overflowY: 'auto'
            }}
        >
            {productSuggestions.map(item => (
                <ListGroup.Item
                    key={item.Id}
                    action
                    onMouseDown={e => e.preventDefault()} // Prevent blur before click
                    onClick={() => handleProductSelect(item)}
                >
                    <strong>
              
                        {" (Model :" + " "+item.Model_no+")"}
                    </strong>
                    {/* {item.Warehouse && (
                        <div className="text-muted small">Warehouse: {item.Warehouse}</div>
                    )} */}
                </ListGroup.Item>
            ))}
        </ListGroup>
    );

    // Toggle switch for Active
    const renderToggleSwitch = (isActive, onClick) => (
        <Form.Check
            type="switch"
            id={`active-switch-${Math.random()}`}
            checked={isActive}
            onChange={onClick}
            label={isActive ? "Active" : "Inactive"}
        />
    );

    // Fullscreen dialog for Add/Edit
    const renderFullScreenDialog = () => (
        <div style={fullScreenDialogStyles.overlay}>
            <div style={fullScreenDialogStyles.dialog}>
                <button
                    onClick={handleClose}
                    style={fullScreenDialogStyles.closeBtn}
                    aria-label="Close"
                >
                    &times;
                </button>
                <h2 style={{ textAlign: 'center', margin: 0, marginBottom: 24 }}>
                    {isEdit ? 'Edit Stock In' : 'Add Stock In'}
                </h2>
                {/* Is Return Checkbox and Return Purpose/Date */}
                <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Form.Check
                        type="checkbox"
                        id="is-return-checkbox"
                        label="Is Return"
                        checked={isReturn}
                        onChange={e => {
                            setIsReturn(e.target.checked);
                            if (!e.target.checked) {
                                setReturnPurpose('');
                                setReturnDate('');
                                setBillFieldsDisabled(false);
                                setChallan('');
                                setDisableTopReturnFields(false);
                            }
                        }}
                        style={{ fontWeight: 600, fontSize: 16 }}
                        disabled={isEdit} // Disable during edit
                    />
                    {isReturn && (
                        <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center' }}>
                            {/* Original Challan field */}
                            <Form.Group style={{ minWidth: 180 }}>
                                <Form.Label style={{ fontWeight: 500 }}>Original Challan</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={challan}
                                    onChange={handleChallanChange}
                                    placeholder="Original Challan"
                                    disabled={isEdit || disableTopReturnFields}
                                />
                            </Form.Group>
                            <Form.Group style={{ minWidth: 180 }}>
                                <Form.Label style={{ fontWeight: 500 }}>Return Purpose</Form.Label>
                                <Form.Select
                                    value={returnPurpose}
                                    onChange={e => {
                                        setReturnPurpose(e.target.value);
                                        if (e.target.value) {
                                            setBillFieldsDisabled(true);
                                            // Clear bill details fields when disabling
                                            setBillDetails(prev => ({
                                                ...prev,
                                                purchaseOrder: '',
                                                purchaseDate: '',
                                                invoiceNo: '',
                                                invoiceDate: '',
                                                creditNoteNo: '',
                                                creditNoteDate: '',
                                                originalInvoiceNo: '',
                                                originalInvoiceDate: '',
                                            }));
                                        } else {
                                            setBillFieldsDisabled(false);
                                        }
                                    }}
                                    disabled={disableTopReturnFields}
                                >
                                    <option value="">Select Purpose</option>
                                    <option value="Repair">Repair</option>
                                    <option value="Sample">Sample</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group style={{ minWidth: 180 }}>
                                <Form.Label style={{ fontWeight: 500 }}>Return Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={returnDate}
                                    onChange={e => {
                                        setReturnDate(e.target.value);
                                        // When return date is selected, disable bill details fields
                                        if (e.target.value && e.target.value.trim() !== '') {
                                            setBillFieldsDisabled(true);
                                            // Optionally clear bill details fields if you want
                                            // setBillDetails(prev => ({
                                            //     ...prev,
                                            //     purchaseOrder: '',
                                            //     purchaseDate: '',
                                            //     invoiceNo: '',
                                            //     invoiceDate: '',
                                            //     creditNoteNo: '',
                                            //     creditNoteDate: '',
                                            //     originalInvoiceNo: '',
                                            //     originalInvoiceDate: '',
                                            // }));
                                        } else {
                                            // Only re-enable if not disabled by other logic
                                            setBillFieldsDisabled(
                                                !!(isReturn && (
                                                    (challan && challan.trim() !== '') ||
                                                    (returnPurpose && returnPurpose.trim() !== '')
                                                ))
                                            );
                                        }
                                    }}
                                    disabled={disableTopReturnFields}
                                />
                            </Form.Group>
                        </div>
                    )}
                </div>
                {/* Bill Details Section */}
                <div style={fullScreenDialogStyles.sectionTitle}>Bill Details</div>
                <Row className="mb-3">
                    {!isReturn ? (
                        <>
                            <Col md={3} xs={12} className="mb-2">
                                <Form.Group>
                                    <Form.Label>Purchase Order</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="purchaseOrder"
                                        value={billDetails.purchaseOrder}
                                        onChange={handleBillChange}
                                        placeholder="Purchase Order"
                                        disabled={isEdit}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3} xs={12} className="mb-2">
                                <Form.Group>
                                    <Form.Label>Purchase Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="purchaseDate"
                                        value={billDetails.purchaseDate}
                                        onChange={handleBillChange}
                                        disabled={isEdit}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3} xs={12} className="mb-2">
                                <Form.Group>
                                    <Form.Label>Invoice No</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="invoiceNo"
                                        value={billDetails.invoiceNo}
                                        onChange={handleBillChange}
                                        placeholder="Invoice No"
                                        disabled={isEdit}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3} xs={12} className="mb-2">
                                <Form.Group>
                                    <Form.Label>Invoice Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="invoiceDate"
                                        value={billDetails.invoiceDate}
                                        onChange={handleBillChange}
                                        disabled={isEdit}
                                    />
                                </Form.Group>
                            </Col>
                        </>
                    ) : (
                        <>
                            <Col md={3} xs={12} className="mb-2">
                                <Form.Group>
                                    <Form.Label>Credit Note No</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="creditNoteNo"
                                        value={billDetails.creditNoteNo}
                                        onChange={handleBillChange}
                                        placeholder="Credit Note No"
                                        disabled={isEdit || billFieldsDisabled}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3} xs={12} className="mb-2">
                                <Form.Group>
                                    <Form.Label>Credit Note Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="creditNoteDate"
                                        value={billDetails.creditNoteDate}
                                        onChange={handleBillChange}
                                        disabled={isEdit || billFieldsDisabled}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3} xs={12} className="mb-2">
                                <Form.Group>
                                    <Form.Label>Original Invoice No</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="originalInvoiceNo"
                                        value={billDetails.originalInvoiceNo}
                                        onChange={handleBillChange}
                                        placeholder="Original Invoice No"
                                        disabled={isEdit || billFieldsDisabled}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3} xs={12} className="mb-2">
                                <Form.Group>
                                    <Form.Label>Original Invoice Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="originalInvoiceDate"
                                        value={billDetails.originalInvoiceDate}
                                        onChange={handleBillChange}
                                        disabled={isEdit || billFieldsDisabled}
                                    />
                                </Form.Group>
                            </Col>
                        </>
                    )}
                </Row>
                {/* Company Details Section */}
                <div style={fullScreenDialogStyles.sectionTitle}>Company Details</div>
                <Row className="mb-3">
                    <Col md={4} xs={12} style={{ position: 'relative' }} className="mb-2">
                        <Form.Group>
                            <Form.Label>Company</Form.Label>
                            <Form.Control
                                type="text"
                                value={companyQuery}
                                onChange={e => {
                                    setCompanyQuery(e.target.value);
                                    setSelectedCompany(null);
                                }}
                                onFocus={() => setCompanyInputFocused(true)}
                                onBlur={() => setTimeout(() => setCompanyInputFocused(false), 150)}
                                placeholder="Search Company"
                                autoComplete="off"
                            />
                            {companyInputFocused && !selectedCompany && companySuggestions.length > 0 && renderCompanySuggestions()}
                        </Form.Group>
                    </Col>
                    <Col md={4} xs={12} className="mb-2">
                        <Form.Group>
                            <Form.Label>Company Address</Form.Label>
                            <Form.Control
                                type="text"
                                disabled
                                value={companyAddress}
                                onChange={e => setCompanyAddress(e.target.value)}
                                placeholder="Company Address"
                            />
                        </Form.Group>
                    </Col>
                    <Col md={4} xs={12} className="mb-2">
                        <Form.Group>
                            <Form.Label>From Address</Form.Label>
                            <Form.Control
                                type="text"
                                value={fromAddress}
                                onChange={e => setFromAddress(e.target.value)}
                                placeholder="From Address"
                            />
                        </Form.Group>
                    </Col>
                </Row>
                {/* Product Details Section */}
                <div style={fullScreenDialogStyles.sectionTitle}>Product Details</div>
                <Row className="align-items-end mb-3">
                    <Col md={4} xs={12} style={{ position: 'relative' }} className="mb-2">
                        <Form.Group>
                            <Form.Label>Product</Form.Label>
                            <Form.Control
                                type="text"
                                value={productQuery}
                                onChange={e => {
                                    setProductQuery(e.target.value);
                                    setSelectedProduct(null);
                                    setUnitId('');
                                    setUnit('');
                                    setWarehouse('');
                                    setWarehouseId('');
                                    setModelNo('');
                                    if (editProductIndex !== null) {
                                        setProductSearchStarted(true);
                                    }
                                }}
                                onFocus={() => setProductInputFocused(true)}
                                onBlur={() => setTimeout(() => setProductInputFocused(false), 150)}
                                placeholder="Search Product"
                                autoComplete="off"
                            />
                            {productInputFocused && productSuggestions.length > 0 && (editProductIndex === null || productSearchStarted) && renderProductSuggestions()}
                        </Form.Group>
                    </Col>
                    <Col md={2} xs={6} className="mb-2">
                        <Form.Group>
                            <Form.Label>Model No</Form.Label>
                            <Form.Control
                                type="text"
                                value={modelNo}
                                onChange={e => setModelNo(e.target.value)}
                                placeholder="Model No"
                                disabled
                                readOnly
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2} xs={6} className="mb-2">
                        <Form.Group>
                            <Form.Label>Make</Form.Label>
                            <Form.Control
                                type="text"
                                value={make}
                                onChange={e => setMake(e.target.value)}
                                placeholder="Make"
                                disabled
                                readOnly={!!selectedProduct}
                            />
                        </Form.Group>
                    </Col>
                    {/* New: Warehouse field as dropdown */}
                    <Col md={2} xs={6} className="mb-2">
                        <Form.Group>
                            <Form.Label>Warehouse</Form.Label>
                            <Form.Select
                                value={warehouseId}
                                onChange={e => {
                                    const selectedId = e.target.value;
                                    setWarehouseId(selectedId);
                                    const found = warehouses.find(w => String(w.Id) === String(selectedId));
                                    setWarehouse(found ? found.Name : '');
                                }}
                                disabled={warehouses.length === 0}
                            >
                                <option value="">Select Warehouse</option>
                                {warehouses.map(w => (
                                    <option key={w.Id} value={w.Id}>
                                        {w.Name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={2} xs={6} className="mb-2">
                        <Form.Group>
                            <Form.Label>Rate</Form.Label>
                            <Form.Control
                                type="number"
                                value={costPrice}
                                onChange={e => setCostPrice(e.target.value)}
                                placeholder="Rate"
                                disabled
                            // style={{ minWidth: 0, width: '100px' }}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2} xs={6} className="mb-2">
                        <Form.Group>
                            <Form.Label>Quantity</Form.Label>
                            <Form.Control
                                type="text"
                                value={quantity}
                                onChange={e => {
                                    // Only allow non-negative numbers (including empty string)
                                    const val = e.target.value;
                                    if (/^\d*$/.test(val)) {
                                        setQuantity(val);
                                    }
                                }}
                                placeholder="Quantity"
                                // style={{ minWidth: 0, width: '70px' }}
                                inputMode="numeric"
                                pattern="[0-9]*"
                            />
                        </Form.Group>
                    </Col>
                    {/* Remarks field beside Quantity */}
                    <Col md={4} xs={6} className="mb-2">
                        <Form.Group>
                            <Form.Label>Remarks</Form.Label>
                            <Form.Control
                                type="text"
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                placeholder="Remarks"
                                maxLength={255}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={1} xs={6} className="mb-2 d-flex gap-2">
                        {editProductIndex !== null ? (
                            <Button
                                variant="success"
                                onClick={handleUpdateProductRow}
                                className="d-flex align-items-center w-100"
                            >
                                📝
                            </Button>
                        ) : (
                            <Button
                                variant="success"
                                onClick={handleAddProductRow}
                                className="d-flex align-items-center w-100"
                            >
                                ＋
                            </Button>
                        )}
                    </Col>
                </Row>
                {/* Product Rows Table */}
                <Row>
          <Col>
            <Table bordered hover responsive>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Model No</th>
                  <th>Make</th>
                  <th>Warehouse</th>
                  <th>Rate</th>
                  <th>Quantity</th>
                  <th>Remarks</th>
                  <th>Edit</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {productRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center">
                      No products added.
                    </td>
                  </tr>
                ) : (
                  productRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.product.Product_name}</td>
                      <td>{row.modelNo || ""}</td>
                      <td>{row.make || ""}</td>
                      <td>{row.warehouse || ""}</td>
                      <td>{row.costPrice}</td>
                      <td>
                        {row.quantity}
                        {row.unit ? ` ${row.unit}` : ""}
                      </td>
                      <td>{row.remarks || ""}</td>
                      <td className="text-center">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleEditProductRow(idx)}
                          title="Edit"
                        >
                          📝
                        </Button>
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteProductRow(idx)}
                          title="Delete"
                        >
                          🗑️
                        </Button>
                      </td>
                    </tr>
                  ))
                )}

                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "right",
                      fontWeight: "bold",
                      ...wrapCellStyle,
                    }}
                  >
                    Total:
                  </td>
                  <td style={{ fontWeight: "bold", ...wrapCellStyle }}>
                    {getTotalQuantity()}
                    {getCommonUnit() ? ` ${getCommonUnit()}` : ""}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </Table>
          </Col>
        </Row>
                <div style={fullScreenDialogStyles.footer}>
                    <Button variant="success" onClick={handleSubmit}>
                        {isEdit ? 'Update' : 'Submit'}
                    </Button>
                    <Button variant="secondary" onClick={handleClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );

    // Render Stock In Table
    const renderStockInTable = () => (
        <Table striped bordered hover responsive>
            <thead>
                <tr>
                    <th>Purchase No</th>
                    <th>Purchase Date</th>
                    <th>Invoice No</th>
                    <th>Invoice Date</th>
                    <th>Company</th>
                    <th>Make</th>
                    <th>Total Qty</th>
                    <th>Total Amt</th>
                    <th>Edit</th>
       
                </tr>
            </thead>
            <tbody>
                {currentData && currentData.length > 0 ? (
                    currentData.map((product) => (
                        <tr key={product.Id}>
                            <td>{product.Purchase_Order}</td>
                            <td>
                                {product.Purchase_Date
                                    ? (() => {
                                        const d = new Date(product.Purchase_Date);
                                        const day = String(d.getDate()).padStart(2, '0');
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const year = d.getFullYear();
                                        return `${day}-${month}-${year}`;
                                    })()
                                    : ''}
                            </td>
                            <td>{product.Invoice_No}</td>
                            <td>
                                {product.Invoice_Date
                                    ? (() => {
                                        const d = new Date(product.Invoice_Date);
                                        const day = String(d.getDate()).padStart(2, '0');
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const year = d.getFullYear();
                                        return `${day}-${month}-${year}`;
                                    })()
                                    : ''}
                            </td>
                            <td>{product.Company}</td>
                            <td>{product.Make}</td>
                            <td>
                                {product.Total_Quantity}{" "}
                                {product.prod_details && product.prod_details[0] && product.prod_details[0].Unit}
                            </td>
                            <td>₹ {product.Total_Price}</td>
                            <td className="text-center">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => openEditModal(product)}
                                    aria-label={`Edit ${product.Product_name}`}
                                >
                                    📝
                                </Button>
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
    );

    // Render Credit Note Table
    const renderCreditNoteTable = () => (
        <Table striped bordered hover responsive>
            <thead>
                <tr>
                    <th>Credit No</th>
                    <th>Credit Date</th>
                    <th>Challan</th>
                    <th>Return Date</th>
                    <th>Company</th>
                    <th>Make</th>
                    <th>Total Qty</th>
                    <th>Total Amt</th>
                    <th>Edit</th>
                </tr>
            </thead>
            <tbody>
                {currentData && currentData.length > 0 ? (
                    currentData.map((product) => (
                        <tr key={product.Id}>
                            <td>{product.Credit_No}</td>
                            <td>
                                {product.Credit_Date
                                    ? (() => {
                                        const d = new Date(product.Credit_Date);
                                        const day = String(d.getDate()).padStart(2, '0');
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const year = d.getFullYear();
                                        return `${day}-${month}-${year}`;
                                    })()
                                    : ''}
                            </td>
                            <td>{product.Challan || ''}</td>
                                 <td>
                                {product.Return_Date
                                    ? (() => {
                                        const d = new Date(product.Return_Date);
                                        const day = String(d.getDate()).padStart(2, '0');
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const year = d.getFullYear();
                                        return `${day}-${month}-${year}`;
                                    })()
                                    : ''}
                            </td>
                            <td>{product.Company}</td>
                            <td>{product.Make}</td>
                            <td>
                                {product.Total_Quantity}{" "}
                                {product.prod_details && product.prod_details[0] && product.prod_details[0].Unit}
                            </td>
                            <td>₹ {product.Total_Price}</td>
                            <td className="text-center">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => openEditModal(product)}
                                    aria-label={`Edit ${product.Product_name}`}
                                >
                                    📝
                                </Button>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={creditNoteTableHeaders.length} className="text-center">
                            No data found.
                        </td>
                    </tr>
                )}
            </tbody>
        </Table>
    );

    return (
        <Container fluid className="py-4">
            <Row className="align-items-center mb-3">
                <Col>
                    <h2 className="mb-0">
                        {showCreditNoteTable ? "Return Stock In" : "Stock In List"}
                    </h2>
                </Col>
                <Col xs="auto" className="d-flex gap-2">
                    {!showCreditNoteTable && (
                        <>
                            <Button variant="primary" size="sm" onClick={handleAddClick}>
                                Add Stock In
                            </Button>
                            <Button variant="warning" size="sm" onClick={handleCreditNoteStockClick}>
                                Return Stock In
                            </Button>
                        </>
                    )}
                    {showCreditNoteTable && (
                        <Button variant="secondary" size="sm" onClick={handleStockInListClick}>
                            Stock In List
                        </Button>
                    )}
                </Col>
            </Row>
            <Row className="mb-3">
                <Col md={{ span: 6, offset: 3 }}>
                    <InputGroup>
                        <FormControl
                            type="text"
                            placeholder={
                                showCreditNoteTable
                                    ? "Search by credit note, invoice, company, etc..."
                                    : "Search by name or model..."
                            }
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </InputGroup>
                </Col>
            </Row>
            <Row>
                <Col>
                    {showCreditNoteTable ? renderCreditNoteTable() : renderStockInTable()}
                    {renderPagination()}
                </Col>
            </Row>

            {/* Fullscreen Dialog for Add/Edit */}
            {showModal && renderFullScreenDialog()}
        </Container>
    );
};

export default StockIn;
