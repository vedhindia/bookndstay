import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { logoutVendor } from "./utils/auth";
import api from "./services/apiClient";

const Sidebar = ({ isCollapsed, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [badgeCounts, setBadgeCounts] = useState({ users: 0, bookings: 0 });

  const menuItems = [
    { title: 'Dashboard', icon: 'fas fa-tachometer-alt', path: '/dashboard', exact: true },
    { title: 'Registered Users', icon: 'fas fa-users', path: '/dashboard/users' },
    { title: 'Hotels', icon: 'fas fa-hotel', path: '/dashboard/hotels' },
    { title: 'My Info', icon: 'fas fa-user-tie', path: '/dashboard/myInfo' },
    { title: 'Bookings', icon: 'fas fa-calendar-check', path: '/dashboard/bookings' },
    // { title: 'Payments', icon: 'fas fa-credit-card', path: '/dashboard/payments' },
    { title: 'Settings', icon: 'fas fa-cog', path: '/dashboard/settings', hasSubmenu: true },
  ];

  const isActive = (path, exact = false) => {
    return exact ? location.pathname === path : location.pathname.startsWith(path);
  };

  const lastSeenKeyForPath = (path) => {
    if (path.startsWith('/dashboard/users')) return 'vendor_last_seen_users';
    if (path.startsWith('/dashboard/bookings')) return 'vendor_last_seen_bookings';
    return null;
  };

  const sectionKeyForPath = (path) => {
    if (path.startsWith('/dashboard/users')) return 'users';
    if (path.startsWith('/dashboard/bookings')) return 'bookings';
    return null;
  };

  const ensureLastSeenInitialized = () => {
    const now = new Date().toISOString();
    const keys = ['vendor_last_seen_users', 'vendor_last_seen_bookings'];
    keys.forEach((k) => {
      try {
        const v = localStorage.getItem(k);
        if (!v) localStorage.setItem(k, now);
      } catch {}
    });
  };

  const fetchBadges = async () => {
    try {
      ensureLastSeenInitialized();
      const params = {
        users_since: localStorage.getItem('vendor_last_seen_users') || undefined,
        bookings_since: localStorage.getItem('vendor_last_seen_bookings') || undefined,
      };
      const res = await api.get('/vendor/notifications/counts', { params });
      const c = res?.data?.data?.counts || res?.data?.counts || {};
      setBadgeCounts({
        users: Number(c.users) || 0,
        bookings: Number(c.bookings) || 0,
      });
    } catch {
      void 0;
    }
  };

  const getBadgeCount = (path) => {
    const section = sectionKeyForPath(path);
    if (!section) return 0;
    return badgeCounts[section] || 0;
  };

  const formatBadge = (n) => (n > 99 ? '99+' : String(n));

  const toggleSubmenu = (title) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleLogout = () => {
    // Clear session and logout
    logoutVendor();
    // Close submenu
    setExpandedItems({});
    // Navigate to login page
    navigate("/", { replace: true });
  };

  const handleLinkClick = (targetPath) => {
    const key = targetPath ? lastSeenKeyForPath(targetPath) : null;
    if (key) {
      try {
        localStorage.setItem(key, new Date().toISOString());
      } catch {}
    }
    // Close mobile sidebar when a link is clicked
    if (onClose && window.innerWidth < 992) {
      onClose();
    }
  };

  useEffect(() => {
    setExpandedItems({});
    const key = lastSeenKeyForPath(location.pathname);
    const section = sectionKeyForPath(location.pathname);
    if (key && section) {
      try {
        localStorage.setItem(key, new Date().toISOString());
      } catch {}
      setBadgeCounts((prev) => ({ ...prev, [section]: 0 }));
      fetchBadges();
    }
  }, [location.pathname]);

  useEffect(() => {
    ensureLastSeenInitialized();
    fetchBadges();
    const interval = setInterval(() => {
      fetchBadges();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header d-flex align-items-center justify-content-between p-3">
          {!isCollapsed ? (
            <h5 className="mb-0 fw-bold text-white">Vendor Panel</h5>
          ) : (
            <h5 className="mb-0 text-white text-center w-100">V</h5>
          )}
          {onClose && (
            <button
              className="btn btn-link text-white p-0 d-lg-none close-btn"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <div className="sidebar-menu">
          <ul className="list-unstyled">
            {menuItems.map((item, index) => (
              <li key={index} className={`menu-item ${isActive(item.path, item.exact) ? 'active' : ''}`}>
                {!item.hasSubmenu ? (
                  <NavLink
                    to={item.path}
                    className={({ isActive: isTopActive }) => `menu-link ${isTopActive ? 'active' : ''}`}
                    end={item.exact}
                    onClick={() => handleLinkClick(item.path)}
                  >
                    <span className="menu-icon-wrap">
                      <i className={`${item.icon} menu-icon`}></i>
                      {getBadgeCount(item.path) > 0 && (
                        <span className={`notif-badge ${isCollapsed ? 'collapsed-badge' : ''}`}>
                          {formatBadge(getBadgeCount(item.path))}
                        </span>
                      )}
                    </span>
                    {!isCollapsed && <span className="menu-text">{item.title}</span>}
                  </NavLink>
                ) : (
                  <>
                    <div
                      className={`menu-link ${expandedItems[item.title] ? 'active' : ''}`}
                      onClick={() => toggleSubmenu(item.title)}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          toggleSubmenu(item.title);
                        }
                      }}
                    >
                      <i className={`${item.icon} menu-icon`}></i>
                      {!isCollapsed && <span className="menu-text">{item.title}</span>}
                      {!isCollapsed && (
                        <i className={`fas fa-chevron-${expandedItems[item.title] ? "down" : "right"} ms-auto chevron-icon`}></i>
                      )}
                    </div>

                    <ul className={`submenu list-unstyled ${expandedItems[item.title] ? 'show' : ''}`}>
                      <li>
                        <NavLink to="/dashboard/myInfo" className="submenu-link" onClick={() => handleLinkClick('/dashboard/myInfo')}>
                          <i className="fas fa-user-circle me-2"></i> Profile
                        </NavLink>
                      </li>
                      <li>
                        <NavLink to="/dashboard/change-password" className="submenu-link" onClick={() => handleLinkClick('/dashboard/change-password')}>
                          <i className="fas fa-key me-2"></i> Change Password
                        </NavLink>
                      </li>
                      <li>
                        <button 
                          className="submenu-link logout-btn text-danger w-100 text-start border-0 bg-transparent"
                          onClick={handleLogout}
                        >
                          <i className="fas fa-sign-out-alt me-2"></i> Logout
                        </button>
                      </li>
                    </ul>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style jsx>{`
        /* Base Sidebar Styles */

        .sidebar {
          background: linear-gradient(180deg, #1e3c72 0%, #2a5298 100%);
          color: #fff;
          width: 260px;
          min-height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1000;
          transition: all 0.3s ease;
          overflow-y: auto;
          overflow-x: hidden;
        }

        /* Desktop - Normal sidebar */
        @media (min-width: 992px) {
          .sidebar.collapsed {
            width: 80px;
          }
          
          .sidebar.collapsed .menu-text,
          .sidebar.collapsed .chevron-icon {
            display: none;
          }
          
          .sidebar.collapsed .menu-icon {
            margin-right: 0;
          }
          
          .sidebar.collapsed .menu-link,
          .sidebar.collapsed .submenu-link {
            justify-content: center;
          }
        }

      
        /* Tablet and Mobile - Full width overlay */
        @media (max-width: 991px) {
          .sidebar {
            width: 280px;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
          }
          
          .sidebar.collapsed {
            width: 280px;
          }
        }

        /* Mobile - Slightly narrower */
        @media (max-width: 576px) {
          .sidebar {
            width: 100%;
            max-width: 280px;
          }
        }

        /* Header Styles */
        .sidebar-header {
          background-color: rgba(0, 0, 0, 0.1);
          min-height: 60px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .close-btn {
          font-size: 1.5rem;
          line-height: 1;
          padding: 0;
          margin-left: auto;
        }

        .close-btn:hover {
          color: #fff !important;
          opacity: 0.8;
        }

        /* Menu Styles */
        .sidebar-menu {
          padding: 1rem 0;
        }

        .menu-item {
          position: relative;
          margin-bottom: 0.25rem;
        }

        .menu-link,
        .submenu-link {
          display: flex;
          align-items: center;
          padding: 0.875rem 1.5rem;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          transition: all 0.3s ease;
          position: relative;
          border-left: 3px solid transparent;
          cursor: pointer;
        }

        .menu-icon {
          margin-right: 1rem;
          min-width: 20px;
          text-align: center;
          font-size: 1.1rem;
        }

        .menu-icon-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .notif-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #ff3b30;
          color: #fff;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          padding: 3px 6px;
          border: 2px solid rgba(30, 60, 114, 0.9);
          min-width: 22px;
          text-align: center;
        }

        .collapsed-badge {
          right: -10px;
        }

        .menu-text {
          flex: 1;
        }

        .menu-link:hover,
        .submenu-link:hover {
          color: #fff;
          background-color: rgba(255, 255, 255, 0.1);
        }

        .menu-item.active > .menu-link,
        .menu-link.active {
          background-color: rgba(255, 255, 255, 0.15);
          color: #fff;
          border-left-color: #fff;
        }

        /* Submenu Styles */
        .submenu {
          background-color: rgba(0, 0, 0, 0.2);
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
          padding-left: 0;
          margin: 0;
        }

        .submenu.show {
          max-height: 500px;
        }

        .submenu-link {
          padding-left: 3.5rem;
          font-size: 0.9rem;
        }

        .submenu-link.active {
          color: #fff;
          background-color: rgba(255, 255, 255, 0.15);
        }

        .logout-btn {
          padding: 0.875rem 3.5rem;
        }

        .logout-btn:hover {
          background-color: rgba(220, 53, 69, 0.2) !important;
        }

        /* Scrollbar Styles */
        .sidebar::-webkit-scrollbar {
          width: 5px;
        }

        .sidebar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }

        .sidebar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        .sidebar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }

        /* Focus Styles for Accessibility */
        .menu-link:focus,
        .submenu-link:focus,
        .logout-btn:focus {
          outline: 2px solid rgba(255, 255, 255, 0.5);
          outline-offset: -2px;
        }

        /* Chevron Animation */
        .chevron-icon {
          font-size: 0.8rem;
          transition: transform 0.3s ease;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
