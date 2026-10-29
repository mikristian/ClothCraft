import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {nativeRustEdgeLength20261023,nativeRustArcLengthStation20261023} from './nativeRustArcLengthCompat20261023.js'

// Read-only material-space QA. This does not allocate ease or approve manufacturing.
const fail=(reason,rows=[],issues=[reason])=>({ok:false,reason,rows,issues,manufacturingApproved:false})
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const whole=ref=>ref&&typeof ref.panel==='string'&&ref.panel.length>0&&typeof ref.edge==='string'&&ref.edge.length>0&&
  Array.isArray(ref.range)&&ref.range.length===2&&ref.range.every(finite)&&
  ref.range[0]>=0&&ref.range[1]<=1&&ref.range[1]-ref.range[0]>=1e-9&&
  (!Object.hasOwn(ref,'side')||['top','right','bottom','left'].includes(ref.side))&&
  Object.keys(ref).every(key=>['panel','edge','range','side'].includes(key))
// Rust SeamSpec includes physical stiffness and monotone notch correspondences.
// Authoring fixtures historically omit both; verify them if native supplies them.
const nativeMetadata=seam=>
  (seam.stiffness===undefined||(finite(seam.stiffness)&&seam.stiffness>0))&&
  (seam.notches===undefined||(Array.isArray(seam.notches)&&seam.notches.length<=4096&&
    seam.notches.every((pair,index)=>Array.isArray(pair)&&pair.length===2&&
      pair.every(value=>finite(value)&&value>0&&value<1)&&
      (index===0||(pair[0]>seam.notches[index-1][0]&&pair[1]>seam.notches[index-1][1])))))

// Rust seam BoundaryRef ranges are normalized *material arclength*, not
// Bezier parameter t (authoring.rs remap_split_seams). Verify an interior
// station can be resolved on each authored curve without silently assuming
// a chord-based or parametric interval length.
const intervalMm=(polygon,edge,ref)=>{
  const measured=nativeRustEdgeLength20261023(polygon,edge)
  if(!measured.ok||!(measured.totalLengthM>0))throw Error(measured.reason||'Collapsed sewn boundary')
  const total=measured.totalLengthM
  const middle=total*(ref.range[0]+ref.range[1])/2
  const station=nativeRustArcLengthStation20261023(polygon,edge,{distanceM:middle})
  if(!station.ok||!Array.isArray(station.position)||!station.position.every(finite)||
    !finite(station.totalLengthM)||Math.abs(station.totalLengthM-total)>1e-8)
    throw Error(station.reason||'Could not validate physical sewn interval station')
  const interval=total*(ref.range[1]-ref.range[0])*1000
  if(!finite(interval)||interval<=0)throw Error('Collapsed sewn interval')
  return interval
}

/** Validate every saved sewn boundary across the complete native rule size run.
 * Positive signedEaseMm means side B has more material length than A.
 * A mismatch exceeding tolerance remains a blocker even when ease is enabled:
 * no distribution/ease allowance is defined by the native relationship.
 */
export function inspectAccuMarkNativeGradedSewnSeamQA20261023(snapshot,ruleSet,{toleranceMm=2,allowNamedSizes=false}={}){
  if(!finite(toleranceMm)||toleranceMm<0||toleranceMm>100)
    return fail('Invalid physical seam tolerance in millimetres')
  const six=['XS','S','M','L','XL','XXL']
  const sizes=allowNamedSizes?ruleSet?.sizes:six
  if(!Array.isArray(ruleSet?.sizes)||!Array.isArray(sizes)||
    (allowNamedSizes?(sizes.length<2||sizes.length>24||
      new Set(sizes).size!==sizes.length||!sizes.includes(ruleSet.baseSize)||
      sizes.some(size=>typeof size!=='string'||!/^[A-Za-z0-9-]{1,24}$/.test(size))):
      (ruleSet.sizes.length!==6||six.some(size=>!ruleSet.sizes.includes(size)))))
    return fail(allowNamedSizes?'Complete safe 2–24 named sizes and a base size are required':
      'Six named sizes XS–XXL are required')
  const seams=snapshot?.template?.seams
  if(!Array.isArray(seams)||!seams.length||seams.length>1024)
    return fail('No bounded native sewn seam relationships are available')
  const knownPanels=snapshot?.template?.panels
  if(!Array.isArray(knownPanels)||knownPanels.some(p=>p?.polygon?.holes?.length))
    return fail('Unsupported native panel holes or missing panels')
  const rows=[],issues=[]
  const ids=new Set()
  for(const seam of seams){
    if(typeof seam?.id!=='string'||!seam.id||ids.has(seam.id)||
      !whole(seam.a)||!whole(seam.b)||
      typeof seam.reverse_b!=='boolean'||typeof seam.allow_ease!=='boolean'||!nativeMetadata(seam)||
      Object.keys(seam).some(key=>!['id','a','b','reverse_b','allow_ease','stiffness','notches'].includes(key)))
      return fail('Unknown, duplicate or partial native seam representation',rows)
    ids.add(seam.id)
  }
  const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet.baseSize})
  if(!compiled.ok)return fail(`Native graded size run rejected: ${compiled.reason}`,rows,compiled.issues||[compiled.reason])
  for(const seam of seams){
    const source=compiled.byPanel[seam.a.panel],target=compiled.byPanel[seam.b.panel]
    if(!source||!target)return fail(`Missing sewn source or target native panel: ${seam.id}`,rows)
    for(const size of sizes){
      const a=source.sizeRun[size]?.polygon,b=target.sizeRun[size]?.polygon
      if(!a||!b)return fail(`Missing graded sewn geometry for ${seam.id}/${size}`,rows)
      let sourceLengthMm,targetLengthMm
      try{
        sourceLengthMm=intervalMm(a,seam.a.edge,seam.a)
        targetLengthMm=intervalMm(b,seam.b.edge,seam.b)
      }catch(e){return fail(`Unmeasurable sewn interval ${seam.id}/${size}: ${e.message}`,rows)}
      const signedEaseMm=targetLengthMm-sourceLengthMm
      const mismatchMm=Math.abs(signedEaseMm)
      if(![sourceLengthMm,targetLengthMm,signedEaseMm].every(finite))
        return fail(`Nonfinite sewn length ${seam.id}/${size}`,rows)
      const pass=mismatchMm<=toleranceMm
      rows.push({seamId:seam.id,size,sourcePanel:seam.a.panel,targetPanel:seam.b.panel,
        sourceEdge:seam.a.edge,targetEdge:seam.b.edge,
        sourceRange:[...seam.a.range],targetRange:[...seam.b.range],reverseB:seam.reverse_b,
        easeEnabled:seam.allow_ease,sourceLengthMm,targetLengthMm,signedEaseMm,mismatchMm,
        pass,accuracy:'NATIVE_CURVE_FLATTEN_METRES'})
      if(!pass)issues.push({seamId:seam.id,size,code:seam.allow_ease?
        'UNALLOCATED_SEAM_EASE_LENGTH_MISMATCH':'SEWN_SEAM_LENGTH_MISMATCH',mismatchMm})
    }
  }
  return {ok:issues.length===0,rows,issues,blocks:issues.length,toleranceMm,
    sizes,checkedSeams:seams.length,manufacturingApproved:false}
}
