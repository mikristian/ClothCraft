import { propagateIndustrialAllowanceLinks } from './industrialAllowanceLinks20261027.js'

export const ALLOWANCE_GRAPH_SCHEMA = 'exo.legacy.allowance-links.v1'
const reject = (code, message) => { const error = new Error(message); error.code = code; throw error }
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const safeValue = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
const signature = value => JSON.stringify(value)
const endpoint = ref => [ref.pieceId, ref.edgeIndex, ref.pointCount]
const linkIdentity = link => signature([endpoint(link.source), endpoint(link.target), link.sizes])
const valueAt = (project, ref) => {
  const piece = project.pieces.find(p => p.id === ref.pieceId)
  return own(piece.edgeSeamAllowances || {}, String(ref.edgeIndex)) ? piece.edgeSeamAllowances[ref.edgeIndex] : (piece.seamAllowance ?? 0)
}
const fullSizes = project => {
  const sizes = project?.grading?.sizes
  if (!Array.isArray(sizes) || !sizes.length || !sizes.includes(project.grading.baseSize) || new Set(sizes).size !== sizes.length ||
    sizes.some(size => typeof size !== 'string' || !size)) reject('INVALID_GRADING', 'Valid full-size inventory required')
  return sizes
}
function normalizedLinks(project, links) {
  const sizes = fullSizes(project)
  if (!Array.isArray(links) || !links.length || links.length > 4096) reject('INVALID_LINKS', 'At least one link is required')
  const normalized = links.map(link => {
    if (!link || typeof link !== 'object' || !link.source || !link.target ||
      !Array.isArray(link.sizes ?? sizes) || signature(link.sizes ?? sizes) !== signature(sizes))
      reject('UNSUPPORTED_SIZE_SCOPE', 'Persistent links require the exact full size run')
    const ref = r => ({ pieceId:r.pieceId, edgeIndex:r.edgeIndex, pointCount:r.pointCount })
    const result = { source:ref(link.source), target:ref(link.target), sizes:[...sizes] }
    if (Object.keys(link).some(key => !['source','target','sizes'].includes(key)) ||
        [link.source,link.target].some(r => Object.keys(r).some(key => !['pieceId','edgeIndex','pointCount'].includes(key))))
      reject('UNSUPPORTED_LINK', 'Unknown link metadata cannot be persisted')
    return result
  })
  const identities = normalized.map(linkIdentity)
  if (new Set(identities).size !== identities.length) reject('DUPLICATE_LINK', 'Duplicate link identity')
  normalized.sort((a,b) => linkIdentity(a).localeCompare(linkIdentity(b),'en'))
  return normalized
}
const targets = links => [...new Map(links.map(link => [signature(endpoint(link.target)), link.target])).values()]
const capture = (project, links) => targets(links).map(ref => ({ ref:{...ref}, value:valueAt(project,ref) }))
const roots = links => {
  const targetIds=new Set(targets(links).map(ref=>signature(endpoint(ref))))
  const unique=new Map()
  for(const link of links){
    const identity=signature(endpoint(link.source))
    if(!targetIds.has(identity))unique.set(identity,link.source)
  }
  return [...unique].sort(([a],[b])=>a.localeCompare(b,'en')).map(([,ref])=>ref)
}
const captureRoots = (project,links) => roots(links).map(ref=>({ref:{...ref},value:valueAt(project,ref)}))
const graphMetadata = (project, links, lastAppliedRevision, applied) => ({
  schema:ALLOWANCE_GRAPH_SCHEMA, baseSize:project.grading.baseSize, sizes:[...project.grading.sizes],
  links, lastAppliedRevision, applied,
  // Optional root snapshots harden saved projects against out-of-band edits.
  // Old v1 graphs without this property remain loadable, but provenance of
  // their original root values cannot be established retroactively.
  sources:captureRoots(project,links),
})

/** Store deterministic dependencies alongside legacy pattern metadata; returns a fresh project. */
export function authorIndustrialAllowanceGraph(project, links, {expectedRevision} = {}) {
  if (project?.industrialAllowanceGraph !== undefined) reject('GRAPH_EXISTS','Use an explicit graph replacement workflow')
  const normalized = normalizedLinks(project,links)
  const calculated = propagateIndustrialAllowanceLinks(project,normalized,{expectedRevision})
  const next = calculated.project
  next.industrialAllowanceGraph = graphMetadata(project,normalized,project.revision,capture(next,normalized))
  return { project:next, applied:calculated.applied, factoryCertified:false }
}

/** Recompute saved dependencies after a source edit; refuses stale targets and schema drift. */
export function reapplyIndustrialAllowanceGraph(project, {expectedRevision} = {}) {
  const graph = project?.industrialAllowanceGraph
  const mandatory=['schema','baseSize','sizes','links','lastAppliedRevision','applied']
  const keys=Object.keys(graph||{})
  if (!graph || graph.schema !== ALLOWANCE_GRAPH_SCHEMA ||
    (keys.sort().join(',')!==mandatory.slice().sort().join(',') &&
      keys.sort().join(',')!==[...mandatory,'sources'].sort().join(',')))
    reject('UNSUPPORTED_GRAPH','Missing or incompatible persisted link graph')
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== project.revision ||
    !Number.isSafeInteger(graph.lastAppliedRevision) || project.revision < graph.lastAppliedRevision)
    reject('STALE_REVISION','Expected revision differs or graph provenance is from the future')
  if (signature(fullSizes(project)) !== signature(graph.sizes) || project.grading.baseSize !== graph.baseSize)
    reject('STALE_GRADING','Persisted grading size inventory has changed')
  const links = normalizedLinks(project,graph.links)
  if (signature(links) !== signature(graph.links)) reject('GRAPH_TAMPERED','Links have lost canonical identities or ordering')
  if (graph.sources !== undefined) {
    const expectedRoots=captureRoots(project,links)
    if (!Array.isArray(graph.sources) || graph.sources.length !== expectedRoots.length ||
        graph.sources.some((entry,index)=>signature(entry?.ref)!==signature(expectedRoots[index].ref)||
          !safeValue(entry?.value)))
      reject('SOURCE_PROVENANCE_INVALID','Stored source provenance is incompatible with the graph')
  }
  const expectedTargets = capture(project,links)
  if (!Array.isArray(graph.applied) || graph.applied.length !== expectedTargets.length ||
      graph.applied.some((entry,index) => signature(entry?.ref) !== signature(expectedTargets[index].ref) ||
        !safeValue(entry.value) || entry.value !== expectedTargets[index].value))
    reject('TARGET_MODIFIED','Linked target values changed outside the graph')
  // A revised source is accepted; every target must still equal its last authored value.
  const calculated = propagateIndustrialAllowanceLinks(project,links,{expectedRevision})
  const next = calculated.project
  next.industrialAllowanceGraph = graphMetadata(project,links,project.revision,capture(next,links))
  return {project:next,applied:calculated.applied,factoryCertified:false}
}

/** Saved-project admission: reject stale source values without altering them.
 * Deliberate editing calls reapplyIndustrialAllowanceGraph first to refresh
 * sources AND targets atomically; this check never does so on the user's behalf.
 * A historical v1 graph without source snapshots is supported as unverified.
 */
export function assertFreshIndustrialAllowanceGraph20261027(project,{expectedRevision}={}){
  const checked=reapplyIndustrialAllowanceGraph(project,{expectedRevision})
  const graph=project.industrialAllowanceGraph
  if(graph.sources === undefined) return {ok:true,sourceProvenanceVerified:false,factoryCertified:false}
  const current=captureRoots(project,graph.links)
  if(signature(graph.sources)!==signature(current))
    reject('STALE_SOURCE','Saved source allowance changed without updating dependent targets')
  return {ok:true,sourceProvenanceVerified:true,factoryCertified:false,
    applied:checked.applied}
}
