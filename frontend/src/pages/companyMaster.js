import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const CompanyMaster = () => {
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const [products, setProducts] = useState([]);
    const [searchAddDate, setsearchAddDate] = useState(today);
    const [AddbyOptions, setAddbyOptions] = useState([]);
    const [selectedAddBy, setselectedAddBy] = useState('');
    const [searchEditDate, setsearchEditDate] = useState(today);
    const [filtered, setFiltered] = useState([]);
    const catRef = useRef(null);
    const regionRef = useRef(null);
    const typeRef = useRef(null);
    const [username, setUsername] = useState('');
    const hasFetchedOnce = useRef(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [activeStates, setActiveStates] = useState({});
    const [selectedCatId, setselectedCatId] = useState('');
    const [selectedTypeId, setselectedTypeId] = useState('');
    const [selectedRegionId, setselectedRegionId] = useState('');
    const [editProduct, setEditProduct] = useState(null);

    // For Add Company Modal (Form Array)
    const [addFormDropdowns, setAddFormDropdowns] = useState({
        cat_Id: '',
        region_Id: '',
        type_Id: '',
    });
    const [addFormCompany, setAddFormCompany] = useState('');
    const [addFormAddress, setAddFormAddress] = useState('');
    const [addFormGstin, setAddFormGstin] = useState('');
    const [addFormPan, setAddFormPan] = useState('');
    const [addFormInternalNote, setAddFormInternalNote] = useState('');
    const [addFormWebsite, setAddFormWebsite] = useState('');
    const [addFormArray, setAddFormArray] = useState([]);
    const [editFormArrayIndex, setEditFormArrayIndex] = useState(null);

    // For Edit Company Modal (Form Array)
    const [editModalDropdowns, setEditModalDropdowns] = useState({
        cat_Id: '',
        region_Id: '',
        type_Id: '',
    });
    const [editModalCompany, setEditModalCompany] = useState('');
    const [editModalAddress, setEditModalAddress] = useState('');
    const [editModalGstin, setEditModalGstin] = useState('');
    const [editModalPan, setEditModalPan] = useState('');
    const [editModalInternalNote, setEditModalInternalNote] = useState('');
    const [editModalWebsite, setEditModalWebsite] = useState('');
    const [editModalFormArray, setEditModalFormArray] = useState([]);
    const [editModalFormArrayIndex, setEditModalFormArrayIndex] = useState(null);

    // Track if dropdowns in edit modal should be enabled
    const [editDropdownsEnabled, setEditDropdownsEnabled] = useState(false);

    const tableHeaders = [
        // "Sl No",
        "Company",
        "Address",
        "Category",
        "Region",
        "Type",
        // "GSTIN",
        // "PAN",
        // "Website",
        "Edit",
        "Active"
    ];

    const rowsPerPage = 10;
    const API_URL = 'https://kdstocksoft.onrender.com/company';

    useEffect(() => {

        const storedUsername = localStorage.getItem('name');
        if (storedUsername) setUsername(storedUsername);

    },
        []);

    // --- Dropdown helpers for category, region, type ---
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [regionOptions, setRegionOptions] = useState([]);
    const [typeOptions, setTypeOptions] = useState([]);

    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const [catRes, regRes, typeRes, addByRes] = await Promise.all([
                    axios.get('https://kdstocksoft.onrender.com/category'),
                    axios.get('https://kdstocksoft.onrender.com/region'),
                    axios.get('https://kdstocksoft.onrender.com/type'),
                    axios.get('https://kdstocksoft.onrender.com/user-helper'),
                ]);
                setCategoryOptions(catRes.data);
                setRegionOptions(regRes.data);
                setTypeOptions(typeRes.data);
                setAddbyOptions(addByRes.data);
            } catch (err) {
                console.error('❌ Error fetching dropdowns:', err);
            }
        };
        fetchDropdowns();
    }, []);

    useEffect(() => {
        const newActiveStates = {};
        products.forEach((p) => {
            newActiveStates[p.Id] = p.Active === 1 || p.Active === true;
        });
        setActiveStates(newActiveStates);
    }, [products]);

    const fetchCompany = async () => {
        try {
            const response = await axios.get(API_URL, {
                params: {
                    cat_Id: selectedCatId ?? '',
                    type_Id: selectedTypeId ?? '',
                    region_Id: selectedRegionId ?? '',
                    Created_On: searchAddDate ?? '',
                    Created_By: selectedAddBy ?? '',
                },
                paramsSerializer: params => new URLSearchParams(params).toString()
            });
            setProducts(response.data);
            setFiltered(response.data);
        } catch (error) {
            console.error('❌ Error fetching company list:', error.message);
        }
    };

    useEffect(() => {
        if (!hasFetchedOnce.current) {
            fetchCompany();
            hasFetchedOnce.current = true;
        }
    }, []);

    useEffect(() => {
        fetchCompany();
    }, [selectedCatId, selectedTypeId, selectedRegionId, searchAddDate, selectedAddBy]);

    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const results = products.filter((product) =>
            // product.Id.toString().includes(lowerTerm) ||
            product.Company?.toLowerCase().includes(lowerTerm) ||
            product.Address?.toLowerCase().includes(lowerTerm) ||
            product.Website?.toLowerCase().includes(lowerTerm) ||
            product.Pan?.toLowerCase().includes(lowerTerm) ||
            product.Internal_Note?.toLowerCase().includes(lowerTerm) ||
            product.Gstin?.toLowerCase().includes(lowerTerm) ||
            product.Category?.toLowerCase().includes(lowerTerm) ||
            product.Region?.toLowerCase().includes(lowerTerm) ||
            product.Type?.toLowerCase().includes(lowerTerm) ||
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

    // --- Add Company Modal Handlers (Form Array) ---
    const handleAddDropdownChange = (e) => {
        const { name, value } = e.target;
        let update = { ...addFormDropdowns, [name]: value };
        if (name === "cat_Id") {
            const selected = categoryOptions.find(opt => String(opt.Id) === value);
            update.category = selected ? selected.Category : '';
        }
        if (name === "region_Id") {
            const selected = regionOptions.find(opt => String(opt.Id) === value);
            update.region = selected ? selected.Region : '';
        }
        if (name === "type_Id") {
            const selected = typeOptions.find(opt => String(opt.Id) === value);
            update.type = selected ? selected.Type : '';
        }
        setAddFormDropdowns(update);
    };

    const handleAddFormCompanyChange = (e) => setAddFormCompany(e.target.value);
    const handleAddFormAddressChange = (e) => setAddFormAddress(e.target.value);
    const handleAddFormGstinChange = (e) => setAddFormGstin(e.target.value);
    const handleAddFormPanChange = (e) => setAddFormPan(e.target.value);
    const handleAddFormInternalNoteChange = (e) => setAddFormInternalNote(e.target.value);
    const handleAddFormWebsiteChange = (e) => setAddFormWebsite(e.target.value);

    const validateGstin = (gstin) => {
        // GSTIN: 15 chars, alphanumeric, format: 2 digits + 10 alphanum (PAN) + 1 char + 1 Z + 1 char
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(gstin.trim());
    };
    const validatePan = (pan) => {
        // PAN: 5 letters + 4 digits + 1 letter
        return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(pan.trim());
    };
    const validateWebsite = (website) => {
        // Accepts empty or valid URL
        if (!website.trim()) return true;
        // Simple URL validation
        return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/i.test(website.trim());
    };

    const handleAddFormArrayAdd = () => {
        if (!addFormDropdowns.cat_Id) {
            alert('Please select Category.');
            return;
        }
        if (!addFormDropdowns.region_Id) {
            alert('Please enter Region');
            return;
        }
        if (!addFormDropdowns.type_Id) {
            alert('Please enter Company Type');
            return;
        }
        if (!addFormCompany.trim()) {
            alert('Please enter Company name');
            return;
        }
        if (!addFormAddress.trim()) {
            alert('Please enter Company Address');
            return;
        }
        // if (!addFormGstin.trim()) {
        //     alert('Please enter GSTIN');
        //     return;
        // }
        if (addFormGstin && !validateGstin(addFormGstin)) {
            alert('Please enter a valid GSTIN (15 characters, e.g. 22AAAAA0000A1Z5)');
            return;
        }
        // if (!addFormPan.trim()) {
        //     alert('Please enter PAN');
        //     return;
        // }
        if (addFormPan && !validatePan(addFormPan)) {
            alert('Please enter a valid PAN (e.g. ABCDE1234F)');
            return;
        }
        // Website is optional, but if present, must be valid
        // if (addFormWebsite.trim()) {
        //     alert('Please enter website');
        //     return;
        // }
        if (addFormWebsite && !validateWebsite(addFormWebsite)) {
            alert('Please enter a valid Website URL (e.g. https://example.com)');
            return;
        }

        // Internal Note is optional

        if (catRef.current) {
            catRef.current.disabled = true;
        }
        if (regionRef.current) {
            regionRef.current.disabled = true;
        }
        if (typeRef.current) {
            typeRef.current.disabled = true;
        }

        if (editFormArrayIndex !== null) {
            // Editing an existing row
            const updated = [...addFormArray];
            updated[editFormArrayIndex] = {
                ...addFormDropdowns,
                company: addFormCompany,
                address: addFormAddress,
                gstin: addFormGstin,
                pan: addFormPan,
                internal_note: addFormInternalNote,
                website: addFormWebsite,
            };
            setAddFormArray(updated);
            setEditFormArrayIndex(null);
        } else {
            setAddFormArray([
                ...addFormArray,
                {
                    ...addFormDropdowns,
                    company: addFormCompany,
                    address: addFormAddress,
                    gstin: addFormGstin,
                    pan: addFormPan,
                    internal_note: addFormInternalNote,
                    website: addFormWebsite,
                }
            ]);
        }
        setAddFormCompany('');
        setAddFormAddress('');
        setAddFormGstin('');
        setAddFormPan('');
        setAddFormInternalNote('');
        setAddFormWebsite('');
    };

    const handleAddFormArrayEdit = (idx) => {
        if (catRef.current) {
            catRef.current.disabled = true;
        }
        if (regionRef.current) {
            regionRef.current.disabled = true;
        }
        if (typeRef.current) {
            typeRef.current.disabled = true;
        }
        const item = addFormArray[idx];
        setAddFormDropdowns({
            cat_Id: item.cat_Id,
            region_Id: item.region_Id,
            type_Id: item.type_Id,
        });
        setAddFormCompany(item.company);
        setAddFormAddress(item.address);
        setAddFormGstin(item.gstin || '');
        setAddFormPan(item.pan || '');
        setAddFormInternalNote(item.internal_note || '');
        setAddFormWebsite(item.website || '');
        setEditFormArrayIndex(idx);
    };

    const handleAddFormArrayRemove = (idx) => {
        setAddFormArray(addFormArray.filter((_, i) => i !== idx));
        if (editFormArrayIndex === idx) {
            setEditFormArrayIndex(null);
            setAddFormCompany('');
            setAddFormAddress('');
            setAddFormGstin('');
            setAddFormPan('');
            setAddFormInternalNote('');
            setAddFormWebsite('');
        }
    };

    const handleAddClick = () => {
        setAddFormDropdowns({
            cat_Id: '',
            region_Id: '',
            type_Id: '',
        });
        setAddFormCompany('');
        setAddFormAddress('');
        setAddFormGstin('');
        setAddFormPan('');
        setAddFormInternalNote('');
        setAddFormWebsite('');
        setAddFormArray([]);
        setEditFormArrayIndex(null);
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
    };

    const handleSubmit = () => {
        if (!addFormDropdowns.region_Id) {
            alert('Please enter Region');
            return;
        }
        if (!addFormDropdowns.cat_Id) {
            alert('Please select Category.');
            return;
        }
        if (!addFormDropdowns.type_Id) {
            alert('Please enter Company Type');
            return;
        }
        if (addFormCompany.trim()) {
            alert('Please add the typed Company name into Form Array');
            return;
        }
        if (addFormAddress.trim()) {
            alert('Please add the typed Company address into Form Array');
            return;
        }
        if (addFormGstin.trim()) {
            alert('Please add the typed GSTIN into Form Array');
            return;
        }
        if (addFormPan.trim()) {
            alert('Please add the typed PAN into Form Array');
            return;
        }
        if (addFormArray.length === 0) {
            alert('Please add at least one company entry.');
            return;
        }
        // Submit all companies in the form array
        Promise.all(
            addFormArray.map((item) => {
                const productToSend = {
                    Company: item.company,
                    Address: item.address,
                    Gstin: item.gstin,
                    Pan: item.pan,
                    Internal_Note: item.internal_note,
                    Website: item.website,
                    Cat_Id: item.cat_Id,
                    Region_Id: item.region_Id,
                    Type_Id: item.type_Id,
                    Created_By: username,
                    Created_On: new Date().toISOString().slice(0, 10),
                    Active: 1,
                };
                return axios.post(`${API_URL}/create`, productToSend);
            })
        )
            .then(() => {
                fetchCompany();
                setShowModal(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Company(s) Added Successfully',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3085d6'
                });
            })
            .catch((err) => {
                // console.log(err.response.data.details)
                if (err.response.data.error.startsWith('Duplicate')) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Duplicate Company Data',
                        // text: 'Invalid username or password. Please try again.',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#d33'
                    });
                }
                else {
                    alert('Company Data not Saved')
                }
                // console.error("❌ Error adding Company:", err.response?.data || err.message);
                // alert("Failed to add Company.");
            });
    };

    // --- Edit Company Modal Handlers (Form Array) ---
    // Modified openEditModal to NOT set the form array values into the input fields
    // Also disables dropdowns until formarray edit is clicked
    const openEditModal = (product) => {
        if (product.Active == 1) {
            setEditProduct({
                id: product.Id,
                company: product.Company,
                address: product.Address,
                gstin: product.Gstin || '',
                pan: product.Pan || '',
                internal_note: product.Internal_Note || '',
                website: product.Website || '',
                cat_Id: product.Cat_Id?.toString() || '',
                region_Id: product.Region_Id?.toString() || '',
                type_Id: product.Type_Id?.toString() || '',
            });
            setEditModalDropdowns({
                cat_Id: product.Cat_Id?.toString() || '',
                region_Id: product.Region_Id?.toString() || '',
                type_Id: product.Type_Id?.toString() || '',
            });
            setEditModalCompany('');
            setEditModalAddress('');
            setEditModalGstin('');
            setEditModalPan('');
            setEditModalInternalNote('');
            setEditModalWebsite('');
            setEditModalFormArray([
                {
                    company: product.Company || '',
                    address: product.Address || '',
                    gstin: product.Gstin || '',
                    pan: product.Pan || '',
                    internal_note: product.Internal_Note || '',
                    website: product.Website || '',
                    cat_Id: product.Cat_Id?.toString() || '',
                    region_Id: product.Region_Id?.toString() || '',
                    type_Id: product.Type_Id?.toString() || '',
                }
            ]);
            setEditModalFormArrayIndex(null);
            setEditDropdownsEnabled(false); // Disable dropdowns initially
            setShowEditModal(true);
        } else {
            alert("Inactive records cannot be edited");
        }
    };

    const handleEditDropdownChange = (e) => {
        if (!editDropdownsEnabled) return; // Prevent change if disabled
        const { name, value } = e.target;
        let update = { ...editModalDropdowns, [name]: value };
        if (name === "cat_Id") {
            const selected = categoryOptions.find(opt => String(opt.Id) === value);
            update.category = selected ? selected.Category : '';
        }
        if (name === "region_Id") {
            const selected = regionOptions.find(opt => String(opt.Id) === value);
            update.region = selected ? selected.Region : '';
        }
        if (name === "type_Id") {
            const selected = typeOptions.find(opt => String(opt.Id) === value);
            update.type = selected ? selected.Type : '';
        }
        setEditModalDropdowns(update);
    };

    const handleEditModalCompanyChange = (e) => setEditModalCompany(e.target.value);
    const handleEditModalAddressChange = (e) => setEditModalAddress(e.target.value);
    const handleEditModalGstinChange = (e) => setEditModalGstin(e.target.value);
    const handleEditModalPanChange = (e) => setEditModalPan(e.target.value);
    const handleEditModalInternalNoteChange = (e) => setEditModalInternalNote(e.target.value);
    const handleEditModalWebsiteChange = (e) => setEditModalWebsite(e.target.value);

    const handleEditModalFormArrayAdd = () => {
        if (!editModalDropdowns.cat_Id || !editModalDropdowns.region_Id || !editModalDropdowns.type_Id) {
            alert('Please select all dropdowns.');
            return;
        }
        if (!editModalCompany.trim()) {
            alert('Please enter Company name');
            return;
        }
        if (!editModalAddress.trim()) {
            alert('Please enter Company Address');
            return;
        }
        // if (!editModalGstin.trim()) {
        //     alert('Please enter GSTIN');
        //     return;
        // }
        if (editModalGstin && !validateGstin(editModalGstin)) {
            alert('Please enter a valid GSTIN (15 characters, e.g. 22AAAAA0000A1Z5)');
            return;
        }
        // if (!editModalPan.trim()) {
        //     alert('Please enter PAN');
        //     return;
        // }
        if (editModalPan && !validatePan(editModalPan)) {
            alert('Please enter a valid PAN (e.g. ABCDE1234F)');
            return;
        }
        // if (editModalWebsite.trim()) {
        //     alert('Please enter website');
        //     return;
        // }
        if (editModalWebsite && !validateWebsite(editModalWebsite)) {
            alert('Please enter a valid Website URL (e.g. https://example.com)');
            return;
        }
        // Internal Note is optional

        if (editModalFormArrayIndex !== null) {
            // Editing an existing row
            const updated = [...editModalFormArray];
            updated[editModalFormArrayIndex] = {
                ...editModalDropdowns,
                company: editModalCompany,
                address: editModalAddress,
                gstin: editModalGstin,
                pan: editModalPan,
                internal_note: editModalInternalNote,
                website: editModalWebsite,
            };
            setEditModalFormArray(updated);
            setEditModalFormArrayIndex(null);
        } else {
            setEditModalFormArray([
                ...editModalFormArray,
                {
                    ...editModalDropdowns,
                    company: editModalCompany,
                    address: editModalAddress,
                    gstin: editModalGstin,
                    pan: editModalPan,
                    internal_note: editModalInternalNote,
                    website: editModalWebsite,
                }
            ]);
        }
        setEditModalCompany('');
        setEditModalAddress('');
        setEditModalGstin('');
        setEditModalPan('');
        setEditModalInternalNote('');
        setEditModalWebsite('');
        setEditDropdownsEnabled(false); // Disable dropdowns after add/update
    };

    const handleEditModalFormArrayEdit = (idx) => {
        const item = editModalFormArray[idx];
        setEditModalDropdowns({
            cat_Id: item.cat_Id,
            region_Id: item.region_Id,
            type_Id: item.type_Id,
        });
        setEditModalCompany(item.company);
        setEditModalAddress(item.address);
        setEditModalGstin(item.gstin || '');
        setEditModalPan(item.pan || '');
        setEditModalInternalNote(item.internal_note || '');
        setEditModalWebsite(item.website || '');
        setEditModalFormArrayIndex(idx);
        setEditDropdownsEnabled(true); // Enable dropdowns when editing a row
    };

    const handleEditModalFormArrayRemove = (idx) => {
        setEditModalFormArray(editModalFormArray.filter((_, i) => i !== idx));
        if (editModalFormArrayIndex === idx) {
            setEditModalFormArrayIndex(null);
            setEditModalCompany('');
            setEditModalAddress('');
            setEditModalGstin('');
            setEditModalPan('');
            setEditModalInternalNote('');
            setEditModalWebsite('');
            setEditDropdownsEnabled(false); // Disable dropdowns if editing row is removed
        }
    };

    const handleEditSubmit = () => {
        if (!editModalDropdowns.region_Id) {
            alert('Please enter Region');
            return;
        }
        if (!editModalDropdowns.cat_Id) {
            alert('Please select Category.');
            return;
        }
        if (!editModalDropdowns.type_Id) {
            alert('Please enter Company Type');
            return;
        }
        if (editModalCompany.trim()) {
            alert('Please add the typed Company name into Form Array');
            return;
        }
        if (editModalAddress.trim()) {
            alert('Please add the typed Company address into Form Array');
            return;
        }
        if (editModalGstin.trim()) {
            alert('Please add the typed GSTIN into Form Array');
            return;
        }
        if (editModalPan.trim()) {
            alert('Please add the typed PAN into Form Array');
            return;
        }
        if (editModalFormArray.length === 0) {
            alert('Please add at least one company entry.');
            return;
        }
        if (editModalFormArray.length > 1) {
            alert('Only one editing of company allowed');
            return;
        }
        // Only update the first entry (since editing is for a single company)
        const item = editModalFormArray[0];
        const productToUpdate = {
            Company: item.company,
            Address: item.address,
            Gstin: item.gstin,
            Pan: item.pan,
            Internal_Note: item.internal_note,
            Website: item.website,
            Cat_Id: item.cat_Id,
            Region_Id: item.region_Id,
            Type_Id: item.type_Id,
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
                    title: 'Company Updated Successfully',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3085d6'
                });
            })
            .catch((err) => {
                if (err.response.data.error.startsWith('Duplicate')) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Duplicate Company Data',
                        // text: 'Invalid username or password. Please try again.',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#d33'
                    });
                }
                else {
                    alert('Company Data not Saved')
                }
                // console.error('Update error:', err.response?.data || err.message);
                // alert('Failed to update Company');
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
                alert('Failed to toggle company status.');
            });
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Company Master</h2>
                <button style={{ ...styles.button, padding: '6px 12px', fontSize: '14px' }} onClick={handleAddClick}>
                    Add Company
                </button>
            </div>

            {/* Filter/search bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center',
                margin: '16px 0',
                flexWrap: 'nowrap',
                whiteSpace: 'nowrap'
            }}>
                <select
                    value={selectedRegionId}
                    onChange={(e) => setselectedRegionId(e.target.value)}
                    style={{ ...styles.search, width: 80, minWidth: 0, fontSize: 13, padding: '2px 6px' }}
                >
                    <option value="">Region</option>
                    {regionOptions.map((option) => (
                        <option key={option.Id} value={option.Id}>
                            {option.Region}
                        </option>
                    ))}
                </select>
                <select
                    value={selectedCatId}
                    onChange={(e) => setselectedCatId(e.target.value)}
                    style={{ ...styles.search, width: 90, minWidth: 0, fontSize: 13, padding: '2px 6px' }}
                >
                    <option value="">Category</option>
                    {categoryOptions.map((option) => (
                        <option key={option.Id} value={option.Id}>
                            {option.Category}
                        </option>
                    ))}
                </select>
                <select
                    value={selectedTypeId}
                    onChange={(e) => setselectedTypeId(e.target.value)}
                    style={{ ...styles.search, width: 70, minWidth: 0, fontSize: 13, padding: '2px 6px' }}
                >
                    <option value="">Type</option>
                    {typeOptions.map((option) => (
                        <option key={option.Id} value={option.Id}>
                            {option.Type}
                        </option>
                    ))}
                </select>
                <select
                    value={selectedAddBy}
                    onChange={(e) => setselectedAddBy(e.target.value)}
                    style={{ ...styles.search, width: 80, minWidth: 0, fontSize: 13, padding: '2px 6px' }}
                >
                    <option value="">User</option>
                    {AddbyOptions.map((option, idx) => (
                        <option
                            key={option.name ? `${option.name}-${idx}` : `user-${idx}`}
                            value={option.name}
                        >
                            {option.name}
                        </option>
                    ))}
                </select>
                {/* <input
                    type="date"
                    value={searchAddDate}
                    onChange={(e) => setsearchAddDate(e.target.value)}
                    style={{ ...styles.search, width: 120, minWidth: 0, fontSize: 13, padding: '2px 6px' }}
                    title="Add Date"
                /> */}
                <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ ...styles.search, width: 250, minWidth: 0, fontSize: 13, padding: '2px 6px' }}
                />
            </div>


            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                {/* <table style={{ width: 'max-content', borderCollapse: 'collapse' }}> */}
                <thead>
                    <tr style={{ backgroundColor: '#f4f4f4' }}>
                        {/* <th style={{ ...styles.th, width: '10%' }}>Sl No</th> */}
                        <th style={{ ...styles.th, width: '30%' }}>Company</th>
                        <th style={{ ...styles.th, width: '30%' }}>Location</th>
                        <th style={{ ...styles.th, width: '10%' }}>Region</th>
                        <th style={{ ...styles.th, width: '10%' }}>Category</th>
                        <th style={{ ...styles.th, width: '10%' }}>Type</th>
                        {/* <th style={{ ...styles.th, width: '15%' }}>GSTIN</th>
                        <th style={{ ...styles.th, width: '10%' }}>PAN</th>
                        <th style={{ ...styles.th, width: '15%' }}>Website</th> */}
                        <th style={{ ...styles.th, width: '5%' }}>Edit</th>
                        <th style={{ ...styles.th, width: '5%' }}>Active</th>
                    </tr>
                </thead>
                <tbody>
                    {currentData && currentData.length > 0 ? (
                        [...currentData]
                            .sort((a, b) => b.Id - a.Id)
                            .map((product) => (
                                <tr key={product.Id}>
                                    {/* <td style={styles.td}>{product.Id}</td> */}
                                    <td style={styles.td}>{product.Company}</td>
                                    <td style={styles.td}>{product.Address}</td>
                                    <td style={styles.td}>{product.Region}</td>
                                    <td style={styles.td}>{product.Category}</td>
                                    <td style={styles.td}>{product.Type}</td>
                                    {/* <td style={styles.td}>{product.Gstin}</td>
                                    <td style={styles.td}>{product.Pan}</td>
                                    <td style={styles.td}>{product.Website}</td> */}
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
                                            aria-label={`Edit ${product.Company}`}
                                        >
                                            📝
                                        </button>
                                    </td>
                                    <td style={styles.td} align="center">
                                        <div
                                            onClick={async () => {
                                                const isActive = activeStates[product.Id];
                                                const confirmMessage = isActive
                                                    ? 'Do you want to deactivate this company?'
                                                    : 'Do you want to activate this company?';

                                                if (window.confirm(confirmMessage)) {
                                                    await toggleActive(product.Id);

                                                    const newStatus = !isActive;
                                                    if (newStatus) {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'Company Data Activated',
                                                            confirmButtonText: 'OK',
                                                            confirmButtonColor: '#3085d6'
                                                        });
                                                    } else {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'Company Data Inactivated',
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

            {/* --- Add Company Modal --- */}
            {showModal && (
                <div style={styles.overlay}>
                    <div style={{ ...styles.modal, width: 1100, minWidth: 800, maxWidth: 1300 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Add Company</h3>
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
                        {/* First line: Dropdowns, centered */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: 16 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label htmlFor="add-region-id" style={{ marginBottom: 4, fontWeight: 500 }}>
                                    Region
                                    <span style={{ color: 'red' }}>*</span>
                                </label>
                                <select
                                    ref={regionRef}
                                    id="add-region-id"
                                    name="region_Id"
                                    value={addFormDropdowns.region_Id}
                                    onChange={handleAddDropdownChange}
                                    style={{ ...styles.input, width: 150, margin: 0, padding: 8 }}
                                >
                                    <option value="">Select Region</option>
                                    {regionOptions.map((reg) => (
                                        <option key={reg.Id} value={reg.Id}>{reg.Region}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label htmlFor="add-cat-id" style={{ marginBottom: 4, fontWeight: 500 }}>Category
                                    <span style={{ color: 'red' }}>*</span>
                                </label>
                                <select
                                    ref={catRef}
                                    id="add-cat-id"
                                    name="cat_Id"
                                    value={addFormDropdowns.cat_Id}
                                    onChange={handleAddDropdownChange}
                                    style={{ ...styles.input, width: 150, margin: 0, padding: 8 }}
                                >
                                    <option value="">Select Category</option>
                                    {categoryOptions.map((cat) => (
                                        <option key={cat.Id} value={cat.Id}>{cat.Category}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label htmlFor="add-type-id" style={{ marginBottom: 4, fontWeight: 500 }}>Type
                                    <span style={{ color: 'red' }}>*</span>
                                </label>
                                <select
                                    ref={typeRef}
                                    id="add-type-id"
                                    name="type_Id"
                                    value={addFormDropdowns.type_Id}
                                    onChange={handleAddDropdownChange}
                                    style={{ ...styles.input, width: 150, margin: 0, padding: 8 }}
                                >
                                    <option value="">Select Type</option>
                                    {typeOptions.map((type) => (
                                        <option key={type.Id} value={type.Id}>{type.Type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {/* Second line: Company Name, Address, GSTIN, PAN, Internal Note, Website, Plus Icon */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                gap: 24,
                                marginBottom: 12,
                                flexWrap: 'wrap'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: 1 }}>
                                <label htmlFor="add-company-name" style={{ marginBottom: 4, fontWeight: 500 }}>Company Name
                                    <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    id="add-company-name"
                                    type="text"
                                    value={addFormCompany}
                                    onChange={handleAddFormCompanyChange}
                                    style={{ ...styles.input, width: '100%', minWidth: 180, margin: 0, padding: 8 }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: 1 }}>
                                <label htmlFor="add-address" style={{ marginBottom: 4, fontWeight: 500 }}>Location
                                    <span style={{ color: 'red' }}>*</span>
                                </label>
                                <textarea
                                    id="add-address"
                                    value={addFormAddress}
                                    onChange={handleAddFormAddressChange}
                                    style={{
                                        ...styles.input,
                                        width: '100%',
                                        minWidth: 180,
                                        margin: 0,
                                        padding: 8,
                                        resize: 'vertical',
                                        height: 48,
                                        overflow: 'auto',
                                    }}
                                    rows={2}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 140, flex: 1 }}>
                                <label htmlFor="add-gstin" style={{ marginBottom: 4, fontWeight: 500 }}>GSTIN
                                    <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    id="add-gstin"
                                    type="text"
                                    value={addFormGstin}
                                    onChange={handleAddFormGstinChange}
                                    style={{ ...styles.input, width: '100%', minWidth: 140, margin: 0, padding: 8, textTransform: 'uppercase' }}
                                    maxLength={15}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 120, flex: 1 }}>
                                <label htmlFor="add-pan" style={{ marginBottom: 4, fontWeight: 500 }}>PAN
                                    <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    id="add-pan"
                                    type="text"
                                    value={addFormPan}
                                    onChange={handleAddFormPanChange}
                                    style={{ ...styles.input, width: '100%', minWidth: 120, margin: 0, padding: 8, textTransform: 'uppercase' }}
                                    maxLength={10}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: 1 }}>
                                <label htmlFor="add-internal-note" style={{ marginBottom: 4, fontWeight: 500 }}>Internal Note
                                    <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    id="add-internal-note"
                                    type="text"
                                    value={addFormInternalNote}
                                    onChange={handleAddFormInternalNoteChange}
                                    style={{ ...styles.input, width: '100%', minWidth: 180, margin: 0, padding: 8 }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: 1 }}>
                                <label htmlFor="add-website" style={{ marginBottom: 4, fontWeight: 500 }}>Website  <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    id="add-website"
                                    type="text"
                                    value={addFormWebsite}
                                    onChange={handleAddFormWebsiteChange}
                                    style={{ ...styles.input, width: '100%', minWidth: 180, margin: 0, padding: 8 }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                                <button
                                    onClick={handleAddFormArrayAdd}
                                    style={{
                                        background: '#2C3E50',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: 36,
                                        height: 36,
                                        fontSize: 20,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                    }}
                                    aria-label={editFormArrayIndex !== null ? "Update" : "Add"}
                                    title={editFormArrayIndex !== null ? "Update" : "Add"}
                                >
                                    {editFormArrayIndex !== null ? '✎' : '+'}
                                </button>
                            </div>
                        </div>
                        {/* Form Array Table */}
                        <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                <thead>
                                    <tr style={{ background: '#f4f4f4' }}>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '15%' }}>Company Name</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '15%' }}>Location</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '10%' }}>GSTIN</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '10%' }}>PAN</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '15%' }}>Internal Note</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '15%' }}>Website</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '10%' }}>Edit</th>
                                        {localStorage.getItem('department') === 'Administration' && (
                                            <th style={{ ...styles.th, textAlign: 'center', width: '10%' }}>Remove</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {addFormArray.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ ...styles.td, textAlign: 'center' }}>No entries added.</td>
                                        </tr>
                                    ) : (
                                        addFormArray.map((item, idx) => (
                                            <tr key={idx}>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 140,
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                    textAlign: 'left',
                                                }}>{item.company}</td>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 140,
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                    textAlign: 'left',
                                                }}>{item.address}</td>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 100,
                                                    textAlign: 'left',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                }}>{item.gstin}</td>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 80,
                                                    textAlign: 'left',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                }}>{item.pan}</td>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 120,
                                                    textAlign: 'left',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                }}>{item.internal_note}</td>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 120,
                                                    textAlign: 'left',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                }}>{item.website}</td>
                                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleAddFormArrayEdit(idx)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            fontSize: 16,
                                                            cursor: 'pointer',
                                                        }}
                                                        aria-label="Edit"
                                                        title="Edit"
                                                    >✎</button>
                                                </td>
                                                {localStorage.getItem('department') === 'Administration' && (
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleAddFormArrayRemove(idx)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                fontSize: 16,
                                                                color: '#c00',
                                                                cursor: 'pointer',
                                                            }}
                                                            aria-label="Remove"
                                                            title="Remove"
                                                        >🗑️</button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={handleSubmit} style={styles.button}>Submit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Edit Company Modal --- */}
            {showEditModal && (
                <div style={styles.overlay}>
                    <div style={{ ...styles.modal, width: 1100, minWidth: 800, maxWidth: 1300 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Edit Company</h3>
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
                        {/* First line: Dropdowns, centered */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: 16 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label htmlFor="edit-region-id" style={{ marginBottom: 4, fontWeight: 500 }}>Region</label>
                                <select
                                    id="edit-region-id"
                                    name="region_Id"
                                    value={editModalDropdowns.region_Id}
                                    onChange={handleEditDropdownChange}
                                    style={{ ...styles.input, width: 150, margin: 0, padding: 8 }}
                                    disabled={!editDropdownsEnabled}
                                >
                                    <option value="">Select Region</option>
                                    {regionOptions.map((reg) => (
                                        <option key={reg.Id} value={reg.Id}>{reg.Region}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label htmlFor="edit-cat-id" style={{ marginBottom: 4, fontWeight: 500 }}>Category</label>
                                <select
                                    id="edit-cat-id"
                                    name="cat_Id"
                                    value={editModalDropdowns.cat_Id}
                                    onChange={handleEditDropdownChange}
                                    style={{ ...styles.input, width: 150, margin: 0, padding: 8 }}
                                    disabled={!editDropdownsEnabled}
                                >
                                    <option value="">Select Category</option>
                                    {categoryOptions.map((cat) => (
                                        <option key={cat.Id} value={cat.Id}>{cat.Category}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label htmlFor="edit-type-id" style={{ marginBottom: 4, fontWeight: 500 }}>Type</label>
                                <select
                                    id="edit-type-id"
                                    name="type_Id"
                                    value={editModalDropdowns.type_Id}
                                    onChange={handleEditDropdownChange}
                                    style={{ ...styles.input, width: 150, margin: 0, padding: 8 }}
                                    disabled={!editDropdownsEnabled}
                                >
                                    <option value="">Select Type</option>
                                    {typeOptions.map((type) => (
                                        <option key={type.Id} value={type.Id}>{type.Type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {/* Second line: Company Name, Address, GSTIN, PAN, Internal Note, Website, Plus Icon */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                gap: 24,
                                marginBottom: 12,
                                flexWrap: 'wrap'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: 1 }}>
                                <label htmlFor="edit-company-name" style={{ marginBottom: 4, fontWeight: 500 }}>Company Name</label>
                                <input
                                    id="edit-company-name"
                                    type="text"
                                    value={editModalCompany}
                                    onChange={handleEditModalCompanyChange}
                                    style={{ ...styles.input, width: '100%', minWidth: 180, margin: 0, padding: 8 }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: 1 }}>
                                <label htmlFor="edit-address" style={{ marginBottom: 4, fontWeight: 500 }}>Location</label>
                                <textarea
                                    id="edit-address"
                                    value={editModalAddress}
                                    onChange={handleEditModalAddressChange}
                                    style={{
                                        ...styles.input,
                                        width: '100%',
                                        minWidth: 180,
                                        margin: 0,
                                        padding: 8,
                                        resize: 'vertical',
                                        height: 48,
                                        overflow: 'auto',
                                    }}
                                    rows={2}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 140, flex: 1 }}>
                                <label htmlFor="edit-gstin" style={{ marginBottom: 4, fontWeight: 500 }}>GSTIN</label>
                                <input
                                    id="edit-gstin"
                                    type="text"
                                    value={editModalGstin}
                                    onChange={handleEditModalGstinChange}
                                    style={{ ...styles.input, width: '100%', minWidth: 140, margin: 0, padding: 8, textTransform: 'uppercase' }}
                                    maxLength={15}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 120, flex: 1 }}>
                                <label htmlFor="edit-pan" style={{ marginBottom: 4, fontWeight: 500 }}>PAN</label>
                                <input
                                    id="edit-pan"
                                    type="text"
                                    value={editModalPan}
                                    onChange={handleEditModalPanChange}
                                    style={{ ...styles.input, width: '100%', minWidth: 120, margin: 0, padding: 8, textTransform: 'uppercase' }}
                                    maxLength={10}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: 1 }}>
                                <label htmlFor="edit-internal-note" style={{ marginBottom: 4, fontWeight: 500 }}>Internal Note</label>
                                <input
                                    id="edit-internal-note"
                                    type="text"
                                    value={editModalInternalNote}
                                    onChange={handleEditModalInternalNoteChange}
                                    style={{ ...styles.input, width: '100%', minWidth: 180, margin: 0, padding: 8 }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: 1 }}>
                                <label htmlFor="edit-website" style={{ marginBottom: 4, fontWeight: 500 }}>Website</label>
                                <input
                                    id="edit-website"
                                    type="text"
                                    value={editModalWebsite}
                                    onChange={handleEditModalWebsiteChange}
                                    style={{ ...styles.input, width: '100%', minWidth: 180, margin: 0, padding: 8 }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                                <button
                                    onClick={handleEditModalFormArrayAdd}
                                    style={{
                                        background: '#2C3E50',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: 36,
                                        height: 36,
                                        fontSize: 20,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                    }}
                                    aria-label={editModalFormArrayIndex !== null ? "Update" : "Add"}
                                    title={editModalFormArrayIndex !== null ? "Update" : "Add"}
                                >
                                    {editModalFormArrayIndex !== null ? '✎' : '+'}
                                </button>
                            </div>
                        </div>
                        {/* Form Array Table */}
                        <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                <thead>
                                    <tr style={{ background: '#f4f4f4' }}>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '15%' }}>Company Name</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '15%' }}>Location</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '10%' }}>GSTIN</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '10%' }}>PAN</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '15%' }}>Internal Note</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '15%' }}>Website</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '10%' }}>Edit</th>
                                        {localStorage.getItem('department') === 'Administration' && (
                                            <th style={{ ...styles.th, textAlign: 'center', width: '10%' }}>Remove</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {editModalFormArray.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ ...styles.td, textAlign: 'center' }}>No entries added.</td>
                                        </tr>
                                    ) : (
                                        editModalFormArray.map((item, idx) => (
                                            <tr key={idx}>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 140,
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                    textAlign: 'left',
                                                }}>{item.company}</td>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 140,
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                    textAlign: 'left',
                                                }}>{item.address}</td>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 100,
                                                    textAlign: 'left',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                }}>{item.gstin}</td>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 80,
                                                    textAlign: 'left',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                }}>{item.pan}</td>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 120,
                                                    textAlign: 'left',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                }}>{item.internal_note}</td>
                                                <td style={{
                                                    ...styles.td,
                                                    maxWidth: 120,
                                                    textAlign: 'left',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-line',
                                                }}>{item.website}</td>
                                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleEditModalFormArrayEdit(idx)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            fontSize: 16,
                                                            cursor: 'pointer',
                                                        }}
                                                        aria-label="Edit"
                                                        title="Edit"
                                                    >✎</button>
                                                </td>
                                                {localStorage.getItem('department') === 'Administration' && (
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleEditModalFormArrayRemove(idx)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                fontSize: 16,
                                                                color: '#c00',
                                                                cursor: 'pointer',
                                                            }}
                                                            aria-label="Remove"
                                                            title="Remove"
                                                        >🗑️</button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={handleEditSubmit} style={styles.button}>Submit</button>
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
        verticalAlign: 'top',
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
        zIndex: 1000,
    },
    modal: {
        background: '#fff',
        padding: '20px',
        width: '400px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    input: {
        width: '100%',
        padding: '10px',
        margin: '10px 0',
        borderRadius: '8px',
        border: '1px solid #ccc',
        fontSize: 14,
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

export default CompanyMaster;
