// Persistent upstream authoring + physics; one worker, no process per frame.
import fs from 'node:fs'
import path from 'node:path'
import {spawn,spawnSync} from 'node:child_process'
import {createInterface} from 'node:readline'
import {createHash} from 'node:crypto'
import {paths,nativeExport} from './bridge.mjs'
import {createMetadataValidator} from './rust-service/validator-client.mjs'
import {assertNativeAvatarPersistence} from './avatarPersistenceContract.mjs'
export const chooseNativeGpuPhysics=(env,capabilities)=>
 env.EXO_CLOTHCRAFT_GPU==='1' &&
 capabilities?.ok===true && capabilities?.gpuSimulation===true &&
 env.EXO_CLOTHCRAFT_ALLOW_EXPERIMENTAL_GPU==='1'
export function createWorkspace(outputRoot) {
 const metadataValidator=createMetadataValidator()
 let child=null,pending=null,busy=false,loaded=false,lastError='',stepsSinceSave=0,running=false,pump=null,current=null,runError=null,lastPoll=Date.now()
 let nativeGpuSupported=null,nativeGpuRequested=process.env.EXO_CLOTHCRAFT_GPU==='1',nativeGpuActive=false
 let liveGrab=null
 const saveFile=path.join(outputRoot,'workspace','fitting-project.json')
 const metadataFile=saveFile+'.properties.json'
 // The native Rust Undo/Redo sidecar is digest-linked to fitting-project.json.native.
 // Every rollback archive containing the native project must retain its
 // matching journal, otherwise restoring a garment silently loses the saved
 // cross-restart linked pattern/grade/hardware history.
 const backupEntries=()=>[
  [saveFile,'fitting-project.json'],
  [saveFile+'.native','fitting-project.json.native'],
  [saveFile+'.native.undo-v1.json','fitting-project.json.native.undo-v1.json'],
  [metadataFile,'fitting-project.json.properties.json'],
 ]
 let avatarModel='makehuman-base'
 const avatarPathFor=model=>{
  if(model==='makehuman-base'){
   const upstream=path.join(paths().upstream,'assets/makehuman/mannequin.obj')
   const source=fs.existsSync(upstream)?upstream:process.env.EXO_CLOTHCRAFT_AVATAR_MAKEHUMAN_OBJ
   if(!source||!fs.existsSync(source))throw new Error('MakeHuman collision avatar is missing')
   return source
  }
  if(model==='clo-thomas'){
   const source=process.env.EXO_CLOTHCRAFT_AVATAR_THOMAS_OBJ
   if(!source||!fs.existsSync(source))throw new Error('CLO Thomas collision avatar is not installed in native V2')
   return source
  }
  throw new Error(`Native V2 has no collision body for ${model}`)
 }
 try{
  const saved=JSON.parse(fs.readFileSync(saveFile,'utf8'))
  const thomas=process.env.EXO_CLOTHCRAFT_AVATAR_THOMAS_OBJ
  if(thomas&&path.resolve(saved.avatar_path||'')===path.resolve(thomas))avatarModel='clo-thomas'
 }catch{}
 let propertyMetadata=null
 const fingerprint=template=>createHash('sha256').update(JSON.stringify({
  template:template?.name||'',panels:(template?.panels||[]).map(p=>p.id).sort(),
  fabrics:(template?.fabrics||[]).map(f=>f.id).sort()
 })).digest('hex')
 const bindMetadata=(template,fresh=false)=>{
  const identity=fingerprint(template)
  let previous=null
  try{previous=JSON.parse(fs.readFileSync(metadataFile,'utf8'))}catch{}
  propertyMetadata=!fresh&&previous?.identity===identity?previous:{version:1,identity,panels:{},fabrics:{}}
  if(fresh)persistMetadata()
 }
 const publish=result=>{
  if(result?.ok&&result.data?.template&&propertyMetadata){
   return {...result,data:{...result.data,avatarModel,propertyMetadata:{panels:propertyMetadata.panels,fabrics:propertyMetadata.fabrics}}}
  }
  return result
 }
 const persistMetadata=()=>{
  if(!propertyMetadata)throw new Error('No project metadata binding')
  fs.mkdirSync(path.dirname(metadataFile),{recursive:true})
  const temp=metadataFile+'.tmp'
  fs.writeFileSync(temp,JSON.stringify(propertyMetadata))
  fs.renameSync(temp,metadataFile)
 }
 const start=()=>{
  if(child)return
  const config=paths(), bin=process.env.EXO_CLOTHCRAFT_SESSION_BIN||path.join(config.upstream,'target/debug/exo-session')
  if(!fs.existsSync(bin))throw new Error('ClothCraft workspace executable not built')
  // Query the *actual installed executable*, not a Cargo.toml feature flag.
  // Older CPU-only builds lack this probe and intentionally fall back to CPU.
  const probe=spawnSync(bin,['--exo-capabilities'],{cwd:config.upstream,
    encoding:'utf8',timeout:3000,maxBuffer:4096})
  let capabilities=null
  try{capabilities=probe.status===0?JSON.parse(probe.stdout.trim()):null}catch{}
  nativeGpuSupported=capabilities?.ok===true&&capabilities?.gpuSimulation===true
  // A GPU-capable executable is NOT proof of equivalent garment physics.
  // The 2026-10-18 same-binary 40-step T-shirt test measured CPU 4.04 mm vs
  // GPU 326.84 mm maximum seam gap. Keep users' authored garments on the f64
  // reference path until GPU parity is verified. Explicit opt-in is reserved
  // for isolated engineering QA; do not silently enable it from the Swift
  // launcher's EXO_CLOTHCRAFT_GPU=1 default.
  const useGpu=chooseNativeGpuPhysics(process.env,capabilities)
  nativeGpuActive=useGpu
  if(nativeGpuRequested&&!nativeGpuSupported) {
   lastError='GPU simulation is unavailable in this native build; the garment editor is running with the CPU solver.'
   console.warn('[EXO workspace] '+lastError)
  } else if(nativeGpuRequested&&!useGpu) {
   lastError='GPU garment physics has not passed long-run CPU parity; the editor is using the safer CPU solver. Experimental GPU testing requires EXO_CLOTHCRAFT_ALLOW_EXPERIMENTAL_GPU=1.'
   console.warn('[EXO workspace] '+lastError)
  }
  // The research-only hairpin initial pose failed 50-step strain screening.
  // It may be opted into for isolated direct exo-session experiments, but
  // must NEVER be inherited by the installed Studio bridge.
  child=spawn(bin,[avatarPathFor(avatarModel),saveFile+'.native',...(useGpu?['--gpu']:[])],{
    cwd:config.upstream,stdio:['pipe','pipe','pipe'],
    env:{...process.env,EXO_UNVALIDATED_TUCK_HAIRPIN_PREFOLD:'0'}
  })
  const proc=child
  const fail=e=>{if(child!==proc)return;child=null;loaded=false;if(pending){clearTimeout(pending.timer);pending.reject(e);pending=null}}
  child.on('error',fail);child.on('exit',()=>fail(new Error('ClothCraft worker stopped. Reopen the saved workspace.')))
  child.stderr.on('data',c=>{lastError=(lastError+c).slice(-2000)})
  createInterface({input:child.stdout}).on('line',line=>{
   if(!pending)return
   const p=pending;pending=null;clearTimeout(p.timer)
   try{p.resolve(JSON.parse(line))}catch{p.reject(new Error('Invalid native workspace response'))}
  })
 }
 const rpc=data=>new Promise((resolve,reject)=>{
  if(pending)return reject(new Error('Native request already pending'))
  pending={resolve,reject,timer:setTimeout(()=>{const p=pending;pending=null;child?.kill();child=null;loaded=false;p?.reject(new Error('ClothCraft operation timed out; last saved project is preserved'))},120000)}
  try{child.stdin.write(JSON.stringify(data)+'\n',error=>{if(error&&pending){const p=pending;pending=null;clearTimeout(p.timer);p.reject(error)}})}
  catch(error){const p=pending;pending=null;clearTimeout(p.timer);p.reject(error)}
 })
 const save=async()=>{
  const result=await rpc({op:'save'})
  if(result.ok){
   assertNativeAvatarPersistence(result.data?.project,avatarPathFor(avatarModel))
   fs.mkdirSync(path.dirname(saveFile),{recursive:true});fs.writeFileSync(saveFile+'.tmp',JSON.stringify(result.data.project));fs.renameSync(saveFile+'.tmp',saveFile);stepsSinceSave=0
  }
  return result
 }
 // Opening another library garment must never silently destroy the active
 // fitting project. Store an exact disk snapshot BEFORE replacing the Rust
 // session, including optional native state and authored property sidecar.
 const backupBeforeProjectSwitch=async()=>{
  const saved=await save()
  if(!saved.ok||!fs.existsSync(saveFile))throw new Error(saved.error||'Could not preserve the current native garment before switching')
  const archiveRoot=path.join(outputRoot,'workspace','backups')
  fs.mkdirSync(archiveRoot,{recursive:true})
  const stamp=new Date().toISOString().replace(/[:.]/g,'-')
  const archive=fs.mkdtempSync(path.join(archiveRoot,`before-library-switch-${stamp}-`))
  try{
   for(const [source,target] of backupEntries()){
    if(fs.existsSync(source))fs.copyFileSync(source,path.join(archive,target))
   }
  }catch(error){
   fs.rmSync(archive,{recursive:true,force:true})
   throw new Error(`Could not back up the current garment: ${error.message}`)
  }
  return archive
 }
 const remember=result=>{if(result.ok&&result.data?.template)current={...publish(result).data,avatar:result.data.avatar||current?.avatar};return publish(result)}
 const advance=async()=>{
  let deadline=performance.now()
  try{while(running){if(Date.now()-lastPoll>5000){running=false;break}const result=remember(await rpc({op:'step',steps:1,grab:liveGrab,revision:current.revision}));if(!result.ok){runError=result.error;break}stepsSinceSave+=1;if(stepsSinceSave>=60)await save();deadline=Math.max(deadline+1000/60,performance.now()-4*1000/60);await new Promise(r=>setTimeout(r,Math.max(0,deadline-performance.now())))}}
  catch(error){runError=error.message}
  finally{
   running=false;liveGrab=null
   if(child&&loaded){
    try{
     // Native commands require the current revision. Without it the cleanup
     // is rejected as stale and a paused solver retains an invisible spring.
     const released=remember(await rpc({op:'grab',revision:current.revision,grab:null}))
     if(!released.ok)throw new Error(released.error||'Failed to release native fabric grab')
     // An invalid contact solve may return after modifying scratch state.
     // Never overwrite the last saved, usable drape with a failed step.
     if(!runError)await save()
    }catch{}
   }
  }
 }
 return {async request(data={}){
  // Latest pointer target is sampled by the worker each physical step, like
  // upstream's control mailbox. It does not compete for an in-flight RPC.
  if(data.op==='grab'){
   if(!loaded)throw new Error('Open a garment before grabbing')
   const g=data.grab
   if(g!=null){
    if(!running)throw new Error('Hand simulation is not running')
    if(!Array.isArray(g.vertices)||g.vertices.length!==3||!g.vertices.every(Number.isInteger)
      ||!Array.isArray(g.weights)||g.weights.length!==3||!g.weights.every(n=>Number.isFinite(n)&&n>=-1e-6&&n<=1.000001)
      ||Math.abs(g.weights.reduce((a,b)=>a+b,0)-1)>1e-5
      ||!Array.isArray(g.target)||g.target.length!==3||!g.target.every(n=>Number.isFinite(n)&&Math.abs(n)<20)
      ||!current.triangles.some(t=>t.every((v,i)=>v===g.vertices[i])))throw new Error('Invalid surface grab')
   }
   liveGrab=g??null;lastPoll=Date.now();return{ok:true,data:{grabQueued:Boolean(liveGrab)}}
  }

  // The most recent successful native command already supplies a complete
  // snapshot. Read-only viewport/status polling must never seize the solver
  // mutex and reject a simultaneous, intentional Property Editor save.
  if(data.op==='snapshot'&&current){lastPoll=Date.now();return{ok:true,data:{...current,propertyMetadata:{panels:propertyMetadata?.panels||{},fabrics:propertyMetadata?.fabrics||{}},avatar:data.avatar?current.avatar:null,running,busy}}}
  if(data.op==='pause'){
   if(busy)throw new Error('Workspace busy; wait for the current operation')
   busy=true
   try{
    running=false;liveGrab=null;if(pump)await pump;pump=null
    if(loaded&&!runError)await save()
    return{ok:!runError,error:runError,data:{...current,avatar:null,running:false}}
   }finally{busy=false}
  }
  if(data.op==='play'){
   if(!loaded||busy)throw new Error('Workspace is not ready')
   if(pump&&!running){await pump;pump=null}
   if(!running){lastPoll=Date.now();running=true;runError=null;pump=advance()}
   return{ok:true,data:{...current,avatar:null,running:true}}
  }
  // Explicit recovery when an invalid saved drape prevents the Rust garment
  // from opening. The user's original saved project (including its complete
  // pose) is backed up BEFORE constructing the same authored template with a
  // fresh, off-body solver state. Never recover silently during startup.
  if(data.op==='recover-off-body'){
   if(busy||running)throw new Error('Pause pending ClothCraft operations before recovery')
   busy=true
   try{
    if(!fs.existsSync(saveFile))throw new Error('No saved garment project is available for recovery')
    const project=JSON.parse(fs.readFileSync(saveFile,'utf8'))
    if(!project?.template?.panels?.length)throw new Error('Saved garment contains no recoverable pattern panels')
    const stamp=new Date().toISOString().replace(/[:.]/g,'-')
    const backup=saveFile+`.before-off-body-reset-${stamp}.bak`
    fs.copyFileSync(saveFile,backup)
    const originalNative=saveFile+'.native'
    if(fs.existsSync(originalNative))fs.copyFileSync(originalNative,backup+'.native')
    const originalJournal=originalNative+'.undo-v1.json'
    if(fs.existsSync(originalJournal))
     fs.copyFileSync(originalJournal,backup+'.native.undo-v1.json')
    start()
    const restoredRaw=await rpc({op:'open',project:{...project,state:null,mesh_signature:null},avatar:true})
    if(restoredRaw.ok)bindMetadata(restoredRaw.data.template)
    const restored=remember(restoredRaw)
    if(!restored.ok)return restored
    loaded=true;runError=null;stepsSinceSave=0
    await save()
    return{ok:true,data:{...restored.data,recoveryBackup:path.basename(backup)}}
   }finally{busy=false}
  }
  if(running)throw new Error('Pause simulation before editing or saving')
  if(pump){await pump;pump=null}

  // A hardware slider change is persisted before the next one. Rapid Undo /
  // Redo clicks can arrive while that short save is still finishing; queue
  // these hardware edits briefly rather than rejecting a user action.
  if(busy&&['hardware-set','hardware-undo','hardware-redo','save'].includes(data.op)){
   const deadline=Date.now()+6000
   while(busy&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,35))
  }
  if(busy)throw new Error('Workspace busy; wait for the current operation')
  if(!loaded&&!['open','snapshot'].includes(data.op))throw new Error('Open a garment before sending workspace commands')
  busy=true
  try{
   start()
   if(data.op==='select-avatar'){
    const nextModel=data.model
    // Validate before touching the active Rust process or saved project.
    avatarPathFor(nextModel)
    if(nextModel===avatarModel)return {ok:true,data:{...current,avatarModel}}
    const savedResult=await save()
    if(!savedResult.ok)throw new Error(savedResult.error||'Could not preserve the current garment before avatar change')
    const previousProject=JSON.parse(fs.readFileSync(saveFile,'utf8'))
    const previousModel=avatarModel
    const restart=async(model,project)=>{
     const previous=child;child=null;previous?.kill()
     avatarModel=model;loaded=false;start()
     return rpc({op:'open',project,avatar:true})
    }
    try{
     // Keep authored patterns, seams and materials. A different collision
     // body requires a fresh solver state; the saved pose can be recovered.
     const opened=await restart(nextModel,{...previousProject,state:null,mesh_signature:null})
     if(!opened.ok)throw new Error(opened.error||'Avatar mesh could not be loaded')
     const result=remember(opened);loaded=true;runError=null;stepsSinceSave=0
     await save()
     return {...result,data:{...result.data,avatarModel}}
    }catch(error){
     const restored=await restart(previousModel,previousProject)
     if(!restored.ok)throw new Error(`Avatar change failed (${error.message}); previous garment also could not reopen: ${restored.error}`)
     remember(restored);loaded=true
     return {ok:false,error:`Could not render ${nextModel}: ${error.message}. Previous garment restored.`,data:current}
    }
   }
   if(!loaded||data.op==='open'){
    liveGrab=null
    // Saving plus archiving happens while the native worker is paused and the
    // request mutex is held. A failed backup cancels the switch altogether.
    const previousProjectBackup=loaded&&data.op==='open'
     ? await backupBeforeProjectSwitch() : null
    // Load the *actual current collider* on every new garment/session. The
    // same mesh drives both the Three.js avatar and its 2D SVG silhouette.
    // Never keep a previous model's outline after an Open/avatar change.
    let initial={op:'open',preset:data.preset||'tshirt',avatar:true}
    if(data.document)initial.template=nativeExport(data.document,paths().cli).template
    else if(data.project)initial.project=data.project
    else if(data.op!=='open'&&fs.existsSync(saveFile))initial.project=JSON.parse(fs.readFileSync(saveFile,'utf8'))
    const opened=await rpc(initial)
    if(opened.ok)bindMetadata(opened.data.template,data.op==='open'&&!data.project&&!data.document)
    const result=remember(opened)
    if(result.ok){loaded=true;await save()}
    return previousProjectBackup&&result.ok
     ? {...result,data:{...result.data,previousProjectBackup}} : result
   }
   if(data.op==='save')return await save()
   // Production-vs-3D article membership is a real Rust fitting-project
   // field. Back up the pre-migration garment before its first durable write,
   // because older native binaries reject unknown FittingProject fields.
   if(['piece-variant-store','piece-variant-clear'].includes(data.op)){
    if(!Number.isSafeInteger(data.revision)||data.revision!==current?.revision)
     return {ok:false,error:'Stale document revision; reload current snapshot',data:current}
    if(data.op==='piece-variant-store'&&!current?.pieceVariant?.persisted){
     const prior=await save()
     if(!prior.ok)return prior
     const backups=path.join(outputRoot,'workspace','backups')
     fs.mkdirSync(backups,{recursive:true})
     const stamp=new Date().toISOString().replace(/[:.]/g,'-')
     const archive=fs.mkdtempSync(path.join(backups,`before-native-piece-variant-${stamp}-`))
     try{
      for(const [source,name] of backupEntries()){
       if(fs.existsSync(source))fs.copyFileSync(source,path.join(archive,name))
      }
     }catch(error){
      fs.rmSync(archive,{recursive:true,force:true})
      throw Error('Native piece variant backup failed: '+error.message)
     }
    }
    const changed=remember(await rpc(data))
    if(!changed.ok)return changed
    const persisted=await save()
    if(!persisted.ok)throw Error(persisted.error||'Could not save native production and 3D variant')
    return changed
   }
   // A six-size grade catalog must pass Rust's revision CAS and then be
   // written into the SAME FittingProject JSON as the source garment.
   // In-memory validation without durable native save is not persistence.
   if(['grade-run-commit','grade-run-clear'].includes(data.op)){
    if(!Number.isSafeInteger(data.revision)||data.revision!==current?.revision)
     return {ok:false,error:'Stale document revision; reload current snapshot',data:current}
    if(data.op==='grade-run-commit'){
     // The new grade_run schema is not readable by older native binaries
     // (FittingProject deny_unknown_fields). Archive the pre-commit garment
     // and native pose before this first revision-controlled migration.
     const prior=await save()
     if(!prior.ok)throw Error(prior.error||'Could not save original garment before grade catalog')
     const backups=path.join(outputRoot,'workspace','backups')
     fs.mkdirSync(backups,{recursive:true})
     const stamp=new Date().toISOString().replace(/[:.]/g,'-')
     const archive=fs.mkdtempSync(path.join(backups,`before-native-grade-catalog-${stamp}-`))
     try{
      for(const [source,name] of backupEntries()){
       if(fs.existsSync(source))fs.copyFileSync(source,path.join(archive,name))
      }
     }catch(error){
      fs.rmSync(archive,{recursive:true,force:true})
      throw Error('Native grading catalog backup failed: '+error.message)
     }
    }
    const changed=await rpc(data)
    if(!changed.ok)return changed
    const next=remember(await rpc({op:'snapshot',avatar:true,graphics:true}))
    if(!next.ok)throw Error(next.error||'Could not refresh graded catalog revision')
    const persisted=await save()
    if(!persisted.ok)throw Error(persisted.error||'Native graded size catalog was not saved')
    return {ok:true,data:{...next.data,gradeCatalogResult:{
      ...changed.data,persisted:true,sourceRevision:next.data.revision,
      manufactured:false}}}
   }
   // These requests return inspection packets rather than a garment snapshot.
   // Never pass them through remember(), which owns the current native scene
   // state and must not be replaced with CUT or grade catalog metadata.
   if(['piece-variant-inspect','piece-variant-instance-preview','grade-run-status','grade-run-cutlines','grade-run-pom-audit','grade-run-industrial-audit','grade-run-sewing-balance-audit','bindings-grade-regenerate-preview','fabric-grade-envelope-inspect'].includes(data.op))return rpc(data)
   if(['grade-run-activate','grade-run-restore'].includes(data.op)){
    if(!Number.isSafeInteger(data.revision)||data.revision!==current?.revision)
     return {ok:false,error:'Stale document revision; reload current snapshot',data:current}
    if(data.op==='grade-run-activate'){
     const report=await rpc({op:'grade-run-status',revision:data.revision})
     if(!report.ok)return report
     const catalog=report.data?.catalog
     if(typeof data.size!=='string'||!catalog||
       !(catalog.sizes?.includes(data.size)||Object.hasOwn(catalog.sizeCorrespondence||{},data.size)))
      return {ok:false,error:'Choose a verified saved native grading size or correspondence',data:current}
    }
    // Protect the authored base garment on disk before changing the active
    // Rust viewport. The native command only swaps in a compiled sized scene;
    // future saves always serialize the preserved base template and pose.
    if(data.op==='grade-run-activate'&&!current?.activeGradedSize){
     const prior=await save()
     if(!prior.ok)return {ok:false,error:prior.error||'Could not preserve original graded garment',data:current}
    }
    const next=remember(await rpc(data))
    if(!next.ok)return next
    // The backend has already compiled its new native sized garment; both
    // linked 2D/3D views receive the same mesh and physical source template.
    runError=null;stepsSinceSave=0;liveGrab=null
    return {...next,data:{...next.data,manufacturingApproved:false,gradedSizePreview:Boolean(next.data.activeGradedSize)}}
   }
   const appearanceKeys=['color','opacity','roughness','metalness','reflectionIntensity']
   const appearanceField=data.op==='set-property'&&data.target==='fabric'&&typeof data.field==='string'&&
    (appearanceKeys.some(key=>data.field===`appearance.${key}`||data.field===`appearance.back.${key}`||data.field===`appearance.side.${key}`))
   const resetFace=data.op==='set-property'&&data.target==='fabric'&&['appearance.back.reset','appearance.side.reset'].includes(data.field)
   if(data.op==='set-property'&&(data.field==='itemNo'||(data.target==='fabric'&&['construction','supplier','owner','pantoneCode','pantoneSystem','pantoneSource','pantoneApproval'].includes(data.field))||appearanceField||resetFace)){
    if(!Number.isSafeInteger(data.revision)||data.revision!==current?.revision)
     return{ok:false,error:'Stale document revision; reload current snapshot',data:current}
    if(!['panel','fabric'].includes(data.target))return{ok:false,error:'Property target must be panel or fabric',data:current}
    const items=data.target==='panel'?current.template.panels:current.template.fabrics
    if(typeof data.id!=='string'||!items.some(item=>item.id===data.id))return{ok:false,error:'Selected property target not found',data:current}
    const optionalText=data.field!=='itemNo'&&!appearanceField&&!resetFace
    const rustValidation=await metadataValidator.validate(data)
    if(rustValidation&&!rustValidation.ok)return{ok:false,error:rustValidation.error,data:current}
    if(!rustValidation&&resetFace){
     if(data.value!==true)return{ok:false,error:'Invalid fabric face reset value',data:current}
    }else if(!rustValidation&&appearanceField){
     const key=data.field.split('.').at(-1)
     const valid=key==='color'?typeof data.value==='string'&&/^#[0-9a-fA-F]{6}$/.test(data.value):
      typeof data.value==='number'&&Number.isFinite(data.value)&&data.value>=0&&data.value<=(key==='reflectionIntensity'?3:1)
     if(!valid)return{ok:false,error:'Invalid fabric appearance value',data:current}
    }else if(!rustValidation&&data.field==='pantoneSystem'&&!['','TCX','TPG','PMS'].includes(data.value))return{ok:false,error:'Unsupported Pantone color system',data:current}
    else if(!rustValidation&&data.field==='pantoneCode'&&data.value!==''&&!(typeof data.value==='string'&&(/^[0-9]{2}-[0-9]{4} (TCX|TPG)$/.test(data.value)||/^PANTONE [A-Z0-9][A-Z0-9 ]{0,35} (C|U)$/.test(data.value))))return{ok:false,error:'Use a valid Pantone reference such as 19-4052 TCX or PANTONE Warm Gray 1 C',data:current}
    else if(!rustValidation&&((typeof data.value!=='string'&&!(optionalText&&data.value===null))||(typeof data.value==='string'&&(data.value.length>(optionalText?128:120)||/[\u0000-\u001f\u007f]/.test(data.value)))))
     return{ok:false,error:optionalText?'Fabric information must be optional text of at most 128 printable characters':'Item number must contain at most 120 printable characters',data:current}
    const group=data.target==='panel'?'panels':'fabrics'
    const old=propertyMetadata[group][data.id]
    const resetKey=data.field==='appearance.side.reset'?'side':'back'
    const resetAppearance={...old?.appearance}
    if(resetFace)delete resetAppearance[resetKey]
    const nestedFace=data.field.startsWith('appearance.back.')?'back':data.field.startsWith('appearance.side.')?'side':null
    propertyMetadata[group][data.id]=resetFace?
     {...old,appearance:resetAppearance}:
     appearanceField?
     {...old,appearance:nestedFace?
      {...old?.appearance,[nestedFace]:{...old?.appearance?.[nestedFace],[data.field.slice(`appearance.${nestedFace}.`.length)]:data.value}}:
      {...old?.appearance,[data.field.slice('appearance.'.length)]:data.value}}:
     {...old,[data.field]:optionalText&&data.value===null?'':data.value}
    try{persistMetadata()}catch(error){
     if(old===undefined)delete propertyMetadata[group][data.id]
     else propertyMetadata[group][data.id]=old
     return{ok:false,error:'Failed to persist property: '+error.message,data:current}
    }
    // Sidecar edits are presentation metadata: retain the native revision.
    current={...current,propertyMetadata:{panels:propertyMetadata.panels,fabrics:propertyMetadata.fabrics}}
    return{ok:true,data:{...current,metadataOnly:true,metadataValidation:rustValidation?'rust':'javascript'}}
   }
   const result=remember(await rpc(data))
   if(result.ok){
    // A successful reset or edit establishes a new valid solver state.
    // Do not keep reporting an older OGC intersection after recovery.
    if(['reset','edit','edit-batch','tuck-fold-sew-batch','undo','redo','pull-panel','pose-panel','step','line-spec','set-property','graphics-set','grade-pattern','pleat-guides','hardware-set','hardware-undo','hardware-redo','grade-run-activate','grade-run-restore','piece-variant-instance-activate','piece-variant-instance-restore','bindings-grade-regenerate','fabric-grade-envelope-store','fabric-grade-envelope-clear'].includes(data.op))runError=null
    stepsSinceSave+=data.op==='step'?Number(data.steps||1):0
    if(['edit','edit-batch','tuck-fold-sew-batch','undo','redo','reset','pull-panel','pose-panel','line-spec','set-property','graphics-set','grade-pattern','pleat-guides','hardware-set','hardware-undo','hardware-redo','bindings-grade-regenerate','fabric-grade-envelope-store','fabric-grade-envelope-clear'].includes(data.op)||stepsSinceSave>=30){
     const persisted=await save()
     // A native envelope is an authoritative garment constraint, not an
     // optional browser mirror. Never acknowledge its mutation as durable if
     // the source-linked project could not be written to disk.
     if((['fabric-grade-envelope-store','fabric-grade-envelope-clear'].includes(data.op)||
       ['edit','bindings-grade-regenerate'].includes(data.op)&&result.data?.fabricGradeEnvelope)&&!persisted.ok)
      throw Error('Native fabric envelope revision changed in memory but could not be saved; recover the last durable garment before continuing')
    }
   }
   if(runError&&data.op==='snapshot')return{ok:false,error:runError,data:{...current,avatar:data.avatar?current.avatar:null,running:false}}
   return result
  }finally{busy=false}},close(){running=false;loaded=false;metadataValidator.close();if(pending){const p=pending;pending=null;clearTimeout(p.timer);p.reject(new Error('Workspace closed'))}child?.kill();child=null},status(){
   return {loaded,busy,lastError,nativeProcessRunning:Boolean(child),
    gpuRequested:nativeGpuRequested,gpuSupported:nativeGpuSupported,gpuActive:nativeGpuActive,metadataValidatorRust:metadataValidator.active}
  }}
}
