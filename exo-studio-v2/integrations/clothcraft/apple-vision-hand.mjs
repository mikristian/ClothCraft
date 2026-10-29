import fs from 'node:fs'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const here=path.dirname(fileURLToPath(import.meta.url))
export function createAppleVisionHand({binary=process.env.EXO_APPLE_VISION_HAND_BIN||path.join(here,'macos','vision-hand-landmarks')}={}){
  let child=null,pending=null,buffer=''
  const available=()=>process.platform==='darwin'&&fs.existsSync(binary)
  const fail=error=>{
    if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null}
    if(child){child.kill();child=null}
  }
  const launch=()=>{
    if(child)return
    if(!available())throw Error('Apple Vision hand detector is not installed on this Mac')
    child=spawn(binary,[],{stdio:['pipe','pipe','pipe']})
    child.on('error',fail)
    child.on('exit',()=>fail(Error('Apple Vision hand detector exited')))
    child.stdout.on('data',chunk=>{
      buffer+=chunk.toString('utf8')
      if(buffer.length>1024*1024)return fail(Error('Apple Vision response too large'))
      while(buffer.includes('\n')){
        const offset=buffer.indexOf('\n'),line=buffer.slice(0,offset);buffer=buffer.slice(offset+1)
        if(!pending)continue
        const current=pending;pending=null;clearTimeout(current.timer)
        try{
          const answer=JSON.parse(line)
          if(answer.ok!==true)throw Error(answer.error||'Apple Vision hand detection failed')
          if(!Array.isArray(answer.landmarks))throw Error('Malformed Apple Vision landmark array')
          current.resolve({provider:'apple-vision',landmarks:answer.landmarks})
        }catch(error){current.reject(error)}
      }
    })
  }
  return {
    status:()=>({available:available(),provider:'apple-vision',local:true}),
    async detect(image){
      if(typeof image!=='string'||image.length>600000||image.length<20||!/^[A-Za-z0-9+/]+={0,2}$/.test(image))throw Error('Invalid camera JPEG frame')
      if(pending)throw Error('Apple Vision is still processing the previous frame')
      launch()
      return new Promise((resolve,reject)=>{
        // Apple's first Vision inference warms OS models and can take several
        // seconds on a cold process. Keep the worker alive across frames.
        const timer=setTimeout(()=>fail(Error('Apple Vision frame timed out')),15000)
        pending={resolve,reject,timer}
        child.stdin.write(JSON.stringify({image})+'\n',error=>{if(error)fail(error)})
      })
    },
    close:()=>fail(Error('Apple Vision camera service closed')),
  }
}
