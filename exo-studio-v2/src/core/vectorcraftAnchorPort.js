// Adapted from VectorCraft's anchor/handle behavior:
// https://github.com/storytold/vectorcraft/blob/73f40e3fd3fd6957508f18af1bf3bff93a9eb3e7/crates/geom/src/path.rs
// Original authors: VectorCraft contributors. Source licensed MIT OR Apache-2.0.
// License and notices remain available at research/oss/vectorcraft/{LICENSE-MIT,LICENSE-APACHE,NOTICE}.
//
// This is a small JavaScript port of the upstream Anchor::with_handles and
// Anchor::set_handle algorithms, rather than embedding the Rust vector editor.
// VectorCraft uses absolute document coordinates; EXO uses physical metres.
const finitePoint = p => Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)

export function vectorcraftAnchorKind(p,hIn,hOut) {
  if(![p,hIn,hOut].every(finitePoint))return 'corner'
  const inX=hIn[0]-p[0],inY=hIn[1]-p[1]
  const outX=hOut[0]-p[0],outY=hOut[1]-p[1]
  const inLength=Math.hypot(inX,inY),outLength=Math.hypot(outX,outY)
  if(inLength<=1e-9||outLength<=1e-9)return 'corner'
  // EXO stores metres, including millimetre-scale handles. A minimum length
  // of 1 in the cross-product tolerance incorrectly treats visibly angled
  // short handles as smooth and rotates their opposite handle during edits.
  // Normalize both tangents so the tolerance is angular, scale-independent,
  // and does not overflow when multiplying large but finite coordinates.
  if(!Number.isFinite(inLength)||!Number.isFinite(outLength))return 'corner'
  const ix=inX/inLength,iy=inY/inLength,ox=outX/outLength,oy=outY/outLength
  const collinear=Math.abs(ix*oy-iy*ox)<=1e-6
  return collinear && ix*ox+iy*oy<0?'smooth':'corner'
}

/** Mirror VectorCraft's set_handle behavior with immutable data.
 * Only smooth anchors rotate their opposing handle. A corner's controls
 * remain independent; Option/Alt forces independent movement.
 */
export function setVectorcraftHandle(anchor,out,pos,{independent=false}={}) {
  if(!finitePoint(anchor?.p)||!finitePoint(anchor.hIn)||!finitePoint(anchor.hOut)||!finitePoint(pos))return null
  const result={
    p:anchor.p.slice(),hIn:anchor.hIn.slice(),hOut:anchor.hOut.slice(),
    kind:independent?'corner':anchor.kind==='smooth'?'smooth':anchor.kind==='corner'?'corner':vectorcraftAnchorKind(anchor.p,anchor.hIn,anchor.hOut),
  }
  const moved=out?'hOut':'hIn',other=out?'hIn':'hOut'
  result[moved]=pos.slice()
  if(result.kind==='smooth'){
    const length=Math.hypot(result[other][0]-result.p[0],result[other][1]-result.p[1])
    const dx=result.p[0]-pos[0],dy=result.p[1]-pos[1]
    const magnitude=Math.hypot(dx,dy)
    if(magnitude>1e-9)result[other]=[result.p[0]+dx*length/magnitude,result.p[1]+dy*length/magnitude]
  }
  return result
}
