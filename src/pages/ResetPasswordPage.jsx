import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';

const validate = (pwd) => {
  if (!pwd) return 'Password is required';
  if (pwd.length < 6) return 'Password must be at least 6 characters long';
  return '';
};

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const token = search.get('token') || '';

  const tokenMissing = useMemo(() => !token || token.length < 10, [token]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (tokenMissing) {
      setError('Invalid or missing reset token. Please use the link from your email.');
      return;
    }

    const v = validate(password);
    if (v) {
      setError(v);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await resetPassword({ token, new_password: password });
      setMessage('Password reset successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err?.message || 'Failed to reset password. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center py-12 px-4">
      <div className="w-full max-w-md bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900">Reset Password</h2>
        <p className="text-sm text-gray-600 mt-1">Enter your new password below.</p>

        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
            {message}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-[#ee2e24] focus:border-[#ee2e24]"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-[#ee2e24] focus:border-[#ee2e24]"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || tokenMissing}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ee2e24] hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full text-sm font-medium text-[#ee2e24] hover:text-red-800"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}

