// Screen-space hit resolution for visible native 3D sewing guides. This is a
// display/picking calculation only: native Rust owns all sewing constraints.
const finitePoint = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)

/**
 * Order seam IDs by screen-space proximity, retaining each seam's closest
 * sampled guide. 3D occlusion is intentionally checked by the caller with the
 * real camera ray; no solver or native snapshot state is changed here.
 */
export function rankNativeSeam3DGuideScreen20261025(segments, pointer, tolerancePx = 10, {keepAllSamples=false}={}) {
  if (!Array.isArray(segments) || segments.length > 8192 || !finitePoint(pointer) ||
      !Number.isFinite(tolerancePx) || tolerancePx <= 0 || tolerancePx > 48) return []
  const closestBySeam = new Map(), samples=[]
  const maximum = tolerancePx * tolerancePx
  for (const segment of segments) {
    if (!segment?.visible || typeof segment.seamId !== 'string' || !segment.seamId ||
        !finitePoint(segment.a) || !finitePoint(segment.b)) continue
    const vx = segment.b[0] - segment.a[0], vy = segment.b[1] - segment.a[1]
    const length2 = vx * vx + vy * vy
    const t = length2 > 1e-8 ? Math.max(0, Math.min(1,
      ((pointer[0]-segment.a[0])*vx+(pointer[1]-segment.a[1])*vy)/length2)) : 0
    const dx = pointer[0]-(segment.a[0]+vx*t), dy = pointer[1]-(segment.a[1]+vy*t)
    const distanceSquared = dx*dx+dy*dy
    if (distanceSquared > maximum) continue
    const candidate={seamId:segment.seamId,guideIndex:segment.guideIndex,t,distanceSquared,segment}
    if(keepAllSamples) samples.push(candidate)
    else {
      const prior = closestBySeam.get(segment.seamId)
      if (!prior || distanceSquared < prior.distanceSquared) closestBySeam.set(segment.seamId,candidate)
    }
  }
  return (keepAllSamples?samples:[...closestBySeam.values()]).sort((a,b)=>
    a.distanceSquared-b.distanceSquared||a.seamId.localeCompare(b.seamId))
}

/** 2D projection fraction to true world-segment fraction under perspective. */
export function nativeSeamPerspectiveFraction20261025(screenFraction,firstCameraDepth,secondCameraDepth) {
  if (![screenFraction,firstCameraDepth,secondCameraDepth].every(Number.isFinite) ||
      screenFraction<0 || screenFraction>1 || firstCameraDepth<=0 || secondCameraDepth<=0) return null
  const denominator=(1-screenFraction)*firstCameraDepth+screenFraction*secondCameraDepth
  return denominator>0?(screenFraction*secondCameraDepth)/denominator:null
}

/** Return the closest 10-pixel seam hit; cycleAfterId supports overlapping guides. */
export function pickNativeSeam3DGuideScreen20261025(segments,pointer,tolerancePx=10,{cycleAfterId=null}={}) {
  const ranked=rankNativeSeam3DGuideScreen20261025(segments,pointer,tolerancePx)
  if (!ranked.length) return null
  const current=ranked.findIndex(candidate=>candidate.seamId===cycleAfterId)
  return ranked[current>=0?(current+1)%ranked.length:0]
}
