#!/usr/bin/env node
/** Controlled development-source sample handoff, never a factory certificate.
 * No user garments are modified. Existing output files are never overwritten.
 * Usage: node scripts/build-tee-sample-handoff-20261022.mjs [output-folder]
 */
import {createHash} from 'node:crypto'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {strToU8,zipSync} from 'fflate'
import {createTeeTemplate} from '../src/data/templates.js'
import {createDefaultProject} from '../src/data/defaultProject.js'
import {buildFactoryPackageFiles} from '../src/core/factoryPackage.js'
import {inspectProduction} from '../src/core/productionPreflight.js'
import {inspectIndustrialPatterns} from '../src/core/industrialPatternQA.js'
import {inspectGradedNotchPairs} from '../src/core/industrialNotchQA.js'
import {createTeeNeckbandSampleSet} from '../src/core/teeNeckbandSample.js'

const output=resolve(process.argv[2]||'docs/qa/tee-sample-handoff-20261022/v2')
const source=createTeeTemplate()
const baseline=createDefaultProject()
const preflight=inspectProduction(source)
const geometry=inspectIndustrialPatterns(source)
const notches=inspectGradedNotchPairs(source)
const legacy=inspectIndustrialPatterns(baseline)
if(preflight.blockers||geometry.blockers||notches.blockers||geometry.seamReports.length!==84||notches.checks.length!==24||legacy.blockers!==44){
 throw new Error('Controlled tee QA regression: incomplete grading, sewing, notch or source fixture mismatch; no sample handoff generated')
}
const addendum=createTeeNeckbandSampleSet(source)
const files=buildFactoryPackageFiles(source)
const addText=(filename,text)=>{if(files[filename])throw new Error(`Duplicate package asset ${filename}`);files[filename]=strToU8(text)}

addText('tee-development/SAMPLE_ONLY_README.txt',[
 'EXPERIMENTAL NECKBAND DEVELOPMENT — NOT APPROVED',
 'One cut pattern per XS-XXL size, graded from the actual corresponding neckline sewing length.',
 'Original factory marker files contain FOUR T-shirt panels only and do NOT include the neckband.',
 'The proposed 0.87 rib sewing ratio, 4.6 cm cut width and 1 cm joins are NOT verified by fabric stretch, shrinkage, wash or fit testing.',
 'If approved after sampling, regenerate marker placement and costing to include this fifth panel.',
 'Do not treat these DXFs as Gerber-native or ASTM/AAMA pattern files.',
].join('\n'))
for(const row of addendum.rows){
 const path=`tee-development/neckband-proposal-${row.size.toLowerCase()}.dxf`
 // The factory-package generator already owns this annex. Avoid sending
 // duplicate neckband DXFs under competing piece IDs/path conventions.
 if(!files[path])addText(path,row.dxf)
 else if(new TextDecoder().decode(files[path])!==row.dxf)throw new Error(`Neckband template/export divergence in ${row.size}`)
}
if(!files['tee-development/neckband-proposal.json']){
 addText('tee-development/neckband-proposal.json',JSON.stringify(addendum.rows.map(({piece,dxf,...row})=>row),null,2))
}
const manifest={
 schema:'exo-foundation-tee-sample-handoff.v1',status:'development_candidate_pending_external_validation',
 source:{id:source.id,templateId:source.templateId,revision:source.revision,sizeRun:source.grading.sizes},
 preservedLegacy:{id:baseline.id,name:baseline.name,blockedSewingRelationships:legacy.blockers,legacyAltered:false},
 bodySeamResults:{checked:geometry.seamReports.length,blocked:geometry.blockers},
 matchedNotches:{checked:notches.checks.length,maximumMisalignmentCm:Math.max(...notches.checks.map(row=>row.offsetCm)),blocked:notches.blockers},
 nativeMarkerIncludesApprovedNeckband:false,proposedNeckbandAddendumPresent:true,
 requiredExternalEvidence:['CLO or authorized recipient CAD import and re-export in disposable project','grading/attribute loss report','actual-size X/Y print scale measurements','approved neckband ratio and fabric stretch/shrink','physical cut/sew/fit samples for every release size','named factory signoff'],
 factoryCertified:false,
}
addText('candidate-audit.json',JSON.stringify(manifest,null,2))
addText('receiver-test-record-template.json',JSON.stringify({
 schema:'exo-recipient-cad-roundtrip-evidence.v1',status:'not_performed',sourceProjectId:source.id,
 receiverProduct:null,receiverVersion:null,recipientImportMethod:null,recipientDXFSettings:null,
 sourceInputHashes:null,recipientOutputHashes:null,roundTripSizePieceCount:null,
 independentGeometryComparison:null,gradedNotchAndGrainComparison:null,lossReport:null,
 reviewedBy:null,reviewedAt:null,physicalFactoryApproval:false,
},null,2))
const packageManifest=JSON.parse(new TextDecoder().decode(files['manifest.json']))
packageManifest.files=[...Object.keys(files)].sort()
files['manifest.json']=strToU8(JSON.stringify(packageManifest,null,2))
const archive=zipSync(files,{level:6})
const sha256=buffer=>createHash('sha256').update(buffer).digest('hex')
const entry={name:'foundation-tee-production-development-XS-XXL-with-neckband-proposal.zip',bytes:archive.length,sha256:sha256(archive)}
const provenance={...manifest,createdAt:new Date().toISOString(),archive:entry}
const report=[
 '# Foundation Tee — staged manufacturer sample handoff',
 '',
 '**Status: sample candidate, NOT manufacturer ready.** The package has four draft sewing panels and six additional proposed neckband DXFs. Neckband approval, cutting-room layout, independent recipient import, real fabric sampling and physical signoff remain required.',
 '',
 `- Legacy Essential Shell: ${legacy.blockers} genuine sewing geometry issues; original persisted/user garments untouched`,
 `- Foundation Tee candidate: ${geometry.blockers} blockers in ${geometry.seamReports.length} graded sewing-edge checks`,
 `- Paired sleeve notches: ${notches.blockers} blockers in ${notches.checks.length} checks, max ${manifest.matchedNotches.maximumMisalignmentCm.toFixed(5)} cm`,
 '- Six measured-size proposed rib neckbands supplied as *separate experimental DXF parts*, not inserted into the four-panel cutting markers',
 '- Standard DXF format only; no Gerber/Lectra/AAMA/ASTM recipient approval claimed',
 '- Factory sample worksheets are empty and require real measurements, photos and authorized operator signoff',
 '',
 'Import each actual EXO DXF into a disposable CLO or comparable CAD project; verify millimetres and four-piece inventory, then separately test the rib neckband. Save, reopen and export actual receiver DXF without touching existing autosaves. Fill the receiver evidence template after verifying independent geometry and loss reports.',
 '',
 'The eventual manufacturing pattern must include the *approved* neckband piece in the real fabric marker and a complete construction/tech pack before any factory cutting.',
].join('\n')
await mkdir(output,{recursive:true})
await writeFile(join(output,entry.name),archive,{flag:'wx'})
await writeFile(join(output,'manifest.json'),JSON.stringify(provenance,null,2),{flag:'wx'})
await writeFile(join(output,'README.md'),report+'\n',{flag:'wx'})
console.log(JSON.stringify({result:'sample-handoff-generated',folder:output,files:Object.keys(files).length,zipBytes:archive.length,
 originalLegacyIssues:legacy.blockers,candidateSeamIssues:geometry.blockers,candidateNotchIssues:notches.blockers,
 externalApproval:'REQUIRED',factoryCertified:false},null,2))
