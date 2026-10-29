/**
 * The CLO converter preserves original axes. Buttons are generally authored
 * with Y as the thickness and X/Z as the front face. The garment attachment
 * editor instead expresses width, face height, and normal depth in that order.
 * Source measurements are estimates until supplier dimensions are checked.
 */
import {rustHardwareSwap} from './rustCoreMathKernel.js'
export function importedCloHardwareDimensions(asset) {
  const numbers=Array.isArray(asset?.dimensionsMm) ? asset.dimensionsMm.map(Number) : []
  const values=[numbers[0]||10,numbers[1]||10,numbers[2]||3].map(n=>Number.isFinite(n)&&n>0?n:3)
  if(rustHardwareSwap(values[0],values[1],values[2]))return [values[0],values[2],values[1]]
  return values
}
