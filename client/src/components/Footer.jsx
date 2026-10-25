import { SparkleIcon } from './icons.jsx';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="brand">
        <SparkleIcon aria-hidden="true" />
        EventSage
      </div>
      <p style={{ margin: 0 }}>AI-powered celebration planning. Built for PromptWars Virtual.</p>
    </footer>
  );
}
