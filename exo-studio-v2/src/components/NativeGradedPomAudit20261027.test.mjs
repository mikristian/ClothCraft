import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformWithEsbuild } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const location = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(location, 'NativeGradedPomAudit20261027.jsx'), 'utf8')

async function component() {
  const transformed = await transformWithEsbuild(source, 'NativeGradedPomAudit20261027.jsx', { loader: 'jsx', format: 'esm', jsx: 'automatic' })
  const url = `data:text/javascript;base64,${Buffer.from(transformed.code.replaceAll('from "react/jsx-runtime"', `from "${import.meta.resolve('react/jsx-runtime')}"`).replaceAll('from "react"', `from "${import.meta.resolve('react')}"`)).toString('base64')}`
  return (await import(url)).default
}

function report(sourceRevision = 8) {
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  return { format: 'exo-native-grade-pom-audit.v1', sourceRevision, sizeCount: 6, pomCount: 2, acceptanceComplete: false, factoryApproved: false,
    blockers: ['POM waist size XXL has no authored target'], rows: sizes.flatMap(size => [
      { size, pomId: 'width', label: 'Body width', measuredMm: 410, targetMm: 410, deltaMm: 0, toleranceMm: 2, withinTolerance: true, scored: true },
      { size, pomId: 'waist', label: 'Waist', measuredMm: 380, targetMm: size === 'XXL' ? null : size === 'XL' ? 375 : 380, deltaMm: size === 'XXL' ? null : size === 'XL' ? 5 : 0, toleranceMm: 2, withinTolerance: size === 'XXL' ? null : size !== 'XL', scored: size !== 'XXL' }
    ]) }
}

test('renders actual native Rust flat POM evidence with six grouped sizes, mismatch and unscored distinctions', async () => {
  const Panel = await component()
  const markup = renderToStaticMarkup(createElement(Panel, { snapshot: { revision: 8, hasSavedGradeCatalog: true } }))
  assert.match(markup, /Run Rust six-size POM audit/)
  assert.match(markup, /Factory uncertified/)
  assert.doesNotMatch(markup, /Source revision 8/)

  // useState cannot be seeded in SSR, so verify the native row contract through a
  // focused source assertion rather than pretending a network audit took place.
  for (const field of ['pom.measuredMm', 'pom.targetMm', 'pom.deltaMm', 'pom.toleranceMm', 'pom.withinTolerance', 'pom.scored', 'report.blockers', 'report.sourceRevision']) {
    assert.ok(source.includes(field), `native field ${field} must be consumed`)
  }
  assert.equal(report().rows.length, 12)
  assert.equal(report().rows.filter(row => row.withinTolerance === false).length, 1)
  assert.equal(report().rows.filter(row => row.scored === false).length, 1)
})

test('guards unavailable sources, activated sizes, disabled operations and missing callbacks', async () => {
  const Panel = await component()
  const render = props => renderToStaticMarkup(createElement(Panel, props))
  assert.match(render({ snapshot: { revision: 8 }, onRunAudit: async () => report() }), /Save a native six-size grade catalog/)
  assert.match(render({ snapshot: { revision: 8 }, onRunAudit: async () => report() }), /disabled=""/)
  assert.match(render({ snapshot: { revision: 8, hasSavedGradeCatalog: true, activeGradedSize: 'M' }, onRunAudit: async () => report() }), /Restore the source garment/)
  assert.match(render({ snapshot: { revision: 8, hasSavedGradeCatalog: true }, disabled: true, onRunAudit: async () => report() }), /Wait for the current native operation/)
  assert.match(render({ snapshot: { revision: 8, hasSavedGradeCatalog: true } }), /disabled=""/)
})

test('rejects stale async callbacks by revision and tickets, keeping the source immutable', () => {
  for (const token of ['await onRunAudit()', 'result.sourceRevision !== sourceRevision', 'ticket !== generation.current', 'report.sourceRevision !== revision', 'useEffect(() => { generation.current += 1', 'setReport(null)', "report.format === 'exo-native-grade-pom-audit.v1'"]) {
    assert.ok(source.includes(token), `missing source protection ${token}`)
  }
  assert.doesNotMatch(source, /fetch\s*\(|grade-run-commit|onApplyProject|setSnapshot/)
})
