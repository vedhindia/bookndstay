import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { setupAxiosInterceptor } from './utils/auth';
import { API_BASE_URL, AUTH_ENDPOINTS } from './config';

const AdminLogin = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    // Setup axios interceptor for admin authentication
    setupAxiosInterceptor(axios);
    
    // Check if admin is already logged in
    const token = localStorage.getItem("adminToken");
    const user = localStorage.getItem("adminUser");
    
    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        const role = (parsedUser.role || '').toUpperCase();
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          navigate("/dashboard");
        }
      } catch (error) {
        // Clear invalid stored data
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (registrationSuccess) {
      const timer = setTimeout(() => {
        setRegistrationSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [registrationSuccess]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear general error when user makes changes
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Additional validation for sign up
    if (isSignUp) {
      if (!formData.full_name) {
        newErrors.full_name = 'Full name is required';
      } else if (formData.full_name.trim().length < 2) {
        newErrors.full_name = 'Full name must be at least 2 characters long';
      }

      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else {
        // More flexible phone validation
        const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
        if (!phonePattern.test(cleanPhone)) {
          newErrors.phone = 'Please enter a valid phone number';
        }
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      if (isSignUp) {
        // Admin Registration
        console.log("Attempting admin registration...");
        console.log("API URL:", `${API_BASE_URL}${AUTH_ENDPOINTS.REGISTER}`);
        console.log("Registration data:", {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone
        });

        const registrationData = {
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          phone: formData.phone.replace(/[\s\-\(\)]/g, '') // Clean phone number
        };

        const response = await axios.post(
          `${API_BASE_URL}${AUTH_ENDPOINTS.REGISTER}`, 
          registrationData,
          {
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "X-Skip-Auth": "true"
            },
            skipAuth: true,
            timeout: 10000 // 10 seconds timeout
          }
        );

        console.log("Registration response:", response.data);
        
        if (response.data && response.data.message) {
          const { message, admin, token } = response.data; // Changed from 'user' to 'admin'
          console.log("Admin registration successful:", message);
          
          if (token && admin) {
            // Store token and admin info immediately after registration
            localStorage.setItem("adminToken", token);
            localStorage.setItem("adminUser", JSON.stringify(admin));
            
            // Set axios default header for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Redirect to dashboard directly
            navigate("/dashboard");
          } else {
            // Show success message and switch to login
            setRegistrationSuccess(true);
            setIsSignUp(false);
            setFormData({
              email: formData.email,
              password: '',
              full_name: '',
              phone: ''
            });
          }
        }
      } else {
        // Admin Login
        console.log("Attempting admin login...");
        console.log("API URL:", `${API_BASE_URL}${AUTH_ENDPOINTS.LOGIN}`);
        console.log("Login data:", { email: formData.email });

        const loginData = {
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        };

        const response = await axios.post(
          `${API_BASE_URL}${AUTH_ENDPOINTS.LOGIN}`,
          loginData,
          {
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "X-Skip-Auth": "true"
            },
            skipAuth: true,
            timeout: 10000 // 10 seconds timeout
          }
        );

        console.log("Login response:", response.data);

        if (response.data && response.status === 200) {
          const { token, admin, message } = response.data; // Changed from 'user' to 'admin'

          if (!token || !admin) {
            throw new Error("Invalid response format from server");
          }

          console.log("Login successful:", message);
          console.log("Admin data:", admin);

          // Verify admin role
          const role = (admin.role || '').toUpperCase();
          console.log("Admin role:", role);
          
          if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            setErrors({
              general: "Access denied. Admin privileges required."
            });
            return;
          }

          // Store token and admin info
          localStorage.setItem("adminToken", token);
          localStorage.setItem("adminUser", JSON.stringify(admin));
          
          // Set axios default header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          console.log("Redirecting to dashboard...");

          // Add a small delay to ensure state is properly set
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 100);
        }
      }
    } catch (error) {
      console.error(`Admin ${isSignUp ? 'registration' : 'login'} failed:`, error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      
      let errorMessage = `${isSignUp ? 'Registration' : 'Login'} failed. Please try again.`;
      
      if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data;
        
        switch (status) {
          case 400:
            if (responseData?.message) {
              errorMessage = responseData.message;
            } else if (responseData?.error) {
              errorMessage = responseData.error;
            } else {
              errorMessage = 'Invalid request data. Please check your inputs.';
            }
            break;
          case 401:
            errorMessage = isSignUp 
              ? 'Invalid registration credentials.' 
              : 'Invalid email or password. Please check your credentials.';
            break;
          case 403:
            errorMessage = isSignUp 
              ? 'Registration not allowed. Please contact administrator.' 
              : 'Access denied. Admin privileges required.';
            break;
          case 404:
            errorMessage = isSignUp 
              ? 'Registration service not available.' 
              : 'Admin account not found. Please check your email.';
            break;
          case 409:
            errorMessage = 'Email already exists. Please use a different email address.';
            break;
          case 422:
            if (responseData?.message) {
              errorMessage = responseData.message;
            } else {
              errorMessage = 'Validation failed. Please check your inputs.';
            }
            break;
          case 500:
            errorMessage = 'Server error. Please try again later or contact support.';
            break;
          default:
            if (responseData?.message) {
              errorMessage = responseData.message;
            } else if (responseData?.error) {
              errorMessage = responseData.error;
            }
        }
      } else if (error.request) {
        errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timeout. Please try again.";
      }
      
      setErrors({
        general: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({});
    setFormData({
      email: '',
      password: '',
      full_name: '',
      phone: ''
    });
    setRegistrationSuccess(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .login-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          overflow: hidden;
        }

        .login-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><radialGradient id="a" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(255,255,255,0.1)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle cx="200" cy="200" r="100" fill="url(%23a)"/><circle cx="800" cy="300" r="150" fill="url(%23a)"/><circle cx="300" cy="700" r="120" fill="url(%23a)"/><circle cx="900" cy="800" r="80" fill="url(%23a)"/></svg>');
          animation: float 20s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        .login-card {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
          transform: ${mounted ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.9)'};
          opacity: ${mounted ? 1 : 0};
          transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .logo-container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin: 0 auto;
          position: relative;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); }
          100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
        }

        .form-group {
          position: relative;
          margin-bottom: 1.5rem;
        }

        .form-control-modern {
          border: 2px solid #e1e5e9;
          border-radius: 12px;
          padding: 16px 20px;
          font-size: 16px;
          background: rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .form-control-modern:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1), 0 4px 20px rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 1);
          transform: translateY(-2px);
          outline: none;
        }

        .input-icon {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
          transition: all 0.3s ease;
          z-index: 10;
        }

        .form-control-modern:focus + .input-icon,
        .form-control-modern:not(:placeholder-shown) + .input-icon {
          color: #667eea;
          transform: translateY(-50%) scale(1.1);
        }

        .btn-modern {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-weight: 600;
          font-size: 16px;
          color: white;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .btn-modern::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .btn-modern:hover::before {
          left: 100%;
        }

        .btn-modern:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }

        .btn-modern:active {
          transform: translateY(0);
        }

        .btn-modern:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .password-toggle {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 10;
        }

        .password-toggle:hover {
          color: #667eea;
          transform: translateY(-50%) scale(1.1);
        }

        .password-toggle:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .floating-label {
          position: absolute;
          left: 60px;
          top: 18px;
          font-size: 16px;
          color: #6c757d;
          pointer-events: none;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.9);
          padding: 0 8px;
        }

        .form-control-modern:focus ~ .floating-label,
        .form-control-modern:not(:placeholder-shown) ~ .floating-label {
          top: -8px;
          font-size: 12px;
          color: #667eea;
          font-weight: 500;
        }

        .error-alert {
          background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
          color: white;
          border: none;
          border-radius: 12px;
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .success-alert {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          border: none;
          border-radius: 12px;
          animation: slideDown 0.5s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .spinner-modern {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .footer-text {
          color: rgba(255, 255, 255, 0.8);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .checkbox-modern {
          width: 20px;
          height: 20px;
          accent-color: #667eea;
        }

        .link-modern {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s ease;
          position: relative;
        }

        .link-modern::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background: #667eea;
          transition: width 0.3s ease;
        }

        .link-modern:hover::after {
          width: 100%;
        }

        .link-modern:hover {
          color: #764ba2;
        }
      `}</style>

      <div className="login-container d-flex align-items-center justify-content-center">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-6 mt-4">
              <div className="login-card p-2 p-md-5 rounded-4">
                {/* Logo Section */}
                <div className="text-center mb-5">
                  <div className="logo-container mb-4">
                    <i className="bi bi-shield-lock" style={{fontSize: '32px', color: 'white'}}></i>
                  </div>
                  <h1 className="fw-bold mb-2" style={{color: '#2d3748', fontSize: '2rem'}}>
                    {isSignUp ? 'Create Admin Account' : 'Welcome Back'}
                  </h1>
                  <p className="text-muted mb-0" style={{fontSize: '1.1rem'}}>
                    {isSignUp ? 'Register a new admin user' : 'Sign in to your admin dashboard'}
                  </p>
                </div>

                {/* Error Alert */}
                {errors.general && (
                  <div className="error-alert alert d-flex align-items-center mb-4">
                    <i className="bi bi-exclamation-triangle-fill me-3"></i>
                    <span>{errors.general}</span>
                  </div>
                )}

                {/* Success Alert */}
                {registrationSuccess && (
                  <div className="success-alert alert d-flex align-items-center mb-4">
                    <i className="bi bi-check-circle-fill me-3"></i>
                    <span>Registration successful! Please log in with your credentials.</span>
                  </div>
                )}

                {/* Login/Registration Form */}
                <form onSubmit={handleSubmit}>
                  {/* Full Name Field (Sign Up Only) */}
                  {isSignUp && (
                    <div className="form-group">
                      <input
                        type="text"
                        className={`form-control-modern w-100 ${errors.full_name ? 'border-danger' : ''}`}
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        placeholder=" "
                        disabled={isLoading}
                        style={{paddingLeft: '60px'}}
                        autoComplete="name"
                      />
                      <i className="input-icon bi bi-person"></i>
                      <label className="floating-label">Full Name</label>
                      {errors.full_name && (
                        <div className="text-danger mt-2 small fw-medium">
                          <i className="bi bi-exclamation-circle me-1"></i>
                          {errors.full_name}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="form-group">
                    <input
                      type="email"
                      className={`form-control-modern w-100 ${errors.email ? 'border-danger' : ''}`}
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder=" "
                      disabled={isLoading}
                      style={{paddingLeft: '60px'}}
                      autoComplete="email"
                    />
                    <i className="input-icon bi bi-envelope"></i>
                    <label className="floating-label">Email Address</label>
                    {errors.email && (
                      <div className="text-danger mt-2 small fw-medium">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        {errors.email}
                      </div>
                    )}
                  </div>

                  {/* Phone Field (Sign Up Only) */}
                  {isSignUp && (
                    <div className="form-group">
                      <input
                        type="tel"
                        className={`form-control-modern w-100 ${errors.phone ? 'border-danger' : ''}`}
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder=" "
                        disabled={isLoading}
                        style={{paddingLeft: '60px'}}
                        autoComplete="tel"
                      />
                      <i className="input-icon bi bi-telephone"></i>
                      <label className="floating-label">Phone Number</label>
                      {errors.phone && (
                        <div className="text-danger mt-2 small fw-medium">
                          <i className="bi bi-exclamation-circle me-1"></i>
                          {errors.phone}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Password Field */}
                  <div className="form-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`form-control-modern w-100 ${errors.password ? 'border-danger' : ''}`}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder=" "
                      disabled={isLoading}
                      style={{paddingLeft: '60px', paddingRight: '60px'}}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                    />
                    <i className="input-icon bi bi-lock"></i>
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                    <label className="floating-label">Password</label>
                    {errors.password && (
                      <div className="text-danger mt-2 small fw-medium">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        {errors.password}
                      </div>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password (Login Only) */}
                  {!isSignUp && (
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div className="d-flex align-items-center">
                        <input 
                          type="checkbox" 
                          className="checkbox-modern me-2"
                          id="rememberMe"
                          disabled={isLoading}
                        />
                        <label htmlFor="rememberMe" className="text-muted small mb-0">
                          Remember me
                        </label>
                      </div>

                      <div className="mb-3 text-end">
                        <button 
                          type="button" 
                          className="btn btn-link p-0" 
                          style={{color: '#667eea', textDecoration: 'underline'}} 
                          onClick={() => navigate('/forgot-password')}
                          disabled={isLoading}
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn-modern w-100 mb-4"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="d-flex align-items-center justify-content-center">
                        <div className="spinner-modern me-3"></div>
                        <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center justify-content-center">
                        <i className={`bi ${isSignUp ? 'bi-person-plus' : 'bi-arrow-right-circle'} me-2`}></i>
                        <span>{isSignUp ? 'Create Admin Account' : 'Sign In to Dashboard'}</span>
                      </div>
                    )}
                  </button>

                  {/* Toggle between Login and Sign Up */}
                  <div className="text-center mb-4">
                    <p className="text-muted mb-2">
                      {isSignUp ? 'Already have an account?' : 'Need to create an admin account?'}
                    </p>
                    <button
                      type="button"
                      className="btn btn-link p-0 fw-semibold"
                      style={{color: '#667eea', textDecoration: 'none'}}
                      onClick={handleToggleMode}
                      disabled={isLoading}
                    >
                      {isSignUp ? 'Sign In Instead' : 'Create New Admin Account'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="text-center mt-4">
                <p className="footer-text small mb-0">
                  2025 E-Commerce Admin Portal. Crafted with ❤️
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bootstrap CSS & Icons */}
      <link 
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" 
        rel="stylesheet" 
      />
      <link 
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css" 
        rel="stylesheet" 
      />
    </>
  );
};

export default AdminLogin;