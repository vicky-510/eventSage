import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { SparkleIcon, EditIcon, RefreshIcon, UsersIcon } from '../components/icons.jsx';
import Reveal from '../components/Reveal.jsx';

const FEATURES = [
  {
    icon: SparkleIcon,
    title: 'Chat instead of a form',
    body: 'Tell EventSage about your event in a conversation — it asks the right follow-up questions and builds your brief itself.',
  },
  {
    icon: EditIcon,
    title: 'Full plan, fully editable',
    body: 'Budget, timeline, vendor checklist, moodboard, and even budget-risk insights — a starting point you can reshape.',
  },
  {
    icon: RefreshIcon,
    title: 'Re-plan on the fly',
    body: 'Something changed? Describe it in plain English and the budget reallocates itself across categories.',
  },
  {
    icon: UsersIcon,
    title: 'Ask EventSage anything',
    body: 'A built-in assistant that knows your event’s details — ask about speeches, vendors, or whether your budget adds up.',
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="container">
      <section className="hero">
        <h1>Plan your celebration, powered by AI</h1>
        <p>
          EventSage turns a conversation about your wedding, birthday, or community event into a full plan:
          budget, timeline, vendor checklist, moodboard, and ideas — ready to edit, export, and share.
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
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 80}>
            <div className="card hoverable">
              <span className="feature-icon">
                <Icon aria-hidden="true" />
              </span>
              <h2 style={{ marginTop: 0, fontSize: '1.1rem', color: 'var(--color-primary-dark)' }}>{title}</h2>
              <p style={{ margin: 0 }}>{body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
