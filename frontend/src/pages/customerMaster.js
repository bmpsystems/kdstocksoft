import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';


// Only these fields will be saved in the database
// Company: comp_Id, address, region_Id, type_Id
const initialCompanyState = {
    comp_Id: '',
    company_name: '',
    address: '',
    region_Id: '',
    region: '',
    cat_Id: '',
    category: '',
    type_Id: '',
    type: '',
};

const initialCustomerRow = {
    salut_Id: '',
    contact_person: '',
    desig_Id: '',
    designation: '',
    mobile_no: '',
    emailId: '',
    reference: '',
};

const CustomerMaster = () => {
    // Table and filter state
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const [products, setProducts] = useState([]);
    const compRef = useRef(null);
    const [searchAddDate, setsearchAddDate] = useState(today);
    // const [searchEditDate, setsearchEditDate] = useState(today);
    const [username, setUsername] = useState('');
    const [activeStates, setActiveStates] = useState({});
    const hasFetchedOnce = useRef(false);
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditDisabled, setIsEditDisabled] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Dropdowns and helpers
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [AddbyOptions, setAddbyOptions] = useState([]);
    const [typeOptions, setTypeOptions] = useState([]);
    const [regionOptions, setRegionOptions] = useState([]);
    const [dropdownDesigOptions, setdropdownDesigOptions] = useState([]);
    const [dropdownSalutationOptions, setdropdownSalutationOptions] = useState([]);

    // Filter selectors
    const [selectedAddBy, setselectedAddBy] = useState('');
    const [selectedCatId, setselectedCatId] = useState('');
    const [selectedTypeId, setselectedTypeId] = useState('');
    const [selectedRegionId, setselectedRegionId] = useState('');
    const [selectedSalutationId, setselectedSalutationId] = useState('');

    // Company search/autofill
    const [queryComp, setQueryComp] = useState('');
    const [suggestionsComp, setSuggestionsComp] = useState([]);
    const [selectedComp, setSelectedComp] = useState(null);
    const [suppressSearch, setSuppressSearch] = useState(false);

    // Company details (first row)
    const [companyDetails, setCompanyDetails] = useState({ ...initialCompanyState });

    // Customer details (second row, for form input)
    const [customerRow, setCustomerRow] = useState({ ...initialCustomerRow });

    // Form array for customer details
    const [customerRows, setCustomerRows] = useState([]);
    const [editRowIndex, setEditRowIndex] = useState(null); // for editing a row in formarray

    // Edit mode
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);

    // For edit: company search/autofill
    const [editQueryComp, setEditQueryComp] = useState('');
    const [editSuggestionsComp, setEditSuggestionsComp] = useState([]);
    const [editSelectedComp, setEditSelectedComp] = useState(null);
    const [editCompanyDetails, setEditCompanyDetails] = useState({ ...initialCompanyState });
    const [editCustomerRow, setEditCustomerRow] = useState({ ...initialCustomerRow });
    const [editCustomerRows, setEditCustomerRows] = useState([]);
    const [editEditRowIndex, setEditEditRowIndex] = useState(null); // for editing a row in edit formarray

    // UI
    const [showForm, setShowForm] = useState(false);

    // Add Reference to tableHeaders if you want to show in table (optional)
    const tableHeaders = [
        // "Sl No",
        "Code",
        // "Category",
        "Type",
        "Region",
        "Company name",
        "Address",
        "Contact person",
        // "Designation",
        // "Mobile no",
        // "EmailId",
        // "Reference",
        "Edit",
        "Active"
    ];

    const rowsPerPage = 10;
    const API_URL = 'https://kdstocksoft.onrender.com/customer';

    // Fetch dropdowns and helpers
    useEffect(() => {
        const fetchHelpers = async () => {
            try {
                const [categoryRes, typeRes, regionRes, desigRes, salutRes, addbyRes] = await Promise.all([
                    axios.get('https://kdstocksoft.onrender.com/category'),
                    axios.get('https://kdstocksoft.onrender.com/type'),
                    axios.get('https://kdstocksoft.onrender.com/region'),
                    axios.get('https://kdstocksoft.onrender.com/designation'),
                    axios.get('https://kdstocksoft.onrender.com/salutation'),
                    axios.get('https://kdstocksoft.onrender.com/user-helper'),
                ]);
                setCategoryOptions(categoryRes.data);
                setTypeOptions(typeRes.data);
                setRegionOptions(regionRes.data);
                setdropdownDesigOptions(desigRes.data);
                setdropdownSalutationOptions(salutRes.data);
                setAddbyOptions(addbyRes.data);
            } catch (err) {
                console.error('❌ Error fetching helpers:', err);
            }
        };
        fetchHelpers();
    }, []);

    // Fetch user info
    useEffect(() => {
        const storedUsername = localStorage.getItem('name');
        if (storedUsername) setUsername(storedUsername);
    }, []);

    // Ensure activeStates is always in sync with products
    useEffect(() => {
        const newActiveStates = {};
        products.forEach((p) => {
            newActiveStates[p.Id] = p.Active === 1 || p.Active === true;
        });
        setActiveStates(newActiveStates);
    }, [products]);

    // Fetch customer list
    const fetchCustomer = async () => {
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
            console.error('❌ Error fetching customer list:', error.message);
        }
    };

    useEffect(() => {
        if (!hasFetchedOnce.current) {
            fetchCustomer();
            hasFetchedOnce.current = true;
        }
    }, []);

    useEffect(() => {
        fetchCustomer();
    }, [selectedCatId, selectedTypeId, selectedRegionId, searchAddDate, selectedAddBy]);

    // Company search for add
    useEffect(() => {
        if (!showForm || editMode) return;
        if (suppressSearch) return;
        const fetchSuggestionsComp = async () => {
            if (queryComp.length >= 3 && queryComp !== selectedComp?.Company) {
                try {
                    const response = await axios.get(`https://kdstocksoft.onrender.com/company-search?query=${queryComp}`);
                    setSuggestionsComp(response.data);
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                }
            } else {
                setSuggestionsComp([]);
            }
        };
        const debounce = setTimeout(fetchSuggestionsComp, 300);
        return () => clearTimeout(debounce);
    }, [queryComp, suppressSearch, selectedComp, showForm, editMode]);

    // Company search for edit
    useEffect(() => {
        if (!showForm || !editMode) return;
        if (suppressSearch) return;
        if (editQueryComp.length >= 3 && editQueryComp !== editSelectedComp?.Company) {
            const fetchEditSuggestions = async () => {
                try {
                    const response = await axios.get(`https://kdstocksoft.onrender.com/company-search?query=${editQueryComp}`);
                    setEditSuggestionsComp(response.data);
                } catch (error) {
                    console.error('Error fetching edit suggestions:', error);
                }
            };
            const debounce = setTimeout(fetchEditSuggestions, 300);
            return () => clearTimeout(debounce);
        } else {
            setEditSuggestionsComp([]);
        }
    }, [editQueryComp, suppressSearch, editSelectedComp, showForm, editMode]);

    // When a company is selected from the dropdown in ADD CUSTOMER, autofill address, region, category, type
    const handleSelectComp = (item) => {
        setSuppressSearch(true);
        setSelectedComp(item);
        setQueryComp(item.Company);
        setSuggestionsComp([]);
        setCompanyDetails((prev) => ({
            ...prev,
            comp_Id: item.Id,
            company_name: item.Company,
            address: item.Address || "",
            region_Id: item.Region_Id?.toString() || '',
            region: item.Region || '',
            cat_Id: item.Cat_Id?.toString() || '',
            category: item.Category || '',
            type_Id: item.Type_Id?.toString() || '',
            type: item.Type || '',
        }));
        setTimeout(() => setSuppressSearch(false), 500);
    };

    // When a company is selected from the dropdown in EDIT CUSTOMER, autofill address, region, category, type
    const handleSelectCompEdit = (item) => {
        setSuppressSearch(true);
        setEditSelectedComp(item);
        setEditQueryComp(item.Company);
        setEditSuggestionsComp([]);
        setEditCompanyDetails((prev) => ({
            ...prev,
            comp_Id: item.Id,
            company_name: item.Company,
            address: item.Address || "",
            region_Id: item.Region_Id?.toString() || '',
            region: item.Region || '',
            cat_Id: item.Cat_Id?.toString() || '',
            category: item.Category || '',
            type_Id: item.Type_Id?.toString() || '',
            type: item.Type || '',
        }));
        setTimeout(() => setSuppressSearch(false), 500);
    };

    // Filter/search logic for table
    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const results = products.filter((product) =>
            // product.Id.toString().includes(lowerTerm) ||
            product.Code?.toLowerCase().includes(lowerTerm) ||
            product.Category?.toLowerCase().includes(lowerTerm) ||
            product.Type?.toLowerCase().includes(lowerTerm) ||
            product.Region?.toLowerCase().includes(lowerTerm) ||
            product.Company?.toLowerCase().includes(lowerTerm) ||
            product.Address?.toLowerCase().includes(lowerTerm) ||
            (product.Salutation?.toLowerCase() + " " + product.Contact_person?.toLowerCase()).includes(lowerTerm) ||
            product.Contact_person?.toLowerCase().includes(lowerTerm) ||
            product.Designation?.toLowerCase().includes(lowerTerm) ||
            product.mobile_no?.toLowerCase().includes(lowerTerm) ||
            product.emailid?.toLowerCase().includes(lowerTerm) ||
            product.Reference?.toLowerCase().includes(lowerTerm)
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

    // Company details input change
    const handleCompanyDetailsChange = (e) => {
        const { name, value } = e.target;
        setCompanyDetails((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Customer row input change
    const handleCustomerRowChange = (e) => {
        const { name, value } = e.target;
        setCustomerRow((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Add or Edit customer row to form array
    const handleAddCustomerRow = () => {
        if (
            !customerRow.salut_Id ||
            !customerRow.contact_person ||
            !customerRow.desig_Id ||
            !customerRow.mobile_no ||
            !customerRow.emailId
        ) {
            alert('Please fill all customer details fields before adding.');
            return;
        }
        if (!/^\d{10}$/.test(customerRow.mobile_no)) {
            alert('Please enter a valid 10-digit mobile number');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (customerRow.emailId && !emailRegex.test(customerRow.emailId)) {
            alert('Please enter a valid email address');
            return;
        }

        if (compRef.current) {
            compRef.current.disabled = true;
        }

        const salutationObj = dropdownSalutationOptions.find(opt => opt.Id === parseInt(customerRow.salut_Id));
        const designationObj = dropdownDesigOptions.find(opt => opt.Id === parseInt(customerRow.desig_Id));
        const fullContactPerson = (salutationObj?.Salutation ? salutationObj.Salutation + " " : "") + (customerRow.contact_person || "");
        const newRow = {
            ...customerRow,
            contact_person: fullContactPerson,
            designation: designationObj?.Designation || '',
            reference: customerRow.reference || '',
        };

        // Check for duplicate: same contact_person (ignoring salutation), designation, mobile_no, emailId
        const normalizeName = (name) => {
            if (!name) return '';
            // Remove leading salutation and whitespace
            let trimmed = name.trim();
            for (const opt of dropdownSalutationOptions) {
                const sal = opt.Salutation + " ";
                if (trimmed.toLowerCase().startsWith(sal.toLowerCase())) {
                    return trimmed.substring(sal.length).trim().toLowerCase();
                }
            }
            return trimmed.toLowerCase();
        };

        const isDuplicate = customerRows.some((row, idx) => {
            if (editRowIndex !== null && idx === editRowIndex) return false;
            return (
                normalizeName(row.contact_person) === normalizeName(newRow.contact_person) &&
                (row.designation?.trim().toLowerCase() === newRow.designation.trim().toLowerCase()) &&
                (row.mobile_no === newRow.mobile_no) &&
                (row.emailId?.trim().toLowerCase() === newRow.emailId.trim().toLowerCase())
            );
        });

        if (isDuplicate) {
            alert('Duplicate Customer Details');
            return;
        }

        if (editRowIndex !== null) {
            setCustomerRows((prev) =>
                prev.map((row, idx) => (idx === editRowIndex ? newRow : row))
            );
            setEditRowIndex(null);
        } else {
            setCustomerRows((prev) => [...prev, newRow]);
        }
        setCustomerRow({ ...initialCustomerRow });
    };

    // Remove customer row from form array
    const handleRemoveCustomerRow = (idx) => {
        setCustomerRows((prev) => prev.filter((_, i) => i !== idx));
        if (editRowIndex === idx) {
            setEditRowIndex(null);
            setCustomerRow({ ...initialCustomerRow });
        }
    };

    // Edit button for formarray row
    const handleEditCustomerRow = (idx) => {

        const row = customerRows[idx];
        let salut_Id = row.salut_Id;
        let contact_person = row.contact_person;
        let salutation = '';
        if (dropdownSalutationOptions && dropdownSalutationOptions.length > 0) {
            for (const opt of dropdownSalutationOptions) {
                if (contact_person && contact_person.startsWith(opt.Salutation + " ")) {
                    salutation = opt.Salutation;
                    contact_person = contact_person.substring((opt.Salutation + " ").length);
                    salut_Id = opt.Id.toString();
                    break;
                }
            }
        }
        setCustomerRow({
            salut_Id: salut_Id,
            contact_person: contact_person,
            desig_Id: row.desig_Id,
            designation: row.designation,
            mobile_no: row.mobile_no,
            emailId: row.emailId,
            reference: row.reference || '',
        });
        setEditRowIndex(idx);

    };

    // Add Customer button
    const handleAddClick = () => {
        setShowForm(true);
        setEditMode(false);
        setCompanyDetails({ ...initialCompanyState });
        setCustomerRow({ ...initialCustomerRow });
        setCustomerRows([]);
        setQueryComp('');
        setSelectedComp(null);
        setSuggestionsComp([]);
        setEditRowIndex(null);
    };

    // Edit Customer button
    const openEditModal = (product) => {

        setIsEditDisabled(true);

        if (product.Active !== 1) {
            alert("Inactive records cannot be edited");
            return;
        }
        setShowForm(true);
        setEditMode(true);
        setEditId(product.Id);

        // Use product.Company if Company_name is not present
        const companyName = product.Company_name || product.Company || '';


        setEditCompanyDetails({
            comp_Id: product.Comp_Id,
            company_name: companyName,
            address: product.Address,
            region_Id: product.Region_Id?.toString() || '',
            region: product.Region || '',
            cat_Id: product.Cat_Id?.toString() || '',
            category: product.Category || '',
            type_Id: product.Type_Id?.toString() || '',
            type: product.Type || '',
        });
        setEditQueryComp(companyName);
        setEditSelectedComp({
            Id: product.Comp_Id,
            Company: companyName,
            Address: product.Address
        });
        setEditSuggestionsComp([]);
        setEditCustomerRows([
            {
                salut_Id: product.Salut_Id?.toString() || '',
                contact_person: (product.Salutation ? product.Salutation + " " : "") + (product.Contact_person || ''),
                desig_Id: product.Desig_Id?.toString() || '',
                designation: product.Designation || '',
                mobile_no: product.mobile_no || product.Mobile_no || '',
                emailId: product.emailid || product.EmailId || '',
                reference: product.Reference || '',
            }
        ]);
        setEditCustomerRow({ ...initialCustomerRow });
        setEditEditRowIndex(null);

    };

    // Remove customer row from edit form array
    const handleRemoveEditCustomerRow = (idx) => {
        setEditCustomerRows((prev) => prev.filter((_, i) => i !== idx));
        if (editEditRowIndex === idx) {
            setEditEditRowIndex(null);
            setEditCustomerRow({ ...initialCustomerRow });
        }
    };

    // Edit button for edit formarray row
    const handleEditEditCustomerRow = (idx) => {

        const row = editCustomerRows[idx];
        let salut_Id = row.salut_Id;
        let contact_person = row.contact_person;
        let salutation = '';
        if (dropdownSalutationOptions && dropdownSalutationOptions.length > 0) {
            for (const opt of dropdownSalutationOptions) {
                if (contact_person && contact_person.startsWith(opt.Salutation + " ")) {
                    salutation = opt.Salutation;
                    contact_person = contact_person.substring((opt.Salutation + " ").length);
                    salut_Id = opt.Id.toString();
                    break;
                }
            }
        }
        setEditCustomerRow({
            salut_Id: salut_Id,
            contact_person: contact_person,
            desig_Id: row.desig_Id,
            designation: row.designation,
            mobile_no: row.mobile_no,
            emailId: row.emailId,
            reference: row.reference || '',
        });
        setEditEditRowIndex(idx);

    };

    // Add or Edit customer row to edit form array
    const handleAddEditCustomerRow = () => {
        // Prevent adding a second row in the form array


        if (
            !editCustomerRow.salut_Id ||
            !editCustomerRow.contact_person ||
            !editCustomerRow.desig_Id ||
            !editCustomerRow.mobile_no ||
            !editCustomerRow.emailId
        ) {
            alert('Please fill all customer details fields before adding.');
            return;
        }
        if (!/^\d{10}$/.test(editCustomerRow.mobile_no)) {
            alert('Please enter a valid 10-digit mobile number');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (editCustomerRow.emailId && !emailRegex.test(editCustomerRow.emailId)) {
            alert('Please enter a valid email address');
            return;
        }

        if (editCustomerRows.length >= 1 && editEditRowIndex === null) {
            alert('You cannot add more than one customer detail row for edit and update');
            return;
        }

        const salutationObj = dropdownSalutationOptions.find(opt => opt.Id === parseInt(editCustomerRow.salut_Id));
        const designationObj = dropdownDesigOptions.find(opt => opt.Id === parseInt(editCustomerRow.desig_Id));
        const fullContactPerson = (salutationObj?.Salutation ? salutationObj.Salutation + " " : "") + (editCustomerRow.contact_person || "");
        const newRow = {
            ...editCustomerRow,
            contact_person: fullContactPerson,
            designation: designationObj?.Designation || '',
            reference: editCustomerRow.reference || '',
        };
        if (editEditRowIndex !== null) {
            setEditCustomerRows((prev) =>
                prev.map((row, idx) => (idx === editEditRowIndex ? newRow : row))
            );
            setEditEditRowIndex(null);
        } else {
            setEditCustomerRows((prev) => [...prev, newRow]);
        }
        setEditCustomerRow({ ...initialCustomerRow });

        const normalizeName = (name) => {
            if (!name) return '';
            // Remove leading salutation and whitespace
            let trimmed = name.trim();
            for (const opt of dropdownSalutationOptions) {
                const sal = opt.Salutation + " ";
                if (trimmed.toLowerCase().startsWith(sal.toLowerCase())) {
                    return trimmed.substring(sal.length).trim().toLowerCase();
                }
            }
            return trimmed.toLowerCase();
        };

        const isDuplicate = customerRows.some((row, idx) => {
            if (editRowIndex !== null && idx === editRowIndex) return false;
            return (
                normalizeName(row.contact_person) === normalizeName(row.contact_person) &&
                (row.designation?.trim().toLowerCase() === row.designation.trim().toLowerCase()) &&
                (row.mobile_no === row.mobile_no) &&
                (row.emailId?.trim().toLowerCase() === row.emailId.trim().toLowerCase())
            );
        });

        if (isDuplicate) {
            alert('Duplicate Customer Details');
            return;
        }
    };

    // Company details input change for edit
    const handleEditCompanyDetailsChange = (e) => {
        const { name, value } = e.target;
        setEditCompanyDetails((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Customer row input change for edit
    const handleEditCustomerRowChange = (e) => {
        const { name, value } = e.target;
        setEditCustomerRow((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Submit add customer
    const handleSubmit = async () => {
        // Validate company details
        if (
            !companyDetails.comp_Id ||
            !companyDetails.address ||
            !companyDetails.region_Id ||
            !companyDetails.type_Id
        ) {
            alert('Please fill all company details fields.');
            return;
        }
        if (customerRows.length === 0) {
            alert('Please add at least one customer detail row.');
            return;
        }
        const selectedType = typeOptions.find(opt => opt.Id === parseInt(companyDetails.type_Id));
        const selectedRegion = regionOptions.find(opt => opt.Id === parseInt(companyDetails.region_Id));

        // Track generated codes to avoid duplicates in UI
        const generatedCodes = [];

        // Use for...of to ensure sequential code generation and avoid duplicate codes
        for (const row of customerRows) {
            let contact_person = row.contact_person;
            let salutation = '';
            if (dropdownSalutationOptions && dropdownSalutationOptions.length > 0) {
                for (const opt of dropdownSalutationOptions) {
                    if (contact_person && contact_person.startsWith(opt.Salutation + " ")) {
                        salutation = opt.Salutation;
                        contact_person = contact_person.substring((opt.Salutation + " ").length);
                        break;
                    }
                }
            }
            // Only send fields that are actually saved in the database
            const productToSend = {
                Type_Id: parseInt(companyDetails.type_Id) || 0,
                Type: selectedType?.Type || "",
                Region_Id: parseInt(companyDetails.region_Id) || 0,
                Region: selectedRegion?.Region || "",
                Comp_Id: companyDetails.comp_Id,
                Address: companyDetails.address,
                Contact_person: contact_person,
                Salut_Id: parseInt(row.salut_Id) || 0,
                Salutation: salutation || "",
                Desig_Id: parseInt(row.desig_Id) || 0,
                Designation: row.designation || "",
                Mobile_no: row.mobile_no,
                EmailId: row.emailId,
                Reference: row.reference || '',
                Created_By: username,
                Created_On: new Date().toISOString().slice(0, 10),
                Active: 1,
            };
            try {
                // Await each post to ensure sequential code generation
                const res = await axios.post(`${API_URL}/create`, productToSend);
                // Only show the code if it is not already shown (avoid duplicate codes in UI)
                if (res.data && res.data.Code && !generatedCodes.includes(res.data.Code)) {
                    generatedCodes.push(res.data.Code);
                }
            } catch (err) {
                // console.log(err.response?.data?.details)
                if (err.response && err.response.data && typeof err.response.data.error === 'string' && err.response.data.error.startsWith('Duplicate')) {
                    // Show SweetAlert error, but do NOT close the add/edit popup
                    await Swal.fire({
                        icon: 'error',
                        title: 'Duplicate Customer Data',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#d33',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        allowEnterKey: true,
                        backdrop: true,
                        // The popup will close only when user clicks OK, but the add/edit popup remains open
                    });
                    // Do not close the add/edit popup, just return from this iteration
                    return;
                }
                else {
                    alert('Company Data not Saved');
                }
                // console.error("❌ Error adding Company:", err.response?.data || err.message);
                // alert("Failed to add Company.");
            }
        }

        // After all requests, fetch updated customer list
        await fetchCustomer();

        // Show all generated codes in a single SweetAlert popup
        if (generatedCodes.length > 0) {
            Swal.fire({
                icon: 'success',
                title: 'Customer(s) Added Successfully',
                html: generatedCodes.map((code, idx) => `<div>Customer Code - <b>${code}</b></div>`).join(''),
                confirmButtonText: 'OK',
                confirmButtonColor: '#3085d6'
            });
        }

        setShowForm(false);
        setCompanyDetails({ ...initialCompanyState });
        setCustomerRow({ ...initialCustomerRow });
        setCustomerRows([]);
        setQueryComp('');
        setSelectedComp(null);
        setSuggestionsComp([]);
        setEditRowIndex(null);
    };

    // Submit edit customer
    const handleEditSubmit = async () => {
        if (
            !editCompanyDetails.comp_Id ||
            !editCompanyDetails.address ||
            !editCompanyDetails.region_Id ||
            !editCompanyDetails.type_Id
        ) {
            alert('Please fill all company details fields.');
            return;
        }
        if (editCustomerRows.length === 0) {
            alert('Please add at least one customer detail row.');
            return;
        }
        if (editCustomerRows.length > 1) {
            alert('Only one editing is allowed');
            return;
        }
        const row = editCustomerRows[0];
        let contact_person = row.contact_person;
        let salutation = '';
        if (dropdownSalutationOptions && dropdownSalutationOptions.length > 0) {
            for (const opt of dropdownSalutationOptions) {
                if (contact_person && contact_person.startsWith(opt.Salutation + " ")) {
                    salutation = opt.Salutation;
                    contact_person = contact_person.substring((opt.Salutation + " ").length);
                    break;
                }
            }
        }
        const selectedType = typeOptions.find(opt => opt.Id === parseInt(editCompanyDetails.type_Id));
        const selectedRegion = regionOptions.find(opt => opt.Id === parseInt(editCompanyDetails.region_Id));
        // Only send fields that are actually saved in the database
        const productToUpdate = {
            Type_Id: parseInt(editCompanyDetails.type_Id) || 0,
            Type: selectedType?.Type || "",
            Region_Id: parseInt(editCompanyDetails.region_Id) || 0,
            Region: selectedRegion?.Region || "",
            Comp_Id: editCompanyDetails.comp_Id,
            Address: editCompanyDetails.address,
            Contact_person: contact_person,
            Salut_Id: parseInt(row.salut_Id) || 0,
            Salutation: salutation || "",
            Desig_Id: parseInt(row.desig_Id) || 0,
            Designation: row.designation || "",
            Mobile_no: row.mobile_no,
            EmailId: row.emailId,
            Reference: row.reference || '',
            Modified_By: username,
            Modified_On: new Date().toISOString().slice(0, 10),
        };
        try {
            const response = await axios.put(`${API_URL}/${editId}`, productToUpdate);
            const updated = products.map((p) =>
                p.Id === editId ? response.data : p
            );
            setProducts(updated);
            setFiltered(updated);
            setShowForm(false);
            setEditId(null);
            setEditMode(false);
            setEditCompanyDetails({ ...initialCompanyState });
            setEditCustomerRow({ ...initialCustomerRow });
            setEditCustomerRows([]);
            setEditQueryComp('');
            setEditSelectedComp(null);
            setEditSuggestionsComp([]);
            setEditEditRowIndex(null);
            Swal.fire({
                icon: 'success',
                title: 'Customer Data Edited Successfully',
                confirmButtonText: 'OK',
                confirmButtonColor: '#3085d6'
            });
        } catch (err) {
            // console.log(err.response.data.details)
            if (
                err.response &&
                err.response.data &&
                typeof err.response.data.error === 'string' &&
                err.response.data.error.startsWith('Duplicate')
            ) {
                // Show SweetAlert error, but do NOT close the add/edit popup
                await Swal.fire({
                    icon: 'error',
                    title: 'Duplicate Customer Data',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#d33',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    allowEnterKey: true,
                    backdrop: true,
                });
                // Do not close the add/edit popup, just return
                return;
            } else {
                alert('Company Data not Saved');
            }
            // console.error("❌ Error adding Company:", err.response?.data || err.message);
            // alert("Failed to add Company.");
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
                console.error('Toggle active failed:', error);
                alert('Failed to toggle Customer status.');
            });
    };

    // Cancel form (cross button)
    const handleCancelForm = () => {
        setIsEditDisabled(false);
        setShowForm(false);
        setEditMode(false);
        setCompanyDetails({ ...initialCompanyState });
        setCustomerRow({ ...initialCustomerRow });
        setCustomerRows([]);
        setQueryComp('');
        setSelectedComp(null);
        setSuggestionsComp([]);
        setEditRowIndex(null);
        setEditId(null);
        setEditCompanyDetails({ ...initialCompanyState });
        setEditCustomerRow({ ...initialCustomerRow });
        setEditCustomerRows([]);
        setEditQueryComp('');
        setEditSelectedComp(null);
        setEditSuggestionsComp([]);
        setEditEditRowIndex(null);
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Customer Master</h2>
                <div>
                    <button style={{ ...styles.button, padding: '6px 12px', fontSize: '14px' }} onClick={handleAddClick}>
                        Add Customer
                    </button>
                </div>
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
                            key={option.username ? `${option.username}-${idx}` : `user-${idx}`}
                            value={option.username}
                        >
                            {option.username}
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

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f4f4f4' }}>
                        {tableHeaders.map((header, idx) => (
                            <th key={idx} style={styles.th}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {currentData && currentData.length > 0 ? (
                        [...currentData]
                            .sort((a, b) => b.Id - a.Id)
                            .map((product) => (
                                <tr key={product.Id}>
                                    {/* <td style={styles.td}>{product.Id}</td> */}
                                    <td style={styles.td}>{product.Code}</td>
                                    {/* <td style={styles.td}>{product.Category}</td> */}
                                    <td style={styles.td}>{product.Type}</td>
                                    <td style={styles.td}>{product.Region}</td>
                                    <td style={styles.td}>{product.Company}</td>
                                    <td style={styles.td}>{product.Address}</td>
                                    <td style={styles.td}>{product.Salutation == null ? "" + product.Contact_person :
                                        product.Salutation + " " + product.Contact_person}</td>
                                    {/* <td style={styles.td}>{product.Designation}</td>
                                    <td style={styles.td}>{product.mobile_no || product.Mobile_no}</td>
                                    <td style={styles.td}>{product.emailid || product.EmailId}</td> */}
                                    {/* <td style={styles.td}>{product.Reference || ''}</td> */}
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
                                            aria-label={`Edit ${product.Code}`}
                                        >
                                            📝
                                        </button>
                                    </td>
                                    <td style={styles.td} align="center">
                                        <div
                                            onClick={async () => {
                                                const isActive = activeStates[product.Id];
                                                const confirmMessage = isActive
                                                    ? 'Do you want to deactivate this Customer?'
                                                    : 'Do you want to activate this Customer?';

                                                if (window.confirm(confirmMessage)) {
                                                    toggleActive(product.Id);
                                                    const newStatus = !isActive;
                                                    if (newStatus) {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'Customer Data Activated',
                                                            confirmButtonText: 'OK',
                                                            confirmButtonColor: '#3085d6'
                                                        });
                                                    } else {
                                                        Swal.fire({
                                                            icon: 'success',
                                                            title: 'Customer Data Inactivated',
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

            {/* Add/Edit Customer Form as a full window popup */}
            {showForm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'stretch',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: '100vw',
                            height: '100vh',
                            maxWidth: '100vw',
                            maxHeight: '100vh',
                            background: '#fff',
                            borderRadius: 0,
                            boxShadow: 'none',
                            padding: 0,
                            overflow: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 24,
                            padding: '32px 40px 0 40px',
                            background: '#fff',
                            borderBottom: '1px solid #eee',
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                        }}>
                            <h2 style={{ margin: 0 }}>{editMode ? 'Edit Customer' : 'Add Customer'}</h2>
                            <button
                                onClick={handleCancelForm}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: 32,
                                    fontWeight: 'bold',
                                    color: '#888',
                                    cursor: 'pointer',
                                    lineHeight: 1,
                                    zIndex: 20,
                                }}
                                aria-label="Close"
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 40px 40px 40px' }}>
                            {/* Company Details */}
                            <h3 style={{ marginTop: 24, marginBottom: 16 }}>Company Details</h3>
                            <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
                                {/* Search Company */}
                                <div style={{ flex: 2, minWidth: 0, position: 'relative' }}>
                                    <label style={{ marginBottom: 8, display: 'block' }}>Search Company</label>
                                    <input
                                        disabled={isEditDisabled}
                                        ref={compRef}
                                        type="text"
                                        value={editMode ? editQueryComp : queryComp}
                                        onChange={e => editMode ? setEditQueryComp(e.target.value) : setQueryComp(e.target.value)}
                                        style={styles.input}
                                        autoComplete="off"
                                    />
                                    {(editMode ? editSuggestionsComp : suggestionsComp).length > 0 && (
                                        <ul
                                            style={{
                                                listStyle: 'none',
                                                margin: 0,
                                                padding: '5px',
                                                backgroundColor: 'white',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                                position: 'absolute',
                                                width: '95%',
                                                zIndex: 10,
                                                maxHeight: '150px',
                                                overflowY: 'auto',
                                            }}
                                        >
                                            {(editMode ? editSuggestionsComp : suggestionsComp).map((item) => (
                                                <li
                                                    key={item.Id}
                                                    onClick={() => editMode ? handleSelectCompEdit(item) : handleSelectComp(item)}
                                                    style={{
                                                        padding: '8px',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid #eee',
                                                    }}
                                                >
                                                    <strong>{item.Company + " ( " + item.Address + " )"}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {/* Address */}
                                <div style={{ flex: 3, minWidth: 0 }}>
                                    <label style={{ marginBottom: 8, display: 'block' }}>Address</label>
                                    <textarea
                                        disabled
                                        type="text"
                                        name="address"
                                        value={editMode ? editCompanyDetails.address : companyDetails.address}
                                        onChange={editMode ? handleEditCompanyDetailsChange : handleCompanyDetailsChange}
                                        style={{
                                            ...styles.input,
                                            minHeight: '40px',
                                            resize: 'vertical',
                                        }}
                                    />
                                </div>
                                {/* Region */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <label style={{ marginBottom: 8, display: 'block' }}>Region</label>
                                    <input
                                        type="text"
                                        name="region"
                                        value={editMode ? editCompanyDetails.region : companyDetails.region}
                                        disabled
                                        style={styles.input}
                                    />
                                </div>
                                {/* Category */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <label style={{ marginBottom: 8, display: 'block' }}>Category</label>
                                    <input
                                        type="text"
                                        name="category"
                                        value={editMode ? editCompanyDetails.category : companyDetails.category}
                                        disabled
                                        style={styles.input}
                                    />
                                </div>
                                {/* Type */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <label style={{ marginBottom: 8, display: 'block' }}>Type</label>
                                    <input
                                        type="text"
                                        name="type"
                                        value={editMode ? editCompanyDetails.type : companyDetails.type}
                                        disabled
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                            {/* Customer Details */}
                            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Customer Details</h3>
                            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', marginBottom: 8, flexWrap: 'wrap' }}>
                                {/* Salutation */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <label style={{ marginBottom: 8, display: 'block' }}>Salutation</label>
                                    <select
                                        name="salut_Id"
                                        value={editMode ? editCustomerRow.salut_Id : customerRow.salut_Id}
                                        onChange={editMode ? handleEditCustomerRowChange : handleCustomerRowChange}
                                        style={styles.input}
                                    >
                                        <option value="">Select</option>
                                        {dropdownSalutationOptions.map((option) => (
                                            <option key={option.Id} value={option.Id}>
                                                {option.Salutation}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {/* Contact Person */}
                                <div style={{ flex: 2, minWidth: 0 }}>
                                    <label style={{ marginBottom: 8, display: 'block' }}>Contact Person</label>
                                    <input
                                        type="text"
                                        name="contact_person"
                                        value={editMode ? editCustomerRow.contact_person : customerRow.contact_person}
                                        onChange={editMode ? handleEditCustomerRowChange : handleCustomerRowChange}
                                        style={styles.input}
                                    />
                                </div>
                                {/* Designation */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <label style={{ marginBottom: 8, display: 'block' }}>Designation</label>
                                    <select
                                        name="desig_Id"
                                        value={editMode ? editCustomerRow.desig_Id : customerRow.desig_Id}
                                        onChange={editMode ? handleEditCustomerRowChange : handleCustomerRowChange}
                                        style={styles.input}
                                    >
                                        <option value="">Select</option>
                                        {dropdownDesigOptions.map((option) => (
                                            <option key={option.Id} value={option.Id}>
                                                {option.Designation}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {/* Contact Number */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <label style={{ marginBottom: 8, display: 'block' }}>Contact Number</label>
                                    <input
                                        type="text"
                                        name="mobile_no"
                                        maxLength={10}
                                        value={editMode ? editCustomerRow.mobile_no : customerRow.mobile_no}
                                        onChange={e => {
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            (editMode ? handleEditCustomerRowChange : handleCustomerRowChange)({
                                                target: { name: "mobile_no", value }
                                            });
                                        }}
                                        style={styles.input}
                                    />
                                </div>
                                {/* Email Id */}
                                <div style={{ flex: 2, minWidth: 0 }}>
                                    <label style={{ marginBottom: 8, display: 'block' }}>Email Id</label>
                                    <input
                                        type="text"
                                        name="emailId"
                                        value={editMode ? editCustomerRow.emailId : customerRow.emailId}
                                        onChange={editMode ? handleEditCustomerRowChange : handleCustomerRowChange}
                                        style={styles.input}
                                    />
                                </div>
                                {/* Reference */}
                                <div style={{ flex: 2, minWidth: 0 }}>
                                    <label style={{ marginBottom: 8, display: 'block' }}>Reference</label>
                                    <input
                                        type="text"
                                        name="reference"
                                        value={editMode ? editCustomerRow.reference : customerRow.reference}
                                        onChange={editMode ? handleEditCustomerRowChange : handleCustomerRowChange}
                                        style={styles.input}
                                    />
                                </div>
                                {/* Add/Edit icon */}
                                <div style={{ flex: '0 0 40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={editMode ? handleAddEditCustomerRow : handleAddCustomerRow}
                                        style={{
                                            background: '#2C3E50',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: 36,
                                            height: 36,
                                            fontSize: 22,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                        title={((editMode ? editEditRowIndex : editRowIndex) !== null) ? "Edit row" : "Add to list"}
                                    >
                                        {((editMode ? editEditRowIndex : editRowIndex) !== null) ? '✎' : '+'}
                                    </button>
                                </div>
                            </div>
                            {/* Form Array Table with vertical scroll */}
                            <div style={{
                                marginTop: 16,
                                marginBottom: 24,
                                maxHeight: 220,
                                overflowY: 'auto',
                                border: '1px solid #eee',
                                borderRadius: 6,
                                background: '#fafbfc'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f4f4f4', position: 'sticky', top: 0 }}>
                                            <th style={styles.th}>Contact Person</th>
                                            <th style={styles.th}>Designation</th>
                                            <th style={styles.th}>Contact Number</th>
                                            <th style={styles.th}>Email Id</th>
                                            <th style={styles.th}>Reference</th>
                                            <th style={styles.th}>Edit</th>
                                            {localStorage.getItem('department') === 'Administration' && (
                                                <th style={styles.th}>Remove</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(editMode ? editCustomerRows : customerRows).length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={styles.td} align="center">No customer details added.</td>
                                            </tr>
                                        ) : (
                                            (editMode ? editCustomerRows : customerRows).map((row, idx) => (
                                                <tr key={idx}>
                                                    <td style={styles.td}>{row.contact_person}</td>
                                                    <td style={styles.td}>{row.designation}</td>
                                                    <td style={styles.td}>{row.mobile_no}</td>
                                                    <td style={styles.td}>{row.emailId}</td>
                                                    <td style={styles.td}>{row.reference || ''}</td>
                                                    <td style={styles.td} align="center">
                                                        <button
                                                            type="button"

                                                            onClick={() => editMode ? handleEditEditCustomerRow(idx) : handleEditCustomerRow(idx)}
                                                            style={{
                                                                background: '#2980b9',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '50%',
                                                                width: 28,
                                                                height: 28,
                                                                fontSize: 16,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                            title="Edit"
                                                        >✎</button>
                                                    </td>
                                                    {localStorage.getItem('department') === 'Administration' && (
                                                        <td style={styles.td} align="center">
                                                            <button
                                                                type="button"
                                                                onClick={() => editMode ? handleRemoveEditCustomerRow(idx) : handleRemoveCustomerRow(idx)}
                                                                style={{
                                                                    background: '#e74c3c',
                                                                    color: '#fff',
                                                                    border: 'none',
                                                                    borderRadius: '50%',
                                                                    width: 28,
                                                                    height: 28,
                                                                    fontSize: 16,
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                                title="Remove"
                                                            >×</button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* Submit button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', marginTop: '24px' }}>
                                <button
                                    onClick={editMode ? handleEditSubmit : handleSubmit}
                                    style={styles.button}
                                >Submit</button>
                            </div>
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
        background: '#f8f8f8'
    },
    td: {
        border: '1px solid #ccc',
        padding: '10px',
        background: '#fff'
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
        width: '100%',
        padding: '10px',
        margin: '10px 0',
        borderRadius: '4px',
        border: '1px solid #ccc',
        background: '#fff'
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

export default CustomerMaster;
