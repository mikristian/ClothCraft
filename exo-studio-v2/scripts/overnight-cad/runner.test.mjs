import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runOvernight, MIN_FREE_BYTES } from './runner.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'cad-night-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'checks'));
  const stateDir = path.join(root, 'state');
  const opts = { root, stateDir, diskFree: async () => MIN_FREE_BYTES + 1, timeoutMs: 3_000 };
  return { root, stateDir, opts };
}

test('serial execution, checkpoints and logs', async (t) => {
  const { root, opts } = await fixture(t);
  await writeFile(path.join(root, 'checks/one.mjs'), "import { writeFile } from 'node:fs/promises'; await writeFile('sequence', '1'); console.log('one');\n");
  await writeFile(path.join(root, 'checks/two.mjs'), "import { readFile, writeFile } from 'node:fs/promises'; const previous=await readFile('sequence', 'utf8'); if(previous!=='1') process.exit(4); await writeFile('sequence', '12'); console.log('two');\n");
  const result = await runOvernight({ ...opts, checks: ['checks/one.mjs', 'checks/two.mjs'] });
  assert.equal(result.manifest.status, 'passed');
  assert.equal(result.manifest.checks.length, 2);
  assert.equal((await readFile(result.logFile, 'utf8')).includes('two'), true);
  assert.equal(JSON.parse(await readFile(result.manifestFile, 'utf8')).status, 'passed');
});

test('low disk blocks processes and records failure', async (t) => {
  const { root, opts } = await fixture(t);
  await writeFile(path.join(root, 'checks/one.mjs'), "throw new Error('should never run')");
  const result = await runOvernight({ ...opts, checks: ['checks/one.mjs'], diskFree: async () => MIN_FREE_BYTES - 1 });
  assert.equal(result.manifest.status, 'failed');
  assert.equal(result.manifest.checks.length, 0);
  assert.match(result.manifest.error, /Free disk space below/);
});

test('existing lock prevents a second runner and is preserved', async (t) => {
  const { stateDir, opts } = await fixture(t);
  await mkdir(stateDir);
  const lock = await open(path.join(stateDir, 'active.lock'), 'wx');
  await lock.writeFile('existing lock');
  await lock.close();
  await assert.rejects(runOvernight({ ...opts, checks: ['checks/one.mjs'] }), /already locked/);
  assert.equal(await readFile(path.join(stateDir, 'active.lock'), 'utf8'), 'existing lock');
});

test('failing test halts remaining checks; no shell expansion', async (t) => {
  const { root, opts } = await fixture(t);
  await writeFile(path.join(root, 'checks/fail.mjs'), 'process.exit(7)\n');
  await writeFile(path.join(root, 'checks/after.mjs'), "import { writeFile } from 'node:fs/promises'; await writeFile('never-created','yes');\n");
  const result = await runOvernight({ ...opts, checks: ['checks/fail.mjs', 'checks/after.mjs'] });
  assert.equal(result.manifest.status, 'failed');
  assert.equal(result.manifest.checks.length, 1);
  assert.equal(result.manifest.checks[0].exitCode, 7);
  await assert.rejects(readFile(path.join(root, 'never-created')));
  await assert.rejects(runOvernight({ ...opts, checks: ['../bad.mjs'] }), /Unsafe test path/);
});

test('timeout kills hanging command and reports failure', async (t) => {
  const { root, opts } = await fixture(t);
  await writeFile(path.join(root, 'checks/hang.mjs'), 'setInterval(() => {}, 1000)\n');
  const result = await runOvernight({ ...opts, checks: ['checks/hang.mjs'], timeoutMs: 200 });
  assert.equal(result.manifest.status, 'failed');
  assert.equal(result.manifest.checks[0].timedOut, true);
});
