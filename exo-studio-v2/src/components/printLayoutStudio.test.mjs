import {test} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createServer} from 'vite'

const square=()=>({points:[[0,0],[.4,0],[.4,.6],[0,.6]],edges:['a','b','c','d'],curves:{}})
const panel=(id,fabric)=>({id,name:`T-shirt ${id}`,fabric,polygon:square()})

test('all-pieces marker shows front and back across distinct fabrics; incomplete source blocks print',async()=>{
  const vite=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'silent'})
  try{
    const {default:PrintLayoutStudio}=await vite.ssrLoadModule('/src/components/PrintLayoutStudio.jsx')
    const original={template:{name:'T-shirt',panels:[panel('front','cotton'),panel('back','rib-knit')],
      seams:[{id:'side',a:{panel:'front'},b:{panel:'back'}}]}}
    const markup=renderToStaticMarkup(React.createElement(PrintLayoutStudio,{source:original,native:true,embedded:false}))
    assert.match(markup,/data-print-all-pieces="true"/)
    assert.match(markup,/data-print-visible-pieces="2" data-print-total-pieces="2"/)
    assert.match(markup,/data-print-source-coverage="2\/2"/)
    assert.match(markup,/Viewing every garment piece together/)
    assert.match(markup,/data-print-roll-canvas="true"/)
    assert.match(markup,/data-print-full-paper="true"/)
    assert.match(markup,/data-print-paper-end="true"/)
    assert.match(markup,/data-print-complete-paper-edge="true"/)
    assert.doesNotMatch(markup,/data-print-paper-tile-guides="true"/)
    assert.match(markup,/fill="#c7c7c7" data-print-paper-surface="true"/)
    // Placement state is populated after mount, so canvas pieces are verified
    // separately in the real browser test rather than in server static markup.
    assert.match(markup,/data-print-board-view="true"/)
    assert.match(markup,/data-print-pages-view="true"/)
    assert.match(markup,/data-print-toggle-guides="true" aria-pressed="true"/)
    assert.match(markup,/data-print-toggle-measurements="true" aria-pressed="true"/)
    assert.match(markup,/data-print-guide-setting="chest" checked=""/)
    assert.match(markup,/data-print-guide-setting="center" checked=""/)
    assert.match(markup,/data-print-guide-setting="belly" checked=""/)
    assert.match(markup,/T-shirt front/)
    assert.match(markup,/T-shirt back/)
    assert.doesNotMatch(markup,/data-print-completeness-warnings=/)
    const incomplete={template:{name:'T-shirt',panels:[panel('front','cotton')],seams:[]}}
    const invalid=renderToStaticMarkup(React.createElement(PrintLayoutStudio,{source:incomplete,native:true,embedded:false}))
    assert.match(invalid,/data-print-completeness-warnings="1"/)
    assert.match(invalid,/T-shirt source missing back panel/)
    assert.match(invalid,/disabled=""[^>]*>PDF</)
  }finally{await vite.close()}
})
