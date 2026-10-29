/** Source-linked all-size material metrology; never a factory release document.
 * Every named boundary is measured with the same curve-flattening contract as
 * Rust's sewn boundary implementation. All sizes/panels are required.
 */
import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'
import {inspectNativeGradingWorkflow20261025} from './nativeGradingWorkflowReadiness20261025.js'
import {inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'
import {inspectNativeGradeCutPreflight20261025} from './nativeGradeCutPreflight20261025.js'

const SIZES=['XS','S','M','L','XL','XXL']
const finite=value=>typeof value==='number'&&Number.isFinite(value)
const fail=reason=>({ok:false,reason,rows:[],edgeRows:[],seamRows:[],pomRows:[],
  reviewReady:false,sewingReady:false,pomReady:false,manufacturingApproved:false,
  factoryCertified:false,source:'SOURCE_ONLY_NATIVE_GRADE_METROLOGY'})

export function inspectNativeGradeMeasurementMatrix20261025(snapshot,ruleSet,pomDefinitions=[]){
  try{
    if(!Array.isArray(ruleSet?.sizes)||ruleSet.sizes.length!==SIZES.length||
      !SIZES.every((size,index)=>size===ruleSet.sizes[index]))
      return fail('Exactly six ordered XS–XXL grade sizes are required')
    const panels=snapshot?.template?.panels
    if(!Array.isArray(panels)||!panels.length||panels.length>256||
      new Set(panels.map(p=>p?.id)).size!==panels.length)
      return fail('Distinct native source panels are required')
    const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet.baseSize})
    if(!compiled.ok)return fail(compiled.reason||'Source grade rules could not be compiled')
    const geometry=inspectNativeGradingWorkflow20261025(snapshot,ruleSet)
    const cutPreflight=inspectNativeGradeCutPreflight20261025(snapshot,compiled)
    const pom=inspectNativeGradingPOM20261025(snapshot,ruleSet,pomDefinitions)
    const edgeRows=[]
    for(const panel of panels){
      const run=compiled.byPanel?.[panel.id]
      if(!run?.sizeRun)return fail(`Missing panel graded size run: ${panel.id}`)
      const edgeIds=panel.polygon?.edges
      if(!Array.isArray(edgeIds)||!edgeIds.length||new Set(edgeIds).size!==edgeIds.length)
        return fail(`Incomplete source edge inventory: ${panel.id}`)
      for(const edge of edgeIds){
        const lengths=[]
        for(const size of SIZES){
          const polygon=run.sizeRun[size]?.polygon
          if(!polygon||!polygon.edges?.includes(edge))
            return fail(`Missing graded physical edge: ${panel.id}/${size}/${edge}`)
          const measured=nativeRustEdgeLength20261023(polygon,edge)
          if(!measured.ok||!finite(measured.totalLengthM)||measured.totalLengthM<=0)
            return fail(`Unmeasurable ${panel.id}/${size}/${edge}: ${measured.reason||'invalid length'}`)
          lengths.push(measured.totalLengthM*1000)
        }
        const baseline=lengths[SIZES.indexOf(ruleSet.baseSize)]
        for(let i=0;i<SIZES.length;i++){
          edgeRows.push({kind:'edge',panelId:panel.id,id:edge,size:SIZES[i],
            actualMm:lengths[i],baseDeltaMm:lengths[i]-baseline,
            precedingSize:i?SIZES[i-1]:null,
            adjacentGrowthMm:i?lengths[i]-lengths[i-1]:null,
            status:geometry.previewReady?'MEASURED_SOURCE_ONLY':'GEOMETRY_QA_BLOCKED',
            method:'RUST_CURVE_FLATTEN_0_25MM'})
        }
      }
    }
    if(edgeRows.length!==panels.reduce((sum,p)=>sum+p.polygon.edges.length,0)*6)
      return fail('Physical edge measurement coverage is incomplete')
    const seamRows=(geometry.sewing?.rows||[]).map(row=>({kind:'seam',
      panelId:row.sourcePanel,id:row.seamId,size:row.size,
      actualMm:row.sourceLengthMm,otherMm:row.targetLengthMm,
      deltaMm:row.signedEaseMm,toleranceMm:geometry.sewing?.toleranceMm,
      status:row.pass?'MEASURED_SOURCE_ONLY':'SEAM_MISMATCH',method:row.accuracy}))
    const pomRows=(pom.rows||[]).map(row=>({kind:'pom',panelId:row.panelId,
      id:row.id,size:row.size,actualMm:row.actualMm,targetMm:row.targetMm,
      deltaMm:row.deltaMm,toleranceMm:row.toleranceMm,
      status:row.pass?'MEASURED_SOURCE_ONLY':row.targetMm===null?'TARGET_MISSING':'POM_OUT_OF_TOLERANCE',
      method:row.kind}))
    if((geometry.sewing?.rows||[]).length!==seamRows.length||
      (pom.rows||[]).length!==pomRows.length)
      return fail('Seam or POM measurement coverage is incomplete')
    return {ok:true,rows:[...edgeRows,...seamRows,...pomRows],edgeRows,seamRows,pomRows,
      panelCount:panels.length,edgeCount:edgeRows.length/6,sizes:[...SIZES],
      sourceRevision:Number.isSafeInteger(snapshot?.revision)?snapshot.revision:null,
      sourceFingerprint:ruleSet.templateFingerprint,
      reviewReady:geometry.previewReady,sewingReady:geometry.sewingReady,pomReady:pom.verified,
      cutPreflight,cutEvidenceReady:false,
      issues:[...(geometry.issues||[]),...(pom.issues||[]),...cutPreflight.issues],
      source:'SOURCE_ONLY_NATIVE_GRADE_METROLOGY',manufacturingApproved:false,
      factoryCertified:false,cuttingAuthorized:false}
  }catch(error){return fail(String(error?.message||error))}
}

const csvCell=value=>{
  if(value==null)return ''
  const string=typeof value==='number'&&finite(value)?String(Math.round(value*1e6)/1e6):String(value)
  // CSV/Excel formula injection must not execute from authored panel/edge IDs.
  const literal=/^[\s]*[=+@\-\t\r]/.test(string)?"'"+string:string
  return '"'+literal.replace(/"/g,'""')+'"'
}

export function exportNativeGradeMeasurementCsv20261025(matrix){
  if(!matrix?.ok||!Array.isArray(matrix.rows)||!matrix.rows.length)
    throw Error('A complete six-size measurement matrix is required before export')
  const fields=['kind','panelId','id','size','actualMm','baseDeltaMm','adjacentGrowthMm',
    'precedingSize','otherMm','targetMm','deltaMm','toleranceMm','status','method']
  const lines=[['EXO SOURCE-ONLY GRADE METROLOGY — NOT CERTIFIED FOR CUTTING'],
    ['sourceRevision',matrix.sourceRevision??'unknown'],
    ['templateFingerprint',matrix.sourceFingerprint||'unknown'],
    ['units','mm'],['manufacturingApproved','false'],fields,
    ...matrix.rows.map(row=>fields.map(key=>row[key]??null))]
  return lines.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'
}
