// Sync public grading calls preserve compatibility while this standalone WASM loads.
export const RUST_GRADING_ABI_VERSION = 1
export const RUST_GRADING_BATCH_ABI_VERSION = 1
let kernel = null
let pending = null
let error = null
export const rustGradingKernelReady = () => Boolean(kernel)
export const rustGradingKernelStatus = () => ({backend:kernel?'rust-wasm':'javascript-fallback', error})

/** Transactional multi-piece grading over adjacent signed, nonuniform
 * size-break vectors. Point IDs are unique inside a piece; piece IDs unique
 * across the pattern. Returns [{size,pieces:[{id,points:[{id,x,y}]}]}].
 * A valid input is computed from base coordinates for every size. When a
 * matching WASM batch ABI is unavailable the same validated JS path applies.
 */
export function gradeMultiPieceBreakTable({pieces,sizes,baseSize}) {
  const bad = reason => {throw new TypeError(`Invalid native grading batch: ${reason}`)}
  // Array.prototype.some/map skip sparse slots, but the WASM ABI is densely
  // packed. A hole otherwise produces a shorter input buffer while Rust is
  // still told the full row count. Validate through iterators, which visit
  // holes as undefined, before allocating or crossing the native boundary.
  if(!Array.isArray(sizes)||sizes.length<2)bad('size names')
  for(const size of sizes)if(typeof size!=='string'||!size.trim()||size!==size.trim())bad('size names')
  if(new Set(sizes).size!==sizes.length)bad('size names')
  const baseIndex=sizes.indexOf(baseSize)
  if(baseIndex<0)bad('base size')
  if(!Array.isArray(pieces)||!pieces.length)bad('piece IDs or pieces')
  for(const piece of pieces)if(!piece||!Number.isSafeInteger(piece.id)||piece.id<=0||!Array.isArray(piece.points)||!piece.points.length)bad('piece IDs or pieces')
  if(new Set(pieces.map(piece=>piece.id)).size!==pieces.length)bad('piece IDs or pieces')
  const points=[]
  for(const piece of pieces){
    const seen=new Set()
    for(const point of piece.points){
      if(!point||!Number.isSafeInteger(point.id)||point.id<=0||seen.has(point.id))bad('point IDs')
      seen.add(point.id)
      if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Array.isArray(point.steps)||point.steps.length!==sizes.length-1)bad('coordinates or break table')
      for(const step of point.steps)if(!step||!Number.isFinite(step.dx)||!Number.isFinite(step.dy))bad('coordinates or break table')
      points.push(point)
    }
  }
  // Bound IDs to the u32 C ABI; preserve them exactly across sizes.
  if(pieces.some(piece=>piece.id>0xffffffff)||points.some(point=>point.id>0xffffffff))bad('IDs exceed u32')
  const count=points.length,total=count*sizes.length
  if(!Number.isSafeInteger(total)||total>0x0fffffff)bad('oversized batch')
  const native=kernel&&kernel.exo_grading_batch_abi_version?.()===RUST_GRADING_BATCH_ABI_VERSION&&
    typeof kernel.exo_grading_batch_alloc==='function'&&typeof kernel.exo_grading_batch_free==='function'&&
    typeof kernel.exo_grade_multi_piece_batch_f64==='function'&&kernel.memory?.buffer
  let values
  if(native){
    const slices=[
      pieces.flatMap(piece=>piece.points.flatMap(point=>[point.x,point.y])),
      pieces.map(piece=>piece.id),pieces.map(piece=>piece.points.length),
      points.map(point=>point.id),
      points.flatMap(point=>point.steps.flatMap(step=>[step.dx,step.dy])),
      new Array(total*2).fill(0),
    ]
    const allocated=[]
    try{
      const pointers=slices.map(data=>{
        const pointer=kernel.exo_grading_batch_alloc(data.length)
        if(!pointer || pointer%8)throw new Error('Rust grading WASM allocation failed')
        allocated.push({pointer,length:data.length})
        new Float64Array(kernel.memory.buffer,pointer,data.length).set(data)
        return pointer
      })
      const result=kernel.exo_grade_multi_piece_batch_f64(...pointers.slice(0,5),pieces.length,count,sizes.length,baseIndex,pointers[5])
      // Normalize the native overflow code to the established JS contract;
      // callers must not observe different validation semantics after load.
      if(result===-4)bad('overflow')
      if(result!==0)bad(`Rust batch error ${result}`)
      values=Float64Array.from(new Float64Array(kernel.memory.buffer,pointers[5],total*2))
      if(values.some(value=>!Number.isFinite(value)))bad('Rust result is nonfinite')
    }finally{
      for(const {pointer,length} of allocated.reverse())kernel.exo_grading_batch_free(pointer,length)
    }
  }else{
  values=new Float64Array(total*2)
  for(let index=0;index<count;index++){
    const point=points[index]
    const place=(sizeIndex,deltaX,deltaY)=>{
      const x=point.x+deltaX,y=point.y+deltaY
      if(!Number.isFinite(x)||!Number.isFinite(y))bad('overflow')
      const pos=(sizeIndex*count+index)*2;values[pos]=x;values[pos+1]=y
    }
    place(baseIndex,0,0)
    let dx=0,dy=0
    for(let sizeIndex=baseIndex+1;sizeIndex<sizes.length;sizeIndex++){
      dx+=point.steps[sizeIndex-1].dx;dy+=point.steps[sizeIndex-1].dy
      if(!Number.isFinite(dx)||!Number.isFinite(dy))bad('overflow')
      place(sizeIndex,dx,dy)
    }
    dx=0;dy=0
    for(let sizeIndex=baseIndex-1;sizeIndex>=0;sizeIndex--){
      dx-=point.steps[sizeIndex].dx;dy-=point.steps[sizeIndex].dy
      if(!Number.isFinite(dx)||!Number.isFinite(dy))bad('overflow')
      place(sizeIndex,dx,dy)
    }
  }
  }
  return sizes.map((size,sizeIndex)=>{
    let index=0
    return {size,pieces:pieces.map(piece=>({id:piece.id,points:piece.points.map(point=>{
      const position=(sizeIndex*count+index++)*2
      return {id:point.id,x:values[position],y:values[position+1]}
    })}))}
  })
}
// Persistence keeps the original JSON gradeRule fields and their JS Number
// coercion; invalid overrides retain automatic grading on either backend.
export function gradePersistedRuleCoordinate(base,rawDelta,offset,automatic) {
  const delta=Number(rawDelta)
  if(!Number.isFinite(delta))return automatic
  if(kernel&&typeof kernel.exo_grade_rule_coordinate==='function')
    return kernel.exo_grade_rule_coordinate(base,delta,offset)
  return base+delta*offset
}
export async function initializeRustGradingKernel({bytes,url='/wasm/exo_grading_kernel.wasm'}={}) {
  if (kernel) return true
  if (pending) return pending
  pending = (async () => {
    try {
      const raw = bytes ?? await fetch(url).then(r => {if(!r.ok)throw new Error(`Grading WASM HTTP ${r.status}`);return r.arrayBuffer()})
      const module = await WebAssembly.instantiate(raw,{})
      const exports = module.instance?.exports ?? module.exports
      if (exports.exo_grading_abi_version?.() !== RUST_GRADING_ABI_VERSION ||
          typeof exports.exo_grade_point_x !== 'function' || typeof exports.exo_grade_point_y !== 'function')
        throw new Error('Unexpected EXO Rust grading ABI')
      kernel = exports
      error = null
      return true
    } catch (e) { error=String(e?.message??e); return false }
    finally { pending=null }
  })()
  return pending
}
export function gradeAutomaticCoordinates(point,bounds,offset,width,length) {
  const {minX,maxX,minY,maxY}=bounds
  const {x,y}=point
  if(kernel) {
    return {x:kernel.exo_grade_point_x(x,y,minX,maxX,minY,maxY,offset,width,length),
      y:kernel.exo_grade_point_y(x,y,minX,maxX,minY,maxY,offset,width,length)}
  }
  const centerX=(minX+maxX)*0.5
  const normalizedY=(y-minY)/Math.max(1,maxY-minY)
  return {x:x+Math.sign(x-centerX)*(width*offset)*0.5*(0.55+0.45*(1-normalizedY)),
    y:y-length*offset*(1-normalizedY)}
}
// Kick off loading during browser module evaluation, preserving the synchronous API.
if(typeof window!=='undefined' && typeof WebAssembly!=='undefined')void initializeRustGradingKernel()
