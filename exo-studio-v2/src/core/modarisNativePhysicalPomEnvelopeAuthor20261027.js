// Author an explicit physical six-size envelope from a saved Rust garment.
// This is an input constructor, NOT a substitute for the native store gate.
const SIZES=Object.freeze(['XS','S','M','L','XL','XXL'])
const fail=message=>{throw Error(`PHYSICAL_POM_AUTHOR: ${message}`)}
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  Object.getPrototypeOf(value)===Object.prototype
const exact=(value,keys)=>record(value)&&Object.keys(value).length===keys.length&&
  keys.every(key=>Object.hasOwn(value,key))
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const safeId=id=>typeof id==='string'&&/^[A-Za-z_][A-Za-z0-9_.:-]{0,127}$/.test(id)&&
  !['__proto__','prototype','constructor'].includes(id)
const frozen=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const child of Object.values(value))frozen(child)
    Object.freeze(value)
  }
  return value
}
const bounds=(value,minimum,maximum,label)=>{
  if(!exact(value,['minMm','maxMm'])||!finite(value.minMm)||!finite(value.maxMm)||
    value.minMm<minimum||value.maxMm>maximum||value.minMm>value.maxMm)
    fail(`Invalid explicitly authored ${label} limits`)
  return {minMm:value.minMm,maxMm:value.maxMm}
}
const sizeBounds=(input,minimum,maximum,label)=>{
  if(!exact(input,SIZES))fail(`Missing or extra size in ${label}`)
  return Object.fromEntries(SIZES.map(size=>[size,bounds(input[size],minimum,maximum,`${label}/${size}`)]))
}
const measurementMm=value=>typeof value==='number'?value:
  record(value)&&!value.formula?value.valueMm:undefined

/**
 * Only anchor-distance POMs are independently remeasured by this author.
 * Rust can enforce other POM kinds, but this author refuses to infer their
 * physical sampling. All inputs come from a saved, disposable/native project.
 */
export function authorModarisNativePhysicalPomEnvelope20261027(project,spec){
  try{
    if(!record(project)||!record(spec)||!exact(spec,
      ['fabricId','provenance','measurements','physicalPomBounds']))
      fail('Saved project and exact authoring specification required')
    if(typeof spec.provenance!=='string'||!spec.provenance.trim()||
      spec.provenance.length>512||/[\x00-\x1f\x7f]/.test(spec.provenance))
      fail('Named operator provenance is required')
    const template=project.template,grade=project.grade_run,graph=project.native_point_bindings
    if(!record(template)||!record(grade)||!record(graph)||!Array.isArray(grade.gradedTemplates)||
      grade.gradedTemplates.length!==6||!same(grade.sizes,SIZES)||
      !same(grade.baseTemplate,template)||!same(graph.sourceTemplate,template))
      fail('Saved source, native graph and exact six-size graded catalog must agree')
    if(typeof spec.fabricId!=='string'||!spec.fabricId.trim()||
      template.fabrics?.filter(f=>f.id===spec.fabricId).length!==1)
      fail('Unique fabric identifier must exist in saved native source')
    if(!record(graph.measurements)||!Object.keys(graph.measurements).length||
      Object.keys(graph.measurements).length>64||
      Object.keys(graph.measurements).some(name=>!safeId(name))||
      !exact(spec.measurements,Object.keys(graph.measurements)))
      fail('Every saved native measurement needs authored limits')
    const authoredMeasurements={}
    for(const [name,source] of Object.entries(graph.measurements)){
      const mm=measurementMm(source)
      if(!finite(mm)||Math.abs(mm)>5000)
        fail(`Unsupported or computed measurement ${name}; native per-size authoring required`)
      const row=sizeBounds(spec.measurements[name],-5000,5000,`measurement ${name}`)
      for(const size of SIZES)if(mm<row[size].minMm-1e-8||mm>row[size].maxMm+1e-8)
        fail(`Current saved measurement ${name}/${size} exceeds authored limits`)
      authoredMeasurements[name]=row
    }
    const poms=grade.pomSpecs
    if(!Array.isArray(poms)||!poms.length||poms.length>64||
      poms.some(p=>!safeId(p?.id))||
      !exact(spec.physicalPomBounds,poms.map(p=>p.id))||
      new Set(poms.map(p=>p.id)).size!==poms.length)
      fail('Every saved native POM needs exactly one authored physical envelope')
    const physicalPomBounds={}
    const measured=[]
    for(const pom of poms){
      if(pom.kind!=='anchor-distance'||typeof pom.panelId!=='string'||
        !Number.isSafeInteger(pom.fromPoint)||!Number.isSafeInteger(pom.toPoint)||
        pom.fromPoint===pom.toPoint)
        fail(`Unsupported POM ${pom.id}: only independent anchor-distance geometry is qualified`)
      const row=sizeBounds(spec.physicalPomBounds[pom.id],0,100000,`physical POM ${pom.id}`)
      for(const [index,size] of SIZES.entries()){
        const graded=grade.gradedTemplates[index]
        const panels=graded?.panels?.filter(p=>p.id===pom.panelId)
        if(panels?.length!==1)fail(`Missing or duplicate graded POM panel ${pom.panelId}/${size}`)
        const points=panels[0].polygon?.points
        const a=points?.[pom.fromPoint],b=points?.[pom.toPoint]
        if(!Array.isArray(a)||!Array.isArray(b)||a.length!==2||b.length!==2||
          !a.every(finite)||!b.every(finite))fail(`Invalid graded POM anchors ${pom.id}/${size}`)
        const mm=Math.hypot(b[0]-a[0],b[1]-a[1])*1000
        if(!finite(mm)||mm<1e-8||mm<row[size].minMm-1e-8||mm>row[size].maxMm+1e-8)
          fail(`Physical graded POM ${pom.id}/${size} violates authored limits`)
        measured.push({pomId:pom.id,size,measuredMm:mm})
      }
      physicalPomBounds[pom.id]=row
    }
    const envelope={schemaVersion:1,provenance:spec.provenance,fabricId:spec.fabricId,
      sourceTemplate:structuredClone(template),measurements:authoredMeasurements,physicalPomBounds}
    return frozen({ok:true,envelope,measured,requiresNativeStore:true,
      authoritative:false,factoryApproved:false,licensedModarisAccepted:false})
  }catch(error){return frozen({ok:false,reason:error.message,
    authoritative:false,factoryApproved:false})}
}
