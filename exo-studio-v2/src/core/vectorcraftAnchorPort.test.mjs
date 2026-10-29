import test from 'node:test'
import assert from 'node:assert/strict'
import {vectorcraftAnchorKind,setVectorcraftHandle} from './vectorcraftAnchorPort.js'
import {editPatternBezierHandle,cubicLength,snapControlAngle,splitCubic,previewPatternAnchorMove} from './vectorPatternBezier.js'

const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`)

test('VectorCraft smooth vs corner anchor classification, with absolute handles',()=>{
  assert.equal(vectorcraftAnchorKind([0,0],[-.04,0],[.08,0]),'smooth')
  assert.equal(vectorcraftAnchorKind([0,0],[-.04,.02],[.08,0]),'corner')
  assert.equal(vectorcraftAnchorKind([0,0],[0,0],[.08,0]),'corner')
})

test('millimetre-scale angular corners never auto-link their opposite Bézier handle',()=>{
  const p=[0,0],hIn=[-.001,0],hOut=[.001,.001]
  assert.equal(vectorcraftAnchorKind(p,hIn,hOut),'corner','45-degree 1 mm handle must not be treated as collinear')
  const anchor={p,hIn,hOut}
  const updated=setVectorcraftHandle(anchor,true,[.001,.002])
  assert.equal(updated.kind,'corner')
  assert.deepEqual(updated.hIn,hIn,'editing a short corner must not rotate its opposite control')
  assert.deepEqual(anchor.hOut,hOut,'source handles must remain untouched')
  assert.equal(vectorcraftAnchorKind(p,[-1,0],[1,1]),'corner','classification must not depend on handle scale')
})

test('small near-collinear tangents remain smooth under angular tolerance',()=>{
  assert.equal(vectorcraftAnchorKind([0,0],[-.001,0],[.001,1e-10]),'smooth')
  assert.equal(vectorcraftAnchorKind([0,0],[-1,0],[1,1e-7]),'smooth')
  assert.equal(vectorcraftAnchorKind([0,0],[-.001,0],[.001,.00001]),'corner')
})

test('2D Edit Pattern does not move an adjacent control at a short angled corner',()=>{
  const polygon={
    points:[[0,0],[.1,0],[.1,.1],[0,.1]],
    edges:['top','right','bottom','left'],
    curves:{top:[[.001,.001],[.08,0]],left:[[0,.08],[-.001,0]]},
  }
  const edited=editPatternBezierHandle(polygon,'top',0,[0,.001])
  assert.deepEqual(edited.curves.top[0],[.001,.002])
  assert.deepEqual(edited.curves.left[1],[-.001,0])
  assert.deepEqual(polygon.curves.top[0],[.001,.001])
})

test('ported set_handle preserves opposing smooth length and aligns vector tangents',()=>{
  const original={p:[0,0],hIn:[-.04,0],hOut:[.08,0],kind:'smooth'}
  const edited=setVectorcraftHandle(original,true,[0,.12])
  assert.deepEqual(edited.hOut,[0,.12])
  near(edited.hIn[0],0);near(edited.hIn[1],-.04)
  assert.deepEqual(original.hIn,[-.04,0],'must not mutate native source')
  const independently=setVectorcraftHandle(original,true,[0,.12],{independent:true})
  assert.deepEqual(independently.hIn,[-.04,0])
  assert.equal(independently.kind,'corner')
})

test('Edit Pattern preserves sharp neckline/shoulder corner without accidental neighbor changes',()=>{
  const polygon={
    points:[[0,0],[.25,0],[.3,.4],[0,.4]],
    edges:['neck','side','hem','shoulder'],
    curves:{neck:[[-.01,.1],[.17,.04]],shoulder:[[0,.28],[0,.06]]},
  }
  const edited=editPatternBezierHandle(polygon,'neck',0,[.05,.015])
  assert(edited)
  assert.deepEqual(edited.curves.shoulder,polygon.curves.shoulder)
  assert.deepEqual(edited.curves.neck[0],[.04,.115])
})

test('Edit Pattern preserves smooth opposite handle with physical-length constraint',()=>{
  const polygon={
    points:[[0,0],[1,0],[1,1],[0,1]],
    edges:['neck','right','hem','shoulder'],
    curves:{neck:[[.25,0],[.75,0]],shoulder:[[0,.75],[-.25,0]]},
  }
  const updated=editPatternBezierHandle(polygon,'neck',0,[0,.20])
  near(updated.curves.shoulder[1][0],-.25/Math.hypot(.25,.2)*.25)
  near(updated.curves.shoulder[1][1],-.20/Math.hypot(.25,.2)*.25)
  const independent=editPatternBezierHandle(polygon,'neck',0,[0,.20],{breakTangents:true})
  assert.deepEqual(independent.curves.shoulder[1],polygon.curves.shoulder[1])
  const shifted=editPatternBezierHandle(polygon,'neck',0,[0,.20],{snapAngle:true})
  const p=shifted.curves.neck[0],a=Math.atan2(p[1],p[0])
  near(a/(Math.PI/4),Math.round(a/(Math.PI/4)))
})

test('Cubic split preserves curve length in metres within tolerance',()=>{
  const a=[0,0],c1=[.1,.25],c2=[.22,-.08],b=[.32,0]
  const parts=splitCubic(a,c1,c2,b,.43)
  const original=cubicLength(a,c1,c2,b,192)
  const combined=cubicLength(...parts.left,192)+cubicLength(...parts.right,192)
  near(combined,original,1e-5)
  assert.deepEqual(snapControlAngle([0,0],[.10,.11]),[Math.cos(Math.PI/4)*Math.hypot(.1,.11),Math.sin(Math.PI/4)*Math.hypot(.1,.11)])
})

test('Existing pattern vertex drags preview adjoining handles in cm without changing edge identity',()=>{
  const polygon={
    points:[[0,0],[.3,0],[.3,.4],[0,.4]],
    edges:['neck','side','hem','shoulder'],
    curves:{neck:[[.08,-.02],[.24,-.04]],shoulder:[[0,.33],[-.01,.08]]},
    notches:{neck:[{t:.4,depth_m:.006}]},seam_allowances:{neck:.01},
  }
  const preview=previewPatternAnchorMove(polygon,0,[.025,-.015])
  assert.deepEqual(preview.points[0],[.025,-.015])
  near(preview.curves.neck[0][0],.105)
  near(preview.curves.neck[0][1],-.035)
  near(preview.curves.shoulder[1][0],.015)
  near(preview.curves.shoulder[1][1],.065)
  assert.deepEqual(preview.edges,polygon.edges)
  assert.deepEqual(preview.notches,polygon.notches)
  assert.deepEqual(preview.seam_allowances,polygon.seam_allowances)
  assert.deepEqual(polygon.points[0],[0,0])
  assert.equal(previewPatternAnchorMove(polygon,10,[1,1]),null)
})
