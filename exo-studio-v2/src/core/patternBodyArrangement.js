// Anatomical roles for editable 2D cut pieces. These affect the initial 3D
// arrangement only: 2D contours, edge indices, sewing, fabrics and grading
// remain authoritative and unchanged. Ambiguous pieces stay unassigned.
import {rustInferBodyRole,rustBodyInferredOffset} from './rustBodyArrangementKernel.js'

export function inferPatternBodyRole(piece, project = {}) {
  return rustInferBodyRole(piece,project)
}

function inferredOffset(role, piece) {
  return rustBodyInferredOffset(role,piece)
}

export function resolvePatternArrangement(piece, project = {}) {
  const existing = piece?.arrangement3d || {}
  const role = inferPatternBodyRole(piece, project)
  if (!role || (existing.wrap && existing.wrap !== 'flat')) return existing
  const defaults = inferredOffset(role, piece)
  return { ...defaults, ...existing, wrap: role,
    // Imported panels without a placement tend to supply x/y/z=0 as a
    // placeholder; use anatomical defaults in that specific case.
    ...(Object.keys(existing).length && ['x','y','z'].every(axis => Number(existing[axis] || 0) === 0)
      ? defaults : {}),
    flip: existing.flip ?? (role.startsWith('right-leg-')),
  }
}

export function arrangePatternProject(project) {
  if (!project || !Array.isArray(project.pieces)) return project
  return { ...project, pieces: project.pieces.map(piece => ({ ...piece,
    arrangement3d: resolvePatternArrangement(piece, project),
  })) }
}
