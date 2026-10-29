// Production-contract smoke test: every authored template must open in the
// native Rust session without modifying the user's running V2 workspace.
import assert from 'node:assert/strict'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {GARMENT_TEMPLATES,createTemplateProject} from '../src/data/templates.js'
import {prepareNativePatternExport} from '../src/core/nativePatternExportPreparation.js'

const root=path.resolve(import.meta.dirname,'..')
const app=path.join(os.homedir(),'Applications','EXO ClothCraft Studio V2.app','Contents','Resources')
const cpp=process.env.GARMENT_CPP_CLI||path.join(root,'native_cpp/build-placement-qa/garment_cad_cli')
const rust=process.env.EXO_NATIVE_RUST_SESSION||path.join(app,'research/oss/clothcraft/target/debug/exo-session')
const avatar=process.env.EXO_NATIVE_RUST_AVATAR||path.join(app,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
for(const file of [cpp,rust,avatar])assert.ok(fs.existsSync(file),`Missing test fixture ${file}`)
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'exo-garment-library-rust-'))
let passed=0
try{
  for(const template of GARMENT_TEMPLATES){
    const source=createTemplateProject(template.id)
    const {document,report}=prepareNativePatternExport(source)
    assert.equal(report.removedSeams,0,`${template.id}: no garment seam may be lost`)
    const conversion=spawnSync(cpp,[],{input:JSON.stringify({protocol:'garment-studio.native-cad.v1',op:'clothcraft-export',document})+'\n',encoding:'utf8',timeout:20000,maxBuffer:32*1024*1024})
    assert.equal(conversion.status,0,`${template.id}: C++ conversion ${conversion.stderr}`)
    const exchange=JSON.parse(conversion.stdout)
    assert.equal(exchange.ok,true,`${template.id}: ${exchange.error}`)
    const proposed=exchange.interchange.template
    const run=spawnSync(rust,[avatar,path.join(scratch,`${template.id}.native`)],{
      input:JSON.stringify({op:'open',template:proposed,avatar:false})+'\n',encoding:'utf8',timeout:60000,maxBuffer:128*1024*1024,
    })
    assert.equal(run.status,0,`${template.id}: Rust process ${run.error?.message||run.stderr}`)
    const line=run.stdout.split('\n').find(row=>row.trim().startsWith('{'))
    const answer=line&&JSON.parse(line)
    assert.equal(answer?.ok,true,`${template.id}: native Rust open ${answer?.error||'missing answer'}`)
    assert.equal(answer.data.template.panels.length,proposed.panels.length)
    assert.equal(answer.data.template.seams.length,proposed.seams.length)
    assert.ok(answer.data.positions.length>0,`${template.id}: native vertex data missing`)
    console.log(`PASS ${template.id} ${proposed.panels.length} panels ${proposed.seams.length} seams ${answer.data.positions.length} native vertices`)
    passed++
  }
  console.log(`PASS ${passed}/${GARMENT_TEMPLATES.length} native Rust session opens; active user project untouched`)
}finally{fs.rmSync(scratch,{force:true,recursive:true})}
