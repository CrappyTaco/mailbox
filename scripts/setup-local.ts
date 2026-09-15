import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { hashPasscode } from '../lib/server/auth';
await mkdir('public/fonts', { recursive: true });
for (const weight of [400, 600])
  await copyFile(
    `node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-${weight}-normal.woff2`,
    `public/fonts/pixelify-sans-latin-${weight}-normal.woff2`,
  );
await copyFile(
  'node_modules/@fontsource/pixelify-sans/LICENSE',
  'public/fonts/LICENSE.txt',
);
let exists = false;
try {
  await readFile('.env.local');
  exists = true;
} catch {}
if (!exists) {
  const indi = randomBytes(9).toString('base64url');
  const auggie = randomBytes(9).toString('base64url');
  const env = `LOCAL_PREVIEW=true\nAPP_ORIGIN=http://localhost:3000\nSUPABASE_URL=http://127.0.0.1:55432\nSUPABASE_SERVICE_ROLE_KEY=${randomBytes(32).toString('hex')}\nSESSION_SECRET=${randomBytes(48).toString('hex')}\nINDI_PASSCODE_HASH='${await hashPasscode(indi)}'\nAUGGIE_PASSCODE_HASH='${await hashPasscode(auggie)}'\n`;
  await writeFile('.env.local', env, { mode: 0o600 });
  await writeFile('.dev.vars', env, { mode: 0o600 });
  await writeFile(
    'LOCAL-ACCESS.md',
    `# Your local mailbox keys\n\nThis ignored file is only for this local preview. Keep it private.\n\n- Indi: \`${indi}\`\n- Auggie: \`${auggie}\`\n\nOpen http://localhost:3000/indi or http://localhost:3000/auggie.\nThese random codes are stored only here. The application stores salted hashes.\nGenerate new production codes before connecting Supabase.\n`,
    { mode: 0o600 },
  );
  console.log(
    'Local environment created. Your random passcodes are in LOCAL-ACCESS.md.',
  );
} else {
  try {
    await readFile('.dev.vars');
  } catch {
    await copyFile('.env.local', '.dev.vars');
  }
  console.log('Preserved existing local environment. Fonts copied.');
}
