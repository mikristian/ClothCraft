import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {auditFactoryZipMetadataGuard20261024_0400 as auditMetadata} from './factoryZipMetadataGuard20261024_0400.mjs'
import {auditFactoryZipResourceThenCrc20261024_0600 as auditResource} from './factoryZipResourceBudget20261024_0600.mjs'
import {requireAccuMarkGuardedFactoryPostZipParity20261024 as verifyPostZip} from './accumarkGuardedFactoryPostZipGate20261024.mjs'

const archive = paths => zipSync(Object.fromEntries(paths.map(path => [path, strToU8('DXF test')])), {level: 0})

test('rejects file-versus-implied-directory collisions in either ZIP entry order', () => {
  for (const paths of [
    ['patterns', 'patterns/front.dxf'],
    ['patterns/front.dxf', 'patterns'],
    ['assets/a', 'assets/a/b.dxf'],
    ['assets/a/b.dxf', 'assets/a'],
  ]) {
    const bytes = archive(paths)
    const snapshot = bytes.slice()
    const result = auditMetadata(bytes)
    assert.equal(result.ok, false, `accepted conflicting paths ${paths}`)
    assert.equal(result.diagnostics[0].code, 'ZIP_FILE_DIRECTORY_COLLISION')
    assert.equal(result.manufacturingApproved, false)
    assert.equal(auditResource(bytes).ok, false, `resource verifier accepted ${paths}`)
    assert.deepEqual(bytes, snapshot, 'verifier mutated ZIP input')
  }
})

test('rejects casefolded and Unicode-normalized file/directory aliases', () => {
  for (const paths of [
    ['PATTERNS', 'patterns/front.dxf'],
    ['patterns/front.dxf', 'PATTERNS'],
    ['Straße', 'STRASSE/front.dxf'],
    ['cafe\u0301', 'caf\u00e9/front.dxf'],
  ]) {
    const result = auditMetadata(archive(paths))
    assert.equal(result.ok, false, `accepted alias paths ${paths}`)
    assert.equal(result.diagnostics[0].code, 'ZIP_FILE_DIRECTORY_COLLISION')
  }
})

test('preserves legitimate sibling files and nested paths without file ancestors', () => {
  for (const paths of [
    ['patterns/front.dxf', 'patterns/back.dxf'],
    ['patterns/M/front.dxf', 'patterns/L/front.dxf'],
    ['assets/a.dxf', 'assets/a/b.dxf'],
  ]) {
    assert.equal(auditMetadata(archive(paths)).ok, true, `rejected valid paths ${paths}`)
  }
})

test('production post-ZIP verifier refuses a file/directory collision before geometry checks', () => {
  const paths = ['patterns', 'patterns/front.dxf']
  const bytes = strToU8('DXF test')
  const zip = zipSync(Object.fromEntries(paths.map(path => [path, bytes])), {level: 0})
  assert.throws(() => verifyPostZip(zip, Object.fromEntries(paths.map(path => [path, bytes])), {}),
    /ZIP_FILE_DIRECTORY_COLLISION/)
})
