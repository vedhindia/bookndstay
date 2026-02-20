import React, { useState } from 'react';
import { API_BASE_URL, AUTH_ENDPOINTS } from './config';
import { getAuthToken } from './utils/auth';

const ChangePassword = () => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    current: '',
    new: '',
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!form.current || !form.new) {
      setMessage('Please fill in all fields.');
      return;
    }

    try {
      const token = getAuthToken(); // get JWT token from auth utility
      if (!token) {
        setMessage('Session expired. Please log in again.');
        return;
      }
      const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.CHANGE_PASSWORD}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: form.current,
          new_password: form.new,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result?.message || 'Password updated successfully!');
        setForm({ current: '', new: '' });
      } else {
        setMessage(result?.error?.message || result?.message || 'Failed to update password.');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div className="cpw-outer">
      <div className="cpw-card">
        <h2>Change Password</h2>
        <p className="cpw-subtext">For your security, use a strong and unique password.</p>
        <form onSubmit={handleSubmit}>
          <div className="cpw-field">
            <label htmlFor="currentPassword">Current Password</label>
            <div className="cpw-input-wrap">
              <span className="cpw-icon">🔒</span>
              <input
                type={showCurrent ? 'text' : 'password'}
                id="currentPassword"
                name="current"
                value={form.current}
                onChange={handleChange}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <span
                className="cpw-eye"
                onClick={() => setShowCurrent((v) => !v)}
                tabIndex={0}
                role="button"
                aria-label="Show/hide current password"
              >
                {showCurrent ? '🙈' : '👁️'}
              </span>
            </div>
          </div>
          <div className="cpw-field">
            <label htmlFor="newPassword">New Password</label>
            <div className="cpw-input-wrap">
              <span className="cpw-icon">🔑</span>
              <input
                type={showNew ? 'text' : 'password'}
                id="newPassword"
                name="new"
                value={form.new}
                onChange={handleChange}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <span
                className="cpw-eye"
                onClick={() => setShowNew((v) => !v)}
                tabIndex={0}
                role="button"
                aria-label="Show/hide new password"
              >
                {showNew ? '🙈' : '👁️'}
              </span>
            </div>
          </div>
          <button type="submit" className="cpw-btn">Update Password</button>
          {message && <div className={`cpw-message${message.includes('success') ? ' success' : ' error'}`}>{message}</div>}
        </form>
      </div>

      <style>{`
        .cpw-outer {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #e3f2fd 0%, #fff 100%);
          padding: 24px 8px;
        }
        .cpw-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(25, 118, 210, 0.10);
          padding: 36px 32px 28px 32px;
          max-width: 400px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        .cpw-card h2 {
          color: #1976d2;
          font-size: 1.6rem;
          margin-bottom: 6px;
          text-align: center;
        }
        .cpw-subtext {
          color: #757575;
          font-size: 1rem;
          margin-bottom: 18px;
          text-align: center;
        }
        .cpw-field {
          margin-bottom: 18px;
        }
        .cpw-field label {
          display: block;
          margin-bottom: 6px;
          color: #1976d2;
          font-weight: 500;
        }
        .cpw-input-wrap {
          display: flex;
          align-items: center;
          background: #f7fafd;
          border-radius: 8px;
          border: 1.5px solid #e3f2fd;
          padding: 0 10px;
          transition: border 0.2s;
        }
        .cpw-input-wrap:focus-within {
          border: 1.5px solid #1976d2;
        }
        .cpw-icon {
          font-size: 1.2rem;
          margin-right: 6px;
          color: #1976d2;
        }
        .cpw-eye {
          font-size: 1.2rem;
          margin-left: 6px;
          cursor: pointer;
          color: #757575;
          user-select: none;
        }
        .cpw-input-wrap input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 1rem;
          padding: 12px 0;
          flex: 1;
        }
        .cpw-btn {
          width: 100%;
          background: #1976d2;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px 0;
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .cpw-btn:hover {
          background: #125ea2;
        }
        .cpw-message {
          margin-top: 16px;
          padding: 10px 0;
          border-radius: 8px;
          text-align: center;
          font-size: 1.05rem;
        }
        .cpw-message.success {
          background: #e3fbe3;
          color: #388e3c;
        }
        .cpw-message.error {
          background: #fde3e3;
          color: #d32f2f;
        }
        @media (max-width: 600px) {
          .cpw-card {
            padding: 16px 4px 14px 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default ChangePassword;