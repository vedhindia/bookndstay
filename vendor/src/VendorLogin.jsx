import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './services/apiClient';
import { saveSession, normalizeUser, isAuthenticated } from './utils/auth';
import { AUTH_ENDPOINTS } from './config';

const VendorLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if vendor is already logged in
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters long';
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
      const loginData = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      const response = await api.post(
        AUTH_ENDPOINTS.LOGIN,
        loginData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Skip-Auth': 'true'
          },
          skipAuth: true,
          timeout: 10000
        }
      );

      if (response.data && response.status === 200) {
        const { token, user, vendor, admin } = response.data;
        const actor = user || vendor || admin || response.data.vendorUser || response.data.data || {};
        if (!token || !actor) throw new Error('Invalid response format from server');

        // Robust role detection
        const possibleRoles = [];
        if (actor?.role) possibleRoles.push(String(actor.role));
        if (actor?.userType) possibleRoles.push(String(actor.userType));
        if (actor?.type) possibleRoles.push(String(actor.type));
        if (Array.isArray(actor?.roles)) {
          possibleRoles.push(...actor.roles.map(String));
        }
        const normalized = possibleRoles.map(r => r.toUpperCase());
        const isVendorish = normalized.some(r =>
          r === 'VENDOR' ||
          r === 'OWNER' ||
          r === 'ADMIN' ||
          r.endsWith('_VENDOR') ||
          r.endsWith('_OWNER') ||
          r.endsWith('_ADMIN') ||
          r.includes('VENDOR') ||
          r.includes('OWNER') ||
          r.includes('ADMIN')
        );

        if (!isVendorish) {
          setErrors({ general: 'Access denied. Vendor/Owner privileges required.' });
          return;
        }

        // Store token and vendor info (normalized)
        const normalizedUser = normalizeUser(actor);
        saveSession(token, normalizedUser);

        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      }
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data;
        switch (status) {
          case 400:
            errorMessage = responseData?.message || responseData?.error || 'Invalid request data.'; 
            break;
          case 401:
            errorMessage = 'Invalid email or password.'; 
            break;
          case 403:
            errorMessage = 'Access denied. Vendor/Owner privileges required.'; 
            break;
          case 404:
            errorMessage = 'Account not found. Please check your email.'; 
            break;
          case 409:
            errorMessage = 'Conflict. Please try different credentials.'; 
            break;
          case 422:
            errorMessage = responseData?.message || 'Validation failed. Please check your inputs.'; 
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.'; 
            break;
          default:
            errorMessage = responseData?.message || responseData?.error || error.message;
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to the server. Please try again.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      }
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsSignUp(false);
    setErrors({});
    setFormData({ email: '', password: '', full_name: '', phone: '' });
    setRegistrationSuccess(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { 
          font-family: 'Inter', system-ui, -apple-system, sans-serif; 
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
        }
        .login-container { 
          min-height: 100vh; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          position: relative; 
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
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
        .container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 15px;
        }
        .row {
          display: flex;
          flex-wrap: wrap;
          margin: 0 -15px;
        }
        .col-12 {
          width: 100%;
          padding: 0 15px;
        }
        .justify-content-center {
          justify-content: center;
        }
        @media (min-width: 576px) {
          .col-sm-10 { width: 83.333333%; }
        }
        @media (min-width: 768px) {
          .col-md-8 { width: 66.666667%; }
        }
        @media (min-width: 992px) {
          .col-lg-6 { width: 50%; }
        }
        @media (min-width: 1200px) {
          .col-xl-6 { width: 50%; }
        }
        .login-card { 
          backdrop-filter: blur(20px); 
          background: rgba(255, 255, 255, 0.95); 
          border: 1px solid rgba(255, 255, 255, 0.2); 
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15); 
          transform: ${mounted ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.9)'}; 
          opacity: ${mounted ? 1 : 0}; 
          transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border-radius: 24px;
          padding: 40px;
          position: relative;
          z-index: 1;
        }
        @media (max-width: 768px) {
          .login-card {
            padding: 20px;
          }
        }
        .logo-container { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          width: 80px; 
          height: 80px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          border-radius: 50%; 
          margin: 0 auto 20px; 
          position: relative; 
          animation: pulse 2s ease-in-out infinite; 
        }
        @keyframes pulse { 
          0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); } 
          70% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); } 
          100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); } 
        }
        .text-center { text-align: center; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 1rem; }
        .mb-4 { margin-bottom: 1.5rem; }
        .mb-5 { margin-bottom: 3rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-4 { margin-top: 1.5rem; }
        .me-2 { margin-right: 0.5rem; }
        .me-3 { margin-right: 1rem; }
        .p-0 { padding: 0; }
        .p-2 { padding: 0.5rem; }
        .fw-bold { font-weight: 700; }
        .fw-medium { font-weight: 500; }
        .text-muted { color: #6c757d; }
        .text-danger { color: #dc3545; }
        h1 {
          color: #2d3748;
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 0.5rem;
        }
        p {
          margin: 0;
          font-size: 1.1rem;
        }
        .form-group { 
          position: relative; 
          margin-bottom: 1.5rem; 
        }
        .form-control-modern { 
          width: 100%;
          border: 2px solid #e1e5e9; 
          border-radius: 12px; 
          padding: 16px 20px; 
          font-size: 16px; 
          background: rgba(255, 255, 255, 0.8); 
          transition: all 0.3s ease; 
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          outline: none;
        }
        .form-control-modern:focus { 
          border-color: #667eea; 
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1), 0 4px 20px rgba(0, 0, 0, 0.1); 
          background: rgba(255, 255, 255, 1); 
          transform: translateY(-2px); 
        }
        .form-control-modern:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .border-danger {
          border-color: #dc3545 !important;
        }
        .input-icon { 
          position: absolute; 
          left: 20px; 
          top: 50%; 
          transform: translateY(-50%); 
          color: #6c757d; 
          transition: all 0.3s ease; 
          z-index: 10;
          font-size: 18px;
        }
        .form-control-modern:focus + .input-icon, 
        .form-control-modern:not(:placeholder-shown) + .input-icon { 
          color: #667eea; 
          transform: translateY(-50%) scale(1.1); 
        }
        .btn-modern { 
          width: 100%;
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
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-modern:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        .btn-modern:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .error-alert { 
          background: #fdeaea; 
          color: #b42318; 
          border: 1px solid #f1aeb5; 
          border-radius: 10px; 
          padding: 12px 14px;
          display: flex;
          align-items: center;
        }
        .success-alert {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
        }
        .alert {
          margin-bottom: 1.5rem;
        }
        .password-toggle { 
          position: absolute; 
          right: 16px; 
          top: 50%; 
          transform: translateY(-50%); 
          background: transparent; 
          border: none; 
          padding: 6px; 
          color: #6c757d;
          cursor: pointer;
          font-size: 18px;
        }
        .password-toggle:hover {
          color: #667eea;
        }
        .floating-label { 
          position: absolute; 
          left: 60px; 
          top: -10px; 
          background: white; 
          padding: 0 6px; 
          font-size: 12px; 
          color: #667eea;
          font-weight: 500;
        }
        .checkbox-modern { 
          width: 18px; 
          height: 18px; 
          border-radius: 4px; 
          border: 2px solid #e1e5e9;
          cursor: pointer;
        }
        .spinner-modern { 
          width: 18px; 
          height: 18px; 
          border: 3px solid rgba(255,255,255,.3); 
          border-top: 3px solid #fff; 
          border-radius: 50%; 
          animation: spin .8s linear infinite; 
        }
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }
        .d-flex {
          display: flex;
        }
        .align-items-center {
          align-items: center;
        }
        .justify-content-center {
          justify-content: center;
        }
        .justify-content-between {
          justify-content: space-between;
        }
        .w-100 {
          width: 100%;
        }
        .btn-link {
          background: transparent;
          border: none;
          color: #667eea;
          text-decoration: underline;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-link:hover:not(:disabled) {
          color: #764ba2;
        }
        .btn-link:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .small {
          font-size: 14px;
        }
        .text-end {
          text-align: right;
        }
        label {
          cursor: pointer;
        }
        .footer-text {
          color: rgba(255, 255, 255, 0.9);
          font-weight: 300;
        }
        .bi::before {
          display: inline-block;
          font-family: 'bootstrap-icons';
          font-style: normal;
          font-weight: normal;
          line-height: 1;
          vertical-align: -0.125em;
        }
        .bi-shield-lock::before { content: "\\f564"; }
        .bi-envelope::before { content: "\\f32f"; }
        .bi-lock::before { content: "\\f3f2"; }
        .bi-eye::before { content: "\\f31f"; }
        .bi-eye-slash::before { content: "\\f320"; }
        .bi-arrow-right-circle::before { content: "\\f11a"; }
        .bi-exclamation-triangle-fill::before { content: "\\f33b"; }
        .bi-exclamation-circle::before { content: "\\f32d"; }
        .bi-check-circle-fill::before { content: "\\f26a"; }
      `}</style>

      <div className="login-container">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-6 mt-4">
              <div className="login-card">
                {/* Logo Section */}
                <div className="text-center mb-5">
                  <div className="logo-container">
                    <i className="bi bi-shield-lock" style={{fontSize: '32px', color: 'white'}}></i>
                  </div>
                  <h1>
                    {isSignUp ? 'Partner Registration' : 'Vendor Panel Login'}
                  </h1>
                  <p className="text-muted">
                    {isSignUp ? 'Create your account to start listing' : 'Sign in to your vendor dashboard'}
                  </p>
                </div>

                {/* Error Alert */}
                {errors.general && (
                  <div className="error-alert alert">
                    <i className="bi bi-exclamation-triangle-fill me-3"></i>
                    <span>{errors.general}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                  {/* Email Field */}
                  <div className="form-group">
                    <input
                      type="email"
                      className={`form-control-modern ${errors.email ? 'border-danger' : ''}`}
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

                  {/* Password Field */}
                  <div className="form-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`form-control-modern ${errors.password ? 'border-danger' : ''}`}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder=" "
                      disabled={isLoading}
                      style={{paddingLeft: '60px', paddingRight: '60px'}}
                      autoComplete="current-password"
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

                  {/* Remember & Forgot */}
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center">
                      <input 
                        type="checkbox" 
                        className="checkbox-modern me-2"
                        id="rememberMe"
                        disabled={isLoading}
                      />
                      <label htmlFor="rememberMe" className="text-muted small">
                        Remember me
                      </label>
                    </div>

                    <div className="text-end">
                      <button 
                        type="button" 
                        className="btn-link" 
                        onClick={() => navigate('/forgot-password')}
                        disabled={isLoading}
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn-modern mb-4"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="d-flex align-items-center justify-content-center">
                        <div className="spinner-modern me-3"></div>
                        <span>Signing In...</span>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center justify-content-center">
                        <i className="bi bi-arrow-right-circle me-2"></i>
                        <span>Sign In to Dashboard</span>
                      </div>
                    )}
                  </button>

                  <div className="text-center mb-4">
                    <p className="text-muted small">Vendor registration is managed by admin.</p>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="text-center mt-4">
                <p className="footer-text small">
                  © 2025 Vendor Panel. Crafted with ❤️
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bootstrap Icons */}
      <link 
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css" 
        rel="stylesheet" 
      />
    </>
  );
};

export default VendorLogin;