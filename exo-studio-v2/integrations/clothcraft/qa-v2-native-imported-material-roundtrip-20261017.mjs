// Native Rust hardware material, undo/redo and save/open acceptance.
// Runs in a disposable session, requires neither the user garment nor Chrome.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,readFileSync} from 'node:fs'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import {setTimeout as pause} from 'node:timers/promises'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-imported-material-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const url='http://127.0.0.1:5883'
const processHandle=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
 cwd:root,detached:true,stdio:'ignore',
 env:{...process.env,EXO_CLOTHCRAFT_PORT:'5883',
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'},
})
async function call(command){
 const result=await fetch(url+'/workspace',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify(command),signal:AbortSignal.timeout(20000)}).then(r=>r.json())
 assert.equal(result.ok,true,`Failed ${command.op}: ${JSON.stringify(result)}`)
 return result.data
}
try{
 let available=false
 for(let i=0;i<120;i++){
  try{if((await fetch(url+'/health',{signal:AbortSignal.timeout(1000)})).ok){available=true;break}}catch{}
  await pause(200)
 }
 assert(available,'Disposable Rust service failed to start')
 let state=await call({op:'snapshot'})
 const panel=state.template.panels[0].id
 const base={
  id:'ykk-roundtrip-test',assetId:'ykk-puller-sample',panel,kind:'puller',
  positionMm:[95,60,1],rotationDegrees:[0,0,0],scale:[1,1,1],
  visible:true,color:'#c16f4c',roughness:.32,metalness:.85,opacity:1,
  reflectionIntensity:1.8,clearcoat:.55,weightGrams:12.5,materialType:'metal',
 }
 state=await call({op:'hardware-set',revision:state.revision,importedHardware:[base]})
 assert.equal(state.importedHardware[0].materialType,'metal')
 assert.equal(state.importedHardware[0].weightGrams,12.5)
 assert.equal(state.canUndoHardware,true)
 state=await call({op:'hardware-undo',revision:state.revision})
 assert.equal(state.importedHardware.length,0)
 assert.equal(state.canRedoHardware,true)
 state=await call({op:'hardware-redo',revision:state.revision})
 assert.deepEqual(state.importedHardware[0],base)
 const lastRevision=state.revision
 await call({op:'save',revision:lastRevision})
 const disk=JSON.parse(readFileSync(path.join(output,'workspace','fitting-project.json'),'utf8'))
 assert.equal(disk.importedHardware[0].reflectionIntensity,1.8)
 assert.equal(disk.importedHardware[0].weightGrams,12.5)
 state=await call({op:'open',revision:lastRevision,project:disk})
 assert.equal(state.importedHardware[0].clearcoat,.55)
 assert.equal(state.importedHardware[0].materialType,'metal')
 console.log(JSON.stringify({pass:true,fullNativeMaterial:true,undoRedo:true,save:true,
  reopenTested:true,projectDir:output}))
}finally{try{process.kill(-processHandle.pid,'SIGTERM')}catch{}}
