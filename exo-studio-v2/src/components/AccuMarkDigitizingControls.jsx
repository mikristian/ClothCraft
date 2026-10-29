import {useEffect,useId,useState} from 'react'
import {importAccuMarkDigitizedPiece} from '../core/accumarkDigitizing20261023.js'
import {traceAccuMarkPhotoSilhouette20261024} from '../core/accumarkPhotoDigitize20261024.js'
import './AccuMarkDigitizingControls.css'

const defaultPoints='0, 0\n200, 0\n200, 100\n0, 100'
function parsePoint(line,label){
  const values=line.trim().split(/[\s,;]+/)
  if(values.length!==2||values.some(v=>v===''||!Number.isFinite(Number(v))))throw Error(`${label} must contain exactly two finite X, Y numbers.`)
  return {x:Number(values[0]),y:Number(values[1])}
}
function parsePolygon(value){
  const rows=value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
  if(rows.length<3)throw Error('Enter at least three ordered contour points.')
  if(rows.length>4097)throw Error('Contour exceeds the 4096-point limit.')
  return rows.map((row,index)=>parsePoint(row,`Point ${index+1}`))
}
function numeric(value,label,{min=0,max=Infinity,integer=false}={}){
  if(!value.trim()||!Number.isFinite(Number(value))||Number(value)<min||Number(value)>max||(integer&&!Number.isSafeInteger(Number(value))))throw Error(`${label} must be a valid number${integer?' (whole number)':''} between ${min} and ${max===Infinity?'the supported maximum':max}.`)
  return Number(value)
}
/** Standalone manually traced polygon import: onImport receives the entire
 * {project,piece,validation,warnings} result from the digitizing kernel.
 */
export default function AccuMarkDigitizingControls({project,onImport,disabled=false}){
  const formId=useId()
  const [id,setId]=useState('')
  const [name,setName]=useState('')
  const [observed,setObserved]=useState(defaultPoints)
  const [anchorA,setAnchorA]=useState('0, 0')
  const [anchorB,setAnchorB]=useState('200, 0')
  const [distance,setDistance]=useState('20')
  const [units,setUnits]=useState('pixels')
  const [flipY,setFlipY]=useState(false)
  const [winding,setWinding]=useState('ccw')
  const [quantity,setQuantity]=useState('1')
  const [allowance,setAllowance]=useState('0')
  const [error,setError]=useState('')
  const [warnings,setWarnings]=useState([])
  const [success,setSuccess]=useState('')
  const [photoThreshold,setPhotoThreshold]=useState(120)
  const [photoForeground,setPhotoForeground]=useState('dark')
  const [photoPreview,setPhotoPreview]=useState(null)
  const [photoResult,setPhotoResult]=useState(null)
  useEffect(()=>()=>{if(photoPreview)URL.revokeObjectURL(photoPreview)},[photoPreview])
  const locked=disabled||!project||typeof onImport!=='function'
  async function loadPhoto(event){
    const file=event.target.files?.[0];event.target.value=''
    if(!file)return
    setError('');setPhotoResult(null);setSuccess('');setObserved('')
    if(file.size>8*1024*1024||!/^image\/(png|jpeg|webp)$/.test(file.type)) {setError('Select a PNG, JPEG or WebP image under 8 MB');return}
    setPhotoPreview(URL.createObjectURL(file))
  }
  async function tracePhoto(){
    if(!photoPreview||locked)return
    setError('');setSuccess('');setPhotoResult(null)
    try{
      const img=new Image()
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not decode image'));img.src=photoPreview})
      const scale=Math.min(1,Math.sqrt(800000/(img.naturalWidth*img.naturalHeight)))
      const width=Math.round(img.naturalWidth*scale),height=Math.round(img.naturalHeight*scale)
      if(width<10||height<10)throw Error('Image is too small')
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
      const ctx=canvas.getContext('2d',{willReadFrequently:true})
      if(!ctx)throw Error('Image pixel buffer unavailable')
      ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height)
      const data=ctx.getImageData(0,0,width,height)
      const result=traceAccuMarkPhotoSilhouette20261024({
        rgba:data.data,width,height,threshold:photoThreshold,foreground:photoForeground,
        simplifyTolerancePx:.75,maxPoints:512,minPixels:50})
      if(!result.ok)throw Error(result.reason)
      setObserved(result.observedPoints.map(p=>`${p.x}, ${p.y}`).join('\n'))
      setUnits('pixels');setFlipY(true);setWinding('either')
      const b=result.pixelBounds
      setAnchorA(`${b.xMin}, ${b.yMin}`);setAnchorB(`${b.xMax}, ${b.yMin}`)
      setPhotoResult(result)
      setSuccess(`Found ${result.outlinePoints} contour points from ${width} × ${height} px. IMPORTANT: enter the REAL physical distance for calibration. Auto tracing does not recover notches, sewing contours, folds or allowances.`)
    }catch(error){setError(error.message||'Photo trace failed')}
  }
  function submit(event){
    event.preventDefault()
    setError('');setWarnings([]);setSuccess('')
    if(locked)return
    try{
      const physicalDistanceCm=numeric(distance,'Physical reference distance',{min:0.00000001,max:100000})
      const result=importAccuMarkDigitizedPiece(project,{
        id:id.trim(),name:name.trim(),observedPoints:parsePolygon(observed),
        calibration:{anchors:[parsePoint(anchorA,'Anchor A'),parsePoint(anchorB,'Anchor B')],sourceUnits:units,physicalDistanceCm,flipY},
        winding,closed:true,cutQuantity:numeric(quantity,'Cut quantity',{min:1,max:100,integer:true}),
        seamAllowanceCm:numeric(allowance,'Seam allowance',{min:0,max:20}),
      })
      setWarnings(result.warnings||[])
      onImport(result)
      setSuccess(`Imported ${result.piece.name} with ${result.piece.points.length} contour points in centimeters.`)
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause))}
  }
  return <form className="accumark-digitizing" onSubmit={submit} aria-labelledby={formId+'-title'}>
    <h3 id={formId+'-title'}>Pattern digitizing · photo silhouette or manual contour</h3>
    <fieldset disabled={locked}><legend>Photo to vector contour · source inspection</legend>
      <p className="accumark-digitizing__hint">Use one flat pattern on a uniformly contrasting background. Avoid shadows, perspective, rulers crossing the piece, and folded fabric. Your reference distance must be independently measured.</p>
      <input aria-label="Pattern image for tracing" type="file" accept="image/png,image/jpeg,image/webp" onChange={loadPhoto}/>
      {photoPreview&&<img alt="Uploaded photo pattern reference" src={photoPreview} style={{display:'block',maxWidth:'100%',maxHeight:190,objectFit:'contain'}}/>}
      <div className="accumark-digitizing__grid">
        <label>Foreground<select value={photoForeground} onChange={e=>{setPhotoForeground(e.target.value);setPhotoResult(null);setObserved('')}}><option value="dark">Dark on light background</option><option value="light">Light on dark background</option></select></label>
        <label>Brightness threshold <input aria-label="Photo digitizing threshold" type="number" min="10" max="245" value={photoThreshold} onChange={e=>{setPhotoThreshold(Number(e.target.value));setPhotoResult(null);setObserved('')}}/></label>
      </div>
      <button type="button" onClick={tracePhoto} disabled={!photoPreview}>Trace image contour into points</button>
      {photoResult&&<p role="status" className="accumark-digitizing__hint">{photoResult.outlinePoints} points · estimated raster silhouette area change {(photoResult.areaChangeRatio*100).toFixed(2)}% · unapproved source. Confirm anchors A/B and real distance below.</p>}
    </fieldset>
    <p className="accumark-digitizing__hint">Enter observed X, Y coordinates in perimeter order. This form transforms supplied points into centimeter geometry. It does not extract points from images.</p>
    <fieldset disabled={locked}><legend>Pattern identity</legend>
      <div className="accumark-digitizing__grid">
        <label htmlFor={formId+'-id'}>Unique piece ID<input id={formId+'-id'} value={id} onChange={e=>setId(e.target.value)} placeholder="front-panel" required/></label>
        <label htmlFor={formId+'-name'}>Piece name<input id={formId+'-name'} value={name} onChange={e=>setName(e.target.value)} placeholder="Front panel" required/></label>
        <label htmlFor={formId+'-quantity'}>Cut quantity<input id={formId+'-quantity'} type="number" min="1" max="100" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} required/></label>
        <label htmlFor={formId+'-allowance'}>Seam allowance (cm)<input id={formId+'-allowance'} type="number" min="0" max="20" step="any" value={allowance} onChange={e=>setAllowance(e.target.value)} required/></label>
      </div>
    </fieldset>
    <fieldset disabled={locked}><legend>Observed polygon</legend>
      <label htmlFor={formId+'-points'}>Ordered X, Y coordinates (one point per line)<textarea id={formId+'-points'} rows={7} spellCheck={false} value={observed} onChange={e=>setObserved(e.target.value)} aria-describedby={formId+'-points-help'} required/></label>
      <p id={formId+'-points-help'} className="accumark-digitizing__hint">The final edge closes automatically. An exact repeat of the first point at the end is also accepted. Do not repeat intermediate vertices.</p>
    </fieldset>
    <fieldset disabled={locked}><legend>Physical calibration</legend>
      <div className="accumark-digitizing__grid">
        <label htmlFor={formId+'-a'}>Anchor A: observed X, Y<input id={formId+'-a'} value={anchorA} onChange={e=>setAnchorA(e.target.value)} required/></label>
        <label htmlFor={formId+'-b'}>Anchor B: observed X, Y<input id={formId+'-b'} value={anchorB} onChange={e=>setAnchorB(e.target.value)} required/></label>
        <label htmlFor={formId+'-distance'}>Distance A to B (cm)<input id={formId+'-distance'} type="number" min="0.00000001" max="100000" step="any" value={distance} onChange={e=>setDistance(e.target.value)} required/></label>
        <label htmlFor={formId+'-units'}>Source units<select id={formId+'-units'} value={units} onChange={e=>setUnits(e.target.value)}><option value="pixels">Pixels</option><option value="mm">Millimeters</option><option value="cm">Centimeters</option></select></label>
        <label htmlFor={formId+'-winding'}>Required winding<select id={formId+'-winding'} value={winding} onChange={e=>setWinding(e.target.value)}><option value="ccw">Counterclockwise</option><option value="cw">Clockwise</option><option value="either">Either (retain observed order)</option></select></label>
      </div>
      <label className="accumark-digitizing__check"><input type="checkbox" checked={flipY} onChange={e=>setFlipY(e.target.checked)}/> Flip observed Y axis (image coordinates)</label>
    </fieldset>
    {error&&<p className="accumark-digitizing__error" role="alert">{error}</p>}
    {warnings.length>0&&<div className="accumark-digitizing__warnings" role="status"><strong>Import warnings</strong><ul>{warnings.map((warning,i)=><li key={i}>{warning.detail||warning.code}</li>)}</ul></div>}
    {success&&<p className="accumark-digitizing__success" role="status">{success}</p>}
    <button type="submit" disabled={locked}>Import traced piece</button>
  </form>
}
