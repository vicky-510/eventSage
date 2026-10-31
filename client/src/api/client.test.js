import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, getAccessToken, setAccessToken } from './client.js';

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function mockFetch(handler) {
  const fetchMock = vi.fn((url, options) => handler(String(url), options));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const refreshCalls = (fetchMock) => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'));

describe('apiRequest', () => {
  beforeEach(() => setAccessToken('expired-token'));
  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it('sends the bearer token and credentials, and returns the parsed body', async () => {
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse(200, { ok: true })));
    setAccessToken('good-token');

    await expect(apiRequest('/events')).resolves.toEqual({ ok: true });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer good-token');
    expect(options.credentials).toBe('include');
  });

  it('surfaces the server error message and status on failure', async () => {
    mockFetch(() => Promise.resolve(jsonResponse(404, { error: 'Event not found' })));

    await expect(apiRequest('/events/missing')).rejects.toMatchObject({ message: 'Event not found', status: 404 });
  });

  it('shares a single refresh call across concurrent 401s, then retries each request', async () => {
    const fetchMock = mockFetch((url, options) => {
      if (url.endsWith('/auth/refresh')) {
        return new Promise((resolve) => setTimeout(() => resolve(jsonResponse(200, { accessToken: 'fresh-token' })), 5));
      }
      const authorized = options.headers.Authorization === 'Bearer fresh-token';
      return Promise.resolve(authorized ? jsonResponse(200, { url }) : jsonResponse(401, { error: 'Expired' }));
    });

    const [a, b] = await Promise.all([apiRequest('/events'), apiRequest('/events/1/guests')]);

    expect(a.url).toMatch(/\/events$/);
    expect(b.url).toMatch(/\/events\/1\/guests$/);
    expect(refreshCalls(fetchMock)).toHaveLength(1);
    expect(getAccessToken()).toBe('fresh-token');
  });

  it('clears the token and rethrows the original 401 when refresh fails', async () => {
    const fetchMock = mockFetch((url) =>
      Promise.resolve(url.endsWith('/auth/refresh') ? jsonResponse(401, { error: 'Revoked' }) : jsonResponse(401, { error: 'Expired' }))
    );

    await expect(apiRequest('/events')).rejects.toMatchObject({ message: 'Expired', status: 401 });
    expect(refreshCalls(fetchMock)).toHaveLength(1);
    expect(getAccessToken()).toBeNull();
  });
});
