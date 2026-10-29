import assert from 'node:assert/strict'
import { createTemplateProject, GARMENT_TEMPLATES } from '../src/data/templates.js'
import { templateMatchesFolder } from '../src/data/libraryFolderTree.js'
import fixture from '../src/data/avatarWornTeeNativeFixture.json' with { type: 'json' }
import { createAvatarWornTeeDisplay } from '../src/core/avatarWornTeeDisplay.js'

const project = createTemplateProject('avatar-worn-tee')
assert.equal(GARMENT_TEMPLATES.filter(t => t.id === 'avatar-worn-tee').length, 1)
assert.ok(templateMatchesFolder({ id: 'avatar-worn-tee' }, 'tees'))
assert.equal(fixture.name, 'tshirt / MakeHuman 1.75 m engineering fixture')
assert.deepEqual(project.pieces.map(p => p.id), ['front', 'back', 'panel_1'])
assert.equal(project.seams.length, 8)
assert.deepEqual(project.nativeFixture, fixture)
for (let i = 0; i < fixture.panels.length; i++) {
  const panel = fixture.panels[i]
  for (let j = 0; j < panel.polygon.points.length; j++) {
    assert.ok(Math.abs(project.pieces[i].points[j].x / 100 - panel.polygon.points[j][0]) < 1e-12)
    assert.ok(Math.abs(project.pieces[i].points[j].y / 100 - panel.polygon.points[j][1]) < 1e-12)
  }
}
const before = JSON.stringify(project.pieces)
const display = createAvatarWornTeeDisplay(project)
assert.equal(display.userData.nativePanelCount, 3)
assert.ok(display.children.length > 3)
assert.ok(display.children.every(child => child.userData.presentationOnly))
assert.equal(JSON.stringify(project.pieces), before)
console.log('PASS native fixture: 3 authored source panels, 8 seams, stage display, editable panels unchanged')
