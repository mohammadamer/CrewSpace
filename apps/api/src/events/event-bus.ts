import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DomainEvent } from '@crewspace/contracts';

type EventHandler = (event: DomainEvent) => void;

@Injectable()
export class InMemoryEventBus {
  private readonly handlers = new Set<EventHandler>();
  private sequence = 0;
  private readonly history: DomainEvent[] = [];
  readonly streamId = randomUUID();

  get currentSequence(): number {
    return this.sequence;
  }

  replay(workspaceId: string, afterSequence: number): DomainEvent[] {
    if (
      !Number.isSafeInteger(afterSequence) ||
      afterSequence < 0 ||
      afterSequence > this.sequence
    ) {
      throw new RangeError('Invalid event cursor');
    }
    const oldest = this.history[0]?.sequence ?? this.sequence + 1;
    if (afterSequence < oldest - 1) throw new RangeError('Event history gap');
    return this.history.filter(
      (event) =>
        event.workspaceId === workspaceId && event.sequence > afterSequence,
    );
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  publish(event: Omit<DomainEvent, 'sequence'>): DomainEvent {
    const sequenced = { ...event, sequence: ++this.sequence } as DomainEvent;
    this.history.push(sequenced);
    if (this.history.length > 1000) this.history.shift();
    for (const handler of this.handlers) handler(sequenced);
    return sequenced;
  }
}
