import { useState } from 'react';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle, FaFacebook, FaApple } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { requestEmailLoginOtp, verifyEmailLoginOtp, loginWithEmailPassword } from '../api/auth';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [error, setError] = useState('');

  const isLoading = Boolean(loadingAction);
  const isLoggingInWithPassword = loadingAction === 'password';
  const isSendingOtp = loadingAction === 'sendOtp';
  const isLoggingInWithOtp = loadingAction === 'otp';

  const redirectAfterLogin = () => {
    const redirectUrl = sessionStorage.getItem('redirectUrl');
    if (redirectUrl) {
      sessionStorage.removeItem('redirectUrl');
      navigate(redirectUrl);
    } else {
      navigate('/');
    }
  };

  const handlePasswordLogin = async () => {
    setError('');
    if (!email) {
      setError('Enter your registered email.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    try {
      setLoadingAction('password');
      await loginWithEmailPassword({ email: email.trim(), password });
      redirectAfterLogin();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleLogin = async () => {
    if (!email) {
      setError('Enter your registered email.');
      return;
    }

    if (password) {
      await handlePasswordLogin();
      return;
    }

    if (!otpRequested) {
      setError('Click Send OTP and enter the OTP to login (or enter your password).');
      return;
    }

    await handleOtpLogin();
  };

  const handleSendOtp = async () => {
    setError('');
    if (!email) {
      setError('Enter your registered email.');
      return;
    }
    try {
      setLoadingAction('sendOtp');
      await requestEmailLoginOtp({ email: email.trim() });
      setOtpRequested(true);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOtpLogin = async () => {
    setError('');
    if (!email) {
      setError('Enter your registered email.');
      return;
    }
    if (!otp) {
      setError('Enter OTP.');
      return;
    }
    try {
      setLoadingAction('otp');
      await verifyEmailLoginOtp({ email: email.trim(), otp: otp.trim() });
      redirectAfterLogin();
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (otpRequested) {
                        setOtpRequested(false);
                        setOtp('');
                      }
                      if (password) setPassword('');
                    }}
                    className="focus:ring-[#ee2e24] focus:border-[#ee2e24] block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password (optional)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus:ring-[#ee2e24] focus:border-[#ee2e24] block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-md py-3"
                    placeholder="••••••••"
                  />
                  <div
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="h-5 w-5 text-gray-400" />
                    ) : (
                      <FaEye className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter password to login directly; otherwise use OTP.</p>
              </div>

              {/* OTP Input when requested */}
              {otpRequested && (
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                    Enter OTP
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className=" ps-1 mt-1 block w-full sm:text-sm border-gray-300 rounded-md py-3 border border-dark"
                    placeholder="6-digit OTP"
                  />
                </div>
              )}

              {/* Remember me / Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-[#ee2e24] focus:ring-[#ee2e24] border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="font-medium text-[#ee2e24] hover:text-red-800"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleLogin}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ee2e24] hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ee2e24]"
                  disabled={isLoading}
                >
                  {(isLoggingInWithPassword || isLoggingInWithOtp) ? 'Logging in...' : 'Login'}
                </button>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full flex justify-center py-3 px-4 border border-[#ee2e24] rounded-md shadow-sm text-sm font-medium text-[#ee2e24] hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ee2e24]"
                  disabled={isLoading}
                >
                  {isSendingOtp ? 'Sending...' : (otpRequested ? 'Resend OTP' : 'Send OTP')}
                </button>
              </div>

              {/* Registration Link */}
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Don’t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="font-medium text-[#ee2e24] hover:text-red-800"
                  >
                    Register now
                  </button>
                </p>
              </div>
            </form>

            
            {/* <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div>
                  <a
                    href="#"
                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <FaGoogle className="h-5 w-5 text-red-500" />
                  </a>
                </div>

                <div>
                  <a
                    href="#"
                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <FaFacebook className="h-5 w-5 text-blue-600" />
                  </a>
                </div>

                <div>
                  <a
                    href="#"
                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <FaApple className="h-5 w-5 text-gray-900" />
                  </a>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </>
  );
};

export default LoginPage;
