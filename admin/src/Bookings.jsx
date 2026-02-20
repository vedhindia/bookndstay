import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminBookings, adminPayments } from './services/adminApi';
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
  
  // Extract user filter from navigation state
  const userFilter = location.state?.userId ? {
    userId: location.state.userId,
    userName: location.state.userName,
    userEmail: location.state.userEmail
  } : null;

  const [query, setQuery] = useState('');
  const [hotel, setHotel] = useState('All');
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
  
  // Payment State
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);

  const hotels = ['All', 'Grand Plaza', 'Beach Resort', 'Mountain View'];

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const searchTerm = query.trim();
      const res = await adminBookings.list({
        page,
        limit: pageSize,
        status: status !== 'All' ? status.toUpperCase() : undefined,
        hotel: hotel !== 'All' ? hotel : undefined,
        userId: userFilter?.userId || undefined,
        // Support both "search" and "q" param names so it works with different APIs
        search: searchTerm || undefined,
        q: searchTerm || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      
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
      // Filter mock data by userId if userFilter exists
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
  }, [page, pageSize, status, hotel, dateFrom, dateTo, userFilter?.userId, query]);

  const filtered = useMemo(() => {
    const qLower = query.toLowerCase();
    return items.filter(b => {
      const matches = [b.user, b.hotel, b.id, b.userEmail || ''].some(v =>
        (v || '').toString().toLowerCase().includes(qLower)
      );
      const hotelMatch = hotel === 'All' || b.hotel === hotel;
      const statusMatch = status === 'All' || b.status === status;
      const fromMatch = !dateFrom || new Date(b.checkIn) >= new Date(dateFrom);
      const toMatch = !dateTo || new Date(b.checkOut) <= new Date(dateTo);
      return matches && hotelMatch && statusMatch && fromMatch && toMatch;
    });
  }, [query, hotel, status, dateFrom, dateTo, items]);

  const clearUserFilter = () => {
    navigate('/dashboard/bookings', { replace: true, state: {} });
    window.location.reload(); // Force refresh to clear filter
  };

  // Calculate serial number based on current page and index
  const handleViewPayment = async (bookingId) => {
    setLoadingPayment(true);
    setPaymentDetails(null);
    try {
      const res = await adminPayments.list({ booking_id: bookingId });
      if (res.data && res.data.length > 0) {
        setPaymentDetails(res.data);
        setShowPaymentModal(true);
      } else {
         setError('No payment information found for this booking');
         setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch payment details');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleDownloadInvoice = (booking) => {
    const invoiceContent = `
      <html>
        <head>
          <title>Invoice - ${booking.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .total { text-align: right; font-weight: bold; font-size: 1.2em; }
            .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <p>Booking ID: ${booking.id}</p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="details">
            <h3>Hotel Details</h3>
            <p><strong>Name:</strong> ${booking.hotel}</p>
          </div>

          <div class="details">
            <h3>Guest Details</h3>
            <p><strong>Name:</strong> ${booking.user}</p>
            <p><strong>Email:</strong> ${booking.userEmail || 'N/A'}</p>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Guests</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Hotel Booking</td>
                <td>${booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'N/A'}</td>
                <td>${booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'N/A'}</td>
                <td>${booking.guests}</td>
                <td>₹${booking.price}</td>
              </tr>
            </tbody>
          </table>

          <div class="total">
            <p>Total Amount: ₹${booking.price}</p>
          </div>

          <div class="footer">
            <p>Thank you for choosing our service!</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      alert('Please allow popups to download the invoice.');
    }
  };

  const getSerialNumber = (index) => {
    return (page - 1) * pageSize + index + 1;
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      {/* Header */}
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Bookings</h4>
          <small className="text-muted">Search, filter and manage bookings ({total} total)</small>
        </div>
      </div>

      {/* User Filter Badge */}
      {userFilter && (
        <div className="alert alert-info d-flex justify-content-between align-items-center py-2 mb-3">
          <div>
            <i className="fas fa-filter me-2"></i>
            <strong>Filtered by User:</strong> {userFilter.userName} ({userFilter.userEmail})
          </div>
          <button 
            className="btn btn-sm btn-outline-secondary" 
            onClick={clearUserFilter}
            title="Clear user filter"
          >
            <i className="fas fa-times me-1"></i>Clear Filter
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">Search</label>
              <input 
                className="form-control" 
                placeholder="Search by user, hotel or ID" 
                value={query} 
                onChange={e => { setQuery(e.target.value); setPage(1); }} 
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Hotel</label>
              <select 
                className="form-select" 
                value={hotel} 
                onChange={e => { setHotel(e.target.value); setPage(1); }}
              >
                {hotels.map(h => <option key={h}>{h}</option>)}
              </select>
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
                  setHotel('All');
                  setStatus('All');
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
                title="Reset filters"
              >
                <i className="fas fa-redo"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Bookings Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="px-3" style={{ width: '80px' }}>Sr No.</th>
                  <th>Booking ID</th>
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
                    <td colSpan="10" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <div className="mt-2 text-muted">Loading bookings...</div>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((b, index) => (
                    <tr key={b.id}>
                      <td className="px-3 text-muted fw-semibold">{getSerialNumber(index)}</td>
                      <td>
                        <span className="badge bg-secondary">{b.id}</span>
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
                      <td>
                        <small>{b.checkIn ? new Date(b.checkIn).toLocaleDateString() : 'N/A'}</small>
                      </td>
                      <td>
                        <small>{b.checkOut ? new Date(b.checkOut).toLocaleDateString() : 'N/A'}</small>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark">{b.guests}</span>
                      </td>
                      <td className="text-end fw-semibold">₹{b.price}</td>
                      <td className="text-center">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="text-end px-3">
                        <button 
                          className="btn btn-sm btn-outline-primary" 
                          onClick={() => setSelected(b)}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="text-center text-muted py-5">
                      <i className="fas fa-inbox fa-3x mb-3 d-block"></i>
                      <div>No bookings found</div>
                      {(query || hotel !== 'All' || status !== 'All' || dateFrom || dateTo || userFilter) && (
                        <small className="text-muted">Try adjusting your filters</small>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="p-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <small className="text-muted">
                  Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of <strong>{total}</strong> bookings
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
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      {selected && (
        <div 
          className="modal d-block" 
          tabIndex="-1" 
          role="dialog" 
          onClick={() => setSelected(null)}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div 
            className="modal-dialog modal-lg modal-dialog-centered" 
            role="document" 
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title">
                  <i className="fas fa-calendar-check me-2 text-primary"></i>
                  Booking Details - {selected.id}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setSelected(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted">User Name</label>
                    <input className="form-control" value={selected.user} readOnly />
                  </div>
                  {selected.userEmail && (
                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-muted">User Email</label>
                      <input className="form-control" value={selected.userEmail} readOnly />
                    </div>
                  )}
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted">Hotel</label>
                    <input className="form-control" value={selected.hotel} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted">Status</label>
                    <div className="form-control d-flex align-items-center">
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted">Check-in Date</label>
                    <input 
                      className="form-control" 
                      value={selected.checkIn ? new Date(selected.checkIn).toLocaleDateString() : 'N/A'} 
                      readOnly 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted">Check-out Date</label>
                    <input 
                      className="form-control" 
                      value={selected.checkOut ? new Date(selected.checkOut).toLocaleDateString() : 'N/A'} 
                      readOnly 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted">Number of Guests</label>
                    <input className="form-control" value={selected.guests} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted">Total Price</label>
                    <input className="form-control fw-bold" value={`₹${selected.price}`} readOnly />
                  </div>
                </div>
                <hr className="my-4" />
                <div className="d-flex flex-wrap gap-2">
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleViewPayment(selected.id)}
                    disabled={loadingPayment}
                  >
                    {loadingPayment ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : (
                      <i className="fas fa-credit-card me-2"></i>
                    )}
                    View Payment Info
                  </button>
                  <button 
                    className="btn btn-outline-success"
                    onClick={() => handleDownloadInvoice(selected)}
                  >
                    <i className="fas fa-receipt me-2"></i>Download Invoice
                  </button>
                </div>
              </div>
              <div className="modal-footer">
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
      {/* Payment Details Modal */}
      {showPaymentModal && paymentDetails && (
        <div 
          className="modal d-block" 
          tabIndex="-1" 
          role="dialog" 
          onClick={() => setShowPaymentModal(false)}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
        >
          <div 
            className="modal-dialog modal-lg modal-dialog-centered" 
            role="document" 
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title">
                  <i className="fas fa-credit-card me-2 text-primary"></i>
                  Payment Details
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowPaymentModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {paymentDetails.map((payment, idx) => (
                  <div key={payment.id} className={idx > 0 ? 'mt-4 pt-4 border-top' : ''}>
                    {paymentDetails.length > 1 && <h6 className="mb-3">Transaction #{idx + 1}</h6>}
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted">Transaction ID</label>
                        <input className="form-control" value={payment.transaction_id || 'N/A'} readOnly />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted">Amount</label>
                        <input className="form-control fw-bold" value={`${payment.currency || 'INR'} ${payment.amount}`} readOnly />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted">Gateway</label>
                        <input className="form-control" value={payment.gateway || 'N/A'} readOnly />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted">Status</label>
                        <div>
                          <span className={`badge bg-${
                            payment.status === 'SUCCESS' ? 'success' : 
                            payment.status === 'FAILED' ? 'danger' : 'warning'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted">Date</label>
                        <input className="form-control" value={new Date(payment.createdAt).toLocaleString()} readOnly />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowPaymentModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
