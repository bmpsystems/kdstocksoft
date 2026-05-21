import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  FaChartBar, FaBars, FaBox, FaBoxes,
  FaChevronDown, FaChevronUp, FaUserCircle,FaTachometerAlt  
} from 'react-icons/fa';
import bmpLogo from '../assets/Bmp_logo.png';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [openMenus, setOpenMenus] = useState({});

  const toggleSidebar = () => setIsCollapsed(prev => !prev);
  const user = JSON.parse(localStorage.getItem('user'));
  const dept = user?.department;
  const username = user?.username;

  // Custom access logic for SOHINI
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    const dept = user?.department;
  
    if (!dept) return;
  
    axios.get(`http://localhost:5000/menu-items/${dept}`)
      .then(res => {
        if (Array.isArray(res.data)) {
          setMenuItems(res.data);
        }
      })
      .catch(err => console.error('Menu fetch error:', err));
  }, []);
  

  // Group by category (Master, Transaction, Reports, etc.)
  const groupedMenus = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Toggle open/close
  const toggleMenuCategory = (category) => {
    setOpenMenus(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const linkStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 10px',
    textDecoration: 'none',
    color: '#ECF0F1',
  };

  const menuHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    textDecoration: 'none',
    color: '#ECF0F1',
    cursor: 'pointer',
    userSelect: 'none',
  };

  // Choose icon based on category
  const getIcon = (category) => {
    switch (category) {
      case 'Master': return <FaBox style={{ marginRight: isCollapsed ? 0 : '10px' }} />;
      case 'Transaction': return <FaBoxes style={{ marginRight: isCollapsed ? 0 : '10px' }} />;
      case 'Reports': return <FaChartBar style={{ marginRight: isCollapsed ? 0 : '10px' }} />;
      case 'User-List': return <FaUserCircle style={{ marginRight: isCollapsed ? 0 : '10px' }} />;
      default: return <FaBox style={{ marginRight: isCollapsed ? 0 : '10px' }} />;
    }
  };

  // The main change: use position: fixed to keep sidebar always visible
  return (
    <div
      style={{
        width: isCollapsed ? '60px' : '200px',
        transition: 'width 0.3s',
        backgroundColor: '#2C3E50',
        color: '#ECF0F1',
        height: '100vh',
        position: 'fixed', // changed from 'sticky' to 'fixed'
        top: 0,
        left: 0,
        zIndex: 1000,
        overflowX: 'hidden',
        overflowY: 'auto', // allow scrolling if sidebar content overflows
        boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
      }}
    >
      <center>
        <img src={bmpLogo} alt="BMP Logo" height="50" width="50" style={{ marginTop: '10px' }} />
      </center>

      {/* Toggle Sidebar Button */}
      <div style={{ padding: '10px', cursor: 'pointer' }} onClick={toggleSidebar}>
        <FaBars size={20} />
      </div>

      <nav style={{ marginTop: '20px' }}>
        <Link to="/dashboard" style={linkStyle}>
          <span>
            <FaTachometerAlt style={{ marginRight: isCollapsed ? 0 : '10px', color: '#1ABC9C', fontSize: '20px' }} />
          </span>
        </Link>

        {/* Loop through grouped categories */}
        {Object.keys(groupedMenus).map((category) => (
          <div key={category}>
            <div
              onClick={() => toggleMenuCategory(category)}
              style={menuHeaderStyle}
            >
              {getIcon(category)}
              {!isCollapsed && (
                <>
                  <span style={{ flexGrow: 1 }}>{category}</span>
                  {openMenus[category] ? <FaChevronUp /> : <FaChevronDown />}
                </>
              )}
            </div>

            {openMenus[category] && !isCollapsed && (
              <div style={{ paddingLeft: '30px' }}>
                {groupedMenus[category].map((item) => (
                  <Link key={item.id} to={item.path} style={linkStyle}>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
