import { INDUSTRIAL_GRADE_MODES, convertIndustrialGradeRule, validateIndustrialGradeRule } from './industrialGradeRules.js'

const HEADER = 'piece_id,point_count,point_index,point_x_cm,point_y_cm,base_size,size_from,size_to,dx_cm,dy_cm'
const number = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/
const quote = value => `"${String(value).replaceAll('"', '""')}"`
const decimal = value => typeof value === 'string' && number.test(value) && Number.isFinite(Number(value))

function csvRecords(source) {
  const rows = []
  let row = [], cell = '', quoted = false, afterQuote = false, start = true
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') { quoted = false; afterQuote = true }
      else cell += ch
    } else if (ch === ',' || ch === '\n' || ch === '\r') {
      row.push(cell); cell = ''; afterQuote = false; start = true
      if (ch !== ',') {
        if (row.some(item => item !== '')) rows.push(row)
        row = []
        if (ch === '\r' && source[i + 1] === '\n') i++
      }
    } else if (ch === '"' && start) { quoted = true; start = false }
    else if (afterQuote || ch === '"') throw new Error('Malformed size-break CSV quoted field')
    else { cell += ch; start = false }
  }
  if (quoted) throw new Error('Unterminated size-break CSV quoted field')
  if (cell || row.length) { row.push(cell); if (row.some(item => item !== '')) rows.push(row) }
  return rows
}

function check(piece, grading) {
  if (!piece?.id || !Array.isArray(piece.points) || !piece.points.length) throw new Error('Select a valid pattern piece')
  const sizes = grading?.sizes
  if (!Array.isArray(sizes) || sizes.length < 2 || new Set(sizes).size !== sizes.length || !sizes.includes(grading?.baseSize)) throw new Error('Valid named size breaks and base size required')
  return sizes
}

/** Lossless per-point size-break spreadsheet for currently authored industrial rules.
 * Only explicitly authored industrial points appear; standard/AUTO points remain untouched.
 * Import/export does not certify any factory compatibility or mutate a pattern. */
export function exportIndustrialGradeCsv(piece, grading) {
  const sizes = check(piece, grading)
  const rows = [HEADER]
  piece.points.forEach((point, index) => {
    if (!point.industrialGradeRule) return
    const rule = validateIndustrialGradeRule(point.industrialGradeRule)
    if (JSON.stringify(rule.sizes) !== JSON.stringify(sizes) || rule.baseSize !== grading.baseSize) throw new Error(`Point ${index + 1}: stale size set or base size`)
    const incremental = convertIndustrialGradeRule(rule, INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL)
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error('Base point has invalid coordinates')
    incremental.steps.forEach((step, breakIndex) => {
      rows.push([quote(piece.id),piece.points.length,index + 1,point.x,point.y,quote(grading.baseSize),quote(sizes[breakIndex]),quote(sizes[breakIndex + 1]),step.dx,step.dy].join(','))
    })
  })
  if (rows.length === 1) throw new Error('No authored industrial size-break rules on this piece')
  return `${rows.join('\r\n')}\r\n`
}

export function parseIndustrialGradeCsv(source, piece, grading) {
  const sizes = check(piece, grading)
  if (typeof source !== 'string' || source.length > 1024 * 1024) throw new Error('Size-break CSV must be text under 1 MB')
  const rows = csvRecords(source.replace(/^\uFEFF/, ''))
  if (!rows.length || rows[0].join(',') !== HEADER) throw new Error('Unrecognized industrial grade CSV header')
  const rules = new Map(), expectedBreaks = sizes.length - 1
  for (const [rowIndex, cells] of rows.slice(1).entries()) {
    if (cells.length !== 10) throw new Error(`Row ${rowIndex + 2}: expected ten fields`)
    const [id, count, index, x, y, base, from, to, dx, dy] = cells
    const n = Number(index)
    if (id !== piece.id || count !== String(piece.points.length) || !/^\d+$/.test(index) || n < 1 || n > piece.points.length) throw new Error(`Row ${rowIndex + 2}: stale pattern or point identity`)
    if (base !== grading.baseSize) throw new Error(`Row ${rowIndex + 2}: stale base size`)
    const point = piece.points[n - 1]
    if (![x,y,dx,dy].every(decimal) || Math.abs(Number(x) - point.x) > 1e-6 || Math.abs(Number(y) - point.y) > 1e-6) throw new Error(`Row ${rowIndex + 2}: invalid coordinates or changed base geometry`)
    const breakIndex = sizes.findIndex((size,i) => size === from && sizes[i + 1] === to)
    if (breakIndex < 0) throw new Error(`Row ${rowIndex + 2}: unknown or reordered size break`)
    if (Math.abs(Number(dx)) > 12 || Math.abs(Number(dy)) > 12) throw new Error(`Row ${rowIndex + 2}: X/Y grade exceeds 12 cm safety limit`)
    if (!rules.has(n - 1)) rules.set(n - 1, new Map())
    if (rules.get(n - 1).has(breakIndex)) throw new Error(`Row ${rowIndex + 2}: duplicate point/size break`)
    rules.get(n - 1).set(breakIndex, {dx:Number(dx),dy:Number(dy)})
  }
  if (!rules.size) throw new Error('No industrial size-break data')
  return [...rules.entries()].map(([index,steps]) => {
    if (steps.size !== expectedBreaks) throw new Error(`Point ${index + 1}: incomplete size-break table`)
    const rule = validateIndustrialGradeRule({mode:INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL,sizes:[...sizes],baseSize:grading.baseSize,steps:Array.from({length:expectedBreaks},(_,i)=>steps.get(i))})
    return {pointIndex:index,rule}
  }).sort((a,b)=>a.pointIndex-b.pointIndex)
}
