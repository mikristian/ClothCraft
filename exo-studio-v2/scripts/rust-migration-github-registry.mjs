#!/usr/bin/env node
// Minimal immutable GitHub source manifest: no cloning, no npm installs, no
// release artifact changes. All repositories are metadata/reference only.
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {readFileSync,writeFileSync} from 'node:fs'
const registryFile=new URL('../docs/engineering/exo-rust-github-registry.json',import.meta.url)
const lockFile=new URL('../docs/engineering/exo-rust-github-lock.json',import.meta.url)
const registry=JSON.parse(readFileSync(registryFile,'utf8'))
const urls=new Set(),ids=new Set()
assert.equal(registry.repositories.length,12,'The full public GitHub registry must contain 12 references')
for(const entry of registry.repositories){
  assert.match(entry.id,/^[a-z0-9-]+$/)
  assert.equal(entry.url,`https://github.com/${entry.repo}`)
  assert.match(entry.repo,/^[\w.-]+\/[\w.-]+$/)
  assert.ok(!urls.has(entry.url)&&!ids.has(entry.id),'Duplicate GitHub repository')
  urls.add(entry.url);ids.add(entry.id)
}
const command=process.argv[2]??'status'
if(command==='lock'){
  const pins=[]
  for(const {id,repo} of registry.repositories){
    const remote=`https://github.com/${repo}.git`
    const result=spawnSync('git',['-c','http.lowSpeedLimit=100','-c','http.lowSpeedTime=4',
      'ls-remote',remote,'HEAD'],{encoding:'utf8',timeout:10000,maxBuffer:16384})
    const sha=result.status===0?result.stdout.trim().split(/\s/)[0]:''
    if(!/^[0-9a-f]{40}$/.test(sha)){
      console.error(JSON.stringify({id,status:'remote-error',
        message:result.error?.message??result.stderr?.trim()?.slice(0,180)??'unknown'}))
      process.exitCode=1
    }
    pins.push({id,repo,commit:/^[0-9a-f]{40}$/.test(sha)?sha:null,
      verified:/^[0-9a-f]{40}$/.test(sha)})
  }
  const lock={schema:1,generatedAt:new Date().toISOString(),
    method:'git ls-remote HEAD, metadata only; not cloned or installed',pins}
  // Preserve last known good lock rather than replacing with partial failures.
  if(pins.every(p=>p.verified))writeFileSync(lockFile,JSON.stringify(lock,null,2)+'\n')
  console.log(JSON.stringify({repositories:pins.length,verified:pins.filter(p=>p.verified).length,
    saved:pins.every(p=>p.verified),lockFile:lockFile.pathname}))
}else if(command==='status'){
  let lock
  try{lock=JSON.parse(readFileSync(lockFile,'utf8'))}catch{lock=null}
  console.log(JSON.stringify({registry:registry.repositories.length,
    locked:lock?.pins?.filter(p=>p.verified).length??0,
    installed:0,cloned:0,licenseReviewRequired:true,
    descriptions:registry.repositories.map(({id,adoption,category})=>({id,adoption,category}))},null,2))
}else {
  console.error('Usage: node scripts/rust-migration-github-registry.mjs [status|lock]')
  process.exitCode=2
}
