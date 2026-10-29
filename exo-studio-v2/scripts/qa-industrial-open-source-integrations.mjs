#!/usr/bin/env node
/**
 * Reproducible industrial CAD open-source adapter suite.
 * Clipper2: Boost Software License 1.0, upstream pinned checkout.
 * ezdxf: MIT, isolated pinned Python package; not shipped to the browser.
 * GarmentCode: MIT upstream research checkout; original compatibility gate.
 * All artifacts are test-only and are not factory certifications.
 */
import {spawnSync} from 'node:child_process'
import {existsSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'

const root=resolve(import.meta.dirname,'..')
const temp=mkdtempSync(join(tmpdir(),'exo-oss-cad-'))
const rows=[]
const run=(name,command,args,env={})=>{
 const p=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024,
  env:{...process.env,...env}})
 if(p.error||p.status!==0){
  rows.push({name,status:'FAIL',details:(p.stderr||p.stdout||p.error?.message||'nonzero exit').slice(-1800)})
 }else rows.push({name,status:'PASS',details:(p.stdout||'').trim().slice(-220)})
 return p.status===0&&!p.error
}
try{
 const bin=join(temp,'clipper2-adapter')
 const haveClipper=run('Clipper2 pinned native build','sh',['integrations/industrial-cad/clipper2/build.sh',bin])
 if(haveClipper){
  run('Clipper2 geometry and invalid shape rejection','python3',['integrations/industrial-cad/clipper2/test.py',bin])
  run('Clipper2 actual tee pattern contours','node',['integrations/industrial-cad/clipper2/qa-real-patterns.mjs'],{CLIPPER2_BINARY:bin})
 }
 const python=process.env.EZDXF_PYTHON||'/tmp/exo-ezdxf-qa-20261022/bin/python'
 if(existsSync(python)){
  run('Independent ezdxf factory DXF parsing', 'node',['integrations/industrial-cad/ezdxf/qa-export.mjs'],{EZDXF_PYTHON:python})
  run('Independent manufacturing CUT/STITCH and explicit notch QA','node',['integrations/industrial-cad/ezdxf/qa-cut-stitch.mjs'],{EZDXF_PYTHON:python})
  run('Independent six-size receiver mutation matrix','node',['scripts/qa-manufacturing-dxf-receiver-20261022.mjs'],{EZDXF_PYTHON:python})
  run('Independent ASTM apparel DXF readiness and rejection','node',['integrations/industrial-cad/apparel-dxf/qa.mjs'],{EZDXF_PYTHON:python})
 }
 else rows.push({name:'Independent ezdxf factory DXF parsing',status:'BLOCKED',details:`Set EZDXF_PYTHON to isolated Python with ezdxf==1.4.2; checked ${python}`})
 run('GarmentCode safe import and industrial size rules','node',['--test','src/core/garmentCodeImportPreflight.test.mjs','src/core/gradingIndustrialIntegration.test.mjs'])
 run('Existing GarmentCode EXO format round trip','node',['scripts/check-garmentcode-adapter.mjs'])
 run('Rust-WASM batch grading with multi-piece/size parity','node',['scripts/qa-rust-grading-kernel.mjs'])
 run('Full multi-piece patterns, graded internal marks and factory sample protocol','node',['--test','src/core/nativeIndustrialSizeRun.test.mjs','src/core/gradedConstructionAttachments.test.mjs','src/core/factorySampleApproval.test.mjs'])
 run('Manufacturing DXF safe reimport and locked reference validation','node',['--test','src/core/manufacturingDxfRoundtrip.test.mjs'])
 run('Factory ZIP v2 source hashes, graded restore and corrupt-archive safety','node',['--test','src/core/factorySourceRecovery.test.mjs'])
 run('Full 10-template graded winding and edge-collapse acceptance','node',['scripts/qa-graded-size-run-geometry-20261022.mjs'])
 run('Factory ZIP full-size topology reports and negative geometry rejection','node',['--test','src/core/gradedFactoryGeometryReports.test.mjs'])
 run('CLO imported duplicate-point opt-in canonicalization safety','node',['--test','src/core/cloMaleCanonicalization.test.mjs','src/core/cloNeckGradingInvariant.test.mjs'])
 run('CLO XS/S genuine crossing diagnostic with stable source provenance','node',['--test','src/core/cloSmallSizeGradeStudy.test.mjs'])
 run('501 provisional waist/yoke geometry candidate with unapproved residuals','node',['--test','src/core/jeans501WaistGradeCandidate.test.mjs'])
 run('Fail-closed aggregated manufacturing release readiness','node',['--test','src/core/manufacturingReleaseReadiness.test.mjs'])
 run('Graded shared yoke endpoint drift remains detectable after length-only fixes','node',['--test','src/core/gradedSeamJunctionQA.test.mjs','src/core/jeans501YokeJunctionAudit.test.mjs'])
 run('Independent 501 sewn junction graph and CLO XS/S original-index studies','node',['scripts/qa-jeans501-yoke-constraint-graph-20261023.mjs'])
 run('Imported CLO source indices and grade-shift safety checks','node',['scripts/qa-clo-imported-grade-loss-20261023.mjs'])
 run('Coordinated jeans source-locked six-size reference study','node',['--test','src/core/jeans501CoordinatedGradeStudy.test.mjs','src/core/jeans501CandidateGradeRuleTable.test.mjs'])
 run('CLO XS/S crossing repair refuses unsupported source assumptions','node',['--test','src/core/cloSmallSizeCrossingRepairStudy.test.mjs'])
 run('Gerber/Lectra CAD receiver evidence and format limitations','node',['--test','src/core/recipientCadExchangeProtocol.test.mjs'])
 const pass=rows.every(row=>row.status==='PASS')
 console.log(JSON.stringify({result:pass?'PASS':'INCOMPLETE',factoryCertified:false,passes:rows.filter(row=>row.status==='PASS').length,checks:rows},null,2))
 if(!pass)process.exitCode=1
}finally{rmSync(temp,{recursive:true,force:true})}
