// Complete session management utility
export const SESSION_KEYS = {
  TOKEN: 'vendorToken',
  USER: 'vendorUser',
  ADMIN_TOKEN: 'adminToken',
  ADMIN_USER: 'adminUser',
};

// Normalize various backend user shapes to a common structure
export const normalizeUser = (raw = {}) => {
  const id = raw.id || raw._id || raw.user_id || raw.vendor_id || raw.vendorId || raw.uid || null;
  return { id, ...raw };
};

// Get current session
export const getSession = () => {
  try {
    const token = localStorage.getItem(SESSION_KEYS.TOKEN) || localStorage.getItem(SESSION_KEYS.ADMIN_TOKEN);
    const userStr = localStorage.getItem(SESSION_KEYS.USER) || localStorage.getItem(SESSION_KEYS.ADMIN_USER);
    
    if (!token || !userStr) return null;
    
    const user = normalizeUser(JSON.parse(userStr));
    return { token, user };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const session = getSession();
  return session !== null && !!session.token && !!session.user?.id;
};

// Save session
export const saveSession = (token, user) => {
  try {
    const normalized = normalizeUser(user);
    localStorage.setItem(SESSION_KEYS.TOKEN, token);
    localStorage.setItem(SESSION_KEYS.USER, JSON.stringify(normalized));
    return true;
  } catch (error) {
    console.error('Error saving session:', error);
    return false;
  }
};

// Clear session
export const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEYS.TOKEN);
    localStorage.removeItem(SESSION_KEYS.USER);
    localStorage.removeItem(SESSION_KEYS.ADMIN_TOKEN);
    localStorage.removeItem(SESSION_KEYS.ADMIN_USER);
    return true;
  } catch (error) {
    console.error('Error clearing session:', error);
    return false;
  }
};

// Get current user
export const getCurrentUser = () => {
  const session = getSession();
  return session?.user || null;
};

// Get auth token
export const getAuthToken = () => {
  const session = getSession();
  return session?.token || null;
};

// Logout function - handles all cleanup
export const logoutVendor = () => {
  try {
    clearSession();
    // Clear any API authorization headers
    if (typeof window !== 'undefined') {
      // Clear from memory if needed
      sessionStorage.clear();
    }
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
};

// Setup Axios interceptor with session management (safe)
export const setupAxiosInterceptor = (axiosInstance) => {
  // Request interceptor
  axiosInstance.interceptors.request.use(
    (config) => {
      // Skip auth for certain requests
      if (config.skipAuth || config.headers?.['X-Skip-Auth']) {
        if (config.headers && 'Authorization' in config.headers) delete config.headers['Authorization'];
        return config;
      }
      
      const token = getAuthToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle authentication errors
      // Skip redirect if this was an auth request (skipAuth is true)
      if ((error.response?.status === 401 || error.response?.status === 403) && !error.config?.skipAuth && !error.config?.headers?.['X-Skip-Auth']) {
        console.log('Authentication error - clearing session');
        clearSession();
        if (axiosInstance.defaults?.headers?.common) {
          delete axiosInstance.defaults.headers.common['Authorization'];
        }
        
        if (typeof window !== 'undefined') {
          const p = window.location.pathname || '';
          const base = p.startsWith('/admin') ? '/admin/' : p.startsWith('/vendor') ? '/vendor/' : '/';
          // Only redirect if we're not already at the base path
          if (p !== base && p !== base.slice(0, -1)) {
            window.location.href = base;
          }
        }
      }
      return Promise.reject(error);
    }
  );
};

// Validate session on app load
export const validateSession = async (axiosInstance) => {
  const session = getSession();
  
  if (!session) {
    return false;
  }
  
  try {
    // Optional: Ping a validation endpoint
    // const response = await axiosInstance.get('/auth/validate');
    // return response.status === 200;
    return true;
  } catch (error) {
    console.error('Session validation failed:', error);
    clearSession();
    return false;
  }
};
