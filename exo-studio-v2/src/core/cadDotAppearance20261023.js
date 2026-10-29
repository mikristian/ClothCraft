// Display-only, material-aligned dot grid. Stable physical stations avoid
// jumping or antialiasing into solid bands at far zoom levels.
const PHYSICAL_METRE_STEPS=[.0025,.005,.01,.02,.025,.05,.1,.2,.25,.5,1,2,5]
const HEX=/^#[0-9a-f]{6}$/i
export function cadColor20261023(value,fallback){return typeof value==='string'&&HEX.test(value)?value:fallback}
export function cadDotStep20261023(worldUnitsPerPixel,worldToMetres=1){
  if(!Number.isFinite(worldUnitsPerPixel)||worldUnitsPerPixel<=0||!Number.isFinite(worldToMetres)||worldToMetres<=0)return null
  const target=worldUnitsPerPixel*worldToMetres*15
  const step=PHYSICAL_METRE_STEPS.find(v=>v>=target)||PHYSICAL_METRE_STEPS.at(-1)
  return step/worldToMetres
}
