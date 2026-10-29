import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { observeDyldLoadedPyMuPDFImages as observe } from './factoryZipPdfDyldLoadedImageObservation20261025_1400.mjs'

test('requires explicit opt-in and rejects extra properties without reading getters', () => {
  assert.throws(() => observe({packageRoot:'/tmp/fitz'}), /UNTRUSTED_OPT_IN_REQUIRED/)
  let touched = false
  const input = {packageRoot:'/tmp/fitz',allowUntrustedPathInjection:true}
  Object.defineProperty(input, 'manufacturingApproved', {enumerable:true,get(){ touched=true; return true }})
  assert.throws(() => observe(input), /UNSAFE_OPTIONS/)
  assert.equal(touched,false)
  assert.throws(() => observe(new Proxy(input,{})), /UNSAFE_OPTIONS/)
})

test('rejects external/unsafe package roots before running Python', () => {
  for (const root of ['/tmp/../fitz','relative/fitz','/tmp//fitz','/tmp/','/tmp','/']) {
    assert.throws(() => observe({packageRoot:root,allowUntrustedPathInjection:true}))
  }
})

test('rejects forged fitz module paths before checking for package native images', {
  skip: process.platform !== 'darwin' && 'macOS only'
}, (t) => {
  const sandbox = mkdtempSync(join(realpathSync.native(tmpdir()), 'dyld-module-path-'))
  t.after(() => rmSync(sandbox, {recursive:true, force:true}))
  const root = join(sandbox, 'pymupdf')
  const shim = join(sandbox, 'fitz')
  mkdirSync(root)
  mkdirSync(shim)
  const actual = join(shim, 'actual.py')
  writeFileSync(actual, '# synthetic fixture\n')
  const symlink = join(shim, 'link.py')
  symlinkSync(actual, symlink)
  mkdirSync(join(shim, 'directory'))
  symlinkSync(join(shim, 'directory'), join(shim, 'linked-directory'))
  const cases = [
    ['missing.py', 'INVALID_MODULE_FILE'],
    ['link.py', 'SYMLINK_MODULE_PATH'],
    ['directory', 'INVALID_MODULE_FILE'],
    ['linked-directory/submodule.py', 'SYMLINK_MODULE_PATH'],
    ['.', 'UNSAFE_MODULE_PATH'],
    ['..', 'UNSAFE_MODULE_PATH'],
    ['actual.py/../actual.py', 'UNSAFE_MODULE_PATH'],
    ['actual.py', 'NO_PACKAGE_NATIVE_IMAGES']
  ]
  for (const [index, [relativePath, expected]] of cases.entries()) {
    const modulePath = `${shim}/${relativePath}`
    writeFileSync(join(shim, '__init__.py'),
      `__file__ = ${JSON.stringify(modulePath)}\n` +
      'class Doc:\n def new_page(self): pass\n def close(self): pass\n' +
      'def open(): return Doc()\n' + ' '.repeat(index * 7))
    assert.throws(() => observe({packageRoot:root,allowUntrustedPathInjection:true}),
      new RegExp(expected), relativePath)
  }
})

test('observes actual loaded images only when explicit untrusted pymupdf root exists', {
  skip: process.platform !== 'darwin' && 'macOS only'
}, (t) => {
  const p=spawnSync('/usr/bin/python3',['-c','import site; print(site.getusersitepackages())'],
    {encoding:'utf8',timeout:2000,env:{PATH:'/usr/bin:/bin'}})
  const root = p.status === 0 ? join(p.stdout.trim(),'pymupdf') : ''
  if (!root || !existsSync(root)) return t.skip('optional untrusted pymupdf user-site package absent')
  const canonical = realpathSync.native(root)
  if (canonical !== root) return t.skip('untrusted pymupdf user-site root is symlinked')
  const outcome=observe({packageRoot:root,allowUntrustedPathInjection:true})
  assert.equal(outcome.observed,true)
  assert.ok(outcome.packageImages.length>0)
  assert.ok(outcome.packageImages.every(p=>p.startsWith(root+'/')))
  assert.equal(outcome.manufacturingApproved,false)
  assert.equal(outcome.runtimeExecutionAuthorized,false)
  assert.equal(outcome.publisherAuthenticated,false)
  assert.equal(outcome.atomicLoaderBindingProven,false)
})
