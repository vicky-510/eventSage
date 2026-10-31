import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Signup from './Signup.jsx';
import { AuthContext } from '../auth/useAuth.js';

function renderSignup(signup) {
  return render(
    <AuthContext.Provider value={{ user: null, loading: false, signup }}>
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

function fillAndSubmit(email, password) {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
}

describe('Signup page', () => {
  it('labels its fields and links the password rules to the password input', () => {
    renderSignup(vi.fn());
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    const password = screen.getByLabelText(/password/i);
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAccessibleDescription(/at least 10 characters/i);
  });

  it('signs up with the entered credentials and goes to the dashboard', async () => {
    const signup = vi.fn().mockResolvedValue();
    renderSignup(signup);

    fillAndSubmit('new@example.com', 'SuperSecret1');

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(signup).toHaveBeenCalledWith('new@example.com', 'SuperSecret1');
  });

  it('announces server validation errors and stays on the page', async () => {
    const signup = vi.fn().mockRejectedValue(new Error('Password must be at least 10 characters'));
    renderSignup(signup);

    fillAndSubmit('new@example.com', 'short');

    expect(await screen.findByRole('alert')).toHaveTextContent('Password must be at least 10 characters');
    await waitFor(() => expect(screen.getByRole('button', { name: /sign up/i })).toBeEnabled());
  });
});
