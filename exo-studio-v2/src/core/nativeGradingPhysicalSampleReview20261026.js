import {inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'
import {sha256Bytes} from './sha256Bytes.js'

const SIZES=['XS','S','M','L','XL','XXL']
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const safe=s=>typeof s==='string'&&s.trim().length>0&&s.length<=240&&!/[\x00-\x1f\x7f]/.test(s)
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?
  Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
const digest=value=>sha256Bytes(new TextEncoder().encode(JSON.stringify(canonical(value))))
const csvCell=value=>{
  const string=String(value??'').replace(/[\x00-\x1f\x7f]/g,' ')
  // Prevent copy-pasted factory names, POM labels and sample annotations from
  // being interpreted as executable spreadsheet formulas upon CSV opening.
  const guarded=/^[\s]*[=+@-]/.test(string)?`'${string}`:string
  return `"${guarded.replaceAll('"','""')}"`
}

const WORKSHEET_HEADER=['sourceRevision','sourceTemplateSha256','sourceGradeRulesSha256','sourcePOMSha256',
  'size','pomId','pomLabel','targetMm','toleranceMm','specimenId','factory','operator',
  'calibrationId','measurementDate','signedReportReference','actualSampleMm','notes']

// Parse RFC-style quoted CSV without dropping blank cells, normalizing values,
// interpreting spreadsheet formulas, or accepting stray text after closing quotes.
function parseWorksheetCSV(csv){
  if(typeof csv!=='string'||csv.length>2_000_000||!csv.length)
    throw Error('CSV must be a nonempty worksheet under 2 MB')
  const rows=[],row=[];let cell='',index=0,quoted=false,closed=false,started=false
  const appendCell=()=>{row.push(cell);cell='';started=false;closed=false}
  const appendRow=()=>{appendCell();rows.push([...row]);row.length=0}
  while(index<csv.length){
    const char=csv[index++]
    if(quoted){
      if(char==='"'){
        if(csv[index]==='"'){cell+='"';index++}else{quoted=false;closed=true}
      }else cell+=char
      continue
    }
    if(char===','){appendCell();continue}
    if(char==='\r'||char==='\n'){
      if(char==='\r'&&csv[index]==='\n')index++
      appendRow();continue
    }
    if(closed)throw Error('Unexpected text after quoted CSV value')
    if(char==='"'){
      if(started||cell.length)throw Error('Unexpected quote in unquoted CSV value')
      quoted=true;started=true;continue
    }
    cell+=char;started=true
  }
  if(quoted)throw Error('Unterminated quoted CSV value')
  if(started||closed||cell.length||row.length)appendRow()
  return rows
}

const strictNumber=value=>{
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value))return null
  const number=Number(value)
  return finite(number)?number:null
}
const strictDate=value=>{
  if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value))return false
  if(!Number.isFinite(Date.parse(value)))return false
  const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3])
  return month>=1&&month<=12&&day>=1&&day<=new Date(Date.UTC(year,month,0)).getUTCDate()
}
const isFormula=value=>/^[\s\uFEFF]*[=+@-]/.test(value)||/^[\s\uFEFF]*'[\s]*[=+@-]/.test(value)
const acceptableText=value=>safe(value)&&!isFormula(value)

/** Atomically import returned factory CSV measurements against the exact source
 * used to export a worksheet. A failure returns no partially accepted records.
 * Self-reported measurements remain unapproved pending independent inspection.
 */
export function importNativeGradingPhysicalSampleWorksheet20261026(snapshot,ruleSet,definitions=[],csv){
  const fail=(code,reason)=>({ok:false,code,reason,observations:null})
  const exported=exportNativeGradingPhysicalSampleWorksheet20261026(snapshot,ruleSet,definitions)
  if(!exported.ok)return fail('CURRENT_SOURCE_UNVERIFIED',exported.reason)
  let records
  try{records=parseWorksheetCSV(csv)}catch(error){return fail('INVALID_CSV',error.message)}
  if(!same(records[0],WORKSHEET_HEADER))
    return fail('INVALID_HEADER','CSV headers must exactly match the exported factory worksheet')
  const expected=new Map(inspectNativeGradingPOM20261025(snapshot,ruleSet,definitions).rows
    .map(row=>[`${row.size}:\u0000${row.id}`,row]))
  if(records.length!==expected.size+1)
    return fail('INCOMPLETE_COVERAGE','Worksheet must contain exactly one row for every size and authored POM')
  const sizes=new Map(),seen=new Set(),specimens=new Set()
  for(const values of records.slice(1)){
    if(values.length!==WORKSHEET_HEADER.length)return fail('INVALID_ROW','Each measurement row must contain every worksheet column')
    const row=Object.fromEntries(WORKSHEET_HEADER.map((field,i)=>[field,values[i]]))
    if(row.sourceRevision!==String(snapshot.revision)||row.sourceTemplateSha256!==exported.sourceHash||
      row.sourceGradeRulesSha256!==exported.ruleHash||row.sourcePOMSha256!==exported.pomHash)
      return fail('STALE_SOURCE','Measurement row has missing or stale source revision, template, rules or POM hash')
    const key=`${row.size}:\u0000${row.pomId}`,target=expected.get(key)
    if(!target||seen.has(key))return fail('DUPLICATE_OR_UNKNOWN_POM','Unknown or duplicate size/POM measurement row')
    seen.add(key)
    if(row.pomLabel!==String(target.label)||strictNumber(row.targetMm)!==target.targetMm||
      strictNumber(row.toleranceMm)!==target.toleranceMm)
      return fail('TAMPERED_TARGET','Worksheet POM label, target or tolerance differs from the current source')
    const actualMm=strictNumber(row.actualSampleMm)
    if(actualMm===null||actualMm<=0||actualMm>10000)
      return fail('INVALID_MEASUREMENT','Factory measurement must be a finite positive mm value no greater than 10000')
    const provenance={}
    for(const field of ['specimenId','factory','operator','calibrationId','measurementDate','signedReportReference']){
      if(!acceptableText(row[field]))return fail('INVALID_PROVENANCE',`Missing or unsafe ${field}`)
      provenance[field]=row[field]
    }
    if(!strictDate(provenance.measurementDate))
      return fail('INVALID_DATE','Measurement date must be a valid calendar date or ISO timestamp')
    // Notes are inert data, but reject formulas or control characters to avoid
    // passing spreadsheet payloads into subsequent CSV exports.
    if(row.notes&&(row.notes.length>1000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(row.notes)||isFormula(row.notes)))
      return fail('UNSAFE_NOTES','Notes contain a spreadsheet formula or unsafe characters')
    const existing=sizes.get(row.size)
    if(existing){
      for(const field of Object.keys(provenance))
        if(existing[field]!==provenance[field])
          return fail('INCONSISTENT_SPECIMEN','Every POM in one size must identify the same specimen and provenance')
    }else sizes.set(row.size,{size:row.size,...provenance,measurements:[]})
    sizes.get(row.size).measurements.push({pomId:row.pomId,actualMm})
  }
  if(seen.size!==expected.size||sizes.size!==SIZES.length)
    return fail('INCOMPLETE_COVERAGE','Six sizes and every POM are required')
  for(const size of SIZES){
    const specimen=sizes.get(size)?.specimenId
    if(!specimen||specimens.has(specimen))return fail('DUPLICATE_SPECIMEN','Each size requires a distinct physical specimen')
    specimens.add(specimen)
  }
  const observations={sourceRevision:snapshot.revision,sourceTemplate:structuredClone(snapshot.template),
    sourceRuleSet:structuredClone(ruleSet),templateFingerprint:ruleSet.templateFingerprint,
    pomDefinitions:structuredClone(definitions),samples:SIZES.map(size=>sizes.get(size))}
  const review=inspectNativeGradingPhysicalSampleReview20261026(snapshot,ruleSet,definitions,observations)
  return {ok:true,observations,review,
    independentAuditVerified:false,physicalSampleApproved:false,manufacturingApproved:false,cuttingAuthorized:false,
    note:'Imported measurements are unverified factory claims until authenticated independent physical inspection.'}
}

/** Build a blank, source-pinned measurement worksheet for genuine sewn samples.
 * Actual measurements and operator/signer fields are *never* prepopulated. */
export function exportNativeGradingPhysicalSampleWorksheet20261026(snapshot,ruleSet,definitions=[]){
  const result=inspectNativeGradingPOM20261025(snapshot,ruleSet,definitions)
  if(!Number.isSafeInteger(snapshot?.revision)||!result?.verified||!definitions.length||
    result.rows.length!==6*definitions.length)
    return {ok:false,reason:'Current six-size POM source and targets must pass before preparing a physical sample worksheet'}
  const sourceHash=digest(snapshot.template),ruleHash=digest(ruleSet),pomHash=digest(definitions)
  const header=WORKSHEET_HEADER
  const rows=result.rows.map(row=>[snapshot.revision,sourceHash,ruleHash,pomHash,row.size,row.id,
    row.label,row.targetMm,row.toleranceMm,'','','','','','','',''])
  return {ok:true,sourceHash,ruleHash,pomHash,rows:rows.length,
    csv:[header,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n',
    note:'Source-pinned blank factory measurement template; an exported worksheet is not physical measurement evidence or factory approval.'}
}

/** Verify the *completeness and measured tolerance* of provided physical sewn
 * sample observations. These inputs are untrusted external claims, never a
 * substitute for an independently authenticated signer or receiver report.
 * No fabricated size/piece coordinates or inferred sample measurements.
 */
export function inspectNativeGradingPhysicalSampleReview20261026(snapshot,ruleSet,definitions=[],observations=null){
  const blockers=[],rows=[]
  const add=(code,size=null,pomId=null,message=code)=>blockers.push({code,size,pomId,message})
  const pom=inspectNativeGradingPOM20261025(snapshot,ruleSet,definitions)
  if(!pom?.verified||!definitions.length){
    add('POM_SPECIFICATIONS_UNVERIFIED',null,null,'Six-size graded POM targets and physical metrology must pass before sample comparison')
  }
  if(!observations||typeof observations!=='object'||Array.isArray(observations)){
    add('PHYSICAL_SAMPLE_RECORDS_REQUIRED',null,null,'Provide actual measured sewn samples for each size')
  }else{
    if(observations.sourceRevision!==snapshot?.revision||
      observations.templateFingerprint!==ruleSet?.templateFingerprint||
      !same(observations.sourceTemplate,snapshot?.template)||
      !same(observations.sourceRuleSet,ruleSet)||
      !same(observations.pomDefinitions,definitions))
      add('STALE_SAMPLE_SOURCE','',null,'Sample report must pin exact geometry, full grade offsets, revision and POM specifications')
    if(!Array.isArray(observations.samples)||observations.samples.length!==6)
      add('SIX_SAMPLES_REQUIRED',null,null,'One independently traceable sewn specimen is required for each of XS, S, M, L, XL and XXL')
    else{
      const seenSizes=new Set(),seenSpecimens=new Set()
      const targets=new Map((pom?.rows||[]).map(row=>[`${row.size}:${row.id}`,row]))
      for(const sample of observations.samples){
        const size=sample?.size
        if(!SIZES.includes(size)||seenSizes.has(size)){
          add('DUPLICATE_OR_INVALID_SAMPLE_SIZE',size,null,'Samples must include each graded size exactly once');continue
        }
        seenSizes.add(size)
        if(!safe(sample.specimenId)||seenSpecimens.has(sample.specimenId))
          add('INVALID_SAMPLE_ID',size,null,'Each physical specimen needs its own stable identity')
        else seenSpecimens.add(sample.specimenId)
        for(const field of ['factory','operator','measurementDate','calibrationId','signedReportReference']){
          if(!safe(sample[field]))add('SAMPLE_PROVENANCE_REQUIRED',size,null,`Missing real sample ${field}`)
        }
        if(!safe(sample?.measurementDate)||Number.isNaN(Date.parse(sample.measurementDate)))
          add('INVALID_SAMPLE_DATE',size,null,'Sample measurement date must be parseable')
        if(!Array.isArray(sample?.measurements)||sample.measurements.length!==definitions.length){
          add('SAMPLE_POM_COVERAGE',size,null,'Every authored POM must be actually measured on this sewn size');continue
        }
        const seenIds=new Set()
        for(const item of sample.measurements){
          const id=item?.pomId
          if(!safe(id)||seenIds.has(id)){
            add('SAMPLE_POM_IDENTITY',size,id,'Unknown or duplicated sample measurement');continue
          }
          seenIds.add(id)
          const target=targets.get(`${size}:${id}`)
          if(!target){add('SAMPLE_POM_NOT_IN_SPEC',size,id,'Sample station not present in current grading specifications');continue}
          if(!finite(item.actualMm)||item.actualMm<=0||item.actualMm>10000){
            add('NONPHYSICAL_SAMPLE_MEASUREMENT',size,id,'Actual sewn measurement must be finite positive millimetres');continue
          }
          const deltaMm=item.actualMm-target.targetMm
          const pass=Math.abs(deltaMm)<=target.toleranceMm+1e-7
          rows.push({size,pomId:id,specimenId:sample.specimenId,actualMm:item.actualMm,
            targetMm:target.targetMm,toleranceMm:target.toleranceMm,deltaMm,pass})
          if(!pass)add('SEWN_SAMPLE_OUT_OF_TOLERANCE',size,id,`${size}/${id}: actual sewn sample is ${Math.abs(deltaMm).toFixed(2)} mm from target; tolerance is ±${target.toleranceMm} mm`)
        }
      }
      for(const size of SIZES)if(!seenSizes.has(size))add('MISSING_SAMPLE_SIZE',size,null,'Actual sewn-size measurement missing')
    }
  }
  const complete=blockers.length===0&&rows.length===SIZES.length*definitions.length
  return {schema:'exo-native-physical-sample-review.v1',
    sourceRevision:snapshot?.revision??null,sizes:[...SIZES],rows,blockers,
    complete,readyForIndependentAudit:complete,
    // Even a complete user-supplied record is not authenticated proof of an
    // independently observed, signed physical factory sample fit.
    independentAuditVerified:false,physicalSampleApproved:false,
    manufacturingApproved:false,cuttingAuthorized:false,
    note:'Physical sample observations require independent factory-signature verification. Self-reported pass fields cannot authorize production.'}
}
