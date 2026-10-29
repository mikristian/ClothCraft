import {verifyNativeGradeCatalog20261025} from './nativeGradeCatalogBridge20261025.js'

const SIZES=['XS','S','M','L','XL','XXL']
const finite=value=>typeof value==='number'&&Number.isFinite(value)
const positive=value=>finite(value)&&value>0
const point=value=>Array.isArray(value)&&value.length===2&&value.every(n=>finite(n)&&Math.abs(n)<=1e7)
const key=value=>typeof value==='string'&&value.length>0&&value.length<=240
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?
  Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
const fail=(code,reason,issues=[])=>({ok:false,code,reason,issues,verifiedSizes:[],sourceRevision:null,
  authoritativeRust:false,independentlyVerified:false,approvedForSizing:false,
  cutlinesVerified:false,allowancesVerified:false,notchesVerified:false,
  manufacturerReady:false,manufacturingApproved:false,cuttingAuthorized:false})

/**
 * Inspect the exact shape of read-only Rust grade-run-cutlines response.
 *
 * Pass liveRustRpc=true ONLY after the caller performed a revision-locked
 * native RPC for both status and CUT. A JavaScript object alone cannot
 * authenticate the Rust process or establish independent factory approval.
 */
export function inspectNativeGradeAuthenticCutBundle20261026(snapshot,ruleSet,status,response,{liveRustRpc=false}={}){
 try{
  if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0||!same(ruleSet?.sizes,SIZES))
    return fail('INVALID_SOURCE','Expected exact current revision and XS through XXL rules')
  if(!liveRustRpc)return fail('UNAUTHENTICATED_RPC','Rust origin cannot be authenticated from supplied JSON without live RPC')
  if(response?.format!=='exo-native-graded-cutlines.v1'||response.sourceRevision!==snapshot.revision||
    response.revision!==snapshot.revision||status?.revision!==snapshot.revision)
    return fail('STALE_NATIVE_PROOF','CUT and Rust status must match current source revision')
  if(response.manufacturerReady!==false||response.cuttingAuthorized!==false||
    status?.manufacturingApproved!==false)
    return fail('SPOOFED_APPROVAL','Engineering proof must explicitly deny factory approval and cutting authorization')
  const catalog=verifyNativeGradeCatalog20261025(snapshot,ruleSet,status,{
    durablySaved:true,pomDefinitions:status?.catalog?.pomSpecs||[]})
  if(!catalog.ok)return fail('STALE_NATIVE_CATALOG',catalog.reason||'Persisted Rust grade catalog differs from complete current rules')
  const rows=response.sizes
  if(!Array.isArray(rows)||rows.length!==6)
    return fail('SIZE_COVERAGE','Six distinct graded Rust CUT size records required')
  const issues=[],seenSizes=new Set()
  const issue=(size,code,detail)=>issues.push({size,code,detail})
  const sourcePanels=snapshot.template.panels
  const sourceSeams=snapshot.template.seams||[]
  for(const row of rows){
   const size=row?.size
   if(!SIZES.includes(size)||seenSizes.has(size)){
    issue(size||null,'DUPLICATE_SIZE','Duplicate or unknown graded CUT size');continue
   }
   seenSizes.add(size)
   const panels=row.panels
   if(!Array.isArray(panels)||panels.length!==sourcePanels.length){
    issue(size,'PANEL_COVERAGE','Expected all source panels');continue
   }
   const seenPanels=new Set()
   for(const panel of panels){
    const id=panel?.panel_id
    const source=sourcePanels.find(item=>item.id===id)
    if(!source||seenPanels.has(id)){issue(size,'PANEL_IDENTITY','Duplicate or unknown panel');continue}
    seenPanels.add(id)
    const polygon=source.polygon,cut=panel.cut
    if(!polygon||!cut||!Array.isArray(cut.points)||cut.points.length<3||
      cut.points.length>8192||!cut.points.every(point)||
      !positive(cut.perimeter_m)||!positive(cut.area_m2)){
      issue(size,'INVALID_CUT','Invalid finite metre-space CUT contour');continue
    }
    const edges=polygon.edges||[]
    if(!Array.isArray(cut.edges)||cut.edges.length!==edges.length){
      issue(size,'ALLOWANCE_COVERAGE','CUT needs all source allowance edge anchors')
    }else{
      const seen=new Set()
      for(const edge of cut.edges){
       if(!edges.includes(edge?.name)||seen.has(edge.name)||
         !finite(edge.allowance_m)||edge.allowance_m<0||edge.allowance_m>1||
         !Number.isSafeInteger(edge.start)||!Number.isSafeInteger(edge.end)||
         edge.start<0||edge.end<0||edge.start>=cut.points.length||edge.end>=cut.points.length){
        issue(size,'INVALID_ALLOWANCE_ANCHOR','CUT edge index, identity or allowance invalid');continue
       }
       seen.add(edge.name)
       const expected=polygon.seam_allowances?.[edge.name]??0
       if(!finite(expected)||Math.abs(edge.allowance_m-expected)>1e-9)
        issue(size,'ALLOWANCE_MISMATCH','CUT allowance does not match source')
      }
    }
    if(!panel.sewline_edge_lengths_m||!same(Object.keys(panel.sewline_edge_lengths_m).sort(),[...edges].sort())||
      !Object.values(panel.sewline_edge_lengths_m).every(positive))
      issue(size,'SEWLINE_COVERAGE','Missing named sewn edge lengths')
    const authored=Object.entries(polygon.notches||{}).flatMap(([edge,items])=>
      Array.isArray(items)?items.map(item=>({edge,t:item.t,depth:item.depth_m??item.depth})):[])
    if(!Array.isArray(cut.notches)||cut.notches.length!==authored.length){
      issue(size,'NOTCH_COVERAGE','Missing or extra native notches')
    }else{
      const remaining=[...cut.notches]
      for(const wanted of authored){
       const index=remaining.findIndex(n=>n?.edge_id===wanted.edge&&
         finite(n.t)&&Math.abs(n.t-wanted.t)<=1e-9&&
         finite(n.depth_m)&&Math.abs(n.depth_m-wanted.depth)<=1e-9)
       if(index<0){issue(size,'NOTCH_MISMATCH','Notch station or depth differs from source');continue}
       const [notch]=remaining.splice(index,1)
       if(!point(notch.cut_start)||!point(notch.inner_end)||!positive(notch.depth_m)||
         !finite(notch.t)||notch.t<=0||notch.t>=1)
        issue(size,'INVALID_NOTCH_ANCHOR','Notch physical endpoints invalid')
      }
    }
   }
   if(!Array.isArray(row.seams)||row.seams.length!==sourceSeams.length)
    issue(size,'SEAM_COVERAGE','Native CUT missing sewn seam references')
   else{
    const seen=new Set()
    for(const seam of row.seams){
     if(!sourceSeams.some(item=>item.id===seam?.seam_id)||seen.has(seam.seam_id)||
       !positive(seam.a_length_m)||!positive(seam.b_length_m)||
       !finite(seam.mismatch_m)||seam.mismatch_m<0||
       !Array.isArray(seam.notch_intervals_m)||seam.notch_intervals_m.length<1||
       !seam.notch_intervals_m.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(positive))||
       typeof seam.allows_ease!=='boolean')
       issue(size,'INVALID_SEAM','Sewn seam identity, lengths or notch intervals invalid')
     else seen.add(seam.seam_id)
    }
   }
  }
  for(const size of SIZES)if(!seenSizes.has(size))issue(size,'MISSING_SIZE','No Rust CUT record for size')
  if(issues.length)return fail('INVALID_CUT_BUNDLE','Six-size CUT geometry or anchors invalid',issues)
  return {ok:true,sourceRevision:snapshot.revision,sourceTemplate:canonical(snapshot.template),
    sourceRuleSet:canonical(ruleSet),templateFingerprint:ruleSet.templateFingerprint,
    verifiedSizes:[...SIZES],sizeCount:6,panelCount:sourcePanels.length,
    cutlinesVerified:true,allowancesVerified:true,notchesVerified:true,
    authoritativeRust:false,independentlyVerified:false,approvedForSizing:false,
    manufacturerReady:false,manufacturingApproved:false,cuttingAuthorized:false,
    note:'Structural Rust CUT check only. JavaScript cannot independently attest RPC provenance or factory calibration.'}
 }catch(error){return fail('INVALID_NATIVE_RESPONSE',String(error?.message||error))}
}
