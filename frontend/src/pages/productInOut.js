import React, { useState, useRef } from 'react';
import axios from 'axios';

// Helper to format date as DD-MM-YYYY
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString('en-GB');
};

const ProductInOut = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false); // Only show after search, not after selection
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [txnRows, setTxnRows] = useState([]);
  const [loadingTxn, setLoadingTxn] = useState(false);
  const [error, setError] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const dropdownRef = useRef();
  const [dropdownWasSelected, setDropdownWasSelected] = useState(false);

  // Fetch product autocomplete suggestions (product name/model)
  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedLabel('');
    setTxnRows([]);
    setError('');
    setDropdownWasSelected(false); // If user types, they're searching again, so allow dropdown

    if (value.length < 3) {
      setProducts([]);
      setShowDropdown(false);
      setTxnRows([]);
      return;
    }
    // Try product auto dropdown
    setLoadingProducts(true);
    try {
      const res = await axios.get('https://kdstocksoft.onrender.com/product-search', {
        params: { query: value }
      });
      setProducts(Array.isArray(res.data) ? res.data : []);
      setShowDropdown((res.data ?? []).length > 0);
    } catch (err) {
      setProducts([]);
      setError('Failed to fetch product list');
      setShowDropdown(false);
    } finally {
      setLoadingProducts(false);
    }

    // Movement search always called with what is being typed (searchTerm)
    if (value && value.length >= 3) {
      setLoadingTxn(true);
      try {
        const resTxn = await axios.get('https://kdstocksoft.onrender.com/product-movement-search', {
          params: { query: value }
        });
        setTxnRows(Array.isArray(resTxn.data) ? resTxn.data : []);
      } catch (err) {
        setTxnRows([]);
        if (err?.response?.data?.message) {
          setError(err.response.data.message);
        } else if (err?.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError("Failed to fetch product movement data");
        }
      } finally {
        setLoadingTxn(false);
      }
    } else {
      setTxnRows([]);
    }
  };

  // On dropdown selection, set the searchTerm to the selected label and trigger API with that label
  const handleSelectProduct = (product) => {
    let displayLabel = product.Product_name || '';
    if (product.Model_no) displayLabel += ` / ${product.Model_no}`;
    setSearchTerm(displayLabel);
    setSelectedLabel(displayLabel);
    setShowDropdown(false); // Hide dropdown after selection
    setDropdownWasSelected(true); // Mark that a selection happened
    // After selecting, call movement-search with this full text
    fetchTxnRows(displayLabel);
  };

  // Movement fetcher with any string
  const fetchTxnRows = async (rawQueryTxt) => {
    // 🔹 Normalize query: if "Name / Model", prefer Model, else Name
    let queryTxt = (rawQueryTxt || '').trim();

    if (queryTxt.includes('/')) {
      const [namePart, modelPart] = queryTxt.split('/');
      const name = (namePart || '').trim();
      const model = (modelPart || '').trim();

      // Prefer model if it has length, else use name
      if (model.length >= 3) {
        queryTxt = model;
      } else {
        queryTxt = name;
      }
    }

    // Now use normalized queryTxt for everything
    if (!queryTxt || queryTxt.length < 3) {
      setTxnRows([]);
      setError('');
      return;
    }

    setLoadingTxn(true);
    setError('');

    try {
      const res = await axios.get('https://kdstocksoft.onrender.com/product-movement-search', {
        params: { query: queryTxt }   // 🔹 Normalized query goes here
      });
      setTxnRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setTxnRows([]);
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err?.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to fetch product movement data");
      }
    } finally {
      setLoadingTxn(false);
    }
  };

  // If user presses enter, do API call for that string
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchTerm.trim().length >= 3) {
      setSelectedLabel(searchTerm);
      fetchTxnRows(searchTerm);
      setShowDropdown(false);
      setDropdownWasSelected(true); // Also treat enter as selection
    }
  };

  // Clicking outside closes dropdown, but only if shown
  React.useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  // Only open dropdown on focus if not already selected from the dropdown recently AND if search is valid
  const handleInputFocus = () => {
    if (!dropdownWasSelected && products.length > 0 && searchTerm.length >= 3) {
      setShowDropdown(true);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24, border: '1px solid #eee', borderRadius: 8, background: '#fff', position: 'relative' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 32 }}>Product In Out Details</h2>
      <div style={{ marginBottom: 26, position: 'relative' }} ref={dropdownRef}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Search Product Name / Model No.</label>
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder="Type at least 3 characters"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 4,
            border: '1px solid #bbb',
            fontSize: 16
          }}
          autoComplete="off"
        />
        {loadingProducts && <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Searching...</div>}
        {showDropdown && (
          <div
            style={{
              border: '1px solid #ccc',
              borderTop: 'none',
              background: '#fff',
              position: 'absolute',
              zIndex: 10,
              width: '100%',
              maxHeight: 300,
              overflowY: 'auto',
              boxShadow: '0 2px 10px rgba(0,0,0,0.07)'
            }}
          >
            {products.length === 0 && !loadingProducts && (
              <div style={{ padding: 10, color: '#999' }}>No products found</div>
            )}
            {products.map((product) => (
              <div
                key={product.Id}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f2f2f2',
                  fontSize: 15,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  background: selectedLabel && selectedLabel === ((product.Product_name || "") + (product.Model_no ? ` / ${product.Model_no}` : "")) ? '#f4f7ff' : undefined
                }}
                onMouseDown={() => handleSelectProduct(product)}
              >
                {product.Product_name}
                {product.Model_no ? <span style={{ color: '#888', fontWeight: 400 }}> / {product.Model_no}</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

      {(selectedLabel || searchTerm.length >= 3) && (
        <div style={{ marginBottom: 16, color: '#1976d2', fontWeight: 500 }}>
          Showing Txn details for: <span style={{ color: '#333' }}>{selectedLabel || searchTerm}</span>
        </div>
      )}

      <div style={{ marginTop: 16, minHeight: 180 }}>
        {loadingTxn ? (
          <div style={{ color: '#888' }}>Loading transaction data...</div>
        ) : txnRows.length > 0 ? (
          <div style={{ overflow: 'auto', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fafbff' }}>
              <thead>
                <tr style={{ background: '#198ef5', color: '#fff' }}>
                  <th style={{ padding: '10px 8px', border: '1px solid #dbeafe', fontWeight: 600 }}>Invoice No</th>
                  <th style={{ padding: '10px 8px', border: '1px solid #dbeafe', fontWeight: 600 }}>Delivery Challan</th>
                  <th style={{ padding: '10px 8px', border: '1px solid #dbeafe', fontWeight: 600 }}>Txn Date</th>
                  <th style={{ padding: '10px 8px', border: '1px solid #dbeafe', fontWeight: 600 }}>Txn Type</th>
                  <th style={{ padding: '10px 8px', border: '1px solid #dbeafe', fontWeight: 600 }}>Quantity</th>
                  <th style={{ padding: '10px 8px', border: '1px solid #dbeafe', fontWeight: 600 }}>Company Name</th>
                </tr>
              </thead>
              <tbody>
                {txnRows.map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 1 ? "#eef3ff" : "#fff" }}>
                    <td style={{ padding: 8, border: '1px solid #dbeafe', textAlign: 'center' }}>{row.Invoice_No || '-'}</td>
                    <td style={{ padding: 8, border: '1px solid #dbeafe', textAlign: 'center' }}>{row.Delivery_Challan || '-'}</td>
                    <td style={{ padding: 8, border: '1px solid #dbeafe', textAlign: 'center' }}>{formatDate(row.Txn_Date) || '-'}</td>
                    <td style={{ padding: 8, border: '1px solid #dbeafe', textAlign: 'center' }}>{row.Txn_Type || '-'}</td>
                    <td style={{ padding: 8, border: '1px solid #dbeafe', textAlign: 'center' }}>{row.Quantity !== undefined && row.Quantity !== null ? row.Quantity : '-'}</td>
                    <td style={{ padding: 8, border: '1px solid #dbeafe', textAlign: 'center' }}>{row.Company_Name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          (selectedLabel || searchTerm.length >= 3) &&
          <div style={{ color: '#888', textAlign: 'center', paddingTop: 28 }}>
            No transactions found for this product.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductInOut;
