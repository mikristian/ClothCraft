import React from 'react'
import {TECHPACK_THEMES} from '../core/techPackTemplatePresets.js'

// Declarative, inert sample artboards: the preview shows layout only. No
// garment measurements, fabric tests or approval statuses are invented.
export default function TechPackTemplatePreview({preset={},compact=false}){
  const theme=TECHPACK_THEMES.find(item=>item.id===preset.theme)||TECHPACK_THEMES[0]
  const color=preset.colors?.accent||preset.lineColor||theme.accent
  const wash=preset.colors?.wash||theme.wash
  const layout=preset.layout||'balanced'
  const type=preset.category||'pages'
  const id=preset.pageId||''
  const table=type==='tables'||['measurement-table','grading','construction-operations','pattern-cutlist','materials','packaging'].includes(id)||layout==='specification'
  const fabric=id==='fabrics'||layout==='gallery'
  const pattern=id==='patterns'||id==='flats'||id==='measurements'||layout==='illustration'
  const boxed=type==='boxes'
  const title=type==='headers'?'DOCUMENT HEADER':boxed?'FRAMED DETAIL':type==='tables'?'CUSTOM SPECIFICATION':
    id?String(preset.name||'').toUpperCase():'TECHNICAL SPECIFICATION'
  const rows=type==='tables'?Math.min(7,Math.max(3,preset.rows||4)):5
  return <div className={`tpws-template-preview-stage ${compact?'is-compact':''}`} data-template-preview={preset.id||preset.name}>
    <div className="tpws-template-preview-paper" style={{'--tpl-accent':color,'--tpl-wash':wash}} data-preview-header={preset.header||'seville'} data-preview-layout={layout}>
      <div className="tpws-template-preview-folio">01</div>
      <div className="tpws-template-preview-rule">
        <div className="tpws-template-preview-records"><span>STYLE NO.<b>EXO / SAMPLE</b></span><span>CATEGORY<b>GARMENT</b></span><span>FABRIC<b>REFERENCE</b></span><span>REV.<b>01</b></span></div>
        <div className="tpws-template-preview-heading"><strong>{title}</strong><small>DEVELOPMENT REFERENCE · LAYOUT PREVIEW</small></div>
        <div className="tpws-template-preview-content">
          {boxed?<div className="tpws-template-preview-box" style={{borderStyle:preset.border||'solid',borderColor:color}}><b>{preset.name||'DETAIL BOX'}</b><span>DETAIL / REFERENCE</span><i/><i/></div>:
          table?<div className="tpws-template-preview-table"><div className="tpws-template-preview-table-head">{(preset.headers||['ITEM / REF','SPECIFICATION','NOTES']).slice(0,6).map((item,i)=><b key={i}>{item}</b>)}</div>{Array.from({length:rows},(_,i)=><div className="tpws-template-preview-table-row" key={i}>{(preset.headers||['ITEM / REF','SPECIFICATION','NOTES']).slice(0,6).map((_,j)=><span key={j}><i style={{width:`${50+(i+j)%3*15}%`}}/></span>)}</div>)}</div>:
          fabric?<div className="tpws-template-preview-swatches">{[color,wash,'#bdc6ca','#d0cabf'].map((swatch,i)=><div key={i}><span style={{background:swatch}}/><b>FAB {String(i+1).padStart(2,'0')}</b><small>REFERENCE</small></div>)}</div>:
          pattern?<div className="tpws-template-preview-pattern"><svg viewBox="0 0 380 160" fill="none" aria-hidden="true"><path d="M64 27 L101 18 L122 34 L164 27 L188 118 L175 133 L145 123 L144 143 L41 143 L41 123 L18 133 L4 118 L24 29 L64 27 Z" stroke={color} strokeWidth="2"/><path d="M101 18 C104 44 123 44 122 34 M41 123 L144 123 M83 17 V145 M4 118 L188 118" stroke={color} strokeWidth="1" strokeDasharray="4 4" opacity=".5"/><path d="M220 34 L340 34 L347 143 L214 143 Z M218 128 L344 128" stroke={color} strokeWidth="2"/><path d="M280 34 V143" stroke={color} strokeWidth="1" strokeDasharray="4 4" opacity=".5"/></svg><div>FRONT / BACK · VECTOR REFERENCE</div></div>:
          <div className="tpws-template-preview-balanced"><div className="tpws-template-preview-drawing"><svg viewBox="0 0 130 128" fill="none" aria-hidden="true"><path d="M42 15 L54 7 L72 7 L85 15 L108 38 L94 55 L83 45 L85 117 L41 117 L43 45 L30 55 L17 38 Z" stroke={color} strokeWidth="2"/><path d="M54 7 Q63 28 72 7" stroke={color}/></svg></div><div className="tpws-template-preview-mini-table">{Array.from({length:6},(_,i)=><i key={i}/>)}</div></div>}
          {type==='headers'&&<div className="tpws-template-preview-header-detail">HEADER DESIGN ONLY · MEASUREMENTS UNCHANGED</div>}
        </div>
      </div>
      <div className="tpws-template-preview-footer"><strong>EXO TECHPACK</strong><span>WORKING TEMPLATE · NOT FACTORY APPROVED</span></div>
    </div>
  </div>
}
