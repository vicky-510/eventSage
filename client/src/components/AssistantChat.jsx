import { useRef, useState } from 'react';
import { api } from '../api/client.js';

export default function AssistantChat({ eventId, initialMessages }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || thinking) return;
    const question = input.trim();
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput('');
    setThinking(true);
    setError('');
    try {
      const res = await api.chatWithEvent(eventId, question);
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: '2.5rem' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="assistant-chat-panel"
        className="btn secondary"
      >
        {open ? 'Hide' : 'Ask EventSage'}
      </button>

      {open && (
        <div id="assistant-chat-panel" style={{ marginTop: '1rem' }}>
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Assistant conversation"
            style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}
          >
            {messages.length === 0 && (
              <p style={{ opacity: 0.7, margin: 0 }}>
                Ask anything about this event — "what should I say in a toast?", "is my catering budget enough?", etc.
              </p>
            )}
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
            {thinking && <div style={{ opacity: 0.6, fontStyle: 'italic' }}>Thinking…</div>}
          </div>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
            <label htmlFor="assistant-input" className="visually-hidden">
              Ask EventSage a question
            </label>
            <input
              id="assistant-input"
              placeholder="Ask a question about this event…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={thinking}
            />
            <button className="btn" type="submit" disabled={thinking || !input.trim()}>
              Ask
            </button>
          </form>
          {error && (
            <p className="error-text" role="alert" style={{ marginTop: '0.5rem' }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
