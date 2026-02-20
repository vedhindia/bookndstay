import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, AUTH_ENDPOINTS } from './config';

const ResetPassword = () => {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const token = sp.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!password || !confirm) return setMsg('Please fill all fields.');
    if (password.length < 6) return setMsg('Password must be at least 6 characters.');
    if (password !== confirm) return setMsg('Passwords do not match.');

    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.RESET_PASSWORD}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || 'Failed to reset password');
      setMsg('Password has been reset. Redirecting to login...');
      setTimeout(() => navigate('/'), 1200);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h4 className="mb-2">Reset Password</h4>
              <p className="text-muted">Enter your new password below.</p>
              {msg && <div className={`alert ${msg.includes('reset') ? 'alert-success' : 'alert-warning'}`}>{msg}</div>}
              <form onSubmit={submit}>
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirm}
                    onChange={(e)=>setConfirm(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <button className="btn btn-primary w-100" disabled={loading || !token}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
                {!token && <div className="text-danger mt-2">Invalid or missing reset token</div>}
              </form>
              <div className="mt-3">
                <small className="text-muted">This uses vendor auth reset endpoint.</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;