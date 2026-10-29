import { sha256Bytes } from './sha256Bytes.js'

/** Independent source-to-cut-receiver witness for native Rust six-size edits.
 * Native Rust owns all geometry; this verifier performs NO manufacturing work.
 * It refuses if named CUT edges, physical notches, size offsets or independent
 * CUT/STITCH measurements fail to follow the one-revision source change.
 */
const SIX=['XS','S','M','L','XL','XXL']
const fail=reason=>Object.freeze({ok:false,reason,manufacturingApproved:false})
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const pair=p=>Array.isArray(p)&&p.length===2&&p.every(finite)
const norm=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const id=s=>typeof s==='string'&&s.length>0&&s.length<129
const FIXTURE_TOL=1e-8
const sha=value=>`sha256:${sha256Bytes(new TextEncoder().encode(JSON.stringify(value)))}`

const getPoly=(panel)=>panel?.polygon
const getRun=(project)=>project?.grade_run??project?.gradeRun
function checkShape(a,b,changed){
  if(!id(a?.id)||b?.id!==a.id||!getPoly(a)||!getPoly(b))throw Error('Missing or changed native panel identity')
  const old=getPoly(a),next=getPoly(b)
  if(!Array.isArray(old.points)||!Array.isArray(next.points)||old.points.length<3||old.points.length!==next.points.length||
    !old.points.every(pair)||!next.points.every(pair)||!Array.isArray(old.edges)||old.edges.length!==old.points.length||
    !same(old.edges,next.edges)||new Set(old.edges).size!==old.edges.length)
    throw Error('Unsafe native geometry or changed named boundary identities')
  const beforeSA=old.seam_allowances??{},afterSA=next.seam_allowances??{}
  const beforeNotch=old.notches??{},afterNotch=next.notches??{}
  if(!same(beforeSA,afterSA)||!same(beforeNotch,afterNotch))throw Error('Manufacturing allowance/notch instructions changed in regenerated source')
  for(const edge of old.edges){
    const width=beforeSA[edge]
    if(!finite(width)||width<=0||width>0.5)throw Error(`No authenticated positive allowance on named edge ${edge}`)
    for(const notch of beforeNotch[edge]??[]){
      if(!finite(notch.t)||notch.t<=0||notch.t>=1||!finite(notch.depth_m)||notch.depth_m<=0||notch.depth_m>width)
        throw Error(`Invalid physical notch instruction on ${edge}`)
    }
  }
  if(Object.keys(beforeSA).some(edge=>!old.edges.includes(edge))||Object.keys(beforeNotch).some(edge=>!old.edges.includes(edge)))
    throw Error('Orphaned industrial mark or allowance edge')
  const moved=old.points.some((p,i)=>norm(p,next.points[i])>FIXTURE_TOL)
  if(changed&&!moved)throw Error('Requested edited panel did not physically move')
  if(!changed&&!same(a,b))throw Error('Unrelated authored native panel changed')
  return moved
}
function checkMark(mark,wire,polygon){
  if(!id(mark?.edge_id)||!polygon.edges.includes(mark.edge_id)||!finite(mark.t)||!finite(mark.depth_m)||
    !pair(mark.cut_start)||!pair(mark.inner_end))throw Error('Invalid real CUT-notch shape')
  const edge=polygon.edges.indexOf(mark.edge_id),a=polygon.points[edge],b=polygon.points[(edge+1)%polygon.points.length]
  const delta=[b[0]-a[0],b[1]-a[1]],length=Math.hypot(...delta)
  if(length<1e-8)throw Error('Degenerate marked industrial edge')
  const station=[a[0]+delta[0]*mark.t,a[1]+delta[1]*mark.t]
  const outward=[delta[1]/length,-delta[0]/length]
  const width=polygon.seam_allowances[mark.edge_id]
  const ray=[mark.cut_start[0]-station[0],mark.cut_start[1]-station[1]]
  // Only the straight subset is supported here; Rust samples curved edges.
  if(Object.keys(polygon.curves??{}).length||Object.keys(polygon.free_curve_points??{}).length)
    throw Error('Curved physical notch verifier requires independent arclength solver')
  if(Math.abs(ray[0]*outward[0]+ray[1]*outward[1]-width)>0.001+1e-8||
    Math.abs(ray[0]*outward[1]-ray[1]*outward[0])>0.001+1e-8)
    throw Error('CUT notch is not physically projected from current named STITCH edge')
  const expectedEnd=[mark.cut_start[0]-mark.depth_m*outward[0],mark.cut_start[1]-mark.depth_m*outward[1]]
  if(norm(expectedEnd,mark.inner_end)>1e-7)throw Error('Notch inner endpoint or depth differs from authored material mark')
  return {edge:mark.edge_id,t:mark.t,depthM:mark.depth_m,cutStart:[...mark.cut_start],innerEnd:[...mark.inner_end]}
}

function inspect(project,packet,revision){
  const run=getRun(project)
  if(!run||!same(run.sizes,SIX)||!Array.isArray(run.gradedTemplates)||run.gradedTemplates.length!==6||
    !same(packet?.sizes?.map(x=>x.size),SIX)||packet.format!=='exo-native-graded-cutlines.v1'||
    packet.sourceRevision!==revision||packet.revision!==revision||packet.cuttingAuthorized!==false||
    packet.manufacturerReady!==false||!project.template?.panels?.length)
    throw Error('Stale, incomplete or unqualified six-size native CUT receipt')
  const rows=[]
  for(let i=0;i<6;i++){
    const source=run.gradedTemplates[i],grade=packet.sizes[i]
    if(!Array.isArray(source.panels)||!Array.isArray(grade.panels)||source.panels.length!==grade.panels.length)
      throw Error('Missing or extra graded native panel')
    const entries=[]
    for(const panel of source.panels){
      const result=grade.panels.find(x=>x.panel_id===panel.id)
      const poly=panel.polygon,cut=result?.cut
      if(!result||grade.panels.filter(x=>x.panel_id===panel.id).length!==1||
         !poly||!Array.isArray(cut?.points)||cut.points.length<poly.points.length||
         !cut.points.every(pair)||!finite(cut.area_m2)||cut.area_m2<=0||
         !finite(cut.perimeter_m)||cut.perimeter_m<=0||!Array.isArray(cut.edges)||
         !same(cut.edges.map(e=>e.name),poly.edges)||!Array.isArray(cut.notches))
        throw Error(`Invalid actual physical CUT record for ${grade.size}/${panel.id}`)
      for(const e of cut.edges){
        if(!finite(e.allowance_m)||Math.abs(e.allowance_m-poly.seam_allowances?.[e.name])>1e-9)
          throw Error('Named physical CUT allowance changed or missing')
        if(!finite(result.sewline_edge_lengths_m?.[e.name])||result.sewline_edge_lengths_m[e.name]<=0)
          throw Error('Missing physical named STITCH edge length')
      }
      const wanted=poly.edges.flatMap(edge=>(poly.notches?.[edge]??[]).map(n=>({edge,t:n.t,depthM:n.depth_m})))
      if(wanted.length!==cut.notches.length)throw Error('Native physical CUT notch count drift')
      const notches=cut.notches.map(mark=>checkMark(mark,cut,poly))
      for(const mark of wanted){
        if(!notches.some(other=>other.edge===mark.edge&&Math.abs(other.t-mark.t)<1e-9&&Math.abs(other.depthM-mark.depthM)<1e-9))
          throw Error('Physical CUT notch instruction identity drift')
      }
      entries.push({panelId:panel.id,points:poly.points,cutPoints:cut.points,
        cutAreaM2:cut.area_m2,cutPerimeterM:cut.perimeter_m,notches,
        stitchEdges:result.sewline_edge_lengths_m})
    }
    if(new Set(entries.map(e=>e.panelId)).size!==entries.length)throw Error('Duplicate graded panel ID')
    rows.push({size:grade.size,entries})
  }
  return rows
}

export function verifyModarisNativeIndustrialReactiveWitness20261027({beforeProject,afterProject,beforeCutlines,
  afterCutlines,beforeRevision,afterRevision,changedPanelIds}={}){
  try{
    if(!Number.isSafeInteger(beforeRevision)||afterRevision!==beforeRevision+1||
      !Array.isArray(changedPanelIds)||changedPanelIds.length<2||new Set(changedPanelIds).size!==changedPanelIds.length||
      !changedPanelIds.every(id))throw Error('One contiguous native revision and two changed panel identities required')
    const a=inspect(beforeProject,beforeCutlines,beforeRevision),b=inspect(afterProject,afterCutlines,afterRevision)
    if(a.length!==6||b.length!==6)throw Error('Missing graded physical CUT receipts')
    const baseA=beforeProject.template.panels,baseB=afterProject.template.panels
    if(baseA.length!==baseB.length)throw Error('Changed authored panel count')
    for(let i=0;i<baseA.length;i++)checkShape(baseA[i],baseB[i],changedPanelIds.includes(baseA[i].id))
    const rows=[]
    for(let i=0;i<6;i++){
      const beforeSize=a[i],afterSize=b[i]
      if(beforeSize.size!==afterSize.size||beforeSize.entries.length!==afterSize.entries.length)
        throw Error('Six-size CUT receipt identities changed')
      const beforeGrade=getRun(beforeProject).gradedTemplates[i].panels
      const afterGrade=getRun(afterProject).gradedTemplates[i].panels
      for(let j=0;j<beforeGrade.length;j++){
        const id=beforeGrade[j].id
        const changed=changedPanelIds.includes(id)
        checkShape(beforeGrade[j],afterGrade[j],changed)
        const authoredBefore=baseA.find(panel=>panel.id===id)
        const authoredAfter=baseB.find(panel=>panel.id===id)
        const gradeOld=getPoly(beforeGrade[j]).points,gradeNew=getPoly(afterGrade[j]).points
        if(!authoredBefore||!authoredAfter||gradeOld.length!==gradeNew.length)throw Error('Missing graded base material topology')
        for(let k=0;k<gradeOld.length;k++){
          const oldBase=getPoly(authoredBefore).points[k],newBase=getPoly(authoredAfter).points[k]
          if(norm([gradeOld[k][0]-oldBase[0],gradeOld[k][1]-oldBase[1]],
              [gradeNew[k][0]-newBase[0],gradeNew[k][1]-newBase[1]])>1e-7)
            throw Error('Saved independent six-size point grade delta changed during industrial regeneration')
        }
        const before=beforeSize.entries.find(e=>e.panelId===id),after=afterSize.entries.find(e=>e.panelId===id)
        if(!before||!after)throw Error('Missing matching native graded CUT panel')
        if(changed&&same(before.cutPoints,after.cutPoints))throw Error('Physical CUT not regenerated for changed panel')
        if(!changed&&!same(before,after))throw Error('Unrelated graded CUT/STITCH/notch receipt changed')
        for(const notch of before.notches){
          const current=after.notches.find(x=>x.edge===notch.edge&&x.t===notch.t&&x.depthM===notch.depthM)
          if(!current)throw Error('Saved production notch identity lost')
          const sourceBefore=getPoly(beforeGrade[j]),sourceAfter=getPoly(afterGrade[j])
          const edge=sourceBefore.edges.indexOf(notch.edge),next=(edge+1)%sourceBefore.points.length
          const changedEdge=norm(sourceBefore.points[edge],sourceAfter.points[edge])>FIXTURE_TOL||
            norm(sourceBefore.points[next],sourceAfter.points[next])>FIXTURE_TOL
          if(changedEdge&&norm(notch.cutStart,current.cutStart)<FIXTURE_TOL)
            throw Error('Physical notch location did not react to edited source edge')
        }
        rows.push({size:beforeSize.size,panelId:id,changed,notches:after.notches.length,
          cutAreaM2:after.cutAreaM2,stitchEdgeCount:Object.keys(after.stitchEdges).length})
      }
    }
    return Object.freeze({ok:true,sourceRevision:beforeRevision,committedRevision:afterRevision,
      rows,gradedSizes:[...SIX],verifiedCutPanels:rows.length,
      verifiedNotches:rows.reduce((sum,r)=>sum+r.notches,0),
      engineeringEvidenceDigest:sha(rows),nativeIndustrialRegenerationVerified:true,
      manufacturingApproved:false,externalModarisAccepted:false,
      qualification:'This validates existing Rust graded CUT and material notch recomputation, not sewn fit, cutter scale, curved rules, fabric, or a licensed Modaris receiver.'})
  }catch(error){return fail(error?.message??String(error))}
}
