// Verify the actual signed and launched QA .app, never source Vite or prod.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {existsSync,readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'

const app=join(homedir(),'Applications/EXO ClothCraft Studio V2 QA.app')
const resources=join(app,'Contents/Resources')
const run=(exe,args)=>execFileSync(exe,args,{encoding:'utf8',timeout:20000}).trim()
const result={app,packagedApp:false,signed:false,ports:{},nativeWindow:false,nativeReady:false,
  splitCodePackaged:false,guiClick:'untested-accessibility-permission'}
try {
  assert(existsSync(join(app,'Contents/MacOS/EXOClothCraft')))
  assert.equal(run('/usr/libexec/PlistBuddy',['-c','Print CFBundleIdentifier',join(app,'Contents/Info.plist')]),'com.mikristian.exo.clothcraft.workspace.v2.qa')
  run('/usr/bin/codesign',['--verify','--deep','--strict',app])
  result.signed=true
  assert(existsSync(join(resources,'web/index.html')))
  assert(existsSync(join(resources,'integrations/clothcraft/collaboration.mjs')))
  const assets=join(resources,'web/assets')
  const scripts=readdirSync(assets).filter(p=>p.endsWith('.js')).map(p=>readFileSync(join(assets,p),'utf8'))
  result.splitCodePackaged=scripts.some(s=>s.includes('split')&&s.includes('Pattern'))
  assert(result.splitCodePackaged)
  assert(scripts.some(s=>s.includes('127.0.0.1:5485')))
  result.packagedApp=true
  const ports=run('/usr/sbin/lsof',['-nP','-iTCP:5485','-iTCP:5486','-sTCP:LISTEN'])
  assert(ports.includes('127.0.0.1:5485')&&ports.includes('127.0.0.1:5486'))
  result.ports={bridge:5485,web:5486}
  const health=await fetch('http://127.0.0.1:5485/health',{signal:AbortSignal.timeout(5000)}).then(r=>r.json())
  assert.equal(health.nativeReady,true)
  result.nativeReady=true
  assert.equal((await fetch('http://127.0.0.1:5486/',{signal:AbortSignal.timeout(5000)})).status,200)
  // macOS WindowServer is independent of Accessibility permissions: verifies
  // the actual QA process owns a visible native window.
  const swift='import CoreGraphics; let a=CGWindowListCopyWindowInfo([.optionOnScreenOnly],kCGNullWindowID) as? [[String:Any]] ?? []; for w in a {let owner=w[kCGWindowOwnerName as String] as? String ?? ""; if owner.contains("EXO") {print(owner)}}'
  const windows=run('/usr/bin/swift',['-e',swift])
  result.nativeWindow=windows.includes('EXO ClothCraft Studio V2 QA')
  assert(result.nativeWindow,'QA native window missing from WindowServer')
  result.pass=true
} catch(error){result.pass=false;result.error=error.message;process.exitCode=1}
console.log(JSON.stringify(result,null,2))
