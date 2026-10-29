/**
 * Real, verified EXO V2 tools that help continue a CLO 7 workflow when its
 * exact construction operation is not implemented. Labels deliberately name
 * the EXO action; they do not claim equivalent CLO geometry or physics.
 */
import {CLO7_3D_A,CLO7_3D_B,CLO7_2D_A,CLO7_2D_B} from '../data/clo7ToolbarOrder.js'
import {getClo7NativeCapability} from './clo7NativeToolCapabilities.js'

const exactSlots=new Map([
  ...CLO7_3D_A.map(slot=>['3d:'+slot.id,slot]),
  ...CLO7_3D_B.map(slot=>['3d:'+slot.id,slot]),
  ...CLO7_2D_A.map(slot=>['2d:'+slot.id,slot]),
  ...CLO7_2D_B.map(slot=>['2d:'+slot.id,slot]),
])

// Only provide alternatives with a verified native operation. Every target
// runs exactly the documented EXO command, without changing the source tool.
const alternatives=Object.freeze({
  '3d:A04':['2d:A05','Draw a native 2D internal line'],
  '3d:A08':['3d:A06','Sew two complete edges manually'],
  '3d:A09':['3d:A05','Inspect and edit native sewing'],
  '3d:A10':['3d:A07','Connect two fabric boundaries'],
  '3d:A11':['3d:A02','Position a garment panel in 3D'],
  '3d:A12':['3d:A02','Reposition a 3D garment panel'],
  '3d:A16':['3d:A03','Inspect existing cloth mesh vertices'],
  '3d:B01':['3d:A01','Simulate garment cloth'],
  '3d:B02':['2d:A02','Edit 2D pattern points'],
  '3d:B03':['2d:A05','Draw an internal line on a flat pattern'],
  '3d:B04':['2d:A04','Draft a native 2D polygon'],
  '2d:A03':['2d:A02','Edit native pattern points'],
  '2d:A10':['2d:A11','Measure two 2D pattern points'],
  '2d:A15':['2d:A05','Draft internal fold-guide lines'],
  '2d:B06':['2d:B02','Create a native seam without reinforcing tape'],
  '2d:B15':['2d:A04','Create a new pattern shape'],
})

export function getClo7ToolAlternative(dimension,position){
  const tuple=alternatives[`${dimension}:${position}`]
  if(!tuple)return null
  const [id,label]=tuple
  const targetDimension=id.slice(0,2)
  const slot=exactSlots.get(id)
  const capability=slot&&getClo7NativeCapability(targetDimension,slot.id)
  if(!slot||capability?.mode!=='native')return null
  return {id,label,dimension:targetDimension,slot}
}
