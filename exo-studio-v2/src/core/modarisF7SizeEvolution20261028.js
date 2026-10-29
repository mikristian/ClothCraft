import {createAccuMarkNativeRuleSet,compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {auditAccuMarkNativeRuleSizeQA20261023} from './accumarkNativeRuleSizeQA20261023.js'

/** Independent EXO authoring model, NOT a Lectra algorithm, Rust catalog or factory size run.
 * All operations are copy-on-write, source-fingerprint-bound and geometry-checked.
 */
export const MODARIS_F7_EXO_ACTIONS_20261028=Object.freeze([
 'add-size-correspondence','delete-size-correspondence','add-size-to-product',
 'delete-size-from-product','add-intermediate-size','break-size',
 'load-size-table','copy-size-table','size-grouping',
 'size-correspondence-management','evolution-table',
])
const fail=reason=>({ok:false,reason,nativeCommitted:false,manufacturingApproved:false})
const ok=(extra={})=>({ok:true,nativeCommitted:false,manufacturingApproved:false,...extra})
const validName=name=>typeof name==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/.test(name)&&
 !['__proto__','constructor','prototype'].includes(name)
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e6
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object||{},key)
const metadata=ruleSet=>({
 schema:'exo.size-evolution.v1',
 correspondences:{...(ruleSet.sizeEvolution?.correspondences||{})},
 groups:{...(ruleSet.sizeEvolution?.groups||{})},
})
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b)

export function copyModarisF7SizeTable20261028(snapshot,ruleSet){
 const checked=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet?.baseSize})
 if(!checked.ok)return fail('Stale source or invalid grading rules: '+checked.reason)
 return ok({table:{schema:'exo.independent-size-table.v1',
  templateFingerprint:ruleSet.templateFingerprint,
  sizes:[...ruleSet.sizes],baseSize:ruleSet.baseSize,
  panels:Object.fromEntries(Object.entries(ruleSet.panels).map(([id,panel])=>
   [id,structuredClone(panel.pointOffsetsMm)])),
  sizeEvolution:metadata(ruleSet)},
  notice:'Independent size table copied. This is not a native manufacturing catalog.'})
}

export function applyModarisF7SizeEvolution20261028(snapshot,ruleSet,{action,
 size,name,leftSize,rightSize,fraction=0.5,alias,group,table,
}={}){
 try{
  if(!MODARIS_F7_EXO_ACTIONS_20261028.includes(action))return fail('Unsupported F7 size-management command')
  if(!ruleSet)return fail('Create a source-linked grading draft before editing size evolution')
  const start=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet.baseSize})
  if(!start.ok)return fail('Stale or invalid source-linked grading rules: '+start.reason)
  if(action==='copy-size-table')return copyModarisF7SizeTable20261028(snapshot,ruleSet)
  if(action==='size-correspondence-management'||action==='evolution-table')
   return ok({notice:'Opened independently authored '+(action==='evolution-table'?'size evolution':'correspondence')+' table; no geometry changed.'})
  const next=structuredClone(ruleSet)
  next.sizeEvolution=metadata(ruleSet)
  const correspondence=next.sizeEvolution.correspondences
  const groups=next.sizeEvolution.groups
  const index=next.sizes.indexOf(size)
  if(action==='add-size-correspondence'){
   if(index<0||!validName(alias)||next.sizes.includes(alias)||own(correspondence,alias))
    return fail('Select an existing size and a new unique, safe correspondence label')
   correspondence[alias]=size
  }else if(action==='delete-size-correspondence'){
   if(!own(correspondence,alias))return fail('Size correspondence does not exist')
   delete correspondence[alias]
  }else if(action==='size-grouping'){
   if(index<0)return fail('Select a size for grouping')
   if(group==='')delete groups[size]
   else if(validName(group))groups[size]=group
   else return fail('Group label must be a safe nonempty name or empty to ungroup')
  }else if(action==='break-size'){
   // Break a named correspondence without deleting its graded point geometry.
   if(index<0||!Object.values(correspondence).includes(size))
    return fail('Select a size with at least one attached correspondence to break')
   for(const [key,target] of Object.entries(correspondence))if(target===size)delete correspondence[key]
  }else if(action==='add-intermediate-size'||action==='add-size-to-product'){
   if(!validName(name)||next.sizes.includes(name)||own(correspondence,name)||next.sizes.length>=24)
    return fail('New size must be unique and safe; the draft supports at most 24 sizes')
   let left,right,position,t
   if(action==='add-intermediate-size'){
    left=next.sizes.indexOf(leftSize);right=next.sizes.indexOf(rightSize)
    if(left<0||right!==left+1||!finite(fraction)||fraction<=0||fraction>=1)
     return fail('Choose adjacent named sizes and a strict interior interpolation fraction')
    position=right;t=fraction
   }else{
    if(next.sizes.length<2)return fail('At least two sizes are required for evolution')
    left=next.sizes.length-2;right=left+1;position=next.sizes.length;t=2
   }
   const a=next.sizes[left],b=next.sizes[right]
   for(const panel of Object.values(next.panels)){
    const start=panel.pointOffsetsMm[a],end=panel.pointOffsetsMm[b]
    panel.pointOffsetsMm[name]=start.map(([x,y],i)=>[
     x+(end[i][0]-x)*t,y+(end[i][1]-y)*t])
   }
   next.sizes.splice(position,0,name)
  }else if(action==='delete-size-from-product'){
   if(index<0||size===next.baseSize||next.sizes.length<=2)
    return fail('Delete only an existing non-base size while preserving at least two sizes')
   next.sizes.splice(index,1)
   for(const panel of Object.values(next.panels))delete panel.pointOffsetsMm[size]
   for(const [key,target] of Object.entries(correspondence))if(target===size)delete correspondence[key]
   delete groups[size]
  }else if(action==='load-size-table'){
   if(table?.schema!=='exo.independent-size-table.v1'||table.templateFingerprint!==ruleSet.templateFingerprint||
    !Array.isArray(table.sizes)||!table.sizes.every(validName)||
    table.sizes.length<2||table.sizes.length>24||new Set(table.sizes).size!==table.sizes.length||
    !table.sizes.includes(table.baseSize)||
    !equal(Object.keys(table.panels||{}).sort(),Object.keys(ruleSet.panels).sort()))
    return fail('Size table schema, source fingerprint, size range or panel IDs do not match')
   next.sizes=[...table.sizes]
   next.baseSize=table.baseSize
   for(const [id,panel] of Object.entries(next.panels)){
    const source=table.panels[id]
    if(!source||!equal(Object.keys(source).sort(),[...table.sizes].sort())||
     table.sizes.some(sz=>!Array.isArray(source[sz])||
      source[sz].length!==panel.sourcePointCount||
      !source[sz].every(vector=>Array.isArray(vector)&&vector.length===2&&vector.every(finite))))
     return fail(`Malformed physical point-offset table for ${id}`)
    panel.pointOffsetsMm=structuredClone(source)
   }
   next.sizeEvolution=metadata({sizeEvolution:table.sizeEvolution})
  }
  if(Object.entries(next.sizeEvolution.correspondences).some(([key,target])=>
    !validName(key)||next.sizes.includes(key)||!next.sizes.includes(target))||
   Object.entries(next.sizeEvolution.groups).some(([key,value])=>!next.sizes.includes(key)||!validName(value)))
   return fail('Invalid size correspondence or grouping after change')
  if(Object.values(next.panels).some(panel=>next.sizes.some(sz=>
    !Array.isArray(panel.pointOffsetsMm[sz])||
    panel.pointOffsetsMm[sz].some(point=>!Array.isArray(point)||point.length!==2||!point.every(finite)))))
   return fail('Size evolution produced a nonfinite or out-of-range physical growth vector')
  // The source grading utility rejects zero-base offsets, stale source,
  // invalid coordinates and inconsistent point counts. QA rejects unsafe cuts.
  const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,next,{selectedSize:next.baseSize})
  if(!compiled.ok)return fail('New size run rejected: '+compiled.reason)
  const qa=auditAccuMarkNativeRuleSizeQA20261023(snapshot,next,{allowNamedSizes:true})
  if(!qa.ok||qa.blocks)return fail('Graded physical geometry QA rejected size evolution: '+
   (qa.issues?.[0]?.reason||qa.reason||'invalid contour'))
  return ok({ruleSet:next,notice:'Validated size authoring draft: '+next.sizes.join(' · ')+
   '. Native Rust persistence requires a separate verified transaction; factory release remains unapproved.'})
 }catch(error){return fail(String(error?.message||error))}
}
