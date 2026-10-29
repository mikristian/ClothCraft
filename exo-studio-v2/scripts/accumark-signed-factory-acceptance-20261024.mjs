// A ledger is a claim, not a trusted factory witness. This optional gate only
// verifies a detached Ed25519 attestation against a caller-supplied, externally
// pinned trust anchor. Never read a public key from the ledger being assessed.
import { createHash, createPublicKey, verify } from 'node:crypto'
import { types } from 'node:util'

const sha256 = value => createHash('sha256').update(value).digest('hex')
const present = value => typeof value === 'string' && value.trim().length > 0
const hexDigest = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
// This function is also exported directly. Do not assume its caller ran the
// acceptance-progress wrapper's own descriptor and plain-JSON checks.
const ownData = (owner, key) => {
  if (!owner || typeof owner !== 'object' || types.isProxy(owner) || Array.isArray(owner)) return undefined
  const prototype = Object.getPrototypeOf(owner)
  if (prototype !== Object.prototype && prototype !== null) return undefined
  const descriptor = Object.getOwnPropertyDescriptor(owner, key)
  return descriptor?.enumerable && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined
}

const isPlainJsonDataTree = root => {
  if (!root || typeof root !== 'object') return false
  const seen = new Set()
  const pending = [root]
  while (pending.length) {
    const value = pending.pop()
    if (value === null || typeof value === 'string' || typeof value === 'boolean') continue
    if (typeof value === 'number' && Number.isFinite(value)) continue
    if (!value || typeof value !== 'object' || types.isProxy(value) || seen.has(value)) return false
    seen.add(value)
    const array = Array.isArray(value)
    const prototype = Object.getPrototypeOf(value)
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) return false
    const keys = Reflect.ownKeys(value)
    // Dense arrays only; reject sparse huge arrays without iterating length.
    if (array && keys.length !== value.length + 1) return false
    for (const key of keys) {
      if (typeof key !== 'string') return false
      if (array && key === 'length') continue
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) return false
      pending.push(descriptor.value)
    }
  }
  return true
}

// JSON.stringify(object) calls inherited toJSON methods before any replacer.
// Serialize only the validated own data descriptors, in native JSON key order.
const safeJsonStringify = value => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    const items = []
    for (let i = 0; i < value.length; i++)
      items.push(safeJsonStringify(Object.getOwnPropertyDescriptor(value, String(i)).value))
    return `[${items.join(',')}]`
  }
  return `{${Object.keys(value).map(key =>
    `${JSON.stringify(key)}:${safeJsonStringify(Object.getOwnPropertyDescriptor(value, key).value)}`).join(',')}}`
}

const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype)
const nativeBuffer = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'buffer').get
const nativeLength = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'length').get
const bytes = value => {
  if (types.isProxy(value) || !types.isUint8Array(value)) return null
  // A shared backing store could change between hashing and signature checks.
  if (types.isSharedArrayBuffer(nativeBuffer.call(value))) return null
  const length = nativeLength.call(value)
  if (!length) return null
  const snapshot = Buffer.allocUnsafe(length)
  Uint8Array.prototype.set.call(snapshot, value)
  return snapshot
}
const strictUtcMillis = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)) return NaN
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) return NaN
  const normalized = value.includes('.') ? value : value.replace('Z', '.000Z')
  return new Date(ms).toISOString() === normalized ? ms : NaN
}

export function verifySignedFactoryAcceptance20261024(ledger, options = {}) {
  try {
    if (!isPlainJsonDataTree(ledger)) return false
    const trustedPublicKeyPem = ownData(options, 'trustedPublicKeyPem')
    const signedRelease = ownData(options, 'signedRelease')
    const payloadUtf8 = ownData(signedRelease, 'payloadUtf8')
    const signatureBase64 = ownData(signedRelease, 'signatureBase64')
    if (!present(trustedPublicKeyPem) || !present(payloadUtf8) || !present(signatureBase64)) return false
    const receiverBytes = bytes(ownData(signedRelease, 'receiverArtifactBytes'))
    const sampleBytes = bytes(ownData(signedRelease, 'physicalSampleArtifactBytes'))
    if (!receiverBytes?.length || !sampleBytes?.length) return false
    const signature = Buffer.from(signatureBase64, 'base64')
    if (signature.length !== 64 || signature.toString('base64') !== signatureBase64) return false
    const key = createPublicKey(trustedPublicKeyPem)
    if (key.asymmetricKeyType !== 'ed25519' ||
        !verify(null, Buffer.from(payloadUtf8, 'utf8'), key, signature)) return false
    const payload = JSON.parse(payloadUtf8)
    const signedAt = strictUtcMillis(ownData(payload, 'signedAt'))
    const cadObservedAt = strictUtcMillis(ownData(payload, 'receiverObservedAt'))
    const sampleObservedAt = strictUtcMillis(ownData(payload, 'physicalSampleObservedAt'))
    const created = ownData(ledger, 'created')
    const releaseId = ownData(ledger, 'releaseId')
    const releaseStart = typeof created === 'string' && /^\d{4}-\d\d-\d\d$/.test(created)
      ? strictUtcMillis(`${created}T00:00:00Z`) : NaN
    if (ownData(payload, 'schema') !== 'exo.accumark.signed-factory-acceptance.v1' ||
        !present(releaseId) || ownData(payload, 'releaseId') !== releaseId ||
        !present(ownData(payload, 'witnessId')) || !present(ownData(payload, 'witnessOrganization')) ||
        ownData(payload, 'receiverObserved') !== true || ownData(payload, 'physicalSampleObserved') !== true ||
        !Number.isFinite(signedAt) || !Number.isFinite(cadObservedAt) ||
        !Number.isFinite(sampleObservedAt) || !Number.isFinite(releaseStart) ||
        cadObservedAt < releaseStart || sampleObservedAt < releaseStart ||
        signedAt < cadObservedAt || signedAt < sampleObservedAt ||
        signedAt > Date.now() + 5 * 60_000) return false
    const ledgerSha256 = ownData(payload, 'ledgerSha256')
    if (!hexDigest(ledgerSha256) || ledgerSha256 !== sha256(Buffer.from(safeJsonStringify(ledger), 'utf8'))) return false
    const receiverSha256 = ownData(payload, 'receiverArtifactSha256')
    if (!hexDigest(receiverSha256) || receiverSha256 !== sha256(receiverBytes) ||
        ownData(payload, 'receiverArtifact') !== ownData(ownData(ledger, 'industrialRoundTrip'), 'artifact')) return false
    const sampleSha256 = ownData(payload, 'physicalSampleArtifactSha256')
    if (!hexDigest(sampleSha256) || sampleSha256 !== sha256(sampleBytes) ||
        ownData(payload, 'physicalSampleArtifact') !== ownData(ownData(ledger, 'physicalSample'), 'artifact')) return false
    return true
  } catch {
    return false
  }
}
