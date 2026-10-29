import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const output=fs.mkdtempSync(path.join(os.tmpdir(),'exo-side-appearance-qa-'))
let workspace=createWorkspace(output)
const call=data=>workspace.request(data)
try{
 let result=await call({op:'open',preset:'tshirt'})
 assert(result.ok,result.error)
 const {revision,template,positions,triangles,time}=result.data
 const id=template.fabrics[0].id
 const native=JSON.stringify({positions,triangles,time})
 const front={color:'#223344',opacity:0.7,roughness:0.4,metalness:0.1,reflectionIntensity:1.4}
 const back={color:'#334455',opacity:0.6,roughness:0.3,metalness:0.2,reflectionIntensity:1.5}
 const side={color:'#445566',opacity:0.5,roughness:0.2,metalness:0.3,reflectionIntensity:2.5}
 for(const [face,values] of [['',front],['back.',back],['side.',side]]){
  for(const [key,value] of Object.entries(values)){
   result=await call({op:'set-property',target:'fabric',id,field:`appearance.${face}${key}`,value,revision})
   assert(result.ok,result.error)
   assert.equal(result.data.revision,revision)
   assert.equal(result.data.metadataOnly,true)
  }
 }
 const expected={...front,back,side}
 assert.deepEqual(result.data.propertyMetadata.fabrics[id].appearance,expected)
 for(const [field,value] of [
  ['appearance.side.color','red'],['appearance.side.color','#12'],['appearance.side.opacity',-0.1],
  ['appearance.side.opacity',Infinity],['appearance.side.roughness',1.1],['appearance.side.metalness',NaN],
  ['appearance.side.reflectionIntensity',3.1],['appearance.side.reflectionIntensity','1'],
  ['appearance.side.other',1],['appearance.side.reset',false],['appearance.side.reset',null],
  ['appearance.side.back.color','#ffffff']
 ])assert.equal((await call({op:'set-property',target:'fabric',id,field,value,revision})).ok,false,field)
 for(const payload of [
  {target:'fabric',id:'unknown-fabric',field:'appearance.side.color',value:'#ffffff',revision},
  {target:'panel',id:template.panels[0].id,field:'appearance.side.color',value:'#ffffff',revision},
  {target:'fabric',id,field:'appearance.side.color',value:'#ffffff',revision:revision+1},
  {target:'fabric',id,field:'appearance.side.reset',value:true,revision:revision+1}
 ])assert.equal((await call({op:'set-property',...payload})).ok,false)
 result=await call({op:'snapshot'})
 assert.deepEqual(result.data.propertyMetadata.fabrics[id].appearance,expected)
 assert.equal(JSON.stringify({positions:result.data.positions,triangles:result.data.triangles,time:result.data.time}),native)
 assert.equal(result.data.revision,revision)
 const projectFile=path.join(output,'workspace','fitting-project.json')
 const originalProject=fs.readFileSync(projectFile,'utf8')
 assert.deepEqual(JSON.parse(fs.readFileSync(projectFile+'.properties.json','utf8')).fabrics[id].appearance,expected)
 workspace.close()
 workspace=createWorkspace(output)
 result=await call({op:'snapshot'})
 assert.deepEqual(result.data.propertyMetadata.fabrics[id].appearance,expected)
 result=await call({op:'set-property',target:'fabric',id,field:'appearance.side.reset',value:true,revision})
 assert(result.ok,result.error)
 assert.deepEqual(result.data.propertyMetadata.fabrics[id].appearance,{...front,back})
 workspace.close()
 workspace=createWorkspace(output)
 result=await call({op:'snapshot'})
 assert.deepEqual(result.data.propertyMetadata.fabrics[id].appearance,{...front,back})
 assert.equal(result.data.revision,revision)
 assert.equal(JSON.stringify({positions:result.data.positions,triangles:result.data.triangles,time:result.data.time}),native)
 assert.equal(fs.readFileSync(projectFile,'utf8'),originalProject)
 console.log(JSON.stringify({passed:true,checks:['side five values','front/back preservation','invalid paths and values','stale and wrong target rejection','side reset persistence and reopen','native solver unchanged']}))
}finally{workspace.close()}
