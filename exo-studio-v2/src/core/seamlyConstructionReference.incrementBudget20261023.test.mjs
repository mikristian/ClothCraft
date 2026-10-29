import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSeamlyConstructionReference } from './seamlyConstructionReference.js'

const sourceWithIncrements = (count) => `<pattern><version>1</version><unit>cm</unit><increments>${Array.from({ length: count }, (_, index) => `<increment name="#value_${index}" formula="${index}"/>`).join('')}</increments><draftBlock name="Front"><calculation><point id="1" type="single" formula="#value_0"/></calculation></draftBlock></pattern>`

test('Seamly 2D drafting import rejects more than 6000 increments within the XML byte limit', () => {
  const source = sourceWithIncrements(6001)
  assert(source.length < 4 * 1024 * 1024)
  assert.throws(() => parseSeamlyConstructionReference(source), /too many increments/i)
})

test('Seamly 2D drafting import retains 6000 legitimate increment records without modifying source', () => {
  const source = sourceWithIncrements(6000)
  const original = source
  const graph = parseSeamlyConstructionReference(source, { filename: 'synthetic.sm2d' })
  assert.equal(source, original)
  assert.equal(graph.incrementCount, 6000)
  assert.equal(graph.toolCount, 1)
  assert.deepEqual(graph.unresolvedIncrements, [])
  assert.equal(graph.increments[5999].name, '#value_5999')
  assert.equal(graph.sourceName, 'synthetic.sm2d')
  assert.equal(graph.kind, 'sm2d')
  assert.equal(graph.factoryCertified, undefined)
})
