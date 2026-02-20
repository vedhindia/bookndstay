import React, { useState } from 'react';
import { API_BASE_URL, AUTH_ENDPOINTS } from './config';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!email) {
      setMsg('Email is required');
      return;
    }
    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.FORGOT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || 'Failed to send reset email');
      setSent(true);
      setMsg('Password reset link sent to your email.');
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
              <h4 className="mb-2">Forgot Password</h4>
              <p className="text-muted">Enter your email to receive a password reset link.</p>
              {msg && <div className={`alert ${sent ? 'alert-success' : 'alert-warning'}`}>{msg}</div>}
              <form onSubmit={submit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <button className="btn btn-primary w-100" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <div className="mt-3">
                <small className="text-muted">Vendor panel uses vendor auth routes.</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;