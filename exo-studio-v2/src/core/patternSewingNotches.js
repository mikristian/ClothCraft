// A deliberate, opt-in sewing balance preset for the EXO tee fixture.
// CLO has separate physical notch objects and directional sewing arrows.
// Only front/back armholes receive pattern-cut alignment notches here.
import {rustTeeNotchFractions} from './rustNotchPresetKernel.js'
export function teeBalanceNotchCommands(template) {
  if(!Array.isArray(template?.panels))return []
  const commands=[]
  for(const panel of template.panels){
    // Only authored string identifiers can become sewing-command references.
    // Imported or partially constructed panels may contain null entries.
    if(!panel||typeof panel.id!=='string')continue
    const name=panel.id.toLowerCase()
    if(name!=='front'&&name!=='back')continue
    const polygon=panel.polygon
    if(!Array.isArray(polygon?.edges))continue
    for(const edge of polygon.edges){
      // The integrated-sleeve tee fixture calls these sleeve-under edges,
      // while separate-sleeve bodices use armhole. Restrict this preset to
      // exactly these attachment curves on explicitly named front/back.
      if(typeof edge!=='string'||!/^(?:armhole[-_]|sleeve-under[-_]|underarm[-_])/i.test(edge)||polygon.notches?.[edge]?.length)continue
      const fractions=rustTeeNotchFractions(name,true,false)
      for(const t of fractions){
        commands.push({kind:'Notch',panel:panel.id,edge,t,depth_m:.006})
      }
    }
  }
  return commands
}
