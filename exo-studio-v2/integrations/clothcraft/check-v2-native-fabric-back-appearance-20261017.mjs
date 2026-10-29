import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const output=fs.mkdtempSync(path.join(os.tmpdir(),'exo-back-appearance-qa-'))
let workspace=createWorkspace(output)
const call=payload=>workspace.request(payload)
try{
 let result=await call({op:'open',preset:'tshirt'})
 assert(result.ok,result.error)
 const {revision,template,positions,triangles,time}=result.data
 const id=template.fabrics[0].id
 const nativeBefore=JSON.stringify({positions,triangles,time})
 const front={color:'#c0ffee',opacity:0.8,roughness:0.4,metalness:0.2,reflectionIntensity:1.4}
 const back={color:'#abcdef',opacity:0.6,roughness:0.3,metalness:0.1,reflectionIntensity:2.7}
 for(const [face,values] of [['',front],['back.',back]]){
  for(const [key,value] of Object.entries(values)){
   result=await call({op:'set-property',target:'fabric',id,field:`appearance.${face}${key}`,value,revision})
   assert(result.ok,result.error)
   assert.equal(result.data.revision,revision)
   assert.equal(result.data.metadataOnly,true)
  }
 }
 const expected={...front,back}
 assert.deepEqual(result.data.propertyMetadata.fabrics[id].appearance,expected)
 const rejected=[
  ['appearance.back.color','#bad'],['appearance.back.color','red'],['appearance.back.opacity',-1],
  ['appearance.back.opacity',Infinity],['appearance.back.roughness',1.01],['appearance.back.metalness',NaN],
  ['appearance.back.reflectionIntensity',3.01],['appearance.back.reflectionIntensity','2'],
  ['appearance.back.extra',1],['appearance.front.color','#ffffff'],['appearance.back',{}],
  ['appearance.back.back.color','#ffffff'],['appearance.back.reset',false],['appearance.back.reset',null]
 ]
 for(const [field,value] of rejected){
  const rejectedResult=await call({op:'set-property',target:'fabric',id,field,value,revision})
  assert.equal(rejectedResult.ok,false,`Must reject ${field}=${value}`)
 }
 for(const payload of [
  {target:'fabric',id:'fabric-missing',field:'appearance.back.color',value:'#ffffff',revision},
  {target:'panel',id:template.panels[0].id,field:'appearance.back.color',value:'#ffffff',revision},
  {target:'fabric',id,field:'appearance.back.color',value:'#ffffff',revision:revision+1}
 ])assert.equal((await call({op:'set-property',...payload})).ok,false)
 result=await call({op:'snapshot'})
 assert.deepEqual(result.data.propertyMetadata.fabrics[id].appearance,expected)
 assert.equal(JSON.stringify({positions:result.data.positions,triangles:result.data.triangles,time:result.data.time}),nativeBefore)
 assert.equal(result.data.revision,revision)
 assert((await call({op:'save'})).ok)
 const projectPath=path.join(output,'workspace','fitting-project.json')
 const projectBefore=fs.readFileSync(projectPath,'utf8')
 assert.deepEqual(JSON.parse(fs.readFileSync(projectPath+'.properties.json','utf8')).fabrics[id].appearance,expected)
 workspace.close()
 workspace=createWorkspace(output)
 result=await call({op:'snapshot'})
 assert(result.ok,result.error)
 assert.deepEqual(result.data.propertyMetadata.fabrics[id].appearance,expected)
 assert.equal(result.data.revision,revision)
 assert.equal(fs.readFileSync(projectPath,'utf8'),projectBefore)
 result=await call({op:'set-property',target:'fabric',id,field:'appearance.back.reset',value:true,revision})
 assert(result.ok,result.error)
 assert.deepEqual(result.data.propertyMetadata.fabrics[id].appearance,front)
 assert.equal(result.data.revision,revision)
 workspace.close()
 workspace=createWorkspace(output)
 result=await call({op:'snapshot'})
 assert.deepEqual(result.data.propertyMetadata.fabrics[id].appearance,front)
 assert.equal(JSON.stringify({positions:result.data.positions,triangles:result.data.triangles,time:result.data.time}),nativeBefore)
 assert.equal(fs.readFileSync(projectPath,'utf8'),projectBefore)
 console.log(JSON.stringify({passed:true,checks:['independent front/back fields','invalid and unknown paths','wrong target and stale revision','unchanged native simulation','sidecar persistence and reopen','back reset preserves front and native project'],output}))
}finally{workspace.close()}
