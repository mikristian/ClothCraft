// Research-only exact static Euclidean separation of two nondegenerate
// triangles. Used for DISJOINT material faces after the existing intersection
// test. This is not a swept/continuous collision or cloth thickness certificate.
const sub=(a,b)=>a.map((v,i)=>v-b[i])
const add=(a,b)=>a.map((v,i)=>v+b[i])
const scale=(v,s)=>v.map(x=>x*s)
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const norm2=v=>dot(v,v)
const clamp=x=>Math.max(0,Math.min(1,x))

function pointSegmentSquared(p,a,b){
  const ab=sub(b,a),t=clamp(dot(sub(p,a),ab)/norm2(ab))
  return norm2(sub(p,add(a,scale(ab,t))))
}

function pointTriangleSquared(p,t){
  const [a,b,c]=t,u=sub(b,a),v=sub(c,a),n=cross(u,v)
  const projection=dot(sub(p,a),n)/norm2(n)
  const projected=sub(p,scale(n,projection)),w=sub(projected,a)
  const uu=dot(u,u),uv=dot(u,v),vv=dot(v,v)
  const wu=dot(w,u),wv=dot(w,v),den=uu*vv-uv*uv
  const s=(wu*vv-wv*uv)/den, r=(wv*uu-wu*uv)/den
  if(s>=-1e-12&&r>=-1e-12&&s+r<=1+1e-12)
    return norm2(sub(p,projected))
  return Math.min(pointSegmentSquared(p,a,b),
    pointSegmentSquared(p,b,c),pointSegmentSquared(p,c,a))
}

// Closest points of two finite segments, including parallel segments.
function segmentSegmentSquared(p0,p1,q0,q1){
  const u=sub(p1,p0),v=sub(q1,q0),w=sub(p0,q0)
  const a=norm2(u),b=dot(u,v),c=norm2(v),d=dot(u,w),e=dot(v,w)
  const determinant=a*c-b*b
  let sN,sD=determinant,tN,tD=determinant
  // The determinant has units of length^4. An absolute 1e-20 threshold
  // misclassifies short, nonparallel cloth edges as parallel, potentially
  // overestimating their gap and incorrectly clearing a thickness veto.
  if(determinant<=Number.EPSILON*a*c){
    sN=0;sD=1;tN=e;tD=c
  }else{
    sN=b*e-c*d;tN=a*e-b*d
    if(sN<0){sN=0;tN=e;tD=c}
    else if(sN>sD){sN=sD;tN=e+b;tD=c}
  }
  if(tN<0){
    tN=0
    if(-d<0)sN=0
    else if(-d>a)sN=sD
    else{sN=-d;sD=a}
  }else if(tN>tD){
    tN=tD
    if(-d+b<0)sN=0
    else if(-d+b>a)sN=sD
    else{sN=-d+b;sD=a}
  }
  // The numerators also scale as length^4: never zero them with a fixed
  // metric threshold. Nondegenerate input faces guarantee positive lengths.
  const s=sN/sD
  const t=tN/tD
  return norm2(sub(add(w,scale(u,s)),scale(v,t)))
}

// Vertex-to-face and edge-to-edge distances alone miss a transverse edge
// piercing the INTERIOR of the other triangle: none of the six vertices or
// nine edge pairs need be close to the intersection point. Treat that case
// as zero separation before a thickness screen can mistakenly clear it.
// Coplanar containment/crossings are already covered by the point/edge tests.
function segmentPiercesTriangle(p,q,triangle){
  const [a,b,c]=triangle,u=sub(b,a),v=sub(c,a),normal=cross(u,v)
  const d0=dot(sub(p,a),normal),d1=dot(sub(q,a),normal)
  if((d0>0&&d1>0)||(d0<0&&d1<0)||d0===d1)return false
  const fraction=d0/(d0-d1)
  if(fraction<0||fraction>1)return false
  const hit=add(p,scale(sub(q,p),fraction)),w=sub(hit,a)
  const uu=dot(u,u),uv=dot(u,v),vv=dot(v,v)
  const wu=dot(w,u),wv=dot(w,v),den=uu*vv-uv*uv
  const s=(wu*vv-wv*uv)/den,r=(wv*uu-wu*uv)/den
  return s>=-1e-12&&r>=-1e-12&&s+r<=1+1e-12
}

export function measureNativeTriangleDistanceM(a,b){
  for(const triangle of [a,b]){
    if(!Array.isArray(triangle)||triangle.length!==3||
       triangle.some(p=>!Array.isArray(p)||p.length!==3||
         !p.every(Number.isFinite)))
      throw new TypeError('Triangle distance requires finite triangle coordinates')
    if(norm2(cross(sub(triangle[1],triangle[0]),
      sub(triangle[2],triangle[0])))<1e-28)
      throw new Error('Triangle distance requires nondegenerate faces')
  }
  let distance2=Infinity
  for(const p of a)distance2=Math.min(distance2,pointTriangleSquared(p,b))
  for(const p of b)distance2=Math.min(distance2,pointTriangleSquared(p,a))
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)
    distance2=Math.min(distance2,segmentSegmentSquared(
      a[i],a[(i+1)%3],b[j],b[(j+1)%3]))
  if(distance2>0)for(const [first,second] of [[a,b],[b,a]])
    for(let i=0;i<3;i++)
      if(segmentPiercesTriangle(first[i],first[(i+1)%3],second))return 0
  return Math.sqrt(Math.max(0,distance2))
}
