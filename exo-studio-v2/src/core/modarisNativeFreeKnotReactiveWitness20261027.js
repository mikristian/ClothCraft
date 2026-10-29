import {sha256Bytes} from './sha256Bytes.js'

// A detached read-only verifier. This file does not modify Rust geometry,
// authorize a cutter or supply a replacement for a licensed Modaris receiver.
const SIZES=['XS','S','M','L','XL','XXL']
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const point=v=>Array.isArray(v)&&v.length===2&&v.every(finite)
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]]
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]]
const scale=(a,t)=>[a[0]*t,a[1]*t]
const lerp=(a,b,t)=>add(scale(a,1-t),scale(b,t))
const length=v=>Math.hypot(...v)
const distance=(a,b)=>length(sub(a,b))
const near=(a,b,tolerance=1e-7)=>point(a)&&point(b)&&distance(a,b)<=tolerance
const err=message=>{throw Error(message)}
const fail=reason=>Object.freeze({ok:false,reason,nativeFreeKnotPropagationAccepted:false,factoryApproved:false})
const digest=v=>`sha256:${sha256Bytes(new TextEncoder().encode(JSON.stringify(v)))}`
const projectRun=p=>p?.grade_run??p?.gradeRun
const bounds=(template,id)=>{
  const panels=template?.panels?.filter(panel=>panel.id===id)
  if(panels?.length!==1||!panels[0].polygon)err(`Unknown or duplicate native panel ${id}`)
  return panels[0].polygon
}
const edges=poly=>{
  if(!Array.isArray(poly?.points)||poly.points.length<3||poly.points.length!==poly.edges?.length||
    poly.points.some(p=>!point(p))||poly.edges.some(e=>typeof e!=='string'||!e)||
    new Set(poly.edges).size!==poly.edges.length)err('Invalid native point or named edge topology')
  return poly.edges
}
const shiftKnot=(k,ds,de)=>{
  const tangent=sub(de,ds)
  const result={...k,position:add(k.position,lerp(ds,de,k.t))}
  for(const key of ['derivative','derivative_in','derivative_out']){
    if(k[key]!==undefined&&k[key]!==null)result[key]=add(k[key],tangent)
  }
  return result
}
function validateKnotInventory(poly){
  edges(poly)
  const groups=new Set(),names=new Set()
  const knots=poly.free_curve_points??{}
  if(!Object.keys(knots).length)err('No physically authored free-curve knots in candidate')
  for(const [edge,parts] of Object.entries(knots)){
    if(!poly.edges.includes(edge)||!Array.isArray(parts)||parts.length===0||parts.length>32)
      err('Free-curve knots require an existing named edge and bounded inventory')
    let previous=0
    for(const item of parts){
      if(typeof item.id!=='string'||!item.id||names.has(item.id)||
        !finite(item.t)||item.t<=previous+1e-6||item.t>=1-1e-6||!point(item.position)||
        ['derivative','derivative_in','derivative_out'].some(k=>item[k]!=null&&!point(item[k]))||
        item.mirror_group!=null)
        err('Invalid, reordered or unsupported mirrored free-curve identity')
      names.add(item.id);previous=item.t
    }
    if(Object.hasOwn(poly.curves??{},edge)&&!poly.curves[edge].every(point))
      err('Invalid authored base cubic control')
  }
  return Object.entries(knots).flatMap(([edge,rows])=>rows.map(k=>({edge,id:k.id,t:k.t})))
}
// Independent matching implementation of sampled physical Hermite spans.
// It is deliberately not a wrapper around the Rust CUT or sewing audit RPC.
const derivative=(p,t)=>add(add(scale(sub(p[1],p[0]),3*(1-t)*(1-t)),
  scale(sub(p[2],p[1]),6*t*(1-t))),scale(sub(p[3],p[2]),3*t*t))
function flatten(p,tolerance=.00025){
  const output=[p[0]]
  const deviation=(v,a,b)=>{
    const ab=sub(b,a),den=length(ab)**2
    const alpha=den>0?Math.max(0,Math.min(1,(sub(v,a)[0]*ab[0]+sub(v,a)[1]*ab[1])/den)):0
    return distance(v,add(a,scale(ab,alpha)))
  }
  const recurse=(points,depth)=>{
    if(points.some(p=>!point(p))||output.length>4096||depth>16)
      err('Nonfinite or over-budget independent free-curve flattening')
    if(Math.max(deviation(points[1],points[0],points[3]),deviation(points[2],points[0],points[3]))<=tolerance){
      output.push(points[3]);return
    }
    if(depth===16)err('Free-curve subdivision budget exceeded')
    const a=lerp(points[0],points[1],.5),b=lerp(points[1],points[2],.5),c=lerp(points[2],points[3],.5)
    const d=lerp(a,b,.5),e=lerp(b,c,.5),m=lerp(d,e,.5)
    recurse([points[0],a,d,m],depth+1)
    recurse([m,e,c,points[3]],depth+1)
  }
  recurse(p,0)
  return output
}
export function sampleNativeFreeKnotEdge20261027(poly,edgeId){
  const index=edges(poly).indexOf(edgeId)
  if(index<0)err('Unknown sample edge')
  const a=poly.points[index],b=poly.points[(index+1)%poly.points.length]
  const controls=poly.curves?.[edgeId]??[lerp(a,b,1/3),lerp(a,b,2/3)]
  if(!Array.isArray(controls)||controls.length!==2||controls.some(v=>!point(v)))
    err('Invalid named cubic control pair')
  const base=[a,...controls,b]
  let previous=0,position=a,priorDerivative=derivative(base,0)
  const result=[a]
  const knots=poly.free_curve_points?.[edgeId]??[]
  for(const k of [...knots,{t:1,position:b}]){
    if(!finite(k.t)||k.t<=previous||!point(k.position))err('Invalid physical knot order')
    const derivativeIn=k.derivative_in??k.derivative??derivative(base,k.t)
    const derivativeOut=k.derivative_out??k.derivative??derivative(base,k.t)
    if(!point(derivativeIn)||!point(derivativeOut))err('Invalid free-curve derivative')
    const dt=k.t-previous
    const span=[position,add(position,scale(priorDerivative,dt/3)),
      sub(k.position,scale(derivativeIn,dt/3)),k.position]
    result.push(...flatten(span).slice(1))
    previous=k.t;position=k.position;priorDerivative=derivativeOut
  }
  if(result.length>4096||result.slice(1).some((p,i)=>distance(result[i],p)<1e-12))
    err('Collapsed or oversized sampled free-curve boundary')
  return result
}
const station=(samples,t)=>{
  if(!finite(t)||t<=0||t>=1)err('Invalid material arclength station')
  const spans=samples.slice(1).map((p,i)=>distance(p,samples[i]))
  const total=spans.reduce((a,b)=>a+b,0)
  if(!finite(total)||total<=1e-8)err('Invalid physical free-curve arclength')
  let traveled=0
  for(let i=0;i<spans.length;i++){
    const d=spans[i]
    if(traveled+d>=total*t||i===spans.length-1){
      const tangent=scale(sub(samples[i+1],samples[i]),1/d)
      return {length:total,point:lerp(samples[i],samples[i+1],(total*t-traveled)/d),normal:[tangent[1],-tangent[0]]}
    }
    traveled+=d
  }
  err('Cannot position free-curve arclength station')
}
function sourceAndSizes(before,after,ids){
  const pre=projectRun(before),post=projectRun(after)
  if(!pre||!post||!same(pre.sizes,SIZES)||!same(post.sizes,SIZES)||
    pre.gradedTemplates?.length!==6||post.gradedTemplates?.length!==6||
    !Array.isArray(before.template?.panels)||!Array.isArray(after.template?.panels)||
    !same(before.template.seams,after.template.seams))err('Six-size native source or sewing catalog changed')
  if(before.template.panels.length!==after.template.panels.length||
    before.template.panels.some((panel,i)=>panel.id!==after.template.panels[i].id||
      (!ids.includes(panel.id)&&!same(panel,after.template.panels[i]))))
    err('Unrelated authored native panel changed during curve regeneration')
  const identities=[]
  for(const id of ids){
    const old=bounds(before.template,id),now=bounds(after.template,id)
    const inv=validateKnotInventory(old)
    if(!same(inv,validateKnotInventory(now))||!same(old.edges,now.edges)||
      !same(old.seam_allowances,now.seam_allowances)||!same(old.notches,now.notches))
      err('Authored named free-knot or industrial instructions changed')
    for(const [edge,knots] of Object.entries(old.free_curve_points)){
      const index=old.edges.indexOf(edge),next=(index+1)%old.points.length
      const startDelta=sub(now.points[index],old.points[index]),endDelta=sub(now.points[next],old.points[next])
      for(let k=0;k<knots.length;k++){
        const expected=shiftKnot(knots[k],startDelta,endDelta)
        if(!same(Object.keys(knots[k]).sort(),Object.keys(now.free_curve_points[edge][k]).sort())||
          !near(expected.position,now.free_curve_points[edge][k].position)||
          ['derivative','derivative_in','derivative_out'].some(key=>
            expected[key]!=null&&!near(expected[key],now.free_curve_points[edge][k][key])))
          err(`Source free-knot ${id}/${edge}/${knots[k].id} failed reactive transformation`)
      }
    }
    identities.push(...inv.map(k=>({panelId:id,...k})))
  }
  for(let i=0;i<6;i++){
    for(const id of ids){
      const oldBase=bounds(before.template,id),newBase=bounds(after.template,id)
      const oldGraded=bounds(pre.gradedTemplates[i],id),newGraded=bounds(post.gradedTemplates[i],id)
      if(!same(oldGraded.edges,oldBase.edges)||!same(newGraded.edges,newBase.edges)||
        !same(oldGraded.seam_allowances,oldBase.seam_allowances)||
        !same(newGraded.seam_allowances,newBase.seam_allowances)||
        !same(oldGraded.notches,oldBase.notches)||!same(newGraded.notches,newBase.notches))
        err('Grading altered protected manufacturing topology')
      for(let j=0;j<oldBase.points.length;j++){
        const dx=sub(oldGraded.points[j],oldBase.points[j]),dy=sub(newGraded.points[j],newBase.points[j])
        if(!near(dx,dy))err('Independent six-size source-point grade offsets lost')
      }
      for(const [beforeBase,gradeBase] of [[oldBase,oldGraded],[newBase,newGraded]]){
        if(!same(validateKnotInventory(beforeBase),validateKnotInventory(gradeBase)))
          err('Graded free-knot IDs, mirror links or station parameters changed')
        for(const [index,edge] of beforeBase.edges.entries()){
          const startDelta=sub(gradeBase.points[index],beforeBase.points[index])
          const endDelta=sub(gradeBase.points[(index+1)%beforeBase.points.length],
            beforeBase.points[(index+1)%beforeBase.points.length])
          const sourceHandles=beforeBase.curves?.[edge],gradeHandles=gradeBase.curves?.[edge]
          if(Boolean(sourceHandles)!==Boolean(gradeHandles))
            err('Graded named cubic boundary inventory changed')
          if(sourceHandles){
            if(!Array.isArray(gradeHandles)||gradeHandles.length!==2||
              !near(gradeHandles[0],add(sourceHandles[0],
                add(scale(startDelta,2/3),scale(endDelta,1/3))))||
              !near(gradeHandles[1],add(sourceHandles[1],
                add(scale(startDelta,1/3),scale(endDelta,2/3)))))
              err('Graded cubic controls do not follow exact endpoint delta blends')
          }
        }
        for(const [edge,knots] of Object.entries(beforeBase.free_curve_points)){
          const edgeIndex=beforeBase.edges.indexOf(edge),next=(edgeIndex+1)%beforeBase.points.length
          const startDelta=sub(gradeBase.points[edgeIndex],beforeBase.points[edgeIndex])
          const endDelta=sub(gradeBase.points[next],beforeBase.points[next])
          for(let k=0;k<knots.length;k++){
            const expected=shiftKnot(knots[k],startDelta,endDelta),got=gradeBase.free_curve_points[edge][k]
            if(!near(expected.position,got.position)||
              ['derivative','derivative_in','derivative_out'].some(key=>
                (expected[key]==null)!==(got[key]==null)||
                expected[key]!=null&&!near(expected[key],got[key])))
              err(`Graded native free-knot position or derivative invalid in ${SIZES[i]}/${id}/${edge}`)
          }
        }
      }
    }
  }
  return {identities,pre,post}
}
function inspect(project,cut,sewing,revision,ids){
  const run=projectRun(project)
  if(cut?.format!=='exo-native-graded-cutlines.v1'||cut.sourceRevision!==revision||cut.revision!==revision||
    cut.manufacturerReady!==false||cut.cuttingAuthorized!==false||!same(cut.sizes?.map(row=>row.size),SIZES)||
    sewing?.format!=='exo-native-six-size-sewn-balance-audit.v1'||sewing.sourceRevision!==revision||
    sewing.factoryApproved!==false||sewing.easeReviewRequired!==false||sewing.joinedCurveMutation!==false||
    !same(sewing.sizes?.map(row=>row.size),SIZES))err('Stale native six-size physical CUT or sewing receipt')
  const rows=[]
  for(let i=0;i<6;i++)for(const id of ids){
    const poly=bounds(run.gradedTemplates[i],id),out=cut.sizes[i].panels.filter(p=>p.panel_id===id)
    if(out.length!==1||!out[0].cut||!same(out[0].cut.edges.map(e=>e.name),poly.edges)||
      !finite(out[0].cut.area_m2)||out[0].cut.area_m2<=0||
      !finite(out[0].cut.perimeter_m)||out[0].cut.perimeter_m<=0)
      err('Incomplete physical CUT contour or named edge inventory')
    const wanted=Object.entries(poly.notches??{}).flatMap(([edge,marks])=>marks.map(mark=>({edge,...mark})))
    if(wanted.length!==out[0].cut.notches.length)err('Physical notches missing from CUT receipt')
    for(const [j,edge] of poly.edges.entries()){
      const width=poly.seam_allowances?.[edge]
      if(!finite(width)||width<=0||width>.5||Math.abs(out[0].cut.edges[j].allowance_m-width)>1e-10)
        err('Physical CUT named allowance mismatch')
      const samples=sampleNativeFreeKnotEdge20261027(poly,edge)
      const total=samples.slice(1).reduce((sum,p,k)=>sum+distance(p,samples[k]),0)
      if(!finite(out[0].sewline_edge_lengths_m?.[edge])||
        Math.abs(total-out[0].sewline_edge_lengths_m[edge])>1e-6)
        err('Native physical STITCH does not match independent sampled free-knot contour')
    }
    for(const mark of wanted){
      const receipt=out[0].cut.notches.filter(m=>m.edge_id===mark.edge&&
        Math.abs(m.t-mark.t)<=1e-9&&Math.abs(m.depth_m-mark.depth_m)<=1e-9)
      if(receipt.length!==1||!point(receipt[0].cut_start)||!point(receipt[0].inner_end))
        err('Physical CUT notch identity missing or duplicated')
      const s=station(sampleNativeFreeKnotEdge20261027(poly,mark.edge),mark.t)
      const expected=add(s.point,scale(s.normal,poly.seam_allowances[mark.edge]))
      const inner=sub(expected,scale(s.normal,mark.depth_m))
      if(!near(receipt[0].cut_start,expected,.00101)||!near(receipt[0].inner_end,inner,.00101))
        err('Physical CUT notch fails independent arclength station projection')
    }
    rows.push({size:SIZES[i],panelId:id,
      knotIds:Object.values(poly.free_curve_points??{}).flatMap(list=>list.map(k=>k.id)),
      cutPoints:out[0].cut.points,notches:out[0].cut.notches})
  }
  for(let i=0;i<6;i++){
    const grade=run.gradedTemplates[i],receipt=sewing.sizes[i]
    if(!same(grade.seams,project.template.seams)||receipt.seams?.length!==grade.seams?.length||
      grade.seams.length===0)err('Incomplete six-size sewn pair inventory')
    for(const seam of grade.seams){
      const match=receipt.seams.filter(p=>p.seamId===seam.id)
      if(match.length!==1||seam.allow_ease!==false||match[0].allowEase!==false||
        match[0].requiresEaseReview!==false||!finite(match[0].mismatchM)||match[0].mismatchM>1e-5)
        err('Unsafe or unpaired sewn physical arclength')
      for(const [side,ref] of [[match[0].a,seam.a],[match[0].b,seam.b]]){
        if(side.panelId!==ref.panel||side.edgeId!==ref.edge||!same(side.interval,ref.range)||
          !finite(side.fullSewlineM)||!finite(side.sewnIntervalM)||
          !same(side.freeCurvePointIds,(bounds(grade,ref.panel).free_curve_points?.[ref.edge]??[]).map(k=>k.id)))
          err('Saved paired sewing edge or free-curve knot identity drift')
        const samples=sampleNativeFreeKnotEdge20261027(bounds(grade,ref.panel),ref.edge)
        const total=samples.slice(1).reduce((sum,p,j)=>sum+distance(p,samples[j]),0)
        if(Math.abs(total-side.fullSewlineM)>1e-6||
          Math.abs(total*(ref.range[1]-ref.range[0])-side.sewnIntervalM)>1e-6)
          err('Native paired seam lengths differ from independently sampled free-knot geometry')
        const positions=(bounds(grade,ref.panel).notches?.[ref.edge]??[])
          .filter(m=>m.t>ref.range[0]&&m.t<ref.range[1]).map(m=>station(samples,m.t).point)
        if(!Array.isArray(side.notchPositionsM)||side.notchPositionsM.length!==positions.length||
          side.notchPositionsM.some((p,j)=>!near(p,positions[j],1e-6)))
          err('Native sewn notch arclength position inconsistent with free-knot curve')
      }
      if(!Array.isArray(match[0].notchIntervalLengthsM)||
        match[0].notchIntervalLengthsM.some(pair=>!point(pair)||Math.abs(pair[0]-pair[1])>1e-5))
        err('Paired physical sewn notch intervals differ')
    }
  }
  return rows
}
export function verifyModarisNativeFreeKnotReactiveWitness20261027({beforeProject,afterProject,
  beforeCutlines,afterCutlines,beforeSewing,afterSewing,beforeRevision,afterRevision,changedPanelIds}={}){
  try{
    if(!Number.isSafeInteger(beforeRevision)||afterRevision!==beforeRevision+1||
      !Array.isArray(changedPanelIds)||changedPanelIds.length<2||new Set(changedPanelIds).size!==changedPanelIds.length)
      err('Qualified all-size source edit requires one Rust revision and two distinct panels')
    sourceAndSizes(beforeProject,afterProject,changedPanelIds)
    const a=inspect(beforeProject,beforeCutlines,beforeSewing,beforeRevision,changedPanelIds)
    const b=inspect(afterProject,afterCutlines,afterSewing,afterRevision,changedPanelIds)
    if(a.length!==12||b.length!==12||a.some((x,i)=>
      x.size!==b[i].size||x.panelId!==b[i].panelId||!same(x.knotIds,b[i].knotIds)||
      same(x.cutPoints,b[i].cutPoints)||same(x.notches,b[i].notches)))
      err('Cut geometry or physical notches did not regenerate with preserved free-knot IDs')
    return Object.freeze({ok:true,sourceRevision:beforeRevision,committedRevision:afterRevision,
      sixSizes:[...SIZES],verifiedPhysicalCutPanels:b.length,
      verifiedFreeKnotReferences:b.reduce((sum,x)=>sum+x.knotIds.length,0),
      verifiedPhysicalNotches:b.reduce((sum,x)=>sum+x.notches.length,0),
      gradeAndSewnProofDigest:digest(b),nativeFreeKnotPropagationAccepted:true,
      factoryApproved:false,cuttingAuthorized:false,licensedModarisAccepted:false})
  }catch(e){return fail(e?.message??String(e))}
}
