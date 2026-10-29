import {validateSixSizeRegenerationPreview20261027 as validate} from './nativeSixSizePreviewValidator20261028.js'

const reject=reason=>Object.freeze({ok:false,reason,manufacturingApproved:false})
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value}
const identical=(a,b)=>JSON.stringify(a)===JSON.stringify(b)

/** All EXO six-size buttons share this source/preview/commit contract.
 * Rust alone calculates geometry and owns the transaction. The browser may
 * check receipts; it cannot generate authoritative graded point coordinates.
 * In particular, the UI cannot accept an opaque 'success' flag as proof that
 * every graded size and dependent piece was committed together.
 */
export function verifyNativeSixSizePreview20261028(source,overrides,preview){
  try{
    if(!Number.isSafeInteger(source?.revision)||source.revision<0||
      source?.gradeRunPersisted!==true||source?.nativePointBindings?.active!==true||
      source?.activeGradedSize!=null||source?.gradedSizePreview===true)
      throw Error('Six-size preview requires the native saved base garment and active point graph')
    if(!validate(preview,source.revision,overrides))
      throw Error('Native six-size preview does not validate all six sizes, cross-panel edits or measurement overrides')
    return freeze({ok:true,sourceRevision:source.revision,
      preview:structuredClone(preview),overrides:structuredClone(overrides),
      manufacturingApproved:false})
  }catch(error){return reject(error?.message??String(error))}
}

export function verifyNativeSixSizeCommit20261028(source,review,committed){
  try{
    if(review?.ok!==true||!Number.isSafeInteger(review.sourceRevision)||
      review.sourceRevision!==source?.revision)
      throw Error('Six-size commit has no current approved read-only native preview')
    if(!committed?.template||!Array.isArray(committed.template.panels)||
      committed.revision!==review.sourceRevision+1||
      committed.gradeRunPersisted!==true||committed.nativePointBindings?.active!==true||
      committed.activeGradedSize!=null||committed.gradedSizePreview===true)
      throw Error('Native six-size commit did not return one complete base-size and graded-catalog revision')
    if(!validate(committed.regenerationEvidence,review.sourceRevision,review.overrides)||
      !identical(committed.regenerationEvidence,review.preview))
      throw Error('Native six-size commit evidence differs from reviewed Rust preview')
    if(committed.manufacturingApproved!==false)
      throw Error('Unqualified six-size command unexpectedly claims manufacturing approval')
    return freeze({ok:true,sourceRevision:review.sourceRevision,
      committedRevision:committed.revision,
      changedPanels:review.preview.changedPanels,
      changedBindings:review.preview.changedBindings,
      sizes:Object.freeze([...review.preview.bySize.map(row=>row.size)]),
      nativeEvidenceVerified:true,oneUndoRevision:true,
      manufacturingApproved:false,
      note:'Native Rust preview/commit evidence and six-size catalog status verified. Production qualification and licensed interchange remain separate.'})
  }catch(error){return reject(error?.message??String(error))}
}
