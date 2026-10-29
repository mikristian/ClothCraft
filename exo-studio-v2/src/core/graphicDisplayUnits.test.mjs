import test from 'node:test'
import assert from 'node:assert/strict'
import {graphicDisplayUnit,graphicMmToDisplay,graphicDisplayToMm} from './graphicDisplayUnits.js'

test('graphic displayed dimensions roundtrip for mm cm and inches without changing physical millimetres',()=>{
  for(const [unit,display] of [['mm',254],['cm',25.4],['in',10]]){
    assert.equal(graphicDisplayUnit(unit),unit)
    assert.ok(Math.abs(graphicMmToDisplay(254,unit)-display)<1e-9)
    assert.ok(Math.abs(graphicDisplayToMm(display,unit)-254)<1e-9)
  }
  assert.equal(graphicDisplayUnit(undefined),'mm')
  assert.equal(graphicDisplayUnit('bogus'),'mm')
  assert.equal(graphicDisplayToMm(25.4,'cm'),254)
})
