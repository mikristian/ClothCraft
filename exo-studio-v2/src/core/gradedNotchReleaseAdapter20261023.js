import {createGradedNotchCanonicalView} from './gradedNotchCanonicalView20261023.js'

const STATUS = 'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED'

/** Post-grading, atomic read-only study view. Never repairs malformed notch metadata. */
export function createGradedNotchReleaseAdapter20261023(gradedProjectOrPiece, {size} = {}) {
  if (!gradedProjectOrPiece || typeof gradedProjectOrPiece !== 'object' || Array.isArray(gradedProjectOrPiece)) {
    throw new TypeError('An already graded project or piece is required')
  }
  const project = Array.isArray(gradedProjectOrPiece.pieces)
  const actualSize = project ? gradedProjectOrPiece.previewSize : gradedProjectOrPiece.gradeSize
  if (size != null && (typeof size !== 'string' || !size.trim() || (actualSize != null && size !== actualSize))) {
    throw new RangeError('Requested size does not match the graded snapshot')
  }
  const selectedSize = size ?? actualSize ?? null
  if (project && selectedSize != null && Array.isArray(gradedProjectOrPiece.grading?.sizes) &&
    !gradedProjectOrPiece.grading.sizes.includes(selectedSize)) {
    throw new RangeError('Graded snapshot size is absent from the grading size run')
  }

  // Canonicalizer checks duplicate identities, physical edge stations and cache integrity.
  // Failure aborts the whole adapter without producing a partially repaired document.
  const {view} = createGradedNotchCanonicalView(gradedProjectOrPiece)
  const provenance = {
    ...view.gradeProvenance,
    status: STATUS, source: 'graded-notch-canonical-view-20261023',
    sourceProjectId: gradedProjectOrPiece.id ?? null,
    snapshotSize: selectedSize,
    referenceOnly: true, approved: false, factoryCertified: false,
  }
  view.gradeProvenance = provenance
  view.patternSource = {...view.patternSource,referenceOnly:true,developmentCandidate:true}
  const pieces = project ? view.pieces : [view]
  for (const piece of pieces) {
    piece.patternImportProvenance = {...piece.patternImportProvenance,referenceOnly:true}
    piece.factoryCertified = false
    piece.factoryCuttingAuthorized = false
  }
  return {
    schema:'exo-graded-notch-release-adapter.v1',
    view, status:STATUS, size:selectedSize,
    sourcePreserved:true, factoryCertified:false,
    factoryCuttingAuthorized:false, bulkProductionAuthorized:false,
    disclaimer:'Development-only repaired notch cache. All manufacturing, physical sample and external CAD acceptance blockers remain in effect.',
  }
}
