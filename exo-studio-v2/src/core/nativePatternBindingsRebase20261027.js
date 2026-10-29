import {fingerprintNativePatternBindingsSource20261023 as fingerprint, serializeNativePatternConstraintSidecar20261023 as serialize} from './nativePatternConstraintBindings20261023.js'
import {simulateNativeAnchorRemap20261023} from './nativeParametricPoint20261023.js'

const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null)
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const vec=x=>Array.isArray(x)&&x.length===2&&x.every(finite)
const fail=reason=>({ok:false,reason,manufacturingApproved:false})
function strict(value,depth=0){
  if(depth>64)throw Error('Rebase data exceeds nesting limit')
  if(value===null||typeof value==='string'||typeof value==='boolean'||finite(value))return
  if(Array.isArray(value)){if(value.length>16384)throw Error('Oversized rebase array');for(const v of value)strict(v,depth+1);return}
  if(!plain(value))throw Error('Unsupported prototype or nonfinite rebase data')
  const keys=Object.keys(value)
  if(keys.length>16384||keys.some(k=>k==='__proto__'||k==='constructor'||k==='prototype'))throw Error('Unsafe rebase object key')
  for(const k of keys)strict(value[k],depth+1)
}
const equal=(a,b)=>{
  if(typeof a!==typeof b)return false
  // The browser and Rust's glam double-precision quaternion operations may
  // differ by a few ulps. Keep all integer IDs/revisions exact; require every
  // material coordinate and placement float to agree within 10 picometres.
  if(typeof a==='number'&&finite(a)&&finite(b)){
    if(Number.isSafeInteger(a)||Number.isSafeInteger(b))return Object.is(a,b)
    return Math.abs(a-b)<=1e-11*Math.max(1,Math.abs(a),Math.abs(b))
  }
  if(a===null||b===null||typeof a!=='object')return Object.is(a,b)
  if(Array.isArray(a)!==Array.isArray(b))return false
  const ak=Object.keys(a).sort(),bk=Object.keys(b).sort()
  return ak.length===bk.length&&ak.every((key,i)=>key===bk[i]&&equal(a[key],b[key]))
}
const translate=(point,lo)=>[point[0]-lo[0],point[1]-lo[1]]
const nearly=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-9
function nativePlacementDelta(placement,lo){
  const t=placement.translation,r=placement.rotation_degrees
  if(!Array.isArray(t)||t.length!==3||!t.every(finite)||
     !Array.isArray(r)||r.length!==3||!r.every(finite))throw Error('Invalid native panel placement')
  // Rust: DQuat::from_euler(EulerRot::XYZ, rx,ry,rz) * (lo.x,-lo.y,0).
  // Column-vector Rx*Ry*Rz is evaluated from right to left.
  const [rx,ry,rz]=r.map(x=>x*Math.PI/180)
  const [cz,sz,cy,sy,cx,sx]=[
    Math.cos(rz),Math.sin(rz),Math.cos(ry),Math.sin(ry),Math.cos(rx),Math.sin(rx),
  ]
  const xz=cz*lo[0]+sz*lo[1],yz=sz*lo[0]-cz*lo[1]
  const xy=cy*xz,zy=-sy*xz
  return [t[0]+xy,t[1]+cx*yz-sx*zy,t[2]+sx*yz+cx*zy]
}

/** Verify one committed edit-batch before attaching existing measurement links to its new native revision.
 * `before` must be the exact snapshot used to plan `proposal`; `after` is the Rust reply.
 * This deliberately refuses unmodeled project mutations and is not a persistent constraint graph.
 */
export function rebaseNativePatternBindingsAfterAnchorGroup20261027(before,after,sidecar,proposal){
  try{
    strict(before);strict(after);strict(sidecar);strict(proposal)
    serialize(sidecar)
    if(!plain(before)||!plain(after)||!plain(proposal)||proposal.ok!==true||proposal.op!=='edit-batch')throw Error('Invalid committed batch evidence')
    if(!Number.isSafeInteger(before.revision)||before.revision<0||!Number.isSafeInteger(after.revision)||after.revision!==before.revision+1)throw Error('Unexpected committed native revision')
    if(sidecar.sourceRevision!==before.revision||proposal.sourceRevision!==before.revision)throw Error('Stale planning revision')
    const originalFingerprint=fingerprint(before)
    if(sidecar.sourceFingerprint!==originalFingerprint||proposal.sourceFingerprint!==originalFingerprint)throw Error('Stale planning geometry fingerprint')
    if(!Array.isArray(proposal.commands)||proposal.commands.length<1||proposal.commands.length>32)throw Error('Invalid AnchorGroup command count')
    const sourcePanels=before.template.panels
    const expected=structuredClone(before)
    expected.revision=after.revision
    const seen=new Set()
    let count=0
    for(const command of proposal.commands){
      if(!plain(command)||command.kind!=='AnchorGroup'||typeof command.panel!=='string'||seen.has(command.panel)||!Array.isArray(command.edits)||command.edits.length<1||command.edits.length>32)throw Error('Invalid or duplicate AnchorGroup panel')
      seen.add(command.panel)
      const original=sourcePanels.filter(p=>p.id===command.panel)
      if(original.length!==1)throw Error('Unknown or duplicate AnchorGroup panel')
      const panel=expected.template.panels.find(p=>p.id===command.panel)
      const indices=new Set()
      for(const edit of command.edits){
        if(!Array.isArray(edit)||edit.length!==2||!Number.isSafeInteger(edit[0])||edit[0]<0||indices.has(edit[0])||!vec(edit[1]))throw Error('Invalid or duplicate AnchorGroup anchor')
        indices.add(edit[0]);count++
        const old=panel.polygon.points[edit[0]]
        const delta=[edit[1][0]-old[0],edit[1][1]-old[1]]
        panel.polygon=simulateNativeAnchorRemap20261023(panel.polygon,edit[0],edit[1])
        if(Array.isArray(panel.pin_points))
          panel.pin_points=panel.pin_points.map(pin=>nearly(pin,old)?
            [pin[0]+delta[0],pin[1]+delta[1]]:pin)
      }
      const polygon=panel.polygon
      const coords=[...polygon.points,...Object.values(polygon.curves??{}).flat(),...Object.values(polygon.free_curve_points??{}).flat().map(p=>p.position)]
      if(!coords.length||!coords.every(vec))throw Error('Invalid expected normalized coordinates')
      const lo=[Math.min(...coords.map(p=>p[0])),Math.min(...coords.map(p=>p[1]))]
      const hi=[Math.max(...coords.map(p=>p[0])),Math.max(...coords.map(p=>p[1]))]
      polygon.points=polygon.points.map(p=>translate(p,lo))
      if(polygon.curves)for(const key of Object.keys(polygon.curves))polygon.curves[key]=polygon.curves[key].map(p=>translate(p,lo))
      if(polygon.free_curve_points)for(const marks of Object.values(polygon.free_curve_points))for(const mark of marks)mark.position=translate(mark.position,lo)
      if(Array.isArray(polygon.holes))for(const hole of polygon.holes)hole.points=hole.points.map(p=>translate(p,lo))
      if(Array.isArray(polygon.lines))for(const line of polygon.lines)line.points=line.points.map(p=>translate(p,lo))
      if(Array.isArray(polygon.annotations))for(const mark of polygon.annotations)mark.position=translate(mark.position,lo)
      if(Array.isArray(panel.pin_points))panel.pin_points=panel.pin_points.map(p=>translate(p,lo))
      const rotation=panel.layout_rotation_degrees??0
      if(!finite(rotation))throw Error('Invalid native panel rotation')
      const radians=rotation*Math.PI/180
      const offset=[lo[0]*Math.cos(radians)-lo[1]*Math.sin(radians),lo[0]*Math.sin(radians)+lo[1]*Math.cos(radians)]
      const origin=panel.layout_2d??[0,0]
      if(!vec(origin))throw Error('Invalid native panel layout')
      panel.layout_2d=[origin[0]+offset[0],origin[1]+offset[1]]
      if(panel.pattern){panel.pattern.width=hi[0]-lo[0];panel.pattern.height=hi[1]-lo[1]}
      if(panel.placement)panel.placement.translation=nativePlacementDelta(panel.placement,lo)
    }
    if(proposal.panelCount!==seen.size||proposal.pointCount!==count)throw Error('Atomic batch count mismatch')
    // Full snapshot comparison catches unexpected additions, changes to untouched panels,
    // metadata/project changes, and point/curve/free-knot edits outside this exact batch.
    if(!equal(expected,after))throw Error('Committed native project differs from the expected normalized batch')
    const rebased=structuredClone(sidecar)
    rebased.sourceRevision=after.revision
    rebased.sourceFingerprint=fingerprint(after)
    serialize(rebased)
    return Object.freeze({ok:true,sidecar:deepFreeze(rebased),sourceRevision:after.revision,sourceFingerprint:rebased.sourceFingerprint,manufacturingApproved:false,caveat:'Verified one committed native edit batch. Links require an explicit verified rebase after each later edit; no continuous dependency graph.'})
  }catch(error){return fail(error?.message||String(error))}
}
function deepFreeze(x){if(x&&typeof x==='object'){for(const value of Object.values(x))deepFreeze(value);Object.freeze(x)}return x}
