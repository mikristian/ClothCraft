import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const file=new URL('./ModarisSeamWalkInspector20261027.jsx',import.meta.url)
const source=fs.readFileSync(file,'utf8')

test('read-only seam-walk inspector exposes a real measured seam selector and explicit limitations',()=>{
  assert.match(source,/analyzeModarisSeamWalking20261027/)
  assert.match(source,/seamWalkingSourceToken20261027/)
  assert.match(source,/seamIds,sourceToken/)
  assert.match(source,/Ordered additional continuous seam IDs/)
  assert.match(source,/locationA/)
  assert.match(source,/locationB/)
  assert.match(source,/sizes:\[\.\.\.\(project\?\.grading\?\.sizes\|\|\[\]\)\]/)
  assert.match(source,/never moves geometry/i)
  assert.match(source,/data-modaris-seam-walking="read-only"/)
  assert.match(source,/Math\.round|toFixed/)
  assert.doesNotMatch(source,/onApplyProject|onApplyGrade|mutateProject/)
  const library=fs.readFileSync(new URL('./AccuMark2DLibrary.jsx',import.meta.url),'utf8')
  assert.match(library,/ModarisSeamWalkInspector20261027/)
  assert.match(library,/data-modaris-grade-seamwalk/)
})
