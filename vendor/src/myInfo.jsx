import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './services/apiClient';
import { getSession, getCurrentUser, isAuthenticated, clearSession, saveSession } from './utils/auth';

const MyInfo = () => {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    business_name: '',
    business_address: '',
    status: 'PENDING',
  });

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      clearSession();
      navigate('/', { replace: true });
      return;
    }
    
    fetchVendorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Fetch current vendor's own data using /api/admin/vendors/:vendorId
  const fetchVendorData = async () => {
    const currentUser = getCurrentUser();
    
    if (!currentUser?.id) {
      setError('Vendor information not found. Please login again.');
      setLoading(false);
      setTimeout(() => {
        clearSession();
        navigate('/', { replace: true });
      }, 2000);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching vendor profile for ID:', currentUser.id);
      console.log('Using endpoint: /api/admin/vendors/' + currentUser.id);
      
      // Use the vendor profile endpoint
      const response = await api.get('/vendor/profile');
      
      console.log('API Response:', response);
      console.log('Response data:', response.data);
      
      // Extract vendor data from response
      // The response structure is: { success: true, message: "...", data: { vendor: {...} } }
      const vendorData = response.data?.data?.vendor || response.data?.vendor || response.data?.data || response.data;
      
      console.log('Extracted vendor data:', vendorData);
      
      if (!vendorData || !vendorData.id) {
        throw new Error('Invalid vendor data received from server');
      }

      // Normalize the vendor data to handle different field naming conventions
      const normalizedVendor = {
        id: vendorData.id || currentUser.id,
        full_name: vendorData.full_name || vendorData.fullName || vendorData.name || '',
        email: vendorData.email || '',
        phone: vendorData.phone || vendorData.mobile || vendorData.phoneNumber || vendorData.contact || '',
        business_name: vendorData.business_name || vendorData.businessName || vendorData.company || vendorData.companyName || '',
        business_address: vendorData.business_address || vendorData.businessAddress || vendorData.address || vendorData.companyAddress || '',
        status: (vendorData.status || vendorData.accountStatus || 'PENDING').toString().toUpperCase(),
        created_at: vendorData.createdAt || vendorData.created_at || vendorData.registeredAt || vendorData.registration_date || '',
        updated_at: vendorData.updatedAt || vendorData.updated_at || '',
        hotels_count: vendorData.hotelsCount || vendorData.hotels_count || 0
      };

      console.log('Normalized vendor data:', normalizedVendor);

      setVendor(normalizedVendor);
      setFormData({
        full_name: normalizedVendor.full_name,
        email: normalizedVendor.email,
        phone: normalizedVendor.phone,
        password: '', // Don't populate password field
        business_name: normalizedVendor.business_name,
        business_address: normalizedVendor.business_address,
        status: normalizedVendor.status,
      });
      
      setError('');
    } catch (err) {
      console.error('Fetch vendor failed:', err);
      console.error('Error response:', err?.response);
      
      // Handle different error types
      if (err?.response?.status === 500) {
        setError('Server error occurred. The backend API is not responding correctly. Please contact support or try again later.');
      } else if (err?.response?.status === 401) {
        setError('Authentication failed. Your session has expired. Redirecting to login...');
        setTimeout(() => {
          clearSession();
          navigate('/', { replace: true });
        }, 2000);
      } else if (err?.response?.status === 403) {
        const errorMessage = err?.response?.data?.message || 'Insufficient rights';
        setError(`Access denied: ${errorMessage}. Please check your permissions.`);
        
        // Don't redirect immediately for 403, give user time to read the message
        setTimeout(() => {
          // Optionally redirect after showing message
          console.error('403 Forbidden - Check backend middleware configuration');
        }, 5000);
      } else if (err?.response?.status === 404) {
        setError('Vendor profile not found. This vendor ID may not exist in the database, or the endpoint route is not properly configured.');
      } else {
        const errorMsg = err?.response?.data?.message || err?.message || 'Failed to fetch vendor information. Please try again later.';
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form data when canceling
      setFormData({
        full_name: vendor.full_name,
        email: vendor.email,
        phone: vendor.phone,
        password: '',
        business_name: vendor.business_name,
        business_address: vendor.business_address,
        status: vendor.status,
      });
    }
    setIsEditing(!isEditing);
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.full_name?.trim()) errors.push('Full name is required');
    if (!formData.phone?.trim()) errors.push('Phone is required');
    if (!formData.business_name?.trim()) errors.push('Business name is required');
    if (!formData.business_address?.trim()) errors.push('Business address is required');
    
    // Phone validation
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      errors.push('Please enter a valid phone number (at least 10 digits)');
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!vendor?.id) {
      setError('Vendor ID not found');
      return;
    }

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      // Build update payload according to API schema
      // Only include fields allowed by the API: full_name, phone, business_name, business_address
      const updatePayload = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.replace(/[\s\-\(\)]/g, ''),
        business_name: formData.business_name.trim(),
        business_address: formData.business_address.trim(),
      };

      console.log('Update payload:', updatePayload);
      console.log('Updating vendor via: PUT /api/vendor/profile');

      // Use the vendor profile endpoint
      const response = await api.put('/vendor/profile', updatePayload);
      
      console.log('Update response:', response);
      
      // Extract updated vendor data
      const updatedVendor = response.data?.data?.vendor || response.data?.vendor || response.data?.data || response.data;
      
      console.log('Updated vendor data:', updatedVendor);

      // Check if update was successful
      if (updatedVendor || response?.status === 200 || response?.status === 204) {
        // Update local state with the new data
        const newVendorData = {
          ...vendor,
          full_name: updatedVendor?.full_name || updatedVendor?.fullName || formData.full_name,
          email: updatedVendor?.email || formData.email,
          phone: updatedVendor?.phone || updatedVendor?.mobile || formData.phone,
          business_name: updatedVendor?.business_name || updatedVendor?.businessName || formData.business_name,
          business_address: updatedVendor?.business_address || updatedVendor?.businessAddress || formData.business_address,
          status: updatedVendor?.status || formData.status,
          updated_at: updatedVendor?.updatedAt || updatedVendor?.updated_at || new Date().toISOString()
        };
        
        console.log('New vendor data after update:', newVendorData);
        
        setVendor(newVendorData);
        
        // Update session with new data
        const session = getSession();
        if (session) {
          const updatedUser = {
            ...session.user,
            full_name: newVendorData.full_name,
            email: newVendorData.email,
            phone: newVendorData.phone,
            business_name: newVendorData.business_name,
            business_address: newVendorData.business_address,
          };
          saveSession(session.token, updatedUser);
          console.log('Session updated with new user data');
        }
        
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        
        // Clear password field after successful update
        setFormData(prev => ({
          ...prev,
          password: ''
        }));
      } else {
        throw new Error('Update failed - no valid response received');
      }
    } catch (err) {
      console.error('Update failed:', err);
      console.error('Error details:', {
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        message: err?.message
      });
      
      let errorMsg = 'Failed to update profile';
      
      if (err?.response?.status === 401) {
        errorMsg = 'Authentication failed. Your session has expired. Redirecting to login...';
        setTimeout(() => {
          clearSession();
          navigate('/', { replace: true });
        }, 2000);
      } else if (err?.response?.status === 403) {
        const errorMessage = err?.response?.data?.message || 'Insufficient rights';
        errorMsg = `Access denied: ${errorMessage}. You do not have permission to update this profile.`;
      } else if (err?.response?.status === 404) {
        errorMsg = 'Update endpoint not found. The vendor ID may be invalid or the route is not configured correctly.';
      } else if (err?.response?.status === 409) {
        errorMsg = err?.response?.data?.message || 'Conflict error. Email might already be in use by another vendor.';
      } else if (err?.response?.status === 422) {
        errorMsg = err?.response?.data?.message || 'Invalid data provided. Please check your inputs.';
      } else if (err?.response?.status === 500) {
        errorMsg = 'Server error occurred. Please try again later or contact support.';
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !vendor) {
    return (
      <div className="container-fluid p-3 p-md-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="mt-3 text-muted">Loading your profile...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !vendor) {
    return (
      <div className="container-fluid p-3 p-md-4">
        <div className="alert alert-danger d-flex align-items-start" role="alert">
          <i className="fas fa-exclamation-triangle me-3 fs-4 mt-1"></i>
          <div className="flex-grow-1">
            <h5 className="alert-heading mb-2">Error Loading Profile</h5>
            <p className="mb-0">{error}</p>
            <hr className="my-3" />
            <p className="mb-0 small">
              <strong>Troubleshooting:</strong>
              <br />• Ensure you're logged in as a VENDOR
              <br />• Check that the backend route <code>/api/admin/vendors/:vendorId</code> allows VENDOR role
              <br />• Verify your user ID matches a vendor in the database
              <br />• Check browser console for detailed error logs
            </p>
          </div>
        </div>
        <div className="text-center mt-4">
          <button className="btn btn-primary me-2" onClick={fetchVendorData}>
            <i className="fas fa-sync-alt me-2"></i>Retry
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            <i className="fas fa-sign-in-alt me-2"></i>Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container-fluid p-3 p-md-4">
        <div className="alert alert-warning" role="alert">
          <i className="fas fa-info-circle me-2"></i>
          No vendor information available. Redirecting to login...
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="mb-1">My Profile</h4>
              <small className="text-muted">View and manage your vendor information</small>
            </div>
            <button
              onClick={handleEditToggle}
              className={`btn ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
              disabled={submitting}
            >
              <i className={`fas ${isEditing ? 'fa-times' : 'fa-edit'} me-2`}></i>
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
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

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="fas fa-exclamation-circle me-2"></i>
              {error}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError('')}
                aria-label="Close"
              ></button>
            </div>
          )}

          {/* Profile Card */}
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row g-4">
                  {/* Left Column */}
                  <div className="col-md-6">
                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-user me-2 text-primary"></i>Full Name
                        {isEditing && <span className="text-danger ms-1">*</span>}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="form-control"
                          placeholder="Enter your full name"
                          required
                          disabled={submitting}
                        />
                      ) : (
                        <div className="form-control-plaintext border rounded p-2 bg-light">
                          {vendor.full_name || '-'}
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-envelope me-2 text-primary"></i>Email
                      </label>
                      <div className="form-control-plaintext border rounded p-2 bg-light">
                        {vendor.email || '-'}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-phone me-2 text-primary"></i>Phone
                        {isEditing && <span className="text-danger ms-1">*</span>}
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="form-control"
                          placeholder="Enter your phone number"
                          required
                          disabled={submitting}
                        />
                      ) : (
                        <div className="form-control-plaintext border rounded p-2 bg-light">
                          {vendor.phone || '-'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="col-md-6">
                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-building me-2 text-primary"></i>Business Name
                        {isEditing && <span className="text-danger ms-1">*</span>}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="business_name"
                          value={formData.business_name}
                          onChange={handleInputChange}
                          className="form-control"
                          placeholder="Enter your business name"
                          required
                          disabled={submitting}
                        />
                      ) : (
                        <div className="form-control-plaintext border rounded p-2 bg-light">
                          {vendor.business_name || '-'}
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-map-marker-alt me-2 text-primary"></i>Business Address
                        {isEditing && <span className="text-danger ms-1">*</span>}
                      </label>
                      {isEditing ? (
                        <textarea
                          name="business_address"
                          value={formData.business_address}
                          onChange={handleInputChange}
                          rows="4"
                          className="form-control"
                          placeholder="Enter your complete business address"
                          required
                          disabled={submitting}
                        />
                      ) : (
                        <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '100px', whiteSpace: 'pre-line' }}>
                          {vendor.business_address || '-'}
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-info-circle me-2 text-primary"></i>Account Status
                      </label>
                      <div>
                        <span className={`badge fs-6 ${
                          vendor.status === 'ACTIVE' ? 'bg-success' : 
                          vendor.status === 'PENDING' ? 'bg-warning text-dark' : 
                          vendor.status === 'SUSPENDED' ? 'bg-danger' :
                          'bg-secondary'
                        }`}>
                          <i className={`fas ${
                            vendor.status === 'ACTIVE' ? 'fa-check-circle' : 
                            vendor.status === 'PENDING' ? 'fa-clock' : 
                            vendor.status === 'SUSPENDED' ? 'fa-ban' :
                            'fa-question-circle'
                          } me-2`}></i>
                          {vendor.status}
                        </span>
                      </div>
                    </div>

                    {/* Hotels Count */}
                    {vendor.hotels_count !== undefined && (
                      <div className="mb-4">
                        <label className="form-label fw-semibold">
                          <i className="fas fa-hotel me-2 text-primary"></i>Total Hotels
                        </label>
                        <div className="form-control-plaintext border rounded p-2 bg-light">
                          <span className="badge bg-primary fs-6">{vendor.hotels_count}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="col-12">
                    <div className="border-top pt-3">
                      <div className="row">
                        <div className="col-md-6">
                          {vendor.created_at && (
                            <small className="text-muted d-block mb-2">
                              <i className="fas fa-calendar-plus me-2"></i>
                              <strong>Member since:</strong> {new Date(vendor.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </small>
                          )}
                        </div>
                        <div className="col-md-6">
                          {vendor.updated_at && (
                            <small className="text-muted d-block mb-2">
                              <i className="fas fa-calendar-check me-2"></i>
                              <strong>Last updated:</strong> {new Date(vendor.updated_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </small>
                          )}
                        </div>
                      </div>
                      <small className="text-muted d-block mt-2">
                        <i className="fas fa-database me-2"></i>
                        <strong>Vendor ID:</strong> {vendor.id}
                      </small>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isEditing && (
                    <div className="col-12">
                      <div className="d-flex justify-content-end gap-2 border-top pt-3">
                        <button
                          type="button"
                          onClick={handleEditToggle}
                          className="btn btn-secondary"
                          disabled={submitting}
                        >
                          <i className="fas fa-times me-2"></i>Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Saving...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save me-2"></i>Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MyInfo;