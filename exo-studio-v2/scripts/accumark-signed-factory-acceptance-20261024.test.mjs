import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { assessAccuMarkAcceptanceLedger } from './accumark-acceptance-progress-20261023.mjs'

const sha256 = data => createHash('sha256').update(data).digest('hex')
const fixture = () => JSON.parse(readFileSync(new URL('../docs/research/swarm-20261023/parity-ledger.json', import.meta.url), 'utf8'))

// Synthetic trust-fixture only. No generated key or evidence here is a real
// licensed CAD session, physical factory sample or accepted manufacturing run.
const claimed = () => {
  const ledger = fixture()
  ledger.releaseId = 'synthetic-untrusted-release'
  for (const row of ledger.requirements) {
    row.status = 'FACTORY_ACCEPTED'
    row.evidence = [{ artifact: 'synthetic-oracle.json', independentOracle: 'synthetic-witness' }]
    row.approval = { operator: 'synthetic-operator', site: 'synthetic-site', date: '2026-10-24', signedArtifact: 'synthetic-signature.sig' }
  }
  ledger.industrialRoundTrip = { approved: true, receiver: 'synthetic-CAD', artifact: 'receiver.json' }
  ledger.physicalSample = { approved: true, site: 'synthetic-site', operator: 'synthetic-operator', artifact: 'sample.json' }
  return ledger
}

function syntheticSignedEvidence(ledger) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const receiverArtifactBytes = Buffer.from('synthetic CAD receiver bytes')
  const physicalSampleArtifactBytes = Buffer.from('synthetic sample bytes')
  const payloadUtf8 = JSON.stringify({
    schema: 'exo.accumark.signed-factory-acceptance.v1',
    releaseId: ledger.releaseId,
    ledgerSha256: sha256(Buffer.from(JSON.stringify(ledger))),
    receiverArtifact: ledger.industrialRoundTrip.artifact,
    receiverArtifactSha256: sha256(receiverArtifactBytes),
    physicalSampleArtifact: ledger.physicalSample.artifact,
    physicalSampleArtifactSha256: sha256(physicalSampleArtifactBytes),
    witnessId: 'synthetic-independent-witness',
    witnessOrganization: 'synthetic-test-only',
    receiverObserved: true,
    physicalSampleObserved: true,
    receiverObservedAt: '2026-10-24T10:00:00Z',
    physicalSampleObservedAt: '2026-10-24T11:00:00Z',
    signedAt: '2026-10-24T12:00:00Z',
  })
  return {
    trustedPublicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
    signedRelease: {
      payloadUtf8,
      signatureBase64: sign(null, Buffer.from(payloadUtf8), privateKey).toString('base64'),
      receiverArtifactBytes,
      physicalSampleArtifactBytes,
    },
  }
}

test('76 invented factory approvals cannot reach 100 percent with untrusted JSON alone', () => {
  const ledger = claimed()
  const result = assessAccuMarkAcceptanceLedger(ledger)
  assert.equal(result.factoryStatusClaimCount, 76)
  assert.equal(result.factoryAccepted, 0)
  assert.equal(result.factoryStatusClaimPercent, 100)
  assert.equal(result.factoryAcceptedPercent, 0)
  assert.equal(result.signedExternalAcceptance, false)
  assert.equal(result.completion100Percent, false)
  assert.ok(result.issues.some(issue => issue.code === 'SIGNED_EXTERNAL_FACTORY_ATTESTATION_UNVERIFIED'))
})

test('missing independent oracle, signed row approval, or canonical criterion blocks even a synthetic signature', () => {
  const ledger = claimed()
  ledger.requirements[0].evidence = [{}]
  ledger.requirements[1].approval.signedArtifact = ''
  ledger.requirements[2].criterion = 'invented criterion'
  const result = assessAccuMarkAcceptanceLedger(ledger, syntheticSignedEvidence(ledger))
  assert.equal(result.signedExternalAcceptance, true)
  assert.equal(result.completion100Percent, false)
  for (const code of ['FACTORY_ACCEPTANCE_WITHOUT_INDEPENDENT_ORACLE', 'FACTORY_ACCEPTANCE_WITHOUT_SIGNED_APPROVAL', 'CANONICAL_MATRIX_DRIFT'])
    assert.ok(result.issues.some(issue => issue.code === code), code)
})

test('synthetic Ed25519 receipt binds exact ledger and bytes but never self-approves industrial acceptance', () => {
  const ledger = claimed()
  const evidence = syntheticSignedEvidence(ledger)
  // Positive cryptographic result proves byte binding only, not physical facts.
  const signed = assessAccuMarkAcceptanceLedger(ledger, evidence)
  assert.equal(signed.signedExternalAcceptance, true)
  assert.equal(signed.externalSemanticAuditVerified, false)
  assert.equal(signed.completion100Percent, false)
  assert.ok(signed.issues.some(issue => issue.code === 'INDEPENDENT_CAD_AND_PHYSICAL_SEMANTIC_AUDIT_REQUIRED'))
  const changedLedger = structuredClone(ledger)
  changedLedger.requirements[0].evidence[0].artifact = 'replaced.json'
  assert.equal(assessAccuMarkAcceptanceLedger(changedLedger, evidence).signedExternalAcceptance, false)
  const alteredBytes = { ...evidence, signedRelease: { ...evidence.signedRelease, receiverArtifactBytes: Buffer.from('different') } }
  assert.equal(assessAccuMarkAcceptanceLedger(ledger, alteredBytes).signedExternalAcceptance, false)
  const wrongKey = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' })
  assert.equal(assessAccuMarkAcceptanceLedger(ledger, { ...evidence, trustedPublicKeyPem: wrongKey }).signedExternalAcceptance, false)
  const alteredSignature = { ...evidence, signedRelease: { ...evidence.signedRelease, signatureBase64: Buffer.alloc(64).toString('base64') } }
  assert.equal(assessAccuMarkAcceptanceLedger(ledger, alteredSignature).signedExternalAcceptance, false)
})

test('missing ledger schema and release identity cannot be authenticated', () => {
  const ledger = claimed()
  const evidence = syntheticSignedEvidence(ledger)
  const missingRelease = structuredClone(ledger)
  delete missingRelease.releaseId
  assert.equal(assessAccuMarkAcceptanceLedger(missingRelease, evidence).completion100Percent, false)
  const wrongSchema = structuredClone(ledger)
  wrongSchema.schema = 'exo.accumark.acceptance.fake'
  assert.throws(() => assessAccuMarkAcceptanceLedger(wrongSchema, evidence), /schema/)
})

test('strict UTC chronology rejects normalized invalid dates, future claims, and signatures before observations', () => {
  const ledger = claimed()
  const valid = syntheticSignedEvidence(ledger)
  // These probes fail before the signature stage because they deliberately
  // preserve the original signature while tampering with signed payload bytes.
  for (const signedAt of ['2026-02-30T12:00:00Z', '2099-01-01T00:00:00Z', '2026-10-24T09:00:00Z']) {
    const payload = JSON.parse(valid.signedRelease.payloadUtf8)
    payload.signedAt = signedAt
    const evidence = { ...valid, signedRelease: { ...valid.signedRelease, payloadUtf8: JSON.stringify(payload) } }
    assert.equal(assessAccuMarkAcceptanceLedger(ledger, evidence).signedExternalAcceptance, false, signedAt)
  }
  // Re-sign under the SAME trusted synthetic key to exercise the chronology
  // checks themselves, not merely signature-integrity rejection.
  const keypair = generateKeyPairSync('ed25519')
  for (const signedAt of ['2026-02-30T12:00:00Z', '2099-01-01T00:00:00Z', '2026-10-24T09:00:00Z']) {
    const payload = JSON.parse(valid.signedRelease.payloadUtf8)
    payload.signedAt = signedAt
    const payloadUtf8 = JSON.stringify(payload)
    const evidence = {
      trustedPublicKeyPem: keypair.publicKey.export({ type: 'spki', format: 'pem' }),
      signedRelease: { ...valid.signedRelease, payloadUtf8, signatureBase64: sign(null, Buffer.from(payloadUtf8), keypair.privateKey).toString('base64') },
    }
    assert.equal(assessAccuMarkAcceptanceLedger(ledger, evidence).signedExternalAcceptance, false, signedAt)
  }
})
