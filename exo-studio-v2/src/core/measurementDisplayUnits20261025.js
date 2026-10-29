// Pattern model coordinates remain metres. Unit preference only changes what
// people read or type in the editor, never persisted native garment geometry.
export const MEASUREMENT_DISPLAY_UNITS=Object.freeze({mm:1000,cm:100,in:100/2.54})
export const MEASUREMENT_UNIT_DECIMALS=Object.freeze({mm:1,cm:2,in:3})
export function toDisplayMeasurement20261025(metres,unit='mm') {
  if(!Object.hasOwn(MEASUREMENT_DISPLAY_UNITS,unit))throw Error('Unsupported measurement unit')
  if(!Number.isFinite(metres))throw Error('Measurement must be finite')
  return metres*MEASUREMENT_DISPLAY_UNITS[unit]
}
export function formatDisplayMeasurement20261025(metres,unit='mm') {
  const value=toDisplayMeasurement20261025(metres,unit)
  const decimals=MEASUREMENT_UNIT_DECIMALS[unit]
  return `${Math.abs(value)<.5*10**-decimals?(0).toFixed(decimals):value.toFixed(decimals)} ${unit}`
}
