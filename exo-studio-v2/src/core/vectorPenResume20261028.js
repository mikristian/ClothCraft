/** Resume a paused open CAD pen contour from either existing endpoint.
 * Reversing flips the Bézier tangent orientation and leaves source untouched.
 * Never insert, discard, or silently commit a vertex on Escape/restart. */
export function resumePausedPenFromAnchor(points,tangents,index){
 if(!Array.isArray(points)||!Array.isArray(tangents)||points.length===0||tangents.length!==points.length||
  !Number.isInteger(index)||(index!==0&&index!==points.length-1)||
  !points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||
  !tangents.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return null
 const reverse=index===0&&points.length>1
 return {points:(reverse?[...points].reverse():points).map(p=>[...p]),
   tangents:(reverse?[...tangents].reverse():tangents).map(p=>reverse?p.map(v=>v===0?0:-v):[...p]),
   selected:points.length-1}
}
