import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login.jsx';
import { AuthProvider } from '../auth/AuthContext.jsx';

function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
}

describe('Login page', () => {
  it('renders email and password fields with accessible labels', () => {
    renderWithProviders(<Login />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders a submit button reachable by role', () => {
    renderWithProviders(<Login />);
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });
});
