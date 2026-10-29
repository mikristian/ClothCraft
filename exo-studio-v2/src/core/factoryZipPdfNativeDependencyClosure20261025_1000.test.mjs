import test from 'node:test'
import assert from 'node:assert/strict'
import { auditNativeDependencyClosure as audit } from './factoryZipPdfNativeDependencyClosure20261025_1000.mjs'

const root = '/opt/pinned/python'
const entry = root + '/lib/module.so'
const sibling = root + '/lib/libhelper.dylib'
const output = (path, deps) => path + ':\n' + deps.map(d => '\t' + d + ' (compatibility version 1.0.0, current version 2.0.0)').join('\n') + '\n'
const records = () => [
  { path: entry, output: output(entry, ['@loader_path/libhelper.dylib', '/usr/lib/libSystem.B.dylib']) },
  { path: sibling, output: output(sibling, ['/System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation']) }
]
const run = (r = records(), changes = {}) => audit({ packageRoot: root, entryPath: entry, records: r, ...changes })
test('valid deterministic transitive closure', () => {
  assert.deepEqual(run(), { ok: true, inspectedNodes: 2, osDependencies: [
    '/System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation', '/usr/lib/libSystem.B.dylib'
  ] })
})
test('trusted loader-relative LC_RPATH resolves real Mach-O shape', () => {
  const fixture = [
    { path: entry, output: output(entry, ['@rpath/libhelper.dylib', '/usr/lib/libSystem.B.dylib']), rpaths: ['@loader_path/.'] },
    { path: sibling, output: output(sibling, ['/usr/lib/libc++.1.dylib']), rpaths: ['@loader_path/.'] }
  ]
  assert.equal(run(fixture).inspectedNodes, 2)
  assert.throws(() => run([{ ...fixture[0], rpaths: [] }, fixture[1]]), /UNRESOLVED_OR_AMBIGUOUS_RPATH/)
  assert.throws(() => run([{ ...fixture[0], rpaths: ['/tmp'] }, fixture[1]]), /EXTERNAL_RPATH/)
})
test('LC_RPATH permits package root equality for top-level dylibs, dependencies do not', () => {
  const top = root + '/_extra.so'
  const helper = root + '/libmupdf.dylib'
  const fixture = [
    { path: top, output: output(top, ['@rpath/libmupdf.dylib']), rpaths: ['@loader_path/.'] },
    { path: helper, output: output(helper, ['/usr/lib/libSystem.B.dylib']), rpaths: ['@loader_path/'] }
  ]
  assert.equal(run(fixture, { entryPath: top }).inspectedNodes, 2)
  assert.throws(() => run([{ path: top, output: output(top, ['@loader_path/..']) }], { entryPath: top }), /LOADER_PATH_ESCAPE/)
})
test('explicit LC_ID_DYLIB skips only matching first self install-name metadata', () => {
  const extra = root + '/lib/_extra.so'
  const externalId = '/Users/runner/work/PyMuPDF/PyMuPDF/src/build/_extra.so'
  const helperId = 'build/libhelper.dylib'
  const fixture = [
    { path: extra, installName: externalId, output: output(extra, [externalId, '@rpath/libhelper.dylib', '/usr/lib/libSystem.B.dylib']), rpaths: ['@loader_path/'] },
    { path: sibling, installName: helperId, output: output(sibling, [helperId, '/usr/lib/libc++.1.dylib']) }
  ]
  const check = (rows) => run(rows, { entryPath: extra })
  assert.equal(check(fixture).inspectedNodes, 2)
  assert.throws(() => check([{ ...fixture[0], installName: 'build/_extra.so' }, fixture[1]]), /INSTALL_NAME_MISMATCH/)
  const spoof = '/tmp/other.dylib'
  assert.throws(() => check([{ ...fixture[0], installName: spoof, output: output(extra, [spoof, '@rpath/libhelper.dylib']) }, fixture[1]]), /INSTALL_NAME_MISMATCH/)
  assert.throws(() => check([{ ...fixture[0], installName: undefined }, fixture[1]]), /EXTERNAL_NATIVE_DEPENDENCY/)
  assert.throws(() => check([{ ...fixture[0], output: output(extra, ['/tmp/evil.dylib', externalId, '@rpath/libhelper.dylib']) }, fixture[1]]), /INSTALL_NAME_MISMATCH/)
  assert.throws(() => run([{ path: entry, output: output(entry, ['@loader_path/']) }]), /UNSAFE_PATH/)
})
test('external dylib rejected', () => assert.throws(() => run([{ path: entry, output: output(entry, ['/tmp/evil.dylib']) }]), /EXTERNAL_NATIVE_DEPENDENCY/))
test('unresolved @rpath and @executable_path rejected', () => {
  assert.throws(() => run([{ path: entry, output: output(entry, ['@rpath/libhelper.dylib']) }]), /UNRESOLVED_OR_AMBIGUOUS_RPATH/)
  assert.throws(() => run([{ path: entry, output: output(entry, ['@executable_path/libhelper.dylib']) }]), /UNRESOLVED_DYNAMIC_PATH/)
})
test('@loader_path traversal outside pinned root rejected', () => assert.throws(() => run([{ path: entry, output: output(entry, ['@loader_path/../../../../tmp/evil.dylib']) }]), /LOADER_PATH_ESCAPE/))
test('missing transitive dependency rejected', () => assert.throws(() => run(records().slice(0, 1)), /MISSING_TRANSITIVE_RECORD/))
test('dependency cycle rejected', () => assert.throws(() => run([
  { path: entry, output: output(entry, [sibling]) }, { path: sibling, output: output(sibling, [entry]) }
]), /DEPENDENCY_CYCLE/))
test('duplicate dependency, record, malformed header rejected', () => {
  assert.throws(() => run([{ path: entry, output: output(entry, ['/usr/lib/a', '/usr/lib/a']) }]), /DUPLICATE_DEPENDENCY/)
  assert.throws(() => run([...records(), records()[0]]), /DUPLICATE_OR_OUTSIDE_RECORD/)
  assert.throws(() => run([{ path: entry, output: output('/incorrect', ['/usr/lib/a']) }]), /MALFORMED_OTOOL/)
})
test('accessor, Proxy, sparse array rejected without calling getter or trap', () => {
  let invoked = 0
  const accessor = Object.defineProperty({ path: entry }, 'output', { get() { invoked++; return output(entry, ['/usr/lib/a']) } })
  assert.throws(() => run([accessor]), /UNSAFE_RECORD/)
  const proxy = new Proxy({ path: entry, output: output(entry, ['/usr/lib/a']) }, { getPrototypeOf() { invoked++; return Object.prototype } })
  assert.throws(() => run([proxy]), /UNSAFE_RECORD/)
  assert.throws(() => run(Array(1)), /UNSAFE_RECORDS/)
  const deceptiveRpath = new Proxy({}, { get() { invoked++; return () => '@loader_path/.' } })
  assert.throws(() => run([{ path: entry, output: output(entry, ['/usr/lib/a']), rpaths: [deceptiveRpath] }]), /UNSAFE_RPATHS/)
  assert.equal(invoked, 0)
})
test('depth overflow and uninspected records rejected', () => {
  const third = root + '/lib/third.dylib'
  assert.throws(() => run([
    { path: entry, output: output(entry, [sibling]) },
    { path: sibling, output: output(sibling, [third]) },
    { path: third, output: output(third, ['/usr/lib/a']) }
  ], { maxDepth: 1 }), /DEPTH_LIMIT/)
  assert.throws(() => run([...records(), { path: root + '/lib/extra.dylib', output: output(root + '/lib/extra.dylib', ['/usr/lib/a']) }]), /UNREACHABLE_RECORD/)
})
