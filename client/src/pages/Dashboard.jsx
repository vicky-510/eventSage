import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

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

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Your events</h1>
        <Link className="btn" to="/events/new">
          + New event
        </Link>
      </div>

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
          return (
            <Link key={ev._id} to={`/events/${ev._id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h2 style={{ margin: '0 0 0.4rem' }}>{ev.title}</h2>
              <p style={{ margin: 0 }}>
                {ev.occasionType && <span className="badge">{ev.occasionType}</span>}{' '}
                {left !== null && (left >= 0 ? `${left} days to go` : 'Past event')}
              </p>
              {ev.budgetTotal ? (
                <p style={{ margin: '0.4rem 0 0' }}>
                  Budget used: ₹{spent.toLocaleString()} / ₹{ev.budgetTotal.toLocaleString()}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
