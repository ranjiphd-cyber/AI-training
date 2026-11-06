// Runtime configuration with fail-closed startup guards.
export type AppEnv = 'development' | 'test' | 'production';
export type AuthMode = 'demo' | 'oidc';

export interface AppConfig {
  appEnv: AppEnv;
  authMode: AuthMode;
  databaseUrl: string;
  port: number;
  host: string;
  cookieSecure: boolean;
  sessionTtlMinutes: number;
  defaultTimezone: string;
}

export class StartupRefusedError extends Error {}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const appEnv = (env.APP_ENV ?? 'development') as AppEnv;
  if (!['development', 'test', 'production'].includes(appEnv)) {
    throw new StartupRefusedError(`APP_ENV must be development|test|production (got "${appEnv}")`);
  }
  const authMode = (env.AUTH_MODE ?? (appEnv === 'production' ? '' : 'demo')) as AuthMode;

  // Mandatory test 28: demo authentication can never start in production.
  if (appEnv === 'production' && authMode === 'demo') {
    throw new StartupRefusedError(
      'Refusing to start: AUTH_MODE=demo is prohibited when APP_ENV=production. ' +
        'Configure the approved enterprise identity provider (decision D-06).');
  }
  if (authMode === 'oidc') {
    // Fail closed: the identity provider has not been selected, so no OIDC implementation is shipped.
    throw new StartupRefusedError(
      'Refusing to start: AUTH_MODE=oidc is blocked pending identity-provider decision D-06. ' +
        'No production authentication adapter is configured.');
  }
  if (authMode !== 'demo') {
    throw new StartupRefusedError('Refusing to start: AUTH_MODE is not configured.');
  }
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new StartupRefusedError('Refusing to start: DATABASE_URL is not set.');

  return {
    appEnv,
    authMode,
    databaseUrl,
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? '127.0.0.1',
    cookieSecure: (env.COOKIE_SECURE ?? (appEnv === 'production' ? 'true' : 'false')) === 'true',
    sessionTtlMinutes: Number(env.SESSION_TTL_MINUTES ?? 480),
    defaultTimezone: 'Asia/Kolkata',
  };
}
