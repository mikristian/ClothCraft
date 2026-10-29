import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,realpath,readdir,readFile,writeFile,unlink,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {withIndustrialReceivingRegistryVersionFloor20261029 as withFloor} from './industrialReceivingRegistryVersionFloor20261029.mjs'

// Disposable private receiving state; these are synthetic garment handoff
// receipts, never actual receiving-CAD or factory authorization records.
async function fixture(run){
 const parent=await mkdtemp(join(tmpdir(),'exo-receiving-postclaim-'))
 const stateRoot=join(parent,'private-ledger')
 try{
  await mkdir(stateRoot,{mode:0o700})
  const canonical=await realpath(stateRoot)
  const options={stateRoot,issuerAudience:'DISPOSABLE_GARMENT_RECEIVING',
   ledgerNamespace:'DISPOSABLE',trustedStateNamespaces:{DISPOSABLE:canonical},
   registryRootSha256:'a'.repeat(64),registryVersion:7,
   issuerStatusSnapshotSha256:'b'.repeat(64)}
  return await run({stateRoot,options})
 }finally{await rm(parent,{recursive:true,force:true})}
}

async function observationPath(root){
 const name=(await readdir(root)).find(x=>x.endsWith('.issuer-registry-v7.json'))
 assert.ok(name,'signed issuer status must be persisted before claim callback')
 return join(root,name)
}

test('unchanged registry permits inspected disposable receiving claim',async()=>{
 await fixture(async({options})=>{
  let calls=0
  const result=await withFloor(options,async()=>{calls++;return {ok:true,cuttingAuthorized:false}})
  assert.equal(result.ok,true)
  assert.equal(result.cuttingAuthorized,false)
  assert.equal(calls,1)
 })
})

test('callback substitution of issuer-status digest cannot return successful claim',async()=>{
 await fixture(async({stateRoot,options})=>{
  let calls=0
  const result=await withFloor(options,async()=>{
   calls++
   const path=await observationPath(stateRoot)
   const row=JSON.parse(await readFile(path,'utf8'))
   row.issuerStatusSnapshotSha256='c'.repeat(64)
   await writeFile(path,JSON.stringify(row)+'\n',{mode:0o600})
   return {ok:true}
  })
  assert.equal(calls,1)
  assert.equal(result.ok,false)
  assert.equal(result.code,'RECEIVER_ISSUER_REGISTRY_STATE_CHANGED_DURING_CLAIM')
  const retry=await withFloor(options,()=>({ok:true}))
  assert.equal(retry.ok,false,'corrupted state cannot be reused on next attempt')
 })
})

test('callback deletion of issuer-status observation cannot return successful claim',async()=>{
 await fixture(async({stateRoot,options})=>{
  const result=await withFloor(options,async()=>{
   await unlink(await observationPath(stateRoot))
   return {ok:true}
  })
  assert.equal(result.ok,false)
  assert.equal(result.code,'RECEIVER_ISSUER_REGISTRY_STATE_CHANGED_DURING_CLAIM')
 })
})

test('callback insertion of higher issuer-registry version rejects old claim',async()=>{
 await fixture(async({stateRoot,options})=>{
  const result=await withFloor(options,async()=>{
   const path=await observationPath(stateRoot)
   const row=JSON.parse(await readFile(path,'utf8'))
   row.registryVersion=8
   await writeFile(path.replace('v7.json','v8.json'),JSON.stringify(row)+'\n',
    {flag:'wx',mode:0o600})
   return {ok:true}
  })
  assert.equal(result.ok,false)
  assert.equal(result.code,'RECEIVER_ISSUER_REGISTRY_STATE_CHANGED_DURING_CLAIM')
 })
})
