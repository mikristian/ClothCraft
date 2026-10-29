import {spawnSync} from 'node:child_process'
import {createTemplateProject,GARMENT_TEMPLATES} from '../src/data/templates.js'
import {prepareNativePatternExport} from '../src/core/nativePatternExportPreparation.js'

const cli=process.env.GARMENT_CPP_CLI||'native_cpp/build-placement-qa/garment_cad_cli'
let passed=0
let failed=0
for(const {id} of GARMENT_TEMPLATES){
  const {document,report}=prepareNativePatternExport(createTemplateProject(id))
  if(report.removedSeams)throw Error(`Lost ${report.removedSeams} authored seams: ${id}`)
  const result=spawnSync(cli,[],{encoding:'utf8',input:JSON.stringify({protocol:'garment-studio.native-cad.v1',op:'clothcraft-export',document})+'\n',timeout:20000,maxBuffer:30*1024*1024})
  const answer=result.status===0?JSON.parse(result.stdout):{error:result.stderr||result.error?.message}
  if(answer.ok&&answer.interchange?.template){
    const template=answer.interchange.template
    const fabricIds=new Set(template.fabrics.map(f=>f.id))
    const assigned=template.panels.every(p=>fabricIds.has(p.fabric))
    if(!assigned)throw Error('fabric reference lost: '+id)
    console.log('PASS',id,template.panels.length,'panels',template.seams.length,'seams')
    passed++
  }else{
    console.error('FAIL',id,answer.error)
    failed++
  }
}
console.log(`Garment library native export ${passed}/${passed+failed} passed`)
if(failed)process.exitCode=1
