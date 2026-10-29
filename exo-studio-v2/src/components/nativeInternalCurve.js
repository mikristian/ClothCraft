// Rust InternalLine uses one signed, symmetric tangent per anchor:
// segment i = cubic(p[i], p[i] + tangent[i],
//                   p[i+1] - tangent[i+1], p[i+1]).
// These routines mirror that convention without changing serialized data.
export const cubicPoint = (a, b, c, d, t) => {
  const u=1-t
  return [0,1].map(i=>u*u*u*a[i]+3*u*u*t*b[i]+3*u*t*t*c[i]+t*t*t*d[i])
}

export function sampleInternalCurve(a,b,ta=[0,0],tb=[0,0],steps=32) {
  if(![a,b,ta,tb].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return []
  const length=Math.hypot(b[0]-a[0],b[1]-a[1])
  if(length<1e-10)return [a,b]
  const c=a.map((n,i)=>n+ta[i]),d=b.map((n,i)=>n-tb[i])
  const count=Math.max(4,Math.min(128,Math.ceil(steps)))
  return Array.from({length:count+1},(_,i)=>cubicPoint(a,c,d,b,i/count))
}

export function initialInternalTangents(points) {
  if(!Array.isArray(points)||points.length<2)return []
  return points.map((p,i)=>{
    const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)]
    if(![p,before,after].every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)))return [0,0]
    const span=i>0&&i<points.length-1?6:3
    return [(after[0]-before[0])/span,(after[1]-before[1])/span]
  })
}
