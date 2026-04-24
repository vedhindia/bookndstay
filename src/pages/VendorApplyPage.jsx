import { useState } from 'react';
import { submitVendorApplication } from '../api/vendorApply';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaFileUpload } from 'react-icons/fa';

export default function VendorApplyPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    business_name: '',
    business_address: '',
    gst_number: '',
    hotel_license_number: '',
  });
  const [gstFile, setGstFile] = useState(null);
  const [hotelLicenseFile, setHotelLicenseFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const validate = () => {
    if (!form.full_name.trim()) return 'Full name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email.trim())) return 'Email is invalid';
    if (!form.phone.trim()) return 'Phone is required';
    if (!form.business_name.trim()) return 'Business name is required';
    if (!form.business_address.trim()) return 'Business address is required';
    if (!form.gst_number.trim()) return 'GST number is required';
    if (!form.hotel_license_number.trim()) return 'Hotel license number is required';
    if (!gstFile) return 'GST document is required';
    if (!hotelLicenseFile) return 'Hotel license document is required';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('gst', gstFile);
    fd.append('hotel_license', hotelLicenseFile);

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await submitVendorApplication(fd);
      setSuccess('Application submitted successfully. Admin will verify your documents and send login credentials to your email.');
      setForm({
        full_name: '',
        email: '',
        phone: '',
        business_name: '',
        business_address: '',
        gst_number: '',
        hotel_license_number: '',
      });
      setGstFile(null);
      setHotelLicenseFile(null);
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-center mb-2 text-gray-800">List Your Property</h1>
        <p className="text-center text-sm text-gray-500 mb-5">
          Submit your details and documents. Admin will verify and send vendor login credentials to your registered email.
        </p>

        {success && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">{success}</div>}
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                  placeholder="Owner name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                  placeholder="vendor@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaPhone className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                  placeholder="Mobile number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaBuilding className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="business_name"
                  value={form.business_name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                  placeholder="Hotel / Business name"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
            <textarea
              name="business_address"
              value={form.business_address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
              placeholder="Full address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <input
                type="text"
                name="gst_number"
                value={form.gst_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                placeholder="GST number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hotel License Number</label>
              <input
                type="text"
                name="hotel_license_number"
                value={form.hotel_license_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ee2e24]"
                placeholder="Hotel license number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Document</label>
              <div className="flex items-center gap-2">
                <FaFileUpload className="text-gray-400" />
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setGstFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
              {gstFile?.name && <div className="text-xs text-gray-500 mt-1">{gstFile.name}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hotel License Document</label>
              <div className="flex items-center gap-2">
                <FaFileUpload className="text-gray-400" />
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setHotelLicenseFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
              {hotelLicenseFile?.name && <div className="text-xs text-gray-500 mt-1">{hotelLicenseFile.name}</div>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ee2e24] text-white py-2.5 rounded-md hover:bg-[#d5281f] transition-colors font-semibold disabled:opacity-70"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}

