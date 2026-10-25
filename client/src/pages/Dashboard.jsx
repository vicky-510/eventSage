import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { daysUntil } from '../utils/dates.js';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listEvents()
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = events.filter((ev) => {
    const d = daysUntil(ev.date);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const totalBudget = events.reduce((sum, ev) => sum + (ev.budgetTotal || 0), 0);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Your events</h1>
        <Link className="btn" to="/events/new">
          + New event
        </Link>
      </div>

      {!loading && events.length > 0 && (
        <div className="stat-row">
          <div className="stat-card">
            <span className="stat-value">{events.length}</span>
            <span className="stat-label">Total events</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{upcoming}</span>
            <span className="stat-label">In the next 30 days</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">₹{totalBudget.toLocaleString()}</span>
            <span className="stat-label">Total budget tracked</span>
          </div>
        </div>
      )}

      {loading && <p>Loading…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && events.length === 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <p>No events yet. Create your first one to get an AI-generated plan.</p>
        </div>
      )}

      <div className="event-list">
        {events.map((ev) => {
          const spent = (ev.plan?.budget || []).reduce((sum, b) => sum + (b.spent || 0), 0);
          const left = daysUntil(ev.date);
          const pct = ev.budgetTotal ? Math.min(100, Math.round((spent / ev.budgetTotal) * 100)) : 0;
          const overBudget = ev.budgetTotal && spent > ev.budgetTotal;

          return (
            <Link
              key={ev._id}
              to={`/events/${ev._id}`}
              className="card hoverable"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <h2 style={{ margin: '0 0 0.4rem' }}>{ev.title}</h2>
              <p style={{ margin: 0 }}>
                {ev.occasionType && <span className="badge">{ev.occasionType}</span>}{' '}
                {left !== null && (left >= 0 ? `${left} days to go` : 'Past event')}
              </p>
              {ev.budgetTotal ? (
                <div className="budget-row" style={{ marginTop: '0.8rem', marginBottom: 0 }}>
                  <div className="budget-row-header" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    <span>
                      ₹{spent.toLocaleString()} / ₹{ev.budgetTotal.toLocaleString()}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill${overBudget ? ' over-budget' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
