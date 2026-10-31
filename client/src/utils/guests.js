export const GUEST_STATUSES = ['not_sent', 'invited', 'accepted', 'declined'];

/** Buckets guests by RSVP status, always returning every status key. */
export function groupGuestsByStatus(guests) {
  const grouped = Object.fromEntries(GUEST_STATUSES.map((s) => [s, []]));
  for (const guest of guests) {
    if (grouped[guest.status]) grouped[guest.status].push(guest);
  }
  return grouped;
}

/** Case-insensitive match on name or email; an empty query matches everyone. */
export function filterGuests(guests, query) {
  const q = query.trim().toLowerCase();
  if (!q) return guests;
  return guests.filter((g) => g.name.toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q));
}

/** Parses "Name, phone" lines from the bulk-add textarea, skipping blank lines. */
export function parseBulkGuests(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, phone] = line.split(',').map((s) => s.trim());
      return { name, phone: phone || '' };
    });
}

export function inviteUrlFor(origin, event, guest) {
  if (!event || !guest.inviteToken) return null;
  return `${origin}/e/${event.publicId}?g=${guest.inviteToken}`;
}

export function whatsappShareUrl(guest, message) {
  const digits = (guest.phone || '').replace(/[^\d]/g, '');
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}
