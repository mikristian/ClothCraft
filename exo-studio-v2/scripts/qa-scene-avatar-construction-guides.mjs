import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {avatarSurfaceConstructionCurves, sliceAvatarAtHeight} from '../src/components/avatarConstructionGuides.js'

const source=readFileSync(new URL('../src/components/ClothCraftSceneV2.jsx',import.meta.url),'utf8')
const cube=(cx=0,cy=0,cz=0,r=1)=>({
  positions:[[-r,0,-r],[r,0,-r],[r,2*r,-r],[-r,2*r,-r],[-r,0,r],[r,0,r],[r,2*r,r],[-r,2*r,r]].map(([x,y,z])=>[x+cx,y+cy,z+cz]),
  triangles:[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]],
})

test('closed triangle mesh yields repeatable surface-following section and center references',()=>{
  const mesh=cube()
  const first=avatarSurfaceConstructionCurves(mesh.positions,mesh.triangles)
  assert.deepEqual(first,avatarSurfaceConstructionCurves(mesh.positions,mesh.triangles))
  for(const name of ['chest-surface-reference','waist-surface-reference','navel-surface-reference','center-front-reference','center-back-reference']){
    assert.ok(first.some(curve=>curve.name===name),name)
  }
  for(const curve of first){
    assert.ok(curve.points.length>=3)
    assert.ok(curve.points.every(p=>p.length===3&&p.every(Number.isFinite)))
    assert.ok(curve.points.every(p=>Math.abs(p[0])<=1.00001&&Math.abs(p[2])<=1.00001))
  }
  assert.ok(first.find(c=>c.name==='chest-surface-reference').points.length>3)
})

test('invalid vertices, collapsed triangles and open torso slices fail safely',()=>{
  for(const [positions,triangles] of [
    [[],[]],
    [[[NaN,0,0],[1,2,0],[0,1,0]],[[0,1,2]]],
    [[[0,0,0],[0,0,0],[0,0,0]],[[0,1,2]]],
    [[[0,0,0],[1,0,0],[0,2,0]],[[0,1,2]]],
    [cube().positions,[]],
  ]){
    assert.deepEqual(avatarSurfaceConstructionCurves(positions,triangles),[])
    assert.deepEqual(sliceAvatarAtHeight(positions,triangles,1),[])
  }
})

test('disconnected arm-like geometry does not splice the center torso contour',()=>{
  const torso=cube(), side=cube(5,0,0,.3)
  const positions=[...torso.positions,...side.positions]
  const triangles=[...torso.triangles,...side.triangles.map(tri=>tri.map(i=>i+torso.positions.length))]
  const contour=sliceAvatarAtHeight(positions,triangles,1,0)
  assert.ok(contour.length>=4)
  assert.ok(contour.every(p=>Math.abs(p[0])<=1.00001))
})

test('Guides button and avatar visibility remain wired to view state',()=>{
  assert.match(source,/const \[showConstructionGuides, setShowConstructionGuides\] = useState\(false\)/)
  assert.match(source,/aria-pressed=\{showConstructionGuides\} onClick=\{\(\)=>setShowConstructionGuides\(value=>!value\)\}/)
  assert.match(source,/guideGroup\.visible=showConstructionGuides/)
  assert.match(source,/mode, showAvatar, showConstructionGuides,/)
  assert.match(source,/avatar\.visible = showAvatar/)
  assert.match(source,/dataset\.constructionGuidesVisible=String\(showAvatar && showConstructionGuides &&/)
})
