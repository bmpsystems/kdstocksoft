import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import Swal from 'sweetalert2';
// import SHA256 from 'crypto-js/sha256';

function Login() {

  const [username, setUsername] = useState('');
  const [stage, setStage] = useState('EMAIL'); // 'EMAIL', 'OTP', or 'RESET'
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResult, setForgotResult] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // New states for password reset
  const [showResetFields, setShowResetFields] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetUserDept, setResetUserDept] = useState(null);
  const [error, setError] = useState('');
  // State for password visibility

  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  var userDepartment = null;
  
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post('http://localhost:5000/login', {
        username: username.trim(),
        // password: SHA256(password).toString(),
        password: password,
        // department: null
      });

      localStorage.setItem('username', res.data.user.username);
      localStorage.setItem('department', res.data.user.department);
      localStorage.setItem('name', res.data.user.name);
      userDepartment = res.data.user.department

      localStorage.setItem('user', JSON.stringify(res.data.user));
      const token = res.data.token;
      // Save token for future use (e.g., protected routes)
      localStorage.setItem('token', token);

      navigate('/dashboard');

      Swal.fire({
        icon: 'success',
        title: 'Login Successful',
        text: 'Welcome back!',
        confirmButtonText: 'Continue',
        confirmButtonColor: '#3085d6'
      });

      setError(''); // Clear any previous error

    } catch (err) {
      if (err.response?.data?.message?.startsWith('Registration')) {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: 'Registration approval under process',
          confirmButtonText: 'Try Again',
          confirmButtonColor: '#d33'
        });
      }
      else {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: 'Invalid username or password. Please try again.',
          confirmButtonText: 'Try Again',
          confirmButtonColor: '#d33'
        });
      }
    }
  };

  // console.log(userDepartment);

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      Swal.fire({
        icon: 'error',
        title: 'Sign Up Failed',
        text: 'Username is required.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33'
      });
      return;
    }

    // Step 1: Generate temporary password client-side
    const tempPassword = Math.random().toString(36).slice(-8);

    // Step 2: Ask for confirmation
    const result = await Swal.fire({
      icon: 'info',
      title: 'Confirm Account Creation',
      html: `<div>
               <span style="color:#888;font-size:0.95em;">(An email will be sent to <b>${trimmedUsername}</b> with these details.)</span>
             </div>`,
      confirmButtonText: 'Create User',
      confirmButtonColor: '#3085d6',
      showCancelButton: true,
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    // Show loading popup
    Swal.fire({
      title: 'Creating user...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {

      const res = await axios.post('http://localhost:5000/newuser', {
        username: trimmedUsername,
        tempPassword,
        department: null
      });

      Swal.fire({
        icon: 'success',
        title: 'User Created!',
        html: `<b>User Account has been created successfully.<br/>
               An email has been sent to <b>${res.data.username}</b> with login details.<br/>
               Please contact admin for approval.`,
        confirmButtonColor: '#3085d6'
      });

      // Reset state
      setUsername('');
      setPassword('');
      setIsSignUp(false);
      setError('');
    } catch (err) {
      let errorMsg = 'Could not create user. Please try again.';
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Sign Up Failed',
        text: errorMsg,
        confirmButtonColor: '#d33'
      });
    }
  };

  // Handle forgot password submit
  const handleForgotSubmit = async (e) => {

    e.preventDefault();
    setForgotResult('');
    setForgotLoading(true);
    setShowResetFields(false);
    setResetError('');
    setResetSuccess('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetUserDept(null);

    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail) {
      setForgotResult('Please enter your email address.');
      setForgotLoading(false);
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/check-user-exists', {
        username: trimmedEmail
      });

      if (res.data.exists) {
        setForgotResult('User exists. Please set your new password.');
        setResetUserDept(res.data.dept_Id); // ✅ Store dept_Id in state
        setShowResetFields(true);
        setStage('OTP');
      } else {
        setShowResetFields(false);
        Swal.fire({
          icon: 'error',
          title: 'Email not registered. Create an account to get started.',
          confirmButtonText: 'Try Again',
          confirmButtonColor: '#d33'
        });
      }

    } catch (err) {
      setForgotResult('Error checking user. Please try again.');
      setShowResetFields(false);
    }

    setForgotLoading(false);
  };

  const handleVerifyOtp = async () => {
    const res = await axios.post('http://localhost:5000/verify-otp', {
      username: forgotEmail.trim(),
      otp
    });
    if (res.data.verified == true) {
      setStage('RESET');
      setOtpError('');
    } else {
      setOtpError('Invalid or expired OTP.');
    }
  };

  // Handle password reset submit
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const email = forgotEmail.trim();

    // Validation
    if (!resetNewPassword || !resetConfirmPassword) {
      setResetError('Both password fields are required.');
      return;
    }

    if (resetNewPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    try {
      await axios.post('http://localhost:5000/reset-password', {
        Username: email,
        OldPassword: '', // No old password required for forgot flow
        NewPassword: resetNewPassword,
        Department: resetUserDept
      });

      setResetSuccess('Password updated successfully. You can now log in.');
      setShowResetFields(false);
      setForgotResult('');
      setForgotEmail('');

      setTimeout(() => {
        setIsForgot(false);
        setResetSuccess('');
      }, 2000);

    } catch (err) {
      let msg = 'Failed to update password. Please try again.';
      if (err?.response?.data?.error) {
        msg = err.response.data.error;
      } else if (err?.message) {
        msg = err.message;
      }
      setResetError(msg);
    }
  };

  // Back button handler
  const handleBack = () => {
    // If on forgot or signup, go back to login
    if (isSignUp) {
      setIsSignUp(false);
      setError('');
      setPassword('');
    } else if (isForgot) {
      setIsForgot(false);
      setForgotEmail('');
      setForgotResult('');
      setError('');
      setPassword('');
      setShowResetFields(false);
      setResetError('');
      setResetSuccess('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setStage('EMAIL');
    } else {
      // If already on login, go to home page (or previous page)
      navigate('/');
    }
  };

  // Back button style
  const backButtonStyle = {
    position: 'absolute',
    top: 20,
    left: 20,
    background: 'none',
    border: 'none',
    color: '#00d6ab',
    fontSize: '1.2em',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    zIndex: 10,
    padding: 0,
  };

  // Eye icon SVGs
  const EyeIcon = ({ open }) => (
    open ? (
      // Eye open
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <path d="M1 12C1 12 5 5 12 5C19 5 23 12 23 12C23 12 19 19 12 19C5 19 1 12 1 12Z" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="3.5" stroke="#888" strokeWidth="2"/>
      </svg>
    ) : (
      // Eye closed
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <path d="M17.94 17.94C16.13 19.25 14.13 20 12 20C5 20 1 12 1 12C2.23 9.91 3.91 8.09 5.94 6.94M9.53 4.59C10.33 4.21 11.16 4 12 4C19 4 23 12 23 12C22.37 13.09 21.62 14.09 20.78 14.97M1 1L23 23" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  );

  return (
    <div className="login-container" style={{ position: 'relative' }}>
      {/* Back Button */}
      <button
        type="button"
        style={backButtonStyle}
        onClick={handleBack}
        aria-label="Back"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 20 20"
          fill="none"
          style={{ marginRight: 6 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12.5 16L7.5 10L12.5 4" stroke="#00d6ab" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>

      <div className="right-panel">
        <img src="/login.png" alt="Login visual" className="login-image" />
      </div>

      <div className="left-panel">
        <h1 style={{ color: '#00d6ab' }}><center>Client-Stock Management Software</center></h1>
        <h2>
          {isSignUp
            ? 'Sign Up'
            : isForgot
              ? 'Forgot Password'
              : 'Log in'}
        </h2>
        <p>
          {isSignUp
            ? 'Welcome New User'
            : isForgot
              ? 'Enter your email address to check if your account exists.'
              : 'Welcome back!'}
        </p>
        {!isForgot ? (
          <form onSubmit={isSignUp ? handleSignUpSubmit : handleLoginSubmit}>
            <input
              type="email"
              placeholder="Email Address"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '96%' }}
              autoComplete="username"
              pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
              title="Please enter a valid email address"
            />
            {!isSignUp && (
              <div style={{ position: 'relative', width: '96%' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', paddingRight: '38px' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    height: '28px',
                    width: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            )}
            <button type="submit" style={{ color: 'black' }}>
              {isSignUp ? 'Sign up' : 'Sign in'}
            </button>
            {error && <p className="error">{error}</p>}
          </form>
        ) : (
          <div>
            {stage === 'EMAIL' && (
              <form onSubmit={handleForgotSubmit}>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  style={{ width: '96%' }}
                  autoComplete="username"
                  pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                  title="Please enter a valid email address"
                />
                <button type="submit" style={{ color: 'black', marginTop: '10px' }} disabled={forgotLoading}>
                  {forgotLoading ? 'Checking...' : 'Submit'}
                </button>
                {forgotResult && (
                  <p className="success" style={{ marginTop: '10px' }}>{forgotResult}</p>
                )}
              </form>
            )}

            {stage === 'OTP' && (
              <>
                <input
                  type="text"
                  placeholder="Enter the 6-digit OTP sent to your email"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{ width: '96%', marginTop: '10px' }}
                />
                <button onClick={handleVerifyOtp} style={{ color: 'black', marginTop: '10px' }}>
                  Verify OTP
                </button>
                {otpError && <p className="error" style={{ marginTop: '10px' }}>{otpError}</p>}
              </>
            )}

            {stage === 'RESET' && (
              <form onSubmit={handleResetPasswordSubmit} style={{ marginTop: '16px' }}>
                <input
                  type="password"
                  placeholder="New Password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  required
                  style={{ width: '96%' }}
                  minLength={6}
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  required
                  style={{ width: '96%', marginTop: '8px' }}
                  minLength={6}
                  autoComplete="new-password"
                />
                <button type="submit" style={{ color: 'black', marginTop: '10px' }}>
                  Reset Password
                </button>
                {resetError && (
                  <p className="error" style={{ marginTop: '10px' }}>{resetError}</p>
                )}
                {resetSuccess && (
                  <p className="success" style={{ marginTop: '10px' }}>{resetSuccess}</p>
                )}
              </form>
            )}
          </div>
        )}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          {!isSignUp && !isForgot && (
            <div style={{ marginBottom: '8px' }}>
              <span
                style={{ color: '#00d6ab', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => {
                  setIsForgot(true);
                  setForgotEmail('');
                  setForgotResult('');
                  setError('');
                  setPassword('');
                  setShowResetFields(false);
                  setResetError('');
                  setResetSuccess('');
                  setResetNewPassword('');
                  setResetConfirmPassword('');
                }}
              >
                Forgot Password?
              </span>
            </div>
          )}
          {!isSignUp && !isForgot ? (
            <span>
              New user?{' '}
              <span
                style={{ color: '#00d6ab', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => {
                  setIsSignUp(true);
                  setError('');
                  setPassword('');
                }}
              >
                Create New Account
              </span>
            </span>
          ) : isSignUp ? (
            <span>
              <span
                style={{ color: '#00d6ab', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => {
                  setIsSignUp(false);
                  setError('');
                  setPassword('');
                }}
              >
                Log in
              </span>
            </span>
          ) : (
            <span>
              <span
                style={{ color: '#00d6ab', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => {
                  setIsForgot(false);
                  setForgotEmail('');
                  setForgotResult('');
                  setError('');
                  setPassword('');
                  setShowResetFields(false);
                  setResetError('');
                  setResetSuccess('');
                  setResetNewPassword('');
                  setResetConfirmPassword('');
                  setStage('EMAIL');
                }}
              >
                Back to Log in
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
