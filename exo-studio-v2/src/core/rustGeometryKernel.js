import { fetchWasmBytes } from './wasmTransport.js'
/**
 * Rust-first drafting/measurement geometry. Existing synchronous editor
 * call-sites retain their shapes and errors; JS operates only until the
 * independently versioned geometry WASM module has finished loading.
 */
export const RUST_GEOMETRY_ABI_VERSION=1
const WASM_PATH='/wasm/exo_geometry_kernel.wasm'
let rust=null
let loading=null
let error=null
const required=['exo_geometry_abi_version','exo_grid_coordinate',
  'exo_nearest_segment_t','exo_length_2d','exo_length_3d',
  'exo_quadratic_arc_length','exo_cubic_coordinate',
  'exo_cubic_derivative','exo_cubic_polyline_length',
  'exo_draft_axis_x','exo_draft_axis_y',
  'exo_draft_axis_angle_x','exo_draft_axis_angle_y']

export const rustGeometryKernelReady=()=>Boolean(rust)
// Optional ABI v1 extension. Older modules retain the original DXF arithmetic.
// Keep multiplication order: changing it can change serialized DXF decimals.
export function rustDxfNotchCut(point,normal,depthCm){
  if(rust&&typeof rust.exo_dxf_notch_coordinate==='function'){
    const coordinate=(axis,outer)=>rust.exo_dxf_notch_coordinate(point[axis],normal[axis],depthCm,outer)
    return {a:{x:coordinate('x',0),y:coordinate('y',0)},
      b:{x:coordinate('x',1),y:coordinate('y',1)}}
  }
  return {
    a:{x:point.x-normal.x*depthCm*0.15,y:point.y-normal.y*depthCm*0.15},
    b:{x:point.x+normal.x*depthCm,y:point.y+normal.y*depthCm},
  }
}
/** Optional v1 extension: half-open scanline intersection with Rust geometry.
 * NaN is a deliberate "no crossing" sentinel; `null` requests JS fallback
 * when loading or when an older installed geometry WASM lacks the export. */
export function rustPatternSpanIntersection(a,b,value,horizontal){
  const fn=horizontal?'exo_pattern_span_horizontal':'exo_pattern_span_vertical'
  if(!rust||typeof rust[fn]!=='function')return null
  return rust[fn](a[0],a[1],b[0],b[1],value)
}
// Null means the installed WASM predates topology exports; retain JS collision.
export function rustTopologyCollision(a,b,c,d){
  if(!rust || typeof rust.exo_topology_kind!=='function' ||
    typeof rust.exo_topology_x!=='function' || typeof rust.exo_topology_y!=='function')return null
  const args=[a.x,a.y,b.x,b.y,c.x,c.y,d.x,d.y]
  const kind=rust.exo_topology_kind(...args)
  if(kind===0)return {kind:'none'}
  if(kind===2)return {kind:'overlap'}
  return {kind:'point',point:{x:rust.exo_topology_x(...args),y:rust.exo_topology_y(...args)}}
}
export const rustGeometryKernelStatus=()=>({
  backend:rust?'rust-wasm':'javascript-fallback',
  abiVersion:rust?.exo_geometry_abi_version()??null,
  error,
})

export async function initializeRustGeometryKernel({bytes,url=WASM_PATH}={}){
  if(rust)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const raw=bytes??await fetchWasmBytes(url, "Geometry WASM HTTP ")
      const module=await WebAssembly.instantiate(raw,{})
      const exports=module.instance?.exports??module.exports
      if(required.some(name=>typeof exports?.[name]!=='function') ||
         exports.exo_geometry_abi_version()!==RUST_GEOMETRY_ABI_VERSION)
        throw new Error('Unexpected EXO Rust geometry ABI')
      rust=exports
      error=null
      return true
    }catch(caught){
      rust=null
      error=String(caught?.message||caught)
      return false
    }
  })()
  return loading
}

// Public functions receive already validated finite numeric values from
// draftingSnapping / draftingPrecision / clothcraftSelectionMetrics.
export function rustGridCoordinate(value,origin,spacing){
  return rust?rust.exo_grid_coordinate(value,origin,spacing):
    origin+Math.round((value-origin)/spacing)*spacing
}
export function rustNearestSegmentT(point,a,b){
  if(rust)return rust.exo_nearest_segment_t(point.x,point.y,a.x,a.y,b.x,b.y)
  const dx=b.x-a.x,dy=b.y-a.y
  const squared=dx*dx+dy*dy
  return squared<1e-12?0:Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/squared))
}
// Keep the original JS calculation as a synchronous compatibility fallback.
// Return the original destination object for sub-epsilon movement, including
// any caller metadata, as constrainDraftAxis always did.
export function rustConstrainDraftAxis(start,destination,incrementDegrees=45){
  const dx=destination.x-start.x,dy=destination.y-start.y
  if(Math.hypot(dx,dy)<1e-10)return {...destination}
  const increment=incrementDegrees*Math.PI/180
  const angle=Math.round(Math.atan2(dy,dx)/increment)*increment
  if(rust)return {
    x:rust.exo_draft_axis_angle_x(start.x,start.y,destination.x,destination.y,angle),
    y:rust.exo_draft_axis_angle_y(start.x,start.y,destination.x,destination.y,angle),
  }
  const travel=dx*Math.cos(angle)+dy*Math.sin(angle)
  return {x:start.x+travel*Math.cos(angle),y:start.y+travel*Math.sin(angle)}
}
export function rustSegmentLength2D(a,b){
  return rust?rust.exo_length_2d(a[0],a[1],b[0],b[1]):
    Math.hypot(a[0]-b[0],a[1]-b[1])
}
export function rustSegmentLength3D(a,b){
  return rust?rust.exo_length_3d(a[0],a[1],a[2],b[0],b[1],b[2]):
    Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])
}
export function rustQuadraticArcLength(a,control,b,start=0,end=1,tolerance=1e-7){
  if(!rust)return null
  return rust.exo_quadratic_arc_length(
    a.x,a.y,control.x,control.y,b.x,b.y,start,end,tolerance)
}

// Cubic Bézier calculations for CLO-style independent incoming/outgoing
// control handles. Coordinates remain physical material metres throughout.
export function rustCubicAt([a,b,c,d],t){
  if(!rust)return null
  return [
    rust.exo_cubic_coordinate(a[0],b[0],c[0],d[0],t),
    rust.exo_cubic_coordinate(a[1],b[1],c[1],d[1],t),
  ]
}
export function rustCubicDerivativeAt([a,b,c,d],t){
  if(!rust)return null
  return [
    rust.exo_cubic_derivative(a[0],b[0],c[0],d[0],t),
    rust.exo_cubic_derivative(a[1],b[1],c[1],d[1],t),
  ]
}
export function rustCubicPolylineLength([a,b,c,d],start=0,end=1,slices=128){
  if(!rust)return null
  return rust.exo_cubic_polyline_length(
    a[0],a[1],b[0],b[1],c[0],c[1],d[0],d[1],start,end,slices)
}

if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined'){
  void initializeRustGeometryKernel()
}

// Optional ABI v1 extension; null requests the pre-load/older-module fallback.
export function rustDeletedPointEdgeIndex(edge, point, count) {
  if (!rust?.exo_deleted_point_edge) return undefined
  const mapped = rust.exo_deleted_point_edge(edge, point, count)
  return mapped === -1 ? null : mapped
}
export function rustDeletionTopologyValid(piece) {
  if (!rust?.exo_deletion_alloc || !rust?.exo_deletion_valid || !rust?.exo_deletion_free) return null
  // Match draftingTopology's descriptor-only validation. Imported accessors
  // must never execute during cutline preflight or supply mutable coordinates.
  const ownValue = (object, key) => {
    if (!object || typeof object !== 'object') return undefined
    const descriptor = Object.getOwnPropertyDescriptor(object, key)
    return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined
  }
  const points = ownValue(piece, 'points')
  if (!Array.isArray(points) || points.length < 3) return false
  const curvesDescriptor = Object.getOwnPropertyDescriptor(piece, 'curves')
  if (curvesDescriptor && !Object.hasOwn(curvesDescriptor, 'value')) return false
  const curves = ownValue(piece, 'curves')
  if (curves !== undefined && curves !== null &&
      (typeof curves !== 'object' || Array.isArray(curves))) return false
  const length = points.length * 5
  const ptr = rust.exo_deletion_alloc(length)
  try {
    const data = new Float64Array(rust.memory.buffer, ptr, length)
    for (let i = 0; i < points.length; i++) {
      const point = ownValue(points, i)
      const x = ownValue(point, 'x'), y = ownValue(point, 'y')
      const curveDescriptor = curves && Object.getOwnPropertyDescriptor(curves, i)
      if (curves && i in curves && (!curveDescriptor || !Object.hasOwn(curveDescriptor, 'value'))) return false
      const curve = curveDescriptor?.value
      const cx = ownValue(curve, 'cx'), cy = ownValue(curve, 'cy')
      data.set([Number.isFinite(x) ? x : NaN,
        Number.isFinite(y) ? y : NaN, curve != null ? 1 : 0,
        Number.isFinite(cx) ? cx : NaN,
        Number.isFinite(cy) ? cy : NaN], i * 5)
    }
    return Boolean(rust.exo_deletion_valid(ptr, length))
  } finally {
    rust.exo_deletion_free(ptr, length)
  }
}
