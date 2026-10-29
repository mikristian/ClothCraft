import test from 'node:test'
import assert from 'node:assert/strict'
import {contrastRatio} from './interfaceColorContrast.js'
import {cadAutoContrastColors,separateDraftPaper} from './cadAutoContrast.js'

test('pattern, grade, ruler and measurements adapt to light, dark and custom 2D canvases',()=>{
  for(const canvas of ['#000000','#0f1721','#283c2c','#ffffff','#f6f5ed','#949d9a']){
    const c=cadAutoContrastColors({canvas,paper:'#f4f4f3',edge:'#ffffff',ruler:'#111111',selection:'#232323'})
    assert(contrastRatio(c.ruler,canvas)>=6.95,`ruler on ${canvas}`)
    assert(contrastRatio(c.edge,c.patternPaper)>=6.95,`paper edge on ${canvas}`)
    assert(contrastRatio(c.measure,c.patternPaper)>=6.95,`measurement text on ${canvas}`)
    assert(contrastRatio(c.measurementOutside,canvas)>=6.95,`measurement outside pattern on ${canvas}`)
    assert(contrastRatio(c.gradeMain,canvas)>=6.95,`selected grade on ${canvas}`)
    assert(contrastRatio(c.gradeBase,canvas)>=6.95,`base grade on ${canvas}`)
    assert(contrastRatio(c.point,c.patternPaper)>=6.95,`points on ${canvas}`)
    assert(contrastRatio(c.notch,c.patternPaper)>=6.95,`notches on ${canvas}`)
  }
  const dark=cadAutoContrastColors({canvas:'#13161a',grid:'#141619'})
  assert(contrastRatio(dark.grid,'#13161a')>=4.49)
})

test('matching custom pattern paper and canvas must remain visibly distinct, without modifying the saved colors',()=>{
  for(const original of ['#101113','#f8f9fb','#808080','#ffffff','#000000']){
    const display=separateDraftPaper(original,original)
    assert(contrastRatio(display,original)>=1.99,`pattern surface vanishes on ${original}`)
    const c=cadAutoContrastColors({canvas:original,paper:original,edge:original,selection:original,point:original})
    assert.equal(c.background,original)
    assert(contrastRatio(c.patternPaper,c.background)>=1.99)
    assert(contrastRatio(c.edge,c.patternPaper)>=6.95)
  }
})
