/** Isolated real Chromium React UI test; no native port, project, or saved
 * browser storage is touched. Reuse existing Vite 5174 module serving.
 */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const context=await browser.newContext({viewport:{width:1250,height:900}})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/qa-native-graded-seam-ui-20261025',route=>route.fulfill({
    status:200,contentType:'text/html',body:'<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/src/components/NativeGradingStudio20261025.css"></head><body style="background:#1d2831"><div id="qa-root" style="max-width:980px;margin:auto"></div></body></html>',
  }))
  await page.goto('http://127.0.0.1:5174/qa-native-graded-seam-ui-20261025',{waitUntil:'domcontentloaded'})
  await page.evaluate(async()=>{
    // This is a standalone document, not the Vite HTML entrypoint. Install
    // the same React HMR preamble that Vite would inject into the app shell.
    const refresh=(await import('/@react-refresh')).default
    refresh.injectIntoGlobalHook(window)
    window.$RefreshReg$=()=>{}
    window.$RefreshSig$=()=>type=>type
    window.__vite_plugin_react_preamble_installed__=true
    const [reactModule,clientModule,quality,points]=await Promise.all([
      import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),
      import('/src/components/NativeGradingQualityDashboard20261025.jsx'),
      import('/src/core/accumarkNativePointRuleSet20261023.js'),
    ])
    const React=reactModule.default,client=clientModule.default
    const polygon=()=>({points:[[0,0],[.2,0],[.2,.3],[0,.3]],
      edges:['top','right','bottom','left'],curves:{}})
    const source={revision:23,template:{panels:[{id:'front',polygon:polygon()},
      {id:'back',polygon:polygon()}],seams:[{id:'join',
      a:{panel:'front',edge:'top',range:[0,1]},
      b:{panel:'back',edge:'top',range:[0,1]},reverse_b:true,allow_ease:false}]}}
    const base=points.createAccuMarkNativeRuleSet(source)
    if(!base.ok)throw Error(base.reason)
    const graded=points.editAccuMarkNativePointRule(source,base.ruleSet,{
      panelId:'back',size:'XL',pointIndex:1,dxMm:20,dyMm:0,
    })
    if(!graded.ok)throw Error(graded.reason)
    window.__nativeSeamSource=structuredClone(source)
    window.__nativeSeamSourceCurrent=source
    window.__nativeSeamBeforeRules=graded.ruleSet
    const App=()=>{
      const [rules,setRules]=React.useState(graded.ruleSet)
      const [size,setSize]=React.useState('XL')
      return React.createElement(quality.default,{
        snapshot:source,ruleSet:rules,selectedSize:size,onSelectSize:setSize,
        pomDefinitions:[],nativeCatalog:null,editingDisabled:false,
        onGoRules:()=>{},onApplyGradeRules:next=>{
          window.__nativeSeamApplied=next
          setRules(next)
        },
      })
    }
    client.createRoot(document.getElementById('qa-root')).render(React.createElement(App))
  })
  const qa=page.getByRole('region',{name:'Unified native size grading quality'})
  await qa.waitFor({state:'visible'})
  const broken=qa.locator('tr[data-grade-seam-check="review"]')
  await broken.waitFor({state:'visible'})
  assert.match(await broken.innerText(),/20\.0 mm|20\.0/)
  await qa.getByRole('button',{name:'Find stitchline correction for join in XL'}).click()
  const proposal=qa.getByRole('group',{name:'Review native graded seam correction proposal'})
  await proposal.waitFor({state:'visible'})
  assert.match(await proposal.innerText(),/20\.0 mm →/)
  assert.match(await proposal.innerText(),/Selected seam within provisional 2 mm tolerance/)
  assert.equal(await qa.locator('[data-grade-seam-correction]').getAttribute('data-grade-seam-correction'),'draft-only')
  await proposal.getByRole('button',{name:'Apply to local grading draft'}).click()
  await qa.locator('tr[data-grade-seam-check="pass"]').first().waitFor()
  assert.equal(await qa.locator('[data-grade-seam-correction]').count(),0)
  const values=await page.evaluate(()=>({
    applied:Boolean(window.__nativeSeamApplied),
    sourceUnchanged:JSON.stringify(window.__nativeSeamSourceCurrent)===JSON.stringify(window.__nativeSeamSource),
    baseUnchanged:window.__nativeSeamApplied?.panels?.back?.pointOffsetsMm?.M?.[1]?.[0]===0,
    oldSizeChanged:window.__nativeSeamBeforeRules?.panels?.back?.pointOffsetsMm?.XL?.[1]?.[0]===20,
    candidateChangedRule:JSON.stringify(window.__nativeSeamBeforeRules)!==JSON.stringify(window.__nativeSeamApplied),
    selectedSizeAfter:window.__nativeSeamApplied?.panels?.back?.pointOffsetsMm?.XL?.[1]?.[0],
  }))
  assert(values.applied)
  assert(values.sourceUnchanged)
  assert(values.baseUnchanged)
  assert(values.oldSizeChanged)
  assert(values.candidateChangedRule,'Grading-rule correction must be a real, explicit local edit')
  await page.evaluate(async()=>{
    const React=(await import('/node_modules/.vite/deps/react.js')).default
    const client=(await import('/node_modules/.vite/deps/react-dom_client.js')).default
    const fitted=(await import('/src/components/NativeGradedFitEvidence20261025.jsx')).default
    const scene={activeGradedSize:'XL',time:.25,metrics:{nativeStep:true},
      positions:[[0,0,0],[.2,0,0],[0,.3,0]],
      seams:[{id:'join',gap_m:.004,rms_gap_m:.001}],
      gradedFitEvidence:{size:'XL',nativeMeshCompiled:true,nativeStepEvidence:true,
        simulationTimeSeconds:.25,seamCount:1,maxSeamGapMm:4,maxRmsSeamGapMm:1,
        measurementsFinite:true,fitCertified:false,manufacturingApproved:false}}
    const host=document.createElement('div')
    host.id='qa-fit-root'
    document.body.appendChild(host)
    window.__gradeFitRoot=client.createRoot(host)
    window.__gradeFitRoot.render(React.createElement(fitted,{snapshot:scene}))
  })
  const nativeFit=page.getByRole('region',{name:'Current native graded 3D fitting evidence'})
  await nativeFit.waitFor({state:'visible'})
  assert.equal(await nativeFit.getAttribute('data-native-fit-state'),'stepped-with-seams')
  assert.match(await nativeFit.innerText(),/4\.00 mm/)
  assert.match(await nativeFit.innerText(),/exceed provisional 2 mm/)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,selectedSize:'XL',beforeMismatchMm:20,
    localProposalApplied:true,sourceUnchanged:true,baseGradeUnchanged:true,
    observed3dFitReview:true,
    browserPageErrors:errors.length,sourcePointXLBeforeMm:20,
    sourcePointXLAfterMm:values.selectedSizeAfter}))
}finally{await browser.close()}
