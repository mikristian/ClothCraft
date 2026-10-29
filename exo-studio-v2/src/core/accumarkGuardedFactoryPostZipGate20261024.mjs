import { unzipSync } from 'fflate'
import { auditFactoryZipResourceThenCrc20261024_0600 } from './factoryZipResourceBudget20261024_0600.mjs'
import { auditFactoryZipEnvelope20261024_0154 } from './factoryZipEnvelope20261024_0154.mjs'
import { requireAccuMarkGuardedFactoryMarkerParity20261024 } from './accumarkGuardedFactoryMarkerGate20261024.mjs'

const MAX_ARCHIVE = 16 * 1024 * 1024
const MAX_ENTRY = 4 * 1024 * 1024
const MAX_TOTAL = 16 * 1024 * 1024
const MAX_ENTRIES = 80

/**
 * Verify the actual serialized download, not just the pre-ZIP file map.
 * The byte snapshot is bounded before allocation; structural checks run before
 * any decompression. This is digital parity only, never physical approval.
 */
export function requireAccuMarkGuardedFactoryPostZipParity20261024(zipBytes, sourceFiles, project) {
  if (!(zipBytes instanceof Uint8Array) || zipBytes.byteLength === 0 || zipBytes.byteLength > MAX_ARCHIVE) {
    throw Error('Guarded factory ZIP refused: invalid or oversized archive')
  }
  const snapshot = Uint8Array.from(zipBytes)
  // ZIP extraction alone does not authenticate CRC fields. Require the
  // independent CRC/DEFLATE audit as well as byte parity with the source map.
  const budget = auditFactoryZipResourceThenCrc20261024_0600(snapshot)
  if (budget?.ok !== true || budget.manufacturingApproved !== false) {
    throw Error(`Guarded factory ZIP resource/CRC preflight refused: ${budget?.diagnostics?.[0]?.code || 'UNKNOWN'}`)
  }
  const envelope = auditFactoryZipEnvelope20261024_0154(snapshot)
  if (envelope?.ok !== true || envelope.manufacturingApproved !== false) {
    throw Error(`Guarded factory ZIP envelope refused: ${envelope?.diagnostics?.[0]?.code || 'UNKNOWN'}`)
  }
  if (!sourceFiles || typeof sourceFiles !== 'object' || Array.isArray(sourceFiles)) {
    throw Error('Guarded factory ZIP source inventory missing')
  }
  let count = 0
  let total = 0
  let overBudget = false
  const extracted = unzipSync(snapshot, {
    filter(info) {
      count++
      if (count > MAX_ENTRIES || !Number.isSafeInteger(info.originalSize) ||
          info.originalSize < 0 || info.originalSize > MAX_ENTRY ||
          total + info.originalSize > MAX_TOTAL) {
        overBudget = true
        return false
      }
      total += info.originalSize
      return true
    },
  })
  if (overBudget || count !== Object.keys(extracted).length) {
    throw Error('Guarded factory ZIP extraction inventory or size budget refused')
  }
  const paths = Object.keys(sourceFiles).sort()
  if (paths.length !== count || paths.length > MAX_ENTRIES ||
      JSON.stringify(paths) !== JSON.stringify(Object.keys(extracted).sort())) {
    throw Error('Guarded factory ZIP extracted path inventory differs from source')
  }
  for (const path of paths) {
    const expected = sourceFiles[path]
    const actual = extracted[path]
    if (!(expected instanceof Uint8Array) || !(actual instanceof Uint8Array) ||
        expected.byteLength !== actual.byteLength ||
        expected.some((byte, index) => byte !== actual[index])) {
      throw Error(`Guarded factory ZIP extracted bytes differ from source: ${path}`)
    }
  }
  requireAccuMarkGuardedFactoryMarkerParity20261024(extracted, project)
  return { ok: true, manufacturingApproved: false, physicalRegistrationVerified: false }
}
