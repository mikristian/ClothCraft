/** Experimental planar dart construction. All coordinates and lengths are in cm;
 * angles are radians, positive counterclockwise. No sewing/ease semantics. */
const finite = n => typeof n === 'number' && Number.isFinite(n)
const EPS = 1e-9
function point(p, label) {
  if (!p || !finite(p.x) || !finite(p.y)) throw new TypeError(`${label} must have finite cm coordinates`)
  return {x:p.x,y:p.y}
}
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y})
const length=p=>Math.hypot(p.x,p.y)
const cross=(a,b)=>a.x*b.y-a.y*b.x
const dot=(a,b)=>a.x*b.x+a.y*b.y
const distance=(a,b)=>length(sub(a,b))

/** Construct a physical intake wedge with a shared tip and two distinct legs.
 * Boundary direction and signed interior side must be supplied by the caller. */
export function measureDartWedge20261023({leftLeg,rightLeg,apex,interiorSide=1}) {
  const l=point(leftLeg,'leftLeg'),r=point(rightLeg,'rightLeg'),a=point(apex,'apex')
  if (interiorSide!==1 && interiorSide!==-1) throw new RangeError('interiorSide must be +1 or -1')
  const base=sub(r,l),baseLength=length(base)
  if (!(baseLength>EPS)) throw new RangeError('dart legs cannot coincide')
  const signedTwiceArea=cross(base,sub(a,l))
  if (!(signedTwiceArea*interiorSide>EPS*baseLength)) throw new RangeError('apex must lie strictly on designated interior side, clear of baseline')
  const leftLength=distance(l,a),rightLength=distance(r,a)
  if (!(leftLength>EPS && rightLength>EPS)) throw new RangeError('dart leg has zero length')
  const cosAngle=dot(sub(l,a),sub(r,a))/(leftLength*rightLength)
  const angle=Math.acos(Math.max(-1,Math.min(1,cosAngle)))
  if (!(angle>EPS && angle<Math.PI-EPS)) throw new RangeError('invalid dart opening angle')
  return {intakeCm:baseLength,depthCm:Math.abs(signedTwiceArea)/baseLength,
    wedgeAreaCm2:Math.abs(signedTwiceArea)/2,leftLengthCm:leftLength,rightLengthCm:rightLength,
    dartAngleRad:angle,legLengthDifferenceCm:leftLength-rightLength}
}

/** Rigid rotation of a set of material points about the dart apex.
 * This preserves all distances/areas within the rotated piece only. */
export function rotateDartMaterial20261023({points,apex,angleRad}) {
  const origin=point(apex,'apex')
  if (!Array.isArray(points) || !points.length) throw new TypeError('points must be a nonempty array')
  if (!finite(angleRad)) throw new TypeError('angleRad must be finite')
  const c=Math.cos(angleRad),s=Math.sin(angleRad)
  return points.map((entry,i)=>{
    const p=point(entry,`points[${i}]`),x=p.x-origin.x,y=p.y-origin.y
    const out={x:origin.x+c*x-s*y,y:origin.y+s*x+c*y}
    if (!finite(out.x)||!finite(out.y)) throw new RangeError('rotated coordinates overflow')
    return out
  })
}

/** Rotate one leg onto the other; optionally rotate arbitrary points belonging
 * to that same moving material sector. Reports trueing overhang, without
 * trimming or pretending unequal sewn leg lengths have become equal. */
export function alignDartLegs20261023({stationaryLeg,movingLeg,apex,movingPoints=[]}) {
  const a=point(apex,'apex'),fixed=point(stationaryLeg,'stationaryLeg'),moving=point(movingLeg,'movingLeg')
  const f=sub(fixed,a),m=sub(moving,a),fl=length(f),ml=length(m)
  if (!(fl>EPS && ml>EPS)) throw new RangeError('dart leg cannot coincide with apex')
  if (!Array.isArray(movingPoints)) throw new TypeError('movingPoints must be an array')
  const angleRad=Math.atan2(cross(m,f),dot(m,f))
  if (!(Math.abs(angleRad)>EPS && Math.abs(Math.abs(angleRad)-Math.PI)>EPS)) throw new RangeError('opening angle must be strictly between zero and pi')
  const [rotatedLeg,...rotatedPoints]=rotateDartMaterial20261023({points:[moving,...movingPoints],apex:a,angleRad})
  const unit={x:f.x/fl,y:f.y/fl}
  const overhangCm=dot(sub(rotatedLeg,fixed),unit)
  const transverseErrorCm=Math.abs(cross(unit,sub(rotatedLeg,fixed)))
  return {angleRad,rotatedLeg,rotatedPoints,overhangCm,transverseErrorCm,
    trueingRequired:Math.abs(overhangCm)>EPS,legLengthDifferenceCm:ml-fl}
}
