import {inspectNativeGradingWorkflow20261025} from './nativeGradingWorkflowReadiness20261025.js'
import {inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'
import {inspectNativeGradingPhysicalSampleReview20261026} from './nativeGradingPhysicalSampleReview20261026.js'
const canonical=value=>Array.isArray(value)?value.map(canonical):
  value&&typeof value==='object'?
    Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value
const SIZES=['XS','S','M','L','XL','XXL']
const exactSizes=value=>Array.isArray(value)&&value.length===SIZES.length&&
  SIZES.every((size,index)=>value[index]===size)
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
// Manufacturing evidence must explicitly bind the *complete* editable size
// rules. The legacy template fingerprint is unchanged by grade-offset edits.
const rulesPinned=(proof,ruleSet)=>proof?.sourceRuleSet!=null&&
  ruleSet!=null&&same(proof.sourceRuleSet,ruleSet)
const pinned=(proof,snapshot,ruleSet)=>proof?.sourceRevision!=null&&
  snapshot?.revision!=null&&proof.sourceRevision===snapshot.revision&&
  typeof ruleSet?.templateFingerprint==='string'&&ruleSet.templateFingerprint.length>0&&
  proof.templateFingerprint===ruleSet.templateFingerprint&&
  // The legacy rule fingerprint omits sewn seams, notches, and allowances.
  // Source evidence must pin the full template without changing old sidecars.
  proof.sourceTemplate!=null&&same(proof.sourceTemplate,snapshot?.template)&&
  rulesPinned(proof,ruleSet)

/**
 * Strictly separate source-level grading QA, native garment persistence and
 * industrial receiving-CAD verification. A vendor-ready production release
 * is NOT available until all authoritative backends are implemented.
 */
export function inspectNativeGradingReleaseGate20261025(snapshot,ruleSet,pomDefinitions=[],{
  nativeCatalog=null,gradedCutProof=null,receivingCadProof=null,physicalSampleObservations=null,
}={}){
  const source=inspectNativeGradingWorkflow20261025(snapshot,ruleSet)
  const pom=inspectNativeGradingPOM20261025(snapshot,ruleSet,pomDefinitions)
  const physicalSamples=inspectNativeGradingPhysicalSampleReview20261026(
    snapshot,ruleSet,pomDefinitions,physicalSampleObservations)
  const catalog=Boolean(nativeCatalog?.ok===true&&nativeCatalog?.persisted===true&&
    nativeCatalog?.authoritativeRust===true&&nativeCatalog?.independentlyVerified===true&&
    typeof nativeCatalog?.evidenceId==='string'&&nativeCatalog.evidenceId.length>0&&
    pinned(nativeCatalog,snapshot,ruleSet)&&same(nativeCatalog.pomSpecs,pomDefinitions)&&
    exactSizes(nativeCatalog.sizes)&&exactSizes(ruleSet?.sizes))
  // CURRENT Rust CUT AAMA study alone never satisfies an all-size proof.
  // Only a future authoritative, revision-pinned, per-size physical validator
  // and separately acknowledged receiving-CAD report may pass these gates.
  const allSizeCut=gradedCutProof?.authoritativeRust===true&&
    gradedCutProof?.independentlyVerified===true&&
    typeof gradedCutProof?.evidenceId==='string'&&gradedCutProof.evidenceId.length>0&&
    pinned(gradedCutProof,snapshot,ruleSet)&&
    gradedCutProof?.approvedForSizing===true&&
    gradedCutProof?.cutlinesVerified===true&&gradedCutProof?.allowancesVerified===true&&
    gradedCutProof?.notchesVerified===true&&exactSizes(gradedCutProof?.verifiedSizes)
  const receivingCad=receivingCadProof?.verified===true&&
    receivingCadProof?.independentReceiver===true&&
    receivingCadProof?.independentlyVerified===true&&
    typeof receivingCadProof?.evidenceId==='string'&&receivingCadProof.evidenceId.length>0&&
    receivingCadProof.evidenceId!==gradedCutProof?.evidenceId&&
    pinned(receivingCadProof,snapshot,ruleSet)&&
    receivingCadProof?.appliesToAllSizes===true&&exactSizes(receivingCadProof?.verifiedSizes)
  const checks=[
    {id:'geometry',label:'All-size physical contour and curve QA',ok:source.previewReady},
    {id:'seams',label:'Linked sewn relationships across six sizes',ok:source.sewingReady},
    {id:'pom',label:'Named POM targets within tolerance',ok:pom.verified},
    {id:'native',label:'Independently verified native Rust graded catalog persisted and revision-linked',ok:catalog},
    {id:'cut',label:'Actual CUT plus allowances and notches for every size',ok:Boolean(allSizeCut)},
    {id:'cad',label:'Independent receiving-CAD round-trip approval',ok:Boolean(receivingCad)},
    // Successfully importing operator-filled measurements does not establish
    // that specimens were produced, measured or signed by an independent lab.
    // Await a trusted authenticated external audit rather than interpreting
    // self-reported booleans or POM matches as physical approval.
    {id:'sample',label:'Independent signed six-size sewn-sample inspection',ok:false},
  ]
  const blockers=checks.filter(check=>!check.ok).map(check=>check.label)
  return {
    ok:false,blocks:blockers.length,checks,blockers,
    source,measurement:pom,physicalSamples,manufacturingApproved:false,
    // An audited set of checks is not a certification or cutting license.
    cuttingAuthorized:false,manufacturerReady:false,
  }
}
