// DEVELOPMENT ONLY. Local disk can be rolled back by an attacker with filesystem write access.
import { constants } from 'node:fs'
import { lstat, mkdir, open, link, rename, rmdir, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, parse, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { types } from 'node:util'

const MAX_BYTES = 128
const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0)
const metadata = Object.freeze({
  developmentOnly: true,
  rollbackFloorIndependentlyTrusted: false,
  manufacturingApproved: false,
  runtimeExecutionAuthorized: false,
})

function options(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value)) throw Error('UNSAFE_OPTIONS')
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) throw Error('UNSAFE_OPTIONS')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const names = Reflect.ownKeys(descriptors)
  if (names.length !== keys.length || names.some(k => typeof k !== 'string' || !keys.includes(k) || !Object.hasOwn(descriptors[k], 'value'))) throw Error('INVALID_OPTIONS')
  return Object.fromEntries(names.map(k => [k, descriptors[k].value]))
}

function version(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw Error('INVALID_VERSION')
  return value
}

function target(value) {
  if (typeof value !== 'string' || !isAbsolute(value) || value.includes('\0') || resolve(value) !== value || value.endsWith('/')) throw Error('INVALID_PATH')
  const name = value.slice(value.lastIndexOf('/') + 1)
  if (!name || name === '.' || name === '..') throw Error('INVALID_PATH')
  return value
}

async function ancestors(path) {
  const parent = dirname(path)
  let current = parse(parent).root
  const parts = parent.slice(current.length).split('/').filter(Boolean)
  for (const part of parts) {
    current = resolve(current, part)
    const s = await lstat(current)
    if (!s.isDirectory() || s.isSymbolicLink()) throw Error('UNSAFE_PATH_ANCESTOR')
    if ((s.mode & 0o002) && !(s.mode & 0o1000)) throw Error('WORLD_WRITABLE_ANCESTOR')
  }
}

async function expectedFile(path) {
  const s = await lstat(path)
  if (!s.isFile() || s.isSymbolicLink() || s.nlink !== 1 || (s.mode & 0o077) !== 0) throw Error('UNSAFE_CHECKPOINT_FILE')
  return s
}

async function readVersion(path) {
  const before = await expectedFile(path)
  const handle = await open(path, flags)
  try {
    const after = await handle.stat()
    if (!after.isFile() || after.nlink !== 1 || before.dev !== after.dev || before.ino !== after.ino || (after.mode & 0o077) !== 0 || after.size > MAX_BYTES) throw Error('UNSAFE_CHECKPOINT_FILE')
    const buffer = Buffer.alloc(MAX_BYTES + 1)
    let length = 0
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length)
      if (!bytesRead) break
      length += bytesRead
    }
    if (length > MAX_BYTES) throw Error('CORRUPT_CHECKPOINT')
    const data = buffer.subarray(0, length)
    const match = /^\{"schema":1,"version":([1-9][0-9]*)\}\n$/.exec(data.toString('utf8'))
    if (!match || Buffer.byteLength(match[0]) !== data.length) throw Error('CORRUPT_CHECKPOINT')
    const n = Number(match[1])
    version(n)
    if (String(n) !== match[1]) throw Error('CORRUPT_CHECKPOINT')
    return n
  } finally { await handle.close() }
}

async function directorySync(path) {
  const h = await open(path, constants.O_RDONLY)
  try { await h.sync() } finally { await h.close() }
}

function result(n) { return Object.freeze({ ...metadata, minimumTrustedVersion: n }) }

async function lock(path) {
  const lockPath = path + '.lock'
  // A crashed process leaves a lock behind. Never auto-reclaim based on age or PID.
  for (let attempt = 0; attempt < 40; attempt++) {
    await ancestors(path)
    try {
      await mkdir(lockPath, { mode: 0o700 })
      const ours = await lstat(lockPath)
      await directorySync(dirname(path))
      return async () => {
        const current = await lstat(lockPath)
        if (!current.isDirectory() || current.ino !== ours.ino || current.dev !== ours.dev) throw Error('LOCK_IDENTITY_CHANGED')
        await rmdir(lockPath)
        await directorySync(dirname(path))
      }
    } catch (err) {
      if (err?.code !== 'EEXIST') throw err
      const s = await lstat(lockPath)
      if (!s.isDirectory() || s.isSymbolicLink()) throw Error('UNSAFE_LOCK')
      await new Promise(r => setTimeout(r, 20))
    }
  }
  throw Error('CHECKPOINT_LOCK_BUSY')
}

async function store(path, n, exclusive = false) {
  const temp = path + '.tmp-' + randomBytes(12).toString('hex')
  let tempCreated = false
  try {
    const h = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600)
    tempCreated = true
    try {
      await h.writeFile(`{"schema":1,"version":${n}}\n`, 'utf8')
      await h.sync()
    } finally { await h.close() }
    if (exclusive) {
      // Hard link creates destination only when absent; rename could clobber a concurrent creator.
      await link(temp, path)
      await unlink(temp)
    } else {
      await rename(temp, path)
    }
    tempCreated = false
    await directorySync(dirname(path))
  } finally {
    if (tempCreated) await unlink(temp).catch(() => {})
  }
}

/** Initialize only after a separate, trusted decision explicitly supplies the initial floor. */
export async function initializeLocalPolicyFloor(raw) {
  const o = options(raw, ['path', 'version', 'trustedInitialization'])
  const path = target(o.path)
  const n = version(o.version)
  if (o.trustedInitialization !== true) throw Error('TRUSTED_INITIALIZATION_REQUIRED')
  await ancestors(path)
  const unlock = await lock(path)
  try {
    try { await lstat(path); throw Error('CHECKPOINT_ALREADY_EXISTS') }
    catch (e) { if (e?.code !== 'ENOENT') throw e }
    await store(path, n, true)
    return result(n)
  } finally { await unlock() }
}

export async function readLocalPolicyFloor(raw) {
  const o = options(raw, ['path'])
  const path = target(o.path)
  await ancestors(path)
  const unlock = await lock(path)
  try { return result(await readVersion(path)) }
  finally { await unlock() }
}

export async function advanceLocalPolicyFloor(raw) {
  const o = options(raw, ['path', 'version'])
  const path = target(o.path)
  const n = version(o.version)
  await ancestors(path)
  const unlock = await lock(path)
  try {
    const previous = await readVersion(path)
    if (n < previous) throw Error('CHECKPOINT_DOWNGRADE')
    if (n > previous) {
      await expectedFile(path)
      await store(path, n)
    }
    return result(n)
  } finally { await unlock() }
}
