import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminAuth } from './services/adminApi';

const validate = (pwd) => {
  const errs = [];
  if (!pwd || pwd.length < 8) errs.push('Password must be at least 8 characters long');
  if (!/[A-Z]/.test(pwd)) errs.push('Include at least one uppercase letter');
  if (!/[a-z]/.test(pwd)) errs.push('Include at least one lowercase letter');
  if (!/[0-9]/.test(pwd)) errs.push('Include at least one number');
  return errs;
};

const ResetPassword = () => {
  const [search] = useSearchParams();
  const token = search.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const tokenMissing = useMemo(() => !token || token.length < 10, [token]);

  useEffect(() => {
    if (tokenMissing) {
      setErrors(['Invalid or missing reset token. Please use the link from your email.']);
    }
  }, [tokenMissing]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setMessage('');

    const v = validate(password);
    if (v.length) { setErrors(v); return; }
    if (password !== confirm) { setErrors(['Passwords do not match']); return; }
    if (tokenMissing) { setErrors(['Invalid reset token']); return; }

    setLoading(true);
    try {
      // Call reset password API using adminAuth service
      const data = await adminAuth.resetPassword({ 
        token, 
        password 
      });
      
      setMessage(data.message || 'Password reset successful. You can now log in.');
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to reset password. Try requesting a new link.';
      setErrors([errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="card shadow-sm" style={{ maxWidth: 420, width: '100%' }}>
        <div className="card-body p-4">
          <h4 className="mb-2">Reset Password</h4>
          <p className="text-muted mb-4">Enter a new password for your admin account.</p>

          {errors.length > 0 && (
            <div className="alert alert-warning">
              <ul className="mb-0">
                {errors.map((e, i) => (<li key={i}>{e}</li>))}
              </ul>
            </div>
          )}

          {message && (
            <div className="alert alert-success">{message}</div>
          )}

          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} placeholder="********" autoComplete="new-password" />
            </div>
            <div className="mb-3">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-control" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="********" autoComplete="new-password" />
            </div>
            <button className="btn btn-primary w-100" type="submit" disabled={loading || tokenMissing}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <div className="text-center mt-3">
              <button type="button" className="btn btn-link" onClick={()=>navigate('/')}>Back to Login</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
