import React, { useMemo, useRef, useState } from 'react'
import { createTechPackDraft, updateTechPackDraft, createTechPackRevision, addTechPackComment, addTechPackSample, diffTechPackVersions } from '../core/digitalTechPack.js'
import { buildTechPack } from '../core/measurements.js'
import './DigitalTechPackStudio.css'

const TABS = [['overview','Overview'],['measurements','Measurements'],['materials','Materials & BOM'],['references','References'],['samples','Sampling'],['comments','Comments'],['versions','Versions'],['releases','Factory releases']]
const FIELDS = [['sku','Style number'],['season','Season'],['brand','Brand'],['factory','Factory'],['colorwayNotes','Colorways'],['technicalNotes','Construction instructions'],['labelNotes','Labels & care'],['packagingNotes','Packaging'],['trims','Trims & hardware'],['bomNotes','BOM notes']]
const uid = () => globalThis.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(36).slice(2)}`
const now = () => new Date().toISOString()
const SAFE_IMAGE = /^data:image\/(?:png|jpeg|webp);base64,(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/
const safeImage = (src) => typeof src === 'string' && src.length <= 350000 && SAFE_IMAGE.test(src) ? src : null
const REF_CATEGORIES = ['moodboard','mockup','fit','construction','trim','graphic','pattern']
const captureSource = (project, state) => ({ ...state, source: buildTechPack(project) })
async function compressImage(file) {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1100 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.75, 0.55, 0.38]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      if (dataUrl.length < 250000) return dataUrl
    }
    throw new Error('Image could not be compressed below 250 KB.')
  } finally { bitmap.close() }
}
const download = (name, data) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function DigitalTechPackStudio({ project, value, onChange, onClose, onPrint, onExport, onExportHTML, printableHTML = '', initialTab = 'overview', profileName = 'Designer', onOpenSharing, sharingAvailable = false, nativeMode = false }) {
  const [experience, setExperience] = useState(initialTab === 'traditional' ? 'traditional' : initialTab === 'references' ? 'board' : 'digital')
  const [tab, setTab] = useState(TABS.some(([id]) => id === initialTab) ? initialTab : 'overview')
  const [comment, setComment] = useState('')
  const [anchor, setAnchor] = useState('overview')
  const [compare, setCompare] = useState('')
  const [sampleName, setSampleName] = useState('')
  const [sampleStatus, setSampleStatus] = useState('Requested')
  const [sampleMeasurements, setSampleMeasurements] = useState('')
  const [referenceCaption, setReferenceCaption] = useState('')
  const [referenceCategory, setReferenceCategory] = useState('moodboard')
  const [activeReference, setActiveReference] = useState('')
  const [annotationLabel, setAnnotationLabel] = useState('')
  const [referenceNote, setReferenceNote] = useState('')
  const [referencePattern, setReferencePattern] = useState('')
  const fileRef = useRef(null)
  const state = useMemo(() => createTechPackDraft(project, value), [project, value])
  const draft = state.draft
  const spec = state.source
  const change = (patch) => onChange?.(updateTechPackDraft(state, patch))
  const field = (key, val) => change({ [key]: val })
  const validNumber = (raw, min, max, allowEmpty = false) => {
    if (raw === '' && allowEmpty) return null
    const number = Number(raw)
    return raw.trim() !== '' && Number.isFinite(number) && number >= min && number <= max ? number : undefined
  }
  const updatePOM = (size, id, key, raw) => {
    const number = validNumber(raw, key === 'cm' ? 0.01 : 0, key === 'cm' ? 10000 : 100)
    if (number === undefined) return
    change({ pom: { ...draft.pom, [size]: (draft.pom[size] || []).map(m => m.id === id ? { ...m, [key]:number } : m) } })
  }
  const updatePOMTolerance = (id, raw) => {
    const tolerance = validNumber(raw, 0, 100)
    if (tolerance === undefined) return
    change({pom:Object.fromEntries(Object.entries(draft.pom||{}).map(([size,rows])=>[
      size,rows.map(row=>row.id===id?{...row,toleranceCm:tolerance}:row),
    ]))})
  }
  const updateBOM = (id, key, raw) => {
    const next = ['quantity','cost'].includes(key) ? validNumber(raw, 0, 100000000, true) : raw
    if (next === undefined) return
    change({ bom: (draft.bom || []).map(m => m.id === id ? { ...m, [key]:next } : m) })
  }
  const entries = (key) => state[key] || []
  const edit = (key, id, patch) => onChange?.({ ...state, [key]: entries(key).map(item => item.id === id ? { ...item, ...patch } : item) })
  const revisions = entries('revisions')
  const releases = revisions.filter(r => r.manufacturerId)
  const selected = revisions.find(v => v.id === compare)
  const saveVersion = () => onChange?.(createTechPackRevision(captureSource(project, state), { label: `Draft ${revisions.length + 1}`, author: profileName }))
  const syncGarment = () => {
    if (!window.confirm('Refresh draft measurements and materials from the current garment? Existing draft values in these sections will be replaced.')) return
    const source = buildTechPack(project)
    onChange?.(updateTechPackDraft({ ...state, source }, {
      pom: source.sizeMeasurements,
      bom: source.materials.map(m => ({ id:m.id, description:m.name, color:m.color, gsm:m.gsm, quantity:null, unit:'', supplier:'', cost:null })),
    }))
  }
  const createRelease = () => {
    if (!draft.factory?.trim()) { window.alert('Enter the manufacturer or factory name in Overview before creating a factory release.'); setTab('overview'); return }
    if (!window.confirm('Create a fixed local manufacturer release snapshot? This does not send it to the factory.')) return
    onChange?.(createTechPackRevision(captureSource(project, state), { label: `R${String(releases.length + 1).padStart(2,'0')}`, manufacturerId: draft.factory.trim(), author: profileName }))
  }
  const handleImages = async (event) => {
    const files = [...(event.target.files || [])]
    const images = []
    for (const file of files) {
      if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { window.alert(`Only PNG, JPEG or WebP images under 2 MB are supported: ${file.name}`); continue }
      try {
        const dataUrl = await compressImage(file)
        images.push({ id: uid(), name: file.name, caption: referenceCaption, category: referenceCategory, dataUrl, annotations: [], comments: [], createdAt: now() })
      } catch (error) { window.alert(`Could not add ${file.name}: ${error.message}`) }
    }
    if (images.length) {
      if ((draft.references || []).length + images.length > 35) { window.alert('Reference board limit is 35 images per pack.'); return }
      change({ references: [...(draft.references || []), ...images] })
    }
    event.target.value = ''
  }
  const print = (revisionId) => { if (onPrint) onPrint(revisionId); else window.print() }
  const exportPack = () => { if (onExport) onExport(); else download(`${draft.sku || project?.name || 'garment'}-techpack.json`, state) }
  const sizes = Object.keys(draft.pom || {})
  const pom = draft.pom?.[sizes[0]] || []
  const sourceRevision = spec?.project?.revision
  const currentRevision = project?.revision
  const references = (draft.references || []).filter(r => safeImage(r.dataUrl))
  const pickedReference = references.find(r => r.id === activeReference) || references[0]
  const editReference = (id, patch) => change({ references: (draft.references || []).map(r => r.id === id ? { ...r, ...patch } : r) })
  const pinImage = (event) => {
    if (!pickedReference || !annotationLabel.trim()) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
    editReference(pickedReference.id, { annotations: [...(pickedReference.annotations || []), { id: uid(), x, y, text: annotationLabel.trim().slice(0,180), patternId: referencePattern.trim() || null, createdAt: now() }] })
    setAnnotationLabel('')
  }
  const addReferenceComment = () => {
    if (!pickedReference || !referenceNote.trim()) return
    editReference(pickedReference.id, { comments: [...(pickedReference.comments || []), { id: uid(), author: profileName, body: referenceNote.trim(), createdAt: now() }] })
    setReferenceNote('')
  }
  const previewHTML = typeof printableHTML === 'string' && /<!doctype html|<html/i.test(printableHTML) ? printableHTML : ''
  return <div className="dtp" role="dialog" aria-modal="true" aria-label="Digital tech pack">
    <header className="dtp-top"><div className="dtp-brand"><span className="dtp-mark">CC</span><div><strong>TECH PACK STUDIO</strong><small>{project?.name || 'Untitled garment'} · Working draft</small></div></div><div className="dtp-actions">
      <span className="dtp-local">Local draft</span>
      {sharingAvailable && <button onClick={onOpenSharing}>Share workspace</button>}
      <button onClick={syncGarment}>Sync garment</button><button className="dtp-primary" onClick={saveVersion}>Save version</button><button className="dtp-primary" onClick={() => print()}>Print / Save PDF</button><button onClick={exportPack}>Download JSON</button><button className="dtp-close" onClick={onClose} aria-label="Close tech pack">×</button>
    </div></header>
    <div className="dtp-experiences" role="tablist" aria-label="Tech pack workspaces">{[['traditional','Traditional Tech Pack'],['digital','Digital Board'],['board','Reference Board']].map(([id,label]) => <button role="tab" aria-selected={experience === id} key={id} className={experience === id ? 'active' : ''} onClick={() => setExperience(id)}>{label}</button>)}</div>
    {experience === 'traditional' && <div className="dtp-paper-workspace"><div className="dtp-paper-toolbar"><div><strong>Traditional factory pack</strong><small>A4 print layout · {draft.sku || draft.styleName || project?.name || 'Untitled style'} · source revision {sourceRevision ?? 'unknown'} · {revisions.length} saved versions</small></div><div><button onClick={() => print()}>Print / Save PDF</button><button onClick={() => onExportHTML?.()} disabled={!onExportHTML}>Export HTML</button></div></div>{previewHTML ? <iframe title="Full traditional tech pack document" className="dtp-paper-frame" sandbox="allow-same-origin" srcDoc={previewHTML} /> : <div className="dtp-no-preview"><h2>Full document preview</h2><p>The printable document is being prepared from this pack's specifications. The print and HTML export actions use the same source.</p><button onClick={() => print()}>Open printable pack</button></div>}<p className="dtp-paper-note">Local working document. Not factory certified. Approve measured physical samples before production.</p></div>}
    {experience === 'board' && <div className="dtp-board"><div className="dtp-intro"><div><p className="dtp-eyebrow">PRODUCT DEVELOPMENT / REFERENCE BOARD</p><h1>Project references</h1><p>Fit, mood, trims, graphics, and pattern details with precise visual feedback.</p></div><span className="dtp-pill">{references.length} / 35 photos</span></div><div className="dtp-panel"><div className="dtp-inline"><input aria-label="Reference caption" value={referenceCaption} onChange={e => setReferenceCaption(e.target.value)} placeholder="Reference caption"/><select aria-label="Image category" value={referenceCategory} onChange={e => setReferenceCategory(e.target.value)}>{REF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select><button onClick={() => fileRef.current?.click()}>Upload references</button><input type="file" ref={fileRef} accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleImages}/></div><p className="dtp-hint">JPEG, PNG, WebP up to 2 MB each. Compressed before adding to this local project.</p><div className="dtp-board-layout"><div className="dtp-board-list">{references.map(r => <button key={r.id} className={pickedReference?.id === r.id ? 'chosen' : ''} onClick={() => setActiveReference(r.id)}><img src={safeImage(r.dataUrl)} alt=""/><span>{r.caption || r.name}<small>{r.category || 'moodboard'} · {(r.annotations || []).length} annotations</small></span></button>)}{!references.length && <p>Add an image to start the reference board.</p>}</div><div className="dtp-board-detail">{pickedReference && <><div className="dtp-board-detail-toolbar"><input aria-label="Edit reference caption" value={pickedReference.caption || ''} onChange={e => editReference(pickedReference.id,{caption:e.target.value})}/><select aria-label="Reference category" value={REF_CATEGORIES.includes(pickedReference.category) ? pickedReference.category : 'moodboard'} onChange={e => editReference(pickedReference.id,{category:e.target.value})}>{REF_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div><div className="dtp-board-canvas"><div className="dtp-annotatable" onClick={pinImage} title={annotationLabel.trim() ? 'Click to place annotation pin' : 'Enter callout text to place a pin'}><img src={safeImage(pickedReference.dataUrl)} alt={pickedReference.caption || pickedReference.name}/>{(pickedReference.annotations || []).map((a,i) => <span className="dtp-pin" key={a.id} style={{left:`${a.x*100}%`,top:`${a.y*100}%`}} title={a.text}>{i + 1}</span>)}</div></div><div className="dtp-inline"><input aria-label="New annotation text" value={annotationLabel} onChange={e => setAnnotationLabel(e.target.value)} placeholder="Write a callout, then click on the image"/><input aria-label="Related pattern ID optional" value={referencePattern} onChange={e => setReferencePattern(e.target.value)} placeholder="Pattern ID (optional)"/></div><div className="dtp-reference-buttons"><button aria-pressed={draft.technicalFlat?.referenceId === pickedReference.id} onClick={() => change({technicalFlat:{src:pickedReference.dataUrl,referenceId:pickedReference.id,caption:pickedReference.caption || pickedReference.name}})}>Set technical flat</button><button onClick={() => {change({references:(draft.references || []).filter(r => r.id !== pickedReference.id),technicalFlat:draft.technicalFlat?.referenceId === pickedReference.id ? null : draft.technicalFlat});setActiveReference('')}}>Remove image</button></div><div className="dtp-callouts">{(pickedReference.annotations || []).map((a,i) => <div key={a.id}><strong>#{i + 1} {a.patternId ? `· ${a.patternId}` : ''}</strong><span>{a.text}</span><button onClick={() => editReference(pickedReference.id,{annotations:(pickedReference.annotations || []).filter(v => v.id !== a.id)})}>Remove pin</button></div>)}</div><h3>Reference comments</h3>{(pickedReference.comments || []).map(c => <p key={c.id} className="dtp-board-comment"><strong>{c.author}</strong> {c.body}</p>)}<div className="dtp-inline"><input aria-label="Reference comment" placeholder="Add notes and feedback for this image" value={referenceNote} onChange={e => setReferenceNote(e.target.value)}/><button disabled={!referenceNote.trim()} onClick={addReferenceComment}>Comment</button></div></>}</div></div></div></div>}
    {experience === 'digital' && <div className="dtp-shell"><nav className="dtp-nav" aria-label="Tech pack sections">{TABS.map(([id,label]) => <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}</nav>
    <main className="dtp-main">
      {nativeMode&&<p className="dtp-hint" role="status">The Rust garment workspace is open. This tech pack uses the EXO draft source, not a verified live Rust garment snapshot. Verify the native garment measurements and physical sample before issuing a manufacturer release.</p>}
      <div className="dtp-intro"><div><p className="dtp-eyebrow">PRODUCT DEVELOPMENT / {tab.toUpperCase()}</p><h1>{TABS.find(x => x[0] === tab)?.[1]}</h1><p>Current garment revision {currentRevision ?? 'unspecified'} · Tech pack source {sourceRevision ?? 'unspecified'} · {sourceRevision === currentRevision ? 'In sync' : 'Source may need syncing'} · {profileName}</p></div><span className="dtp-pill">{releases.length} local releases</span></div>
      {tab === 'overview' && <div className="dtp-panel"><h2>Style information</h2><div className="dtp-form">{FIELDS.map(([key,label]) => <label key={key}>{label}{['technicalNotes','labelNotes','packagingNotes','trims','bomNotes'].includes(key) ? <textarea rows={3} value={draft[key] || ''} onChange={e => field(key,e.target.value)} placeholder="Add manufacturing instructions" /> : <input value={draft[key] || ''} onChange={e => field(key,e.target.value)} placeholder="Not specified" />}</label>)}</div></div>}
      {tab === 'measurements' && <div className="dtp-panel"><h2>Points of measure <small>cm · editable draft specifications</small></h2>{pom.length ? <div className="dtp-table-scroll"><table><thead><tr><th>Point of measure</th><th>Tolerance ± cm</th>{sizes.map(s => <th key={s}>{s} cm</th>)}</tr></thead><tbody>{pom.map(m => <tr key={m.id}><th>{m.label}</th><td><input className="dtp-cell-input" type="number" min="0" max="100" step="0.1" aria-label={`${m.label} tolerance cm`} value={m.toleranceCm ?? ''} onChange={e => updatePOMTolerance(m.id,e.target.value)} /></td>{sizes.map(s => { const row = draft.pom[s]?.find(x => x.id === m.id); return <td key={s}><input className="dtp-cell-input" type="number" min="0.01" max="10000" step="0.1" aria-label={`${m.label} ${s} cm`} value={row?.cm ?? ''} onChange={e => updatePOM(s,m.id,'cm',e.target.value)} /></td> })}</tr>)}</tbody></table></div> : <p>No garment measurements available yet.</p>}<p className="dtp-hint">Edits affect the draft specifications only. Garment geometry and original measurements are preserved.</p></div>}
      {tab === 'materials' && <div className="dtp-panel"><h2>Material bill of materials</h2><div className="dtp-table-scroll"><table><thead><tr><th>Material</th><th>Color</th><th>Weight (gsm)</th><th>Supplier</th><th>Quantity</th><th>Unit</th><th>Cost</th></tr></thead><tbody>{(draft.bom || []).map(m => <tr key={m.id}><th>{m.description || m.id}</th><td>{m.color || '—'}</td><td>{m.gsm ?? '—'}</td><td><input className="dtp-cell-input" aria-label={`${m.description || m.id} supplier`} value={m.supplier || ''} onChange={e => updateBOM(m.id,'supplier',e.target.value)} /></td><td><input className="dtp-cell-input" type="number" min="0" max="100000000" step="0.01" aria-label={`${m.description || m.id} quantity`} value={m.quantity ?? ''} onChange={e => updateBOM(m.id,'quantity',e.target.value)} /></td><td><input className="dtp-cell-input" aria-label={`${m.description || m.id} unit`} value={m.unit || ''} onChange={e => updateBOM(m.id,'unit',e.target.value)} /></td><td><input className="dtp-cell-input" type="number" min="0" max="100000000" step="0.01" aria-label={`${m.description || m.id} cost`} value={m.cost ?? ''} onChange={e => updateBOM(m.id,'cost',e.target.value)} /></td></tr>)}</tbody></table></div>{!draft.bom?.length && <p>No materials assigned.</p>}<label className="dtp-wide">BOM / supplier notes<textarea rows={5} value={draft.bomNotes || ''} onChange={e => field('bomNotes',e.target.value)} /></label></div>}
      {tab === 'references' && <div className="dtp-panel"><h2>Reference photography</h2><p>Upload photos, create image callouts and attach comments in the project reference board.</p><button onClick={() => setExperience('board')}>Open reference board ({references.length} photos)</button><div className="dtp-gallery">{references.map(r => <figure key={r.id}><img src={safeImage(r.dataUrl)} alt={r.caption || r.name}/><figcaption>{r.caption || r.name}</figcaption></figure>)}</div></div>}
      {tab === 'samples' && <div className="dtp-panel"><h2>Sample rounds</h2><div className="dtp-inline"><input aria-label="Sample round" placeholder="e.g. Proto sample 1" value={sampleName} onChange={e => setSampleName(e.target.value)}/><select aria-label="Sample status" value={sampleStatus} onChange={e => setSampleStatus(e.target.value)}>{['Requested','In progress','Received','Changes requested','Approved'].map(s => <option key={s}>{s}</option>)}</select><button disabled={!sampleName.trim()} onClick={() => { onChange?.(addTechPackSample(state,{ round: entries('samples').length + 1, name: sampleName.trim(), manufacturer: draft.factory || '', status: sampleStatus, measurements: [], notes: sampleMeasurements, author: profileName, versionId: revisions.at(-1)?.id || null })); setSampleName(''); setSampleMeasurements('') }}>Add round</button></div><label className="dtp-wide">Measurement observations / fit notes<textarea rows={3} value={sampleMeasurements} onChange={e => setSampleMeasurements(e.target.value)}/></label>{entries('samples').map(s => <article className="dtp-item" key={s.id}><div><strong>{s.name || `Round ${s.round}`}</strong><small>{s.createdAt?.slice(0,10)} · {s.author}</small></div><select aria-label={`Status for ${s.name || s.round}`} value={s.status} onChange={e => edit('samples',s.id,{status:e.target.value})}>{['Requested','In progress','Received','Changes requested','Approved'].map(status => <option key={status}>{status}</option>)}</select><textarea aria-label={`Notes for ${s.name || s.round}`} value={s.notes || ''} onChange={e => edit('samples',s.id,{notes:e.target.value})} placeholder="Actual measurements, tolerances and observations"/></article>)}</div>}
      {tab === 'comments' && <div className="dtp-panel"><h2>Section comments</h2><div className="dtp-inline"><select aria-label="Comment section" value={anchor} onChange={e => setAnchor(e.target.value)}>{TABS.filter(x => x[0] !== 'comments').map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select><input aria-label="New comment" placeholder="Ask a question or note a change" value={comment} onChange={e => setComment(e.target.value)}/><button disabled={!comment.trim()} onClick={() => { onChange?.(addTechPackComment(state,{anchor:{section:anchor,id:anchor,versionId:revisions.at(-1)?.id || 'working-draft'},body:comment.trim(),author:profileName})); setComment('') }}>Comment</button></div>{entries('comments').map(c => <article className="dtp-item" key={c.id}><div><strong>{c.author} · {TABS.find(x => x[0] === c.anchor?.section)?.[1] || c.anchor?.section}</strong><small>{c.createdAt?.slice(0,16).replace('T',' ')}</small><p>{c.body}</p></div><button onClick={() => edit('comments',c.id,{status:c.status === 'resolved' ? 'open':'resolved'})}>{c.status === 'resolved' ? 'Reopen' : 'Resolve'}</button></article>)}</div>}
      {tab === 'versions' && <div className="dtp-panel"><div className="dtp-section-head"><h2>Immutable draft snapshots</h2><button onClick={saveVersion}>Save version</button></div>{revisions.map(v => <article className="dtp-item" key={v.id}><div><strong>{v.label}</strong><small>{v.createdAt} · {v.author} · source {v.source?.project?.revision ?? '—'}</small></div><button onClick={() => setCompare(v.id)}>Compare with draft</button><button onClick={() => print(v.id)}>Print PDF</button></article>)}{!revisions.length && <p>No versions saved yet.</p>}</div>}
      {tab === 'releases' && <div className="dtp-panel"><div className="dtp-section-head"><h2>Manufacturer release archive</h2><button onClick={createRelease}>Create local release</button></div><p>Releases are fixed snapshots stored in this project. Download and send an approved export through your existing factory workflow. Creating a release does not share it online.</p>{releases.map(r => <article className="dtp-item" key={r.id}><div><strong>{r.label} · {r.manufacturerId || 'Factory unspecified'}</strong><small>{r.createdAt} · {r.author}</small></div><button onClick={() => setCompare(r.id)}>Compare</button><button onClick={() => print(r.id)}>Print PDF</button><button onClick={() => download(`${r.label}-techpack.json`,r)}>Download</button></article>)}</div>}
      {selected && <section className="dtp-panel dtp-compare"><div className="dtp-section-head"><h2>Compare {selected.label} with current draft</h2><button onClick={() => setCompare('')}>Close comparison</button></div><div className="dtp-diff">{diffTechPackVersions(selected,{draft}).map(change => <div key={change.path}><strong>{change.path}</strong><p><span>Saved:</span> {JSON.stringify(change.before) ?? '—'}</p><p><span>Current:</span> {JSON.stringify(change.after) ?? '—'}</p></div>)}</div><p className="dtp-hint">Each saved revision contains an independent copy of its measurements, materials, construction and references.</p></section>}
    </main></div>}
  </div>
}
