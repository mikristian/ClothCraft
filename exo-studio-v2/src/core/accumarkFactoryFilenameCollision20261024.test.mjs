import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'

function rejected(label, change) {
  test(label, () => {
    const project = createTeeTemplate()
    change(project)
    const before = structuredClone(project)
    assert.throws(() => buildFactoryPackageFiles(project), /Factory package refused:/)
    assert.deepEqual(project, before)
  })
}

for (const size of ['../M', '..', 'M/L', 'M\\L', 'Ｍ', 'M..L', '.hidden', 'M\u2024L', 'M!']) {
  rejected(`reject unsafe grading size ${JSON.stringify(size)}`, p => { p.grading.sizes = [size] })
}
rejected('reject case-folded grading size collisions', p => { p.grading.sizes = ['M', 'm'] })
rejected('reject slug-normalized grading size collisions', p => { p.grading.sizes = ['A-B', 'A_B'] })
rejected('reject size M vs M! before marker or optional neckband filename generation', p => { p.grading.sizes = ['M', 'M!'] })
rejected('reject oversized grading size run', p => { p.grading.sizes = Array.from({length: 33}, (_, i) => `S${i}`) })
rejected('reject oversized grading size label', p => { p.grading.sizes = ['A'.repeat(65)] })
rejected('reject marker fabric IDs that produce the same output name', p => {
  p.pieces[0].fabricId = 'main a'
  p.pieces[1].fabricId = 'main-a'
})
rejected('reject duplicate marker output from implicit main and explicit main', p => {
  p.pieces[0].fabricId = 'main'
  p.pieces[1].fabricId = 'MAIN'
})

test('valid six-size and single-size filenames are stable and unique', () => {
  for (const single of [false, true]) {
    const project = createTeeTemplate()
    if (single) project.grading.sizes = [project.grading.baseSize]
    const before = structuredClone(project)
    const files = buildFactoryPackageFiles(project)
    const paths = Object.keys(files)
    assert.equal(new Set(paths.map(path => path.toLowerCase())).size, paths.length)
    assert.equal(paths.filter(path => path.startsWith('patterns/') && path.endsWith('.dxf')).length, project.grading.sizes.length)
    assert.deepEqual(project, before)
  }
})
