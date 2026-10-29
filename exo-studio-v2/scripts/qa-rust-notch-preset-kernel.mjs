import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {teeBalanceNotchCommands} from '../src/core/patternSewingNotches.js'
import {initializeRustNotchPresetKernel,rustNotchPresetKernelStatus} from '../src/core/rustNotchPresetKernel.js'
const original=template=>{
  if(!Array.isArray(template?.panels))return []
  const commands=[]
  for(const panel of template.panels){
    const name=String(panel.id).toLowerCase()
    if(name!=='front'&&name!=='back')continue
    const polygon=panel.polygon
    if(!Array.isArray(polygon?.edges))continue
    for(const edge of polygon.edges){
      if(!/^(?:armhole[-_]|sleeve-under[-_]|underarm[-_])/i.test(edge)||polygon.notches?.[edge]?.length)continue
      const fractions=name==='back'?[.5125,.5475]:[.53]
      for(const t of fractions)commands.push({kind:'Notch',panel:panel.id,edge,t,depth_m:.006})
    }
  }
  return commands
}
let seed=20261020,checks=0
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const panels=['front','back','Front','BACK','sleeve','hood','unknown']
const edges=['armhole_left','armhole-right','sleeve-under_outer','underarm_inner','ARMHOLE_TOP','hem','armhole','sleeve_under','underarmX','notch-left']
const cases=[null,{}, {panels:null},{panels:[{id:'front',polygon:{edges:['armhole-left','underarm_right','sleeve-under_1'],notches:{'underarm_right':[{}]}}},{id:'back',polygon:{edges:['armhole-left','armhole-right']}}]}]
for(let i=0;i<1200;i++)cases.push({panels:Array.from({length:1+Math.floor(random()*7)},()=>{
  const selected=Array.from({length:Math.floor(random()*9)},()=>edges[Math.floor(random()*edges.length)])
  const notches=Object.fromEntries(selected.filter(()=>random()<.25).map(e=>[e,[{t:.5}]]))
  return {id:panels[Math.floor(random()*panels.length)],polygon:{edges:selected,notches}}
})})
function verify(){for(const template of cases){assert.deepStrictEqual(teeBalanceNotchCommands(template),original(template));checks++}}
verify()
assert.equal(await initializeRustNotchPresetKernel({bytes:readFileSync('public/wasm/exo_notch_preset_kernel.wasm')}),true)
verify()
console.log(JSON.stringify({pass:true,cases:cases.length,checks,backend:rustNotchPresetKernelStatus().backend}))
