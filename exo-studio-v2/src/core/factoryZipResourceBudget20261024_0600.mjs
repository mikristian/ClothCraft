import {auditFactoryZipMetadataGuard20261024_0400} from './factoryZipMetadataGuard20261024_0400.mjs'
import {auditFactoryZipCrcGuard20261024_0500} from './factoryZipCrcGuard20261024_0500.mjs'

// Static, synchronous preflight only. No payload decompression or CPU/memory isolation.
const MAX_ARCHIVE = 16 * 1024 * 1024
const MAX_ENTRY = 4 * 1024 * 1024
const MAX_TOTAL = 16 * 1024 * 1024
// A six-size marker can now require six independently identified X/Y
// calibration witness pairs. Keep a finite entry ceiling while retaining the
// existing 16 MiB total, 4 MiB per-entry and 100x expansion caps.
const MAX_COUNT = 80
const MAX_RATIO = 100
const fail = (code, message) => ({ok: false, diagnostics: [{code, message}], manufacturingApproved: false})

export function auditFactoryZipResourceBudget20261024_0600(bytes) {
  // Reject large buffers before the more permissive envelope metadata scan.
  if (!(bytes instanceof Uint8Array)) return fail('INVALID_INPUT', 'Expected Uint8Array ZIP bytes')
  if (bytes.byteLength > MAX_ARCHIVE) return fail('RESOURCE_ARCHIVE_BUDGET', 'Compressed archive exceeds 16 MiB')
  const metadata = auditFactoryZipMetadataGuard20261024_0400(bytes)
  if (!metadata.ok) return {...metadata, manufacturingApproved: false}

  try {
    const n = bytes.byteLength
    const view = new DataView(bytes.buffer, bytes.byteOffset, n)
    const u16 = at => view.getUint16(at, true)
    const u32 = at => view.getUint32(at, true)
    let eocd = -1
    for (let at = n - 22; at >= Math.max(0, n - 22 - 65535); at--) {
      if (u32(at) === 0x06054b50 && at + 22 + u16(at + 20) === n) { eocd = at; break }
    }
    if (eocd < 0) return fail('RESOURCE_STRUCTURE', 'ZIP directory not found')
    const count = u16(eocd + 10)
    if (count < 1 || count > MAX_COUNT) return fail('RESOURCE_ENTRY_BUDGET', 'ZIP entry count exceeds 80')
    const centralStart = u32(eocd + 16)
    const centralSize = u32(eocd + 12)
    if (!Number.isSafeInteger(centralStart + centralSize) || centralStart + centralSize !== eocd)
      return fail('RESOURCE_STRUCTURE', 'ZIP central directory offsets are invalid')
    let at = centralStart
    let total = 0
    for (let i = 0; i < count; i++) {
      if (!Number.isSafeInteger(at) || at < 0 || at + 46 > eocd || u32(at) !== 0x02014b50)
        return fail('RESOURCE_STRUCTURE', 'ZIP directory entry is malformed')
      const method = u16(at + 10)
      const compressed = u32(at + 20)
      const uncompressed = u32(at + 24)
      const length = 46 + u16(at + 28) + u16(at + 30) + u16(at + 32)
      const local = u32(at + 42)
      if (length > eocd - at || !Number.isSafeInteger(at + length) || !Number.isSafeInteger(local) || local < 0 || local >= centralStart)
        return fail('RESOURCE_STRUCTURE', 'ZIP entry lengths or offsets are invalid')
      if (method !== 0 && method !== 8) return fail('RESOURCE_METHOD_UNSUPPORTED', 'ZIP compression method is unsupported')
      if (uncompressed > MAX_ENTRY) return fail('RESOURCE_ENTRY_SIZE_BUDGET', 'Declared entry exceeds 4 MiB')
      total += uncompressed
      if (!Number.isSafeInteger(total) || total > MAX_TOTAL)
        return fail('RESOURCE_TOTAL_BUDGET', 'Declared uncompressed total exceeds 16 MiB')
      if (method === 0 && compressed !== uncompressed)
        return fail('RESOURCE_STORE_SIZE', 'Stored entry has inconsistent sizes')
      // Empty STORE entries and valid empty DEFLATE streams may have zero output.
      // Nonempty output from zero compressed bytes is always inadmissible.
      if (uncompressed > 0 && (compressed === 0 || uncompressed > compressed * MAX_RATIO))
        return fail('RESOURCE_EXPANSION_RATIO', 'Declared ZIP expansion exceeds 100x')
      at += length
    }
    if (at !== eocd) return fail('RESOURCE_STRUCTURE', 'ZIP directory has unaccounted bytes')
    return {ok: true, diagnostics: [], manufacturingApproved: false}
  } catch {
    return fail('RESOURCE_STRUCTURE', 'ZIP resource metadata could not be read')
  }
}

// Fixed guard composition. CRC is invoked only after static resource checks pass.
export function auditFactoryZipResourceThenCrc20261024_0600(bytes) {
  const budget = auditFactoryZipResourceBudget20261024_0600(bytes)
  if (!budget.ok) return budget
  return {...auditFactoryZipCrcGuard20261024_0500(bytes), manufacturingApproved: false}
}
