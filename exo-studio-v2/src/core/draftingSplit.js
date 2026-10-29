// Numeric CLO-style Add Point / Split Line measurements, in centimeters.
// This is an independent implementation of user-facing documented behaviors:
// Split by length / ratio / uniform divisions on true straight or curved arcs.
import { edgeLength } from './project.js'
import { quadraticAtLengthFraction } from './draftingPrecision.js'
import { rustSplitUniformFractions, rustSplitSingleFraction, rustSplitQuadraticParameter } from './rustSplitKernel.js'

export const SPLIT_MODES = Object.freeze({
  uniform: 'Equal length divisions',
  length: 'Distance from edge start',
  ratio: 'Ratio from edge start',
})

// Split dialogs accept decimal measurements, not JavaScript's alternate-base
// literals or object coercions (e.g. '0x5' or [5]). Keep finite numeric inputs
// and ordinary decimal/scientific-notation strings compatible with the UI.
const decimalSplitInput = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (typeof value !== 'string') return NaN
  const trimmed = value.trim()
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) return NaN
  return Number(trimmed)
}

// Imported drafting data must provide real coordinate values, not inherited
// properties or accessor functions that run during a split preview.
const ownFinitePair = (point, xKey = 'x', yKey = 'y') => {
  if (!point || typeof point !== 'object') return null
  const x = Object.getOwnPropertyDescriptor(point, xKey)
  const y = Object.getOwnPropertyDescriptor(point, yKey)
  if (!x || !y || !Object.hasOwn(x, 'value') || !Object.hasOwn(y, 'value')
      || !Number.isFinite(x.value) || !Number.isFinite(y.value)) return null
  return { x: x.value, y: y.value }
}

// Measure only a verified copy of the selected edge. Imported arrays and
// objects may contain inherited values or getters; edgeLength reads fields.
const safeSplitEdge = (piece, edgeIndex) => {
  const points = piece.points
  const first = ownFinitePair(Object.getOwnPropertyDescriptor(points, edgeIndex)?.value)
  const second = ownFinitePair(Object.getOwnPropertyDescriptor(points, (edgeIndex + 1) % points.length)?.value)
  if (!first || !second) throw new Error('Split edge coordinates must be finite')
  const curves = Object.getOwnPropertyDescriptor(piece, 'curves')
  if (curves && !Object.hasOwn(curves, 'value')) throw new Error('Split curve handle coordinates must be finite')
  const curveMap = curves?.value
  if (curveMap != null && typeof curveMap !== 'object') throw new Error('Split curve handle coordinates must be finite')
  const handleDescriptor = curveMap && Object.getOwnPropertyDescriptor(curveMap, edgeIndex)
  if (curveMap && edgeIndex in curveMap && !handleDescriptor) throw new Error('Split curve handle coordinates must be finite')
  if (handleDescriptor && !Object.hasOwn(handleDescriptor, 'value')) throw new Error('Split curve handle coordinates must be finite')
  const control = handleDescriptor?.value
  const handle = control == null ? null : ownFinitePair(control, 'cx', 'cy')
  if (control != null && !handle) throw new Error('Split curve handle coordinates must be finite')
  return { points: [first, second], curves: handle ? { 0: { cx: handle.x, cy: handle.y } } : {} }
}

export function draftingSplitFractions(piece, edgeIndex, {
  method = 'uniform', count = 2, lengthCm, ratioPercent,
} = {}) {
  if (!piece || !Array.isArray(piece.points) || !Number.isInteger(edgeIndex)
    || edgeIndex < 0 || edgeIndex >= piece.points.length) throw new Error('Select a valid pattern edge')
  const length = edgeLength(safeSplitEdge(piece, edgeIndex), 0)
  if (!Number.isFinite(length) || length < .001) throw new Error('Edge must have a positive measurable length')
  if (method === 'uniform') {
    const number = decimalSplitInput(count)
    if (!Number.isInteger(number) || number < 2 || number > 12) {
      throw new Error('Use 2 to 12 equal-length segments')
    }
    return rustSplitUniformFractions(number) ?? Array.from({ length: number - 1 }, (_, index) => (index + 1) / number)
  }
  let fraction
  if (method === 'length') {
    const distance = decimalSplitInput(lengthCm)
    if (!Number.isFinite(distance)) throw new Error('Enter a finite edge distance in centimeters')
    fraction = rustSplitSingleFraction('length',distance,length) ?? distance / length
  } else if (method === 'ratio') {
    const ratio = decimalSplitInput(ratioPercent)
    if (!Number.isFinite(ratio)) throw new Error('Enter a finite edge percentage')
    fraction = rustSplitSingleFraction('ratio',ratio,length) ?? ratio / 100
  } else throw new Error('Unknown split mode')
  // Existing project topology split maintains a five-percent minimum per
  // subdivision to prevent degenerate manufacturing and seam edges.
  if (fraction < .05 || fraction > .95) {
    throw new Error('Split position must lie between 5% and 95% of the edge length')
  }
  return [fraction]
}

export function splitParameterAtArcFraction(piece, edgeIndex, fraction) {
  if (!Array.isArray(piece?.points) || !Number.isInteger(edgeIndex)
    || edgeIndex < 0 || edgeIndex >= piece.points.length) throw new Error('Invalid split edge')
  if (!Number.isFinite(fraction) || fraction < .05 - 1e-9 || fraction > .95 + 1e-9) {
    throw new Error('Split arc fraction must remain inside the edge')
  }
  const a = ownFinitePair(Object.getOwnPropertyDescriptor(piece.points, edgeIndex)?.value)
  const b = ownFinitePair(Object.getOwnPropertyDescriptor(piece.points, (edgeIndex + 1) % piece.points.length)?.value)
  if (!a || !b) {
    throw new Error('Split edge coordinates must be finite')
  }
  const curves = piece.curves
  const controlDescriptor = curves && typeof curves === 'object'
    ? Object.getOwnPropertyDescriptor(curves, edgeIndex) : null
  if (curves && edgeIndex in curves && !controlDescriptor) {
    throw new Error('Split curve handle coordinates must be finite')
  }
  if (controlDescriptor && !Object.hasOwn(controlDescriptor, 'value')) {
    throw new Error('Split curve handle coordinates must be finite')
  }
  const control = controlDescriptor?.value
  const handle = control == null ? null : ownFinitePair(control, 'cx', 'cy')
  if (control != null && !handle) {
    throw new Error('Split curve handle coordinates must be finite')
  }
  // Do not silently return a valid-looking parameter for a zero-length edge.
  // Curved loops can have coincident endpoints but still measurable arc length.
  const chordLength = Math.hypot(b.x - a.x, b.y - a.y)
  if (!Number.isFinite(chordLength)) throw new Error('Split edge length must be finite')
  if (chordLength < .001) {
    const measuredLength = handle ? edgeLength({ points: [a, b], curves: { 0: { cx: handle.x, cy: handle.y } } }, 0) : chordLength
    if (!Number.isFinite(measuredLength) || measuredLength < .001) {
      throw new Error('Edge must have a positive measurable length')
    }
  }
  if (!handle) return fraction
  return rustSplitQuadraticParameter(a,handle,b,fraction) ?? quadraticAtLengthFraction(a,handle,b,fraction).parameter
}
