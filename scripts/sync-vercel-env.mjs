import fs from 'fs';
import { spawnSync } from 'child_process';

function parseEnv(path) {
  const o = {};
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) o[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return o;
}

const env = parseEnv('.env');
const keys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

for (const key of keys) {
  const value = env[key];
  if (!value) {
    console.error(`Missing ${key} in .env`);
    process.exit(1);
  }

  for (const target of ['production', 'preview', 'development']) {
    console.log(`Removing ${key} from ${target} (ignore errors)...`);
    spawnSync('npx', ['vercel', 'env', 'rm', key, target, '-y'], {
      stdio: 'inherit',
      shell: true,
    });

    console.log(`Adding ${key} to ${target} (len=${value.length})...`);
    const result = spawnSync('npx', ['vercel', 'env', 'add', key, target], {
      input: value + '\n',
      encoding: 'utf8',
      shell: true,
    });
    if (result.status !== 0) {
      console.error(result.stdout);
      console.error(result.stderr);
      process.exit(result.status || 1);
    }
    console.log(result.stdout || 'ok');
  }
}

console.log('Done updating Vercel env vars.');
