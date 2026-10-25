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

// Concurrent requests that all hit a 401 at once (e.g. several widgets
// fetching on page load right as the access token expires) must share a
// single refresh call. The refresh token rotates server-side on every use,
// so firing one refresh per request would make all but the first fail with
// "token revoked" and log the user out.
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = rawRequest('/auth/refresh', { method: 'POST' })
      .then((refreshed) => {
        setAccessToken(refreshed.accessToken);
        return refreshed;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  try {
    return await rawRequest(path, options);
  } catch (err) {
    if (err.status === 401 && path !== '/auth/refresh') {
      try {
        await refreshAccessToken();
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
  intakeChat: (messages) => apiRequest('/events/intake-chat', { method: 'POST', body: JSON.stringify({ messages }) }),
  chatWithEvent: (id, message) =>
    apiRequest(`/events/${id}/chat`, { method: 'POST', body: JSON.stringify({ message }) }),

  getGuests: (id) => apiRequest(`/events/${id}/guests`),
  createGuestLink: (id, name, phone) =>
    apiRequest(`/events/${id}/guests/link`, { method: 'POST', body: JSON.stringify({ name, phone }) }),
  createGuestLinksBulk: (id, guests) =>
    apiRequest(`/events/${id}/guests/bulk`, { method: 'POST', body: JSON.stringify({ guests }) }),
  deleteGuest: (id, guestId) => apiRequest(`/events/${id}/guests/${guestId}`, { method: 'DELETE' }),
  markGuestSent: (id, guestId) => apiRequest(`/events/${id}/guests/${guestId}/mark-sent`, { method: 'POST' }),

  getPublicEvent: (publicId, inviteToken) =>
    apiRequest(`/public/events/${publicId}${inviteToken ? `?g=${encodeURIComponent(inviteToken)}` : ''}`),
  submitRsvp: (publicId, payload) =>
    apiRequest(`/public/events/${publicId}/rsvp`, { method: 'POST', body: JSON.stringify(payload) }),
};
