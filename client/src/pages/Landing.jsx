import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import {
  SparkleIcon,
  EditIcon,
  RefreshIcon,
  UsersIcon,
  WalletIcon,
  CalendarIcon,
  ShareIcon,
} from '../components/icons.jsx';
import Reveal from '../components/Reveal.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import BarChart from '../components/charts/BarChart.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

const DEMO_OCCASIONS = [
  { label: 'Wedding', value: 3 },
  { label: 'Birthday', value: 5 },
  { label: 'Community', value: 2 },
];

const DEMO_BUDGET = [
  { label: 'Venue', value: 45000 },
  { label: 'Catering', value: 38000 },
  { label: 'Decor', value: 15000 },
  { label: 'Photos', value: 12000 },
];

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
  {
    icon: WalletIcon,
    title: 'Budget you can trust',
    body: 'Every category tracked against what you actually spend, with live progress bars and over-budget warnings.',
  },
  {
    icon: ShareIcon,
    title: 'Share with guests',
    body: 'A public RSVP link for every event — no login required for guests, no spreadsheets to pass around.',
  },
];

const STEPS = [
  {
    title: 'Describe your event',
    body: 'Chat naturally about the occasion, date, guest count, and vibe — no multi-page form to fill out.',
  },
  {
    title: 'Get a full plan instantly',
    body: 'EventSage generates a budget, day-of timeline, vendor checklist, and a moodboard tailored to your event.',
  },
  {
    title: 'Edit and adapt',
    body: 'Adjust any line item, re-plan when something changes, and ask the assistant follow-up questions anytime.',
  },
  {
    title: 'Share and track',
    body: 'Send guests a public RSVP link and watch your budget and checklist stay in sync as the date approaches.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Planned my sister’s wedding reception in an afternoon — the budget re-plan when our venue deposit changed was the feature that sold me.',
    name: 'Ananya R.',
    role: 'Wedding organizer',
  },
  {
    quote: 'The moodboard and checklist together meant I didn’t need three separate apps for one birthday party.',
    name: 'Karthik S.',
    role: 'Birthday host',
  },
  {
    quote: 'Our community fundraiser had 80 RSVPs through the guest link with zero spreadsheet chasing.',
    name: 'Priya M.',
    role: 'Community organizer',
  },
];

const STATS = [
  { value: '4', label: 'plan sections generated per event' },
  { value: '< 1 min', label: 'from chat to full plan' },
  { value: '0 ₹', label: 'cost to get started' },
];

export default function Landing() {
  usePageTitle();
  const { user } = useAuth();

  return (
    <div className="container">
      <section className="hero">
        <span className="eyebrow">AI Event Planning</span>
        <h1>Plan your celebration, powered by AI</h1>
        <p>
          EventSage turns a conversation about your wedding, birthday, or community event into a full plan:
          budget, timeline, vendor checklist, moodboard, and ideas — ready to edit, export, and share.
        </p>
        <div className="hero-actions">
          {user ? (
            <Link className="btn lg" to="/dashboard">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link className="btn lg" to="/signup">
                Get started free
              </Link>
              <Link className="btn secondary lg" to="/login">
                Log in
              </Link>
            </>
          )}
        </div>
      </section>

      <div className="stat-row" style={{ marginTop: '2.5rem' }}>
        {STATS.map((s) => (
          <div className="stat-card" key={s.label} style={{ textAlign: 'center' }}>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <section className="section" id="how-it-works">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <h2>From conversation to complete plan</h2>
          <p>Four steps, no spreadsheets, no planner fees.</p>
        </div>
        <div className="steps">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 70}>
              <div className="step">
                <span className="step-number">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section alt" id="features">
        <div className="section-head">
          <span className="eyebrow">Everything included</span>
          <h2>One assistant, the whole event</h2>
          <p>Every feature your celebration actually needs, nothing you have to pay extra for.</p>
        </div>
        <div className="event-list">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 60}>
              <div className="card hoverable">
                <span className="feature-icon">
                  <Icon aria-hidden="true" />
                </span>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: 'var(--color-primary-dark)' }}>{title}</h3>
                <p style={{ margin: 0 }}>{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section alt" id="analytics">
        <div className="section-head">
          <span className="eyebrow">See it, don't guess it</span>
          <h2>Dashboard analytics for every celebration</h2>
          <p>A live calendar and budget/occasion charts so you always know where your events and money stand.</p>
        </div>
        <div className="analytics-grid landing-chart-mock">
          <Reveal>
            <div className="card chart-card">
              <h3>Events by occasion</h3>
              <DonutChart data={DEMO_OCCASIONS} centerValue={10} centerLabel="events" />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="card chart-card">
              <h3>Budget by category</h3>
              <BarChart data={DEMO_BUDGET} formatValue={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            </div>
          </Reveal>
          <Reveal delay={160}>
            <div className="card chart-card">
              <h3>Upcoming events</h3>
              <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>
                A built-in calendar on your dashboard marks every event date, so nothing sneaks up on you.
              </p>
              <ul style={{ margin: '0.8rem 0 0', paddingLeft: '1.1rem', fontSize: '0.92rem', opacity: 0.85 }}>
                <li>Month view with a dot on every planned date</li>
                <li>Click straight through to that event's plan</li>
                <li>Always shows what's happening this month</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="loved-by">
        <div className="section-head">
          <span className="eyebrow">Loved by hosts</span>
          <h2>Real events, real relief</h2>
          <p>A few of the celebrations EventSage has helped plan.</p>
        </div>
        <div className="testimonial-grid">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <div className="testimonial">
                <p className="quote">“{t.quote}”</p>
                <div className="testimonial-author">
                  <span className="testimonial-avatar" aria-hidden="true">
                    {t.name.charAt(0)}
                  </span>
                  <span>
                    <span className="name">{t.name}</span>
                    <span className="role">{t.role}</span>
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section" id="occasions">
        <div className="section-head">
          <span className="eyebrow">Built for any occasion</span>
          <h2>Weddings, birthdays, and community events</h2>
          <p>Whatever you're celebrating, EventSage adapts the plan to fit.</p>
        </div>
        <div className="event-list">
          <Reveal>
            <div className="card">
              <span className="feature-icon">
                <CalendarIcon aria-hidden="true" />
              </span>
              <h3 style={{ marginTop: 0 }}>Weddings</h3>
              <p style={{ margin: 0 }}>Vendor checklists, multi-category budgets, and a day-of timeline guests never see but you'll rely on.</p>
            </div>
          </Reveal>
          <Reveal delay={70}>
            <div className="card">
              <span className="feature-icon">
                <SparkleIcon aria-hidden="true" />
              </span>
              <h3 style={{ marginTop: 0 }}>Birthdays</h3>
              <p style={{ margin: 0 }}>Theme ideas and a moodboard in seconds, with a budget that scales to any guest count.</p>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="card">
              <span className="feature-icon">
                <UsersIcon aria-hidden="true" />
              </span>
              <h3 style={{ marginTop: 0 }}>Community events</h3>
              <p style={{ margin: 0 }}>A public RSVP page handles attendance so you can focus on logistics, not spreadsheets.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <Reveal>
          <div className="cta-band">
            <h2>Your next event deserves a plan this good</h2>
            <p>Start a conversation with EventSage — your full plan is minutes away.</p>
            {user ? (
              <Link className="btn lg" to="/dashboard">
                Go to dashboard
              </Link>
            ) : (
              <Link className="btn lg" to="/signup">
                Get started free
              </Link>
            )}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
