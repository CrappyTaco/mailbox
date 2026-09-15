export interface Environment {
  APP_ORIGIN: string;
  APP_ORIGINS: string[];
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
function validateOrigin(value: string, variable: string, local: boolean) {
  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    throw new ConfigurationError('invalid_url', [variable]);
  }
  if (origin.hostname.includes('*'))
    throw new ConfigurationError('invalid_url', [variable]);
  if (
    local &&
    (!['localhost', '127.0.0.1'].includes(origin.hostname) ||
      !['http:', 'https:'].includes(origin.protocol))
  )
    throw new ConfigurationError('invalid_local_configuration', [
      'LOCAL_PREVIEW',
      variable,
    ]);
  if (!local && origin.protocol !== 'https:')
    throw new ConfigurationError('https_required', [variable]);
  if (origin.origin !== value)
    throw new ConfigurationError('origin_must_not_include_path', [variable]);
  return value;
}
export function getEnvironment(): Environment {
  const value = process.env.APP_ORIGIN?.trim() ?? '';
  if (!value)
    throw new ConfigurationError('app_origin_missing', ['APP_ORIGIN']);
  const local = process.env.LOCAL_PREVIEW === 'true';
  const primary = validateOrigin(value, 'APP_ORIGIN', local);
  const additional = process.env.APP_ADDITIONAL_ORIGINS?.trim();
  const origins = additional
    ? additional
        .split(',')
        .map((origin) =>
          validateOrigin(origin.trim(), 'APP_ADDITIONAL_ORIGINS', local),
        )
    : [];
  return {
    APP_ORIGIN: primary,
    APP_ORIGINS: [primary, ...origins],
    LOCAL_PREVIEW: local,
  };
}
export async function getDatabase(): Promise<D1Database> {
  // Native server-only binding in Vinext development and the built Worker.
  const { env } = await import('cloudflare:workers');
  if (!env.MAILBOX_DB || typeof env.MAILBOX_DB.prepare !== 'function')
    throw new ConfigurationError('d1_binding_missing', ['MAILBOX_DB']);
  return env.MAILBOX_DB;
}
