import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {auditFactoryZipMetadataGuard20261024_0400 as auditMetadata} from './factoryZipMetadataGuard20261024_0400.mjs'
import {auditFactoryZipResourceThenCrc20261024_0600 as auditResource} from './factoryZipResourceBudget20261024_0600.mjs'
import {requireAccuMarkGuardedFactoryPostZipParity20261024 as verifyPostZip} from './accumarkGuardedFactoryPostZipGate20261024.mjs'

const archive = name => zipSync({[name]: strToU8('DXF fixture')}, {level: 0})

test('rejects Windows reserved device names in any ZIP path component', () => {
  for (const name of [
    'CON', 'patterns/CON.dxf', 'patterns/aux.TXT', 'patterns/PRN',
    'patterns/NUL.dxf', 'patterns/com1.dxf', 'patterns/COM9.dat',
    'patterns/LPT1.dxf', 'patterns/lpt9.txt', 'patterns/COM¹.dxf',
    'patterns/LPT².txt', 'patterns/CONIN$.txt', 'patterns/CONOUT$',
    'AUX/subdir/pattern.dxf',
  ]) {
    const bytes = archive(name)
    const before = bytes.slice()
    const result = auditMetadata(bytes)
    assert.equal(result.ok, false, `accepted reserved Windows path ${name}`)
    assert.equal(result.diagnostics[0].code, 'ZIP_WINDOWS_PATH_UNSAFE', name)
    assert.equal(result.manufacturingApproved, false)
    assert.equal(auditResource(bytes).ok, false, name)
    assert.deepEqual(bytes, before, name)
  }
})

test('rejects Windows-trimmed path suffixes and forbidden Win32 filename characters', () => {
  for (const name of [
    'patterns/front.dxf.', 'patterns/front.dxf ', 'patterns/part./front.dxf',
    'patterns/part /front.dxf', 'patterns/<front>.dxf',
    'patterns/front|back.dxf', 'patterns/front?.dxf',
    'patterns/front*.dxf', 'patterns/"front".dxf',
  ]) {
    const result = auditMetadata(archive(name))
    assert.equal(result.ok, false, `accepted unsafe Windows path ${name}`)
    assert.equal(result.diagnostics[0].code, 'ZIP_WINDOWS_PATH_UNSAFE', name)
  }
})

test('preserves ordinary nested garment paths and names that merely contain device substrings', () => {
  for (const name of [
    'patterns/M.dxf', 'patterns/CONSTRUCTION.dxf',
    'patterns/AUXILIARY.dxf', 'patterns/COM10.dxf',
    'patterns/NULLED.dxf', 'patterns/front panel.dxf',
    'patterns/front.back.dxf', 'patterns/CONSOLE.dxf',
  ]) {
    assert.equal(auditMetadata(archive(name)).ok, true, `rejected valid Windows path ${name}`)
  }
})

test('production post-serialization gate refuses an ambiguous Windows path before geometry verification', () => {
  const name = 'patterns/CON.dxf'
  const bytes = strToU8('DXF fixture')
  const zip = zipSync({[name]: bytes}, {level: 0})
  assert.throws(
    () => verifyPostZip(zip, {[name]: bytes}, {}),
    /ZIP_WINDOWS_PATH_UNSAFE/,
  )
})
