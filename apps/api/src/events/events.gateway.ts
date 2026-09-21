import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import { DomainEvent } from '@crewspace/contracts';
import { InMemoryEventBus } from './event-bus';

@WebSocketGateway({ path: '/api/v1/events' })
export class EventsGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly eventBus: InMemoryEventBus) {
    eventBus.subscribe((event) => this.broadcast(event));
  }

  private broadcast(event: DomainEvent): void {
    if (!this.server) return;
    const message = JSON.stringify(event);
    for (const client of this.server.clients) {
      if (client.readyState === client.OPEN) client.send(message);
    }
  }
}
