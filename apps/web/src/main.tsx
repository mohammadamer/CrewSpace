import { FormEvent, StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const starterNames = ['Atlas', 'Iris', 'Bram', 'Nova'];

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface WorkspaceMembership {
  workspace: { id: string; name: string };
  role: string;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
}

interface Conversation {
  id: string;
  type: string;
  members: Array<{ userId: string | null; agentId: string | null }>;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  authorUserId: string | null;
  authorAgentId: string | null;
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
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    throw new Error(
      Array.isArray(result.message)
        ? result.message.join(', ')
        : (result.message ?? 'Request failed'),
    );
  }
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
    setError('');
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
  const [workspace, setWorkspace] = useState<WorkspaceMembership | null>(null);
  const [teammates, setTeammates] = useState<
    Array<{ agent: Agent; conversation: Conversation }>
  >([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLLIElement>(null);
  const selected = teammates.find(
    (teammate) => teammate.conversation.id === selectedConversationId,
  );

  useEffect(() => {
    if (!token) return;
    let current = true;
    setLoading(true);
    setError('');
    void (async () => {
      const [session, memberships] = await Promise.all([
        request<{ user: User }>('/auth/session', { method: 'POST' }, token),
        request<WorkspaceMembership[]>('/workspaces', {}, token),
      ]);
      if (!current) return;
      const activeWorkspace = memberships[0] ?? null;
      setUser(session.user);
      setWorkspace(activeWorkspace);
      if (!activeWorkspace) {
        setTeammates([]);
        setLoading(false);
        return;
      }
      if (['OWNER', 'ADMIN'].includes(activeWorkspace.role)) {
        try {
          await request(
            `/workspaces/${activeWorkspace.workspace.id}/onboarding/initialize`,
            { method: 'POST', body: JSON.stringify({}) },
            token,
          );
        } catch (cause) {
          if (!current) return;
          setError(
            cause instanceof Error
              ? cause.message
              : 'Could not prepare your teammates.',
          );
        }
      }
      const root = `/workspaces/${activeWorkspace.workspace.id}`;
      const [agents, conversations] = await Promise.all([
        request<Agent[]>(`${root}/agents`, {}, token),
        request<Conversation[]>(`${root}/conversations`, {}, token),
      ]);
      if (!current) return;
      const pairs = agents
        .filter((agent) => starterNames.includes(agent.name))
        .sort(
          (left, right) =>
            starterNames.indexOf(left.name) - starterNames.indexOf(right.name),
        )
        .flatMap((agent) => {
          const conversation = conversations.find(
            (candidate) =>
              candidate.type === 'DIRECT' &&
              candidate.members.length === 2 &&
              candidate.members.some((member) => member.agentId === agent.id) &&
              candidate.members.some(
                (member) => member.userId === session.user.id,
              ),
          );
          return conversation ? [{ agent, conversation }] : [];
        });
      setTeammates(pairs);
      setSelectedConversationId((selectedId) =>
        pairs.some((pair) => pair.conversation.id === selectedId)
          ? selectedId
          : (pairs[0]?.conversation.id ?? ''),
      );
    })()
      .catch((cause: unknown) => {
        if (!current) return;
        localStorage.removeItem('crewspace.session');
        setToken(null);
        setUser(null);
        setWorkspace(null);
        setError(
          cause instanceof Error ? cause.message : 'Unable to load workspace.',
        );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !workspace || !selectedConversationId) {
      setMessages([]);
      return;
    }
    let current = true;
    setMessages([]);
    void request<{
      items: Message[];
    }>(
      `/workspaces/${workspace.workspace.id}/conversations/${selectedConversationId}/messages?limit=100`,
      {},
      token,
    )
      .then(({ items }) => {
        if (current) setMessages(items.reverse());
      })
      .catch((cause: unknown) => {
        if (current)
          setError(
            cause instanceof Error ? cause.message : 'Unable to load messages.',
          );
      });
    return () => {
      current = false;
    };
  }, [token, workspace, selectedConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  function authenticated(nextToken: string, nextUser: User) {
    localStorage.setItem('crewspace.session', nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!token || !workspace || !selected || !draft.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const root = `/workspaces/${workspace.workspace.id}/conversations/${selected.conversation.id}/messages`;
      await request(
        root,
        {
          method: 'POST',
          body: JSON.stringify({ content: draft }),
        },
        token,
      );
      const result = await request<{ items: Message[] }>(
        `${root}?limit=100`,
        {},
        token,
      );
      setMessages(result.items.reverse());
      setDraft('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to send your message.',
      );
    } finally {
      setSending(false);
    }
  }

  if (!token || !user) return <Login onAuthenticated={authenticated} />;

  return (
    <main className="chat-shell">
      <aside className="team-sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <div>
            <p className="eyebrow">CREWSPACE</p>
            <span className="workspace-name">
              {workspace?.workspace.name ?? 'Your workspace'}
            </span>
          </div>
        </div>
        <div className="team-heading">
          <span className="eyebrow">YOUR TEAM</span>
          <span className="team-count">
            {teammates.length.toString().padStart(2, '0')}
          </span>
        </div>
        <nav className="teammate-list" aria-label="Teammates">
          {teammates.map(({ agent, conversation }) => (
            <button
              aria-current={
                selectedConversationId === conversation.id ? 'page' : undefined
              }
              className={
                selectedConversationId === conversation.id
                  ? 'teammate selected'
                  : 'teammate'
              }
              key={agent.id}
              onClick={() => setSelectedConversationId(conversation.id)}
              type="button"
            >
              <span className={`avatar avatar-${agent.name.toLowerCase()}`}>
                {agent.name.slice(0, 1)}
              </span>
              <span className="teammate-copy">
                <strong>{agent.name}</strong>
                <small>{agent.role}</small>
              </span>
              <span className="online-dot" aria-label="Ready" />
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="user-avatar">{user.displayName.slice(0, 1)}</span>
          <span>
            <strong>{user.displayName}</strong>
            <small>{workspace?.role ?? 'MEMBER'}</small>
          </span>
        </div>
      </aside>
      <section className="conversation-panel">
        {selected ? (
          <>
            <header className="conversation-header">
              <div
                className={`avatar avatar-${selected.agent.name.toLowerCase()}`}
              >
                {selected.agent.name.slice(0, 1)}
              </div>
              <div>
                <span className="eyebrow">DIRECT CONVERSATION</span>
                <h1>{selected.agent.name}</h1>
                <p>{selected.agent.role} · Ready to help</p>
              </div>
              <span className="mock-label">MOCK TEAMMATE</span>
            </header>
            <div className="message-scroll">
              <div className="day-divider">
                <span>YOUR CONVERSATION</span>
              </div>
              <ol
                className="message-list"
                aria-label="Messages"
                aria-live="polite"
              >
                {messages.map((message) => {
                  const fromAgent = message.authorAgentId === selected.agent.id;
                  return (
                    <li
                      className={
                        fromAgent
                          ? 'message agent-message'
                          : 'message user-message'
                      }
                      key={message.id}
                    >
                      <span
                        className={
                          fromAgent
                            ? 'message-avatar'
                            : 'message-avatar user-message-avatar'
                        }
                      >
                        {fromAgent
                          ? selected.agent.name.slice(0, 1)
                          : user.displayName.slice(0, 1)}
                      </span>
                      <div className="message-body">
                        <div className="message-meta">
                          <strong>
                            {fromAgent ? selected.agent.name : user.displayName}
                          </strong>
                          <time dateTime={message.createdAt}>
                            {new Date(message.createdAt).toLocaleTimeString(
                              [],
                              { hour: 'numeric', minute: '2-digit' },
                            )}
                          </time>
                        </div>
                        <p>{message.content}</p>
                      </div>
                    </li>
                  );
                })}
                {loading && <li className="quiet-state">Loading your team…</li>}
                {!loading && messages.length === 0 && (
                  <li className="quiet-state">
                    Start a conversation with {selected.agent.name}.
                  </li>
                )}
                <li aria-hidden="true" ref={bottomRef} />
              </ol>
            </div>
            <form className="composer" onSubmit={sendMessage}>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <label className="sr-only" htmlFor="message-draft">
                Message {selected.agent.name}
              </label>
              <textarea
                id="message-draft"
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Message ${selected.agent.name}…`}
                value={draft}
                rows={2}
              />
              <div className="composer-footer">
                <span>Replies are generated locally for this MVP.</span>
                <button
                  className="primary send-button"
                  disabled={sending || !draft.trim()}
                  type="submit"
                >
                  {sending ? 'Sending…' : 'Send'}{' '}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="empty-workspace">
            <span className="eyebrow">A SMALL TEAM, READY WHEN YOU ARE</span>
            <h1>
              {loading ? 'Setting the table…' : 'Make room for a good idea.'}
            </h1>
            <p>
              {workspace
                ? 'Your workspace is ready. Your teammates will show up here as soon as they’re set up.'
                : 'Create a workspace to meet your AI teammates.'}
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
