// Development-only bounded filesystem observation. Does not authorize execution.
import { constants, closeSync, fstatSync, lstatSync, openSync, readSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { posix } from 'node:path'
import { types } from 'node:util'

const MAX_BYTES = 32 * 1024 * 1024
const ALLOWED = ['packageRoot', 'entryPath', 'expectedSha256']

function optionsData(input) {
  if (input === null || typeof input !== 'object' || types.isProxy(input) ||
      (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null)) throw Error('UNSAFE_OPTIONS')
  const descriptors = Object.getOwnPropertyDescriptors(input)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some(key => typeof key !== 'string' || !ALLOWED.includes(key) || !Object.hasOwn(descriptors[key], 'value')) ||
      !Object.hasOwn(descriptors, 'packageRoot') || !Object.hasOwn(descriptors, 'entryPath')) throw Error('UNSAFE_OPTIONS')
  return { root: descriptors.packageRoot.value, entry: descriptors.entryPath.value,
    digest: descriptors.expectedSha256?.value }
}

function absolute(value) {
  if (typeof value !== 'string' || value.length < 2 || value.length > 2048 ||
      !value.startsWith('/') || value.endsWith('/') || value.includes('//') ||
      /[\\\x00-\x1f\x7f]/.test(value) || value.split('/').some(p => p === '.' || p === '..')) throw Error('UNSAFE_PATH')
  return value
}

function checkComponents(path, isRoot) {
  let component = '/'
  for (const segment of path.slice(1).split('/')) {
    component = posix.join(component, segment)
    const stat = lstatSync(component, { bigint: true })
    if (stat.isSymbolicLink()) throw Error('SYMLINK_COMPONENT')
    if (component !== path && !stat.isDirectory()) throw Error('NON_DIRECTORY_COMPONENT')
    if (component === path) {
      if (isRoot ? !stat.isDirectory() : !stat.isFile()) throw Error('INVALID_FILE_TYPE')
      if (!isRoot && stat.nlink !== 1n) throw Error('HARDLINK_ENTRY')
    }
  }
  if (realpathSync.native(path) !== path) throw Error('NONCANONICAL_PATH')
  return lstatSync(path, { bigint: true })
}

function stable(a, b) {
  return a.dev === b.dev && a.ino === b.ino && a.size === b.size &&
    a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs && a.mode === b.mode && a.nlink === b.nlink
}

function opened(path, flags, initial, isRoot) {
  const fd = openSync(path, flags)
  try {
    const stat = fstatSync(fd, { bigint: true })
    if (!stable(initial, stat) || (isRoot ? !stat.isDirectory() : !stat.isFile()) ||
        (!isRoot && stat.nlink !== 1n)) throw Error('FILE_IDENTITY_CHANGED')
    return { fd, stat }
  } catch (error) { closeSync(fd); throw error }
}

export function auditNativeFileIdentity(options) {
  const { root: rawRoot, entry: rawEntry, digest } = optionsData(options)
  const root = absolute(rawRoot)
  const entry = absolute(rawEntry)
  if (!entry.startsWith(root + '/')) throw Error('ENTRY_OUTSIDE_PACKAGE')
  if (digest !== undefined && (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))) throw Error('INVALID_DIGEST')
  if (typeof constants.O_NOFOLLOW !== 'number' || typeof constants.O_DIRECTORY !== 'number' ||
      typeof constants.O_NONBLOCK !== 'number') throw Error('NOFOLLOW_UNSUPPORTED')

  const rootBefore = checkComponents(root, true)
  const entryBefore = checkComponents(entry, false)
  const rootHandle = opened(root, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_DIRECTORY, rootBefore, true)
  try {
    const entryHandle = opened(entry, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK, entryBefore, false)
    try {
      const before = entryHandle.stat
      if (before.size < 0n || before.size > BigInt(MAX_BYTES)) throw Error('FILE_SIZE_LIMIT')
      const hash = createHash('sha256')
      const buf = Buffer.allocUnsafe(65536)
      let offset = 0
      const total = Number(before.size)
      while (offset < total) {
        const read = readSync(entryHandle.fd, buf, 0, Math.min(buf.length, total - offset), offset)
        if (read <= 0) throw Error('SHORT_READ')
        hash.update(buf.subarray(0, read))
        offset += read
      }
      const after = fstatSync(entryHandle.fd, { bigint: true })
      const entryAtEnd = checkComponents(entry, false)
      const rootAtEnd = checkComponents(root, true)
      if (!stable(before, after) || !stable(after, entryAtEnd) ||
          !stable(rootHandle.stat, rootAtEnd) || !stable(rootHandle.stat, fstatSync(rootHandle.fd, { bigint: true }))) throw Error('FILE_IDENTITY_CHANGED')
      const sha256 = hash.digest('hex')
      if (digest !== undefined && digest !== sha256) throw Error('DIGEST_MISMATCH')
      return Object.freeze({ ok: true, sha256, dev: String(after.dev), ino: String(after.ino),
        rootDev: String(rootHandle.stat.dev), rootIno: String(rootHandle.stat.ino),
        manufacturingApproved: false, runtimeExecutionAuthorized: false })
    } finally { closeSync(entryHandle.fd) }
  } finally { closeSync(rootHandle.fd) }
}
