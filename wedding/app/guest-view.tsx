'use client';
import {useCallback,useEffect,useState} from 'react';
import Invitation from './invitation';
import {Choice,download} from './ui';
import {toast,Toaster} from 'sonner';
import {Button} from '@/components/ui/button';
import {uploadFile} from '@/lib/upload-client';
import {Bell,CalendarPlus,Check,ChevronRight,Copy,Heart,MapPin,MessageCircle,Phone,Pin,Sparkles} from 'lucide-react';
type Tab='invitation'|'plans'|'updates'|'rsvp'|'ask';
type Act=(body:object,ok?:string)=>Promise<boolean>;
const TABS:[Tab,string][]=[['invitation','My Invitation'],['plans','Weekend Plans'],['updates','Updates'],['rsvp','My RSVP'],['ask','Ask Us']];
const hashTab=():Tab=>{const h=typeof location!=='undefined'?location.hash.slice(1):'';return (TABS.some(([t])=>t===h)?h:'invitation') as Tab;};
const longDate=(d:string)=>d?new Date(d+'T12:00:00Z').toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}):'Date to be confirmed';
const dayText=(iso:string)=>iso?new Date(iso).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric',timeZone:'Africa/Johannesburg'}):'';
const waLink=(phone:string,text='')=>`https://wa.me/${String(phone||'').replace(/\D/g,'').replace(/^0/,'27')}${text?'?text='+encodeURIComponent(text):''}`;
export default function GuestView({token,preview=false}:{token:string;preview?:boolean}){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[form,setForm]=useState<any>({responses:{}}),[photos,setPhotos]=useState<any[]>([]),[mine,setMine]=useState<any[]>([]),[secondary,setSecondary]=useState(false),[busy,setBusy]=useState(false),[success,setSuccess]=useState(false),[tab,setTabState]=useState<Tab>('invitation');
 const q=encodeURIComponent(token);
 const load=useCallback(async(resetForm=false)=>{try{const r=await fetch(`/api/guest?token=${q}${preview?'&preview=1':''}`,{cache:'no-store'});const d=await r.json() as any;if(!r.ok)throw Error(d.error);setData(d);if(resetForm)setForm({...d.guest,bringPlusOne:!!d.guest.plusOneName});}catch(e:any){setError(e.message);}},[q,preview]);
 const loadPhotos=useCallback(async()=>{const r=await fetch('/api/photos?token='+q,{cache:'no-store'});const d=await r.json() as any;setPhotos(d.photos||[]);setMine(d.mine||[]);},[q]);
 useEffect(()=>{load(true);loadPhotos();setTabState(hashTab());const onHash=()=>setTabState(hashTab());addEventListener('hashchange',onHash);return ()=>removeEventListener('hashchange',onHash);},[load,loadPhotos]);
 const setTab=(t:Tab)=>{setTabState(t);history.replaceState(null,'','#'+t);document.getElementById('guest-tabs')?.scrollIntoView({behavior:'smooth',block:'start'});};
 // Every change goes to the server; in "Preview as guest" nothing is saved.
 const act:Act=async(body,ok)=>{if(preview){toast.info('Preview only — nothing is saved.');return false;}setBusy(true);try{const r=await fetch('/api/guest/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,...body})});const d=await r.json() as any;if(!r.ok)throw Error(d.error);if(ok)toast.success(ok);await load();return true;}catch(e:any){toast.error(e.message);return false;}finally{setBusy(false);}};
 const field=(k:string,v:any)=>setForm({...form,[k]:v});const label=(key:string,fallback:string)=>secondary?(data?.settings.secondary?.[key]||fallback):fallback;
 async function submit(e:React.FormEvent){e.preventDefault();if(preview){toast.info('Preview only — nothing is saved.');return;}setBusy(true);try{const r=await fetch('/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,token})});const d=(await r.json() as any);if(!r.ok)throw Error(d.error);setForm((f:any)=>({...f,...d.guest}));setSuccess(true);toast.success('Your RSVP is saved');await load();}catch(e:any){toast.error(e.message)}finally{setBusy(false)}}
 async function upload(files:FileList|null){if(!files)return;if(preview){toast.info('Preview only — nothing is uploaded.');return;}setBusy(true);try{for(const file of Array.from(files)){await uploadFile(file,{token,kind:'photo'});}toast.success('Thank you! Your photos will appear once we’ve had a look.');await loadPhotos();}catch(e:any){toast.error(e.message)}finally{setBusy(false)}}
 // Viewing the Updates tab records which updates were opened; "Got it" is a separate, explicit step.
 useEffect(()=>{if(tab!=='updates'||!data||preview)return;const unopened=data.updates.filter((u:any)=>!u.opened);if(!unopened.length)return;const t=setTimeout(async()=>{for(const u of unopened)await fetch('/api/guest/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,action:'open-update',id:u.id})});load();},1500);return ()=>clearTimeout(t);},[tab,data,preview,token,load]);
 useEffect(()=>{if(tab!=='ask'||!data?.unreadReplies||preview)return;const t=setTimeout(()=>fetch('/api/guest/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,action:'seen',what:'questions'})}).then(()=>load()),1500);return ()=>clearTimeout(t);},[tab,data?.unreadReplies,preview,token,load]);
 if(error)return <main className="guest-error"><h1>Your private invitation</h1><p>{error}</p><Button onClick={()=>location.reload()}>Try again</Button></main>;
 if(!data)return <main className="guest-error"><h1>Something beautiful is coming.</h1><p>Opening your invitation…</p></main>;
 const s=data.settings,attending=Object.values(form.responses||{}).includes('yes'),unread=data.updates.filter((u:any)=>!u.opened).length;
 const badge=(t:Tab)=>t==='updates'?unread:t==='ask'?data.unreadReplies:0;
 return <main className="guest-page">
  <Toaster richColors/>
  {preview&&<div className="preview-banner" role="status">Preview as {data.guest.name}: this is exactly what they see. Nothing is saved or marked as read.</div>}
  <div className="guest-top"><span>For {data.guest.household||data.guest.name}</span>{s.language&&<Button variant="outline" onClick={()=>setSecondary(!secondary)}>{secondary?'English':s.language}</Button>}</div>
  <Summary data={data} unread={unread} setTab={setTab}/>
  {data.day.active&&<DayPanel data={data}/>}
  <nav id="guest-tabs" className="guest-tabs" aria-label="Your wedding pages">{TABS.map(([t,name])=><button key={t} type="button" aria-current={tab===t?'page':undefined} className={tab===t?'active':''} onClick={()=>setTab(t)}>{name}{badge(t)>0&&<span className="tab-badge" aria-label={`${badge(t)} new`}>{badge(t)}</span>}</button>)}</nav>
  {tab==='invitation'&&<Invitation settings={s} events={data.events} story={data.story} token={token} secondary={secondary}>
   <section className="invite-section"><span className="eyebrow">{label('photosLabel','Through your eyes')}</span><h2>{label('photoTitle','Share a little of the magic.')}</h2><p>{label('photoDescription','Upload your favourite photos from our celebration.')}</p>
    <label className="upload-button">{busy?'Uploading…':label('uploadLabel','Choose photos')}<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>upload(e.target.files)}/></label>
    <p className="muted small">Your photos join the shared gallery once Mienke &amp; Luvhan have approved them.</p>
    {!!mine.length&&<div className="my-photos"><h3>Your photos</h3><div className="photo-grid">{mine.map(p=><figure key={p.id}><img src={'/api/media/'+p.id+'?token='+q} alt="Your photo"/><figcaption>{p.status==='approved'?'In the gallery':p.status==='rejected'?'Not shared':'Waiting for approval'}</figcaption></figure>)}</div></div>}
    {!!photos.length&&<><h3>{photos.some(p=>p.official)?'Our gallery':'Shared gallery'}</h3><div className="photo-grid">{photos.map(p=><figure key={p.id}><a href={'/api/media/'+p.id+'?token='+q} target="_blank" rel="noreferrer"><img src={'/api/media/'+p.id+'?token='+q} alt={p.official?'Photo from Mienke & Luvhan':'Wedding photo by '+p.name}/></a><figcaption>{p.official?'From Mienke & Luvhan':p.name}</figcaption></figure>)}</div></>}
   </section>
  </Invitation>}
  {tab==='plans'&&<Plans data={data} token={token}/>}
  {tab==='updates'&&<Updates data={data} act={act} busy={busy} preview={preview} token={token}/>}
  {tab==='rsvp'&&<section className="guest-panel" id="rsvp">
   <div className="invite-section"><span className="eyebrow">RSVP</span><h2>{label('rsvpTitle','Will you celebrate with us?')}</h2><p>{label('deadlineLabel','Please reply by')} {longDate(s.rsvpDeadline)}</p>
   {data.rsvp.locked&&<p className="notice">The reply date has passed. You can still update your dietary needs, song and message; for anything else, please send us a message in Ask Us.</p>}
   {success&&<div className="success"><strong>{label('thankYou','Thank you, your reply is saved.')}</strong><p>{label('updateReply','You can update it at any time using this link.')}</p><Button variant="outline" onClick={()=>download('my-rsvp.txt',data.guest.name+'\n'+data.events.map((e:any)=>e.name+': '+(form.responses?.[e.id]==='yes'?'Attending':'Not attending')).join('\n')+'\nMeal: '+form.meal)}>Download my confirmation</Button></div>}
   <form onSubmit={submit} className={"rsvp-form text-"+(s.rsvpTextSize||"Standard").toLowerCase()}><fieldset><legend>{label('yourDetailsLabel','Your details')}</legend><label>{label('fullNameLabel','Your full name')}<input autoComplete="name" required maxLength={150} value={form.name||''} onChange={e=>field('name',e.target.value)}/></label><label>{label('phoneLabel','Phone number')}<input type="tel" autoComplete="tel" maxLength={50} value={form.phone||''} onChange={e=>field('phone',e.target.value)}/></label></fieldset>
    {data.events.filter((e:any)=>e.rsvpRequired).map((e:any)=><label key={e.id}>{secondary&&e.secondaryName?e.secondaryName:e.name}<small className="muted">{longDate(e.date)} · {e.when}{e.deadline?` · reply by ${longDate(e.deadline)}`:''}</small><Choice value={form.responses?.[e.id]||''} label={label('attendanceLabel','Your attendance')} options={[{value:'yes',label:label('acceptLabel','Joyfully accepts')},{value:'no',label:label('declineLabel','Regretfully declines')}]} onChange={v=>field('responses',{...form.responses,[e.id]:v})}/></label>)}
    {attending&&<><label>{label('mealLabel','Your meal')}<Choice value={form.meal||''} onChange={v=>field('meal',v)} options={String(s.mealOptions).split(',').map((x:string)=>x.trim())}/></label><label>{label('allergyLabel','Allergies or dietary requirements')}<small className="muted">Only Mienke &amp; Luvhan see this.</small><textarea value={form.allergy||''} onChange={e=>field('allergy',e.target.value)}/></label>{data.guest.plusOneAllowed&&<fieldset className="plus-one-fields"><legend>{label('plusOneDetailsLabel','Your plus-one')}</legend><p>{label('plusOneWelcome','You are welcome to bring a plus-one.')}</p><label>{label('bringingPlusOneLabel','Will you bring a plus-one?')}<Choice value={form.bringPlusOne?'yes':'no'} options={[{value:'no',label:label('comingAloneLabel','I’m coming on my own')},{value:'yes',label:label('bringingCompanionLabel','Yes, I’m bringing someone')}]} onChange={v=>setForm({...form,bringPlusOne:v==='yes',...(v==='no'?{plusOneName:'',plusOneMeal:'',plusOneAllergy:'',plusOnePhone:''}:{})})}/></label>{form.bringPlusOne&&<><label>{label('plusOneNameLabel','Plus-one’s full name')}<input required maxLength={150} autoComplete="off" value={form.plusOneName||''} onChange={e=>field('plusOneName',e.target.value)}/></label><label>{label('plusPhoneLabel','Plus-one phone number (optional)')}<input type="tel" autoComplete="off" maxLength={50} value={form.plusOnePhone||''} onChange={e=>field('plusOnePhone',e.target.value)}/></label><label>{label('plusMealLabel','Plus-one meal')}<Choice value={form.plusOneMeal||''} options={String(s.mealOptions).split(',').map((x:string)=>x.trim())} onChange={v=>field('plusOneMeal',v)}/></label><label>{label('plusAllergyLabel','Plus-one dietary requirements')}<textarea value={form.plusOneAllergy||''} onChange={e=>field('plusOneAllergy',e.target.value)}/></label></>}</fieldset>}<label>{label('songLabel','A song to get you dancing')}<input value={form.song||''} onChange={e=>field('song',e.target.value)}/></label></>}
    <label>{s.rsvpQuestion||label('messageLabel','A little note for us')}<textarea value={form.message||''} onChange={e=>field('message',e.target.value)}/></label><Button disabled={busy||preview} type="submit">{busy?label('savingLabel','Saving…'):label('saveRsvpLabel','Save my RSVP')}</Button></form></div>
   <Extras data={data} act={act} busy={busy||preview} attending={attending} token={token}/>
  </section>}
  {tab==='ask'&&<Ask data={data} act={act} busy={busy||preview}/>}
  <footer className="invite-footer">{s.names} · {longDate(s.date)}</footer>
 </main>;
}
function Summary({data,unread,setTab}:{data:any;unread:number;setTab:(t:Tab)=>void}){
 const acc=data.accommodation;
 return <section className="guest-summary" aria-label="Your summary">
  <div className="summary-head"><Heart size={18}/><div><span className="eyebrow">Your wedding page</span><h1>{data.guest.household||data.guest.name}</h1>{data.guest.household&&<p className="muted">{[data.guest.name,...data.guest.members.map((m:any)=>m.name)].join(' · ')}</p>}</div></div>
  <div className="summary-chips">
   <button type="button" onClick={()=>setTab('rsvp')} className={'chip '+data.rsvp.status}><span>RSVP</span><strong>{data.rsvp.label}</strong></button>
   {(data.settings.accommodationOffered||acc.status!=='none')&&<button type="button" onClick={()=>setTab('rsvp')} className={'chip '+acc.status}><span>Accommodation</span><strong>{acc.label}</strong></button>}
   <button type="button" onClick={()=>setTab('updates')} className={'chip'+(unread?' attention':'')}><span>Updates</span><strong>{unread?`${unread} new`:'All read'}</strong></button>
  </div>
  {!!data.guest.members.length&&<ul className="household-list">{data.guest.members.map((m:any)=><li key={m.name}>{m.name}: <strong>{m.status}</strong></li>)}</ul>}
  {data.todo.length>0?<div className="todo"><h2>You still need to…</h2><ul>{data.todo.map((t:any)=><li key={t.id} className={t.urgent?'urgent':''}><span>{t.text}{t.deadline&&<small> · by {longDate(t.deadline)}</small>}</span><Button size="sm" onClick={()=>setTab(t.tab)}>{t.tab==='updates'?'View':t.tab==='ask'?'Read':'Do it now'}<ChevronRight size={14}/></Button></li>)}</ul></div>:<p className="todo-done"><Check size={16}/> You’re all set. Thank you!</p>}
 </section>;
}
function DayPanel({data}:{data:any}){const s=data.settings;
 return <section className="day-panel" aria-label="Today"><span className="eyebrow">Today</span><h2>{data.day.events.length?'Today’s plans':'The wedding day'}</h2>
  {s.dayNotice&&<p className="urgent-notice"><Bell size={16}/> {s.dayNotice}</p>}
  {data.day.urgent.map((u:any)=><p key={u.id} className="urgent-notice"><Bell size={16}/> <strong>{u.heading}</strong> {u.message}</p>)}
  {data.day.events.map((e:any)=><div key={e.id} className="day-event"><strong>{e.when}</strong><div><h3>{e.name}</h3><p>{e.venue}</p>{e.map&&<a className="button" href={e.map} target="_blank" rel="noreferrer"><MapPin size={15}/> Directions</a>}</div></div>)}
  {!data.day.events.length&&s.map&&<a className="button" href={s.map} target="_blank" rel="noreferrer"><MapPin size={15}/> Directions to {s.venue}</a>}
  {s.helperName&&<div className="helper"><span>Need help today? Contact {s.helperName}{s.helperNote?` (${s.helperNote})`:''}</span>{s.helperPhone&&<div className="toolbar"><a className="button outline" href={'tel:'+s.helperPhone}><Phone size={15}/> Call</a><a className="button outline" href={waLink(s.helperPhone)} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a></div>}</div>}
 </section>;
}
const withToken=(url:string,q:string)=>url+(url.startsWith('/api/media/')?'?token='+q:'');
function Plans({data,token}:{data:any;token:string}){const q=encodeURIComponent(token),[copied,setCopied]=useState(false);
 return <section className="guest-panel" id="plans"><div className="invite-section"><span className="eyebrow">Weekend Plans</span><h2>Your itinerary</h2><p className="muted">All times are {data.timezone}.</p>
  {!data.events.length&&<p>Your plans will appear here soon.</p>}
  <div className="itinerary">{data.events.map((e:any)=><article key={e.id} className="plan-card">{e.image&&<img src={withToken(e.image,q)} alt=""/>}<div><span className="eyebrow">{longDate(e.date)}{e.endDate&&e.endDate!==e.date?` – ${longDate(e.endDate)}`:''}</span><h3>{e.name}</h3><p className="when">{e.when}</p>{e.venue&&<p><MapPin size={14}/> {e.venue}</p>}{e.description&&<p className="preserve">{e.description}</p>}
   <div className="toolbar">{e.map&&<a className="button outline" href={e.map} target="_blank" rel="noreferrer"><MapPin size={15}/> Map</a>}<a className="button outline" href={`/api/calendar/${q}.ics?download=1&event=${encodeURIComponent(e.id)}`}><CalendarPlus size={15}/> Add to calendar</a></div></div></article>)}</div>
  {!!data.events.length&&<div className="calendar-help"><h3>Keep these plans in your calendar</h3>
   <div className="toolbar"><a className="button" href={`/api/calendar/${q}.ics?download=1`}><CalendarPlus size={15}/> Download all events</a><a className="button outline" href={data.calendar.webcal}>Subscribe in my calendar</a><Button variant="ghost" onClick={async()=>{try{await navigator.clipboard.writeText(data.calendar.feed);setCopied(true);}catch{toast.error('Copy the address below instead.');}}}><Copy size={15}/> {copied?'Copied':'Copy calendar address'}</Button></div>
   <p className="muted small">A downloaded calendar file is a one-time copy: if we change an event later, it won’t update by itself. Subscribing keeps your calendar in step with this page; most calendar apps check for changes every few hours. On a computer, add this address as a calendar subscription: <code>{data.calendar.feed}</code></p></div>}
 </div></section>;
}
function Updates({data,act,busy,preview,token}:{data:any;act:Act;busy:boolean;preview:boolean;token:string}){
 const q=encodeURIComponent(token),[prefs,setPrefs]=useState({whatsapp:data.prefs.whatsapp!==false,email:!!data.prefs.email,emailAddress:data.prefs.emailAddress||''});
 return <section className="guest-panel" id="updates"><div className="invite-section"><span className="eyebrow">Latest from Mienke &amp; Luvhan</span><h2>Updates</h2>
  {!data.updates.length&&<p>No updates yet. We’ll share news here.</p>}
  <div className="updates">{data.updates.map((u:any)=><article key={u.id} className={'update-card'+(u.opened?'':' unread')+(u.urgent?' urgent':'')}>
   <header>{u.pinned&&<span className="badge"><Pin size={12}/> Pinned</span>}{!u.opened&&<span className="badge new">New</span>}{u.kind==='change'&&<span className="badge">Change of plans</span>}<time>{dayText(u.date)}</time></header>
   <h3>{u.heading}</h3>{u.message&&<p className="preserve">{u.message}</p>}
   {u.change&&<table className="change-table"><thead><tr><th>Detail</th><th>Before</th><th>Now</th></tr></thead><tbody>{Object.keys(u.change.after).map(k=><tr key={k}><td>{k}</td><td><s>{u.change.before[k]||'—'}</s></td><td><strong>{u.change.after[k]||'—'}</strong></td></tr>)}</tbody></table>}
   {u.media&&(u.mediaType==='video'?<video className="update-media" src={withToken(u.media,q)} controls playsInline preload="metadata"/>:<img className="update-media" src={withToken(u.media,q)} alt=""/>)}
   <div className="toolbar">{u.action&&<a className="button outline" href={u.action.url} target={u.action.url.startsWith('/')?undefined:'_blank'} rel="noreferrer">{u.action.label}</a>}
    {u.requireAck&&(u.acked?<span className="acked"><Check size={15}/> You confirmed you’ve seen this</span>:<Button disabled={busy||preview} onClick={()=>act({action:'ack-update',id:u.id},'Thank you for letting us know')}>Got it</Button>)}</div>
  </article>)}</div>
  <details className="prefs"><summary><Bell size={15}/> How should we let you know about updates?</summary>
   <p className="muted small">Updates always appear here on your page. We may also send you a WhatsApp message ourselves.</p>
   <label className="check"><input type="checkbox" checked={prefs.whatsapp} onChange={e=>setPrefs({...prefs,whatsapp:e.target.checked})}/> WhatsApp messages{data.guest.phone?` to ${data.guest.phone}`:' (add your phone number in My RSVP)'}</label>
   {data.emailAvailable&&<><label className="check"><input type="checkbox" checked={prefs.email} onChange={e=>setPrefs({...prefs,email:e.target.checked})}/> Email</label>{prefs.email&&<label>Email address<input type="email" value={prefs.emailAddress} onChange={e=>setPrefs({...prefs,emailAddress:e.target.value})}/></label>}</>}
   <Button variant="outline" disabled={busy||preview} onClick={()=>act({action:'prefs',...prefs},'Preferences saved')}>Save preferences</Button></details>
 </div></section>;
}
function Extras({data,act,busy,attending,token}:{data:any;act:Act;busy:boolean;attending:boolean;token:string}){
 const s=data.settings,acc=data.accommodation,req=acc.request||{};
 const [stay,setStay]=useState({wanted:req.wanted||'',people:req.people||1,from:req.from||'',to:req.to||'',notes:req.notes||''});
 const [travel,setTravel]=useState({arrive:data.travel?.arrive||'',depart:data.travel?.depart||'',transport:data.travel?.transport||'',notes:data.travel?.notes||''});
 const [lift,setLift]=useState({mode:data.lift?.mode||'none',seats:data.lift?.seats||1,from:data.lift?.from||'',share:!!data.lift?.share,contact:data.lift?.contact||data.guest.phone||''});
 const [board,setBoard]=useState<any[]|null>(null);
 useEffect(()=>{if(data.lift?.share&&data.lift.mode!=='none')fetch('/api/guest/lifts?token='+encodeURIComponent(token),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>setBoard(d?.lifts||null));},[data.lift,token]);
 return <>
  {data.polls.map((p:any)=><div className="invite-section" key={p.id}><span className="eyebrow">Quick question</span><h2>{p.question}</h2><div className="poll-options">{p.options.map((o:string)=><Button key={o} variant={p.answer===o?'default':'outline'} disabled={busy} onClick={()=>act({action:'poll',pollId:p.id,answer:o},'Thank you!')}>{p.answer===o&&<Check size={15}/>}{o}</Button>)}</div></div>)}
  {(s.accommodationOffered||acc.status!=='none')&&<div className="invite-section" id="stay"><span className="eyebrow">Accommodation</span><h2>A place to stay</h2>{s.accommodationNote&&<p className="preserve">{s.accommodationNote}</p>}
   <p className={'status-line '+acc.status}><strong>Status:</strong> {acc.label}{acc.room&&<> · {acc.room.name}{acc.room.place?`, ${acc.room.place}`:''} · {acc.people} {acc.people===1?'person':'people'}</>}</p>{acc.room?.notes&&<p className="muted">{acc.room.notes}</p>}
   {acc.status!=='confirmed'&&<form className="rsvp-form" onSubmit={e=>{e.preventDefault();act({action:'accommodation',...stay},'Accommodation request saved');}}>
    <label>Do you need accommodation?<Choice value={stay.wanted} label="Choose" options={[{value:'yes',label:'Yes, please'},{value:'no',label:'No, thank you'}]} onChange={v=>setStay({...stay,wanted:v})}/></label>
    {stay.wanted==='yes'&&<><label>How many people?<input type="number" min={1} max={20} value={stay.people} onChange={e=>setStay({...stay,people:Number(e.target.value)})}/></label><div className="two-col"><label>Arriving<input type="date" value={stay.from} onChange={e=>setStay({...stay,from:e.target.value})}/></label><label>Leaving<input type="date" value={stay.to} onChange={e=>setStay({...stay,to:e.target.value})}/></label></div><label>Anything we should know?<textarea value={stay.notes} onChange={e=>setStay({...stay,notes:e.target.value})}/></label></>}
    <Button type="submit" disabled={busy||!stay.wanted}>Save accommodation request</Button></form>}
  </div>}
  {attending&&s.travelQuestions!==false&&<div className="invite-section" id="travel"><span className="eyebrow">Travel</span><h2>Getting here</h2>{s.travelNote&&<p className="preserve">{s.travelNote}</p>}
   <form className="rsvp-form" onSubmit={e=>{e.preventDefault();act({action:'travel',...travel},'Travel plans saved');}}><div className="two-col"><label>Arriving<input type="date" value={travel.arrive} onChange={e=>setTravel({...travel,arrive:e.target.value})}/></label><label>Leaving<input type="date" value={travel.depart} onChange={e=>setTravel({...travel,depart:e.target.value})}/></label></div>
    <label>Transport needs<input placeholder="e.g. airport pick-up, shuttle from the hotel" value={travel.transport} onChange={e=>setTravel({...travel,transport:e.target.value})}/></label><label>Notes<textarea value={travel.notes} onChange={e=>setTravel({...travel,notes:e.target.value})}/></label><Button type="submit" disabled={busy}>Save travel plans</Button></form>
   <h3>Lifts</h3><form className="rsvp-form" onSubmit={e=>{e.preventDefault();act({action:'lift',...lift},'Lift details saved');}}>
    <label>Can you offer or do you need a lift?<Choice value={lift.mode} options={[{value:'none',label:'Neither'},{value:'offer',label:'I can offer a lift'},{value:'need',label:'I’d like a lift'}]} onChange={v=>setLift({...lift,mode:v})}/></label>
    {lift.mode!=='none'&&<><label>Travelling from<input value={lift.from} onChange={e=>setLift({...lift,from:e.target.value})}/></label>{lift.mode==='offer'&&<label>Seats available<input type="number" min={1} max={8} value={lift.seats} onChange={e=>setLift({...lift,seats:Number(e.target.value)})}/></label>}
     <label className="check"><input type="checkbox" checked={lift.share} onChange={e=>setLift({...lift,share:e.target.checked})}/> Share my name, area and phone number with other guests who are also sharing lift details</label>{lift.share&&<label>Phone number to share<input type="tel" value={lift.contact} onChange={e=>setLift({...lift,contact:e.target.value})}/></label>}
     {!lift.share&&<p className="muted small">Without sharing, only Mienke &amp; Luvhan see this and can help match you.</p>}</>}
    <Button type="submit" disabled={busy}>Save lift details</Button></form>
   {board&&<div className="lift-board"><h3>Guests sharing lift details</h3>{!board.length&&<p className="muted">No one else is sharing yet.</p>}{board.map((l,i)=><p key={i}><strong>{l.name}</strong> {l.mode==='offer'?`offers ${l.seats} seat${l.seats===1?'':'s'}`:'needs a lift'}{l.from?` from ${l.from}`:''} · <a href={waLink(l.contact)} target="_blank" rel="noreferrer">{l.contact}</a></p>)}</div>}
  </div>}
 </>;
}
function Ask({data,act,busy}:{data:any;act:Act;busy:boolean}){const [text,setText]=useState('');
 return <section className="guest-panel" id="ask"><div className="invite-section"><span className="eyebrow">Ask Us</span><h2>Questions &amp; answers</h2>
  {data.faq.map((f:any)=><details key={f.id} className="faq"><summary>{f.question}</summary><p className="preserve">{f.answer}</p></details>)}
  <h3><Sparkles size={16}/> Ask us privately</h3><p className="muted small">Only Mienke &amp; Luvhan can read your questions and our replies.</p>
  <div className="thread">{data.thread.map((m:any)=><div key={m.id} className={'bubble '+m.from}><p className="preserve">{m.text}</p><small>{m.from==='couple'?'Mienke & Luvhan':'You'} · {new Date(m.at).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></div>)}</div>
  <form className="rsvp-form" onSubmit={async e=>{e.preventDefault();if(await act({action:'question',text},'Sent to Mienke & Luvhan'))setText('');}}><label>Your question<textarea required minLength={2} maxLength={2000} value={text} onChange={e=>setText(e.target.value)}/></label><Button type="submit" disabled={busy||text.trim().length<2}>Send question</Button></form>
 </div></section>;
}
