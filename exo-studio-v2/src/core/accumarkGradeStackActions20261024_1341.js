import {gradeProject} from './grading.js'
import {edgeLength,edgePointAt} from './project.js'

const finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<1e6
const xy=p=>p&&finite(p.x)&&finite(p.y)
const error=(code,detail)=>{const e=new Error(code+(detail?' · '+detail:''));e.code=code;throw e}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const onSegment=(a,b,p)=>p.x>=Math.min(a.x,b.x)-1e-8&&p.x<=Math.max(a.x,b.x)+1e-8&&
    p.y>=Math.min(a.y,b.y)-1e-8&&p.y<=Math.max(a.y,b.y)+1e-8
function intersect(a,b,c,d){
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b)
  if(x*y < -1e-12&&z*w< -1e-12)return true
  if(Math.abs(x)<1e-8&&onSegment(a,b,c))return true
  if(Math.abs(y)<1e-8&&onSegment(a,b,d))return true
  if(Math.abs(z)<1e-8&&onSegment(c,d,a))return true
  if(Math.abs(w)<1e-8&&onSegment(c,d,b))return true
  return false
}
const bbox=arr=>({minX:Math.min(...arr.map(p=>p.x)),maxX:Math.max(...arr.map(p=>p.x)),
 minY:Math.min(...arr.map(p=>p.y)),maxY:Math.max(...arr.map(p=>p.y))})
function verifyContour(piece,expectCount,orientation){
 const p=piece?.points
 if(!Array.isArray(p)||p.length!==expectCount||p.length<3||p.length>256||!p.every(xy))
    error('INVALID_GRADED_TOPOLOGY')
 if(p.some((a,i)=>Math.hypot(a.x-p[(i+1)%p.length].x,a.y-p[(i+1)%p.length].y)<1e-7))
    error('DEGENERATE_GRADED_EDGE')
 const first=p[0],area=p.reduce((sum,a,i)=>{
  const b=p[(i+1)%p.length]
  return sum+(a.x-first.x)*(b.y-first.y)-(a.y-first.y)*(b.x-first.x)
 },0)/2
 if(!finite(area)||Math.abs(area)<1e-7||Math.sign(area)!==orientation)
    error('REVERSED_OR_DEGENERATE_GRADED_CONTOUR')
 for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
  if(j===i+1||(i===0&&j===p.length-1))continue
  if(intersect(p[i],p[(i+1)%p.length],p[j],p[(j+1)%p.length]))
    error('SELF_INTERSECTION_IN_GRADED_CHORDS')
 }
 for(const [k,c]of Object.entries(piece.curves||{})){
  if(!/^(0|[1-9][0-9]*)$/.test(k)||Number(k)>=p.length||!finite(c?.cx)||!finite(c?.cy))
    error('INVALID_GRADED_CURVES')
 }
 return {areaCm2:Math.abs(area),bounds:bbox(p)}
}
/**
 * Read-only size-stack alignment for patternmaking. Geometries are generated
 * from real EXO graded source data, never resized from adjacent previews.
 * Align size zero with selected source point or actual edge station. This does
 * NOT rewrite industrial grade rule origins or approve cut/plot.
 *
 * For curved edges verifies finite control geometry and physical arclength,
 * but cannot certify all curved contour self-intersection: construction/fit
 * remains explicitly unapproved.
 */
export function inspectAccuMarkGradedStack20261024_1341(project,{
 pieceId,pointIndex=0,edgeIndex=null,edgeFraction=.5,
 sizes=project?.grading?.sizes,
 align='anchor',includePoints=true,
}={}){
 if(!project||!Array.isArray(project.pieces)||project.pieces.length<1||project.pieces.length>128)
   error('INVALID_PROJECT')
 const ids=project.pieces.map(p=>p.id)
 if(ids.some(x=>typeof x!=='string'||!x)||new Set(ids).size!==ids.length)error('DUPLICATE_OR_INVALID_PIECES')
 if(!Array.isArray(sizes)||sizes.length<1||sizes.length>16||
    sizes.some(x=>typeof x!=='string'||!x)||new Set(sizes.map(x=>x.toLowerCase())).size!==sizes.length)
    error('INVALID_SIZE_SET')
 const available=project?.grading?.sizes
 if(!Array.isArray(available)||available.length<1||new Set(available.map(x=>x.toLowerCase())).size!==available.length||
    sizes.some(x=>!available.includes(x)))error('UNKNOWN_GRADED_SIZE')
 const baseSize=project.grading.baseSize
 if(!available.includes(baseSize))error('INVALID_BASE_SIZE')
 if(!['anchor','source'].includes(align)||typeof includePoints!=='boolean')error('INVALID_VIEW_OPTIONS')
 const original=project.pieces.find(p=>p.id===pieceId)
 if(!original)error('UNKNOWN_PIECE')
 const count=original.points?.length
 if(!Number.isSafeInteger(count)||count<3||count>256||!Number.isInteger(pointIndex)||pointIndex<0||pointIndex>=count)
    error('INVALID_POINT_INDEX')
 if(edgeIndex!==null&&(!Number.isInteger(edgeIndex)||edgeIndex<0||edgeIndex>=count||
    !finite(edgeFraction)||edgeFraction<=0||edgeFraction>=1))error('INVALID_EDGE_STATION')
 const originalFirst=original.points[0]
 const originalArea=original.points.reduce((s,p,i)=>{
   const q=original.points[(i+1)%count]
   return s+(p.x-originalFirst.x)*(q.y-originalFirst.y)-(p.y-originalFirst.y)*(q.x-originalFirst.x)
 },0)/2
 if(!finite(originalArea)||Math.abs(originalArea)<1e-7)error('INVALID_SOURCE_CONTOUR')
 const orientation=Math.sign(originalArea)
 // A nonuniform industrial grade always remains in its authored size. We
 // translate independent render copies only, never modify size break vectors.
 const wanted=[...new Set([baseSize,...sizes])]
 const sourceRows=new Map()
 for(const size of wanted){
  const graded=gradeProject(project,size)
  const found=graded?.pieces?.find(p=>p.id===pieceId)
  if(graded?.pieces?.filter(p=>p.id===pieceId).length!==1)error('INVALID_GRADED_PIECE_ID',size)
  const quality=verifyContour(found,count,orientation)
  const anchor=edgeIndex===null?
    {...found.points[pointIndex]}:edgePointAt(found,edgeIndex,edgeFraction,80)?.point
  if(!xy(anchor))error('INVALID_EDGE_ARCLENGTH_STATION',size)
  let selectedEdgeLengthCm=null
  if(edgeIndex!==null){
    selectedEdgeLengthCm=edgeLength(found,edgeIndex)
    if(!finite(selectedEdgeLengthCm)||selectedEdgeLengthCm<=0)error('INVALID_GRADED_EDGE_LENGTH',size)
  }
  sourceRows.set(size,{size,graded:found,anchor,selectedEdgeLengthCm,quality})
 }
 const base=sourceRows.get(baseSize)
 const rows=sizes.map(size=>{
   const item=sourceRows.get(size)
   const displacement={xCm:item.anchor.x-base.anchor.x,yCm:item.anchor.y-base.anchor.y}
   const translation=align==='anchor'?{xCm:-displacement.xCm,yCm:-displacement.yCm}:{xCm:0,yCm:0}
   const alignedAnchor={xCm:item.anchor.x+translation.xCm,yCm:item.anchor.y+translation.yCm}
   const points=item.graded.points.map(p=>({xCm:p.x+translation.xCm,yCm:p.y+translation.yCm}))
   const controls=Object.entries(item.graded.curves||{}).map(([edge,c])=>({
     edgeIndex:Number(edge),cxCm:c.cx+translation.xCm,cyCm:c.cy+translation.yCm}))
   const result={size,anchorCm:{xCm:item.anchor.x,yCm:item.anchor.y},
     translation,alignedAnchor,pointCount:count,
     chordBoundsCm:bbox(points.map(p=>({x:p.xCm,y:p.yCm}))),
     sourceBoundsCm:item.quality.bounds,polygonChordAreaCm2:item.quality.areaCm2,
     selectedEdgeLengthCm:item.selectedEdgeLengthCm,
     sourceGradeAnchorDeltaCm:displacement,curves:controls,
     allSizesExist:true}
   if(includePoints)result.pointsCm=points
   return result
 })
 return {schema:'exo.accumark.grade-stack-align-study.v1',
   pieceId,baseSize,sizes:[...sizes],pointIndex,edgeIndex,edgeFraction,
   align,rows,units:'cm',
   sourceGradeRulesUnchanged:true,previewOnly:true,
   contourChordTopologyChecked:true,curvedContourManufacturingVerified:false,
   factoryApproved:false,manufacturingApproved:false,cuttingAuthorized:false,
   warning:'Grade-stack display alignment only. Does not change authored graded rules or establish physical sewn grading/marker acceptance.'}
}
