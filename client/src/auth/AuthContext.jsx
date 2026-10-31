import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, setAccessToken } from '../api/client.js';
import { AuthContext } from './useAuth.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt a silent refresh on load so a page reload keeps the session alive
    // via the httpOnly refresh cookie, without ever touching localStorage.
    api
      .refresh()
      .then((res) => {
        setAccessToken(res.accessToken);
        setUser({ restored: true });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const signup = useCallback(async (email, password) => {
    const res = await api.signup(email, password);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signup, login, logout }), [user, loading, signup, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
