import {inspectNativeGradedNotchAllowance20261025} from './nativeGradedNotchAllowance20261025.js'

/** Independent six-size CUT evidence inventory. This is diagnostic only: native
 * stitched contours cannot establish offset physical CUT geometry on their own. */
const SIZES=['XS','S','M','L','XL','XXL']
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k)
const finite=n=>typeof n==='number'&&Number.isFinite(n)

export function inspectNativeGradeCutPreflight20261025(snapshot,compiled){
  const issues=[],rows=[]
  const panels=snapshot?.template?.panels
  const seams=snapshot?.template?.seams
  const add=(code,panelId,size,edgeId,message)=>issues.push({code,panelId,size,edgeId,message})
  if(!Array.isArray(panels)||!panels.length||!Array.isArray(seams)||!compiled?.ok){
    return {ok:false,cutEvidenceReady:false,manufacturingApproved:false,cuttingAuthorized:false,
      rows,issues:[{code:'CUT_SOURCE_INCOMPLETE',message:'Native panels, sewn relations and compiled size-run are required.'}]}
  }
  for(const panel of panels){
    const id=panel?.id,source=panel?.polygon,edges=source?.edges
    if(typeof id!=='string'||!Array.isArray(edges)||!edges.length||new Set(edges).size!==edges.length){
      add('CUT_EDGE_INVENTORY',id,null,null,'Source panel needs distinct named physical boundary edges.');continue
    }
    for(const size of SIZES){
      const polygon=compiled.byPanel?.[id]?.sizeRun?.[size]?.polygon
      if(!polygon||!Array.isArray(polygon.edges)||polygon.edges.length!==edges.length||
        edges.some((edge,i)=>polygon.edges[i]!==edge)){
        add('GRADED_CUT_TOPOLOGY',id,size,null,'Graded edge order or edge count differs from source.');continue
      }
      const allowances=polygon.seam_allowances
      const notchMap=polygon.notches
      for(const edge of edges){
        const allowance=allowances&&own(allowances,edge)?allowances[edge]:null
        const notchEvidence=notchMap&&own(notchMap,edge)?notchMap[edge]:null
        const allowanceStatus=allowance===null?'MISSING_ALLOWANCE':!finite(allowance)||allowance<0?'INVALID_ALLOWANCE':allowance===0?'EXPLICIT_ZERO':'OFFSET_CUT_PROOF_REQUIRED'
        if(allowanceStatus!=='EXPLICIT_ZERO')add(allowanceStatus,id,size,edge,
          allowanceStatus==='OFFSET_CUT_PROOF_REQUIRED'?'Nonzero stitch allowance requires independent offset CUT contour geometry.':
          'A finite nonnegative explicit seam allowance is required for CUT interpretation.')
        const notchStatus=notchEvidence===null?'NOTCH_INVENTORY_MISSING':
          !Array.isArray(notchEvidence)?'NOTCH_INVENTORY_INVALID':
          notchEvidence.length?'NOTCH_PLACEMENT_PROOF_REQUIRED':'EXPLICIT_NO_NOTCHES'
        if(!['EXPLICIT_NO_NOTCHES'].includes(notchStatus))add(notchStatus,id,size,edge,
          notchStatus==='NOTCH_PLACEMENT_PROOF_REQUIRED'?'Notch locations require independent graded CUT coordinate verification.':
          'Explicit graded notch inventory (possibly empty) is required for this edge.')
        rows.push({panelId:id,size,edgeId:edge,allowanceM:allowance,allowanceStatus,
          notchCount:Array.isArray(notchEvidence)?notchEvidence.length:null,notchStatus,
          sourceRevision:Number.isSafeInteger(snapshot.revision)?snapshot.revision:null})
      }
    }
  }
  if(rows.length!==panels.reduce((n,p)=>n+(p?.polygon?.edges?.length||0),0)*SIZES.length)
    add('CUT_COVERAGE_INCOMPLETE',null,null,null,'CUT evidence rows must cover each source edge in every XS–XXL size.')
  if(seams.length)add('SEWN_CUTLINE_PROOF_REQUIRED',null,null,null,'Sewn panels require independent size-specific STITCH/CUT relationship proof.')
  const gradedAnnotations=inspectNativeGradedNotchAllowance20261025(snapshot,compiled)
  issues.push(...gradedAnnotations.issues)
  // A source-only grade inventory cannot establish receiving CAD acceptance,
  // cut contour offset, notch translation or printable marker accuracy.
  add('RECEIVING_CAD_UNVERIFIED',null,null,null,'Validate exported six-size CUT/STITCH/notch geometry in the receiving CAD and print at scale.')
  return {ok:true,cutEvidenceReady:false,manufacturingApproved:false,cuttingAuthorized:false,
    sizes:[...SIZES],rows,issues,gradedAnnotations}
}
