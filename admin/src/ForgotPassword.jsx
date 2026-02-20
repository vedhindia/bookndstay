import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuth } from './services/adminApi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email) {
      setError('Email is required');
      return;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call forgot password API using adminAuth service
      const data = await adminAuth.forgotPassword({ 
        email: email.trim().toLowerCase() 
      });
      
      setSuccess(data.message || 'If this email is registered, a password reset link will be sent.');
      setEmail(''); // Clear email field on success
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to send reset link. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .login-container { min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); position: relative; overflow: hidden; }
        .login-container::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><radialGradient id="a" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(255,255,255,0.1)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle cx="200" cy="200" r="100" fill="url(%23a)"/><circle cx="800" cy="300" r="150" fill="url(%23a)"/><circle cx="300" cy="700" r="120" fill="url(%23a)"/><circle cx="900" cy="800" r="80" fill="url(%23a)"/></svg>'); animation: float 20s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(180deg); } }
        .login-card { backdrop-filter: blur(20px); background: rgba(255, 255, 255, 0.95); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15); transform: ${mounted ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.9)'}; opacity: ${mounted ? 1 : 0}; transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .logo-container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin: 0 auto; position: relative; animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); } 100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); } }
        .form-group { position: relative; margin-bottom: 1.5rem; }
        .form-control-modern { border: 2px solid #e1e5e9; border-radius: 12px; padding: 16px 20px; font-size: 16px; background: rgba(255, 255, 255, 0.8); transition: all 0.3s ease; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); }
        .form-control-modern:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1), 0 4px 20px rgba(0, 0, 0, 0.1); background: rgba(255, 255, 255, 1); transform: translateY(-2px); }
        .input-icon { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: #6c757d; transition: all 0.3s ease; z-index: 10; }
        .form-control-modern:focus + .input-icon, .form-control-modern:not(:placeholder-shown) + .input-icon { color: #667eea; transform: translateY(-50%) scale(1.1); }
        .btn-modern { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 12px; padding: 16px; font-weight: 600; font-size: 16px; color: white; transition: all 0.3s ease; position: relative; overflow: hidden; }
      `}</style>
      <div className="login-container d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="login-card p-4" style={{ maxWidth: 400, width: '100%' }}>
          <div className="logo-container mb-3">
            <i className="fa-solid fa-lock fa-2x text-white"></i>
          </div>
          <h3 className="text-center mb-3 fw-bold" style={{ color: '#667eea' }}>Forgot Password</h3>
          <p className="text-center text-muted mb-4">Enter your email address to reset your password.</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group mb-3">
              <input
                type="email"
                className="form-control-modern w-100"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
              {error && <div className="text-danger small mt-1">{error}</div>}
            </div>
            <button type="submit" className="btn btn-modern w-100" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          {success && <div className="alert alert-success mt-3 text-center">{success}</div>}
          <div className="mt-3 text-center">
            <button type="button" className="btn btn-link p-0" style={{color: '#667eea', textDecoration: 'underline'}} onClick={() => navigate('/') }>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword; 