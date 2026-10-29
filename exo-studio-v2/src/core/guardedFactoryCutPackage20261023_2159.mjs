// Experimental source-only DXF audit; it cannot certify manufacturing readiness.
import {buildFactoryPackageFiles} from './factoryPackage.js'
import {strictCutDxfEnvelope20261023_2053} from './strictCutDxfEnvelope20261023_2053.mjs'
import {preflightPhysicalCutOverlap20261023_2000} from './physicalCutOverlapPreflight20261023_2000.mjs'

const slug = value => String(value || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'garment'
const MAX_DXF_BYTES = 32 * 1024 * 1024
const decoder = new TextDecoder('utf-8', {fatal:true})
const diagnostic = (code, detail, path) => ({code, detail, ...(path ? {path} : {})})

/** Audit the exact bytes returned by buildFactoryPackageFiles; never mutate them. */
export function auditFactoryPackageCutSafety20261023_2159(files, expectedSizes) {
  const checks = []
  const diagnostics = []
  const reject = (code, detail, path) => diagnostics.push(diagnostic(code, detail, path))
  const result = () => ({ok:diagnostics.length === 0, checks, diagnostics, manufacturingApproved:false})

  if (!files || typeof files !== 'object' || Array.isArray(files)) {
    reject('INVALID_FACTORY_FILES', 'Factory files must be a path-to-bytes object')
    return result()
  }
  if (!Array.isArray(expectedSizes) || !expectedSizes.length || expectedSizes.length > 24 ||
      expectedSizes.some(size => typeof size !== 'string' || !/^[a-z0-9_-]{1,32}$/i.test(size)) ||
      new Set(expectedSizes.map(size => size.toLowerCase())).size !== expectedSizes.length) {
    reject('INVALID_EXPECTED_SIZES', 'Expected grading sizes must be unique, nonempty, safe labels')
    return result()
  }

  const patternPaths = Object.keys(files).filter(path => /^patterns\/.*\.dxf$/i.test(path))
  if (!patternPaths.length) reject('NO_FACTORY_DXF', 'Factory package contains no patterns/*.dxf')
  if (patternPaths.length !== expectedSizes.length) {
    reject('FACTORY_DXF_SIZE_COUNT', `Expected ${expectedSizes.length} DXFs, found ${patternPaths.length}`)
  }
  const expected = new Set(expectedSizes.map(size => size.toLowerCase()))
  const matched = new Set()
  for (const path of patternPaths) {
    const candidates = expectedSizes.filter(size => path.toLowerCase().endsWith(`-${size.toLowerCase()}.dxf`))
    // Require an unambiguous size suffix; only one DXF may represent each size.
    const size = candidates.length === 1 ? candidates[0].toLowerCase() : null
    if (!size || !/^patterns\/[a-z0-9_-]+\.dxf$/i.test(path)) reject('UNEXPECTED_FACTORY_DXF', 'Unrecognized or ambiguous grading size filename', path)
    else if (matched.has(size)) reject('DUPLICATE_FACTORY_SIZE', `Duplicate size ${size}`, path)
    else matched.add(size)

    const check = {path, size, ok:false, strictOk:false, physicalCutOk:false, contourCount:0, manufacturingApproved:false}
    checks.push(check)
    const bytes = files[path]
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > MAX_DXF_BYTES) {
      reject('MALFORMED_DXF_BYTES', 'DXF must be nonempty Uint8Array within 32 MiB', path)
      continue
    }
    let source
    try { source = decoder.decode(bytes) }
    catch { reject('MALFORMED_DXF_BYTES', 'DXF is not valid UTF-8', path); continue }
    if (source.includes('\0')) {
      reject('MALFORMED_DXF_BYTES', 'DXF contains NUL characters', path)
      continue
    }
    const strict = strictCutDxfEnvelope20261023_2053(source)
    const physical = preflightPhysicalCutOverlap20261023_2000(source)
    check.strictOk = strict.ok === true && strict.manufacturingApproved === false
    check.physicalCutOk = physical.ok === true && physical.manufacturingApproved === false
    check.contourCount = physical.contourCount ?? 0
    if (!check.strictOk) for (const issue of strict.diagnostics || []) reject(issue.code || 'STRICT_DXF_FAILED', issue.detail || 'Strict DXF envelope refused', path)
    if (!check.physicalCutOk) for (const issue of physical.diagnostics || []) reject(issue.code || 'PHYSICAL_CUT_FAILED', issue.detail || 'Physical CUT preflight refused', path)
    if (strict.overlaps?.length || physical.overlaps?.length) reject('PHYSICAL_CUT_INTERIOR_OVERLAP', 'Overlapping physical CUT contours', path)
    if (check.contourCount < 1) reject('MISSING_PHYSICAL_CUT', 'No valid physical CUT contour', path)
    check.ok = check.strictOk && check.physicalCutOk && check.contourCount > 0 &&
      !strict.overlaps?.length && !physical.overlaps?.length && Boolean(size)
  }
  for (const size of expected) if (!matched.has(size)) reject('MISSING_SIZE_DXF', `Missing factory DXF for size ${size}`)
  if (checks.some(check => !check.ok)) reject('FAILED_FACTORY_DXF_CHECK', 'At least one factory DXF failed safety preflight')
  return result()
}

/** Reject unsafe DXFs before handing a factory package's files to a ZIP writer. */
export function buildGuardedFactoryPackageFiles20261023_2159(project) {
  const sizes = project?.grading?.sizes ?? [project?.grading?.baseSize || 'M']
  const expectedSizes = Array.isArray(sizes) ? sizes : null
  let files
  try { files = buildFactoryPackageFiles(project) }
  catch (error) {
    const wrapped = new Error(`Factory DXF export refused: ${error?.message || String(error)}`)
    wrapped.code = 'UNSAFE_FACTORY_DXF'
    wrapped.diagnostics = [diagnostic('FACTORY_PACKAGE_BUILD_FAILED', error?.message || String(error))]
    throw wrapped
  }
  const audit = auditFactoryPackageCutSafety20261023_2159(files, expectedSizes)
  // Ensure the expected project name maps to the factory export naming convention.
  const prefix = `patterns/${slug(project?.name)}-`
  for (const check of audit.checks) if (!check.path.startsWith(prefix)) {
    audit.ok = false
    audit.diagnostics.push(diagnostic('FACTORY_DXF_PROJECT_MISMATCH', 'DXF name does not match project', check.path))
  }
  if (!audit.ok) {
    const error = new Error(`Unsafe factory DXF package: ${audit.diagnostics.map(d => d.code).join(', ')}`)
    error.code = 'UNSAFE_FACTORY_DXF'
    error.diagnostics = audit.diagnostics
    error.checks = audit.checks
    throw error
  }
  return files
}
