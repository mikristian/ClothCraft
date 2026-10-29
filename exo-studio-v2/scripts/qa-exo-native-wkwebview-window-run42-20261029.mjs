// RUN42: actual installed EXO AppKit + WKWebView visibility, READ ONLY.
// Never focuses, reloads, clicks, types into, or changes the user's garment.
// This is native-window/AX evidence, NOT a functional WKWebView click test.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {readFileSync,existsSync} from 'node:fs'
import {homedir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const app=path.join(homedir(),'Applications/EXO ClothCraft Studio V2.app')
const executable=path.join(app,'Contents/MacOS/EXOClothCraft')
const binary=path.join(app,'Contents/Resources/research/oss/clothcraft/target/debug/exo-session')
const userProject=path.join(homedir(),'Library/Application Support/EXO-ClothCraft-Studio-V2/Output/workspace/fitting-project.json')
const expectedTitle='EXO ClothCraft Studio V2'
const expectedWebTitle='EXO ClothCraft Studio — Native Rust Garment Workspace'
const run=(exe,args,timeout=20000)=>execFileSync(exe,args,{encoding:'utf8',timeout,maxBuffer:1024*1024}).trim()
const fileSha=filename=>createHash('sha256').update(readFileSync(filename)).digest('hex')
const processLines=()=>run('/bin/ps',['-axo','pid=,command=']).split('\n')
const swift=String.raw`
import Foundation
import CoreGraphics
let target=Int(CommandLine.arguments.last ?? "") ?? -1
let windows=(CGWindowListCopyWindowInfo([.optionOnScreenOnly],kCGNullWindowID) as? [[String:Any]] ?? []).compactMap { row -> [String:Any]? in
  guard row[kCGWindowOwnerPID as String] as? Int == target,
    row[kCGWindowLayer as String] as? Int == 0,
    let bounds=row[kCGWindowBounds as String] as? [String:Any] else { return nil }
  return ["id":row[kCGWindowNumber as String] as? Int ?? 0,
    "title":row[kCGWindowName as String] as? String ?? "",
    "width":bounds["Width"] as? Int ?? 0,"height":bounds["Height"] as? Int ?? 0,
    "onscreen":row[kCGWindowIsOnscreen as String] as? Bool ?? false]
}
let data=try! JSONSerialization.data(withJSONObject:windows)
print(String(decoding:data,as:UTF8.self))
`
const ax=`
tell application "System Events"
  tell (first application process whose unix id is __PID__)
    set countWindows to count of windows
    if countWindows is not 1 then return "WINDOW_COUNT|" & countWindows
    set w to first window
    set n to name of w as text
    set web to first UI element of first scroll area of first group of first group of w
    return "WEB_AREA|" & n & "|" & (role of web as text) & "|" & (description of web as text) & "|" & (count of UI elements of web)
  end tell
end tell`

export function assessNativeWindowRun42({processCount,windowRecords,axRecord,serverHealth,projectUnchanged,signatureVerified}={}) {
  const failures=[]
  if(processCount!==1)failures.push('Expected exactly one EXO installed Swift process')
  if(!signatureVerified)failures.push('Installed code signature not verified')
  if(!Array.isArray(windowRecords)||windowRecords.length!==1||
    windowRecords[0]?.title!==expectedTitle||!windowRecords[0].onscreen||
    windowRecords[0].width<970||windowRecords[0].height<650)
    failures.push('Expected one onscreen AppKit window with EXO title and valid dimensions')
  const axParts=typeof axRecord==='string'?axRecord.split('|'):[]
  if(axParts.length!==5||axParts[0]!=='WEB_AREA'||axParts[1]!==expectedTitle||
     axParts[2]!=='AXWebArea'||axParts[3]!==expectedWebTitle||
     !Number.isSafeInteger(Number(axParts[4]))||Number(axParts[4])<2)
    failures.push('Installed WKWebView AXWebArea was not independently readable')
  if(serverHealth?.ok!==true||serverHealth?.nativeReady!==true||
    serverHealth?.nativeSession?.loaded!==true)
    failures.push('Installed native Rust workspace is not live and loaded')
  if(!projectUnchanged)failures.push('Personal fitting project changed during read-only verification')
  return {pass:failures.length===0,failures,nativeWindowReadOnly:true,
    didClick:false,didReload:false,didMutateDocument:false,
    wkWebViewClicksCertified:false,manufacturingApproved:false}
}

async function main(){
  const projectBefore=existsSync(userProject)?fileSha(userProject):null
  assert(existsSync(executable)&&existsSync(binary),'Real EXO installed app/binary missing')
  run('/usr/bin/codesign',['--verify','--deep','--strict',app],30000)
  const matching=processLines().map(row=>row.trim()).filter(row=>row.endsWith(' '+executable))
  const processIds=matching.map(row=>Number(row.split(/\s+/)[0])).filter(Number.isSafeInteger)
  const pid=processIds.length===1?processIds[0]:-1
  const windowRecords=pid>0?JSON.parse(run('/usr/bin/swift',['-e',swift,String(pid)],30000)):[]
  let axRecord='',axProbeAttempts=0
  // macOS AX can transiently publish an AppKit window before its WebKit
  // descendant is queryable. Retry only the read-only accessibility lookup;
  // never activate, focus, click, reload or change the user's native window.
  if(pid>0)for(let attempt=0;attempt<3;attempt++){
    axProbeAttempts++
    try{axRecord=run('/usr/bin/osascript',['-e',ax.replace('__PID__',String(pid))],15000)}
    catch(error){axRecord='AX_FAILED|'+String(error.message).slice(0,120)}
    if(axRecord.startsWith('WEB_AREA|'))break
    if(attempt<2)await new Promise(resolve=>setTimeout(resolve,250))
  }
  let serverHealth=null
  try{serverHealth=await fetch('http://127.0.0.1:5385/health',{
    signal:AbortSignal.timeout(4000)}).then(response=>response.json())}catch{}
  const projectAfter=existsSync(userProject)?fileSha(userProject):null
  const check=assessNativeWindowRun42({
    processCount:processIds.length,windowRecords,axRecord,serverHealth,
    projectUnchanged:projectBefore===projectAfter,signatureVerified:true})
  console.log(JSON.stringify({schema:'exo.native-wkwebview-readonly-run42.v1',
    ...check,pid:pid>0?pid:null,window:windowRecords[0]||null,
    axProbeAttempts,
    webAreaVisible:axRecord.startsWith('WEB_AREA|'),
    personalProjectHashBefore:projectBefore,personalProjectHashAfter:projectAfter,
    nativeReady:serverHealth?.nativeReady===true,
    nativeLoaded:serverHealth?.nativeSession?.loaded===true},null,2))
  if(!check.pass)process.exitCode=1
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{console.error(JSON.stringify({pass:false,error:String(error.message)}));process.exitCode=1})
}
