import React, { useState } from 'react';

const Settings = () => {
  const [profile, setProfile] = useState({ name: 'Admin User', email: 'admin@example.com', phone: '+91 99999 99999' });
  const [prefs, setPrefs] = useState({ bookingAlerts: true, paymentAlerts: true, vendorRequests: true });

  return (
    <div className="container-fluid p-3 p-md-4">
      <h4 className="mb-3">Settings</h4>
      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0">Admin Profile</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Name</label>
                  <input className="form-control" value={profile.name} onChange={e=>setProfile({...profile, name: e.target.value})} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input className="form-control" value={profile.email} onChange={e=>setProfile({...profile, email: e.target.value})} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={profile.phone} onChange={e=>setProfile({...profile, phone: e.target.value})} />
                </div>
                <div className="col-12">
                  <button className="btn btn-primary">Save Profile</button>
                  <a href="/dashboard/change-password" className="btn btn-outline-secondary ms-2">Change Password</a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0">Notifications</h6>
            </div>
            <div className="card-body">
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" id="bookingAlerts" checked={prefs.bookingAlerts} onChange={e=>setPrefs({...prefs, bookingAlerts: e.target.checked})} />
                <label className="form-check-label" htmlFor="bookingAlerts">Booking Alerts</label>
              </div>
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" id="paymentAlerts" checked={prefs.paymentAlerts} onChange={e=>setPrefs({...prefs, paymentAlerts: e.target.checked})} />
                <label className="form-check-label" htmlFor="paymentAlerts">Payment Alerts</label>
              </div>
              <div className="form-check form-switch mb-4">
                <input className="form-check-input" type="checkbox" id="vendorRequests" checked={prefs.vendorRequests} onChange={e=>setPrefs({...prefs, vendorRequests: e.target.checked})} />
                <label className="form-check-label" htmlFor="vendorRequests">Vendor Requests</label>
              </div>
              <button className="btn btn-primary">Save Preferences</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
