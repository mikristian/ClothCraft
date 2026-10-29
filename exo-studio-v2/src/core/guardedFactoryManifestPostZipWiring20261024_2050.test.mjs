import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {parse} from '@babel/parser'
import {createTeeTemplate} from '../data/templates.js'
import {buildGuardedFactoryManifestZip20261024_0053} from './guardedFactoryManifestZip20261024_0053.mjs'
import {buildAccuMarkGuardedFactoryPackage20261023} from './accumarkGuardedFactoryPackage20261023.js'
import {requireAccuMarkGuardedFactoryPostZipParity20261024} from './accumarkGuardedFactoryPostZipGate20261024.mjs'

const guard = 'requireAccuMarkGuardedFactoryPostZipParity20261024'

test('alternate factory ZIP path calls the fixed post-serialization guard, without an injectable validator', () => {
  const source = readFileSync(fileURLToPath(new URL('./guardedFactoryManifestZip20261024_0053.mjs', import.meta.url)), 'utf8')
  const ast = parse(source, {sourceType: 'module'})
  const imports = ast.program.body.filter(node => node.type === 'ImportDeclaration' &&
    node.source.value === './accumarkGuardedFactoryPostZipGate20261024.mjs')
  assert.equal(imports.length, 1)
  assert.equal(imports[0].specifiers.length, 1)
  assert.equal(imports[0].specifiers[0].imported.name, guard)
  const fn = ast.program.body.find(node => node.type === 'ExportNamedDeclaration' &&
    node.declaration?.id?.name === 'buildGuardedFactoryManifestZip20261024_0053')?.declaration
  assert.ok(fn)
  assert.equal(fn.params.length, 1, 'no caller-supplied audit callback')
  const calls = []
  const visit = node => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'CallExpression' && node.callee?.type === 'Identifier' && node.callee.name === guard) calls.push(node)
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'extra') continue
      if (Array.isArray(value)) value.forEach(visit)
      else if (value && typeof value === 'object') visit(value)
    }
  }
  visit(fn.body)
  assert.equal(calls.length, 1, 'exactly one mandatory post-ZIP gate call')
  assert.deepEqual(calls[0].arguments.map(node => node.name), ['bytes', undefined, 'project'])
  assert.equal(calls[0].arguments[1].type, 'MemberExpression')
  assert.equal(calls[0].arguments[1].object.name, 'built')
  assert.equal(calls[0].arguments[1].property.name, 'files')
})

test('alternate six-size archive passes actual CRC, resource and source-derived post-ZIP verification', () => {
  const project = createTeeTemplate()
  const original = structuredClone(project)
  const built = buildGuardedFactoryManifestZip20261024_0053(project)
  assert.equal(built.ok, true, built.reason)
  const source = buildAccuMarkGuardedFactoryPackage20261023(project, {zip: false})
  assert.equal(source.ok, true, source.reason)
  assert.deepEqual(requireAccuMarkGuardedFactoryPostZipParity20261024(built.bytes, source.files, project), {
    ok: true, manufacturingApproved: false, physicalRegistrationVerified: false,
  })
  assert.equal(built.manufacturingApproved, false)
  assert.equal(built.factoryCertified, false)
  assert.deepEqual(project, original)
})

test('alternate builder still refuses invalid authored sewing geometry without returning bytes', () => {
  const project = createTeeTemplate()
  project.seams[0].a.edgeIndex = 999
  const result = buildGuardedFactoryManifestZip20261024_0053(project)
  assert.equal(result.ok, false)
  assert.equal(result.bytes, undefined)
  assert.equal(result.manufacturingApproved, false)
})
