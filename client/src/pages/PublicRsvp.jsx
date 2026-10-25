import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function PublicRsvp() {
  const { publicId } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [attending, setAttending] = useState('yes');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getPublicEvent(publicId)
      .then(setEvent)
      .catch((err) => setError(err.message));
  }, [publicId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.submitRsvp(publicId, { name, attending: attending === 'yes', dietaryNotes });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !event) return <div className="container error-text">{error}</div>;
  if (!event) return <div className="container">Loading…</div>;

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <div className="card">
        <h1>You're invited: {event.title}</h1>
        <p>
          {event.date && new Date(event.date).toLocaleDateString()} {event.location && `· ${event.location}`}
        </p>
        {event.vibe && <p>{event.vibe}</p>}

        {submitted ? (
          <p>Thanks for your RSVP!</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="attending">Will you attend?</label>
              <select id="attending" value={attending} onChange={(e) => setAttending(e.target.value)}>
                <option value="yes">Yes, I'll be there</option>
                <option value="no">Sorry, can't make it</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="dietaryNotes">Dietary notes (optional)</label>
              <input id="dietaryNotes" value={dietaryNotes} onChange={(e) => setDietaryNotes(e.target.value)} />
            </div>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit RSVP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
