import {createAccuMarkNativeRuleSet,compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'

const fail=reason=>({ok:false,reason})
/** Adopt explicitly generated verified per-panel affine proposals as a starting
 * individual vertex-size rule table. The resulting sidecar is EDITABLE, but
 * remains independent of the saved/native Rust grading session.
 * No exact cubic equivalence is claimed when seed came from affine preview. */
export function seedAccuMarkNativeRulesFromAffine20261023(snapshot,affineRun){
 if(!affineRun?.ok||affineRun.source!=='AFFINE_PROPOSAL_NOT_COMMITTED_GRADING')
  return fail('Verified, uncommitted per-panel affine proposal required')
 const panels=snapshot?.template?.panels
 if(!Array.isArray(panels)||!panels.length||Object.keys(affineRun.byPanel||{}).length!==panels.length)
  return fail('All native panels must have a complete verified affine proposal')
 const first=affineRun.byPanel[panels[0]?.id]
 if(!first?.ok)return fail('Native source panel has no verified affine size run')
 const created=createAccuMarkNativeRuleSet(snapshot,{sizes:first.sizes,baseSize:first.baseSize})
 if(!created.ok)return created
 const set=structuredClone(created.ruleSet)
 for(const panel of panels){
  const original=panel.polygon?.points
  const preview=affineRun.byPanel[panel.id]
  if(!preview?.ok||JSON.stringify(preview.sizes)!==JSON.stringify(set.sizes)||
    preview.baseSize!==set.baseSize||preview.sizeRun?.[set.baseSize]?.polygon?.points?.length!==original.length)
    return fail('Panel sizes, baseline points or provenance mismatch: '+panel.id)
  for(const size of set.sizes){
   const polygon=preview.sizeRun[size]?.polygon
   if(!polygon||!Array.isArray(polygon.points)||polygon.points.length!==original.length||
     JSON.stringify(polygon.edges||null)!==JSON.stringify(panel.polygon.edges||null))
     return fail('Missing or incompatible affine source polygon: '+panel.id+'/'+size)
   const offsets=[]
   for(let i=0;i<original.length;i++){
    const point=polygon.points[i],baseline=original[i]
    if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||
      !Array.isArray(baseline)||baseline.length!==2||!baseline.every(Number.isFinite))
      return fail('Nonfinite source/affine coordinate: '+panel.id)
    const delta=point.map((value,axis)=>(value-baseline[axis])*1000)
    if(delta.some(n=>!Number.isFinite(n)||Math.abs(n)>500))
      return fail('Affine size shift exceeds safe 500 mm bound: '+panel.id+'/'+size)
    offsets.push(size===set.baseSize?[0,0]:delta)
   }
   set.panels[panel.id].pointOffsetsMm[size]=offsets
  }
 }
 const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,set,{selectedSize:first.selectedSize})
 if(!compiled.ok)return fail('Derived individual point rules cannot be previewed: '+compiled.reason)
 return {ok:true,ruleSet:set,source:'SEEDED_FROM_VERIFIED_AFFINE_PROPOSAL',warning:'Cubic/free-knot proposals may differ from originating native affine curve after per-point reconstruction'}
}
