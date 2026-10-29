// EXO adaptation of VectorCraft/Illustrator's smooth-anchor conversion:
// https://github.com/storytold/vectorcraft/tree/main/crates/tools (MIT OR Apache-2.0).
// An actual smooth corner needs opposed, COLLINEAR handles. Simply enabling
// cubic edge metadata leaves a geometric corner visibly sharp.
import {dragPatternAnchorHandles} from './vectorPatternBezier.js'

export function smoothNativePatternAnchor(polygon,index) {
  const points=polygon?.points,n=points?.length||0
  if(!Number.isInteger(index)||n<3||index<0||index>=n||
    !Array.isArray(polygon.edges)||polygon.edges.length!==n)return null
  const p=points[index],before=points[(index+n-1)%n],after=points[(index+1)%n]
  if(![p,before,after].every(q=>Array.isArray(q)&&q.length===2&&q.every(Number.isFinite)))return null
  const incoming=[p[0]-before[0],p[1]-before[1]]
  const outgoing=[after[0]-p[0],after[1]-p[1]]
  const a=Math.hypot(...incoming),b=Math.hypot(...outgoing)
  if(a<1e-8||b<1e-8)return null
  let direction=[incoming[0]/a+outgoing[0]/b,incoming[1]/a+outgoing[1]/b]
  let magnitude=Math.hypot(...direction)
  if(magnitude<1e-8){direction=outgoing;magnitude=b}
  // Fit in the two adjacent segments; no edge may acquire a handle longer
  // than one quarter of its local chord before additional user edits.
  const length=Math.min(a,b)*.24
  return dragPatternAnchorHandles(polygon,index,direction.map(value=>value/magnitude*length))
}
