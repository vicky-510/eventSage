import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { api } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

function celebrate() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#8b5e34', '#c9a876', '#6b4423', '#f3e6d3'],
  });
}

export default function PublicRsvp() {
  const { publicId } = useParams();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('g') || '';
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [attending, setAttending] = useState('yes');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getPublicEvent(publicId, inviteToken)
      .then((data) => {
        setEvent(data);
        if (data.invite?.name) setName(data.invite.name);
      })
      .catch((err) => setError(err.message));
  }, [publicId, inviteToken]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.submitRsvp(publicId, {
        name,
        attending: attending === 'yes',
        dietaryNotes,
        inviteToken: inviteToken || undefined,
      });
      setSubmitted(true);
      if (attending === 'yes') celebrate();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !event) return <div className="container error-text">{error}</div>;
  if (!event) return <div className="container"><Spinner label="Loading invitation…" /></div>;

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
              {submitting && <Spinner inline size={14} />}
              {submitting ? 'Submitting…' : 'Submit RSVP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
