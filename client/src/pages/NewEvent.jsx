import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

const GREETING = "Hi! Tell me what you're celebrating — a wedding, birthday, or community event — and I'll help you plan it.";

export default function NewEvent() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const [brief, setBrief] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || thinking) return;
    const nextMessages = [...messages, { role: 'user', content: input.trim() }];
    setMessages(nextMessages);
    setInput('');
    setThinking(true);
    setError('');
    try {
      const res = await api.intakeChat(nextMessages);
      setMessages([...nextMessages, { role: 'assistant', content: res.reply }]);
      if (res.done && res.brief) {
        setBrief(res.brief);
        setMode('review');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setThinking(false);
    }
  }

  function updateBrief(field, value) {
    setBrief((b) => ({ ...b, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const event = await api.createEvent(brief);
      navigate(`/events/${event._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'review' && brief) {
    return (
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card">
          <h1>Review before we plan</h1>
          <p style={{ opacity: 0.8 }}>I've filled this in from our chat — change anything before creating the event.</p>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label htmlFor="r-title">Event title</label>
              <input id="r-title" required value={brief.title} onChange={(e) => updateBrief('title', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="r-occasionType">Occasion</label>
              <select id="r-occasionType" value={brief.occasionType} onChange={(e) => updateBrief('occasionType', e.target.value)}>
                <option value="birthday">Birthday</option>
                <option value="wedding">Wedding</option>
                <option value="community">Community event</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="r-date">Event date</label>
              <input
                id="r-date"
                type="date"
                value={brief.date ? String(brief.date).slice(0, 10) : ''}
                onChange={(e) => updateBrief('date', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="r-location">Location</label>
              <input id="r-location" value={brief.location || ''} onChange={(e) => updateBrief('location', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="r-guestCount">Guest count</label>
              <input
                id="r-guestCount"
                type="number"
                min="1"
                value={brief.guestCount || ''}
                onChange={(e) => updateBrief('guestCount', Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="r-budgetTotal">Total budget (₹)</label>
              <input
                id="r-budgetTotal"
                type="number"
                min="0"
                value={brief.budgetTotal || ''}
                onChange={(e) => updateBrief('budgetTotal', Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="r-vibe">Vibe / notes</label>
              <textarea id="r-vibe" rows={3} value={brief.vibe || ''} onChange={(e) => updateBrief('vibe', e.target.value)} />
            </div>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create event'}
              </button>
              <button type="button" className="btn secondary" onClick={() => setMode('chat')}>
                Back to chat
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="card">
        <h1>Let's plan your event</h1>
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-label="Planning conversation"
          style={{ maxHeight: 360, overflowY: 'auto', margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                color: m.role === 'user' ? 'var(--color-text-on-primary)' : 'var(--color-text)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 0.9rem',
                maxWidth: '85%',
              }}
            >
              {m.content}
            </div>
          ))}
          {thinking && <div style={{ opacity: 0.6, fontStyle: 'italic' }}>EventSage is thinking…</div>}
        </div>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
          <label htmlFor="intake-input" className="visually-hidden">
            Your message
          </label>
          <input
            id="intake-input"
            placeholder="Type your answer…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={thinking}
          />
          <button className="btn" type="submit" disabled={thinking || !input.trim()}>
            Send
          </button>
        </form>
        {error && (
          <p className="error-text" role="alert" style={{ marginTop: '0.75rem' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
