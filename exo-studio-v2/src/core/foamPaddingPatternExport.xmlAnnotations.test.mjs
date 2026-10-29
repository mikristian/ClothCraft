import assert from 'node:assert/strict'
import test from 'node:test'
import {exportFoamPaddingSvg} from './foamPaddingPatternExport.js'

const pad = {
  name: 'Cut & stitch <study>',
  points: [{x: 0, y: 0}, {x: 8, y: 0}, {x: 8, y: 8}, {x: 0, y: 8}],
  widthCm: 10, heightCm: 10, depthCm: 0.8, edgeWidthCm: 0.5,
}

for (const [label, character] of [
  ['NUL control', '\u0000'],
  ['disallowed C0 control', '\u001F'],
  ['unpaired high surrogate', '\uD800'],
  ['unpaired low surrogate', '\uDC00'],
  ['noncharacter U+FFFE', '\uFFFE'],
]) {
  test(`rejects ${label} in 2D SVG annotation`, () => {
    assert.throws(
      () => exportFoamPaddingSvg({...pad, name: `cut${character}line`}),
      /invalid XML characters/i,
    )
  })
}

test('preserves legal Unicode and XML-escapes label text without mutating source', () => {
  const original = structuredClone(pad)
  const svg = exportFoamPaddingSvg({...pad, name: 'Cut & stitch <study> 🧵'})
  assert.match(svg, /Cut &amp; stitch &lt;study&gt; 🧵/u)
  assert.match(svg, /id="foam-cut-line"/)
  assert.match(svg, /id="foam-stitch-guides"/)
  assert.deepEqual(pad, original)
})
