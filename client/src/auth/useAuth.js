import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/** Current auth state plus signup/login/logout actions from the nearest AuthProvider. */
export function useAuth() {
  return useContext(AuthContext);
}
