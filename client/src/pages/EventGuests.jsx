import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

const SECTIONS = [
  { key: 'accepted', title: 'Attending', emptyText: 'No one has confirmed yet.' },
  { key: 'declined', title: "Not attending", emptyText: 'No declines yet.' },
  { key: 'invited', title: 'Awaiting response', emptyText: 'Everyone has responded.' },
];

export default function EventGuests() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkGuestName, setLinkGuestName] = useState('');
  const [linkGuestPhone, setLinkGuestPhone] = useState('');
  const [bulkEntries, setBulkEntries] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const [addedCount, setAddedCount] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sendQueue, setSendQueue] = useState(null); // { ids: [...], index: 0 }

  useEffect(() => {
    api.getEvent(id).then(setEvent).catch((err) => setError(err.message));
  }, [id]);

  function loadGuests() {
    return api
      .getGuests(id)
      .then(setGuests)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadGuests();
    const interval = setInterval(loadGuests, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreateLink(e) {
    e.preventDefault();
    setCreatingLink(true);
    setError('');
    setAddedCount(null);
    try {
      // Bulk textarea takes priority if filled in; otherwise fall back to the
      // single name/phone fields.
      const bulkLines = bulkEntries
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (bulkLines.length > 0) {
        const parsed = bulkLines.map((line) => {
          const [name, phone] = line.split(',').map((s) => s.trim());
          return { name, phone: phone || '' };
        });
        await api.createGuestLinksBulk(id, parsed);
        setAddedCount(parsed.length);
        setBulkEntries('');
      } else if (linkGuestName.trim()) {
        await api.createGuestLink(id, linkGuestName.trim(), linkGuestPhone.trim());
        setAddedCount(1);
        setLinkGuestName('');
        setLinkGuestPhone('');
      } else {
        setCreatingLink(false);
        return;
      }
      await loadGuests();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingLink(false);
    }
  }

  function inviteUrlFor(guest) {
    if (!event || !guest.inviteToken) return null;
    return `${window.location.origin}/e/${event.publicId}?g=${guest.inviteToken}`;
  }

  async function copyLink(guest) {
    const url = inviteUrlFor(guest);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(guest._id);
      setTimeout(() => setCopiedId((prev) => (prev === guest._id ? null : prev)), 2000);
    } catch {
      window.prompt('Copy this link:', url);
    }
  }

  async function handleDeleteGuest(guest) {
    const confirmed = window.confirm(`Remove ${guest.name} from the guest list?`);
    if (!confirmed) return;
    setError('');
    try {
      await api.deleteGuest(id, guest._id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(guest._id);
        return next;
      });
      await loadGuests();
    } catch (err) {
      setError(err.message);
    }
  }

  function inviteMessage(guest) {
    return `Hi ${guest.name}! You're invited to ${event?.title || 'our event'}. Please RSVP here: ${inviteUrlFor(guest)}`;
  }

  function whatsappShareUrl(guest) {
    const digits = (guest.phone || '').replace(/[^\d]/g, '');
    const text = encodeURIComponent(inviteMessage(guest));
    return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  function toggleSelected(guestId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
  }

  function toggleSelectAllInvited(invitedList) {
    setSelectedIds((prev) => {
      const allSelected = invitedList.length > 0 && invitedList.every((g) => prev.has(g._id));
      if (allSelected) return new Set();
      return new Set(invitedList.map((g) => g._id));
    });
  }

  function startSendQueue() {
    const ids = guests.filter((g) => selectedIds.has(g._id) && g.status === 'invited').map((g) => g._id);
    if (ids.length === 0) return;
    setSendQueue({ ids, index: 0 });
    openWhatsAppFor(ids[0]);
  }

  function openWhatsAppFor(guestId) {
    const guest = guests.find((g) => g._id === guestId);
    if (!guest) return;
    window.open(whatsappShareUrl(guest), '_blank', 'noreferrer');
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

  if (loading) return <div className="container">Loading…</div>;

  const accepted = guests.filter((g) => g.status === 'accepted');
  const declined = guests.filter((g) => g.status === 'declined');
  const invited = guests.filter((g) => g.status === 'invited');
  const grouped = { accepted, declined, invited };

  return (
    <div className="container">
      <p>
        <Link to={`/events/${id}`}>← Back to event</Link>
      </p>
      <h1>{event ? `Guests — ${event.title}` : 'Guests'}</h1>

      <div className="guest-summary-row">
        <div className="guest-summary-stat guest-summary-accepted">
          <span className="guest-summary-value">{accepted.length}</span>
          <span className="guest-summary-label">Attending</span>
        </div>
        <div className="guest-summary-stat guest-summary-declined">
          <span className="guest-summary-value">{declined.length}</span>
          <span className="guest-summary-label">Not attending</span>
        </div>
        <div className="guest-summary-stat guest-summary-invited">
          <span className="guest-summary-value">{invited.length}</span>
          <span className="guest-summary-label">Awaiting response</span>
        </div>
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

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <form onSubmit={handleCreateLink} className="field">
          <label htmlFor="link-guest-name">Add a guest</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              id="link-guest-name"
              placeholder="Guest name"
              value={linkGuestName}
              onChange={(e) => setLinkGuestName(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
            />
            <input
              id="link-guest-phone"
              placeholder="Phone (for WhatsApp, optional)"
              value={linkGuestPhone}
              onChange={(e) => setLinkGuestPhone(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
          </div>

          <label htmlFor="bulk-entries" style={{ marginTop: '0.9rem' }}>
            Or add several at once — one guest per line, as "Name, phone"
          </label>
          <textarea
            id="bulk-entries"
            rows={3}
            placeholder={'Priya Sharma, +91 98765 43210\nRahul Verma, +91 91234 56789'}
            value={bulkEntries}
            onChange={(e) => setBulkEntries(e.target.value)}
          />

          <div style={{ marginTop: '0.6rem' }}>
            <button className="btn" type="submit" disabled={creatingLink}>
              {creatingLink ? 'Creating…' : 'Create link(s)'}
            </button>
          </div>
        </form>
        {addedCount && (
          <p className="hint-text" style={{ marginTop: '0.4rem' }}>
            Added {addedCount} guest{addedCount === 1 ? '' : 's'}. Select them below and use "Send via
            WhatsApp" to invite them.
          </p>
        )}
        <p className="hint-text" style={{ marginTop: '0.4rem' }}>
          Each guest gets their own personal RSVP link with their name already filled in. Add a phone number
          to message them on WhatsApp directly, or leave it blank and copy the link elsewhere.
        </p>
      </div>

      {sendQueue && (
        <div className="card rsvp-banner" role="status" style={{ marginTop: '1rem' }}>
          <span className="rsvp-banner-icon">📤</span>
          <div>
            Opened WhatsApp for guest {sendQueue.index + 1} of {sendQueue.ids.length}. Send the message, then
            come back here for the next one.
          </div>
          <button className="btn rsvp-banner-dismiss" onClick={sendNextInQueue}>
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
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn"
            type="button"
            disabled={selectedIds.size === 0 || !!sendQueue}
            onClick={startSendQueue}
          >
            Send via WhatsApp ({selectedIds.size} selected)
          </button>
        </div>
      )}

      {SECTIONS.map((section) => {
        const q = search.trim().toLowerCase();
        const sectionGuests = grouped[section.key].filter(
          (g) => !q || g.name.toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q)
        );
        const isInvitedSection = section.key === 'invited';
        const allSelected = isInvitedSection && sectionGuests.length > 0 && sectionGuests.every((g) => selectedIds.has(g._id));
        return (
        <div key={section.key}>
          <h2 className="section-title">
            {section.title} ({sectionGuests.length}{q ? ` of ${grouped[section.key].length}` : ''})
          </h2>
          {sectionGuests.length === 0 ? (
            <p className="hint-text">{q ? 'No matches.' : section.emptyText}</p>
          ) : (
            <div className="guest-table-wrap">
              <table className="guest-table">
                <thead>
                  <tr>
                    {isInvitedSection && (
                      <th className="guest-table-check">
                        <label className="guest-select-all">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleSelectAllInvited(sectionGuests)}
                            aria-label="Select all awaiting response"
                          />
                          Select all
                        </label>
                      </th>
                    )}
                    <th>Guest</th>
                    <th className="guest-table-actions-head"></th>
                  </tr>
                </thead>
                <tbody>
                  {sectionGuests.map((g) => (
                    <tr key={g._id} className={`guest-${g.status}`}>
                      {isInvitedSection && (
                        <td className="guest-table-check">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(g._id)}
                            onChange={() => toggleSelected(g._id)}
                            aria-label={`Select ${g.name}`}
                          />
                        </td>
                      )}
                      <td>
                        <div className="guest-row-name">
                          <strong>{g.name}</strong>
                          {g.phone && <span className="guest-phone"> ({g.phone})</span>}
                        </div>
                        {g.email && <div className="guest-email">{g.email}</div>}
                        {g.dietaryNotes && <div className="guest-notes">Dietary notes: {g.dietaryNotes}</div>}
                        {g.respondedAt && (
                          <div className="guest-notes">Responded {new Date(g.respondedAt).toLocaleString()}</div>
                        )}
                      </td>
                      <td>
                        <div className="guest-row-actions">
                          {g.inviteToken && g.status === 'invited' && (
                            <>
                              <button className="btn secondary guest-share-btn" type="button" onClick={() => copyLink(g)}>
                                {copiedId === g._id ? 'Copied!' : 'Copy link'}
                              </button>
                              <a
                                className="btn secondary guest-share-btn"
                                href={whatsappShareUrl(g)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                WhatsApp
                              </a>
                            </>
                          )}
                          <button
                            className="btn danger guest-share-btn"
                            type="button"
                            onClick={() => handleDeleteGuest(g)}
                            aria-label={`Remove ${g.name}`}
                          >
                            Remove
                          </button>
                          <span className={`badge guest-status-badge guest-status-${g.status}`}>
                            {g.status === 'accepted' ? 'Attending' : g.status === 'declined' ? "Can't attend" : 'Invited'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
