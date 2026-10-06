'use client';
import {useState} from 'react';
import {toast} from 'sonner';
import {Archive,Eye,Megaphone,Pin,Plus,Send,Trash2,Vote} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Choice} from '../ui';
import {AudiencePicker,api,sastLocalToIso,isoToSastLocal,sastText,SAST,type Save,type Upload,type HubData} from './common';
import {audienceGuests,audienceText,inAudience,isLive,liveAt,type Audience} from '@/lib/hub';
import {uid,type Wedding,type RecordItem} from '@/lib/model';
const blank=():RecordItem=>({id:uid(),isNew:true,kind:'news',heading:'',message:'',media:'',mediaType:'',action:{label:'',url:''},audience:{mode:'all'},pinned:false,urgent:false,requireAck:false,status:'draft',publishAt:'',notify:true,version:1});
export default function UpdatesView({w,save,upload,hub,reloadHub,goto}:{w:Wedding;save:Save;upload:Upload;hub:HubData;reloadHub:()=>void;goto:(v:string)=>void}){
 const [edit,setEdit]=useState<RecordItem|null>(null),[poll,setPoll]=useState<RecordItem|null>(null);
 const stats=(u:RecordItem)=>{const guests=audienceGuests(w,u.audience),st=hub?.states||{};return {total:guests.length,opened:guests.filter(g=>st[g.id]?.opened?.[u.id]).length,acked:guests.filter(g=>st[g.id]?.acked?.[u.id]).length};};
 const statusLabel=(u:RecordItem)=>u.status==='archived'?'Archived':u.status==='draft'?'Draft':u.status==='scheduled'&&!isLive(u)?`Scheduled · ${sastText(u.publishAt)}`:'Published';
 async function persist(u:RecordItem,then?:'notify'){const {isNew,...clean}=u;const next={...w,updates:isNew?[...w.updates,clean]:w.updates.map(x=>x.id===u.id?clean:x)};if(!await save(next))return false;
  if(then==='notify'){try{const r=await api('/api/hub/outbox',{action:'notify-update',updateId:u.id});toast.success(r.created?'Messages prepared — open Messages to send them':'Messages for this update were already prepared');}catch(e:any){toast.error(e.message);}}return true;}
 const sorted=[...w.updates].sort((a,b)=>(liveAt(b)||b.createdAt||'').localeCompare(liveAt(a)||a.createdAt||''));
 return <Tabs defaultValue="updates"><TabsList><TabsTrigger value="updates">Updates</TabsTrigger><TabsTrigger value="polls">Quick polls</TabsTrigger></TabsList>
  <TabsContent value="updates">
   <div className="toolbar"><Button onClick={()=>setEdit(blank())}><Plus size={16}/> Write an update</Button><Button variant="outline" onClick={()=>setEdit({...blank(),kind:'thanks',heading:'Thank you',message:w.settings.thanksMessage||'Thank you for celebrating with us.'})}>Thank-you update</Button><Button variant="ghost" onClick={()=>goto('messages')}>Open Messages</Button></div>
   {!sorted.length&&<section className="panel empty"><Megaphone size={25}/><h2>Latest from Mienke &amp; Luvhan</h2><p>Share news, changes and thank-yous. Guests see what’s meant for them on their personal page.</p></section>}
   <div className="update-admin-list">{sorted.map(u=>{const s=stats(u);return <section className="panel update-admin" key={u.id}>
    <div className="panel-heading"><div><span className="eyebrow">{u.kind==='change'?'Change notice':u.kind==='thanks'?'Thank you':'Update'} · {statusLabel(u)}</span><h2>{u.pinned&&<Pin size={16}/>} {u.heading||'(No heading)'}</h2></div><div className="row-actions"><Button variant="outline" size="sm" onClick={()=>setEdit({...u,publishAt:u.publishAt||''})}>Edit</Button></div></div>
    <p className="preserve clamp">{u.message}</p>
    <div className="mini-stats"><span>{audienceText(w,u.audience)}</span>{isLive(u)&&<><span>Opened: {s.opened}/{s.total}</span>{u.requireAck&&<span>Confirmed “Got it”: {s.acked}/{s.total}</span>}</>}</div>
    <div className="toolbar">{isLive(u)&&u.status!=='archived'&&<Button variant="outline" size="sm" onClick={()=>persist(u,'notify')}><Send size={14}/> Prepare WhatsApp messages</Button>}
     <Button variant="ghost" size="sm" onClick={()=>persist({...u,pinned:!u.pinned})}><Pin size={14}/> {u.pinned?'Unpin':'Pin'}</Button>
     {u.status!=='archived'?<Button variant="ghost" size="sm" onClick={()=>persist({...u,status:'archived'}).then(ok=>ok&&toast.success('Archived — guests no longer see it'))}><Archive size={14}/> Archive</Button>:<Button variant="ghost" size="sm" onClick={()=>persist({...u,status:'published',publishedAt:u.publishedAt||new Date().toISOString()})}>Restore</Button>}
     {u.status==='draft'&&<Button variant="ghost" size="sm" onClick={async()=>{if(confirm('Delete this draft?')&&await save({...w,updates:w.updates.filter(x=>x.id!==u.id)}))toast.success('Draft deleted');}}><Trash2 size={14}/> Delete draft</Button>}</div>
    {u.requireAck&&isLive(u)&&s.acked<s.total&&<details className="small"><summary>Still to confirm ({s.total-s.acked})</summary><p>{audienceGuests(w,u.audience).filter(g=>!hub?.states?.[g.id]?.acked?.[u.id]).map(g=>g.name).join(', ')}</p></details>}
   </section>;})}</div>
  </TabsContent>
  <TabsContent value="polls">
   <div className="toolbar"><Button onClick={()=>setPoll({id:uid(),isNew:true,question:'',options:['',''],audience:{mode:'all'},status:'open'})}><Vote size={16}/> New poll</Button></div>
   {!w.polls.length&&<p className="muted">Ask quick questions, like a first-dance song vote or transport interest. Guests answer on their RSVP page.</p>}
   {w.polls.map(p=>{const guests=audienceGuests(w,p.audience),answers=guests.map(g=>hub?.states?.[g.id]?.polls?.[p.id]).filter(Boolean);return <section className="panel" key={p.id}><div className="panel-heading"><div><span className="eyebrow">{p.status==='open'?'Open':'Closed'} · {audienceText(w,p.audience)}</span><h2>{p.question}</h2></div><Button variant="outline" size="sm" onClick={()=>setPoll({...p})}>Edit</Button></div>
    {(p.options||[]).filter(Boolean).map((o:string)=>{const n=answers.filter(a=>a===o).length;return <div className="poll-result" key={o}><span>{o}</span><div className="bar"><i style={{width:`${answers.length?n/answers.length*100:0}%`}}/></div><strong>{n}</strong></div>;})}
    <p className="muted small">{answers.length} of {guests.length} answered.</p></section>;})}
  </TabsContent>
  <Dialog open={!!edit} onOpenChange={v=>!v&&setEdit(null)}><DialogContent className="edit-dialog">{edit&&<UpdateForm w={w} u={edit} setU={setEdit} upload={upload} onDone={async(u,mode)=>{
   const now=new Date().toISOString();let next:RecordItem={...u,updatedAt:now,createdAt:u.createdAt||now};
   if(mode==='draft')next={...next,status:'draft'};
   if(mode==='publish')next={...next,status:'published',publishedAt:u.status==='published'&&u.publishedAt?u.publishedAt:now,publishAt:''};
   if(mode==='schedule'){if(!u.publishAt||Date.parse(u.publishAt)<=Date.now()){toast.error('Choose a future publication time.');return;}next={...next,status:'scheduled'};}
   if(!next.heading.trim()){toast.error('Add a heading.');return;}
   const ok=await persist(next,mode==='publish'&&u.notify?'notify':undefined);if(ok){setEdit(null);reloadHub();toast.success(mode==='draft'?'Draft saved — guests can’t see it':mode==='schedule'?`Scheduled for ${sastText(next.publishAt)}`:'Published');}
  }}/>}</DialogContent></Dialog>
  <Dialog open={!!poll} onOpenChange={v=>!v&&setPoll(null)}><DialogContent className="edit-dialog">{poll&&<><DialogHeader><DialogTitle>{poll.isNew?'New poll':'Edit poll'}</DialogTitle><DialogDescription>Guests answer once and can change their answer while the poll is open.</DialogDescription></DialogHeader>
   <form className="edit-form" onSubmit={async e=>{e.preventDefault();const options=(poll.options||[]).map((o:string)=>o.trim()).filter(Boolean);if(!poll.question.trim()||options.length<2){toast.error('Add a question and at least two options.');return;}const {isNew,...p}:RecordItem={...poll,options};if(await save({...w,polls:isNew?[...w.polls,p]:w.polls.map(x=>x.id===p.id?p:x)})){setPoll(null);toast.success('Poll saved');}}}>
    <label>Question<input required value={poll.question} onChange={e=>setPoll({...poll,question:e.target.value})}/></label>
    {(poll.options||[]).map((o:string,i:number)=><label key={i}>Option {i+1}<input value={o} onChange={e=>setPoll({...poll,options:poll.options.map((x:string,j:number)=>j===i?e.target.value:x)})}/></label>)}
    <Button type="button" variant="outline" onClick={()=>setPoll({...poll,options:[...poll.options,'']})}>Add option</Button>
    <AudiencePicker w={w} value={poll.audience} onChange={a=>setPoll({...poll,audience:a})}/>
    <label>Status<Choice value={poll.status} options={[{value:'open',label:'Open'},{value:'closed',label:'Closed'}]} onChange={v=>setPoll({...poll,status:v})}/></label>
    <div className="toolbar"><Button type="submit">Save poll</Button>{!poll.isNew&&<Button type="button" variant="ghost" onClick={async()=>{if(confirm('Delete this poll and its answers?')&&await save({...w,polls:w.polls.filter(x=>x.id!==poll.id)}))setPoll(null);}}>Delete</Button>}</div>
   </form></>}</DialogContent></Dialog>
 </Tabs>;
}
function UpdateForm({w,u,setU,upload,onDone}:{w:Wedding;u:RecordItem;setU:(u:RecordItem)=>void;upload:Upload;onDone:(u:RecordItem,mode:'draft'|'publish'|'schedule')=>void}){
 const set=(k:string,v:any)=>setU({...u,[k]:v});const [uploading,setUploading]=useState(false),[previewId,setPreviewId]=useState(w.guests[0]?.id||'');
 const pg=w.guests.find(g=>g.id===previewId),sees=pg?inAudience(u.audience as Audience,pg):false;
 return <><DialogHeader><DialogTitle>{u.isNew?'Write an update':'Edit update'}</DialogTitle><DialogDescription>Appears in “Latest from Mienke &amp; Luvhan” on each selected guest’s page. {SAST}.</DialogDescription></DialogHeader>
  <form className="edit-form" onSubmit={e=>e.preventDefault()}>
   <label>Heading<input required value={u.heading} onChange={e=>set('heading',e.target.value)}/></label>
   <label>Message<textarea rows={5} value={u.message} onChange={e=>set('message',e.target.value)}/></label>
   <label>Photo or video (optional){u.media&&(u.mediaType==='video'?<video className="cal-photo" src={u.media} controls/>:<img className="cal-photo" src={u.media} alt=""/>)}
    <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4" disabled={uploading} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setUploading(true);try{const url=await upload(f,'asset');setU({...u,media:url,mediaType:f.type.startsWith('video/')?'video':'image'});toast.success('Added — save to keep it');}catch(err:any){toast.error(err.message);}finally{setUploading(false);}}}/>
    {u.media&&<Button type="button" variant="ghost" size="sm" onClick={()=>setU({...u,media:'',mediaType:''})}>Remove</Button>}</label>
   <div className="two-col"><label>Button text (optional)<input value={u.action?.label||''} onChange={e=>set('action',{...u.action,label:e.target.value})}/></label><label>Button link<input type="url" placeholder="https://…" value={u.action?.url||''} onChange={e=>set('action',{...u.action,url:e.target.value})}/></label></div>
   <AudiencePicker w={w} value={u.audience} onChange={a=>set('audience',a)}/>
   <label className="toggle"><Switch checked={!!u.pinned} onCheckedChange={v=>set('pinned',v)}/> Pin to the top</label>
   <label className="toggle"><Switch checked={!!u.requireAck} onCheckedChange={v=>set('requireAck',v)}/> Ask guests to tap “Got it” (for important changes)</label>
   <label className="toggle"><Switch checked={!!u.urgent} onCheckedChange={v=>set('urgent',v)}/> Urgent notice (highlighted, and shown in the wedding-day view)</label>
   <label className="toggle"><Switch checked={u.notify!==false} onCheckedChange={v=>set('notify',v)}/> Prepare WhatsApp/email messages when it goes live</label>
   <label>Publish at (for scheduling, SAST)<input type="datetime-local" value={isoToSastLocal(u.publishAt)} onChange={e=>set('publishAt',sastLocalToIso(e.target.value))}/></label>
   <fieldset className="preview-as"><legend><Eye size={14}/> Preview as a guest</legend><Choice value={previewId} label="Choose a guest" options={w.guests.map(g=>({value:g.id,label:g.name}))} onChange={setPreviewId}/>
    {pg&&(sees?<article className="update-card unread"><header><span className="badge new">New</span>{u.pinned&&<span className="badge">Pinned</span>}</header><h3>{u.heading||'Heading'}</h3><p className="preserve">{u.message}</p>{u.action?.label&&<span className="button outline">{u.action.label}</span>}{u.requireAck&&<span className="button">Got it</span>}</article>:<p className="muted small">{pg.name} will not see this update with the current audience.</p>)}</fieldset>
   <div className="toolbar"><Button type="button" variant="outline" disabled={uploading} onClick={()=>onDone(u,'draft')}>Save draft</Button><Button type="button" variant="outline" disabled={uploading||!u.publishAt} onClick={()=>onDone(u,'schedule')}>Schedule</Button><Button type="button" disabled={uploading} onClick={()=>onDone(u,'publish')}><Megaphone size={15}/> {u.status==='published'?'Save published update':'Publish now'}</Button></div>
   {u.status==='published'&&<p className="muted small">Editing a published update changes it on guests’ pages immediately. Messages already prepared are not sent again.</p>}
  </form></>;
}
