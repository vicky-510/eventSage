/**
 * Inline spinners sit inside buttons whose text already says what's happening
 * ("Creating…"), so they're decorative. The standalone variant is a polite live
 * region so screen readers announce the loading state.
 */
export default function Spinner({ size = 20, inline = false, label = 'Loading…' }) {
  const spinner = <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;

  if (inline) return spinner;

  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      {spinner}
      <span className="spinner-label">{label}</span>
    </div>
  );
}
