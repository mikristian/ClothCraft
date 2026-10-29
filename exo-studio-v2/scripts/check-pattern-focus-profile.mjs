import assert from 'node:assert/strict'
import { WORKSPACE_PROFILES, normalizeWorkspaceProfile, patternFocusToolbarIds } from '../src/core/workspaceProfiles.js'
import { CLO_MENUS } from '../src/core/cloMenus.js'
import { readFileSync } from 'node:fs'

const preset = normalizeWorkspaceProfile(WORKSPACE_PROFILES.patternFocus)
assert.equal(preset.viewportLayout, '2d')
assert.equal(preset.section, 'Pattern')
assert.equal(preset.patternFocus, true)
assert.equal(normalizeWorkspaceProfile(WORKSPACE_PROFILES.drafting).patternFocus, false)
const userOrder = ['2d:measure','2d:sew','2d:points','2d:notch','2d:curve']
const snapshot = userOrder.slice()
assert.deepEqual(patternFocusToolbarIds(userOrder), ['2d:measure','2d:points','2d:notch','2d:curve'])
assert.deepEqual(userOrder,snapshot,'Focus filtering must not mutate saved custom toolbar order')
assert.ok(CLO_MENUS.some(menu=>menu.commands.some(([,command])=>command==='workspace.profile.patternFocus')))
const app = readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8')
assert.match(app,/case 'workspace\.profile\.patternFocus': applyWorkspaceProfile\(WORKSPACE_PROFILES\.patternFocus\)/)
assert.match(app,/toolbarOrder=\{patternFocusActive \? patternFocusToolbarIds\(studioCustomization\.workspace\.rightToolbarIds\)/)
assert.match(app,/onToolbarOrderChange=\{ids=>\{if\(!patternFocusActive\)/)
console.log('Pattern Focus workspace, dispatch, filtering and toolbar preservation checks passed')
