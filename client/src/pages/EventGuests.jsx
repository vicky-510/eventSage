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
  const [linkGuestNames, setLinkGuestNames] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const [addedCount, setAddedCount] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [search, setSearch] = useState('');

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
    const names = linkGuestNames
      .split(/[,\n]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setCreatingLink(true);
    setError('');
    setAddedCount(null);
    try {
      if (names.length === 1) {
        await api.createGuestLink(id, names[0]);
      } else {
        await api.createGuestLinksBulk(id, names);
      }
      setAddedCount(names.length);
      setLinkGuestNames('');
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

  function whatsappShareUrl(guest) {
    const text = `You're invited to ${event?.title || 'our event'}! RSVP here: ${inviteUrlFor(guest)}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
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
          <label htmlFor="link-guest-names">Add guests and get their personal RSVP links</label>
          <textarea
            id="link-guest-names"
            rows={3}
            placeholder={'One name per line (or comma-separated), e.g.\nPriya Sharma\nRahul Verma'}
            value={linkGuestNames}
            onChange={(e) => setLinkGuestNames(e.target.value)}
          />
          <div style={{ marginTop: '0.6rem' }}>
            <button className="btn" type="submit" disabled={creatingLink}>
              {creatingLink ? 'Creating…' : 'Create link(s)'}
            </button>
          </div>
        </form>
        {addedCount && (
          <p className="hint-text" style={{ marginTop: '0.4rem' }}>
            Added {addedCount} guest{addedCount === 1 ? '' : 's'}. Use "Copy link" or "WhatsApp" below to share
            with each of them.
          </p>
        )}
        <p className="hint-text" style={{ marginTop: '0.4rem' }}>
          Share the generated links yourself — WhatsApp, SMS, in person, however you like. This page updates
          as guests respond.
        </p>
      </div>

      {guests.length > 0 && (
        <div className="field" style={{ marginTop: '1.5rem', maxWidth: 360 }}>
          <label htmlFor="guest-search">Find a guest</label>
          <input
            id="guest-search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {SECTIONS.map((section) => {
        const q = search.trim().toLowerCase();
        const sectionGuests = grouped[section.key].filter(
          (g) => !q || g.name.toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q)
        );
        return (
        <div key={section.key}>
          <h2 className="section-title">
            {section.title} ({sectionGuests.length}{q ? ` of ${grouped[section.key].length}` : ''})
          </h2>
          {sectionGuests.length === 0 ? (
            <p className="hint-text">{q ? 'No matches.' : section.emptyText}</p>
          ) : (
            <ul className="guest-list">
              {sectionGuests.map((g) => (
                <li key={g._id} className={`guest-row guest-${g.status}`}>
                  <div>
                    <strong>{g.name}</strong>
                    {g.email && <span className="guest-email"> · {g.email}</span>}
                    {g.dietaryNotes && <div className="guest-notes">Dietary notes: {g.dietaryNotes}</div>}
                    {g.respondedAt && (
                      <div className="guest-notes">Responded {new Date(g.respondedAt).toLocaleString()}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    <span className={`badge guest-status-badge guest-status-${g.status}`}>
                      {g.status === 'accepted' ? 'Attending' : g.status === 'declined' ? "Can't attend" : 'Invited'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        );
      })}
    </div>
  );
}
