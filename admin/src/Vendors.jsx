
import React, { useEffect, useMemo, useState } from 'react';
import { adminVendors } from './services/adminApi';
import Pagination from './components/Pagination';
import { useNavigate } from 'react-router-dom';

const Vendors = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [query, setQuery] = useState('');
  const [formState, setFormState] = useState({ open: false, mode: 'add', data: null });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusConfirm, setStatusConfirm] = useState(null);

  // Vendor Hotels State
  const [vendorHotels, setVendorHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [showHotelsModal, setShowHotelsModal] = useState(false);
  const [selectedVendorForHotels, setSelectedVendorForHotels] = useState(null);
  const [hotelsPage, setHotelsPage] = useState(1);
  const [hotelsTotalPages, setHotelsTotalPages] = useState(1);

  // Current admin role
  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem('adminUser') || 'null'); } catch { return null; }
  })();
  const isSuperAdmin = (adminUser?.role || '').toUpperCase() === 'SUPER_ADMIN';

  // Clear messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch from admin vendors API with Authorization header via apiClient
  const fetchVendors = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      const raw = await adminVendors.list({ 
        page, 
        limit: pageSize, 
        q: query || undefined,
        search: query || undefined
      });

      const list = Array.isArray(raw?.vendors)
        ? raw.vendors
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.results)
        ? raw.results
        : Array.isArray(raw)
        ? raw
        : [];

      const normalized = list.map((v) => ({
        id: v.id || v.vendor_id || v._id || null,
        full_name: v.full_name || v.name || v.fullName || '',
        email: v.email || '',
        phone: v.phone || v.mobile || '',
        business_name: v.business_name || v.businessName || v.company || '',
        business_address: v.business_address || v.businessAddress || v.address || '',
        status: (v.status || 'PENDING').toString().toUpperCase(),
        created_at: v.created_at || v.createdAt || new Date().toISOString(),
      }));

      setVendors(normalized);
      const computedTotal = raw?.total ?? raw?.pagination?.total ?? raw?.meta?.total ?? raw?.count ?? normalized.length;
      setTotal(Number(computedTotal));

    } catch (err) {
      console.error('Fetch vendors failed:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to fetch vendors';
      
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('adminToken');
        setError('Authentication failed. Please login again.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const delayedFetch = setTimeout(() => {
      fetchVendors();
    }, query ? 500 : 0);

    return () => clearTimeout(delayedFetch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, query]);

  const filtered = useMemo(() => {
    if (!query.trim()) return vendors;
    
    return vendors.filter(v => {
      const searchTerm = query.toLowerCase().trim();
      return [
        v.full_name,
        v.email,
        v.phone,
        v.business_name,
        v.business_address,
        v.status,
        String(v.id),
      ]
        .filter(Boolean)
        .some(x => String(x).toLowerCase().includes(searchTerm));
    });
  }, [query, vendors]);

  const openAdd = () => {
    setFormState({ 
      open: true, 
      mode: 'add', 
      data: {
        id: null,
        full_name: '',
        email: '',
        phone: '',
        password: '',
        business_name: '',
        business_address: '',
        status: 'PENDING',
      }
    });
    setError('');
    setSuccess('');
  };

  const openEdit = (v) => {
    setFormState({ 
      open: true, 
      mode: 'edit', 
      data: { ...v, password: '' } 
    });
    setError('');
    setSuccess('');
  };

  const closeForm = () => {
    setFormState({ open: false, mode: 'add', data: null });
    setError('');
    setSuccess('');
  };

  const handleChange = (field, value) => {
    setFormState(prev => ({ 
      ...prev, 
      data: { ...prev.data, [field]: value } 
    }));
  };

  const handleViewHotels = async (vendorId, page = 1) => {
    // If vendorId is an object (event or full vendor object), extract ID or handle appropriately
    // But here we expect it to be an ID or we find the vendor object
    
    let targetVendorId = vendorId;
    let vendorObj = null;

    if (typeof vendorId === 'object' && vendorId !== null) {
       // If passed full object or event (though button click passes ID usually)
       // Let's assume we pass ID from button click as per current code: onClick={() => handleViewHotels(v.id...)}
       // But if we want to store selected vendor name for modal title, we need to find it
    }

    // Find vendor object to display name in modal
    if (vendorId) {
       vendorObj = vendors.find(v => (v.id || v.vendor_id || v._id) === vendorId);
    }
    
    // If pagination call (vendorId might be null if we use selectedVendorForHotels)
    if (!targetVendorId && selectedVendorForHotels) {
        targetVendorId = selectedVendorForHotels.id || selectedVendorForHotels.vendor_id || selectedVendorForHotels._id;
        vendorObj = selectedVendorForHotels;
    }

    if (!targetVendorId) return;

    if (vendorObj) {
        setSelectedVendorForHotels(vendorObj);
    }

    setShowHotelsModal(true);
    setHotelsPage(page);
    setLoadingHotels(true);
    
    // Clear previous if new vendor
    if (vendorObj && (!selectedVendorForHotels || (selectedVendorForHotels.id !== vendorObj.id))) {
        setVendorHotels([]);
        setHotelsPage(1);
        page = 1;
    }

    try {
      const res = await adminVendors.getHotels(targetVendorId, { page, limit: 10 });
      const hotels = res.data || [];
      const pagination = res.pagination || {};
      
      setVendorHotels(Array.isArray(hotels) ? hotels : []);
      setHotelsTotalPages(pagination.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch vendor hotels:', err);
      setError('Failed to fetch vendor hotels');
    } finally {
      setLoadingHotels(false);
    }
  };

  // Validate form data
  const validateForm = (data) => {
    const errors = [];
    
    if (!data.full_name?.trim()) errors.push('Full name is required');
    if (!data.email?.trim()) errors.push('Email is required');
    if (!data.phone?.trim()) errors.push('Phone is required');
    if (!data.business_name?.trim()) errors.push('Business name is required');
    if (!data.business_address?.trim()) errors.push('Business address is required');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      errors.push('Please enter a valid email address');
    }
    
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    if (data.phone && !phoneRegex.test(data.phone)) {
      errors.push('Please enter a valid phone number');
    }
    
    if (data.mode === 'add' && !data.password?.trim()) {
      errors.push('Password is required for new vendors');
    }
    
    return errors;
  };

  // Create vendor via Admin API: POST /api/admin/vendors
  const apiRegisterVendor = async (payload) => {
    const body = {
      full_name: payload.full_name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.replace(/[\s\-\(\)]/g, ''),
      password: payload.password,
      business_name: payload.business_name.trim(),
      business_address: payload.business_address.trim(),
      status: payload.status || 'PENDING',
    };

    try {
      console.log('Creating vendor with payload:', body);
      const res = await adminVendors.create(body);
      console.log('Create vendor response:', res);
      return res;
    } catch (error) {
      console.error('Create vendor error:', error);
      if (error?.response?.status === 409) {
        throw new Error('Email already exists. Please use a different email address.');
      } else if (error?.response?.status === 400) {
        const errorMsg = error?.response?.data?.message || 'Invalid data provided';
        throw new Error(errorMsg);
      } else if (error?.response?.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      } else if (error?.response?.status === 403) {
        throw new Error('You do not have permission to create vendors.');
      }
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to create vendor');
    }
  };

  // Update vendor via Admin API: PUT /api/admin/vendors/{vendorId}
  const apiUpdateVendorDetails = async (payload) => {
    if (!payload.id) throw new Error('Vendor ID is missing. Cannot update vendor.');
    
    const body = {
      full_name: payload.full_name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.replace(/[\s\-\(\)]/g, ''),
      business_name: payload.business_name.trim(),
      business_address: payload.business_address.trim(),
      status: payload.status,
    };

    if (payload.password && payload.password.trim()) {
      body.password = payload.password.trim();
    }

    try {
      console.log('Updating vendor with ID:', payload.id, 'and payload:', body);
      const res = await adminVendors.update(payload.id, body);
      console.log('Update vendor response:', res);
      return res;
    } catch (error) {
      console.error('Update vendor error:', error);
      if (error?.response?.status === 404) {
        throw new Error('Vendor not found. It may have been deleted.');
      } else if (error?.response?.status === 409) {
        throw new Error('Email already exists. Please use a different email address.');
      } else if (error?.response?.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      } else if (error?.response?.status === 403) {
        throw new Error('You do not have permission to update this vendor.');
      }
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to update vendor');
    }
  };

  // Activate vendor via Admin API: POST /api/admin/vendors/{vendorId}/activate
  const apiActivateVendor = async (vendorId) => {
    if (!vendorId) throw new Error('Vendor ID is required for activation.');
    
    try {
      console.log('Activating vendor with ID:', vendorId);
      const res = await adminVendors.activate(vendorId);
      console.log('Activate vendor response:', res);
      return res;
    } catch (error) {
      console.error('Activate vendor error:', error);
      if (error?.response?.status === 404) {
        throw new Error('Vendor not found. It may have been deleted.');
      } else if (error?.response?.status === 403) {
        throw new Error('You do not have permission to activate this vendor.');
      } else if (error?.response?.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to activate vendor');
    }
  };

  // Deactivate vendor via Admin API: POST /api/admin/vendors/{vendorId}/deactivate
  const apiDeactivateVendor = async (vendorId) => {
    if (!vendorId) throw new Error('Vendor ID is required for deactivation.');
    
    try {
      console.log('Deactivating vendor with ID:', vendorId);
      const res = await adminVendors.deactivate(vendorId);
      console.log('Deactivate vendor response:', res);
      return res;
    } catch (error) {
      console.error('Deactivate vendor error:', error);
      if (error?.response?.status === 404) {
        throw new Error('Vendor not found. It may have been deleted.');
      } else if (error?.response?.status === 403) {
        throw new Error('You do not have permission to deactivate this vendor.');
      } else if (error?.response?.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to deactivate vendor');
    }
  };

  // Handle status change (activate/deactivate)
  const handleStatusChange = async (vendor, action) => {
    if (!vendor) {
      setError(`Cannot ${action} vendor: Invalid vendor data`);
      return;
    }

    const vendorId = vendor.id || vendor.vendor_id || vendor._id;
    if (!vendorId) {
      setError(`Cannot ${action} vendor: Missing vendor ID`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Your session has expired. Please login again.');
        return;
      }

      if (action === 'activate') {
        await apiActivateVendor(vendorId);
      } else if (action === 'deactivate') {
        await apiDeactivateVendor(vendorId);
      }
      
      const newStatus = action === 'activate' ? 'ACTIVE' : 'SUSPENDED';
      setVendors(prevVendors => prevVendors.map(v => {
        const currentId = v.id || v.vendor_id || v._id;
        return currentId === vendorId ? { ...v, status: newStatus } : v;
      }));
      
      const actionText = action === 'activate' ? 'activated' : 'deactivated';
      setSuccess(`Vendor "${vendor.full_name || vendor.name || 'Unknown'}" ${actionText} successfully`);
      setStatusConfirm(null);
      
      setTimeout(() => {
        fetchVendors();
      }, 1000);
      
    } catch (error) {
      console.error(`${action} vendor failed:`, error);
      
      let errorMsg = `Failed to ${action} vendor`;
      
      if (error?.response?.status === 401) {
        errorMsg = 'Authentication failed. Please login again.';
        localStorage.removeItem('adminToken');
      } else if (error?.response?.status === 403) {
        errorMsg = `You do not have permission to ${action} this vendor.`;
      } else if (error?.response?.status === 404) {
        errorMsg = 'Vendor not found. It may have been deleted.';
      } else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formState.data) {
      setError('Form data is missing');
      return;
    }

    const validation = validateForm({ ...formState.data, mode: formState.mode });
    if (validation.length > 0) {
      setError(validation.join('. '));
      return;
    }

    const payload = { ...formState.data };
    
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Your session has expired. Please login again.');
        return;
      }

      if (formState.mode === 'add') {
        const result = await apiRegisterVendor(payload);
        setSuccess('Vendor registered successfully!');
        
        if (result?.vendor || result?.data || result) {
          const newVendor = result?.vendor || result?.data || result;
          const normalized = {
            id: newVendor.id || newVendor._id || Date.now(),
            full_name: newVendor.full_name || payload.full_name,
            email: newVendor.email || payload.email,
            phone: newVendor.phone || payload.phone,
            business_name: newVendor.business_name || payload.business_name,
            business_address: newVendor.business_address || payload.business_address,
            status: newVendor.status || payload.status || 'PENDING',
            created_at: newVendor.created_at || new Date().toISOString(),
          };
          setVendors(prev => [normalized, ...prev]);
          setTotal(prev => prev + 1);
        }
        
      } else if (formState.mode === 'edit') {
        await apiUpdateVendorDetails(payload);
        setSuccess('Vendor details updated successfully.');
        
        setVendors(prev => prev.map(v => 
          v.id === payload.id 
            ? { 
                ...v, 
                full_name: payload.full_name,
                email: payload.email,
                phone: payload.phone,
                business_name: payload.business_name,
                business_address: payload.business_address,
                status: payload.status
              }
            : v
        ));
      }

      closeForm();
      
      setTimeout(fetchVendors, 1000);
      
    } catch (error) {
      console.error('Vendor submit failed:', error);
      const errorMsg = error?.message || 'Operation failed. Please try again.';
      setError(errorMsg);
      
      if (errorMsg.includes('Authentication failed')) {
        localStorage.removeItem('adminToken');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate serial number based on current page and index
  const getSerialNumber = (index) => {
    return (page - 1) * pageSize + index + 1;
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Vendors</h4>
          <small className="text-muted">Manage vendor profiles ({total} total)</small>
        </div>
        <div className="d-flex gap-2">
          <input 
            className="form-control" 
            placeholder="Search vendors..." 
            value={query} 
            onChange={e => { 
              setQuery(e.target.value); 
              setPage(1); 
            }} 
            style={{ minWidth: '250px' }}
          />
          <button 
            className="btn btn-primary" 
            onClick={openAdd} 
            disabled={submitting || loading}
          >
            <i className="fas fa-user-plus me-2"></i>Add Vendor
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success py-2 d-flex justify-content-between align-items-center" role="alert">
          <span>{success}</span>
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setSuccess('')}
            aria-label="Close"
          ></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError('')}
            aria-label="Close"
          ></button>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th style={{ width: '80px' }}>Sr No.</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Business Name</th>
                  <th>Business Address</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <div className="mt-2">Loading vendors...</div>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((v, index) => (
                    <tr key={`${v.id || v.vendor_id || v._id}-${v.email}`}>
                      <td className="text-muted fw-semibold">{getSerialNumber(index)}</td>
                      <td>{v.full_name}</td>
                      <td>{v.email}</td>
                      <td>{v.phone}</td>
                      <td>{v.business_name}</td>
                      <td 
                        className="text-truncate" 
                        style={{maxWidth: '200px'}} 
                        title={v.business_address}
                      >
                        {v.business_address}
                      </td>
                      <td>
                        <span className={`badge ${
                          String(v.status).toUpperCase() === 'ACTIVE' ? 'bg-success' : 
                          String(v.status).toUpperCase() === 'PENDING' ? 'bg-warning text-dark' : 
                          'bg-secondary'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group">
                          <button 
                            className="btn btn-sm btn-outline-info" 
                            onClick={() => handleViewHotels(v.id || v.vendor_id || v._id)} 
                            disabled={submitting}
                            title="View Hotels"
                          >
                            <i className="fas fa-hotel"></i>
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-primary" 
                            onClick={() => openEdit(v)} 
                            disabled={submitting}
                            title="Edit Vendor"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {String(v.status).toUpperCase() === 'ACTIVE' ? (
                            <button 
                              className="btn btn-sm btn-outline-warning" 
                              onClick={() => setStatusConfirm({ vendor: v, action: 'deactivate' })} 
                              disabled={submitting}
                              title="Deactivate Vendor"
                            >
                              <i className="fas fa-pause"></i>
                            </button>
                          ) : (
                            <button 
                              className="btn btn-sm btn-outline-success" 
                              onClick={() => setStatusConfirm({ vendor: v, action: 'activate' })} 
                              disabled={submitting}
                              title="Activate Vendor"
                            >
                              <i className="fas fa-play"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      {query ? 'No vendors found matching your search' : 'No vendors found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {total > pageSize && (
            <div className="p-3 border-top d-flex flex-wrap justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <small className="text-muted">
                  Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} vendors
                </small>
                <select 
                  className="form-select form-select-sm" 
                  style={{width: 'auto'}} 
                  value={pageSize} 
                  onChange={e => { 
                    setPageSize(Number(e.target.value)); 
                    setPage(1); 
                  }}
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              <Pagination 
                current={page} 
                total={total} 
                pageSize={pageSize} 
                onChange={setPage} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {formState.open && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {formState.mode === 'add' ? 'Add New Vendor' : 'Edit Vendor'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={closeForm}
                  disabled={submitting}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Full Name <span className="text-danger">*</span></label>
                    <input 
                      className="form-control" 
                      value={formState.data?.full_name || ''} 
                      onChange={e => handleChange('full_name', e.target.value)}
                      disabled={submitting}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email <span className="text-danger">*</span></label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={formState.data?.email || ''} 
                      onChange={e => handleChange('email', e.target.value)}
                      disabled={submitting}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone <span className="text-danger">*</span></label>
                    <input 
                      className="form-control" 
                      value={formState.data?.phone || ''} 
                      onChange={e => handleChange('phone', e.target.value)}
                      disabled={submitting}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Password 
                      {formState.mode === 'add' && <span className="text-danger">*</span>}
                      {formState.mode === 'edit' && <small className="text-muted">(leave blank to keep current)</small>}
                    </label>
                    <input 
                      type="password" 
                      className="form-control" 
                      value={formState.data?.password || ''} 
                      onChange={e => handleChange('password', e.target.value)}
                      disabled={submitting}
                      placeholder={formState.mode === 'add' ? 'Enter password' : 'Enter new password (optional)'}
                    />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Business Name <span className="text-danger">*</span></label>
                    <input 
                      className="form-control" 
                      value={formState.data?.business_name || ''} 
                      onChange={e => handleChange('business_name', e.target.value)}
                      disabled={submitting}
                      placeholder="Enter business name"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Business Address <span className="text-danger">*</span></label>
                    <textarea 
                      className="form-control" 
                      rows="3"
                      value={formState.data?.business_address || ''} 
                      onChange={e => handleChange('business_address', e.target.value)}
                      disabled={submitting}
                      placeholder="Enter complete business address"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={closeForm} 
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSubmit} 
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {formState.mode === 'add' ? 'Adding...' : 'Updating...'}
                    </>
                  ) : (
                    formState.mode === 'add' ? 'Add Vendor' : 'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {statusConfirm && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Confirm {statusConfirm.action === 'activate' ? 'Activation' : 'Deactivation'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setStatusConfirm(null)}
                  disabled={submitting}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="text-center">
                  <i className={`fas ${statusConfirm.action === 'activate' ? 'fa-play-circle text-success' : 'fa-pause-circle text-warning'} fa-3x mb-3`}></i>
                  <h6>
                    Are you sure you want to {statusConfirm.action} this vendor?
                  </h6>
                  <p className="text-muted">
                    <strong>{statusConfirm.vendor.full_name}</strong><br/>
                    {statusConfirm.vendor.email}<br/>
                    {statusConfirm.vendor.business_name}
                  </p>
                  <p className={`small ${statusConfirm.action === 'activate' ? 'text-success' : 'text-warning'}`}>
                    {statusConfirm.action === 'activate' 
                      ? 'This vendor will be able to access their account and manage their services.' 
                      : 'This vendor will be suspended and unable to access their account.'}
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setStatusConfirm(null)} 
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  className={`btn ${statusConfirm.action === 'activate' ? 'btn-success' : 'btn-warning'}`}
                  onClick={() => handleStatusChange(statusConfirm.vendor, statusConfirm.action)} 
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {statusConfirm.action === 'activate' ? 'Activating...' : 'Deactivating...'}
                    </>
                  ) : (
                    <>
                      <i className={`fas ${statusConfirm.action === 'activate' ? 'fa-play' : 'fa-pause'} me-2`}></i>
                      {statusConfirm.action === 'activate' ? 'Activate Vendor' : 'Deactivate Vendor'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showHotelsModal && (
        <div className="modal d-block" onClick={() => setShowHotelsModal(false)} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Hotels by {selectedVendorForHotels?.full_name || 'Vendor'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowHotelsModal(false)}></button>
              </div>
              <div className="modal-body">
                {loadingHotels ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary"></div>
                    <p className="mt-2">Loading hotels...</p>
                  </div>
                ) : vendorHotels.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Address</th>
                          <th>City</th>
                          <th>State</th>
                          <th>Status</th>
                          <th>Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorHotels.map((hotel) => (
                          <tr key={hotel.id || hotel._id}>
                            <td>{hotel.id}</td>
                            <td>{hotel.name}</td>
                            <td>{hotel.address}</td>
                            <td>{hotel.city}</td>
                            <td>{hotel.state}</td>
                            <td>
                              <span className={`badge ${
                                (hotel.status || '').toUpperCase() === 'APPROVED' ? 'bg-success' :
                                (hotel.status || '').toUpperCase() === 'REJECTED' ? 'bg-danger' :
                                'bg-warning text-dark'
                              }`}>
                                {hotel.status || 'PENDING'}
                              </span>
                            </td>
                            <td>{hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString() : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="fas fa-hotel fa-3x mb-3"></i>
                    <p>No hotels found for this vendor.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer d-flex justify-content-between">
                 {hotelsTotalPages > 1 && (
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${hotelsPage === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handleViewHotels(null, hotelsPage - 1)}
                          disabled={hotelsPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      <li className="page-item disabled">
                        <span className="page-link">
                          Page {hotelsPage} of {hotelsTotalPages}
                        </span>
                      </li>
                      <li className={`page-item ${hotelsPage === hotelsTotalPages ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handleViewHotels(null, hotelsPage + 1)}
                          disabled={hotelsPage === hotelsTotalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setShowHotelsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;