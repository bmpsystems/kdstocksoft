import React, { useState } from 'react';
import { Container, Row, Col, Nav, Form, Button } from 'react-bootstrap';
import { FaCog, FaBuilding, FaDollarSign, FaFileInvoice, FaBell, FaCogs, FaCreditCard, FaWarehouse, FaClipboardList } from 'react-icons/fa'; // Importing icons

function SettingsBar() {

  const [activeKey, setActiveKey] = useState('company-details'); // State to manage active sidebar item

  const navItems = [

    { eventKey: 'company-details', icon: <FaBuilding className="me-2" />, text: 'Company Details', subText: 'Update logo and address' },
    { eventKey: 'organization-masterdata', icon: <FaBuilding className="me-2" />, text: 'Organization Masters', subText: 'Department, Designation, region, type, tags, product category' },
    { eventKey: 'tax-settings', icon: <FaDollarSign className="me-2" />, text: 'Tax Settings', subText: 'GST and other tax details' },
    { eventKey: 'invoice-customization', icon: <FaFileInvoice className="me-2" />, text: 'Invoice Customization', subText: 'Number Settings, Invoice Titles, Custom Labels and other defaults' },
    { eventKey: 'invoice-templates', icon: <FaFileInvoice className="me-2" />, text: 'Invoice Templates', subText: 'Select and customize invoice templates' },
    { eventKey: 'invoice-reminders', icon: <FaBell className="me-2" />, text: 'Invoice Reminders', subText: 'Automated invoice reminders settings' },
    { eventKey: 'other-preferences', icon: <FaCogs className="me-2" />, text: 'Other Preferences', subText: 'Custom invoice fields and other settings' },
    { eventKey: 'payment-gateway', icon: <FaCreditCard className="me-2" />, text: 'Payment Gateway', subText: 'Setup different payment gateways' },
    { eventKey: 'inventory', icon: <FaWarehouse className="me-2" />, text: 'Inventory', subText: 'Create Warehouses, Set Preferences, etc' },
    { eventKey: 'payroll-title', icon: <FaClipboardList className="me-2" />, text: 'Payroll Title', subText: 'Payheads, Leave types, Holidays, etc.' },

  ];

  return (

    <Col md={4} lg={3} className="bg-white shadow rounded p-3 h-100 overflow-auto" style={{ backgroundColor: '#e0f7f3' }}>
      <div className="d-flex align-items-center mb-4 fs-5 fw-semibold text-secondary">
        <FaCog className="me-2 fs-4" />
        Settings
      </div>
      <Nav variant="pills" className="flex-column" activeKey={activeKey} onSelect={(selectedKey) => setActiveKey(selectedKey)}>
        {navItems.map((item) => (
          <Nav.Item key={item.eventKey} className="mb-1">
            <Nav.Link
              eventKey={item.eventKey}
              className={`d-flex flex-column align-items-start px-3 rounded transition-colors duration-200
                      ${activeKey === item.eventKey ? 'bg-secondary text-white py-2' : 'text-dark py-1'}`
              }
              style={activeKey !== item.eventKey ? { '--bs-link-hover-color': '#0d6efd' } : {}}
            >
              <div className="d-flex align-items-center small fw-medium">
                {item.icon} {item.text}
              </div>
              <small className={`ms-4`} style={{ fontSize: '10px' }}>
                {item.subText}
              </small>
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
    </Col>
  );
}

export default SettingsBar;
