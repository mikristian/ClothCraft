#!/usr/bin/env node
/** EXO industrial CAD parity gate. Scope: evidence bookkeeping, NOT self-certification.
 * Every Gerber/Lectra matrix row is a separately witnessed acceptance criterion.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { types } from 'node:util'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const matrixPath=path.join(root,'docs/research/industrial-cad-20261022/GERBER_LECTRA_ACCEPTANCE_MATRIX.md')
const ledgerPath=path.join(root,'docs/research/swarm-20261023/parity-ledger.json')
const allowed=new Set(['UNASSESSED','NOT_IMPLEMENTED','IMPLEMENTED_UNVERIFIED','INDEPENDENT_VERIFIED','FACTORY_ACCEPTED'])
const expected={A:12,G:18,C:12,I:14,M:10,R:10}
const lane={A:'drafting-geometry',G:'grade-rule-engine',C:'sewline-notches',I:'cad-interchange',M:'marker-cutroom',R:'release-acceptance'}
const ids=new Set()
function rowsFromMatrix(){
  const source=fs.readFileSync(matrixPath,'utf8')
  const rows=[]
  for(const line of source.split(/\r?\n/)){
    const match=/^\|\s*([AGCIMR]\d\d)\s*\|\s*([^|]+?)\s*\|\s*$/.exec(line)
    if(!match)continue
    rows.push({id:match[1],criterion:match[2].trim()})
  }
  return rows
}
function fail(message){throw Error('EXO ACCUMARK PARITY GATE: '+message)}
// The legacy ledger contains editable status claims, not trusted attestations.
// Even as claims, evidence must not be satisfied by inherited values, whitespace,
// or getters that execute while the report is validating a purported approval.
function ownData(owner,key){
  if(!owner||typeof owner!=='object'||types.isProxy(owner)||Array.isArray(owner))return undefined
  const descriptor=Object.getOwnPropertyDescriptor(owner,key)
  return descriptor?.enumerable&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined
}
function ownNonblankDataString(owner,key){
  const value=ownData(owner,key)
  return typeof value==='string'&&value.trim().length>0
}
export function validateLedger(ledger,sourceRows=rowsFromMatrix()){
  const rows=ownData(ledger,'requirements')
  if(ownData(ledger,'schema')!=='exo.accumark.acceptance.v1'||types.isProxy(rows)||!Array.isArray(rows))fail('invalid ledger schema')
  if(sourceRows.length!==76)fail('matrix must contain exactly 76 acceptance requirements')
  const rowsById=new Map(sourceRows.map(r=>[r.id,r]))
  if(rowsById.size!==76)fail('duplicate matrix criterion')
  if(rows.length!==76)fail('ledger must contain all 76 requirements')
  ids.clear()
  const validated=[]
  for(let rowIndex=0;rowIndex<rows.length;rowIndex++){
    const rowDescriptor=Object.getOwnPropertyDescriptor(rows,String(rowIndex))
    if(!rowDescriptor?.enumerable||!Object.hasOwn(rowDescriptor,'value'))fail('ledger requirements must contain own data entries')
    const item=rowDescriptor.value
    const id=ownData(item,'id')
    const status=ownData(item,'status')
    if(typeof id!=='string'||ids.has(id)||!rowsById.has(id))fail('duplicate/unknown acceptance id: '+id)
    ids.add(id)
    if(ownData(item,'criterion')!==rowsById.get(id).criterion)fail('matrix criterion drift for '+id)
    if(!allowed.has(status))fail('unknown status for '+id)
    if(ownData(item,'lane')!==lane[id[0]])fail('wrong owner lane for '+id)
    const evidence=ownData(item,'evidence')
    if(types.isProxy(evidence)||!Array.isArray(evidence))fail('evidence must be an own data array for '+id)
    let hasIndependentEvidence=false
    for(let i=0;i<evidence.length;i++){
      const descriptor=Object.getOwnPropertyDescriptor(evidence,String(i))
      if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))
        fail('evidence must contain own data entries for '+id)
      const entry=descriptor.value
      if(ownNonblankDataString(entry,'artifact')&&ownNonblankDataString(entry,'independentOracle'))
        hasIndependentEvidence=true
    }
    if(status==='INDEPENDENT_VERIFIED'||status==='FACTORY_ACCEPTED'){
      if(!hasIndependentEvidence)
        fail(id+' is claiming independent verification without named independent oracle and artifact')
    }
    const approval=ownData(item,'approval')
    if(status==='FACTORY_ACCEPTED'&&(!approval||
      !ownNonblankDataString(approval,'operator')||
      !ownNonblankDataString(approval,'site')||
      !ownNonblankDataString(approval,'date')))
      fail(id+' is claiming factory acceptance without named operator, site and date')
    validated.push({id,status})
  }
  const count={}
  for(const key of allowed)count[key]=validated.filter(r=>r.status===key).length
  // This legacy ledger CLI receives no externally pinned signer identity,
  // licensed CAD receiver evidence, or independently measured physical sample.
  // All fields above are editable claims, even if all 76 rows say accepted.
  // Never turn those claims into a 100% manufacturing approval. The separate
  // acceptance-progress gate also remains closed pending semantic audits.
  const complete=false
  return {ok:true,count,total:76,complete,gateLabel:'NOT AT 100% — external CAD and physical acceptance remain required'}
}
export function createInitialLedger(){
  const source=rowsFromMatrix()
  const ledger={
    schema:'exo.accumark.acceptance.v1',created:'2026-10-23',
    baseline:'AccuMark functional estimate ~50% as previously discussed; NOT an evidence-complete parity score',
    source:'docs/research/industrial-cad-20261022/GERBER_LECTRA_ACCEPTANCE_MATRIX.md',
    installedApp:'EXO ClothCraft Studio V2.app',
    industrialRoundTrip:{approved:false,receiver:'licensed Gerber AccuMark required',artifact:null},
    physicalSample:{approved:false,site:null,operator:null,artifact:null},
    requirements:source.map(item=>({...item,lane:lane[item.id[0]],status:'UNASSESSED',evidence:[],blockers:['Independent source-to-result test and external witness not yet attached']})),
  }
  validateLedger(ledger)
  return ledger
}
export function report(ledger){
  const result=validateLedger(ledger)
  const rows=ownData(ledger,'requirements')
  const validated=Array.from({length:rows.length},(_,i)=>{
    const row=Object.getOwnPropertyDescriptor(rows,String(i)).value
    return {id:ownData(row,'id'),status:ownData(row,'status')}
  })
  const categorized=Object.entries(expected).map(([family,count])=>{
    const factoryStatusClaimCount=validated.filter(r=>r.id[0]===family&&r.status==='FACTORY_ACCEPTED').length
    return {
      group:family,
      required:count,
      // Editable ledger status is a claim, not a verified factory acceptance.
      factoryStatusClaimCount,
      factoryAccepted:result.complete?factoryStatusClaimCount:0,
      assessed:validated.filter(r=>r.id[0]===family&&r.status!=='UNASSESSED').length,
    }
  })
  return {...result,categorized,workerLimit:2,plannedLanes:8}
}
const mode=process.argv[2]||'check'
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(mode==='init'){
      if(fs.existsSync(ledgerPath))fail('ledger exists; initialization never overwrites acceptance work')
      fs.mkdirSync(path.dirname(ledgerPath),{recursive:true})
      fs.writeFileSync(ledgerPath,JSON.stringify(createInitialLedger(),null,2)+'\n',{flag:'wx'})
      process.stdout.write('Created '+ledgerPath+'\n')
    }else if(!['check','report'].includes(mode))fail('use init|check|report')
    if(mode!=='init'){
      const json=JSON.parse(fs.readFileSync(ledgerPath,'utf8'))
      process.stdout.write(JSON.stringify(report(json),null,2)+'\n')
    }
  }catch(error){process.stderr.write(String(error.message||error)+'\n');process.exitCode=1}
}
