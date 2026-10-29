import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'

const SIZES=['XS','S','M','L','XL','XXL']
const safeText=v=>typeof v==='string'&&v.length>0&&v.length<=100&&
  !/[\x00-\x1f\x7f]/.test(v)&&!['__proto__','constructor','prototype'].includes(v)
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const empty=()=>Object.fromEntries(SIZES.map(s=>[s,null]))
const fail=(reason)=>({ok:false,reason,rows:[],verified:false,measurementApproved:false,
  manufacturingApproved:false,nativeCommitted:false})
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&
  (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null)
const boundaryPath=(polygon,fromPoint,toPoint)=>{
  const count=polygon?.points?.length
  if(!Number.isInteger(count)||count<3||!Number.isInteger(fromPoint)||!Number.isInteger(toPoint)||
    fromPoint<0||toPoint<0||fromPoint>=count||toPoint>=count||fromPoint===toPoint||
    !Array.isArray(polygon.edges)||polygon.edges.length!==count)
    throw Error('Choose distinct boundary anchors for a consecutive sewn path')
  const edges=[]
  for(let index=fromPoint;index!==toPoint;index=(index+1)%count){
    if(edges.length>=count)throw Error('Invalid sewn boundary path')
    edges.push(polygon.edges[index])
  }
  return edges
}

// The resulting measurements are 2D drafted material-space distances, not
// avatar/body dimensions or finished 3D fit. Curve-aware edge lengths reuse
// the same 0.25 mm flatness contract as the native Rust sewing approximation.
function measured(polygon,definition){
  if(definition.kind==='anchor-distance'){
    const a=polygon.points[definition.fromPoint],b=polygon.points[definition.toPoint]
    if(!a||!b||definition.fromPoint===definition.toPoint)throw Error('Invalid anchor pair')
    return Math.hypot(a[0]-b[0],a[1]-b[1])*1000
  }
  if(definition.kind==='sewline-edge'){
    const result=nativeRustEdgeLength20261023(polygon,definition.edge)
    if(!result.ok)throw Error(result.reason||'Failed physical sewn edge measurement')
    return result.totalLengthM*1000
  }
  if(definition.kind==='sewline-path'){
    const edges=boundaryPath(polygon,definition.fromPoint,definition.toPoint)
    return edges.reduce((sum,edge)=>{
      const result=nativeRustEdgeLength20261023(polygon,edge)
      if(!result.ok)throw Error(result.reason||'Failed sewn path measurement')
      return sum+result.totalLengthM*1000
    },0)
  }
  throw Error('Unsupported point of measure')
}

export function createNativeGradingPOM20261025(snapshot,ruleSet,{
  panelId,kind='anchor-distance',fromPoint=0,toPoint=1,edge,label,
  toleranceMm=2,
}={}){
  try{
    const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet?.baseSize})
    if(!compiled.ok)throw Error(compiled.reason||'Grade source is stale')
    const selected=snapshot.template.panels.find(p=>p.id===panelId)
    if(!selected||!safeText(panelId))throw Error('Select an existing graded pattern')
    if(!['anchor-distance','sewline-edge','sewline-path'].includes(kind))throw Error('Unsupported point-of-measure type')
    if(['anchor-distance','sewline-path'].includes(kind)&&(!Number.isInteger(fromPoint)||!Number.isInteger(toPoint)||
      fromPoint<0||toPoint<0||fromPoint>=selected.polygon.points.length||
      toPoint>=selected.polygon.points.length||fromPoint===toPoint))
      throw Error('Choose two distinct pattern anchor points')
    if(kind==='sewline-edge'&&(!safeText(edge)||!selected.polygon.edges.includes(edge)))
      throw Error('Select a native named sewn edge')
    if(kind==='sewline-path')boundaryPath(selected.polygon,fromPoint,toPoint)
    if(!finite(toleranceMm)||toleranceMm<0||toleranceMm>50)throw Error('Tolerance must be 0–50 mm')
    const definition={
      id:'POM-'+(kind==='sewline-edge'?edge:`${kind==='sewline-path'?'path-':''}${fromPoint+1}-${toPoint+1}`),
      label:label|| (kind==='sewline-edge'?`Sewline ${edge}`:kind==='sewline-path'?`P${fromPoint+1}–P${toPoint+1} clockwise sewn boundary`:`P${fromPoint+1}–P${toPoint+1} straight distance`),
      panelId,kind,toleranceMm,
      ...(kind==='sewline-edge'?{edge}:{fromPoint,toPoint}),
      targetsMm:empty(),
    }
    if(!safeText(definition.id)||!safeText(definition.label))throw Error('Unsafe POM name')
    return {ok:true,definition}
  }catch(error){return fail(error.message)}
}

// Read-only drafting preview. No target is inferred from geometry and no approval
// is produced by selecting a station.
export function previewNativeGradingPOM20261025(snapshot,ruleSet,options={}){
  const created=createNativeGradingPOM20261025(snapshot,ruleSet,options)
  if(!created.ok)return created
  const inspected=inspectNativeGradingPOM20261025(snapshot,ruleSet,[created.definition])
  if(inspected.reason)return fail(inspected.reason)
  return {ok:true,rows:inspected.rows.map(({size,actualMm})=>({size,actualMm})),
    units:'mm',verified:false,manufacturingApproved:false,nativeCommitted:false}
}

// A changed measurement station is a new physical specification. Invalidate all
// six prior targets so old tolerances cannot silently certify different points.
export function reviseNativeGradingPOMAnchors20261025(snapshot,ruleSet,definition,changes={}){
  if(!plain(definition)||!safeText(definition.id))return fail('Invalid POM definition')
  const made=createNativeGradingPOM20261025(snapshot,ruleSet,{
    panelId:definition.panelId,kind:definition.kind,
    fromPoint:changes.fromPoint??definition.fromPoint,
    toPoint:changes.toPoint??definition.toPoint,
    edge:changes.edge??definition.edge,
    label:definition.label,toleranceMm:definition.toleranceMm,
  })
  if(!made.ok)return made
  if(['anchor-distance','sewline-path'].includes(definition.kind)&&
    made.definition.fromPoint===definition.fromPoint&&made.definition.toPoint===definition.toPoint||
    definition.kind==='sewline-edge'&&made.definition.edge===definition.edge)
    return {ok:true,definition}
  return {ok:true,definition:{...made.definition,id:definition.id}}
}

export function inspectNativeGradingPOM20261025(snapshot,ruleSet,definitions,{allowNamedSizes=false}={}){
  try{
    if(!Array.isArray(definitions)||definitions.length>64)throw Error('Maximum 64 point-of-measure definitions')
    const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet?.baseSize})
    if(!compiled.ok)throw Error(compiled.reason||'Stale grading source')
    const sizes=allowNamedSizes?ruleSet.sizes:SIZES
    if(!allowNamedSizes&&JSON.stringify(ruleSet.sizes)!==JSON.stringify(SIZES))throw Error('POM requires six ordered XS–XXL sizes')
    if(allowNamedSizes&&(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||
      new Set(sizes).size!==sizes.length||sizes.some(s=>typeof s!=='string'||!/^[A-Za-z0-9-]{1,24}$/.test(s))))
      throw Error('Named-size POM requires 2–24 unique canonical sizes')
    const ids=new Set(),rows=[],issues=[]
    for(const definition of definitions){
      if(!plain(definition)||!safeText(definition.id)||!safeText(definition.label)||
        !safeText(definition.panelId)||ids.has(definition.id)||!compiled.byPanel[definition.panelId])
        throw Error('Unknown or duplicate POM definition')
      ids.add(definition.id)
      const basePanel=snapshot.template.panels.find(panel=>panel.id===definition.panelId)
      if(['anchor-distance','sewline-path'].includes(definition.kind)){
        const count=basePanel?.polygon?.points?.length
        if(!Number.isInteger(definition.fromPoint)||!Number.isInteger(definition.toPoint)||
          definition.fromPoint<0||definition.toPoint<0||definition.fromPoint>=count||
          definition.toPoint>=count||definition.fromPoint===definition.toPoint)
          throw Error('Invalid POM anchor station')
        if(definition.kind==='sewline-path')boundaryPath(basePanel.polygon,definition.fromPoint,definition.toPoint)
      }else if(definition.kind==='sewline-edge'){
        if(!safeText(definition.edge)||!basePanel?.polygon?.edges?.includes(definition.edge))
          throw Error('Invalid POM sewn edge')
      }else throw Error('Unsupported POM measurement type')
      if(!finite(definition.toleranceMm)||definition.toleranceMm<0||definition.toleranceMm>50||
        !plain(definition.targetsMm)||Object.keys(definition.targetsMm).length!==sizes.length||
        sizes.some(size=>!Object.hasOwn(definition.targetsMm,size))||
        Object.keys(definition.targetsMm).some(size=>!sizes.includes(size)))
        throw Error('Incomplete or out-of-range POM tolerances/targets')
      for(const size of sizes){
        const polygon=compiled.byPanel[definition.panelId]?.sizeRun[size]?.polygon
        if(!polygon)throw Error('Missing graded POM source geometry')
        const actualMm=measured(polygon,definition)
        if(!finite(actualMm)||actualMm<=0||actualMm>10000)throw Error('Nonphysical point-of-measure length')
        const targetMm=definition.targetsMm[size]
        if(targetMm!==null&&(!finite(targetMm)||targetMm<=0||targetMm>10000))
          throw Error('POM targets must be positive physical millimetres or unset')
        const deltaMm=targetMm===null?null:actualMm-targetMm
        const pass=targetMm!==null&&Math.abs(deltaMm)<=definition.toleranceMm+1e-7
        const row={id:definition.id,label:definition.label,panelId:definition.panelId,
          size,kind:definition.kind,actualMm,targetMm,deltaMm,
          toleranceMm:definition.toleranceMm,pass,units:'mm',manufacturingApproved:false}
        rows.push(row)
        if(targetMm===null)issues.push({code:'POM_TARGET_REQUIRED',id:definition.id,size,
          message:`${definition.label} · ${size}: enter a target measurement`})
        else if(!pass)issues.push({code:'POM_OUT_OF_TOLERANCE',id:definition.id,size,
          message:`${definition.label} · ${size}: ${Math.abs(deltaMm).toFixed(2)} mm beyond intended target (±${definition.toleranceMm} mm)`})
      }
    }
    if(!definitions.length)issues.push({code:'NO_POM',message:'Add a point of measure and explicitly enter target sizes'})
    return {ok:issues.length===0,verified:issues.length===0,rows,issues,
      definitions:definitions.length,requiredRows:definitions.length*sizes.length,
      measurementApproved:false,manufacturingApproved:false,nativeCommitted:false}
  }catch(error){return fail(String(error.message||error))}
}

const SPEC_COLUMNS=['sourceFingerprint','sourceRevision','sourceTemplate','sourceGradeRules','pomId','label',
  'panelId','kind','fromPoint','toPoint','edge','size','unit','toleranceMm','targetMm']
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?
  Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
const sourceTemplate=snapshot=>JSON.stringify(canonical(snapshot?.template))
// Point-rule offsets are independent of the template fingerprint and snapshot
// revision. Pin the complete grading rules to prevent importing specifications
// measured against an older size run after a grade offset edit.
const sourceGradeRules=ruleSet=>JSON.stringify(canonical(ruleSet))
const sourceRevision=snapshot=>{
  if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0)throw Error('Source revision required for specification exchange')
  return String(snapshot.revision)
}
const csvCell=value=>{
  const str=String(value)
  if(/^[\s]*[=+@\-]/.test(str)&&!/^-[0-9]/.test(str))throw Error('Spreadsheet formula characters are forbidden')
  return `"${str.replaceAll('"','""')}"`
}
function csvRows(csv){
  if(typeof csv!=='string'||csv.length>2_000_000||csv.includes('\0'))throw Error('Invalid or oversized CSV')
  const rows=[];let row=[],field='',quoted=false,closed=false
  for(let i=0;i<csv.length;i++){
    const c=csv[i]
    if(quoted){
      if(c==='"'&&csv[i+1]==='"'){field+='"';i++}
      else if(c==='"'){quoted=false;closed=true}
      else field+=c
    }else if(c==='"'&&field===''&&!closed)quoted=true
    else if(c===','||c==='\n'){
      row.push(field);field='';closed=false
      if(c==='\n'){rows.push(row);row=[]}
    }else if(c==='\r'&&csv[i+1]==='\n')continue
    else if(c==='"'||closed)throw Error('Malformed CSV quotation')
    else field+=c
    if(field.length>250000||rows.length>385)throw Error('CSV size limit exceeded')
  }
  if(quoted)throw Error('Unclosed CSV quotation')
  if(field!==''||row.length){row.push(field);rows.push(row)}
  if(!rows.length||rows.some(r=>r.length!==SPEC_COLUMNS.length))throw Error('Incorrect CSV column count')
  if(rows.some(r=>r.some(cell=>/^[\s]*[=+@-]/.test(cell)&&!/^-[0-9]/.test(cell)||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(cell))))
    throw Error('Unsafe spreadsheet cell')
  return rows
}
const decimal=text=>{
  if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text))throw Error('Invalid finite positive decimal')
  const value=Number(text)
  if(!Number.isFinite(value))throw Error('Invalid finite decimal')
  return value
}

export function exportNativeGradingPOMSpecsCSV20261025(snapshot,ruleSet,definitions){
  try{
    const revision=sourceRevision(snapshot)
    const result=inspectNativeGradingPOM20261025(snapshot,ruleSet,definitions)
    if(!result.rows.length||result.rows.length!==definitions.length*6||!result.rows.every(row=>row.targetMm!==null))
      throw Error('Set all six finite targets for every POM before downloading specifications')
    if(result.reason)throw Error(result.reason)
    const rows=[SPEC_COLUMNS,...definitions.flatMap(def=>SIZES.map(size=>[
      ruleSet.templateFingerprint,revision,sourceTemplate(snapshot),sourceGradeRules(ruleSet),def.id,def.label,
      def.panelId,def.kind,def.kind!=='sewline-edge'?String(def.fromPoint):'',
      def.kind!=='sewline-edge'?String(def.toPoint):'',def.kind==='sewline-edge'?def.edge:'',
      size,'mm',String(def.toleranceMm),String(def.targetsMm[size]),
    ]))]
    return {ok:true,csv:rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n',
      specifications:definitions.length,rows:definitions.length*6,manufacturingApproved:false}
  }catch(error){return fail(error.message||String(error))}
}

export function importNativeGradingPOMSpecsCSV20261025(csv,snapshot,ruleSet,originals=[]){
  try{
    if(!Array.isArray(originals)||originals.length>64)throw Error('Invalid original POM definitions')
    const rows=csvRows(csv)
    if(JSON.stringify(rows.shift())!==JSON.stringify(SPEC_COLUMNS))throw Error('Unsupported specification CSV schema')
    if(rows.length<6||rows.length>384||rows.length%6!==0)throw Error('Incomplete six-size specification run')
    const revision=sourceRevision(snapshot),template=sourceTemplate(snapshot),gradeRules=sourceGradeRules(ruleSet)
    const groups=new Map()
    for(const row of rows){
      const [fingerprint,rev,source,rules,id,label,panelId,kind,from,to,edge,size,unit,tol,target]=row
      if(fingerprint!==ruleSet?.templateFingerprint||rev!==revision||source!==template||rules!==gradeRules)
        throw Error('Stale or mismatched grading source; specifications were not imported')
      if(unit!=='mm'||!SIZES.includes(size)||!safeText(id)||!safeText(label)||!safeText(panelId))
        throw Error('Invalid POM identity, size or units')
      if(!groups.has(id))groups.set(id,[])
      if(groups.get(id).some(existing=>existing[11]===size))throw Error('Duplicate POM size row')
      groups.get(id).push(row)
      if(groups.size>64)throw Error('Maximum 64 POM specifications')
      if(['anchor-distance','sewline-path'].includes(kind)&&(!/^(0|[1-9]\d*)$/.test(from)||!/^(0|[1-9]\d*)$/.test(to)||edge!==''))
        throw Error('Invalid anchor station columns')
      if(kind==='sewline-edge'&&(from!==''||to!==''||!safeText(edge)))throw Error('Invalid sewn edge columns')
      if(!['anchor-distance','sewline-edge','sewline-path'].includes(kind))throw Error('Unsupported POM kind')
      if(decimal(tol)>50||decimal(target)<=0||decimal(target)>10000)throw Error('Invalid POM target/tolerance')
    }
    const imported=[]
    for(const [id,group] of groups){
      if(group.length!==6||SIZES.some(size=>!group.some(row=>row[11]===size)))
        throw Error('Missing a required POM size')
      const first=group[0]
      if(group.some(row=>row.some((value,index)=>index!==11&&index!==14&&value!==first[index])))
        throw Error('Conflicting metadata across POM sizes')
      const made=createNativeGradingPOM20261025(snapshot,ruleSet,{
        panelId:first[6],kind:first[7],fromPoint:first[8]===''?undefined:Number(first[8]),
        toPoint:first[9]===''?undefined:Number(first[9]),edge:first[10],label:first[5],toleranceMm:Number(first[13]),
      })
      if(!made.ok)throw Error(made.reason)
      imported.push({...made.definition,id,targetsMm:Object.fromEntries(group.map(row=>[row[11],Number(row[14])]))})
    }
    const checked=inspectNativeGradingPOM20261025(snapshot,ruleSet,imported)
    if(checked.reason||checked.rows.length!==rows.length)throw Error(checked.reason||'Invalid specification geometry')
    return {ok:true,definitions:imported,rows:rows.length,manufacturingApproved:false,
      // A POM outside tolerance is valid as a draft specification, and must remain flagged.
      withinTolerance:checked.verified}
  }catch(error){return fail(error.message||String(error))}
}


/** Build explicit specification targets independently of measured geometry.
 * The user must apply this proposal; matching targets never certify production.
 */
export function proposeNativeGradingPOMTargetRun20261025(snapshot,ruleSet,definition,{
  baseTargetMm,incrementMm,
}={}){
  try{
    if(!plain(definition))throw Error('Select a POM specification')
    if(!finite(baseTargetMm)||baseTargetMm<=0||baseTargetMm>10000||
      !finite(incrementMm)||Math.abs(incrementMm)>10000)
      throw Error('Enter a positive base target and a finite size increment in millimetres')
    const checked=inspectNativeGradingPOM20261025(snapshot,ruleSet,[definition])
    if(checked.reason||checked.rows.length!==SIZES.length)
      throw Error(checked.reason||'Invalid graded measurement source')
    const baseIndex=SIZES.indexOf(ruleSet.baseSize)
    if(baseIndex<0)throw Error('Unknown base size')
    const targetsMm=Object.fromEntries(SIZES.map((size,index)=>{
      const target=baseTargetMm+(index-baseIndex)*incrementMm
      if(!finite(target)||target<=0||target>10000)
        throw Error(`Target for ${size} must be greater than zero and at most 10000 mm`)
      return [size,target]
    }))
    const proposed={...definition,targetsMm}
    const report=inspectNativeGradingPOM20261025(snapshot,ruleSet,[proposed])
    if(report.reason)throw Error(report.reason)
    return {ok:true,definition:proposed,rows:report.rows,
      withinTolerance:report.verified,manufacturingApproved:false,nativeCommitted:false}
  }catch(error){return fail(String(error.message||error))}
}
