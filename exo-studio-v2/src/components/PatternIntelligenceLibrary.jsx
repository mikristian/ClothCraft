import React, {useEffect, useMemo, useState} from 'react'
import './PatternIntelligenceLibrary.css'

const normalize = value => String(value || '').toLowerCase().replaceAll(/[_-]/g, ' ')

export default function PatternIntelligenceLibrary({search = ''}) {
  const [snapshot, setSnapshot] = useState({status:'loading', files:[], pendingOpenPattern:0})
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const port = window.location.port
    const bridge = port === '5486' ? 'http://127.0.0.1:5485' : port === '5386' ? 'http://127.0.0.1:5385'
      : (import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL || 'http://127.0.0.1:5193')
    fetch(`${bridge}/pattern-intelligence/v1/catalog`, {signal:controller.signal, cache:'no-store'})
      .then(async response => {
        const data = await response.json()
        if (!response.ok || !data?.ok || !Array.isArray(data.files)) throw new Error(data?.error || 'Pattern library unavailable')
        setSnapshot({status:'ready', files:data.files, pendingOpenPattern:data.pendingOpenPattern || 0})
      })
      .catch(error => { if (!controller.signal.aborted) setSnapshot({status:'error',files:[],error:error.message}) })
    return () => controller.abort()
  }, [])

  const results = useMemo(() => {
    const words = normalize(search).trim().split(/\s+/).filter(Boolean)
    return snapshot.files.filter(file => {
      if (sourceFilter === 'upstream' && !['upstream_research_fixtures','github_original_references','openpattern_local_imports'].includes(file.collection)) return false
      if (sourceFilter === 'generated' && !file.collection.startsWith('generated_') && file.collection !== 'github_derived_garmentcode') return false
      const haystack = normalize([file.name,file.filename,file.relativePath,file.type,file.size,file.source].join(' '))
      return words.every(word => haystack.includes(word))
    })
  }, [snapshot.files, sourceFilter, search])
  const selected = results.find(file => file.id === selectedId) || null

  return <section className="exo-pattern-intelligence" aria-label="Search local DXF Pattern Intelligence library">
    <div className="exo-pi-heading"><strong>PATTERN INTELLIGENCE</strong><span>LOCAL · REFERENCE ONLY</span></div>
    {snapshot.status === 'loading' && <p role="status">Reading indexed DXF files…</p>}
    {snapshot.status === 'error' && <p role="status">Local Pattern Intelligence catalog is offline. Start the ClothCraft bridge and run the DXF library audit. {snapshot.error}</p>}
    {snapshot.status === 'ready' && <>
      <p className="exo-pi-intro">{snapshot.files.length} indexed DXF files · {snapshot.pendingOpenPattern} Open+Pattern downloads pending checkout</p>
      <label className="exo-pi-filter-label" htmlFor="exo-pi-source-filter">Pattern source</label>
      <select id="exo-pi-source-filter" value={sourceFilter} onChange={event => {setSourceFilter(event.target.value);setSelectedId(null)}}>
        <option value="all">All local DXF patterns</option>
        <option value="upstream">Original source fixtures</option>
        <option value="generated">Generated development blocks</option>
      </select>
      <p className="exo-pi-results">{results.length} match{results.length === 1 ? '' : 'es'} · Use the Library search field above to filter garments, sources and sizes.</p>
      <div className="exo-pi-list" role="list">
        {results.slice(0,45).map(file => <div role="listitem" key={file.id}>
          <button type="button" className={`exo-pi-entry ${selected?.id === file.id ? 'selected' : ''}`}
            aria-expanded={selected?.id === file.id} onClick={() => setSelectedId(prev => prev === file.id ? null : file.id)}>
            <strong>{file.name}</strong><small>{file.type}{file.size ? ` · ${file.size}` : ''}</small>
          </button>
          {selected?.id === file.id && <div className="exo-pi-detail">
            <p><b>Local file</b><code>{file.relativePath}</code></p>
            <p><b>Source</b> {file.source ? <a href={file.source} target="_blank" rel="noopener noreferrer">View originating repository</a> : 'Unknown'}</p>
            <p><b>Rights</b> {file.license}</p>
            {file.attribution && <p><b>Attribution</b> {file.attribution}</p>}
            {file.derivation && <p><b>Converted geometry</b> {file.derivation}</p>}
            <p><b>Geometry entities</b> {file.geometryEntityTags ?? 'Not measured'} · <b>Factory release</b> Blocked</p>
            <p className="exo-pi-usage">Open the local file through the normal Import garment action after reviewing CAD import semantics. The catalog never changes a pattern or authorizes cutting.</p>
          </div>}
        </div>)}
        {!results.length && <p className="exo-pi-empty">No indexed patterns match this search.</p>}
      </div>
      {results.length > 45 && <p className="exo-pi-overflow">Showing the first 45 matches. Refine the Library search to find specific patterns.</p>}
      <p className="exo-pi-disclaimer">Third-party research DXF fixture rights require review before training or redistribution. All files are unapproved development references.</p>
    </>}
  </section>
}
