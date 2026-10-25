import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { exportPlanPdf } from '../utils/exportPlanPdf.js';
import AssistantChat from '../components/AssistantChat.jsx';

const SEVERITY_LABEL = { critical: 'Critical', warning: 'Warning', info: 'Note' };

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
        {hasPlan && (
          <button className="btn secondary" onClick={() => exportPlanPdf(event)}>
            Export PDF
          </button>
        )}
        {modelUsed && <span className="badge">generated with {modelUsed}</span>}
      </div>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {hasPlan && (
        <>
          {event.plan.insights?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
              {event.plan.insights.map((insight, i) => (
                <div
                  key={i}
                  className={`insight-chip insight-${insight.severity}`}
                  role={insight.severity === 'critical' ? 'alert' : undefined}
                >
                  <strong>{SEVERITY_LABEL[insight.severity] || 'Note'}:</strong> {insight.message}
                </div>
              ))}
            </div>
          )}

          {event.plan.moodboard && (
            <div className="card hoverable" style={{ marginTop: '1.5rem' }}>
              <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: 'var(--color-primary-dark)' }}>
                {event.plan.moodboard.themeName}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {event.plan.moodboard.colors.map((c) => (
                  <span
                    key={c}
                    title={c}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: c,
                      border: '2px solid var(--color-surface)',
                      boxShadow: '0 0 0 1px var(--color-border)',
                    }}
                  />
                ))}
              </div>
              <p style={{ margin: 0 }}>{event.plan.moodboard.description}</p>
            </div>
          )}

          <h2 className="section-title">Budget</h2>
          {(() => {
            const maxAmount = Math.max(...event.plan.budget.map((b) => Number(b.amount) || 0), 1);
            return event.plan.budget.map((b, i) => {
              const pct = Math.round((Number(b.amount) / maxAmount) * 100);
              return (
                <div className="budget-row" key={i}>
                  <div className="budget-row-header">
                    <span>{b.category}</span>
                    <span>₹{Number(b.amount).toLocaleString()}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            });
          })()}

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
                  className={`btn ${c.status === 'paid' ? 'status-paid' : c.status === 'booked' ? 'status-booked' : 'secondary'}`}
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

      <AssistantChat eventId={event._id} initialMessages={event.assistantChat || []} />
    </div>
  );
}
