import { evaluatePpfFitAcceptance } from '../../ppf_backend/fitAcceptance.mjs'

// The app status feed contains summaries, not the PC2 trajectory itself.
// Never interpret an unloaded summary as independently verified physical fit.
export function inspectSewingFitVerification20261024({
  ppfJob = null, nativeResult = null, nativeAssembly = null, evidence = null,
} = {}) {
  const issues = []
  const active = ppfJob?.status === 'running' || ppfJob?.status === 'queued' ||
    ppfJob?.status === 'connecting'
  if (active) issues.push('Physical sewing and collision checks are still running.')
  if (ppfJob?.status === 'error' || ppfJob?.status === 'failed')
    issues.push(ppfJob.error || 'Physical sewing job failed.')
  const reported = ppfJob?.status === 'done' ? ppfJob.summary : null
  if (reported?.fitAcceptance?.accepted !== true) {
    if (ppfJob?.status === 'done') {
      issues.push('The completed PPF solver has not passed its own fit-acceptance gate.')
      if (Number.isInteger(reported?.contact?.maxAvatarIntersectionPairs) &&
        reported.contact.maxAvatarIntersectionPairs > 0)
        issues.push(`Body intersections detected: ${reported.contact.maxAvatarIntersectionPairs} triangle pairs.`)
      if (Number.isInteger(reported?.contact?.maxSelfIntersectionPairs) &&
        reported.contact.maxSelfIntersectionPairs > 0)
        issues.push(`Fabric self-intersections detected: ${reported.contact.maxSelfIntersectionPairs} triangle pairs.`)
    } else if (!active && !ppfJob?.error) issues.push('No completed PPF collision and fit trajectory supplied.')
  } else issues.push('PPF service reports fit acceptance; verify the stored PC2 frames and original reports before independent certification.')
  if (nativeResult?.fitAssessment?.status === 'FAILED')
    issues.push('Native XPBD trajectory failed its structural, seam, or collision gate.')
  else if (nativeResult?.fitAssessment?.status)
    issues.push(`Native XPBD fit status is ${nativeResult.fitAssessment.status}; full CCD evidence is required.`)
  if (nativeAssembly?.status === 'STAGING_REQUIRES_REPAIR')
    issues.push('Native initial cloth pose still requires sewn-panel assembly repair.')
  let trajectory = null
  if (evidence) {
    try {
      const {contact,sewing,ipcCcd,clearance,solver,sourceVerified=false} = evidence
      // The caller must explicitly supply a verified on-disk PC2/source
      // correlation; aggregate reports cannot establish byte provenance.
      const gate=evaluatePpfFitAcceptance({contact,sewing,requiresIpcCcd:true,
        ipcCcd,requiresShoulderFit:true,clearance})
      const nativeSolverVerified = solver?.ok === true && solver?.device === 'GPU' &&
        solver?.backendType === 'mac_native' && solver?.pc2?.finite === true
      const accepted = sourceVerified===true && nativeSolverVerified && gate.accepted
      trajectory={accepted,sourceVerified:sourceVerified===true,nativeSolverVerified,gate}
      if(!accepted)issues.push('Full physical trajectory provenance, CCD, seam, strain, or shoulder clearance verification failed.')
    } catch {
      trajectory={accepted:false,sourceVerified:false}
      issues.push('Invalid physical simulation evidence.')
    }
  }
  return {
    status:trajectory?.accepted?'EVIDENCE_ACCEPTED':
      ppfJob?.status==='done'?'SOLVED_REQUIRES_VERIFICATION':
        active?'SOLVING':ppfJob?.status==='error'||ppfJob?.status==='failed'?'SOLVER_ERROR':'UNVERIFIED',
    ppfReportedAcceptance:reported?.fitAcceptance?.accepted===true,
    realTrajectoryEvidenceAccepted:trajectory?.accepted===true,
    trajectory,
    issues,
    manufacturingApproved:false,
    factoryFitCertified:false,
  }
}
