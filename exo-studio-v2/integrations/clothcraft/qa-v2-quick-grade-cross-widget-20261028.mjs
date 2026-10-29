/** Independent React/Chrome acceptance of source-backed grading draft, Grade Table, and Compare Length. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const url=process.env.EXO_UI_URL||'http://127.0.0.1:5964'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
try{
 const page=await browser.newPage({viewport:{width:1500,height:940}})
 page.setDefaultTimeout(12000)
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/src/main.jsx',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}))
 await page.goto(url,{waitUntil:'domcontentloaded'})
 await page.evaluate(async()=>{
  const [r,d,quick,tables,rules,ops]=await Promise.all([
   import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),
   import('/src/components/ExoGradingQuickToolbar20261028.jsx'),import('/src/components/OptitexGradeTable20261027.jsx'),
   import('/src/core/accumarkNativePointRuleSet20261023.js'),import('/src/core/optitexGradeTools20261027.js'),
  ])
  const R=r.default
  const square=id=>({id,name:id,polygon:{points:[[0,0],[.2,0],[.2,.2],[0,.2]],edges:['a','b','c','d']}})
  const snapshot={template:{panels:[square('front'),square('back')]}}
  const first=rules.createAccuMarkNativeRuleSet(snapshot)
  if(!first.ok)throw Error(first.reason)
  const stage=document.createElement('div')
  stage.style.cssText='position:fixed;inset:45px 30px;z-index:100000;background:#23303b;display:flex;flex-direction:column;gap:12px'
  stage.innerHTML='<div id="exo-cross-qa" style="display:contents"></div>'
  document.body.append(stage)
  const root=d.default.createRoot(stage.querySelector('#exo-cross-qa'))
  const App=()=>{
   const [ruleSet,setRules]=R.useState(first.ruleSet)
   const [point,setPoint]=R.useState(1)
   const [size,setSize]=R.useState('L')
   window.__exoCrossState={ruleSet,point,size}
   const dispatch=(toolId,opts)=>{
    const result=ops.applyOptitexGradeTool20261027({snapshot,ruleSet,toolId,panelId:opts.panelId||'front',pointIndex:opts.pointIndex??point,
     targetPointIndex:opts.targetPointIndex,sourcePointIndex:opts.sourcePointIndex,referencePointIndex:opts.referencePointIndex,
     size:opts.size||size,axis:opts.axis||'x',amountMm:opts.amountMm,angleDeg:opts.angleDeg,pointIndices:opts.pointIndices,clipboard:opts.clipboard})
    window.__exoLastGrade={toolId,opts,result}
    if(result.ok&&result.ruleSet)setRules(result.ruleSet)
    return result
   }
   const shared={snapshot,ruleSet,panelId:'front',selectedPointIndex:point,selectedSize:size,
    onSelectSize:setSize,onSelectPoint:setPoint,visibleSizes:['XS','S','M','L','XL','XXL'],onVisibleSizesChange:()=>{},
    onApplyRuleSet:next=>{setRules(next);return true},onGradeTool:dispatch,
    onCommitNativeCatalog:()=>{},colorsBySize:{}}
   const quickBar=R.createElement('section',{className:'clo-floating-tool clo-floating-tool--docked','data-clo-floating-widget':'grading-quick-toolbar',
     style:{position:'relative',left:'auto',top:'auto',width:'100%',height:'40px',minHeight:0}},
     R.createElement('header',{className:'clo-floating-tool-header'},R.createElement('strong',null,'Grading Toolbar')),
     R.createElement(quick.default,{snapshot,panelId:'front',selectedPointIndex:point,selectedSize:size,onSelectSize:setSize,onSelectPoint:setPoint,
      onApply:dispatch,onOpenAll:()=>{},onGradeNotch:()=>{}}))
   return R.createElement(R.Fragment,null,
    R.createElement('div',{'data-exo-grade-dock-host':'true','data-exo-dock-edge':'top','data-exo-grade-dock-occupied':'true',
     style:{height:42,display:'grid',gridTemplateRows:'0px minmax(0,1fr)',position:'relative',padding:3,background:'#152635'}},quickBar),
    R.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,flex:'1 1 auto',minHeight:0}},
     R.createElement('div',{'data-qa-table':'values',style:{minHeight:0}},R.createElement(tables.default,{...shared,displayMode:'values',compact:true})),
     R.createElement('div',{'data-qa-table':'compare',style:{minHeight:0}},R.createElement(tables.default,{...shared,displayMode:'compare',compact:true}))))
  }
  root.render(R.createElement(App))
  window.__exoCrossCleanup=()=>{root.unmount();stage.remove()}
 })
 const t=page.locator('[data-qa-table=values]')
 const cmp=page.locator('[data-qa-table=compare]')
 const quick=page.locator('.exo-quick-grade')
 const action=name=>quick.getByRole('button',{name,exact:true})
 await action('Set grading').waitFor({state:'visible'})
 const row=table=>table.locator('tbody tr').filter({has:page.getByRole('button',{name:'Select grading size L'})})
 const beforeA=Number(await row(cmp).locator('td').nth(0).innerText())
 assert.equal(beforeA,200)
 // A precondition failure changes neither rule set nor displayed geometry.
 await action('Paste grading').click()
 assert.equal(await action('Paste grading').getAttribute('data-grade-action-result'),'rejected')
 assert.equal(Number(await row(cmp).locator('td').nth(0).innerText()),beforeA)
 // Set grading for P2, inspect both tables, then copy P2 and paste to P3.
 await action('Set grading').click()
 await page.waitForTimeout(120)
 assert.equal(await action('Set grading').getAttribute('data-grade-action-result'),'applied')
 const middleA=Number(await row(cmp).locator('td').nth(0).innerText())
 const p2=Number(await row(t).locator('input[aria-label="L grade point 2 X movement millimetres"]').inputValue())
 assert.equal(p2,2)
 assert(Math.abs(middleA-202)<.01,`Length should respond to real graded edge; observed ${middleA}`)
 await action('Copy grading').click()
 assert.equal(await action('Copy grading').getAttribute('data-grade-action-result'),'applied')
 await t.getByRole('combobox',{name:'Grading table point'}).selectOption('2')
 await page.waitForTimeout(80)
 assert.equal(await page.evaluate(()=>window.__exoCrossState.point),2)
 await action('Paste grading').click()
 await page.waitForTimeout(110)
 assert.equal(await action('Paste grading').getAttribute('data-grade-action-result'),'applied')
 assert.equal(await page.evaluate(()=>window.__exoLastGrade.opts.targetPointIndex),2,'Paste must not target hard-coded P2')
 const p3=Number(await row(t).locator('input[aria-label="L grade point 3 X movement millimetres"]').inputValue())
 assert.equal(p3,2,'P3 selected in the table must reflect clipboard pasted in quick toolbar')
 const afterB=Number(await row(cmp).locator('td').nth(1).innerText())
 assert(Math.abs(afterB-200)<.02,'Companion graded contour length must update when P3 moves')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,results:{baselineEdgeMm:beforeA,afterSetGradingEdgeMm:middleA,point2Lmm:p2,afterPastePoint3Lmm:p3,companionEdgeMm:afterB},status:'draft-sidecar-not-native-catalog',pageErrors:errors},null,2))
 await page.evaluate(()=>window.__exoCrossCleanup())
}finally{await browser.close()}
