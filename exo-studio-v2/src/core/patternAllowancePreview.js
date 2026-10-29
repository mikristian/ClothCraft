/**
 * Display-only seam allowance stroke, in pattern material metres.
 *
 * Preserves the existing board convention: a positive width lies on the
 * right-hand side of the ordered cutline. This is an offset preview, not a
 * production cutline or an edit to the Rust pattern/seam allowance.
 *
 * Adjacent segment normals meet at their actual miter intersection. For very
 * sharp changes of direction we use a bounded bevel instead of creating
 * arbitrarily long spikes. Curves are represented by sampled cutline points.
 */
import {rustAllowancePreviewPoints} from './rustAllowancePreviewKernel.js'
export function seamAllowancePreviewPoints(points,width,{miterLimit=4}={}) {
  if (!Array.isArray(points) || !Number.isFinite(width) || width<=0 ||
      !Number.isFinite(miterLimit) || miterLimit<1) return []
  const clean=[]
  for (const point of points) {
    // The caller splits gaps into separate runs. Never bridge bad coordinates.
    if (!Array.isArray(point) || point.length<2 ||
        !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return []
    if (!clean.length || Math.hypot(point[0]-clean.at(-1)[0],point[1]-clean.at(-1)[1])>1e-9)
      clean.push([point[0],point[1]])
  }
  if (clean.length<2) return []

  // The normal, miter and bevel calculations are authoritative in Rust once
  // the WASM kernel loads. Keep the exact synchronous result while it loads.
  // The WASM and synchronous paths must see the same de-duplicated cutline.
  // Sending original duplicates to WASM can change joins after it loads.
  const rust=rustAllowancePreviewPoints(clean,width,miterLimit)
  if(rust!==null) return rust.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)) ? rust : []

  const normals=[]
  const tangents=[]
  for (let i=1;i<clean.length;i++) {
    const dx=clean[i][0]-clean[i-1][0]
    const dy=clean[i][1]-clean[i-1][1]
    const length=Math.hypot(dx,dy)
    if (!(length>0)) return []
    tangents.push([dx/length,dy/length])
    normals.push([dy/length,-dx/length])
  }

  const shifted=(point,normal)=>[
    point[0]+width*normal[0],point[1]+width*normal[1],
  ]
  const output=[shifted(clean[0],normals[0])]
  for (let i=1;i<clean.length-1;i++) {
    const before=normals[i-1],after=normals[i]
    const cosine=tangents[i-1][0]*tangents[i][0]+tangents[i-1][1]*tangents[i][1]
    const denominator=1+cosine
    const nx=before[0]+after[0],ny=before[1]+after[1]
    const miterScale=denominator>1e-10?1/denominator:Infinity
    const miterLength=Math.hypot(nx,ny)*miterScale
    if (Number.isFinite(miterLength) && miterLength<=miterLimit) {
      output.push([clean[i][0]+width*nx*miterScale,
        clean[i][1]+width*ny*miterScale])
    } else {
      // A severe corner receives a short bevel; it cannot shoot across the
      // pattern or create the long offset spike of an unbounded miter.
      output.push(shifted(clean[i],before),shifted(clean[i],after))
    }
  }
  output.push(shifted(clean.at(-1),normals.at(-1)))
  // Large but finite authored coordinates and allowance widths can overflow
  // offset sums. Do not send Infinity/NaN into SVG rendering or hit testing.
  return output.every(p=>p.every(Number.isFinite)) ? output : []
}
