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

// Allow dynamic override of forgot endpoint via env (defensively strip '/api' or domain)
const resolveForgotOverride = () => {
  const raw = import.meta.env.VITE_VENDOR_FORGOT_ENDPOINT && String(import.meta.env.VITE_VENDOR_FORGOT_ENDPOINT).trim();
  if (!raw) return null;
  // Keep only path (drop protocol+domain if given)
  let path = raw.replace(/^https?:\/\/[^/]+/i, '');
  // Remove leading '/api' if provided by mistake (baseURL already includes '/api')
  path = path.replace(/^\/api(\/|$)/i, '/');
  // Ensure leading slash
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
};
const FORGOT_OVERRIDE = resolveForgotOverride();
export const VENDOR_FORGOT_ENDPOINT = FORGOT_OVERRIDE || VENDOR_AUTH.FORGOT_PASSWORD;

// Default auth endpoints used in current UI (switching to vendor panel)
export const AUTH_ENDPOINTS = {
  LOGIN: VENDOR_AUTH.LOGIN,
  FORGOT: VENDOR_FORGOT_ENDPOINT,
  RESET_PASSWORD: VENDOR_AUTH.RESET_PASSWORD,
  CHANGE_PASSWORD: VENDOR_AUTH.CHANGE_PASSWORD,
};
