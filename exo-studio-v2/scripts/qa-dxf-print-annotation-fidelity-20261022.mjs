import assert from 'node:assert/strict'
import { projectToDxf, parseDxfPatterns } from '../src/core/dxf.js'
import { createDefaultProject } from '../src/data/defaultProject.js'
import { patternTiledPrint } from '../src/core/patternTiledPrint.js'

const project = createDefaultProject()
const dxf = projectToDxf(project, 'M')
assert.match(dxf, /9\n\$INSUNITS\n70\n4\n/, 'DXF declares millimetres for independent CAD consumers')
assert.match(dxf, /8\nLABEL_FRONT\n/, 'DXF exports named cutting pieces')
assert.match(dxf, /8\nGRAIN_FRONT\n/, 'DXF exports grain orientation')
const imported = parseDxfPatterns(dxf)
assert.equal(imported.pieces.length, project.pieces.length, 'Annotations must not become extra pieces')
for (const piece of imported.pieces) {
  assert.ok(piece.points.length >= 3)
  assert.ok(Number.isFinite(piece.grainAngleDeg))
  assert.ok(piece.points.every(({x,y}) => Number.isFinite(x) && Number.isFinite(y)))
}

const fixture = (layer, lines) => [
  '0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC',
  '0','SECTION','2','ENTITIES',
  '0','LWPOLYLINE','8',layer,'70','1','90','4',
  '10','0','20','0','10','300','20','0','10','300','20','400','10','0','20','400',
  ...lines,
  '0','ENDSEC','0','EOF',
].join('\n')
const line = (layer, x1,y1,x2,y2) => ['0','LINE','8',layer,'10',String(x1),'20',String(y1),'11',String(x2),'21',String(y2)]
const annotated = parseDxfPatterns(fixture('CUT_TEST_PANEL_M', [
  ...line('GRAIN_TEST_PANEL',150,50,150,350),
  ...line('NOTCH_TEST_PANEL',100,0,100,5),
  ...line('BUTTONHOLE_TEST_PANEL',100,100,125,100),
  ...line('INTERNAL_FOLD_TEST_PANEL',25,50,25,350),
  ...line('POM_TEST_PANEL',50,50,250,50),
]))
assert.equal(annotated.pieces.length,1,'Non-cut layers cannot be imported as cutting outlines')
const piece = annotated.pieces[0]
assert.equal(piece.notches.length,1,'Notch must attach to the intended cut panel')
assert.ok(Math.abs(piece.notches[0].depthCm-0.5)<1e-8,'Notch length remains metric')
assert.equal(piece.buttonholes.length,1,'Buttonhole remains an annotation')
assert.ok(Math.abs(piece.buttonholes[0].lengthCm-2.5)<1e-8,'Buttonhole length remains metric')
assert.ok(Math.abs(piece.grainAngleDeg)<1e-8,'Grainline retains orientation')
assert.equal(piece.internalLines.length,1,'Internal foldline remains an annotation')

for (const format of ['A4','Letter']) {
  const plan = patternTiledPrint([[[0,0],[180,0],[180,240],[0,240],[0,0]]],{format,revision:7})
  assert.match(plan.html, /100 × 100 mm/)
  assert.match(plan.html, /Print at 100% \/ Actual size/)
  assert.equal(plan.tiles.length,plan.rows*plan.columns)
  assert.ok(plan.tiles.every(tile=>Number.isFinite(tile.x)&&Number.isFinite(tile.y)))
  assert.equal(plan.sourceRevision,'7')
}
console.log(JSON.stringify({pass:true,sourcePieces:project.pieces.length,annotationFixture:true,formats:['A4','Letter']}))
