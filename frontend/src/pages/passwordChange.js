import React, { useState } from 'react';
import Swal from 'sweetalert2';

const PasswordChange = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage('Please fill all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const username = user?.username;
      const department = user?.dept_Id;

      const res = await fetch('http://localhost:5000/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Username: username,
          OldPassword: oldPassword,
          NewPassword: newPassword,
          Department: department
        })
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Password Changed Successfully!',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6'
      });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMessage('');
      } else {
        // alert(data.error || 'Failed to update password.');
        Swal.fire({
          icon: 'error',
          title: data.error || 'Failed to update password',
          // text: 'Invalid username or password. Please try again.',
          confirmButtonText: 'Try Again',
          confirmButtonColor: '#d33'
      });
        // setMessage(data.error || 'Failed to update password.');
      }
    } catch (err) {
      // alert('Network error');
      setMessage('Network error.');
    }

    setSubmitting(false);
  };

  const handleCancel = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('');
  };

  const renderPasswordField = (label, value, setValue, show, setShow) => (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 38px 10px 10px',
            borderRadius: 6,
            border: '1px solid #ccc',
            fontSize: 16,
            boxSizing: 'border-box'
          }}
        />
        <span
          onClick={() => setShow((s) => !s)}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            color: '#888'
          }}
          title={show ? 'Hide' : 'Show'}
        >
          {show ? (
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path stroke="#888" strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
              <circle cx="12" cy="12" r="3" stroke="#888" strokeWidth="2" />
            </svg>
          ) : (
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path stroke="#888" strokeWidth="2" d="M17.94 17.94C16.13 19.25 14.13 20 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.94M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-5.12" />
              <path stroke="#888" strokeWidth="2" d="M1 1l22 22" />
            </svg>
          )}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f4f6fa',
      padding: '40px 0',
    }}>
      <div style={{
        background: '#fff',
        padding: '2.5rem 2rem',
        borderRadius: '16px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.13)',
        minWidth: 340,
        maxWidth: 400,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontWeight: 600, fontSize: 24 }}>
          Change Password
        </h2>

        <form onSubmit={handleSubmit} style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '1.1rem'
        }} autoComplete="off">

          {renderPasswordField('Old Password', oldPassword, setOldPassword, showOld, setShowOld)}
          {renderPasswordField('New Password', newPassword, setNewPassword, showNew, setShowNew)}
          {renderPasswordField('Confirm Password', confirmPassword, setConfirmPassword, showConfirm, setShowConfirm)}

          {message && (
            <div style={{
              marginBottom: '0.5rem',
              color: message.includes('success') ? 'green' : 'red',
              textAlign: 'center',
              fontSize: 15
            }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                padding: '10px 22px',
                fontWeight: 600,
                fontSize: 16,
                cursor: submitting ? 'not-allowed' : 'pointer',
                flex: 1
              }}
            >
              {submitting ? 'Saving...' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                background: '#f5f5f5',
                color: '#333',
                border: '1px solid #ccc',
                borderRadius: 5,
                padding: '10px 22px',
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                flex: 1
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChange;
