import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { DomainEvent, EventSubscription } from '@crewspace/contracts';
import { AuthService } from '../auth/auth.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { PrismaService } from '../prisma.service';
import { InMemoryEventBus } from './event-bus';

interface Connection {
  timer: ReturnType<typeof setTimeout>;
  subscribing: boolean;
  subscription?: EventSubscription;
  queue: DomainEvent[];
  lastSequence: number;
  draining: boolean;
  unsubscribe?: () => void;
}

function isSubscription(value: unknown): value is EventSubscription {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.token === 'string' &&
    data.token.length > 0 &&
    data.token.length <= 1024 &&
    typeof data.workspaceId === 'string' &&
    data.workspaceId.length > 0 &&
    data.workspaceId.length <= 128 &&
    (data.afterSequence === undefined ||
      (Number.isSafeInteger(data.afterSequence) &&
        (data.afterSequence as number) >= 0)) &&
    (data.streamId === undefined || typeof data.streamId === 'string')
  );
}

@WebSocketGateway({ path: '/api/v1/events', maxPayload: 4096 })
export class EventsGateway {
  private readonly connections = new Map<WebSocket, Connection>();

  constructor(
    private readonly eventBus: InMemoryEventBus,
    private readonly auth: AuthService,
    private readonly workspaces: WorkspaceService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: WebSocket): void {
    const timer = setTimeout(
      () => this.close(client, 1008, 'Subscription required'),
      10_000,
    );
    timer.unref();
    this.connections.set(client, {
      timer,
      subscribing: false,
      queue: [],
      lastSequence: 0,
      draining: false,
    });
  }

  handleDisconnect(client: WebSocket): void {
    const state = this.connections.get(client);
    if (!state) return;
    clearTimeout(state.timer);
    state.unsubscribe?.();
    state.queue.length = 0;
    this.connections.delete(client);
  }

  @SubscribeMessage('subscribe')
  async subscribe(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const state = this.connections.get(client);
    if (!state) return;
    if (state.subscribing || !isSubscription(data)) {
      this.close(client, 1008, 'Invalid subscription');
      return;
    }
    state.subscribing = true;
    try {
      const user = await this.auth.resolveToken(data.token);
      await this.workspaces.requireMembership(user.id, data.workspaceId);
      if (!this.active(client, state)) return;
      const afterSequence = data.afterSequence ?? this.eventBus.currentSequence;
      if (
        data.afterSequence !== undefined &&
        data.streamId !== this.eventBus.streamId
      ) {
        this.resync(client);
        return;
      }
      try {
        state.queue = this.eventBus.replay(data.workspaceId, afterSequence);
      } catch {
        this.resync(client);
        return;
      }
      // No await between capturing history and subscribing: live events cannot fall through a gap.
      state.subscription = data;
      state.lastSequence = afterSequence;
      state.unsubscribe = this.eventBus.subscribe((event) => {
        if (event.workspaceId !== data.workspaceId) return;
        if (state.queue.length >= 1000) {
          this.close(client, 1013, 'Delivery queue full; reconnect');
          return;
        }
        state.queue.push(event);
        void this.drain(client, state);
      });
      clearTimeout(state.timer);
      client.send(
        JSON.stringify({
          type: 'subscribed',
          workspaceId: data.workspaceId,
          streamId: this.eventBus.streamId,
          sequence: afterSequence,
        }),
      );
      await this.drain(client, state);
    } catch {
      this.close(client, 1008, 'Subscription denied');
    }
  }

  private async drain(client: WebSocket, state: Connection): Promise<void> {
    if (state.draining || !state.subscription) return;
    state.draining = true;
    try {
      while (this.active(client, state) && state.queue.length > 0) {
        const event = state.queue.shift()!;
        if (event.sequence <= state.lastSequence) continue;
        const { token, workspaceId } = state.subscription;
        const user = await this.auth.resolveToken(token);
        const membership = await this.workspaces.requireMembership(
          user.id,
          workspaceId,
        );
        if (
          event.type === 'MemberInvited' &&
          membership.role !== 'ADMIN' &&
          membership.role !== 'OWNER'
        )
          continue;
        if (event.type === 'MessageCreated') {
          const conversation = await this.prisma.conversation.findFirst({
            where: {
              id: event.payload.conversationId,
              workspaceId,
              members: { some: { userId: user.id } },
            },
          });
          if (!conversation) continue;
        }
        if (!this.active(client, state)) return;
        if (client.bufferedAmount > 1_000_000) {
          this.close(client, 1013, 'Slow consumer; reconnect');
          return;
        }
        client.send(JSON.stringify(event));
        state.lastSequence = event.sequence;
      }
    } catch {
      this.close(client, 1008, 'Subscription denied');
    } finally {
      state.draining = false;
    }
  }

  private active(client: WebSocket, state: Connection): boolean {
    return (
      this.connections.get(client) === state &&
      client.readyState === WebSocket.OPEN
    );
  }

  private resync(client: WebSocket): void {
    client.send(JSON.stringify({ type: 'resync_required' }));
    this.close(client, 1008, 'Event history unavailable; resynchronize');
  }

  private close(client: WebSocket, code: number, reason: string): void {
    this.handleDisconnect(client);
    client.close(code, reason);
  }
}
