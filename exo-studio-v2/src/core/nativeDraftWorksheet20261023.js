import {evaluateNativeDraftFormulas20261023} from './nativeParametricFormula20261023.js'

// Read-only worksheet. It is never imported as a native grade rule or
// executed as JS, never written into the Rust source polygon schema.
const NAME=/^[A-Za-z_][A-Za-z0-9_]{0,63}$/
const blocked=new Set(['constructor','prototype','__proto__'])
const NUMERIC=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

export function evaluateNativeDraftWorksheet20261023({worksheet='',expression=''}={}){
  try{
    if(typeof worksheet!=='string'||worksheet.length>16384)throw Error('Worksheet must be text under 16 KB')
    if(typeof expression!=='string'||expression.length>4096||!expression.trim())throw Error('Enter a distance formula')
    const rows=worksheet.split(/\r?\n/)
    if(rows.length>128)throw Error('Worksheet may contain no more than 128 lines')
    const measurements=Object.create(null)
    let count=0
    for(let i=0;i<rows.length;i++){
      const line=rows[i].trim()
      if(!line||line.startsWith('#'))continue
      const equal=line.indexOf('=')
      if(equal<0||equal!==line.lastIndexOf('='))throw Error(`Worksheet line ${i+1} must use name = arithmetic expression`)
      const name=line.slice(0,equal).trim(),formula=line.slice(equal+1).trim()
      if(!NAME.test(name)||blocked.has(name)||name==='_distance')throw Error(`Worksheet line ${i+1} has an invalid or reserved name`)
      if(Object.hasOwn(measurements,name))throw Error(`Worksheet line ${i+1} duplicates ${name}`)
      if(!formula)throw Error(`Worksheet line ${i+1} has no arithmetic expression`)
      measurements[name]=NUMERIC.test(formula)?Number(formula):{formula}
      if(++count>64)throw Error('Worksheet supports up to 64 named measurements')
    }
    // Reserve _distance for the target expression. Results, including errors,
    // come from the checked dependency-order parser; there is no eval path.
    measurements._distance={formula:expression}
    const resolved=evaluateNativeDraftFormulas20261023({measurements})
    if(!resolved.ok)throw Error(resolved.reason)
    const valueMm=resolved.valuesMm._distance
    if(!Number.isFinite(valueMm)||Math.abs(valueMm)>5000)throw Error('Resulting distance must be within ±5000 mm')
    return {ok:true,valueMm,valuesMm:resolved.valuesMm,
      dependencyOrder:resolved.dependencyOrder,manufacturingApproved:false,
      source:'FORMULA_DISTANCE_PROPOSAL_NOT_PERSISTENT_CONSTRAINT'}
  }catch(error){return {ok:false,reason:error?.message||String(error),manufacturingApproved:false}}
}
