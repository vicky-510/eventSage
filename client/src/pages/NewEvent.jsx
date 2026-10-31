import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { BotIcon, SendIcon, SparkleIcon } from '../components/icons.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

const GREETING = "Hi! Tell me what you're celebrating — a wedding, birthday, or community event — and I'll help you plan it.";

export default function NewEvent() {
  usePageTitle('Plan a new event');
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
              <input id="r-title" required maxLength={200} value={brief.title} onChange={(e) => updateBrief('title', e.target.value)} />
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
              <input id="r-location" maxLength={200} value={brief.location || ''} onChange={(e) => updateBrief('location', e.target.value)} />
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
              <textarea id="r-vibe" maxLength={1000} rows={3} value={brief.vibe || ''} onChange={(e) => updateBrief('vibe', e.target.value)} />
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
    <div className="container" style={{ maxWidth: 600 }}>
      <div className="card chat-card">
        <div className="chat-header">
          <span className="chat-avatar">
            <SparkleIcon aria-hidden="true" width="17" height="17" />
          </span>
          <div>
            <p className="chat-title">Plan with EventSage</p>
            <p className="chat-subtitle">
              <span className="chat-status-dot" aria-hidden="true" /> Online now
            </p>
          </div>
        </div>
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-label="Planning conversation"
          className="chat-log"
          style={{ maxHeight: 400 }}
        >
          {messages.map((m, i) => (
            <div key={i} className={`chat-row from-${m.role}`}>
              <span className="chat-avatar" aria-hidden="true">
                {m.role === 'assistant' ? <BotIcon width="16" height="16" /> : 'You'}
              </span>
              <div className="chat-bubble">{m.content}</div>
            </div>
          ))}
          {thinking && (
            <div className="chat-row from-assistant">
              <span className="chat-avatar" aria-hidden="true">
                <BotIcon width="16" height="16" />
              </span>
              <div className="chat-bubble typing-dots" aria-label="EventSage is typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>
        <form onSubmit={sendMessage} className="chat-composer">
          <label htmlFor="intake-input" className="visually-hidden">
            Your message
          </label>
          <input
            id="intake-input"
            maxLength={2000}
            placeholder="Type your answer…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={thinking}
          />
          <button className="btn chat-send-btn" type="submit" disabled={thinking || !input.trim()} aria-label="Send message">
            <SendIcon aria-hidden="true" />
          </button>
        </form>
      </div>
      {error && (
        <p className="error-text" role="alert" style={{ marginTop: '0.75rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
