import api from './apiClient';

/**
 * User Service - API functions for admin user management
 */
export const userService = {
  /**
   * Create a new user
   * @param {Object} userData - User data to create
   * @returns {Promise} API response
   */
  createUser: async (userData) => {
    try {
      const response = await api.post('/admin/users', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get all users (simple list)
   * @returns {Promise} API response with users array
   */
  getAllUsers: async () => {
    try {
      const response = await api.get('/admin/users');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get paginated users with filters
   * @param {Object} params - Query parameters (page, limit, search, status, etc.)
   * @returns {Promise} API response with paginated users
   */
  getPaginatedUsers: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();

      // Pagination
      if (params.page != null) queryParams.append('page', params.page);
      if (params.limit != null) queryParams.append('limit', params.limit);

      // Search variants
      if (params.search) queryParams.append('search', params.search);
      if (params.q) queryParams.append('q', params.q);
      if (params.keyword) queryParams.append('keyword', params.keyword);

      // Status variants
      if (params.status) {
        queryParams.append('status', params.status);
        // Also try uppercase variant in case backend expects it
        queryParams.append('STATUS', String(params.status).toUpperCase());
      }
      if (params.isBlocked != null) queryParams.append('isBlocked', params.isBlocked);
      if (params.isActive != null) queryParams.append('isActive', params.isActive);

      // Other filters/sorting
      if (params.role) queryParams.append('role', params.role);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const qs = queryParams.toString();
      const url = qs ? `/admin/users/paginated?${qs}` : '/admin/users/paginated';

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get user details by ID
   * @param {string} userId - User ID
   * @returns {Promise} API response with user details
   */
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update user information
   * @param {string} userId - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise} API response
   */
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update user status (active/verified)
   * @param {string} userId - User ID
   * @param {Object} statusData - Status update data
   * @returns {Promise} API response
   */
  updateUserStatus: async (userId, statusData) => {
    try {
      const response = await api.patch(`/admin/users/${userId}/status`, statusData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Delete user
   * @param {string} userId - User ID
   * @returns {Promise} API response
   */
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Block user
   * @param {string} userId - User ID
   * @param {Object} blockData - Block reason and other data
   * @returns {Promise} API response
   */
  blockUser: async (userId, blockData = {}) => {
    try {
      const response = await api.post(`/admin/users/${userId}/block`, blockData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Unblock user
   * @param {string} userId - User ID
   * @returns {Promise} API response
   */
  unblockUser: async (userId) => {
    try {
      const response = await api.post(`/admin/users/${userId}/unblock`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get user bookings
   * @param {string} userId - User ID
   * @param {Object} params - Query parameters (page, limit, status, etc.)
   * @returns {Promise} API response with user bookings
   */
  getUserBookings: async (userId, params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add pagination parameters
      if (params.page != null) queryParams.append('page', params.page);
      if (params.limit != null) queryParams.append('limit', params.limit);
      
      // Add filter parameters
      if (params.status) queryParams.append('status', params.status);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const queryString = queryParams.toString();
      const url = queryString 
        ? `/admin/users/${userId}/bookings?${queryString}`
        : `/admin/users/${userId}/bookings`;

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default userService;
