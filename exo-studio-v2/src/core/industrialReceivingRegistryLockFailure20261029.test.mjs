import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtemp,mkdir,readdir,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

// Faults are injected in a disposable child process so no fs prototype
// mutation leaks into the garment or receiving-CAD regression suites.
const child=`
import {open,unlink,realpath,readdir} from 'node:fs/promises'
import {join} from 'node:path'
const {withIndustrialReceivingRegistryVersionFloor20261029:check}=
 await import(process.argv[1])
const root=process.argv[2],mode=process.argv[3]
const canonical=await realpath(root)
const probePath=join(root,'prototype-probe')
const probe=await open(probePath,'wx',0o600)
const proto=Object.getPrototypeOf(probe)
await probe.close()
await unlink(probePath)
const originalWrite=proto.writeFile,originalSync=proto.sync
const lockHandles=new WeakSet()
proto.writeFile=async function(value,...args){
 if(value==='EXO_REGISTRY_FLOOR_LOCK_V1\\n'){
  lockHandles.add(this)
  if(mode==='write')throw Error('INJECTED_LOCK_WRITE_FAILURE')
 }
 return originalWrite.call(this,value,...args)
}
proto.sync=async function(...args){
 if(mode==='sync'&&lockHandles.has(this))throw Error('INJECTED_LOCK_SYNC_FAILURE')
 return originalSync.call(this,...args)
}
const options={stateRoot:root,issuerAudience:'TEST_RECEIVING',
 ledgerNamespace:'DISPOSABLE',trustedStateNamespaces:{DISPOSABLE:canonical},
 registryRootSha256:'a'.repeat(64),registryVersion:7,
 issuerStatusSnapshotSha256:'b'.repeat(64)}
let called=0
const first=await check(options,()=>{called++;return {ok:true}})
const afterFirst=await readdir(root)
const second=await check(options,()=>{called++;return {ok:true}})
console.log(JSON.stringify({first,second,afterFirst,called}))
`

for(const failure of ['write','sync']){
 test(`uncertain registry lock ${failure} failure preserves exclusive crash residue`,async()=>{
  const parent=await mkdtemp(join(tmpdir(),'exo-registry-lock-fault-'))
  const root=join(parent,'private-state')
  try{
   await mkdir(root,{mode:0o700})
   const output=execFileSync(process.execPath,
    ['--input-type=module','-e',child,
     new URL('./industrialReceivingRegistryVersionFloor20261029.mjs',import.meta.url).href,
     root,failure],{encoding:'utf8',timeout:15000})
   const result=JSON.parse(output)
   assert.equal(result.first.ok,false)
   assert.equal(result.first.code,'RECEIVER_ISSUER_REGISTRY_LOCK_UNCERTAIN')
   assert.equal(result.afterFirst.length,1)
   assert.match(result.afterFirst[0],/\.issuer-registry\.lock$/)
   assert.equal(result.second.ok,false)
   assert.equal(result.second.code,'RECEIVER_ISSUER_REGISTRY_STATE_BUSY')
   assert.equal(result.called,0,'No receiving claim callback may execute')
   // A clean new service process must also refuse the orphan. Its FileHandle
   // methods have never been monkey-patched, unlike the injected process.
   const restarted=JSON.parse(execFileSync(process.execPath,
    ['--input-type=module','-e',child,
     new URL('./industrialReceivingRegistryVersionFloor20261029.mjs',import.meta.url).href,
     root,'none'],{encoding:'utf8',timeout:15000}))
   assert.equal(restarted.first.code,'RECEIVER_ISSUER_REGISTRY_STATE_BUSY')
   assert.equal(restarted.second.code,'RECEIVER_ISSUER_REGISTRY_STATE_BUSY')
   assert.equal(restarted.called,0)
  }finally{
   // Only the disposable test directory is removed, never real service state.
   await rm(parent,{recursive:true,force:true})
  }
 })
}
