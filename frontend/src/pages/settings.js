import React, { useState } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { FaCog, FaBuilding} from 'react-icons/fa'; // Importing icons
import SettingBar from '../components/settingbar';

function SettingsPg() {
  const [activeKey, setActiveKey] = useState('company-details'); // State to manage active sidebar item


  return (
    <div className="min-vh-100 bg-light p-4" >
      <Container fluid className="p-0 h-100">
        <Row className="g-0 h-100">
          {/* Sidebar */}
          {/* Increased md and lg column size for wider sidebar */}
          <SettingBar/>

          {/* Main Content Area */}
          {/* Decreased md and lg column size to compensate for wider sidebar */}
          <Col md={8} lg={9} className="p-3 h-100">
          <h2 className="fs-4 fw-semibold text-secondary mb-4 d-flex align-items-center">
                <FaBuilding className="me-3" /> Company Details
              </h2>
            {/* Added h-100 to this div to make it stretch to the full height of its parent Col */}
            <div className="bg-white shadow rounded py-4 px-3 h-100">
               <Form>
                {/* Company Logo */}
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm="3" className="text-secondary fw-medium pt-0">
                    Company Logo
                  </Form.Label>
                  <Col sm="9">
                    <div className="d-flex align-items-center mb-2">
                      <span className="text-muted">No Logo Found !</span>
                      <Button variant="link" className="p-0 text-primary ms-3">
                        Upload New Logo
                      </Button>
                    </div>
                    <div className="d-flex align-items-center">
                      <Form.Control type="file" className="me-3" style={{ width: 'auto' }} />
                    </div>
                  </Col>
                </Form.Group>

                {/* Company Name */}
                <Form.Group as={Row} className="mb-3 align-items-center">
                  <Form.Label column sm="3" className="text-secondary fw-medium">
                    Company Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Col sm="9">
                    <Form.Control type="text" placeholder="Contoso" />
                  </Col>
                </Form.Group>

                {/* Email */}
                <Form.Group as={Row} className="mb-3 align-items-center">
                  <Form.Label column sm="3" className="text-secondary fw-medium">
                    Email <span className="text-danger">*</span>
                  </Form.Label>
                  <Col sm="9">
                    <Form.Control type="email" placeholder="waytosrikant@gmail.com" />
                  </Col>
                </Form.Group>

                {/* Country Code & Contact Number */}
                <Form.Group as={Row} className="mb-3 align-items-center">
                  <Form.Label column sm="3" className="text-secondary fw-medium">
                    Country Code <span className="text-danger">*</span>
                  </Form.Label>
                  <Col sm="3">
                    <Form.Select>
                      <option>+91</option>
                      <option>+1</option>
                      <option>+44</option>
                    </Form.Select>
                  </Col>
                  <Form.Label column sm="3" className="text-secondary fw-medium">
                    Contact Number <span className="text-danger">*</span>
                  </Form.Label>
                  <Col sm="3">
                    <Form.Control type="text" placeholder="9831205389" />
                  </Col>
                </Form.Group>

                {/* Website */}
                <Form.Group as={Row} className="mb-3 align-items-center">
                  <Form.Label column sm="3" className="text-secondary fw-medium">
                    Website
                  </Form.Label>
                  <Col sm="9">
                    <Form.Control type="text" />
                  </Col>
                </Form.Group>

                {/* Billing Address */}
                <hr/>
                <h5 className="mt-4 mb-3 text-secondary">Billing Address:</h5>
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm="3" className="text-secondary">
                    Address Line 1
                  </Form.Label>
                  <Col sm="9">
                    <Form.Control type="text" />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm="3" className="text-secondary">
                    Address Line 2
                  </Form.Label>
                  <Col sm="9">
                    <Form.Control type="text" />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm="3" className="text-secondary">
                    Country
                  </Form.Label>
                  <Col sm="9">
                    <Form.Select>
                      <option>Select Country</option>
                      <option>USA</option>
                      <option>India</option>
                    </Form.Select>
                  </Col>
                </Form.Group>
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm="3" className="text-secondary">
                    State
                  </Form.Label>
                  <Col sm="9">
                    <Form.Select>
                      <option>Select State</option>
                      <option>California</option>
                      <option>Telangana</option>
                    </Form.Select>
                  </Col>
                </Form.Group>
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm="3" className="text-secondary">
                    City
                  </Form.Label>
                  <Col sm="9">
                    <Form.Control type="text" />
                  </Col>
                </Form.Group>

                {/* Shipping Address */}
                <hr/>
                <h5 className="mt-4 mb-3 text-secondary">Shipping Address:</h5>
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm="3" className="text-secondary">
                    Address Line 1
                  </Form.Label>
                  <Col sm="9">
                    <Form.Control type="text" />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm="3" className="text-secondary">
                    Address Line 2
                  </Form.Label>
                  <Col sm="9">
                    <Form.Control type="text" />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm="3" className="text-secondary">
                    Country
                  </Form.Label>
                  <Col sm="9">
                    <Form.Select>
                      <option>Select Country</option>
                      <option>USA</option>
                      <option>India</option>
                    </Form.Select>
                  </Col>
                </Form.Group>
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm="3" className="text-secondary">
                    State
                  </Form.Label>
                  <Col sm="9">
                    <Form.Select>
                      <option>Select State</option>
                      <option>California</option>
                      <option>Telangana</option>
                    </Form.Select>
                  </Col>
                </Form.Group>
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm="3" className="text-secondary">
                    City
                  </Form.Label>
                  <Col sm="9">
                    <Form.Control type="text" />
                  </Col>
                </Form.Group>

                {/* Save and Cancel Buttons */}
                <div className="d-flex justify-content-center mt-4">
                  <Button variant="success" className="me-2">
                    <i className="bi bi-check-circle me-1"></i> Save Changes
                  </Button>
                  <Button variant="danger">
                    <i className="bi bi-x-circle me-1"></i> Cancel
                  </Button>
                </div>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default SettingsPg;
