import { useNavigate } from "react-router-dom";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import React, { useEffect, useState } from 'react';
import { adminDashboard, adminBookings, adminHotels, adminUsers } from './services/adminApi';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function DashboardHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    totalHotels: 0,
    activeUsers: 0,
    trends: [0, 0, 0, 0, 0, 0, 0],
    trendLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    activeVendors: [],
  });
  const [allBookings, setAllBookings] = useState([]);
  
  // Pagination states
  const [vendorPage, setVendorPage] = useState(1);
  const [bookingPage, setBookingPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        console.log('Fetching dashboard data...');
        // Fetch counts from respective APIs to ensure accuracy
        const [statsRes, hotelsRes, bookingsRes, usersRes] = await Promise.all([
          adminDashboard.stats().catch(err => ({ error: err.message || 'Stats failed' })),
          adminHotels.list({ page: 1, limit: 10 }).catch(err => ({ error: err.message || 'Hotels failed' })),
          adminBookings.list({ page: 1, limit: 1000 }).catch(err => ({ error: err.message || 'Bookings failed' })),
          // Fetch more users to get a better count if pagination metadata is missing
          adminUsers.list({ page: 1, limit: 1000 }).catch(err => ({ error: err.message || 'Users failed' }))
        ]);

        let s = statsRes?.data || statsRes?.stats || statsRes || {};
        // Handle nested stats object structure
        if (s.stats) {
          s = s.stats;
        }
        
        // Helper to extract total count from various possible API response structures
        const getCount = (res, fallbackStr) => {
          if (!res || res.error) return 0;
          
          // Check for nested data object which is common in some APIs
          const root = res.data || res;
          
          const val = res.totalDocs ?? 
                 res.total ?? 
                 res.count ?? 
                 res.pagination?.totalDocs ?? 
                 res.pagination?.total ?? 
                 res.meta?.total ?? 
                 root?.totalDocs ??
                 root?.total ??
                 root?.count ??
                 (Array.isArray(root) ? root.length : null) ??
                 (Array.isArray(root?.users) ? root.users.length : null) ??
                 (Array.isArray(root?.items) ? root.items.length : null) ??
                 (Array.isArray(root?.data) ? root.data.length : null);
          
          return val || Number(fallbackStr || 0);
        };

        const realTotalHotels = getCount(hotelsRes, s.totalHotels);
        const realTotalBookings = getCount(bookingsRes, s.totalBookings);
        
        // For users, we try to get the count from the response or use the array length
        // We assume usersRes might be an array of all users or a paginated response
        const realActiveUsers = getCount(usersRes, s.totalUsers);

        // Calculate revenue and trends if not provided in stats
        let realTotalRevenue = s.totalRevenue;
        let trendData = Array(7).fill(0);
        let trendLabels = [];
        let bookingsList = [];
        
        // Generate last 7 months labels
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            trendLabels.push(months[d.getMonth()]);
        }

        if (bookingsRes) {
            bookingsList = bookingsRes.data || bookingsRes.bookings || (Array.isArray(bookingsRes) ? bookingsRes : []);
            if (Array.isArray(bookingsList)) {
                // Calculate Revenue fallback only if not provided by backend
                if (realTotalRevenue === undefined) {
                    realTotalRevenue = bookingsList
                        .filter(b => (b.status || '').toLowerCase() === 'confirmed')
                        .reduce((sum, b) => sum + (Number(b.amount) || Number(b.totalAmount) || 0), 0);
                }

                // Calculate Trends
                if (!Array.isArray(s.monthlyBookings)) {
                    // Initialize map for the last 7 months
                    const trendMap = new Map();
                    trendLabels.forEach((label, idx) => {
                         // We need a key that includes year to be precise, but for simple display label matching is enough if within 1 year
                         // Better: calculate the date key for comparison
                         const d = new Date(today.getFullYear(), today.getMonth() - (6 - idx), 1);
                         const key = `${d.getFullYear()}-${d.getMonth()}`;
                         trendMap.set(key, 0);
                    });

                    bookingsList.forEach(b => {
                        const dateStr = b.createdAt || b.created_at || b.checkInDate || b.check_in;
                        if (dateStr) {
                            const d = new Date(dateStr);
                            const key = `${d.getFullYear()}-${d.getMonth()}`;
                            if (trendMap.has(key)) {
                                trendMap.set(key, trendMap.get(key) + 1);
                            }
                        }
                    });
                    
                    trendData = Array.from(trendMap.values());
                } else {
                    trendData = s.monthlyBookings;
                }
            }
        }

        console.log('Calculated Totals:', { realTotalHotels, realTotalBookings, realActiveUsers });

        setStats(prev => ({
          totalBookings: Number(realTotalBookings ?? prev.totalBookings),
          totalRevenue: Number(realTotalRevenue ?? prev.totalRevenue),
          totalHotels: Number(realTotalHotels ?? prev.totalHotels),
          activeUsers: Number(realActiveUsers ?? prev.activeUsers),
          trends: trendData,
          trendLabels: trendLabels,
          activeVendors: s.activeVendors || prev.activeVendors || [],
        }));

        // Normalize and set all bookings for pagination
        const normalizedBookings = bookingsList.map((b) => ({
          id: b.id || b.booking_id || b._id || '',
          guest: b.user?.full_name || b.user?.name || b.userName || '-',
          hotel: b.hotel?.name || b.hotelName || '-',
          checkIn: b.checkInDate || b.check_in || b.checkIn || '-',
          checkOut: b.checkOutDate || b.check_out || b.checkOut || '-',
          status: (b.status || 'PENDING').toString().charAt(0).toUpperCase() + (b.status || 'PENDING').toString().slice(1).toLowerCase(),
          amount: b.amount || b.finalAmount || 0,
        }));
        setAllBookings(normalizedBookings);

      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Pagination Logic
  const getPaginatedData = (data, page) => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return data.slice(start, start + ITEMS_PER_PAGE);
  };

  const activeVendorsList = getPaginatedData(stats.activeVendors, vendorPage);
  const totalVendorPages = Math.ceil(stats.activeVendors.length / ITEMS_PER_PAGE);

  const recentBookingsList = getPaginatedData(allBookings, bookingPage);
  const totalBookingPages = Math.ceil(allBookings.length / ITEMS_PER_PAGE);

  const PaginationControls = ({ page, totalPages, setPage }) => {
    if (totalPages <= 1) return null;
    return (
      <nav aria-label="Page navigation" className="mt-3">
        <ul className="pagination justify-content-end mb-0 pagination-sm">
          <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
            <button 
              className="page-link border-0 text-dark" 
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
          </li>
          <li className="page-item disabled">
            <span className="page-link border-0 text-muted fw-bold bg-transparent">
              {page} / {totalPages}
            </span>
          </li>
          <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
            <button 
              className="page-link border-0 text-dark" 
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  // Booking trend data for line chart
  const bookingData = {
    labels: stats.trendLabels,
    datasets: [
      {
        label: 'Bookings',
        data: stats.trends,
        fill: false,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.4,
      },
    ],
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusClasses = {
      'Confirmed': 'bg-success',
      'Pending': 'bg-warning',
      'Cancelled': 'bg-danger',
    };
    return <span className={`badge ${statusClasses[status] || 'bg-secondary'}`}>{status}</span>;
  };

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold">Dashboard Overview</h2>
          <p className="text-muted mb-0">Welcome back, Admin! Here's what's happening with your business today.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/bookings')}>
            <i className="fas fa-plus me-2"></i>View Bookings
          </button>
        </div>
      </div>

      {error && (<div className="alert alert-warning">{error}</div>)}

      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Total Bookings</h6>
                  <h3 className="mb-0 fw-bold">{stats.totalBookings?.toLocaleString?.() || stats.totalBookings}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                  <i className="fas fa-calendar-check fa-2x text-primary"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Total Revenue</h6>
                  <h3 className="mb-0 fw-bold">₹{stats.totalRevenue?.toLocaleString?.() || stats.totalRevenue}</h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded-circle">
                  <i className="fas fa-rupee-sign fa-2x text-success"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Total Hotels</h6>
                  <h3 className="mb-0 fw-bold">{stats.totalHotels?.toLocaleString?.() || stats.totalHotels}</h3>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded-circle">
                  <i className="fas fa-hotel fa-2x text-warning"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Active Users</h6>
                  <h3 className="mb-0 fw-bold">{stats.activeUsers?.toLocaleString?.() || stats.activeUsers}</h3>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded-circle">
                  <i className="fas fa-users fa-2x text-info"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0">
              <h5 className="mb-0">Booking Trends</h5>
              <p className="text-muted small mb-0">Last 7 months booking statistics</p>
            </div>
            <div className="card-body">
              <Line data={bookingData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
            </div>
          </div>
        </div>
      </div>

      {/* Active Vendors & Revenue */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="mb-0">Active Vendors & Revenue</h5>
              <p className="text-muted small mb-0">Top performing vendors by revenue</p>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Vendor Name</th>
                      <th>Business Name</th>
                      <th>Hotels Managed</th>
                      <th>Total Bookings</th>
                      <th>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeVendorsList && activeVendorsList.length > 0 ? (
                      activeVendorsList.map((vendor) => (
                        <tr key={vendor.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar me-2 rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                {vendor.name.charAt(0)}
                              </div>
                              <div>
                                <div className="fw-bold">{vendor.name}</div>
                                <div className="small text-muted">{vendor.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>{vendor.business || '-'}</td>
                          <td>
                            {vendor.hotels && vendor.hotels.length > 0 ? (
                              <span title={vendor.hotels.join(', ')}>
                                {vendor.hotels.length} Hotel{vendor.hotels.length !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-muted">None</span>
                            )}
                          </td>
                          <td>{vendor.bookings}</td>
                          <td className="fw-bold text-success">₹{vendor.revenue?.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          No active vendors with revenue found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 pb-3">
                <PaginationControls 
                  page={vendorPage} 
                  totalPages={totalVendorPages} 
                  setPage={setVendorPage} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Recent Bookings</h5>
            <p className="text-muted small mb-0">Latest booking activities</p>
          </div>
          <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/dashboard/bookings')}>View All</button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
  <tr>
    <th>Sr No.</th>
    <th>Booking ID</th>
    <th>Guest</th>
    <th>Hotel</th>
    <th>Check-in</th>
    <th>Check-out</th>
    <th>Amount</th>
    <th>Status</th>
    <th>Action</th>
  </tr>
</thead>

             <tbody>
  {loading ? (
    <tr>
      <td colSpan="8" className="text-center py-4">Loading...</td>
    </tr>
  ) : recentBookingsList.length > 0 ? (
    recentBookingsList.map((booking, index) => (
      <tr key={booking.id || index}>
        <td>
          <span className="badge bg-light text-dark">{(bookingPage - 1) * ITEMS_PER_PAGE + index + 1}</span>
        </td>
        <td>{booking.id || '-'}</td>
        <td>{booking.guest || '-'}</td>
        <td>{booking.hotel || '-'}</td>
        <td>{booking.checkIn || '-'}</td>
        <td>{booking.checkOut || '-'}</td>
        <td>₹{Number(booking.amount || 0).toLocaleString()}</td>
        <td><StatusBadge status={booking.status} /></td>
        <td>
          <button className="btn btn-sm btn-outline-primary" title="View Details" onClick={() => navigate('/dashboard/bookings')}>
            <i className="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="8" className="text-center py-4 text-muted">
        No recent bookings found
      </td>
    </tr>
  )}
</tbody>

            </table>
          </div>
          <div className="px-4 pb-3">
            <PaginationControls 
              page={bookingPage} 
              totalPages={totalBookingPages} 
              setPage={setBookingPage} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHome;
