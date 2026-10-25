import { useRef, useState } from 'react';
import { api } from '../api/client.js';
import { BotIcon, SendIcon, SparkleIcon } from './icons.jsx';

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
    <div className="card chat-card" style={{ marginTop: '2.5rem', padding: open ? 0 : '1.3rem' }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} aria-expanded={false} aria-controls="assistant-chat-panel" className="btn">
          <SparkleIcon aria-hidden="true" width="17" height="17" />
          Ask EventSage
        </button>
      ) : (
        <div id="assistant-chat-panel">
          <div className="chat-header">
            <span className="chat-avatar">
              <BotIcon aria-hidden="true" width="17" height="17" />
            </span>
            <div style={{ flex: 1 }}>
              <p className="chat-title">Ask EventSage</p>
              <p className="chat-subtitle">
                <span className="chat-status-dot" aria-hidden="true" /> Knows this event's full plan
              </p>
            </div>
            <button
              type="button"
              className="btn icon-btn"
              onClick={() => setOpen(false)}
              aria-label="Close assistant chat"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Assistant conversation"
            className="chat-log"
            style={{ maxHeight: 320 }}
          >
            {messages.length === 0 && (
              <p className="chat-empty-hint">
                Ask anything about this event — "what should I say in a toast?", "is my catering budget enough?", etc.
              </p>
            )}
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
            <button className="btn chat-send-btn" type="submit" disabled={thinking || !input.trim()} aria-label="Send message">
              <SendIcon aria-hidden="true" />
            </button>
          </form>
          {error && (
            <p className="error-text" role="alert" style={{ padding: '0 1.3rem 1rem' }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
