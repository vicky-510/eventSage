import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function EventCalendar({ events }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const eventsByDay = useMemo(() => {
    return events
      .filter((ev) => ev.date)
      .map((ev) => ({ ...ev, dateObj: new Date(ev.date) }));
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  function eventsOn(day) {
    if (!day) return [];
    const target = new Date(year, month, day);
    return eventsByDay.filter((ev) => sameDay(ev.dateObj, target));
  }

  const upcomingThisMonth = eventsByDay
    .filter((ev) => ev.dateObj.getFullYear() === year && ev.dateObj.getMonth() === month)
    .sort((a, b) => a.dateObj - b.dateObj);

  return (
    <div className="card calendar-card">
      <div className="calendar-header">
        <button
          type="button"
          className="btn icon-btn"
          aria-label="Previous month"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
        >
          ‹
        </button>
        <h3>{monthLabel}</h3>
        <button type="button" className="btn icon-btn" aria-label="Next month" onClick={() => setCursor(new Date(year, month + 1, 1))}>
          ›
        </button>
      </div>
      <div className="calendar-grid calendar-weekdays">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, i) => {
          const dayEvents = eventsOn(day);
          const isToday = day && sameDay(new Date(year, month, day), today);
          return (
            <div key={i} className={`calendar-cell${day ? '' : ' empty'}${isToday ? ' is-today' : ''}`}>
              {day && (
                <>
                  <span className="calendar-day-num">{day}</span>
                  {dayEvents.length > 0 && <span className="calendar-dot" title={dayEvents.map((e) => e.title).join(', ')} />}
                </>
              )}
            </div>
          );
        })}
      </div>
      {upcomingThisMonth.length > 0 ? (
        <ul className="calendar-event-list">
          {upcomingThisMonth.map((ev) => (
            <li key={ev._id}>
              <Link to={`/events/${ev._id}`}>
                {ev.dateObj.getDate()} — {ev.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="chat-empty-hint">No events this month.</p>
      )}
    </div>
  );
}
