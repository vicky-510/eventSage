import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGuests, GUEST_POLL_INTERVAL_MS } from './useGuests.js';
import { api } from '../api/client.js';

vi.mock('../api/client.js', () => ({ api: { getGuests: vi.fn() } }));

function setHidden(hidden) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
}

describe('useGuests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setHidden(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    setHidden(false);
  });

  it('loads the guest list for the event', async () => {
    api.getGuests.mockResolvedValue([{ _id: '1', name: 'Priya' }]);
    const { result } = renderHook(() => useGuests('evt1'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.guests).toEqual([{ _id: '1', name: 'Priya' }]);
    expect(api.getGuests).toHaveBeenCalledWith('evt1');
  });

  it('exposes the error message when loading fails', async () => {
    api.getGuests.mockRejectedValue(new Error('Event not found'));
    const { result } = renderHook(() => useGuests('evt1'));

    await waitFor(() => expect(result.current.error).toBe('Event not found'));
    expect(result.current.loading).toBe(false);
  });

  it('polls while visible and pauses while the tab is hidden', async () => {
    vi.useFakeTimers();
    api.getGuests.mockResolvedValue([]);
    renderHook(() => useGuests('evt1'));
    expect(api.getGuests).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(GUEST_POLL_INTERVAL_MS));
    expect(api.getGuests).toHaveBeenCalledTimes(2);

    setHidden(true);
    await act(() => vi.advanceTimersByTimeAsync(GUEST_POLL_INTERVAL_MS * 3));
    expect(api.getGuests).toHaveBeenCalledTimes(2);
  });

  it('stops polling after unmount', async () => {
    vi.useFakeTimers();
    api.getGuests.mockResolvedValue([]);
    const { unmount } = renderHook(() => useGuests('evt1'));
    unmount();

    await act(() => vi.advanceTimersByTimeAsync(GUEST_POLL_INTERVAL_MS * 2));
    expect(api.getGuests).toHaveBeenCalledTimes(1);
  });
});
