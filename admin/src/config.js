// API Configuration
const RAW_BASE = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = RAW_BASE
  ? (() => {
      const trimmed = RAW_BASE.replace(/\/$/, '');
      return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    })()
  : '/api';
 
// Backward-compatible admin auth endpoints used in current UI
export const AUTH_ENDPOINTS = {
  LOGIN: '/admin/auth/login',
  REGISTER: '/admin/auth/register',
  LOGOUT: '/admin/auth/logout',
  FORGOT: '/admin/auth/forgot', // per docs: admin uses '/forgot'
  RESET_PASSWORD: '/admin/auth/reset-password',
  CHANGE_PASSWORD: '/admin/auth/change-password'
};
 
// Optional: grouped role-specific auth endpoints (for future integration)
export const ADMIN_AUTH = { ...AUTH_ENDPOINTS };
export const USER_AUTH = {
  REGISTER: '/user/auth/register',
  LOGIN: '/user/auth/login',
  FORGOT_PASSWORD: '/user/auth/forgot-password',
  RESET_PASSWORD: '/user/auth/reset-password',
  CHANGE_PASSWORD: '/user/auth/change-password'
};
export const VENDOR_AUTH = {
  REGISTER: '/vendor/auth/register',
  LOGIN: '/vendor/auth/login',
  FORGOT_PASSWORD: '/vendor/auth/forgot-password',
  RESET_PASSWORD: '/vendor/auth/reset-password',
  CHANGE_PASSWORD: '/vendor/auth/change-password'
};
