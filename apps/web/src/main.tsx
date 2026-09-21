import { FormEvent, StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface WorkspaceMembership {
  workspace: { id: string; name: string };
  role: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok)
    throw new Error((await response.json()).message ?? 'Request failed');
  return response.json() as Promise<T>;
}

function Login({
  onAuthenticated,
}: {
  onAuthenticated: (token: string, user: User) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await request<{ token: string; user: User }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );
      onAuthenticated(result.token, result.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in');
    }
  }

  return (
    <main className="auth-card">
      <span className="eyebrow">CREWSPACE</span>
      <h1>Welcome back.</h1>
      <p>Sign in to return to your team.</p>
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
            minLength={8}
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
}

function App() {
  const [token, setToken] = useState(() =>
    localStorage.getItem('crewspace.session'),
  );
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);

  useEffect(() => {
    if (!token) return;
    void Promise.all([
      request<{ user: User }>('/auth/session', { method: 'POST' }, token),
      request<WorkspaceMembership[]>('/workspaces', {}, token),
    ])
      .then(([session, memberships]) => {
        setUser(session.user);
        setWorkspaces(memberships);
      })
      .catch(() => {
        localStorage.removeItem('crewspace.session');
        setToken(null);
      });
  }, [token]);

  function authenticated(nextToken: string, nextUser: User) {
    localStorage.setItem('crewspace.session', nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  if (!token || !user) return <Login onAuthenticated={authenticated} />;

  return (
    <main className="shell">
      <aside className="sidebar">
        <p className="eyebrow">CREWSPACE</p>
        <h1>{workspaces[0]?.workspace.name ?? 'Your team, present.'}</h1>
        <nav aria-label="Primary navigation">
          {[
            'Home',
            'Inbox',
            'Workspace',
            'Projects',
            'Agents',
            'Tasks',
            'Decisions',
            'Settings',
          ].map((item) => (
            <button
              className={item === 'Home' ? 'nav-item active' : 'nav-item'}
              key={item}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>
      <section className="content">
        <header>
          <span className="eyebrow">
            {user.displayName.toUpperCase()} · {workspaces[0]?.role ?? 'MEMBER'}
          </span>
          <h2>Good morning, {user.displayName}.</h2>
          <p>Your team has been busy while you were away.</p>
        </header>
        <section className="grid" aria-label="Team activity">
          <article>
            <span className="badge">ATLAS</span>
            <h3>Authentication research is ready</h3>
            <p>
              Atlas finished comparing the leading options and left evidence for
              review.
            </p>
            <button className="text-button">Open research</button>
          </article>
          <article>
            <span className="badge coral">IRIS</span>
            <h3>Onboarding proposal updated</h3>
            <p>
              Iris challenged the first-run flow and prepared a tighter
              alternative.
            </p>
            <button className="text-button">View proposal</button>
          </article>
          <article className="attention">
            <span className="badge dark">NEEDS YOUR ATTENTION</span>
            <h3>Database architecture disagreement</h3>
            <p>Atlas and Bram have different recommendations.</p>
            <button className="primary">Open Convene</button>
          </article>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
