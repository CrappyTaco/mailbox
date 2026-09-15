export interface Environment {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_ORIGIN: string;
  LOCAL_PREVIEW: boolean;
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
  if (names.some((name) => !values[name]))
    throw new Error('server_not_configured');
  const local = process.env.LOCAL_PREVIEW === 'true';
  const database = new URL(values.SUPABASE_URL);
  const origin = new URL(values.APP_ORIGIN);
  const loopback = (host: string) =>
    host === 'localhost' || host === '127.0.0.1';
  if (local && (!loopback(database.hostname) || !loopback(origin.hostname)))
    throw new Error('invalid_local_configuration');
  if (
    !local &&
    (database.protocol !== 'https:' || origin.protocol !== 'https:')
  )
    throw new Error('https_required');
  if (origin.origin !== values.APP_ORIGIN)
    throw new Error('origin_must_not_include_path');
  return { ...values, LOCAL_PREVIEW: local };
}
