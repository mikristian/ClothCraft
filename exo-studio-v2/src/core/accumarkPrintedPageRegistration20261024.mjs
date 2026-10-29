// Digital PDF ink planner only. All output coordinates are page-local cm,
// origin at top left; no output segment is a closed cutting contour.
const MAX_PAGES = 2048
const MAX_PLACEMENTS = 10000
const MAX_POINTS = 250000
const MAX_CANDIDATES = 200000
const MAX_RECT_COMPARISONS = 2000000
const EPS = 1e-9
const finite = n => typeof n === 'number' && Number.isFinite(n)
const validText = s => typeof s === 'string' && s.length <= 120 && !/[\u0000-\u001f\u007f]/.test(s)
const printable = s => s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '?')
const issue = (code, message, pageIndex) => ({ code, message, ...(pageIndex === undefined ? {} : { pageIndex }) })
const point = (x, y) => ({ x: +x.toFixed(6), y: +y.toFixed(6) })
const rectOverlap = (a, b, spacing = 0) => a.x0 < b.x1 + spacing - EPS && a.x1 > b.x0 - spacing + EPS && a.y0 < b.y1 + spacing - EPS && a.y1 > b.y0 - spacing + EPS

function validated(marker, pages, size, fabricId) {
  if (!marker || typeof marker !== 'object' || !finite(marker.width) || !finite(marker.length) || marker.width <= 0 || marker.width > 1e7 || marker.length <= 0 || marker.length > 1e7 || !Array.isArray(marker.placements) || marker.placements.length > MAX_PLACEMENTS || !Array.isArray(pages) || !pages.length || pages.length > MAX_PAGES || !validText(size) || !validText(fabricId)) throw new RangeError('Invalid registration source')
  let points = 0
  const obstacles = []
  for (const p of marker.placements) {
    if (!p || !Array.isArray(p.outline) || p.outline.length < 3 || p.outline.length > 2000 || (points += p.outline.length) > MAX_POINTS) throw new RangeError('Invalid registration outline budget')
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const v of p.outline) {
      if (!v || !finite(v.x) || !finite(v.y) || Math.abs(v.x) > 1e7 || Math.abs(v.y) > 1e7) throw new RangeError('Invalid registration outline point')
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y)
    }
    obstacles.push({ x0, x1, y0, y1 })
  }
  let end = 0
  for (const page of pages) {
    if (!page || !finite(page.startCm) || !finite(page.endCm) || !finite(page.heightCm) || page.startCm < 0 || page.endCm <= page.startCm || Math.abs(page.startCm - end) > EPS || Math.abs(page.heightCm - (page.endCm - page.startCm)) > EPS || page.heightCm > 400 + EPS) throw new RangeError('Invalid registration page stations')
    end = page.endCm
  }
  if (Math.abs(end - marker.length) > EPS) throw new RangeError('Registration pages must cover marker')
  return obstacles
}

function design(x, y, side, index, count, startCm, endCm, size, fabricId) {
  // Distinct crosses: first is a full +, second is a corner-facing asymmetric L + tick.
  const segments = side === 'left'
    ? [[point(x - .16, y), point(x + .16, y)], [point(x, y - .16), point(x, y + .16)]]
    : [[point(x - .16, y), point(x + .16, y)], [point(x, y - .16), point(x, y + .16)], [point(x + .16, y - .16), point(x + .16, y - .075)]]
  const text = `P${index + 1}/${count} ${side === 'left' ? 'A' : 'B'} ${printable(size)} ${printable(fabricId)} ${startCm.toFixed(3)}-${endCm.toFixed(3)}cm`
  // Conservative 0.25cm per ASCII glyph covers the widest Helvetica 7pt characters.
  // The text anchor is its lower left and the ink box extends upward by .34cm.
  const label = { x: point(x - .2, 0).x, y: point(0, y + .65).y, text }
  return { side, segments, label, _boxes: [
    { x0: x - .18, x1: x + .18, y0: y - .18, y1: y + .18 },
    { x0: label.x, x1: label.x + text.length * .25, y0: label.y - .34, y1: label.y + .06 },
  ] }
}

function plan(marker, pages, size, fabricId, includeRuler) {
  if (typeof includeRuler !== 'boolean') throw new RangeError('Invalid ruler reservation flag')
  const obstacles = validated(marker, pages, size, fabricId)
  if (pages.length === 1) return { ok: true, issues: [], pages: [{ pageIndex: 1, startCm: pages[0].startCm, endCm: pages[0].endCm, targets: [] }], physicallyRegistered: false }
  const output = []
  let attempts = 0
  let comparisons = 0
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    // Reserve ruler ink only when the PDF actually prints it. A separate
    // calibration sheet deliberately removes that ink from every marker page.
    const ruler = includeRuler && marker.width >= 11 && page.heightCm >= 3
      ? [{ x0: .4, x1: 10.9, y0: 1.15, y1: 2.25 }] : []
    const cuts = obstacles.map(o => ({ x0: o.x0, x1: o.x1, y0: o.y0 - page.startCm, y1: o.y1 - page.startCm }))
      .filter(o => o.y1 >= -.1 && o.y0 <= page.heightCm + .1)
    const occupied = [...ruler, ...cuts]
    const targets = []
    for (const side of ['left', 'right']) {
      let found
      // Discrete 0.25cm search grid; every candidate includes complete text ink box.
      // Keep the top and bottom corners visually associated with separate targets.
      const xs = side === 'left'
        ? Array.from({ length: Math.max(0, Math.min(400, Math.floor((marker.width - 1.5) * 4))) }, (_, k) => .75 + k * .25)
        : Array.from({ length: Math.max(0, Math.min(400, Math.floor((marker.width - 1.5) * 4))) }, (_, k) => marker.width - .75 - k * .25)
      const yStart = side === 'left' ? .75 : page.heightCm - 1.3
      const ys = Array.from({ length: Math.max(0, Math.min(1600, Math.floor((page.heightCm - 1.8) * 4))) }, (_, k) => side === 'left' ? yStart + k * .25 : yStart - k * .25)
      search: for (const y of ys) for (const x of xs) {
        if (++attempts > MAX_CANDIDATES) return { ok: false, issues: [issue('REGISTRATION_WORK_BUDGET', 'Registration candidate limit exceeded', i)], pages: [], physicallyRegistered: false }
        const item = design(x, y, side, i, pages.length, page.startCm, page.endCm, size, fabricId)
        if (item._boxes.some(b => b.x0 < .5 - EPS || b.x1 > marker.width - .5 + EPS || b.y0 < .5 - EPS || b.y1 > page.heightCm - .5 + EPS)) continue
        let overlaps = false
        for (const b of item._boxes) {
          for (const o of occupied) {
            if (++comparisons > MAX_RECT_COMPARISONS) return { ok: false, issues: [issue('REGISTRATION_WORK_BUDGET', 'Registration rectangle-comparison limit exceeded', i)], pages: [], physicallyRegistered: false }
            if (rectOverlap(b, o, .1)) { overlaps = true; break }
          }
          if (overlaps) break
        }
        if (overlaps) continue
        found = item
        break search
      }
      if (!found) return { ok: false, issues: [issue('NO_SAFE_REGISTRATION_POSITION', `No safe ${side} registration target on page ${i + 1}`, i)], pages: [], physicallyRegistered: false }
      occupied.push(...found._boxes)
      targets.push({ side: found.side, segments: found.segments, label: found.label })
    }
    output.push({ pageIndex: i + 1, startCm: page.startCm, endCm: page.endCm, targets })
  }
  return { ok: true, issues: [], pages: output, physicallyRegistered: false }
}

/** Return two digitally printable marks per page or fail closed. No inputs mutated. */
export function planPrintedMarkerPageRegistration20261024(marker, pages, { size = 'BASE', fabricId = marker?.fabricId || 'Fabric', includeRuler = true } = {}) {
  try { return plan(marker, pages, size, fabricId, includeRuler) }
  catch (error) { return { ok: false, issues: [issue('INVALID_REGISTRATION_INPUT', String(error.message || error))], pages: [], physicallyRegistered: false } }
}

/** Recompute canonical ink geometry and refuse altered or incomplete target data. */
export function auditPrintedMarkerPageRegistration20261024(marker, pages, supplied, options = {}) {
  const expected = planPrintedMarkerPageRegistration20261024(marker, pages, options)
  if (!expected.ok) return expected
  try {
    if (!supplied || JSON.stringify(supplied.pages) !== JSON.stringify(expected.pages)) throw new Error('Printed registration geometry, page identity or label differs')
    return { ok: true, issues: [], checkedPages: expected.pages.length, physicallyRegistered: false }
  } catch (error) { return { ok: false, issues: [issue('REGISTRATION_PARITY', String(error.message || error))], checkedPages: 0, physicallyRegistered: false } }
}
