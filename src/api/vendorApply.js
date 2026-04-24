const API_BASE = (import.meta.env.VITE_PUBLIC_API_BASE || '/api/public').replace(/\/+$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson && data && data.message ? data.message : res.statusText;
    throw new Error(message || 'Request failed');
  }
  return data;
}

export async function submitVendorApplication(formData) {
  return request('/vendor/apply', {
    method: 'POST',
    body: formData,
  });
}

