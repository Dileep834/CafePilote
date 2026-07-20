/**
 * Run Phase 1–3 SQL schemas against Supabase Postgres.
 *
 * Requires one of:
 *   DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres
 *   SUPABASE_DB_PASSWORD=...  (uses VITE_SUPABASE_URL project ref)
 *
 * Usage: node scripts/run_phase_schemas.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env' });
config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const FILES = [
  'scripts/phase1_production_schema.sql',
  'scripts/phase2_enterprise_schema.sql',
  'scripts/phase3_saas_schema.sql',
];

function resolveConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;

  const password = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  const url = process.env.VITE_SUPABASE_URL || '';
  const ref = url.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (password && ref) {
    return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;
  }
  return null;
}

async function main() {
  const conn = resolveConnectionString();
  if (!conn) {
    console.error(`
Missing database credentials.

Add to .env.local (do not commit):
  DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
or
  SUPABASE_DB_PASSWORD=<your-database-password>

Then re-run: node scripts/run_phase_schemas.mjs

Or paste these files in order in Supabase SQL Editor:
  ${FILES.join('\n  ')}
`);
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected. Running Phase 1–3 schemas...\n');

  try {
    for (const rel of FILES) {
      const full = path.join(root, rel);
      const sql = fs.readFileSync(full, 'utf8');
      process.stdout.write(`→ ${rel} ... `);
      await client.query(sql);
      console.log('OK');
    }
    console.log('\nAll phase schemas applied.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
