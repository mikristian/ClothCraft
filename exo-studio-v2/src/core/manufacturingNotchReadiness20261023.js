/** Isolated pre-export engineering gate. The production release checker is unchanged. */
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'
import {inspectStandaloneNotchesAllSizes20261023} from './standaloneNotchPreflight20261023.js'

export function inspectManufacturingNotchReadiness20261023(project) {
  const release = inspectManufacturingReleaseReadiness(project)
  let standalone
  try {
    standalone = inspectStandaloneNotchesAllSizes20261023(project)
  } catch (error) {
    standalone = {
      status:'blocked', blockers:1, checkedSizes:[], checks:[],
      issues:[{severity:'blocker',code:'STANDALONE_NOTCH_AUDIT_FAILED',size:'all',
        pieceId:'project',notchId:'notch-set',message:String(error?.message || error)}],
    }
  }
  const configuredSizes = Array.isArray(project?.grading?.sizes) ? project.grading.sizes : []
  const complete = standalone.status === 'pass' && standalone.blockers === 0 &&
    standalone.checkedSizes.length === configuredSizes.length &&
    standalone.checkedSizes.every((size,index) => size === configuredSizes[index])
  const notchBlockers = standalone.issues.map(issue => ({
    code:issue.code, reason:issue.message, blockerCount:1,
    size:issue.size, pieceId:issue.pieceId, notchId:issue.notchId,
  }))
  if (!complete && notchBlockers.length === 0) notchBlockers.push({
    code:'STANDALONE_NOTCH_READINESS_UNVERIFIED',
    reason:'All configured graded sizes require a passing standalone physical notch inventory audit',
    blockerCount:1,
  })
  const blockers = [...release.blockers, ...notchBlockers]
  return {
    schema:'exo-manufacturing-notch-readiness-study.v1',
    status:blockers.length ? 'BLOCKED_NOT_APPROVED' : 'EVIDENCE_COMPLETE_REQUIRES_INDEPENDENT_HUMAN_RELEASE',
    engineeringGeometryPass:release.engineeringGeometryPass && complete,
    standaloneNotchGatePass:complete,
    checkedSizes:[...standalone.checkedSizes],
    standaloneNotchStatus:standalone.status,
    standaloneNotchChecks:standalone.checks.length,
    standaloneNotchBlockers:notchBlockers.length,
    blockers,
    existingRelease:release,
    standaloneNotchAudit:standalone,
    factoryCertified:false, factoryCuttingAuthorized:false, bulkProductionAuthorized:false,
    disclaimer:'Development-only combined diagnostic. Does not amend production readiness, exercise offset notch cuts, verify receiving CAD or authorize manufacturing.',
  }
}
