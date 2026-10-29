/** Read-only development diagnostic. Mirrors the factory DXF double-notch spacing
 * and its sampled curved-edge station, without granting production approval. */
import {gradeProject} from './grading.js'
import {edgeLength, getEdgeSeamAllowance, samplePieceBoundary, seamAllowanceBoundary} from './project.js'

const finite = x => typeof x === 'number' && Number.isFinite(x)
const pointOK = p => finite(p?.x) && finite(p?.y)

export function inspectIndustrialDoubleNotches20261023(project) {
  const issues = [], checks = []
  const fail = (code, size, pieceId, notchId, message) => issues.push({code,size,pieceId,notchId,message,severity:'blocker'})
  const sizes = project?.grading?.sizes
  if (!Array.isArray(project?.pieces) || !Array.isArray(sizes) || !sizes.length ||
    sizes.some(s => typeof s !== 'string' || !s.trim()) || new Set(sizes).size !== sizes.length ||
    !sizes.includes(project?.grading?.baseSize)) {
    fail('INVALID_SIZE_RUN','all','project','notch-set','Explicit unique size run and base size required')
    return finish([])
  }
  for (const size of sizes) {
    let graded
    try { graded = gradeProject(project,size) }
    catch (error) { fail('GRADING_FAILED',size,'project','notch-set',String(error?.message||error)); continue }
    const pieces = Array.isArray(graded?.pieces) ? graded.pieces : []
    const seenPieces = new Set()
    for (const piece of pieces) {
      const pieceId = String(piece?.id ?? 'unknown')
      if (seenPieces.has(pieceId) || !Array.isArray(piece?.points) || piece.points.length < 3 || !Array.isArray(piece?.notches ?? [])) {
        fail('INVALID_GRADED_PIECE',size,pieceId,'notch-set','Invalid or repeated graded piece'); continue
      }
      seenPieces.add(pieceId)
      for (const [i,notch] of (piece.notches || []).entries()) {
        const notchId = String(notch?.id ?? `index-${i}`)
        const edge = notch?.edgeIndex, station = notch?.t ?? .5, depth = notch?.depthCm ?? .45
        if (!Number.isInteger(edge) || edge < 0 || edge >= piece.points.length) {
          fail('INVALID_EDGE_INDEX',size,pieceId,notchId,'Physical notch references invalid cutting edge'); continue
        }
        if (notch?.type != null && notch.type !== 'single' && notch.type !== 'double') {
          fail('INVALID_NOTCH_TYPE',size,pieceId,notchId,'Unsupported physical notch type'); continue
        }
        if (!finite(station) || station < 0 || station > 1 || !finite(depth) || depth <= 0) {
          fail('INVALID_NOTCH_STATION_OR_DEPTH',size,pieceId,notchId,'Nonfinite or out-of-bounds station/depth'); continue
        }
        let length, allowance, edgePaths, cut
        try {
          length = edgeLength(piece,edge)
          allowance = getEdgeSeamAllowance(piece,edge)
          edgePaths = samplePieceBoundary(piece,12).edgePaths
          cut = seamAllowanceBoundary(piece,12)
        } catch (error) { fail('PHYSICAL_BOUNDARY_FAILED',size,pieceId,notchId,String(error?.message||error)); continue }
        if (!finite(length) || length <= 0 || !finite(allowance) || !(allowance > depth + .05) ||
          !Array.isArray(cut) || cut.length < 3 || !cut.every(pointOK) ||
          !Array.isArray(edgePaths?.[edge]) || edgePaths[edge].length < 2 || !edgePaths[edge].every(pointOK)) {
          fail('UNSAFE_PHYSICAL_BOUNDARY',size,pieceId,notchId,'Nonfinite, degenerate or unsafe offset cutting boundary'); continue
        }
        const gap = Math.min(.045, .38/length)
        const requested = notch.type === 'double' ? [station-gap,station+gap] : [station]
        const emitted = notch.type === 'double' ? [Math.max(.01,requested[0]),Math.min(.99,requested[1])] : requested
        const clipping = requested.some((f,j) => f !== emitted[j])
        const path = edgePaths[edge]
        const spans = path.slice(1).map((p,j) => Math.hypot(p.x-path[j].x,p.y-path[j].y))
        const total = spans.reduce((a,b) => a+b,0)
        if (!(total>0) || spans.some(span => !finite(span))) {
          fail('DEGENERATE_CURVED_EDGE',size,pieceId,notchId,'Sampled cutting-edge station has no finite arclength'); continue
        }
        const start = edgePaths.slice(0,edge).reduce((n,p) => n+p.length-1,0)
        const marks = emitted.map(f => {
          const target=f*total
          let travelled=0, segment=0
          while (segment<spans.length-1 && travelled+spans[segment]<target) travelled+=spans[segment++]
          const ratio=spans[segment]>0 ? (target-travelled)/spans[segment] : NaN
          const a=cut[(start+segment)%cut.length], b=cut[(start+segment+1)%cut.length]
          return {fraction:f, segment, x:a?.x+(b?.x-a?.x)*ratio, y:a?.y+(b?.y-a?.y)*ratio}
        })
        if (marks.some(mark => !pointOK(mark))) {
          fail('INVALID_PHYSICAL_MARK',size,pieceId,notchId,'Cannot locate finite mark on physical CUT polygon'); continue
        }
        if (clipping) fail('DOUBLE_NOTCH_ENDPOINT_CLIPPING',size,pieceId,notchId,
          `Requested physical stations ${requested.join(', ')} exceed [0.01,0.99]; draft clamps to ${emitted.join(', ')}; factory DXF rejects`)
        checks.push({size,pieceId,notchId,edgeIndex:edge,type:notch?.type??'single',station,lengthCm:length,gap,
          requestedFractions:requested,emittedDraftFractions:emitted,stationShiftCm:requested.map((f,j)=>(emitted[j]-f)*total),
          endpointClipped:clipping,marks})
      }
    }
    for (const p of project.pieces) if (p?.id && !seenPieces.has(String(p.id))) fail('MISSING_GRADED_PIECE',size,String(p.id),'notch-set','Source piece missing in graded size')
  }
  return finish(sizes)
  function finish(checkedSizes) { return {schema:'exo-industrial-double-notch-preflight-study.v1',
    status:issues.length?'blocked':checks.length?'pass':'not_configured',blockers:issues.length,issues,checks,checkedSizes:[...checkedSizes],
    factoryCertified:false,factoryCuttingAuthorized:false,factoryDxfGeometryVerified:false} }
}
