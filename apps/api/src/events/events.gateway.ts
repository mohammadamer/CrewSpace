import { IncomingMessage } from 'node:http';
import { Inject, Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { DomainEvent } from '@crewspace/contracts';
import { AuthService } from '../auth/auth.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { InMemoryEventBus } from './event-bus';

@WebSocketGateway({ path: '/api/v1/events' })
@Injectable()
export class EventsGateway {
  @WebSocketServer()
  server!: Server;

  private readonly clients = new WeakMap<
    WebSocket,
    { userId: string; workspaceId: string; lastSequence: number }
  >();

  constructor(
    @Inject(InMemoryEventBus) private readonly eventBus: InMemoryEventBus,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(WorkspaceService) private readonly workspaces: WorkspaceService,
  ) {
    eventBus.subscribe((event) => this.broadcast(event));
  }

  async handleConnection(client: WebSocket, request: IncomingMessage) {
    try {
      const url = new URL(
        request.url ?? '/',
        `http://${request.headers.host ?? 'localhost'}`,
      );
      const token = this.readToken(request, url);
      const workspaceId = url.searchParams.get('workspaceId');
      if (!token || !workspaceId)
        throw new Error('Authenticated Workspace subscription required');
      const user = await this.auth.resolveToken(token);
      await this.workspaces.requireMembership(user.id, workspaceId);
      const since = this.readSequence(url.searchParams.get('since'));
      const replay = this.eventBus.replayFrom(since);
      if (!replay.complete) {
        this.send(client, {
          type: 'ReplayUnavailable',
          oldestSequence: replay.oldestSequence,
        });
        client.close(1013, 'Event history unavailable');
        return;
      }
      const state = { userId: user.id, workspaceId, lastSequence: since };
      this.clients.set(client, state);
      for (const event of replay.events) {
        if (this.matchesWorkspace(event, workspaceId)) {
          this.send(client, event);
          state.lastSequence = Math.max(state.lastSequence, event.sequence);
        }
      }
      this.send(client, {
        type: 'RealtimeReady',
        workspaceId,
        sequence: state.lastSequence,
      });
    } catch {
      client.close(1008, 'Unauthorized event subscription');
    }
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
  }

  private broadcast(event: DomainEvent): void {
    if (!this.server) return;
    for (const client of this.server.clients) {
      const state = this.clients.get(client);
      if (
        state &&
        client.readyState === WebSocket.OPEN &&
        event.sequence > state.lastSequence &&
        this.matchesWorkspace(event, state.workspaceId)
      ) {
        this.send(client, event);
        state.lastSequence = event.sequence;
      }
    }
  }

  private readToken(request: IncomingMessage, url: URL) {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
    return url.searchParams.get('token');
  }

  private readSequence(value: string | null) {
    if (!value) return 0;
    const sequence = Number(value);
    return Number.isSafeInteger(sequence) && sequence >= 0 ? sequence : 0;
  }

  private matchesWorkspace(event: DomainEvent, workspaceId: string) {
    return event.workspaceId === null || event.workspaceId === workspaceId;
  }

  private send(client: WebSocket, payload: unknown) {
    if (client.readyState === WebSocket.OPEN)
      client.send(JSON.stringify(payload));
  }
}
