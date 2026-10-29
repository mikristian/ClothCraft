import { gradeProject } from './grading.js'
import { samplePieceBoundary, seamAllowanceBoundary } from './project.js'
import { inspectCutlinePolygon } from './cutlineTopology.js'
import { inspectGradedCutlines } from './industrialCutlineQA.js'

/** Read-only development diagnostics for an opt-in canonical CLO project.
 * All derived sizes use the existing generic automatic grade rules; no grade
 * increment here is an approved factory specification.
 */
export function studyCloSmallSizeGrades(project, { sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] } = {}) {
  const results = []
  for (const size of sizes) {
    const graded = gradeProject(project, size)
    const summary = inspectGradedCutlines(project, { sizes: [size] })
    const pieces = []
    for (const piece of graded.pieces) {
      const boundary = samplePieceBoundary(piece, 12)
      const stitch = boundary.points
      const cut = seamAllowanceBoundary(piece, 12)
      const vertexToSourceEdge = boundary.edgePaths.flatMap((edge, edgeIndex) =>
        Array.from({ length: edge.length - 1 }, () => edgeIndex))
      const contours = [
        { kind: 'STITCH', points: stitch },
        { kind: 'CUT', points: cut },
      ]
      for (const contour of contours) {
        const qa = inspectCutlinePolygon(contour.points)
        const intersections = []
        const pts = contour.points
        const orient = (a, b, c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
        const within = (p, a, b) => p.x >= Math.min(a.x,b.x)-1e-7 && p.x <= Math.max(a.x,b.x)+1e-7 && p.y >= Math.min(a.y,b.y)-1e-7 && p.y <= Math.max(a.y,b.y)+1e-7
        const touches = (a,b,p) => Math.abs(orient(a,b,p)) <= 1e-7 && within(p,a,b)
        for (let i=0; i<pts.length; i++) for (let j=i+2; j<pts.length; j++) {
          if (i===0 && j===pts.length-1) continue
          const a=pts[i], b=pts[(i+1)%pts.length], c=pts[j], d=pts[(j+1)%pts.length]
          if (Math.max(a.x,b.x)<Math.min(c.x,d.x)-1e-7 || Math.max(c.x,d.x)<Math.min(a.x,b.x)-1e-7 ||
              Math.max(a.y,b.y)<Math.min(c.y,d.y)-1e-7 || Math.max(c.y,d.y)<Math.min(a.y,b.y)-1e-7) continue
          const abC=orient(a,b,c), abD=orient(a,b,d), cdA=orient(c,d,a), cdB=orient(c,d,b)
          const proper = abC*abD < -1e-14 && cdA*cdB < -1e-14
          if (!proper && !touches(a,b,c) && !touches(a,b,d) && !touches(c,d,a) && !touches(c,d,b)) continue
          const denom = (b.x-a.x)*(d.y-c.y)-(b.y-a.y)*(d.x-c.x)
          const t = Math.abs(denom)>1e-12 ? ((c.x-a.x)*(d.y-c.y)-(c.y-a.y)*(d.x-c.x))/denom : null
          intersections.push({ segmentA:i, segmentB:j, sourceEdgeA:vertexToSourceEdge[i],
            sourceEdgeB:vertexToSourceEdge[j], type:proper?'crossing':'touch-or-overlap',
            location:t===null?null:{x:+(a.x+t*(b.x-a.x)).toFixed(5),y:+(a.y+t*(b.y-a.y)).toFixed(5)} })
        }
        if (!qa.ok) pieces.push({ pieceId:piece.id, contour:contour.kind, faults:qa.faults,
          intersections, sampledPointCount:pts.length })
      }
    }
    results.push({ size, status:summary.status, blockers:summary.blockers, pieces })
  }
  return { source:'clo-male-tshirt-imported-reference', approval:'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED',
    gradePolicy:'installed-generic-automatic-rules-read-only', factoryCertified:false,
    baseSizePreserved: true, results }
}
