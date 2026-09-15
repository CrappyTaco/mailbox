import { hashPasscode } from '../lib/server/auth';
import { createInterface } from 'node:readline/promises';
import { randomBytes } from 'node:crypto';
const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});
console.log('Use a long, unique code. Input is visible only in this terminal.');
const code = await prompt.question('Passcode (leave blank to generate): ');
prompt.close();
const selected = code || randomBytes(18).toString('base64url');
if (selected.length < 12) throw new Error('Use at least 12 characters.');
if (!code) console.log('Generated passcode: ' + selected);
console.log(
  'Hash (quote this value in .env files): ' + (await hashPasscode(selected)),
);
