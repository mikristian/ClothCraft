// RUN43: real, isolated Swift/WKWebView acceptance. Not Chrome.
// Only operates a separately identified QA app; original garment stays intact.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {execFileSync,spawnSync} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'
import {fileURLToPath} from 'node:url'

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const qaApp=path.join(repo,'integrations/clothcraft/output/qa-native-run43-20261029/EXO ClothCraft Studio V2 QA RUN43.app')
const liveApp=path.join(os.homedir(),'Applications/EXO ClothCraft Studio V2.app')
const liveProject=path.join(os.homedir(),'Library/Application Support/EXO-ClothCraft-Studio-V2/Output/workspace/fitting-project.json')
const report=path.join(os.homedir(),'Library/Application Support/EXO-ClothCraft-Studio-V2-QA-Run43/Output/native-wkwebview-run43.json')
const run=(exe,args)=>execFileSync(exe,args,{encoding:'utf8',timeout:30000,maxBuffer:1048576}).trim()
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const getJson=async url=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(2500)})
  assert.equal(response.ok,true,'HTTP failure '+url)
  return response.json()
}
const wait=async(fn,tries=120)=>{
  for(let i=0;i<tries;i++){
    try{const result=await fn();if(result)return result}catch{}
    await sleep(400)
  }
  throw Error('Isolated EXO QA fixture did not become ready')
}

export function assessRun43Receipt(data,hashBefore,hashAfter){
  const problems=[]
  if(data?.schema!=='exo.run43.native-wkwebview-qa.v1'||data?.pass!==true)
    problems.push('QA receipt is not a successful native WKWebView result')
  if(data?.source!=='isolated-macos-wkwebview'||data?.origin!=='http://127.0.0.1:5486')
    problems.push('Wrong QA host or origin')
  if(data?.actualWKWebViewDOMInteraction!==true||data?.libraryOpened!==true||
     data?.libraryClosed!==true||data?.libraryRestored!==true||
     data?.nativeToolbarUndoPresent!==true||
     data?.nativeToolbarRedoPresent!==true||!(data?.panels>=2)||
     !(data?.canvases>=1)||!Array.isArray(data?.errors)||data.errors.length)
    problems.push('Actual native WKWebView controls were not verified')
  if(data?.physicalMouseOrKeyboardVerified!==false||data?.factoryApproved!==false)
    problems.push('Unsupported native physical keyboard or factory approval')
  if(!hashBefore||hashBefore!==hashAfter)
    problems.push('Production project content changed')
  return {pass:problems.length===0,problems,nativeWKWebViewDOM:data?.actualWKWebViewDOMInteraction===true,
    physicalMouseOrKeyboardVerified:false,manufacturingApproved:false}
}

async function main(){
  assert(fs.existsSync(qaApp),'Isolated RUN43 QA app not yet built')
  assert(fs.existsSync(liveProject),'Production garment unavailable')
  if(fs.existsSync(report)){
    // Retain old negative/positive evidence, but do not accept a stale receipt
    // for a fresh QA launch. This is inside the isolated QA support folder only.
    fs.renameSync(report,report+'.previous-'+Date.now())
  }
  assert.equal(run('/usr/libexec/PlistBuddy',['-c','Print CFBundleIdentifier',path.join(qaApp,'Contents/Info.plist')]),
    'com.mikristian.exo.clothcraft.workspace.v2.qa.run43')
  run('/usr/bin/codesign',['--verify','--deep','--strict',qaApp])
  run('/usr/bin/codesign',['--verify','--deep','--strict',liveApp])
  for(const port of [5485,5486]){
    const probe=spawnSync('/usr/sbin/lsof',['-nP','-tiTCP:'+port,'-sTCP:LISTEN'],{encoding:'utf8'})
    assert(!probe.stdout?.trim(),'Run43 port already claimed: '+port)
  }
  const before=sha(liveProject)
  const nativePath='Contents/Resources/research/oss/clothcraft/target/debug/exo-session'
  const liveNativeBefore=sha(path.join(liveApp,nativePath))
  assert.equal((await getJson('http://127.0.0.1:5385/health')).nativeReady,true)
  try{
    run('/usr/bin/open',['-a',qaApp])
    await wait(async()=>{
      const h=await getJson('http://127.0.0.1:5485/health')
      const w=await fetch('http://127.0.0.1:5486/',{signal:AbortSignal.timeout(2000)})
      return h.nativeReady===true && w.ok
    })
    const receipt=await wait(()=>fs.existsSync(report)?JSON.parse(fs.readFileSync(report,'utf8')):null)
    const result=assessRun43Receipt(receipt,before,sha(liveProject))
    assert.equal(sha(path.join(liveApp,nativePath)),liveNativeBefore,'Production native binary changed')
    console.log(JSON.stringify({schema:'exo.run43.installed-isolated-wkwebview.v1',
      ...result,qaApp,productionProjectUnchanged:before===sha(liveProject),
      qaBridgePort:5485,qaWebPort:5486,receipt},null,2))
    if(!result.pass)process.exitCode=1
  } finally{
    // Separate bundle ID, never requests quit on the production EXO app.
    try{run('/usr/bin/osascript',['-e',
      'tell application id "com.mikristian.exo.clothcraft.workspace.v2.qa.run43" to quit'])}
    catch{console.error('RUN43 QA app may remain open; production was not targeted')}
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{
    console.error(JSON.stringify({pass:false,reason:error.message,manufacturingApproved:false}))
    process.exitCode=1
  })
}
