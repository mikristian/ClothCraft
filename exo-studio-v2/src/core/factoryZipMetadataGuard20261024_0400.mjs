import {auditFactoryZipEnvelope20261024_0154} from './factoryZipEnvelope20261024_0154.mjs'

// Development-only envelope hardening. No decompression, payload CRC verification,
// DXF semantics, factory acceptance, or manufacturing approval is performed here.
const utf8 = new TextDecoder('utf-8', {fatal: true})
const fail = (code, message) => ({ok: false, diagnostics: [{code, message}], manufacturingApproved: false})
// A ZIP path may be valid on POSIX yet alias a different name or device when
// extracted on Windows. Factory archives must be portable across receivers.
// DOS device names are reserved even with an extension or inside a directory.
// Some Win32 consumers also normalize spaces between a reserved basename and
// its extension (e.g. "CON .dxf"). Refuse those aliases conservatively rather
// than depending on the receiving extractor's name-normalization behavior.
const windowsDevice = /^(?:con|prn|aux|nul|conin\$|conout\$|clock\$|com[1-9¹²³]|lpt[1-9¹²³])(?: *\.| *$)/iu
const unsafeWindowsPath = name => name.split('/').some(part =>
  /[<>"|?*]/.test(part) || /[. ]$/.test(part) || windowsDevice.test(part))
// Directional controls, zero-width marks, C1 controls and non-ASCII spaces can
// make distinct ZIP paths render identically or reverse a displayed extension.
// Factory inventory names must be unambiguous to human receiving operators.
const invisibleUnicodePath = /[\u0080-\u009f\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\p{Default_Ignorable_Code_Point}]/u

// Python Unicode casefold differences from JavaScript's lowercase are supplied
// below; normalization is performed both before and after folding.
const foldExceptions = new Map([
  ["\u00b5", "\u03bc"],
  ["\u00df", "ss"],
  ["\u0149", "\u02bcn"],
  ["\u017f", "s"],
  ["\u01f0", "j\u030c"],
  ["\u0345", "\u03b9"],
  ["\u0390", "\u03b9\u0308\u0301"],
  ["\u03b0", "\u03c5\u0308\u0301"],
  ["\u03c2", "\u03c3"],
  ["\u03d0", "\u03b2"],
  ["\u03d1", "\u03b8"],
  ["\u03d5", "\u03c6"],
  ["\u03d6", "\u03c0"],
  ["\u03f0", "\u03ba"],
  ["\u03f1", "\u03c1"],
  ["\u03f5", "\u03b5"],
  ["\u0587", "\u0565\u0582"],
  ["\u13a0", "\u13a0"],
  ["\u13a1", "\u13a1"],
  ["\u13a2", "\u13a2"],
  ["\u13a3", "\u13a3"],
  ["\u13a4", "\u13a4"],
  ["\u13a5", "\u13a5"],
  ["\u13a6", "\u13a6"],
  ["\u13a7", "\u13a7"],
  ["\u13a8", "\u13a8"],
  ["\u13a9", "\u13a9"],
  ["\u13aa", "\u13aa"],
  ["\u13ab", "\u13ab"],
  ["\u13ac", "\u13ac"],
  ["\u13ad", "\u13ad"],
  ["\u13ae", "\u13ae"],
  ["\u13af", "\u13af"],
  ["\u13b0", "\u13b0"],
  ["\u13b1", "\u13b1"],
  ["\u13b2", "\u13b2"],
  ["\u13b3", "\u13b3"],
  ["\u13b4", "\u13b4"],
  ["\u13b5", "\u13b5"],
  ["\u13b6", "\u13b6"],
  ["\u13b7", "\u13b7"],
  ["\u13b8", "\u13b8"],
  ["\u13b9", "\u13b9"],
  ["\u13ba", "\u13ba"],
  ["\u13bb", "\u13bb"],
  ["\u13bc", "\u13bc"],
  ["\u13bd", "\u13bd"],
  ["\u13be", "\u13be"],
  ["\u13bf", "\u13bf"],
  ["\u13c0", "\u13c0"],
  ["\u13c1", "\u13c1"],
  ["\u13c2", "\u13c2"],
  ["\u13c3", "\u13c3"],
  ["\u13c4", "\u13c4"],
  ["\u13c5", "\u13c5"],
  ["\u13c6", "\u13c6"],
  ["\u13c7", "\u13c7"],
  ["\u13c8", "\u13c8"],
  ["\u13c9", "\u13c9"],
  ["\u13ca", "\u13ca"],
  ["\u13cb", "\u13cb"],
  ["\u13cc", "\u13cc"],
  ["\u13cd", "\u13cd"],
  ["\u13ce", "\u13ce"],
  ["\u13cf", "\u13cf"],
  ["\u13d0", "\u13d0"],
  ["\u13d1", "\u13d1"],
  ["\u13d2", "\u13d2"],
  ["\u13d3", "\u13d3"],
  ["\u13d4", "\u13d4"],
  ["\u13d5", "\u13d5"],
  ["\u13d6", "\u13d6"],
  ["\u13d7", "\u13d7"],
  ["\u13d8", "\u13d8"],
  ["\u13d9", "\u13d9"],
  ["\u13da", "\u13da"],
  ["\u13db", "\u13db"],
  ["\u13dc", "\u13dc"],
  ["\u13dd", "\u13dd"],
  ["\u13de", "\u13de"],
  ["\u13df", "\u13df"],
  ["\u13e0", "\u13e0"],
  ["\u13e1", "\u13e1"],
  ["\u13e2", "\u13e2"],
  ["\u13e3", "\u13e3"],
  ["\u13e4", "\u13e4"],
  ["\u13e5", "\u13e5"],
  ["\u13e6", "\u13e6"],
  ["\u13e7", "\u13e7"],
  ["\u13e8", "\u13e8"],
  ["\u13e9", "\u13e9"],
  ["\u13ea", "\u13ea"],
  ["\u13eb", "\u13eb"],
  ["\u13ec", "\u13ec"],
  ["\u13ed", "\u13ed"],
  ["\u13ee", "\u13ee"],
  ["\u13ef", "\u13ef"],
  ["\u13f0", "\u13f0"],
  ["\u13f1", "\u13f1"],
  ["\u13f2", "\u13f2"],
  ["\u13f3", "\u13f3"],
  ["\u13f4", "\u13f4"],
  ["\u13f5", "\u13f5"],
  ["\u13f8", "\u13f0"],
  ["\u13f9", "\u13f1"],
  ["\u13fa", "\u13f2"],
  ["\u13fb", "\u13f3"],
  ["\u13fc", "\u13f4"],
  ["\u13fd", "\u13f5"],
  ["\u1c80", "\u0432"],
  ["\u1c81", "\u0434"],
  ["\u1c82", "\u043e"],
  ["\u1c83", "\u0441"],
  ["\u1c84", "\u0442"],
  ["\u1c85", "\u0442"],
  ["\u1c86", "\u044a"],
  ["\u1c87", "\u0463"],
  ["\u1c88", "\ua64b"],
  ["\u1e96", "h\u0331"],
  ["\u1e97", "t\u0308"],
  ["\u1e98", "w\u030a"],
  ["\u1e99", "y\u030a"],
  ["\u1e9a", "a\u02be"],
  ["\u1e9b", "\u1e61"],
  ["\u1e9e", "ss"],
  ["\u1f50", "\u03c5\u0313"],
  ["\u1f52", "\u03c5\u0313\u0300"],
  ["\u1f54", "\u03c5\u0313\u0301"],
  ["\u1f56", "\u03c5\u0313\u0342"],
  ["\u1f80", "\u1f00\u03b9"],
  ["\u1f81", "\u1f01\u03b9"],
  ["\u1f82", "\u1f02\u03b9"],
  ["\u1f83", "\u1f03\u03b9"],
  ["\u1f84", "\u1f04\u03b9"],
  ["\u1f85", "\u1f05\u03b9"],
  ["\u1f86", "\u1f06\u03b9"],
  ["\u1f87", "\u1f07\u03b9"],
  ["\u1f88", "\u1f00\u03b9"],
  ["\u1f89", "\u1f01\u03b9"],
  ["\u1f8a", "\u1f02\u03b9"],
  ["\u1f8b", "\u1f03\u03b9"],
  ["\u1f8c", "\u1f04\u03b9"],
  ["\u1f8d", "\u1f05\u03b9"],
  ["\u1f8e", "\u1f06\u03b9"],
  ["\u1f8f", "\u1f07\u03b9"],
  ["\u1f90", "\u1f20\u03b9"],
  ["\u1f91", "\u1f21\u03b9"],
  ["\u1f92", "\u1f22\u03b9"],
  ["\u1f93", "\u1f23\u03b9"],
  ["\u1f94", "\u1f24\u03b9"],
  ["\u1f95", "\u1f25\u03b9"],
  ["\u1f96", "\u1f26\u03b9"],
  ["\u1f97", "\u1f27\u03b9"],
  ["\u1f98", "\u1f20\u03b9"],
  ["\u1f99", "\u1f21\u03b9"],
  ["\u1f9a", "\u1f22\u03b9"],
  ["\u1f9b", "\u1f23\u03b9"],
  ["\u1f9c", "\u1f24\u03b9"],
  ["\u1f9d", "\u1f25\u03b9"],
  ["\u1f9e", "\u1f26\u03b9"],
  ["\u1f9f", "\u1f27\u03b9"],
  ["\u1fa0", "\u1f60\u03b9"],
  ["\u1fa1", "\u1f61\u03b9"],
  ["\u1fa2", "\u1f62\u03b9"],
  ["\u1fa3", "\u1f63\u03b9"],
  ["\u1fa4", "\u1f64\u03b9"],
  ["\u1fa5", "\u1f65\u03b9"],
  ["\u1fa6", "\u1f66\u03b9"],
  ["\u1fa7", "\u1f67\u03b9"],
  ["\u1fa8", "\u1f60\u03b9"],
  ["\u1fa9", "\u1f61\u03b9"],
  ["\u1faa", "\u1f62\u03b9"],
  ["\u1fab", "\u1f63\u03b9"],
  ["\u1fac", "\u1f64\u03b9"],
  ["\u1fad", "\u1f65\u03b9"],
  ["\u1fae", "\u1f66\u03b9"],
  ["\u1faf", "\u1f67\u03b9"],
  ["\u1fb2", "\u1f70\u03b9"],
  ["\u1fb3", "\u03b1\u03b9"],
  ["\u1fb4", "\u03ac\u03b9"],
  ["\u1fb6", "\u03b1\u0342"],
  ["\u1fb7", "\u03b1\u0342\u03b9"],
  ["\u1fbc", "\u03b1\u03b9"],
  ["\u1fbe", "\u03b9"],
  ["\u1fc2", "\u1f74\u03b9"],
  ["\u1fc3", "\u03b7\u03b9"],
  ["\u1fc4", "\u03ae\u03b9"],
  ["\u1fc6", "\u03b7\u0342"],
  ["\u1fc7", "\u03b7\u0342\u03b9"],
  ["\u1fcc", "\u03b7\u03b9"],
  ["\u1fd2", "\u03b9\u0308\u0300"],
  ["\u1fd3", "\u03b9\u0308\u0301"],
  ["\u1fd6", "\u03b9\u0342"],
  ["\u1fd7", "\u03b9\u0308\u0342"],
  ["\u1fe2", "\u03c5\u0308\u0300"],
  ["\u1fe3", "\u03c5\u0308\u0301"],
  ["\u1fe4", "\u03c1\u0313"],
  ["\u1fe6", "\u03c5\u0342"],
  ["\u1fe7", "\u03c5\u0308\u0342"],
  ["\u1ff2", "\u1f7c\u03b9"],
  ["\u1ff3", "\u03c9\u03b9"],
  ["\u1ff4", "\u03ce\u03b9"],
  ["\u1ff6", "\u03c9\u0342"],
  ["\u1ff7", "\u03c9\u0342\u03b9"],
  ["\u1ffc", "\u03c9\u03b9"],
  ["\uab70", "\u13a0"],
  ["\uab71", "\u13a1"],
  ["\uab72", "\u13a2"],
  ["\uab73", "\u13a3"],
  ["\uab74", "\u13a4"],
  ["\uab75", "\u13a5"],
  ["\uab76", "\u13a6"],
  ["\uab77", "\u13a7"],
  ["\uab78", "\u13a8"],
  ["\uab79", "\u13a9"],
  ["\uab7a", "\u13aa"],
  ["\uab7b", "\u13ab"],
  ["\uab7c", "\u13ac"],
  ["\uab7d", "\u13ad"],
  ["\uab7e", "\u13ae"],
  ["\uab7f", "\u13af"],
  ["\uab80", "\u13b0"],
  ["\uab81", "\u13b1"],
  ["\uab82", "\u13b2"],
  ["\uab83", "\u13b3"],
  ["\uab84", "\u13b4"],
  ["\uab85", "\u13b5"],
  ["\uab86", "\u13b6"],
  ["\uab87", "\u13b7"],
  ["\uab88", "\u13b8"],
  ["\uab89", "\u13b9"],
  ["\uab8a", "\u13ba"],
  ["\uab8b", "\u13bb"],
  ["\uab8c", "\u13bc"],
  ["\uab8d", "\u13bd"],
  ["\uab8e", "\u13be"],
  ["\uab8f", "\u13bf"],
  ["\uab90", "\u13c0"],
  ["\uab91", "\u13c1"],
  ["\uab92", "\u13c2"],
  ["\uab93", "\u13c3"],
  ["\uab94", "\u13c4"],
  ["\uab95", "\u13c5"],
  ["\uab96", "\u13c6"],
  ["\uab97", "\u13c7"],
  ["\uab98", "\u13c8"],
  ["\uab99", "\u13c9"],
  ["\uab9a", "\u13ca"],
  ["\uab9b", "\u13cb"],
  ["\uab9c", "\u13cc"],
  ["\uab9d", "\u13cd"],
  ["\uab9e", "\u13ce"],
  ["\uab9f", "\u13cf"],
  ["\uaba0", "\u13d0"],
  ["\uaba1", "\u13d1"],
  ["\uaba2", "\u13d2"],
  ["\uaba3", "\u13d3"],
  ["\uaba4", "\u13d4"],
  ["\uaba5", "\u13d5"],
  ["\uaba6", "\u13d6"],
  ["\uaba7", "\u13d7"],
  ["\uaba8", "\u13d8"],
  ["\uaba9", "\u13d9"],
  ["\uabaa", "\u13da"],
  ["\uabab", "\u13db"],
  ["\uabac", "\u13dc"],
  ["\uabad", "\u13dd"],
  ["\uabae", "\u13de"],
  ["\uabaf", "\u13df"],
  ["\uabb0", "\u13e0"],
  ["\uabb1", "\u13e1"],
  ["\uabb2", "\u13e2"],
  ["\uabb3", "\u13e3"],
  ["\uabb4", "\u13e4"],
  ["\uabb5", "\u13e5"],
  ["\uabb6", "\u13e6"],
  ["\uabb7", "\u13e7"],
  ["\uabb8", "\u13e8"],
  ["\uabb9", "\u13e9"],
  ["\uabba", "\u13ea"],
  ["\uabbb", "\u13eb"],
  ["\uabbc", "\u13ec"],
  ["\uabbd", "\u13ed"],
  ["\uabbe", "\u13ee"],
  ["\uabbf", "\u13ef"],
  ["\ufb00", "ff"],
  ["\ufb01", "fi"],
  ["\ufb02", "fl"],
  ["\ufb03", "ffi"],
  ["\ufb04", "ffl"],
  ["\ufb05", "st"],
  ["\ufb06", "st"],
  ["\ufb13", "\u0574\u0576"],
  ["\ufb14", "\u0574\u0565"],
  ["\ufb15", "\u0574\u056b"],
  ["\ufb16", "\u057e\u0576"],
  ["\ufb17", "\u0574\u056d"],
])

function casefoldNfc(name) {
  return Array.from(name.normalize('NFC'), ch => foldExceptions.get(ch) ?? ch.toLowerCase()).join('').normalize('NFC')
}

export function auditFactoryZipMetadataGuard20261024_0400(bytes) {
  const envelope = auditFactoryZipEnvelope20261024_0154(bytes)
  if (!envelope.ok) return {...envelope, manufacturingApproved: false}
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const u16 = at => view.getUint16(at, true)
    const u32 = at => view.getUint32(at, true)
    const end = bytes.byteLength - 22
    let eocd = -1
    for (let at = end; at >= Math.max(0, end - 65535); at--) {
      if (u32(at) === 0x06054b50 && at + 22 + u16(at + 20) === bytes.byteLength) { eocd = at; break }
    }
    if (eocd < 0) return fail('METADATA_STRUCTURE', 'ZIP end directory missing')
    const count = u16(eocd + 10)
    const directoryEnd = eocd
    let cursor = u32(eocd + 16)
    const names = new Set()
    let hasCompatibilityPath = false
    // Every prefix of a nested file path is an implied directory. A second
    // entry cannot simultaneously name that prefix as a regular file, even
    // if the archive uses a different entry order, Unicode normalization or
    // case spelling. Filesystem extractors otherwise disagree or overwrite.
    const impliedDirectories = new Set()
    for (let i = 0; i < count; i++) {
      if (cursor + 46 > directoryEnd || u32(cursor) !== 0x02014b50)
        return fail('METADATA_STRUCTURE', 'Malformed central directory record')
      const nameLength = u16(cursor + 28)
      const extraLength = u16(cursor + 30)
      const commentLength = u16(cursor + 32)
      const next = cursor + 46 + nameLength + extraLength + commentLength
      if (next > directoryEnd || next <= cursor) return fail('METADATA_STRUCTURE', 'Malformed central directory fields')
      const name = utf8.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))
      if (unsafeWindowsPath(name))
        return fail('ZIP_WINDOWS_PATH_UNSAFE', 'Factory ZIP filename is unsafe or ambiguous on Windows extractors')
      if (invisibleUnicodePath.test(name))
        return fail('ZIP_INVISIBLE_UNICODE_PATH', 'Factory ZIP filename contains invisible, control or ambiguous whitespace characters')
      // Some receiving tools fold compatibility glyphs (e.g. fullwidth A,
      // presentation ligatures) to other names. Defer this error until after
      // the inventory scan so explicit duplicate-path diagnostics take priority.
      hasCompatibilityPath ||= name.normalize('NFKC') !== name.normalize('NFC')
      const canonical = casefoldNfc(name)
      if (names.has(canonical)) return fail('UNICODE_PATH_COLLISION', 'Unicode normalized casefold path collision')
      if (impliedDirectories.has(canonical))
        return fail('ZIP_FILE_DIRECTORY_COLLISION', 'ZIP regular file conflicts with an implied directory')
      const components = canonical.split('/')
      for (let depth = 1; depth < components.length; depth++) {
        const parent = components.slice(0, depth).join('/')
        if (names.has(parent))
          return fail('ZIP_FILE_DIRECTORY_COLLISION', 'ZIP path has an existing regular file as a parent')
        impliedDirectories.add(parent)
      }
      names.add(canonical)

      // Info-ZIP Unicode Path (0x7075) can supply a second, CRC-bound filename
      // that some extractors prefer over the central/local header name. Our
      // source inventory and in-memory unzipper use the header name instead.
      // Refuse the alias in either header rather than certify bytes that may
      // extract to a different (including traversal) destination elsewhere.
      const localOffset = u32(cursor + 42)
      const localNameLength = u16(localOffset + 26)
      const localExtraLength = u16(localOffset + 28)
      for (const [start, length] of [
        [cursor + 46 + nameLength, extraLength],
        [localOffset + 30 + localNameLength, localExtraLength],
      ]) {
        for (let at = start, end = start + length; at < end;) {
          const id = u16(at)
          const size = u16(at + 2)
          if (id === 0x7075)
            return fail('ZIP_UNICODE_PATH_OVERRIDE', 'ZIP Unicode Path extra field can override the verified filename')
          at += 4 + size
        }
      }
      // Factory output is authored by our own serializer and requires no ZIP
      // extensions. Unknown extra fields may be interpreted differently by
      // downstream extractors; do not whitelist extensions without a separate
      // receiver-compatibility and extraction-semantics review.
      if (extraLength || localExtraLength)
        return fail('ZIP_EXTRA_FIELD_UNSUPPORTED', 'Factory ZIP files must not contain local or central extra fields')

      const origin = bytes[cursor + 5]
      const attributes = u32(cursor + 38)
      if (origin !== 0 && origin !== 3) return fail('ZIP_HOST_UNSUPPORTED', 'ZIP creator platform is unsupported')
      const dosDirectory = Boolean(attributes & 0x10)
      // The wrapped envelope does not permit names ending in '/', so directory
      // metadata is inconsistent with an accepted file-only entry.
      if (dosDirectory) return fail('DOS_DIRECTORY_ATTRIBUTE', 'DOS directory attribute set on a file entry')
      if (attributes & 0x08) return fail('DOS_VOLUME_ATTRIBUTE', 'DOS volume-label attribute is invalid for a file entry')
      // DOS attribute 0x40 denotes a device rather than an ordinary file.
      // Reject it even when the payload/CRC match: a downstream extractor may
      // interpret entry metadata differently from our in-memory unzipper.
      if (attributes & 0x40) return fail('DOS_DEVICE_ATTRIBUTE', 'DOS device attribute is invalid for a factory file entry')
      const type = (attributes >>> 16) & 0xf000
      if ((origin === 3 && type !== 0x8000) || (origin === 0 && type !== 0))
        return fail('UNIX_FILE_TYPE', 'Unix entry must declare a regular file; symlinks and special files are forbidden')
      // A Unix regular-file type alone is insufficient: an archive extractor can
      // preserve execute, setuid, setgid or sticky mode bits on factory payloads.
      // Cutting data is never executable. Refuse those bits before decompression,
      // even when source bytes and CRCs are otherwise identical.
      const unixMode = attributes >>> 16
      if (origin === 3 && (unixMode & 0o7111) !== 0)
        return fail('UNIX_UNSAFE_PERMISSIONS', 'Factory ZIP entries must not have execute or special Unix permission bits')
      cursor = next
    }
    if (cursor !== directoryEnd) return fail('METADATA_STRUCTURE', 'Central directory trailing metadata')
    if (hasCompatibilityPath)
      return fail('ZIP_UNICODE_COMPATIBILITY_PATH', 'Factory ZIP filename has a compatibility-equivalent extraction name')
    return {ok: true, diagnostics: [], manufacturingApproved: false}
  } catch {
    return fail('METADATA_STRUCTURE', 'Unreadable or malformed ZIP metadata')
  }
}
