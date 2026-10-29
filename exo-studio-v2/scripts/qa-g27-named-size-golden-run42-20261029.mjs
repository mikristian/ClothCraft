// RUN42 G27 preliminary: an independently hand-authored numeric oracle for
// the *browser draft* point-rule engine, NOT Rust persistent grading parity.
// Coordinates / POM in this file are static fixtures in millimetres; the
// implementation under test does not provide the expected values.
// No vendor CAD approval, factory specimen or G27 pass is inferred.
import assert from 'node:assert/strict'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {
  createAccuMarkNativeRuleSet,editAccuMarkNativePointRule,
  compileAccuMarkNativeRuleSizeRun,
} from '../src/core/accumarkNativePointRuleSet20261023.js'
import {auditAccuMarkNativeRuleSizeQA20261023} from '../src/core/accumarkNativeRuleSizeQA20261023.js'

const SIZES=['Petite','M','Tall','Custom-7XL']
const BASE='M'
const geometry={
  front:{points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['front-a','front-b','front-c','front-d']},
  back:{points:[[.5,.1],[.8,.1],[.8,.5],[.5,.5]],edges:['back-a','back-b','back-c','back-d']},
}
// Deliberately asymmetric x/y offsets (mm). The BACK source is not at zero.
const OFFSETS={
  front:{
    Petite:[[0,0],[-20,0],[-20,-10],[0,-10]],
    M:[[0,0],[0,0],[0,0],[0,0]],
    Tall:[[0,0],[10,0],[10,15],[0,15]],
    'Custom-7XL':[[-5,-5],[35,-5],[35,25],[-5,25]],
  },
  back:{
    Petite:[[-8,0],[-18,0],[-18,-10],[-8,-10]],
    M:[[0,0],[0,0],[0,0],[0,0]],
    Tall:[[5,0],[25,0],[25,5],[5,5]],
    'Custom-7XL':[[-20,-10],[30,-10],[30,40],[-20,40]],
  },
}
// Golden physical coordinate/POM table independently entered for each panel
// and named size. No multiplication of engine offsets to derive expected data.
const GOLDEN={
  front:{
    Petite:{points:[[0,0],[380,0],[380,290],[0,290]],width:380,height:290,perimeter:1340},
    M:{points:[[0,0],[400,0],[400,300],[0,300]],width:400,height:300,perimeter:1400},
    Tall:{points:[[0,0],[410,0],[410,315],[0,315]],width:410,height:315,perimeter:1450},
    'Custom-7XL':{points:[[-5,-5],[435,-5],[435,325],[-5,325]],width:440,height:330,perimeter:1540},
  },
  back:{
    Petite:{points:[[492,100],[782,100],[782,490],[492,490]],width:290,height:390,perimeter:1360},
    M:{points:[[500,100],[800,100],[800,500],[500,500]],width:300,height:400,perimeter:1400},
    Tall:{points:[[505,100],[825,100],[825,505],[505,505]],width:320,height:405,perimeter:1450},
    'Custom-7XL':{points:[[480,90],[830,90],[830,540],[480,540]],width:350,height:450,perimeter:1600},
  },
}
const mmTolerance=.01
const near=(observed,expected)=>Number.isFinite(observed)&&Math.abs(observed-expected)<=mmTolerance
const equals=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((x,i)=>x===b[i])
export function assessNamedSizeGoldenRun42(compiled,audit,{sizes=SIZES,sourcePanels=['front','back']}={}){
  const errors=[]
  if(compiled?.ok!==true||audit?.ok!==true||audit?.blocks!==false)
    errors.push('Draft compile and read-only QA must both pass')
  const entries=Object.keys(compiled?.byPanel||{})
  if(!equals(entries,sourcePanels)||!equals(sizes,SIZES))
    errors.push('Panel IDs or ordered named-size IDs differ from the golden reference')
  const rows=audit?.panels||[]
  if(rows.length!==sourcePanels.length*SIZES.length||
    new Set(rows.map(row=>row.panelId+'\0'+row.size)).size!==rows.length)
    errors.push('Incomplete or duplicate panel/size physical measurement coverage')
  for(const panelId of sourcePanels){
    const item=compiled?.byPanel?.[panelId]
    if(!item||!equals(item.sizes,SIZES)||item.baseSize!==BASE)
      {errors.push('Missing or reordered graded size source for '+panelId);continue}
    for(const size of SIZES){
      const expected=GOLDEN[panelId]?.[size]
      const observed=item.sizeRun?.[size]?.polygon?.points
      const row=rows.find(p=>p.panelId===panelId&&p.size===size)
      if(!expected||!Array.isArray(observed)||observed.length!==expected.points.length||
        !observed.every((p,i)=>Array.isArray(p)&&p.length===2&&
          near(p[0]*1000,expected.points[i][0])&&near(p[1]*1000,expected.points[i][1])))
        errors.push('Source mm coordinate mismatch: '+panelId+'/'+size)
      if(!row||!near(row.widthMm,expected.width)||!near(row.heightMm,expected.height)||
        !near(row.perimeterMm,expected.perimeter)||row.blockers?.length)
        errors.push('Independent rectangle POM mismatch: '+panelId+'/'+size)
    }
  }
  return {pass:errors.length===0,errors,rowsChecked:sourcePanels.length*SIZES.length,
    pointsChecked:sourcePanels.length*SIZES.length*4,
    source:'HAND_AUTHORED_DRAFT_RECTANGLE_GOLDEN_NOT_VENDOR_REFERENCE',
    rustPersistedGradeVerified:false,independentlyFactoryVerified:false,
    g27Passed:false,manufacturingApproved:false}
}

export function createGoldenDraftRun42(){
  const snapshot={revision:42,template:{panels:Object.entries(geometry).map(([id,polygon])=>({
    id,polygon:structuredClone(polygon)}))}}
  const created=createAccuMarkNativeRuleSet(snapshot,{sizes:SIZES,baseSize:BASE})
  assert.equal(created.ok,true,created.reason)
  let rules=created.ruleSet
  for(const [panelId,sizes] of Object.entries(OFFSETS))
    for(const [size,offsets] of Object.entries(sizes))
      if(size!==BASE)for(let pointIndex=0;pointIndex<offsets.length;pointIndex++){
        const [dxMm,dyMm]=offsets[pointIndex]
        const next=editAccuMarkNativePointRule(snapshot,rules,{
          panelId,pointIndex,size,dxMm,dyMm})
        assert.equal(next.ok,true,next.reason)
        rules=next.ruleSet
      }
  const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,rules,{selectedSize:'Tall'})
  const audit=auditAccuMarkNativeRuleSizeQA20261023(snapshot,rules,{allowNamedSizes:true})
  return {snapshot,rules,compiled,audit}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {compiled,audit}=createGoldenDraftRun42()
  const result=assessNamedSizeGoldenRun42(compiled,audit)
  console.log(JSON.stringify({schema:'exo.g27.draft-named-size-golden-run42.v1',...result},null,2))
  if(!result.pass)process.exitCode=1
}
