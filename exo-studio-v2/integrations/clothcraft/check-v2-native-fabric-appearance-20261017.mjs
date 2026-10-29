import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const output=fs.mkdtempSync(path.join(os.tmpdir(),'exo-appearance-qa-'))
let workspace=createWorkspace(output)
const call=payload=>workspace.request(payload)
try{
 let response=await call({op:'open',preset:'tshirt'})
 assert(response.ok,response.error)
 let state=response.data
 const revision=state.revision, id=state.template.fabrics[0].id
 const physics=JSON.stringify({positions:state.positions,triangles:state.triangles,time:state.time})
 const expected={color:'#A0c1FE',opacity:0.7,roughness:0.35,metalness:0.25,reflectionIntensity:2.5}
 for(const [key,value] of Object.entries(expected)){
  response=await call({op:'set-property',target:'fabric',id,field:`appearance.${key}`,value,revision})
  assert(response.ok,response.error)
  state=response.data
  assert.equal(state.revision,revision)
  assert.equal(state.metadataOnly,true)
 }
 assert.deepEqual(state.propertyMetadata.fabrics[id].appearance,expected)
 for(const [field,value] of [['appearance.color','#bad'],['appearance.opacity',-1],['appearance.opacity',Infinity],['appearance.roughness',1.1],['appearance.metalness',NaN],['appearance.reflectionIntensity',3.1],['appearance.reflectionIntensity','2']]){
  const result=await call({op:'set-property',target:'fabric',id,field,value,revision})
  assert.equal(result.ok,false,`must reject ${field}=${value}`)
 }
 for(const payload of [{target:'fabric',id:'fabric-missing',field:'appearance.color',value:'#FFFFFF',revision},{target:'panel',id:state.template.panels[0].id,field:'appearance.color',value:'#FFFFFF',revision},{target:'fabric',id,field:'appearance.color',value:'#FFFFFF',revision:revision+1}]){
  assert.equal((await call({op:'set-property',...payload})).ok,false)
 }
 response=await call({op:'snapshot'})
 assert(response.ok,response.error)
 assert.deepEqual(response.data.propertyMetadata.fabrics[id].appearance,expected)
 assert.equal(JSON.stringify({positions:response.data.positions,triangles:response.data.triangles,time:response.data.time}),physics)
 assert.equal(response.data.revision,revision)
 assert((await call({op:'save'})).ok)
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,'workspace','fitting-project.json.properties.json'),'utf8')).fabrics[id].appearance,expected)
 workspace.close()
 workspace=createWorkspace(output)
 response=await call({op:'snapshot'})
 assert(response.ok,response.error)
 assert.deepEqual(response.data.propertyMetadata.fabrics[id].appearance,expected)
 assert.equal(response.data.revision,revision)
 console.log(JSON.stringify({passed:true,checks:['five native appearance fields','invalid values, stale revision and incorrect target rejection','unchanged native mesh/time/revision','atomic metadata persistence','reopen'],output}))
}finally{workspace.close()}
