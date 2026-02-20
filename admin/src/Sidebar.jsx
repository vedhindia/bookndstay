import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const Sidebar = ({ isCollapsed, isMobile = false, onMobileClose }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});

  
  const menuItems = [
    { title: 'DashboardHome', icon: 'fas fa-tachometer-alt', path: '/dashboard', exact: true },
    { title: 'Registered Users', icon: 'fas fa-users', path: '/dashboard/users' },
    { title: 'Hotels', icon: 'fas fa-hotel', path: '/dashboard/hotels' },
    { title: 'Vendors', icon: 'fas fa-user-tie', path: '/dashboard/vendors' },
    { title: 'Coupons', icon: 'fas fa-tags', path: '/dashboard/coupons' },
    { title: 'Bookings', icon: 'fas fa-calendar-check', path: '/dashboard/bookings' },
    { title: 'My Info', icon: 'fas fa-user-circle', path: '/dashboard/my-info' },
  ];

  const isActive = (path, exact = false) => {
    return exact ? location.pathname === path : location.pathname.startsWith(path);
  };

  const handleMenuClick = () => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  useEffect(() => {
    setExpandedItems({});
  }, [location.pathname]);

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile-sidebar' : ''}`}>
      <div className="sidebar-header d-flex align-items-center justify-content-between p-3">
        {!isCollapsed ? (
          <>
            <h5 className="mb-0 fw-bold text-white">Hotel Admin</h5>
            {isMobile && (
              <button 
                className="btn btn-link text-white p-0"
                onClick={onMobileClose}
                style={{ fontSize: '1.5rem' }}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </>
        ) : (
          <h5 className="mb-0 text-white text-center w-100">H</h5>
        )}
      </div>

      <div className="sidebar-menu">
        <ul className="list-unstyled">
          {menuItems.map((item, index) => (
            <li key={index} className={`menu-item ${isActive(item.path, item.exact) ? 'active' : ''}`}>
              <NavLink 
                to={item.path}
                className={({ isActive: isTopActive }) => `menu-link ${isTopActive ? 'active' : ''}`}
                end={item.exact}
                onClick={handleMenuClick}
              >
                <i className={`${item.icon} me-3`}></i>
                {!isCollapsed && <span>{item.title}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {!isCollapsed && (
        <div className="sidebar-footer p-3">
          <div className="d-flex align-items-center">
            <div className="avatar me-2">
              <i className="fas fa-user-circle fa-2x text-light"></i>
            </div>
            <div className="user-info">
              <h6 className="mb-0 text-white">Admin User</h6>
              <small className="text-white-50">Super Admin</small>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          .sidebar { background: linear-gradient(180deg, #1e3c72 0%, #2a5298 100%); color: #fff; height: 100vh; position: fixed; left: 0; top: 0; z-index: 1000; transition: all 0.3s ease; width: 260px; overflow-y: auto; }
          .sidebar.collapsed { width: 70px; }
          .sidebar-header { background-color: rgba(0, 0, 0, 0.1); height: 60px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
          .sidebar-menu { padding: 1rem 0; }
          .menu-item { position: relative; }
          .menu-link, .submenu-link { display: flex; align-items: center; padding: 0.75rem 1.5rem; color: rgba(255, 255, 255, 0.8); text-decoration: none; transition: all 0.3s ease; position: relative; border-left: 3px solid transparent; }
          .menu-link:hover, .submenu-link:hover { color: #fff; background-color: rgba(255, 255, 255, 0.1); }
          .menu-item.active > .menu-link { background-color: rgba(255, 255, 255, 0.15); color: #fff; border-left-color: #fff; }
          .submenu { background-color: rgba(0, 0, 0, 0.1); max-height: 0; overflow: hidden; transition: max-height 0.3s ease; padding-left: 0; margin: 0; }
          .submenu.show { max-height: 500px; }
          .submenu-link { padding-left: 3.5rem; font-size: 0.9rem; }
          .submenu-link.active { color: #fff; background-color: rgba(255, 255, 255, 0.1); }
          .sidebar-footer { position: absolute; bottom: 0; left: 0; right: 0; border-top: 1px solid rgba(255, 255, 255, 0.1); }
          .avatar { width: 40px; height: 40px; border-radius: 50%; background-color: rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; }
          .user-info h6 { font-size: 0.9rem; margin-bottom: 0.1rem; }
          .user-info small { font-size: 0.75rem; }
          .sidebar::-webkit-scrollbar { width: 5px; }
          .sidebar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); }
          .sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
        `}
      </style>
    </div>
  );
};

export default Sidebar;
