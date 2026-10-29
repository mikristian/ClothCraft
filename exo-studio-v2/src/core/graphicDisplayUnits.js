// Graphic print geometry remains stored in physical millimetres.
const MM_PER_UNIT={mm:1,cm:10,in:25.4}
export const graphicDisplayUnit=unit=>Object.hasOwn(MM_PER_UNIT,unit)?unit:'mm'
export const graphicMmToDisplay=(mm,unit='mm')=>Number(mm)/MM_PER_UNIT[graphicDisplayUnit(unit)]
export const graphicDisplayToMm=(value,unit='mm')=>Number(value)*MM_PER_UNIT[graphicDisplayUnit(unit)]
export const graphicDisplayPrecision=unit=>graphicDisplayUnit(unit)==='mm'?2:graphicDisplayUnit(unit)==='cm'?3:4
