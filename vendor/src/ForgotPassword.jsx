import React, { useMemo, useState } from 'react';
import { API_BASE_URL, AUTH_ENDPOINTS } from './config';
import api from './services/apiClient';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const isValidEmail = useMemo(() => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    if (!isValidEmail) return setError('Enter a valid email address.');
    try {
      setLoading(true);
      const url = `${API_BASE_URL}${AUTH_ENDPOINTS.FORGOT}`;
      await api.post(url, { email: email.trim() }, { skipAuth: true, headers: { 'X-Skip-Auth': 'true' } });
      setSent(true);
      setMsg('If an account exists for this email, a reset link will be sent.');
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404 || status === 200) {
        setSent(true);
        setMsg('If an account exists for this email, a reset link will be sent.');
      } else {
        const serverMsg = e?.response?.data?.message || e.message || 'Failed to send reset email';
        setError(serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .auth-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 24px 12px;
        }
        .auth-card {
          width: 100%;
          max-width: 460px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.15);
          padding: 28px;
        }
        .auth-title {
          margin: 0 0 4px 0;
          color: #2d3748;
          font-size: 1.6rem;
          font-weight: 700;
          text-align: center;
        }
        .auth-sub {
          margin: 0 0 18px 0;
          color: #6b7280;
          text-align: center;
        }
        .field {
          margin-bottom: 14px;
        }
        .label {
          display: block;
          margin-bottom: 6px;
          color: #374151;
          font-weight: 600;
        }
        .control {
          width: 100%;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 16px;
          transition: all .2s ease;
          outline: none;
        }
        .control:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102,126,234,0.15);
        }
        .control.error {
          border-color: #ef4444;
        }
        .btn-primary-modern {
          width: 100%;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-weight: 700;
          letter-spacing: .2px;
          cursor: pointer;
          transition: transform .15s ease, box-shadow .2s ease;
        }
        .btn-primary-modern:hover:enabled {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(37,99,235,.35);
        }
        .hint {
          margin-top: 10px;
          text-align: center;
          color: #6b7280;
        }
        .alert {
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
          font-weight: 500;
          text-align: left;
        }
        .alert-success {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .alert-error {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }
        .link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }
      `}</style>

      <div className="auth-wrap">
        <div className="auth-card">
          <h4 className="auth-title">Forgot Password</h4>
          <p className="auth-sub">Enter your email to receive a password reset link.</p>
          {msg && <div className="alert alert-success">{msg}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit} noValidate>
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={`control${error && !isValidEmail ? ' error' : ''}`}
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!isValidEmail && !!email}
                aria-describedby="emailHelp"
              />
            </div>
            <button
              className="btn-primary-modern"
              type="submit"
              disabled={loading || !isValidEmail}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
          <div className="hint">
            <a className="link" href="/vendor/">Back to login</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
