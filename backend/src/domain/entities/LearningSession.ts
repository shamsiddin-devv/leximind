import { ConflictError } from '../errors/ConflictError';
import { BadRequestError } from '../errors/BadRequestError';
export interface SessionData {
  id: string;
  userId: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  startedAt: Date;
  endedAt: Date | null;
}
export class LearningSession {
  constructor(readonly data: SessionData) {}
  assertActive() {
    if (this.data.status !== 'in_progress')
      throw new ConflictError('Session is no longer active.');
  }
  complete(remaining: number, now: Date) {
    this.assertActive();
    if (remaining > 0) throw new ConflictError('Complete all tasks first.');
    this.data.status = 'completed';
    this.data.endedAt = now;
  }
  cancel(now: Date) {
    if (this.data.status === 'cancelled') return;
    this.assertActive();
    this.data.status = 'cancelled';
    this.data.endedAt = now;
  }
}
export function nextStreak(
  previous: Date | null,
  current: Date,
  timezone: string,
  streak: number,
): number {
  const day = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  if (!previous) return 1;
  const difference =
    (Date.parse(day(current)) - Date.parse(day(previous))) / 86400000;
  return difference === 0 ? streak : difference === 1 ? streak + 1 : 1;
}
export function validateTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
  } catch {
    throw new BadRequestError('Invalid IANA timezone.');
  }
}
