#!/usr/bin/env node
// Read-only coverage QA for EXO's macOS WebView WASM required-asset gate.
// Does not build, sign, install, copy assets or modify the shared build script.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
const root = resolve(import.meta.dirname, '..')
const script = readFileSync(join(root,'integrations/clothcraft/macos/build.sh'),'utf8')
const start = script.indexOf('for required in index.html ')
const end = start < 0 ? -1 : script.indexOf('; do',start)
if (start < 0 || end < 0) throw new Error('macOS required-asset loop not found; manual packaging audit required')
const requiredBlock = script.slice(start,end)
const requiredNames = [...requiredBlock.matchAll(/\bwasm\/(exo_[A-Za-z0-9_]+\.wasm)\b/g)].map(m=>m[1])
const required = new Set(requiredNames)
const wasmDir = join(root,'public/wasm')
const present = readdirSync(wasmDir).filter(f=>/^exo_[\w]+\.wasm$/.test(f)).sort()
const presentSet = new Set(present)
const missingRequired = [...required].filter(f=>!presentSet.has(f) || statSync(join(wasmDir,f)).size===0).sort()
const notExplicitlyRequired = present.filter(f=>!required.has(f))
const evidence = {
  status: missingRequired.length ? 'FAIL' : notExplicitlyRequired.length ? 'GAP' : 'PASS',
  note:'Static source/package asset audit only. Files in dist may be copied without being explicitly validated; installed execution is not tested.',
  presentWasmAssets:present.length,
  explicitlyRequiredWasmAssets:required.size,
  duplicateRequiredEntries:requiredNames.length-required.size,
  missingOrEmptyRequired:missingRequired,
  notExplicitlyRequired,
  includesCopyStep:script.includes('rsync -a --delete "$STAGED_WEB/" "$RES/web/"'),
  includesSizeGate:script.includes('[[ ! -s "$RES/web/$required" ]]'),
}
if (!evidence.includesCopyStep || !evidence.includesSizeGate || evidence.duplicateRequiredEntries) {
  evidence.status='FAIL'
}
console.log(JSON.stringify(evidence,null,2))
if (evidence.status==='FAIL' || (process.argv.includes('--strict') && evidence.status==='GAP')) process.exitCode=1
