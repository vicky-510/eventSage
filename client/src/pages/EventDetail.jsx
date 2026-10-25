import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [replanText, setReplanText] = useState('');
  const [replanning, setReplanning] = useState(false);
  const [error, setError] = useState('');
  const [modelUsed, setModelUsed] = useState('');

  useEffect(() => {
    api
      .getEvent(id)
      .then(setEvent)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      const res = await api.generatePlan(id);
      setEvent(res.event);
      setModelUsed(res.modelUsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleReplan(e) {
    e.preventDefault();
    if (!replanText.trim()) return;
    setReplanning(true);
    setError('');
    try {
      const res = await api.replan(id, replanText);
      setEvent(res.event);
      setModelUsed(res.modelUsed);
      setReplanText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setReplanning(false);
    }
  }

  async function toggleChecklistStatus(index) {
    const order = ['todo', 'booked', 'paid'];
    const checklist = event.plan.checklist.map((item, i) => {
      if (i !== index) return item;
      const next = order[(order.indexOf(item.status) + 1) % order.length];
      return { ...item, status: next };
    });
    const updated = await api.updateEvent(id, { plan: { ...event.plan, checklist } });
    setEvent(updated);
  }

  if (loading) return <div className="container">Loading…</div>;
  if (error && !event) return <div className="container error-text">{error}</div>;
  if (!event) return null;

  const shareUrl = `${window.location.origin}/e/${event.publicId}`;
  const hasPlan = event.plan?.budget?.length > 0;

  return (
    <div className="container">
      <h1>{event.title}</h1>
      <p>
        {event.occasionType && <span className="badge">{event.occasionType}</span>}{' '}
        {event.date && new Date(event.date).toLocaleDateString()} {event.location && `· ${event.location}`}
      </p>

      <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating…' : hasPlan ? 'Regenerate plan' : 'Generate AI plan'}
        </button>
        <div>
          <label htmlFor="share-link" style={{ marginBottom: 0 }}>
            Share with guests:
          </label>
          <input id="share-link" readOnly value={shareUrl} onFocus={(e) => e.target.select()} style={{ width: 320 }} />
        </div>
        {modelUsed && <span className="badge">generated with {modelUsed}</span>}
      </div>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {hasPlan && (
        <>
          <h2 className="section-title">Budget</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Allocated</th>
              </tr>
            </thead>
            <tbody>
              {event.plan.budget.map((b, i) => (
                <tr key={i}>
                  <td>{b.category}</td>
                  <td>₹{Number(b.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <form onSubmit={handleReplan} className="field" style={{ marginTop: '1rem' }}>
            <label htmlFor="replan">Something changed? Describe it and re-plan the budget</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="replan"
                placeholder="e.g. I lost ₹10,000 on a venue deposit"
                value={replanText}
                onChange={(e) => setReplanText(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn secondary" type="submit" disabled={replanning}>
                {replanning ? 'Re-planning…' : 'Re-plan'}
              </button>
            </div>
          </form>

          <h2 className="section-title">Timeline</h2>
          <ul>
            {event.plan.timeline.map((t, i) => (
              <li key={i}>
                <strong>{t.time}</strong> — {t.label} {t.notes && `(${t.notes})`}
              </li>
            ))}
          </ul>

          <h2 className="section-title">Vendor checklist</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {event.plan.checklist.map((c, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>
                <button
                  className="btn secondary"
                  onClick={() => toggleChecklistStatus(i)}
                  aria-label={`Mark ${c.task} status, currently ${c.status}`}
                  style={{ marginRight: '0.6rem', padding: '0.3rem 0.8rem' }}
                >
                  {c.status}
                </button>
                {c.task} {c.dueDate && `— due ${new Date(c.dueDate).toLocaleDateString()}`}
              </li>
            ))}
          </ul>

          <h2 className="section-title">Ideas</h2>
          <ul>
            {event.plan.ideas.map((idea, i) => (
              <li key={i}>{idea}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
