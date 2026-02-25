import axios from 'axios';
import { API_BASE_URL } from '../config';

// Shared Axios instance for all API calls
const api = axios.create({
  baseURL: API_BASE_URL, // In dev: '/api' via Vite proxy
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
      const token = localStorage.getItem('adminToken');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401, clear auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      try {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      } catch {}
      // Let the app route guard handle redirect; fallback hard redirect
      if (typeof window !== 'undefined') {
        const p = window.location.pathname || '';
        const base = p.startsWith('/admin') ? '/admin' : p.startsWith('/vendor') ? '/vendor' : '/';
        window.location.href = base;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
