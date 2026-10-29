import {uniqueId, sampleEdge} from './project.js'
import {pieceCenter, topstitchPaths, zipperPaths, offsetEdgePath} from './trims.js'
import {getHardwarePreset} from '../data/hardwarePresets.js'

/** Commands for the persisted EXO draft garment document, not Rust native edits.
 * Caller must pass the returned project through its existing undoable mutateProject
 * transaction. No action in this module claims to construct rigid-body hardware.
 */
export const DRAFT_HARDWARE_COMMANDS = Object.freeze(['button','buttonhole','topstitch','zipper','binding'])
const collection = Object.freeze({button:'buttons',buttonhole:'buttonholes',topstitch:'topstitches',zipper:'zippers',binding:'bindings'})

function finite(value, name, min, max) {
  if(typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new RangeError(`${name} must be a finite number between ${min} and ${max}`)
  return value
}
function validEdge(piece, edgeIndex) {
  if(!Number.isSafeInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= piece.points.length)
    throw new RangeError('An existing pattern edge is required')
  const path=offsetEdgePath(piece,edgeIndex,0,8)
  if(path.length < 2 || !path.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)) ||
      path.slice(1).every((point,index)=>Math.hypot(point.x-path[index].x,point.y-path[index].y)<1e-6))
    throw new RangeError('A nondegenerate pattern edge is required')
}
function coords(piece, options) {
  const center=pieceCenter(piece)
  return {x:finite(options.x??center.x,'x',-500,500),y:finite(options.y??center.y,'y',-500,500)}
}
function presetRef(kind, options) {
  if(options.hardwarePresetId===undefined || options.hardwarePresetId===null)return {}
  const preset=getHardwarePreset(options.hardwarePresetId)
  if(!preset || preset.kind!==kind)throw new RangeError(`Select an existing ${kind} hardware preset`)
  return {hardwarePresetId:preset.id}
}
function color(value,name='color') {
  if(typeof value!=='string'||!/^#[0-9a-fA-F]{6}$/.test(value))
    throw new RangeError(`${name} must be #RRGGBB`)
  return value
}
function finitePaths(paths, message) {
  if(!paths.every(path=>path.length>=2&&path.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y))))
    throw new RangeError(message)
}
function patternContains(piece,point) {
  const boundary=piece.points.flatMap((_,index)=>sampleEdge(piece,index,24).slice(0,-1))
  if(!boundary.length||!boundary.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))
    throw new RangeError('Pattern boundary must have finite coordinates')
  let inside=false
  for(let i=0,j=boundary.length-1;i<boundary.length;j=i++) {
    const a=boundary[i],b=boundary[j]
    const dx=b.x-a.x,dy=b.y-a.y
    const cross=(point.x-a.x)*dy-(point.y-a.y)*dx
    if(Math.abs(cross)<=1e-7*Math.max(1,Math.hypot(dx,dy)) &&
      point.x>=Math.min(a.x,b.x)-1e-7&&point.x<=Math.max(a.x,b.x)+1e-7&&
      point.y>=Math.min(a.y,b.y)-1e-7&&point.y<=Math.max(a.y,b.y)+1e-7)return true
    if((a.y>point.y)!==(b.y>point.y) && point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside
  }
  return inside
}
function validatedPlacement(piece,options) {
  const point=coords(piece,options)
  if(!patternContains(piece,point))throw new RangeError('Hardware attachment must lie on the selected pattern')
  return point
}
function validateBoundary(piece) {
  const boundary=piece.points.flatMap((_,index)=>sampleEdge(piece,index,24))
  if(!boundary.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)))
    throw new RangeError('Pattern boundary must have finite coordinates')
}
function validatedPiece(project,pieceId) {
  const piece=project.pieces.find(item=>item.id===pieceId)
  if(!piece || !Array.isArray(piece.points) || piece.points.length<3 || piece.locked)
    throw new RangeError('Select an unlocked pattern with valid points')
  if(!piece.points.every(point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y)))
    throw new RangeError('Pattern points must contain finite coordinates')
  validateBoundary(piece)
  return piece
}
function buildItem(piece,kind,edgeIndex,options) {
  if(kind==='topstitch'||kind==='zipper'||kind==='binding')validEdge(piece,edgeIndex)
  let item
  if(kind==='button') {
    item={...validatedPlacement(piece,options),diameterCm:finite(options.diameterCm??1.2,'diameterCm',0.1,20),
      holes:finite(options.holes??4,'holes',0,8),color:color(options.color??'#303030'),...presetRef(kind,options)}
    if(!Number.isInteger(item.holes))throw new RangeError('holes must be an integer')
  } else if(kind==='buttonhole') {
    item={...validatedPlacement(piece,options),lengthCm:finite(options.lengthCm??2.4,'lengthCm',0.1,30),
      widthCm:finite(options.widthCm??0.35,'widthCm',0.01,20),
      orientationDeg:finite(options.orientationDeg??0,'orientationDeg',-360,360),color:color(options.color??'#575757'),...presetRef(kind,options)}
  } else if(kind==='topstitch') {
    item={edgeIndex,offsetCm:finite(options.offsetCm??0.7,'offsetCm',0,20),
      rows:finite(options.rows??1,'rows',1,3),rowGapCm:finite(options.rowGapCm??0.45,'rowGapCm',0.01,10),
      stitchLengthMm:finite(options.stitchLengthMm??3,'stitchLengthMm',0.1,25),color:color(options.color??'#8d8d8d')}
    if(!Number.isInteger(item.rows))throw new RangeError('rows must be an integer')
    finitePaths(topstitchPaths(piece,item),'Unable to construct topstitch paths')
  } else if(kind==='zipper') {
    item={edgeIndex,widthCm:finite(options.widthCm??1.2,'widthCm',0.15,10),
      offsetCm:finite(options.offsetCm??0,'offsetCm',-5,5),sliderFraction:finite(options.sliderFraction??1,'sliderFraction',0,1),
      fastened:options.fastened??true,twoWay:options.twoWay??false,...presetRef(kind,options)}
    if(typeof item.fastened!=='boolean'||typeof item.twoWay!=='boolean')
      throw new TypeError('Zipper fastened and twoWay must be booleans')
    const preset=item.hardwarePresetId&&getHardwarePreset(item.hardwarePresetId)
    if(preset?.twoWay===false && item.twoWay)throw new RangeError('Selected zipper preset does not support two-way sliders')
    finitePaths(zipperPaths(piece,item),'Unable to construct zipper tape paths')
  } else {
    item={edgeIndex,widthCm:finite(options.widthCm??1.8,'widthCm',0.1,20),
      ratio:finite(options.ratio??0.96,'ratio',0.5,1.2),stiffness:finite(options.stiffness??0.72,'stiffness',0,1),
      color:color(options.color??'#3b3b3b')}
    finitePaths([offsetEdgePath(piece,edgeIndex,0,32)],'Unable to construct binding path')
  }
  return item
}

/** In-place draft operation; call ONLY inside the app's undoable mutateProject callback.
 * Throws before mutation on bad input; returns the persisted annotation metadata.
 */
export function applyDraftHardwareAction(project, command) {
  if(!project || !Array.isArray(project.pieces) || !command || typeof command!=='object')
    throw new TypeError('An editable draft project and command are required')
  const {kind,pieceId,edgeIndex,operation='create',itemId,...options}=command
  if(!Object.hasOwn(collection,kind))throw new RangeError(`Unsupported draft construction command: ${kind}`)
  if(!['create','update','remove'].includes(operation))throw new RangeError('Unsupported draft hardware operation')
  const piece=validatedPiece(project,pieceId)
  const existing=piece[collection[kind]]
  if(existing!==undefined&&!Array.isArray(existing))throw new TypeError('Hardware collection must be an array')
  const index=operation==='create'?-1:existing?.findIndex(item=>item.id===itemId)??-1
  if(operation!=='create'&&index<0)throw new RangeError('Existing hardware annotation ID required')
  if(operation==='remove') {
    const [item]=existing.splice(index,1)
    // A deleted placement must not leave its mate pointing at a missing ID.
    if(kind==='button') {
      for(const mate of piece.buttonholes||[])if(mate.pairedButtonId===item.id)mate.pairedButtonId=null
    } else if(kind==='buttonhole') {
      for(const mate of piece.buttons||[])if(mate.pairedButtonholeId===item.id)mate.pairedButtonholeId=null
    }
    return {ok:true,engine:'exo-draft',operation,kind,pieceId,id:item.id,collection:collection[kind],item}
  }
  const original=index<0?null:existing[index]
  const input=original?{...original,...options}:options
  const resolvedEdge=edgeIndex??original?.edgeIndex
  const item=buildItem(piece,kind,resolvedEdge,input)
  if(original) {
    // Keep valid optional styling and user metadata while rebuilding validated construction fields.
    const updated={...original,...item,id:original.id}
    if((kind==='zipper'||kind==='binding'||kind==='topstitch')&&updated.edgeIndex!==original.edgeIndex)
      updated.edgeIndex=resolvedEdge
    existing[index]=updated
    return {ok:true,engine:'exo-draft',operation,kind,pieceId,id:original.id,collection:collection[kind],item:updated}
  }
  const id=uniqueId(kind)
  const created={id,...item}
  if(!Array.isArray(piece[collection[kind]]))piece[collection[kind]]=[]
  piece[collection[kind]].push(created)
  return {ok:true,engine:'exo-draft',operation,kind,pieceId,id,collection:collection[kind],item:created}
}

/** Safe dry-run transaction, useful for validation and integration tests. */
export function constructDraftHardware(project,command) {
  const next=structuredClone(project)
  const result=applyDraftHardwareAction(next,command)
  return {...result,project:next}
}
