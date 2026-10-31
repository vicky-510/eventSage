import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicRsvp from './PublicRsvp.jsx';
import { api } from '../api/client.js';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../api/client.js', () => ({
  api: { getPublicEvent: vi.fn(), submitRsvp: vi.fn() },
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/e/:publicId" element={<PublicRsvp />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PublicRsvp page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
  });

  it('shows the invitation, prefilling the name from a personal invite link', async () => {
    api.getPublicEvent.mockResolvedValue({ title: 'Asha’s 30th', location: 'Bengaluru', invite: { name: 'Priya' } });
    renderAt('/e/pub123?g=tok456');

    expect(await screen.findByRole('heading', { name: /you're invited: asha’s 30th/i })).toBeInTheDocument();
    expect(api.getPublicEvent).toHaveBeenCalledWith('pub123', 'tok456');
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Priya');
    expect(document.title).toMatch(/Asha’s 30th · EventSage/);
  });

  it('submits the RSVP and confirms it', async () => {
    api.getPublicEvent.mockResolvedValue({ title: 'Picnic' });
    api.submitRsvp.mockResolvedValue({});
    renderAt('/e/pub123');

    fireEvent.change(await screen.findByLabelText(/your name/i), { target: { value: 'Rahul' } });
    fireEvent.change(screen.getByLabelText(/will you attend/i), { target: { value: 'no' } });
    fireEvent.change(screen.getByLabelText(/dietary notes/i), { target: { value: 'Vegan' } });
    fireEvent.click(screen.getByRole('button', { name: /submit rsvp/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/thanks for your rsvp/i);
    expect(api.submitRsvp).toHaveBeenCalledWith('pub123', {
      name: 'Rahul',
      attending: false,
      dietaryNotes: 'Vegan',
      inviteToken: undefined,
    });
  });

  it('announces an error when the event cannot be found', async () => {
    api.getPublicEvent.mockRejectedValue(new Error('Event not found'));
    renderAt('/e/missing');

    expect(await screen.findByRole('alert')).toHaveTextContent('Event not found');
  });
});
