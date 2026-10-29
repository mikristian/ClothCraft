#!/usr/bin/env node
/** Independently parse the ACTUAL staged package, not regenerated outputs. */
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {unzipSync,strFromU8} from 'fflate'

const dir=process.argv[2]||'docs/qa/tee-sample-handoff-20261022/v2'
const manifest=JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8'))
const zip=readFileSync(join(dir,manifest.archive.name))
if(createHash('sha256').update(zip).digest('hex')!==manifest.archive.sha256)throw new Error('Candidate package digest mismatch')
const files=unzipSync(zip)
const qa=JSON.parse(strFromU8(files['industrial-pattern-qa.json']))
const sample=JSON.parse(strFromU8(files['factory-sample-approval-gate.json']))
const notches=manifest.matchedNotches
if(qa.blockers||qa.seamReports.length!==84||sample.factoryCertified!==false||sample.status!=='blocked'||notches.checked!==24||notches.blocked!==0){
 throw new Error('Staged candidate QA or external-approval gate mismatch')
}
const external=process.env.EZDXF_PYTHON||'/tmp/exo-ezdxf-qa-20261022/bin/python'
const temp=mkdtempSync(join(tmpdir(),'tee-external-dxf-'))
const results=[]
try{
 for(const size of manifest.source.sizeRun){
  const candidates=[
   {filename:`patterns/foundation-tee-first-fit-test-${size.toLowerCase()}.dxf`,expected:4,type:'body'},
   {filename:`tee-development/neckband-proposal-${size.toLowerCase()}.dxf`,expected:1,type:'experimental neckband'},
  ]
  for(const candidate of candidates){
   const source=files[candidate.filename]
   if(!source)throw new Error(`Missing candidate DXF ${candidate.filename}`)
   const path=join(temp,`${size}-${candidate.expected}.dxf`)
   writeFileSync(path,source,{flag:'wx'})
   const run=spawnSync(external,['integrations/industrial-cad/ezdxf/validate_export.py',path,'--expected-cuts',String(candidate.expected),'--expected-size',size],{
    encoding:'utf8',timeout:20000,maxBuffer:1024*1024,
   })
   if(run.status!==0)throw new Error(`${candidate.filename} rejected by independent ezdxf: ${run.stderr||run.stdout||run.error?.message}`)
   const parsed=JSON.parse(run.stdout)
   if(parsed.result!=='PASS'||parsed.cut_count!==candidate.expected||parsed.insunits!==4)throw new Error(`DXF geometry unexpectedly changed: ${candidate.filename}`)
   results.push({size,type:candidate.type,filename:candidate.filename,cuts:parsed.cut_count,grain:parsed.grain_count,parser:parsed.library,version:parsed.version})
  }
 }
}finally{rmSync(temp,{recursive:true,force:true})}
console.log(JSON.stringify({result:'PASS',candidate:'unapproved',independentlyVerifiedDXFs:results.length,sizes:manifest.source.sizeRun,
 sizeSpecificSeamChecks:qa.seamReports.length,pairedNotchChecks:notches.checked,
 actualRecipientCADRoundtrip:false,physicalSamplesApproved:false,results},null,2))
