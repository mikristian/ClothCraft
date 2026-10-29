import {rustTangentDragDelta} from './rustTangentDragKernel.js'

/** Handle endpoints are p +/- 0.18 * derivative in material coordinates.
 * Invert that presentation transform so a drag follows the pointer in metres.
 * The caller handles board rotation before this conversion. */
export function freeTangentDragDelta(delta, side) {
  return rustTangentDragDelta(delta,side)
}
