import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const FEATURES = [
  {
    title: 'AI-generated plan',
    body: 'Describe your event once and get a complete budget breakdown, timeline, and vendor checklist in seconds.',
  },
  {
    title: 'Editable, not locked-in',
    body: 'Every budget line, checklist task, and timeline item stays fully editable — the AI gives you a starting point, not a rulebook.',
  },
  {
    title: 'Re-plan on the fly',
    body: "Something changed? Describe it in plain English and the budget reallocates itself across categories.",
  },
  {
    title: 'Guest RSVP, built in',
    body: 'Every event gets a shareable link where guests can RSVP and leave dietary notes — no account needed.',
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="container">
      <section style={{ textAlign: 'center', padding: '2rem 0 1rem' }}>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>
          Plan your celebration, powered by AI
        </h1>
        <p style={{ fontSize: '1.1rem', maxWidth: 560, margin: '0 auto 1.5rem' }}>
          EventSage turns a short description of your wedding, birthday, or community event into a full plan:
          budget, timeline, vendor checklist, and ideas — ready to edit and share.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {user ? (
            <Link className="btn" to="/dashboard">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link className="btn" to="/signup">
                Get started free
              </Link>
              <Link className="btn secondary" to="/login">
                Log in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="event-list" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', display: 'grid' }}>
        {FEATURES.map((f) => (
          <div className="card" key={f.title}>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem', color: 'var(--color-primary-dark)' }}>{f.title}</h2>
            <p style={{ margin: 0 }}>{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
