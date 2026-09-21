import { FormEvent, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../web/src/styles.css';

function DesktopShell() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      setError('Unable to sign in');
      return;
    }
    setSignedIn(true);
  }

  if (!signedIn)
    return (
      <main className="auth-card">
        <span className="eyebrow">CREWSPACE DESKTOP</span>
        <h1>Welcome back.</h1>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit">
            Sign in
          </button>
        </form>
      </main>
    );

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
