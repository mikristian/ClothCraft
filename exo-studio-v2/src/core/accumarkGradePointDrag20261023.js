import {editAccuMarkGradeDelta,readAccuMarkGradeDeltaMatrix} from './accumarkNumericGradeDelta20261023.js'
import {gradeProject} from './grading.js'

const finite = number => typeof number === 'number' && Number.isFinite(number)
const fail = message => { throw new Error('AccuMark grade point drag: '+message) }

/** Build a reversible grade-point edit from a pointer movement in LOCAL cm.
 * dxCm/dyCm are increments from the CURRENT graded point at the requested size.
 * The return project is a copy; the caller decides whether to put it in Undo.
 */
export function buildAccuMarkGradePointDragProposal(project, {
  pieceId,pointIndex,size,dxCm,dyCm,maintainGrowths=false,
} = {}) {
  if (!project || !Array.isArray(project.pieces)) fail('project required')
  if (typeof pieceId !== 'string' || !pieceId.trim() || !Number.isSafeInteger(pointIndex) || pointIndex < 0)
    fail('valid piece ID and point index required')
  const matches = project.pieces.filter(piece => piece?.id === pieceId)
  if (matches.length !== 1) fail('unknown or ambiguous piece ID')
  const piece = matches[0]
  if (!Array.isArray(piece.points) || pointIndex >= piece.points.length) fail('invalid point index')
  if (piece.locked || piece.points[pointIndex]?.locked) fail('piece or point is locked')
  if (piece.points[pointIndex]?.namedGradeRuleRef) fail('detach named grade rule reference before dragging')
  if (piece.points[pointIndex]?.gradeRule?.locked) fail('grade rule is locked')
  if (!finite(dxCm) || !finite(dyCm) || Math.abs(dxCm) > 100 || Math.abs(dyCm) > 100)
    fail('drag increments must be finite and within 100 cm per axis')
  if (typeof maintainGrowths !== 'boolean') fail('maintainGrowths must be boolean')
  const matrix = readAccuMarkGradeDeltaMatrix(project,{pieceId,pointIndex})
  if (!matrix.sizes.includes(size)) fail('unknown size')
  if (size === matrix.baseSize) fail('base size is fixed')
  const row = matrix.rows.find(item => item.size === size)
  const original = piece.points[pointIndex]
  const from = {x:original.x+row.dxCm,y:original.y+row.dyCm}
  const to = {x:from.x+dxCm,y:from.y+dyCm}
  const wantedDx = row.dxCm+dxCm,wantedDy = row.dyCm+dyCm
  if (![from.x,from.y,to.x,to.y,wantedDx,wantedDy].every(finite)) fail('coordinate arithmetic overflow')
  const {project:next,validation} = editAccuMarkGradeDelta(project,{
    pieceId,pointIndex,size,mode:'cumulative',dxCm:wantedDx,dyCm:wantedDy,maintainGrowths,
  })
  const gradedPiece = gradeProject(next,size).pieces.filter(item => item.id === pieceId)
  if (gradedPiece.length !== 1) fail('ambiguous graded piece')
  const point = gradedPiece[0].points?.[pointIndex]
  if (!point || !finite(point.x) || !finite(point.y) ||
    Math.abs(point.x-to.x)>1e-7 || Math.abs(point.y-to.y)>1e-7) fail('graded preview does not match drag')
  return {
    project:next,
    validation:{...validation,operation:'grade-point-drag',pieceId,pointIndex,size,units:'cm',manufacturingApproved:false},
    preview:{from,to:{x:point.x,y:point.y},deltaCm:{x:dxCm,y:dyCm},size},
  }
}
