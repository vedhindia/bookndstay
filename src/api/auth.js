const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3001/api/user/auth').replace(/\/+$/, '');

// Helper: handle JSON responses and errors
async function request(path, options = {}) {
  const { headers: optHeaders, ...rest } = options;
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(optHeaders || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: mergedHeaders,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson && data && data.message ? data.message : res.statusText;
    throw new Error(message || 'Request failed');
  }
  return data;
}

// Token helpers
export function getToken() {
  return localStorage.getItem('auth_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('auth_token', token);
  window.dispatchEvent(new Event('auth-changed'));
}

export function clearToken() {
  localStorage.removeItem('auth_token');
  window.dispatchEvent(new Event('auth-changed'));
}

export function getUser() {
  const raw = localStorage.getItem('auth_user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function setUser(user) {
  if (user) localStorage.setItem('auth_user', JSON.stringify(user));
  else localStorage.removeItem('auth_user');
  window.dispatchEvent(new Event('auth-changed'));
}

// API functions
export async function signup({ full_name, email, phone, password }) {
  return request('/signup', {
    method: 'POST',
    body: JSON.stringify({ full_name, email, phone, password }),
  });
}

export async function requestMobileLoginOtp({ phone }) {
  return request('/login-mobile/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyLoginOtp({ phone, otp }) {
  const res = await request('/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });
  if (res && res.token) setToken(res.token);
  if (res && res.user) setUser(res.user);
  return res;
}

export async function loginWithMobilePassword({ phone, password }) {
  const res = await request('/login-mobile', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  if (res && res.token) setToken(res.token);
  if (res && res.user) setUser(res.user);
  return res;
}

export async function forgotPassword({ email }) {
  return request('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function changePassword({ old_password, new_password, oldPassword, newPassword }) {
  const token = getToken();
  if (!token) {
    throw new Error('Please log in to change your password.');
  }
  return request('/change-password', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    // Support both snake_case and camelCase per updated API spec
    body: JSON.stringify({
      old_password: old_password ?? oldPassword,
      new_password: new_password ?? newPassword,
      oldPassword: oldPassword ?? old_password,
      newPassword: newPassword ?? new_password,
    }),
  });
}

export async function logout() {
  const token = getToken();
  if (!token) {
    // If there is no token, just clear local state and resolve
    clearToken();
    setUser(null);
    return { success: true };
  }
  const res = await request('/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  clearToken();
  setUser(null);
  return res;
}

export default {
  signup,
  requestMobileLoginOtp,
  verifyLoginOtp,
  loginWithMobilePassword,
  forgotPassword,
  changePassword,
  logout,
  async getProfile() {
    const token = getToken();
    // If no token, avoid calling protected endpoint; return cached user or error
    if (!token) {
      const cached = getUser();
      if (cached) return cached;
      throw new Error('You are not logged in. Please sign in to view your profile.');
    }
    try {
      const res = await request('/profile', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      // Be tolerant to different response shapes
      const user = res?.data?.user || res?.user || (
        typeof res === 'object' && res?.full_name ? res : null
      );
      if (user) setUser(user);
      return user;
    } catch (e) {
      // Fallback if backend selects a non-existent column (e.g., profile_photo)
      const msg = String(e?.message || '').toLowerCase();
      if (msg.includes('unknown column') || msg.includes('field list')) {
        return getUser();
      }
      throw e;
    }
  },
  async updateProfile({ full_name, phone, address, profile_photo }) {
    const token = getToken();
    if (!token) {
      throw new Error('You are not logged in. Please sign in before updating your profile.');
    }
    const form = new FormData();
    if (full_name != null) form.append('full_name', full_name);
    if (phone != null) form.append('phone', phone);
    if (address != null) form.append('address', address);
    if (profile_photo) form.append('profile_photo', profile_photo);

    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    const user = data?.data?.user || null;
    if (user) setUser(user);
    return user;
  },
  getToken,
  getUser,
  setToken,
  setUser,
  clearToken,
};