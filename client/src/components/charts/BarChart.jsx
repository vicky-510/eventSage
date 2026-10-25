export default function BarChart({ data, height = 160, formatValue = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div
      role="img"
      aria-label="Bar chart"
      style={{ display: 'flex', alignItems: 'flex-end', gap: '0.9rem', height, padding: '0 0.2rem' }}
    >
      {data.map((d) => {
        const pct = Math.max(2, Math.round((d.value / max) * 100));
        return (
          <div key={d.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
              {formatValue(d.value)}
            </span>
            <div
              style={{
                width: '100%',
                maxWidth: 34,
                height: `${pct}%`,
                borderRadius: '8px 8px 2px 2px',
                background: d.color || 'linear-gradient(180deg, var(--color-primary), var(--color-secondary))',
                transition: 'height 0.6s ease',
              }}
            />
            <span
              style={{
                fontSize: '0.72rem',
                marginTop: '0.5rem',
                opacity: 0.75,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 70,
              }}
              title={d.label}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
