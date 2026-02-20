import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaPencilAlt, FaCamera } from 'react-icons/fa';
import ChangePasswordModal from '../components/ChangePasswordModal';
import authApi from '../api/auth';

export default function MyProfile() {
  const navigate = useNavigate();
  const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:3001/api/user/auth');
  const hostBase = (() => {
    try {
      const url = new URL(apiBase);
      return `${url.protocol}//${url.host}`;
    } catch {
      return 'http://localhost:3001';
    }
  })();
  const filesBase = (import.meta.env.VITE_FILES_BASE || hostBase);
  const resolveProfilePhotoUrl = (val) => {
    if (!val || typeof val !== 'string') return null;
    if (/^https?:\/\//i.test(val)) return val;
    const candidates = [
      `${filesBase}/uploads/${val}`,
      `${filesBase}/uploads/profile/${val}`,
      `${filesBase}/static/uploads/${val}`,
    ];
    return candidates[0];
  };
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    profilePic: null
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({ ...profile });
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const user = await authApi.getProfile();
        if (!mounted) return;
        if (user) {
          const mapped = {
            name: user.full_name || '',
            email: user.email || '',
            phone: user.phone || '',
            address: user.address || '',
            profilePic: resolveProfilePhotoUrl(user.profile_photo)
          };
          setProfile(mapped);
          setEditedProfile(mapped);
        }
        setError('');
      } catch (e) {
        const msg = String(e?.message || '').toLowerCase();
        if (msg.includes('unknown column') || msg.includes('field list')) {
          const cached = (typeof window !== 'undefined') ? JSON.parse(localStorage.getItem('auth_user') || 'null') : null;
          if (cached) {
            const mapped = {
              name: cached.full_name || '',
              email: cached.email || '',
              phone: cached.phone || '',
              address: cached.address || '',
              profilePic: resolveProfilePhotoUrl(cached.profile_photo),
            };
            setProfile(mapped);
            setEditedProfile(mapped);
            setError('');
          } else {
            setError('Failed to load profile');
          }
        } else {
          setError(e?.message || 'Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, []);

  const handleEditToggle = async () => {
    if (isEditing) {
      try {
        setSaving(true);
        setError('');
        setSuccess('');
        const updated = await authApi.updateProfile({
          full_name: editedProfile.name,
          phone: editedProfile.phone,
          address: editedProfile.address,
          profile_photo: editedProfile.profileFile,
        });
        const mapped = {
          name: (updated?.full_name) || editedProfile.name,
          email: (updated?.email) || editedProfile.email,
          phone: (updated?.phone) || editedProfile.phone,
          address: (updated?.address) || editedProfile.address,
          profilePic: resolveProfilePhotoUrl(updated?.profile_photo) || editedProfile.profilePic
        };
        setProfile(mapped);
        setEditedProfile(mapped);
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } catch (e) {
        setError(e?.message || 'Failed to update profile');
        return;
      } finally {
        setSaving(false);
      }
    }
    setIsEditing(!isEditing);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile({
      ...editedProfile,
      [name]: value
    });
  };
  
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedProfile({
          ...editedProfile,
          profilePic: reader.result,
          profileFile: file
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">My Profile</h1>
            <p className="text-gray-600">Manage your personal information and security settings</p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
              Loading your profile...
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
              {String(error).toLowerCase().includes('not logged in') && (
                <div className="mt-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 rounded bg-[#ee2e24] text-white hover:bg-[#d62c22] text-sm font-medium"
                  >
                    Go to Login
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
          
          {/* Main Profile Card */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            {/* Red Header Banner */}
            <div className="bg-[#ee2e24] h-32 relative"></div>
            
            {/* Profile Picture Section */}
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 mb-6">
                <div className="flex items-end mb-4 sm:mb-0">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden">
                      {(isEditing ? editedProfile.profilePic : profile.profilePic) ? (
                        <img 
                          src={isEditing ? editedProfile.profilePic : profile.profilePic} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            setProfile((p) => ({ ...p, profilePic: null }));
                            setEditedProfile((p) => ({ ...p, profilePic: null }));
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <FaUser className="text-gray-500 text-5xl" />
                        </div>
                      )}
                    </div>
                    
                    {isEditing && (
                      <label className="absolute bottom-0 right-0 bg-[#ee2e24] hover:bg-[#d62c22] text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors">
                        <FaCamera className="text-base" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleProfilePicChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
                
                <button 
                  onClick={handleEditToggle}
                  disabled={saving}
                  className={`px-6 py-2 rounded text-white font-medium transition-colors ${
                    saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#ee2e24] hover:bg-[#d62c22]'
                  }`}
                >
                  {isEditing ? (saving ? 'Saving...' : 'Save Profile') : (
                    <>
                      <FaPencilAlt className="inline mr-2" />
                      Edit Profile
                    </>
                  )}
                </button>
              </div>
              
              {/* Name and Email Display */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {profile.name || 'User Name'}
                </h2>
                <div className="flex items-center text-gray-600">
                  <FaEnvelope className="mr-2 text-sm" />
                  <span>{profile.email || 'email@example.com'}</span>
                </div>
              </div>
              
              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Full Name
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ee2e24]">
                        <FaUser />
                      </span>
                      <input 
                        type="text" 
                        name="name"
                        value={editedProfile.name}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24] focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center px-4 py-3 bg-gray-50 border border-gray-200 rounded">
                      <FaUser className="text-[#ee2e24] mr-3" />
                      <span className="text-gray-900">{profile.name || '—'}</span>
                    </div>
                  )}
                </div>
                
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="flex items-center px-4 py-3 bg-gray-50 border border-gray-200 rounded">
                    <FaEnvelope className="text-[#ee2e24] mr-3" />
                    <span className="text-gray-900">{profile.email || '—'}</span>
                  </div>
                </div>
                
                {/* Phone Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ee2e24]">
                        <FaPhone />
                      </span>
                      <input 
                        type="tel" 
                        name="phone"
                        value={editedProfile.phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24] focus:border-transparent"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center px-4 py-3 bg-gray-50 border border-gray-200 rounded">
                      <FaPhone className="text-[#ee2e24] mr-3" />
                      <span className="text-gray-900">{profile.phone || '—'}</span>
                    </div>
                  )}
                </div>
                
                {/* Address Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Address
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ee2e24]">
                        <FaMapMarkerAlt />
                      </span>
                      <input 
                        type="text" 
                        name="address"
                        value={editedProfile.address}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ee2e24] focus:border-transparent"
                        placeholder="Enter your address"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center px-4 py-3 bg-gray-50 border border-gray-200 rounded">
                      <FaMapMarkerAlt className="text-[#ee2e24] mr-3" />
                      <span className="text-gray-900">{profile.address || '—'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Security Settings Card */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-800 px-6 py-5">
              <h2 className="text-xl font-bold text-white">Security Settings</h2>
              <p className="text-gray-300 text-sm mt-1">Manage your account security</p>
            </div>
            
            <div className="px-6 py-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-gray-50 rounded border border-gray-200">
                <div className="mb-4 sm:mb-0">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Password</h3>
                  <p className="text-gray-600 text-sm">Update your password to keep your account secure</p>
                </div>
                <button 
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="px-6 py-2 rounded bg-[#ee2e24] text-white hover:bg-[#d62c22] transition-colors font-medium whitespace-nowrap"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isChangePasswordOpen} 
        onClose={() => setIsChangePasswordOpen(false)} 
      />
    </>
  );
}