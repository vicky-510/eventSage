import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function NewEvent() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    occasionType: 'birthday',
    date: '',
    location: '',
    guestCount: '',
    budgetTotal: '',
    vibe: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        guestCount: form.guestCount ? Number(form.guestCount) : undefined,
        budgetTotal: form.budgetTotal ? Number(form.budgetTotal) : undefined,
      };
      const event = await api.createEvent(payload);
      navigate(`/events/${event._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="card">
        <h1>Describe your event</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="title">Event title</label>
            <input
              id="title"
              required
              placeholder="e.g. Maya's 30th Birthday"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="occasionType">Occasion</label>
            <select id="occasionType" value={form.occasionType} onChange={(e) => update('occasionType', e.target.value)}>
              <option value="birthday">Birthday</option>
              <option value="wedding">Wedding</option>
              <option value="community">Community event</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="date">Event date</label>
            <input id="date" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" value={form.location} onChange={(e) => update('location', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="guestCount">Guest count</label>
            <input
              id="guestCount"
              type="number"
              min="1"
              value={form.guestCount}
              onChange={(e) => update('guestCount', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="budgetTotal">Total budget (₹)</label>
            <input
              id="budgetTotal"
              type="number"
              min="0"
              value={form.budgetTotal}
              onChange={(e) => update('budgetTotal', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="vibe">Vibe / notes</label>
            <textarea
              id="vibe"
              rows={3}
              placeholder="e.g. pastel beach theme, casual, live music"
              value={form.vibe}
              onChange={(e) => update('vibe', e.target.value)}
            />
          </div>

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create event'}
          </button>
        </form>
      </div>
    </div>
  );
}
