import {restoreShapeCode} from './rustRestoreKernel.js'
import {assertFreshIndustrialAllowanceGraph20261027} from './industrialAllowanceGraph20261027.js'
import {assertFreshModarisSizeLinkedGradeProject20261027} from './modarisSizeLinkedGradePersistence20261027.js'
import {assertFreshModarisGradedNotchLink20261027} from './modarisGradedNotchLinkPersistence20261027.js'

export function validateSavedProject(project, { legacy = false } = {}) {
  const shape=restoreShapeCode(project)
  if(shape===1) throw new Error('Project must be an object')
  if(shape===2) throw new Error('Project patterns or seams are missing')
  if ((!legacy || project.fabrics != null) && (!project.fabrics || typeof project.fabrics !== 'object' || Array.isArray(project.fabrics))) throw new Error('Project fabrics are invalid')
  if ((!legacy || project.simulation != null) && (!project.simulation || typeof project.simulation !== 'object' || Array.isArray(project.simulation))) throw new Error('Project simulation settings are invalid')
  if (project.pieces.some(piece => !piece || typeof piece.id !== 'string' || !Array.isArray(piece.points) || piece.points.some(point => !Number.isFinite(point?.x) || !Number.isFinite(point?.y)))) {
    throw new Error('Project contains invalid pattern geometry')
  }
  // Authored 3D arrangement values must remain numeric through JSON save and
  // reopen. Otherwise NaN/Infinity turn into null and a panel silently moves
  // back to its default location, changing the seam staging of the garment.
  const arrangementNumbers = [
    'x', 'y', 'z', 'stagingOffsetX', 'stagingOffsetY', 'stagingOffsetZ',
    'stagingRotationX', 'stagingRotationY', 'stagingRotationZ', 'sewingClearanceM',
  ]
  for (const piece of project.pieces) {
    if (piece.arrangement3d === undefined) continue
    const arrangement = piece.arrangement3d
    if (!arrangement || typeof arrangement !== 'object' || Array.isArray(arrangement))
      throw new Error(`Project 3D arrangement for ${piece.id} is invalid`)
    for (const field of arrangementNumbers) {
      if (!Object.hasOwn(arrangement, field)) continue
      if (typeof arrangement[field] !== 'number' || !Number.isFinite(arrangement[field]))
        throw new Error(`Project 3D arrangement ${piece.id}.${field} is invalid`)
    }
  }
  if (project.avatar != null) {
    if (typeof project.avatar !== 'object' || Array.isArray(project.avatar))
      throw new Error('Project avatar measurements are invalid')
    const positiveFields = ['heightCm', 'chestCm', 'waistCm', 'hipCm', 'shoulderWidthCm', 'neckCm', 'bicepCm', 'armLengthCm']
    const boundedFields = ['armAngleDeg', 'visibility']
    for (const field of [...positiveFields, ...boundedFields]) {
      if (project.avatar[field] == null) continue
      const value = project.avatar[field]
      if (typeof value !== 'number' || !Number.isFinite(value) || (positiveFields.includes(field) && value <= 0) ||
          (field === 'visibility' && (value < 0 || value > 1)))
        throw new Error(`Project avatar ${field} is invalid`)
    }
  }
  if (project.customMeasurements != null) {
    if (!Array.isArray(project.customMeasurements)) throw new Error('Project custom measurements are invalid')
    const pieceIds = new Set(project.pieces.map(piece => piece.id))
    for (const measurement of project.customMeasurements) {
      if (!measurement || typeof measurement !== 'object' || Array.isArray(measurement))
        throw new Error('Project custom measurement is invalid')
      if (measurement.pieceId != null &&
          (typeof measurement.pieceId !== 'string' || !pieceIds.has(measurement.pieceId)))
        throw new Error('Project custom measurement references unknown pattern piece')
      for (const endpoint of ['a', 'b']) {
        if (measurement[endpoint] == null) continue
        const point = measurement[endpoint]
        if (!point || typeof point !== 'object' || !Number.isFinite(point.x) || !Number.isFinite(point.y))
          throw new Error(`Project custom measurement ${endpoint} is invalid`)
      }
      if (measurement.toleranceCm != null && (!Number.isFinite(measurement.toleranceCm) || measurement.toleranceCm < 0))
        throw new Error('Project custom measurement tolerance is invalid')
    }
  }
  // Persisted cross-piece allowances must never reopen with deleted source
  // edges, forged target values, cyclic links or an incompatible size run.
  // Re-evaluation here is validation only: it clones and returns a proposal,
  // and does NOT silently rewrite a saved garment or grant factory approval.
  if (Object.hasOwn(project, 'industrialAllowanceGraph')) {
    try {
      assertFreshIndustrialAllowanceGraph20261027(project,{expectedRevision:project.revision})
    } catch (error) {
      throw new Error(`Project linked seam allowances are invalid: ${error.message}`)
    }
  }
  // Linked multi-size point rules are persisted in the legacy project. Reject
  // stale or forged derived rules on BOTH save and reopen, so a changed root
  // cannot silently serialize targets belonging to an older size evolution.
  if (Object.hasOwn(project, 'modarisSizeLinkedGrade')) {
    try {
      assertFreshModarisSizeLinkedGradeProject20261027(project)
    } catch (error) {
      throw new Error(`Project linked grading is invalid: ${error.message}`)
    }
  }
  // A graded source-to-target notch graph is admitted only with unchanged
  // authenticated root geometry/size metadata and precisely reapplied target
  // fractions. Never overwrite a valid backup with an out-of-band notch edit.
  if (Object.hasOwn(project, 'modarisGradedNotchLink')) {
    try {
      assertFreshModarisGradedNotchLink20261027(project)
    } catch (error) {
      throw new Error(`Project linked graded notches are invalid: ${error.message}`)
    }
  }
  return project
}

export function readSavedProject(storage, primaryKey, backupKey) {
  const primary = storage.getItem(primaryKey)
  if (!primary) {
    const backup = storage.getItem(backupKey)
    if (!backup) return { project: null, status: 'empty' }
    try {
      return { project: validateSavedProject(JSON.parse(backup), { legacy: true }), status: 'backup', error: 'Primary saved project is missing' }
    } catch (error) {
      return { project: null, status: 'failed', error: `Primary saved project is missing and backup is invalid: ${error.message}` }
    }
  }
  try {
    return { project: validateSavedProject(JSON.parse(primary), { legacy: true }), status: 'primary' }
  } catch (primaryError) {
    const backup = storage.getItem(backupKey)
    if (backup) {
      try {
        return { project: validateSavedProject(JSON.parse(backup), { legacy: true }), status: 'backup', error: primaryError.message }
      } catch { /* keep broken originals available for manual recovery */ }
    }
    return { project: null, status: 'failed', error: primaryError.message }
  }
}

export function writeSavedProject(storage, primaryKey, backupKey, project) {
  validateSavedProject(project)
  const serialized = JSON.stringify(project)
  const previous = storage.getItem(primaryKey)
  if (previous) {
    try {
      validateSavedProject(JSON.parse(previous), { legacy: true })
      storage.setItem(backupKey, previous)
    } catch { /* never overwrite a good backup with corrupted data */ }
  }
  storage.setItem(primaryKey, serialized)
  // Seed recovery on the first successful save. Never replace an existing
  // backup when the primary was missing or corrupt (including after recovery).
  if (!previous && !storage.getItem(backupKey)) {
    try {
      storage.setItem(backupKey, serialized)
    } catch { /* primary save succeeded; quota pressure must not invalidate it */ }
  }
}
