// Arc-length parameterization of a native boundary cutline for interactive
// Free Sewing. Values are normalized to the full material edge (0..1), the
// same fractions consumed by the Rust Sew edit. Display layout rotation and
// translation do not change arc length.
import {rustFreeSewingOperation} from './rustFreeSewingKernel.js'
const finitePoint = value => Array.isArray(value) && value.length>=2 &&
  Number.isFinite(value[0]) && Number.isFinite(value[1])

export function cutlinePoints(indices, positions) {
  // An incomplete boundary is unusable for sewing: dropping one vertex would
  // join its two neighbours and invent a material edge across the gap.
  if (!Array.isArray(indices) || !Array.isArray(positions) || indices.length < 2) return []
  const points=[]
  let totalLength=0
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= positions.length ||
        !finitePoint(positions[index])) return []
    const point=positions[index]
    if(points.length){
      const previous=points[points.length-1]
      const segmentLength=Math.hypot(point[0]-previous[0],point[1]-previous[1])
      totalLength+=segmentLength
      // Finite vertices can still overflow a segment or accumulated arclength.
      // Reject the entire cutline instead of passing Infinity to WASM or sewing tools.
      if(!Number.isFinite(totalLength))return []
    }
    points.push(point)
  }
  return points
}

function segments(points) {
  const lengths=[]
  let total=0
  for(let i=1;i<points.length;i++){
    const length=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1])
    lengths.push(length)
    total+=length
  }
  return {lengths,total}
}

export function projectFreeSewingPoint(indices, positions, mouse) {
  const points=cutlinePoints(indices,positions)
  if(points.length<2||!finitePoint(mouse))return null
  const native=rustFreeSewingOperation(points,1,mouse[0],mouse[1])
  if(native!==null)return native??null
  const {lengths,total}=segments(points)
  if(total<=1e-7)return null
  let traversed=0,best=null
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],length=lengths[i-1]
    if(length<=1e-9){traversed+=length;continue}
    const dx=b[0]-a[0],dy=b[1]-a[1]
    const u=Math.max(0,Math.min(1,((mouse[0]-a[0])*dx+(mouse[1]-a[1])*dy)/(length*length)))
    const point=[a[0]+u*dx,a[1]+u*dy]
    const distance=Math.hypot(mouse[0]-point[0],mouse[1]-point[1])
    if(!best||distance<best.distance)best={fraction:(traversed+u*length)/total,
      position:point,distance,lengthMetres:total}
    traversed+=length
  }
  return best
}

export function freeSewingRangePoints(indices, positions, start, end) {
  const points=cutlinePoints(indices,positions)
  if(points.length<2||!Number.isFinite(start)||!Number.isFinite(end))return []
  const native=rustFreeSewingOperation(points,3,start,end)
  if(native!==null)return native
  const {lengths,total}=segments(points)
  if(total<=1e-7)return []
  const low=Math.max(0,Math.min(1,Math.min(start,end)))*total
  const high=Math.max(0,Math.min(1,Math.max(start,end)))*total
  if(high-low<=1e-8)return []
  const output=[]
  let traversed=0
  for(let i=1;i<points.length;i++){
    const length=lengths[i-1]
    const begin=traversed,finish=begin+length
    if(length>1e-9&&finish>=low-1e-9&&begin<=high+1e-9){
      const a=points[i-1],b=points[i]
      const lerp=distance=>{
        const t=Math.max(0,Math.min(1,(distance-begin)/length))
        return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
      }
      const from=lerp(Math.max(low,begin)),to=lerp(Math.min(high,finish))
      if(!output.length)output.push(from)
      const last=output.at(-1)
      if(Math.hypot(to[0]-last[0],to[1]-last[1])>1e-9)output.push(to)
    }
    traversed=finish
  }
  return output
}

export function freeSewingPointAtFraction(indices, positions, fraction) {
  const points=cutlinePoints(indices,positions)
  if(points.length<2||!Number.isFinite(fraction))return null
  const native=rustFreeSewingOperation(points,2,fraction)
  if(native!==null)return native??null
  const {lengths,total}=segments(points)
  if(total<=1e-7)return null
  const target=Math.max(0,Math.min(1,fraction))*total
  let traversed=0
  for(let i=1;i<points.length;i++){
    const length=lengths[i-1]
    if(length>1e-9 && (traversed+length>=target || i===points.length-1)){
      const t=Math.max(0,Math.min(1,(target-traversed)/length))
      return [points[i-1][0]+(points[i][0]-points[i-1][0])*t,
        points[i-1][1]+(points[i][1]-points[i-1][1])*t]
    }
    traversed+=length
  }
  return points.at(-1)
}
