import {Inflate} from 'fflate'
import {auditFactoryZipMetadataGuard20261024_0400} from './factoryZipMetadataGuard20261024_0400.mjs'

// Development-only byte integrity check, never a factory or manufacturing approval.
// Keep budgets deliberately below the envelope's 256 MiB/entry and 512 MiB total.
// fflate's streaming Inflate retains an internal 32 KiB dictionary and emits chunks;
// compressed input is fed in bounded blocks, and output is neither accumulated nor
// accepted beyond declared length. Its implementation is not a proven hard memory
// limit against hostile DEFLATE streams; run untrusted input in a resource-limited
// worker/process for an enforceable CPU/memory boundary.
const MAX_ARCHIVE = 32 * 1024 * 1024
const MAX_ENTRY = 8 * 1024 * 1024
const MAX_TOTAL = 32 * 1024 * 1024
const BLOCK = 16 * 1024
const fail = (code, message) => ({ok: false, diagnostics: [{code, message}], manufacturingApproved: false})
const crc32 = (value, bytes) => {
  let crc = value
  for (const byte of bytes) {
    crc ^= byte
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return crc >>> 0
}

export function auditFactoryZipCrcGuard20261024_0500(bytes) {
  const metadata = auditFactoryZipMetadataGuard20261024_0400(bytes)
  if (!metadata.ok) return {...metadata, manufacturingApproved: false}
  if (bytes.byteLength > MAX_ARCHIVE) return fail('CRC_ARCHIVE_BUDGET', 'Archive exceeds byte integrity audit budget')
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const u16 = p => view.getUint16(p, true)
    const u32 = p => view.getUint32(p, true)
    const end = bytes.byteLength - 22
    let eocd = -1
    for (let p = end; p >= Math.max(0, end - 65535); p--) {
      if (u32(p) === 0x06054b50 && p + 22 + u16(p + 20) === bytes.byteLength) { eocd = p; break }
    }
    if (eocd < 0) return fail('CRC_STRUCTURE', 'End of ZIP directory could not be located')
    let at = u32(eocd + 16)
    let remaining = MAX_TOTAL
    for (let i = 0; i < u16(eocd + 10); i++) {
      if (at + 46 > eocd || u32(at) !== 0x02014b50) return fail('CRC_STRUCTURE', 'Central directory entry invalid')
      const method = u16(at + 10)
      const expectedCrc = u32(at + 16)
      const compressed = u32(at + 20)
      const expectedSize = u32(at + 24)
      const length = 46 + u16(at + 28) + u16(at + 30) + u16(at + 32)
      const local = u32(at + 42)
      const dataStart = local + 30 + u16(local + 26) + u16(local + 28)
      if (length > eocd - at || compressed > bytes.byteLength - dataStart)
        return fail('CRC_STRUCTURE', 'ZIP payload offsets exceed bounds')
      if (expectedSize > MAX_ENTRY || expectedSize > remaining)
        return fail('CRC_SIZE_BUDGET', 'Declared uncompressed data exceeds byte audit budget')
      remaining -= expectedSize
      const payload = bytes.subarray(dataStart, dataStart + compressed)
      let crc = 0xffffffff
      let actualSize = 0
      let exceeded = false
      const accumulate = chunk => {
        actualSize += chunk.byteLength
        if (actualSize > expectedSize) { exceeded = true; throw new Error('UNCOMPRESSED_BUDGET') }
        crc = crc32(crc, chunk)
      }
      if (method === 0) {
        accumulate(payload)
      } else if (method === 8) {
        try {
          const decoder = new Inflate((chunk) => accumulate(chunk))
          for (let offset = 0; offset < payload.length; offset += BLOCK) {
            decoder.push(payload.subarray(offset, Math.min(offset + BLOCK, payload.length)), offset + BLOCK >= payload.length)
          }
          if (payload.length === 0) decoder.push(new Uint8Array(0), true)
          // Streaming inflater does not expose a reliable count of consumed bits.
          // DEFLATE trailing junk is checked by an independent raw bitstream walk below.
          if (!hasExactlyOneDeflateStream(payload)) return fail('CRC_DEFLATE_TRAILING', 'DEFLATE payload has invalid end or trailing bytes')
        } catch {
          if (exceeded) return fail('CRC_SIZE_MISMATCH', 'Decoded payload exceeds declared length')
          return fail('CRC_DEFLATE_INVALID', 'DEFLATE payload could not be decoded')
        }
      } else return fail('CRC_METHOD_UNSUPPORTED', 'ZIP compression method unsupported')
      if (actualSize !== expectedSize) return fail('CRC_SIZE_MISMATCH', 'Decoded payload length differs from ZIP metadata')
      if (((crc ^ 0xffffffff) >>> 0) !== expectedCrc) return fail('CRC_MISMATCH', 'Decoded payload CRC-32 differs from ZIP metadata')
      at += length
    }
    if (at !== eocd) return fail('CRC_STRUCTURE', 'Unaccounted central directory bytes')
    return {ok: true, diagnostics: [], manufacturingApproved: false}
  } catch {
    return fail('CRC_STRUCTURE', 'Could not complete ZIP byte integrity verification')
  }
}

// Parse only the DEFLATE framing and Huffman code widths to identify the exact
// end of the final block. Reject malformed/incomplete streams and extra bytes.
function hasExactlyOneDeflateStream(data) {
  let bit = 0
  const read = n => {
    if (bit + n > data.length * 8) throw Error('truncated')
    let v = 0
    for (let i = 0; i < n; i++) v |= ((data[(bit + i) >>> 3] >>> ((bit + i) & 7)) & 1) << i
    bit += n
    return v
  }
  const table = widths => {
    const count = new Array(16).fill(0)
    for (const width of widths) {
      if (width > 15) throw Error('code length')
      if (width) count[width]++
    }
    let code = 0
    const lookup = new Map()
    for (let len = 1; len <= 15; len++) {
      code = (code + count[len - 1]) << 1
      if (code + count[len] > (1 << len)) throw Error('oversubscribed')
      let next = code
      for (let symbol = 0; symbol < widths.length; symbol++) {
        if (widths[symbol] !== len) continue
        let reversed = 0
        for (let j = 0; j < len; j++) reversed = (reversed << 1) | ((next >>> j) & 1)
        lookup.set(`${len}:${reversed}`, symbol)
        next++
      }
    }
    return lookup
  }
  const symbol = lookup => {
    let code = 0
    for (let len = 1; len <= 15; len++) {
      code |= read(1) << (len - 1)
      const match = lookup.get(`${len}:${code}`)
      if (match !== undefined) return match
    }
    throw Error('invalid Huffman code')
  }
  const fixedLit = table(Array.from({length: 288}, (_, i) => i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8))
  const fixedDist = table(new Array(32).fill(5))
  const lengthBits = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]
  const distBits = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]
  try {
    let final = false
    let blocks = 0
    while (!final) {
      if (++blocks > data.length * 8 + 1) return false
      final = read(1) === 1
      const type = read(2)
      if (type === 0) {
        bit = (bit + 7) & ~7
        const len = read(16)
        if ((len ^ 0xffff) !== read(16)) return false
        bit += len * 8
        if (bit > data.length * 8) return false
        continue
      }
      if (type === 3) return false
      let lit = fixedLit
      let dist = fixedDist
      if (type === 2) {
        const hlit = read(5) + 257
        const hdist = read(5) + 1
        const hclen = read(4) + 4
        const order = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]
        const codeWidths = new Array(19).fill(0)
        for (let i = 0; i < hclen; i++) codeWidths[order[i]] = read(3)
        const codeTable = table(codeWidths)
        const widths = []
        while (widths.length < hlit + hdist) {
          const value = symbol(codeTable)
          if (value <= 15) widths.push(value)
          else {
            const repeat = value === 16 ? read(2) + 3 : value === 17 ? read(3) + 3 : value === 18 ? read(7) + 11 : 0
            if (value === 16 && widths.length === 0) return false
            if (!repeat || widths.length + repeat > hlit + hdist) return false
            for (let j = 0; j < repeat; j++) widths.push(value === 16 ? widths[widths.length - 1] : 0)
          }
        }
        lit = table(widths.slice(0, hlit))
        dist = table(widths.slice(hlit))
      }
      while (true) {
        const value = symbol(lit)
        if (value < 256) continue
        if (value === 256) break
        if (value > 285) return false
        read(lengthBits[value - 257])
        const d = symbol(dist)
        if (d > 29) return false
        read(distBits[d])
      }
    }
    return Math.ceil(bit / 8) === data.length
  } catch { return false }
}
