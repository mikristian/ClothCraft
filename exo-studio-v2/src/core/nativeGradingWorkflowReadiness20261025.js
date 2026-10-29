import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {inspectAccuMarkNativeRuleSizeQA20261023} from './accumarkNativeRuleSizeQA20261023.js'
import {inspectAccuMarkNativeGradedSewnSeamQA20261023} from './accumarkNativeGradedSewnSeamQA20261023.js'

const SIZES=['XS','S','M','L','XL','XXL']
const exactSizes=sizes=>Array.isArray(sizes)&&sizes.length===SIZES.length&&
  SIZES.every((size,index)=>sizes[index]===size)
const exactRows=(rows,ids,key)=>Array.isArray(rows)&&rows.length===ids.length*SIZES.length&&
  rows.every(row=>row&&typeof row[key]==='string'&&typeof row.size==='string')&&
  new Set(rows.map(row=>JSON.stringify([row[key],row.size]))).size===rows.length&&
  ids.every(id=>SIZES.every(size=>rows.some(row=>row?.[key]===id&&row?.size===size&&
    (row?.pass===undefined||row.pass===true))))

// One consistent source-derived verdict for the native grading workbench.
// This is NOT a factory approval or a native Rust graded commit. The checks
// are deliberately conservative: missing seams, missing sizes, and stale
// geometry may not be silently interpreted as passing manufacturing QA.
export function inspectNativeGradingWorkflow20261025(snapshot,ruleSet,{toleranceMm=2}={}){
  const fail=(code,message)=>({
    ok:false,previewReady:false,sewingReady:false,productionReady:false,
    manufacturingApproved:false,nativeCommitted:false,
    stage:'blocked',geometry:null,sewing:null,issues:[{code,message}],
    sizeCount:0,panelCount:0,seamCount:0,
  })
  if(!snapshot?.template||!ruleSet)return fail('NO_RULES','Create a six-size point-rule draft from the current pattern.')
  try{
    if(!exactSizes(ruleSet.sizes))return fail('INVALID_SIZE_SET','Exactly six ordered sizes XS, S, M, L, XL, XXL are required.')
    const panels=snapshot.template.panels
    if(!Array.isArray(panels)||!panels.length||panels.length>1024||
      panels.some(panel=>typeof panel?.id!=='string'||!panel.id)||
      new Set(panels.map(panel=>panel.id)).size!==panels.length)
      return fail('INVALID_PANELS','Pattern panels must have distinct named identities.')
    const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet.baseSize})
    if(!compiled.ok)return fail('INVALID_GRADE_SOURCE',compiled.reason||'Missing or stale source geometry')
    const geometry=inspectAccuMarkNativeRuleSizeQA20261023(snapshot,ruleSet)
    const seams=snapshot.template.seams
    const seamCount=Array.isArray(seams)?seams.length:0
    const sewing=seamCount>0
      ?inspectAccuMarkNativeGradedSewnSeamQA20261023(snapshot,ruleSet,{toleranceMm})
      :{ok:false,reason:'No sewn relationships: grade contours can be reviewed, but seam matching is unverified.',rows:[],issues:[],checkedSeams:0}
    const completeGeometry=Array.isArray(geometry.blocks)&&geometry.blocks.length===panels.length&&
      new Set(geometry.blocks.map(block=>block.panelId)).size===panels.length&&
      panels.every(panel=>{
        const block=geometry.blocks.find(item=>item.panelId===panel.id)
        return block&&exactRows(block.rows,[panel.id],'panelId')&&block.rows.every(row=>
          [row.widthMm,row.heightMm,row.perimeterMm,row.areaMm2].every(Number.isFinite)&&
          row.widthMm>0&&row.heightMm>0&&row.perimeterMm>0&&row.areaMm2!==0&&
          Array.isArray(row.blockers)&&row.blockers.length===0)
      })
    const seamIds=Array.isArray(seams)?seams.map(seam=>seam?.id):[]
    const completeSeams=seamCount>0&&seamCount<=1024&&
      seamIds.every(id=>typeof id==='string'&&id.length>0)&&
      new Set(seamIds).size===seamCount&&sewing.checkedSeams===seamCount&&
      exactRows(sewing.rows,seamIds,'seamId')&&sewing.rows.every(row=>
        row.pass===true&&[row.sourceLengthMm,row.targetLengthMm,row.mismatchMm].every(Number.isFinite))
    const previewReady=Boolean(geometry.ok&&completeGeometry)
    const sewingReady=previewReady&&Boolean(sewing.ok&&completeSeams)
    const issues=[
      ...(!completeGeometry?[{code:'INCOMPLETE_GRADE_COVERAGE',message:'Every panel must have complete physical QA for exactly six sizes.'}]:[]),
      ...(seamCount&&!completeSeams?[{code:'INCOMPLETE_SEAM_COVERAGE',message:'Every sewn relationship must have verified physical QA for exactly six sizes.'}]:[]),
      ...(geometry.issues||[]).map(issue=>({
        code:issue.code||'GEOMETRY',message:issue.message||'Invalid graded contour',
        size:issue.size,panelId:issue.panelId,
      })),
      ...(!seamCount?[{code:'NO_SEAMS',message:sewing.reason}]:
        (sewing.issues||[]).map(issue=>({
          code:issue.code||'SEAM',message:issue.reason||`Seam ${issue.seamId||''} size ${issue.size||''} mismatch ${Number.isFinite(issue.mismatchMm)?issue.mismatchMm.toFixed(2)+' mm':''}`,
          seamId:issue.seamId,size:issue.size,
        }))),
    ]
    if(!sewing.ok&&seamCount>0&&!sewing.issues?.length)issues.push({
      code:'SEAM_AUDIT_BLOCKED',message:sewing.reason||'Sewn relationships could not be verified',
    })
    return {
      ok:sewingReady,previewReady,sewingReady,productionReady:false,
      manufacturingApproved:false,nativeCommitted:false,
      stage:!previewReady?'blocked':sewingReady?'source-verified':'needs-sewing',
      sizeCount:ruleSet.sizes.length,panelCount:geometry.blocks?.length||0,
      seamCount,geometry,sewing,issues,
    }
  }catch(error){return fail('QA_EXCEPTION',String(error?.message||error))}
}
