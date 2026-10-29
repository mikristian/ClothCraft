import assert from 'node:assert/strict'
import { createTemplateProject } from '../src/data/templates.js'
import { inferPatternBodyRole, arrangePatternProject } from '../src/core/patternBodyArrangement.js'
import { stagedPanelPositions } from '../src/core/staging.js'
import { samplePieceBoundary } from '../src/core/project.js'

const pants = createTemplateProject('pants')
const ids = ['pants-left-front', 'pants-left-back', 'pants-right-front', 'pants-right-back']
assert.equal(pants.seams.length, 10)
assert.deepEqual(pants.pieces.map(piece=>piece.id), ids)
assert.deepEqual(pants.pieces.map(piece=>piece.arrangement3d.wrap), [
  'left-leg-front', 'left-leg-back', 'right-leg-front', 'right-leg-back',
])
const center = positions => positions.reduce((sum, point) => ({
  x: sum.x + point.x / positions.length, y: sum.y + point.y / positions.length,
  z: sum.z + point.z / positions.length,
}), {x:0,y:0,z:0})
const staged = Object.fromEntries(pants.pieces.map(piece => {
  const flatVertices = samplePieceBoundary(piece, 4).points
  const positions = stagedPanelPositions({piece,flatVertices},pants.avatar)
  assert.equal(positions.length,flatVertices.length)
  assert.ok(positions.every(p=>[p.x,p.y,p.z].every(Number.isFinite)),`finite ${piece.id}`)
  const depths = positions.map(p=>p.z)
  assert.ok(Math.max(...depths)-Math.min(...depths)>.045,`curved ${piece.id}`)
  return [piece.id,center(positions)]
}))
assert.ok(staged['pants-left-front'].x < staged['pants-right-front'].x)
assert.ok(staged['pants-left-front'].z > staged['pants-left-back'].z)
assert.ok(staged['pants-right-front'].z > staged['pants-right-back'].z)

const unnamed={ id:'my-pants',name:'Custom Pants',pieces:[
  {id:'front-left-leg',name:'Left Front Leg',points:[{x:0,y:0},{x:20,y:0},{x:20,y:90},{x:0,y:90}],arrangement3d:{x:0,y:0,z:0}},
  {id:'front-right-leg',name:'Right Front Leg',points:[{x:0,y:0},{x:20,y:0},{x:20,y:90},{x:0,y:90}],arrangement3d:{x:0,y:0,z:0}},
  {id:'pocket',name:'Coin Pocket',points:[{x:0,y:0},{x:8,y:0},{x:8,y:8}],arrangement3d:{x:.4,y:.8,z:.4}},
],seams:[{id:'source-seam',a:{pieceId:'front-left-leg',edgeIndex:1},b:{pieceId:'front-right-leg',edgeIndex:1}}],fabrics:{denim:{color:'#273a50'}}}
const original=structuredClone(unnamed)
const arranged=arrangePatternProject(unnamed)
assert.equal(arranged.pieces[0].arrangement3d.wrap,'left-leg-front')
assert.equal(arranged.pieces[1].arrangement3d.wrap,'right-leg-front')
assert.equal(arranged.pieces[2].arrangement3d.wrap,undefined)
assert.deepEqual(arranged.seams,original.seams)
assert.deepEqual(arranged.fabrics,original.fabrics)
assert.deepEqual(arranged.pieces.map(p=>p.points),original.pieces.map(p=>p.points))
assert.deepEqual(unnamed,original)
assert.equal(inferPatternBodyRole({id:'panel-x',name:'Unknown Panel'},unnamed),null)
console.log('PASS reusable 2D-to-3D anatomical arrangement: pants 4 curved panels, role inference, seam/fabric preservation')
