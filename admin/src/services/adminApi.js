import api from './apiClient';
import { AUTH_ENDPOINTS } from '../config';

// Helper to build query strings safely
const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

// ADMIN AUTHENTICATION
export const adminAuth = {
  /**
   * Admin login
   * @param {Object} credentials - { email, password }
   * @returns {Promise} API response with token and admin data
   */
  login: async (credentials) => {
    const res = await api.post(AUTH_ENDPOINTS.LOGIN, credentials, {
      skipAuth: true,
      headers: { 'X-Skip-Auth': 'true' }
    });
    return res.data;
  },

  /**
   * Admin registration (requires super admin token)
   * @param {Object} adminData - { name, email, password, phone, department }
   * @returns {Promise} API response with admin data
   */
  register: async (adminData) => {
    const res = await api.post(AUTH_ENDPOINTS.REGISTER, adminData);
    return res.data;
  },

  /**
   * Admin logout - invalidates current session
   * @returns {Promise} API response
   */
  logout: async () => {
    const res = await api.post(AUTH_ENDPOINTS.LOGOUT);
    return res.data;
  },

  /**
   * Change admin password
   * @param {Object} passwordData - { old_password, new_password }
   * @returns {Promise} API response
   */
  changePassword: async (passwordData) => {
    const res = await api.post(AUTH_ENDPOINTS.CHANGE_PASSWORD, passwordData);
    return res.data;
  },

  /**
   * Update admin profile
   * @param {Object} profileData - { full_name, email, phone }
   * @returns {Promise} API response
   */
  updateProfile: async (profileData) => {
    const res = await api.put('/admin/auth/update-profile', profileData);
    return res.data;
  },

  /**
   * Forgot password - send reset link to email
   * @param {Object} emailData - { email }
   * @returns {Promise} API response
   */
  forgotPassword: async (emailData) => {
    const res = await api.post(AUTH_ENDPOINTS.FORGOT, emailData, {
      skipAuth: true,
      headers: { 'X-Skip-Auth': 'true' }
    });
    return res.data;
  },

  /**
   * Reset password with token
   * @param {Object} resetData - { token, new_password }
   * @returns {Promise} API response
   */
  resetPassword: async (resetData) => {
    const res = await api.post(AUTH_ENDPOINTS.RESET_PASSWORD, resetData, {
      skipAuth: true,
      headers: { 'X-Skip-Auth': 'true' }
    });
    return res.data;
  },
};

// VENDORS
export const adminVendors = {
  list: async (params = {}) => {
    const url = `/admin/vendors${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
  create: async (payload) => {
    const res = await api.post('/admin/vendors', payload);
    return res.data;
  },
  update: async (vendorId, payload) => {
    const res = await api.put(`/admin/vendors/${vendorId}`, payload);
    return res.data;
  },
  remove: async (vendorId) => {
    const res = await api.delete(`/admin/vendors/${vendorId}`);
    return res.data;
  },
  activate: async (vendorId) => {
    const res = await api.post(`/admin/vendors/${vendorId}/activate`);
    return res.data;
  },
  deactivate: async (vendorId) => {
    const res = await api.post(`/admin/vendors/${vendorId}/deactivate`);
    return res.data;
  },
  getHotels: async (vendorId, params = {}) => {
    const url = `/admin/vendors/${vendorId}/hotels${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
};

// HOTELS
export const adminHotels = {
  list: async (params = {}) => {
    const url = `/admin/hotels${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
  getById: async (hotelId) => {
    const res = await api.get(`/admin/hotels/${hotelId}`);
    return res.data;
  },
  update: async (hotelId, payload) => {
    const res = await api.put(`/admin/hotels/${hotelId}`, payload);
    return res.data;
  },
  remove: async (hotelId) => {
    const res = await api.delete(`/admin/hotels/${hotelId}`);
    return res.data;
  },
  approve: async (hotelId, payload = {}) => {
    const res = await api.post(`/admin/hotels/${hotelId}/approve`, payload);
    return res.data;
  },
  reject: async (hotelId, payload = {}) => {
    const res = await api.post(`/admin/hotels/${hotelId}/reject`, payload);
    return res.data;
  },
  updateStatus: async (hotelId, status) => {
    const res = await api.patch(`/admin/hotels/${hotelId}/status`, { status });
    return res.data;
  },
  publicList: async (params = {}) => {
    const url = `/vendor/public/hotels${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
};

// VENDOR HOTELS
export const vendorHotels = {
  list: async (vendorId, params = {}) => {
    const url = `/vendor/${vendorId}/hotels${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
};

// ROOMS
export const adminRooms = {
  list: async (params = {}) => {
    const url = `/admin/rooms${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
  getById: async (roomId) => {
    const res = await api.get(`/admin/rooms/${roomId}`);
    return res.data;
  },
  update: async (roomId, payload) => {
    const res = await api.put(`/admin/rooms/${roomId}`, payload);
    return res.data;
  },
  remove: async (roomId) => {
    const res = await api.delete(`/admin/rooms/${roomId}`);
    return res.data;
  },
};

// BOOKINGS
export const adminBookings = {
  list: async (params = {}) => {
    const url = `/admin/bookings${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
  getById: async (bookingId) => {
    const res = await api.get(`/admin/bookings/${bookingId}`);
    return res.data;
  },
  update: async (bookingId, payload) => {
    const res = await api.put(`/admin/bookings/${bookingId}`, payload);
    return res.data;
  },
  cancel: async (bookingId, payload = {}) => {
    const res = await api.post(`/admin/bookings/${bookingId}/cancel`, payload);
    return res.data;
  },
};

// COUPONS
export const adminCoupons = {
  list: async (params = {}) => {
    const url = `/coupons${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
  create: async (payload) => {
    const res = await api.post('/coupons', payload);
    return res.data;
  },
  update: async (couponId, payload) => {
    const res = await api.put(`/coupons/${couponId}`, payload);
    return res.data;
  },
  remove: async (couponId) => {
    const res = await api.delete(`/coupons/${couponId}`);
    return res.data;
  },
  apply: async (code) => {
    const res = await api.post('/coupons/apply', { code });
    return res.data;
  },
};

// REVIEWS
export const adminReviews = {
  list: async (params = {}) => {
    const url = `/admin/reviews${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
  moderate: async (reviewId, payload) => {
    const res = await api.put(`/admin/reviews/${reviewId}/moderate`, payload);
    return res.data;
  },
  remove: async (reviewId) => {
    const res = await api.delete(`/admin/reviews/${reviewId}`);
    return res.data;
  },
};

// PAYMENTS
export const adminPayments = {
  list: async (params = {}) => {
    const url = `/admin/payments${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
  getById: async (paymentId) => {
    const res = await api.get(`/admin/payments/${paymentId}`);
    return res.data;
  },
};

// DASHBOARD
export const adminDashboard = {
  stats: async () => {
    const res = await api.get('/admin/dashboard/stats');
    return res.data;
  },
};

// USERS
export const adminUsers = {
  list: async (params = {}) => {
    const url = `/admin/users${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
  getById: async (userId) => {
    const res = await api.get(`/admin/users/${userId}`);
    return res.data;
  },
  update: async (userId, payload) => {
    const res = await api.put(`/admin/users/${userId}`, payload);
    return res.data;
  },
  delete: async (userId) => {
    const res = await api.delete(`/admin/users/${userId}`);
    return res.data;
  },
  getBookings: async (userId, params = {}) => {
    const url = `/admin/users/${userId}/bookings${buildQuery(params)}`;
    const res = await api.get(url);
    return res.data;
  },
};

export default {
  vendors: adminVendors,
  hotels: adminHotels,
  vendorHotels: vendorHotels,
  rooms: adminRooms,
  bookings: adminBookings,
  coupons: adminCoupons,
  reviews: adminReviews,
  payments: adminPayments,
  dashboard: adminDashboard,
  users: adminUsers,
};
