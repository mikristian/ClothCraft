// Independent, read-only witness for a real Rust per-size chart STORE.
// This cannot create an envelope or authorize apparel manufacturing.
import {evaluateNativeDraftFormulas20261023} from './nativeParametricFormula20261023.js'
import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'
const SIZES=['XS','S','M','L','XL','XXL']
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const canonical=x=>JSON.stringify(x,(_,v)=>object(v)?Object.fromEntries(
  Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)
const equal=(a,b)=>canonical(a)===canonical(b)
const error=reason=>Object.freeze({ok:false,reason:String(reason),nativeChartPersisted:false,
  factoryApproved:false,licensedModarisAccepted:false})
const physicalPoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)
const index=n=>Number.isSafeInteger(n)&&n>=0
export const measureNativePhysicalPomMm20261028=(polygon,pom)=>{
  const points=polygon?.points,edges=polygon?.edges
  if(!Array.isArray(points)||points.length<3||!points.every(physicalPoint)||
    !Array.isArray(edges)||edges.length!==points.length||
    edges.some(e=>typeof e!=='string'||!e)||new Set(edges).size!==edges.length)
    throw Error('Invalid native physical POM polygon or named edge topology')
  if(pom.kind==='anchor-distance'){
    if(!index(pom.fromPoint)||!index(pom.toPoint)||pom.fromPoint===pom.toPoint||
      pom.fromPoint>=points.length||pom.toPoint>=points.length||pom.edge!=null)
      throw Error('Invalid native anchor-distance POM references')
    const a=points[pom.fromPoint],b=points[pom.toPoint]
    return Math.hypot(a[0]-b[0],a[1]-b[1])*1000
  }
  const edgeMm=name=>{
    if(typeof name!=='string'||!edges.includes(name))throw Error('Unknown native physical seam edge')
    const sampled=nativeRustEdgeLength20261023(polygon,name)
    if(!sampled.ok||!Number.isFinite(sampled.totalLengthM)||sampled.totalLengthM<=0)
      throw Error(`Invalid native sampled seam edge ${name}: ${sampled.reason??'degenerate'}`)
    return sampled.totalLengthM*1000
  }
  if(pom.kind==='sewline-edge'){
    if(pom.fromPoint!=null||pom.toPoint!=null)return NaN
    return edgeMm(pom.edge)
  }
  if(pom.kind==='sewline-path'){
    const from=pom.fromPoint,to=pom.toPoint,n=points.length
    if(pom.edge!=null||!index(from)||!index(to)||from>=n||to>=n||from===to)
      throw Error('Invalid directed native sewline path')
    const count=(to-from+n)%n
    let total=0
    for(let step=0;step<count;step++){
      total+=edgeMm(edges[(from+step)%n])
      if(!Number.isFinite(total)||total>100000)throw Error('Unsafe physical sewline path length')
    }
    return total
  }
  throw Error(`Unsupported native physical POM kind: ${pom.kind}`)
}

/**
 * Proves a chart-only native transaction did not silently mutate the graded
 * garment, sewing, bindings, or source project metadata. All six size rows
 * and independent Rust inspect must agree with the exact authored payload.
 * A forged caller receipt cannot be authenticated here: the parent must pass
 * the actual saved Rust project and Rust inspect response from the same session.
 */
export function verifyNativePerSizeChartStore20261027({
  beforeProject,afterProject,authoredEnvelope,inspected,beforeRevision,afterRevision,
}={}){
  try{
    if(!object(beforeProject)||!object(afterProject)||!object(authoredEnvelope)||
      !object(inspected)||!Number.isSafeInteger(beforeRevision)||beforeRevision<0||
      afterRevision!==beforeRevision+1)
      throw Error('Missing native chart one-revision save/inspect evidence')
    if(inspected.nativeAuthoritative!==true||inspected.sourceRevision!==afterRevision||
      inspected.factoryApproved===true||inspected.manufacturingApproved===true||
      !equal(inspected.envelope,authoredEnvelope)||
      !equal(afterProject.fabric_grade_envelope,authoredEnvelope))
      throw Error('Saved native envelope or Rust inspection differs from reviewed payload')
    const before=structuredClone(beforeProject),after=structuredClone(afterProject)
    delete before.fabric_grade_envelope
    delete after.fabric_grade_envelope
    if(!equal(before,after))
      throw Error('Chart-only native store unexpectedly changed garment or saved metadata')
    const chart=authoredEnvelope.perSizeChart,graph=afterProject.native_point_bindings
    const grade=afterProject.grade_run
    if(authoredEnvelope.schemaVersion!==1||!object(chart)||!object(graph)||
      !object(grade)||!equal(grade.sizes,SIZES)||grade.baseSize!=='M'||
      grade.gradedTemplates?.length!==6||
      !equal(grade.baseTemplate,afterProject.template)||
      !equal(authoredEnvelope.sourceTemplate,afterProject.template)||
      (graph.sourceTemplate!==undefined&&!equal(graph.sourceTemplate,afterProject.template))||
      !equal(chart.sourceMeasurements,graph.measurements)||
      !afterProject.template?.fabrics?.some(f=>f.id===authoredEnvelope.fabricId))
      throw Error('Native chart source, formula graph, fabric or six-size catalog drifted')
    const names=Object.keys(graph.measurements??{})
    if(!names.length||!equal(Object.keys(chart.values??{}).sort(),[...names].sort())||
      !equal(Object.keys(authoredEnvelope.measurements??{}).sort(),[...names].sort()))
      throw Error('Saved chart missing measurement cells or physical bounds')
    for(const name of names){
      if(!equal(Object.keys(chart.values[name]??{}),SIZES)||
        !equal(Object.keys(authoredEnvelope.measurements[name]??{}),SIZES))
        throw Error('Saved native measurement chart missing one or more sizes')
      for(const size of SIZES){
        const cell=chart.values[name][size],bounds=authoredEnvelope.measurements[name][size]
        if(!object(cell)||!Number.isFinite(cell.valueMm)||!object(bounds)||
          !Number.isFinite(bounds.minMm)||!Number.isFinite(bounds.maxMm)||
          bounds.minMm>bounds.maxMm||cell.valueMm<bounds.minMm-1e-8||
          cell.valueMm>bounds.maxMm+1e-8)
          throw Error(`Native ${name}/${size} value exceeds stored fabric bounds`)
      }
    }
    // Re-evaluate each saved six-size formula rather than trusting an inspect
    // receipt that merely repeats a malformed derived cell from a caller.
    for(const size of SIZES){
      const values={}
      for(const name of names){
        const saved=graph.measurements[name],cell=chart.values[name][size]
        if(object(saved)&&typeof saved.formula==='string'){
          if(Object.hasOwn(cell,'directInputMm'))
            throw Error(`Computed cell ${name}/${size} has an unauthorized direct override`)
          values[name]={formula:saved.formula}
        }else{
          const original=typeof saved==='number'?saved:saved?.valueMm
          if(!Number.isFinite(original)||!Number.isFinite(cell.directInputMm)||
            (size==='M'&&Math.abs(cell.directInputMm-original)>1e-7))
            throw Error(`Saved direct cell ${name}/${size} disagrees with source measurement`)
          values[name]={valueMm:cell.directInputMm}
        }
      }
      const computed=evaluateNativeDraftFormulas20261023({measurements:values})
      if(!computed.ok||names.some(name=>
        Math.abs(computed.valuesMm[name]-chart.values[name][size].valueMm)>1e-7))
        throw Error(`Saved ${size} chart formulas disagree with independently evaluated inputs`)
    }
    const poms=grade.pomSpecs??[],physical=authoredEnvelope.physicalPomBounds??{}
    if(!Array.isArray(poms)||!equal(Object.keys(physical).sort(),poms.map(p=>p.id).sort()))
      throw Error('Saved native physical POM inventory differs from grade catalog')
    for(const pom of poms){
      if(!equal(Object.keys(physical[pom.id]??{}),SIZES))
        throw Error('Saved native POM has incomplete six-size bounds')
      for(const size of SIZES){
        const b=physical[pom.id][size]
        if(!Number.isFinite(b?.minMm)||!Number.isFinite(b?.maxMm)||
          b.minMm<0||b.maxMm>100000||b.minMm>b.maxMm)
          throw Error('Saved native POM has invalid physical bounds')
      }
      if(!['anchor-distance','sewline-edge','sewline-path'].includes(pom.kind))
        throw Error('Unsupported native physical POM kind')
      for(let i=0;i<SIZES.length;i++){
        const size=SIZES[i],panels=grade.gradedTemplates[i]?.panels?.filter(p=>p.id===pom.panelId)
        if(panels?.length!==1)throw Error(`Missing or ambiguous physical POM panel ${size}`)
        const length=measureNativePhysicalPomMm20261028(panels[0].polygon,pom)
        const range=physical[pom.id][size]
        if(!Number.isFinite(length)||length<=0||length>100000||length<range.minMm-1e-7||
          length>range.maxMm+1e-7)
          throw Error(`Actual ${size} physical POM violates persisted fabric limits`)
      }
    }
    return Object.freeze({ok:true,nativeChartPersisted:true,sourceRevision:beforeRevision,
      afterRevision,sizeCount:6,measurementCount:names.length,pomCount:poms.length,
      changedGarmentGeometry:false,oneUndoRevision:true,factoryApproved:false,
      licensedModarisAccepted:false})
  }catch(e){return error(e?.message??e)}
}
