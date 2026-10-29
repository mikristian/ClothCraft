import {execFile} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const GRIDCRAFT_MAX_FORMULA=256
export const GRIDCRAFT_TIMEOUT_MS=1200
const SAFE_FUNCTIONS=new Set(['SUM','AVERAGE','MIN','MAX','ABS','ROUND','ROUNDUP','ROUNDDOWN','COUNT','PRODUCT','SQRT','POWER','MOD','INT','IF'])
const appBinary=()=>path.join(os.homedir(),'Library','Application Support','EXO ClothCraft Studio','bin','gridcraft-cli')

export function gridcraftExecutable(env=process.env){
  const binary=env.EXO_GRIDCRAFT_CLI||appBinary()
  if(!path.isAbsolute(binary))return null
  try {const stat=fs.statSync(binary);return stat.isFile()&&(stat.mode&0o111)?binary:null}catch{return null}
}

export function validateGridcraftFormula(formula){
  if(typeof formula!=='string'||formula.length<2||formula.length>GRIDCRAFT_MAX_FORMULA||formula[0]!=='=')throw new Error('INVALID_FORMULA')
  const raw=formula.slice(1)
  if(!/^[0-9A-Za-z_.,+*/%()\s-]+$/.test(raw))throw new Error('UNSAFE_FORMULA')
  const identifiers=raw.match(/[A-Za-z_][A-Za-z_0-9]*/g)||[]
  for(const name of identifiers){if(!SAFE_FUNCTIONS.has(name.toUpperCase()))throw new Error('UNSUPPORTED_FUNCTION')}
  const calls=raw.match(/[A-Za-z_][A-Za-z_0-9]*\s*\(/g)||[]
  if(identifiers.length!==calls.length)throw new Error('INVALID_FUNCTION_CALL')
  if((raw.match(/\(/g)||[]).length!==(raw.match(/\)/g)||[]).length)throw new Error('UNBALANCED_FORMULA')
  return formula
}

export function gridcraftStatus(env=process.env){return {ok:true,available:Boolean(gridcraftExecutable(env)),version:'v1',maxFormulaLength:GRIDCRAFT_MAX_FORMULA,timeoutMs:GRIDCRAFT_TIMEOUT_MS}}

export function evaluateGridcraftFormula(formula,{env=process.env,exec=execFile}={}){
  const validated=validateGridcraftFormula(formula)
  const binary=gridcraftExecutable(env)
  if(!binary)return Promise.resolve({ok:false,code:'CLI_UNAVAILABLE'})
  return new Promise(resolve=>{
    exec(binary,['eval',validated,'--json'],{shell:false,timeout:GRIDCRAFT_TIMEOUT_MS,maxBuffer:4096,encoding:'utf8',env:{PATH:'/usr/bin:/bin'},windowsHide:true},(error,stdout)=>{
      if(error)return resolve({ok:false,code:error.killed?'CLI_TIMEOUT':'CLI_FAILED'})
      const output=String(stdout).trim()
      const value=Number(output)
      if(!output||!Number.isFinite(value))return resolve({ok:false,code:'INVALID_CLI_RESULT'})
      return resolve({ok:true,value,engine:'gridcraft-cli',source:'formula-only'})
    })
  })
}
