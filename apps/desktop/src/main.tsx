import { createRoot } from 'react-dom/client';
import '../../web/src/styles.css';

function DesktopShell() {
  return (
    <main className="content">
      <span className="eyebrow">CREWSPACE DESKTOP</span>
      <h2>Your workspace is ready.</h2>
      <p>
        Desktop notifications and deep links will be enabled here as platform
        capabilities land.
      </p>
      <button className="primary">Open Workspace</button>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<DesktopShell />);
