import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { parse } from '@babel/parser'

const source = readFileSync(fileURLToPath(new URL('../App.jsx', import.meta.url)), 'utf8')
const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] })
const guardName = 'downloadAccuMarkGuardedFactoryPackage20261023'
const handlerName = 'exportFactoryPackage'

function walk(root, visitor) {
  const seen = new Set()
  function visit(node, parent) {
    if (!node || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    if (typeof node.type === 'string') visitor(node, parent)
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'extra' || key === 'comments' || key === 'tokens') continue
      if (Array.isArray(value)) value.forEach(child => visit(child, node))
      else if (value && typeof value === 'object') visit(value, node)
    }
  }
  visit(root, null)
}

function nodes(root, predicate) {
  const result = []
  walk(root, node => { if (predicate(node)) result.push(node) })
  return result
}

const ident = (node, value) => node?.type === 'Identifier' && node.name === value
const string = (node, value) => node?.type === 'StringLiteral' && node.value === value
const directCall = (node, name) => node?.type === 'CallExpression' && ident(node.callee, name)

test('factory export handler delegates exactly once to guarded downloader with current project', () => {
  const definitions = nodes(ast, n => n.type === 'VariableDeclarator' && ident(n.id, handlerName))
  assert.equal(definitions.length, 1, 'exactly one factory handler must exist')
  const handler = definitions[0].init
  assert.equal(handler.type, 'ArrowFunctionExpression')
  const calls = nodes(handler.body, n => directCall(n, guardName))
  assert.equal(calls.length, 1, 'factory handler must call the guarded adapter exactly once')
  assert.equal(calls[0].arguments.length, 1)
  assert.ok(ident(calls[0].arguments[0], 'project'), 'guard must receive live project')
  assert.equal(nodes(handler.body, n => directCall(n, 'buildFactoryPackageZip')).length, 0)

  const guardImports = nodes(ast, n => n.type === 'ImportDeclaration' && n.specifiers.some(s => s.imported?.name === guardName))
  assert.equal(guardImports.length, 1, 'guard function must be imported')
  assert.match(guardImports[0].source.value, /accumarkGuardedFactoryDownload20261023\.js$/)
})

test('file command, 2D command route, and Production button share factory handler', () => {
  const commandEntries = nodes(ast, n => n.type === 'ObjectProperty' && string(n.key, 'file.export.factory'))
  assert.equal(commandEntries.length, 1)
  assert.ok(ident(commandEntries[0].value, handlerName))
  assert.ok(commandEntries[0].start > source.indexOf("if(action.startsWith('file.export.'))"))

  const routeChecks = nodes(ast, n => n.type === 'IfStatement' &&
    n.test.type === 'BinaryExpression' && n.test.operator === '===' &&
    ((string(n.test.right, 'export-factory-package') && n.test.left.type === 'MemberExpression' && ident(n.test.left.object, 'route') && ident(n.test.left.property, 'kind')) ||
      (string(n.test.left, 'export-factory-package') && n.test.right.type === 'MemberExpression' && ident(n.test.right.object, 'route') && ident(n.test.right.property, 'kind'))))
  assert.equal(routeChecks.length, 1)
  assert.equal(nodes(routeChecks[0].consequent, n => directCall(n, handlerName)).length, 1)

  const buttons = nodes(ast, n => n.type === 'JSXOpeningElement' && n.name?.type === 'JSXIdentifier' && n.name.name === 'button' &&
    n.attributes.some(a => a.type === 'JSXAttribute' && a.name?.type === 'JSXIdentifier' && a.name.name === 'onClick' &&
      a.value?.type === 'JSXExpressionContainer' && ident(a.value.expression, handlerName)))
  assert.equal(buttons.length, 1, 'Production export must bind directly to shared handler')
  const button = buttons[0]
  assert.match(source.slice(button.start, button.end + 120), /EXPORT FACTORY PACKAGE/)

  const legacyCalls = nodes(ast, n => directCall(n, 'buildFactoryPackageZip'))
  assert.equal(legacyCalls.length, 0, 'legacy ZIP builder must have no executable call sites in App')
})

test('extracted UI handler blocks rejected and throwing guards and announces success only for ok=true', () => {
  const definitions = nodes(ast, n => n.type === 'VariableDeclarator' && ident(n.id, handlerName))
  assert.equal(definitions.length, 1)
  const handlerSource = source.slice(definitions[0].init.start, definitions[0].init.end)
  function evaluate(guard) {
    const statuses = []
    let legacyCalls = 0
    const project = { sentinel: true }
    const context = {
      project,
      setCommandResult: value => statuses.push(value),
      [guardName]: current => { assert.equal(current, project); return guard(current) },
      buildFactoryPackageZip: () => { legacyCalls++; throw new Error('legacy export called') },
    }
    const handler = runInNewContext(`(${handlerSource})`, context)
    handler()
    assert.equal(legacyCalls, 0)
    assert.equal(statuses.length, 1, 'one user status is required')
    return statuses[0]
  }

  assert.match(evaluate(() => ({ ok: false, reason: 'Invalid seam edge 999' })), /^Factory package blocked: Invalid seam edge 999$/)
  assert.match(evaluate(() => ({ ok: false, reason: 'PHYSICAL_CUT_INTERIOR_OVERLAP' })), /^Factory package blocked: PHYSICAL_CUT_INTERIOR_OVERLAP$/)
  assert.match(evaluate(() => { throw new Error('guard failed') }), /^Factory package blocked: guard failed$/)
  const success = evaluate(() => ({ ok: true, filename: 'sample-guarded-factory.zip' }))
  assert.match(success, /^Guarded factory ZIP downloaded: sample-guarded-factory\.zip\./)
  assert.match(success, /physical sample approval are still required/)
})
