import {editAccuMarkNativePointRule,compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {inspectAccuMarkNativeRuleSizeQA20261023} from './accumarkNativeRuleSizeQA20261023.js'

const fail=reason=>({ok:false,reason,nativeCommitted:false,manufacturingApproved:false})
const finite=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1000000

/**
 * Set one adjacent X/Y grade break while preserving every other size break.
 * The base size is a fixed anchor. If the requested interval lies below the
 * base, shift that interval's smaller side; otherwise shift its larger side.
 * Only the named point is changed, and all size geometry is checked before
 * the caller may replace the independent grading draft.
 */
export function setNativeAdjacentGradeBreak20261025(snapshot,ruleSet,{
  panelId,pointIndex,fromSize,toSize,dxMm,dyMm,
}={}) {
  try {
    if(!finite(dxMm)||!finite(dyMm))return fail('Adjacent grade break must contain bounded finite millimetres')
    const sizes=ruleSet?.sizes,base=ruleSet?.baseSize
    // The physical contour oracle currently has a strict six-size contract.
    // Reject alternate size grids until equivalent all-size validation exists;
    // otherwise a collapsed custom-size pattern could pass preview alone.
    if(!Array.isArray(sizes)||sizes.length!==6||
      sizes.some((size,index)=>size!==['XS','S','M','L','XL','XXL'][index])||
      !sizes.includes(base))return fail('Adjacent grading requires a fully validated XS–XXL size set')
    const fromIndex=sizes.indexOf(fromSize),toIndex=sizes.indexOf(toSize)
    if(fromIndex<0||toIndex!==fromIndex+1)return fail('Choose consecutive sizes in ascending size order')
    if(!Number.isInteger(pointIndex)||pointIndex<0)return fail('Select an existing grading point')
    const panel=ruleSet?.panels?.[panelId]
    const current=sizes.map(size=>panel?.pointOffsetsMm?.[size]?.[pointIndex])
    if(current.some(p=>!Array.isArray(p)||p.length!==2||!p.every(finite)))
      return fail('Missing, stale or unsafe point offsets')
    const before=[current[toIndex][0]-current[fromIndex][0],current[toIndex][1]-current[fromIndex][1]]
    const delta=[dxMm-before[0],dyMm-before[1]]
    if(!delta.every(Number.isFinite))return fail('Adjacent grade adjustment overflows')
    const baseIndex=sizes.indexOf(base),below=fromIndex<baseIndex
    const impacted=below?sizes.slice(0,fromIndex+1):sizes.slice(toIndex)
    let updated=ruleSet
    for(const size of impacted){
      const old=panel.pointOffsetsMm[size][pointIndex]
      const shift=below?-1:1
      const next=[old[0]+shift*delta[0],old[1]+shift*delta[1]]
      if(!next.every(finite))return fail('New grade position is outside supported millimetre limits')
      const edit=editAccuMarkNativePointRule(snapshot,updated,{
        panelId,pointIndex,size,dxMm:next[0],dyMm:next[1],
      })
      if(!edit.ok)return fail('Grade edit rejected: '+edit.reason)
      updated=edit.ruleSet
    }
    const preview=compileAccuMarkNativeRuleSizeRun(snapshot,updated,{selectedSize:toSize})
    if(!preview.ok)return fail('All-size grade preview rejected: '+preview.reason)
    const qa=inspectAccuMarkNativeRuleSizeQA20261023(snapshot,updated)
    if(!qa.ok)return fail('Graded contour QA rejected this increment: '+(qa.issues[0]?.message||qa.issues[0]?.reason||'Invalid size geometry'))
    return {ok:true,ruleSet:updated,fromSize,toSize,
      oldBreakMm:before,newBreakMm:[dxMm,dyMm],changedSizes:impacted,
      nativeCommitted:false,manufacturingApproved:false}
  }catch(error){return fail(String(error?.message||error))}
}

/** Set the same adjacent increment on every size for one point. */
export function setNativeUniformGradeBreaks20261025(snapshot,ruleSet,{
  panelId,pointIndex,dxMm,dyMm,
}={}) {
  try {
    if(!finite(dxMm)||!finite(dyMm))return fail('Uniform size break must contain bounded finite millimetres')
    const sizes=ruleSet?.sizes
    if(!Array.isArray(sizes)||sizes.length!==6||
      sizes.some((size,index)=>size!==['XS','S','M','L','XL','XXL'][index]))
      return fail('Uniform grading requires a fully validated XS–XXL size set')
    const baseIndex=sizes.indexOf(ruleSet?.baseSize)
    if(baseIndex<0)return fail('Grade base size is unavailable')
    if(!Number.isInteger(pointIndex)||pointIndex<0)return fail('Select an existing grading point')
    let updated=ruleSet
    for(let index=0;index<sizes.length;index++){
      if(index===baseIndex)continue
      const dx=(index-baseIndex)*dxMm,dy=(index-baseIndex)*dyMm
      if(!finite(dx)||!finite(dy))return fail('Uniform graded offset exceeds supported millimetre limits')
      const edited=editAccuMarkNativePointRule(snapshot,updated,{
        panelId,pointIndex,size:sizes[index],dxMm:dx,dyMm:dy,
      })
      if(!edited.ok)return fail('Uniform grade edit rejected: '+edited.reason)
      updated=edited.ruleSet
    }
    const preview=compileAccuMarkNativeRuleSizeRun(snapshot,updated,{selectedSize:ruleSet.baseSize})
    if(!preview.ok)return fail('Uniform grade preview rejected: '+preview.reason)
    const qa=inspectAccuMarkNativeRuleSizeQA20261023(snapshot,updated)
    if(!qa.ok)return fail('Graded contour QA rejected uniform breaks: '+(qa.issues[0]?.message||qa.issues[0]?.reason||'Invalid size geometry'))
    return {ok:true,ruleSet:updated,sizes:[...sizes],stepMm:[dxMm,dyMm],
      nativeCommitted:false,manufacturingApproved:false}
  }catch(error){return fail(String(error?.message||error))}
}

/**
 * F6/F7 six-size evolution-table edit for one or more *real source vertices*.
 *
 * Each row must provide the entire five-interval XS→XXL break table, in
 * ascending order. Derive offsets outward from the fixed base-size anchor
 * in a single immutable draft, rather than committing five sequential
 * edits whose intermediate shapes may be invalid even if the final one is
 * valid. This is a sidecar authoring operation, NOT a Rust transaction.
 *
 * Example row: {pointIndex: 1, breaks: [
 *   {fromSize:'XS',toSize:'S',dxMm:5,dyMm:0}, ...
 * ]}
 */
export function setNativeGradeEvolutionTable20261028(snapshot,ruleSet,{
  panelId,rows,
}={}) {
  try {
    const sizes=ruleSet?.sizes,base=ruleSet?.baseSize
    if(!Array.isArray(sizes)||sizes.length!==6||
      sizes.some((size,index)=>size!==['XS','S','M','L','XL','XXL'][index])||
      !sizes.includes(base))return fail('Evolution table requires the validated XS–XXL size catalog')
    if(!Array.isArray(rows)||rows.length<1||rows.length>256)
      return fail('Supply 1–256 explicitly authored source-point evolution rows')
    // This also checks source fingerprint, every panel and all size vectors.
    const initial=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:base})
    if(!initial.ok)return fail('Stale or invalid native grading sidecar: '+initial.reason)
    const originalQA=inspectAccuMarkNativeRuleSizeQA20261023(snapshot,ruleSet)
    if(!originalQA.ok)return fail('Existing graded geometry failed preflight QA')
    const panel=snapshot?.template?.panels?.find(p=>p.id===panelId)
    const offsets=ruleSet?.panels?.[panelId]?.pointOffsetsMm
    if(!panel||!offsets)return fail('Select a valid native source panel')
    const baseIndex=sizes.indexOf(base)
    const seen=new Set(),next=structuredClone(ruleSet),witness=[]
    for(const row of rows){
      const pointIndex=row?.pointIndex
      if(!Number.isInteger(pointIndex)||pointIndex<0||
        pointIndex>=panel.polygon.points.length||seen.has(pointIndex))
        return fail('Evolution rows must name distinct existing source points')
      seen.add(pointIndex)
      if(!Array.isArray(row.breaks)||row.breaks.length!==sizes.length-1)
        return fail('Each evolution row requires all five adjacent size breaks')
      const requested=[]
      for(let i=0;i<sizes.length-1;i++){
        const item=row.breaks[i]
        if(!item||item.fromSize!==sizes[i]||item.toSize!==sizes[i+1]||
          !finite(item.dxMm)||!finite(item.dyMm))
          return fail('Evolution breaks must be ordered, named and bounded in millimetres')
        requested.push([item.dxMm,item.dyMm])
      }
      const original=sizes.map(size=>[...offsets[size][pointIndex]])
      const calculated=Array(sizes.length)
      calculated[baseIndex]=[0,0]
      for(let i=baseIndex+1;i<sizes.length;i++){
        calculated[i]=[calculated[i-1][0]+requested[i-1][0],
          calculated[i-1][1]+requested[i-1][1]]
      }
      for(let i=baseIndex-1;i>=0;i--){
        calculated[i]=[calculated[i+1][0]-requested[i][0],
          calculated[i+1][1]-requested[i][1]]
      }
      if(calculated.some(vector=>!vector.every(finite)))
        return fail('Evolution offsets exceed supported finite millimetre limits')
      for(let i=0;i<sizes.length;i++){
        if(i!==baseIndex)next.panels[panelId].pointOffsetsMm[sizes[i]][pointIndex]=
          calculated[i].map(value=>value===0?0:value)
      }
      witness.push({pointIndex,oldOffsetsMm:original,newOffsetsMm:calculated,
        newBreaksMm:requested})
    }
    const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,next,{selectedSize:base})
    if(!compiled.ok)return fail('Evolution compilation rejected: '+compiled.reason)
    const qa=inspectAccuMarkNativeRuleSizeQA20261023(snapshot,next)
    if(!qa.ok)return fail('Evolution physical contour QA rejected: '+
      (qa.issues?.[0]?.message||qa.issues?.[0]?.reason||'Unsafe graded geometry'))
    return {ok:true,ruleSet:next,panelId,sizes:[...sizes],baseSize:base,
      changedPointIndices:[...seen],witness,
      nativeCommitted:false,manufacturingApproved:false}
  }catch(error){return fail(String(error?.message||error))}
}
