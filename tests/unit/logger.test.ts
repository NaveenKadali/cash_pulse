import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../../src/infrastructure/logger.js';

describe('createLogger', () => {
  let stdout: ReturnType<typeof vi.spyOn>;
  let stderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts token, otp, and utr keys', () => {
    const log = createLogger();
    log('info', 'payment received', {
      token: 'abc',
      otp: '123456',
      utr: 'UTR0001',
      amount: 500,
    });

    const line = String(stdout.mock.calls[0]?.[0]);
    const parsed = JSON.parse(line);
    expect(parsed.token).toBe('[REDACTED]');
    expect(parsed.otp).toBe('[REDACTED]');
    expect(parsed.utr).toBe('[REDACTED]');
    expect(parsed.amount).toBe(500);
    expect(parsed.message).toBe('payment received');
    expect(parsed.level).toBe('info');
    expect(line).not.toContain('UTR0001');
  });

  it('redacts hash, session, password, and secret keys case-insensitively', () => {
    const log = createLogger();
    log('error', 'failure', {
      passwordHash: 'x',
      SessionId: 'y',
      clientSecret: 'z',
    });

    const parsed = JSON.parse(String(stderr.mock.calls[0]?.[0]));
    expect(parsed.passwordHash).toBe('[REDACTED]');
    expect(parsed.SessionId).toBe('[REDACTED]');
    expect(parsed.clientSecret).toBe('[REDACTED]');
  });

  it('writes warn and error to stderr', () => {
    const log = createLogger();
    log('warn', 'careful', {});
    expect(stderr).toHaveBeenCalledTimes(1);
    expect(stdout).not.toHaveBeenCalled();
  });
});
