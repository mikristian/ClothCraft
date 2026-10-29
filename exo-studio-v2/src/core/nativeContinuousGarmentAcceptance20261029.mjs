// Independent, fail-closed acceptance for ONE continuous native sewn assembly.
// This does not certify physics, fit, factory cutting, or the provenance of
// untrusted JSON. Call only with saved native Rust project and observed audits.
const SIZE_NAMES = Object.freeze(['XS','S','M','L','XL','XXL'])
const exact = (actual,expected) => actual.length===expected.length &&
  expected.every(x=>actual.includes(x)) && new Set(actual).size===expected.length
const reject = message => {throw new Error('CONNECTED_GARMENT_REJECTED: '+message)}

export function verifyNativeContinuousGarment20261029({project,sewing,cutlines,expectedPanels=5,requiredSeamIds=[]}={}) {
  const template=project?.template
  const panels=template?.panels
  if(!Array.isArray(panels)||panels.length!==expectedPanels||expectedPanels<2||expectedPanels>32)
    reject('actual authoritative panel count')
  const ids=panels.map(p=>p?.id)
  if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)
    reject('duplicate or unnamed panels')
  const seams=template.seams
  if(!Array.isArray(seams)||seams.length<ids.length-1)reject('too few saved sewn relationships')
  const seamIds=seams.map(s=>s?.id)
  if(seamIds.some(id=>typeof id!=='string'||!id)||new Set(seamIds).size!==seamIds.length)
    reject('invalid native sewn seam identities')
  if(!requiredSeamIds.every(id=>seamIds.includes(id)))reject('original saved garment seam missing')
  const neighbors=new Map(ids.map(id=>[id,new Set()]))
  let crossPanelSeams=0
  for(const seam of seams){
    const a=seam?.a?.panel,b=seam?.b?.panel
    if(!neighbors.has(a)||!neighbors.has(b))reject('seam references nonexistent garment panel')
    if(seam.allow_ease===true)reject('unqualified eased native sewn relation')
    if(a===b)continue // legitimate same-panel dart, not a cross-panel connection
    neighbors.get(a).add(b);neighbors.get(b).add(a);crossPanelSeams++
  }
  const seen=new Set([ids[0]]),queue=[ids[0]]
  for(let i=0;i<queue.length;i++)for(const neighbor of neighbors.get(queue[i])){
    if(!seen.has(neighbor)){seen.add(neighbor);queue.push(neighbor)}
  }
  if(seen.size!==ids.length)
    reject('disconnected sewn graph: '+ids.filter(id=>!seen.has(id)).join(', '))
  if(crossPanelSeams<ids.length-1)reject('insufficient cross-panel seam connections')
  if(!project?.grade_run||!exact(project.grade_run.sizes??[],SIZE_NAMES))
    reject('missing authoritative six-size grade catalog')
  if(!Array.isArray(project.grade_run.gradedTemplates)||
    project.grade_run.gradedTemplates.length!==SIZE_NAMES.length)
    reject('graded templates missing')
  for(const grade of project.grade_run.gradedTemplates){
    if(!exact(grade?.panels?.map(p=>p.id)??[],ids)||
      !exact(grade?.seams?.map(s=>s.id)??[],seamIds))
      reject('grade silently dropped sewn or pattern graph')
    // Same IDs alone are not enough: a graded catalogue with silently rerouted
    // endpoints, changed ranges, or altered easing is NOT a connected
    // regeneration of the saved source. These sewing instructions must be
    // identical in each size; only physical geometry may grade.
    for(const sourceSeam of seams){
      const row=grade.seams.find(s=>s.id===sourceSeam.id)
      if(!row||JSON.stringify(row)!==JSON.stringify(sourceSeam))
        reject('graded seam provenance or endpoint mismatch')
    }
  }
  if(sewing?.factoryApproved!==false||sewing?.easeReviewRequired!==false||
    !Array.isArray(sewing.sizes)||!exact(sewing.sizes.map(x=>x?.size),SIZE_NAMES))
    reject('native sewn audit unapproved, incomplete, or requests manual ease review')
  let checks=0
  for(const row of sewing.sizes){
    if(!exact(row?.seams?.map(s=>s.seamId)??[],seamIds))
      reject('per-size native seam auditing not exhaustive')
    for(const seam of row.seams){
      if(!Number.isFinite(seam.mismatchM)||Math.abs(seam.mismatchM)>1e-6||
        seam.requiresEaseReview!==false)reject('graded sewn length or manual ease failed')
      checks++
    }
  }
  if(cutlines?.cuttingAuthorized!==false||
    cutlines?.format!=='exo-native-graded-cutlines.v1'||!Array.isArray(cutlines.sizes)||
    !exact(cutlines.sizes.map(x=>x?.size),SIZE_NAMES))
    reject('native CUT evidence missing or factory-release state invalid')
  for(const row of cutlines.sizes){
    if(!exact(row?.panels?.map(p=>p.panel_id)??[],ids))
      reject('physical CUT dropped a sewn component')
    for(const p of row.panels){
      if(!Array.isArray(p?.cut?.points)||p.cut.points.length<3||
        p.cut.points.some(x=>!Array.isArray(x)||x.length!==2||!x.every(Number.isFinite)))
        reject('invalid or nonfinite physical native CUT geometry')
      const points=p.cut.points
      let signedArea=0
      for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length]
        signedArea+=a[0]*b[1]-b[0]*a[1]
      }
      if(!Number.isFinite(signedArea)||Math.abs(signedArea)<1e-12)
        reject('degenerate physical native CUT contour')
    }
  }
  return Object.freeze({
    connected:true,panels:ids.length,originalAndDerivedSeams:seamIds.length,
    crossPanelSeams,componentCount:1,sizes:[...SIZE_NAMES],
    gradedSeamChecks:checks,physicalCutpieces:ids.length*SIZE_NAMES.length,
    physicalFitCertified:false,factoryApproved:false,cuttingAuthorized:false,
  })
}
