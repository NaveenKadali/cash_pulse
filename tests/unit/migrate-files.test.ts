import { describe, expect, it } from 'vitest';
import { parseMigrationFilename } from '../../src/infrastructure/db/migrate.js';

describe('parseMigrationFilename', () => {
  it('accepts NNNN_description.sql', () => {
    expect(parseMigrationFilename('0001_initial.sql')).toEqual({
      version: '0001',
      name: 'initial',
      filename: '0001_initial.sql',
    });
  });

  it('rejects names without a version prefix', () => {
    expect(() => parseMigrationFilename('abc.sql')).toThrow();
  });

  it('rejects non-sql extensions and missing descriptions', () => {
    expect(() => parseMigrationFilename('0001_initial.txt')).toThrow();
    expect(() => parseMigrationFilename('0001_.sql')).toThrow();
  });
});
