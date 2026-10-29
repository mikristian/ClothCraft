/** Development-only signed source IDENTITY snapshot experiment. Never grants factory approval.
 * Signing a contour with duplicate points, zero area, self-intersections, or
 * other invalid physical geometry only authenticates its bytes/identity;
 * neither drafting nor verification validates physical contour geometry.
 * The verifier's trusted key and fingerprint must be configured and pinned independently.
 * Graded per-size geometry and generated DXF geometry are OUTSIDE this boundary.
 */
import { createHash, createPublicKey, verify as verifyEd25519 } from 'node:crypto'

const SCHEMA = 'exo2d-signed-authored-notch-geometry-study.v1'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const id = s => typeof s === 'string' && !!s.trim() && s === s.trim()
const ownKeys = (v, keys) => Object.keys(v).sort().join('|') === [...keys].sort().join('|')
const fail = message => { throw new TypeError(message) }

// Exact JSON domain: no undefined, sparse arrays, nonfinite numbers, prototypes,
// cyclic references, accessor properties, or ambiguous object key ordering.
function normalize(value, stack = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail('NONCANONICAL_NUMBER')
    return value
  }
  if (typeof value !== 'object' || stack.has(value)) fail('UNSUPPORTED_OR_CYCLIC_VALUE')
  stack.add(value)
  const desc = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(value).some(k => typeof k !== 'string' ||
      (k !== 'length' && (!desc[k].enumerable || !Object.hasOwn(desc[k], 'value')))))
    fail('HIDDEN_SYMBOL_OR_ACCESSOR_PROPERTY')
  let out
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length ||
        Object.keys(desc).some(k => k !== 'length' && !/^(0|[1-9]\d*)$/.test(k))) fail('SPARSE_OR_DECORATED_ARRAY')
    out = Array.from({length:value.length}, (_, i) => {
      if (!Object.hasOwn(desc, i) || !Object.hasOwn(desc[i], 'value')) fail('ARRAY_ACCESSOR_OR_HOLE')
      return normalize(desc[i].value, stack)
    })
  } else {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
      fail('NONPLAIN_OBJECT')
    out = {}
    for (const key of Object.keys(desc).sort()) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype' ||
          !Object.hasOwn(desc[key], 'value')) fail('UNSAFE_OR_ACCESSOR_KEY')
      out[key] = normalize(desc[key].value, stack)
    }
  }
  stack.delete(value)
  return out
}
const canonical = value => JSON.stringify(normalize(value))

function capture(project, sourceRevision) {
  if (!id(sourceRevision)) fail('SOURCE_REVISION_REQUIRED')
  if (!project || !Array.isArray(project.pieces) || !project.pieces.length) fail('PIECES_REQUIRED')
  const grading = project.grading
  if (!grading || !Array.isArray(grading.sizes) || !grading.sizes.length ||
      grading.sizes.some(s => !id(s)) || new Set(grading.sizes).size !== grading.sizes.length ||
      !id(grading.baseSize) || !grading.sizes.includes(grading.baseSize)) fail('INVALID_SIZE_RUN')
  const pieceIds = new Set()
  let count = 0
  const pieces = project.pieces.map(piece => {
    if (!piece || !id(piece.id) || pieceIds.has(piece.id)) fail('DUPLICATE_OR_INVALID_PIECE_ID')
    // Check all own fields before destructuring; hidden fields and accessors
    // must not silently escape the signed source-piece/notch digest.
    normalize(piece)
    pieceIds.add(piece.id)
    if (!Array.isArray(piece.points) || piece.points.length < 3 ||
        piece.points.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)))
      fail('INVALID_PIECE_GEOMETRY')
    if (piece.notches != null && !Array.isArray(piece.notches)) fail('INVALID_NOTCH_COLLECTION')
    const notchIds = new Set()
    const notches = (piece.notches || []).map(n => {
      if (!n || !id(n.id) || notchIds.has(n.id)) fail('DUPLICATE_OR_INVALID_NOTCH_ID')
      notchIds.add(n.id)
      if (!Number.isInteger(n.edgeIndex) || n.edgeIndex < 0 || n.edgeIndex >= piece.points.length ||
          (n.t != null && (typeof n.t !== 'number' || !Number.isFinite(n.t) || n.t < 0 || n.t > 1)) ||
          (n.type != null && n.type !== 'single' && n.type !== 'double'))
        fail('INVALID_NOTCH_STATION_OR_TYPE')
      if (n.depth != null && (typeof n.depth !== 'number' || !Number.isFinite(n.depth) || n.depth <= 0))
        fail('INVALID_NOTCH_DEPTH')
      if (n.depthCm != null && (typeof n.depthCm !== 'number' || !Number.isFinite(n.depthCm) || n.depthCm <= 0))
        fail('INVALID_NOTCH_DEPTH_CM')
      count++
      // Effective defaults match standalone notch handling. Raw source digest
      // separately binds presence/absence and every other authored field.
      return {id:n.id, edgeIndex:n.edgeIndex, t:n.t ?? 0.5, type:n.type ?? 'single',
        depthCm:n.depthCm ?? 0.45, sourceNotchSha256:hash(canonical(n)),
        ...(n.depth == null ? {} : {depth:n.depth})}
    }).sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    // Include ALL authored piece fields (except notches) in the digest.
    // Conservative changes to metadata/cache also invalidate this experiment.
    const {notches:ignored, ...sourcePiece} = piece
    return {pieceId:piece.id, notches, sourcePieceSha256:hash(canonical(sourcePiece))}
  }).sort((a,b) => a.pieceId < b.pieceId ? -1 : a.pieceId > b.pieceId ? 1 : 0)
  if (!count) fail('EMPTY_NOTCH_INVENTORY')
  return {schema:SCHEMA, sourceRevision, baseSize:grading.baseSize,
    sizes:[...grading.sizes], pieces,
    boundary:'AUTHORED_SOURCE_ONLY_NO_GRADED_SIZE_GEOMETRY'}
}

function strictManifest(m) {
  if (!m || typeof m !== 'object' ||
      !ownKeys(m,['schema','sourceRevision','baseSize','sizes','pieces','boundary']) ||
      m.schema !== SCHEMA || m.boundary !== 'AUTHORED_SOURCE_ONLY_NO_GRADED_SIZE_GEOMETRY')
    fail('INVALID_MANIFEST_SCHEMA')
  // Comparison to a fresh capture checks all domain constraints and exact keys.
  canonical(m)
}

export function createApprovedNotchGeometryDraft20261023(project, sourceRevision) {
  try {
    const manifest = capture(project, sourceRevision)
    const payload = canonical(manifest)
    return {status:'draft_for_external_review', manifest, payload,
      sha256:hash(payload), factoryCertified:false, factoryCuttingAuthorized:false,
      gradedGeometryIncluded:false, physicalGeometryValidated:false,
      limitation:'SOURCE IDENTITY ONLY. A signed source snapshot may contain zero-area, collinear, duplicate-point, or self-intersecting (bowtie) contours. No physical geometry validation, per-size graded geometry, DXF verification, or manufacturing approval.'}
  } catch (error) {
    return {status:'blocked', issues:[String(error.message)], manifest:null,
      factoryCertified:false, factoryCuttingAuthorized:false, gradedGeometryIncluded:false,
      physicalGeometryValidated:false}
  }
}

/** trustedKeyConfig must be independently provisioned {publicKey, pinnedSpkiSha256}.
 * Supplying both alongside a signature does NOT establish independent trust.
 */
export function verifyApprovedNotchGeometry20261023(project, sourceRevision, approval, trustedKeyConfig) {
  const issues = []
  const draft = createApprovedNotchGeometryDraft20261023(project, sourceRevision)
  if (!draft.manifest) issues.push(...draft.issues)
  let payload
  try {
    strictManifest(approval?.manifest)
    payload = canonical(approval.manifest)
    if (payload !== draft.payload) issues.push('SOURCE_NOTCH_GEOMETRY_OR_REVISION_CHANGED')
    if (typeof approval.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(approval.sha256) ||
        approval.sha256 !== hash(payload)) issues.push('MANIFEST_DIGEST_MISMATCH')
    if (typeof approval.signatureBase64 !== 'string' ||
        !/^[A-Za-z0-9+/]{86}==$/.test(approval.signatureBase64) ||
        Buffer.from(approval.signatureBase64, 'base64').toString('base64') !== approval.signatureBase64)
      issues.push('INVALID_ED25519_SIGNATURE_ENCODING')
  } catch (error) { issues.push(String(error.message)) }
  try {
    if (!trustedKeyConfig || typeof trustedKeyConfig.pinnedSpkiSha256 !== 'string' ||
        !/^[a-f0-9]{64}$/.test(trustedKeyConfig.pinnedSpkiSha256) ||
        !trustedKeyConfig.publicKey) fail('INDEPENDENT_PINNED_KEY_REQUIRED')
    const supplied = trustedKeyConfig.publicKey
    const key = supplied?.type === 'public' ? supplied : createPublicKey(supplied)
    if (key.asymmetricKeyType !== 'ed25519') fail('ED25519_KEY_REQUIRED')
    if (hash(key.export({format:'der',type:'spki'})) !== trustedKeyConfig.pinnedSpkiSha256)
      fail('TRUSTED_KEY_FINGERPRINT_MISMATCH')
    if (payload && !issues.length &&
        !verifyEd25519(null, Buffer.from(payload), key, Buffer.from(approval.signatureBase64,'base64')))
      issues.push('SIGNATURE_INVALID')
  } catch (error) { issues.push(String(error.message)) }
  return {status:issues.length ? 'blocked' : 'authenticated_authored_source_snapshot_only',
    issues, blockers:issues.length, factoryCertified:false, factoryCuttingAuthorized:false,
    bulkProductionAuthorized:false, gradedGeometryIncluded:false,
    physicalGeometryValidated:false,
    limitation:'SOURCE IDENTITY ONLY. Signatures can authenticate zero-area, collinear, duplicate-point, or self-intersecting (bowtie) contours without validating physical geometry. No contour topology/area QA, per-size graded geometry, DXF validation, manufacturing approval, or factory certification. Trust additionally requires an independently pinned approver key and independently evidenced source revision.'}
}
