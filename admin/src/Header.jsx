import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL, AUTH_ENDPOINTS } from './config';

const Header = ({ toggleSidebar, isSidebarCollapsed, toggleMobileSidebar, isMobileSidebarOpen }) => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-bs-theme');
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      console.log('[Header] Logout already in progress');
      return;
    }

    console.log('[Header] Starting logout process');
    setIsLoggingOut(true);

    try {
      const token = localStorage.getItem('adminToken');
      
      if (token) {
        console.log('[Header] Calling logout API');
        const response = await axios.post(
          `${API_BASE_URL}${AUTH_ENDPOINTS.LOGOUT}`,
          {},
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            timeout: 10000,
          }
        );
        console.log('[Header] Logout API response:', response.data);
      } else {
        console.log('[Header] No token found, skipping API call');
      }
    } catch (error) {
      console.error('[Header] Logout API error:', error);
      // Continue with logout even if API fails
    }

    // Clear all storage and state
    try {
      console.log('[Header] Clearing local storage and session');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('refreshToken');
      sessionStorage.clear();
      
      // Clear axios default headers
      if (axios.defaults?.headers?.common) {
        delete axios.defaults.headers.common['Authorization'];
      }
      
      // Reset state
      setAdminUser(null);
      setIsProfileOpen(false);
      
      console.log('[Header] Storage cleared successfully');
    } catch (storageError) {
      console.error('[Header] Error clearing storage:', storageError);
    }

    // Redirect to login page
    console.log('[Header] Redirecting to login page');
    setIsLoggingOut(false);
    
    // Use navigate instead of window.location.replace for better React Router integration
    navigate('/', { replace: true });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch admin user data from localStorage on mount
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('adminUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        setAdminUser(user);
        console.log('[Header] Admin user loaded:', user);
      }
    } catch (error) {
      console.error('[Header] Error loading admin user:', error);
    }
  }, []);

  return (
    <header className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm">
      <div className="container-fluid px-4">
        {/* Toggle Sidebar Button */}
        <button
          className="btn btn-link text-dark d-lg-none me-3 mobile-toggle-btn"
          onClick={toggleMobileSidebar}
          aria-label="Toggle navigation"
        >
          <i className={`fas ${isMobileSidebarOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>

        {/* Brand/Logo - Only show when sidebar is collapsed */}
        {isSidebarCollapsed && (
          <a className="navbar-brand me-auto d-none d-lg-block" href="/dashboard">
            <span className="fw-bold text-primary">Hotel</span>Admin
          </a>
        )}

        {/* Right-aligned navigation items */}
        <div className="d-flex align-items-center ms-auto">
          {/* Fullscreen Toggle */}
          <button
            className="btn btn-link text-dark me-2 d-none d-md-inline-block"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                if (document.exitFullscreen) {
                  document.exitFullscreen();
                }
              }
            }}
            title="Toggle Fullscreen"
          >
            <i className="fas fa-expand"></i>
          </button>

          <div className="dropdown position-relative">
            <button
              className="btn btn-link text-dark text-decoration-none dropdown-toggle d-flex align-items-center"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Header] Profile dropdown toggle clicked');
                setIsProfileOpen(!isProfileOpen);
              }}
              aria-expanded={isProfileOpen}
            >
              <div className="me-2 d-none d-md-block text-end">
                <div className="fw-medium">
                  Hi, {adminUser?.name || adminUser?.full_name || adminUser?.email?.split('@')[0] || 'Admin'}
                </div>
                <small className="text-muted">
                  {adminUser?.role === 'SUPER_ADMIN' ? 'Super Admin' :
                    adminUser?.role === 'ADMIN' ? 'Admin' :
                      adminUser?.role || 'Admin'}
                </small>
              </div>
              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                style={{ width: '40px', height: '40px' }}>
                <i className="fas fa-user"></i>
              </div>
            </button>

            <ul 
              className={`dropdown-menu dropdown-menu-end ${isProfileOpen ? 'show' : ''}`} 
              style={{
                position: 'absolute', 
                right: '-25px', 
                top: '100%', 
                zIndex: 1050 
              }}
            >
              <li>
                <Link
                  to="/dashboard/my-info"
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProfileOpen(false);
                  }}
                >
                  <i className="fas fa-user-circle me-2"></i> My Info
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button
                  type="button"
                  className="dropdown-item text-danger"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Header] Logout button clicked');
                    handleLogout();
                  }}
                  disabled={isLoggingOut}
                  style={{ 
                    cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                    opacity: isLoggingOut ? 0.6 : 1
                  }}
                >
                  <i className={`fas ${isLoggingOut ? 'fa-spinner fa-spin' : 'fa-sign-out-alt'} me-2`}></i>
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;