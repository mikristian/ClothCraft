import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(join(tmpdir(),'exo-fabric-http-'))
const port=5697,base=`http://127.0.0.1:${port}`
const server=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{cwd:root,stdio:'ignore',env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_REPO:join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:join(root,'research/oss/clothcraft/target/debug/exo-session'),EXO_CLOTHCRAFT_GPU:'0'}})
const post=async payload=>{const response=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});return response.json()}
try{
 let ready=false
 for(let n=0;n<100;n++){try{if((await (await fetch(base+'/health')).json()).ok){ready=true;break}}catch{}await sleep(150)}
 assert(ready,'native QA server did not start')
 let result=await post({op:'snapshot'})
 assert(result.ok,result.error)
 const revision=result.data.revision,id=result.data.template.fabrics[0].id
 const values={color:'#C0FFEE',opacity:0.4,roughness:0.6,metalness:1,reflectionIntensity:3}
 for(const [field,value] of Object.entries(values)){
  result=await post({op:'set-property',target:'fabric',id,field:`appearance.${field}`,value,revision})
  assert(result.ok,result.error)
  assert.equal(result.data.revision,revision)
 }
 for(const [field,value] of [['appearance.opacity',-0.01],['appearance.roughness',1.01],['appearance.metalness','0.5'],['appearance.reflectionIntensity',3.01]]){
  result=await post({op:'set-property',target:'fabric',id,field,value,revision})
  assert.equal(result.ok,false)
 }
 const sidecar=join(output,'workspace','fitting-project.json.properties.json')
 assert.deepEqual(JSON.parse(readFileSync(sidecar,'utf8')).fabrics[id].appearance,values)
 result=await post({op:'snapshot'})
 assert.deepEqual(result.data.propertyMetadata.fabrics[id].appearance,values)
 result=await post({op:'save'})
 assert(result.ok)
 const reopened=await post({op:'open',project:result.data.project})
 assert(reopened.ok,reopened.error)
 assert.deepEqual(reopened.data.propertyMetadata.fabrics[id].appearance,values)
 console.log(JSON.stringify({passed:true,port,output,sidecar,fabricId:id,appearance:values,revision,invalidBoundsRejected:true,savedAndReopened:true}))
}finally{server.kill('SIGTERM')}
