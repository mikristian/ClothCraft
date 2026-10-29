import {verifyModarisNativeIndustrialReactiveWitness20261027 as verifyIndustrial} from './modarisNativeIndustrialReactiveWitness20261027.js'
import {sha256Bytes} from './sha256Bytes.js'

const SIZES=['XS','S','M','L','XL','XXL']
const tol=1e-6
const fail=reason=>Object.freeze({ok:false,reason,pairedSewingAccepted:false,factoryApproved:false})
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const point=x=>Array.isArray(x)&&x.length===2&&x.every(finite)
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const hash=value=>`sha256:${sha256Bytes(new TextEncoder().encode(JSON.stringify(value)))}`
const index=(template,panelId,edgeId)=>{
  const panel=template?.panels?.find(p=>p.id===panelId)
  if(!panel||template.panels.filter(p=>p.id===panelId).length!==1)throw Error('Unknown or duplicate sewn panel identity')
  const poly=panel.polygon
  if(!poly||Object.keys(poly.curves??{}).length||Object.keys(poly.free_curve_points??{}).length||
     !Array.isArray(poly.points)||poly.points.length!==poly.edges?.length)
    throw Error('This sewing witness supports only authored straight-edge material geometry')
  const i=poly.edges.indexOf(edgeId)
  if(i<0||poly.edges.filter(n=>n===edgeId).length!==1)throw Error('Missing or duplicate named sewn edge')
  const a=poly.points[i],b=poly.points[(i+1)%poly.points.length]
  if(!point(a)||!point(b)||distance(a,b)<1e-7)throw Error('Nonfinite or collapsed sewn edge')
  return {panel,poly,a,b,length:distance(a,b)}
}
function receipt(source,packet,revision,cut){
  const run=source?.grade_run??source?.gradeRun
  if(!run||!same(run.sizes,SIZES)||!Array.isArray(run.gradedTemplates)||run.gradedTemplates.length!==6||
    packet?.format!=='exo-native-six-size-sewn-balance-audit.v1'||packet.sourceRevision!==revision||
    packet.factoryApproved!==false||packet.joinedCurveMutation!==false||packet.easeReviewRequired!==false||
    !same(packet.sizes?.map(s=>s.size),SIZES)||!Array.isArray(source.template?.seams)||!source.template.seams.length)
    throw Error('Missing, stale or unresolved six-size physical sewn evidence')
  const inventory=source.template.seams
  if(new Set(inventory.map(s=>s.id)).size!==inventory.length)throw Error('Duplicate authored seam identity')
  const rows=[]
  for(let s=0;s<6;s++){
    const size=packet.sizes[s],template=run.gradedTemplates[s],gradeCut=cut.sizes[s]
    if(size.seams?.length!==inventory.length||!same(template.seams,inventory)||
       gradeCut?.size!==SIZES[s]||!Array.isArray(gradeCut.panels))
      throw Error('Sewn source or six-size seam inventory changed')
    for(const authored of inventory){
      const seam=size.seams.find(x=>x.seamId===authored.id)
      if(!seam||size.seams.filter(x=>x.seamId===authored.id).length!==1||
        seam.allowEase!==false||seam.requiresEaseReview!==false||
        authored.allow_ease!==false||!finite(seam.mismatchM)||seam.mismatchM>1e-5||seam.mismatchM<0)
        throw Error('Unbalanced or easing-authorized sewn interval')
      for(const [side,ref,reversed] of [[seam.a,authored.a,false],[seam.b,authored.b,authored.reverse_b]]){
        if(!ref||side?.panelId!==ref.panel||side.edgeId!==ref.edge||side.reversed!==reversed||
          !same(side.interval,ref.range)||!Array.isArray(ref.range)||ref.range.length!==2||
          ref.range.some(n=>!finite(n)||n<0||n>1)||ref.range[1]-ref.range[0]<1e-8)
          throw Error('Sewing side boundary reference changed')
        const geometry=index(template,ref.panel,ref.edge),cutPanel=gradeCut.panels.find(p=>p.panel_id===ref.panel)
        if(!cutPanel||gradeCut.panels.filter(p=>p.panel_id===ref.panel).length!==1||
          !finite(cutPanel.sewline_edge_lengths_m?.[ref.edge])||
          Math.abs(cutPanel.sewline_edge_lengths_m[ref.edge]-geometry.length)>tol||
          !finite(side.fullSewlineM)||Math.abs(side.fullSewlineM-geometry.length)>tol||
          !finite(side.sewnIntervalM)||Math.abs(side.sewnIntervalM-geometry.length*(ref.range[1]-ref.range[0]))>tol)
          throw Error('Native sewn balance disagrees with independent physical STITCH receiver')
        const authoredNotches=(geometry.poly.notches?.[ref.edge]??[])
          .filter(n=>n.t>ref.range[0]+1e-9&&n.t<ref.range[1]-1e-9)
        const seen=authoredNotches.map(n=>[geometry.a[0]+(geometry.b[0]-geometry.a[0])*n.t,
          geometry.a[1]+(geometry.b[1]-geometry.a[1])*n.t])
        if(!Array.isArray(side.notchPositionsM)||side.notchPositionsM.length!==seen.length||
          !side.notchPositionsM.every((p,i)=>point(p)&&distance(p,seen[i])<=tol))
          throw Error('Native sewn physical notch station differs from corresponding material edge')
      }
      if(Math.abs(seam.a.sewnIntervalM-seam.b.sewnIntervalM)>1e-5||
        !Array.isArray(seam.notchIntervalLengthsM)||seam.notchIntervalLengthsM.length!==authored.notches?.length+1||
        seam.notchIntervalLengthsM.some(pair=>!point(pair)||pair.some(x=>x<=0)||Math.abs(pair[0]-pair[1])>1e-5))
        throw Error('Industrial seam-notch interval mismatch across sewn pieces')
      rows.push({size:SIZES[s],seamId:seam.seamId,sourceSide:seam.a.panelId,
        targetSide:seam.b.panelId,edgeIds:[seam.a.edgeId,seam.b.edgeId],
        intervalsM:[seam.a.sewnIntervalM,seam.b.sewnIntervalM],
        sourceNotches:seam.a.notchPositionsM.length,targetNotches:seam.b.notchPositionsM.length})
    }
  }
  return rows
}

/** A read-only independent remeasurement against actual Rust receipts. */
export function verifyModarisNativeSewnReactiveWitness20261027({beforeProject,afterProject,
  beforeCutlines,afterCutlines,beforeSewing,afterSewing,beforeRevision,afterRevision,changedPanelIds}={}){
  try{
    if(!Number.isSafeInteger(beforeRevision)||afterRevision!==beforeRevision+1)
      throw Error('Sewn material changes require one exact Rust revision')
    if(!same(beforeProject?.template?.seams,afterProject?.template?.seams))
      throw Error('Recomputation changed authored source sewing attachments')
    const industrial=verifyIndustrial({beforeProject,afterProject,beforeCutlines,afterCutlines,
      beforeRevision,afterRevision,changedPanelIds})
    if(!industrial.ok)throw Error(`Native physical CUT witness refused: ${industrial.reason}`)
    const old=receipt(beforeProject,beforeSewing,beforeRevision,beforeCutlines)
    const current=receipt(afterProject,afterSewing,afterRevision,afterCutlines)
    if(old.length!==current.length||old.length<6||current.some((row,i)=>
      row.seamId!==old[i].seamId||row.size!==old[i].size||row.sourceSide!==old[i].sourceSide||
      row.targetSide!==old[i].targetSide||!same(row.edgeIds,old[i].edgeIds)||
      row.sourceNotches!==old[i].sourceNotches||row.targetNotches!==old[i].targetNotches))
      throw Error('Saved six-size sewn-edge or notch correspondence identity changed')
    for(const [i,row] of current.entries()){
      if(changedPanelIds.includes(row.sourceSide)||changedPanelIds.includes(row.targetSide)){
        if(same(row.intervalsM,old[i].intervalsM))throw Error('Dependent graded sewn-length physical geometry did not regenerate')
      }
    }
    return Object.freeze({ok:true,physicalIndustrialWitness:industrial.engineeringEvidenceDigest,
      sourceRevision:beforeRevision,committedRevision:afterRevision,sizes:[...SIZES],
      verifiedPhysicalSewnIntervals:current.length,verifiedCutPanels:industrial.verifiedCutPanels,
      verifiedCutNotches:industrial.verifiedNotches,sewnGeometryDigest:hash(current),
      regeneratedPairedSewingVerified:true,requiresEaseReview:false,
      factoryApproved:false,cuttingAuthorized:false,vendorAccepted:false,
      limitations:'Qualified exact paired straight sewing edges with native six-size CUT and notches, not curved seaming, fabric easing, 3D fit or a licensed Modaris receiving test.'})
  }catch(error){return fail(error?.message??String(error))}
}
