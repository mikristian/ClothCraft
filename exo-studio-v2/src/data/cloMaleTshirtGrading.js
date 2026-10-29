/**
 * The imported CLO neck trims have no authored graded-size specifications.
 * Their ~1.6 cm height is smaller than the generic vertical grade delta at
 * XS, which reverses winding. Source-lock their individual coordinates until
 * an approved trim-specific grade table is supplied by a patternmaker.
 * All other garment pieces continue through normal grading.
 */
export const CLO_MALE_TSHIRT_SOURCE_LOCKED_TRIMS = Object.freeze([
  'clo-neck-a', 'clo-neck-b', 'clo-neck-c',
])

export function applyCloMaleTshirtNeckGradePolicy(project) {
  const locked = new Set(CLO_MALE_TSHIRT_SOURCE_LOCKED_TRIMS)
  for (const piece of project.pieces || []) {
    if (!locked.has(piece.id)) continue
    for (const point of piece.points || []) {
      if (point.industrialGradeRule || point.gradeRule?.enabled) {
        throw new Error(`Source-locked CLO trim has an existing authored grade rule: ${piece.id}`)
      }
      // The current grading engine already treats an enabled per-vertex grade
      // rule as an explicit coordinate displacement rather than auto grading.
      point.gradeRule = { enabled: true, dxPerSize: 0, dyPerSize: 0 }
    }
  }
  project.gradeProvenance = {
    source: 'imported-clo-male-tshirt-reference',
    status: 'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED',
    neckTrimPolicy: 'source-coordinates-locked-all-sizes',
    neckTrimPieceIds: [...CLO_MALE_TSHIRT_SOURCE_LOCKED_TRIMS],
    rationale: 'No manufacturer-approved trim grading rules supplied; automatic grading inverts XS neck panels.',
  }
  return project
}
