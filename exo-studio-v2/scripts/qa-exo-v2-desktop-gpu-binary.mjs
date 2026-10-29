// Gate installed EXO V2 native releases against accidentally packaging a
// CPU-only exo-session behind a GPU-enabled launcher. Isolated preset only;
// never reads or modifies the user's saved fitting-project.json.
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root=path.resolve(import.meta.dirname,'..')
const binary=path.resolve(process.argv[2]||path.join(root,'research/oss/clothcraft/target/debug/exo-session'))
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert.ok(fs.statSync(binary).isFile(),'EXO V2 native executable is missing')
assert.ok(fs.statSync(avatar).isFile(),'EXO V2 test mannequin is missing')

const capability=spawnSync(binary,['--exo-capabilities'],{
  encoding:'utf8',timeout:5000,maxBuffer:4096,
})
assert.equal(capability.status,0,'Native capabilities probe failed: '+capability.stderr)
const supported=JSON.parse(capability.stdout.trim())
assert.equal(supported.ok,true)
assert.equal(supported.desktopFeature,true,'Release binary lacks the Cargo desktop feature')
assert.equal(supported.gpuSimulation,true,'Release binary cannot run GPU simulation')

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-v2-native-desktop-'))
try {
  const started=Date.now()
  const opened=spawnSync(binary,[avatar,path.join(dir,'session.native'),'--gpu'],{
    input:'{"op":"open","preset":"tshirt","avatar":false}\n{"op":"step","steps":1,"revision":0}\n',
    encoding:'utf8',timeout:45000,maxBuffer:16*1024*1024,
    cwd:path.join(root,'research/oss/clothcraft'),
  })
  assert.equal(opened.status,0,'GPU native process exited abnormally: '+opened.stderr)
  const lines=opened.stdout.trim().split('\n')
  assert.equal(lines.length,2,'GPU native binary must answer garment Open and one physics Step')
  const reply=JSON.parse(lines[0])
  const step=JSON.parse(lines[1])
  assert.equal(reply.ok,true,reply.error||opened.stderr)
  assert.match(reply.data?.backend||'',/GPU VBD/,'GPU native build did not select GPU simulation')
  assert.ok((reply.data?.panels||[]).length>=2,'GPU native preset has no drawable panels')
  assert.ok((reply.data?.triangles||[]).length>0,'GPU native preset has no 3D garment mesh')
  assert.equal(step.ok,true,step.error||'GPU VBD physics step failed')
  assert.ok(step.data?.time>reply.data?.time,'GPU VBD did not advance simulation time')
  console.log(JSON.stringify({pass:true,desktopFeature:true,gpuSimulation:true,
    panels:reply.data.panels.length,triangles:reply.data.triangles.length,
    gpuStep:true,elapsedMs:Date.now()-started}))
}finally {
  fs.rmSync(dir,{recursive:true,force:true})
}
