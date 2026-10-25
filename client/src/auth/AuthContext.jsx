import { createContext, useContext, useEffect, useState } from 'react';
import { api, setAccessToken } from '../api/client.js';

const AuthContext = createContext(null);

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

  async function signup(email, password) {
    const res = await api.signup(email, password);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }

  async function login(email, password) {
    const res = await api.login(email, password);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }

  async function logout() {
    await api.logout().catch(() => {});
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
