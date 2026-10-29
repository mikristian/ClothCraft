import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'

const fail=reason=>({ok:false,reason})
const validPoint=(p,snapshot)=>{
 if(!p||typeof p.panelId!=='string'||!Number.isInteger(p.pointIndex)||p.pointIndex<0)return false
 const panels=snapshot?.template?.panels?.filter(panel=>panel?.id===p.panelId)||[]
 return panels.length===1&&p.pointIndex<panels[0].polygon?.points?.length
}
/** Copy true per-size X and/or Y base-relative growth from a native source
 * point to arbitrary independent vertices across panels. Immutable, atomic,
 * sidecar-only. All sizes remain base-fixed and source polygon unchanged. */
export function copyAccuMarkNativePointRules20261023(snapshot,ruleSet,{
 source,targets,axis='both',
}={}){
 if(!['x','y','both'].includes(axis))return fail('Grading transfer axis must be x, y or both')
 if(!Array.isArray(targets)||targets.length<1||targets.length>128)
  return fail('Choose 1–128 destination grading points')
 if(!validPoint(source,snapshot))return fail('Select an existing source panel and point')
 if(!targets.every(target=>validPoint(target,snapshot)))
  return fail('Unknown or invalid grading destination')
 const ids=targets.map(target=>target.panelId+':'+target.pointIndex)
 if(new Set(ids).size!==ids.length)return fail('Duplicate grading destination is not permitted')
 const sourceId=source.panelId+':'+source.pointIndex
 if(ids.includes(sourceId))return fail('Source point cannot be its own transfer destination')
 const base=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{
  selectedSize:ruleSet?.sizes?.includes('L')?'L':ruleSet?.baseSize,
 })
 if(!base.ok)return fail('Invalid or stale native grading rule source: '+base.reason)
 const next=structuredClone(ruleSet)
 for(const size of next.sizes){
  const src=ruleSet.panels[source.panelId].pointOffsetsMm[size][source.pointIndex]
  for(const target of targets){
   const destination=next.panels[target.panelId].pointOffsetsMm[size][target.pointIndex]
   if(axis!=='y')destination[0]=src[0]
   if(axis!=='x')destination[1]=src[1]
  }
 }
 const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,next,{
  selectedSize:base.byPanel[source.panelId]?.selectedSize||next.baseSize,
 })
 if(!compiled.ok)return fail('Grade copy would create invalid geometry: '+compiled.reason)
 return {ok:true,ruleSet:next,validation:{
  sizes:[...next.sizes],source,targets:[...targets],axis,
  sourceType:'SEPARATE_NATIVE_EXO_POINT_RULE_SIDECAR',manufacturingApproved:false,
 }}
}
