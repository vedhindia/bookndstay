
import React, { useEffect, useMemo, useState } from 'react';
import { adminVendors, adminVendorApplications } from './services/adminApi';
import Pagination from './components/Pagination';
import { useNavigate } from 'react-router-dom';

const Vendors = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('vendors');
  const [vendors, setVendors] = useState([]);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusConfirm, setStatusConfirm] = useState(null);

  const [applications, setApplications] = useState([]);
  const [appQuery, setAppQuery] = useState('');
  const [appStatus, setAppStatus] = useState('SUBMITTED');
  const [appPage, setAppPage] = useState(1);
  const [appPageSize, setAppPageSize] = useState(10);
  const [appTotal, setAppTotal] = useState(0);
  const [appLoading, setAppLoading] = useState(false);
  const [appSubmitting, setAppSubmitting] = useState(false);

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

  const fetchApplications = async () => {
    setAppLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      const raw = await adminVendorApplications.list({
        page: appPage,
        limit: appPageSize,
        status: appStatus || undefined,
        search: appQuery || undefined,
      });

      const list = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.results)
        ? raw.results
        : Array.isArray(raw?.applications)
        ? raw.applications
        : Array.isArray(raw)
        ? raw
        : [];

      const normalized = list.map((a) => ({
        id: a.id,
        full_name: a.full_name || '',
        email: a.email || '',
        phone: a.phone || '',
        business_name: a.business_name || '',
        business_address: a.business_address || '',
        gst_number: a.gst_number || '',
        hotel_license_number: a.hotel_license_number || '',
        status: (a.status || 'SUBMITTED').toString().toUpperCase(),
        createdAt: a.createdAt || a.created_at || new Date().toISOString(),
        documents: Array.isArray(a.documents) ? a.documents : [],
        rejection_reason: a.rejection_reason || '',
      }));

      setApplications(normalized);
      const computedTotal = raw?.total ?? raw?.pagination?.totalItems ?? raw?.pagination?.total ?? raw?.count ?? normalized.length;
      setAppTotal(Number(computedTotal));
    } catch (err) {
      console.error('Fetch vendor applications failed:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to fetch vendor applications';
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('adminToken');
        setError('Authentication failed. Please login again.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setAppLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const delayedFetch = setTimeout(() => {
      if (activeTab === 'vendors') fetchVendors();
    }, query ? 500 : 0);

    return () => clearTimeout(delayedFetch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, pageSize, query]);

  useEffect(() => {
    const delayedFetch = setTimeout(() => {
      if (activeTab === 'applications') fetchApplications();
    }, appQuery ? 500 : 0);

    return () => clearTimeout(delayedFetch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, appPage, appPageSize, appStatus, appQuery]);

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


  // Calculate serial number based on current page and index
  const getSerialNumber = (index) => {
    return (page - 1) * pageSize + index + 1;
  };

  const getAppSerialNumber = (index) => {
    return (appPage - 1) * appPageSize + index + 1;
  };

  const handleApproveApplication = async (application) => {
    if (!application?.id) return;
    try {
      setAppSubmitting(true);
      setError('');
      setSuccess('');
      await adminVendorApplications.approve(application.id);
      setSuccess(`Application approved and credentials sent to ${application.email}`);
      fetchApplications();
      fetchVendors();
    } catch (err) {
      console.error('Approve application failed:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to approve application';
      setError(errorMsg);
    } finally {
      setAppSubmitting(false);
    }
  };

  const handleRejectApplication = async (application) => {
    if (!application?.id) return;
    const reason = window.prompt('Enter rejection reason (required):');
    if (!reason || !String(reason).trim()) return;
    try {
      setAppSubmitting(true);
      setError('');
      setSuccess('');
      await adminVendorApplications.reject(application.id, { reason: String(reason).trim() });
      setSuccess(`Application rejected for ${application.email}`);
      fetchApplications();
    } catch (err) {
      console.error('Reject application failed:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to reject application';
      setError(errorMsg);
    } finally {
      setAppSubmitting(false);
    }
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">{activeTab === 'vendors' ? 'Vendors' : 'Vendor Applications'}</h4>
          <small className="text-muted">
            {activeTab === 'vendors'
              ? `Manage vendor profiles (${total} total)`
              : `Review new vendor applications (${appTotal} total)`}
          </small>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <div className="btn-group" role="group" aria-label="Vendor tabs">
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'vendors' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('vendors')}
              disabled={submitting || loading || appSubmitting || appLoading}
            >
              Vendors
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'applications' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('applications')}
              disabled={submitting || loading || appSubmitting || appLoading}
            >
              Applications
            </button>
          </div>

          {activeTab === 'vendors' ? (
            <>
              <input
                className="form-control"
                placeholder="Search vendors..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                style={{ minWidth: '250px' }}
              />
            </>
          ) : (
            <>
              <select
                className="form-select"
                value={appStatus}
                onChange={(e) => {
                  setAppStatus(e.target.value);
                  setAppPage(1);
                }}
                style={{ minWidth: '170px' }}
              >
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="NEED_MORE_INFO">NEED_MORE_INFO</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <input
                className="form-control"
                placeholder="Search applications..."
                value={appQuery}
                onChange={(e) => {
                  setAppQuery(e.target.value);
                  setAppPage(1);
                }}
                style={{ minWidth: '250px' }}
              />
            </>
          )}
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
          {activeTab === 'vendors' ? (
            <>
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
                          <td className="text-truncate" style={{ maxWidth: '200px' }} title={v.business_address}>
                            {v.business_address}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                String(v.status).toUpperCase() === 'ACTIVE'
                                  ? 'bg-success'
                                  : String(v.status).toUpperCase() === 'PENDING'
                                  ? 'bg-warning text-dark'
                                  : 'bg-secondary'
                              }`}
                            >
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

              {total > pageSize && (
                <div className="p-3 border-top d-flex flex-wrap justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <small className="text-muted">
                      Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} vendors
                    </small>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 'auto' }}
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                  </div>
                  <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th style={{ width: '80px' }}>Sr No.</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Business Name</th>
                      <th>GST</th>
                      <th>Hotel License</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appLoading ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <div className="mt-2">Loading applications...</div>
                        </td>
                      </tr>
                    ) : applications.length > 0 ? (
                      applications.map((a, index) => {
                        const gstDoc = a.documents.find((d) => String(d.doc_type).toUpperCase() === 'GST');
                        const licenseDoc = a.documents.find((d) => String(d.doc_type).toUpperCase() === 'HOTEL_LICENSE');
                        return (
                          <tr key={`${a.id}-${a.email}`}>
                            <td className="text-muted fw-semibold">{getAppSerialNumber(index)}</td>
                            <td>{a.full_name}</td>
                            <td>{a.email}</td>
                            <td>{a.phone}</td>
                            <td className="text-truncate" style={{ maxWidth: '180px' }} title={a.business_name}>
                              {a.business_name}
                            </td>
                            <td>
                              {gstDoc?.file_path ? (
                                <a href={gstDoc.file_path} target="_blank" rel="noreferrer">
                                  View
                                </a>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              {licenseDoc?.file_path ? (
                                <a href={licenseDoc.file_path} target="_blank" rel="noreferrer">
                                  View
                                </a>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              <span className="badge bg-secondary">{a.status}</span>
                            </td>
                            <td className="text-end">
                              <div className="btn-group">
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => handleApproveApplication(a)}
                                  disabled={appSubmitting}
                                  title="Approve"
                                >
                                  <i className="fas fa-check"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleRejectApplication(a)}
                                  disabled={appSubmitting}
                                  title="Reject"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center text-muted py-4">
                          {appQuery ? 'No applications found matching your search' : 'No applications found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {appTotal > appPageSize && (
                <div className="p-3 border-top d-flex flex-wrap justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <small className="text-muted">
                      Showing {Math.min((appPage - 1) * appPageSize + 1, appTotal)} to {Math.min(appPage * appPageSize, appTotal)} of {appTotal}{' '}
                      applications
                    </small>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 'auto' }}
                      value={appPageSize}
                      onChange={(e) => {
                        setAppPageSize(Number(e.target.value));
                        setAppPage(1);
                      }}
                    >
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                  </div>
                  <Pagination current={appPage} total={appTotal} pageSize={appPageSize} onChange={setAppPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
