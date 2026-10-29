// Universal, reversible VIEWPORT-ONLY animation for the Rust triangle avatars.
// These avatars are not assumed to carry a skeleton. This does not move their
// native collision body, edit a garment pattern, or bake cloth simulation.
export const WALK_PRESETS = Object.freeze([
  Object.freeze({id:'runway',label:'Runway Walk',step:0.72,swing:.34,arm:.23,bob:.008,pace:1}),
  Object.freeze({id:'casual',label:'Casual Walk',step:0.64,swing:.29,arm:.36,bob:.011,pace:1}),
  Object.freeze({id:'power',label:'Power Walk',step:0.85,swing:.48,arm:.44,bob:.014,pace:1.15}),
  Object.freeze({id:'editorial',label:'Editorial Slow Walk',step:0.56,swing:.25,arm:.15,bob:.006,pace:.8}),
])

// Editorial motion paths are timeline templates, independent of body shape
// and gait. Keys contain normalized frame time, runway-distance fraction and
// continuous heading in degrees (unwrapped so a turn cannot spin backwards).
export const WALK_SEQUENCES = Object.freeze([
  Object.freeze({id:'straight',label:'Simple Walk Forward',keys:[
    {id:'start',t:0,z:0,yaw:0,name:'Start'},
    {id:'finish',t:1,z:1,yaw:0,name:'Walk forward'},
  ]}),
  Object.freeze({id:'catwalk',label:'Runway Walk + End Pose',keys:[
    {id:'start',t:0,z:0,yaw:0,name:'Entrance'},
    {id:'approach',t:.30,z:.4,yaw:0,name:'Catwalk'},
    {id:'pose',t:.84,z:1,yaw:0,name:'End pose'},
    {id:'finish',t:1,z:1,yaw:0,name:'Hold'},
  ]}),
  Object.freeze({id:'runway-return',label:'Runway Walk · Turn + Return',keys:[
    {id:'start',t:0,z:0,yaw:0,name:'Start'},
    {id:'runway-end',t:.41,z:1,yaw:0,name:'Runway end'},
    {id:'turn',t:.55,z:1,yaw:180,name:'Turn 180°'},
    {id:'return',t:.96,z:0,yaw:180,name:'Walk back'},
    {id:'finish',t:1,z:0,yaw:180,name:'Finish'},
  ]}),
  Object.freeze({id:'runway-turn-pose',label:'Runway Walk · Turn + Pose',keys:[
    {id:'start',t:0,z:0,yaw:0,name:'Start'},
    {id:'runway-end',t:.56,z:1,yaw:0,name:'Walk to end'},
    {id:'turn',t:.80,z:1,yaw:180,name:'Turn around'},
    {id:'finish',t:1,z:1,yaw:180,name:'Hold pose'},
  ]}),
])

export const walkPreset=id=>WALK_PRESETS.find(p=>p.id===id)||WALK_PRESETS[0]
export const walkSequence=id=>WALK_SEQUENCES.find(s=>s.id===id)||WALK_SEQUENCES[0]
export const clampWalk=(n,min,max)=>Math.max(min,Math.min(max,
  (typeof n==='number'||(typeof n==='string'&&n.trim()!==''))&&Number.isFinite(Number(n))?Number(n):min))
export const walkKeys=({sequence='straight',keyframes}={})=>{
  const source=Array.isArray(keyframes)&&keyframes.length>=2&&keyframes.every(k=>k&&typeof k==='object'&&!Array.isArray(k))
    ?keyframes:walkSequence(sequence).keys
  const keys=source.map(k=>({...k,t:clampWalk(k.t,0,1),z:clampWalk(k.z,-2,2),yaw:clampWalk(k.yaw,-720,720)}))
    .sort((a,b)=>a.t-b.t)
  // Duplicate timestamps cause discontinuous jumps and near-zero segments.
  // Prefer the final authored key at each instant, preserving stable playback.
  const unique=[]
  for(const key of keys){
    if(unique.length && Math.abs(key.t-unique[unique.length-1].t)<1e-8) unique[unique.length-1]=key
    else unique.push(key)
  }
  if(unique.length<2) return walkSequence(sequence).keys.map(k=>({...k}))
  // A user-authored timeline may omit either endpoint. Extend its first and
  // last poses so preview interpolation has a defined result throughout 0..1.
  if(unique[0].t>0)unique.unshift({...unique[0],t:0})
  if(unique[unique.length-1].t<1)unique.push({...unique[unique.length-1],t:1})
  return unique
}
export const walkDuration=({preset='runway',distance=2.4,speed=1,sequence='straight',keyframes}={})=>{
  const p=walkPreset(preset)
  const keys=walkKeys({sequence,keyframes})
  let walk=0,turns=0,holds=0
  for(let i=1;i<keys.length;i++){
    const prev=keys[i-1],next=keys[i]
    walk+=Math.abs(next.z-prev.z)*clampWalk(distance,.3,6)
    turns+=Math.abs(next.yaw-prev.yaw)/180
    if(Math.abs(next.z-prev.z)<1e-5 && Math.abs(next.yaw-prev.yaw)<1)holds++
  }
  return Math.max(1.2,(walk+turns*.8+holds*.35)/(clampWalk(speed,.25,2)*p.pace))
}
const smooth=(lo,hi,x)=>{
  const t=clampWalk((x-lo)/(hi-lo),0,1)
  return t*t*(3-2*t)
}

// Model-proportion-based leg/arm weights are mesh-independent. This approach
// deliberately avoids lying about skeleton retargeting on unrigged OBJ avatars.
export function walkVertex(x,y,z,phase,bodyHeight,preset='runway',gaitWeight=1){
  const p=walkPreset(preset)
  const h=clampWalk(bodyHeight,.5,3)
  const yN=y/h
  const legMask=1-smooth(.49,.60,yN)
  const side=x>=0?1:-1
  const hipSwing=Math.sin(phase+(side<0?Math.PI:0))*p.swing*gaitWeight
  const kneeLift=Math.max(0,Math.sin(phase+(side<0?Math.PI:0)))*.10*h*gaitWeight
  const ankle=1-smooth(.26,.55,yN)
  const thigh=clampWalk((.55-yN)*h,0,h*.55)
  const lowerLeg=Math.max(0,(.29-yN)*h)
  const legZ=(Math.sin(hipSwing)*thigh + Math.sin(Math.max(0,hipSwing))*.3*lowerLeg)*legMask
  const legY=(kneeLift*ankle + Math.cos(hipSwing)*thigh-thigh)*legMask
  // Only outside the shoulder/upper-arm area, with smooth transitions at the
  // shoulder and wrist. Do not introduce oscillations into the torso.
  const armWidth=smooth(.105,.19,Math.abs(x)/h)
  const armHeight=smooth(.52,.61,yN)*(1-smooth(.89,1.0,yN))
  const armWeight=armWidth*armHeight
  const armZ=-hipSwing*p.arm*h*.55*armWeight
  const armY=Math.abs(Math.sin(phase))*.006*h*armWeight
  const bob=p.bob*h*(1-Math.cos(phase*2))*.5*gaitWeight
  return [x,y+legY+armY+bob,z+legZ+armZ]
}

export function walkPose(progress,{preset='runway',distance=2.4,direction='forward',sequence='straight',keyframes}={}){
  const p=walkPreset(preset)
  const travel=clampWalk(distance,0,6)
  const keys=walkKeys({sequence,keyframes})
  const t=clampWalk(progress,0,1)
  let travelled=0
  for(let i=1;i<keys.length;i++){
    const a=keys[i-1],b=keys[i]
    const portion=clampWalk((t-a.t)/Math.max(.00001,b.t-a.t),0,1)
    if(t>=b.t){travelled+=Math.abs(b.z-a.z);continue}
    travelled+=Math.abs(b.z-a.z)*portion
    const turning=Math.abs(b.yaw-a.yaw)>1e-3
    const easing=turning?portion*portion*(3-2*portion):portion
    const scale=direction==='backward'?-1:1
    return {
      phase:travelled*travel/Math.max(.2,p.step)*2*Math.PI,
      translationZ:scale*travel*(a.z+(b.z-a.z)*portion),
      yaw:(a.yaw+(b.yaw-a.yaw)*easing+(scale<0?180:0))*Math.PI/180,
      gaitWeight:Math.abs(b.z-a.z)>.0001?1:0,
      segment:i-1,
    }
  }
  const end=keys[keys.length-1]
  return {phase:travelled*travel/Math.max(.2,p.step)*2*Math.PI,
    translationZ:travel*end.z*(direction==='backward'?-1:1),
    yaw:(end.yaw+(direction==='backward'?180:0))*Math.PI/180,
    gaitWeight:0,segment:keys.length-2}
}
