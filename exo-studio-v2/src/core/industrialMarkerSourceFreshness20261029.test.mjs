import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {fingerprintIndustrialMarkerSource20261029 as fingerprint} from './industrialMarkerSourceFreshness20261029.mjs'

test('disposable six-size garment fingerprint is deterministic across object key order', () => {
  const source = createTeeTemplate()
  const reordered = Object.fromEntries(Object.entries(source).reverse())
  assert.match(fingerprint(source), /^[a-f0-9]{64}$/)
  assert.equal(fingerprint(reordered), fingerprint(source))
  assert.equal(fingerprint(structuredClone(source)), fingerprint(source))
})

test('manufacturing source changes alter the fingerprint, including graded point geometry', () => {
  const source = createTeeTemplate()
  const original = fingerprint(source)
  const changed = structuredClone(source)
  changed.pieces[0].points[0].x += 0.01
  assert.notEqual(fingerprint(changed), original)
  changed.pieces[0].points[0].x -= 0.01
  changed.grading.sizes = changed.grading.sizes.slice(1)
  assert.notEqual(fingerprint(changed), original)
})

test('nonfinite, sparse, cyclic and executable source data fail closed', () => {
  const source = createTeeTemplate()
  source.pieces[0].points[0].x = Number.NaN
  assert.equal(fingerprint(source), null)
  source.pieces[0].points[0].x = 0
  source.pieces[0].notches = new Array(2)
  assert.equal(fingerprint(source), null)
  source.pieces[0].notches = []
  source.pieces[0].malicious = () => true
  assert.equal(fingerprint(source), null)
  delete source.pieces[0].malicious
  source.loop = source
  assert.equal(fingerprint(source), null)
})
