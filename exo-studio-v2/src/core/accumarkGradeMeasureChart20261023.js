import {gradeProject,DEFAULT_SIZES} from './grading.js'
import {samplePieceBoundary} from './project.js'

function selectedPiece(project,id){
  if(typeof id!=='string'||!id.trim())throw Error('INVALID_PIECE_ID')
  const matches=project.pieces.filter(p=>p?.id===id)
  if(matches.length!==1)throw Error('UNKNOWN_OR_DUPLICATE_PIECE')
  const piece=matches[0]
  if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>4096||piece.points.some(p=>!Number.isFinite(p?.x)||!Number.isFinite(p?.y)))throw Error('INVALID_PIECE_GEOMETRY')
  return piece
}
function indices(piece,list){
  if(!Array.isArray(list)||!list.length||list.length>piece.points.length||list.some(i=>!Number.isInteger(i)||i<0||i>=piece.points.length)||new Set(list).size!==list.length)throw Error('INVALID_EDGE_INDICES')
  return list
}
function length(piece,edgeIndices){
  const paths=samplePieceBoundary(piece,12).edgePaths
  return edgeIndices.reduce((total,index)=>{
    const path=paths[index]
    if(!Array.isArray(path)||path.length<2)throw Error('INVALID_SAMPLED_EDGE')
    let distance=0
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i]
      if(!Number.isFinite(a?.x)||!Number.isFinite(a?.y)||!Number.isFinite(b?.x)||!Number.isFinite(b?.y))throw Error('NONFINITE_SAMPLED_EDGE')
      const segment=Math.hypot(b.x-a.x,b.y-a.y)
      if(!Number.isFinite(segment))throw Error('NONFINITE_SAMPLED_EDGE')
      distance+=segment
    }
    return total+distance
  },0)
}

/** Read-only graded stitch-boundary measurements in centimetres.
 * Edge indices refer to authored perimeter edges and are evaluated on each
 * graded size independently. Difference is primary minus comparison length.
 */
export function buildAccuMarkGradeMeasureChart(project,{pieceId,edgeIndices,comparePieceId,compareEdgeIndices}={}){
  if(!project||!Array.isArray(project.pieces))throw Error('INVALID_PROJECT')
  const source=selectedPiece(project,pieceId)
  indices(source,edgeIndices)
  const hasCompare=comparePieceId!==undefined||compareEdgeIndices!==undefined
  if(hasCompare&&(comparePieceId===undefined||compareEdgeIndices===undefined))throw Error('INCOMPLETE_COMPARISON')
  const comparison=hasCompare?selectedPiece(project,comparePieceId):null
  if(comparison)indices(comparison,compareEdgeIndices)
  const sizes=project.grading?.sizes??DEFAULT_SIZES
  const base=project.grading?.baseSize??'M'
  if(!Array.isArray(sizes)||sizes.length===0||sizes.length>64||sizes.some(s=>typeof s!=='string'||!s.trim())||new Set(sizes).size!==sizes.length||!sizes.includes(base))throw Error('INVALID_GRADE_SIZES')
  const rows=sizes.map(size=>{
    const graded=gradeProject(project,size)
    const p=selectedPiece(graded,pieceId)
    if(p.points.length!==source.points.length)throw Error('GRADED_TOPOLOGY_MISMATCH')
    const totalCm=length(p,edgeIndices)
    if(!Number.isFinite(totalCm))throw Error('INVALID_TOTAL')
    const row={size,totalCm,baseDeltaCm:0}
    if(comparison){
      const other=selectedPiece(graded,comparePieceId)
      if(other.points.length!==comparison.points.length)throw Error('GRADED_TOPOLOGY_MISMATCH')
      row.compareTotalCm=length(other,compareEdgeIndices)
      row.differenceCm=totalCm-row.compareTotalCm
      if(!Number.isFinite(row.differenceCm))throw Error('INVALID_COMPARISON')
    }
    return row
  })
  const baseLength=rows.find(r=>r.size===base).totalCm
  for(const row of rows)row.baseDeltaCm=row.totalCm-baseLength
  return {sizes:[...sizes],rows,units:'cm'}
}
