import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logoutVendor, getCurrentUser } from "./utils/auth";

const Header = ({ toggleSidebar, isSidebarCollapsed }) => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [vendorName, setVendorName] = useState("Vendor");

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      // Get vendor name from various possible fields
      const name =
        user.name ||
        user.vendorName ||
        user.vendor_name ||
        user.fullName ||
        user.full_name ||
        "Vendor";
      setVendorName(name);
    }
  }, []);

  const handleLogout = () => {
    // Clear session and logout
    logoutVendor();
    // Close dropdowns
    setIsProfileOpen(false);
    // Navigate to login page
    navigate("/", { replace: true });
  };

  const handleProfileClick = (path) => {
    setIsProfileOpen(false);
    navigate(path);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside dropdowns
      if (!event.target.closest(".dropdown")) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm">
      <div className="container-fluid px-4">
        <button
          className="btn btn-link text-dark d-lg-none me-3"
          onClick={toggleSidebar}
          aria-label="Toggle navigation"
        >
          <i className="fas fa-bars"></i>
        </button>

        <div className="d-flex align-items-center ms-auto">
          <button
            className="btn btn-link text-dark me-2 d-none d-md-inline-block"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else if (document.exitFullscreen) {
                document.exitFullscreen();
              }
            }}
            title="Toggle Fullscreen"
          >
            <i className="fas fa-expand"></i>
          </button>

          <div className="dropdown">
            <button
              className="btn btn-link text-dark text-decoration-none dropdown-toggle d-flex align-items-center"
              onClick={(e) => {
                e.stopPropagation();
                setIsProfileOpen(!isProfileOpen);
              }}
              aria-expanded={isProfileOpen}
            >
              <div className="me-2 d-none d-md-block text-end">
                <div className="fw-medium">Hi, {vendorName}</div>
                <small className="text-muted">Vendor</small>
              </div>
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                style={{ width: "40px", height: "40px" }}
              >
                <i className="fas fa-user"></i>
              </div>
            </button>

            <ul
              className={`dropdown-menu dropdown-menu-end ${
                isProfileOpen ? "show" : ""
              }`}
              style={{
                position: "absolute",
                right: "-25px",
                top: "100%",
                zIndex: 1050,
              }}
            >
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => handleProfileClick("/dashboard/myInfo")}
                >
                  <i className="fas fa-user-circle me-2"></i> Profile
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() =>
                    handleProfileClick("/dashboard/change-password")
                  }
                >
                  <i className="fas fa-key me-2"></i> Change Password
                </button>
              </li>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <button
                  className="dropdown-item text-danger"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt me-2"></i> Logout
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