import React, { useState, useEffect } from 'react';

// Bootstrap CSS CDN - This will be loaded in the browser environment
// No direct import needed in React component code for CDN.
// For demonstration, assume Bootstrap CSS is available globally.

// HomePage Component (now handles redirection for login/signup)
const HomePage = () => {
  // Function to simulate redirection
  const redirectToLoginPage = () => {
    // In a real application, you would use a React Router or similar
    // to navigate to a dedicated login route/component.
    // For this example, we simulate an external redirect.
    window.location.href = '/login'; // This will attempt to redirect the browser
  };

  // For demonstration, we'll assume the user is not logged in
  // as the login state would be managed by the external /login page.
  const isLoggedIn = false; // Always false for this setup
  const username = ''; // No username displayed if not logged in internally

  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm py-3">
        <div className="container">
          <a className="navbar-brand fw-bold text-primary fs-4" href="#">BMP Systems StockMaster</a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center">
              <li className="nav-item mx-2">
                <a className="nav-link text-dark" aria-current="page" href="#">Features</a>
              </li>
              <li className="nav-item mx-2">
                <a className="nav-link text-dark" href="#">Pricing</a>
              </li>
              <li className="nav-item mx-2">
                <a className="nav-link text-dark" href="#">About Us</a>
              </li>
              <li className="nav-item mx-2">
                <a className="nav-link text-dark" href="#">Contact</a>
              </li>
              {/* Conditional rendering based on login status (always false here) */}
              {isLoggedIn ? (
                <>
                  <li className="nav-item mx-2">
                    <span className="navbar-text text-dark">
                      Welcome, <strong className="text-primary">{username}</strong>!
                    </span>
                  </li>
                  <li className="nav-item ms-3">
                    {/* This button would typically log out and redirect */}
                    <button className="btn btn-outline-primary rounded-pill px-4" onClick={redirectToLoginPage}>Logout</button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item ms-3">
                    <button className="btn btn-outline-primary rounded-pill px-4" onClick={redirectToLoginPage}>Login</button>
                  </li>
                  <li className="nav-item ms-2">
                    <button className="btn btn-primary rounded-pill px-4" onClick={redirectToLoginPage}>Book a Demo</button>
                  </li>
                  <li className="nav-item ms-2">
                    <button className="btn btn-outline-secondary rounded-pill px-4" onClick={redirectToLoginPage}>Free Signup</button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="bg-primary text-white py-5 py-md-5 text-center" style={{ background: 'linear-gradient(to right, #2ac37bff, #1c8e64ff)', minHeight: '450px', display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <h1 className="display-4 fw-bold mb-4">Streamline Your Inventory with BMP Systems StockMaster</h1>
              <p className="lead mb-5">
                Powerful and intuitive inventory management software designed to optimize your stock, reduce costs, and boost efficiency.
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <button className="btn btn-light btn-lg rounded-pill px-5 py-3 fw-bold" onClick={redirectToLoginPage}>Get Started Now</button>
                <button className="btn btn-outline-light btn-lg rounded-pill px-5 py-3 fw-bold">Learn More</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <h2 className="text-center mb-5 text-secondary fw-bold">Key Features for Smarter Inventory</h2>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {/* Feature Card 1 */}
            <div className="col">
              <div className="card h-100 border-0 shadow-sm rounded-lg p-4 text-center">
                <div className="card-body">
                  <div className="icon-circle bg-primary text-white mx-auto mb-4" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                    📦
                  </div>
                  <h5 className="card-title fw-bold mb-3 text-dark">Real-time Stock Tracking</h5>
                  <p className="card-text text-muted">
                    Monitor inventory levels across multiple locations instantly, preventing stockouts and overstocking.
                  </p>
                </div>
              </div>
            </div>
            {/* Feature Card 2 */}
            <div className="col">
              <div className="card h-100 border-0 shadow-sm rounded-lg p-4 text-center">
                <div className="card-body">
                  <div className="icon-circle bg-success text-white mx-auto mb-4" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                    📈
                  </div>
                  <h5 className="card-title fw-bold mb-3 text-dark">Automated Reordering</h5>
                  <p className="card-text text-muted">
                    Set up automated alerts and reorder points to ensure optimal stock levels at all times.
                  </p>
                </div>
              </div>
            </div>
            {/* Feature Card 3 */}
            <div className="col">
              <div className="card h-100 border-0 shadow-sm rounded-lg p-4 text-center">
                <div className="card-body">
                  <div className="icon-circle bg-info text-white mx-auto mb-4" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                    📊
                  </div>
                  <h5 className="card-title fw-bold mb-3 text-dark">Comprehensive Reporting</h5>
                  <p className="card-text text-muted">
                    Gain valuable insights with detailed reports on sales, inventory turnover, and profitability.
                  </p>
                </div>
              </div>
            </div>
            {/* Feature Card 4 */}
            <div className="col">
              <div className="card h-100 border-0 shadow-sm rounded-lg p-4 text-center">
                <div className="card-body">
                  <div className="icon-circle bg-danger text-white mx-auto mb-4" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                    🛒
                  </div>
                  <h5 className="card-title fw-bold mb-3 text-dark">Order Management</h5>
                  <p className="card-text text-muted">
                    Efficiently process customer orders, manage shipments, and track delivery status.
                  </p>
                </div>
              </div>
            </div>
            {/* Feature Card 5 */}
            <div className="col">
              <div className="card h-100 border-0 shadow-sm rounded-lg p-4 text-center">
                <div className="card-body">
                  <div className="icon-circle bg-warning text-white mx-auto mb-4" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                    🔗
                  </div>
                  <h5 className="card-title fw-bold mb-3 text-dark">Multi-Location Support</h5>
                  <p className="card-text text-muted">
                    Manage inventory across multiple warehouses or retail stores from a single dashboard.
                  </p>
                </div>
              </div>
            </div>
            {/* Feature Card 6 */}
            <div className="col">
              <div className="card h-100 border-0 shadow-sm rounded-lg p-4 text-center">
                <div className="card-body">
                  <div className="icon-circle bg-secondary text-white mx-auto mb-4" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                    🛡️
                  </div>
                  <h5 className="card-title fw-bold mb-3 text-dark">Secure & Scalable</h5>
                  <p className="card-text text-muted">
                    Robust security features and scalable architecture to grow with your business needs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-5 bg-light text-center">
        <div className="container">
          <h2 className="mb-4 text-secondary fw-bold">Ready to Transform Your Inventory?</h2>
          <p className="lead mb-4 text-muted">
            Join thousands of businesses that trust BMP Systems StockMaster for their inventory needs.
          </p>
          <button className="btn btn-primary btn-lg rounded-pill px-5 py-3 fw-bold" onClick={redirectToLoginPage}>Request a Free Demo</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer bg-dark text-white py-4">
        <div className="container text-center">
          <p className="mb-0">&copy; 2025 BMP Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

// Main App Component
const Home = () => {
   // Effect to load Bootstrap CSS and JS
  useEffect(() => {
    // Removed dynamic loading of Bootstrap CSS, JS, and Inter font
    // as per user's request. Assumed to be handled externally.
    return () => {
      // No cleanup needed if nothing was appended
    };
  }, []);

  return (
    <HomePage />
  );
};

export default Home;
