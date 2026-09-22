import { Injectable } from '@nestjs/common';
import { DomainEvent } from '@crewspace/contracts';

type EventHandler = (event: DomainEvent) => void;

@Injectable()
export class InMemoryEventBus {
  private readonly handlers = new Set<EventHandler>();
  private readonly history: DomainEvent[] = [];
  private readonly historyLimit = 1_000;
  private sequence = 0;

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  publish(event: Omit<DomainEvent, 'sequence'>): DomainEvent {
    const sequenced = { ...event, sequence: ++this.sequence } as DomainEvent;
    this.history.push(sequenced);
    if (this.history.length > this.historyLimit) this.history.shift();
    for (const handler of this.handlers) handler(sequenced);
    return sequenced;
  }

  replayFrom(sequence: number): {
    events: DomainEvent[];
    complete: boolean;
    oldestSequence: number;
  } {
    const oldestSequence = this.history[0]?.sequence ?? this.sequence + 1;
    return {
      events: this.history.filter((event) => event.sequence > sequence),
      complete: sequence >= oldestSequence - 1,
      oldestSequence,
    };
  }
}
