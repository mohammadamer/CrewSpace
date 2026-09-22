export type WakeDecisionStatus = 'EXECUTED' | 'NO_ACTION' | 'BLOCKED';

export interface ScheduleState {
  enabled: boolean;
  cadenceMinutes: number;
  timezone: string;
  activeHoursStart: string;
  activeHoursEnd: string;
  cooldownMinutes: number;
  dailyBudget: number;
  budgetUsed: number;
  budgetResetAt?: Date | null;
  lastWakeAt?: Date | null;
  nextWakeAt?: Date | null;
}

export interface WakeDecision {
  status: WakeDecisionStatus;
  reason: string;
}

export class AgentScheduler {
  evaluate(schedule: ScheduleState, now = new Date()): WakeDecision {
    if (!schedule.enabled) {
      return { status: 'NO_ACTION', reason: 'Schedule is disabled' };
    }
    if (
      schedule.dailyBudget <= 0 ||
      schedule.budgetUsed >= schedule.dailyBudget
    ) {
      return {
        status: 'NO_ACTION',
        reason: 'Daily initiative budget exhausted',
      };
    }
    if (schedule.nextWakeAt && now < schedule.nextWakeAt) {
      return { status: 'NO_ACTION', reason: 'Cadence window is not due' };
    }
    if (
      schedule.lastWakeAt &&
      now.getTime() - schedule.lastWakeAt.getTime() <
        schedule.cooldownMinutes * 60_000
    ) {
      return { status: 'NO_ACTION', reason: 'Initiative cooldown is active' };
    }
    if (!this.isWithinActiveHours(schedule, now)) {
      return { status: 'NO_ACTION', reason: 'Outside configured active hours' };
    }
    return { status: 'EXECUTED', reason: 'Scheduled wake cycle is due' };
  }

  validateTimezone(timezone: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    } catch {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
  }

  private isWithinActiveHours(schedule: ScheduleState, now: Date): boolean {
    this.validateTimezone(schedule.timezone);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: schedule.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    const current = hour * 60 + minute;
    const start = this.parseMinutes(schedule.activeHoursStart);
    const end = this.parseMinutes(schedule.activeHoursEnd);
    if (start === end) return true;
    if (start < end) return current >= start && current < end;
    return current >= start || current < end;
  }

  private parseMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    if (
      hours === undefined ||
      minutes === undefined ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new Error(`Invalid active-hours value: ${value}`);
    }
    return hours * 60 + minutes;
  }
}
