import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import DashboardHome from "./DashboardHome";
import BlockUsers from "./BlockUsers";
import Reports from "./Reports";
import Notifications from "./Notifications";
import Roles from "./Roles";
import ChangePassword from "./ChangePassword";
import { useState, useEffect } from "react";

// New hotel admin pages
import Users from "./Users";
import Hotels from "./Hotels";
import Vendors from "./Vendors";
import Bookings from "./Bookings";
import Coupons from "./Coupons";
import Rooms from "./Rooms";
import Reviews from "./Reviews";
import MyInfo from "./MyInfo";

const DemoPage = ({ title, desc }) => (
  <div style={{ padding: '2rem' }}>
    <h2>{title}</h2>
    <p>{desc}</p>
  </div>
);

const Dashboard = () => {
  const location = useLocation();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Close mobile sidebar when clicking outside or on route change
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setMobileSidebarOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      if (window.innerWidth < 992 && isMobileSidebarOpen) {
        const sidebar = document.querySelector('.mobile-sidebar-overlay');
        const toggleBtn = event.target.closest('.mobile-toggle-btn');
        if (sidebar && !sidebar.contains(event.target) && !toggleBtn) {
          setMobileSidebarOpen(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileSidebarOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={`container-fluid`}>
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="mobile-sidebar-overlay d-lg-none">
          <div className="mobile-sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)}></div>
          <div className="mobile-sidebar">
            <Sidebar isCollapsed={false} isMobile={true} onMobileClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="d-flex">
        <div
          className="d-none d-lg-block"
          style={{ 
            width: isSidebarCollapsed ? '70px' : '260px', 
            transition: 'width 0.3s ease',
            flexShrink: 0
          }}
        >
          <Sidebar isCollapsed={isSidebarCollapsed} />
        </div>
        <div
          className="dashboard-section mb-5 flex-grow-1"
          style={{ 
            width: '100%',
            overflowX: 'hidden'
          }}
        >
          <Header 
            toggleSidebar={toggleSidebar} 
            isSidebarCollapsed={isSidebarCollapsed}
            toggleMobileSidebar={toggleMobileSidebar}
            isMobileSidebarOpen={isMobileSidebarOpen}
          />
          <main className="pt-3">
            <Routes>
              {/* Overview */}
              <Route path="" element={<DashboardHome />} />

              {/* Existing routes (legacy e-commerce) - kept temporarily */}
           <Route path="block-users" element={<BlockUsers />} />
              <Route path="reports" element={<Reports/>} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="roles" element={<Roles />} />
              <Route path="change-password" element={<ChangePassword />} />

              {/* New Hotel Admin sections */}
              <Route path="users/*" element={<Users />} />
              <Route path="hotels/*" element={<Hotels />} />
              <Route path="vendors/*" element={<Vendors />} />
              <Route path="coupons/*" element={<Coupons />} />
              <Route path="bookings/*" element={<Bookings />} />
              <Route path="rooms/*" element={<Rooms />} />
              <Route path="reviews/*" element={<Reviews />} />
              <Route path="my-info" element={<MyInfo />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
