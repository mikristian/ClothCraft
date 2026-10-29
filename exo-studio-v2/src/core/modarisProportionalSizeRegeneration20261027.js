/**
 * Authored non-additive six-size *candidate* regeneration. Exact saved native
 * source + six actual graded material polygons are required. A per-size ratio
 * of true piece extents is retained as the new base contour changes. This
 * deliberately does not commit to a native Rust project or certify fit/CUT.
 */
const SIX = Object.freeze(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10
const safeScalar = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e9
const plain = o => o !== null && typeof o === 'object' && !Array.isArray(o) && Object.getPrototypeOf(o) === Object.prototype
const POLYGON_FIELDS = Object.freeze(['points','edges','subdivisions','meshing','curves','free_curve_points',
  'vertex_ids','vertex_mirror_groups','holes','lines','target_lengths','notches','seam_allowances','annotations','measurements'])
const UNSUPPORTED_ATTACHMENTS = Object.freeze(['curves','free_curve_points','vertex_ids','vertex_mirror_groups',
  'holes','lines','target_lengths','notches','seam_allowances','annotations','measurements'])
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b)
const panelMetadata = panel => Object.fromEntries(Object.entries(panel).filter(([key])=>key!=='polygon').map(([key,value])=>
  [key,key==='pattern' && plain(value) ? Object.fromEntries(Object.entries(value).filter(([name])=>!['width','height'].includes(name))) : value]))
const invalid = reason => Object.freeze({ ok:false, reason, committed:false, nativeAuthority:false, manufacturerApproved:false, factoryApproved:false, vendorEquivalent:false })

function canonical(value, depth=0) {
  if (depth > 36) throw Error('Pattern source depth exceeded')
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || safeScalar(value)) return JSON.stringify(value)
  if (Array.isArray(value) && value.length <= 16384) return `[${value.map(x=>canonical(x, depth+1)).join(',')}]`
  if (plain(value) && Object.keys(value).length <= 16384) return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key],depth+1)}`).join(',')}}`
  throw Error('Unsupported or nonfinite pattern source')
}

function validatedPolygon(panel, label) {
  const poly=panel?.polygon
  if (!plain(panel) || !plain(poly) || !Array.isArray(poly.points) || poly.points.length < 3 || poly.points.length > 128 ||
      !Array.isArray(poly.edges) || poly.edges.length !== poly.points.length ||
      poly.edges.some(e=>typeof e!=='string'||!e) || new Set(poly.edges).size!==poly.edges.length ||
      poly.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(finite))) throw Error(`${label}: invalid native material polygon`)
  if (Object.keys(poly).some(k=>!POLYGON_FIELDS.includes(k)) ||
      UNSUPPORTED_ATTACHMENTS.some(k=>Array.isArray(poly[k])?poly[k].length>0:plain(poly[k])?Object.keys(poly[k]).length>0:poly[k]!==undefined) ||
      (poly.subdivisions!==undefined && (!Number.isSafeInteger(poly.subdivisions)||poly.subdivisions<0||poly.subdivisions>10000)) ||
      panel.sewing || panel.attachments?.length || panel.pins?.length || panel.pin_points?.length) throw Error(`${label}: curved, sewn or industrial attachments require separate propagation validation`)
  let area=0
  for (let i=0;i<poly.points.length;i++) {
    const p=poly.points[i],q=poly.points[(i+1)%poly.points.length]
    if (Math.hypot(p[0]-q[0],p[1]-q[1])<1e-7) throw Error(`${label}: degenerate material edge`)
    area+=p[0]*q[1]-q[0]*p[1]
  }
  if (Math.abs(area)<1e-8) throw Error(`${label}: invalid or zero signed area`)
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
  const on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-11 && p.every((v,i)=>v>=Math.min(a[i],b[i])-1e-11 && v<=Math.max(a[i],b[i])+1e-11)
  for (let i=0;i<poly.points.length;i++) for(let j=i+1;j<poly.points.length;j++) {
    if (j===i+1||(i===0&&j===poly.points.length-1))continue
    const a=poly.points[i],b=poly.points[(i+1)%poly.points.length],c=poly.points[j],d=poly.points[(j+1)%poly.points.length]
    if (cross(a,b,c)*cross(a,b,d)<-1e-14 && cross(c,d,a)*cross(c,d,b)<-1e-14 ||
        on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b)) throw Error(`${label}: self-intersecting native polygon`)
  }
  const min=[Math.min(...poly.points.map(p=>p[0])),Math.min(...poly.points.map(p=>p[1]))]
  const max=[Math.max(...poly.points.map(p=>p[0])),Math.max(...poly.points.map(p=>p[1]))]
  const extent=max.map((v,i)=>v-min[i])
  if (extent.some(n=>n<1e-5)) throw Error(`${label}: collapsed piece extent`)
  if (min.some(n=>n < -1e-9) || max.some(n=>n>10)) throw Error(`${label}: native material coordinates outside compilable range`)
  if (panel.pattern && (!plain(panel.pattern) || !finite(panel.pattern.width) || !finite(panel.pattern.height) ||
    panel.pattern.width<=0 || panel.pattern.height<=0)) throw Error(`${label}: invalid source material envelope`)
  return { poly, min, extent, sign:Math.sign(area) }
}

function catalog(project, edited) {
  if (!plain(project) || !plain(project.template) || !plain(edited) ||
      !Array.isArray(project.template.panels) || !Array.isArray(edited.panels) ||
      project.template.panels.length<2 || project.template.panels.length>128 ||
      !plain(project.grade_run) || project.grade_run.schemaVersion!==1 ||
      !same(project.grade_run.sizes,SIX) || project.grade_run.baseSize!=='M' ||
      !Array.isArray(project.grade_run.gradedTemplates) || project.grade_run.gradedTemplates.length!==6 ||
      !plain(project.grade_run.baseTemplate) ||
      canonical(project.grade_run.baseTemplate)!==canonical(project.template) ||
      project.grade_run.pomSpecs?.length || project.template.seams?.length || edited.seams?.length)
    throw Error('Missing current six-size native source, unsupported POM targets or sewn assembly')
  if (canonical({...project.template,panels:[]})!==canonical({...edited,panels:[]}))
    throw Error('Non-panel source metadata changed outside qualified geometry edit')
  const ids=project.template.panels.map(p=>p.id)
  if (ids.some(id=>typeof id!=='string'||!id) || new Set(ids).size!==ids.length ||
      !same(ids,edited.panels.map(p=>p.id))) throw Error('Panel identities or order changed')
  const bySize=project.grade_run.gradedTemplates
  for (let i=0;i<SIX.length;i++) {
    const src=bySize[i]
    if (!plain(src)||!Array.isArray(src.panels)||!same(src.panels.map(p=>p.id),ids)||
        canonical({...src,panels:[]})!==canonical({...project.template,panels:[]}))
      throw Error(`Stale six-size template identity ${SIX[i]}`)
    if (SIX[i]==='M' && canonical(src)!==canonical(project.template)) throw Error('Stored M base size differs from original source')
  }
  return bySize
}

export function planModarisProportionalSixSizeRegeneration20261027(project, updatedBaseTemplate, {
  expectedRevision, maxSizeRatio=1.8, minimumSizeRatio=0.5,
}={}) {
  try {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision<0 || project?.revision!==expectedRevision)
      throw Error('Stale native project revision')
    if (!finite(maxSizeRatio) || maxSizeRatio>2 || maxSizeRatio<=1 || !finite(minimumSizeRatio) || minimumSizeRatio<0.5 || minimumSizeRatio>=1)
      throw Error('Invalid permitted proportional grade limits')
    const bySize=catalog(project,updatedBaseTemplate)
    const original=project.template
    const candidates=[]
    let touched=0
    for (const [sizeIndex,size] of SIX.entries()) {
      const updated=structuredClone(updatedBaseTemplate)
      const rows=[]
      for (const [index,newPanel] of updated.panels.entries()) {
        const basePanel=original.panels[index], gradePanel=bySize[sizeIndex].panels[index]
        if (canonical(panelMetadata(basePanel))!==canonical(panelMetadata(newPanel)) ||
            canonical(panelMetadata(basePanel))!==canonical(panelMetadata(gradePanel)))
          throw Error(`${size}/${basePanel.id}: unsupported piece metadata change`)
        const a=validatedPolygon(basePanel,`original/${basePanel.id}`)
        const b=validatedPolygon(gradePanel,`${size}/${basePanel.id}`)
        const c=validatedPolygon(newPanel,`updated/${basePanel.id}`)
        if (!same(a.poly.edges,b.poly.edges)||!same(a.poly.edges,c.poly.edges) ||
            a.sign!==b.sign || a.sign!==c.sign) throw Error(`${size}/${basePanel.id}: polygon topology or winding changed`)
        const ratio=b.extent.map((n,axis)=>n/a.extent[axis])
        if (ratio.some(n=>n<minimumSizeRatio-1e-10||n>maxSizeRatio+1e-10))
          throw Error(`${size}/${basePanel.id}: size-specific proportional grade out of bounds`)
        const offset=b.min.map((n,axis)=>n-a.min[axis])
        newPanel.polygon.points=c.poly.points.map(p=>p.map((n,axis)=>c.min[axis]+offset[axis]+(n-c.min[axis])*ratio[axis]))
        const result=validatedPolygon(newPanel,`${size}/${basePanel.id}/regenerated`)
        if (result.sign!==c.sign || result.extent.some((n,axis)=>Math.abs(n-c.extent[axis]*ratio[axis])>1e-8))
          throw Error(`${size}/${basePanel.id}: nonlinear size geometry proof failed`)
        if (size!=='M' && !same(ratio,[1,1])) touched++
        rows.push({panelId:basePanel.id, priorExtentMm:a.extent.map(n=>n*1000),
          authoredSizeExtentMm:b.extent.map(n=>n*1000), updatedBaseExtentMm:c.extent.map(n=>n*1000),
          resultSizeExtentMm:result.extent.map(n=>n*1000), sizeRatio:ratio,
          oldPhysicalOffsetMm:offset.map(n=>n*1000)})
      }
      candidates.push({size,template:updated,rows})
    }
    if (touched<2) throw Error('No distinct size-specific proportional grading relationships were found')
    if (canonical(candidates[2].template)!==canonical(updatedBaseTemplate))
      throw Error('Base size was modified during size propagation')
    // Exact caller project remains unchanged; the candidate does not install
    // a Rust project, native binding graph, or manufacturing metadata.
    return Object.freeze({ok:true,sourceRevision:expectedRevision,sourceSize:'M',
      sizeOrder:[...SIX],sizeCount:6,changedRelations:touched,
      candidates,updatedGradeRun:{...structuredClone(project.grade_run),baseTemplate:structuredClone(updatedBaseTemplate),
        gradedTemplates:candidates.map(item=>structuredClone(item.template))},
      policy:'authored-piece-extents-proportional-x-y.v1',staged:true,committed:false,
      nativeAuthority:false,manufacturerApproved:false,factoryApproved:false,vendorEquivalent:false,
      limitations:['Straight detached polygons only','No native Rust commit path for this proportional alternative',
        'No grading with sewn, curved or industrial attachments','No factory or Modaris vendor-equivalence validation']})
  } catch (error) { return invalid(error instanceof Error?error.message:String(error)) }
}
