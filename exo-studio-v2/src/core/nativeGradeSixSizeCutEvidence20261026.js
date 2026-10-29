import {inspectNativeGradeCutPreflight20261025} from './nativeGradeCutPreflight20261025.js'

const SIZES=['XS','S','M','L','XL','XXL']
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=10_000
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?
  Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x
const same=(a,b)=>equal(canonical(a),canonical(b))
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const metric=poly=>Array.isArray(poly)&&poly.length>=3&&poly.length<=256&&
  poly.every(p=>Array.isArray(p)&&p.length===2&&p.every(finite))&&
  poly.every((p,i)=>distance(p,poly[(i+1)%poly.length])>.001)&&
  Math.abs(poly.reduce((s,p,i)=>s+p[0]*poly[(i+1)%poly.length][1]-p[1]*poly[(i+1)%poly.length][0],0))>.01
const contourSame=(a,b,tol=.02)=>a.length===b.length&&a.some&&
  Array.from({length:a.length},(_,shift)=>shift).some(shift=>
    [1,-1].some(sign=>a.every((p,i)=>distance(p,b[(shift+sign*i+b.length*2)%b.length])<=tol)))
const fail=(issues,rows=[])=>({ok:false,localGeometryVerified:false,rows,issues,
  authoritativeRust:false,independentlyVerified:false,manufacturingApproved:false,
  factoryApproved:false,receivingCadApproved:false,cuttingAuthorized:false})

/** Only geometries independently derivable from current native stitch polygons:
 * zero allowances on arbitrary straight polygons, or uniform-offset rectangles.
 * Curved or variable-offset panels must supply a separately authenticated Rust
 * CUT kernel proof and external receiving-CAD validation. */
function expectedCut(polygon){
  const {points,edges,seam_allowances:allowances,notches}=polygon
  if(!Array.isArray(points)||!Array.isArray(edges)||points.length!==edges.length||
    !metric(points.map(p=>Array.isArray(p)?p.map(x=>x*1000):[]))||
    edges.some(e=>typeof e!=='string'||!Object.hasOwn(allowances||{},e)||
      !finite(allowances[e])||allowances[e]<0||!Array.isArray(notches?.[e])||
      notches[e].length))throw Error('UNSUPPORTED_STITCH_ALLOWANCE_OR_NOTCH')
  if(polygon.curves&&Object.keys(polygon.curves).length||
    polygon.free_curve_points&&Object.keys(polygon.free_curve_points).length||
    polygon.holes?.length||polygon.internalCuts?.length)throw Error('UNSUPPORTED_CURVED_GEOMETRY')
  const stitch=points.map(p=>p.map(x=>x*1000))
  const offsets=edges.map(e=>allowances[e]*1000)
  if(offsets.every(x=>x===0))return {stitch,cut:stitch}
  if(points.length!==4||offsets.some(x=>Math.abs(x-offsets[0])>1e-7))
    throw Error('OFFSET_CUT_REQUIRES_RUST_PROOF')
  const xs=stitch.map(p=>p[0]),ys=stitch.map(p=>p[1])
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys)
  if(x1-x0<.001||y1-y0<.001||new Set(stitch.map(p=>p.join(','))).size!==4||
    [x0,x1].some(x=>[y0,y1].some(y=>!stitch.some(p=>p[0]===x&&p[1]===y))))
    throw Error('OFFSET_CUT_REQUIRES_RUST_PROOF')
  const a=offsets[0]
  return {stitch,cut:[[x0-a,y0-a],[x1+a,y0-a],[x1+a,y1+a],[x0-a,y1+a]]}
}

/** Compare a six-size measurement evidence bundle with complete live native
 * source and rules, and independently computed CUT/STITCH geometry in mm.
 * Caller-provided evidence is never treated as an authenticated Rust output.
 * Rows must contain {size,panelId,stitchMm,cutMm,notchesMm:[]}.
 */
export function inspectNativeGradeSixSizeCutEvidence20261026(snapshot,ruleSet,compiled,evidence){
  const issues=[],rows=[]
  const add=(code,size=null,panelId=null)=>issues.push({code,size,panelId})
  try{
    if(!Number.isSafeInteger(snapshot?.revision)||!Array.isArray(snapshot?.template?.panels)||
      !snapshot.template.panels.length||!ruleSet||!equal(ruleSet.sizes,SIZES)||
      !compiled?.ok||!evidence||evidence.sourceRevision!==snapshot.revision||
      !same(evidence.sourceTemplate,snapshot.template)||!same(evidence.sourceRuleSet,ruleSet)){
      add('STALE_OR_INCOMPLETE_SOURCE');return fail(issues)
    }
    const preliminary=inspectNativeGradeCutPreflight20261025(snapshot,compiled)
    if(!preliminary.ok||!preliminary.gradedAnnotations?.ok)add('NATIVE_GRADE_PREFLIGHT_FAILED')
    if(!Array.isArray(evidence.rows)||evidence.rows.length!==snapshot.template.panels.length*6){
      add('SIX_SIZE_COVERAGE');return fail(issues)
    }
    const expected=new Set()
    const ids=new Set()
    for(const panel of snapshot.template.panels){
      if(typeof panel.id!=='string'||!panel.id||ids.has(panel.id)){add('PANEL_IDENTITY');continue}
      ids.add(panel.id)
      for(const size of SIZES)expected.add(size+'\u0000'+panel.id)
    }
    const observed=new Set()
    for(const row of evidence.rows){
      const size=row?.size,panelId=row?.panelId,key=size+'\u0000'+panelId
      if(!expected.has(key)||observed.has(key)){add('DUPLICATE_OR_UNKNOWN_SIZE_PANEL',size,panelId);continue}
      observed.add(key)
      try{
        const polygon=compiled.byPanel?.[panelId]?.sizeRun?.[size]?.polygon
        if(!polygon)throw Error('NO_COMPILED_SIZE')
        const source=snapshot.template.panels.find(p=>p.id===panelId).polygon
        if(!same(polygon.edges,source.edges)||!same(polygon.seam_allowances,source.seam_allowances)||
          !same(polygon.notches,source.notches))throw Error('ANNOTATION_SOURCE_DRIFT')
        const geometry=expectedCut(polygon)
        if(!metric(row.stitchMm)||!metric(row.cutMm)||!contourSame(row.stitchMm,geometry.stitch)||
          !contourSame(row.cutMm,geometry.cut))throw Error('CUT_STITCH_GEOMETRY_MISMATCH')
        if(!Array.isArray(row.notchesMm)||row.notchesMm.length!==0)throw Error('UNVERIFIED_NOTCH_TRANSFER')
        rows.push({size,panelId,cutPoints:row.cutMm.length,stitchPoints:row.stitchMm.length,
          sourceRevision:snapshot.revision,cutStitchMatch:true,allowanceMm:
          source.edges.map(edge=>source.seam_allowances[edge]*1000),notchCount:0})
      }catch(error){add(String(error.message||error),size,panelId)}
    }
    if(observed.size!==expected.size)add('MISSING_SIZE_PANEL')
    if(snapshot.template.seams?.length)add('SEWN_CUT_RELATIONSHIP_UNVERIFIED')
    if(issues.length)return fail(issues,rows)
    return {ok:true,localGeometryVerified:true,sizes:[...SIZES],rows,issues:[],
      sourceRevision:snapshot.revision,sourceTemplate:canonical(snapshot.template),
      sourceRuleSet:canonical(ruleSet),authoritativeRust:false,independentlyVerified:false,
      manufacturingApproved:false,factoryApproved:false,receivingCadApproved:false,
      cuttingAuthorized:false,limitations:['Simple linear and rectangular CUT contours only',
        'No physical notch mark transfer or sewn panel CUT proof',
        'No authenticated per-size Rust CUT run or independent receiver approval']}
  }catch(error){add('INVALID_EVIDENCE_INPUT');return fail(issues,rows)}
}
