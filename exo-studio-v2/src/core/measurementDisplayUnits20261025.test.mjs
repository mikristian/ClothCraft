import test from 'node:test'
import assert from 'node:assert/strict'
import {toDisplayMeasurement20261025,formatDisplayMeasurement20261025} from './measurementDisplayUnits20261025.js'
import {normalizeStudioCustomization,DEFAULT_STUDIO_CUSTOMIZATION} from './studioCustomization.js'

test('a physical line remains the same length in mm, cm and inches',()=>{
  assert.equal(toDisplayMeasurement20261025(.254,'mm'),254)
  assert.equal(toDisplayMeasurement20261025(.254,'cm'),25.4)
  assert(Math.abs(toDisplayMeasurement20261025(.254,'in')-10)<1e-10)
  assert.equal(formatDisplayMeasurement20261025(.254,'mm'),'254.0 mm')
  assert.equal(formatDisplayMeasurement20261025(.254,'cm'),'25.40 cm')
  assert.equal(formatDisplayMeasurement20261025(.254,'in'),'10.000 in')
  assert.equal(formatDisplayMeasurement20261025(0,'in'),'0.000 in')
  assert.equal(formatDisplayMeasurement20261025(-.0254,'in'),'-1.000 in')
  assert.throws(()=>formatDisplayMeasurement20261025(1,'feet'),/Unsupported measurement unit/)
})

test('persisted preferred unit also drives the CLO unit dropdown',()=>{
  for(const [units,unitSystem] of [['mm','Millimeter'],['cm','Centimeter'],['in','Inch']]){
    const source={preferences:{units},cloSettings:{unitSystem:'Centimeter'}}
    const before=structuredClone(source)
    const normalized=normalizeStudioCustomization(source)
    assert.equal(normalized.preferences.units,units)
    assert.equal(normalized.cloSettings.unitSystem,unitSystem)
    assert.deepEqual(source,before)
  }
  assert.equal(normalizeStudioCustomization(DEFAULT_STUDIO_CUSTOMIZATION).preferences.units,'mm')
})
