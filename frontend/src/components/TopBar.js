import React, { useState, useRef, useEffect } from 'react';
import './topbar.css';
import accountLogo from '../assets/account.png';

const TopBar = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [username, setUsername] = useState('');
  const [department, setDepartment] = useState('');
  const dropdownRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user'));
  const dept = user?.dept_Id;

  useEffect(() => {
    // Fetch user info from localStorage
    const storedUsername = localStorage.getItem('name');
    const storedDepartment = localStorage.getItem('department');
    if (storedUsername) setUsername(storedUsername);
    if (storedDepartment) setDepartment(storedDepartment);
  }, []);

  const handleLogout = () => {
    localStorage.clear(); // remove all keys
    window.location.href = 'http://localhost:3001';
  };

  const navigateMypofile = () => {
    window.location.href = '/myprofile';
  };
 const navigateMyCompanySetings = () => {
    window.location.href = '/settings';
  };

  // Attach outside click handler only when dropdown is open
  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (event) => {
      // Use event.composedPath for better reliability
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [showDropdown]);

  return (
    <div className="topbar">
      <div className="user-info-wrapper" ref={dropdownRef}>
        <div className="user-text">
          <span className="username">{username}</span>
          <span className="department">{department ? department.toUpperCase() : ''}</span>
        </div>
        <div
          className="account-logo"
          style={{ position: 'relative', zIndex: 1100 }}
        >
          <img
            src={accountLogo}
            alt="Account"
            style={{ cursor: 'pointer' }}
            onClick={e => {
              e.stopPropagation();
              setShowDropdown((prev) => !prev);
            }}
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                setShowDropdown((prev) => !prev);
              }
            }}
            aria-haspopup="true"
            aria-expanded={showDropdown}
          />
          {showDropdown && (
            <div
              className="dropdown-menu"
              style={{
                display: 'block',
                position: 'absolute',
                top: 42,
                right: 0,
                zIndex: 1200,
              }}
            >
              {dept === 5 && (
                <>
                  <div className="dropdown-item" onClick={navigateMypofile}>
                    Your Profile Settings
                  </div>
                  <div className="dropdown-item" onClick={navigateMyCompanySetings}>
                    Company Settings
                  </div>
                  <hr />
                  <div className="dropdown-item">
                    Feedback & Changes
                  </div>
                  <div className="dropdown-item">
                    Helpdesk
                  </div>
                  <hr />
                </>
              )}
               <div className="dropdown-item" onClick={handleLogout}>
                Log out
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
