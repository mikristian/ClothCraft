import assert from 'node:assert/strict'
import { test } from 'node:test'
import { referenceAnnotationPercentPosition } from './referenceAnnotationPosition.js'
import { buildTraditionalTechPackHTML } from './digitalTechPack.js'
import { buildPortableTechPackHTML } from './techPackHtmlExport.js'

test('nonzero decimal coordinates underflowing to zero cannot create false image-edge pins', () => {
  for (const x of ['1e-9999', '-1e-9999', '.00001e-9999']) {
    assert.equal(referenceAnnotationPercentPosition({ x, y: 0.5 }), null, x)
  }
})

test('decimal coordinates rounded to one cannot create false image-edge pins', () => {
  for (const x of ['1.0000000000000001', '0.99999999999999999', '1.0000000000000001e0']) {
    assert.equal(referenceAnnotationPercentPosition({ x, y: 0.5 }), null, x)
  }
})

test('exact zero and one, ordinary decimals and scientific notation remain valid', () => {
  for (const x of ['0', '-0e-9999', '1', '1.000e0', '10e-1', '0.01e2']) {
    assert.deepEqual(referenceAnnotationPercentPosition({ x, y: 0.5 }), { left: Number(x) * 100, top: 50 }, x)
  }
  assert.deepEqual(referenceAnnotationPercentPosition({ x: '2.5e-1', y: '7.5e-1' }), { left: 25, top: 75 })
})

test('tech-pack exporters retain note text without rendering falsely rounded edge pins', () => {
  const project = { id: 'rounding-pin', name: 'Rounding pin QA' }
  const annotations = ['1e-9999', '1.0000000000000001'].map((x, i) => ({ x, y: 0.5, text: `review-rounding-${i}` }))
  const state = { source: { project }, draft: { styleName: 'Rounding pin QA', references: [{
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAABoqXUAAAAASUVORK5CYII=',
    annotations,
  }] } }
  const original = structuredClone(state)
  for (const html of [buildTraditionalTechPackHTML(project, state), buildPortableTechPackHTML(project, state)]) {
    assert.match(html, /review-rounding-0/)
    assert.match(html, /review-rounding-1/)
    assert.doesNotMatch(html, /class="(?:reference-pin|callout)"/)
  }
  assert.deepEqual(state, original)
})
