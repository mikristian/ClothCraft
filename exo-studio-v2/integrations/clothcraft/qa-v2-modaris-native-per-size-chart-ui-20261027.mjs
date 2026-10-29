// Native per-size chart authoring UI smoke gate. Chrome+Rust UI acceptance
// remains open; the independent native authored-to-Rust E2E is separate.
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const result=spawnSync(process.execPath,['--test','src/components/ModarisNativePerSizeChartStudio20261027.test.mjs'],{cwd:root,encoding:'utf8',timeout:90000})
assert.equal(result.status,0,`Native chart controls failed: ${result.stderr}\n${result.stdout}`)
console.log(JSON.stringify({ok:true,checks:'Native six-size input controls; native project/fabric/grade preflight; saved POM bounds',chromeE2E:false,nativeStoreValidatedSeparately:true,factoryApproved:false}))
