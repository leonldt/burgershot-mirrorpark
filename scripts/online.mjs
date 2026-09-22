#!/usr/bin/env node
/**
 * Watchdog: hält Datenbank, Produktions-Server und öffentlichen Tunnel am Laufen.
 *
 * – Prüft alle 15 s die eingebettete PostgreSQL, startet sie bei Bedarf neu.
 * – Prüft den Standalone-Server (Port 3001), baut ihn bei Bedarf und startet ihn.
 * – Startet den Cloudflare-Quick-Tunnel neu und schreibt die aktuelle
 *   öffentliche URL nach /tmp/bs-public-url.txt (und ins Log).
 *
 * Hinweis: Die Sandbox-VM selbst kann durch einen Neustart alle Prozesse beenden.
 * Dann reicht ein erneuter Start des Watchdogs:  npm run online
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 3001;
const DB_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/burgershot";
const URL_FILE = "/tmp/bs-public-url.txt";
const LOG_PATH = "/tmp/bs-online.log";
const CLOUDFLARED = "/tmp/cloudflared";

const log = (...args) => {
  const line = `${new Date().toISOString()} ${args.join(" ")}`;
  fs.appendFileSync(LOG_PATH, line + "\n");
  console.log(line);
};

let serverProc = null;
let tunnelProc = null;

async function dbOk() {
  try {
    const c = new pg.Client({ connectionString: DB_URL, connectionTimeoutMillis: 2000 });
    await c.connect();
    await c.end();
    return true;
  } catch {
    return false;
  }
}

async function serverOk() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

function ensureServer() {
  if (serverProc && serverProc.exitCode === null) return;
  const standalone = path.join(ROOT, ".next", "standalone", "server.js");
  if (!fs.existsSync(standalone)) {
    log("Build fehlt – baue neu …");
    const b = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit", timeout: 600000 });
    if (b.status !== 0) {
      log("Build fehlgeschlagen – warte bis zum nächsten Zyklus.");
      return;
    }
    try {
      fs.cpSync(path.join(ROOT, ".next", "static"), path.join(ROOT, ".next", "standalone", ".next", "static"), { recursive: true });
      fs.cpSync(path.join(ROOT, "public"), path.join(ROOT, ".next", "standalone", "public"), { recursive: true });
    } catch {
      /* ignorieren */
    }
  }
  log(`Starte Server auf 127.0.0.1:${PORT} …`);
  serverProc = spawn("node", [standalone], {
    cwd: ROOT,
    env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: String(PORT), DATABASE_URL: DB_URL },
    stdio: "ignore",
  });
  serverProc.on("exit", (code) => {
    log(`Server beendet (Code ${code}) – wird im nächsten Zyklus neu gestartet.`);
    serverProc = null;
  });
}

function ensureTunnel() {
  if (tunnelProc && tunnelProc.exitCode === null) return;
  if (!fs.existsSync(CLOUDFLARED)) {
    log("cloudflared fehlt – Download wird übersprungen (bitte einmalig: curl -L -o /tmp/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x /tmp/cloudflared)");
    return;
  }
  log("Starte Cloudflare-Tunnel …");
  tunnelProc = spawn(CLOUDFLARED, ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${PORT}`], { stdio: ["ignore", "pipe", "pipe"] });
  let buffer = "";
  tunnelProc.stdout.on("data", (d) => {
    buffer += d.toString();
    const m = buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m) {
      fs.writeFileSync(URL_FILE, m[0] + "\n");
      log(`Öffentliche URL: ${m[0]}`);
    }
  });
  tunnelProc.stderr.on("data", (d) => (buffer += d.toString()));
  tunnelProc.on("exit", (code) => {
    log(`Tunnel beendet (Code ${code}) – wird im nächsten Zyklus neu gestartet.`);
    tunnelProc = null;
  });
}

log(`Watchdog gestartet (DB ${DB_URL.split("@")[1] ?? "?"}, Port ${PORT}).`);
log("Loop alle 15 s. Öffentliche URL: siehe " + URL_FILE);

while (true) {
  try {
    if (!(await dbOk())) {
      log("Datenbank nicht erreichbar – starte sie …");
      const r = spawnSync("node", [path.join(ROOT, "scripts", "db.mjs"), "start"], { cwd: ROOT, stdio: "inherit", timeout: 120000 });
      log(r.status === 0 ? "Datenbank gestartet." : "Datenbank-Start fehlgeschlagen.");
    }
    if (!(await serverOk())) {
      log("Server antwortet nicht – starte neu …");
      if (serverProc) {
        try {
          serverProc.kill("SIGKILL");
        } catch {
          /* ignorieren */
        }
        serverProc = null;
      }
      ensureServer();
    }
    ensureTunnel();
  } catch (e) {
    log("Zyklus-Fehler:", e?.message ?? e);
  }
  await new Promise((r) => setTimeout(r, 15000));
}