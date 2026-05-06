import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { adminBookings, adminHotels, adminUsers, adminVendors } from "./services/adminApi";
import { API_BASE_URL } from "./config";

const Sidebar = ({ isCollapsed, isMobile = false, onMobileClose }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});
  const [badgeCounts, setBadgeCounts] = useState({ users: 0, hotels: 0, vendors: 0, bookings: 0 });
  const [seenIds, setSeenIds] = useState({
    users: new Set(),
    hotels: new Set(),
    vendors: new Set(),
    bookings: new Set()
  });
  const [unseenIds, setUnseenIds] = useState({
    users: new Set(),
    hotels: new Set(),
    vendors: new Set(),
    bookings: new Set()
  });

  
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

  const sectionKeyForPath = (path) => {
    if (path.startsWith('/dashboard/users')) return 'users';
    if (path.startsWith('/dashboard/hotels')) return 'hotels';
    if (path.startsWith('/dashboard/vendors')) return 'vendors';
    if (path.startsWith('/dashboard/bookings')) return 'bookings';
    return null;
  };

  const storageKeyForSection = (section) => `admin_seen_${section}_ids_v1`;
  const unseenStorageKeyForSection = (section) => `admin_unseen_${section}_ids_v1`;

  const loadSeenSet = (section) => {
    try {
      const raw = localStorage.getItem(storageKeyForSection(section));
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.map((v) => String(v)));
    } catch {
      return new Set();
    }
  };

  const saveSeenSet = (section, set) => {
    try {
      localStorage.setItem(storageKeyForSection(section), JSON.stringify(Array.from(set)));
    } catch {
      void 0;
    }
  };

  const loadUnseenSet = (section) => {
    try {
      const raw = localStorage.getItem(unseenStorageKeyForSection(section));
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.map((v) => String(v)));
    } catch {
      return new Set();
    }
  };

  const saveUnseenSet = (section, set) => {
    try {
      localStorage.setItem(unseenStorageKeyForSection(section), JSON.stringify(Array.from(set)));
    } catch {
      void 0;
    }
  };

  const normalizeList = (res) => {
    return Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.results)
      ? res.results
      : Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res?.users)
      ? res.users
      : Array.isArray(res?.hotels)
      ? res.hotels
      : Array.isArray(res?.vendors)
      ? res.vendors
      : Array.isArray(res?.bookings)
      ? res.bookings
      : Array.isArray(res)
      ? res
      : [];
  };

  const getId = (obj) => obj?.id ?? obj?._id ?? obj?.booking_id ?? obj?.hotel_id ?? obj?.vendor_id ?? obj?.user_id;

  const hasValidSeenState = () => {
    const sections = ['users', 'hotels', 'vendors', 'bookings'];
    for (const section of sections) {
      try {
        const raw = localStorage.getItem(storageKeyForSection(section));
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return false;
      } catch {
        return false;
      }
    }
    return true;
  };

  const bootstrapIfNeeded = async () => {
    try {
      const bootKey = 'admin_seen_bootstrap_v1';
      const booted = localStorage.getItem(bootKey);
      if (booted && hasValidSeenState()) return false;

      const [uRes, hRes, vRes, bRes] = await Promise.all([
        adminUsers.list({ page: 1, limit: 200 }).catch(() => null),
        adminHotels.list({ page: 1, limit: 200 }).catch(() => null),
        adminVendors.list({ page: 1, limit: 200 }).catch(() => null),
        adminBookings.list({ page: 1, limit: 200 }).catch(() => null),
      ]);

      const initial = {
        users: new Set(normalizeList(uRes).map((x) => String(getId(x))).filter(Boolean)),
        hotels: new Set(normalizeList(hRes).map((x) => String(getId(x))).filter(Boolean)),
        vendors: new Set(normalizeList(vRes).map((x) => String(getId(x))).filter(Boolean)),
        bookings: new Set(normalizeList(bRes).map((x) => String(getId(x))).filter(Boolean)),
      };

      saveSeenSet('users', initial.users);
      saveSeenSet('hotels', initial.hotels);
      saveSeenSet('vendors', initial.vendors);
      saveSeenSet('bookings', initial.bookings);
      saveUnseenSet('users', new Set());
      saveUnseenSet('hotels', new Set());
      saveUnseenSet('vendors', new Set());
      saveUnseenSet('bookings', new Set());
      localStorage.setItem(bootKey, '1');
      setSeenIds(initial);
      setUnseenIds({ users: new Set(), hotels: new Set(), vendors: new Set(), bookings: new Set() });
      setBadgeCounts({ users: 0, hotels: 0, vendors: 0, bookings: 0 });
      return true;
    } catch {
      return false;
    }
  };

  const fetchBadges = async () => {
    try {
      const bootedNow = await bootstrapIfNeeded();
      if (bootedNow) return;

      const currentSeen = {
        users: seenIds?.users instanceof Set ? seenIds.users : loadSeenSet('users'),
        hotels: seenIds?.hotels instanceof Set ? seenIds.hotels : loadSeenSet('hotels'),
        vendors: seenIds?.vendors instanceof Set ? seenIds.vendors : loadSeenSet('vendors'),
        bookings: seenIds?.bookings instanceof Set ? seenIds.bookings : loadSeenSet('bookings'),
      };

      const [uRes, hRes, vRes, bRes] = await Promise.all([
        adminUsers.list({ page: 1, limit: 200 }).catch(() => null),
        adminHotels.list({ page: 1, limit: 200 }).catch(() => null),
        adminVendors.list({ page: 1, limit: 200 }).catch(() => null),
        adminBookings.list({ page: 1, limit: 200 }).catch(() => null),
      ]);

      const usersList = normalizeList(uRes);
      const hotelsList = normalizeList(hRes);
      const vendorsList = normalizeList(vRes);
      const bookingsList = normalizeList(bRes);

      const computeUnseen = (list, set) => {
        const s = set instanceof Set ? set : new Set();
        const ids = new Set();
        for (const item of list) {
          const id = getId(item);
          if (!id) continue;
          const sid = String(id);
          if (!s.has(sid)) ids.add(sid);
        }
        return ids;
      };

      const usersUnseen = computeUnseen(usersList, currentSeen.users);
      const hotelsUnseen = computeUnseen(hotelsList, currentSeen.hotels);
      const vendorsUnseen = computeUnseen(vendorsList, currentSeen.vendors);
      const bookingsUnseen = computeUnseen(bookingsList, currentSeen.bookings);

      saveUnseenSet('users', usersUnseen);
      saveUnseenSet('hotels', hotelsUnseen);
      saveUnseenSet('vendors', vendorsUnseen);
      saveUnseenSet('bookings', bookingsUnseen);
      setUnseenIds({ users: usersUnseen, hotels: hotelsUnseen, vendors: vendorsUnseen, bookings: bookingsUnseen });

      setBadgeCounts({
        users: usersUnseen.size,
        hotels: hotelsUnseen.size,
        vendors: vendorsUnseen.size,
        bookings: bookingsUnseen.size,
      });
    } catch {
      void 0;
    }
  };

  const handleMenuClick = (targetPath) => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  useEffect(() => {
    setExpandedItems({});
  }, [location.pathname]);

  useEffect(() => {
    setSeenIds({
      users: loadSeenSet('users'),
      hotels: loadSeenSet('hotels'),
      vendors: loadSeenSet('vendors'),
      bookings: loadSeenSet('bookings')
    });
    setUnseenIds({
      users: loadUnseenSet('users'),
      hotels: loadUnseenSet('hotels'),
      vendors: loadUnseenSet('vendors'),
      bookings: loadUnseenSet('bookings')
    });
    fetchBadges();
    const interval = setInterval(() => {
      fetchBadges();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [seenIds]);

  useEffect(() => {
    let es;
    let refreshTimer;
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const url = `${API_BASE_URL}/admin/notifications/stream?token=${encodeURIComponent(token)}`;
      es = new EventSource(url);
      const onInvalidate = (evt) => {
        try {
          const payload = evt?.data ? JSON.parse(evt.data) : null;
          const section = payload?.section;
          const id = payload?.id;
          if (section && id && ['users', 'hotels', 'vendors', 'bookings'].includes(section)) {
            const sid = String(id);
            const seen = loadSeenSet(section);
            if (!(seen instanceof Set) || !seen.has(sid)) {
              setUnseenIds((prev) => {
                const next = {
                  users: new Set(prev?.users instanceof Set ? Array.from(prev.users) : []),
                  hotels: new Set(prev?.hotels instanceof Set ? Array.from(prev.hotels) : []),
                  vendors: new Set(prev?.vendors instanceof Set ? Array.from(prev.vendors) : []),
                  bookings: new Set(prev?.bookings instanceof Set ? Array.from(prev.bookings) : []),
                };
                const set = next[section];
                if (!set.has(sid)) {
                  set.add(sid);
                  saveUnseenSet(section, set);
                  setBadgeCounts((bc) => ({ ...bc, [section]: (Number(bc?.[section]) || 0) + 1 }));
                }
                return next;
              });
            }
          }
        } catch {
          void 0;
        }

        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          fetchBadges();
        }, 300);
      };
      es.addEventListener('invalidate', onInvalidate);
      es.addEventListener('ready', () => fetchBadges());
    } catch {
      void 0;
    }
    return () => {
      try {
        clearTimeout(refreshTimer);
        if (es) es.close();
      } catch {
        void 0;
      }
    };
  }, []);

  useEffect(() => {
    const onSeen = (e) => {
      const section = e?.detail?.section;
      const id = e?.detail?.id;
      if (!section || !id) return;
      if (!['users', 'hotels', 'vendors', 'bookings'].includes(section)) return;

      setSeenIds((prev) => {
        const next = {
          users: new Set(prev?.users instanceof Set ? Array.from(prev.users) : []),
          hotels: new Set(prev?.hotels instanceof Set ? Array.from(prev.hotels) : []),
          vendors: new Set(prev?.vendors instanceof Set ? Array.from(prev.vendors) : []),
          bookings: new Set(prev?.bookings instanceof Set ? Array.from(prev.bookings) : []),
        };
        const set = next[section];
        const sid = String(id);
        const had = set.has(sid);
        if (!had) {
          set.add(sid);
          saveSeenSet(section, set);
          setUnseenIds((prevUnseen) => {
            const nextUnseen = {
              users: new Set(prevUnseen?.users instanceof Set ? Array.from(prevUnseen.users) : []),
              hotels: new Set(prevUnseen?.hotels instanceof Set ? Array.from(prevUnseen.hotels) : []),
              vendors: new Set(prevUnseen?.vendors instanceof Set ? Array.from(prevUnseen.vendors) : []),
              bookings: new Set(prevUnseen?.bookings instanceof Set ? Array.from(prevUnseen.bookings) : []),
            };
            nextUnseen[section].delete(sid);
            saveUnseenSet(section, nextUnseen[section]);
            return nextUnseen;
          });
          setBadgeCounts((bc) => ({ ...bc, [section]: Math.max(0, (Number(bc?.[section]) || 0) - 1) }));
        }
        return next;
      });
    };

    window.addEventListener('admin_item_seen', onSeen);
    return () => window.removeEventListener('admin_item_seen', onSeen);
  }, []);

  const getBadgeCount = (path) => {
    const section = sectionKeyForPath(path);
    if (!section) return 0;
    return badgeCounts[section] || 0;
  };

  const formatBadge = (n) => (n > 99 ? '99+' : String(n));

  const markSectionUnseenAsSeen = (section) => {
    if (!section || !['users', 'hotels', 'vendors', 'bookings'].includes(section)) return;
    const unseen = loadUnseenSet(section);
    if (!(unseen instanceof Set) || unseen.size === 0) return;

    const seen = loadSeenSet(section);
    const nextSeen = new Set(seen instanceof Set ? Array.from(seen) : []);
    unseen.forEach((id) => nextSeen.add(String(id)));

    saveSeenSet(section, nextSeen);
    saveUnseenSet(section, new Set());
    try {
      window.dispatchEvent(new CustomEvent('admin_section_seen', {
        detail: { section, ids: Array.from(unseen).map((id) => String(id)) }
      }));
    } catch {
      void 0;
    }

    setSeenIds((prev) => ({
      users: section === 'users' ? nextSeen : new Set(prev?.users instanceof Set ? Array.from(prev.users) : []),
      hotels: section === 'hotels' ? nextSeen : new Set(prev?.hotels instanceof Set ? Array.from(prev.hotels) : []),
      vendors: section === 'vendors' ? nextSeen : new Set(prev?.vendors instanceof Set ? Array.from(prev.vendors) : []),
      bookings: section === 'bookings' ? nextSeen : new Set(prev?.bookings instanceof Set ? Array.from(prev.bookings) : []),
    }));

    setUnseenIds((prev) => ({
      users: section === 'users' ? new Set() : new Set(prev?.users instanceof Set ? Array.from(prev.users) : []),
      hotels: section === 'hotels' ? new Set() : new Set(prev?.hotels instanceof Set ? Array.from(prev.hotels) : []),
      vendors: section === 'vendors' ? new Set() : new Set(prev?.vendors instanceof Set ? Array.from(prev.vendors) : []),
      bookings: section === 'bookings' ? new Set() : new Set(prev?.bookings instanceof Set ? Array.from(prev.bookings) : []),
    }));

    setBadgeCounts((prev) => ({ ...prev, [section]: 0 }));
  };

  useEffect(() => {
    const section = sectionKeyForPath(location.pathname);
    if (!section) return;
    markSectionUnseenAsSeen(section);
  }, [location.pathname, unseenIds]);

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
                onClick={() => handleMenuClick(item.path)}
              >
                <span className="menu-icon">
                  <i className={`${item.icon} me-3`}></i>
                  {getBadgeCount(item.path) > 0 && (
                    <span className={`notif-badge ${isCollapsed ? 'collapsed-badge' : ''}`}>
                      {formatBadge(getBadgeCount(item.path))}
                    </span>
                  )}
                </span>
                {!isCollapsed && <span className="menu-title">{item.title}</span>}
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
          .menu-icon { position: relative; display: inline-flex; align-items: center; }
          .notif-badge { position: absolute; top: -6px; right: 8px; background: #ff3b30; color: #fff; border-radius: 999px; font-size: 11px; font-weight: 700; line-height: 1; padding: 3px 6px; border: 2px solid rgba(30, 60, 114, 0.9); min-width: 22px; text-align: center; }
          .collapsed-badge { right: 2px; }
        `}
      </style>
    </div>
  );
};

export default Sidebar;
