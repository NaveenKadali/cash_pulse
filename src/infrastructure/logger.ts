// Minimal redacting JSON-lines logger. Info/debug go to stdout, warn/error to stderr.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

const REDACT_KEY_PATTERN = /token|hash|session|otp|password|secret|utr/i;

function redactFields(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = REDACT_KEY_PATTERN.test(key) ? '[REDACTED]' : value;
  }
  return out;
}

export type Logger = (
  level: LogLevel,
  message: string,
  fields?: LogFields,
) => void;

export function createLogger(): Logger {
  return (level, message, fields = {}) => {
    const line =
      JSON.stringify({
        time: new Date().toISOString(),
        level,
        message,
        ...redactFields(fields),
      }) + '\n';
    if (level === 'warn' || level === 'error') {
      process.stderr.write(line);
    } else {
      process.stdout.write(line);
    }
  };
}
