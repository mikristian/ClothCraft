import { cloneProject } from './project.js'
import { createModarisSizeLinkedGrade, reapplyModarisSizeLinkedGrade } from './modarisSizeLinkedGrade20261027.js'

const reject = reason => { throw new Error(`Modaris grade mutation refused: ${reason}`) }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const pointKey = ref => JSON.stringify([ref.pieceId, ref.pointIndex])

function pieceFor(project, id) {
  const matches = project.pieces.filter(piece => piece?.id === id)
  if (matches.length !== 1) reject(`missing or ambiguous linked piece ${id}`)
  return matches[0]
}

function linkedGeometry(piece) {
  return {
    id: piece.id,
    vertices: piece.points.map(point => ({id:point.id ?? null,x:point.x,y:point.y})),
    curves: piece.curves ?? null,
    edgeNames: piece.edgeNames ?? null,
  }
}

/**
 * Pure Undo-friendly before -> draft transaction boundary.
 * The before graph is the trusted provenance for this edit. Root source rule
 * edits are permitted; derived rules retain their prior authenticated values.
 * Initial creation is accepted only when the entire draft is the exact result
 * of createModarisSizeLinkedGrade(before, draft graph's link definitions).
 */
export function applyModarisSizeLinkedGradeMutation(before, draft) {
  if (!before || !draft || typeof before !== 'object' || typeof draft !== 'object') reject('before and draft projects required')
  const graph = before.modarisSizeLinkedGrade
  if (!graph) {
    if (draft.modarisSizeLinkedGrade !== undefined) {
      const proposed = draft.modarisSizeLinkedGrade
      if (proposed?.version !== 1 || !Array.isArray(proposed.links) || proposed.links.length === 0) reject('invalid initial link graph')
      const definitions = proposed.links.map(link => ({source:link?.source,target:link?.target,axis:link?.axis,curves:link?.curves}))
      let verified
      try { verified = createModarisSizeLinkedGrade(before, definitions) }
      catch (error) { reject(`invalid initial link creation: ${error.message}`) }
      if (!same(verified.project, draft)) reject('first-time linked grade draft differs from verified creation')
      return {project:cloneProject(verified.project),validation:{...verified.validation,linked:true,linkCreated:true,propagated:proposed.links.length,manufacturingApproved:false}}
    }
    return {project:cloneProject(draft),validation:{linked:false,linkCreated:false,propagated:0,manufacturingApproved:false}}
  }
  if (!same(graph,draft.modarisSizeLinkedGrade)) reject('versioned link graph was changed')
  if (!same(before.grading?.sizes,draft.grading?.sizes) || before.grading?.baseSize !== draft.grading?.baseSize || before.units !== draft.units) reject('size, base size or physical units changed')
  if (!Array.isArray(before.pieces) || !Array.isArray(draft.pieces)) reject('missing piece inventory')
  // Check the baseline itself before trusting its graph and snapshots.
  try { reapplyModarisSizeLinkedGrade(before) } catch(error) { reject(`invalid prior graph: ${error.message}`) }
  const targetKeys = new Set(graph.links.map(link => pointKey(link.target)))
  const linkedPieceIds = new Set(graph.links.flatMap(link=>[link.source.pieceId,link.target.pieceId]))
  for(const id of linkedPieceIds) {
    const prior = pieceFor(before,id), next = pieceFor(draft,id)
    if (!same(linkedGeometry(prior),linkedGeometry(next))) reject(`authored linked geometry, edges or topology changed: ${id}`)
    if (prior.points.length !== next.points.length) reject('linked point count changed')
    for(let index=0;index<prior.points.length;index++) {
      if (targetKeys.has(pointKey({pieceId:id,pointIndex:index})) && !same(prior.points[index].industrialGradeRule,next.points[index].industrialGradeRule)) {
        reject(`derived target rule edited without authorization: ${id}/${index}`)
      }
    }
  }
  // All other ordinary edits survive. The grade engine validates rule tables,
  // source snapshots, cycles, topology and numeric boundaries transactionally.
  let outcome
  try { outcome = reapplyModarisSizeLinkedGrade(draft) } catch(error) { reject(error.message) }
  return {project:outcome.project,validation:{...outcome.validation,linked:true,linkCreated:false,propagated:graph.links.length,manufacturingApproved:false}}
}

export const transactModarisSizeLinkedGradeMutation = applyModarisSizeLinkedGradeMutation
