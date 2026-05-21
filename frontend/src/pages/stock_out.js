import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
    Button,
    Table,
    Modal,
    Form,
    Row,
    Col,
    InputGroup,
    ListGroup,
    Container,
    Pagination,
    Badge
} from 'react-bootstrap';

const API_URL = 'https://kdstocksoft.onrender.com/stock-out';

const PURPOSE_OPTIONS = [
    { value: '', label: 'Select Purpose' },
    { value: 'Delivery', label: 'Delivery' },
    { value: 'Repair', label: 'Repair' },
    { value: 'Sample', label: 'Sample' },
    { value: 'Return', label: 'Return' },
    { value: 'Replace', label: 'Replace' },
    { value: 'Service', label: 'Service' }
];

// Fixed values for dispatch details
const DISPATCH_PACKING = [
    { value: '', label: 'Select' },
    { value: 'Santanu', label: 'Santanu' },
    { value: 'Shuvankar', label: 'Shuvankar' },
    { value: 'Sudhanshu', label: 'Sudhanshu' },
    { value: 'Sourav', label: 'Sourav' },
    { value: 'Rakesh', label: 'Rakesh' },
    { value: 'By Vendor', label: 'By Vendor' },
];

const DISPATCH_CHECKING = [
    { value: '', label: 'Select' },
    { value: 'Santanu', label: 'Santanu' },
    { value: 'Shuvankar', label: 'Shuvankar' },
    { value: 'Sourav', label: 'Sourav' },
    { value: 'Sudhanshu', label: 'Sudhanshu' },
    { value: 'Kaniska', label: 'Kaniska' },
    { value: 'Srijan', label: 'Srijan' },
    { value: 'Sampurna', label: 'Sampurna' },
    { value: 'Rakesh', label: 'Rakesh' },
];

const DISPATCH_DELIVERY = [
    { value: '', label: 'Select' },
    { value: 'Santanu', label: 'Santanu' },
    { value: 'Shuvankar', label: 'Shuvankar' },
    { value: 'Sourav', label: 'Sourav' },
    { value: 'Sudhanshu', label: 'Sudhanshu' },
    { value: 'Collect from Office', label: 'Collect from Office' },
    { value: 'Porter', label: 'Porter' },
    { value: 'Rapido', label: 'Rapido' },
    { value: 'Trackon', label: 'Trackon' },
];

const StockOut = () => {
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

    // Bill Details (add Delivery_Challan and Purpose)
    const [billDetails, setBillDetails] = useState({
        invoiceNo: '',
        invoiceDate: '',
        deliveryChallan: '',
        purpose: '',
    });

    // Company Details
    const [companyQuery, setCompanyQuery] = useState('');
    const [companySuggestions, setCompanySuggestions] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyAddress, setCompanyAddress] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [companyInputFocused, setCompanyInputFocused] = useState(false);

    // Dispatch Details
    const [dispatchDetails, setDispatchDetails] = useState({
        packingBy: '',
        checkingBy: '',
        deliveryBy: '',
    });

    // Product Details (for form row)
    const [productQuery, setProductQuery] = useState('');
    const [productSuggestions, setProductSuggestions] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [costPrice, setCostPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [make, setMake] = useState('');
    const [unitId, setUnitId] = useState('');
    const [unit, setUnit] = useState('');
    // Add warehouse state
    const [warehouse, setWarehouse] = useState('');
    // New: Model No state
    const [modelNo, setModelNo] = useState('');
    // New: Remarks state
    const [remarks, setRemarks] = useState('');

    // Form array for product rows
    const [productRows, setProductRows] = useState([]);
    const [editProductIndex, setEditProductIndex] = useState(null);

    // Track if user has started searching for product during edit
    const [productSearchStarted, setProductSearchStarted] = useState(false);

    // Track original product IDs for edit mode to help with correct update
    const [originalProductIds, setOriginalProductIds] = useState([]);

    // Table headers (remove Purchase No and Purchase Date)
    const tableHeaders = [
        "Invoice No",
        "Date",
        "Challan",
        "Purpose",
        "Company",
        "Make",
        "Quantity",
        "Total Amount",
        "Edit",
        "Active"
    ];

    // New: Track if bill details fields should be disabled (for edit mode)
    const [billDetailsDisabled, setBillDetailsDisabled] = useState(false);

    // New: Track if all bill details fields should be disabled (for edit mode)
    const [allBillDetailsDisabled, setAllBillDetailsDisabled] = useState(false);

    // New: Track if top 4 fields should be enabled in edit mode (for challan+purpose)
    const [forceEnableTopBillFields, setForceEnableTopBillFields] = useState(false);

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

    // Modified fetchProducts to sort by descending Invoice_Date, then Invoice_No, then Delivery_Challan, then Id
    const fetchProducts = () => {
        axios.get(API_URL)
            .then((response) => {
                // Sort by Invoice_Date (descending), then Invoice_No (descending, string compare), then Delivery_Challan (descending, string compare), then Id (descending)
                const sortedData = Array.isArray(response.data)
                    ? [...response.data].sort((a, b) => {
                        const dateA = a.Invoice_Date ? new Date(a.Invoice_Date) : null;
                        const dateB = b.Invoice_Date ? new Date(b.Invoice_Date) : null;
                        if (dateA && dateB) {
                            if (dateA < dateB) return 1;
                            if (dateA > dateB) return -1;
                        } else if (dateA && !dateB) {
                            return -1;
                        } else if (!dateA && dateB) {
                            return 1;
                        }
                        // If both have Invoice_No, sort by Invoice_No descending (string compare)
                        if (a.Invoice_No && b.Invoice_No) {
                            if (a.Invoice_No < b.Invoice_No) return 1;
                            if (a.Invoice_No > b.Invoice_No) return -1;
                        }
                        // If only one has Invoice_No, that comes first
                        if (a.Invoice_No && !b.Invoice_No) return -1;
                        if (!a.Invoice_No && b.Invoice_No) return 1;
                        // If both have Delivery_Challan, sort by Delivery_Challan descending (string compare)
                        if (a.Delivery_Challan && b.Delivery_Challan) {
                            if (a.Delivery_Challan < b.Delivery_Challan) return 1;
                            if (a.Delivery_Challan > b.Delivery_Challan) return -1;
                        }
                        // If only one has Delivery_Challan, that comes first
                        if (a.Delivery_Challan && !b.Delivery_Challan) return -1;
                        if (!a.Delivery_Challan && b.Delivery_Challan) return 1;
                        // Fallback: sort by Id descending
                        return b.Id - a.Id;
                    })
                    : [];
                setProducts(sortedData);
                setFiltered(sortedData);
                const actives = {};
                sortedData.forEach(item => {
                    actives[item.Id] = item.Active === 1;
                });
                setActiveStates(actives);
            })
            .catch((error) => {
                console.error('Error fetching data:', error);
            });
    };

    // Table search (remove Purchase_Order and Purchase_Date from search)
    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const results = products.filter((product) =>
            product.Id?.toString().includes(lowerTerm) ||
            product.Total_Price?.toString().includes(lowerTerm) ||
            product.Invoice_No?.toLowerCase().includes(lowerTerm) ||
            product.Make?.toLowerCase().includes(lowerTerm) ||
            product.Quantity?.toLowerCase().includes(lowerTerm) ||
            product.Company?.toLowerCase().includes(lowerTerm) ||
            product.Invoice_Date?.toLowerCase().includes(lowerTerm)
        );
        // Sort filtered results by descending Invoice_Date, then Invoice_No, then Delivery_Challan, then Id
        const sortedResults = [...results].sort((a, b) => {
            // Sort by Invoice_Date descending (most recent first)
            const dateA = a.Invoice_Date ? new Date(a.Invoice_Date) : null;
            const dateB = b.Invoice_Date ? new Date(b.Invoice_Date) : null;
            if (dateA && dateB) {
                if (dateA < dateB) return 1;
                if (dateA > dateB) return -1;
            } else if (dateA && !dateB) {
                return -1;
            } else if (!dateA && dateB) {
                return 1;
            }
            if (a.Invoice_No && b.Invoice_No) {
                if (a.Invoice_No < b.Invoice_No) return 1;
                if (a.Invoice_No > b.Invoice_No) return -1;
            }
            if (a.Invoice_No && !b.Invoice_No) return -1;
            if (!a.Invoice_No && b.Invoice_No) return 1;
            if (a.Delivery_Challan && b.Delivery_Challan) {
                if (a.Delivery_Challan < b.Delivery_Challan) return 1;
                if (a.Delivery_Challan > b.Delivery_Challan) return -1;
            }
            if (a.Delivery_Challan && !b.Delivery_Challan) return -1;
            if (!a.Delivery_Challan && b.Delivery_Challan) return 1;
            return b.Id - a.Id;
        });
        setFiltered(sortedResults);
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

    // Product autocomplete (add Warehouse: item.Name)
    useEffect(() => {
        if (
            productQuery.length >= 3 &&
            (editProductIndex === null || productSearchStarted)
        ) {
            const fetchSuggestions = async () => {
                try {
                    const response = await axios.get(`https://kdstocksoft.onrender.com/stock-search?query=${productQuery}`);
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
                                Warehouse: item.Name ?? '', // Add warehouse
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
    }, [productQuery, editProductIndex, productSearchStarted]);

    // --- Bill Details Handlers and Disable Logic ---

    // Handler for Invoice No (to handle disabling logic)
    const handleInvoiceNoChange = (e) => {
        const { name, value } = e.target;
        setBillDetails(prev => ({
            ...prev,
            [name]: value,
            // If user types in Invoice No, clear Challan and Purpose
            ...(name === 'invoiceNo' && value
                ? { deliveryChallan: '', purpose: '' }
                : {})
        }));
    };

    // Handler for Challan and Purpose (to handle disabling logic)
    const handleChallanPurposeChange = (e) => {
        const { name, value } = e.target;
        setBillDetails(prev => ({
            ...prev,
            [name]: value,
            // If user types in Challan or Purpose, clear Invoice No
            ...(name === 'deliveryChallan' || name === 'purpose'
                ? { invoiceNo: '' }
                : {})
        }));
    };

    // Handler for Date (no disabling logic)
    const handleInvoiceDateChange = (e) => {
        const { name, value } = e.target;
        setBillDetails(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handlers for Company Details
    const handleCompanySelect = (item) => {
        setSelectedCompany(item);
        setCompanyQuery(item.Company);
        setCompanyAddress(item.Address || '');
        setCompanySuggestions([]);
    };

    // Handlers for Dispatch Details
    const handleDispatchChange = (e) => {
        const { name, value } = e.target;
        setDispatchDetails(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handlers for Product Details (setWarehouse, setModelNo)
    const handleProductSelect = (item) => {
        setSelectedProduct(item);
        setProductQuery(item.Product_name || '');
        setMake(item.Make || '');
        setCostPrice(item.Cost_price !== undefined && item.Cost_price !== null ? item.Cost_price : '');
        setUnitId(item.Unit_Id || '');
        setUnit(item.Unit || '');
        setWarehouse(item.Warehouse || ''); // Set warehouse
        setModelNo(item.Model_no || '');
        setProductSuggestions([]); // Clear suggestions immediately
        setProductSearchStarted(false); // Reset search started after selection
    };

    // Add product row to form array (include warehouse, modelNo, remarks)
    const handleAddProductRow = () => {
        if (!selectedProduct || !costPrice || !quantity) {
            alert('Please select product, cost price and quantity');
            return;
        }
        // No model no in product name
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
                    Product_name: displayName,
                    Model_no: modelNo || ''
                },
                make: make,
                costPrice,
                quantity,
                unitId: unitId,
                unit: unit,
                warehouse: warehouse, // Add warehouse
                remarks: remarks || '', // Add remarks
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
        setModelNo('');
        setRemarks('');
        setEditProductIndex(null);
        setProductSearchStarted(false);
    };
    
    // Update product row after edit (include warehouse, modelNo, remarks)
    const handleUpdateProductRow = () => {
        if (editProductIndex === null || !selectedProduct || !costPrice || !quantity) {
            alert('Please select product, cost price and quantity');
            return;
        }
        // No model no in product name
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
                        Product_name: displayName,
                        Model_no: modelNo || ''
                    },
                    make,
                    costPrice,
                    quantity,
                    unitId: unitId,
                    unit: unit,
                    warehouse: warehouse,
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
        setModelNo('');
        setRemarks('');
        setProductSearchStarted(false);
    };
    
    // Edit product row (setWarehouse, setModelNo, setRemarks)
    const handleEditProductRow = (idx) => {
        const row = productRows[idx];
        let prodName = row.product.Product_name || '';
        let modelNoVal = row.product.Model_no || '';
        setSelectedProduct({
            Id: row.product.Id,
            Product_name: prodName,
            Model_no: modelNoVal
        });
        setProductQuery(prodName);
        setModelNo(modelNoVal);
        setCostPrice(row.costPrice);
        setQuantity(row.quantity);
        setMake(row.make || '');
        setUnitId(row.unitId || '');
        setUnit(row.unit || '');
        setWarehouse(row.warehouse || '');
        setRemarks(row.remarks || '');
        setEditProductIndex(idx);
        setProductSearchStarted(false); // When entering edit, do not show suggestions
    };


    // Delete product row (reset warehouse, modelNo, remarks)
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
            setModelNo('');
            setRemarks('');
            setProductSearchStarted(false);
        }
    };

    // Modal open/close (reset warehouse, modelNo, remarks)
    const handleAddClick = () => {
        setShowModal(true);
        setIsEdit(false);
        setEditStockInId(null);
        setBillDetails({
            invoiceNo: '',
            invoiceDate: '',
            deliveryChallan: '',
            purpose: '',
        });
        setCompanyQuery('');
        setCompanyAddress('');
        setToAddress('');
        setSelectedCompany(null);
        setProductQuery('');
        setCostPrice('');
        setQuantity('');
        setMake('');
        setUnitId('');
        setUnit('');
        setWarehouse('');
        setModelNo('');
        setRemarks('');
        setSelectedProduct(null);
        setProductRows([]);
        setEditProductIndex(null);
        setProductSearchStarted(false);
        setOriginalProductIds([]); // Reset original product ids
        setAllBillDetailsDisabled(false); // Enable all bill details fields for add
        setForceEnableTopBillFields(false); // Reset force enable
        setDispatchDetails({
            packingBy: '',
            checkingBy: '',
            deliveryBy: '',
        });
    };

    // Modified openEditModal to support multiple prod_details (set warehouse, modelNo, remarks)
    const openEditModal = (stockIn) => {
        if (stockIn.Active === 1) {

            setShowModal(true);
            setIsEdit(true);
            setEditStockInId(stockIn.Id);

            const newBillDetails = {
                invoiceNo: stockIn.Invoice_No || stockIn.Invoice_no || '',
                invoiceDate: stockIn.Invoice_Date ? stockIn.Invoice_Date.split('T')[0] : '',
                deliveryChallan: stockIn.Delivery_Challan || '',
                purpose: stockIn.Purpose || '',
            };
            setBillDetails(newBillDetails);

            setCompanyQuery(stockIn.Company || '');
            setCompanyAddress(stockIn.Address || '');
            setToAddress(stockIn.To_Address || '');
            setSelectedCompany({ Company: stockIn.Company, Id: stockIn.Comp_Id || undefined });

            // Dispatch details from DB fields
            setDispatchDetails({
                packingBy: stockIn.Packing_By || '',
                checkingBy: stockIn.Checking_By || '',
                deliveryBy: stockIn.Delivery_By || '',
            });

            // Handle multiple prod_details
            const prodDetailsArr = Array.isArray(stockIn.prod_details) ? stockIn.prod_details : [];
            const productRowsArr = prodDetailsArr.map(prod => ({
                product: {
                    Id: prod.Prod_Id || prod.Id,
                    Product_name: prod.Product_name || '',
                    Model_no: prod.Model_no || ''
                },
                make: prod.Make || '',
                costPrice: prod.Cost_price || '',
                quantity: prod.Quantity || '',
                unitId: prod.Unit_Id || '',
                unit: prod.Unit || '',
                warehouse: prod.Name || prod.name || '', // Use 'Name' (backend) or fallback to 'name'
                remarks: prod.Remarks || '', // Add remarks from backend if present
            }));

            setProductRows(productRowsArr);

            // Store the original product IDs for this stock-out (for update logic)
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
            setModelNo('');
            setRemarks('');
            setEditProductIndex(null);
            setProductSearchStarted(false);

            // Custom logic: If both challan and purpose are present, enable top 4 fields
            if (
                (newBillDetails.deliveryChallan && newBillDetails.deliveryChallan.trim() !== '') &&
                (newBillDetails.purpose && newBillDetails.purpose.trim() !== '')
            ) {
                setAllBillDetailsDisabled(false);
                setForceEnableTopBillFields(true);
            } else {
                setAllBillDetailsDisabled(true);
                setForceEnableTopBillFields(false);
            }
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
        setWarehouse('');
        setModelNo('');
        setRemarks('');
        setAllBillDetailsDisabled(false); // Reset on close
        setForceEnableTopBillFields(false); // Reset on close
        setDispatchDetails({
            packingBy: '',
            checkingBy: '',
            deliveryBy: '',
        });
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
                (modelNo && modelNo !== '') ||
                (remarks && remarks !== '')
            )
        ) {
            Swal.fire({
                icon: 'warning',
                title: 'Submit Failed',
                text: 'Add the selected product in the formarray',
                confirmButtonText: 'OK',
                confirmButtonColor: '#d33'
            });
            return true; // Block submit
        }
        return false; // Allow submit
    };

    // Helper: Convert blank string to null for Invoice No and Challan, and blank to '' for Purpose
    const normalizeBillDetails = (details) => {
        return {
            ...details,
            invoiceNo: details.invoiceNo && details.invoiceNo.trim() !== '' ? details.invoiceNo : null,
            invoiceDate: details.invoiceDate && details.invoiceDate.trim() !== '' ? details.invoiceDate : null,
            deliveryChallan: details.deliveryChallan && details.deliveryChallan.trim() !== '' ? details.deliveryChallan : null,
            purpose: details.purpose !== undefined && details.purpose !== null ? details.purpose : '',
        };
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

        // Validation: Either Invoice No or (Challan and Purpose) must be filled, not both, not neither
        const hasInvoice = !!billDetails.invoiceNo;
        const hasChallanAndPurpose = !!billDetails.deliveryChallan && !!billDetails.purpose;
        if ((hasInvoice && hasChallanAndPurpose) || (!hasInvoice && !hasChallanAndPurpose)) {
            alert('Please fill either Invoice No or both Challan and Purpose (not both, not neither).');
            return;
        }

        if (
            (!hasInvoice && (!billDetails.deliveryChallan || !billDetails.purpose)) ||
            (!selectedCompany ||
                !toAddress ||
                productRows.length === 0)
        ) {
            alert('Please fill all required fields and add at least one product.');
            return;
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
                isNaN(Number(row.unitId))
            ) {
                alert('Each product must have a valid Product, Quantity, and Unit.');
                return;
            }
        }

        // Normalize bill details for null/blank as per requirements
        const normalizedBill = normalizeBillDetails(billDetails);

        try {
            if (isEdit && editStockInId) {
                // Compose prod_details array from productRows
                const prod_details = productRows.map(row => ({
                    Prod_Id: Number(row.product.Id),
                    Quantity: Number(row.quantity),
                    Warehouse: row.warehouse || '', // Add warehouse to payload
                    Model_no: row.product.Model_no || '',
                    Remarks: row.remarks || '', // Add remarks to payload
                }));

                // The backend will handle restoring old stock, deleting old product_sold_details, updating stock_out, and inserting new product_sold_details
                // FIX: Add Invoice_No and Invoice_Date to payload for edit
                const payload = {
                    Invoice_No: normalizedBill.invoiceNo,
                    Invoice_Date: normalizedBill.invoiceDate,
                    Comp_Id: selectedCompany.Id,
                    To_Address: toAddress,
                    Active: 1,
                    Modified_By: username,
                    Modified_On: today,
                    prod_details,
                    // Add Delivery_Challan and Purpose if present
                    Delivery_Challan: normalizedBill.deliveryChallan,
                    Purpose: normalizedBill.purpose !== undefined && normalizedBill.purpose !== null ? normalizedBill.purpose : '',
                    // Add dispatch details
                    Packing_By: dispatchDetails.packingBy,
                    Checking_By: dispatchDetails.checkingBy,
                    Delivery_By: dispatchDetails.deliveryBy,
                };

                await axios.put(`${API_URL}/${editStockInId}`, payload)
                    .then(() => {
                        setShowModal(false);
                        setTimeout(() => {
                            Swal.fire({
                                icon: 'success',
                                title: 'Submitted',
                                text: 'Stock Out Updated Successfully !!',
                                confirmButtonText: 'OK',
                                confirmButtonColor: '#3085d6'
                            });
                        }, 300);
                        fetchProducts();
                    })
                    .catch((err) => {
                        console.log(err.response.data.details);
                        if (
                            err.response &&
                            err.response.data &&
                            err.response.data.error &&
                            (
                                err.response.data.error.startsWith('Stock-out entry already exists for this Invoice, Date and Company.') ||
                                err.response.data.error.startsWith('Stock-out entry already exists for this Date, Challan, Purpose, and Company.')
                            )
                        ) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Submit Failed',
                                text: 'Duplicate Invoice numbers or Challan numbers are not allowed',
                                confirmButtonText: 'OK',
                                confirmButtonColor: '#d33'
                            });
                            return;
                        }
                        if (
                            err.response && err.response.data && err.response.data.details && err.response.data.details.startsWith('Insufficient')
                        ) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Submit Failed',
                                text: 'Insufficient stock of Product',
                                confirmButtonText: 'OK',
                                confirmButtonColor: '#d33'
                            });
                            return;
                        }
                        // alert("Failed to update stock out.");
                    });
            } else {
                // Use backend/server.js create API: POST /stock-out/create
                const prod_details = productRows.map(row => ({
                    Prod_Id: Number(row.product.Id),
                    Quantity: Number(row.quantity),
                    Warehouse: row.warehouse || '', // Add warehouse to payload
                    Model_no: row.product.Model_no || '',
                    Remarks: row.remarks || '', // Add remarks to payload
                }));
                const payload = {
                    Invoice_No: normalizedBill.invoiceNo,
                    Invoice_Date: normalizedBill.invoiceDate,
                    Delivery_Challan: normalizedBill.deliveryChallan,
                    Purpose: normalizedBill.purpose !== undefined && normalizedBill.purpose !== null ? normalizedBill.purpose : '',
                    Comp_Id: selectedCompany.Id,
                    To_Address: toAddress,
                    Created_On: today,
                    Created_By: username,
                    Active: 1,
                    prod_details,
                    // Add dispatch details
                    Packing_By: dispatchDetails.packingBy,
                    Checking_By: dispatchDetails.checkingBy,
                    Delivery_By: dispatchDetails.deliveryBy,
                };
                await axios.post(`${API_URL}/create`, payload);
                setShowModal(false);
                setTimeout(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Submitted',
                        text: 'Stock Out Added Successfully !!',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#3085d6'
                    });
                }, 300);
                fetchProducts();
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.error
                &&
                (

                    err.response.data.error.startsWith('Stock-out entry already exists for this Invoice, Date and Company.') ||
                    err.response.data.error.startsWith('Stock-out entry already exists for this Date, Challan, Purpose, and Company.')
                )


            ) {
                Swal.fire({
                    icon: 'error',
                    title: 'Submit Failed',
                    text: 'Duplicate Invoice numbers or Challan numbers are not allowed',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#d33'
                });
                return;
            }
            if (err.response && err.response.data && err.response.data.error && err.response.data.error.startsWith('Insufficient')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Submit Failed',
                    text: 'Insufficient stock of Product',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#d33'
                });
                return;
            }
            alert(isEdit ? "Failed to update stock out." : "Failed to save stock out.");
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
    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    // No need to sort here, as fetchProducts and search already sort products and filtered
    const currentData = filtered.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // The disabling logic for bill details fields
    // If forceEnableTopBillFields is true, all top 4 fields are enabled
    const disableChallanPurposeFields = forceEnableTopBillFields
        ? false
        : !!billDetails.invoiceNo || allBillDetailsDisabled;
    const disableInvoiceNoField = forceEnableTopBillFields
        ? false
        : !!billDetails.deliveryChallan || !!billDetails.purpose || allBillDetailsDisabled;
    const disableInvoiceDateField = forceEnableTopBillFields
        ? false
        : allBillDetailsDisabled;
    const disablePurposeField = forceEnableTopBillFields
        ? false
        : disableChallanPurposeFields;

    // --- Custom helpers for modal table summary row ---
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
            return sum + ((isNaN(qty) || isNaN(rate)) ? 0 : qty * rate);
        }, 0);
    };

    // Get unit if all unitIds are the same and not empty, else return empty string
    const getCommonUnit = () => {
        if (productRows.length === 0) return '';
        const firstUnitId = productRows[0].unitId;
        if (!firstUnitId) return '';
        for (let i = 1; i < productRows.length; i++) {
            if (productRows[i].unitId !== firstUnitId) return '';
        }
        // All unitIds are the same, return the unit string (from first row)
        return productRows[0].unit ? productRows[0].unit : '';
    };

    // --- Helper for cell style to wrap text in table rows ---
    const wrapCellStyle = {
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxWidth: 180,
        verticalAlign: 'middle'
    };

    return (
        <Container className="py-4">
            <Row className="align-items-center mb-3">
                <Col>
                    <h2 className="mb-0">Stock Out List</h2>
                </Col>
                <Col xs="auto">
                    <Button variant="primary" size="sm" onClick={handleAddClick}>
                        Add Stock Out
                    </Button>
                </Col>
            </Row>
            <Row className="mb-3">
                <Col md={{ span: 6, offset: 3 }}>
                    <Form.Control
                        type="text"
                        placeholder="Search by name or model..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Col>
            </Row>
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>Invoice No</th>
                        <th>Date</th>
                        <th>Challan</th>
                        <th>Purpose</th>
                        <th>Company</th>
                        <th>Make</th>
                        <th>Total Qty</th>
                        <th>Total Amt</th>
                        <th>Edit</th>
                        <th>Active</th>
                    </tr>
                </thead>
                <tbody>
                    {currentData && currentData.length > 0 ? (
                        currentData.map((product) => (
                            <tr key={product.Id}>
                                <td >{product.Invoice_No}</td>
                                <td >
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
                                <td >{product.Delivery_Challan}</td>
                                <td >{product.Purpose}</td>
                                <td >{product.Company}</td>
                                <td >{product.Make}</td>
                                <td >{product.Total_Quantity + " " + product.prod_details[0].Unit}</td>
                                <td >₹ {product.Total_Price}</td>
                                <td className="text-center">
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => openEditModal(product)}
                                        aria-label={`Edit ${product.Product_name}`}
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
                                                    Swal.fire({
                                                        icon: newStatus ? 'success' : 'success',
                                                        title: newStatus ? 'Activated' : 'Inactivated',
                                                        text: newStatus
                                                            ? 'Stock Out Record activated'
                                                            : 'Stock Out Record inactivated',
                                                        confirmButtonText: 'OK',
                                                        confirmButtonColor: newStatus ? '#3085d6' : '#3085d6'
                                                    });
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
            <Row className="justify-content-center mt-3">
                <Col xs="auto">
                    <Form.Label>
                        Page:{' '}
                        <Form.Select
                            value={currentPage}
                            onChange={(e) => setCurrentPage(Number(e.target.value))}
                            style={{ display: 'inline-block', width: 'auto' }}
                        >
                            {Array.from({ length: totalPages }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                        </Form.Select>
                    </Form.Label>
                </Col>
            </Row>

            {/* Modal for Add/Edit */}
            <Modal
                show={showModal}
                onHide={handleClose}
                size="xl"
                centered
                backdrop="static"
                scrollable
            >
                <Modal.Header closeButton>
                    <Modal.Title>{isEdit ? 'Edit Stock Out' : 'Add Stock Out'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Bill Details Section */}
                    <h5>Bill Details</h5>
                    <Row className="mb-3">
                        {/* Invoice No and Date */}
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Invoice No</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="invoiceNo"
                                    value={billDetails.invoiceNo}
                                    onChange={handleInvoiceNoChange}
                                    placeholder="Invoice No"
                                    disabled={disableInvoiceNoField}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    name="invoiceDate"
                                    value={billDetails.invoiceDate}
                                    onChange={handleInvoiceDateChange}
                                    disabled={disableInvoiceDateField}
                                />
                            </Form.Group>
                        </Col>
                        {/* Challan and Purpose */}
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Challan</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="deliveryChallan"
                                    value={billDetails.deliveryChallan}
                                    onChange={handleChallanPurposeChange}
                                    placeholder="Delivery Challan"
                                    disabled={disableChallanPurposeFields}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Purpose</Form.Label>
                                <Form.Select
                                    name="purpose"
                                    value={billDetails.purpose}
                                    onChange={handleChallanPurposeChange}
                                    disabled={disablePurposeField}
                                >
                                    {PURPOSE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    {/* Company Details Section */}
                    <h5>Company Details</h5>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group style={{ position: 'relative' }}>
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
                                {companyInputFocused && !selectedCompany && companySuggestions.length > 0 && (
                                    <ListGroup style={{ position: 'absolute', zIndex: 10, width: '100%' }}>
                                        {companySuggestions.map(item => (
                                            <ListGroup.Item
                                                key={item.Id}
                                                action
                                                onClick={() => handleCompanySelect(item)}
                                            >
                                                <strong>{item.Company}</strong>
                                                {item.Address && <div style={{ fontSize: 12, color: '#888' }}>{item.Address}</div>}
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                )}
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Billing Address</Form.Label>
                                <Form.Control
                                    type="text"
                                    disabled
                                    value={companyAddress}
                                    onChange={e => setCompanyAddress(e.target.value)}
                                    placeholder="Billing Address"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Shipping Address</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={toAddress}
                                    onChange={e => setToAddress(e.target.value)}
                                    placeholder="Shipping Address"
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    {/* Dispatch Details Section */}
                    <h5>Dispatch Details</h5>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Packing By</Form.Label>
                                <Form.Select
                                    name="packingBy"
                                    value={dispatchDetails.packingBy}
                                    onChange={handleDispatchChange}
                                // disabled={allBillDetailsDisabled}
                                >
                                    {DISPATCH_PACKING.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Checking By</Form.Label>
                                <Form.Select
                                    name="checkingBy"
                                    value={dispatchDetails.checkingBy}
                                    onChange={handleDispatchChange}
                                // disabled={allBillDetailsDisabled}
                                >
                                    {DISPATCH_CHECKING.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Delivery By</Form.Label>
                                <Form.Select
                                    name="deliveryBy"
                                    value={dispatchDetails.deliveryBy}
                                    onChange={handleDispatchChange}
                                // disabled={allBillDetailsDisabled}
                                >
                                    {DISPATCH_DELIVERY.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    {/* Product Details Section */}
                    <h5>Product Details</h5>
                    <Row className="align-items-end mb-3">
                        <Col md={4} style={{ position: 'relative' }}>
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
                                        setModelNo('');
                                        if (editProductIndex !== null) {
                                            setProductSearchStarted(true);
                                        }
                                    }}
                                    placeholder="Search Product"
                                    autoComplete="off"
                                />
                                {productSuggestions.length > 0 && (
                                    (editProductIndex === null || productSearchStarted) && !selectedProduct && (
                                        <ListGroup style={{ position: 'absolute', zIndex: 10, width: '100%' }}>
                                            {productSuggestions.map(item => (
                                                <ListGroup.Item
                                                    key={item.Id}
                                                    action
                                                    onClick={() => handleProductSelect(item)}
                                                >
                                                    <strong>
                                                        {/* Show Product Name and Model No in dropdown */}
                                                        {item.Product_name}
                                                        {item.Model_no && ` (Model: ${item.Model_no})`}
                                                        {item.Quantity !== undefined && item.Quantity !== null ? ` Qty - ${item.Quantity}` : ''}
                                                        {item.Warehouse ? ` | Warehouse: ${item.Warehouse}` : ''}
                                                    </strong>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    )
                                )}
                            </Form.Group>
                        </Col>
                        {/* Move Model No field after Product and before Make */}
                        <Col md={2}>
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
                        <Col md={2}>
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
                        {/* Warehouse field */}
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label>Warehouse</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={warehouse}
                                    onChange={e => setWarehouse(e.target.value)}
                                    placeholder="Warehouse"
                                    disabled
                                    readOnly={!!selectedProduct}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label>Rate</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={costPrice}
                                    onChange={e => setCostPrice(e.target.value)}
                                    placeholder="Rate"
                                    disabled
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    {/* Quantity, Remarks and Add/Edit icon on next line */}
                    <Row className="align-items-end mb-3">
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label>Quantity</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={quantity}
                                    onChange={e => {
                                        // Only allow positive numbers (no negative, no special chars, no letters)
                                        const val = e.target.value;
                                        if (/^\d*$/.test(val)) {
                                            setQuantity(val);
                                        }
                                    }}
                                    placeholder="Quantity"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoComplete="off"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Remarks</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="Remarks"
                                    autoComplete="off"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={1} className="d-flex flex-column align-items-center">
                            {editProductIndex !== null ? (
                                <Button
                                    variant="success"
                                    className="mb-2"
                                    onClick={handleUpdateProductRow}
                                    title="Edit product"
                                >
                                    📝
                                </Button>
                            ) : (
                                <Button
                                    variant="success"
                                    className="mb-2"
                                    onClick={handleAddProductRow}
                                    title="Add product"
                                >
                                    ＋
                                </Button>
                            )}
                        </Col>
                    </Row>
                    {/* Product Rows Table */}
                    <Table bordered hover responsive>
                        <thead>
                            <tr>
                                <th style={wrapCellStyle}>Product Name</th>
                                <th style={wrapCellStyle}>Model No</th>
                                <th style={wrapCellStyle}>Make</th>
                                <th style={wrapCellStyle}>Warehouse</th>
                                <th style={wrapCellStyle}>Rate</th>
                                <th style={wrapCellStyle}>Quantity</th>
                                <th style={wrapCellStyle}>Remarks</th>
                                <th style={wrapCellStyle}>Edit</th>
                                <th style={wrapCellStyle}>Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productRows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center">No products added.</td>
                                </tr>
                            ) : (
                                <>
                                    {productRows.map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={wrapCellStyle}>{row.product.Product_name}</td>
                                            <td style={wrapCellStyle}>{row.product.Model_no || ''}</td>
                                            <td style={wrapCellStyle}>{row.make || ''}</td>
                                            <td style={wrapCellStyle}>{row.warehouse || ''}</td>
                                            <td style={wrapCellStyle}>{row.costPrice}</td>
                                            <td style={wrapCellStyle}>
                                                {row.quantity}
                                                {row.unit ? ` ${row.unit}` : ''}
                                            </td>
                                            <td style={wrapCellStyle}>{row.remarks || ''}</td>
                                            <td className="text-center" style={wrapCellStyle}>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => handleEditProductRow(idx)}
                                                    title="Edit"
                                                >
                                                    📝
                                                </Button>
                                            </td>
                                            <td className="text-center" style={wrapCellStyle}>
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
                                    ))}
                                    {/* Summary row for total quantity and total amount/unit */}
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold', ...wrapCellStyle }}>
                                            Total:
                                        </td>
                                        <td style={{ fontWeight: 'bold', ...wrapCellStyle }}>
                                            {getTotalQuantity()}
                                            {getCommonUnit() ? ` ${getCommonUnit()}` : ''}
                                        </td>
                                        <td colSpan={3}></td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="success" onClick={handleSubmit}>
                        {isEdit ? 'Update' : 'Submit'}
                    </Button>
                    <Button variant="secondary" onClick={handleClose}>
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default StockOut;
