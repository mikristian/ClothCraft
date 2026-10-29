import test from 'node:test'
import assert from 'node:assert/strict'
import { unzipSync } from 'fflate'
import { createTeeTemplate } from '../data/templates.js'
import { downloadAccuMarkGuardedFactoryPackage20261023 as download } from './accumarkGuardedFactoryDownload20261023.js'

function browser({ clickThrows = false } = {}) {
  const events = []
  let blob
  const pending = []
  const anchor = { click() { events.push('click'); if (clickThrows) throw new Error('click rejected') } }
  const adapter = {
    document: { body: { appendChild(node) { assert.equal(node, anchor); events.push('append') }, removeChild(node) { assert.equal(node, anchor); events.push('remove') } }, createElement(tag) { assert.equal(tag, 'a'); events.push('create'); return anchor } },
    URL: { createObjectURL(value) { blob = value; events.push('object-url'); return 'blob:guarded-test' }, revokeObjectURL(value) { assert.equal(value, 'blob:guarded-test'); events.push('revoke') } },
    Blob: class { constructor(parts, options) { assert.equal(options.type, 'application/zip'); this.bytes = parts[0] } },
    setTimeout(fn, delay) { assert.equal(delay, 1000); events.push('schedule'); pending.push(fn); return pending.length },
  }
  return { adapter, events, anchor, pending, getBlob: () => blob }
}

test('real six size package downloads as ZIP with stable filename and no source mutation', () => {
  const project = createTeeTemplate()
  const snapshot = structuredClone(project)
  const b = browser()
  const result = download(project, b.adapter)
  assert.equal(result.ok, true, result.reason)
  assert.equal(result.manufacturingApproved, false)
  assert.match(result.filename, /-guarded-factory\.zip$/)
  assert.equal(b.anchor.download, result.filename)
  assert.equal(b.anchor.href, 'blob:guarded-test')
  assert.deepEqual(b.events, ['create','object-url','append','click','remove','schedule'])
  assert.equal(b.pending.length, 1)
  b.pending[0]()
  assert.equal(b.events.at(-1), 'revoke')
  const files = unzipSync(b.getBlob().bytes)
  assert.equal(Object.keys(files).filter(path => /^patterns\/.*\.dxf$/.test(path)).length, 6)
  assert.deepEqual(project, snapshot)
})

test('invalid seam stops before browser side effects', () => {
  const project = createTeeTemplate()
  project.seams[0].a.edgeIndex = 999
  const snapshot = structuredClone(project)
  const b = browser()
  const result = download(project, b.adapter)
  assert.equal(result.ok, false)
  assert.match(result.reason, /Invalid seam/)
  assert.deepEqual(b.events, [])
  assert.deepEqual(project, snapshot)
})

test('overlapping physical CUT stops before browser side effects', () => {
  const base = createTeeTemplate()
  const rectangle = (id, name) => ({ ...structuredClone(base.pieces[0]), id, name, points: [{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}], curves:{}, seamAllowance:6, edgeSeamAllowances:{}, notches:[], internalLines:[], buttonholes:[] })
  const project = { ...base, pieces:[rectangle('a','A'),rectangle('b','B')], seams:[] }
  const snapshot = structuredClone(project)
  const b = browser()
  const result = download(project, b.adapter)
  assert.equal(result.ok, false)
  assert.match(result.reason, /PHYSICAL_CUT_INTERIOR_OVERLAP/)
  assert.deepEqual(b.events, [])
  assert.deepEqual(project, snapshot)
})

test('click exception always removes anchor and revokes object URL', () => {
  const b = browser({ clickThrows: true })
  const result = download(createTeeTemplate(), b.adapter)
  assert.equal(result.ok, false)
  assert.match(result.reason, /click rejected/)
  assert.deepEqual(b.events, ['create','object-url','append','click','remove','revoke'])
  assert.equal(b.pending.length, 0)
})

test('invalid browser APIs refuse without URL or click side effects', () => {
  const b = browser()
  const invalid = { ...b.adapter, URL: { createObjectURL() { throw new Error('should not execute') } } }
  assert.match(download(createTeeTemplate(), invalid).reason, /APIs unavailable/)
  assert.deepEqual(b.events, [])
  const badAnchor = { ...b.adapter, document: { ...b.adapter.document, createElement() { return {} } } }
  assert.match(download(createTeeTemplate(), badAnchor).reason, /anchor unavailable/)
  assert.deepEqual(b.events, [])
  assert.match(download(createTeeTemplate(), { ...b.adapter, setTimeout: 42 }).reason, /APIs unavailable/)
  assert.deepEqual(b.events, [])
})

test('scheduler failure immediately revokes URL and refuses download', () => {
  const b = browser()
  const result = download(createTeeTemplate(), { ...b.adapter, setTimeout() { throw new Error('scheduler rejected') } })
  assert.equal(result.ok, false)
  assert.match(result.reason, /scheduler rejected/)
  assert.deepEqual(b.events, ['create','object-url','append','click','remove','revoke'])
})
