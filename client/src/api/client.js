const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function rawRequest(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return body;
}

export async function apiRequest(path, options = {}) {
  try {
    return await rawRequest(path, options);
  } catch (err) {
    if (err.status === 401 && path !== '/auth/refresh') {
      try {
        const refreshed = await rawRequest('/auth/refresh', { method: 'POST' });
        setAccessToken(refreshed.accessToken);
        return await rawRequest(path, options);
      } catch {
        setAccessToken(null);
        throw err;
      }
    }
    throw err;
  }
}

export const api = {
  signup: (email, password) =>
    apiRequest('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  refresh: () => apiRequest('/auth/refresh', { method: 'POST' }),

  listEvents: () => apiRequest('/events'),
  createEvent: (payload) => apiRequest('/events', { method: 'POST', body: JSON.stringify(payload) }),
  getEvent: (id) => apiRequest(`/events/${id}`),
  updateEvent: (id, payload) => apiRequest(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteEvent: (id) => apiRequest(`/events/${id}`, { method: 'DELETE' }),
  generatePlan: (id) => apiRequest(`/events/${id}/generate-plan`, { method: 'POST' }),
  replan: (id, changeDescription) =>
    apiRequest(`/events/${id}/replan`, { method: 'POST', body: JSON.stringify({ changeDescription }) }),

  getPublicEvent: (publicId) => apiRequest(`/public/events/${publicId}`),
  submitRsvp: (publicId, payload) =>
    apiRequest(`/public/events/${publicId}/rsvp`, { method: 'POST', body: JSON.stringify(payload) }),
};
