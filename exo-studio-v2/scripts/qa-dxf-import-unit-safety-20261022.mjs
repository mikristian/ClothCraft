import assert from 'node:assert/strict'
import {parseDxfPatterns} from '../src/core/dxf.js'

const fixture=(unit)=>[
  '0','SECTION','2','HEADER', '9','$INSUNITS','70',String(unit), '0','ENDSEC',
  '0','SECTION','2','ENTITIES', '0','LWPOLYLINE','8','CUT_RECT_M','70','1','90','4',
  '10','0','20','0','10','10','20','0','10','10','20','20','10','0','20','20',
  '0','ENDSEC','0','EOF',
].join('\n')

for (const [unit,scale] of [[1,2.54],[2,30.48],[4,0.1],[5,1],[6,100]]) {
  const result=parseDxfPatterns(fixture(unit))
  assert.equal(result.scaleToCm,scale)
}
for (const unit of [0,3,7,20,999]) {
  assert.throws(()=>parseDxfPatterns(fixture(unit)),/Unsupported or unitless DXF INSUNITS/)
  assert.equal(parseDxfPatterns(fixture(unit),{scaleToCm:0.1}).scaleToCm,0.1)
}
for (const scale of [0,-1,NaN,Infinity,101])
  assert.throws(()=>parseDxfPatterns(fixture(4),{scaleToCm:scale}),/DXF import scale/)
console.log(JSON.stringify({pass:true,knownUnits:5,unsupportedUnitsBlocked:5,explicitOverrides:5,invalidScaleRejected:5}))
