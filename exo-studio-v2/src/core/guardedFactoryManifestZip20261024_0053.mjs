// Experimental factory ZIP pipeline. Source/byte integrity is not manufacturing approval.
import {zipSync, unzipSync} from 'fflate'
import {buildAccuMarkGuardedFactoryPackage20261023} from './accumarkGuardedFactoryPackage20261023.js'
import {auditFactoryPackageManifestBrowser20261024_0053} from './factoryPackageManifestBrowser20261024_0053.mjs'
import {requireAccuMarkGuardedFactoryPostZipParity20261024} from './accumarkGuardedFactoryPostZipGate20261024.mjs'

const MAX_ZIP_BYTES = 40 * 1024 * 1024
const MAX_ENTRIES = 320
const MAX_ENTRY_BYTES = 8 * 1024 * 1024
const MAX_TOTAL_BYTES = 40 * 1024 * 1024

/** Verify the actual archive extraction before returning any downloadable bytes. */
export function buildGuardedFactoryManifestZip20261024_0053(project) {
  const refuse = (reason, diagnostics = []) => ({ok:false, reason, diagnostics, manufacturingApproved:false, factoryCertified:false})
  try {
    const built = buildAccuMarkGuardedFactoryPackage20261023(project, {zip:false})
    if (built.ok !== true || !built.files) return refuse(built.reason || 'Factory CUT preflight refused')
    const before = auditFactoryPackageManifestBrowser20261024_0053(built.files, project)
    if (before.ok !== true) return refuse('Factory manifest preflight refused', before.diagnostics)

    const bytes = zipSync(built.files, {level:0})
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > MAX_ZIP_BYTES) {
      return refuse('Factory ZIP exceeds bounded size')
    }
    // This alternate experimental ZIP builder must meet the same source-derived
    // post-serialization CRC, envelope, resource and cutting-geometry gate as
    // the browser download path. A manifest-only check is not sufficient.
    requireAccuMarkGuardedFactoryPostZipParity20261024(bytes, built.files, project)
    let count = 0
    let total = 0
    let invalid = false
    const extracted = unzipSync(bytes, {
      filter: info => {
        count++
        const size = info.originalSize
        if (count > MAX_ENTRIES || !Number.isSafeInteger(size) || size < 1 || size > MAX_ENTRY_BYTES ||
            total + size > MAX_TOTAL_BYTES) {
          invalid = true
          return false
        }
        total += size
        return true
      },
    })
    if (invalid || Object.keys(extracted).length !== count) return refuse('Factory ZIP extraction inventory or size limit failed')
    const after = auditFactoryPackageManifestBrowser20261024_0053(extracted, project)
    if (after.ok !== true) return refuse('Factory ZIP extracted manifest refused', after.diagnostics)
    const paths = Object.keys(built.files).sort()
    if (JSON.stringify(paths) !== JSON.stringify(Object.keys(extracted).sort())) {
      return refuse('Factory ZIP path inventory changed during serialization')
    }
    for (const path of paths) {
      const expected = built.files[path]
      const actual = extracted[path]
      if (!(actual instanceof Uint8Array) || expected.byteLength !== actual.byteLength ||
          expected.some((byte, index) => byte !== actual[index])) {
        return refuse(`Factory ZIP byte mismatch: ${path}`)
      }
    }
    return {ok:true, bytes, fileCount:paths.length, manufacturingApproved:false, factoryCertified:false}
  } catch (error) {
    return refuse(`Factory ZIP integrity check failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}
