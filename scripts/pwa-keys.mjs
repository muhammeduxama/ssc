import fs from 'node:fs';
import path from 'node:path';
import { generateVAPIDKeys } from 'web-push';

// Write directly to the local environment file: never print private keys.
const file = path.resolve('.env');
let content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const value = key => content.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1].trim().replace(/^['"]|['"]$/g, '');
const put = (key, val) => {
  const line = `${key}=${val}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  content = pattern.test(content) ? content.replace(pattern, () => line) : `${content.trimEnd()}\n${line}\n`;
};
if (!!value('VAPID_PUBLIC_KEY') !== !!value('VAPID_PRIVATE_KEY')) {
  throw new Error('Only one VAPID key is set. Restore the matching pair before continuing.');
}
if (value('VAPID_PUBLIC_KEY')) {
  console.log('Existing VAPID keys kept. No keys were changed.');
} else {
  const keys = generateVAPIDKeys();
  put('VAPID_PUBLIC_KEY', keys.publicKey);
  put('VAPID_PRIVATE_KEY', keys.privateKey);
  if (!value('PUSH_ENABLED')) put('PUSH_ENABLED', 'true');
  if (!value('VAPID_SUBJECT')) put('VAPID_SUBJECT', 'mailto:info@smartservicingcentre.co.uk');
  fs.writeFileSync(file, content, { mode: 0o600 });
  console.log('VAPID keys saved to .env. Set PUSH_ENABLED=true and confirm VAPID_SUBJECT uses your contact email.');
}
