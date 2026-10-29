import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultProject } from '../data/defaultProject.js'
import { buildTechPack } from './measurements.js'

test('tech pack preserves explicitly measured arm length and derives a finite legacy default', () => {
  const project = createDefaultProject()
  const initial = structuredClone(project)
  assert.equal(buildTechPack(project).avatar.armLengthCm, 72)
  assert.deepEqual(project, initial)
  project.avatar.heightCm = 165
  project.avatar.armLengthCm = 67.5
  const techPack = buildTechPack(project)
  assert.equal(techPack.avatar.heightCm, 165)
  assert.equal(techPack.avatar.armLengthCm, 67.5)
})

test('invalid avatar dimensions fail export before non-finite tech pack JSON is produced', () => {
  for (const bad of [NaN, Infinity, -Infinity, 0, -12, '180']) {
    const project = createDefaultProject()
    project.avatar.heightCm = bad
    assert.throws(() => buildTechPack(project), /avatar heightCm/i)
    project.avatar.heightCm = 180
    project.avatar.armLengthCm = bad
    assert.throws(() => buildTechPack(project), /avatar armLengthCm/i)
  }
})
