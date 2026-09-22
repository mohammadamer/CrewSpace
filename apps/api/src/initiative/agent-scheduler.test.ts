import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentScheduler } from './agent-scheduler';

const schedule = {
  enabled: true,
  cadenceMinutes: 30,
  timezone: 'America/New_York',
  activeHoursStart: '09:00',
  activeHoursEnd: '17:00',
  cooldownMinutes: 10,
  dailyBudget: 2,
  budgetUsed: 0,
  budgetResetAt: null,
  lastWakeAt: null,
  nextWakeAt: null,
};

const dueAt = new Date('2026-09-22T14:00:00.000Z');

test('executes a due wake inside active hours', () => {
  const decision = new AgentScheduler().evaluate(schedule, dueAt);

  assert.deepEqual(decision, {
    status: 'EXECUTED',
    reason: 'Scheduled wake cycle is due',
  });
});

test('returns NO_ACTION outside active hours, during cooldown, or before cadence', () => {
  const scheduler = new AgentScheduler();

  assert.equal(
    scheduler.evaluate(schedule, new Date('2026-09-22T22:00:00.000Z')).reason,
    'Outside configured active hours',
  );
  assert.equal(
    scheduler.evaluate(
      { ...schedule, lastWakeAt: new Date('2026-09-22T13:55:00.000Z') },
      dueAt,
    ).reason,
    'Initiative cooldown is active',
  );
  assert.equal(
    scheduler.evaluate(
      { ...schedule, nextWakeAt: new Date('2026-09-22T14:01:00.000Z') },
      dueAt,
    ).reason,
    'Cadence window is not due',
  );
});

test('returns NO_ACTION for disabled or exhausted schedules', () => {
  const scheduler = new AgentScheduler();

  assert.equal(
    scheduler.evaluate({ ...schedule, enabled: false }, dueAt).reason,
    'Schedule is disabled',
  );
  assert.equal(
    scheduler.evaluate({ ...schedule, budgetUsed: 2 }, dueAt).reason,
    'Daily initiative budget exhausted',
  );
});

test('rejects invalid timezones', () => {
  assert.throws(
    () =>
      new AgentScheduler().evaluate(
        { ...schedule, timezone: 'Mars/Olympus' },
        dueAt,
      ),
    /Invalid timezone/,
  );
});
