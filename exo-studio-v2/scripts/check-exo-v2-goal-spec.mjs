#!/usr/bin/env node
/**
 * Zero-dependency, read-only validation of EXO's goal backlog.
 * This is NOT a goal executor, a release validator or an upstream Goals schema.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'docs/goals/exo-v2-goals.json');
const errors = [];
const flags = new Set(process.argv.slice(2));
const recognized = new Set(['--next', '--json', '--help', '--strict-paths']);

if ([...flags].some((value) => !recognized.has(value))) {
  console.error('Usage: node scripts/check-exo-v2-goal-spec.mjs [--strict-paths] [--next] [--json]');
  process.exit(2);
}
if (flags.has('--help')) {
  console.log('Read-only checks on EXO goal manifest. --next lists dependency-eligible goals; --json emits a machine-readable summary.');
  process.exit(0);
}

let m;
try {
  m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  console.error('FAIL: cannot parse ' + path.relative(root, manifestPath) + ': ' + error.message);
  process.exit(1);
}

const isString = (s) => typeof s === 'string' && s.trim().length > 0;
const requireValue = (test, message) => { if (!test) errors.push(message); };
const allowedStates = new Set(['planned', 'in-progress', 'blocked', 'verified', 'rejected', 'deferred']);
const allowedTiers = new Set(['E0', 'E1', 'E2', 'E3', 'E4']);
const allowedPriority = new Set(['P0', 'P1', 'P2', 'P3']);

requireValue(m.schemaVersion === 'exo-goal-manifest/1', 'schemaVersion must be exo-goal-manifest/1');
requireValue(isString(m.project), 'project must be a nonempty string');
requireValue(isString(m.goal), 'master goal must be nonempty');
requireValue(m.notUpstreamSchema === true, 'manifest must identify itself as EXO-specific, not upstream format');
requireValue(Array.isArray(m.goals) && m.goals.length > 0, 'goals must be a nonempty array');
requireValue(m.existingCoordinator === 'scripts/rust-migration-autopilot.mjs', 'existing Rust coordinator must remain single owner');
for (const name of ['sourceOfTruth', 'executionProtocol', 'existingCoordinator']) {
  const v = m[name];
  if (!isString(v)) { errors.push(name + ' missing'); continue; }
  const resolved = path.resolve(root, v);
  if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) {
    errors.push(name + ' does not resolve inside repo: ' + v);
  }
}
requireValue(Array.isArray(m.evidenceTiers) && [...allowedTiers].every((tier) => m.evidenceTiers.includes(tier)), 'expected E0–E4 evidence levels');
requireValue(Array.isArray(m.statuses) && [...allowedStates].every((state) => m.statuses.includes(state)), 'expected lifecycle statuses');

const goals = Array.isArray(m.goals) ? m.goals : [];
const byId = new Map();
const countByDomain = new Map();
for (const goal of goals) {
  if (!goal || typeof goal !== 'object') { errors.push('goal entry must be an object'); continue; }
  const id = goal.id;
  if (!isString(id) || !/^[A-Z]+-\d{3}$/.test(id)) {
    errors.push('invalid goal id: ' + String(id));
    continue;
  }
  if (byId.has(id)) errors.push('duplicate goal id ' + id);
  byId.set(id, goal);
  countByDomain.set(goal.domain, (countByDomain.get(goal.domain) || 0) + 1);
  for (const name of ['title', 'domain', 'ownerRole', 'deliverable', 'sourcePath']) {
    requireValue(isString(goal[name]), id + ' missing ' + name);
  }
  requireValue(allowedPriority.has(goal.priority), id + ' invalid priority ' + String(goal.priority));
  requireValue(allowedStates.has(goal.status), id + ' invalid status ' + String(goal.status));
  requireValue(allowedTiers.has(goal.requiredEvidenceTier), id + ' invalid evidence level');
  requireValue(Array.isArray(goal.dependsOn), id + ' missing dependsOn array');
  requireValue(Array.isArray(goal.acceptanceCriteria) && goal.acceptanceCriteria.length > 0 &&
    goal.acceptanceCriteria.every(isString), id + ' requires concrete acceptance criteria');
  requireValue(Array.isArray(goal.evidenceRefs), id + ' missing evidenceRefs array');
  if (isString(goal.sourcePath)) {
    const resolved = path.resolve(root, goal.sourcePath);
    if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) {
      errors.push(id + ' sourcePath is missing or outside repo: ' + goal.sourcePath);
    }
  }
  if (goal.status === 'verified') {
    requireValue(goal.verificationState === 'passed', id + ' verified without verificationState=passed');
    requireValue(Array.isArray(goal.evidenceRefs) && goal.evidenceRefs.length > 0, id + ' verified without actual evidence references');
  } else {
    requireValue(goal.verificationState !== 'passed', id + ' has passing verification without verified status');
  }
  if (goal.status === 'blocked') requireValue(isString(goal.blockingReason), id + ' blocked without reason');
  if (goal.status === 'planned') requireValue(goal.verificationState === 'not-run', id + ' planned state must be not-run');
}

for (const goal of goals) {
  if (!goal || !byId.has(goal.id)) continue;
  if (!Array.isArray(goal.dependsOn)) continue;
  const unique = new Set();
  for (const dependency of goal.dependsOn) {
    if (unique.has(dependency)) errors.push(goal.id + ' repeats dependency ' + dependency);
    unique.add(dependency);
    if (dependency === goal.id) errors.push(goal.id + ' is self-dependent');
    if (!byId.has(dependency)) errors.push(goal.id + ' unknown dependency ' + dependency);
  }
}

const temporary = new Set();
const permanent = new Set();
const visit = (id, trail = []) => {
  if (temporary.has(id)) { errors.push('dependency cycle: ' + trail.concat(id).join(' -> ')); return; }
  if (permanent.has(id)) return;
  temporary.add(id);
  for (const child of byId.get(id)?.dependsOn || []) {
    if (byId.has(child)) visit(child, trail.concat(id));
  }
  temporary.delete(id);
  permanent.add(id);
};
for (const id of byId.keys()) visit(id);

const ready = goals
  .filter((g) => g && g.status === 'planned' && Array.isArray(g.dependsOn) && g.dependsOn.every((d) => byId.get(d)?.status === 'verified'))
  .sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id))
  .map((g) => ({ id: g.id, title: g.title, priority: g.priority, domain: g.domain }));

const summary = {
  result: errors.length === 0 ? 'PASS' : 'FAIL',
  manifest: path.relative(root, manifestPath),
  totalGoals: goals.length,
  domains: Object.fromEntries([...countByDomain.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)))),
  verifiedGoals: goals.filter((g) => g?.status === 'verified').length,
  dependencyEligibleButNotResourceCleared: ready,
  errors,
  warnings: [
    'This is a static check only: no source tests, builds, garments, physical measurements or installer QA were executed.',
    'Goal eligibility does not override the disk safety gate, existing Rust writer lock or review requirements.'
  ]
};
if (flags.has('--json')) console.log(JSON.stringify(summary, null, 2));
else {
  console.log(summary.result + ' EXO goal specification: ' + summary.totalGoals + ' goals across ' + countByDomain.size + ' domains; ' + summary.verifiedGoals + ' verified');
  if (flags.has('--next')) {
    console.log('Dependency-eligible planning tasks (still subject to resource/safety checks):');
    for (const item of ready) console.log('  ' + item.priority + ' ' + item.id + ' ' + item.title);
  }
  for (const error of errors) console.error('  ERROR ' + error);
  console.log('Static planning validation only. No app or physical fit validation performed.');
}
process.exitCode = errors.length > 0 ? 1 : 0;
