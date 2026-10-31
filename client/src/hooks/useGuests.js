import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export const GUEST_POLL_INTERVAL_MS = 15000;

/**
 * Loads an event's guest list and keeps it fresh by polling, pausing while the
 * tab is hidden so a backgrounded page doesn't keep hitting the API.
 */
export function useGuests(eventId) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(
    () =>
      api
        .getGuests(eventId)
        .then(setGuests)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    [eventId]
  );

  useEffect(() => {
    reload();
    const interval = setInterval(() => {
      if (!document.hidden) reload();
    }, GUEST_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [reload]);

  return { guests, loading, error, setError, reload };
}
