import { Routes, Route } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import DashboardHome from "./DashboardHome";
import BlockUsers from "./BlockUsers";
import Reports from "./Reports";
import Notifications from "./Notifications";
import Roles from "./Roles";
import ChangePassword from "./ChangePassword";
import { useState, useEffect } from "react";
import "./Dashboard.css";

// New hotel admin pages
import Users from "./Users";
import Hotels from "./Hotels";
import MyInfo from "./myInfo";
import Bookings from "./Bookings";
import Settings from "./Settings";
import Rooms from "./Rooms";
import Reviews from "./Reviews";

const DemoPage = ({ title, desc }) => (
  <div style={{ padding: '2rem' }}>
    <h2>{title}</h2>
    <p>{desc}</p>
  </div>
);

const Dashboard = () => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    // Check if we're on mobile (screen width < 992px which is Bootstrap's lg breakpoint)
    if (window.innerWidth < 992) {
      setMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  // Close mobile sidebar when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className={`container-fluid `}>
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="mobile-sidebar-overlay d-lg-none"
          onClick={closeMobileSidebar}
        />
      )}

      <div className="d-flex">
        {/* Desktop Sidebar Spacer */}
        <div
          className="d-none d-lg-block"
          style={{ 
            width: isSidebarCollapsed ? '80px' : '260px', 
            transition: 'width 0.3s ease',
            flexShrink: 0
          }}
        >
          <Sidebar isCollapsed={isSidebarCollapsed} />
        </div>

        {/* Mobile Sidebar */}
        <div
          className={`mobile-sidebar-wrapper d-lg-none ${
            isMobileSidebarOpen ? "open" : ""
          }`}
        >
          <Sidebar isCollapsed={false} onClose={closeMobileSidebar} />
        </div>

        <div
          className="dashboard-section flex-grow-1"
          style={{ 
            width: '100%',
            overflowX: 'hidden'
          }}
        >
          <Header toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
          <main className="pt-3" >
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
              <Route path="myInfo/*" element={<MyInfo />} />              <Route path="bookings/*" element={<Bookings />} />
              <Route path="rooms/*" element={<Rooms />} />
              <Route path="reviews/*" element={<Reviews />} />
              <Route path="settings/*" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
