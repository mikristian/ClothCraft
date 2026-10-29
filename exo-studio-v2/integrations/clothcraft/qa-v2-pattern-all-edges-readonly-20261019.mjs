// Read-only exhaustive shape editing smoke test using the native V2 fixture.
// Exercises every edge/handle in memory; does NOT submit Shape to the bridge.
import assert from 'node:assert/strict'
import {patternEditingControls,editPatternBezierHandle,previewPatternAnchorMove} from '../../src/core/vectorPatternBezier.js'
import {addNativeFreeCurvePoint,symmetricCurveEdge} from '../../src/core/nativeFreeCurvePoints.js'

const base=process.env.EXO_CURVE_QA_BRIDGE||'http://127.0.0.1:5385'
const response=await fetch(base+'/workspace',{
  method:'POST',headers:{'Content-Type':'application/json','Origin':'http://127.0.0.1:5386'},
  body:JSON.stringify({op:'snapshot'}),signal:AbortSignal.timeout(15000),
})
assert(response.ok,'Native snapshot request failed')
const result=await response.json()
assert(result.ok&&result.data?.template?.panels,'Native template unavailable')
const before=result.data.revision
const panels=[]
for(const panel of result.data.template.panels){
  const polygon=panel.polygon
  if(!polygon?.edges?.length||!polygon.points?.length)continue
  const original=JSON.stringify(polygon),details=[]
  for(const edge of polygon.edges){
    const prepared=patternEditingControls(polygon,[edge])
    assert(prepared.curves?.[edge]?.length===2,`${panel.id}/${edge} missing editable controls`)
    for(const index of [0,1]){
      const edited=editPatternBezierHandle(prepared,edge,index,[.001,.002],{
        mirrorAcrossPattern:true,breakTangents:false,
      })
      assert(edited,`${panel.id}/${edge}/${index} cannot edit outside neckline`)
      assert.equal(edited.points.length,polygon.points.length)
      assert.deepEqual(edited.edges,polygon.edges)
      for(const controls of Object.values(edited.curves||{}))
        assert(controls.every(pt=>pt.length===2&&pt.every(Number.isFinite)))
    }
    // An unpaired edge is still independently authorable. A symmetric partner
    // should be generated automatically; no hidden "neckline only" restriction.
    const mirrored=addNativeFreeCurvePoint(polygon,edge,.5,{mirror:true})
    const independent=mirrored||addNativeFreeCurvePoint(polygon,edge,.5,{mirror:false})
    assert(independent?.polygon,`${panel.id}/${edge} could not receive a free curve point`)
    details.push({edge,symmetricPartner:symmetricCurveEdge(polygon,edge)?.edge||null,
      createdMirror:Boolean(mirrored)})
  }
  for(let i=0;i<polygon.points.length;i++){
    const moved=previewPatternAnchorMove(polygon,i,[.001,.002])
    assert(moved?.points?.[i]?.every(Number.isFinite),`${panel.id} anchor ${i} cannot preview`)
  }
  assert.equal(JSON.stringify(polygon),original,'In-memory QA changed native input')
  panels.push({id:panel.id,edges:details.length,editableHandles:details.length*2,
    mirroredMarks:details.filter(item=>item.createdMirror).length,details})
}
assert(panels.length,'No native shape panels available for coverage')
const afterResponse=await fetch(base+'/workspace',{
  method:'POST',headers:{'Content-Type':'application/json','Origin':'http://127.0.0.1:5386'},
  body:JSON.stringify({op:'snapshot'}),signal:AbortSignal.timeout(15000),
})
const after=(await afterResponse.json()).data
assert.equal(after?.revision,before,'Read-only shape fixture test mutated garment')
console.log(JSON.stringify({pass:true,revisionBefore:before,revisionAfter:after.revision,
  edges:panels.reduce((n,p)=>n+p.edges,0),panels},null,2))
