// Read-only gate for claims that a native Anchor drag inversely edited a saved
// computed six-size chart. This legacy witness lacks the physical receipts
// required to certify the new bounded Rust scaled-formula inverse.
import {evaluateNativeDraftFormulas20261023} from './nativeParametricFormula20261023.js'

const SIZES=['XS','S','M','L','XL','XXL']
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const finite=value=>typeof value==='number'&&Number.isFinite(value)
const deny=reason=>Object.freeze({ok:false,nativeInverseVerified:false,reason})
const exact=(value,keys)=>record(value)&&same(Object.keys(value).sort(),[...keys].sort())
const near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<=1e-7

/**
 * Verify the evidence preconditions before accepting an inverse formula claim.
 * This intentionally NEVER certifies computed-chart inverse editing. A Rust
 * success snapshot, preview, or caller-supplied chart is insufficient proof.
 */
export function verifyNativePerSizeChartInverse20261027({before,after,revisionBefore,revisionAfter,command}={}){
  if(!Number.isSafeInteger(revisionBefore)||revisionBefore<0||
     !Number.isSafeInteger(revisionAfter)||revisionAfter!==revisionBefore+1)
    return deny('Missing exact one-revision native edit evidence')
  if(!record(before)||!record(after))return deny('Missing saved native before/after projects')
  const graph=before.native_point_bindings,run=before.grade_run,envelope=before.fabric_grade_envelope
  if(!record(graph)||!record(run)||!record(envelope)||!record(envelope.perSizeChart))
    return deny('Missing persisted Rust binding graph, grade run or per-size chart')
  if(!same(run.sizes,SIZES)||run.baseSize!=='M'||!Array.isArray(run.gradedTemplates)||
     run.gradedTemplates.length!==6||!same(run.baseTemplate,before.template)||
     !same(graph.sourceTemplate,before.template)||!same(envelope.sourceTemplate,before.template))
    return deny('Stale or incomplete six-size native source identity')
  const chart=envelope.perSizeChart,names=Object.keys(graph.measurements||{})
  if(!names.length||!exact(chart.sourceMeasurements,names)||
     !same(chart.sourceMeasurements,graph.measurements)||!exact(chart.values,names)||
     !exact(envelope.measurements,names))
    return deny('Forged or stale native chart measurement identities')
  const formulaNames=[]
  for(const name of names){
    const definition=graph.measurements[name]
    if(!exact(chart.values[name],SIZES)||!exact(envelope.measurements[name],SIZES))
      return deny('Incomplete or tampered six-size chart: '+name)
    const computed=record(definition)&&typeof definition.formula==='string'
    if(computed)formulaNames.push(name)
    else if(!(finite(definition)||(record(definition)&&finite(definition.valueMm))))
      return deny('Invalid native direct measurement: '+name)
  }
  for(const size of SIZES){
    const sized={}
    for(const name of names){
      const source=graph.measurements[name],cell=chart.values[name][size]
      if(!record(cell)||!finite(cell.valueMm))return deny('Malformed chart cell: '+name+'/'+size)
      if(record(source)&&typeof source.formula==='string'){
        if(Object.hasOwn(cell,'directInputMm'))return deny('Forged computed direct cell: '+name+'/'+size)
        sized[name]={formula:source.formula}
      }else{
        if(!finite(cell.directInputMm)||!near(cell.valueMm,cell.directInputMm))
          return deny('Forged direct chart cell: '+name+'/'+size)
        if(size==='M'&&!near(cell.directInputMm,record(source)?source.valueMm:source))
          return deny('Stale base measurement: '+name)
        sized[name]={valueMm:cell.directInputMm}
      }
    }
    let evaluated
    try{evaluated=evaluateNativeDraftFormulas20261023({measurements:sized})}
    catch{return deny('Invalid saved native formula chain: '+size)}
    if(evaluated?.ok!==true)return deny('Invalid saved native formula chain: '+size)
    const values=evaluated.valuesMm
    for(const name of names){
      const cell=chart.values[name][size],bounds=envelope.measurements[name][size]
      const value=record(values[name])?values[name].valueMm:values[name]
      if(!near(value,cell.valueMm))return deny('Stale computed chart cell: '+name+'/'+size)
      if(!record(bounds)||!finite(bounds.minMm)||!finite(bounds.maxMm)||
         bounds.minMm>value+1e-7||bounds.maxMm<value-1e-7)
        return deny('Invalid measured bounds: '+name+'/'+size)
    }
  }
  const poms=run.pomSpecs
  if(!Array.isArray(poms)||!exact(envelope.physicalPomBounds??{},poms.map(p=>p.id)))
    return deny('Missing saved physical POM bounds')
  for(const pom of poms){
    if(pom.kind!=='anchor-distance'||!Number.isSafeInteger(pom.fromPoint)||
       !Number.isSafeInteger(pom.toPoint)||!exact(envelope.physicalPomBounds[pom.id],SIZES))
      return deny('Invalid saved physical POM definition: '+pom.id)
    for(let i=0;i<SIZES.length;i++){
      const points=run.gradedTemplates[i]?.panels?.find(panel=>panel.id===pom.panelId)?.polygon?.points
      const a=points?.[pom.fromPoint],b=points?.[pom.toPoint],bounds=envelope.physicalPomBounds[pom.id][SIZES[i]]
      if(!Array.isArray(a)||!Array.isArray(b)||!a.every(finite)||!b.every(finite)||
         !record(bounds)||!finite(bounds.minMm)||!finite(bounds.maxMm))
        return deny('Missing physical POM geometry: '+pom.id+'/'+SIZES[i])
      const mm=Math.hypot(b[0]-a[0],b[1]-a[1])*1000
      if(mm<bounds.minMm-1e-7||mm>bounds.maxMm+1e-7)
        return deny('Physical POM outside saved bounds: '+pom.id+'/'+SIZES[i])
    }
  }
  if(!record(command)||command.kind!=='Anchor'||typeof command.panel!=='string'||
     !Number.isSafeInteger(command.anchor)||!Array.isArray(command.position)||
     command.position.length!==2||!command.position.every(finite))
    return deny('Missing actual native Anchor inverse operation')
  const rule=graph.bindings?.filter(rule=>rule.panelId===command.panel&&rule.pointIndex===command.anchor)
  if(!Array.isArray(rule)||rule.length!==1)return deny('Missing unique native inverse point binding')
  if(formulaNames.length){
    return deny('Legacy witness cannot certify computed formula inverse without '+
      'a real native edit and six-size physical receipt for '+formulaNames.join(', '))
  }
  return deny('No authoritative native inverse operation receipt sufficient to certify reverse six-size chart editing')
}
