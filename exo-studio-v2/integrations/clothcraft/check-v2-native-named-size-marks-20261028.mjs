// Real compiled Rust: preserve physical notch/allowance stations while F7
// appends a canonical size. This is NOT CUT/cutter/vendor/factory acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'
import {applyModarisF7SizeEvolution20261028} from '../../src/core/modarisF7SizeEvolution20261028.js'
import {commitNativeGradeCanonicalSizeTransaction20261028} from '../../src/core/nativeGradeCanonicalSizeTransaction20261028.js'

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'exo-named-size-mark-native-'))
const workspace=createWorkspace(temporary)
let current
const request=async packet=>{
 const response=await workspace.request({revision:current?.revision,...packet})
 assert.equal(response.ok,true,`${packet.op}: ${response.error||'Rust rejected operation'}`)
 if(response.data?.template)current=response.data
 return response.data
}
const save=async()=>(await request({op:'save'})).project
const checkMarks=(project,sizes,edge,t=.43,depth=.004)=>{
 assert.deepEqual(project.grade_run.sizes,sizes)
 for(const [size,template] of [['base',project.template],...sizes.map((s,i)=>[s,project.grade_run.gradedTemplates[i]])]){
  const polygon=template.panels.find(p=>p.id==='front')?.polygon
  assert(polygon,`Missing front polygon ${size}`)
  const marks=polygon.notches?.[edge]
  assert.equal(marks?.length,1,`Missing notch in ${size}`)
  assert(Math.abs(marks[0].t-t)<1e-10&&Math.abs(marks[0].depth_m-depth)<1e-10,
   `Physical notch changed in ${size}`)
  assert(Math.abs(polygon.seam_allowances[edge]-.012)<1e-10,
   `Physical seam allowance changed in ${size}`)
 }
}
try{
 await request({op:'open',preset:'tshirt'})
 const edge=current.template.panels.find(p=>p.id==='front').polygon.edges[0]
 const existing=new Set(current.template.panels.map(p=>p.id))
 await request({op:'edit',command:{kind:'Polygon',fabric:current.template.fabrics[0].id,
  points:[[.55,.1],[.83,.1],[.88,.34],[.52,.34]]}})
 const third=current.template.panels.find(p=>!existing.has(p.id))
 assert(third)
 for(const panel of [...current.template.panels])for(const edgeId of panel.polygon.edges){
  await request({op:'edit',command:{kind:'SeamAllowance',panel:panel.id,edge:edgeId,width_m:.012}})
 }
 const source=await save()
 let authored=createAccuMarkNativeRuleSet(current,{sizes:['2','4','6','8'],baseSize:'6'})
 assert(authored.ok,authored.reason)
 for(const [size,dx] of [['2',-3],['4',-1],['8',4]]){
  const next=editAccuMarkNativePointRule(current,authored.ruleSet,
   {panelId:third.id,pointIndex:1,size,dxMm:dx,dyMm:0})
  assert(next.ok,next.reason);authored=next
 }
 const initial=prepareNativeGradeCatalog20261025(current,source,authored.ruleSet)
 assert(initial.ok,initial.reason)
 await request({op:'grade-run-commit',gradeRun:initial.gradeRun})
 await request({op:'grade-notch-commit',panelId:'front',edgeId:edge,t:.43,depthMm:4})
 const before=await save()
 checkMarks(before,['2','4','6','8'],edge)
 // A native notch mutation updates source identity; recover the persisted
 // rules rather than reusing the stale pre-notch source fingerprint.
 const status=await request({op:'grade-run-status'})
 const {recoverNativeGradeRules20261025}=await import('../../src/core/nativeGradeCatalogBridge20261025.js')
 const recovered=recoverNativeGradeRules20261025(current,status)
 assert(recovered.ok,recovered.reason)
 const evolved=applyModarisF7SizeEvolution20261028(current,recovered.ruleSet,
  {action:'add-size-to-product',name:'10'})
 assert(evolved.ok,evolved.reason)
 const committed=await commitNativeGradeCanonicalSizeTransaction20261028({
  snapshot:current,expectedRevision:current.revision,ruleSet:evolved.ruleSet,request})
 assert(committed.ok,committed.reason)
 const after=await save()
 checkMarks(after,['2','4','6','8','10'],edge)
 await request({op:'undo'})
 checkMarks(await save(),['2','4','6','8'],edge)
 await request({op:'redo'})
 checkMarks(await save(),['2','4','6','8','10'],edge)
 await request({op:'open',project:after})
 checkMarks(await save(),['2','4','6','8','10'],edge)
 console.log(JSON.stringify({passed:true,realRust:true,namedSizes:5,sourcePanels:3,
  physicalNotchDepthMm:4,physicalAllowanceMm:12,undoRedoReopen:true,
  cutterQualified:false,independentReceivingCadAccepted:false,factoryApproved:false}))
}finally{
 workspace.close()
 fs.rmSync(temporary,{recursive:true,force:true})
}
