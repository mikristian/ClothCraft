// Exchange a single pattern piece's per-point grading rules with a spreadsheet.
// CSV deliberately includes the piece id and point count to prevent applying
// a technically valid grade table to the wrong pattern or reordered geometry.
const HEADER = 'piece_id,point_count,point_index,point_x_cm,point_y_cm,rule,dx_cm_per_size,dy_cm_per_size'
const numeric = value => /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(value)
const csvCell = value => `"${String(value).replace(/"/g, '""')}"`
const validIncrement = value => typeof value !== 'boolean' && value !== null && value !== undefined && value !== '' &&
  numeric(String(value)) && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 12

export function gradeRulesToCsv(piece) {
  if (!piece?.id || !Array.isArray(piece.points) || !piece.points.length) throw new Error('Select a nonempty pattern piece to export grade rules')
  // The legacy spreadsheet schema cannot represent independent size breaks.
  // Never silently downgrade industrial X/Y vectors to AUTO zero-growth rows.
  const industrialIndex = piece.points.findIndex(point => point.industrialGradeRule != null)
  if (industrialIndex >= 0) throw new Error(`Point ${industrialIndex + 1} uses a nonuniform industrial grade table; export the full break table instead of the uniform grade CSV`)
  const rows = piece.points.map((point, index) => {
    const rule = point.gradeRule
    // A uniform CSV cannot represent nonuniform per-break industrial grading.
    // Its full data are preserved separately in the factory package's JSON.
    const custom = rule?.enabled === true && !point.industrialGradeRule
    const dx = custom ? Number(rule.dxPerSize) : 0
    const dy = custom ? Number(rule.dyPerSize) : 0
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error(`Point ${index + 1} has invalid base coordinates`)
    if (custom && (!validIncrement(rule.dxPerSize) || !validIncrement(rule.dyPerSize))) throw new Error(`Point ${index + 1} has invalid grading increments`)
    return [csvCell(piece.id), piece.points.length, index + 1, point.x, point.y, custom ? 'CUSTOM' : 'AUTO', custom ? dx : '', custom ? dy : ''].join(',')
  })
  return [HEADER, ...rows].join('\r\n') + '\r\n'
}

function splitCsvLine(line) {
  const cells = []
  let cell = '', quoted = false, closed = false
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') { cell += '"'; index++ }
      else if (char === '"') { quoted = false; closed = true }
      else cell += char
    } else if (char === ',' && !closed) { cells.push(cell.trim()); cell = '' }
    else if (char === '"' && !cell.trim() && !closed) { quoted = true }
    else if (closed && char === ',') { cells.push(cell); cell = ''; closed = false }
    else if (closed || char === '"') throw new Error('Malformed quoted CSV field')
    else cell += char
  }
  if (quoted) throw new Error('Unterminated CSV quoted field')
  cells.push(cell.trim())
  return cells
}

// A quoted CSV cell may contain a line break (for example a spreadsheet-edited
// pattern ID). Split records only outside quoted cells so a valid export can
// always be imported without losing its identity check.
function splitCsvRecords(source) {
  const records = []
  let start = 0, quoted = false
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (char === '"') {
      if (quoted && source[index + 1] === '"') index++
      else quoted = !quoted
    } else if (!quoted && (char === '\r' || char === '\n')) {
      const record = source.slice(start, index)
      if (record.trim()) records.push(record)
      if (char === '\r' && source[index + 1] === '\n') index++
      start = index + 1
    }
  }
  if (quoted) throw new Error('Unterminated CSV quoted field')
  const last = source.slice(start)
  if (last.trim()) records.push(last)
  return records
}

export function parseGradeRulesCsv(source, piece) {
  if (typeof source !== 'string' || source.length > 1024 * 1024) throw new Error('Grade-rule CSV must be text under 1 MB')
  if (!piece?.id || !Array.isArray(piece.points) || !piece.points.length) throw new Error('Select a pattern piece before importing grade rules')
  const industrialIndex = piece.points.findIndex(point => point.industrialGradeRule != null)
  if (industrialIndex >= 0) throw new Error(`Point ${industrialIndex + 1} has an industrial size-break rule; importing uniform CSV would overwrite its grading semantics`)
  const lines = splitCsvRecords(source.replace(/^\uFEFF/, ''))
  if (lines.length !== piece.points.length + 1) throw new Error(`Expected ${piece.points.length} point rows; received ${lines.length - 1}`)
  if (lines[0].trim() !== HEADER) throw new Error('Grade-rule CSV columns are missing or in the wrong order')
  const rules = new Array(piece.points.length)
  for (const [rowIndex, line] of lines.slice(1).entries()) {
    const [id, count, pointIndex, pointX, pointY, type, dx, dy, ...extra] = splitCsvLine(line)
    if (extra.length || id !== piece.id || count !== String(piece.points.length)) throw new Error(`Row ${rowIndex + 2}: pattern identity or point count does not match`)
    if (!/^\d+$/.test(pointIndex) || Number(pointIndex) < 1 || Number(pointIndex) > rules.length || rules[Number(pointIndex) - 1] !== undefined) throw new Error(`Row ${rowIndex + 2}: invalid or duplicate point index`)
    const sourcePoint = piece.points[Number(pointIndex) - 1]
    if (!numeric(pointX) || !numeric(pointY) || !Number.isFinite(Number(pointX)) || !Number.isFinite(Number(pointY)) ||
      !Number.isFinite(sourcePoint.x) || !Number.isFinite(sourcePoint.y) ||
      Math.abs(Number(pointX) - sourcePoint.x) > 1e-6 || Math.abs(Number(pointY) - sourcePoint.y) > 1e-6) {
      throw new Error(`Row ${rowIndex + 2}: base point coordinates differ; the pattern may have been edited or reordered`)
    }
    if (type === 'AUTO' && dx === '' && dy === '') rules[Number(pointIndex) - 1] = null
    else if (type === 'CUSTOM' && validIncrement(dx) && validIncrement(dy)) {
      rules[Number(pointIndex) - 1] = { enabled: true, dxPerSize: Number(dx), dyPerSize: Number(dy) }
    } else throw new Error(`Row ${rowIndex + 2}: expected AUTO with blank coordinates or CUSTOM with X/Y increments between -12 and 12 cm`)
  }
  if (rules.some(rule => rule === undefined)) throw new Error('Missing one or more pattern points')
  return rules
}
