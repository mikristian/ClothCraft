import { evaluateNativeDraftFormulas20261023 } from './nativeParametricFormula20261023.js'
import { measureNativePhysicalPomMm20261028 } from './modarisNativePerSizeChartStoreWitness20261027.js'

const SIZES=Object.freeze(['XS','S','M','L','XL','XXL'])
const fail=message=>{throw Error('NATIVE_PER_SIZE_CHART_AUTHOR: '+message)}
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)
const exact=(object,keys)=>plain(object)&&Object.keys(object).length===keys.length&&
  keys.every(key=>Object.hasOwn(object,key))
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const orderedSizes=value=>Array.isArray(value)&&value.length===SIZES.length&&
  SIZES.every((size,index)=>value[index]===size)
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e9
const safeId=name=>typeof name==='string'&&/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(name)&&
  !['__proto__','constructor','prototype'].includes(name)
function provenance(value,label){
  if(typeof value!=='string'||!value.trim()||value.length>512||/[\x00-\x1f\x7f]/.test(value))
    fail(label+' requires explicit operator provenance')
  return value
}
function limits(row,label,minimum=-5000,maximum=5000){
  if(!exact(row,SIZES))fail('Missing or extra sizes in '+label)
  return Object.fromEntries(SIZES.map(size=>{
    const value=row[size]
    if(!exact(value,['minMm','maxMm'])||!finite(value.minMm)||!finite(value.maxMm)||
      value.minMm<minimum||value.maxMm>maximum||value.minMm>value.maxMm)
      fail('Invalid explicitly authored limits for '+label+'/'+size)
    return [size,{minMm:value.minMm,maxMm:value.maxMm}]
  }))
}
function freeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}
function graphSource(project,sourceRevision){
  if(!plain(project)||!plain(project.template)||!plain(project.native_point_bindings)||
    !plain(project.grade_run))fail('Saved project, native bindings and grade run required')
  if(!Number.isSafeInteger(sourceRevision)||sourceRevision<0||
    (project.revision!==undefined&&project.revision!==sourceRevision))
    fail('Stale or invalid source revision')
  const grade=project.grade_run,graph=project.native_point_bindings
  if(grade.schemaVersion!==1)fail('Invalid native grade schema')
  if(!orderedSizes(grade.sizes)||grade.baseSize!=='M'||
    !Array.isArray(grade.gradedTemplates)||grade.gradedTemplates.length!==6)
    fail('Incomplete native XS..XXL grade run')
  if(!equal(grade.baseTemplate,project.template))
    fail('Saved base grade template disagrees with source')
  if(graph.sourceTemplate!==undefined&&!equal(graph.sourceTemplate,project.template))
    fail('Native measurement graph source disagrees with saved template')
  if(!plain(graph.measurements)||!Object.keys(graph.measurements).length||
    Object.keys(graph.measurements).length>64||Object.keys(graph.measurements).some(name=>!safeId(name)))
    fail('Saved native measurement graph is missing or invalid')
  return {grade,graph}
}

/**
 * Constructs a detached Rust fabric-grade-envelope-store payload from a saved
 * native project and explicit chart data. This author never persists a project.
 * Every direct size value and bound must be supplied by the operator.
 */
export function authorNativePerSizeChartEnvelope20261027({
  project,sourceRevision,fabricId,provenance:envelopeProvenance,directCells,
  bounds,physicalPomBounds,chartProvenance,
}={}){
  try{
    const {grade,graph}=graphSource(project,sourceRevision)
    const template=project.template
    if(typeof fabricId!=='string'||!fabricId.trim()||!Array.isArray(template.fabrics)||
      template.fabrics.filter(f=>f?.id===fabricId).length!==1)
      fail('Fabric must exist uniquely in saved native source')
    provenance(envelopeProvenance,'Envelope')
    provenance(chartProvenance,'Chart')
    const names=Object.keys(graph.measurements)
    if(!plain(directCells)||!plain(bounds)||!exact(bounds,names))
      fail('Exact measurement coverage and explicitly authored bounds required')
    const directs=[],formulas=[]
    for(const name of names){
      const original=graph.measurements[name]
      if(typeof original==='number'){
        if(!finite(original)||Math.abs(original)>5000)fail('Invalid saved native direct value '+name)
        directs.push([name,original])
      }else if(plain(original)&&exact(original,['valueMm'])){
        if(!finite(original.valueMm)||Math.abs(original.valueMm)>5000)
          fail('Invalid saved native direct value '+name)
        directs.push([name,original.valueMm])
      }else if(plain(original)&&exact(original,['formula'])&&
        typeof original.formula==='string'&&original.formula.length>0&&original.formula.length<=4096){
        formulas.push([name,original.formula])
      }else fail('Malformed saved native measurement '+name)
    }
    if(!exact(directCells,directs.map(([name])=>name)))
      fail('Every direct measurement needs six inputs; computed input is forbidden')
    const approvedBounds=Object.fromEntries(names.map(name=>
      [name,limits(bounds[name],'measurement '+name)]))
    const authoredCells=Object.fromEntries(names.map(name=>[name,{}]))
    const summarySizes=[]
    for(const size of SIZES){
      const measurements={}
      for(const [name,mm] of directs){
        const row=directCells[name]
        if(!exact(row,SIZES)||!finite(row[size])||Math.abs(row[size])>5000)
          fail('All six direct mm inputs are required for '+name)
        if(size==='M'&&Math.abs(row[size]-mm)>1e-7)
          fail('M value disagrees with authoritative native source: '+name)
        measurements[name]={valueMm:row[size]}
      }
      for(const [name,formula] of formulas)measurements[name]={formula}
      const result=evaluateNativeDraftFormulas20261023({measurements})
      if(!result.ok)fail('Formula evaluation '+size+': '+result.reason)
      for(const name of names){
        const value=result.valuesMm[name],range=approvedBounds[name][size]
        if(!finite(value)||Math.abs(value)>5000||value<range.minMm-1e-8||
          value>range.maxMm+1e-8)
          fail('Measurement outside explicit bounds: '+size+'/'+name)
        authoredCells[name][size]=Object.hasOwn(directCells,name)?
          {directInputMm:directCells[name][size],valueMm:value}:{valueMm:value}
      }
      summarySizes.push({size,valuesMm:Object.fromEntries(names.map(name=>[name,result.valuesMm[name]])),
        dependencyOrder:[...result.dependencyOrder]})
    }
    const poms=grade.pomSpecs
    if(!Array.isArray(poms)||poms.length>64||
      poms.some(p=>!safeId(p?.id))||new Set(poms.map(p=>p.id)).size!==poms.length)
      fail('Invalid saved POM catalog')
    const pomNames=poms.map(p=>p.id)
    if(physicalPomBounds===undefined||physicalPomBounds===null){
      if(pomNames.length)fail('Explicit bounds required for every saved physical POM')
      physicalPomBounds={}
    }
    if(!exact(physicalPomBounds,pomNames))fail('Physical POM bounds must exactly cover saved POMs')
    const physical=Object.fromEntries(pomNames.map(name=>
      [name,limits(physicalPomBounds[name],'physical POM '+name,0,100000)]))
    for(const pom of poms){
      if(!['anchor-distance','sewline-edge','sewline-path'].includes(pom.kind)||
        typeof pom.panelId!=='string')fail('Unsupported physical POM: '+pom.id)
      for(let i=0;i<SIZES.length;i++){
        const size=SIZES[i],panels=grade.gradedTemplates[i]?.panels?.filter(p=>p.id===pom.panelId)
        if(panels?.length!==1)fail('Missing or duplicate graded POM panel '+pom.id+'/'+size)
        let value
        try{value=measureNativePhysicalPomMm20261028(panels[0]?.polygon,pom)}
        catch(e){fail('Invalid graded POM geometry '+pom.id+'/'+size+': '+e.message)}
        const range=physical[pom.id][size]
        if(!finite(value)||value<1e-8||value>100000||value<range.minMm-1e-8||value>range.maxMm+1e-8)
          fail('Physical graded POM outside explicit bounds: '+pom.id+'/'+size)
      }
    }
    const envelope={schemaVersion:1,provenance:envelopeProvenance,fabricId,
      sourceTemplate:structuredClone(template),measurements:approvedBounds,
      physicalPomBounds:physical,perSizeChart:{provenance:chartProvenance,
        sourceMeasurements:structuredClone(graph.measurements),values:authoredCells}}
    return freeze({ok:true,envelope,summary:{sourceRevision,sizes:[...SIZES],
      directMeasurements:directs.map(([name])=>name),formulaMeasurements:formulas.map(([name])=>name),
      perSize:summarySizes,requiresNativeStore:true,manufacturingApproved:false}})
  }catch(error){return freeze({ok:false,reason:error?.message??String(error),
    manufacturingApproved:false})}
}
