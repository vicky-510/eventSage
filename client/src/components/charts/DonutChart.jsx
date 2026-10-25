const PALETTE = ['var(--color-primary)', 'var(--color-secondary)', '#b8862c', 'var(--color-success)', 'var(--color-danger)', '#7c8a5a'];

export default function DonutChart({ data, size = 160, thickness = 22, centerLabel, centerValue }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel || 'Breakdown chart'}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-alt)" strokeWidth={thickness} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const circle = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color || PALETTE[i % PALETTE.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap={data.length > 1 ? 'butt' : 'round'}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            );
            offset += dash;
            return circle;
          })}
        </g>
        {(centerLabel || centerValue) && (
          <g textAnchor="middle">
            <text x="50%" y="47%" fontSize="1.1rem" fontWeight="700" fill="var(--color-primary-dark)" fontFamily="var(--font-heading)">
              {centerValue}
            </text>
            <text x="50%" y="60%" fontSize="0.65rem" fill="var(--color-text)" opacity="0.7">
              {centerLabel}
            </text>
          </g>
        )}
      </svg>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {data.map((d, i) => (
          <li key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: d.color || PALETTE[i % PALETTE.length],
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span>{d.label}</span>
            <span style={{ opacity: 0.6 }}>{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
