import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'

const here=path.dirname(fileURLToPath(import.meta.url))
export function createMetadataValidator({binary=process.env.EXO_METADATA_VALIDATOR_BIN||path.join(here,'target/debug/exo-metadata-validation')}={}){
 let child=null, pending=null, disabled=false
 const fail=()=>{
  disabled=true
  if(pending){clearTimeout(pending.timer);pending.resolve(null);pending=null}
  child?.kill();child=null
 }
 const ensure=()=>{
  if(disabled||!fs.existsSync(binary))return false
  if(child)return true
  try{
   child=spawn(binary,[],{stdio:['pipe','pipe','ignore']})
   child.on('error',fail);child.on('exit',fail)
   createInterface({input:child.stdout}).on('line',line=>{
    const p=pending
    if(!p)return fail()
    pending=null;clearTimeout(p.timer)
    try{const result=JSON.parse(line);if(typeof result.ok!=='boolean')return p.resolve(null);p.resolve(result)}
    catch{p.resolve(null);fail()}
   })
   return true
  }catch{fail();return false}
 }
 return {
  get active(){return Boolean(child)&&!disabled},
  async validate(data){
   if(!ensure()||pending)return null
   return new Promise(resolve=>{
    pending={resolve,timer:setTimeout(fail,1500)}
    child.stdin.write(JSON.stringify({target:data.target,field:data.field,value:data.value})+'\n',error=>{if(error)fail()})
   })
  },
  close(){fail()},
 }
}
