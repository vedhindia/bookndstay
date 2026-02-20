import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from './services/apiClient';
import Pagination from './components/Pagination';

const mockBookings = [
  { id: 'B001', user: 'John Doe', userId: 'U001', hotel: 'Grand Plaza', checkIn: '2025-09-20', checkOut: '2025-09-22', guests: 2, price: 250, status: 'Confirmed' },
  { id: 'B002', user: 'Jane Smith', userId: 'U002', hotel: 'Beach Resort', checkIn: '2025-10-05', checkOut: '2025-10-08', guests: 3, price: 420, status: 'Pending' },
  { id: 'B003', user: 'Michael Chen', userId: 'U003', hotel: 'Mountain View', checkIn: '2025-11-01', checkOut: '2025-11-04', guests: 2, price: 300, status: 'Cancelled' },
];

const StatusBadge = ({ status }) => {
  const color = status === 'Confirmed' ? 'success' : status === 'Pending' ? 'warning' : status === 'Cancelled' ? 'danger' : 'secondary';
  return <span className={`badge bg-${color}`}>{status}</span>;
};

const Bookings = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const userFilter = location.state?.userId ? {
    userId: location.state.userId,
    userName: location.state.userName,
    userEmail: location.state.userEmail
  } : null;

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const resResp = await api.get('/vendor/bookings', {
        params: {
          page,
          limit: pageSize,
          status: status !== 'All' ? status.toUpperCase() : undefined,
          userId: userFilter?.userId || undefined,
          dateFrom,
          dateTo
        }
      });
      const res = resResp?.data;
      const list = Array.isArray(res?.bookings)
        ? res.bookings
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.results)
        ? res.results
        : Array.isArray(res)
        ? res
        : [];
      const normalized = list.map((b) => ({
        id: b.id || b.booking_id || b._id || '',
        userId: b.user?.id || b.user?._id || b.userId || '',
        user: b.user?.full_name || b.user?.name || b.userName || '',
        userEmail: b.user?.email || b.userEmail || '',
        hotel: b.hotel?.name || b.hotelName || '',
        checkIn: b.checkInDate || b.check_in || b.checkIn || '',
        checkOut: b.checkOutDate || b.check_out || b.checkOut || '',
        guests: b.guests || b.noOfGuests || 0,
        price: b.amount || b.finalAmount || 0,
        status: (b.status || 'PENDING').toString().charAt(0).toUpperCase() + (b.status || 'PENDING').toString().slice(1).toLowerCase(),
      }));
      setItems(normalized);
      const computedTotal = res?.total ?? res?.pagination?.total ?? res?.meta?.total ?? res?.count ?? normalized.length;
      setTotal(Number(computedTotal));
    } catch (e) {
      console.warn('Failed to load bookings, using mock', e?.message);
      const mockData = userFilter 
        ? mockBookings.filter(b => b.userId === userFilter.userId)
        : mockBookings;
      setItems(mockData);
      setError('Could not load bookings from server. Showing mock data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, pageSize, status, dateFrom, dateTo, userFilter?.userId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(b => {
      const values = [b.user, b.hotel, b.id, b.userEmail]
        .map(v => (v || '').toString().toLowerCase());
      const matches = q ? values.some(v => v.includes(q)) : true;
      const statusMatch = status === 'All' || !status || b.status === status;
      const fromMatch = !dateFrom || (b.checkIn && new Date(b.checkIn) >= new Date(dateFrom));
      const toMatch = !dateTo || (b.checkOut && new Date(b.checkOut) <= new Date(dateTo));
      return matches && statusMatch && fromMatch && toMatch;
    });
  }, [query, status, dateFrom, dateTo, items]);

  const clearUserFilter = () => {
    navigate('/dashboard/bookings', { replace: true, state: {} });
    window.location.reload();
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Bookings</h4>
          <small className="text-muted">Search, filter and manage bookings</small>
        </div>
      </div>

      {userFilter && (
        <div className="alert alert-info d-flex justify-content-between align-items-center py-2 mb-3">
          <div>
            <i className="fas fa-filter me-2"></i>
            <strong>Filtered by User:</strong> {userFilter.userName} ({userFilter.userEmail})
          </div>
          <button 
            className="btn btn-sm btn-outline-secondary" 
            onClick={clearUserFilter}
          >
            <i className="fas fa-times me-1"></i>Clear Filter
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <label className="form-label small text-muted mb-1">Search</label>
              <input 
                className="form-control" 
                placeholder="Search by user, hotel or ID" 
                value={query} 
                onChange={e => { setQuery(e.target.value); setPage(1); }} 
              />
            </div>

            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Status</label>
              <select 
                className="form-select" 
                value={status} 
                onChange={e => { setStatus(e.target.value); setPage(1); }}
              >
                <option>All</option>
                <option>Confirmed</option>
                <option>Pending</option>
                <option>Cancelled</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Check-in From</label>
              <input 
                type="date" 
                className="form-control" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)} 
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Check-out To</label>
              <input 
                type="date" 
                className="form-control" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)} 
              />
            </div>
            <div className="col-md-1 d-flex align-items-end">
              <button 
                className="btn btn-outline-secondary w-100" 
                onClick={() => {
                  setQuery('');
                  setStatus('All');
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
              >
                <i className="fas fa-redo"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="alert alert-success alert-dismissible fade show py-2" role="alert">
          <i className="fas fa-check-circle me-2"></i>{success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}
      {error && (
        <div className="alert alert-warning alert-dismissible fade show py-2" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>{error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="px-3">Sr No.</th>
                  <th>User</th>
                  <th>Hotel</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th className="text-center">Guests</th>
                  <th className="text-end">Price</th>
                  <th className="text-center">Status</th>
                  <th className="text-end px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <div className="mt-2 text-muted">Loading bookings...</div>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((b, index) => (
                    <tr key={b.id}>
                      <td className="px-3">
                        <span className="badge bg-light text-dark">
                          {(page - 1) * pageSize + index + 1}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-semibold">{b.user}</span>
                          {b.userEmail && (
                            <small className="text-muted">{b.userEmail}</small>
                          )}
                        </div>
                      </td>
                      <td>{b.hotel}</td>
                      <td><small>{b.checkIn ? new Date(b.checkIn).toLocaleDateString() : 'N/A'}</small></td>
                      <td><small>{b.checkOut ? new Date(b.checkOut).toLocaleDateString() : 'N/A'}</small></td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark">{b.guests}</span>
                      </td>
                      <td className="text-end fw-semibold">₹{b.price}</td>
                      <td className="text-center">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="text-end px-3">
                        <div className="btn-group">
                          <button 
                            className="btn btn-sm btn-outline-primary" 
                            onClick={() => setSelected(b)}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center text-muted py-5">
                      <i className="fas fa-inbox fa-3x mb-3 d-block"></i>
                      <div>No bookings found</div>
                      {(query || status !== 'All' || dateFrom || dateTo || userFilter) && (
                        <small className="text-muted">Try adjusting your filters</small>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">
                Showing <strong>{filtered.length}</strong> of <strong>{total}</strong> bookings
              </small>
              <select 
                className="form-select form-select-sm" 
                style={{ width: 'auto' }} 
                value={pageSize} 
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
            <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selected && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Booking Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelected(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <h6 className="text-muted text-uppercase small mb-2">Booking Reference</h6>
                    <div className="d-flex align-items-center mb-2">
                      <span className="text-muted me-2">ID:</span>
                      <span className="fw-bold">{selected.id}</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <span className="text-muted me-2">Status:</span>
                      <StatusBadge status={selected.status} />
                    </div>
                    <div className="d-flex align-items-center">
                      <span className="text-muted me-2">Total Price:</span>
                      <span className="fw-bold text-success">₹{selected.price}</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted text-uppercase small mb-2">Hotel Information</h6>
                    <div className="mb-2">
                      <i className="fas fa-hotel text-muted me-2"></i>
                      <span className="fw-semibold">{selected.hotel}</span>
                    </div>
                  </div>
                  
                  <div className="col-12"><hr className="my-3" /></div>
                  
                  <div className="col-md-6">
                    <h6 className="text-muted text-uppercase small mb-2">Guest Details</h6>
                    <div className="mb-2">
                      <i className="fas fa-user text-muted me-2"></i>
                      <span>{selected.user}</span>
                    </div>
                    <div className="mb-2">
                      <i className="fas fa-envelope text-muted me-2"></i>
                      <span>{selected.userEmail || 'N/A'}</span>
                    </div>
                    <div>
                      <i className="fas fa-users text-muted me-2"></i>
                      <span>{selected.guests} Guests</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted text-uppercase small mb-2">Stay Schedule</h6>
                    <div className="mb-2">
                      <i className="fas fa-calendar-check text-muted me-2"></i>
                      <span>Check-in: <strong>{selected.checkIn ? new Date(selected.checkIn).toLocaleDateString() : 'N/A'}</strong></span>
                    </div>
                    <div className="mb-2">
                      <i className="fas fa-calendar-times text-muted me-2"></i>
                      <span>Check-out: <strong>{selected.checkOut ? new Date(selected.checkOut).toLocaleDateString() : 'N/A'}</strong></span>
                    </div>
                    <div>
                      <i className="fas fa-moon text-muted me-2"></i>
                      <span>
                        {selected.checkIn && selected.checkOut 
                          ? Math.max(0, Math.ceil((new Date(selected.checkOut) - new Date(selected.checkIn)) / (1000 * 60 * 60 * 24))) 
                          : 0} Nights
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
