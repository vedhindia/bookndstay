import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuth } from './services/adminApi';

const MyInfo = () => {
  const [admin, setAdmin] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const adminStr = localStorage.getItem('adminUser');
    if (adminStr) {
      const parsed = JSON.parse(adminStr);
      setAdmin(parsed);
      setFormData({
        full_name: parsed.full_name || parsed.name || '',
        email: parsed.email || '',
        phone: parsed.phone || ''
      });
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMessage({ type: '', text: '' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      full_name: admin.full_name || admin.name || '',
      email: admin.email || '',
      phone: admin.phone || ''
    });
    setMessage({ type: '', text: '' });
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const res = await adminAuth.updateProfile(formData);
      if (res.success) {
        // Update local state
        const updatedAdmin = { ...admin, ...res.admin };
        setAdmin(updatedAdmin);
        localStorage.setItem('adminUser', JSON.stringify(updatedAdmin));
        
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to update profile' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  if (!admin) {
    return (
      <div className="container-fluid p-4">
        <div className="alert alert-warning">No admin information found. Please login again.</div>
      </div>
    );
  }

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="container-fluid p-4 bg-light min-vh-100">
      <div className="row justify-content-center">
        <div className="col-lg-8 col-xl-7">
          <div className="card border-0 shadow-lg overflow-hidden rounded-4">
            {/* Header Profile Section with Gradient */}
            <div className="bg-primary p-5 text-center position-relative" 
                 style={{
                   background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
                   paddingBottom: '4rem'
                 }}>
              <div className="position-absolute top-0 end-0 p-3">
                 <span className="badge bg-white text-primary bg-opacity-75 backdrop-blur shadow-sm">
                    <i className="fas fa-circle text-success small me-1"></i> Online
                 </span>
              </div>
              
              <div className="mb-3 position-relative d-inline-block">
                <div className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center shadow-lg mx-auto" 
                     style={{ 
                       width: '110px', 
                       height: '110px', 
                       fontSize: '2.5rem', 
                       fontWeight: 'bold',
                       border: '4px solid rgba(255, 255, 255, 0.2)' 
                     }}>
                  {getInitials(formData.full_name)}
                </div>
                <div className="position-absolute bottom-0 end-0 bg-success border border-4 border-white rounded-circle p-2"></div>
              </div>
              
              <h2 className="text-white fw-bold mb-1">{formData.full_name || 'Admin User'}</h2>
              <p className="text-white-50 mb-0 fs-5">{admin.role || 'Administrator'}</p>
            </div>

            {/* Body Section */}
            <div className="card-body p-4 p-md-5 bg-white rounded-top-4 mt-n4 position-relative">
              
              {/* Message Alert */}
              {message.text && (
                <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`} role="alert">
                  {message.text}
                  <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark m-0">Personal Details</h5>
                {!isEditing ? (
                  <button onClick={handleEdit} className="btn btn-light text-primary rounded-pill btn-sm fw-bold px-3">
                    <i className="fas fa-pen me-2"></i>Edit
                  </button>
                ) : (
                  <div className="d-flex gap-2">
                    <button onClick={handleCancel} className="btn btn-light text-secondary rounded-pill btn-sm fw-bold px-3" disabled={loading}>
                      Cancel
                    </button>
                    <button onClick={handleSave} className="btn btn-primary rounded-pill btn-sm fw-bold px-3" disabled={loading}>
                      {loading ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-save me-2"></i>}
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="row g-4">
                {/* Full Name Input (Only visible when editing, otherwise shown in header) - actually showing here too */}
                {isEditing && (
                  <div className="col-12">
                     <label className="form-label text-muted small fw-bold text-uppercase">Full Name</label>
                     <input 
                       type="text" 
                       className="form-control form-control-lg bg-light border-0"
                       name="full_name"
                       value={formData.full_name}
                       onChange={handleChange}
                     />
                  </div>
                )}

                {/* Email Card */}
                <div className="col-12 ">
                  <div className={`p-3 border rounded-3 ${isEditing ? 'bg-white' : 'bg-light bg-opacity-50'} h-100 d-flex align-items-center hover-shadow transition-all`}>
                    <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-primary d-flex align-items-center justify-content-center" style={{width: '50px', height: '50px'}}>
                      <i className="fas fa-envelope fa-lg"></i>
                    </div>
                    <div className="w-100">
                      <small className="text-muted text-uppercase fw-bold" style={{fontSize: '0.75rem', letterSpacing: '0.5px'}}>Email Address</small>
                      {isEditing ? (
                        <input 
                          type="email" 
                          className="form-control border-0 bg-light p-1 mt-1" 
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                        />
                      ) : (
                        <div className="fw-bold text-dark">{admin.email}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone Card */}
                <div className="col-12 col-xl-6">
                  <div className={`p-3 border rounded-3 ${isEditing ? 'bg-white' : 'bg-light bg-opacity-50'} h-100 d-flex align-items-center hover-shadow transition-all`}>
                    <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-success d-flex align-items-center justify-content-center" style={{width: '50px', height: '50px'}}>
                      <i className="fas fa-phone-alt fa-lg"></i>
                    </div>
                    <div className="w-100">
                      <small className="text-muted text-uppercase fw-bold" style={{fontSize: '0.75rem', letterSpacing: '0.5px'}}>Phone Number</small>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="form-control border-0 bg-light p-1 mt-1" 
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="Enter phone number"
                        />
                      ) : (
                        <div className="fw-bold text-dark">{admin.phone || 'Not Provided'}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account ID Card (Read Only) */}
                <div className="col-12 col-xl-6">
                  <div className="p-3 border rounded-3 bg-light bg-opacity-50 h-100 d-flex align-items-center hover-shadow transition-all">
                    <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-warning d-flex align-items-center justify-content-center" style={{width: '50px', height: '50px'}}>
                      <i className="fas fa-id-card fa-lg"></i>
                    </div>
                    <div>
                      <small className="text-muted text-uppercase fw-bold" style={{fontSize: '0.75rem', letterSpacing: '0.5px'}}>Account ID</small>
                      <div className="fw-bold text-dark font-monospace">#{admin.id}</div>
                    </div>
                  </div>
                </div>

                {/* Status Card (Read Only) */}
                <div className="col-12 col-xl-6">
                  <div className="p-3 border rounded-3 bg-light bg-opacity-50 h-100 d-flex align-items-center hover-shadow transition-all">
                    <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-info d-flex align-items-center justify-content-center" style={{width: '50px', height: '50px'}}>
                      <i className="fas fa-shield-alt fa-lg"></i>
                    </div>
                    <div>
                      <small className="text-muted text-uppercase fw-bold" style={{fontSize: '0.75rem', letterSpacing: '0.5px'}}>Account Status</small>
                      <div>
                        <span className="badge bg-success rounded-pill px-3">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security / Extra Section */}
              <div className="mt-5 pt-4 border-top">
                <h5 className="fw-bold text-dark mb-3">Security Settings</h5>
                <div className="row g-3">
                  <div className="col-md-6">
                     <button 
                       className="btn btn-outline-secondary w-100 text-start d-flex justify-content-between align-items-center p-3 rounded-3"
                       onClick={() => navigate('/dashboard/change-password')}
                       disabled={isEditing}
                     >
                        <span><i className="fas fa-key me-2"></i> Change Password</span>
                        <i className="fas fa-chevron-right small"></i>
                     </button>
                  </div>
                 
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      
      {/* Custom CSS for hover effects */}
      <style>
        {`
          .hover-shadow:hover {
            box-shadow: 0 .5rem 1rem rgba(0,0,0,.05)!important;
            transform: translateY(-2px);
            background-color: #fff!important;
          }
          .transition-all {
            transition: all 0.3s ease;
          }
        `}
      </style>
    </div>
  );
};

export default MyInfo;
