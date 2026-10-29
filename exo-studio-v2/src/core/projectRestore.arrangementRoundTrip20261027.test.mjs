import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { readSavedProject, writeSavedProject } from './projectRestore.js'
import { stagedPanelPositions } from './staging.js'

const memoryStorage = () => {
  const contents = new Map()
  return {
    getItem: key => contents.get(key) ?? null,
    setItem: (key, value) => contents.set(key, value),
  }
}

test('authored CLO-style 3D placement remains exact across garment save and reopen', () => {
  const project = createTeeTemplate(), storage = memoryStorage()
  const piece = project.pieces[0]
  piece.arrangement3d = {
    ...piece.arrangement3d,
    stagingOffsetX: -.125,
    stagingOffsetY: .246,
    stagingOffsetZ: -.073,
    stagingRotationX: 11.125,
    stagingRotationY: -92.5,
    stagingRotationZ: 37.25,
  }
  const expected = structuredClone(piece.arrangement3d)
  writeSavedProject(storage, 'garment', 'backup', project)
  const reopened = readSavedProject(storage, 'garment', 'backup')
  assert.equal(reopened.status, 'primary')
  assert.deepEqual(reopened.project.pieces[0].arrangement3d, expected)
  // Reopen must feed the same real staging geometry that the viewport uses;
  // preserving a JSON field alone would not guarantee an unchanged 3D pose.
  const stage = (savedProject) => {
    const panel = savedProject.pieces[0]
    return stagedPanelPositions({piece:panel,flatVertices:panel.points},savedProject.avatar)
      .map(point=>point.toArray())
  }
  assert.deepEqual(stage(reopened.project),stage(project))
})

test('non-finite or malformed arrangement cannot silently reset seam staging on reopen', () => {
  const project = createTeeTemplate(), storage = memoryStorage()
  writeSavedProject(storage, 'garment', 'backup', project)
  const saved = storage.getItem('garment')
  for (const [field, bad] of [
    ['stagingOffsetX', Infinity],
    ['stagingOffsetZ', NaN],
    ['stagingRotationY', '90'],
    ['sewingClearanceM', null],
  ]) {
    const corrupted = structuredClone(project)
    corrupted.pieces[0].arrangement3d = { ...corrupted.pieces[0].arrangement3d, [field]: bad }
    assert.throws(() => writeSavedProject(storage, 'garment', 'backup', corrupted), /3D arrangement/)
    assert.equal(storage.getItem('garment'), saved)
  }
  const corrupted = structuredClone(project)
  corrupted.pieces[0].arrangement3d.stagingOffsetX = Infinity
  storage.setItem('garment', JSON.stringify(corrupted))
  assert.equal(JSON.parse(storage.getItem('garment')).pieces[0].arrangement3d.stagingOffsetX, null)
  const result = readSavedProject(storage, 'garment', 'backup')
  assert.equal(result.status, 'backup')
  assert.deepEqual(result.project.pieces[0].arrangement3d, project.pieces[0].arrangement3d)
})
