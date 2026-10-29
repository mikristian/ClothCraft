import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {auditAccuMarkNativeRuleSizeQA20261023} from './accumarkNativeRuleSizeQA20261023.js'

// Independent, atomic sidecar operations. These are authoring/preview rules,
// never evidence that a native Rust session or manufacturing pattern was changed.
export const OPTITEX_GRADE_TOOL_IDS_20261027 = Object.freeze([
  'prev-point','copy-grading','paste-grading','set-grading-tool','paste-x-grading','paste-y-grading',
  'paste-relatively','paste-dd-grading','next-point','angle','show-from-base-size',
  'grade-proportionally','clear-grading','stack-point','move-point-size',
  'move-size-along','move-size-proportional','move-size-parallel',
  'move-size-by-rectangle','align-points-size','align-vertical-size',
  'align-horizontal-size','align-size-by-line','grade-notch',
])

const aliases=Object.freeze({
 'set-grading':'set-grading-tool','paste-x':'paste-x-grading',
 'paste-y':'paste-y-grading','paste-relative':'paste-relatively',
 'paste-dd':'paste-dd-grading','show-base':'show-from-base-size',
 'grade-proportional':'grade-proportionally',
 'move-size-rectangle':'move-size-by-rectangle','align-size-line':'align-size-by-line',
})

const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e6
const vector = p => Array.isArray(p) && p.length === 2 && p.every(finite)
const failure = reason => ({ok:false,reason,nativeCommitted:false,manufacturingApproved:false})
const good = extra => ({ok:true,nativeCommitted:false,manufacturingApproved:false,...extra})
const add = (a,b) => [a[0]+b[0],a[1]+b[1]]
const subtract = (a,b) => [a[0]-b[0],a[1]-b[1]]
const scale = (a,s) => [a[0]*s,a[1]*s]
const norm = a => Math.hypot(a[0],a[1])
const rotate = (p,r) => [p[0]*Math.cos(r)-p[1]*Math.sin(r),p[0]*Math.sin(r)+p[1]*Math.cos(r)]
const has = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key)

/**
 * Tool contract (all distances in mm):
 * - clipboard is the `copy-grading` return value, accepted as args.clipboard.
 * - `size` selects a specific size for `move-point-size`; other edits cover all
 *   non-base sizes, with index distance relative to the fixed base size.
 * - sourcePointIndex/referencePointIndex supply supporting vertices; pointIndices
 *   identifies points for group alignment; rectangle is either
 *   {minX,minY,maxX,maxY} or {xMm,yMm,widthMm,heightMm} in source-panel mm.
 * - operations that lack enough geometric information fail atomically.
 */
export function applyOptitexGradeTool20261027({
  snapshot,ruleSet,toolId,panelId,pointIndex,targetPointIndex,
  sourcePointIndex,referencePointIndex,size,axis='both',amountMm,
  angleDeg,pointIndices,rectangle,clipboard,
}={}) {
 try {
  toolId=aliases[toolId]||toolId
  if (!OPTITEX_GRADE_TOOL_IDS_20261027.includes(toolId)) return failure('Unknown grading tool. Select one of the 24 grading tools')
  const initial=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet?.baseSize})
  if(!initial.ok)return failure('Invalid or stale native grading sidecar: '+initial.reason)
  const sourcePanel=snapshot.template.panels.find(p=>p.id===panelId)
  if(!sourcePanel)return failure('Select an existing native grading panel')
  const points=sourcePanel.polygon.points.map(p=>scale(p,1000))
  const validIndex=i=>Number.isInteger(i)&&i>=0&&i<points.length
  if(!validIndex(pointIndex))return failure('Select a valid polygon point')
  if(!['both','x','y'].includes(axis))return failure('Axis must be x, y or both')
  const sizes=ruleSet.sizes,baseIndex=sizes.indexOf(ruleSet.baseSize)
  const nonbase=sizes.filter(s=>s!==ruleSet.baseSize)
  const old=ruleSet.panels[panelId].pointOffsetsMm
  const vectorAt=(sz,i)=>old[sz][i]
  if(targetPointIndex!==undefined&&!validIndex(targetPointIndex))return failure('Target point index is outside native source polygon')
  const selected=targetPointIndex??pointIndex
  const allSizes=fn=>{for (const sz of nonbase)fn(sz,sizes.indexOf(sz)-baseIndex)}
  if(toolId==='prev-point'||toolId==='next-point')return good({selectedPointIndex:(pointIndex+(toolId==='next-point'?1:-1)+points.length)%points.length,notice:'Selected adjacent source point'})
  if(toolId==='show-from-base-size')return good({selectedPointIndex:pointIndex,view:{size:ruleSet.baseSize,basePointsMm:points.map(p=>[...p])},notice:'Showing the base size; grading values are unchanged'})
  if(toolId==='stack-point')return good({selectedPointIndex:pointIndex,view:{stackPointIndex:pointIndex},notice:'Showing the selected grading point across sizes; grading values are unchanged'})
  if(toolId==='grade-notch')return good({selectedPointIndex:pointIndex,handoff:{kind:'notch-grading',panelId,pointIndex,requiresNativeNotchLink:true},notice:'Use the native notch link/editor to grade the physical notch; no notch has been changed'})
  if(toolId==='copy-grading')return good({selectedPointIndex:pointIndex,clipboard:{schema:'exo.grade-clipboard.v1',sizes:[...sizes],baseSize:ruleSet.baseSize,vectors:Object.fromEntries(sizes.map(sz=>[sz,[...vectorAt(sz,pointIndex)]]))},notice:'Per-size point grading copied'})
  const next=structuredClone(ruleSet)
  const dest=next.panels[panelId].pointOffsetsMm
  const put=(sz,i,v)=>{
   if(!vector(v))throw Error('Computed grade offsets exceed supported finite ±1,000,000 mm')
   if(sz!==ruleSet.baseSize)dest[sz][i]=v.map(n=>n===0?0:n)
  }
  const applyAt=(sz,i,delta)=>put(sz,i,add(dest[sz][i],delta))
  const needPoint=(i,label)=>{if(!validIndex(i))throw Error(label+' must be an existing panel point')}
  const needAmount=()=>{if(!finite(amountMm))throw Error('Supply a finite amountMm within ±1,000,000')}
  const unitFrom=(a,b)=>{const d=subtract(points[b],points[a]),length=norm(d);if(length<1e-9)throw Error('Reference points must be distinct');return scale(d,1/length)}
  const vectorAxis=v=>axis==='x'?[v[0],0]:axis==='y'?[0,v[1]]:v
  const pasteIds=['paste-grading','paste-x-grading','paste-y-grading','paste-relatively','paste-dd-grading']
  if(pasteIds.includes(toolId)) {
   if(clipboard?.schema!=='exo.grade-clipboard.v1'||!Array.isArray(clipboard.sizes)||
     clipboard.sizes.length!==sizes.length||clipboard.sizes.some((sz,i)=>sz!==sizes[i])||
     clipboard.baseSize!==ruleSet.baseSize||
     sizes.some(sz=>!has(clipboard.vectors||{},sz)||!vector(clipboard.vectors[sz]))||
     clipboard.vectors[ruleSet.baseSize].some(v=>v!==0))
      return failure('Clipboard must contain matching finite per-size grading vectors and zero base')
   allSizes(sz=>{
    const src=clipboard.vectors[sz],prior=dest[sz][selected]
    if(toolId==='paste-relatively')put(sz,selected,add(prior,src))
    else if(toolId==='paste-dd-grading') {
     needPoint(referencePointIndex,'DD reference')
     put(sz,selected,add(vectorAt(sz,referencePointIndex),src))
    } else put(sz,selected,[toolId==='paste-y-grading'?prior[0]:src[0],toolId==='paste-x-grading'?prior[1]:src[1]])
   })
  } else if(toolId==='set-grading-tool'){
   needAmount()
   if(axis==='both'&&(!finite(angleDeg)))throw Error('Set grading on both axes requires angleDeg')
   const increment=axis==='x'?[amountMm,0]:axis==='y'?[0,amountMm]:scale([Math.cos(angleDeg*Math.PI/180),Math.sin(angleDeg*Math.PI/180)],amountMm)
   allSizes((sz,step)=>put(sz,pointIndex,scale(increment,step)))
  } else if(toolId==='clear-grading'){
   allSizes(sz=>put(sz,pointIndex,[0,0]))
  } else if(toolId==='move-point-size'){
   needAmount()
   if(!sizes.includes(size)||size===ruleSet.baseSize)throw Error('Move point size needs a named non-base size')
   if(axis==='both'&&!finite(angleDeg))throw Error('Moving along both axes requires angleDeg')
   const delta=axis==='x'?[amountMm,0]:axis==='y'?[0,amountMm]:scale([Math.cos(angleDeg*Math.PI/180),Math.sin(angleDeg*Math.PI/180)],amountMm)
   applyAt(size,pointIndex,delta)
  } else if(toolId==='angle'){
   if(!finite(angleDeg))throw Error('Angle requires finite angleDeg')
   allSizes(sz=>put(sz,pointIndex,rotate(vectorAt(sz,pointIndex),angleDeg*Math.PI/180)))
  } else if(toolId==='grade-proportionally'||toolId==='move-size-proportional'){
   if(!finite(amountMm))throw Error('Proportional factor requires finite amountMm')
   const factor=amountMm
   if(factor<0||factor>1000)throw Error('Proportional scale must be between 0 and 1000')
   allSizes(sz=>put(sz,pointIndex,scale(vectorAt(sz,pointIndex),factor)))
  } else if(toolId==='move-size-along'||toolId==='move-size-parallel'){
   needAmount()
   needPoint(sourcePointIndex,'Direction source')
   needPoint(referencePointIndex,'Direction target')
   let direction=unitFrom(sourcePointIndex,referencePointIndex)
   if(toolId==='move-size-parallel')direction=[-direction[1],direction[0]]
   allSizes((sz,step)=>applyAt(sz,pointIndex,vectorAxis(scale(direction,amountMm*step))))
  } else if(toolId==='move-size-by-rectangle'){
   needAmount()
   let bounds=rectangle
   if(rectangle&&['xMm','yMm','widthMm','heightMm'].every(k=>Object.hasOwn(rectangle,k))){
    if(!['xMm','yMm','widthMm','heightMm'].every(k=>finite(rectangle[k]))||rectangle.widthMm<=0||rectangle.heightMm<=0)
     throw Error('Rectangle width and height must be positive finite millimetres')
    bounds={minX:rectangle.xMm,minY:rectangle.yMm,maxX:rectangle.xMm+rectangle.widthMm,maxY:rectangle.yMm+rectangle.heightMm}
   }
   if(!bounds||!['minX','minY','maxX','maxY'].every(k=>finite(bounds[k]))||
     bounds.minX>bounds.maxX||bounds.minY>bounds.maxY)throw Error('Rectangle requires valid millimetre boundaries')
   const inside=points.map((p,i)=>bounds.minX<=p[0]&&p[0]<=bounds.maxX&&bounds.minY<=p[1]&&p[1]<=bounds.maxY?i:-1).filter(i=>i>=0)
   if(!inside.length)throw Error('Rectangle contains no native polygon vertices')
   if(axis==='both'&&!finite(angleDeg))throw Error('Rectangle move on both axes requires angleDeg')
   const direction=axis==='x'?[1,0]:axis==='y'?[0,1]:[Math.cos(angleDeg*Math.PI/180),Math.sin(angleDeg*Math.PI/180)]
   allSizes((sz,step)=>inside.forEach(i=>applyAt(sz,i,scale(direction,amountMm*step))))
  } else if(['align-points-size','align-vertical-size','align-horizontal-size','align-size-by-line'].includes(toolId)){
   const group=pointIndices??[pointIndex,selected]
   if(!Array.isArray(group)||group.length<2||new Set(group).size!==group.length)throw Error('Alignment requires distinct pointIndices')
   group.forEach(i=>needPoint(i,'Alignment point'))
   if(toolId==='align-size-by-line'){
    needPoint(sourcePointIndex,'Line start');needPoint(referencePointIndex,'Line end')
   }
   allSizes(sz=>{
    const graded=i=>add(points[i],dest[sz][i])
    const anchorGrowth=[...dest[sz][group[0]]]
    const mean=group.reduce((a,i)=>add(a,graded(i)),[0,0]).map(v=>v/group.length)
    const line=toolId==='align-size-by-line'?unitFrom(sourcePointIndex,referencePointIndex):null
    for(const i of group){
     const before=graded(i)
     let after
     if(toolId==='align-vertical-size')after=[mean[0],before[1]]
     else if(toolId==='align-horizontal-size')after=[before[0],mean[1]]
     else if(toolId==='align-size-by-line'){
      const lineOrigin=graded(sourcePointIndex),d=subtract(before,lineOrigin),projection=d[0]*line[0]+d[1]*line[1]
      after=add(lineOrigin,scale(line,projection))
     }else after=add(points[i],anchorGrowth)
     put(sz,i,subtract(after,points[i]))
    }
   })
  } else return failure('Tool cannot be applied from the supplied native grading arguments')
  const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,next,{selectedSize:ruleSet.baseSize})
  if(!compiled.ok)return failure('Grading edit rejected by native size preview: '+compiled.reason)
  const qa=auditAccuMarkNativeRuleSizeQA20261023(snapshot,next)
  if(!qa.ok||qa.blocks)return failure('Grading edit rejected by geometry QA: '+(qa.issues?.[0]?.blockers?.join(', ')||qa.issues?.[0]?.reason||'Invalid or intersecting polygon contour'))
  return good({ruleSet:next,selectedPointIndex:selected,notice:'Atomic sidecar grading edit validated across all sizes'})
 }catch(error){return failure(String(error?.message||error))}
}
