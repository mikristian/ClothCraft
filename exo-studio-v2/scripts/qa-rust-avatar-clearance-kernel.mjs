import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {initializeRustAvatarClearanceKernel, rustEllipsoidClearance, rustCapsuleClearance, rustAvatarClearanceKernelStatus} from '../src/core/rustAvatarClearanceKernel.js'
// Extract the unchanged production JS fallback bodies; no dependency installation required.
const source=readFileSync(new URL('../src/core/physics.js',import.meta.url),'utf8')
function original(name) {
  const body=source.match(new RegExp(`export function ${name}\\(([^)]*)\\) \\{([\\s\\S]*?)\\n\\}`))
  assert.ok(body, name)
  return new Function('EPSILON',`return function(${body[1]}) {${body[2]} }`)(1e-6)
}
// THREE.Vector3's arithmetic used by the original capsule body, in the same order.
class V {
  constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})}
  clone(){return new V(this.x,this.y,this.z)}
  addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  dot(v){return this.x*v.x+this.y*v.y+this.z*v.z}
  lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}
  distanceTo(v){const x=this.x-v.x,y=this.y-v.y,z=this.z-v.z;return Math.sqrt(x*x+y*y+z*z)}
}
const ellipsoid=original('ellipsoidClearanceJS'), capsule=original('capsuleClearanceJS')
assert.equal(rustEllipsoidClearance(new V(),new V(),new V(1,1,1)),null)
assert.equal(await initializeRustAvatarClearanceKernel({bytes:new Uint8Array([0])}),false)
assert.equal(rustCapsuleClearance(new V(),{center:new V(),axis:new V(),halfLength:0,radius:1}),null)
const bytes=readFileSync(new URL('../public/wasm/exo_avatar_clearance_kernel.wasm',import.meta.url))
assert.equal(await initializeRustAvatarClearanceKernel({bytes}),true)
let seed=0x030cafe, maxAbsoluteDifference=0, compared=0, fallback=0
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32}
const vector=scale=>new V((random()-.5)*scale,(random()-.5)*scale,(random()-.5)*scale)
const nativeCases=[]
const tolerance=1e-12
function compare(actual,expected){
  if(Number.isNaN(expected))assert.ok(Number.isNaN(actual))
  else if(!Number.isFinite(expected))assert.equal(actual,expected)
  else {const delta=Math.abs(actual-expected);maxAbsoluteDifference=Math.max(maxAbsoluteDifference,delta);assert.ok(delta<=tolerance,`${actual} != ${expected}`)}
  compared++
}
for(let i=0;i<6000;i++){
  const size=[.68,1,1.42,1.5][i%4]
  const p=vector(5*size), c=vector(size), r=new V(.22*size,.1*size,.15*size)
  const pose={center:c,axis:vector(2),halfLength:.3*size,radius:.08*size}
  if(i%7===0)pose.axis=new V(0,1,0)
  if(i%11===0)pose.axis=new V(1,0,0)
  if(i%13===0)pose.halfLength=0
  if(i%17===0)pose.axis=new V()
  if(i%19===0)r.x=0
  if(i%23===0)p.x=[NaN,Infinity,-Infinity][i%3]
  if(i%29===0)r.y=-.1
  if(i%31===0)p.x=1e308
  if(i%37===0)r.z=1e-300
  if(i%41===0)pose.radius=NaN
  if(i%43===0)pose.halfLength=Infinity
  if(i%47===0)pose.axis.z=NaN
  const e=rustEllipsoidClearance(p,c,r), k=rustCapsuleClearance(p,pose)
  if (i%2===0 && [p.x,p.y,p.z,c.x,c.y,c.z,r.x,r.y,r.z,...Object.values(pose.axis),pose.halfLength,pose.radius].every(Number.isFinite) && r.x>0 && r.y>0 && r.z>1e-100 && e!==null && k!==null) {
    nativeCases.push({p,c,r,pose,expected:[e,k]})
  }
  if(e===null)fallback++
  if(k===null)fallback++
  compare(e??ellipsoid(p,c,r),ellipsoid(p,c,r))
  compare(k??capsule(p,pose),capsule(p,pose))
}
console.log(JSON.stringify({pass:true,seed:'0x030cafe',positions:6000,comparisons:compared,toleranceAbsoluteMeters:tolerance,maxAbsoluteDifference,fallback,...rustAvatarClearanceKernelStatus()}))

if (process.argv.includes('--native')) {
  const binary='rust/exo_avatar_clearance_kernel/target/native-clearance-parity'
  const cpp=`#include "native_cpp/core/avatar_physics.cpp"
#include <iostream>
int main(){using namespace garment::avatar_physics; Json cases; std::cin>>cases; Json out=Json::array(); for(auto q:cases){auto c=q["c"],r=q["r"];out.push_back(Json::array({ellipsoid(q["p"],c["x"],c["y"],c["z"],r["x"],r["y"],r["z"]),capsule(q["p"],q["pose"])}));}std::cout<<out;}`
  const compiled=spawnSync('c++',['-std=c++17','-O2','-I.','-Inative_cpp/vendor','-x','c++','-','-o',binary],{input:cpp,encoding:'utf8'})
  assert.equal(compiled.status,0,compiled.stderr)
  const native=spawnSync(binary,[],{input:JSON.stringify(nativeCases),encoding:'utf8',maxBuffer:10*1024*1024})
  assert.equal(native.status,0,native.stderr)
  let nativeMax=0
  JSON.parse(native.stdout).forEach((pair,i)=>pair.forEach((value,j)=>{
    const delta=Math.abs(value-nativeCases[i].expected[j]);nativeMax=Math.max(nativeMax,delta);assert.ok(delta<=tolerance)
  }))
  console.log(JSON.stringify({nativeColliderParity:true,cases:nativeCases.length,toleranceAbsoluteMeters:tolerance,maxAbsoluteDifference:nativeMax,solverCertified:false}))
}
