// Small, deterministic, millimetre-only arithmetic graph for draft measurements.
// This does not execute Seamly construction tools, constrain contours or grade sizes.
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/
const MAX_MEASUREMENTS = 512
const MAX_FORMULA_LENGTH = 4096
const MAX_TOKENS = 512
const MAX_NODES = 1024
const MAX_DEPTH = 64
const MAX_ABS_MM = 1e9

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
const safeNumber = n => Number.isFinite(n) && Math.abs(n) <= MAX_ABS_MM
const failure = (reason, issues = [reason]) => ({ ok: false, reason, issues, valuesMm: Object.freeze(Object.create(null)), dependencyOrder: Object.freeze([]), manufacturingApproved: false })

function tokenize(source) {
  if (typeof source !== 'string' || source.length === 0 || source.length > MAX_FORMULA_LENGTH) throw Error('Invalid formula length')
  const tokens = []
  let at = 0
  while (at < source.length) {
    if (/\s/.test(source[at])) { at++; continue }
    const tail = source.slice(at)
    const number = /^(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?/.exec(tail)
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(tail)
    if (number) {
      const value = Number(number[0])
      if (!safeNumber(value)) throw Error('Nonfinite or overflowing numeric literal')
      tokens.push({ type: 'number', value })
      at += number[0].length
    } else if (identifier) {
      if (!IDENTIFIER.test(identifier[0])) throw Error('Invalid variable identifier')
      tokens.push({ type: 'variable', name: identifier[0] })
      at += identifier[0].length
    } else if ('+-*/()'.includes(source[at])) {
      tokens.push({ type: source[at++] })
    } else throw Error(`Forbidden character at offset ${at}`)
    if (tokens.length > MAX_TOKENS) throw Error('Formula token limit exceeded')
  }
  if (!tokens.length) throw Error('Empty formula')
  return tokens
}

function parseFormula(source) {
  const tokens = tokenize(source)
  let index = 0
  let nodes = 0
  const refs = new Set()
  const node = (kind, fields) => {
    if (++nodes > MAX_NODES) throw Error('Formula node limit exceeded')
    return { kind, ...fields }
  }
  const take = type => tokens[index]?.type === type ? tokens[index++] : null
  const primary = depth => {
    if (depth > MAX_DEPTH) throw Error('Formula nesting limit exceeded')
    if (take('+')) return node('unary', { op: '+', child: primary(depth + 1) })
    if (take('-')) return node('unary', { op: '-', child: primary(depth + 1) })
    const number = take('number')
    if (number) return node('number', { value: number.value })
    const variable = take('variable')
    if (variable) { refs.add(variable.name); return node('variable', { name: variable.name }) }
    if (take('(')) {
      const inside = expression(depth + 1)
      if (!take(')')) throw Error('Unclosed formula parenthesis')
      return inside
    }
    throw Error('Expected a number, variable or parenthesized expression')
  }
  const product = depth => {
    let left = primary(depth)
    while (tokens[index]?.type === '*' || tokens[index]?.type === '/') {
      const op = tokens[index++].type
      left = node('binary', { op, left, right: primary(depth + 1) })
    }
    return left
  }
  const expression = depth => {
    if (depth > MAX_DEPTH) throw Error('Formula nesting limit exceeded')
    let left = product(depth)
    while (tokens[index]?.type === '+' || tokens[index]?.type === '-') {
      const op = tokens[index++].type
      left = node('binary', { op, left, right: product(depth + 1) })
    }
    return left
  }
  const tree = expression(0)
  if (index !== tokens.length) throw Error('Unexpected trailing formula tokens')
  return { tree, refs: [...refs] }
}

function calculate(tree, values) {
  const visit = node => {
    if (node.kind === 'number') return node.value
    if (node.kind === 'variable') return values[node.name]
    if (node.kind === 'unary') return node.op === '-' ? -visit(node.child) : visit(node.child)
    const a = visit(node.left)
    const b = visit(node.right)
    if (node.op === '/' && b === 0) throw Error('Division by zero')
    const result = node.op === '+' ? a + b : node.op === '-' ? a - b : node.op === '*' ? a * b : a / b
    if (!safeNumber(result)) throw Error('Nonfinite or overflowing arithmetic result')
    return result
  }
  const value = visit(tree)
  if (!safeNumber(value)) throw Error('Nonfinite or overflowing measurement')
  return value
}

/** Evaluate a self-contained named measurement graph; all inputs and outputs are millimetres. */
export function evaluateNativeDraftFormulas20261023(input) {
  try {
    if (!record(input) || !record(input.measurements)) throw Error('measurements must be a plain object')
    const names = Object.keys(input.measurements)
    if (!names.length || names.length > MAX_MEASUREMENTS) throw Error('Measurement count must be between 1 and 512')
    if (input.overrides !== undefined && !record(input.overrides)) throw Error('overrides must be a plain object')
    const overrides = input.overrides || Object.create(null)
    for (const name of [...names, ...Object.keys(overrides)]) {
      if (!IDENTIFIER.test(name) || ['__proto__', 'prototype', 'constructor'].includes(name)) throw Error(`Invalid measurement name: ${name}`)
    }
    const known = new Set(names)
    const parsed = Object.create(null)
    for (const name of Object.keys(overrides)) {
      if (!known.has(name)) throw Error(`Override references missing measurement: ${name}`)
      if (!safeNumber(overrides[name])) throw Error(`Invalid millimetre override: ${name}`)
    }
    for (const name of names) {
      const entry = input.measurements[name]
      if (Object.hasOwn(overrides, name)) { parsed[name] = { value: overrides[name], refs: [] }; continue }
      if (typeof entry === 'number') {
        if (!safeNumber(entry)) throw Error(`Invalid millimetre value: ${name}`)
        parsed[name] = { value: entry, refs: [] }
      } else if (record(entry)) {
        if (typeof entry.formula === 'string') {
          parsed[name] = parseFormula(entry.formula)
        } else if (Object.hasOwn(entry, 'valueMm') && safeNumber(entry.valueMm)) {
          parsed[name] = { value: entry.valueMm, refs: [] }
        } else throw Error(`Measurement ${name} requires a formula or finite valueMm`)
      } else throw Error(`Invalid measurement: ${name}`)
    }
    const order = []
    const state = Object.create(null)
    const stack = []
    const resolve = name => {
      if (state[name] === 2) return
      if (state[name] === 1) throw Error(`Circular formula dependency: ${[...stack.slice(stack.indexOf(name)), name].join(' -> ')}`)
      if (!known.has(name)) throw Error(`Missing measurement reference: ${name}`)
      if (stack.length >= MAX_MEASUREMENTS) throw Error('Formula graph depth limit exceeded')
      state[name] = 1
      stack.push(name)
      for (const ref of parsed[name].refs) resolve(ref)
      stack.pop()
      state[name] = 2
      order.push(name)
    }
    for (const name of names) resolve(name)
    const values = Object.create(null)
    for (const name of order) {
      try { values[name] = Object.hasOwn(parsed[name], 'value') ? parsed[name].value : calculate(parsed[name].tree, values) }
      catch (error) { throw Error(`${name}: ${error.message}`) }
    }
    return Object.freeze({ ok: true, valuesMm: Object.freeze(values), dependencyOrder: Object.freeze(order), issues: Object.freeze([]), manufacturingApproved: false })
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Invalid formula graph')
  }
}
