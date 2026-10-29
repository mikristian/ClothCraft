// Reproducible bounded test loop. Runs in the current workspace; never edits
// native projects, installed apps, or manufacturing fixtures.
import {spawnSync} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
const cwd=process.cwd()
const suites=[
 ['curve metric oracle','research/clo-2d-analysis/engine-rig/qa-partial-curve-seams.mjs'],
 ['native WASM geometry','scripts/qa-rust-geometry-kernel.mjs'],
 ['closed topology','scripts/check-drafting-topology.mjs'],
 ['precise splits','scripts/check-drafting-splits.mjs'],
 ['symmetric unfold','scripts/check-drafting-unfold.mjs'],
 ['drafting precision','scripts/check-drafting-precision.mjs'],
 ['partial sewing','scripts/check-partial-seams.mjs'],
 ['DXF roundtrip','scripts/dxf-roundtrip-check.mjs'],
 ['factory handoff','scripts/check-production-handoff.mjs'],
 ['sewing construction fixture','scripts/check-sewing-construction.mjs'],
]
const rounds=Math.max(1,Math.min(5,Number(process.argv[2])||3))
const output=[]
for(let round=1;round<=rounds;round++){
  for(const [name,script] of suites){
    const start=performance.now()
    const result=spawnSync(process.execPath,[script],{cwd,encoding:'utf8',timeout:30000,maxBuffer:1024*1024})
    const raw=(result.stderr||'')+'\n'+(result.stdout||'')
    const missing=raw.includes('ENOENT')&&raw.includes('clo-male-tshirt-sewn-EXPERIMENTAL.garment.json')
    output.push({round,name,script,state:result.status===0?'PASS':missing?'BLOCKED_MISSING_FIXTURE':'FAIL',durationMs:Math.round(performance.now()-start),exitCode:result.status,message:raw.trim().slice(-800)})
  }
}
const counts=output.reduce((a,r)=>(a[r.state]=(a[r.state]||0)+1,a),{})
const summary={createdAt:new Date().toISOString(),rounds,cases:suites.length,total:output.length,counts,results:output}
const dir='research/clo-2d-analysis/engine-rig/results';mkdirSync(dir,{recursive:true})
const filename=join(dir,'engineering-loop-latest.json')
writeFileSync(filename,JSON.stringify(summary,null,2)+'\n')
console.log(JSON.stringify({rounds,cases:suites.length,counts,report:filename},null,2))
if(counts.FAIL)process.exitCode=1
