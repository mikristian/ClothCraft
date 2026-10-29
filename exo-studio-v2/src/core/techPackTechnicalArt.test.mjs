import test from 'node:test'
import assert from 'node:assert/strict'
import {technicalPatternPieces,layoutTechnicalPatterns,projectTechnicalMesh,sourceSeamCallouts} from './techPackTechnicalArt.js'

const specimen={template:{panels:[
  {id:'front',name:'Front panel',fabric:'denim',polygon:{points:[[0,0],[.24,0],[.24,.4],[0,.4]],edges:['top','side','hem','side2']}},
  {id:'back',name:'Back panel',fabric:'denim',polygon:{points:[[.3,0],[.54,0],[.54,.4],[.3,.4]]}}],seams:[{id:'inside',name:'Inseam',a:{panel:'front',edge:'side'},b:{panel:'back',edge:'side'}}]},
  positions:[[0,0,0],[.25,0,0],[0,.5,0],[.25,.5,.12]],triangles:[[0,1,2],[1,3,2]]}

test('native technical drawing uses original panel geometry without mutation',()=>{
  const before=structuredClone(specimen)
  const shapes=technicalPatternPieces(specimen,null,true)
  const drawing=layoutTechnicalPatterns(shapes)
  assert.equal(drawing.pieces.length,2)
  assert.match(drawing.pieces[0].path,/M/)
  assert.equal(Math.round(drawing.pieces[0].dimension[0]),240)
  assert.equal(Math.round(drawing.pieces[0].dimension[1]),400)
  assert.deepEqual(specimen,before)
})

test('three technical projections come from actual vertices and have drawable silhouette paths',()=>{
  for(const view of ['front','back','side']){
    const drawing=projectTechnicalMesh(specimen,view)
    assert.equal(drawing.kind,'mesh-projection')
    assert.equal(drawing.faces,2)
    assert(drawing.edges.length>=4)
    assert(drawing.filled.every(path=>/^M[\d.]+ [\d.]+ L/.test(path)))
  }
  assert.equal(projectTechnicalMesh({positions:[],triangles:[]},'front'),null)
})

test('seam callouts only identify seams present in source with traceable identities',()=>{
  const pieces=layoutTechnicalPatterns(technicalPatternPieces(specimen,null,true)).pieces
  const rows=sourceSeamCallouts([{id:'inside',name:'Inseam',first:'front',from:'side',second:'back',type:'basic'}],pieces)
  assert.equal(rows.length,1)
  assert.equal(rows[0].id,'inside')
  assert.equal(rows[0].detail,'front / back')
  assert.equal(rows[0].number,1)
  assert.equal(rows[0].located,true)
  assert.equal(sourceSeamCallouts([{id:'bad',first:'front',from:'made-up-edge'}],pieces)[0].located,false)
})

test('nonfinite pattern coordinates are excluded rather than drawn or scaled',()=>{
  const bad={template:{panels:[{id:'bad',polygon:{points:[[0,0],[Infinity,0],[1,1],[0,1]]}}]}}
  const drawing=layoutTechnicalPatterns(technicalPatternPieces(bad,null,true))
  assert(drawing.pieces.every(p=>!p.path.includes('NaN')&&!p.path.includes('Infinity')))
})
