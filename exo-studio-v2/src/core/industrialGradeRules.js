/**
 * Open, independently implemented grade-rule arithmetic.
 *
 * A rule table describes offsets from a reference size for one pattern point,
 * expressed as finite coordinate pairs {dx,dy} in caller-selected units.
 *
 * Modes:
 *  - small-large-incremental: one signed step per adjacent size, left to right.
 *  - base-up-down-incremental: two arrays of outward steps from the base size.
 *  - base-up-down-cumulative: two arrays of total offsets from the base size.
 *
 * For the latter two modes, down[0] is the base's immediate smaller neighbor
 * and up[0] is its immediate larger neighbor. Signed values are deliberate:
 * shrinking often uses negative dx, but arbitrary signed grading is supported.
 * Size labels are ordered smallest to largest. All arithmetic is unit-agnostic.
 */

export const INDUSTRIAL_GRADE_MODES = Object.freeze({
  SMALL_LARGE_INCREMENTAL: 'small-large-incremental',
  BASE_UP_DOWN_INCREMENTAL: 'base-up-down-incremental',
  BASE_UP_DOWN_CUMULATIVE: 'base-up-down-cumulative',
})

const MODES = new Set(Object.values(INDUSTRIAL_GRADE_MODES))
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
const exactDataKeys = (value, expected) => plain(value) &&
  Reflect.ownKeys(value).length === expected.length &&
  expected.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    return descriptor?.enumerable === true && own(descriptor, 'value')
  })
const denseDataArray = (value) => {
  if (!Array.isArray(value) || Reflect.ownKeys(value).length !== value.length + 1) return false
  for (let i = 0; i < value.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i))
    if (descriptor?.enumerable !== true || !own(descriptor, 'value')) return false
  }
  return true
}

function fail(message) {
  throw new TypeError(`Invalid industrial grade rule: ${message}`)
}

function pair(value, where) {
  if (!exactDataKeys(value, ['dx', 'dy']) || !Number.isFinite(value.dx) || !Number.isFinite(value.dy)) {
    fail(`${where} must contain finite numeric dx and dy`)
  }
  return { dx: value.dx, dy: value.dy }
}

const zero = () => ({ dx: 0, dy: 0 })
const add = (a, b) => ({ dx: a.dx + b.dx, dy: a.dy + b.dy })
const subtract = (a, b) => ({ dx: a.dx - b.dx, dy: a.dy - b.dy })

function checkedPair(value, where) {
  if (!Number.isFinite(value.dx) || !Number.isFinite(value.dy)) fail(`${where} exceeds finite numeric range`)
  return { dx: value.dx, dy: value.dy }
}

function checkedOperation(a, b, where, op) {
  return checkedPair(op(a, b), where)
}

/**
 * Validate a complete rule and return a defensive normalized copy.
 * Rejects unknown fields and mismatched array lengths to catch malformed CSV
 * imports rather than silently applying a different grade.
 */
export function validateIndustrialGradeRule(rule) {
  if (!plain(rule) || !['mode', 'sizes', 'baseSize'].every(key => own(rule, key))) fail('rule must declare its own mode, sizes, and baseSize')
  if (Reflect.ownKeys(rule).some(key => {
    const descriptor = Object.getOwnPropertyDescriptor(rule, key)
    return typeof key !== 'string' || descriptor?.enumerable !== true || !own(descriptor, 'value')
  })) fail('rule must contain own enumerable data fields only')
  const { mode, sizes, baseSize } = rule
  if (!MODES.has(mode)) fail(`unknown mode: ${String(mode)}`)
  if (!denseDataArray(sizes) || sizes.length < 2 || sizes.some((s) => typeof s !== 'string' || !s.trim() || s !== s.trim()) || new Set(sizes).size !== sizes.length) {
    fail('sizes must be an ordered array of at least two unique, nonempty names')
  }
  if (typeof baseSize !== 'string' || !sizes.includes(baseSize)) fail('baseSize must belong to sizes')
  const baseIndex = sizes.indexOf(baseSize)
  const common = { mode, sizes: [...sizes], baseSize }
  if (mode === INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL) {
    if (own(rule, 'up') || own(rule, 'down')) fail('small-large mode accepts steps only')
    if (!denseDataArray(rule.steps) || rule.steps.length !== sizes.length - 1) fail('steps length must equal sizes.length - 1')
    if (!exactDataKeys(rule, ['mode', 'sizes', 'baseSize', 'steps'])) fail('unexpected or inherited rule fields')
    return { ...common, steps: Array.from(rule.steps, (value, index) => pair(value, `steps[${index}]`)) }
  }
  if (own(rule, 'steps')) fail('base-up-down modes accept up and down only')
  const expectedDown = baseIndex
  const expectedUp = sizes.length - baseIndex - 1
  if (!denseDataArray(rule.down) || rule.down.length !== expectedDown) fail(`down length must be ${expectedDown}`)
  if (!denseDataArray(rule.up) || rule.up.length !== expectedUp) fail(`up length must be ${expectedUp}`)
  if (!exactDataKeys(rule, ['mode', 'sizes', 'baseSize', 'down', 'up'])) fail('unexpected or inherited rule fields')
  return {
    ...common,
    down: Array.from(rule.down, (value, index) => pair(value, `down[${index}]`)),
    up: Array.from(rule.up, (value, index) => pair(value, `up[${index}]`)),
  }
}

/** Evaluate all sizes once, in size order, as base-relative displacements. */
export function evaluateIndustrialGradeTable(input) {
  const rule = validateIndustrialGradeRule(input)
  const baseIndex = rule.sizes.indexOf(rule.baseSize)
  const offsets = Array.from({ length: rule.sizes.length }, zero)
  if (rule.mode === INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL) {
    for (let i = baseIndex + 1; i < offsets.length; i++) {
      offsets[i] = checkedOperation(offsets[i - 1], rule.steps[i - 1], `size ${rule.sizes[i]}`, add)
    }
    for (let i = baseIndex - 1; i >= 0; i--) {
      offsets[i] = checkedOperation(offsets[i + 1], rule.steps[i], `size ${rule.sizes[i]}`, subtract)
    }
  } else {
    for (let i = 0; i < rule.up.length; i++) {
      const position = baseIndex + i + 1
      offsets[position] = rule.mode === INDUSTRIAL_GRADE_MODES.BASE_UP_DOWN_CUMULATIVE
        ? { ...rule.up[i] }
        : checkedOperation(offsets[position - 1], rule.up[i], `size ${rule.sizes[position]}`, add)
    }
    for (let i = 0; i < rule.down.length; i++) {
      const position = baseIndex - i - 1
      offsets[position] = rule.mode === INDUSTRIAL_GRADE_MODES.BASE_UP_DOWN_CUMULATIVE
        ? { ...rule.down[i] }
        : checkedOperation(offsets[position + 1], rule.down[i], `size ${rule.sizes[position]}`, add)
    }
  }
  return Object.fromEntries(rule.sizes.map((size, index) => [size, offsets[index]]))
}

/** Return a defensive displacement for one named size. */
export function evaluateIndustrialGradeRule(rule, size) {
  const table = evaluateIndustrialGradeTable(rule)
  if (typeof size !== 'string' || !own(table, size)) fail(`unknown target size: ${String(size)}`)
  return { ...table[size] }
}

/** Convert any supported representation without losing unequal size breaks. */
export function convertIndustrialGradeRule(input, mode) {
  if (!MODES.has(mode)) fail(`unknown destination mode: ${String(mode)}`)
  const source = validateIndustrialGradeRule(input)
  const offsetBySize = evaluateIndustrialGradeTable(source)
  const offsets = source.sizes.map((size) => offsetBySize[size])
  const baseIndex = source.sizes.indexOf(source.baseSize)
  const common = { mode, sizes: [...source.sizes], baseSize: source.baseSize }
  if (mode === INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL) {
    return { ...common, steps: offsets.slice(1).map((current, i) => checkedOperation(current, offsets[i], `steps[${i}]`, subtract)) }
  }
  const cumulative = mode === INDUSTRIAL_GRADE_MODES.BASE_UP_DOWN_CUMULATIVE
  const down = [], up = []
  for (let i = baseIndex - 1; i >= 0; i--) {
    down.push(cumulative ? { ...offsets[i] } : checkedOperation(offsets[i], offsets[i + 1], `down[${down.length}]`, subtract))
  }
  for (let i = baseIndex + 1; i < offsets.length; i++) {
    up.push(cumulative ? { ...offsets[i] } : checkedOperation(offsets[i], offsets[i - 1], `up[${up.length}]`, subtract))
  }
  return { ...common, down, up }
}

/** Canonical round-trip through another mode (or all three if unspecified). */
export function roundTripIndustrialGradeRule(input, viaMode = INDUSTRIAL_GRADE_MODES.BASE_UP_DOWN_CUMULATIVE) {
  const source = validateIndustrialGradeRule(input)
  const intermediate = convertIndustrialGradeRule(source, viaMode)
  return convertIndustrialGradeRule(intermediate, source.mode)
}
