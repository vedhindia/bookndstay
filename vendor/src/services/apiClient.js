import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getAuthToken, clearSession } from '../utils/auth';

// Shared Axios instance for all API calls
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach token unless explicitly skipped
api.interceptors.request.use(
  (config) => {
    const skip = config.skipAuth === true || config.headers?.['X-Skip-Auth'] === 'true';
    if (!skip) {
      const token = getAuthToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else if (config.headers && 'Authorization' in config.headers) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401/403, clear auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      try {
        clearSession();
      } catch {}
      // Let the app route guard handle redirect; fallback hard redirect
      if (typeof window !== 'undefined') {
        const p = window.location.pathname || '';
        const base = p.startsWith('/vendor') ? '/vendor' : p.startsWith('/admin') ? '/admin' : '/';
        if (p !== base) {
          window.location.href = base;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
