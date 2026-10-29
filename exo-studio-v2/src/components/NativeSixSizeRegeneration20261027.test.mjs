import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformWithEsbuild } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'NativeSixSizeRegeneration20261027.jsx'), 'utf8')
async function load() {
  const transformed = await transformWithEsbuild(source, 'NativeSixSizeRegeneration20261027.jsx', { loader: 'jsx', format: 'esm', jsx: 'automatic' })
  const validatorPath=new URL('../core/nativeSixSizePreviewValidator20261028.js',import.meta.url).href
  const code = transformed.code.replaceAll('from "react/jsx-runtime"', `from "${import.meta.resolve('react/jsx-runtime')}"`).replaceAll('from "react"', `from "${import.meta.resolve('react')}"`).replaceAll('from "../core/nativeSixSizePreviewValidator20261028.js"',`from "${validatorPath}"`)
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
const snapshot = { revision: 42, gradeRunPersisted: true, nativePointBindings: { active: true, version: 1, bindings: [{ panelId: 'front' }, { panelId: 'back' }], measurements: { chest: 420, waist: { valueMm: 390 }, derived: { formula: 'chest / 2' } } } }
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const report = { format: 'exo-native-reactive-size-run.v1', sourceRevision: 42, changedPanels: 2, changedBindings: 2, manufacturerApproved: false, factoryApproved: false,
  measurementOverrides: { chest: 400 }, panelIds: ['front', 'back'], bindingIds: ['front_width', 'back_width'],
  bySize: sizes.map(size => ({ size, changes: [
    { panelId: 'front', pointIndex: 1, beforeMm: [420, 0], afterMm: [400, 0] },
    { panelId: 'back', pointIndex: 1, beforeMm: [410, 0], afterMm: [390, 0] },
  ] })) }

test('actual native panel renders saved direct measurements and explicit preview but skips formulas', async () => {
  const { default: Panel } = await load()
  const html = renderToStaticMarkup(createElement(Panel, { snapshot, onPreview: async () => report, onCommit: async () => ({}) }))
  assert.match(html, /Native six-size dependent pattern regeneration/)
  assert.match(html, /chest/)
  assert.match(html, /waist/)
  assert.doesNotMatch(html, /<option[^>]*>derived/)
  assert.match(html, /Preview XS–XXL regeneration/)
  assert.match(html, /Stage measurement change/)
  assert.match(html, /disabled=""[^>]*>Preview XS–XXL/)
})

test('fail-closed guards block unsaved, inactive, graded, busy and single-panel sources', async () => {
  const { nativeSixSizeRegenerationPreflight20261027: guard, default: Panel } = await load()
  assert.match(guard({ ...snapshot, gradeRunPersisted: false }), /Save a native six-size grade catalog/)
  assert.match(guard({ ...snapshot, activeGradedSize: 'M' }), /Restore the base garment/)
  assert.match(guard({ ...snapshot, nativePointBindings: { ...snapshot.nativePointBindings, active: false } }), /active native measurement/)
  assert.match(guard({ ...snapshot, nativePointBindings: { ...snapshot.nativePointBindings, bindings: [{ panelId: 'front' }] } }), /two bound source panels/)
  assert.match(guard(snapshot, true), /busy/)
  const html = renderToStaticMarkup(createElement(Panel, { snapshot: { ...snapshot, activeGradedSize: 'XL' }, onPreview: async () => report }))
  assert.match(html, /Restore the base garment/)
  assert.match(html, /disabled=""/)
})

test('preview evidence requires exact six-size membership, revision, changes and unapproved provenance', async () => {
  const { validateSixSizeRegenerationPreview20261027: check } = await load()
  assert.equal(check(report, 42, { chest: 400 }), true)
  assert.equal(check(report, 42, { chest: 410 }), false)
  assert.equal(check({ ...report, sourceRevision: 41 }, 42), false)
  assert.equal(check({ ...report, manufacturerApproved: true }, 42), false)
  assert.equal(check({ ...report, changedBindings: 0 }, 42), false)
  assert.equal(check({ ...report, bySize: report.bySize.slice(1) }, 42), false)
  assert.equal(check({ ...report, bySize: [...report.bySize.slice(0, 5), report.bySize[0]] }, 42), false)
  assert.equal(check({ ...report, bySize: report.bySize.map(row => ({ size: row.size })) }, 42), false)
  assert.equal(check({ ...report, panelIds: ['front', 'front'] }, 42), false)
  assert.equal(check({ ...report, bySize: report.bySize.map((row, i) => i === 5 ? { ...row, changes: [row.changes[0], row.changes[0]] } : row) }, 42), false)
  assert.equal(check({ ...report, bySize: report.bySize.map((row, i) => i === 5 ? { ...row, changes: [{ ...row.changes[0], beforeMm: [NaN, 0] }, row.changes[1]] } : row) }, 42), false)
  assert.equal(check({ ...report, bySize: report.bySize.map(row => ({ ...row, changes: row.changes.map(change => ({ ...change, afterMm: [...change.beforeMm] })) })) }, 42), false)
  assert.equal(check({ ...report, measurementOverrides: { chest: 400, waist: 360 } }, 42, { chest: 400 }), false)
  assert.equal(check({ ...report, measurementOverrides: { chest: 400, waist: 360 } }, 42, { chest: 400, waist: 360 }), true)
})

test('the UI stages simultaneous edits and matches each native six-size preview before one confirmed commit', () => {
  for (const segment of ['stageMeasurement', 'stagedOverrides', 'overrides: { ...stagedOverrides }', 'await onPreview(request)', 'await onCommit(expected.request)', 'setConfirmed(event.target.checked)', 'latestSignature.current !== expected.signature', 'nativeSnapshot.revision !== expected.request.sourceRevision + 1', 'nativeSnapshot.gradeRunPersisted !== true', 'nativeSnapshot.nativePointBindings?.active !== true', 'JSON.stringify(evidence) !== JSON.stringify(expected.report)', 'displayPosition(change.beforeMm)']) {
    assert.ok(source.includes(segment), `required guarded transaction: ${segment}`)
  }
  assert.doesNotMatch(source, /fetch\s*\(|setSnapshot\(|manufacturerApproved:\s*true/)
})
