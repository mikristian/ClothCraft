import React,{useMemo,useState} from 'react'
import master from '../../research/accumark-v10-playlist/ACCUMARK_MASTER_VERIFIED_COMMAND_CENSUS_20261024.json' with {type:'json'}
import {ACCUMARK_2D_UI_SUMMARY} from '../core/accumark2dCommandRegistry.js'

const catalog=master.records
const summary=master.summary

const states=[
  ['all','All audit statuses'],
  ['working','Fully verified vendor parity'],
  ['partial','Partial EXO equivalent'],
  ['missing','Explicitly missing'],
  ['unverified','Not verified'],
]
const appearance={working:'#197b4a',partial:'#b6730b',missing:'#bb3d40',unverified:'#747e90',reference:'#747e90'}
const groups=[...new Set(catalog.map(row=>row.group))].sort()

/** Source-linked, read-only *command-level* parity transparency, not a tool
 * router and not a vendor-licensed acceptance test.
 */
export default function AccuMarkCommandParityAudit20261024(){
 const [search,setSearch]=useState('')
 const [status,setStatus]=useState('all')
 const [group,setGroup]=useState('all')
 const [showReferences,setShowReferences]=useState(false)
 const [expandedAll,setExpandedAll]=useState(false)
 const [onlyScreenshots,setOnlyScreenshots]=useState(false)
 const [evidenceView,setEvidenceView]=useState('commands')
 const [selectedVideo,setSelectedVideo]=useState('')
 const [displayLimit,setDisplayLimit]=useState(80)
 const visible=useMemo(()=>{
  const q=search.trim().toLowerCase()
  return catalog.filter(row=>{
   if(row.kind==='reference'&&!showReferences)return false
   if(status!=='all'&&row.status!==status)return false
   if(group!=='all'&&row.group!==group)return false
   if(onlyScreenshots&&!row.officialScreenshotEvidence?.length)return false
   if(!q)return true
   return [row.id,row.label,row.group,row.status,row.limitation,row.exoCode,
     row.contracts?.map(x=>x.id).join(' ')].join(' ').toLowerCase().includes(q)
  })
 },[search,status,group,showReferences,onlyScreenshots])
 const displayed=visible.slice(0,displayLimit)
 const videos=master.videoFrameCorpus.videoItems
 const activeVideo=videos.find(video=>video.videoId===selectedVideo)||videos.find(video=>video.spriteSheets>0)
 const assetRoot='/audit-evidence/'
 const previewImage=filename=>filename?.split('/').at(-1)||''
 return <section data-accumark-command-parity-audit="true" aria-label="Individual Gerber AccuMark command parity audit"
   style={{display:'grid',gap:12,padding:'10px 12px 18px',fontSize:12}}>
   <header style={{display:'grid',gap:7}}>
    <strong style={{fontSize:14}}>GERBER ACCUMARK · MASTER HELP + FRAME COMMAND CENSUS</strong>
    <p>Every locally retrieved official-help topic is now indexed alongside the earlier function audit and the scraped screenshots. This is <strong>exhaustive for this captured source collection, not a certified exhaustive listing of licensed AccuMark V2026.1</strong>. Screenshots establish visible UI, not command execution or EXO parity.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(70px,1fr))',gap:6}}>
      {[['Partial',summary.counts.partial||0],['Missing',summary.counts.missing||0],['Unverified',summary.counts.unverified||0],['Fully verified',summary.counts.working||0]].map(([label,n])=>
        <div key={label} style={{border:'1px solid currentColor',padding:8,borderRadius:5,textAlign:'center'}}>
          <strong style={{fontSize:17}}>{n}</strong><div style={{fontSize:10}}>{label}</div>
        </div>)}
    </div>
    <p><strong>{summary.actionWorkflowRecords} named action/workflow records</strong> · {summary.informationalMenuReferenceRecords} menus/informational topics · <strong>{summary.officialHttpPageCount} official-help pages verified via HTTP</strong> · {summary.savedOfficialScreenshotFiles} official UI screenshots · {summary.scrapedPlaylistVideos} indexed videos · {summary.storyboardSheetFiles} captured video sprite sheets. EXO's {ACCUMARK_2D_UI_SUMMARY.total} engineering contracts ({ACCUMARK_2D_UI_SUMMARY.implemented} routed) remain a separate measure.</p>
    <p><strong>Status rule:</strong> Partial means a narrower EXO function has a real source and focused test, not vendor parity. Missing is an explicitly absent or blocked action. Unverified means related code or menu UI is insufficient evidence. Zero fully verified means no controlled licensed AccuMark comparative acceptance test was performed—it does not mean no EXO tools work.</p>
    <div role="group" aria-label="Choose command list or scraped evidence" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
     <button type="button" aria-pressed={evidenceView==='commands'} onClick={()=>setEvidenceView('commands')}>Verified-help command list</button>
     <button type="button" aria-pressed={evidenceView==='frames'} onClick={()=>setEvidenceView('frames')}>Scraped screenshots and video frames</button>
    </div>
   </header>
   {evidenceView==='frames'&&<div style={{display:'grid',gap:10}} data-accumark-scraped-frame-gallery="true">
     <strong>Actual captured evidence · original media available locally</strong>
     <p>We have {summary.videosWithCapturedStoryboards} videos with sampled storyboard frames, {summary.storyboardSheetFiles} sprite sheets and {summary.nominalSampledFrameSlots} nominal timestamp slots. Only {summary.reviewedVideoFrames} video frames were previously inspected individually. Most underlying video tiles are approximately 160×90, so <strong>no illegible menu labels have been inferred from these video captures</strong>.</p>
     <label>Video capture
       <select aria-label="Choose scanned AccuMark video" value={activeVideo?.videoId||''} onChange={e=>setSelectedVideo(e.target.value)} style={{width:'100%'}}>
         {videos.map(video=><option key={video.videoId} value={video.videoId}>{video.title} · {video.spriteSheets} sheets</option>)}
       </select>
     </label>
     {activeVideo&&<>
       <p>{activeVideo.frameSlotsInSourceManifest} sampled slots in source manifest · {activeVideo.spriteSheets} local sheet files. <a href={'https://www.youtube.com/watch?v='+encodeURIComponent(activeVideo.videoId)} target="_blank" rel="noopener noreferrer">Source video</a></p>
       {activeVideo.contactSheet&&<a href={assetRoot+'contact_sheets/'+previewImage(activeVideo.contactSheet)} target="_blank" rel="noopener noreferrer" title="Open full contact sheet"><img loading="lazy" alt={'Contact sheet '+activeVideo.title} src={assetRoot+'contact_sheets/'+previewImage(activeVideo.contactSheet)} style={{width:'100%',maxWidth:820,objectFit:'contain',borderRadius:4}}/></a>}
       <details><summary>View all {activeVideo.spriteSheets} sampled storyboard sheets</summary>
         <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:7}}>
          {Array.from({length:activeVideo.spriteSheets},(_,i)=>{
           const src=assetRoot+'storyboards/'+activeVideo.videoId+'/sprite-'+String(i).padStart(3,'0')+'.jpg'
           return <a key={i} href={src} target="_blank" rel="noopener noreferrer"><img loading="lazy" src={src} alt={activeVideo.title+' sprite sheet '+(i+1)} style={{width:'100%',objectFit:'contain'}}/></a>
          })}
         </div>
       </details>
     </>}
     <strong>Manually legible official interface screenshots</strong>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:9}}>
       {master.screenshotTextLedger.map(x=><details key={x.imagePath} style={{border:'1px solid currentColor',padding:6,borderRadius:5}}>
        <summary>{previewImage(x.imagePath)} · {x.labelsReadable.length} readable UI labels</summary>
        <a href={assetRoot+'official_ui/'+previewImage(x.imagePath)} target="_blank" rel="noopener noreferrer"><img loading="lazy" alt={'Official help UI '+previewImage(x.imagePath)} src={assetRoot+'official_ui/'+previewImage(x.imagePath)} style={{width:'100%',maxHeight:270,objectFit:'contain'}}/></a>
        <p>Legible: {x.labelsReadable.join(' · ')}</p>
       </details>)}
     </div>
     <strong>Individually reviewed tutorial frame captures</strong>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:8}}>
       {master.videoFrameCorpus.reviewedFrames.map(item=><details key={item.id} style={{border:'1px solid currentColor',padding:6,borderRadius:5}}>
         <summary>{item.video_id} at {item.timestamp_approx}</summary>
         <a href={assetRoot+'reviewed_frames/'+previewImage(item.frame_path)} target="_blank" rel="noopener noreferrer"><img loading="lazy" alt={item.observation} src={assetRoot+'reviewed_frames/'+previewImage(item.frame_path)} style={{width:'100%',objectFit:'contain'}}/></a>
         <p>{item.observation}. <strong>Limit:</strong> {item.limit}</p>
       </details>)}
     </div>
   </div>}
   {evidenceView==='commands'&&<>
   <div style={{display:'grid',gap:8}} role="group" aria-label="Filter individual AccuMark commands">
    <input aria-label="Search AccuMark command parity" type="search"
      placeholder="Search command, category, code, blocker…" value={search} onChange={e=>{setSearch(e.target.value);setDisplayLimit(80)}}
      style={{width:'100%',minWidth:0}}/>
    <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
      <label style={{flex:'1 1 150px'}}>Status
        <select aria-label="Audit status" value={status} onChange={e=>{setStatus(e.target.value);setDisplayLimit(80)}} style={{width:'100%'}}>
          {states.map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label style={{flex:'1 1 160px'}}>Category
        <select aria-label="Audit category" value={group} onChange={e=>{setGroup(e.target.value);setDisplayLimit(80)}} style={{width:'100%'}}>
          <option value="all">All vendor categories</option>
          {groups.map(id=><option key={id} value={id}>{id}</option>)}
        </select>
      </label>
    </div>
    <label><input type="checkbox" checked={showReferences} onChange={e=>{setShowReferences(e.target.checked);setDisplayLimit(80)}}/> Include {summary.informationalMenuReferenceRecords} menu/group/reference help pages</label>
    <label><input type="checkbox" checked={onlyScreenshots} onChange={e=>{setOnlyScreenshots(e.target.checked);setDisplayLimit(80)}}/> Only commands with original readable UI screenshot evidence</label>
    <label><input type="checkbox" checked={expandedAll} onChange={e=>setExpandedAll(e.target.checked)}/> Expand evidence for all visible commands</label>
   </div>
   <strong role="status">Showing {displayed.length} of {visible.length} matching source-linked audit records</strong>
   <div style={{display:'grid',gap:7}}>
    {displayed.map(row=><details key={row.id} open={expandedAll?true:undefined} style={{border:'1px solid currentColor',borderRadius:5,padding:'8px 10px'}}>
      <summary style={{cursor:'pointer',lineHeight:1.5}}>
        <strong>{row.label}</strong>
        <span style={{color:appearance[row.status]||'inherit',fontWeight:700}}> · {row.status.toUpperCase()}</span>
        <small style={{display:'block',opacity:.75}}>{row.id} · {row.group} · {row.kind}</small>
      </summary>
      <div style={{paddingTop:8,display:'grid',gap:6,overflowWrap:'anywhere'}}>
        <p><strong>What's incomplete or unverified:</strong> {row.limitation}</p>
        {row.exoCode?<p><strong>EXO code:</strong> <code>{row.exoCode}</code></p>:
          <p><strong>EXO code:</strong> No established command-level implementation path.</p>}
        {row.tests.length>0&&<p><strong>Related focused EXO test{row.tests.length===1?'':'s'}:</strong> {row.tests.join(' · ')}</p>}
        {row.contracts.length>0&&<p><strong>Existing EXO engineering contracts:</strong> {row.contracts.map(c=>c.id+' ('+c.route+(c.interfaceRouted?', routed':', reference')+')').join(' · ')}. Route presence is not functional proof.</p>}
        <p><strong>Official help URL fetched:</strong> {row.officialHttpChecked?'Yes, source page title confirmed':'Not confirmed in available crawl; use indexed source with caution'}</p>
        {row.officialScreenshotEvidence?.length>0&&<div><strong>Readable original interface screenshot:</strong>
          {row.officialScreenshotEvidence.map(src=><a key={src} href={assetRoot+'official_ui/'+previewImage(src)} target="_blank" rel="noopener noreferrer" style={{display:'block'}}>{previewImage(src)} <img loading="lazy" src={assetRoot+'official_ui/'+previewImage(src)} alt={'AccuMark screenshot for '+row.label} style={{width:'100%',maxWidth:500,objectFit:'contain'}}/></a>)}
        </div>}
        <p><a href={row.helpUrl} target="_blank" rel="noopener noreferrer">Read official Gerber/Lectra help for this function</a></p>
        <small>Source class: {row.sourceKind} · vendor version unspecified by source page · licensed vendor parity tested: no</small>
      </div>
    </details>)}
    {visible.length>displayed.length&&<button type="button" onClick={()=>setDisplayLimit(n=>n+80)}>Show next {Math.min(80,visible.length-displayed.length)} commands / help topics</button>}
    {visible.length===0&&<p role="status">No matching audited commands. Change the filters to see more.</p>}
   </div>
   </>}
   <p>Master JSON, sortable CSV and full screenshot-sourced Markdown report are saved locally under research/accumark-v10-playlist and docs/reports as <strong>ACCUMARK_MASTER_VERIFIED_COMMAND_CENSUS_20261024</strong>. This audit includes every successfully crawled page and captured frame source, but cannot certify that undocumented/dynamic V2026.1 features have been exhausted or behaviorally matched.</p>
 </section>
}
