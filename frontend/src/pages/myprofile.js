/// src/App.js
import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Tab, Nav, Modal, Form } from 'react-bootstrap';
import { FaUser, FaUserEdit, FaEdit, FaLock, FaUpload, FaTrashAlt, FaBriefcase, FaChartLine, FaPlusCircle, FaLightbulb, FaSave, FaPlus,FaClipboardList } from 'react-icons/fa';

// New Modal Component for Editing User
function EditUserModal({ show, handleClose, username, department }) {
    const [nameTitle, setNameTitle] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [userEmail, setUserEmail] = useState(username);
    const [userUsername, setUserUsername] = useState(username);
    const [designation, setDesignation] = useState('');
    const [language, setLanguage] = useState('English');
    const [timezone, setTimezone] = useState('Kolkata');
    const [accessRole, setAccessRole] = useState('');

    useEffect(() => {
        setUserEmail(username);
        setUserUsername(username);
    }, [username]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // console.log({
        //     nameTitle,
        //     firstName,
        //     lastName,
        //     userEmail,
        //     userUsername,
        //     designation,
        //     language,
        //     timezone,
        //     accessRole
        // });
        handleClose();
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold d-flex align-items-center">
                    <FaUserEdit size={20} className="me-2" /> Edit User
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    <Row className="mb-3">
                        <Col md={12}>
                            <Form.Label className="fw-semibold">Name <span className="text-danger">*</span></Form.Label>
                            <Row>
                                <Col xs={4}>
                                    <Form.Select value={nameTitle} onChange={(e) => setNameTitle(e.target.value)}>
                                        <option value="Mr">Mr</option>
                                        <option value="Ms">Ms</option>
                                        <option value="Dr">Dr</option>
                                    </Form.Select>
                                </Col>
                                <Col xs={4}>
                                    <Form.Control type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                </Col>
                                <Col xs={4}>
                                    <Form.Control type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                </Col>
                            </Row>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3" controlId="formEmail">
                        <Form.Label className="fw-semibold">Email <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formUsername">
                        <Form.Label className="fw-semibold">Username <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" value={userUsername} onChange={(e) => setUserUsername(e.target.value)} required />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formDesignation">
                        <Form.Label className="fw-semibold">Designation</Form.Label>
                        <Form.Select value={designation} onChange={(e) => setDesignation(e.target.value)}>
                            <option value="">Please select</option>
                            <option value="Manager">Manager</option>
                            <option value="Developer">Developer</option>
                            <option value="Designer">Designer</option>
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formLanguage">
                        <Form.Label className="fw-semibold">Language's <span className="text-danger">*</span></Form.Label>
                        <Form.Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                            <option value="English">English</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formTimezone">
                        <Form.Label className="fw-semibold">Timezone <span className="text-danger">*</span></Form.Label>
                        <Form.Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                            <option value="Mumbai">Mumbai</option>
                            <option value="London">London</option>
                            <option value="New York">New York</option>
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formAccessRole">
                        <Form.Label className="fw-semibold">Access Role</Form.Label>
                        <Form.Control type="text" value={accessRole} readOnly />
                        <Form.Text className="text-muted">
                            (Can perform all the operations)
                        </Form.Text>
                    </Form.Group>

                    <div className="text-center mt-4">
                        <p className="text-muted small">
                            <FaLightbulb size={12} className="me-1" /> System will send an email to this user containing temporary password to login.
                        </p>
                    </div>

                    <div className="d-flex justify-content-center mt-4">
                        <Button variant="success" type="submit" className="me-2">
                            <FaSave size={16} className="me-1" /> Save
                        </Button>
                        <Button variant="danger" onClick={handleClose}>
                            Cancel
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
}

function MyProfile() {
    // New state for activities and loading/error
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [errorActivities, setErrorActivities] = useState(null);
    const [userid, setUserid] = useState('');
    const [username, setUsername] = useState('');
    const [department, setDepartment] = useState('');
    const [email, setEmail] = useState('');
    const [key, setKey] = useState('workDetails');
    const [showEditModal, setShowEditModal] = useState(false);

    const handleShowEditModal = () => setShowEditModal(true);
    const handleCloseEditModal = () => setShowEditModal(false);

    // Helper function to get the correct icon component
    const getActionIcon = (actionType) => {
        switch (actionType) {
            case 'ADD':
                return <FaPlus size={16} />;
            case 'UPDATE':
                return <FaEdit size={16} />;
            case 'DELETE':
                return <FaTrashAlt size={16} />;
            default:
                return null;
        }
    };

    // Helper function to get the correct icon class for styling
    const getIconClass = (actionType) => {
        switch (actionType) {
            case 'ADD':
                return 'add';
            case 'UPDATE':
                return 'update';
            case 'DELETE':
                return 'delete';
            default:
                return '';
        }
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        const storedUsername = user.username;
        const storedDepartment = user.department;
        const storedEmail = user.email;
         const storedUserId = user.userid;

        if (storedUsername) setUsername(storedUsername);
        if (storedDepartment) setDepartment(storedDepartment);
        if (storedEmail) setEmail(storedEmail);
         if (storedUserId) setUserid(storedUserId);
        document.body.style.fontFamily = "'Inter', sans-serif";

        // --- FETCH ACTIVITIES DYNAMICALLY FROM BACKEND ---
        const fetchActivities = async () => {
            setLoadingActivities(true);
            setErrorActivities(null);

            // Construct the API URL. Adjust 'https://kdstocksoft.vercel.app/' if your backend is on a different port/host.
            const apiUrl = `https://kdstocksoft.onrender.com/activities/${storedUsername}`;

            try {
                const response = await fetch(apiUrl);

                // if (!response.ok) {
                //     throw new Error(`Failed to fetch activities: ${response.statusText}`);
                // }

                const data = await response.json();
                setActivities(data);

            } catch (err) {
                console.error('Error fetching activities:', err);
                setErrorActivities('Failed to fetch activities. Please try again.');
            } finally {
                setLoadingActivities(false);
            }
        };

        // Only call fetchActivities if a currentUserId is available
        if (storedUsername) {
            fetchActivities();
        } else {
            setErrorActivities('User ID not found.');
            setLoadingActivities(false);
        }

    }, []); // Empty dependency array means this runs only once on mount

    return (
        <>
            <style>
                {`
                body {
                    font-family: 'Inter', sans-serif;
                }
                .profile-avatar {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background-color: #e9ecef;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                    color: #6c757d;
                    margin: 0 auto 1rem auto;
                }
                .info-label {
                    font-weight: 500;
                    color: #495057;
                    min-width: 120px;
                    display: inline-block;
                }
                .info-value {
                    color: #6c757d;
                }
                .info-row {
                    margin-bottom: 0.75rem;
                }
                .nav-tabs .nav-link.active {
                    border-bottom: 2px solid #0d6efd;
                    color: #0d6efd;
                }
                .nav-tabs .nav-link {
                    color: #6c757d;
                }
                .activity-item {
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 0.75rem;
                    font-size: 13px;
                }
                .activity-icon {
                    margin-right: 0.5rem;
                    color: #fff;
                    border-radius: 50%;
                    padding: 0.4rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .activity-icon.add {
                    background-color: #28a745;
                }
                .activity-icon.update {
                    background-color: #007bff;
                }
                .activity-icon.delete {
                    background-color: #f54242ff;
                }
                .list-group-item:hover {
                    background-color: #f8f9fa;
                }
                .min-w-650 {
                  min-width: 650px;
                }
                .no-records-icon {
                      font-size: 3rem; 
                      margin-bottom: 1rem;
                      color: #ccc; 
                  }
                  .no-records h4 {
                      font-size: 1.5rem; 
                      margin-bottom: 0.5rem;
                      font-weight: 500; 
                  }
                  .no-records p {
                      font-size: 1rem;
                      color: #aaa; 
                  }
                `}
            </style>
            <Container className="mt-4">
                <Card className="shadow rounded">
                    <Card.Body>
                        <Container className="mb-4">
                            <Row className="align-items-center mb-3">
                                <Col>
                                    <h1 className="h3 fw-semibold d-flex align-items-center">
                                        <FaUser size={24} className="me-2" />
                                        {username}
                                    </h1>
                                </Col>
                                <Col xs="auto">
                                    <Button variant="success" className="me-2" onClick={handleShowEditModal}>
                                        <FaUserEdit size={16} className="me-1" />
                                        Edit
                                    </Button>
                                    <Button variant="primary" href="/logindetails">
                                        <FaLock size={16} className="me-1" />
                                        Login Details
                                    </Button>
                                </Col>
                            </Row>
                        </Container>

                        <Container>
                            <Row className="g-4 align-items-start">
                                <Col lg={4} md={12}>
                                    <Card className="shadow-lg rounded border-0 h-100">
                                        <Card.Body className="d-flex flex-column text-center">
                                            <div className="profile-avatar mb-3">
                                                <FaUser size={60} color="#6c757d" />
                                            </div>
                                            <div className="d-flex justify-content-center mb-3">
                                                <Button variant="success" size="sm" className="me-2">
                                                    <FaUpload size={16} className="me-1" />
                                                    Upload Picture
                                                </Button>
                                                <Button variant="outline-danger" size="sm">
                                                    <FaTrashAlt size={16} className="me-1" />
                                                </Button>
                                            </div>
                                            <div className="mt-auto text-start">
                                                <p className="mb-1"><span className="info-label">Username :</span> {username}</p>
                                                <p className="mb-1"><span className="info-label">Contact Number :</span></p>
                                                <p className="mb-1"><span className="info-label">Email :</span> {email}</p>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>

                                <Col lg={8} md={12}>
                                    <Card className="shadow-lg rounded border-0 h-100 min-w-650">
                                        <Card.Body>
                                            <Tab.Container id="user-profile-tabs" activeKey={key} onSelect={(k) => setKey(k)}>
                                                <Nav variant="tabs" className="mb-3">
                                                    <Nav.Item>
                                                        <Nav.Link eventKey="workDetails">
                                                            <FaBriefcase size={16} className="me-1" />
                                                            Work Details
                                                        </Nav.Link>
                                                    </Nav.Item>
                                                    <Nav.Item>
                                                        <Nav.Link eventKey="userActivityLog">
                                                            <FaChartLine size={16} className="me-1" />
                                                            User Activity Log
                                                        </Nav.Link>
                                                    </Nav.Item>
                                                </Nav>
                                                <Tab.Content>
                                                    <Tab.Pane eventKey="workDetails" className="shadow-lg rounded p-4 border-0">
                                                        <h6 className="fw-semibold mb-3">Basic Info</h6>
                                                        <hr />
                                                        <Row className="info-row">
                                                            <Col md={6}>
                                                                <p className="mb-0"><span className="info-label">Name :</span> <span className="info-value">{username}</span></p>
                                                            </Col>
                                                            <Col md={6}>
                                                                <p className="mb-0"><span className="info-label">Gender :</span> <span className="info-value"></span></p>
                                                            </Col>
                                                        </Row>
                                                        <Row className="info-row">
                                                            <Col md={6}>
                                                                <p className="mb-0"><span className="info-label">Role :</span> <span className="info-value">{department}</span></p>
                                                            </Col>
                                                            <Col md={6}>
                                                                <p className="mb-0"><span className="info-label">Blood Group :</span> <span className="info-value"></span></p>
                                                            </Col>
                                                        </Row>
                                                        <Row className="info-row">
                                                            <Col md={6}>
                                                                <p className="mb-0"><span className="info-label">Locale :</span> <span className="info-value">en</span></p>
                                                            </Col>
                                                            <Col md={6}>
                                                                <p className="mb-0"><span className="info-label">Birth Date :</span> <span className="info-value"></span></p>
                                                            </Col>
                                                        </Row>
                                                        <Row className="info-row">
                                                            <Col md={6}>
                                                                <p className="mb-0"><span className="info-label">Present Address :</span> <span className="info-value"></span></p>
                                                            </Col>
                                                            <Col md={6}>
                                                                <p className="mb-0"><span className="info-label">Time Zone :</span> <span className="info-value">Mumbai</span></p>
                                                            </Col>
                                                        </Row>
                                                        <Row className="info-row">
                                                            <Col md={6}>
                                                                <p className="mb-0"><span className="info-label">Permanent Address :</span> <span className="info-value"></span></p>
                                                            </Col>
                                                        </Row>
                                                    </Tab.Pane>
                                                    <Tab.Pane eventKey="userActivityLog" className="shadow-lg rounded p-4 border-0">
                                                        <h6 className="fw-semibold mb-3">Recent Activities</h6>
                                                        {loadingActivities ? (
                                                            <p className="text-center text-muted">Loading recent activities...</p>
                                                        ) : errorActivities ? (
                                                            <p className="text-center text-danger">{errorActivities}</p>
                                                        ) : activities.length > 0 ? (
                                                            <div className="list-group">
                                                                {activities.map((activity) => (
                                                                    <div key={activity.id} className="list-group-item list-group-item-action activity-item">
                                                                        <span className={`activity-icon ${getIconClass(activity.action_type)}`}>
                                                                            {getActionIcon(activity.action_type)}
                                                                        </span>
                                                                       {userid === activity.userId ? (
                                                                            // If current user, prepend "You"
                                                                            `You ${activity.description}`
                                                                        ) : (
                                                                            // If another user, prepend their username
                                                                            `${activity.username} ${activity.description}`
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                           // --- No Records Found Design ---
                                                            <div className="text-center no-records">
                                                                  <FaClipboardList className="no-records-icon" />
                                                                  <h4>No Recent Activities Found</h4>
                                                                  <p className="text-muted">It looks like there are no recent activities to display yet.</p>
                                                              </div>
                                                        )}
                                                    </Tab.Pane>
                                                </Tab.Content>
                                            </Tab.Container>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Container>
                    </Card.Body>
                </Card>
            </Container>

            {/* Edit User Modal */}
            <EditUserModal
                show={showEditModal}
                handleClose={handleCloseEditModal}
                username={username}
                department={department}
            />
        </>
    );
}

export default MyProfile;