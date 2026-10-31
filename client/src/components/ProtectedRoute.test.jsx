import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { AuthContext } from '../auth/useAuth.js';

function renderAt(authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <p>Secret dashboard</p>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when logged out', () => {
    renderAt({ user: null, loading: false });
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument();
  });

  it('renders the page for a logged-in user', () => {
    renderAt({ user: { id: '1' }, loading: false });
    expect(screen.getByText('Secret dashboard')).toBeInTheDocument();
  });

  it('shows an accessible loading state while the session is being restored', () => {
    renderAt({ user: null, loading: true });
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});
