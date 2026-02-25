// API Configuration
const RAW_BASE = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = RAW_BASE
  ? (() => {
      const trimmed = RAW_BASE.replace(/\/$/, '');
      return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    })()
  : '/api';

// Role-specific auth endpoints
export const ADMIN_AUTH = {
  LOGIN: '/admin/auth/login',
  REGISTER: '/admin/auth/register',
  FORGOT: '/admin/auth/forgot',
  RESET_PASSWORD: '/admin/auth/reset-password',
  CHANGE_PASSWORD: '/admin/auth/change-password'
};

export const USER_AUTH = {
  REGISTER: '/user/auth/register',
  LOGIN: '/user/auth/login',
  FORGOT_PASSWORD: '/user/auth/forgot-password',
  RESET_PASSWORD: '/user/auth/reset-password',
  CHANGE_PASSWORD: '/user/auth/change-password'
};

export const VENDOR_AUTH = {
  // per docs: vendor auth
  LOGIN: '/vendor/auth/login',
  FORGOT_PASSWORD: '/vendor/auth/forgot-password',
  RESET_PASSWORD: '/vendor/auth/reset-password',
  CHANGE_PASSWORD: '/vendor/auth/change-password'
};

// Default auth endpoints used in current UI (switching to vendor panel)
export const AUTH_ENDPOINTS = {
  LOGIN: VENDOR_AUTH.LOGIN,
  FORGOT: VENDOR_AUTH.FORGOT_PASSWORD,
  RESET_PASSWORD: VENDOR_AUTH.RESET_PASSWORD,
  CHANGE_PASSWORD: VENDOR_AUTH.CHANGE_PASSWORD,
};
