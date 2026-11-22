// Loads runtime configuration from environment variables. Never logs secrets.

export interface AppConfig {
  readonly databaseUrl: string;
  readonly nodeEnv: string;
  readonly twoFactorApiKey?: string;
  readonly fast2smsApiKey?: string;
  readonly fast2smsRoute?: string;
  readonly smsProvider?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required but was not set');
  }

  let protocol: string;
  try {
    protocol = new URL(databaseUrl).protocol;
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }
  if (protocol !== 'postgres:' && protocol !== 'postgresql:') {
    throw new Error(
      `DATABASE_URL must use the postgres:// or postgresql:// scheme (got "${protocol}")`,
    );
  }

  return {
    databaseUrl,
    nodeEnv: env['NODE_ENV'] ?? 'development',
    twoFactorApiKey: env['TWOFACTOR_API_KEY'],
    fast2smsApiKey: env['FAST2SMS_API_KEY'],
    fast2smsRoute: env['FAST2SMS_ROUTE'] ?? 'otp',
    smsProvider: env['SMS_PROVIDER'] ?? (env['TWOFACTOR_API_KEY'] ? '2factor' : 'fast2sms'),
  };
}
