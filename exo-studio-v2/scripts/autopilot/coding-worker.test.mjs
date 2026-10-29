import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
const parent=mkdtempSync(join(tmpdir(),'exo-autopilot-test-'))
const worker=fileURLToPath(new URL('./coding-worker.mjs',import.meta.url))
const queue=join(parent,'queue.json')
const output=join(parent,'candidates')
const codex=join(parent,'fake-codex')
const template={schema:1,enabled:true,tasks:[{id:'RUST-900',title:'Fixture',objective:'No production changes',acceptance:'No-op test',status:'pending'}],runs:[]}
const setQueue=(tasks,enabled=true)=>writeFileSync(queue,JSON.stringify({...template,enabled,tasks}))
const run=(bin=codex)=>spawnSync(process.execPath,[worker,'--dry-run'],{encoding:'utf8',env:{...process.env,EXO_MIGRATION_QUEUE_FILE:queue,EXO_AUTOPILOT_OUTPUT:output,EXO_AUTOPILOT_CODEX:bin}})
try {
  mkdirSync(output)
  writeFileSync(codex,'#!/bin/sh\nif [ "$1" = login ] && [ "$2" = status ]; then echo "Logged in using ChatGPT"; exit 0; fi\nexit 42\n',{mode:0o755})
  setQueue([{...template.tasks[0],status:'active',runId:'owned-by-prime'}])
  let r=run();assert.equal(r.status,0);assert.match(r.stdout,/active task exists/)
  setQueue(template.tasks)
  r=run(join(parent,'missing-cli'));assert.equal(r.status,0);assert.match(r.stdout,/Codex binary missing/)
  writeFileSync(codex,'#!/bin/sh\necho Not authenticated\nexit 1\n',{mode:0o755})
  r=run();assert.equal(r.status,0);assert.match(r.stdout,/Codex login unavailable/)
  writeFileSync(codex,'#!/bin/sh\nif [ "$1" = login ]; then echo "Logged in using ChatGPT"; exit 0; fi\nexit 42\n',{mode:0o755})
  r=run();assert.equal(r.status,0);assert.match(r.stdout,/dry-run/)
  assert.equal(JSON.parse(readFileSync(queue)).tasks[0].status,'pending','dry run must not claim')
  console.log('PASS active exclusion, missing binary, missing login, authenticated dry-run, unchanged queue; no network or Codex model invocation')
}finally{rmSync(parent,{recursive:true,force:true})}
