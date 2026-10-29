/** Read-only EXO2D inventory baseline experiment.
 * Detects disappearance of authored notch IDs from source after the baseline
 * was approved and stored separately. NOT a factory release gate or signature.
 */
const validId = id => typeof id === 'string' && id.trim().length > 0

function inventory(project) {
  const errors = []
  const add = (code, pieceId = 'project', notchId = 'notch-set') => errors.push({
    severity: 'blocker', code, pieceId, notchId,
  })
  const sizes = project?.grading?.sizes
  if (!Array.isArray(sizes) || !sizes.length || sizes.some(s => !validId(s)) ||
      new Set(sizes).size !== sizes.length || !sizes.includes(project?.grading?.baseSize)) {
    add('INVALID_SIZE_RUN')
  }
  if (!Array.isArray(project?.pieces)) add('INVALID_PIECES')
  const pieces = []
  const seenPieces = new Set()
  for (const piece of Array.isArray(project?.pieces) ? project.pieces : []) {
    const pieceId = piece?.id
    if (!validId(pieceId) || seenPieces.has(pieceId)) {
      add('INVALID_OR_DUPLICATE_PIECE_ID', String(pieceId))
      continue
    }
    seenPieces.add(pieceId)
    if (piece.notches != null && !Array.isArray(piece.notches)) {
      add('INVALID_NOTCH_COLLECTION', pieceId)
      continue
    }
    const seenNotches = new Set()
    const notches = []
    for (const notch of piece.notches || []) {
      const id = notch?.id
      if (!validId(id) || seenNotches.has(id)) {
        add('INVALID_OR_DUPLICATE_NOTCH_ID', pieceId, String(id))
        continue
      }
      seenNotches.add(id)
      notches.push(id)
    }
    pieces.push({pieceId, notchIds: notches.sort()})
  }
  pieces.sort((a, b) => a.pieceId.localeCompare(b.pieceId))
  return {pieces, errors, sizes: Array.isArray(sizes) ? [...sizes] : [], baseSize: project?.grading?.baseSize}
}

export function createAuthoredNotchInventoryBaseline20261023(project) {
  const current = inventory(project)
  if (!current.errors.length && !current.pieces.some(row => row.notchIds.length)) {
    current.errors.push({severity:'blocker', code:'EMPTY_AUTHORED_NOTCH_INVENTORY',pieceId:'project',notchId:'notch-set'})
  }
  if (current.errors.length) return {
    status: 'blocked', issues: current.errors, baseline: null,
    factoryCertified: false, factoryCuttingAuthorized: false,
  }
  return {
    status: 'captured', issues: [],
    baseline: {
      schema: 'exo2d-authored-notch-inventory-study.v1',
      baseSize: current.baseSize,
      sizes: current.sizes,
      pieces: current.pieces,
      // This is not a signature or an approval. Caller must independently
      // store and review the baseline before using it for release comparison.
      approved: false,
    },
    factoryCertified: false, factoryCuttingAuthorized: false,
  }
}

export function compareAuthoredNotchInventoryBaseline20261023(project, baseline) {
  const current = inventory(project)
  const issues = [...current.errors]
  const add = (code, pieceId = 'project', notchId = 'notch-set') => issues.push({
    severity: 'blocker', code, pieceId, notchId,
  })
  if (baseline?.schema !== 'exo2d-authored-notch-inventory-study.v1' ||
      !Array.isArray(baseline?.pieces) || !Array.isArray(baseline?.sizes) ||
      !validId(baseline?.baseSize) || baseline?.approved !== false) {
    add('INVALID_OR_UNVERIFIED_BASELINE')
    return result()
  }
  if (!baseline.pieces.some(row => Array.isArray(row?.notchIds) && row.notchIds.length)) {
    add('EMPTY_BASELINE_NOTCH_INVENTORY')
  }
  if (baseline.sizes.length !== current.sizes.length ||
      baseline.sizes.some((size, index) => size !== current.sizes[index]) ||
      baseline.baseSize !== current.baseSize) add('SIZE_RUN_CHANGED')
  const expected = new Map()
  for (const row of baseline.pieces) {
    if (!validId(row?.pieceId) || expected.has(row.pieceId) || !Array.isArray(row.notchIds) ||
        row.notchIds.some(id => !validId(id)) || new Set(row.notchIds).size !== row.notchIds.length) {
      add('INVALID_BASELINE_PIECE', String(row?.pieceId))
      continue
    }
    expected.set(row.pieceId, new Set(row.notchIds))
  }
  const observed = new Map(current.pieces.map(row => [row.pieceId, new Set(row.notchIds)]))
  for (const [pieceId, notchIds] of expected) {
    if (!observed.has(pieceId)) { add('AUTHORED_PIECE_MISSING', pieceId); continue }
    for (const notchId of notchIds) if (!observed.get(pieceId).has(notchId)) {
      add('AUTHORED_NOTCH_MISSING', pieceId, notchId)
    }
  }
  for (const [pieceId, notchIds] of observed) {
    if (!expected.has(pieceId)) { add('UNREVIEWED_PIECE_ADDED', pieceId); continue }
    for (const notchId of notchIds) if (!expected.get(pieceId).has(notchId)) {
      add('UNREVIEWED_NOTCH_ADDED', pieceId, notchId)
    }
  }
  return result()
  function result() { return {
    schema: 'exo2d-authored-notch-inventory-comparison-study.v1',
    status: issues.length ? 'blocked' : 'identity_match_only',
    issues, blockers: issues.length,
    factoryCertified: false, factoryCuttingAuthorized: false,
    disclaimer: 'Experimental source identity comparison only. The baseline is not authenticated; does not validate physical notch geometry, graded size results, external CAD or a sample.',
  } }
}
