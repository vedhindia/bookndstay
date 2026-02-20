import React, { useEffect, useMemo, useState } from 'react';
import api from './services/apiClient';
import Pagination from './components/Pagination';

const TabButton = ({ active, children, onClick }) => (
  <button 
    className={`btn ${active ? 'btn-primary' : 'btn-outline-primary'}`} 
    onClick={onClick}
  >
    {children}
  </button>
);

const Coupons = () => {
  const [tab, setTab] = useState('1');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    id: null,
    code: '',
    type: 'FLAT',
    value: 0,
    expiry: '',
    usage_limit: 1,
    used_count: 0,
    active: 1
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Normalize coupon data from backend response to match database schema
  const normalizeCoupon = (c) => ({
    id: c.id || c._id || null,
    vendor_id: c.vendor_id || c.vendorId || null,
    code: c.code || '',
    type: (c.type || 'FLAT').toString().toUpperCase(),
    value: Number(c.value || 0),
    expiry: c.expiry || '',
    usage_limit: Number(c.usage_limit || 1),
    used_count: Number(c.used_count || 0),
    active: c.active === true || c.active === 1 || c.active === '1' ? 1 : 0,
    created_at: c.created_at || c.createdAt || '',
    updated_at: c.updated_at || c.updatedAt || ''
  });

  // Fetch coupons from API - GET /api/admin/coupons
  const fetchCoupons = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.get('/admin/coupons', {
        params: {
          page,
          limit: pageSize
        }
      });

      console.log('API Response:', response?.data);
      
      const res = response?.data;
      
      // Handle API response format: { success: true, message: { coupons: [...] } }
      let couponList = [];
      
      // Check all possible response structures
      if (res?.success && res?.message?.coupons) {
        // Primary format: { success: true, message: { coupons: [...] } }
        couponList = Array.isArray(res.message.coupons) ? res.message.coupons : [res.message.coupons];
      } else if (res?.success && res?.message?.coupon) {
        // Alternative format: { success: true, message: { coupon: [...] } }
        couponList = Array.isArray(res.message.coupon) ? res.message.coupon : [res.message.coupon];
      } else if (Array.isArray(res?.coupons)) {
        couponList = res.coupons;
      } else if (Array.isArray(res?.data?.coupons)) {
        couponList = res.data.coupons;
      } else if (Array.isArray(res?.data)) {
        couponList = res.data;
      } else if (Array.isArray(res?.message)) {
        couponList = res.message;
      } else if (Array.isArray(res)) {
        couponList = res;
      } else if (res?.success && typeof res?.message === 'object') {
        // Try to extract from message object
        const msgKeys = Object.keys(res.message);
        for (const key of msgKeys) {
          if (Array.isArray(res.message[key])) {
            couponList = res.message[key];
            break;
          }
        }
      }

      console.log('Extracted coupon list:', couponList);

      // Normalize all coupons
      const normalized = couponList.map(normalizeCoupon);
      setItems(normalized);

      // Get total count
      const computedTotal = 
        res?.total ?? 
        res?.message?.total ??
        res?.pagination?.total ?? 
        res?.meta?.total ?? 
        res?.count ?? 
        normalized.length;
      
      setTotal(Number(computedTotal));

      console.log('Normalized coupons:', normalized);
      console.log('Total:', computedTotal);

    } catch (err) {
      console.error('Failed to load coupons:', err);
      console.error('Error response:', err?.response);
      
      const errorMsg = err?.response?.data?.message || 
                       (typeof err?.response?.data?.data === 'string' ? err?.response?.data?.data : 
                       err?.message || 'Failed to load coupons from server');
      setError(errorMsg);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch coupons when dependencies change
  useEffect(() => {
    fetchCoupons();
  }, [page, pageSize]);

  // Filter coupons client-side based on tab and search query
  const filtered = useMemo(() => {
    let result = items;
    
    // Apply tab filter (active/inactive/all)
    if (tab === '1') {
      // Active coupons only
      result = result.filter(c => c.active === 1);
    } else if (tab === '0') {
      // Inactive coupons only
      result = result.filter(c => c.active === 0);
    }
    // If tab === '', show all coupons (no filter)
    
    // Apply search query filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase().trim();
      result = result.filter(c => 
        c.code.toLowerCase().includes(lowerQuery)
      );
    }
    
    return result;
  }, [items, tab, query]);

  // Calculate paginated data from filtered results
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, page, pageSize]);

  // Update total based on filtered results
  const filteredTotal = filtered.length;

  // Open form for new coupon
  const openNew = () => {
    setForm({
      id: null,
      code: '',
      type: 'FLAT',
      value: 0,
      expiry: '',
      usage_limit: 1,
      used_count: 0,
      active: 1
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  // Open form for editing existing coupon
  const openEdit = (coupon) => {
    setForm({
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      expiry: coupon.expiry ? coupon.expiry.slice(0, 16) : '',
      usage_limit: coupon.usage_limit,
      used_count: coupon.used_count,
      active: coupon.active
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  // Save coupon (create or update)
  const saveCoupon = async () => {
    // Client-side validation
    if (!form.code.trim()) {
      setError('Coupon code is required');
      return;
    }
    
    if (form.value <= 0) {
      setError('Coupon value must be greater than 0');
      return;
    }
    
    if (!form.expiry) {
      setError('Expiry date and time is required');
      return;
    }

    if (form.type === 'PERCENT' && form.value > 100) {
      setError('Percentage discount cannot exceed 100%');
      return;
    }

    if (form.usage_limit <= 0) {
      setError('Usage limit must be greater than 0');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Prepare payload according to API format
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        expiry: form.expiry,
        usage_limit: Number(form.usage_limit),
        active: Number(form.active)
      };

      console.log('Saving coupon with payload:', payload);

      let response;
      
      if (form.id) {
        // Update existing coupon - PUT /api/admin/coupons/{couponId}
        response = await api.put(`/admin/coupons/${form.id}`, payload);
        
        console.log('Update response:', response?.data);
        
        // Handle response format
        const successMsg = response?.data?.message || 
                          (typeof response?.data?.data === 'string' ? response?.data?.data : 'Coupon updated successfully');
        setSuccess(successMsg);
      } else {
        // Create new coupon - POST /api/admin/coupons
        response = await api.post('/admin/coupons', payload);
        
        console.log('Create response:', response?.data);
        
        // Handle response format
        const successMsg = response?.data?.message || 
                          (typeof response?.data?.data === 'string' ? response?.data?.data : 'Coupon created successfully');
        setSuccess(successMsg);
      }

      // Close form and refresh list
      setShowForm(false);
      
      // Reset to first page if creating new coupon
      if (!form.id) {
        setPage(1);
      }
      
      await fetchCoupons();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error('Failed to save coupon:', err);
      console.error('Error response:', err?.response);
      
      const errorMsg = err?.response?.data?.message || 
                       (typeof err?.response?.data?.data === 'string' ? err?.response?.data?.data : 
                       err?.response?.data?.error || err?.message || 'Failed to save coupon');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Delete coupon - DELETE /api/admin/coupons/{couponId}
  const deleteCoupon = async (coupon) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await api.delete(`/admin/coupons/${coupon.id}`);
      
      console.log('Delete response:', response?.data);
      
      // Handle response format
      const successMsg = response?.data?.message || 
                        (typeof response?.data?.data === 'string' ? response?.data?.data : `Coupon "${coupon.code}" deleted successfully`);
      setSuccess(successMsg);
      
      // If current page becomes empty after deletion, go to previous page
      if (paginatedData.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await fetchCoupons();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error('Failed to delete coupon:', err);
      console.error('Error response:', err?.response);
      
      const errorMsg = err?.response?.data?.message || 
                       (typeof err?.response?.data?.data === 'string' ? err?.response?.data?.data : 
                       err?.response?.data?.error || err?.message || 'Failed to delete coupon');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle search with debounce effect
  const handleSearch = (value) => {
    setQuery(value);
    setPage(1);
  };

  // Handle tab change
  const handleTabChange = (newTab) => {
    setTab(newTab);
    setPage(1);
  };

  // Format datetime for display
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'N/A';
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateTimeStr;
    }
  };

  // Check if coupon is expired
  const isExpired = (dateTimeStr) => {
    if (!dateTimeStr) return false;
    try {
      return new Date(dateTimeStr) < new Date();
    } catch {
      return false;
    }
  };

  // Get usage percentage
  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 0) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  // Get coupon status text
  const getCouponStatus = (coupon) => {
    if (coupon.active === 0) return 'Inactive';
    if (isExpired(coupon.expiry)) return 'Expired';
    if (coupon.used_count >= coupon.usage_limit) return 'Limit Reached';
    return 'Active';
  };

  // Get coupon status badge color
  const getStatusBadgeClass = (coupon) => {
    const status = getCouponStatus(coupon);
    if (status === 'Active') return 'bg-success';
    if (status === 'Expired') return 'bg-danger';
    if (status === 'Limit Reached') return 'bg-warning';
    return 'bg-secondary';
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      {/* Header Section */}
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Coupons Management</h4>
          <small className="text-muted">Create and manage discount codes for your hotels</small>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <input 
            className="form-control" 
            placeholder="Search by code..." 
            value={query} 
            onChange={e => handleSearch(e.target.value)}
            style={{ minWidth: '250px' }}
          />
          <button 
            className="btn btn-primary" 
            onClick={openNew}
            disabled={loading}
          >
            <i className="fas fa-plus me-2"></i>
            New Coupon
          </button>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="d-flex gap-2 mb-3">
        <TabButton 
          active={tab === '1'} 
          onClick={() => handleTabChange('1')}
        >
          <i className="fas fa-check-circle me-1"></i>
          Active Coupons
        </TabButton>
        <TabButton 
          active={tab === '0'} 
          onClick={() => handleTabChange('0')}
        >
          <i className="fas fa-ban me-1"></i>
          Inactive Coupons
        </TabButton>
        <TabButton 
          active={tab === ''} 
          onClick={() => handleTabChange('')}
        >
          <i className="fas fa-list me-1"></i>
          All Coupons
        </TabButton>
      </div>

      {/* Alert Messages */}
      {success && (
        <div className="alert alert-success alert-dismissible fade show py-2" role="alert">
          <i className="fas fa-check-circle me-2"></i>
          {success}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setSuccess('')}
            aria-label="Close"
          ></button>
        </div>
      )}
      
      {error && (
        <div className="alert alert-warning alert-dismissible fade show py-2" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError('')}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Debug Info - Remove in production
      {process.env.NODE_ENV === 'development' && (
        <div className="alert alert-info py-2 small">
          <strong>Debug:</strong> Total Items: {items.length}, Filtered: {filtered.length}, Paginated: {paginatedData.length}, Tab: {tab}, Page: {page}
        </div>
      )} */}

      {/* Coupons Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-3">Sr No.</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Expiry</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
  {loading ? (
    <tr>
      <td colSpan="8" className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </td>
    </tr>
  ) : paginatedData.length === 0 ? (
    <tr>
      <td colSpan="8" className="text-center py-5 text-muted">
        <i className="fas fa-inbox fa-3x mb-3"></i>
        <div>No coupons found</div>
      </td>
    </tr>
  ) : (
    paginatedData.map((coupon, index) => {
      // ✅ Serial number logic (continuous numbering)
      const serialNumber = (page - 1) * pageSize + index + 1;

      const usagePercent = getUsagePercentage(coupon.used_count, coupon.usage_limit);
      const expired = isExpired(coupon.expiry);

      return (
        <tr key={coupon.id}>
          {/* ✅ Serial Number column */}
          <td className="ps-3">
            <span className="badge bg-light text-dark">{serialNumber}</span>
          </td>

          {/* Coupon Code */}
          <td>
            <div className="fw-semibold">{coupon.code}</div>
          </td>

          {/* Coupon Type */}
          <td>
            <span
              className={`badge ${
                coupon.type === 'FLAT' ? 'bg-info' : 'bg-primary'
              }`}
            >
              {coupon.type === 'FLAT' ? 'Flat' : 'Percent'}
            </span>
          </td>

          {/* Coupon Value */}
          <td className="fw-semibold">
            {coupon.type === 'FLAT' ? `₹${coupon.value}` : `${coupon.value}%`}
          </td>

          {/* Expiry */}
          <td>
            <div>{formatDateTime(coupon.expiry)}</div>
            {expired && (
              <small className="text-danger">
                <i className="fas fa-exclamation-circle me-1"></i>
                Expired
              </small>
            )}
          </td>

          {/* Usage Progress */}
          <td>
            <div className="d-flex align-items-center gap-2">
              <div className="flex-grow-1" style={{ minWidth: '80px' }}>
                <div className="progress" style={{ height: '8px' }}>
                  <div
                    className={`progress-bar ${
                      usagePercent >= 90
                        ? 'bg-danger'
                        : usagePercent >= 70
                        ? 'bg-warning'
                        : 'bg-success'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  ></div>
                </div>
              </div>
              <small
                className="text-muted text-nowrap"
                style={{ minWidth: '50px' }}
              >
                {coupon.used_count}/{coupon.usage_limit}
              </small>
            </div>
          </td>

          {/* Status */}
          <td>
            <span className={`badge ${getStatusBadgeClass(coupon)}`}>
              {getCouponStatus(coupon)}
            </span>
          </td>

          {/* Actions */}
          <td className="text-end pe-3">
            <div className="btn-group">
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => openEdit(coupon)}
                disabled={loading}
                title="Edit coupon"
              >
                <i className="fas fa-edit"></i>
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => deleteCoupon(coupon)}
                disabled={loading}
                title="Delete coupon"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      );
    })
  )}
</tbody>

            </table>
          </div>
          
          {/* Pagination Footer */}
          {!loading && paginatedData.length > 0 && (
            <div className="p-3 border-top d-flex flex-wrap gap-3 justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <small className="text-muted">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredTotal)} of {filteredTotal} coupons
                </small>
                <select 
                  className="form-select form-select-sm" 
                  style={{ width: 'auto' }} 
                  value={pageSize} 
                  onChange={e => { 
                    setPageSize(Number(e.target.value)); 
                    setPage(1); 
                  }}
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              <Pagination 
                current={page} 
                total={filteredTotal} 
                pageSize={pageSize} 
                onChange={setPage} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Coupon Modal */}
      {showForm && (
        <div 
          className="modal d-block" 
          tabIndex="-1" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => !loading && setShowForm(false)}
        >
          <div 
            className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" 
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`fas ${form.id ? 'fa-edit' : 'fa-plus-circle'} me-2`}></i>
                  {form.id ? `Edit Coupon #${form.id}` : 'Create New Coupon'}
                </h5>
                <button 
                  type="button"
                  className="btn-close" 
                  onClick={() => !loading && setShowForm(false)}
                  disabled={loading}
                  aria-label="Close"
                ></button>
              </div>
              
              <div className="modal-body">
                <div className="row g-3">
                  {/* Coupon Code */}
                  <div className="col-md-6">
                    <label className="form-label">
                      Coupon Code <span className="text-danger">*</span>
                    </label>
                    <input 
                      type="text"
                      className="form-control" 
                      placeholder="e.g. WELCOME10, SUMMER25" 
                      value={form.code} 
                      onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                      disabled={loading}
                      maxLength={255}
                    />
                    <small className="text-muted">Enter a unique code (max 255 characters)</small>
                  </div>

                  {/* Discount Type */}
                  <div className="col-md-6">
                    <label className="form-label">
                      Discount Type <span className="text-danger">*</span>
                    </label>
                    <select 
                      className="form-select" 
                      value={form.type} 
                      onChange={e => setForm({...form, type: e.target.value})}
                      disabled={loading}
                    >
                      <option value="FLAT">Flat Amount (₹)</option>
                      <option value="PERCENT">Percentage (%)</option>
                    </select>
                    <small className="text-muted">Database: enum('FLAT','PERCENT')</small>
                  </div>

                  {/* Discount Value */}
                  <div className="col-md-6">
                    <label className="form-label">
                      Discount Value <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      {form.type === 'FLAT' && (
                        <span className="input-group-text">₹</span>
                      )}
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder={form.type === 'PERCENT' ? '10' : '200'} 
                        value={form.value} 
                        onChange={e => setForm({...form, value: e.target.value})}
                        disabled={loading}
                        min="0"
                        step="0.01"
                        max={form.type === 'PERCENT' ? '100' : undefined}
                      />
                      {form.type === 'PERCENT' && (
                        <span className="input-group-text">%</span>
                      )}
                    </div>
                    <small className="text-muted">
                      {form.type === 'PERCENT' 
                        ? 'Enter percentage discount (0-100)' 
                        : 'Enter flat discount amount (float)'}
                    </small>
                  </div>

                  {/* Expiry DateTime */}
                  <div className="col-md-6">
                    <label className="form-label">
                      Expiry Date & Time <span className="text-danger">*</span>
                    </label>
                    <input 
                      type="datetime-local" 
                      className="form-control" 
                      value={form.expiry} 
                      onChange={e => setForm({...form, expiry: e.target.value})}
                      disabled={loading}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <small className="text-muted">Coupon will expire at this exact time (datetime)</small>
                  </div>

                  {/* Usage Limit */}
                  <div className="col-md-6">
                    <label className="form-label">
                      Usage Limit <span className="text-danger">*</span>
                    </label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="1" 
                      value={form.usage_limit} 
                      onChange={e => setForm({...form, usage_limit: e.target.value})}
                      disabled={loading}
                      min="1"
                    />
                    <small className="text-muted">Maximum times coupon can be used (default: 1)</small>
                  </div>

                  {/* Used Count (Read-only for edit) */}
                  {form.id && (
                    <div className="col-md-6">
                      <label className="form-label">
                        Used Count
                      </label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={form.used_count} 
                        disabled
                        readOnly
                      />
                      <small className="text-muted">Current usage count (read-only, default: 0)</small>
                    </div>
                  )}

                  {/* Active Status */}
                  <div className="col-md-6">
                    <label className="form-label">
                      Active Status <span className="text-danger">*</span>
                    </label>
                    <select 
                      className="form-select" 
                      value={form.active} 
                      onChange={e => setForm({...form, active: Number(e.target.value)})}
                      disabled={loading}
                    >
                      <option value={1}>Active (1)</option>
                      <option value={0}>Inactive (0)</option>
                    </select>
                    <small className="text-muted">Database: tinyint(1), default 1</small>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                >
                  <i className="fas fa-times me-2"></i>
                  Cancel
                </button>
                <button 
                  type="button"
                  className="btn btn-primary" 
                  onClick={saveCoupon} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      {form.id ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <i className={`fas ${form.id ? 'fa-save' : 'fa-plus'} me-2`}></i>
                      {form.id ? 'Update Coupon' : 'Create Coupon'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;