export const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export function isIdleExpired(lastActivityAt: Date, now: Date, idleTimeoutMs: number): boolean {
  return now.getTime() - lastActivityAt.getTime() >= idleTimeoutMs;
}
