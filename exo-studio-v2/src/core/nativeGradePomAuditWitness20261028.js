import {verifyNativeGradeCatalog20261025} from './nativeGradeCatalogBridge20261025.js'
import {inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'

const fail=reason=>({ok:false,reason,nativeNumericalAccepted:false,
  manufacturingApproved:false,factoryApproved:false})
const finite=value=>typeof value==='number'&&Number.isFinite(value)
const close=(a,b,tolerance=1e-6)=>finite(a)&&finite(b)&&Math.abs(a-b)<=tolerance
const same=(a,b)=>a===b||a!==null&&b!==null&&typeof a==='object'&&
  typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&
  Object.keys(a).length===Object.keys(b).length&&
  Object.keys(a).every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]))

/** Verify a REAL native grade-run-pom-audit response against the exact
 * persisted Rust catalog and an independently compiled JS physical size run.
 *
 * This verifies evidence, not production fitness. A numerically out-of-
 * tolerance or unset authored specification remains an authentic saved draft,
 * but is NEVER an accepted physical POM run. A forged/missing/stale native
 * witness is rejected rather than inferred from a browser status badge.
 */
export function verifyNativeGradePomAuditWitness20261028({
  snapshot,ruleSet,status,audit,definitions,
}={}){
  try{
    const sizes=ruleSet?.sizes
    if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||
      !Array.isArray(definitions)||!definitions.length||definitions.length>64)
      return fail('Expected a bounded authored named-size POM run')
    const catalog=verifyNativeGradeCatalog20261025(snapshot,ruleSet,status,{
      durablySaved:true,pomDefinitions:definitions,
    })
    if(!catalog.ok)return fail('Saved Rust grading source is not current: '+catalog.reason)
    const expected=inspectNativeGradingPOM20261025(snapshot,ruleSet,definitions,{
      allowNamedSizes:true,
    })
    if(expected.reason||expected.rows.length!==sizes.length*definitions.length)
      return fail('Independent graded POM measurement failed: '+(expected.reason||'incomplete run'))
    if(audit?.format!=='exo-native-named-grade-pom-audit.v2'||
      audit.schemaVersion!==2||audit.source!=='persisted-native-grade-run'||
      audit.units!=='mm'||audit.factoryApproved!==false||
      audit.sizeCount!==sizes.length||audit.pomCount!==definitions.length||
      audit.total!==expected.rows.length||!Array.isArray(audit.rows)||
      audit.rows.length!==expected.rows.length||!Array.isArray(audit.blockers))
      return fail('Missing or incompatible native named-size numerical audit')
    let passed=0,failed=0,unscored=0
    const expectedBlockerPrefixes=[]
    for(let index=0;index<expected.rows.length;index++){
      const local=expected.rows[index],native=audit.rows[index]
      const authored=definitions[Math.floor(index/sizes.length)]
      if(!native||native.pomId!==local.id||native.label!==local.label||
        native.panelId!==local.panelId||native.kind!==local.kind||
        native.size!==local.size||native.scored!==(local.targetMm!==null)||
        !close(native.toleranceMm,local.toleranceMm)||
        !close(native.measuredMm,local.actualMm,0.25)||
        !same(native.targetMm,local.targetMm)||
        !same(authored.targetsMm[local.size],local.targetMm))
        return fail('Native POM source/physical row mismatch at '+index+' ('+local.id+' '+local.size+')')
      if(local.targetMm===null){
        if(native.deltaMm!==null||native.withinTolerance!==null) 
          return fail('Unset POM target was scored as a physical acceptance')
        unscored++
        expectedBlockerPrefixes.push('POM '+local.id+' size '+local.size+' has no authored target')
      }else{
        if(!close(native.deltaMm,native.measuredMm-native.targetMm)||
          native.withinTolerance!==(Math.abs(native.deltaMm)<=native.toleranceMm))
          return fail('Native POM delta or tolerance witness was forged')
        // Refuse disagreement between the independent geometry kernel and
        // native numerical QA at the physical acceptance boundary.
        if(native.withinTolerance!==local.pass)
          return fail('Native and independent graded POM tolerance results disagree')
        if(native.withinTolerance)passed++
        else {
          failed++
          expectedBlockerPrefixes.push('POM '+local.id+' size '+local.size+' exceeds tolerance:')
        }
      }
    }
    const complete=failed===0&&unscored===0
    if(audit.scored!==passed+failed||audit.passed!==passed||
      audit.failed!==failed||audit.unscored!==unscored||
      audit.numericalAcceptanceComplete!==complete||
      audit.acceptanceComplete!==complete||
      audit.blockers.length!==expectedBlockerPrefixes.length||
      audit.blockers.some((blocker,index)=>typeof blocker!=='string'||
        !blocker.startsWith(expectedBlockerPrefixes[index])))
      return fail('Native POM totals, blockers or acceptance flags are inconsistent')
    return {ok:true,nativeNumericalAccepted:complete,
      nativeRowsVerified:expected.rows.length,passed,failed,unscored,
      sourceRevision:snapshot.revision,canonicalSizes:[...sizes],
      manufacturingApproved:false,factoryApproved:false}
  }catch(error){return fail('Native POM witness rejected: '+String(error?.message||error))}
}
