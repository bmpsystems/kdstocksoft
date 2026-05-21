import React, { useEffect, useState } from 'react';
import { Card, Button, Row, Col, Container } from "react-bootstrap";
import { FaGoogle, FaMicrosoft, FaLock } from "react-icons/fa";
import { IoArrowBack } from "react-icons/io5";

const LoginDetails = () => {
    const [username, setUsername] = useState('');
    const [department, setDepartment] = useState('');
    const [lastlogin, setLastlogin] = useState('');
    const [fullname, setFullname] = useState('');
    const [email, setEmail] = useState('');
  // Function to format MySQL date strings into a more readable local format
  const formatDate = (mysqlDate) => {
    if (!mysqlDate) return '';
    const date = new Date(mysqlDate);
    return date.toLocaleString();
  };

// useEffect to dynamically load Bootstrap CSS and Inter font
  useEffect(() => {
   const user = JSON.parse(localStorage.getItem('user'));
    const storedUsername = user.username;
    const storedDepartment = user.department;
    const storedLastlogin = user.lastlogin;
    const storedFullname = user.fullname;
    const storedEmail = user.email;

    if (storedUsername) setUsername(storedUsername);
    if (storedDepartment) setDepartment(storedDepartment);
    if (storedLastlogin) setLastlogin(storedLastlogin);
    if (storedFullname) setFullname(storedFullname);
    if (storedEmail) setEmail(storedEmail);
  
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  return (
    <Container className="mt-4">
      <Card className="shadow rounded">
        <Card.Body>
          <Row className="align-items-center mb-3">
            <Col xs="auto">
              <FaLock size={24} className="me-2" />
            </Col>
            <Col>
              <h4 className="mb-0">Login Details</h4>
            </Col>
            <Col xs="auto">
              <Button variant="light" className="border" href="/myprofile">
                <IoArrowBack />
              </Button>
            </Col>
          </Row>

          <div className="mb-3">
            <p><strong>User :</strong> {fullname}</p>
            <p><strong>Username :</strong> {username}</p>
            <p><strong>Email :</strong> {email}</p>
            <p><strong>Last Login On :</strong> {formatDate(lastlogin)} </p>
            <p><strong>Login Provider (Google, Microsoft) :</strong> <span className="text-muted">Not Connected</span></p>
            <p className="text-danger">
              Please use the same email address to login with Google or Microsoft to connect your account.
            </p>

            <Row className="mb-3">
              <Col xs="auto">
                <Button variant="outline-primary" className="d-flex align-items-center">
                  <FaGoogle className="me-2" /> Connect Google
                </Button>
              </Col>
              <Col xs="auto">
                <Button variant="outline-primary" className="d-flex align-items-center">
                  <FaMicrosoft className="me-2" /> Connect Microsoft
                </Button>
              </Col>
            </Row>

            <hr />

            <h5>Password</h5>
            <p className="text-muted">
              You can reset password or set password if you are logged in with Google or Microsoft.
            </p>
            <Button variant="outline-primary" href='/change-password'>Set Password / Reset Password</Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LoginDetails;


