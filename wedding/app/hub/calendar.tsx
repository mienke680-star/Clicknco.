'use client';
import {useMemo,useState} from 'react';
import {toast} from 'sonner';
import {ChevronLeft,ChevronRight,Copy,MapPin,Plus,Trash2,Lock,Users,FileText} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {Choice} from '../ui';
import {AudiencePicker,api,SAST,type Save,type Upload} from './common';
import {audienceGuests,eventChanges,firstName,type Audience} from '@/lib/hub';
import {sastToday,addDays,longDate,timeRange} from '@/lib/time';
import {uid,type Wedding,type RecordItem} from '@/lib/model';
type Item={id:string;source:'event'|'planner'|'task'|'vendor';name:string;date:string;endDate?:string;time?:string;endTime?:string;venue?:string;status?:string;readOnly?:boolean;record?:RecordItem;target?:string};
type Draft={id:string;isNew:boolean;source:'event'|'planner';name:string;date:string;endDate:string;time:string;endTime:string;venue:string;map:string;description:string;image:string;status:'draft'|'published';audience:Audience;rsvpRequired:boolean;rsvpDeadline:string;reminders:number[];category:string};
const REMINDERS=[14,7,3,1];
const CATEGORIES=[{value:'task',label:'Planning task'},{value:'supplier',label:'Supplier appointment'},{value:'deadline',label:'Internal deadline'},{value:'other',label:'Other private item'}];
const mondayOf=(date:string)=>{const d=new Date(date+'T12:00:00Z');const dow=(d.getUTCDay()+6)%7;return addDays(date,-dow);};
const covers=(i:Item,date:string)=>i.date<=date&&date<=(i.endDate&&i.endDate>i.date?i.endDate:i.date);
const sortItems=(a:Item,b:Item)=>((a.date+(a.time||'99'))).localeCompare(b.date+(b.time||'99'));
function audienceOf(w:Wedding,e:RecordItem):Audience{if(e.audience)return e.audience;const inv=w.guests.filter(g=>(g.events||[]).includes(e.id)).map(g=>g.id);return inv.length===w.guests.length?{mode:'all'}:{mode:'guests',guests:inv};}
export default function CalendarView({w,save,upload,goto}:{w:Wedding;save:Save;upload:Upload;goto:(view:string)=>void}){
 const today=sastToday();
 const [mode,setMode]=useState<'month'|'week'|'agenda'>('month'),[cursor,setCursor]=useState(today),[show,setShow]=useState({event:true,planner:true,task:true,vendor:true}),[past,setPast]=useState(false);
 const [draft,setDraft]=useState<Draft|null>(null),[remove,setRemove]=useState<Draft|null>(null),[change,setChange]=useState<any>(null),[busy,setBusy]=useState(false);
 const items=useMemo(()=>{const out:Item[]=[];
  for(const e of w.events)out.push({id:e.id,source:'event',name:e.name,date:e.date,endDate:e.endDate,time:e.time,endTime:e.endTime,venue:e.venue,status:e.status==='draft'?'draft':'published',record:e});
  for(const p of w.planner)out.push({id:p.id,source:'planner',name:p.name,date:p.date,endDate:p.endDate,time:p.time,endTime:p.endTime,venue:p.venue,record:p});
  for(const t of w.tasks)if(t.due)out.push({id:'task-'+t.id,source:'task',name:(t.done?'✓ ':'')+t.name,date:t.due,readOnly:true,target:'tasks'});
  for(const v of w.vendors){if(v.deadline)out.push({id:'vd-'+v.id,source:'vendor',name:`${v.name}: final numbers due`,date:v.deadline,readOnly:true,target:'vendors'});if(v.callDate)out.push({id:'vc-'+v.id,source:'vendor',name:`${v.name} arrives`,date:v.callDate,time:v.callTime,readOnly:true,target:'vendors'});}
  return out.filter(i=>i.date&&show[i.source]).sort(sortItems);},[w,show]);
 const open=(i:Item)=>{if(i.readOnly){goto(i.target!);return;}const r=i.record!;setDraft({id:r.id,isNew:false,source:i.source as 'event'|'planner',name:r.name||'',date:r.date||'',endDate:r.endDate||'',time:r.time||'',endTime:r.endTime||'',venue:r.venue||'',map:r.map||'',description:r.description||'',image:r.image||'',status:r.status==='draft'?'draft':'published',audience:i.source==='event'?audienceOf(w,r):{mode:'all'},rsvpRequired:r.rsvp?.required!==false,rsvpDeadline:r.rsvp?.deadline||'',reminders:r.rsvp?.reminders||[],category:r.category||'task'});};
 const create=(date:string)=>setDraft({id:uid(),isNew:true,source:'event',name:'',date,endDate:'',time:'',endTime:'',venue:'',map:'',description:'',image:'',status:'draft',audience:{mode:'all'},rsvpRequired:true,rsvpDeadline:'',reminders:[],category:'task'});
 // Writes the draft into the wedding; for guest events the audience decides each guest's invitation.
 function build(d:Draft,notice?:RecordItem){
  const next=structuredClone(w),prevEvent=w.events.find(e=>e.id===d.id),prevPlan=w.planner.find(p=>p.id===d.id),prev=prevEvent||prevPlan;
  const base={id:d.id,name:d.name.trim(),date:d.date,endDate:d.endDate&&d.endDate!==d.date?d.endDate:'',time:d.time,endTime:d.endTime,venue:d.venue.trim(),map:d.map.trim(),description:d.description,image:d.image,updatedAt:new Date().toISOString(),version:Number(prev?.version||0)+1};
  const evIndex=w.events.findIndex(e=>e.id===d.id);next.events=next.events.filter(e=>e.id!==d.id);next.planner=next.planner.filter(p=>p.id!==d.id);
  if(d.source==='event'){const rec={...(prevEvent||{}),...base,status:d.status,audience:d.audience,rsvp:{required:d.rsvpRequired,deadline:d.rsvpDeadline,reminders:d.reminders}};if(evIndex>=0)next.events.splice(evIndex,0,rec);else next.events.push(rec);
   const targets=new Set(audienceGuests(next,d.audience).map(g=>g.id));next.guests=next.guests.map(g=>{const has=(g.events||[]).includes(d.id);return targets.has(g.id)?(has?g:{...g,events:[...(g.events||[]),d.id]}):(has?{...g,events:(g.events||[]).filter((x:string)=>x!==d.id)}:g);});}
  else{next.planner.push({...(prevPlan||{}),...base,category:d.category});next.guests=next.guests.map(g=>(g.events||[]).includes(d.id)?{...g,events:g.events.filter((x:string)=>x!==d.id)}:g);next.tables=next.tables.filter(t=>t.event!==d.id);}
  if(notice)next.updates.push(notice);
  return next;
 }
 async function commit(d:Draft,notice?:{heading:string;message:string;requireAck:boolean;guests:string[];changes:any[]}){
  if(!d.name.trim()||!d.date){toast.error('Add a title and a date.');return;}
  setBusy(true);
  try{
   const update=notice?{id:uid(),kind:'change',heading:notice.heading,message:notice.message,audience:{mode:'guests',guests:notice.guests},status:'published',publishedAt:new Date().toISOString(),createdAt:new Date().toISOString(),requireAck:notice.requireAck,notify:true,version:1,change:{event:d.name,before:Object.fromEntries(notice.changes.map((c:any)=>[c.label,c.before])),after:Object.fromEntries(notice.changes.map((c:any)=>[c.label,c.after]))}}:undefined;
   if(!await save(build(d,update)))return;
   if(update){const prepared=await api('/api/hub/outbox',{action:'notify-update',updateId:update.id}).catch((e:any)=>{toast.error(e.message);return null;});
    await api('/api/hub',{action:'log',type:'event-change',summary:`Changed “${d.name}” and notified ${notice!.guests.length} guest(s): ${notice!.changes.map((c:any)=>c.label).join(', ')}`}).catch(()=>{});
    toast.success(`Saved. ${notice!.guests.length} guest${notice!.guests.length===1?'':'s'} will see the change notice${prepared?'; WhatsApp messages are ready in Messages':''}.`);}
   else{if(!d.isNew&&d.source==='event'&&d.status==='published')await api('/api/hub',{action:'log',type:'event-change',summary:`Updated “${d.name}” without notifying guests`}).catch(()=>{});toast.success(d.status==='draft'&&d.source==='event'?'Draft saved — guests can’t see it yet':'Saved');}
   setDraft(null);setChange(null);
  }finally{setBusy(false);}
 }
 // Changing a published guest event offers a change notice for the guests who already have it.
 function requestSave(d:Draft){
  const prev=w.events.find(e=>e.id===d.id);
  if(!d.isNew&&prev&&prev.status!=='draft'&&d.source==='event'&&d.status==='published'){
   const after={...prev,...{name:d.name,date:d.date,endDate:d.endDate&&d.endDate!==d.date?d.endDate:'',time:d.time,endTime:d.endTime,venue:d.venue,map:d.map,description:d.description}};
   const changes=eventChanges(prev,after);
   const nextGuests=new Set(audienceGuests(w,d.audience).map(g=>g.id)),affected=w.guests.filter(g=>(g.events||[]).includes(d.id)&&nextGuests.has(g.id));
   if(changes.length&&affected.length){setChange({draft:d,changes,affected,heading:`Change to ${d.name}`,message:changes.map((c:any)=>`${c.label}: ${c.before||'—'} → ${c.after||'—'}`).join('\n'),requireAck:true});return;}
  }
  commit(d);
 }
 async function destroy(d:Draft){const next=structuredClone(w);next.events=next.events.filter(e=>e.id!==d.id);next.planner=next.planner.filter(p=>p.id!==d.id);next.guests=next.guests.map(g=>(g.events||[]).includes(d.id)?{...g,events:g.events.filter((x:string)=>x!==d.id)}:g);next.tables=next.tables.filter(t=>t.event!==d.id);next.layout=next.layout.filter(l=>l.event!==d.id);
  if(await save(next)){await api('/api/hub',{action:'log',type:'event-deleted',summary:`Deleted “${d.name}” from the calendar`}).catch(()=>{});toast.success('Deleted');setRemove(null);setDraft(null);}}
 const step=(n:number)=>{if(mode==='week')setCursor(addDays(cursor,7*n));else{const d=new Date(cursor+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n,1);setCursor(d.toISOString().slice(0,10));}};
 const monthStart=cursor.slice(0,8)+'01',gridStart=mondayOf(monthStart),days=Array.from({length:42},(_,i)=>addDays(gridStart,i));
 const weekDays=Array.from({length:7},(_,i)=>addDays(mondayOf(cursor),i));
 const title=mode==='week'?`${longDate(weekDays[0]).replace(/^\w+, /,'')} – ${longDate(weekDays[6]).replace(/^\w+, /,'')}`:new Date(monthStart+'T12:00:00Z').toLocaleDateString('en-ZA',{month:'long',year:'numeric',timeZone:'UTC'});
 const chip=(i:Item)=><button type="button" key={i.id} className={`cal-item ${i.source} ${i.status||''}`} onClick={e=>{e.stopPropagation();open(i);}} title={`${i.name} · ${timeRange(i)}`}>{i.source==='planner'||i.readOnly?<Lock size={11}/>:<Users size={11}/>}{i.time&&<b>{i.time}</b>}{i.name}{i.status==='draft'&&<em> (draft)</em>}</button>;
 const agenda=items.filter(i=>past||(i.endDate||i.date)>=today);
 return <>
  <div className="toolbar cal-toolbar">
   <div className="seg">{(['month','week','agenda'] as const).map(m=><Button key={m} variant={mode===m?'default':'outline'} onClick={()=>setMode(m)}>{m==='month'?'Month':m==='week'?'Week':'Agenda'}</Button>)}</div>
   {mode!=='agenda'&&<div className="cal-nav"><Button variant="outline" size="icon" aria-label="Previous" onClick={()=>step(-1)}><ChevronLeft size={16}/></Button><strong>{title}</strong><Button variant="outline" size="icon" aria-label="Next" onClick={()=>step(1)}><ChevronRight size={16}/></Button><Button variant="ghost" onClick={()=>setCursor(today)}>Today</Button>{w.settings.date&&<Button variant="ghost" onClick={()=>setCursor(w.settings.date)}>Wedding</Button>}</div>}
   <Button onClick={()=>create(mode==='agenda'?today:cursor)}><Plus size={16}/> Add event</Button>
  </div>
  <div className="cal-legend"><span>{SAST}</span>{([['event','Guest events'],['planner','Private planning'],['task','Checklist'],['vendor','Suppliers']] as const).map(([k,l])=><label className="toggle" key={k}><Checkbox checked={show[k]} onCheckedChange={v=>setShow({...show,[k]:!!v})}/><span className={'dot '+k}/>{l}</label>)}</div>
  {mode==='month'&&<div className="cal-month" role="grid">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><div key={d} className="cal-head" role="columnheader">{d}</div>)}
   {days.map(d=><div key={d} role="gridcell" tabIndex={0} aria-label={`Add an event on ${longDate(d)}`} className={'cal-cell'+(d.slice(0,7)!==monthStart.slice(0,7)?' other':'')+(d===today?' today':'')+(d===w.settings.date?' wedding':'')} onClick={()=>create(d)} onKeyDown={e=>{if(e.key==='Enter')create(d);}}><span className="cal-day">{Number(d.slice(8))}</span>{items.filter(i=>covers(i,d)).slice(0,4).map(chip)}{items.filter(i=>covers(i,d)).length>4&&<small>+{items.filter(i=>covers(i,d)).length-4} more</small>}</div>)}</div>}
  {mode==='week'&&<div className="cal-week">{weekDays.map(d=><div key={d} className={'cal-col'+(d===today?' today':'')}><button type="button" className="cal-col-head" onClick={()=>create(d)}>{longDate(d).replace(/ \d{4}$/,'')}<Plus size={13}/></button>{items.filter(i=>covers(i,d)).map(chip)}</div>)}</div>}
  {mode==='agenda'&&<section className="panel cal-agenda"><label className="toggle"><Switch checked={past} onCheckedChange={setPast}/> Show past items</label>{!agenda.length&&<p className="muted">Nothing planned yet.</p>}
   {agenda.map(i=><button type="button" key={i.id} className={`agenda-row ${i.source}`} onClick={()=>open(i)}><span className="agenda-date">{longDate(i.date).replace(/ \d{4}$/,'')}</span><span><strong>{i.name}</strong>{i.status==='draft'&&<em> · draft</em>}<small>{timeRange(i)}{i.venue?` · ${i.venue}`:''}</small></span><span className="badge">{i.source==='event'?(i.status==='draft'?'Draft':'Guests'):i.source==='planner'?'Private':i.source==='task'?'Checklist':'Supplier'}</span></button>)}</section>}
  <Dialog open={!!draft} onOpenChange={v=>!v&&setDraft(null)}><DialogContent className="edit-dialog cal-dialog">{draft&&<EventForm w={w} d={draft} setD={setDraft} upload={upload} busy={busy} onSave={()=>requestSave(draft)} onDelete={()=>setRemove(draft)} onDuplicate={()=>setDraft({...draft,id:uid(),isNew:true,name:draft.name+' (copy)',status:'draft'})}/>}</DialogContent></Dialog>
  <AlertDialog open={!!remove} onOpenChange={v=>!v&&setRemove(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete “{remove?.name}”?</AlertDialogTitle><AlertDialogDescription>{remove?.source==='event'?`It disappears from ${w.guests.filter(g=>(g.events||[]).includes(remove.id)).length} guest itinerary(ies), along with its seating plan. Replies already given are kept in each guest’s record. Guests are not notified automatically.`:'This private planning item will be removed.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel><AlertDialogAction onClick={()=>remove&&destroy(remove)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  <Dialog open={!!change} onOpenChange={v=>!v&&setChange(null)}><DialogContent className="edit-dialog">{change&&<><DialogHeader><DialogTitle>This event is already published</DialogTitle><DialogDescription>{change.affected.length} guest{change.affected.length===1?'':'s'} already have “{change.draft.name}” in their plans. Their itineraries update either way.</DialogDescription></DialogHeader>
   <table className="change-table"><thead><tr><th>Detail</th><th>Previous</th><th>New</th></tr></thead><tbody>{change.changes.map((c:any)=><tr key={c.field}><td>{c.label}</td><td><s>{c.before||'—'}</s></td><td><strong>{c.after||'—'}</strong></td></tr>)}</tbody></table>
   <div className="edit-form"><label>Notice heading<input value={change.heading} onChange={e=>setChange({...change,heading:e.target.value})}/></label><label>Notice message<textarea rows={4} value={change.message} onChange={e=>setChange({...change,message:e.target.value})}/></label><label className="toggle"><Switch checked={change.requireAck} onCheckedChange={v=>setChange({...change,requireAck:v})}/> Ask guests to tap “Got it”</label></div>
   <div className="notice-preview"><span className="eyebrow">Preview · on their page</span><h3>{change.heading}</h3><p className="preserve">{change.message}</p><span className="eyebrow">Preview · WhatsApp message (you send it yourself unless a provider is connected)</span><p className="preserve small">{`Hi ${firstName(change.affected[0]?.name||'')}, please note a change from ${w.settings.names||'Mienke & Luvhan'}: ${change.heading}.\n\n${change.message}\n\nYour updated plans: [their personal link]`}</p></div>
   <div className="toolbar"><Button variant="outline" disabled={busy} onClick={()=>commit(change.draft)}>Save changes</Button><Button disabled={busy||!change.heading.trim()} onClick={()=>commit(change.draft,{heading:change.heading.trim(),message:change.message,requireAck:change.requireAck,guests:change.affected.map((g:any)=>g.id),changes:change.changes})}>Save and notify affected guests</Button></div></>}</DialogContent></Dialog>
 </>;
}
function EventForm({w,d,setD,upload,busy,onSave,onDelete,onDuplicate}:{w:Wedding;d:Draft;setD:(d:Draft)=>void;upload:Upload;busy:boolean;onSave:()=>void;onDelete:()=>void;onDuplicate:()=>void}){
 const set=(k:keyof Draft,v:any)=>setD({...d,[k]:v});const [uploading,setUploading]=useState(false);
 const replies=d.source==='event'?w.guests.filter(g=>['yes','no'].includes(g.responses?.[d.id])).length:0;
 return <><DialogHeader><DialogTitle>{d.isNew?'Add to the calendar':'Edit calendar item'}</DialogTitle><DialogDescription>{SAST}. Times are never filled in for you: leave them empty until confirmed.</DialogDescription></DialogHeader>
  <form className="edit-form" onSubmit={e=>{e.preventDefault();onSave();}}>
   <label>What is this?<Choice value={d.source} options={[{value:'event',label:'Guest-visible event'},{value:'planner',label:'Private planning item (only us)'}]} onChange={v=>set('source',v)}/></label>
   <label>Title<input required value={d.name} onChange={e=>set('name',e.target.value)}/></label>
   <div className="two-col"><label>Date<input type="date" required value={d.date} onChange={e=>set('date',e.target.value)}/></label><label>Ends on (multi-day, optional)<input type="date" min={d.date} value={d.endDate} onChange={e=>set('endDate',e.target.value)}/></label></div>
   <div className="two-col"><label>Start time<input type="time" value={d.time} onChange={e=>set('time',e.target.value)}/></label><label>End time<input type="time" value={d.endTime} onChange={e=>set('endTime',e.target.value)}/></label></div>
   {!d.isNew&&<div className="toolbar move-row"><span className="muted small">Move:</span><Button type="button" variant="outline" size="sm" onClick={()=>setD({...d,date:addDays(d.date,-1),endDate:d.endDate?addDays(d.endDate,-1):''})}>1 day earlier</Button><Button type="button" variant="outline" size="sm" onClick={()=>setD({...d,date:addDays(d.date,1),endDate:d.endDate?addDays(d.endDate,1):''})}>1 day later</Button></div>}
   <label>Location<input value={d.venue} onChange={e=>set('venue',e.target.value)}/></label>
   <label>Map link<input type="url" placeholder="https://maps.google.com/…" value={d.map} onChange={e=>set('map',e.target.value)}/></label>
   <label>Description<textarea value={d.description} onChange={e=>set('description',e.target.value)}/></label>
   <label>Photo (optional){d.image&&<img className="cal-photo" src={d.image} alt=""/>}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setUploading(true);try{set('image',await upload(f,'asset'));toast.success('Photo added — save to keep it');}catch(err:any){toast.error(err.message);}finally{setUploading(false);}}}/>{d.image&&<Button type="button" variant="ghost" size="sm" onClick={()=>set('image','')}>Remove photo</Button>}</label>
   {d.source==='planner'?<label>Kind of item<Choice value={d.category} options={CATEGORIES} onChange={v=>set('category',v)}/></label>:<>
    <label>Status<Choice value={d.status} options={[{value:'draft',label:'Draft — only we can see it'},{value:'published',label:'Published — invited guests can see it'}]} onChange={v=>set('status',v)}/></label>
    <AudiencePicker w={w} value={d.audience} onChange={a=>set('audience',a)}/>
    <fieldset><legend>RSVP</legend><label className="toggle"><Switch checked={d.rsvpRequired} onCheckedChange={v=>set('rsvpRequired',v)}/> Guests must reply to this event</label>
     {d.rsvpRequired&&<><label>Reply by (leave empty to use the main RSVP date {w.settings.rsvpDeadline?`, ${longDate(w.settings.rsvpDeadline)}`:''})<input type="date" value={d.rsvpDeadline} onChange={e=>set('rsvpDeadline',e.target.value)}/></label>
      <div className="pick-list"><span className="muted small">Remind guests who haven’t replied:</span>{REMINDERS.map(n=><label className="toggle" key={n}><Checkbox checked={d.reminders.includes(n)} onCheckedChange={v=>set('reminders',v?[...d.reminders,n].sort((a,b)=>b-a):d.reminders.filter(x=>x!==n))}/>{n} day{n===1?'':'s'} before</label>)}</div>
      {!!d.reminders.length&&<p className="muted small">Reminders are prepared at 09:00 SAST on those days for guests who haven’t replied. They appear in Messages for you to send (or are sent automatically if WhatsApp/email delivery is connected).</p>}</>}
     {replies>0&&<p className="muted small">{replies} guest{replies===1?' has':'s have'} already replied to this event.</p>}</fieldset></>}
   <div className="toolbar"><Button type="submit" disabled={busy||uploading}>{busy?'Saving…':d.source==='event'&&d.status==='draft'?'Save draft':'Save'}</Button>{!d.isNew&&<><Button type="button" variant="outline" onClick={onDuplicate}><Copy size={15}/> Duplicate</Button><Button type="button" variant="ghost" onClick={onDelete}><Trash2 size={15}/> Delete</Button></>}</div>
   {d.source==='event'&&!d.isNew&&<p className="muted small"><FileText size={13}/> Tip: changing a published event lets you preview and send a change notice before anything is announced.</p>}
   {d.venue&&d.map&&<a className="small" href={d.map} target="_blank" rel="noreferrer"><MapPin size={13}/> Check the map link</a>}
  </form></>;
}
