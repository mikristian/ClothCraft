// Development-only inventory; caller pins its own trusted manifest.
import { createHash, timingSafeEqual } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, readdir, open } from 'node:fs/promises'
import { resolve, join, parse, sep } from 'node:path'
import { types } from 'node:util'

const nameOK = /^(?!\.{1,2}$)[A-Za-z0-9_][A-Za-z0-9_.+-]{0,127}$/
const digestOK = /^[0-9a-f]{64}$/
const defaults = Object.freeze({ maxFiles: 1024, maxBytes: 128 * 1024 * 1024, maxFileBytes: 64 * 1024 * 1024, maxDepth: 12 })

function ownData(value, keys) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) throw Error('UNSAFE_OPTIONS')
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw Error('UNSAFE_OPTIONS')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || (keys !== null && !keys.includes(key)) || !Object.hasOwn(descriptors[key], 'value')) throw Error('UNSAFE_OPTIONS')
  }
  return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]))
}

function positiveInt(value, fallback) {
  if (value === undefined) return fallback
  if (!Number.isSafeInteger(value) || value < 1 || value > fallback) throw Error('INVALID_LIMIT')
  return value
}

async function verifyPathComponents(directory) {
  const full = resolve(directory)
  let current = parse(full).root
  for (const part of full.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, part)
    const st = await lstat(current)
    if (st.isSymbolicLink() || !st.isDirectory()) throw Error('UNSAFE_DIRECTORY')
  }
  return full
}

export async function inventoryPythonPackage(options) {
  const o = ownData(options, ['directory', 'maxFiles', 'maxBytes', 'maxFileBytes', 'maxDepth'])
  if (typeof o.directory !== 'string' || !o.directory || o.directory.includes('\0')) throw Error('INVALID_DIRECTORY')
  if (o.directory.split(/[\\/]/).includes('..')) throw Error('TRAVERSAL_REJECTED')
  const limits = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, positiveInt(o[key], value)]))
  const directory = await verifyPathComponents(o.directory)
  const files = Object.create(null)
  let totalBytes = 0
  let fileCount = 0
  async function walk(base, relative, depth) {
    if (depth > limits.maxDepth) throw Error('DEPTH_LIMIT')
    const entries = await readdir(base, { withFileTypes: true })
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    for (const entry of entries) {
      if (!nameOK.test(entry.name)) throw Error('UNSAFE_FILENAME')
      const path = join(base, entry.name)
      const child = relative ? `${relative}/${entry.name}` : entry.name
      const st = await lstat(path)
      if (st.isSymbolicLink()) throw Error('SYMLINK_REJECTED')
      if (st.isDirectory()) { await walk(path, child, depth + 1); continue }
      if (!st.isFile()) throw Error('NONREGULAR_ENTRY')
      if (++fileCount > limits.maxFiles) throw Error('FILE_LIMIT')
      if (st.size > limits.maxFileBytes || totalBytes + st.size > limits.maxBytes) throw Error('BYTE_LIMIT')
      const fd = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0))
      try {
        const before = await fd.stat()
        if (!before.isFile() || before.size !== st.size || before.ino !== st.ino || before.dev !== st.dev) throw Error('CHANGED_DURING_READ')
        const sha = createHash('sha256')
        const chunk = Buffer.allocUnsafe(65536)
        let offset = 0
        while (offset < st.size) {
          const { bytesRead } = await fd.read(chunk, 0, Math.min(chunk.length, st.size - offset), offset)
          if (bytesRead === 0) throw Error('CHANGED_DURING_READ')
          sha.update(chunk.subarray(0, bytesRead))
          offset += bytesRead
        }
        const after = await fd.stat()
        if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || after.ino !== before.ino) throw Error('CHANGED_DURING_READ')
        files[child] = sha.digest('hex')
        totalBytes += offset
      } finally { await fd.close() }
    }
  }
  await walk(directory, '', 0)
  const canonical = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
  return { files: canonical, fileCount, totalBytes }
}

export async function comparePythonPackageManifest(options) {
  const o = ownData(options, ['directory', 'manifest', 'maxFiles', 'maxBytes', 'maxFileBytes', 'maxDepth'])
  ownData(o.manifest, null) // validate shape and descriptors before inspecting content
  const manifestDescriptors = Object.getOwnPropertyDescriptors(o.manifest)
  const paths = Reflect.ownKeys(manifestDescriptors)
  for (const path of paths) {
    if (typeof path !== 'string' || !path.split('/').every(name => nameOK.test(name)) || !Object.hasOwn(manifestDescriptors[path], 'value')) throw Error('UNSAFE_MANIFEST')
    const digest = manifestDescriptors[path].value
    if (typeof digest !== 'string' || !digestOK.test(digest)) throw Error('UNSAFE_MANIFEST')
  }
  const observed = await inventoryPythonPackage({ directory: o.directory, maxFiles: o.maxFiles, maxBytes: o.maxBytes, maxFileBytes: o.maxFileBytes, maxDepth: o.maxDepth })
  if (paths.length !== observed.fileCount) return { ok: false, reason: 'FILE_SET_MISMATCH', ...observed }
  for (const path of paths) {
    const digest = manifestDescriptors[path].value
    const actual = observed.files[path]
    if (!actual) return { ok: false, reason: 'FILE_SET_MISMATCH', ...observed }
    if (!timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(actual, 'hex'))) return { ok: false, reason: 'HASH_MISMATCH', ...observed }
  }
  return { ok: true, reason: 'MATCH', ...observed }
}
