import { SignJWT, jwtVerify } from 'jose';
import type { Owner } from '../mailbox-state';
const encoder = new TextEncoder();
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const decode = (text: string) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
export const SESSION_SECONDS = 60 * 60 * 24 * 14;
export const cookieName = (owner: Owner) => `mailbox_${owner}`;
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passcode),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
    key,
    256,
  );
  return `pbkdf2-sha256$100000$${encode(salt)}$${encode(new Uint8Array(bits))}`;
}
export async function verifyPasscode(
  passcode: string,
  hash: string,
): Promise<boolean> {
  try {
    const [algorithm, iterations, salt, expected] = hash.split('$');
    if (algorithm !== 'pbkdf2-sha256' || iterations !== '100000') return false;
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passcode),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const actual = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          hash: 'SHA-256',
          salt: decode(salt),
          iterations: 100000,
        },
        key,
        256,
      ),
    );
    const target = decode(expected);
    if (target.length !== actual.length) return false;
    let difference = 0;
    for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ target[i];
    return difference === 0;
  } catch {
    return false;
  }
}
export async function createSession(
  owner: Owner,
  secret: string,
  passcodeHash: string,
  now = Math.floor(Date.now() / 1000),
) {
  return new SignJWT({ version: await credentialVersion(passcodeHash) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(owner)
    .setIssuer('our-mailbox')
    .setAudience('our-mailbox')
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_SECONDS)
    .sign(encoder.encode(secret));
}
async function credentialVersion(hash: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', encoder.encode(hash)),
  );
  return encode(bytes).slice(0, 20);
}
export async function verifySession(
  token: string | undefined,
  owner: Owner,
  secret: string,
  passcodeHash: string,
) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), {
      algorithms: ['HS256'],
      issuer: 'our-mailbox',
      audience: 'our-mailbox',
    });
    return (
      payload.sub === owner &&
      payload.version === (await credentialVersion(passcodeHash))
    );
  } catch {
    return false;
  }
}
export function sessionCookie(owner: Owner, token: string, local: boolean) {
  return `${cookieName(owner)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${local ? '' : '; Secure'}`;
}
export function getCookie(request: Request, name: string) {
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + '='))
    ?.slice(name.length + 1);
}
export async function privateKey(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return encode(
    new Uint8Array(
      await crypto.subtle.sign('HMAC', key, encoder.encode(value)),
    ),
  );
}
