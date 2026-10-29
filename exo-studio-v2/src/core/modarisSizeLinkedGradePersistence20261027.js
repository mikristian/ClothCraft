import {reapplyModarisSizeLinkedGrade} from './modarisSizeLinkedGrade20261027.js'

const fail=message=>{throw new Error('Modaris grade persistence: '+message)}
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype
const keys=(x,allowed)=>plain(x)&&Object.keys(x).every(k=>allowed.includes(k))
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const numeric=x=>typeof x==='number'&&Number.isFinite(x)
function inspect(value,seen=new Set(),depth=0){
 if(depth>40||(value!==null&&typeof value==='object'&&seen.has(value)))fail('unsafe cyclic or deep serialized data')
 if(value===null||typeof value==='string'||typeof value==='boolean'||numeric(value))return
 if(typeof value!=='object'||(!plain(value)&&!Array.isArray(value)))fail('unsupported serialized value')
 seen.add(value)
 const descriptors=Object.getOwnPropertyDescriptors(value)
 for(const name of Reflect.ownKeys(descriptors)){
  if(typeof name!=='string'||['__proto__','constructor','prototype','toJSON'].includes(name))fail('unsafe serialized key')
  if(Array.isArray(value)&&name==='length')continue
  if(!descriptors[name].enumerable||!Object.hasOwn(descriptors[name],'value'))fail('unsafe serialized accessor')
  inspect(descriptors[name].value,seen,depth+1)
 }
 if(Array.isArray(value)&&(Object.keys(value).length!==value.length||value.length>12000))fail('invalid array')
 seen.delete(value)
}
/**
 * Pure save/read gate: validate the complete persisted linked-grade graph,
 * including its committed target snapshot. No mutations or implicit reapply.
 * Absence of the optional V1 graph keeps legacy projects compatible.
 */
export function assertFreshModarisSizeLinkedGradeProject20261027(project){
 if(!project||typeof project!=='object'||Array.isArray(project))fail('project object required')
 if(!Object.hasOwn(project,'modarisSizeLinkedGrade'))return project
 inspect(project)
 const graph=project.modarisSizeLinkedGrade
 if(!keys(graph,['version','units','sizes','baseSize','links'])||graph.version!==1||graph.units!=='cm')fail('unsupported serialized graph schema or units')
 if(!Array.isArray(graph.sizes)||graph.sizes.length<2||graph.sizes.length>64||graph.sizes.some(s=>typeof s!=='string'||!s.trim()||s.trim()!==s)||new Set(graph.sizes).size!==graph.sizes.length||!graph.sizes.includes(graph.baseSize))fail('invalid graph sizes')
 if(project.units!==undefined&&project.units!=='cm')fail('project units mismatch')
 if(!plain(project.grading)||!eq(graph.sizes,project.grading.sizes)||graph.baseSize!==project.grading.baseSize)fail('stale grade size metadata')
 if(!Array.isArray(graph.links)||graph.links.length<1||graph.links.length>256)fail('invalid graph links')
 const targets=new Set(),indices=new Set()
 for(const link of graph.links){
  if(!keys(link,['source','target','axis','curves','sourceTopology','targetTopology','sourceBase','targetBase','targetRule','appliedRule']))fail('forged link fields')
  if(!['both','x','y'].includes(link.axis)||typeof link.curves!=='boolean')fail('invalid link axis')
  for(const ref of [link.source,link.target]){
   if(!keys(ref,['pieceId','pointIndex'])||typeof ref.pieceId!=='string'||!ref.pieceId||!Number.isSafeInteger(ref.pointIndex)||ref.pointIndex<0)fail('invalid link reference')
  }
  for(const k of ['sourceTopology','targetTopology']){
   const t=link[k]
   if(!keys(t,['id','pointIds','edgeNames','curveEdges'])||typeof t.id!=='string'||!Array.isArray(t.pointIds)||!Array.isArray(t.curveEdges))fail('invalid saved topology')
  }
  for(const k of ['sourceBase','targetBase']){
   const base=link[k]
   if(!keys(base,['x','y','id'])||!numeric(base.x)||!numeric(base.y))fail('invalid base provenance')
  }
  if(!plain(link.targetRule)||!plain(link.appliedRule))fail('missing saved target rule')
  const target=link.target.pieceId+':'+link.target.pointIndex
  if(targets.has(target))fail('duplicate target')
  targets.add(target)
  indices.add(target)
 }
 // Existing grade code validates cycles, every point's industrial rule and
 // topology, and derives the exact expected committed rule for every size.
 let refreshed
 try{refreshed=reapplyModarisSizeLinkedGrade(project).project}
 catch(error){fail(error?.message||'stale linked grade state')}
 if(!eq(refreshed,project))fail('saved derived targets differ from expected committed regeneration')
 return project
}
