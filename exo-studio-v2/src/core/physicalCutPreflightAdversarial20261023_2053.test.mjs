import test from 'node:test'
import assert from 'node:assert/strict'
import {preflightPhysicalCutOverlap20261023_2000 as check} from './physicalCutOverlapPreflight20261023_2000.mjs'

const rectangle = (layer = 'CUT_A') => ['0','LWPOLYLINE','8',layer,'90','4','70','1','10','0','20','0','10','10','20','0','10','10','20','10','10','0','20','10']
const source = (entities, prefix = ['0','SECTION','2','ENTITIES'], suffix = ['0','ENDSEC','0','EOF']) => [...prefix,...entities,...suffix,''].join('\n')
const invalid = (dxf, reason) => {
  const result = check(dxf)
  assert.equal(result.ok, false, `${reason}: ${JSON.stringify(result)}`)
  assert.equal(result.diagnostics[0]?.code, 'INVALID_CUT_DXF', `${reason}: ${JSON.stringify(result)}`)
}

test('rejects invalid multiplicity, numeric coordinates, unsupported CUT entity and open ring', () => {
  const base = rectangle()
  invalid(source([...base,'8','CUT_B']), 'duplicate layer code')
  invalid(source(base.map(v => v).join('\n').replace('10\n0\n20\n0', '10\nInfinity\n20\n0').split('\n')), 'infinite x')
  invalid(source(['0','CIRCLE','8','CUT_A','10','0','20','0','40','5']), 'unsupported CUT circle')
  invalid(source(base.map((v,i) => i === 7 ? '0' : v)), 'open ring')
})

for (const [name, dxf] of [
  ['missing ENDSEC', source(rectangle(), ['0','SECTION','2','ENTITIES'], ['0','EOF'])],
  ['nested SECTION inside ENTITIES', source(['0','SECTION','2','HEADER', ...rectangle()])],
  ['unmatched ENDSEC', source(rectangle(), ['0','ENDSEC','0','SECTION','2','ENTITIES'])],
  ['extra ENDSEC', source(rectangle(), ['0','SECTION','2','ENTITIES'], ['0','ENDSEC','0','ENDSEC','0','EOF'])],
  ['nonzero CUT elevation', source([...rectangle(),'38','3'])],
  ['nonplanar CUT extrusion', source([...rectangle(),'210','0','220','1','230','0'])],
]) test(`rejects ${name}`, () => invalid(dxf, name))

test('detects interior overlap for nested rings with reversed winding', () => {
  const inner = ['0','LWPOLYLINE','8','CUT_B','90','4','70','1',
    '10','2','20','2','10','2','20','8','10','8','20','8','10','8','20','2']
  const result = check(source([...rectangle(),...inner]))
  assert.equal(result.ok,false,JSON.stringify(result))
  assert.equal(result.overlaps[0]?.code,'PHYSICAL_CUT_INTERIOR_OVERLAP')
})
