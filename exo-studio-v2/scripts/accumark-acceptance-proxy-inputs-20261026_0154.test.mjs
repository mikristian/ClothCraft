import test from 'node:test'
import assert from 'node:assert/strict'
import {createInitialLedger} from './accumark-parity-ledger-20261023.mjs'
import {assessAccuMarkAcceptanceLedger as assess} from './accumark-acceptance-progress-20261023.mjs'

function trapped(value) {
  let calls = 0
  const handler = Object.fromEntries(
    ['get', 'getPrototypeOf', 'getOwnPropertyDescriptor', 'ownKeys', 'has'].map(name => [name, () => {
      calls++
      throw Error(`Unexpected ${name} Proxy trap`)
    }]),
  )
  return {proxy: new Proxy(value, handler), calls: () => calls}
}

test('rejects Proxy ledger without running its reflection traps', () => {
  const {proxy, calls} = trapped(createInitialLedger())
  assert.throws(() => assess(proxy), /invalid acceptance ledger schema/)
  assert.equal(calls(), 0)
})

test('rejects Proxy requirements array without reading its length or elements', () => {
  const ledger = createInitialLedger()
  const {proxy, calls} = trapped(ledger.requirements)
  ledger.requirements = proxy
  assert.throws(() => assess(ledger), /invalid acceptance ledger schema/)
  assert.equal(calls(), 0)
})

test('rejects Proxy independent-evidence array without invoking traps', () => {
  const ledger = createInitialLedger()
  const row = ledger.requirements.find(item => item.id === 'A01')
  row.status = 'INDEPENDENT_VERIFIED'
  const {proxy, calls} = trapped([{artifact: 'test', independentOracle: 'test'}])
  row.evidence = proxy
  const result = assess(ledger)
  assert.ok(result.issues.some(issue => issue.id === 'A01' && issue.code === 'INDEPENDENT_STATUS_WITHOUT_INDEPENDENT_ORACLE'))
  assert.equal(result.independentlyVerified, 0)
  assert.equal(calls(), 0)
})

test('rejects Proxy signature options and nested release without invoking traps', () => {
  const ledger = createInitialLedger()
  const release = {payloadUtf8: 'test', signatureBase64: 'test', receiverArtifactBytes: new Uint8Array([1]), physicalSampleArtifactBytes: new Uint8Array([2])}
  const options = {trustedPublicKeyPem: 'test', signedRelease: release}
  const top = trapped(options)
  assert.equal(assess(ledger, top.proxy).signedExternalAcceptance, false)
  assert.equal(top.calls(), 0)
  const nested = trapped(release)
  assert.equal(assess(ledger, {...options, signedRelease: nested.proxy}).signedExternalAcceptance, false)
  assert.equal(nested.calls(), 0)
})

test('rejects Proxy Uint8Array receipt bytes without triggering instanceof reflection', () => {
  const ledger = createInitialLedger()
  const receiver = trapped(new Uint8Array([1]))
  const options = {
    trustedPublicKeyPem: 'test',
    signedRelease: {
      payloadUtf8: 'test', signatureBase64: 'test',
      receiverArtifactBytes: receiver.proxy,
      physicalSampleArtifactBytes: new Uint8Array([2]),
    },
  }
  assert.equal(assess(ledger, options).signedExternalAcceptance, false)
  assert.equal(receiver.calls(), 0)
})
