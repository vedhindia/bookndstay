import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from './services/userService';
import { adminUsers } from './services/adminApi';

const StatusBadge = ({ status }) => (
  <span className={`badge ${status === 'active' ? 'bg-success' : 'bg-danger'}`}>
    {status === 'active' ? 'Active' : 'Blocked'}
  </span>
);

const Users = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // User Bookings State
  const [userBookings, setUserBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [selectedUserForBookings, setSelectedUserForBookings] = useState(null);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(1);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 10;

  // Helpers
  const getUserId = (u) => u?.id || u?._id || u?.userId || u?.uuid;
  const getUserStatus = (u) => {
    if (typeof u?.status === 'string') {
      const s = u.status.toLowerCase();
      if (['active', 'verified', 'unblocked'].includes(s)) return 'active';
      if (['blocked', 'inactive', 'disabled'].includes(s)) return 'blocked';
    }
    if (u?.isBlocked === true) return 'blocked';
    if (u?.isActive === false) return 'blocked';
    return 'active';
  };

  const normalizeUser = (u) => ({
    id: getUserId(u),
    name: u?.name || u?.full_name || u?.username || 'N/A',
    email: u?.email || 'N/A',
    phone: u?.phone || u?.mobile || 'N/A',
    role: u?.role || 'User',
    status: getUserStatus(u),
    createdAt: u?.createdAt || u?.joined || '',
    address: u?.address,
    raw: u,
  });

  const normalizeUsersResponse = (resp) => {
    const data = resp?.data || resp;
    const usersArr =
      data?.users || data?.items || data?.results || data?.data || (Array.isArray(data) ? data : []);

    return (usersArr || []).map(normalizeUser);
  };

  const filterUsers = (usersList, searchQuery, statusFilter) => {
    let filtered = [...usersList];

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone.toLowerCase().includes(query) ||
        user.id.toString().toLowerCase().includes(query)
      );
    }

    if (statusFilter && statusFilter !== 'All') {
      filtered = filtered.filter(user => 
        user.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    return filtered;
  };

  const paginateUsers = (usersList, page) => {
    const startIndex = (page - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const paginatedUsers = usersList.slice(startIndex, endIndex);
    const totalPages = Math.ceil(usersList.length / usersPerPage);
    
    return {
      users: paginatedUsers,
      totalPages,
      totalUsers: usersList.length
    };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      let resp;
      try {
        resp = await userService.getPaginatedUsers({
          page: 1,
          limit: 1000,
        });
      } catch (apiError) {
        resp = await userService.getAllUsers();
      }

      const usersList = normalizeUsersResponse(resp);
      setUsers(usersList);
      
      const filtered = filterUsers(usersList, query, status);
      const paginated = paginateUsers(filtered, currentPage);
      
      setFilteredUsers(paginated.users);
      setTotalPages(paginated.totalPages);
      setTotalUsers(paginated.totalUsers);

    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err?.message || 'Failed to fetch users');
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (users.length > 0) {
      const filtered = filterUsers(users, query, status);
      const paginated = paginateUsers(filtered, 1);
      setFilteredUsers(paginated.users);
      setTotalPages(paginated.totalPages);
      setTotalUsers(paginated.totalUsers);
      setCurrentPage(1);
    }
  }, [query, status, users]);

  useEffect(() => {
    if (users.length > 0) {
      const filtered = filterUsers(users, query, status);
      const paginated = paginateUsers(filtered, currentPage);
      setFilteredUsers(paginated.users);
    }
  }, [currentPage]);

  const handleStatusUpdate = async (user) => {
    try {
      const userId = getUserId(user);
      setStatusUpdatingId(userId);
      setError(null);

      if (getUserStatus(user) === 'active') {
        await userService.blockUser(userId, { reason: 'Blocked by admin' });
      } else {
        await userService.unblockUser(userId);
      }
      
      const updatedUsers = users.map(u => {
        if (getUserId(u) === userId) {
          return {
            ...u,
            status: getUserStatus(user) === 'active' ? 'blocked' : 'active'
          };
        }
        return u;
      });
      
      setUsers(updatedUsers);
      
      if (selected && getUserId(selected) === userId) {
        setSelected({
          ...selected,
          status: getUserStatus(user) === 'active' ? 'blocked' : 'active'
        });
      }

    } catch (err) {
      console.error('Error updating user status:', err);
      setError(err?.message || 'Failed to update user status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleViewBookings = async (user, page = 1) => {
    const targetUser = user || selectedUserForBookings;
    if (!targetUser) return;

    if (user) {
      setSelectedUserForBookings(user);
      setShowBookingsModal(true);
      // Reset page when opening for a new user (or same user freshly)
      setBookingsPage(1);
      page = 1; 
    } else {
      setBookingsPage(page);
    }

    setLoadingBookings(true);
    // Only clear if opening fresh, otherwise keep data while loading next page? 
    // Actually better to clear or show loading state to avoid confusion.
    if (user) setUserBookings([]); 
    
    try {
      const userId = getUserId(targetUser);
      const res = await adminUsers.getBookings(userId, { page, limit: 10 });
      
      const bookings = res.data || [];
      const pagination = res.pagination || {};
      
      setUserBookings(Array.isArray(bookings) ? bookings : []);
      setBookingsTotalPages(pagination.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch user bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleQueryChange = (e) => setQuery(e.target.value);
  const handleStatusChange = (e) => setStatus(e.target.value);
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Users</h4>
          <small className="text-muted">Manage all users ({totalUsers} total)</small>
        </div>
        <div className="d-flex gap-2">
          <input
            className="form-control"
            placeholder="Search..."
            value={query}
            onChange={handleQueryChange}
            disabled={loading}
            style={{ minWidth: '200px' }}
          />
          <select
            className="form-select"
            value={status}
            onChange={handleStatusChange}
            disabled={loading}
            style={{ minWidth: '120px' }}
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Blocked">Blocked</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-light" onClick={fetchUsers}>
            Retry
          </button>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Sr No.</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <div className="spinner-border text-primary"></div>
                      <div className="mt-2">Loading users...</div>
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((u, index) => (
                    <tr key={u.id}>
                      {/* Serial number */}
                      <td>{(currentPage - 1) * usersPerPage + index + 1}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone}</td>
                      <td>{u.role}</td>
                      <td><StatusBadge status={u.status} /></td>
                      <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</td>
                      <td className="text-end">
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setSelected(u)}
                            title="View Profile"
                          >
                            <i className="fas fa-user"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => handleViewBookings(u)}
                            title="View Bookings"
                          >
                            <i className="fas fa-calendar-alt"></i>
                          </button>
                          <button
                            className={`btn btn-sm btn-outline-${u.status === 'active' ? 'danger' : 'success'}`}
                            onClick={() => handleStatusUpdate(u)}
                            disabled={statusUpdatingId === u.id}
                            title={statusUpdatingId === u.id ? 'Updating...' : (u.status === 'active' ? 'Block user' : 'Unblock user')}
                          >
                            {statusUpdatingId === u.id ? (
                              <div className="spinner-border spinner-border-sm" role="status"></div>
                            ) : (
                              <i className={`fas fa-${u.status === 'active' ? 'ban' : 'unlock'}`}></i>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      {query || status !== 'All' ? 'No users found matching your criteria' : 'No users found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && !loading && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <small className="text-muted">
                Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
              </small>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Prev
                    </button>
                  </li>
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    if (endPage - startPage < maxVisiblePages - 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => handlePageChange(i)}
                          >
                            {i}
                          </button>
                        </li>
                      );
                    }
                    return pages;
                  })()}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="modal d-block" onClick={() => setSelected(null)} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">User Profile</h5>
                <button type="button" className="btn-close" onClick={() => setSelected(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Name</label>
                    <input className="form-control" value={selected.name} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Email</label>
                    <input className="form-control" value={selected.email} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Phone</label>
                    <input className="form-control" value={selected.phone} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Role</label>
                    <input className="form-control" value={selected.role} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Status</label>
                    <div className="form-control d-flex align-items-center">
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Joined</label>
                    <input 
                      className="form-control" 
                      value={selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : 'N/A'} 
                      readOnly 
                    />
                  </div>
                  {selected.address && (
                    <div className="col-12">
                      <label className="form-label fw-bold">Address</label>
                      <textarea 
                        className="form-control" 
                        value={selected.address} 
                        readOnly 
                        rows="2"
                      ></textarea>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-info" 
                  onClick={() => handleViewBookings(selected)}
                >
                  <i className="fas fa-calendar-alt me-2"></i>View Bookings
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSelected(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showBookingsModal && (
        <div className="modal d-block" onClick={() => setShowBookingsModal(false)} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Bookings for {selectedUserForBookings?.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowBookingsModal(false)}></button>
              </div>
              <div className="modal-body">
                {loadingBookings ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary"></div>
                    <p className="mt-2">Loading bookings...</p>
                  </div>
                ) : userBookings.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Booking ID</th>
                          <th>Hotel</th>
                          <th>Check In</th>
                          <th>Check Out</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userBookings.map((booking) => (
                          <tr key={booking.id || booking._id}>
                            <td>{booking.id}</td>
                            <td>
                              {booking.hotel?.name || booking.hotel_name || 'N/A'}
                            </td>
                            <td>{booking.check_in ? new Date(booking.check_in).toLocaleDateString() : 'N/A'}</td>
                            <td>{booking.check_out ? new Date(booking.check_out).toLocaleDateString() : 'N/A'}</td>
                            <td>₹{booking.amount || booking.total_amount || 0}</td>
                            <td>
                              <span className={`badge ${
                                (booking.status || '').toLowerCase() === 'confirmed' ? 'bg-success' :
                                (booking.status || '').toLowerCase() === 'cancelled' ? 'bg-danger' :
                                'bg-warning text-dark'
                              }`}>
                                {booking.status || 'Pending'}
                              </span>
                            </td>
                            <td>{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="fas fa-calendar-times fa-3x mb-3"></i>
                    <p>No bookings found for this user.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer d-flex justify-content-between">
                 {bookingsTotalPages > 1 && (
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${bookingsPage === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handleViewBookings(null, bookingsPage - 1)}
                          disabled={bookingsPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      <li className="page-item disabled">
                        <span className="page-link">
                          Page {bookingsPage} of {bookingsTotalPages}
                        </span>
                      </li>
                      <li className={`page-item ${bookingsPage === bookingsTotalPages ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handleViewBookings(null, bookingsPage + 1)}
                          disabled={bookingsPage === bookingsTotalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setShowBookingsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
