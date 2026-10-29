import { spawn } from 'node:child_process';
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { statfs } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

export const MIN_FREE_BYTES = 25 * 1024 ** 3;
export const DEFAULT_CHECKS = Object.freeze([
  'scripts/check-drafting-precision.mjs',
  'scripts/check-drafting-snapping.mjs',
  'scripts/check-drafting-splits.mjs',
  'scripts/check-drafting-topology.mjs',
  'scripts/check-factory.mjs',
  'scripts/check-production-handoff.mjs',
]);

const rootDefault = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const iso = () => new Date().toISOString();

export async function availableBytes(directory) {
  const disk = await statfs(directory);
  return Number(disk.bavail) * Number(disk.bsize);
}

function safeCheck(relative) {
  if (typeof relative !== 'string' || !/^([\w.-]+\/)*[\w.-]+\.mjs$/.test(relative) || relative.split('/').includes('..')) {
    throw new Error(`Unsafe test path: ${String(relative)}`);
  }
  return relative;
}

async function writeAtomic(file, object) {
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(object, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  await rename(tmp, file);
}

async function runProcess(executable, args, { cwd, timeoutMs, logFile }) {
  const log = await open(logFile, 'a', 0o600);
  try {
    const result = await new Promise((resolve) => {
      const child = spawn(executable, args, { cwd, shell: false, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' } });
      let timedOut = false;
      let settled = false;
      const timer = setTimeout(() => {
        timedOut = true;
        try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} }
      }, timeoutMs);
      const logChunk = (stream) => stream.on('data', (chunk) => { void log.write(chunk).catch(() => {}); });
      logChunk(child.stdout);
      logChunk(child.stderr);
      const finish = (code, signal, error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ exitCode: code, signal, timedOut, ...(error ? { error: String(error) } : {}) });
      };
      child.once('error', (error) => finish(null, null, error));
      child.once('close', (code, signal) => finish(code, signal));
    });
    return result;
  } finally {
    await log.close();
  }
}

export async function runOvernight({
  root = rootDefault,
  stateDir = path.join(root, '.overnight-cad'),
  checks = DEFAULT_CHECKS,
  minFreeBytes = MIN_FREE_BYTES,
  diskFree = availableBytes,
  timeoutMs = 120_000,
  tailscale = false,
  remoteHost,
} = {}) {
  if (!Number.isFinite(minFreeBytes) || minFreeBytes < 0) throw new Error('Invalid minimum free bytes');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 600_000) throw new Error('Timeout must be 100..600000 ms');
  if (!Array.isArray(checks) || checks.length < 1 || checks.length > 20) throw new Error('Expected 1..20 checks');
  const chosen = checks.map(safeCheck);
  if (remoteHost && (!tailscale || !/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/.test(remoteHost))) throw new Error('Invalid Tailscale remote hostname');
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  const lockFile = path.join(stateDir, 'active.lock');
  let lock;
  try { lock = await open(lockFile, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Overnight CAD runner already locked: ${lockFile}. Inspect the lock before manual removal.`);
    throw error;
  }
  const manifestFile = path.join(stateDir, 'checkpoint.json');
  const runId = `${Date.now()}-${process.pid}`;
  const logFile = path.join(stateDir, `run-${runId}.log`);
  const manifest = { schemaVersion: 1, runId, root, startedAt: iso(), status: 'running', minimumFreeBytes: minFreeBytes, checks: [], network: [] };
  const checkpoint = () => writeAtomic(manifestFile, manifest);
  try {
    await lock.writeFile(`${JSON.stringify({ pid: process.pid, runId, startedAt: manifest.startedAt, root })}\n`);
    await checkpoint();
    // The guard is checked before every process so long runs stop if storage tightens.
    const preflight = async () => {
      const free = await diskFree(root);
      manifest.lastFreeBytes = free;
      if (!Number.isFinite(free) || free < minFreeBytes) throw new Error(`Free disk space below ${minFreeBytes} bytes (available: ${free})`);
    };
    await preflight();
    if (tailscale) {
      for (const args of [['status', '--json'], ...(remoteHost ? [['ping', '--c', '1', remoteHost]] : [])]) {
        await preflight();
        const outcome = await runProcess('tailscale', args, { cwd: root, timeoutMs: Math.min(timeoutMs, 15_000), logFile });
        manifest.network.push({ command: `tailscale ${args.join(' ')}`, ...outcome });
        await checkpoint();
        // Informational reachability must not bypass CAD QA or silently certify it.
      }
    }
    for (const check of chosen) {
      await preflight();
      const begun = iso();
      const result = await runProcess(process.execPath, [check], { cwd: root, timeoutMs, logFile });
      manifest.checks.push({ script: check, startedAt: begun, endedAt: iso(), ...result });
      await checkpoint();
      if (result.exitCode !== 0 || result.timedOut || result.error) {
        throw new Error(`CAD QA failed: ${check} (${result.timedOut ? 'timeout' : result.error ?? result.exitCode})`);
      }
    }
    manifest.status = 'passed';
  } catch (error) {
    manifest.status = 'failed';
    manifest.error = String(error.message ?? error);
  } finally {
    manifest.finishedAt = iso();
    try { await checkpoint(); } finally {
      await lock.close();
      await rm(lockFile, { force: true });
    }
  }
  return { manifest, manifestFile, logFile };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const allowed = new Set(['--tailscale', '--remote', '--state-dir']);
  if (args.some((x) => x.startsWith('--') && !allowed.has(x))) {
    console.error('Usage: node scripts/overnight-cad/runner.mjs [--tailscale] [--remote hostname] [--state-dir absolute-path]');
    process.exitCode = 2;
  } else {
    const value = (flag) => { const i = args.indexOf(flag); if (i < 0) return undefined; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing ${flag} value`); return args[i + 1]; };
    try {
      const remoteHost = value('--remote');
      const stateDir = value('--state-dir');
      if (stateDir && !path.isAbsolute(stateDir)) throw new Error('--state-dir must be absolute');
      const { manifest, manifestFile, logFile } = await runOvernight({ tailscale: args.includes('--tailscale'), remoteHost, ...(stateDir ? { stateDir } : {}) });
      console.log(JSON.stringify({ status: manifest.status, checks: manifest.checks.length, manifestFile, logFile, error: manifest.error ?? null }, null, 2));
      if (manifest.status !== 'passed') process.exitCode = 1;
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
