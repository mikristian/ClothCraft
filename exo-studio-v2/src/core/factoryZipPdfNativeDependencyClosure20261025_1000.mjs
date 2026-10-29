// Development-only audit of caller-supplied, trusted otool -L text. Does not inspect files.
import { posix } from 'node:path'
import { types } from 'node:util'

const DEFAULT_NODES = 256
const DEFAULT_DEPTH = 16
const ABSOLUTE = /^\//
const OS_PREFIXES = ['/usr/lib/', '/System/Library/Frameworks/', '/System/Library/PrivateFrameworks/']

function record(value, keys) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) throw Error('UNSAFE_RECORD')
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) throw Error('UNSAFE_RECORD')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || !keys.includes(key) || !Object.hasOwn(descriptors[key], 'value')) throw Error('UNSAFE_RECORD')
  }
  return Object.fromEntries(Object.entries(descriptors).map(([key, v]) => [key, v.value]))
}

function array(value) {
  if (!Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) throw Error('UNSAFE_RECORDS')
  const ds = Object.getOwnPropertyDescriptors(value)
  const len = ds.length?.value
  if (!Number.isSafeInteger(len) || len < 1 || len > DEFAULT_NODES) throw Error('RECORD_LIMIT')
  if (Reflect.ownKeys(ds).length !== len + 1) throw Error('UNSAFE_RECORDS')
  return Array.from({ length: len }, (_, i) => {
    const d = ds[String(i)]
    if (!d || !Object.hasOwn(d, 'value')) throw Error('UNSAFE_RECORDS')
    return d.value
  })
}

function cleanAbsolute(value) {
  if (typeof value !== 'string' || value.length > 2048 || !ABSOLUTE.test(value) ||
    value.includes('\\') || /[\x00-\x1f\x7f]/.test(value) || value.includes('//') ||
    value.split('/').some(part => part === '.' || part === '..') || value.endsWith('/')) throw Error('UNSAFE_PATH')
  return posix.normalize(value)
}

function under(path, root) { return path.startsWith(root + '/') }
function allowedOS(path) { return OS_PREFIXES.some(prefix => path.startsWith(prefix)) && !path.includes('/../') }
function maxLimit(value, defaultValue) {
  if (value === undefined) return defaultValue
  if (!Number.isSafeInteger(value) || value < 1 || value > defaultValue) throw Error('INVALID_LIMIT')
  return value
}

function parseOtool(output, expected) {
  if (typeof output !== 'string' || output.length > 65536 || output.includes('\r') || output.includes('\0')) throw Error('MALFORMED_OTOOL')
  const lines = output.trimEnd().split('\n')
  if (lines.length < 2 || lines.length > 257 || lines[0] !== expected + ':') throw Error('MALFORMED_OTOOL')
  const dependencies = []
  const seen = new Set()
  for (const line of lines.slice(1)) {
    const match = /^\t([^\t\n]+) \(compatibility version \d+\.\d+\.\d+, current version \d+\.\d+\.\d+\)$/.exec(line)
    if (!match) throw Error('MALFORMED_OTOOL')
    const dependency = match[1]
    if (seen.has(dependency)) throw Error('DUPLICATE_DEPENDENCY')
    seen.add(dependency)
    dependencies.push(dependency)
  }
  return dependencies
}

function resolveLoader(raw, owner, packageRoot, allowRoot = false) {
  if (typeof raw !== 'string' || !raw.startsWith('@loader_path/') ||
      /[\\\x00-\x1f\x7f]/.test(raw)) throw Error('UNSAFE_PATH')
  if (raw === '@loader_path/') throw Error('UNSAFE_PATH')
  const target = posix.resolve(posix.dirname(owner), raw.slice('@loader_path/'.length))
  if (!under(target, packageRoot) && !(allowRoot && target === packageRoot)) throw Error('LOADER_PATH_ESCAPE')
  return target
}

function readRpaths(value, owner, packageRoot) {
  if (value === undefined) return []
  if (!Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) throw Error('UNSAFE_RPATHS')
  const ds = Object.getOwnPropertyDescriptors(value)
  if (ds.length?.value > 16 || Reflect.ownKeys(ds).length !== ds.length.value + 1) throw Error('UNSAFE_RPATHS')
  const seen = new Set()
  for (let i = 0; i < ds.length.value; i++) {
    const d = ds[String(i)]
    if (!d || !Object.hasOwn(d, 'value')) throw Error('UNSAFE_RPATHS')
    const raw = d.value
    if (typeof raw !== 'string') throw Error('UNSAFE_RPATHS')
    const path = raw === '@loader_path/' ? posix.dirname(owner) :
      raw.startsWith('@loader_path/') ? resolveLoader(raw, owner, packageRoot, true) : cleanAbsolute(raw)
    if (!under(path, packageRoot) && path !== packageRoot) throw Error('EXTERNAL_RPATH')
    if (seen.has(path)) throw Error('DUPLICATE_RPATH')
    seen.add(path)
  }
  return [...seen]
}

export function auditNativeDependencyClosure(options) {
  const o = record(options, ['packageRoot', 'entryPath', 'records', 'maxNodes', 'maxDepth'])
  const packageRoot = cleanAbsolute(o.packageRoot)
  const entryPath = cleanAbsolute(o.entryPath)
  if (!under(entryPath, packageRoot)) throw Error('ENTRY_OUTSIDE_PACKAGE')
  const maxNodes = maxLimit(o.maxNodes, DEFAULT_NODES)
  const maxDepth = maxLimit(o.maxDepth, DEFAULT_DEPTH)
  const inputs = array(o.records)
  if (inputs.length > maxNodes) throw Error('RECORD_LIMIT')
  const graph = new Map()
  for (const input of inputs) {
    const r = record(input, ['path', 'output', 'rpaths', 'installName'])
    const path = cleanAbsolute(r.path)
    if (!under(path, packageRoot) || graph.has(path)) throw Error('DUPLICATE_OR_OUTSIDE_RECORD')
    const dependencies = parseOtool(r.output, path)
    if (r.installName !== undefined) {
      // Caller must separately supply the LC_ID_DYLIB string from a trusted inspection.
      // Install names may be build-relative or external; they are metadata, not loads.
      if (typeof r.installName !== 'string' || !r.installName ||
          r.installName.length > 2048 || /[\x00-\x1f\x7f\\]/.test(r.installName) ||
          dependencies[0] !== r.installName ||
          posix.basename(r.installName) !== posix.basename(path)) throw Error('INSTALL_NAME_MISMATCH')
      dependencies.shift()
    }
    graph.set(path, { dependencies, rpaths: readRpaths(r.rpaths, path, packageRoot) })
  }
  if (!graph.has(entryPath)) throw Error('MISSING_ENTRY_RECORD')
  const visiting = new Set()
  const visited = new Set()
  const osDependencies = new Set()
  function visit(path, depth) {
    if (depth > maxDepth) throw Error('DEPTH_LIMIT')
    if (visiting.has(path)) throw Error('DEPENDENCY_CYCLE')
    if (visited.has(path)) return
    const node = graph.get(path)
    if (!node) throw Error('MISSING_TRANSITIVE_RECORD')
    visiting.add(path)
    for (const raw of node.dependencies) {
      let target
      if (raw.startsWith('@loader_path/')) {
        target = resolveLoader(raw, path, packageRoot)
      } else if (raw.startsWith('@rpath/')) {
        const relative = raw.slice('@rpath/'.length)
        if (!relative || relative.includes('..') || relative.includes('\\') || relative.startsWith('/') || /[\x00-\x1f\x7f]/.test(relative)) throw Error('UNSAFE_PATH')
        if (node.rpaths.length !== 1) throw Error('UNRESOLVED_OR_AMBIGUOUS_RPATH')
        target = posix.resolve(node.rpaths[0], relative)
        if (!under(target, packageRoot)) throw Error('EXTERNAL_RPATH')
      } else if (raw.startsWith('@')) {
        throw Error('UNRESOLVED_DYNAMIC_PATH')
      } else {
        target = cleanAbsolute(raw)
      }
      if (under(target, packageRoot)) visit(target, depth + 1)
      else if (allowedOS(target)) osDependencies.add(target)
      else throw Error('EXTERNAL_NATIVE_DEPENDENCY')
    }
    visiting.delete(path)
    visited.add(path)
  }
  visit(entryPath, 0)
  if (visited.size !== graph.size) throw Error('UNREACHABLE_RECORD')
  return Object.freeze({ ok: true, inspectedNodes: visited.size, osDependencies: Object.freeze([...osDependencies].sort()) })
}
