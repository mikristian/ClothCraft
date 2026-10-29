/** Browser acceptance for interactive Compare Length / Grading Table handoff. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--disable-gpu','--no-first-run']})
try{
 const page=await browser.newPage({viewport:{width:1450,height:970}})
 page.setDefaultTimeout(12000)
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/src/main.jsx',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}))
 await page.goto(process.env.EXO_UI_URL||'http://127.0.0.1:5964',{waitUntil:'domcontentloaded'})
 await page.evaluate(async()=>{
  const [react,dom,table,engine]=await Promise.all([
   import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),
   import('/src/components/OptitexGradeTable20261027.jsx'),
   import('/src/core/optitexGradeTools20261027.js'),
  ])
  const R=react.default
  const square=(id,edges)=>({id,name:id,polygon:{points:[[0,0],[.2,0],[.2,.2],[0,.2]],edges}})
  const snapshot={template:{panels:[square('front',['a','b','c','d']),square('back',['e','f','g','h'])]}}
  const node=document.createElement('div')
  node.id='exo-click-qa'
  node.style.cssText='position:fixed;inset:20px;z-index:99999;background:#192c38;padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:15px'
  document.body.append(node)
  const root=dom.default.createRoot(node)
  const App=()=>{
   const [rules,setRules]=R.useState(null)
   const [size,setSize]=R.useState('M')
   const [panel,setPanel]=R.useState('front')
   const [point,setPoint]=R.useState(1)
   const [contour,setContour]=R.useState(null)
   const [visible,setVisible]=R.useState(['XS','S','M','L','XL','XXL'])
   window.__exoClickQA={rules,size,panel,point,contour,visible}
   const shared={snapshot,ruleSet:rules,panelId:panel,selectedPointIndex:point,selectedSize:size,
    onSelectSize:setSize,onSelectPanel:setPanel,onSelectPoint:setPoint,onSelectContour:setContour,
    visibleSizes:visible,onVisibleSizesChange:setVisible,onApplyRuleSet:next=>{setRules(next);return true},
    onGradeTool:(id,opts)=>{
     const result=engine.applyOptitexGradeTool20261027({snapshot,ruleSet:rules,toolId:id,
      panelId:opts.panelId,pointIndex:opts.pointIndex,size:opts.size,axis:opts.axis,amountMm:opts.amountMm,
      clipboard:opts.clipboard,sourcePointIndex:opts.sourcePointIndex,targetPointIndex:opts.targetPointIndex})
     if(result.ok&&result.ruleSet)setRules(result.ruleSet)
     return result
    },colorsBySize:{}}
   return R.createElement(R.Fragment,null,
    R.createElement('div',{'data-grade-click-test':'true'},R.createElement(table.default,{...shared,compact:true,displayMode:'values'})),
    R.createElement('div',{'data-compare-click-test':'true'},R.createElement(table.default,{...shared,compact:true,displayMode:'compare'})))
  }
  root.render(R.createElement(App))
  window.__exoClickCleanup=()=>{root.unmount();node.remove()}
 })
 const grade=page.locator('[data-grade-click-test]')
 const compare=page.locator('[data-compare-click-test]')
 const state=()=>page.evaluate(()=>window.__exoClickQA)
 await compare.getByRole('button',{name:'Create native XS–XXL grade table'}).click()
 assert((await state()).rules,'Compare Length must initialize the real grading rule engine')
 const length=compare.getByRole('button',{name:'Select L contour A in grading nest'})
 assert(Math.abs(Number(await length.innerText())-200)<.01)
 await length.click()
 let current=await state()
 assert.equal(current.size,'L')
 assert.deepEqual(current.contour,{panelId:'front',edge:'a',size:'L',side:'a'})
 await compare.getByRole('button',{name:'Select L contour B in grading nest'}).click()
 assert.deepEqual((await state()).contour,{panelId:'front',edge:'b',size:'L',side:'b'})
 await grade.getByRole('button',{name:'Select grading size L'}).dblclick()
 assert.equal(await grade.locator('[data-grade-view="offsets"]').count(),1)
 const input=grade.getByRole('spinbutton',{name:'L grade point 2 X movement millimetres',exact:true})
 await input.fill('2')
 await input.blur()
 current=await state()
 assert.equal(current.rules.panels.front.pointOffsetsMm.L[1][0],2)
 const measured=Number(await length.innerText())
 assert(measured>201.9&&measured<202.1,`Compare Length must remeasure graded edge, got ${measured}`)
 await compare.getByRole('combobox',{name:'Compare length second pattern'}).selectOption('back')
 await compare.getByRole('button',{name:'Select L contour B in grading nest'}).click()
 assert.equal((await state()).contour.panelId,'back')
 await grade.getByRole('combobox',{name:'Grading table source pattern'}).selectOption('back')
 assert.equal((await state()).panel,'back')
 assert.equal(Number(await grade.getByRole('spinbutton',{name:'L grade point 2 X movement millimetres',exact:true}).inputValue()),0)
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,ruleInitialization:true,clickablePhysicalContours:true,
  selectedSize:'L',gradedContourLengthMm:measured,sharedNativeRules:true,selectSourcePattern:true,errors},null,2))
 await page.evaluate(()=>window.__exoClickCleanup())
}finally{await browser.close()}
