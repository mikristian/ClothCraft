// Personal localhost-only EXO -> ClothCraft bridge, no network exposure.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { nativeExport, paths } from './bridge.mjs'
import { runContact } from './contact_run.mjs'
import { createWorkspace } from './workspace.mjs'
import { createAgentApi } from './agent-api.mjs'
import { createAgentKeyStore } from './agent-key-store.mjs'
import { createCollaborationApi } from './collaboration.mjs'
import { createAppleVisionHand } from './apple-vision-hand.mjs'
import { readPatternIntelligenceCatalog } from './pattern-intelligence-catalog.mjs'
import { evaluateSeamly2DRequest20261023 } from './seamly2dEngineRoute20261023.mjs'
import { gridcraftStatus, evaluateGridcraftFormula } from './gridcraftBridge.mjs'
import {inspectNativeVerifiedProductionSourceRun37,createNativeVerifiedProductionOrderRun37} from './native-verified-production-order-run37.mjs'
import {buildNativeVerifiedCutroomIntakeRun44,inspectNativeVerifiedCutroomIntakeRun44} from './native-verified-cutroom-intake-run44.mjs'
import {buildNativeVerifiedSinglePlyRollPlanRun44,inspectNativeVerifiedSinglePlyRollPlanRun44} from './native-verified-single-ply-roll-plan-run44.mjs'
import {publishNativeVerifiedMarkerArtifactsRun42,readNativeVerifiedMarkerArtifactRun42} from './native-verified-marker-artifacts-run42.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
// Standalone signed .apps must not write generated garments into Contents/Resources.
const outputs = path.resolve(process.env.EXO_CLOTHCRAFT_OUTPUT_DIR || path.join(root, 'integrations/clothcraft/output'))
const host = '127.0.0.1'
const port = Number(process.env.EXO_CLOTHCRAFT_PORT || 5193)
const origins = new Set(['http://127.0.0.1:5173', 'http://localhost:5173',
  'http://127.0.0.1:5174', 'http://localhost:5174',
  'http://127.0.0.1:5188', 'http://localhost:5188',
  'http://127.0.0.1:5189', 'http://localhost:5189',
  'http://127.0.0.1:5416', 'http://localhost:5416',
  'http://127.0.0.1:5386', 'http://localhost:5386',
  'http://127.0.0.1:5284', 'http://localhost:5284',
  'http://127.0.0.1:5286', 'http://localhost:5286'])
const maxBytes = 8 * 1024 * 1024
const files = new Map([
  ['template.json', 'application/json'], ['cloth.obj', 'text/plain'],
  ['patterns.svg', 'image/svg+xml'], ['fibers.json', 'application/json'],
  ['grain-guides.obj', 'text/plain'],
])
let activeContactRun = false
// Multi-step native SOURCE→CUT→order calls must not interleave with another
// native production request, including while its HTTP body is being read.
// Workspace mutations through /workspace still require independent revision
// and dependency revalidation inside each verified workflow.
let nativeVerifiedRequestBusy = false
let workspaceHttpInflight = 0
let agentHttpInflight = 0
const workspace = createWorkspace(outputs)
const agentApi = createAgentApi(workspace, {
  audit: entry => console.info('[agent-api]', JSON.stringify(entry)),
  allowOrigin: origin => origins.has(origin),
  // This directory lives in per-user Application Support in signed V2;
  // credentials survive app updates and are never packed into the web bundle.
  keyStorePath: path.join(outputs, 'agent-keys.json'),
})
// Collaboration uses the existing revocable, scoped local-agent credentials.
// Browser Origin alone is never an identity or permission grant.
const collaborationKeys = createAgentKeyStore(path.join(outputs, 'agent-keys.json'))
const collaborationApi = createCollaborationApi({
  directory: path.join(outputs, 'collaboration'),
  allowOrigin: origin => origins.has(origin),
  authenticate: async token => {
    const identity = collaborationKeys.authenticate(token)
    return identity?.scopes?.includes('read') ? {userId: identity.id, scopes:identity.scopes} : null
  },
})
const appleVisionHand=createAppleVisionHand()
process.on("exit", () => {agentApi.close();appleVisionHand.close();workspace.close()})
process.on("SIGTERM", () => { agentApi.close(); appleVisionHand.close(); collaborationApi.close(); workspace.close(); server.close(); process.exit(0) })

function send(res, code, payload, origin = '') {
  const content = JSON.stringify(payload)
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    ...(origins.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) })
  res.end(content)
}

// Optional private local Rust validator/serializer. Its output is only accepted
// when byte-identical to Node, so route contracts survive missing binaries.
function rustHealthPayload(snapshot) {
  const original = JSON.stringify(snapshot)
  if (process.env.EXO_HEALTH_RUST !== '1') return original
  const binary = process.env.EXO_HEALTH_RUST_BINARY || path.join(root, 'rust/exo_health_kernel/target/release/exo-health-kernel')
  if (!fs.existsSync(binary)) return original
  const result = spawnSync(binary, [], {input:original,encoding:'utf8',timeout:250,maxBuffer:65536})
  return !result.error && result.status===0 && result.stdout===original ? result.stdout : original
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let completed = false
    const settle = (error, value) => {
      if (completed) return
      completed = true
      req.setTimeout(0)
      if (error) reject(error)
      else resolve(value)
    }
    // A disconnected or stalled loopback client must not retain the native
    // production mutex forever before its request body reaches 'end'.
    req.setTimeout(30000, () => {
      settle(new Error('Request body timed out'))
      req.destroy()
    })
    req.on('aborted', () => settle(new Error('Request body aborted')))
    req.on('data', chunk => {
      size += chunk.length
      if (size > maxBytes) {
        settle(new Error('Project exceeds 8 MB'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try { settle(null,JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch { settle(new Error('Invalid project JSON')) }
    })
    req.on('error', error => settle(error))
  })
}

function runClothCraft(config, command, template, output) {
  if (!config.upstream) throw new Error('ClothCraft source checkout unavailable')
  const bin = config.rustTemplate
  const useBinary = bin && fs.existsSync(bin)
  const argv = [command, template, ...(command === 'bake' ? ['--output', output] : [])]
  const exe = useBinary ? bin : config.cargo
  const args = useBinary ? argv : ['run', '--locked', '--no-default-features', '-j', '2', '--bin', 'cloth-template', '--', ...argv]
  const result = spawnSync(exe, args, { cwd: config.upstream, env: config.rustEnv,
    encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 })
  if (result.error || result.status !== 0) throw new Error(`ClothCraft ${command} failed: ${result.error?.message || result.stderr || 'exit ' + result.status}`)
  if (command === 'validate') {
    try { return JSON.parse(result.stdout) }
    catch { throw new Error('ClothCraft validate returned non-JSON output') }
  }
  return { message: result.stdout.trim(), artifacts: [...files.keys()].filter(name =>
    name !== 'template.json' && fs.existsSync(path.join(output, name))) }
}

const server = http.createServer(async (req, res) => {
  const origin = String(req.headers.origin || '')
  if (origin && !origins.has(origin)) return send(res, 403, { error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') {
    if (!origins.has(origin)) return send(res, 403, { error: 'Origin not allowed' })
    // Agent clients may use the RFC 6750 bearer credential or the legacy
    // ClothCraft header. Other native routes keep their existing header list.
    const agentRequest=req.url?.split('?')[0]?.startsWith('/agent/v1/')
    const collabRequest=req.url?.split('?')[0]?.startsWith('/collab/v1/')
    const authorizedHeaders=collabRequest ? 'Content-Type, Authorization' : agentRequest
      ? 'Content-Type, Authorization, X-ClothCraft-Token'
      : 'Content-Type'
    res.writeHead(204, { 'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': collabRequest ? 'GET,POST,PUT,DELETE,OPTIONS' : agentRequest ? 'GET,POST,DELETE,OPTIONS' : 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': authorizedHeaders,
      'Access-Control-Max-Age': '600', 'Vary': 'Origin' })
    return res.end()
  }
  // Authenticated agent edit/undo/assembly calls use the SAME native workspace.
  // They cannot bypass the source/CUT/roll read lease while native production
  // evidence is being reconstructed. Reverse exclusion covers agent requests
  // already in flight before a native production operation begins.
  if(req.url?.split('?')[0]?.startsWith('/agent/v1/')){
    if(nativeVerifiedRequestBusy)
      return send(res,409,{ok:false,code:'NATIVE_PRODUCTION_INSPECTION_BUSY',
        factoryApproved:false,cuttingAuthorized:false},origin)
    agentHttpInflight++
    try {if(await agentApi.handle(req,res))return}
    finally{agentHttpInflight--}
  }
  if (await collaborationApi.handle(req, res)) return
  if (req.url?.split('?')[0]?.startsWith('/techpack/gridcraft/v1/')) {
    if (!origin || !origins.has(origin)) return send(res,403,{ok:false,code:'TRUSTED_UI_REQUIRED'},origin)
    if (req.url==='/techpack/gridcraft/v1/status')return req.method==='GET'?send(res,200,gridcraftStatus(),origin):send(res,405,{ok:false,code:'METHOD_NOT_ALLOWED'},origin)
    if (req.url==='/techpack/gridcraft/v1/evaluate') {
      if (req.method!=='POST')return send(res,405,{ok:false,code:'METHOD_NOT_ALLOWED'},origin)
      try {
        const body=await readBody(req)
        if(!body || Object.keys(body).length!==1 || typeof body.formula!=='string')return send(res,422,{ok:false,code:'INVALID_REQUEST'},origin)
        const result=await evaluateGridcraftFormula(body.formula)
        return send(res,result.ok?200:result.code==='CLI_UNAVAILABLE'?503:422,result,origin)
      }catch(error){return send(res,422,{ok:false,code:String(error.message||'INVALID_REQUEST')},origin)}
    }
    return send(res,404,{ok:false,code:'UNKNOWN_GRIDCRAFT_ROUTE'},origin)
  }
  if (req.url?.split('?')[0] === '/seamly/v1/evaluate') {
    if (req.method !== 'POST') return send(res,405,{ok:false,code:'METHOD_NOT_ALLOWED'},origin)
    if (!origin || !origins.has(origin)) return send(res,403,{ok:false,code:'TRUSTED_UI_REQUIRED'},origin)
    try {
      const result=evaluateSeamly2DRequest20261023(await readBody(req))
      return send(res,result.ok?200:422,result,origin)
    } catch (error) { return send(res,422,{ok:false,code:'INVALID_REQUEST',reason:String(error.message||error),manufacturingApproved:false},origin) }
  }
  if (req.url?.split('?')[0] === '/pattern-intelligence/v1/catalog') {
    if (req.method !== 'GET') return send(res, 405, {ok:false,code:'METHOD_NOT_ALLOWED'}, origin)
    // A source catalog can eventually include confidential garment names.
    // Require the known local UI Origin; never serve raw DXF bytes over HTTP.
    if (!origin || !origins.has(origin)) return send(res, 403, {ok:false,code:'TRUSTED_UI_REQUIRED'}, origin)
    try { const result = readPatternIntelligenceCatalog(root)
      return send(res, result.ok ? 200 : 503, result, origin)
    } catch { return send(res, 503, {ok:false,code:'CATALOG_READ_FAILED'}, origin) }
  }
  if (req.method==='GET'&&req.url==='/vision/hand/status')return send(res,200,{ok:true,...appleVisionHand.status()},origin)
  if (req.url?.split('?')[0]?.startsWith('/production/native-verified/v1/')) {
    if (!origin||!origins.has(origin))return send(res,403,{ok:false,code:'TRUSTED_UI_REQUIRED'},origin)
    const artifactPath=/^\/production\/native-verified\/v1\/artifacts\/([a-f0-9]{64})\/([A-Za-z0-9_.-]+)$/.exec(req.url||'')
    if(artifactPath){
      if(req.method!=='GET')return send(res,405,{ok:false,code:'METHOD_NOT_ALLOWED'},origin)
      try{
        const {bytes,contentType}=readNativeVerifiedMarkerArtifactRun42(outputs,artifactPath[1],artifactPath[2])
        res.writeHead(200,{'Content-Type':contentType,'Content-Length':bytes.length,
          'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
          'Content-Disposition':`attachment; filename="${artifactPath[2]}"`,
          'Access-Control-Allow-Origin':origin,'Vary':'Origin'})
        return res.end(bytes)
      }catch{return send(res,404,{ok:false,code:'VERIFIED_MARKER_ARTIFACT_UNAVAILABLE'},origin)}
    }
    if(req.method!=='POST')return send(res,405,{ok:false,code:'METHOD_NOT_ALLOWED'},origin)
    if(nativeVerifiedRequestBusy || workspaceHttpInflight>0 ||
      agentHttpInflight>0 ||
      workspace.status().busy||workspace.status().running)
      return send(res,409,{ok:false,code:'NATIVE_WORKSPACE_BUSY',factoryApproved:false},origin)
    nativeVerifiedRequestBusy = true
    try {
      const packet=await readBody(req)
      if(workspace.status().busy||workspace.status().running)
        return send(res,409,{ok:false,code:'NATIVE_WORKSPACE_BUSY',factoryApproved:false,
          cuttingAuthorized:false},origin)
      if(req.url==='/production/native-verified/v1/source'){
        if(!packet||Object.keys(packet).length!==0)return send(res,422,{ok:false,code:'INVALID_SOURCE_INSPECTION_REQUEST'},origin)
        const source=await inspectNativeVerifiedProductionSourceRun37(workspace)
        return send(res,200,{ok:true,source},origin)
      }
      if(req.url==='/production/native-verified/v1/order'){
        const result=await createNativeVerifiedProductionOrderRun37(workspace,packet)
        return send(res,200,{ok:true,result},origin)
      }
      if(req.url==='/production/native-verified/v1/cut-intake'){
        if(!packet||Object.keys(packet).sort().join(',')!==
          'expectedRevision,materialsByPanel,quantitiesBySize')
          return send(res,422,{ok:false,code:'INVALID_NATIVE_CUT_INTAKE_PACKET',
            cuttingAuthorized:false,factoryApproved:false},origin)
        const result=await buildNativeVerifiedCutroomIntakeRun44(workspace,packet)
        return send(res,200,{ok:true,result},origin)
      }
      if(req.url==='/production/native-verified/v1/cut-intake-inspect'){
        if(!packet||Object.keys(packet).sort().join(',')!=='order,packet')
          return send(res,422,{ok:false,code:'INVALID_NATIVE_CUT_INTAKE_INSPECTION_PACKET',
            cuttingAuthorized:false,factoryApproved:false},origin)
        const result=await inspectNativeVerifiedCutroomIntakeRun44(
          workspace,packet.order,packet.packet)
        return send(res,200,{ok:true,result},origin)
      }
      if(req.url==='/production/native-verified/v1/roll-study'){
        if(!packet||Object.keys(packet).sort().join(',')!=='order,planning')
          return send(res,422,{ok:false,code:'INVALID_NATIVE_ROLL_STUDY_PACKET',
            cuttingAuthorized:false,factoryApproved:false},origin)
        const result=await buildNativeVerifiedSinglePlyRollPlanRun44(workspace,packet.order,packet.planning)
        return send(res,result.ok?200:422,{ok:result.ok,result,
          ...(!result.ok?{code:result.issues?.[0]?.detail||'NATIVE_ROLL_STUDY_BLOCKED'}:{})},origin)
      }
      if(req.url==='/production/native-verified/v1/roll-study-inspect'){
        if(!packet||Object.keys(packet).sort().join(',')!=='order,packet,planning')
          return send(res,422,{ok:false,code:'INVALID_NATIVE_ROLL_STUDY_INSPECTION_PACKET',
            cuttingAuthorized:false,factoryApproved:false},origin)
        const result=await inspectNativeVerifiedSinglePlyRollPlanRun44(
          workspace,packet.order,packet.planning,packet.packet)
        return send(res,result.ok?200:422,{ok:result.ok,result,
          ...(!result.ok?{code:result.issues?.[0]?.detail||'NATIVE_ROLL_STUDY_BLOCKED'}:{})},origin)
      }
      if(req.url==='/production/native-verified/v1/export'){
        const result=await publishNativeVerifiedMarkerArtifactsRun42(workspace,packet,outputs)
        return send(res,200,{ok:true,result},origin)
      }
      return send(res,404,{ok:false,code:'UNKNOWN_NATIVE_PRODUCTION_ROUTE'},origin)
    }catch(error){
      return send(res,422,{ok:false,code:String(error?.message||'NATIVE_PRODUCTION_BLOCKED').slice(0,160),
        factoryApproved:false,cuttingAuthorized:false},origin)
    }finally{
      nativeVerifiedRequestBusy = false
    }
  }
  if (req.method==='POST'&&req.url==='/vision/hand'){
    try{
      if(!appleVisionHand.status().available)return send(res,503,{ok:false,error:'Apple Vision hand detector is unavailable'},origin)
      const body=await readBody(req)
      const frame=await appleVisionHand.detect(body?.image)
      return send(res,200,{ok:true,...frame},origin)
    }catch(error){return send(res,422,{ok:false,error:error.message},origin)}
  }
  if (req.method === 'POST' && req.url === '/workspace') {
    // An editor command received while CUT/source/roll QA is traversing
    // several native RPCs must not land between two verification reads. Nor
    // may a half-uploaded /workspace body become a write after QA begins.
    if(nativeVerifiedRequestBusy)
      return send(res,409,{ok:false,error:'NATIVE_PRODUCTION_INSPECTION_BUSY',
        cuttingAuthorized:false,factoryApproved:false},origin)
    workspaceHttpInflight++
    try {
      const packet=await readBody(req)
      const result=await workspace.request(packet)
      return send(res,result.ok?200:422,result,origin)
    }catch(error){
      return send(res,422,{ok:false,error:error.message},origin)
    }finally{
      workspaceHttpInflight--
    }
  }
  if (req.method === 'GET' && req.url === '/health') {
    const config = paths()
    const snapshot = { ok: true, backend: 'clothcraft-exo-local',
      nativeReady: fs.existsSync(config.cli), rustCheckoutReady: Boolean(config.upstream),
      ogcBackend: Boolean(config.rustFit && fs.existsSync(config.rustFit)),
      nativeSession:workspace.status(),
      contactBusy: activeContactRun, fitCertified: false }
    const content = rustHealthPayload(snapshot)
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      ...(origins.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) })
    return res.end(content)
  }
  if (req.method === 'GET' && req.url?.startsWith('/runs/')) {
    const match = /^\/runs\/([0-9a-f-]{36})\/(cloth|avatar)\.obj$/.exec(req.url)
    if (!match) return send(res, 404, { error: 'Unrecognized OGC artifact' }, origin)
    const filename = match[2] === 'cloth'
      ? path.join(outputs, 'runs', match[1], 'solution', 'cloth.obj')
      : path.join(outputs, 'runs', match[1], 'avatar.obj')
    if (!fs.existsSync(filename)) return send(res, 404, { error: 'Missing solver artifact' }, origin)
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(origins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}) })
    return fs.createReadStream(filename).pipe(res)
  }
  if (req.method === 'GET' && req.url?.startsWith('/artifacts/')) {
    const filename = decodeURIComponent(req.url.slice('/artifacts/'.length))
    if (!files.has(filename) || !fs.existsSync(path.join(outputs, 'bake', filename))) {
      return send(res, 404, { error: 'No such generated artifact' }, origin)
    }
    res.writeHead(200, { 'Content-Type': files.get(filename), 'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `attachment; filename="${filename}"`,
      ...(origins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}) })
    return fs.createReadStream(path.join(outputs, 'bake', filename)).pipe(res)
  }
  if (req.method !== 'POST' || !['/export', '/validate', '/bake', '/contact-simulate'].includes(req.url)) {
    return send(res, 404, { error: 'Unknown integration operation' }, origin)
  }
  if (req.url === '/contact-simulate' && activeContactRun) {
    return send(res, 409, { error: 'A ClothCraft OGC simulation is already running; wait for it to finish' }, origin)
  }
  try {
    const data = await readBody(req)
    if (!data?.document || typeof data.document !== 'object' || Array.isArray(data.document)) {
      return send(res, 400, { error: 'Expected a garment document object' }, origin)
    }
    if (req.url === '/contact-simulate') {
      activeContactRun = true
      try {
        const result = await runContact(data, outputs)
        return send(res, result.ok ? 200 : 422, result, origin)
      } finally { activeContactRun = false }
    }
    const config = paths()
    const converted = nativeExport(data.document, config.cli)
    fs.mkdirSync(outputs, { recursive: true })
    const templateFile = path.join(outputs, 'template.json')
    fs.writeFileSync(templateFile, JSON.stringify(converted.template, null, 2) + '\n')
    let rust = null
    let baking = null
    if (req.url === '/validate' || req.url === '/bake') rust = runClothCraft(config, 'validate', templateFile)
    if (req.url === '/bake') {
      const bakeOut = path.join(outputs, 'bake')
      fs.mkdirSync(bakeOut, { recursive: true })
      baking = runClothCraft(config, 'bake', templateFile, bakeOut)
    }
    send(res, 200, { ok: true, template: converted.template, warnings: converted.warnings,
      rustValidation: rust, baking, rustValidated: Boolean(rust), fitAccepted: false,
      mode: 'pattern-interchange-not-approved-fit' }, origin)
  } catch (error) {
    send(res, 422, { ok: false, fitAccepted: false, error: String(error.message || error) }, origin)
  }
})

server.listen(port, host, () => console.log(`EXO ClothCraft personal bridge listening at http://${host}:${port}`))
