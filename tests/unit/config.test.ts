import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/infrastructure/config.js';

describe('loadConfig', () => {
  it('throws when DATABASE_URL is missing', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it('accepts a postgres:// URL and defaults NODE_ENV', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/cashpulse',
    });
    expect(config.databaseUrl).toBe(
      'postgres://user:pass@localhost:5432/cashpulse',
    );
    expect(config.nodeEnv).toBe('development');
  });

  it('accepts a postgresql:// URL', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/cashpulse',
      NODE_ENV: 'test',
    });
    expect(config.nodeEnv).toBe('test');
  });

  it('rejects a mysql:// URL', () => {
    expect(() =>
      loadConfig({ DATABASE_URL: 'mysql://user:pass@localhost:3306/cashpulse' }),
    ).toThrow(/postgres/);
  });

  it('does not echo the secret URL in the error message', () => {
    try {
      loadConfig({ DATABASE_URL: 'mysql://user:hunter2@localhost/db' });
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).not.toContain('hunter2');
    }
  });
});
