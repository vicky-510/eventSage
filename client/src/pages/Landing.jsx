import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { SparkleIcon, EditIcon, RefreshIcon, UsersIcon } from '../components/icons.jsx';

const FEATURES = [
  {
    icon: SparkleIcon,
    title: 'AI-generated plan',
    body: 'Describe your event once and get a complete budget breakdown, timeline, and vendor checklist in seconds.',
  },
  {
    icon: EditIcon,
    title: 'Editable, not locked-in',
    body: 'Every budget line, checklist task, and timeline item stays fully editable — AI gives you a starting point, not a rulebook.',
  },
  {
    icon: RefreshIcon,
    title: 'Re-plan on the fly',
    body: 'Something changed? Describe it in plain English and the budget reallocates itself across categories.',
  },
  {
    icon: UsersIcon,
    title: 'Guest RSVP, built in',
    body: 'Every event gets a shareable link where guests can RSVP and leave dietary notes — no account needed.',
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="container">
      <section className="hero">
        <h1>Plan your celebration, powered by AI</h1>
        <p>
          EventSage turns a short description of your wedding, birthday, or community event into a full plan:
          budget, timeline, vendor checklist, and ideas — ready to edit, export, and share.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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

      <div className="event-list">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div className="card hoverable" key={title}>
            <span className="feature-icon">
              <Icon aria-hidden="true" />
            </span>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem', color: 'var(--color-primary-dark)' }}>{title}</h2>
            <p style={{ margin: 0 }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
