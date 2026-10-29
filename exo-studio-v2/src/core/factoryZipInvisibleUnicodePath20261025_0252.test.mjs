import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {auditFactoryZipMetadataGuard20261024_0400 as auditMetadata} from './factoryZipMetadataGuard20261024_0400.mjs'
import {auditFactoryZipResourceThenCrc20261024_0600 as auditResource} from './factoryZipResourceBudget20261024_0600.mjs'
import {requireAccuMarkGuardedFactoryPostZipParity20261024 as verifyPostZip} from './accumarkGuardedFactoryPostZipGate20261024.mjs'

const payload = strToU8('DXF fixture')
const archive = name => zipSync({[name]: payload}, {level: 0})

test('rejects invisible and bidirectional Unicode filename controls before extraction', () => {
  for (const name of [
    'patterns/front\u202edxf.exe', // right-to-left override spoofs extension display
    'patterns/front\u2066.dxf\u2069', // directional isolates
    'patterns/front\u200b.dxf', // zero-width space
    'patterns/front\u200d.dxf', // zero-width joiner
    'patterns/front\ufeff.dxf', // zero-width no-break space
    'patterns/front\u00ad.dxf', // soft hyphen
    'patterns/front\ufe0f.dxf', // invisible variation selector
    'patterns/front\u00a0panel.dxf', // no-break space resembles ordinary space
    'patterns/front\u2009panel.dxf', // thin space resembles ordinary space
    'patterns/a\u0085.dxf', // C1 next-line control
  ]) {
    const bytes = archive(name)
    const original = bytes.slice()
    const result = auditMetadata(bytes)
    assert.equal(result.ok, false, `accepted invisible or bidi path ${JSON.stringify(name)}`)
    assert.equal(result.diagnostics[0].code, 'ZIP_INVISIBLE_UNICODE_PATH', name)
    assert.equal(result.manufacturingApproved, false)
    assert.equal(auditResource(bytes).ok, false, name)
    assert.deepEqual(bytes, original, 'metadata audit must not mutate ZIP input')
  }
})

test('rejects compatibility-equivalent filenames that can alias under receiver normalization', () => {
  for (const name of [
    'patterns/\uff21.dxf', // fullwidth A
    'patterns/\ufb01le.dxf', // fi presentation ligature
    'patterns/front\uff0edxf', // fullwidth dot
    'patterns\uff0ffront.dxf', // fullwidth slash
  ]) {
    const result = auditMetadata(archive(name))
    assert.equal(result.ok, false, `accepted compatibility alias ${name}`)
    assert.equal(result.diagnostics[0].code, 'ZIP_UNICODE_COMPATIBILITY_PATH')
  }
})

test('preserves visible Unicode and ordinary nested garment filenames', () => {
  for (const name of [
    'patterns/front.dxf', 'patterns/XXL front panel.dxf',
    'patterns/caf\u00e9.dxf', 'patterns/Stra\u00dfe.dxf',
  ]) assert.equal(auditMetadata(archive(name)).ok, true, `rejected visible path ${name}`)
})

test('post-serialization production verifier refuses bidi filename before geometry verification', () => {
  const name = 'patterns/front\u202edxf.exe'
  assert.throws(() => verifyPostZip(archive(name), {[name]: payload}, {}), /ZIP_INVISIBLE_UNICODE_PATH/)
})
