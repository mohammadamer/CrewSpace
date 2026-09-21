import { Injectable } from '@nestjs/common';
import { DomainEvent } from '@crewspace/contracts';

type EventHandler = (event: DomainEvent) => void;

@Injectable()
export class InMemoryEventBus {
  private readonly handlers = new Set<EventHandler>();
  private sequence = 0;

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  publish(event: Omit<DomainEvent, 'sequence'>): DomainEvent {
    const sequenced = { ...event, sequence: ++this.sequence } as DomainEvent;
    for (const handler of this.handlers) handler(sequenced);
    return sequenced;
  }
}
