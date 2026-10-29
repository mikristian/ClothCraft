import {nativeRustEdgeLength20261023,nativeRustArcLengthStation20261023} from './nativeRustArcLengthCompat20261023.js'

const finite=n=>typeof n==='number'&&Number.isFinite(n)
const own=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k)
const sizes=['XS','S','M','L','XL','XXL']

/** Source-linked boundary annotation metrology in metres. This validates stitch
 * edge stations, never physical offset CUT polygons or factory print accuracy. */
export function inspectNativeGradedNotchAllowance20261025(source,compiled,{namedSizes=null}={}){
  const issues=[],rows=[],stations=[]
  const add=(code,panelId,size,edgeId,message)=>issues.push({code,panelId,size,edgeId,message})
  const panels=source?.template?.panels
  const runSizes=namedSizes??sizes
  if(!Array.isArray(runSizes)||runSizes.length<2||runSizes.length>24||
    runSizes.some(s=>typeof s!=='string'||!/^[A-Za-z0-9-]{1,24}$/.test(s))||
    new Set(runSizes).size!==runSizes.length){
    return {ok:false,rows,stations,issues:[{code:'GRADE_ANNOTATION_SIZE_INVENTORY'}],manufacturingApproved:false,cuttingAuthorized:false}
  }
  if(!compiled?.ok||!Array.isArray(panels)||!panels.length){
    return {ok:false,rows,stations,issues:[{code:'GRADE_ANNOTATION_SOURCE_INCOMPLETE'}],manufacturingApproved:false}
  }
  const identities=new Set()
  for(const panel of panels){
    const id=panel?.id,base=panel?.polygon,edges=base?.edges
    if(typeof id!=='string'||!id||identities.has(id)||!Array.isArray(edges)||edges.length<3||
      edges.some(e=>typeof e!=='string'||!e)||new Set(edges).size!==edges.length){
      add('GRADE_ANNOTATION_EDGE_INVENTORY',id,null,null,'Distinct panels and named edges required');continue
    }
    identities.add(id)
    for(const [index,edge] of edges.entries()){
      // Rust serializes absent edge keys as no notches, whereas a present
      // key must contain an explicit array. Never normalize a missing
      // authored nonempty source mark in the graded copy.
      const baseline=own(base.notches,edge)?base.notches[edge]:[]
      const baseAllowance=base.seam_allowances?.[edge]
      if(!own(base.seam_allowances,edge)||!finite(baseAllowance)||baseAllowance<0)
        add('SOURCE_EDGE_ALLOWANCE_MISSING',id,null,edge,'Source edge needs explicit nonnegative allowance in metres')
      if(!Array.isArray(baseline))
        add('SOURCE_EDGE_NOTCHES_INVALID',id,null,edge,'Authored notch inventory must be an array')
      const baseValid=Array.isArray(baseline)&&baseline.length<=128&&baseline.every((n,i)=>n&&finite(n.t)&&n.t>0&&n.t<1&&finite(n.depth_m)&&n.depth_m>0&&
        finite(baseAllowance)&&baseAllowance>0&&n.depth_m<=baseAllowance+1e-10&&(!i||baseline[i-1].t<n.t))
      if(Array.isArray(baseline)&&!baseValid)add('SOURCE_NOTCH_INVALID',id,null,edge,'Notches require strictly increasing interior stations, positive allowance and depth no greater than allowance')
      for(const size of runSizes){
        const poly=compiled.byPanel?.[id]?.sizeRun?.[size]?.polygon
        if(!poly||!Array.isArray(poly.edges)||poly.edges.length!==edges.length||
          poly.edges.some((e,i)=>e!==edges[i])||!Array.isArray(poly.points)||poly.points.length!==edges.length){
          add('GRADE_ANNOTATION_TOPOLOGY',id,size,edge,'Size must retain source edge topology');continue
        }
        const allowance=poly.seam_allowances?.[edge]
        const marks=own(poly.notches,edge)?poly.notches[edge]:[]
        if(!own(poly.seam_allowances,edge)||!finite(allowance)||allowance<0)
          add('GRADED_ALLOWANCE_INVALID',id,size,edge,'Explicit finite nonnegative edge allowance required')
        else if(finite(baseAllowance)&&allowance!==baseAllowance)
          add('GRADED_ALLOWANCE_DRIFT',id,size,edge,'Graded allowance differs from authored source')
        if(!Array.isArray(marks)||marks.length>128){
          add('GRADED_NOTCH_INVENTORY_INVALID',id,size,edge,'Explicit bounded notch array required');continue
        }
        if(marks.length&&(!finite(allowance)||allowance<=0))
          add('GRADED_NOTCH_ALLOWANCE_REQUIRED',id,size,edge,'Cutline notches require positive physical edge allowance')
        if(!baseValid||marks.length!==baseline.length){
          add('GRADED_NOTCH_IDENTITY_DRIFT',id,size,edge,'Notch count or authored inventory differs');continue
        }
        const length=nativeRustEdgeLength20261023(poly,edge)
        if(!length.ok){add('GRADED_EDGE_UNMEASURABLE',id,size,edge,length.reason);continue}
        rows.push({panelId:id,size,edgeId:edge,edgeIndex:index,lengthMm:length.totalLengthM*1000,
          allowanceMm:finite(allowance)?allowance*1000:null,notchCount:marks.length})
        for(let i=0;i<marks.length;i++){
          const mark=marks[i],authored=baseline[i]
          if(!mark||!finite(mark.t)||mark.t<=0||mark.t>=1||!finite(mark.depth_m)||mark.depth_m<=0||
            !finite(allowance)||allowance<=0||mark.depth_m>allowance+1e-10||
            (i>0&&(!finite(marks[i-1]?.t)||marks[i-1].t>=mark.t))){
            add('GRADED_NOTCH_INVALID',id,size,edge,'Rust cutline requires strictly increasing interior notch stations, positive allowance and depth no greater than allowance');continue
          }
          if(mark.t!==authored.t||mark.depth_m!==authored.depth_m)
            add('GRADED_NOTCH_STATION_DRIFT',id,size,edge,'Graded notch station or depth changed from source')
          const distanceM=mark.t*length.totalLengthM
          const station=nativeRustArcLengthStation20261023(poly,edge,{distanceM})
          const point=station.ok?station.position:null
          if(!Array.isArray(point)||point.length!==2||!point.every(finite)){
            add('GRADED_NOTCH_STATION_UNRESOLVED',id,size,edge,'Cannot resolve physical notch station');continue
          }
          stations.push({panelId:id,size,edgeId:edge,index:i,stationFraction:mark.t,
            distanceMm:distanceM*1000,depthMm:mark.depth_m*1000,positionM:[...point],
            method:'RUST_CURVE_FLATTEN_0_25MM_SOURCE_ONLY'})
        }
      }
    }
  }
  return {ok:issues.length===0,rows,stations,issues,manufacturingApproved:false,cuttingAuthorized:false}
}
