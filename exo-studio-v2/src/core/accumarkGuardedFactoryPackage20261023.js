import { strToU8, strFromU8, zipSync } from 'fflate'
import { exportAccuMarkVerifiedSizeDxf20261023 } from './accumarkFactoryDxfPreflight20261023.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { sha256Bytes } from './sha256Bytes.js'
import { requireAccuMarkGuardedFactoryMarkerParity20261024 } from './accumarkGuardedFactoryMarkerGate20261024.mjs'
import { requireAccuMarkGuardedFactoryPostZipParity20261024 } from './accumarkGuardedFactoryPostZipGate20261024.mjs'

const slug = value => String(value || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'garment'
const MAX_FILE = 32 * 1024 * 1024
const MAX_TOTAL = 128 * 1024 * 1024

/** Development package only. Every physical CUT size must pass independent preflight. */
export function buildAccuMarkGuardedFactoryPackage20261023(project, { zip = false } = {}) {
  try {
    const options = arguments[1]
    if (options === null || (options !== undefined && (typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(k => k !== 'zip')))) throw new Error('Invalid package options')
    if (typeof zip !== 'boolean') throw new Error('zip must be boolean')
    if (!project || typeof project !== 'object' || typeof project.name !== 'string') throw new Error('Invalid project')
    const sizes = project.grading?.sizes
    if (!Array.isArray(sizes) || sizes.length < 2 || sizes.length > 24 || sizes.some(size => typeof size !== 'string' || !/^[a-z0-9_-]{1,32}$/i.test(size))) throw new Error('Unsupported grading size run')
    if (new Set(sizes).size !== sizes.length || new Set(sizes.map(size => size.toLowerCase())).size !== sizes.length) throw new Error('Colliding grading sizes')
    const name = slug(project.name)
    const verified = new Map()
    for (const size of sizes) {
      const path = `patterns/${name}-${size.toLowerCase()}.dxf`
      if (verified.has(path)) throw new Error(`Colliding DXF filename: ${path}`)
      const result = exportAccuMarkVerifiedSizeDxf20261023(project, size)
      if (!result.ok || result.size !== size || typeof result.dxf !== 'string') throw new Error(`${size}: ${result.reason || 'missing verified DXF'}`)
      const bytes = strToU8(result.dxf)
      if (bytes.length === 0 || bytes.length > MAX_FILE) throw new Error(`DXF size limit: ${size}`)
      verified.set(path, bytes)
    }

    const files = buildFactoryPackageFiles(project)
    const inventory = Object.keys(files)
    if (inventory.length > 4096 || inventory.some(path => path === '__proto__' || !/^[a-zA-Z0-9_./-]+$/.test(path) || path.includes('..'))) throw new Error('Unsafe factory inventory')
    const patternPaths = inventory.filter(path => path.startsWith('patterns/') && path.endsWith('.dxf'))
    if (patternPaths.length !== verified.size || patternPaths.some(path => !verified.has(path))) throw new Error('Factory pattern inventory differs from verified size run')
    for (const [path, bytes] of verified) {
      if (!Object.hasOwn(files, path)) throw new Error(`Missing factory pattern ${path}`)
      files[path] = bytes
    }
    const manifest = JSON.parse(strFromU8(files['manifest.json']))
    if (manifest?.format !== 'garment-studio-factory-package' || manifest.version !== 2) throw new Error('Unsupported factory manifest')
    const paths = Object.keys(files).filter(path => path !== 'manifest.json').sort()
    let total = 0
    for (const path of paths) {
      const bytes = files[path]
      if (!(bytes instanceof Uint8Array) || bytes.length > MAX_FILE) throw new Error(`Factory file size limit: ${path}`)
      total += bytes.length
      if (total > MAX_TOTAL) throw new Error('Factory package size limit')
    }
    manifest.files = [...paths, 'manifest.json'].sort()
    manifest.sha256 = Object.fromEntries(paths.map(path => [path, sha256Bytes(files[path])]))
    files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2))
    if (files['manifest.json'].length > MAX_FILE) throw new Error('Manifest size limit')
    total += files['manifest.json'].length
    if (total > MAX_TOTAL) throw new Error('Factory package size limit')
    // A rehashed manifest or calibration-only check cannot prove cutting geometry.
    // Audit the final exact file map against the authored source before any ZIP
    // bytes are returned to the browser or another package consumer.
    requireAccuMarkGuardedFactoryMarkerParity20261024(files, project)
    if (zip) {
      const bytes = zipSync(files, { level: 6 })
      if (bytes.length > MAX_TOTAL) throw new Error('Compressed package size limit')
      // The browser receives these exact ZIP bytes; independently reconstruct
      // the extraction and re-run source-derived geometry parity before return.
      requireAccuMarkGuardedFactoryPostZipParity20261024(bytes, files, project)
      return { ok: true, files, zip: bytes, manufacturingApproved: false }
    }
    return { ok: true, files, manufacturingApproved: false }
  } catch (error) {
    return { ok: false, reason: `Guarded factory package refused: ${error instanceof Error ? error.message : String(error)}`, manufacturingApproved: false }
  }
}
