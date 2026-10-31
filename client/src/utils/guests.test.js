import { describe, it, expect } from 'vitest';
import { filterGuests, groupGuestsByStatus, inviteUrlFor, parseBulkGuests, whatsappShareUrl } from './guests.js';

const guests = [
  { _id: '1', name: 'Priya Sharma', email: 'priya@example.com', status: 'not_sent' },
  { _id: '2', name: 'Rahul Verma', email: '', status: 'invited' },
  { _id: '3', name: 'Anita Rao', email: 'anita@example.com', status: 'accepted' },
  { _id: '4', name: 'Vikram Shah', status: 'declined' },
  { _id: '5', name: 'Meera Iyer', status: 'accepted' },
];

describe('groupGuestsByStatus', () => {
  it('buckets guests by status', () => {
    const grouped = groupGuestsByStatus(guests);
    expect(grouped.not_sent.map((g) => g._id)).toEqual(['1']);
    expect(grouped.invited.map((g) => g._id)).toEqual(['2']);
    expect(grouped.accepted.map((g) => g._id)).toEqual(['3', '5']);
    expect(grouped.declined.map((g) => g._id)).toEqual(['4']);
  });

  it('always returns every status key, even with no guests', () => {
    expect(groupGuestsByStatus([])).toEqual({ not_sent: [], invited: [], accepted: [], declined: [] });
  });

  it('ignores guests with an unknown status instead of crashing', () => {
    const grouped = groupGuestsByStatus([{ _id: 'x', name: 'X', status: 'mystery' }]);
    expect(Object.values(grouped).flat()).toHaveLength(0);
  });
});

describe('filterGuests', () => {
  it('returns everyone for an empty or whitespace query', () => {
    expect(filterGuests(guests, '')).toBe(guests);
    expect(filterGuests(guests, '   ')).toBe(guests);
  });

  it('matches name case-insensitively', () => {
    expect(filterGuests(guests, 'PRIYA').map((g) => g._id)).toEqual(['1']);
  });

  it('matches on email and tolerates guests without one', () => {
    expect(filterGuests(guests, 'anita@').map((g) => g._id)).toEqual(['3']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterGuests(guests, 'zzz')).toEqual([]);
  });
});

describe('parseBulkGuests', () => {
  it('parses "Name, phone" lines and skips blank lines', () => {
    expect(parseBulkGuests('Priya, +91 98765\n\n  Rahul  \n')).toEqual([
      { name: 'Priya', phone: '+91 98765' },
      { name: 'Rahul', phone: '' },
    ]);
  });

  it('returns an empty list for empty input', () => {
    expect(parseBulkGuests('  \n ')).toEqual([]);
  });
});

describe('invite links', () => {
  const event = { publicId: 'abc123', title: 'Party' };

  it('builds a personal RSVP URL from the invite token', () => {
    expect(inviteUrlFor('https://eventsage.app', event, { inviteToken: 'tok' })).toBe(
      'https://eventsage.app/e/abc123?g=tok'
    );
  });

  it('returns null without an event or token', () => {
    expect(inviteUrlFor('https://x', null, { inviteToken: 'tok' })).toBeNull();
    expect(inviteUrlFor('https://x', event, {})).toBeNull();
  });

  it('targets the guest phone number on WhatsApp, stripping formatting', () => {
    const url = whatsappShareUrl({ phone: '+91 98765-43210' }, 'Hi & welcome');
    expect(url).toBe('https://wa.me/919876543210?text=Hi%20%26%20welcome');
  });

  it('falls back to the generic WhatsApp share link without a phone', () => {
    expect(whatsappShareUrl({}, 'Hi')).toBe('https://wa.me/?text=Hi');
  });
});
