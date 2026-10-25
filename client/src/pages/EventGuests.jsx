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
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

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
    if (!linkGuestName.trim()) return;
    setCreatingLink(true);
    setError('');
    try {
      await api.createGuestLink(id, linkGuestName.trim());
      setLinkGuestName('');
      await loadGuests();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingLink(false);
    }
  }

  async function copyLink(guest) {
    try {
      await navigator.clipboard.writeText(guest.inviteUrl);
      setCopiedId(guest._id);
      setTimeout(() => setCopiedId((prev) => (prev === guest._id ? null : prev)), 2000);
    } catch {
      window.prompt('Copy this link:', guest.inviteUrl);
    }
  }

  function whatsappShareUrl(guest) {
    const text = `You're invited to ${event?.title || 'our event'}! RSVP here: ${guest.inviteUrl}`;
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
        <form onSubmit={handleCreateLink} className="field" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="link-guest-name">Add a guest and get their personal RSVP link</label>
            <input
              id="link-guest-name"
              placeholder="Guest name"
              value={linkGuestName}
              onChange={(e) => setLinkGuestName(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={creatingLink}>
            {creatingLink ? 'Creating…' : 'Create link'}
          </button>
        </form>
        <p className="hint-text" style={{ marginTop: '0.4rem' }}>
          Share the generated link yourself — WhatsApp, SMS, in person, however you like. This page updates
          as guests respond.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.key}>
          <h2 className="section-title">
            {section.title} ({grouped[section.key].length})
          </h2>
          {grouped[section.key].length === 0 ? (
            <p className="hint-text">{section.emptyText}</p>
          ) : (
            <ul className="guest-list">
              {grouped[section.key].map((g) => (
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
                    {g.inviteUrl && g.status === 'invited' && (
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
      ))}
    </div>
  );
}
