#!/usr/bin/env node
// Read-only, heuristic function-level migration triage; not verified Rust ownership.
import { parseSync } from 'oxc-parser'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const skip = new Set(['parent', 'scope', 'comments', 'tokens'])
const functionTypes = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'])
const bridgeFile = /(?:^|\/)rust[A-Z]\w*Kernel\.[cm]?js$/
const numericCall = /^(?:Math\.|(?:vec|mat|quat|geometry|solver|calculate|compute|interpolate|normalize|project|triangulate|distance|length|dot|cross))/i
const coordinate = /(?:vertex|vertices|particle|constraint|strain|triangle|mesh|collision|seam|geometry|gradient|matrix|vector|physics|solver|intersection|curvature|normal|uv|barycentric)/i

function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) { for (const n of node) walk(n, visit); return }
  if (visit(node) === false) return
  for (const [key, value] of Object.entries(node)) if (!skip.has(key) && value && typeof value === 'object') walk(value, visit)
}

function memberName(node) {
  if (!node) return ''
  if (node.type === 'Identifier') return node.name
  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression')
    return memberName(node.object) + '.' + (node.property?.name ?? node.property?.value ?? '')
  return ''
}

function collectFunctions(ast) {
  const functions = []
  const names = new Map()
  walk(ast, (node) => {
    if (functionTypes.has(node.type)) functions.push({node, name:node.id?.name ?? null})
    if (node.type === 'VariableDeclarator' && functionTypes.has(node.init?.type))
      names.set(node.init,node.id?.name ?? null)
    if ((node.type === 'MethodDefinition' || node.type === 'Property' || node.type === 'PropertyDefinition') && functionTypes.has(node.value?.type))
      names.set(node.value,node.key?.name ?? String(node.key?.value ?? ''))
  })
  for (const item of functions) if (names.has(item.node)) item.name=names.get(item.node)
  return functions
}

export function analyzeFunctionOwnership(file, source) {
  const parsed = parseSync(file, source)
  const errors = parsed.errors.map(e=>String(e.message ?? e))
  if (errors.length) return {file, errors, functions:[]}
  const imports = new Map()
  for (const statement of parsed.program.body) {
    if (statement.type !== 'ImportDeclaration') continue
    const bridge = bridgeFile.test(statement.source?.value ?? '')
    for (const spec of statement.specifiers ?? []) if (spec.local?.name) imports.set(spec.local.name, bridge)
  }
  const isBridgeFile = bridgeFile.test(file)
  const functions = collectFunctions(parsed.program).map(({node,name},index)=>{
    let math=0, arithmetic=0, loops=0, domain=0, bridgeCalls=0, wasmCalls=0, otherCalls=0
    walk(node.body, child=>{
      if (child !== node.body && functionTypes.has(child.type)) return false
      if (child.type === 'BinaryExpression' && ['+','-','*','/','%','**'].includes(child.operator)) arithmetic++
      if (child.type === 'ForStatement' || child.type === 'WhileStatement' || child.type === 'DoWhileStatement' || child.type === 'ForOfStatement') loops++
      if (child.type === 'Identifier' && coordinate.test(child.name)) domain++
      if (child.type === 'CallExpression' || child.type === 'OptionalCallExpression') {
        const callee = memberName(child.callee)
        const base = callee.split('.')[0]
        if (imports.get(base) === true || /^(?:tryRust|runRust|callRust)/.test(callee)) bridgeCalls++
        else if (/^(?:WebAssembly\.|.*\.exports\.|.*\.instance\.exports\.)/.test(callee)) wasmCalls++
        else if (numericCall.test(callee)) math++
        else otherCalls++
      }
    })
    const loc = source.slice(0,node.start).split('\n').length
    const lines = source.slice(node.start,node.end).split('\n').length
    const numerical = math>0 || (arithmetic>=3 && (loops>0 || domain>0))
    // Bridge modules can retain meaningful synchronous numerical JS fallbacks.
    // A bridge filename alone must never suppress those candidates. Require
    // multiple arithmetic operations or a numerical loop to avoid scoring
    // small ABI glue, pointer arithmetic and readiness checks as algorithms.
    const substantialFallback = numerical && (arithmetic>=3 || (loops>0 && (math>0 || domain>0)))
    const classification = isBridgeFile ? (substantialFallback ? 'rust-bridge-js-numerical-fallback' : 'rust-bridge-glue-or-small-js') : bridgeCalls || wasmCalls ?
      (numerical ? 'mixed-js-and-rust-bridge' : 'rust-bridge-delegation') :
      numerical ? 'js-numerical-implementation' : 'js-other-implementation'
    const score = classification === 'js-numerical-implementation' || classification === 'mixed-js-and-rust-bridge' || classification === 'rust-bridge-js-numerical-fallback'
      ? Math.round(10*Math.min(domain,12) + 7*Math.min(loops,8) + 5*Math.min(math,12) +
          2*Math.min(arithmetic,25) + Math.min(lines,150) + (classification.startsWith('mixed') ? -60 : 0)) : 0
    return {file,name:name || `<anonymous:${index+1}>`,line:loc,lines,classification,score,
      evidence:{arithmetic,loops,mathCalls:math,domainIdentifiers:domain,bridgeCalls,wasmCalls,otherCalls}}
  })
  return {file,errors,functions}
}

export function prioritizeFunctions(sources, {limit=20, workstreams=[]}={}) {
  const files = Object.keys(sources).sort()
  const analyzed=files.map(file=>analyzeFunctionOwnership(file,sources[file]))
  const candidates=analyzed.flatMap(x=>x.functions).filter(f=>f.score>0)
    .map(f=>({...f,ownership:workstreams.filter(w=>w.scope?.some(s=>
      s.endsWith('/') ? f.file.startsWith(s) : s.includes('*') ?
        f.file.startsWith(s.split('*')[0]) && f.file.endsWith(s.split('*')[1]) :
        f.file===s || f.file.startsWith(s+'/'))).map(w=>w.id).sort()}))
    .sort((a,b)=>b.score-a.score || a.file.localeCompare(b.file) || a.line-b.line || a.name.localeCompare(b.name))
  return {schema:1,scope:'static Oxc JS function triage in src/core',
    caveat:'Scores are heuristic priorities, not proof of runtime reachability, absence of Rust equivalents, or verified Rust functional ownership.',
    files:files.length,functions:analyzed.reduce((sum,x)=>sum+x.functions.length,0),
    parseFailures:analyzed.filter(x=>x.errors.length).map(x=>({file:x.file,errors:x.errors})),
    classifications:Object.fromEntries([...new Set(analyzed.flatMap(x=>x.functions.map(f=>f.classification)))].sort().map(k=>
      [k,analyzed.flatMap(x=>x.functions).filter(f=>f.classification===k).length])),
    candidateCount:candidates.length,top:candidates.slice(0,limit)}
}

export function scanCore(rootDir=root) {
  const git=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','src/core'],
    {cwd:rootDir,encoding:'utf8',maxBuffer:8*1024*1024})
  if (git.status!==0) throw new Error(`git inventory failed: ${git.stderr}`)
  const sources={}
  for (const file of [...new Set(git.stdout.split('\0').filter(Boolean))].sort()) {
    if (!/\.([cm]?js|jsx)$/.test(file) || /(?:\.test\.|\.spec\.|\/__tests__\/)/.test(file)) continue
    try {sources[file]=readFileSync(resolve(rootDir,file),'utf8')} catch(e) {if(e.code!=='ENOENT') throw e}
  }
  return sources
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const count=Number(process.argv.find(a=>a.startsWith('--top='))?.split('=')[1] ?? 20)
  if (!Number.isInteger(count) || count<1 || count>100) throw new Error('--top must be an integer from 1 to 100')
  const swarm=JSON.parse(readFileSync(resolve(root,'docs/engineering/exo-rust-swarm-20.json'),'utf8'))
  const report=prioritizeFunctions(scanCore(),{limit:count,workstreams:swarm.workstreams ?? []})
  console.log(JSON.stringify(report,null,2))
  if (report.parseFailures.length) process.exitCode=1
}
