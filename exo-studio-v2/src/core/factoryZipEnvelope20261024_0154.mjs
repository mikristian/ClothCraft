// Independent bounded ZIP envelope check. Does not decompress or verify CRC contents.
const MAX_ARCHIVE = 512 * 1024 * 1024
const MAX_ENTRIES = 2048
const MAX_TOTAL_UNCOMPRESSED = 512 * 1024 * 1024
const MAX_ENTRY_UNCOMPRESSED = 256 * 1024 * 1024
const MAX_NAME = 1024
const decoder = new TextDecoder('utf-8', {fatal: true})

export function auditFactoryZipEnvelope20261024_0154(bytes) {
  const diagnostics = []
  const fail = (code, message) => {
    diagnostics.push({code, message})
    return {ok: false, diagnostics, manufacturingApproved: false}
  }
  if (!(bytes instanceof Uint8Array)) return fail('INVALID_INPUT', 'Expected Uint8Array ZIP bytes')
  const n = bytes.byteLength
  if (n < 22 || n > MAX_ARCHIVE) return fail('ARCHIVE_BOUNDS', 'ZIP length is outside allowed bounds')
  const view = new DataView(bytes.buffer, bytes.byteOffset, n)
  const u16 = offset => view.getUint16(offset, true)
  const u32 = offset => view.getUint32(offset, true)
  const within = (offset, length, end = n) =>
    Number.isSafeInteger(offset) && Number.isSafeInteger(length) && offset >= 0 && length >= 0 &&
    offset <= end && length <= end - offset
  let eocd = -1
  for (let i = n - 22; i >= Math.max(0, n - 22 - 65535); i--) {
    if (u32(i) === 0x06054b50 && i + 22 + u16(i + 20) === n) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return fail('EOCD_INVALID', 'Missing or malformed terminal end of central directory')
  if (u16(eocd + 4) !== 0 || u16(eocd + 6) !== 0 ||
      u16(eocd + 8) !== u16(eocd + 10)) return fail('MULTIDISK_UNSUPPORTED', 'Multiple ZIP disks or inconsistent entry counts')
  const count = u16(eocd + 10)
  const centralSize = u32(eocd + 12)
  const centralOffset = u32(eocd + 16)
  if (count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff)
    return fail('ZIP64_UNSUPPORTED', 'ZIP64 directory markers are unsupported')
  if (count === 0 || count > MAX_ENTRIES) return fail('ENTRY_COUNT_BOUNDS', 'Invalid or excessive ZIP entry count')
  if (!within(centralOffset, centralSize, eocd) || centralOffset + centralSize !== eocd)
    return fail('CENTRAL_BOUNDS', 'Central directory size or offset does not match EOCD')
  let cursor = centralOffset
  let totalSize = 0
  const names = new Set()
  const spans = []
  for (let i = 0; i < count; i++) {
    if (!within(cursor, 46, eocd) || u32(cursor) !== 0x02014b50)
      return fail('CENTRAL_TRUNCATED', 'Central directory entry is absent or truncated')
    const flags = u16(cursor + 8)
    const method = u16(cursor + 10)
    const crc = u32(cursor + 16)
    const compressed = u32(cursor + 20)
    const uncompressed = u32(cursor + 24)
    const nameLength = u16(cursor + 28)
    const extraLength = u16(cursor + 30)
    const commentLength = u16(cursor + 32)
    const diskStart = u16(cursor + 34)
    const localOffset = u32(cursor + 42)
    const length = 46 + nameLength + extraLength + commentLength
    if (!within(cursor, length, eocd)) return fail('CENTRAL_TRUNCATED', 'Central directory entry exceeds bounds')
    if (diskStart !== 0) return fail('MULTIDISK_UNSUPPORTED', 'Entry references another ZIP disk')
    if (compressed === 0xffffffff || uncompressed === 0xffffffff || localOffset === 0xffffffff)
      return fail('ZIP64_UNSUPPORTED', 'Entry requires ZIP64 extensions')
    if (flags & (1 | 8 | 0x40 | 0x2000)) return fail('FLAGS_UNSUPPORTED', 'Encrypted or data-descriptor ZIP entries are unsupported')
    if (flags & ~0x800) return fail('FLAGS_UNSUPPORTED', 'Unsupported ZIP general-purpose flags')
    if (method !== 0 && method !== 8) return fail('METHOD_UNSUPPORTED', 'Unsupported ZIP compression method')
    if (method === 0 && compressed !== uncompressed) return fail('SIZE_MISMATCH', 'Stored ZIP entry sizes disagree')
    if (nameLength < 1 || nameLength > MAX_NAME) return fail('PATH_INVALID', 'ZIP filename has invalid length')
    if (uncompressed > MAX_ENTRY_UNCOMPRESSED || (totalSize += uncompressed) > MAX_TOTAL_UNCOMPRESSED)
      return fail('SIZE_BOUNDS', 'Uncompressed ZIP sizes exceed limits')
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength)
    if (!(flags & 0x800) && nameBytes.some(x => x > 127)) return fail('PATH_ENCODING', 'Non-ASCII names require UTF-8 flag')
    let name
    try { name = decoder.decode(nameBytes) } catch { return fail('PATH_ENCODING', 'ZIP filename is not valid UTF-8') }
    const parts = name.split('/')
    if (name.startsWith('/') || name.includes('\\') || name.includes(':') ||
        /[\x00-\x1f\x7f]/.test(name) || parts.some(x => !x || x === '.' || x === '..'))
      return fail('PATH_UNSAFE', 'ZIP entry contains an unsafe or ambiguous path')
    const canonical = name.toLowerCase()
    if (names.has(canonical)) return fail('PATH_DUPLICATE', 'ZIP contains case-insensitive duplicate paths')
    names.add(canonical)
    if (!within(localOffset, 30, centralOffset) || u32(localOffset) !== 0x04034b50)
      return fail('LOCAL_HEADER_INVALID', 'Local ZIP header is missing or outside data region')
    const localFlags = u16(localOffset + 6)
    const localMethod = u16(localOffset + 8)
    const localNameLength = u16(localOffset + 26)
    const localExtraLength = u16(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    if (localFlags !== flags || localMethod !== method || u32(localOffset + 14) !== crc ||
        u32(localOffset + 18) !== compressed || u32(localOffset + 22) !== uncompressed)
      return fail('LOCAL_HEADER_MISMATCH', 'Local and central ZIP metadata disagree')
    if (localNameLength !== nameLength || !within(localOffset + 30, localNameLength + localExtraLength, centralOffset) ||
        !nameBytes.every((value, index) => value === bytes[localOffset + 30 + index]))
      return fail('LOCAL_FILENAME_MISMATCH', 'Local filename differs from central directory filename')
    if (!within(dataStart, compressed, centralOffset))
      return fail('LOCAL_DATA_BOUNDS', 'ZIP entry compressed payload exceeds data region')
    // Reject ZIP64 even when legacy header values do not carry sentinels.
    for (const [at, len] of [[cursor + 46 + nameLength, extraLength], [localOffset + 30 + localNameLength, localExtraLength]]) {
      let x = at
      const end = at + len
      while (x < end) {
        if (end - x < 4) return fail('EXTRA_INVALID', 'Malformed ZIP extra-field header')
        const id = u16(x)
        const size = u16(x + 2)
        if (size > end - x - 4) return fail('EXTRA_INVALID', 'Malformed ZIP extra-field length')
        if (id === 0x0001) return fail('ZIP64_UNSUPPORTED', 'ZIP64 extra field is unsupported')
        x += 4 + size
      }
    }
    spans.push([localOffset, dataStart + compressed])
    cursor += length
  }
  if (cursor !== eocd) return fail('CENTRAL_COUNT_MISMATCH', 'Central directory entry count does not consume directory exactly')
  spans.sort((a, b) => a[0] - b[0])
  if (spans[0][0] !== 0) return fail('LOCAL_GAP', 'Leading bytes precede first ZIP entry')
  for (let i = 1; i < spans.length; i++) {
    if (spans[i][0] < spans[i - 1][1]) return fail('LOCAL_OVERLAP', 'Local ZIP entries overlap')
    if (spans[i][0] !== spans[i - 1][1]) return fail('LOCAL_GAP', 'Unaccounted bytes separate local ZIP entries')
  }
  if (spans[spans.length - 1][1] !== centralOffset)
    return fail('LOCAL_TRAILING_BYTES', 'Unaccounted bytes precede central directory')
  return {ok: true, diagnostics: [], manufacturingApproved: false}
}
