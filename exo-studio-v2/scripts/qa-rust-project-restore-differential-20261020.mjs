import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { validateSavedProject, readSavedProject, writeSavedProject } from '../src/core/projectRestore.js'
import { initializeRustRestoreKernel, restoreShapeCode, rustRestoreStatus } from '../src/core/rustRestoreKernel.js'

// Frozen reference of the original JS contract, independent of production dispatch.
function originalValidate(p, { legacy = false } = {}) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw Error('Project must be an object')
  if (!Array.isArray(p.pieces) || !Array.isArray(p.seams)) throw Error('Project patterns or seams are missing')
  if ((!legacy || p.fabrics != null) && (!p.fabrics || typeof p.fabrics !== 'object' || Array.isArray(p.fabrics))) throw Error('Project fabrics are invalid')
  if ((!legacy || p.simulation != null) && (!p.simulation || typeof p.simulation !== 'object' || Array.isArray(p.simulation))) throw Error('Project simulation settings are invalid')
  if (p.pieces.some(piece => !piece || typeof piece.id !== 'string' || !Array.isArray(piece.points) || piece.points.some(point => !Number.isFinite(point?.x) || !Number.isFinite(point?.y)))) throw Error('Project contains invalid pattern geometry')
  return p
}
function originalRead(s, primary, backup) {
  const value = s.getItem(primary)
  if (!value) {
    const secondary = s.getItem(backup)
    if (!secondary) return { project: null, status: 'empty' }
    try { return { project: originalValidate(JSON.parse(secondary), { legacy: true }), status: 'backup', error: 'Primary saved project is missing' } }
    catch (error) { return { project: null, status: 'failed', error: `Primary saved project is missing and backup is invalid: ${error.message}` } }
  }
  try { return { project: originalValidate(JSON.parse(value), { legacy: true }), status: 'primary' } }
  catch (error) {
    const secondary = s.getItem(backup)
    if (secondary) try { return { project: originalValidate(JSON.parse(secondary), { legacy: true }), status: 'backup', error: error.message } } catch {}
    return { project: null, status: 'failed', error: error.message }
  }
}
function originalWrite(s, primary, backup, p) {
  originalValidate(p)
  const value = JSON.stringify(p), previous = s.getItem(primary)
  if (previous) try { originalValidate(JSON.parse(previous), { legacy: true }); s.setItem(backup, previous) } catch {}
  s.setItem(primary, value)
  if (!previous && !s.getItem(backup)) try { s.setItem(backup, value) } catch {}
}
class MapStorage {
  constructor(seed = {}) { this.map = new Map(Object.entries(seed)) }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null }
  setItem(key, value) { this.map.set(key, String(value)) }
  entries() { return [...this.map.entries()] }
}
const valid = { id: 'qa-tee', pieces: [{ id: 'front', points: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 4 }] }], seams: [], fabrics: { main: {} }, simulation: {} }
const legacy = { pieces: valid.pieces, seams: [] }
const invalidGeometry = { ...valid, pieces: [{ id: 'front', points: [{ x: 'NaN', y: 2 }] }] }
const snapshots = [
  ['empty', {}],
  ['primary', { primary: JSON.stringify(valid) }],
  ['malformed-primary-valid-backup', { primary: '{', backup: JSON.stringify(valid) }],
  ['missing-primary-valid-backup', { backup: JSON.stringify(valid) }],
  ['legacy-missing-fields', { primary: JSON.stringify(legacy) }],
  ['invalid-geometry', { primary: JSON.stringify(invalidGeometry) }],
  ['null', { primary: 'null' }],
  ['nonfinite', { primary: JSON.stringify({ ...valid, pieces: [{ id: 'x', points: [{ x: null, y: 0 }] }] }) }],
  ['both-invalid', { primary: '{', backup: 'false' }],
]
const capture = fn => { try { return { ok: true, value: fn() } } catch (error) { return { ok: false, error: error.message } } }
let assertions = 0
const runDifferential = () => {
for (const [name, seed] of snapshots) {
  assert.deepStrictEqual(readSavedProject(new MapStorage(seed), 'primary', 'backup'), originalRead(new MapStorage(seed), 'primary', 'backup'), name)
  assertions++
}
for (const [name, project] of [
  ['valid', valid], ['legacy', legacy], ['invalid geometry', invalidGeometry], ['null', null],
  ['nonfinite-infinity', { ...valid, pieces: [{ id: 'x', points: [{ x: Infinity, y: 0 }] }] }],
  ['nonfinite-nan', { ...valid, pieces: [{ id: 'x', points: [{ x: NaN, y: 0 }] }] }],
]) for (const legacyMode of [false, true]) {
  assert.deepStrictEqual(capture(() => validateSavedProject(project, { legacy: legacyMode })), capture(() => originalValidate(project, { legacy: legacyMode })), name + '/' + legacyMode)
  assertions++
}
for (const [name, seed, sequence] of [
  ['first-save', {}, [valid]],
  ['repeated-saves', {}, [valid, { ...valid, id: 'second' }, { ...valid, id: 'third' }]],
  ['good-backup-protection', { primary: '{', backup: JSON.stringify(valid) }, [{ ...valid, id: 'recovered' }]],
  ['valid-primary-backup-rotation', { primary: JSON.stringify(valid), backup: 'retained' }, [{ ...valid, id: 'updated' }]],
  ['failed-write-legacy', {}, [legacy]],
  ['failed-write-nonfinite', {}, [{ ...valid, pieces: [{ id: 'x', points: [{ x: Infinity, y: 0 }] }] }]],
]) {
  const reference = new MapStorage(seed), candidate = new MapStorage(seed)
  for (const project of sequence) {
    assert.deepStrictEqual(capture(() => writeSavedProject(candidate, 'primary', 'backup', project)), capture(() => originalWrite(reference, 'primary', 'backup', project)), name)
    assert.deepStrictEqual(candidate.entries(), reference.entries(), name + ' backing Map bytes')
    assertions += 2
  }
}
}
assert.equal(rustRestoreStatus().backend, 'javascript-fallback')
runDifferential()
const wasm = readFileSync(new URL('../public/wasm/exo_restore_kernel.wasm', import.meta.url))
assert.equal(await initializeRustRestoreKernel({bytes:wasm}), true, 'Actual restore WASM must load')
assert.equal(rustRestoreStatus().backend, 'rust-wasm')
for (const p of [null, [], {}, valid, legacy, invalidGeometry]) {
  const expected = !p || typeof p !== 'object' || Array.isArray(p) ? 1 : !Array.isArray(p.pieces) || !Array.isArray(p.seams) ? 2 : 0
  assert.equal(restoreShapeCode(p), expected)
  assertions++
}
runDifferential()
console.log(JSON.stringify({ pass: true, mode: 'frozen JS vs fallback and loaded Rust/WASM', assertions, storage: 'Map only', cases: snapshots.length, wasmLoaded: true }))
