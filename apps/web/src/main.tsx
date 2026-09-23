import { FormEvent, StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const apiUrl = import.meta.env.VITE_API_URL ?? '/api/v1';

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
}

interface Conversation {
  id: string;
  title?: string | null;
  members: Array<{ userId?: string; agentId?: string }>;
}

interface Message {
  id: string;
  content: string;
  authorUserId?: string | null;
  authorAgentId?: string | null;
  createdAt: string;
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
  const [registering, setRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await request<{ token: string; user: User }>(
        registering ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(
            registering ? { displayName, email, password } : { email, password },
          ),
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
      <p>{registering ? 'Create your first workspace.' : 'Sign in to return to your team.'}</p>
      <form onSubmit={submit}>
        {registering && (
          <label>
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={2}
              required
            />
          </label>
        )}
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
          {registering ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <button className="text-button auth-switch" onClick={() => setRegistering(!registering)}>
        {registering ? 'Already have an account? Sign in' : 'New to CrewSpace? Create an account'}
      </button>
    </main>
  );
}

function CreateWorkspace({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const token = localStorage.getItem('crewspace.session')!;

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await request('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }, token);
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create workspace');
    }
  }

  return (
    <main className="auth-card">
      <span className="eyebrow">FIRST STEP</span>
      <h1>Create a workspace.</h1>
      <p>Give your team a shared place to work with its AI teammates.</p>
      <form onSubmit={submit}>
        <label>
          Workspace name
          <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit">Create workspace</button>
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
  const [workspaceId, setWorkspaceId] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const seededWorkspaces = useRef(new Set<string>());

  useEffect(() => {
    if (!token) return;
    void Promise.all([
      request<{ user: User }>('/auth/session', { method: 'POST' }, token),
      request<WorkspaceMembership[]>('/workspaces', {}, token),
    ])
      .then(([session, memberships]) => {
        setUser(session.user);
        setWorkspaces(memberships);
        setWorkspaceId(memberships[0]?.workspace.id ?? '');
      })
      .catch(() => {
        localStorage.removeItem('crewspace.session');
        setToken(null);
      });
  }, [token]);

  useEffect(() => {
    if (!token || !workspaceId) return;
    void (async () => {
      try {
        let [nextAgents, nextConversations] = await Promise.all([
          request<Agent[]>(`/workspaces/${workspaceId}/agents`, {}, token),
          request<Conversation[]>(`/workspaces/${workspaceId}/conversations`, {}, token),
        ]);
        if (!nextAgents.length && !seededWorkspaces.current.has(workspaceId)) {
          seededWorkspaces.current.add(workspaceId);
          await request(
            `/workspaces/${workspaceId}/demo-data`,
            { method: 'POST' },
            token,
          );
          [nextAgents, nextConversations] = await Promise.all([
            request<Agent[]>(`/workspaces/${workspaceId}/agents`, {}, token),
            request<Conversation[]>(`/workspaces/${workspaceId}/conversations`, {}, token),
          ]);
        }
        setAgents(nextAgents);
        setConversations(nextConversations);
        setSelectedConversationId((current) => current || nextConversations[0]?.id || '');
      } catch (cause) {
        seededWorkspaces.current.delete(workspaceId);
        setError(cause instanceof Error ? cause.message : 'Unable to load workspace');
      }
    })();
  }, [token, workspaceId]);

  useEffect(() => {
    const conversationId = selectedConversationId;
    if (!token || !workspaceId || !conversationId) return;
    void request<{ items: Message[] }>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
      {},
      token,
    )
      .then((result) => setMessages(result.items.reverse()))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load messages'));
  }, [selectedConversationId, token, workspaceId]);

  function authenticated(nextToken: string, nextUser: User) {
    localStorage.setItem('crewspace.session', nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  if (!token || !user) return <Login onAuthenticated={authenticated} />;
  if (workspaces.length === 0) return <CreateWorkspace onCreated={() => window.location.reload()} />;

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const selectedAgent = agents.find((agent) =>
    selectedConversation?.members.some((member) => member.agentId === agent.id),
  );

  async function createAgent() {
    try {
      const agent = await request<Agent>(
        `/workspaces/${workspaceId}/agents`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Atlas',
            role: 'Researcher',
            modelConfiguration: {},
            capabilities: [],
          }),
        },
        token ?? undefined,
      );
      setAgents([...agents, agent]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create Agent');
    }
  }

  async function createConversation() {
    if (!agents[0]) return;
    try {
      const conversation = await request<Conversation>(
        `/workspaces/${workspaceId}/conversations`,
        {
          method: 'POST',
          body: JSON.stringify({ type: 'DIRECT', title: `You and ${agents[0].name}`, agentIds: [agents[0].id] }),
        },
        token ?? undefined,
      );
      setConversations([conversation]);
      setSelectedConversationId(conversation.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create conversation');
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const conversationId = selectedConversationId;
    if (!conversationId || !message.trim()) return;
    try {
      const created = await request<Message>(
        `/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
        { method: 'POST', body: JSON.stringify({ content: message }) },
        token ?? undefined,
      );
      const reply = await request<Message>(
        `/workspaces/${workspaceId}/conversations/${conversationId}/demo-reply`,
        { method: 'POST', body: JSON.stringify({ content: message }) },
        token ?? undefined,
      );
      setMessages([...messages, created, reply]);
      setMessage('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send message');
    }
  }

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
          <p>Start a conversation with your team.</p>
        </header>
        <section className="workspace-panel" aria-label="Workspace conversation">
          <div className="panel-heading">
            <div>
              <span className="badge">WORKSPACE</span>
              <h3>{workspaces.find((item) => item.workspace.id === workspaceId)?.workspace.name}</h3>
            </div>
            {!agents.length && <button className="primary" onClick={createAgent}>Add Atlas</button>}
          </div>
          {agents.length > 0 && (
            <div className="teammate-list" aria-label="Teammates">
              {agents.map((agent) => {
                const conversation = conversations.find((item) =>
                  item.members.some((member) => member.agentId === agent.id),
                );
                return (
                  <button
                    className={conversation?.id === selectedConversationId ? 'teammate active' : 'teammate'}
                    key={agent.id}
                    onClick={() => conversation && setSelectedConversationId(conversation.id)}
                    type="button"
                  >
                    <strong>{agent.name}</strong>
                    <span>{agent.role}</span>
                  </button>
                );
              })}
            </div>
          )}
          {!agents.length && <p>Create an Agent to start your first conversation.</p>}
          {agents.length > 0 && !conversations.length && (
            <div className="empty-state">
              <p>{agents[0]?.name} is ready to meet you.</p>
              <button className="primary" onClick={createConversation}>Start conversation</button>
            </div>
          )}
          {conversations.length > 0 && (
            <>
              <div className="conversation-heading">
                <span className="badge">{selectedAgent?.name.toUpperCase()}</span>
                <h3>{selectedConversation?.title}</h3>
              </div>
              <div className="messages">
                {messages.map((item) => (
                  <article className={item.authorUserId === user.id ? 'message own' : 'message'} key={item.id}>
                    <span className="badge">{item.authorUserId === user.id ? 'YOU' : selectedAgent?.name.toUpperCase()}</span>
                    <p>{item.content}</p>
                  </article>
                ))}
                {!messages.length && <p className="muted">No messages yet. Say hello.</p>}
              </div>
              <form className="composer" onSubmit={sendMessage}>
                <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message" required />
                <button className="primary" type="submit">Send</button>
              </form>
            </>
          )}
          {error && <p className="error">{error}</p>}
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
