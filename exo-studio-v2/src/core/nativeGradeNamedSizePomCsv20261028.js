import {createNativeGradingPOM20261025,inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'

const COLUMNS=['pomId','label','panelId','kind','fromPoint','toPoint','edge','size','unit','toleranceMm','targetMm']
const MARKER='#EXO-NAMED-POM-V1'
const fail=reason=>({ok:false,reason,manufacturingApproved:false,nativeCommitted:false})
const safeText=value=>typeof value==='string'&&value.length>0&&value.length<=100&&
  !/[\x00-\x1f\x7f]/.test(value)&&!['__proto__','prototype','constructor'].includes(value)&&
  !/^\s*['=+@-]/.test(value)
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?
  Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
const source=snapshot=>JSON.stringify(canonical(snapshot?.template))
const rules=ruleSet=>JSON.stringify(canonical(ruleSet))
const sizesOf=ruleSet=>{
  const sizes=ruleSet?.sizes
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||
    sizes.some(size=>typeof size!=='string'||!/^[A-Za-z0-9-]{1,24}$/.test(size))||
    new Set(sizes).size!==sizes.length)throw Error('Invalid canonical named-size inventory')
  return sizes
}
const revisionOf=snapshot=>{
  if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0)throw Error('Native source revision is required')
  return String(snapshot.revision)
}
const cell=value=>{
  const text=String(value)
  if(/^[\s]*['=+@-]/.test(text)||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text))
    throw Error('Unsafe spreadsheet cell')
  return '"'+text.replaceAll('"','""')+'"'
}
function parse(csv){
  if(typeof csv!=='string'||csv.length>2_000_000||csv.includes('\0'))throw Error('Invalid or oversized CSV')
  const rows=[];let row=[],field='',quoted=false,closed=false
  for(let i=0;i<csv.length;i++){
    const ch=csv[i]
    if(quoted){
      if(ch==='"'&&csv[i+1]==='"'){field+='"';i++}
      else if(ch==='"') {quoted=false;closed=true}
      else field+=ch
    }else if(ch==='"'&&field===''&&!closed)quoted=true
    else if(ch===','||ch==='\n'){
      row.push(field);field='';closed=false
      if(ch==='\n'){rows.push(row);row=[]}
    }else if(ch==='\r'&&csv[i+1]==='\n')continue
    else if(ch==='"'||closed)throw Error('Malformed CSV quotation')
    else field+=ch
    if(field.length>1_500_000||rows.length>1538)throw Error('CSV row or field limit exceeded')
  }
  if(quoted)throw Error('Unclosed CSV quotation')
  if(field!==''||row.length){row.push(field);rows.push(row)}
  if(rows.some(r=>r.length!==COLUMNS.length)||rows.length<4||rows.length>1538)
    throw Error('Incomplete or malformed named-size CSV')
  if(rows.some(r=>r.some(v=>/^[\s]*['=+@-]/.test(v)||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v))))
    throw Error('Unsafe spreadsheet cell')
  return rows
}
const decimal=(value,{zero=false}={})=>{
  if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value))throw Error('Invalid physical decimal')
  const number=Number(value)
  if(!Number.isFinite(number)||(!zero&&number<=0)||number>10000)throw Error('Out-of-range physical decimal')
  return number
}
const sourceMeta=(snapshot,ruleSet,sizes)=>[
  MARKER,ruleSet.templateFingerprint,revisionOf(snapshot),source(snapshot),rules(ruleSet),
  'DRAFT','NOT_FACTORY_APPROVED',JSON.stringify(sizes),'mm','',''
]

/** Source-pinned named-size POM specification exchange. This is draft data;
 * native grade-run commit, receiving CAD and factory approval are separate.
 * Source identity is carried once in a metadata row, not repeated 1536 times.
 */
export function exportNativeGradeNamedSizePomCsv20261028(snapshot,ruleSet,definitions){
  try{
    const sizes=sizesOf(ruleSet)
    if(!safeText(ruleSet.templateFingerprint)||!Array.isArray(definitions)||!definitions.length||
      definitions.length>64)throw Error('A valid nonempty POM inventory is required')
    const inspected=inspectNativeGradingPOM20261025(snapshot,ruleSet,definitions,{allowNamedSizes:true})
    if(inspected.reason||inspected.rows.length!==definitions.length*sizes.length||
      inspected.rows.some(row=>row.targetMm===null))
      throw Error(inspected.reason||'Every named size requires an explicitly authored target')
    const rows=[COLUMNS,sourceMeta(snapshot,ruleSet,sizes)]
    for(const definition of definitions){
      for(const size of sizes){
        rows.push([definition.id,definition.label,definition.panelId,definition.kind,
          definition.kind==='sewline-edge'?'':String(definition.fromPoint),
          definition.kind==='sewline-edge'?'':String(definition.toPoint),
          definition.kind==='sewline-edge'?definition.edge:'',size,'mm',
          String(definition.toleranceMm),String(definition.targetsMm[size])])
      }
    }
    const csv=rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n'
    if(new TextEncoder().encode(csv).byteLength>2_000_000)
      throw Error('Specification CSV exceeds 2 MB')
    return {ok:true,csv,rows:definitions.length*sizes.length,manufacturingApproved:false,nativeCommitted:false}
  }catch(error){return fail(String(error?.message||error))}
}

export function importNativeGradeNamedSizePomCsv20261028(csv,snapshot,ruleSet,originals=[]){
  try{
    const sizes=sizesOf(ruleSet)
    if(!Array.isArray(originals)||originals.length>64)throw Error('Invalid current POM inventory')
    const rows=parse(csv)
    if(JSON.stringify(rows.shift())!==JSON.stringify(COLUMNS))throw Error('Unsupported named-size CSV schema')
    const meta=rows.shift(),expected=sourceMeta(snapshot,ruleSet,sizes)
    if(JSON.stringify(meta)!==JSON.stringify(expected))
      throw Error('Stale source, grading rules, revision or size correspondence')
    if(!rows.length||rows.length%sizes.length!==0||rows.length>64*sizes.length)
      throw Error('Incomplete named-size target rows')
    const groups=new Map()
    for(const row of rows){
      const [id,label,panelId,kind,from,to,edge,size,unit,tol,target]=row
      if(!safeText(id)||!safeText(label)||!safeText(panelId)||!sizes.includes(size)||unit!=='mm')
        throw Error('Invalid POM identity or canonical size')
      if(!['anchor-distance','sewline-edge','sewline-path'].includes(kind))
        throw Error('Unsupported measurement station')
      if(kind==='sewline-edge'?(from!==''||to!==''||!safeText(edge)):
        (!/^(0|[1-9]\d*)$/.test(from)||!/^(0|[1-9]\d*)$/.test(to)||edge!==''))
        throw Error('Invalid POM station coordinates')
      decimal(tol,{zero:true});decimal(target)
      if(!groups.has(id))groups.set(id,[])
      if(groups.get(id).some(existing=>existing[7]===size))throw Error('Duplicate canonical size target')
      groups.get(id).push(row)
      if(groups.size>64)throw Error('Too many POM stations')
    }
    const definitions=[]
    for(const [id,group] of groups){
      if(group.length!==sizes.length||sizes.some(size=>!group.some(row=>row[7]===size)))
        throw Error('Missing canonical size target')
      const first=group[0]
      if(group.some(row=>row.some((value,index)=>index!==7&&index!==10&&value!==first[index])))
        throw Error('Conflicting POM metadata across canonical sizes')
      const made=createNativeGradingPOM20261025(snapshot,ruleSet,{
        panelId:first[2],kind:first[3],fromPoint:first[4]===''?undefined:Number(first[4]),
        toPoint:first[5]===''?undefined:Number(first[5]),edge:first[6],
        label:first[1],toleranceMm:Number(first[9]),
      })
      if(!made.ok)throw Error(made.reason)
      definitions.push({...made.definition,id,
        targetsMm:Object.fromEntries(sizes.map(size=>[size,Number(group.find(row=>row[7]===size)[10])]))})
    }
    if(originals.length){
      if(originals.length!==definitions.length)throw Error('Current POM station inventory changed')
      for(let i=0;i<originals.length;i++){
        const {targetsMm:oldTargets,...oldStation}=originals[i]
        const {targetsMm:newTargets,...newStation}=definitions[i]
        if(JSON.stringify(canonical(oldStation))!==JSON.stringify(canonical(newStation)))
          throw Error('Imported POM station differs from current authored station')
      }
    }
    const inspected=inspectNativeGradingPOM20261025(snapshot,ruleSet,definitions,{allowNamedSizes:true})
    if(inspected.reason||inspected.rows.length!==rows.length)
      throw Error(inspected.reason||'Invalid graded physical measurement source')
    return {ok:true,definitions,rows:rows.length,withinTolerance:inspected.verified,
      manufacturingApproved:false,nativeCommitted:false}
  }catch(error){return fail(String(error?.message||error))}
}
