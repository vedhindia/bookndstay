import { useState } from 'react';
import { FaEnvelope, FaTimes } from 'react-icons/fa';
import { forgotPassword } from '../api/auth';

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await forgotPassword({ email: email.trim() });
      setIsSent(true);
    } catch (err) {
      alert(`Failed to send reset email: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {isSent ? 'Reset Link Sent' : 'Forgot Password'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <FaTimes className="text-xl" />
          </button>
        </div>

        {isSent ? (
          <div>
            <p className="text-sm sm:text-base text-gray-700">
              If an account with that email exists, we have sent a password reset link. Please check your inbox.
            </p>
            <div className="mt-6 text-right">
              <button
                onClick={onClose}
                className="bg-[#ee2e24] text-white py-2 px-4 rounded-md hover:bg-[#d62c22] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ee2e24] focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-sm sm:text-base text-gray-700 mb-4">
              Enter the email address associated with your account, and we’ll send you a link to reset your password.
            </p>
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ee2e24] text-sm sm:text-base"
                placeholder="you@example.com"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#ee2e24] text-white py-2 px-4 rounded-md hover:bg-[#d62c22] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ee2e24] focus:ring-offset-2"
              >
                Send Reset Link
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}