import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import AddGuestForm from '../components/guests/AddGuestForm.jsx';
import GuestSection from '../components/guests/GuestSection.jsx';
import { useGuests } from '../hooks/useGuests.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { filterGuests, groupGuestsByStatus, inviteUrlFor, whatsappShareUrl } from '../utils/guests.js';

const SECTIONS = [
  { key: 'not_sent', title: 'Not sent yet', emptyText: "Every guest's invite has been sent." },
  { key: 'invited', title: 'Awaiting response', emptyText: 'No pending invites.' },
  { key: 'accepted', title: 'Attending', emptyText: 'No one has confirmed yet.' },
  { key: 'declined', title: 'Not attending', emptyText: 'No declines yet.' },
];

const SUMMARY_STATS = [
  { key: 'not_sent', label: 'Not sent yet', className: '' },
  { key: 'invited', label: 'Awaiting response', className: 'guest-summary-invited' },
  { key: 'accepted', label: 'Attending', className: 'guest-summary-accepted' },
  { key: 'declined', label: 'Not attending', className: 'guest-summary-declined' },
];

const COPIED_FEEDBACK_MS = 2000;

export default function EventGuests() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const { guests, loading, error, setError, reload } = useGuests(id);
  const [copiedId, setCopiedId] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [sendQueue, setSendQueue] = useState(null); // { ids: [...], index: 0 }

  usePageTitle(event ? `Guests — ${event.title}` : 'Guests');

  useEffect(() => {
    api.getEvent(id).then(setEvent).catch((err) => setError(err.message));
  }, [id, setError]);

  const grouped = useMemo(() => groupGuestsByStatus(guests), [guests]);
  const filtered = useMemo(
    () => Object.fromEntries(SECTIONS.map((s) => [s.key, filterGuests(grouped[s.key], search)])),
    [grouped, search]
  );

  function inviteMessage(guest) {
    const url = inviteUrlFor(window.location.origin, event, guest);
    return `Hi ${guest.name}! You're invited to ${event?.title || 'our event'}. Please RSVP here: ${url}`;
  }

  async function markSentIfNeeded(guest) {
    if (guest.status !== 'not_sent') return;
    try {
      await api.markGuestSent(id, guest._id);
      await reload();
    } catch (err) {
      // Non-critical — the link still works even if the status update failed.
      console.warn('Could not mark guest as sent', err);
    }
  }

  async function copyLink(guest) {
    const url = inviteUrlFor(window.location.origin, event, guest);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(guest._id);
      setTimeout(() => setCopiedId((prev) => (prev === guest._id ? null : prev)), COPIED_FEEDBACK_MS);
    } catch {
      window.prompt('Copy this link:', url);
    }
    await markSentIfNeeded(guest);
  }

  async function handleDeleteGuest(guest) {
    if (!window.confirm(`Remove ${guest.name} from the guest list?`)) return;
    setError('');
    try {
      await api.deleteGuest(id, guest._id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(guest._id);
        return next;
      });
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleSelected(guestId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
  }

  function toggleSelectAll(list) {
    setSelectedIds((prev) => {
      const allSelected = list.length > 0 && list.every((g) => prev.has(g._id));
      return allSelected ? new Set() : new Set(list.map((g) => g._id));
    });
  }

  async function openWhatsAppFor(guestId) {
    const guest = guests.find((g) => g._id === guestId);
    if (!guest) return;
    window.open(whatsappShareUrl(guest, inviteMessage(guest)), '_blank', 'noreferrer');
    await markSentIfNeeded(guest);
  }

  function startSendQueue() {
    const ids = guests.filter((g) => selectedIds.has(g._id) && g.status === 'not_sent').map((g) => g._id);
    if (ids.length === 0) return;
    setSendQueue({ ids, index: 0 });
    openWhatsAppFor(ids[0]);
  }

  function sendNextInQueue() {
    if (!sendQueue) return;
    const nextIndex = sendQueue.index + 1;
    if (nextIndex >= sendQueue.ids.length) {
      setSendQueue(null);
      setSelectedIds(new Set());
      return;
    }
    setSendQueue({ ...sendQueue, index: nextIndex });
    openWhatsAppFor(sendQueue.ids[nextIndex]);
  }

  if (loading) {
    return (
      <div className="container">
        <Spinner label="Loading guests…" />
      </div>
    );
  }

  const query = search.trim();

  return (
    <div className="container">
      <p>
        <Link to={`/events/${id}`}>← Back to event</Link>
      </p>
      <h1>{event ? `Guests — ${event.title}` : 'Guests'}</h1>

      <div className="guest-summary-row">
        {SUMMARY_STATS.map((stat) => (
          <div key={stat.key} className={`guest-summary-stat ${stat.className}`.trim()}>
            <span className="guest-summary-value">{grouped[stat.key].length}</span>
            <span className="guest-summary-label">{stat.label}</span>
          </div>
        ))}
        <div className="guest-summary-stat">
          <span className="guest-summary-value">{guests.length}</span>
          <span className="guest-summary-label">Total invited</span>
        </div>
      </div>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      <AddGuestForm eventId={id} onAdded={reload} onError={setError} />

      {sendQueue && (
        <div className="card rsvp-banner" role="status" style={{ marginTop: '1rem' }}>
          <span className="rsvp-banner-icon" aria-hidden="true">
            📤
          </span>
          <div>
            Opened WhatsApp for guest {sendQueue.index + 1} of {sendQueue.ids.length}. Send the message, then come
            back here for the next one.
          </div>
          <button className="btn rsvp-banner-dismiss" type="button" onClick={sendNextInQueue}>
            {sendQueue.index + 1 >= sendQueue.ids.length ? 'Done' : 'Next guest →'}
          </button>
        </div>
      )}

      {guests.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <div className="field" style={{ maxWidth: 360, marginBottom: 0 }}>
            <label htmlFor="guest-search">Find a guest</label>
            <input
              id="guest-search"
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn" type="button" disabled={selectedIds.size === 0 || !!sendQueue} onClick={startSendQueue}>
            Send via WhatsApp ({selectedIds.size} selected)
          </button>
        </div>
      )}

      {SECTIONS.map((section) => (
        <GuestSection
          key={section.key}
          section={section}
          guests={filtered[section.key]}
          totalCount={grouped[section.key].length}
          query={query}
          selectable={section.key === 'not_sent'}
          selectedIds={selectedIds}
          copiedId={copiedId}
          onToggleSelected={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
          onCopyLink={copyLink}
          onWhatsApp={openWhatsAppFor}
          onDelete={handleDeleteGuest}
        />
      ))}
    </div>
  );
}
