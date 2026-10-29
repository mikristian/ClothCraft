import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const root=new URL('../benchmarks/golden-garments/v1/',import.meta.url)
const command=(dir)=>spawnSync(process.execPath,['scripts/check-golden-garments-20261028.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,...(dir?{EXO_GOLDEN_LIBRARY_DIR:dir}:{})},encoding:'utf8',timeout:60000})
test('immutable golden set passes: 25 fixtures, 150 graded sizes',()=>{const result=command();assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/150\/150 graded size checks, 25\/25 fixtures/)})
test('edited fixture cannot silently redefine golden truth',()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'exo-golden-drift-'));try{fs.cpSync(root,tmp,{recursive:true});const p=path.join(tmp,'tee-classic.json');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('Regular tee','Changed tee'));const result=command(tmp);assert.notEqual(result.status,0);assert.match(result.stdout,/GOLDEN_HASH_DRIFT/)}finally{fs.rmSync(tmp,{recursive:true,force:true})}})
test('missing benchmark fixture fails rather than shrinking comparison population',()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'exo-golden-missing-'));try{fs.cpSync(root,tmp,{recursive:true});fs.rmSync(path.join(tmp,'trouser-straight.json'));const result=command(tmp);assert.notEqual(result.status,0);assert.match(result.stdout,/MISSING_FILE/)}finally{fs.rmSync(tmp,{recursive:true,force:true})}})
