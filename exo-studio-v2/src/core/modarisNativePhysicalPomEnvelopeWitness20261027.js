// Independent physical, six-size native POM commit witness. This does not
// authorize cutting, replace the Rust gate, or claim vendor acceptance.
const SIZES = Object.freeze(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x)
const finite = x => typeof x === 'number' && Number.isFinite(x)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const fail = reason => Object.freeze({ok:false,reason:String(reason),factoryApproved:false})
const polygon = (template,id) => {
  const panels=template?.panels?.filter(panel=>panel.id===id)
  if(panels?.length!==1||!record(panels[0].polygon))throw Error(`Missing or ambiguous physical POM panel ${id}`)
  return panels[0].polygon
}
const measure = (template,pom) => {
  const poly=polygon(template,pom.panelId)
  if(pom.kind!=='anchor-distance'||pom.edge!==undefined||
    !Number.isSafeInteger(pom.fromPoint)||!Number.isSafeInteger(pom.toPoint)||
    pom.fromPoint===pom.toPoint)throw Error('Witness supports physical anchor-distance POM only')
  const a=poly.points?.[pom.fromPoint],b=poly.points?.[pom.toPoint]
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==2||b.length!==2||
    !a.every(finite)||!b.every(finite))throw Error('Invalid physical POM anchors')
  const mm=Math.hypot(a[0]-b[0],a[1]-b[1])*1000
  if(!finite(mm)||mm<=0||mm>100000)throw Error('Invalid physical POM length')
  return mm
}

/**
 * Read-only, deliberately narrower than the Rust POM evaluator: measures
 * straight anchor distances directly from saved physical graded coordinates.
 * Refuses sewline and curve-path POMs rather than claiming an unimplemented
 * independent sampling algorithm.
 */
export function verifyModarisNativePhysicalPomEnvelopeCommit20261027({
  beforeProject,afterProject,beforeRevision,afterRevision,pomId,
}){
  try{
    if(!record(beforeProject)||!record(afterProject)||!Number.isSafeInteger(beforeRevision)||
      afterRevision!==beforeRevision+1||typeof pomId!=='string'||!pomId)
      throw Error('Missing authenticated native one-revision POM commit')
    const before=beforeProject.fabric_grade_envelope,after=afterProject.fabric_grade_envelope
    const oldRun=beforeProject.grade_run,run=afterProject.grade_run
    if(!record(before)||!record(after)||!record(oldRun)||!record(run)||
      before.schemaVersion!==1||after.schemaVersion!==1||
      !same(before.physicalPomBounds,after.physicalPomBounds)||
      !same(before.measurements,after.measurements)||
      before.fabricId!==after.fabricId||before.provenance!==after.provenance||
      !afterProject.template?.fabrics?.some(f=>f.id===after.fabricId))
      throw Error('Missing, changed or unauthenticated physical fabric envelope')
    if(!same(before.sourceTemplate,beforeProject.template)||
      !same(after.sourceTemplate,afterProject.template)||
      !same(oldRun.baseTemplate,beforeProject.template)||
      !same(run.baseTemplate,afterProject.template)||
      !same(oldRun.sizes,SIZES)||!same(run.sizes,SIZES)||
      oldRun.gradedTemplates?.length!==6||run.gradedTemplates?.length!==6||
      !same(oldRun.pomSpecs,run.pomSpecs))
      throw Error('Stale source, changed POM definitions or incomplete six-size catalog')
    const poms=run.pomSpecs
    if(!Array.isArray(poms)||!poms.length||new Set(poms.map(p=>p.id)).size!==poms.length)
      throw Error('Missing or duplicate authored physical POMs')
    const envelope=after.physicalPomBounds
    if(!record(envelope)||!same(Object.keys(envelope).sort(),poms.map(p=>p.id).sort()))
      throw Error('Physical envelope must cover the exact saved POM inventory')
    const pom=poms.find(p=>p.id===pomId)
    if(!pom)throw Error('Unknown requested physical POM')
    const ranges=envelope[pomId]
    if(!record(ranges)||!same(Object.keys(ranges).sort(),[...SIZES].sort()))
      throw Error('Physical POM has incomplete XS–XXL bound rows')
    let changed=0
    const rows=[]
    for(let i=0;i<SIZES.length;i++){
      const size=SIZES[i],bounds=ranges[size]
      if(!record(bounds)||!finite(bounds.minMm)||!finite(bounds.maxMm)||
        bounds.minMm<0||bounds.maxMm>100000||bounds.minMm>bounds.maxMm)
        throw Error(`Invalid physical POM bound for ${size}`)
      const oldMm=measure(oldRun.gradedTemplates[i],pom)
      const measuredMm=measure(run.gradedTemplates[i],pom)
      if(measuredMm<bounds.minMm-1e-8||measuredMm>bounds.maxMm+1e-8)
        throw Error(`Physical POM ${pomId} ${size} violates actual graded geometry bounds`)
      if(Math.abs(measuredMm-oldMm)>1e-8)changed++
      rows.push(Object.freeze({size,previousMm:oldMm,measuredMm,
        minMm:bounds.minMm,maxMm:bounds.maxMm,withinBounds:true}))
    }
    if(!changed)throw Error('Native commit did not change the physical graded POM')
    return Object.freeze({ok:true,format:'exo-independent-native-physical-pom-witness.v1',
      pomId,sizeCount:6,changedSizes:changed,rows:Object.freeze(rows),
      factoryApproved:false,licensedModarisAccepted:false})
  }catch(error){return fail(error?.message??error)}
}
