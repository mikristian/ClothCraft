import assert from 'node:assert/strict'
import {chooseNativeGpuPhysics} from '../../../integrations/clothcraft/workspace.mjs'

const available={ok:true,gpuSimulation:true,desktopFeature:true}
const unsupported={ok:true,gpuSimulation:false,desktopFeature:false}
const cases=[
  [{},available,false],
  [{EXO_CLOTHCRAFT_GPU:'1'},available,false],
  [{EXO_CLOTHCRAFT_GPU:'0',EXO_CLOTHCRAFT_ALLOW_EXPERIMENTAL_GPU:'1'},available,false],
  [{EXO_CLOTHCRAFT_GPU:'1',EXO_CLOTHCRAFT_ALLOW_EXPERIMENTAL_GPU:'1'},unsupported,false],
  [{EXO_CLOTHCRAFT_GPU:'1',EXO_CLOTHCRAFT_ALLOW_EXPERIMENTAL_GPU:'1'},null,false],
  [{EXO_CLOTHCRAFT_GPU:'1',EXO_CLOTHCRAFT_ALLOW_EXPERIMENTAL_GPU:'1'},available,true],
]
for(const [env,capabilities,expected] of cases)
 assert.equal(Boolean(chooseNativeGpuPhysics(env,capabilities)),expected,
  `unexpected GPU physics activation: ${JSON.stringify({env,capabilities})}`)
console.log(JSON.stringify({cases:cases.length,defaultCpuSafe:true,experimentalGpuExplicitOptIn:true}))
