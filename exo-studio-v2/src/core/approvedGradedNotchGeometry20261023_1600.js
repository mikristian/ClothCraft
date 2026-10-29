/** Development-only all-size graded geometry IDENTITY. No physical QA, DXF validation,
 * manufacturing release, factory certification, or approval is conferred by any result.
 * An independently provisioned Ed25519 public key and SPKI pin are mandatory.
 */
import {createHash, createPublicKey, verify as cryptoVerify} from 'node:crypto'
import {gradeProject} from './grading.js'

const SCHEMA = 'exo2d-graded-notch-geometry-identity-study.20261023.v1'
const sha = data => createHash('sha256').update(data).digest('hex')
const fail = code => { throw new TypeError(code) }
const goodId = s => typeof s === 'string' && !!s.trim() && s.trim() === s && s.length <= 256
const LIMIT = 2_000_000

function clean(value, active = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value,-0)) fail('NONCANONICAL_NUMBER')
    return value
  }
  if (!value || typeof value !== 'object' || active.has(value)) fail('UNSUPPORTED_OR_CYCLIC_VALUE')
  const desc = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(value).some(k => typeof k !== 'string' ||
      (k !== 'length' && (!desc[k].enumerable || !Object.hasOwn(desc[k],'value')))))
    fail('HIDDEN_SYMBOL_OR_ACCESSOR_PROPERTY')
  active.add(value)
  let out
  if (Array.isArray(value)) {
    if (value.length > 50000 || Object.keys(value).length !== value.length ||
        Object.keys(desc).some(k => k !== 'length' && !/^(0|[1-9]\d*)$/.test(k))) fail('SPARSE_OR_DECORATED_ARRAY')
    out = Array.from({length:value.length}, (_,i) => {
      if (!Object.hasOwn(desc,i) || !Object.hasOwn(desc[i],'value')) fail('ARRAY_HOLE_OR_ACCESSOR')
      return clean(desc[i].value,active)
    })
  } else {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
      fail('NONPLAIN_OBJECT')
    out = Object.create(null)
    for (const k of Object.keys(desc).sort()) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype' ||
          !Object.hasOwn(desc[k],'value')) fail('UNSAFE_OR_ACCESSOR_KEY')
      out[k] = clean(desc[k].value,active)
    }
  }
  active.delete(value)
  return out
}
function canonical(x) {
  const json = JSON.stringify(clean(x))
  if (Buffer.byteLength(json) > LIMIT) fail('IDENTITY_PAYLOAD_TOO_LARGE')
  return json
}
// gradeProject legitimately emits curves:undefined for straight-edge pieces.
// Normalize only this known optional DERIVED field; authored source remains strict.
function cleanDerivedGraded(graded) {
  if (!graded || !Array.isArray(graded.pieces)) fail('INVALID_GRADED_RESULT')
  const pieces = graded.pieces.map(piece => {
    if (!piece || typeof piece !== 'object') fail('INVALID_GRADED_PIECE')
    const descriptors = Object.getOwnPropertyDescriptors(piece)
    if (Object.hasOwn(descriptors,'curves') &&
        Object.hasOwn(descriptors.curves,'value') && descriptors.curves.value === undefined &&
        descriptors.curves.enumerable) {
      const copy = {...piece}
      delete copy.curves
      return copy
    }
    return piece
  })
  return clean({...graded,pieces})
}
function inspectPieces(pieces, label) {
  if (!Array.isArray(pieces) || !pieces.length || pieces.length > 100) fail('INVALID_PIECE_SET')
  const ids = new Set()
  return pieces.map(piece => {
    if (!piece || !goodId(piece.id) || ids.has(piece.id)) fail('DUPLICATE_OR_INVALID_PIECE_ID')
    ids.add(piece.id)
    if (!Array.isArray(piece.points) || piece.points.length < 3 || piece.points.length > 20000 ||
        piece.points.some(p => !p || typeof p.x !== 'number' || typeof p.y !== 'number'))
      fail('INVALID_CONTOUR_POINTS')
    if (piece.curves != null && (typeof piece.curves !== 'object' || Array.isArray(piece.curves)))
      fail('INVALID_CURVES')
    if (piece.notches != null && !Array.isArray(piece.notches)) fail('INVALID_NOTCHES')
    const notchIds = new Set()
    const notches = (piece.notches || []).map(notch => {
      if (!notch || !goodId(notch.id) || notchIds.has(notch.id)) fail('DUPLICATE_OR_INVALID_NOTCH_ID')
      notchIds.add(notch.id)
      if (!Number.isInteger(notch.edgeIndex) || notch.edgeIndex < 0 || notch.edgeIndex >= piece.points.length ||
          (notch.t != null && (typeof notch.t !== 'number' || notch.t < 0 || notch.t > 1)) ||
          (notch.depthCm != null && (typeof notch.depthCm !== 'number' || notch.depthCm <= 0)) ||
          (notch.type != null && !['single','double'].includes(notch.type))) fail('INVALID_PHYSICAL_NOTCH_ATTR')
      return {id:notch.id, attrs:clean(notch)}
    })
    return {id:piece.id, contour:clean(piece.points), curves:clean(piece.curves ?? null),
      notches, pieceSha256:sha(canonical(piece))}
  })
}
function capture(project, sourceRevision) {
  if (!goodId(sourceRevision)) fail('SOURCE_REVISION_REQUIRED')
  // Copy and validate the complete input BEFORE gradeProject can read getters,
  // proxy properties, nonfinite values or inconsistent source metadata.
  const source = clean(project)
  if (Buffer.byteLength(canonical(source)) > LIMIT) fail('SOURCE_TOO_LARGE')
  const sizes = source?.grading?.sizes
  if (!Array.isArray(sizes) || !sizes.length || sizes.length > 32 ||
      sizes.some(s => !goodId(s)) || new Set(sizes).size !== sizes.length ||
      !goodId(source.grading.baseSize) || !sizes.includes(source.grading.baseSize))
    fail('INVALID_ORDERED_SIZE_SET')
  const authored = inspectPieces(source.pieces, 'source')
  const sizeRuns = sizes.map(size => {
    const graded = cleanDerivedGraded(gradeProject(source,size))
    const pieces = inspectPieces(graded.pieces,size)
    if (pieces.length !== authored.length ||
        pieces.some((p,i) => p.id !== authored[i].id)) fail('GRADED_PIECE_IDENTITY_CHANGED')
    return {size, pieces}
  })
  return {schema:SCHEMA, sourceRevision, baseSize:source.grading.baseSize,
    sizes:[...sizes], sourceSha256:sha(canonical(source)), authored, sizeRuns,
    boundary:'GRADED_IDENTITY_ONLY_NO_PHYSICAL_GEOMETRY_QA_OR_APPROVAL'}
}
const flags = {factoryCertified:false, factoryCuttingAuthorized:false,
  bulkProductionAuthorized:false, physicalGeometryValidated:false,
  manufacturingApproved:false}
const limitation = 'Development-only signed source and all-size graded identity. Grading may produce invalid contours, zero-area, duplicate, collinear, or self-intersecting (bowtie) geometry. Identity verification does not test physical notch placement, geometry topology, DXF output, or authorize manufacturing.'

export function createApprovedGradedNotchGeometryDraft20261023(project, sourceRevision) {
  try {
    const manifest = capture(project,sourceRevision)
    const payload = canonical(manifest)
    return {status:'draft_for_external_review',manifest,payload,sha256:sha(payload),
      ...flags,limitation}
  } catch (error) {
    return {status:'blocked',issues:[String(error.message)],manifest:null,...flags,limitation}
  }
}
export function verifyApprovedGradedNotchGeometry20261023(project,sourceRevision,approval,trustedKeyConfig) {
  const issues = []
  const draft = createApprovedGradedNotchGeometryDraft20261023(project,sourceRevision)
  if (!draft.manifest) issues.push(...draft.issues)
  let payload
  try {
    const m = clean(approval?.manifest)
    if (!m || Object.keys(m).sort().join('|') !==
        ['schema','sourceRevision','baseSize','sizes','sourceSha256','authored','sizeRuns','boundary'].sort().join('|') ||
        m.schema !== SCHEMA || m.boundary !== 'GRADED_IDENTITY_ONLY_NO_PHYSICAL_GEOMETRY_QA_OR_APPROVAL')
      fail('INVALID_MANIFEST_SCHEMA')
    payload = canonical(m)
    if (payload !== draft.payload) issues.push('SOURCE_OR_GRADED_SIZE_IDENTITY_CHANGED')
    if (typeof approval.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(approval.sha256) ||
        approval.sha256 !== sha(payload)) issues.push('MANIFEST_DIGEST_MISMATCH')
    if (typeof approval.signatureBase64 !== 'string' ||
        !/^[A-Za-z0-9+/]{86}==$/.test(approval.signatureBase64) ||
        Buffer.from(approval.signatureBase64,'base64').toString('base64') !== approval.signatureBase64)
      issues.push('INVALID_ED25519_SIGNATURE_ENCODING')
  } catch(error) {issues.push(String(error.message))}
  try {
    if (!trustedKeyConfig?.publicKey ||
        typeof trustedKeyConfig.pinnedSpkiSha256 !== 'string' ||
        !/^[a-f0-9]{64}$/.test(trustedKeyConfig.pinnedSpkiSha256))
      fail('INDEPENDENT_PINNED_KEY_REQUIRED')
    const supplied = trustedKeyConfig.publicKey
    const key = supplied?.type === 'public' ? supplied : createPublicKey(supplied)
    if (key.asymmetricKeyType !== 'ed25519') fail('ED25519_KEY_REQUIRED')
    if (sha(key.export({format:'der',type:'spki'})) !== trustedKeyConfig.pinnedSpkiSha256)
      fail('TRUSTED_KEY_FINGERPRINT_MISMATCH')
    if (payload && !issues.length &&
        !cryptoVerify(null,Buffer.from(payload),key,Buffer.from(approval.signatureBase64,'base64')))
      issues.push('SIGNATURE_INVALID')
  } catch(error) {issues.push(String(error.message))}
  return {status:issues.length?'blocked':'authenticated_graded_identity_only',
    issues,blockers:issues.length,...flags,limitation}
}
