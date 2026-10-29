/** Size-by-size drafting QA coverage, derived solely from source measurements.
 * A local PASS never grants native activation, cutting or factory approval.
 */
export const NATIVE_GRADE_SIZES_20261025 = Object.freeze(['XS','S','M','L','XL','XXL'])

const finitePositive=value=>typeof value==='number'&&Number.isFinite(value)&&value>0

export function summarizeNativeGradingSizes20261025(workflow,pom,definitionCount=0){
  const blocks=Array.isArray(workflow?.geometry?.blocks)?workflow.geometry.blocks:[]
  const panelIds=blocks.map(block=>block?.panelId)
  const validPanelSet=blocks.length>0&&blocks.length===workflow?.panelCount&&
    panelIds.every(id=>typeof id==='string'&&id.length>0)&&
    new Set(panelIds).size===blocks.length
  const seamCount=Number.isInteger(workflow?.seamCount)&&workflow.seamCount>0?workflow.seamCount:0
  const authoredPOM=Number.isInteger(definitionCount)&&definitionCount>0?definitionCount:0
  const seamRows=Array.isArray(workflow?.sewing?.rows)?workflow.sewing.rows:[]
  const pomRows=Array.isArray(pom?.rows)?pom.rows:[]
  return NATIVE_GRADE_SIZES_20261025.map(size=>{
    const gradedPanels=blocks.map(block=>({panelId:block.panelId,
      rows:Array.isArray(block.rows)?block.rows.filter(row=>row?.size===size):[]}))
    const geometries=gradedPanels.flatMap(block=>block.rows)
    const geometryDiagnosticPass=validPanelSet&&
      gradedPanels.every(block=>block.rows.length===1&&block.rows[0]?.panelId===block.panelId)&&
      geometries.every(row=>finitePositive(row.widthMm)&&finitePositive(row.heightMm)&&
        finitePositive(row.perimeterMm)&&Number.isFinite(row.areaMm2)&&row.areaMm2!==0&&
        Array.isArray(row.blockers)&&row.blockers.length===0)
    // A good individual size is useful to identify, but cannot override a
    // failed all-size source audit. Keep both facts without promoting either
    // to factory readiness.
    const geometryPass=Boolean(workflow?.previewReady)&&geometryDiagnosticPass
    const seams=seamRows.filter(row=>row?.size===size)
    const sewingPass=seamCount>0&&seams.length===seamCount&&
      new Set(seams.map(row=>row.seamId)).size===seamCount&&
      seams.every(row=>row.pass===true&&Number.isFinite(row.mismatchMm))
    const poms=pomRows.filter(row=>row?.size===size)
    const pomPass=authoredPOM>0&&poms.length===authoredPOM&&
      new Set(poms.map(row=>row.id)).size===authoredPOM&&
      poms.every(row=>row.pass===true&&Number.isFinite(row.actualMm))
    const seamFailures=seams.filter(row=>row.pass!==true).length+Math.max(0,seamCount-seams.length)
    const pomFailures=poms.filter(row=>row.pass!==true).length+Math.max(0,authoredPOM-poms.length)
    const sewnPassed=Math.min(seamCount,new Set(seams.filter(row=>row.pass===true&&
      Number.isFinite(row.mismatchMm)).map(row=>row.seamId)).size)
    const pomPassed=Math.min(authoredPOM,new Set(poms.filter(row=>row.pass===true&&
      Number.isFinite(row.actualMm)).map(row=>row.id)).size)
    const findings=[]
    if(!validPanelSet)findings.push('Graded pattern-piece inventory is missing or duplicated')
    for(const block of gradedPanels){
      if(block.rows.length!==1||block.rows[0]?.panelId!==block.panelId)
        findings.push(`${block.panelId||'Unnamed piece'}: missing or duplicate contour measurements`)
      else {
        const row=block.rows[0]
        for(const reason of row.blockers||[])findings.push(`${block.panelId}: ${reason}`)
        if(!finitePositive(row.widthMm)||!finitePositive(row.heightMm)||
          !finitePositive(row.perimeterMm)||!Number.isFinite(row.areaMm2)||row.areaMm2===0)
          findings.push(`${block.panelId}: invalid material-space contour dimensions`)
      }
    }
    for(const row of seams){
      if(row.pass!==true)findings.push(`Seam ${row.seamId||'unknown'}: measured length difference requires review`)
    }
    if(seamCount===0)findings.push('No linked sewn seams to validate')
    else if(seams.length!==seamCount||new Set(seams.map(row=>row.seamId)).size!==seamCount)
      findings.push(`Expected ${seamCount} unique sewn seam checks; found ${seams.length}`)
    for(const row of poms){
      if(row.pass!==true)findings.push(`${row.label||row.id||'Measurement'}: ${row.targetMm==null?'target not entered':'outside target tolerance'}`)
    }
    if(authoredPOM===0)findings.push('No POM target specifications defined')
    else if(poms.length!==authoredPOM||new Set(poms.map(row=>row.id)).size!==authoredPOM)
      findings.push(`Expected ${authoredPOM} unique POM checks; found ${poms.length}`)
    if(!workflow?.previewReady&&geometryDiagnosticPass)
      findings.push('Other graded sizes or source validation still block the complete geometry audit')
    return {
      size,geometryDiagnosticPass,geometryPass,sewingPass,pomPass,
      sewnChecked:seams.length,sewnExpected:seamCount,seamFailures,sewnPassed,
      pomChecked:poms.length,pomExpected:authoredPOM,pomFailures,pomPassed,
      findings,reviewNeeded:findings.length>0||!geometryPass||!sewingPass||!pomPass,
      draftingChecksPass:geometryPass&&sewingPass&&pomPass,
      nativeCommitted:false,manufacturingApproved:false,
    }
  })
}
