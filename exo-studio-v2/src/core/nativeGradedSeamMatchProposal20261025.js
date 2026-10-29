import {compileAccuMarkNativeRuleSizeRun,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {inspectAccuMarkNativeGradedSewnSeamQA20261023} from './accumarkNativeGradedSewnSeamQA20261023.js'
import {inspectAccuMarkNativeRuleSizeQA20261023} from './accumarkNativeRuleSizeQA20261023.js'
import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'

const SIZES=['XS','S','M','L','XL','XXL']
const fail=reason=>({ok:false,reason,nativeCommitted:false,manufacturingApproved:false})
const mm=(polygon,ref)=>{
  const result=nativeRustEdgeLength20261023(polygon,ref.edge)
  if(!result.ok)throw Error(result.reason||'Sewn material boundary unavailable')
  return result.totalLengthM*1000*(ref.range[1]-ref.range[0])
}

/**
 * Bounded, opt-in SINGLE SIZE source grading suggestion. Only one named-size
 * point offset is changed; no Rust action or automatic native sewing occurs.
 * Uses exact Rust-equivalent curved edge arclength, never a straight chord.
 *
 * A proposed correction must improve the selected physical seam, preserve
 * every previously passing sewn relationship, and pass all-size 2D geometry
 * QA before an editor may choose to apply its returned sidecar.
 */
export function proposeNativeGradedSeamMatch20261025(snapshot,ruleSet,{
  seamId,size,toleranceMm=2,maxPointMoveMm=60,
}={}){
  try{
    if(!SIZES.includes(size)||size===ruleSet?.baseSize)
      return fail('Choose a non-base XS–XXL grading size to adjust')
    if(!Number.isFinite(toleranceMm)||toleranceMm<0||toleranceMm>10||
      !Number.isFinite(maxPointMoveMm)||maxPointMoveMm<=0||maxPointMoveMm>100)
      return fail('Choose bounded seam tolerance and point-movement limits')
    const source=inspectAccuMarkNativeGradedSewnSeamQA20261023(snapshot,ruleSet,{toleranceMm})
    if(!Array.isArray(source.rows)||source.rows.length!==snapshot?.template?.seams?.length*6)
      return fail(source.reason||'Complete native six-size sewn measurements required')
    const selected=source.rows.find(row=>row.size===size&&row.seamId===seamId)
    if(!selected)return fail('Select an existing sewn interval and grading size')
    if(selected.pass)return fail('Selected sewn interval already fits within tolerance')
    const seam=snapshot.template.seams.find(s=>s.id===seamId)
    if(!seam||!Number.isFinite(selected.mismatchMm)||selected.mismatchMm>maxPointMoveMm*2)
      return fail('Seam mismatch is outside the bounded single-point repair window')
    const original=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:size})
    if(!original.ok)return fail(original.reason||'Graded size source unavailable')
    const steps=[0.4,0.7,1,1.3,1.7]
    const proposals=[]
    for(const side of ['b','a']){
      const ref=seam[side],other=seam[side==='a'?'b':'a']
      const panel=snapshot.template.panels.find(p=>p.id===ref.panel)
      const edgeIndex=panel?.polygon?.edges?.indexOf(ref.edge)??-1
      if(edgeIndex<0)continue
      const nextIndex=(edgeIndex+1)%panel.polygon.points.length
      const baseline=ruleSet.panels?.[ref.panel]?.pointOffsetsMm?.[size]
      if(!baseline)continue
      for(const pointIndex of [edgeIndex,nextIndex]){
        for(const axis of [0,1]){
          for(const direction of [-1,1]){
            for(const scale of steps){
              const change=direction*Math.min(maxPointMoveMm,selected.mismatchMm*scale)
              if(!Number.isFinite(change)||change===0)continue
              const offsets=baseline[pointIndex]
              if(!Array.isArray(offsets)||offsets.length!==2)continue
              const delta=[...offsets]
              delta[axis]+=change
              const edit=editAccuMarkNativePointRule(snapshot,ruleSet,{
                panelId:ref.panel,pointIndex,size,dxMm:delta[0],dyMm:delta[1],
              })
              if(!edit.ok)continue
              const run=compileAccuMarkNativeRuleSizeRun(snapshot,edit.ruleSet,{selectedSize:size})
              if(!run.ok)continue
              const a=run.byPanel?.[seam.a.panel]?.sizeRun?.[size]?.polygon
              const b=run.byPanel?.[seam.b.panel]?.sizeRun?.[size]?.polygon
              if(!a||!b)continue
              const mismatchMm=Math.abs(mm(b,seam.b)-mm(a,seam.a))
              if(Number.isFinite(mismatchMm)&&mismatchMm<selected.mismatchMm-0.1)
                proposals.push({ruleSet:edit.ruleSet,mismatchMm,panelId:ref.panel,
                  pointIndex,size,dxMm:delta[0],dyMm:delta[1],movementMm:Math.abs(change)})
            }
          }
        }
      }
    }
    if(!proposals.length)return fail('No bounded single-point stitchline correction was found')
    proposals.sort((a,b)=>a.mismatchMm-b.mismatchMm||a.movementMm-b.movementMm)
    for(const candidate of proposals.slice(0,14)){
      const geometry=inspectAccuMarkNativeRuleSizeQA20261023(snapshot,candidate.ruleSet)
      if(!geometry.ok)continue
      const sewn=inspectAccuMarkNativeGradedSewnSeamQA20261023(snapshot,candidate.ruleSet,{toleranceMm})
      const after=sewn.rows?.find(row=>row.size===size&&row.seamId===seamId)
      if(!after||after.mismatchMm>=selected.mismatchMm-0.1)continue
      const hadRegressions=source.rows.some(prior=>{
        if(prior.pass!==true)return false
        return sewn.rows?.find(row=>row.seamId===prior.seamId&&row.size===prior.size)?.pass!==true
      })
      if(hadRegressions)continue
      return {ok:true,ruleSet:candidate.ruleSet,originalMismatchMm:selected.mismatchMm,
        remainingMismatchMm:after.mismatchMm,
        correction:{panelId:candidate.panelId,pointIndex:candidate.pointIndex,
          size,dxMm:candidate.dxMm,dyMm:candidate.dyMm},
        selectedSeamWithinTolerance:after.pass,
        allSizesSewnVerified:sewn.ok,
        remainingSeamFindings:sewn.issues?.length??null,
        warning:'Local 2D source-sidecar grade proposal only. Recheck POM targets, notch positions, CUT offsets and native fit.',
        sourceRevision:Number.isSafeInteger(snapshot?.revision)?snapshot.revision:null,
        sourceTemplateFingerprint:ruleSet.templateFingerprint,
        nativeCommitted:false,manufacturingApproved:false}
    }
    return fail('Candidate correction did not pass all-size geometry or existing sewn-relationship safeguards')
  }catch(e){return fail(String(e?.message||e))}
}
