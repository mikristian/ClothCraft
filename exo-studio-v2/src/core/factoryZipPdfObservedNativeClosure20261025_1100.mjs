// Development-only local Mach-O observation. Never executes an input-controlled command.
import { execFileSync } from 'node:child_process'
import { lstatSync, realpathSync } from 'node:fs'
import { posix } from 'node:path'
import { types } from 'node:util'
import { auditNativeDependencyClosure } from './factoryZipPdfNativeDependencyClosure20261025_1000.mjs'

const OS = ['/usr/lib/', '/System/Library/Frameworks/', '/System/Library/PrivateFrameworks/']
const LIMIT = 64
function absolute(value) {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') ||
      value.endsWith('/') || value.includes('//') || /[\\\x00-\x1f\x7f]/.test(value) ||
      value.split('/').some(p => p === '.' || p === '..')) throw Error('UNSAFE_PATH')
  return value
}
const within = (p, root) => p.startsWith(root + '/')
function safeFile(path, root, directory = false) {
  absolute(path)
  if (path !== root && !within(path, root)) throw Error('PATH_OUTSIDE_ROOT')
  // Reject symbolic links at every component, including the package root and ancestors.
  let prefix = '/'
  for (const segment of path.slice(1).split('/')) {
    prefix = posix.join(prefix, segment)
    if (lstatSync(prefix).isSymbolicLink()) throw Error('SYMLINK_PATH')
  }
  const stat = lstatSync(path)
  if (directory ? !stat.isDirectory() : !stat.isFile()) throw Error('INVALID_FILE_TYPE')
  if (realpathSync.native(path) !== path) throw Error('NONCANONICAL_PATH')
}
function observed(path, flag) {
  let output
  try {
    output = execFileSync('/usr/bin/otool', [flag, path], {
      encoding: 'utf8', timeout: 3000, maxBuffer: 65536, windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore']
    })
  } catch { throw Error('OTOOL_INSPECTION_FAILED') }
  if (typeof output !== 'string' || output.length > 65536 || /[\r\0]/.test(output)) throw Error('MALFORMED_OTOOL')
  return output
}
function loadCommands(output, path) {
  const lines = output.trimEnd().split('\n')
  if (lines.shift() !== path + ':' || !lines.length) throw Error('MALFORMED_LOAD_COMMANDS')
  const commands = []
  let current = null
  for (const line of lines) {
    if (/^Load command \d+$/.test(line)) {
      if (Number(line.slice(13)) !== commands.length + (current ? 1 : 0)) throw Error('MALFORMED_LOAD_COMMANDS')
      if (current) commands.push(current)
      current = { fields: [] }
    } else {
      if (!current) throw Error('MALFORMED_LOAD_COMMANDS')
      if (/^\s+cmd\s+/.test(line) || /^\s+(name|path)\s+/.test(line)) current.fields.push(line.trim())
    }
  }
  if (current) commands.push(current)
  if (!commands.length || commands.length > 512) throw Error('LOAD_COMMAND_LIMIT')
  const rpaths = []
  const loads = []
  let id
  for (const command of commands) {
    const cmds = command.fields.filter(f => f.startsWith('cmd '))
    if (cmds.length !== 1) throw Error('MALFORMED_LOAD_COMMANDS')
    const cmd = cmds[0].slice(4)
    if (['LC_LOAD_WEAK_DYLIB', 'LC_REEXPORT_DYLIB', 'LC_LOAD_UPWARD_DYLIB', 'LC_LAZY_LOAD_DYLIB'].includes(cmd)) throw Error('UNSUPPORTED_LOAD_COMMAND')
    if (cmd !== 'LC_RPATH' && cmd !== 'LC_ID_DYLIB' && cmd !== 'LC_LOAD_DYLIB') continue
    const fieldName = cmd === 'LC_RPATH' ? 'path' : 'name'
    const matches = command.fields.filter(f => f.startsWith(fieldName + ' '))
    if (matches.length !== 1) throw Error('MALFORMED_LOAD_COMMANDS')
    const match = new RegExp('^' + fieldName + ' (.+) \\(offset [0-9]+\\)$').exec(matches[0])
    if (!match || match[1].length > 2048) throw Error('MALFORMED_LOAD_COMMANDS')
    if (cmd === 'LC_RPATH') rpaths.push(match[1])
    else if (cmd === 'LC_LOAD_DYLIB') loads.push(match[1])
    else {
      if (id !== undefined) throw Error('DUPLICATE_INSTALL_NAME')
      id = match[1]
    }
  }
  if (rpaths.length > 16) throw Error('RPATH_LIMIT')
  return { rpaths, installName: id, loads }
}
function dependencies(output, path, id) {
  const lines = output.trimEnd().split('\n')
  if (lines.shift() !== path + ':' || lines.length < 1 || lines.length > 256) throw Error('MALFORMED_OTOOL')
  const deps = lines.map(line => {
    const match = /^\t([^\t\n]+) \(compatibility version \d+\.\d+\.\d+, current version \d+\.\d+\.\d+\)$/.exec(line)
    if (!match) throw Error('MALFORMED_OTOOL')
    return match[1]
  })
  if (id !== undefined && deps[0] !== id) throw Error('INSTALL_NAME_MISMATCH')
  return id === undefined ? deps : deps.slice(1)
}
function target(raw, owner, root, rpaths) {
  let resolved
  if (raw.startsWith('@loader_path/')) resolved = posix.resolve(posix.dirname(owner), raw.slice(13))
  else if (raw.startsWith('@rpath/')) {
    if (rpaths.length !== 1) throw Error('UNRESOLVED_OR_AMBIGUOUS_RPATH')
    const rp = rpaths[0]
    const base = rp === '@loader_path/' ? posix.dirname(owner) :
      rp.startsWith('@loader_path/') ? posix.resolve(posix.dirname(owner), rp.slice(13)) : absolute(rp)
    if (base !== root && !within(base, root)) throw Error('EXTERNAL_RPATH')
    const relative = raw.slice(7)
    if (!relative || relative.split('/').some(x => x === '..' || x === '.') || relative.includes('\\')) throw Error('UNSAFE_PATH')
    resolved = posix.resolve(base, relative)
  } else if (raw.startsWith('@')) throw Error('UNRESOLVED_DYNAMIC_PATH')
  else resolved = absolute(raw)
  if (within(resolved, root)) return resolved
  if (OS.some(prefix => resolved.startsWith(prefix))) return null
  throw Error('EXTERNAL_NATIVE_DEPENDENCY')
}

export function auditObservedNativeDependencyClosure(options) {
  if (!options || typeof options !== 'object' || types.isProxy(options) ||
      (Object.getPrototypeOf(options) !== Object.prototype && Object.getPrototypeOf(options) !== null)) throw Error('UNSAFE_OPTIONS')
  const ds = Object.getOwnPropertyDescriptors(options)
  if (Reflect.ownKeys(ds).some(k => !['packageRoot', 'entryPath'].includes(k) || !Object.hasOwn(ds[k], 'value'))) throw Error('UNSAFE_OPTIONS')
  const root = absolute(ds.packageRoot?.value)
  const entry = absolute(ds.entryPath?.value)
  if (!within(entry, root)) throw Error('ENTRY_OUTSIDE_PACKAGE')
  safeFile(root, root, true)
  const pending = [entry]
  const records = new Map()
  while (pending.length) {
    const path = pending.pop()
    if (records.has(path)) continue
    if (records.size >= LIMIT) throw Error('RECORD_LIMIT')
    safeFile(path, root)
    const metadata = loadCommands(observed(path, '-l'), path)
    const output = observed(path, '-L')
    const deps = dependencies(output, path, metadata.installName)
    if (deps.length !== metadata.loads.length || deps.some((dep, index) => dep !== metadata.loads[index])) throw Error('DEPENDENCY_OBSERVATION_MISMATCH')
    for (const dep of deps) {
      const next = target(dep, path, root, metadata.rpaths)
      if (next && !records.has(next)) pending.push(next)
    }
    records.set(path, { path, output, rpaths: metadata.rpaths, installName: metadata.installName })
  }
  return auditNativeDependencyClosure({ packageRoot: root, entryPath: entry, records: [...records.values()], maxNodes: LIMIT })
}
