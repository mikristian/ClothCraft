import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createServer} from 'vite'

test('actual native shirt panels display working numerical construction and curved station controls',async()=>{
  const fixture=JSON.parse(readFileSync(new URL('../data/avatarWornTeeNativeFixture.json',import.meta.url),'utf8'))
  const snapshot={revision:11,template:fixture}
  const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
  try{
    const {default:Numeric}=await vite.ssrLoadModule('/src/components/NativePatternConstructionTools20261023.jsx')
    const {default:Station}=await vite.ssrLoadModule('/src/components/NativeCurveStationTool20261023.jsx')
    const numeric=renderToStaticMarkup(createElement(Numeric,{snapshot,selected:{panel:'front'}}))
    assert.match(numeric,/data-native-construction-tool="true"/)
    assert.match(numeric,/aria-label="Numerical construction method"/)
    assert.match(numeric,/Perpendicular distance from point A/)
    assert.match(numeric,/Intersection of infinite lines/)
    assert.match(numeric,/aria-label="Construction target point"/)
    assert.match(numeric,/data-construction-valid="true"/)
    assert.match(numeric,/Apply with native Undo/)
    assert.doesNotMatch(numeric,/FACTORY APPROVED/)
    const station=renderToStaticMarkup(createElement(Station,{snapshot,selected:{panel:'front'}}))
    assert.match(station,/data-native-curve-station="true"/)
    assert.match(station,/aria-label="Curve station named edge"/)
    assert.match(station,/data-curve-station-status="ready"/)
    assert.match(station,/Split boundary · native Undo/)
    const blank=renderToStaticMarkup(createElement(Station,{snapshot:{revision:11,template:{panels:[]}}}))
    assert.match(blank,/data-curve-station-status="blocked"/)
    assert.match(blank,/disabled=""/)
  }finally{await vite.close()}
})
