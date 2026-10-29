import React,{useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Camera,CameraOff,Circle,Grip,Hand,Square,X} from 'lucide-react'
import {recognizeFabricPinch} from '../core/cameraFabricHandGesture.js'
import './CameraFabricHand.css'

// Ships with the signed Mac app. Frames, model and wasm all stay local.
const MODEL='/hand-tracking/models/hand_landmarker.task'
const WASM='/hand-tracking/wasm'
const BRIDGE=typeof window!=='undefined'&&window.location.port==='5486'?'http://127.0.0.1:5485':typeof window!=='undefined'&&window.location.port==='5386'?'http://127.0.0.1:5385':(import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL||'http://127.0.0.1:5193')
const emit=detail=>window.dispatchEvent(new CustomEvent('exo-clothcraft-camera-fabric-hand',{detail}))

const clamp=(value,min,max)=>Math.min(Math.max(value,min),Math.max(min,max))

export default function CameraFabricHand({onActivate,disabled=false,viewportRef}){
  const [open,setOpen]=useState(false)
  const [toolbarTarget,setToolbarTarget]=useState(null)
  const [status,setStatus]=useState('idle')
  const [message,setMessage]=useState('Pinch thumb and index finger over the garment to grab fabric.')
  const [pointer,setPointer]=useState(null)
  const [provider,setProvider]=useState('mediapipe')
  const [position,setPosition]=useState(null)
  const [recording,setRecording]=useState(false)
  const [captureError,setCaptureError]=useState('')
  const [captureNotice,setCaptureNotice]=useState('')
  const [recordingAvailable,setRecordingAvailable]=useState(typeof MediaRecorder!=='undefined')
  const panel=useRef(null),drag=useRef(null)
  const mounted=useRef(true)
  const video=useRef(null),active=useRef(false),tracker=useRef(null),stream=useRef(null)
  const recorder=useRef(null),recordedChunks=useRef([]),recordingFormat=useRef(''),recordingSession=useRef(0)
  const animation=useRef(null),lastFrame=useRef(-1),lastTime=useRef(0),pinched=useRef(false),processing=useRef(false),generation=useRef(0)
  const download=(blob,extension)=>{
    const url=URL.createObjectURL(blob)
    const anchor=document.createElement('a')
    anchor.href=url
    anchor.download=`exo-camera-${new Date().toISOString().replace(/[:.]/g,'-')}.${extension}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(()=>URL.revokeObjectURL(url),60000)
  }
  const stopRecording=()=>{
    const current=recorder.current
    if(current?.state==='recording')current.stop()
    else if(current?.state==='paused')current.stop()
    setRecording(false)
  }
  const photograph=()=>{
    const frame=video.current
    if(!active.current||!stream.current?.active||!frame||frame.readyState<2){setCaptureError('Camera frame unavailable.');return}
    try{
      const canvas=document.createElement('canvas')
      canvas.width=frame.videoWidth;canvas.height=frame.videoHeight
      const context=canvas.getContext('2d')
      if(!context||!canvas.width||!canvas.height)throw Error('Photo capture is unavailable.')
      context.translate(canvas.width,0);context.scale(-1,1)
      context.drawImage(frame,0,0)
      canvas.toBlob(blob=>{
        if(!blob){setCaptureError('Unable to save photo.');return}
        download(blob,'jpg')
        if(mounted.current)setCaptureNotice('Photo downloaded')
      },'image/jpeg',.94)
      setCaptureError('')
    }catch(error){setCaptureError(error.message||'Unable to capture photo.')}
  }
  const beginRecording=()=>{
    if(!active.current||!stream.current?.active){setCaptureError('Camera is unavailable.');return}
    if(typeof MediaRecorder==='undefined'){setCaptureError('Video recording is not supported in this browser.');setRecordingAvailable(false);return}
    const format=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4;codecs=avc1.42E01E','video/mp4'].find(value=>MediaRecorder.isTypeSupported?.(value))
    if(!format){setCaptureError('Video recording is unavailable in this browser.');setRecordingAvailable(false);return}
    try{
      const instance=new MediaRecorder(stream.current,{mimeType:format})
      const session=++recordingSession.current
      recordedChunks.current=[]
      recordingFormat.current=format
      instance.ondataavailable=event=>{if(event.data?.size&&recordingSession.current===session)recordedChunks.current.push(event.data)}
      instance.onerror=event=>{
        if(recordingSession.current!==session)return
        setCaptureError(event.error?.message||'Video recording failed.')
        setRecording(false)
      }
      instance.onstop=()=>{
        if(recordingSession.current!==session)return
        recorder.current=null
        const chunks=recordedChunks.current
        recordedChunks.current=[]
        if(mounted.current)setRecording(false)
        if(chunks.length){download(new Blob(chunks,{type:recordingFormat.current}),recordingFormat.current.startsWith('video/mp4')?'mp4':'webm');if(mounted.current)setCaptureNotice('Video downloaded')}
        else if(mounted.current)setCaptureError('No video was captured.')
      }
      instance.start(1000)
      recorder.current=instance
      setRecording(true);setCaptureError('');setCaptureNotice('')
    }catch(error){setCaptureError(error.message||'Could not start video recording.');setRecording(false)}
  }
  const release=()=>{pinched.current=false;emit({tracking:false,pinched:false})}
  const stop=()=>{
    generation.current++
    active.current=false
    stopRecording()
    if(animation.current!=null)cancelAnimationFrame(animation.current)
    animation.current=null
    release()
    if(stream.current){stream.current.getTracks().forEach(track=>track.stop());stream.current=null}
    if(video.current){video.current.pause();video.current.srcObject=null}
    tracker.current?.close?.();tracker.current=null
    setPointer(null);lastFrame.current=-1;lastTime.current=0
  }
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop()}},[])
  useEffect(()=>{
    // Prefer the 3D garment toolbar's slot immediately below Press. Standalone
    // ClothCraft uses its own left quick-toolbar slot as a safe fallback.
    const locate=()=>{
      const preferred=document.querySelector('.tool-rail [data-camera-hand-toolbar-slot="true"]')
      const fallback=document.querySelector('.cc-scene [data-camera-hand-toolbar-fallback-slot="true"]')
      const next=preferred||fallback||null
      setToolbarTarget(previous=>previous===next?previous:next)
    }
    locate()
    const observer=new MutationObserver(locate)
    observer.observe(document.body,{childList:true,subtree:true})
    return()=>observer.disconnect()
  },[])
  const start=async(chosen=provider)=>{
    if(active.current||disabled)return
    const session=++generation.current
    active.current=true
    setOpen(true);setStatus('loading');setMessage('Requesting camera and loading hand tracking…')
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera access requires localhost or a secure browser connection.')
      const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30}}})
      if(!active.current||generation.current!==session){acquired.getTracks().forEach(track=>track.stop());return}
      stream.current=acquired
      const element=video.current
      if(!element)throw Error('Camera preview did not mount.')
      element.srcObject=acquired
      await element.play()
      if(!active.current||generation.current!==session)return
      const factory=import.meta.env.DEV?window.__exoFabricHandTrackerFactory:null
      let detector
      if(chosen==='apple-vision'){
        const response=await fetch(`${BRIDGE}/vision/hand/status`)
        const status=await response.json()
        if(!response.ok||!status.available)throw Error('Apple Vision requires the local ClothCraft native Vision adapter. Relaunch the updated V2 app.')
      }else if(typeof factory==='function')detector=await factory()
      else{
        const mp=await import('@mediapipe/tasks-vision')
        const files=await mp.FilesetResolver.forVisionTasks(WASM)
        detector=await mp.HandLandmarker.createFromOptions(files,{
          baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'VIDEO',numHands:1,
          minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55,
        })
      }
      if(!active.current||generation.current!==session){detector?.close?.();return}
      tracker.current=detector
      onActivate?.()
      setStatus('ready');setMessage(`${chosen==='apple-vision'?'Apple Vision':'MediaPipe'} camera ready. Pinch on fabric, move to pull, open fingers to release.`)
      const appleCanvas=document.createElement('canvas')
      appleCanvas.width=320;appleCanvas.height=240
      const appleContext=appleCanvas.getContext('2d')
      const accept=landmarks=>{
        if(!active.current||generation.current!==session)return
        const observed=recognizeFabricPinch(landmarks,pinched.current)
        pinched.current=Boolean(observed?.pinched)
        setPointer(observed)
        emit(observed?{...observed,tracking:true}:{tracking:false,pinched:false})
      }
      const update=timestamp=>{
        if(!active.current||generation.current!==session)return
        animation.current=requestAnimationFrame(update)
        if(processing.current||!video.current||video.current.readyState<2||timestamp-lastTime.current<(chosen==='apple-vision'?125:65))return
        if(video.current.currentTime===lastFrame.current)return
        lastTime.current=timestamp;lastFrame.current=video.current.currentTime
        processing.current=true
        void (async()=>{
          try{
            if(chosen==='apple-vision'){
              appleContext.drawImage(video.current,0,0,appleCanvas.width,appleCanvas.height)
              const image=appleCanvas.toDataURL('image/jpeg',.62).split(',')[1]
              const response=await fetch(`${BRIDGE}/vision/hand`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image})})
              const result=await response.json()
              if(!response.ok||!result.ok)throw Error(result.error||'Apple Vision frame failed')
              accept(result.landmarks)
            }else accept(tracker.current.detectForVideo(video.current,performance.now())?.landmarks?.[0])
          }catch(error){
            if(active.current&&generation.current===session){stop();setStatus('error');setMessage(`Hand detection stopped: ${error.message}`)}
          }finally{processing.current=false}
        })()
      }
      animation.current=requestAnimationFrame(update)
    }catch(error){
      stop();setStatus('error')
      setMessage(error?.name==='NotAllowedError'?'Camera permission denied. Allow camera access in your Mac/browser settings and try again.':
        `Hand camera unavailable: ${error.message}`)
    }
  }
  const close=()=>{stop();setOpen(false);setStatus('idle');setCaptureError('');setCaptureNotice('')}
  // The preview is a movable tool window within the real 3D viewport. Hand
  // coordinates are always full-viewport coordinates, independent of this UI.
  useEffect(()=>{
    if(!open||!viewportRef?.current)return
    const container=viewportRef.current
    const measure=()=>{
      const bounds=container.getBoundingClientRect()
      const width=panel.current?.offsetWidth||285,height=panel.current?.offsetHeight||325
      setPosition(prior=>prior
        ?{x:clamp(prior.x,8,bounds.width-width-8),y:clamp(prior.y,8,bounds.height-height-8)}
        :{x:clamp(bounds.width-width-14,8,bounds.width-width-8),y:clamp(bounds.height-height-14,8,bounds.height-height-8)})
    }
    measure()
    const resize=new ResizeObserver(measure)
    resize.observe(container)
    return()=>resize.disconnect()
  },[open,viewportRef])
  const startDrag=event=>{
    if(event.button!==0||event.target.closest('button,select,label'))return
    const container=viewportRef?.current
    if(!container||!panel.current)return
    const rect=container.getBoundingClientRect(),current=panel.current.getBoundingClientRect()
    drag.current={pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,
      x:current.left-rect.left,y:current.top-rect.top}
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
  const moveDrag=event=>{
    const grabbed=drag.current
    if(!grabbed||grabbed.pointerId!==event.pointerId||!viewportRef?.current||!panel.current)return
    const rect=viewportRef.current.getBoundingClientRect()
    setPosition({x:clamp(grabbed.x+event.clientX-grabbed.clientX,8,rect.width-panel.current.offsetWidth-8),
      y:clamp(grabbed.y+event.clientY-grabbed.clientY,8,rect.height-panel.current.offsetHeight-8)})
  }
  const endDrag=event=>{
    if(drag.current?.pointerId!==event.pointerId)return
    drag.current=null
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const viewer=open&&<section ref={panel} className="cc-camera-hand-panel" aria-label="Camera Fabric Hand controls"
    data-camera-hand-state={status} data-draggable-camera-widget="true" style={position?{left:position.x,top:position.y}:undefined}>
      <div className="cc-camera-hand-heading" aria-label="Drag camera viewer"
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
        onPointerCancel={endDrag} onLostPointerCapture={event=>{if(drag.current?.pointerId===event.pointerId)drag.current=null}}>
        <Grip size={13} aria-hidden="true"/><strong>Hand camera</strong>
        <label><span>Tracker</span><select aria-label="Hand tracking provider" value={provider} onChange={event=>{const selected=event.target.value;stop();setProvider(selected);void start(selected)}}><option value="mediapipe">MediaPipe</option><option value="apple-vision">Apple Vision · Mac</option></select></label>
        <button type="button" aria-label="Close Camera Fabric Hand" onClick={close}><X size={14}/></button>
      </div>
      <div className="cc-camera-hand-feed">
        <video ref={video} muted autoPlay playsInline aria-label="Live hand tracking camera preview"/>
        {pointer&&<span className={`cc-camera-hand-point${pointer.pinched?' cc-camera-hand-grabbing':''}`} style={{left:`${pointer.x*100}%`,top:`${pointer.y*100}%`}}/>}
        {status!=='ready'&&<span className="cc-camera-hand-loading">{status==='loading'?'STARTING TRACKER':'CAMERA STOPPED'}</span>}
        {recording&&<span className="cc-camera-hand-recording-indicator"><Circle size={7} fill="currentColor"/> REC</span>}
      </div>
      <div className="cc-camera-hand-actions" aria-label="Camera captures">
        <button type="button" className="cc-camera-hand-shutter" aria-label="Take photo" title="Save photo as JPG" onClick={photograph} disabled={!stream.current?.active||status==='error'}><Camera size={18}/><span>Photo</span></button>
        <button type="button" className={`cc-camera-hand-video-button${recording?' is-recording':''}`} aria-label={recording?'Stop video recording':'Record video'} title={recording?'Stop recording and save video locally':'Record video locally (WebM or MP4)'} onClick={recording?stopRecording:beginRecording} disabled={!recording&&(!stream.current?.active||!recordingAvailable||status==='error')} aria-pressed={recording}>
          {recording?<Square size={16} fill="currentColor"/>:<Circle size={17} fill="currentColor"/>}<span>{recording?'Stop & save':'Record'}</span>
        </button>
      </div>
      <div className="cc-camera-hand-meta">
        <span className="cc-camera-hand-tracking-state" role="status">{pointer?.pinched?'Grabbing fabric':pointer?'Hand tracked':status==='loading'?'Starting hand tracking':status==='error'?'Camera unavailable':'Waiting for hand'}</span>
        {status==='error'&&<button type="button" onClick={()=>void start()}>Retry camera</button>}
        <button type="button" className="cc-camera-hand-stop" onClick={close}><CameraOff size={13}/> End camera</button>
      </div>
      {(captureError||captureNotice||status==='error')&&<p role="status" className={`cc-camera-hand-feedback${captureError||status==='error'?' is-error':''}`}>{captureError||captureNotice||message}</p>}
      {!recordingAvailable&&<p className="cc-camera-hand-feedback">Video recording is unavailable in this browser.</p>}
    </section>
  const trigger=<button type="button" className={`cc-camera-hand-launch${open?' active':''}`}
      title="Use webcam hand tracking to pull real simulated fabric" aria-label="Camera Fabric Hand"
      aria-pressed={open} disabled={disabled&&!open} onClick={()=>open?close():void start()}>
      <Camera size={16} aria-hidden="true"/><span className="cc-camera-hand-icon"><Hand size={8} aria-hidden="true"/></span>
    </button>
  return <>
    {toolbarTarget&&createPortal(trigger,toolbarTarget)}
    {viewer&&(viewportRef?.current?createPortal(viewer,viewportRef.current):viewer)}
  </>
}
