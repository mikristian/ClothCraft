import test from 'node:test'
import assert from 'node:assert/strict'
import source from '../../research/accumark-v10-playlist/ACCUMARK_FUNCTION_ENGINEERING_INDEX.json' with { type: 'json' }
import { ACCUMARK_2D_COMMANDS, ACCUMARK_2D_GROUPS, ACCUMARK_2D_UI_SUMMARY, findAccuMark2DCommand } from './accumark2dCommandRegistry.js'

test('all researched commands are represented once, with intact primary evidence', () => {
  assert.equal(source.items.length, 33)
  assert.equal(ACCUMARK_2D_COMMANDS.length, 33)
  assert.equal(new Set(ACCUMARK_2D_COMMANDS.map(({ id }) => id)).size, 33)
  assert.deepEqual(ACCUMARK_2D_COMMANDS.map(({ id }) => id), source.items.map(({ id }) => id))
  for (const [index, command] of ACCUMARK_2D_COMMANDS.entries()) {
    assert.deepEqual(command.sourceIds, source.items[index].official_source_ids)
    assert.ok(command.helpUrl?.startsWith('https://'))
    assert.ok(command.purpose)
    assert.equal(findAccuMark2DCommand(command.id), command)
  }
  assert.equal(findAccuMark2DCommand('missing'), null)
})

test('live routes target actual App affordances, advanced grading remains reference', () => {
  const validKinds = new Set(['slot', 'tool', 'inspector', 'toggle-nest', 'export-dxf', 'export-size-run', 'import-dxf', 'export-rules', 'import-rules', 'print', 'reference','engineering-grade','engineering-constraint','engineering-draft','engineering-marker','export-factory-package'])
  const toolTargets = new Set(['curve', 'split'])
  const expectedSlots = new Map([['accu.draft.trace','A07'], ['accu.seam.allowance','A09'], ['accu.seam.walk','A10'], ['accu.seam.notch','A08']])
  for (const command of ACCUMARK_2D_COMMANDS) {
    assert.ok(validKinds.has(command.route.kind), command.id)
    assert.equal(command.implemented, command.route.kind !== 'reference', command.id)
    if (command.route.kind === 'reference') assert.equal(command.route.target, undefined)
    if (command.route.kind === 'tool') assert.ok(toolTargets.has(command.route.target), command.id)
    if (command.route.kind === 'slot') assert.equal(command.route.target, expectedSlots.get(command.id), command.id)
    if (command.route.kind === 'inspector') assert.ok(['grading','quality','markers','workspace','models','commands'].includes(command.route.target), command.id)
    assert.ok(Object.isFrozen(command))
    assert.ok(Object.isFrozen(command.route))
    assert.ok(Object.isFrozen(command.sourceIds))
  }
  for (const suffix of ['offset','smooth']) assert.equal(findAccuMark2DCommand(`accu.grading.${suffix}`).route.kind,'engineering-grade')
  for (const suffix of ['intersection','keep_angle']) assert.equal(findAccuMark2DCommand(`accu.grading.${suffix}`).route.kind,'engineering-constraint')
  for(const suffix of ['dart','fullness','alter'])assert.equal(findAccuMark2DCommand(`accu.draft.${suffix}`).route.kind,'engineering-draft')
  assert.equal(findAccuMark2DCommand('accu.output.plot').route.kind,'engineering-marker')
  assert.equal(findAccuMark2DCommand('accu.grading.rule_table').route.target, 'grading')
  assert.equal(findAccuMark2DCommand('accu.grading.qa').route.target, 'quality')
  for (const suffix of ['setup', 'nest', 'cost']) assert.equal(findAccuMark2DCommand(`accu.marker.${suffix}`).route.target, 'markers')
  assert.equal(findAccuMark2DCommand('accu.draft.line').route.kind,'reference')
  assert.equal(findAccuMark2DCommand('accu.grading.point').route.target, 'grading')
  assert.equal(findAccuMark2DCommand('accu.grading.nest').route.kind, 'toggle-nest')
})

test('immutable groups and UI summary cover the same 33 commands without source mutation', () => {
  const before = JSON.stringify(source)
  assert.equal(ACCUMARK_2D_UI_SUMMARY.total, 33)
  assert.equal(ACCUMARK_2D_UI_SUMMARY.grading, 11)
  assert.equal(ACCUMARK_2D_UI_SUMMARY.implemented + ACCUMARK_2D_UI_SUMMARY.reference, 33)
  assert.deepEqual(ACCUMARK_2D_GROUPS.flatMap(({ commands }) => commands.map(({ id }) => id)).sort(), ACCUMARK_2D_COMMANDS.map(({ id }) => id).sort())
  for (const group of ACCUMARK_2D_GROUPS) {
    assert.ok(Object.isFrozen(group))
    assert.ok(Object.isFrozen(group.commands))
    assert.ok(group.commands.every((command) => command.domain === group.id))
  }
  assert.equal(JSON.stringify(source), before)
})
