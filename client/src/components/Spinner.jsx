export default function Spinner({ size = 20, inline = false, label }) {
  const spinner = (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label={label || 'Loading'}
    />
  );

  if (inline) return spinner;

  return (
    <div className="spinner-wrap">
      {spinner}
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}
