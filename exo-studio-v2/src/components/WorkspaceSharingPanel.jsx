import React,{useEffect,useRef,useState} from 'react'
import {Check,ChevronDown,Copy,History,MessageCircle,Plus,RefreshCw,Send,Share2,ShieldCheck,UserRound,Users,X} from 'lucide-react'
import './WorkspaceSharingPanel.css'

const txt=v=>v==null?'':String(v)
const avatarText=name=>txt(name||'Designer').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'?'
const when=date=>date?new Date(date).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):''
const readableRole=role=>({owner:'Owner',editor:'Can edit',commenter:'Can comment',viewer:'Can view'})[role]||'Can view'
const isImage=value=>typeof value==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)

export function CollaboratorAvatar({person={},size='normal',online=false}){
  const name=person.displayName||person.name||person.profile?.displayName||'Designer'
  const avatar=person.avatarDataUrl||person.profile?.avatarDataUrl
  return <span className={`exo-collab-avatar ${size==='small'?'small':''} ${online?'online':''}`} title={`${name}${person.role?' · '+readableRole(person.role):''}`} aria-label={`${name}${online?' online':''}`}>
    {isImage(avatar)?<img src={avatar} alt=""/>:<span aria-hidden>{avatarText(name)}</span>}
  </span>
}

export function WorkspaceSharingHeader({collaboration={},profile={},onOpenSharing,onOpenProfile,onSaveProfile}){
  const [open,setOpen]=useState(false),[showPeople,setShowPeople]=useState(false),[name,setName]=useState(''),[notice,setNotice]=useState('')
  const chooser=useRef(null),root=useRef(null)
  const self={...profile,...collaboration.profile,avatarDataUrl:profile.avatarDataUrl||collaboration.profile?.avatarDataUrl}
  const online=(collaboration.presence||[]).filter(person=>person.online!==false)
  const people=online.filter(person=>person.id!==collaboration.profile?.userId)
  const projectMembers=(collaboration.members||[]).filter(person=>!people.some(onlinePerson=>onlinePerson.id===person.userId)&&person.userId!==collaboration.profile?.userId)
  const selfPresent=online.some(person=>person.id===collaboration.profile?.userId)
  useEffect(()=>setName(self.displayName||self.brandName||''),[self.displayName,self.brandName])
  useEffect(()=>{if(!open&&!showPeople)return;const close=e=>{if(e.key==='Escape'||(e.type==='pointerdown'&&!root.current?.contains(e.target))){setOpen(false);setShowPeople(false)}};document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close)}},[open,showPeople])
  const update=async payload=>{try{setNotice('');await onSaveProfile?.(payload);setNotice('Profile saved')}catch(error){setNotice(error.message||'Could not update profile')}}
  const chooseAvatar=async event=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1024*1024){setNotice('Choose a PNG, JPEG, or WebP smaller than 1 MB');return}
    const reader=new FileReader();reader.onerror=()=>setNotice('Image could not be read');reader.onload=()=>{
      const image=new Image()
      image.onerror=()=>setNotice('Image could not be decoded')
      image.onload=()=>{
        const scale=Math.min(1,256/Math.max(image.width,image.height)),canvas=document.createElement('canvas')
        canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale))
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height)
        const avatarDataUrl=canvas.toDataURL('image/jpeg',0.78)
        if(avatarDataUrl.length>180000){setNotice('Photo is too complex; choose a simpler photo');return}
        void update({displayName:name.trim()||self.displayName||'Designer',avatarDataUrl})
      }
      image.src=reader.result
    };reader.readAsDataURL(file)
  }
  return <div className="exo-collab-header" ref={root}>
    <button type="button" className="exo-collab-people-trigger" aria-label={`People in this project: ${online.length} online`} aria-expanded={showPeople} title={online.length?`${online.length} designer${online.length===1?'':'s'} here now`:'No teammates currently in the shared project'} onClick={()=>{setOpen(false);setShowPeople(value=>!value)}}>
      <span className="exo-collab-presence" aria-label="Collaborators currently present">
        {people.slice(0,4).map(person=><CollaboratorAvatar key={person.id||person.userId} person={person} size="small" online/>)}
        {people.length>4&&<span className="exo-collab-overflow">+{people.length-4}</span>}
      </span>
      {selfPresent&&<span className="exo-collab-online-count">{online.length} here</span>}
      {!selfPresent&&<Users size={15} aria-hidden/>}
    </button>
    <button type="button" className="exo-collab-share-button" aria-label="Open Sharing workspace" title="Share projects and review comments" onClick={onOpenSharing}><Share2 size={13}/><span>Share</span></button>
    <button type="button" className="exo-collab-profile-button" aria-label="Open designer profile" title="Designer profile & account" aria-expanded={open} onClick={()=>{setShowPeople(false);setOpen(value=>!value)}}><CollaboratorAvatar person={self} size="small" online={selfPresent}/><ChevronDown size={12}/></button>
    {showPeople&&<div className="exo-collab-people-menu" role="dialog" aria-label="People in this project">
      <strong>People in this project</strong>
      <small>{selfPresent?`${online.length} here now`:'Open a shared garment to see live collaborators'}</small>
      {selfPresent&&<div className="exo-collab-people-person"><CollaboratorAvatar person={self} online/><span>{self.displayName||'You'} <small>You · Online</small></span></div>}
      {people.map(person=><div className="exo-collab-people-person" key={person.id||person.userId}><CollaboratorAvatar person={person} online/><span>{person.displayName||'Designer'} <small>Online</small></span></div>)}
      {projectMembers.map(person=><div className="exo-collab-people-person offline" key={person.userId}><CollaboratorAvatar person={person.profile||person}/><span>{person.profile?.displayName||person.userId}<small>Offline · {readableRole(person.role)}</small></span></div>)}
      {!online.length&&!projectMembers.length&&<p>No collaborators currently in this garment.</p>}
      <button type="button" onClick={()=>{setShowPeople(false);onOpenSharing?.()}}>Manage people & access</button>
    </div>}
    {open&&<div className="exo-collab-profile-menu" role="dialog" aria-label="Designer profile">
      <div className="exo-collab-profile-heading"><CollaboratorAvatar person={self}/><div><strong>{self.displayName||self.brandName||'Designer'}</strong><small>{collaboration.online?'Collaboration connected':'Local profile'}</small></div><button aria-label="Close profile" type="button" onClick={()=>setOpen(false)}><X size={14}/></button></div>
      <form onSubmit={event=>{event.preventDefault();void update({displayName:name.trim()})}}>
        <label>Display name<input aria-label="Profile display name" value={name} maxLength={80} required onChange={event=>setName(event.target.value)}/></label>
        <input type="file" hidden ref={chooser} accept="image/png,image/jpeg,image/webp" onChange={chooseAvatar}/>
        <div className="exo-collab-profile-actions"><button type="button" onClick={()=>chooser.current?.click()}><UserRound size={13}/> Change photo</button><button type="submit"><Check size={13}/> Save</button></div>
      </form>
      {notice&&<small role="status">{notice}</small>}
      <button className="exo-collab-profile-link" type="button" onClick={()=>{setOpen(false);onOpenProfile?.()}}>Full profile & brand settings</button>
      <button className="exo-collab-profile-link" type="button" onClick={()=>{setOpen(false);onOpenSharing?.()}}>Shared projects & permissions</button>
    </div>}
  </div>
}

export default function WorkspaceSharingPanel({collaboration={},entries=[],collections=[],onAction,onRefresh,onOpenLibrary,onOpenProfile}){
  const [projectId,setProjectId]=useState(''),[mode,setMode]=useState('comments'),[email,setEmail]=useState(''),[permission,setPermission]=useState('editor'),[scope,setScope]=useState('project'),[collectionId,setCollectionId]=useState(''),[comment,setComment]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  const projects=entries.filter(item=>item?.id&&((item.category==='garment'||item.category==='pattern'||item.sharedProjectId||item.snapshotFormat)||(!item.category&&!item.sharedProjectId)))
  const selected=projectId||collaboration.selectedLocalId||''
  const chosen=projects.find(item=>item.id===selected)
  const remoteId=chosen?.sharedProjectId||collaboration.projects?.find(item=>`team:${item.id}`===selected)?.id
  const remote=collaboration.projects?.find(item=>item.id===remoteId)
  const member=collaboration.members?.find(item=>item.userId===collaboration.profile?.userId)
  const team=collaboration.teams?.find(item=>item.id===remote?.teamId)
  const role=remote?.ownerId===collaboration.profile?.userId?'owner':member?.role||remote?.roles?.[collaboration.profile?.userId]||team?.members?.[collaboration.profile?.userId]||'viewer'
  const canComment=collaboration.online&&Boolean(remote)&&['owner','editor','commenter'].includes(role)
  const canInvite=collaboration.online&&(!remote||role==='owner')
  const members=(collaboration.members||[]).filter(Boolean)
  const comments=(collaboration.comments||[]).filter(item=>item.targetId===selected)
  const history=collaboration.revisionHistory||[]
  useEffect(()=>{if(!projectId&&collaboration.selectedLocalId)setProjectId(collaboration.selectedLocalId)},[collaboration.selectedLocalId,projectId])
  const perform=async(action,payload,success)=>{
    setBusy(true);setError('');setMessage('')
    try{await onAction?.(action,payload);if(success)setMessage(success)}catch(e){setError(e.message||'Action failed')}finally{setBusy(false)}
  }
  const changeProject=async id=>{setProjectId(id);setComment('');setError('');if(id)await perform('project.select',{targetId:id})}
  const invite=async event=>{
    event.preventDefault()
    const targetId=scope==='library'?'library':scope==='collection'?collectionId:selected
    if(!targetId){setError('Choose a saved project or collection first');return}
    await perform('share.create',{targetType:scope,targetId,email:email.trim(),permission},'Invite created. Copy the one-time invitation token below.')
    setEmail('')
  }
  const post=async event=>{event.preventDefault();if(!selected||!comment.trim())return;await perform('comment.create',{targetId:selected,body:comment.trim()},'Comment posted');setComment('')}
  const shares=(collaboration.shares||[]).filter(item=>!item.revoked)
  return <section className="exo-sharing-panel" aria-label="Sharing workspace">
    <header className="exo-sharing-heading"><div><Share2 size={17}/><strong>Sharing</strong></div><button type="button" onClick={()=>void onRefresh?.()} aria-label="Refresh collaboration" title="Refresh shared projects"><RefreshCw size={14}/></button></header>
    <p className="exo-sharing-subheading">Projects, people & feedback</p>
    <div className="exo-sharing-connection"><span className={collaboration.online?'connected':''}/>{collaboration.online?'Team connection active':'Connect collaboration service'}</div>
    <label className="exo-sharing-label">Shared project
      <select aria-label="Choose shared project" value={selected} onChange={event=>void changeProject(event.target.value)}><option value="">Select saved project…</option>{projects.map(item=><option key={item.id} value={item.id}>{item.name||'Untitled'}</option>)}</select>
    </label>
    {!projects.length&&<p className="exo-sharing-help">Save your design in File Library to share it and collect comments.</p>}
    <button type="button" className="exo-sharing-secondary" onClick={onOpenLibrary}>Open File Library</button>
    {chosen&&<div className="exo-sharing-project-info"><strong>{chosen.name||'Garment'}</strong><small>{remote?`${readableRole(role)} · Shared revision ${remote.revision??0}`:'Personal project · Share to create a team copy'}</small></div>}
    <div className="exo-sharing-section-title"><Users size={14}/><span>Collaborators</span><small>{members.length||0}</small></div>
    {members.length?<div className="exo-sharing-members">{members.map(person=><div className="exo-sharing-member" key={person.userId}><CollaboratorAvatar person={person.profile||{displayName:person.displayName||person.userId}} online={person.online}/><div><strong>{person.profile?.displayName||person.displayName||person.userId}</strong><small>{readableRole(person.role)}{person.online?' · Online':''}</small></div></div>)}</div>:<p className="exo-sharing-help">Select a shared project to see collaborators and their photos.</p>}
    <form className="exo-sharing-invite" onSubmit={invite}>
      <div className="exo-sharing-section-title"><Plus size={14}/><span>Invite people</span></div>
      <label>Share access to<select aria-label="Share access scope" value={scope} onChange={event=>setScope(event.target.value)}><option value="project">Project</option><option value="collection">Collection</option><option value="library">Library</option></select></label>
      {scope==='collection'&&<select aria-label="Collection to share" value={collectionId} onChange={event=>setCollectionId(event.target.value)}><option value="">Select collection…</option>{collections.map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>}
      <input type="email" aria-label="Collaborator email" placeholder="designer@example.com" required value={email} onChange={event=>setEmail(event.target.value)}/>
      <label>Permission<select aria-label="Invitation permission" value={permission} onChange={event=>setPermission(event.target.value)}><option value="viewer">Can view · read only</option><option value="commenter">Can comment</option><option value="editor">Can edit</option></select></label>
      <button type="submit" disabled={busy||!canInvite||!email.trim()||(scope==='project'&&!selected)||(scope==='collection'&&!collectionId)}><Share2 size={13}/> Invite</button>
    </form>
    {collaboration.lastInviteToken&&<div className="exo-sharing-token"><small>One-time invitation token · no email sent</small><button type="button" onClick={()=>navigator.clipboard?.writeText(collaboration.lastInviteToken)}><Copy size={13}/> Copy invite token</button></div>}
    {!!shares.length&&<div className="exo-sharing-invites"><div className="exo-sharing-section-title"><ShieldCheck size={14}/><span>Access list</span></div>{shares.map(share=><div className="exo-sharing-access" key={share.id}><span title={share.email||''}>{share.email||'Designer'}</span><select aria-label={`Permission for ${share.email||share.id}`} value={share.permission} disabled={!collaboration.online||busy||share.revoked} onChange={event=>void perform('share.update',{shareId:share.id,permission:event.target.value},'Permissions updated')}><option value="viewer">View</option><option value="commenter">Comment</option><option value="editor">Edit</option></select><button type="button" aria-label={`Remove access for ${share.email||share.id}`} disabled={busy} onClick={()=>void perform('share.revoke',{shareId:share.id})}><X size={12}/></button></div>)}</div>}
    <div className="exo-sharing-modes" role="tablist" aria-label="Collaboration details"><button type="button" role="tab" aria-selected={mode==='comments'} className={mode==='comments'?'active':''} onClick={()=>setMode('comments')}><MessageCircle size={13}/> Comments</button><button type="button" role="tab" aria-selected={mode==='history'} className={mode==='history'?'active':''} onClick={()=>setMode('history')}><History size={13}/> Activity</button></div>
    {mode==='comments'?<section aria-label="Project comments" className="exo-sharing-thread"><div aria-live="polite" className="exo-sharing-messages">{comments.length?comments.map(item=><article key={item.id}><div className="exo-sharing-comment-author"><CollaboratorAvatar size="small" person={{displayName:item.authorName||item.authorId||'Designer',avatarDataUrl:item.avatarDataUrl}}/><span><strong>{item.authorName||'Designer'}</strong><small>{when(item.createdAt)}</small></span></div><p>{item.body||item.text}</p></article>):<p className="exo-sharing-help">No comments on this project yet.</p>}</div><form onSubmit={post}><textarea aria-label="Write project comment" rows={3} maxLength={4000} value={comment} onChange={event=>setComment(event.target.value)} placeholder={canComment?'Leave feedback on this garment…':'Select a shared project with comment access'} disabled={!canComment}/><button type="submit" disabled={!canComment||busy||!comment.trim()}><Send size={13}/> Comment</button></form></section>:
      <section className="exo-sharing-activity" aria-label="Project edit history">{history.length?history.map((entry,index)=><article key={entry.id||`${entry.revision}-${index}`}><CollaboratorAvatar size="small" person={entry.authorProfile||{displayName:entry.authorName||entry.authorId||'Designer'}}/><div><strong>{entry.authorProfile?.displayName||entry.authorName||entry.authorId||'Designer'}</strong><span>Saved revision {entry.revision}</span><small>{when(entry.createdAt)}</small></div></article>):<p className="exo-sharing-help">Saved shared revisions will appear here with the designer who published them.</p>}{(collaboration.activity||[]).slice(0,8).map((entry,index)=><article key={`activity-${index}`}><History size={14}/><div><span>{entry.description||entry.action||'Project update'}</span><small>{when(entry.createdAt)}</small></div></article>)}</section>}
    {error&&<p className="exo-sharing-error" role="alert">{error}</p>}{message&&<p className="exo-sharing-success" role="status">{message}</p>}
    <button type="button" className="exo-sharing-secondary" onClick={onOpenProfile}><UserRound size={13}/> Manage profile & teams</button>
  </section>
}
