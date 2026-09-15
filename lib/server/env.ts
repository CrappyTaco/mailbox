export interface Environment {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_ORIGIN: string;
  LOCAL_PREVIEW: boolean;
}
export class ConfigurationError extends Error {
  constructor(
    public code: string,
    public variables: readonly string[],
  ) {
    super(code);
  }
}
export function getEnvironment(): Environment {
  const names = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'APP_ORIGIN',
  ] as const;
  const values = Object.fromEntries(
    names.map((name) => [name, process.env[name]?.trim() ?? '']),
  ) as Omit<Environment, 'LOCAL_PREVIEW'>;
  const missing = names.filter((name) => !values[name]);
  if (missing.length)
    throw new ConfigurationError('server_not_configured', missing);
  const local = process.env.LOCAL_PREVIEW === 'true';
  const parseUrl = (name: 'SUPABASE_URL' | 'APP_ORIGIN') => {
    try {
      return new URL(values[name]);
    } catch {
      throw new ConfigurationError('invalid_url', [name]);
    }
  };
  const database = parseUrl('SUPABASE_URL');
  const origin = parseUrl('APP_ORIGIN');
  const loopback = (host: string) =>
    host === 'localhost' || host === '127.0.0.1';
  if (local && (!loopback(database.hostname) || !loopback(origin.hostname)))
    throw new ConfigurationError('invalid_local_configuration', [
      'LOCAL_PREVIEW',
      'SUPABASE_URL',
      'APP_ORIGIN',
    ]);
  if (
    !local &&
    (database.protocol !== 'https:' || origin.protocol !== 'https:')
  )
    throw new ConfigurationError('https_required', [
      'SUPABASE_URL',
      'APP_ORIGIN',
    ]);
  if (origin.origin !== values.APP_ORIGIN)
    throw new ConfigurationError('origin_must_not_include_path', [
      'APP_ORIGIN',
    ]);
  return { ...values, LOCAL_PREVIEW: local };
}
