import {buildAccuMarkNativeGradeProposal20261023} from './accumarkNativeGradeProposal20261023.js'

/** Read-only, independently computed affine size proposals; never committed/approved grading rules. */
export function buildAccuMarkNativeMultiPanelNest20261023(snapshot,{
  sizes=['XS','S','M','L','XL','XXL'],baseSize='M',selectedSize='L',
  widthStepMm,heightStepMm,enabled=true,
}={}) {
  const fail=reason=>({ok:false,reason})
  if(!enabled)return fail('Multi-panel affine proposal is disabled')
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||
      sizes.some(size=>typeof size!=='string'||!size.trim()||size.length>32)||
      new Set(sizes).size!==sizes.length || sizes.some(size=>size==='__proto__'))return fail('Invalid or duplicated size names')
  if(!sizes.includes(baseSize)||!sizes.includes(selectedSize))return fail('Base and selected sizes must belong to the size run')
  if(typeof widthStepMm!=='number'||!Number.isFinite(widthStepMm)||
      typeof heightStepMm!=='number'||!Number.isFinite(heightStepMm))return fail('Finite numeric width and height steps in millimetres are required')
  if(!snapshot||!Array.isArray(snapshot.template?.panels)||!snapshot.template.panels.length||
      snapshot.template.panels.length>256)return fail('A bounded native snapshot with panels is required')
  const ids=snapshot.template.panels.map(panel=>panel?.id)
  if(ids.some(id=>typeof id!=='string'||!id.trim()||id.length>256||id==='__proto__')||new Set(ids).size!==ids.length)
    return fail('Invalid or duplicated panel identifiers')
  const baseIndex=sizes.indexOf(baseSize)
  if(sizes.some((_,i)=>!Number.isFinite((i-baseIndex)*widthStepMm)||
    !Number.isFinite((i-baseIndex)*heightStepMm)))return fail('Grading size deltas overflow numeric bounds')
  const byPanel=Object.create(null),issues=[]
  for(const panel of snapshot.template.panels){
    const panelId=panel.id, run=Object.create(null)
    let accuracy='exact',boundUncertainty=null,failed=null
    for(let i=0;i<sizes.length;i++){
      const size=sizes[i],step=i-baseIndex
      if(step===0){
        // Zero increment is rejected by nativeGradePlan. A base size is a source snapshot,
        // not a newly graded proposal; validate geometry with a nonzero probe below.
        continue
      }
      const proposal=buildAccuMarkNativeGradeProposal20261023(snapshot,{
        panelId,widthDeltaMm:step*widthStepMm,heightDeltaMm:step*heightStepMm,gradeModeOpen:true,
      })
      if(!proposal.ok){failed=`${size}: ${proposal.reason}`;break}
      run[size]={panelId,polygon:proposal.sizeRun.PREVIEW.polygon,units:'m'}
      if(proposal.accuracy==='approximate'){
        accuracy='approximate';boundUncertainty=proposal.boundUncertainty
      }
    }
    // Explicitly preflight an unchanged BASE through the same verified native
    // implementation. If every requested delta is zero there is no valid probe.
    const validProposal=Object.keys(run).length
      ?buildAccuMarkNativeGradeProposal20261023(snapshot,{
        panelId,widthDeltaMm:(sizes.indexOf(Object.keys(run)[0])-baseIndex)*widthStepMm,
        heightDeltaMm:(sizes.indexOf(Object.keys(run)[0])-baseIndex)*heightStepMm,
        gradeModeOpen:true,
      }):null
    if(!failed&&!validProposal?.ok)failed=validProposal?.reason||'A nonzero validated affine grade proposal is required'
    if(failed){issues.push({panelId,reason:failed});continue}
    run[baseSize]={panelId,polygon:structuredClone(validProposal.basePolygon),units:'m'}
    const sizeRun=Object.create(null)
    for(const size of sizes)sizeRun[size]=run[size]
    byPanel[panelId]={ok:true,panelId,basePolygon:structuredClone(validProposal.basePolygon),
      sizeRun,sizes:[...sizes],baseSize,selectedSize,accuracy,boundUncertainty,
      source:'AFFINE_PROPOSAL_NOT_COMMITTED_GRADING'}
  }
  if(!Object.keys(byPanel).length)return fail(`No valid panel size runs: ${issues.map(issue=>`${issue.panelId}: ${issue.reason}`).join('; ')}`)
  return {ok:true,byPanel,issues,source:'AFFINE_PROPOSAL_NOT_COMMITTED_GRADING'}
}
