import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyModarisNativeIndustrialReactiveWitness20261027 as verify} from './modarisNativeIndustrialReactiveWitness20261027.js'

const SIX=['XS','S','M','L','XL','XXL']
const OFFSETS={XS:-.02,S:-.01,M:0,L:.01,XL:.02,XXL:.03}
const data=(width,name,notched)=>({id:name,polygon:{
  points:[[0,0],[width,0],[width,.3],[0,.3]],
  edges:['top','right','bottom','left'],
  seam_allowances:Object.fromEntries(['top','right','bottom','left'].map(edge=>[edge,.01])),
  notches:notched?{right:[{t:.25,depth_m:.004}]}:{},
}})
function project(after=false){
  const make=size=>[
    data(.4+OFFSETS[size]+(after?.02:0),'front',true),
    data(.35+OFFSETS[size]+(after?.02:0),'back',true),
    data(.2,'pocket',false),
  ]
  return {template:{panels:make('M')},grade_run:{sizes:[...SIX],baseSize:'M',
    gradedTemplates:SIX.map(size=>({panels:make(size)}))}}
}
function packet(source,after=false){
  const sizes=source.grade_run.gradedTemplates.map((template,index)=>({size:SIX[index],seams:[],
    panels:template.panels.map(({id,polygon})=>{
      const width=polygon.points[1][0],height=.3,w=.01
      const marks=polygon.notches?.right?.map(notch=>({edge_id:'right',t:notch.t,
        depth_m:notch.depth_m,cut_start:[width+w,height*notch.t],
        inner_end:[width+w-notch.depth_m,height*notch.t]}))??[]
      return {panel_id:id,sewline_edge_lengths_m:{top:width,right:height,bottom:width,left:height},
        cut:{points:[[-w,-w],[width+w,-w],[width+w,height+w],[-w,height+w]],
          edges:polygon.edges.map((name,i)=>({name,allowance_m:w,start:i,end:(i+1)%4})),
          notches:marks,area_m2:(width+2*w)*(height+2*w),perimeter_m:2*(width+height+4*w)}}
    })
  }))
  return {format:'exo-native-graded-cutlines.v1',sourceRevision:after?21:20,
    revision:after?21:20,sizes,manufacturerReady:false,cuttingAuthorized:false}
}
const fixture=()=>{
  const beforeProject=project(false),afterProject=project(true)
  return {beforeProject,afterProject,beforeCutlines:packet(beforeProject),afterCutlines:packet(afterProject,true),
    beforeRevision:20,afterRevision:21,changedPanelIds:['front','back']}
}
test('independent physical straight notch witness authenticates all 6 sizes, 18 CUT/STITCH contours and 12 changed notches',()=>{
  const input=fixture(),old=structuredClone(input),result=verify(input)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.verifiedCutPanels,18)
  assert.equal(result.verifiedNotches,12)
  assert.deepEqual(result.gradedSizes,SIX)
  assert.equal(result.nativeIndustrialRegenerationVerified,true)
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.externalModarisAccepted,false)
  assert.match(result.engineeringEvidenceDigest,/^sha256:[a-f0-9]{64}$/)
  assert.deepEqual(input,old)
})
test('industrial receipts reject unchanged CUT, missing CUT mark, wrong allowance, wrong notch projection',()=>{
  const cases=[
    f=>{f.afterCutlines.sizes[0].panels[0].cut.points=structuredClone(f.beforeCutlines.sizes[0].panels[0].cut.points)},
    f=>{f.afterCutlines.sizes[4].panels[1].cut.notches=[]},
    f=>{f.afterCutlines.sizes[0].panels[0].cut.edges[0].allowance_m=.02},
    f=>{f.afterCutlines.sizes[3].panels[0].cut.notches[0].cut_start[0]+=.003},
    f=>{f.afterCutlines.sizes[3].panels[0].cut.notches[0].inner_end[1]+=.003},
    f=>{f.afterCutlines.sizes[5].panels[0].sewline_edge_lengths_m.right=NaN},
  ]
  for(const [i,mutate] of cases.entries()){
    const f=fixture();mutate(f)
    assert.equal(verify(f).ok,false,`Corrupted production receipt ${i} accepted`)
  }
})
test('unsaved source, mismatched grade run, production mark or unaffected piece tampering never return release proof',()=>{
  const cases=[
    f=>{f.afterRevision=23},
    f=>{f.afterCutlines.sizes.splice(1,1)},
    f=>{f.afterProject.grade_run.gradedTemplates[1].panels[0].polygon.edges[0]='forged'},
    f=>{f.afterProject.template.panels[1].polygon.notches.right[0].depth_m=.005},
    f=>{f.afterProject.grade_run.gradedTemplates[4].panels[0].polygon.seam_allowances.top=.03},
    f=>{f.afterProject.grade_run.gradedTemplates[4].panels[2].polygon.points[1][0]+=.01},
    f=>{f.afterProject.grade_run.gradedTemplates[4].panels[1].polygon.points[1][0]+=.003},
    f=>{f.afterCutlines.manufacturerReady=true},
    f=>{f.beforeCutlines.revision=19},
    f=>{f.changedPanelIds=['front']},
  ]
  for(const [i,mutate] of cases.entries()){
    const f=fixture();mutate(f)
    assert.equal(verify(f).ok,false,`Corrupted source/provenance ${i} accepted`)
  }
})
