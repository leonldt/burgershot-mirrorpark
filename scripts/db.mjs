#!/usr/bin/env node
/**
 * Local PostgreSQL bootstrap using the embedded-postgres binaries.
 * No system Postgres / Docker required for local development & tests.
 *
 * Usage:   node scripts/db.mjs <init|start|stop|status>
 * Optional env: PG_PORT (54329), PG_DATA_DIR (<root>/.pgdata), PG_USER, PG_PASSWORD
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const PORT = Number(process.env.PG_PORT || 54329);
const DATA_DIR = process.env.PG_DATA_DIR || path.join(root, '.pgdata');
const PGUSER = process.env.PG_USER || 'postgres';
const PGPASSWORD = process.env.PG_PASSWORD || 'postgres';
const SOCK_DIR = path.join(DATA_DIR, 'sock');
const LOG_FILE = path.join(DATA_DIR, 'postgres.log');
const HOST = '127.0.0.1';

const DATABASES = ['burgershot', 'burgershot_test'];

function pgBin(name) {
  const candidate = path.join(root, 'node_modules', '@embedded-postgres', 'linux-x64', 'native', 'bin', name);
  if (fs.existsSync(candidate)) return candidate;
  const fallback = spawnSync('which', [name], { encoding: 'utf8' });
  if (fallback.status === 0 && fallback.stdout.trim()) return fallback.stdout.trim();
  throw new Error(`PostgreSQL binary "${name}" not found. Install embedded-postgres (npm i -D embedded-postgres @embedded-postgres/linux-x64) or install PostgreSQL locally.`);
}

function run(bin, args) {
  const res = spawnSync(bin, args, {
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C.UTF-8' },
  });
  if (res.stdout && res.stdout.trim()) process.stdout.write(res.stdout);
  if (res.stderr && res.stderr.trim()) process.stderr.write(res.stderr);
  if (res.error) throw res.error;
  return res;
}

function initialized() {
  return fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'));
}

async function initdb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (initialized()) return;
  // Clear a half-broken previous attempt (e.g. leftover pwfile inside the cluster dir).
  if (fs.readdirSync(DATA_DIR).length > 0) {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const pwFile = path.join(os.tmpdir(), `.bs-pg-pw-${process.pid}`);
  fs.writeFileSync(pwFile, PGPASSWORD);
  console.log(`[db] Initializing PostgreSQL cluster in ${DATA_DIR} ...`);
  run(pgBin('initdb'), [
    '-D', DATA_DIR, '-U', PGUSER,
    '--pwfile=' + pwFile,
    '--auth=scram-sha-256',
    '--locale=C', '--encoding=UTF8', '--no-instructions',
  ]);
  fs.rmSync(pwFile, { force: true });
}

function isRunning() {
  const res = run(pgBin('pg_ctl'), ['-D', DATA_DIR, 'status']);
  return res.status === 0;
}

async function start() {
  await initdb();
  fs.mkdirSync(SOCK_DIR, { recursive: true });
  if (!isRunning()) {
    console.log(`[db] Starting PostgreSQL on ${HOST}:${PORT} ...`);
    run(pgBin('pg_ctl'), ['-D', DATA_DIR, '-l', LOG_FILE, '-o', `-p ${PORT} -k ${SOCK_DIR}`, '-w', 'start']);
  } else {
    console.log(`[db] PostgreSQL already running on ${HOST}:${PORT}`);
  }
  await ensureDatabases();
  await ensureReady();
  console.log(`[db] PostgreSQL ready. DATABASE_URL=postgresql://${PGUSER}:***@${HOST}:${PORT}/burgershot`);
}

async function connect() {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ host: HOST, port: PORT, user: PGUSER, password: PGPASSWORD, database: 'postgres' });
  await client.connect();
  return client;
}

async function ensureDatabases() {
  const client = await connect();
  try {
    for (const db of DATABASES) {
      const res = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [db]);
      if (res.rowCount === 0) {
        console.log(`[db] Creating database "${db}" ...`);
        await client.query(`CREATE DATABASE "${db}"`);
      }
    }
  } finally {
    await client.end();
  }
}

async function ensureReady(timeoutMs = 30000) {
  const { default: pg } = await import('pg');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const client = new pg.Client({ host: HOST, port: PORT, user: PGUSER, password: PGPASSWORD, database: 'postgres' });
    try {
      await client.connect();
      await client.end();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('PostgreSQL did not become ready in time');
}

async function status() {
  if (!initialized()) return console.log("[db] Not initialized yet.");
  if (!isRunning()) return console.log("[db] PostgreSQL is not running.");
  const client = await connect();
  try {
    const res = await client.query('SELECT version()');
    console.log(`[db] PostgreSQL running on ${HOST}:${PORT}\n[db] ${res.rows[0].version.split('\n')[0]}`);
  } finally {
    await client.end();
  }
}

async function stop() {
  if (!initialized()) return console.log('[db] Not initialized.');
  run(pgBin('pg_ctl'), ['-D', DATA_DIR, '-m', 'fast', '-w', 'stop']);
  console.log('[db] PostgreSQL stopped.');
}

const cmd = process.argv[2] || 'status';
Promise.resolve({
  init: () => start(),
  start,
  stop,
  status,
}[cmd]?.()).catch((err) => {
  console.error('[db] Failed:', err.message);
  process.exit(1);
});