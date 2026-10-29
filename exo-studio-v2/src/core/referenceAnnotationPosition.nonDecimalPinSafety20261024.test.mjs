import assert from 'node:assert/strict'
import { test } from 'node:test'
import { referenceAnnotationPercentPosition } from './referenceAnnotationPosition.js'
import { buildTraditionalTechPackHTML } from './digitalTechPack.js'
import { buildPortableTechPackHTML } from './techPackHtmlExport.js'

const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAABoqXUAAAAASUVORK5CYII='

test('nondecimal coordinate strings cannot masquerade as normalized reference-image pin positions', () => {
  for (const value of ['0x1', '0X0', '0b0', '0B1', '0o1', '0O0']) {
    assert.equal(referenceAnnotationPercentPosition({ x: value, y: 0.5 }), null, `x=${value}`)
    assert.equal(referenceAnnotationPercentPosition({ x: 0.5, y: value }), null, `y=${value}`)
  }
})

test('decimal numbers, decimal strings, exponent strings, and edge stations keep their exact positions', () => {
  assert.deepEqual(referenceAnnotationPercentPosition({ x: '2.5e-1', y: '.75' }), { left: 25, top: 75 })
  assert.deepEqual(referenceAnnotationPercentPosition({ x: ' 0 ', y: '1.0' }), { left: 0, top: 100 })
  assert.deepEqual(referenceAnnotationPercentPosition({ x: 0.25, y: 0.75 }), { left: 25, top: 75 })
})

test('both tech-pack renderers retain malformed annotation notes but do not draw nondecimal pins', () => {
  const project = { id: 'nondecimal-pin-qa', name: 'Reference pin QA' }
  const state = { source: { project }, draft: { styleName: 'Reference pin QA', references: [
    { dataUrl, annotations: [{ x: '0x1', y: 0.5, text: 'review-hex-pin' },
      { x: 0.5, y: '0b0', text: 'review-binary-pin' }] },
  ] } }
  const before = structuredClone(state)
  for (const html of [buildTraditionalTechPackHTML(project, state), buildPortableTechPackHTML(project, state)]) {
    assert.match(html, /review-hex-pin/)
    assert.match(html, /review-binary-pin/)
    assert.doesNotMatch(html, /class="(?:reference-pin|callout)"/)
  }
  assert.deepEqual(state, before, 'rendering must preserve source data')
})
