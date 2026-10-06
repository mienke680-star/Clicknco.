'use client';
import {useCallback,useEffect,useState} from 'react';
import {toast} from 'sonner';
import {Copy,MessageCircle,RefreshCw,Send,Mail,Inbox} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {api,waLink,sastText,StatusBadge,type HubData} from './common';
import type {Wedding} from '@/lib/model';
export default function MessagesView({w,hub,reloadHub,initialGuest}:{w:Wedding;hub:HubData;reloadHub:()=>void;initialGuest?:string}){
 const [out,setOut]=useState<any>(null),[openIds,setOpenIds]=useState<Set<string>|null>(null),[busy,setBusy]=useState(false),[thread,setThread]=useState<{guestId:string;messages:any[]}|null>(null),[reply,setReply]=useState('');
 const load=useCallback(async()=>{try{const d=await api('/api/hub/outbox');setOut(d);
  // Batches with something to do start open, and stay as the couple left them while they work.
  setOpenIds(cur=>cur||new Set(d.batches.filter((b:any)=>b.recipients.some((r:any)=>r.status==='pending'||r.status==='failed')).map((b:any)=>b.id)));}catch(e:any){toast.error(e.message);}},[]);
 useEffect(()=>{load();},[load]);
 const openThread=useCallback(async(guestId:string)=>{try{const d=await api('/api/hub?thread='+encodeURIComponent(guestId));setThread({guestId,messages:d.thread});setReply('');}catch(e:any){toast.error(e.message);}},[]);
 useEffect(()=>{if(initialGuest)openThread(initialGuest);},[initialGuest,openThread]);
 async function mark(b:any,r:any,status:string){setBusy(true);try{await api('/api/hub/outbox',{action:'mark',batchId:b.id,guestId:r.guestId,channel:r.channel,status});await load();toast.success(status==='sent_manually'?'Marked as sent':status==='skipped'?'Skipped':'Ready to send again');}catch(e:any){toast.error(e.message);}finally{setBusy(false);}}
 async function run(body:object,ok:string){setBusy(true);try{const r=await api('/api/hub/outbox',body);await load();reloadHub();toast.success(typeof ok==='string'?ok:'Done');return r;}catch(e:any){toast.error(e.message);}finally{setBusy(false);}}
 const p=out?.providers||hub?.providers||{email:'',whatsapp:''},guestName=(id:string)=>w.guests.find(g=>g.id===id)?.name||'Guest';
 const threads=hub?.threads||[];const unanswered=threads.filter((t:any)=>t.unanswered);
 return <Tabs defaultValue={initialGuest?'questions':'outbox'}><TabsList><TabsTrigger value="outbox">Messages to send</TabsTrigger><TabsTrigger value="questions">Guest questions{unanswered.length?` (${unanswered.length})`:''}</TabsTrigger></TabsList>
  <TabsContent value="outbox">
   <section className="panel provider-panel"><h2>How messages are delivered</h2>
    <p><MessageCircle size={15}/> <strong>WhatsApp:</strong> {p.whatsapp?`Connected (${p.whatsapp}). Pending WhatsApp messages are sent automatically; “accepted” means the provider took the message, not that it was read.`:'You send WhatsApp messages yourself. “Open WhatsApp” prepares the message; you choose the chat and press send, then tap “Mark as sent”.'}</p>
    <p><Mail size={15}/> <strong>Email:</strong> {p.email?`Connected (${p.email}). Guests who opt in on their page receive emails.`:'Not connected. Guests are not asked for an email address.'}</p>
    <p className="muted small">Every update also appears on each guest’s page, whether or not a message is sent. Scheduled updates and RSVP reminders are prepared automatically every 10 minutes, even when this site is closed.</p>
    <div className="toolbar"><Button variant="outline" disabled={busy} onClick={()=>run({action:'invite'},'Invitation messages prepared for guests who haven’t been sent their link')}><Send size={15}/> Prepare invitation messages</Button><Button variant="ghost" disabled={busy} onClick={()=>run({action:'process'},'Checked for scheduled updates, reminders and pending deliveries')}><RefreshCw size={15}/> Check now</Button></div></section>
   {!out&&<p className="muted">Loading messages…</p>}
   {out&&!out.batches.length&&<p className="muted">No messages yet. Publish an update, notify guests of a change, or prepare invitation messages.</p>}
   {out?.batches.map((b:any)=>{const counts=b.recipients.reduce((m:any,r:any)=>({...m,[r.status]:(m[r.status]||0)+1}),{});return <details className="panel batch" key={b.id} open={!!openIds?.has(b.id)} onToggle={e=>{const isOpen=(e.currentTarget as HTMLDetailsElement).open;setOpenIds(cur=>{const n=new Set(cur||[]);if(isOpen)n.add(b.id);else n.delete(b.id);return n;});}}>
    <summary><div><span className="eyebrow">{({update:'Update',change:'Change notice',reminder:'RSVP reminder',invite:'Invitations',custom:'Message'} as any)[b.kind]} · {sastText(b.createdAt)} · prepared by {b.createdBy==='system'?'the scheduler':'you'}</span><h3>{b.title}</h3></div>
     <div className="mini-stats">{counts.pending?<span>{counts.pending} to send</span>:null}{counts.sent_manually?<span>{counts.sent_manually} sent by you</span>:null}{counts.accepted?<span>{counts.accepted} accepted by provider</span>:null}{counts.failed?<span className="warn">{counts.failed} failed</span>:null}{b.siteOnly.length?<span>{b.siteOnly.length} on website only</span>:null}</div></summary>
    <div className="recipients">{b.recipients.map((r:any)=><div className="recipient" key={r.guestId+r.channel}>
     <div><strong>{r.name}</strong><small>{r.channel==='whatsapp'?`WhatsApp ${r.to}`:`Email ${r.to}`}</small><StatusBadge status={r.status} automatic={r.automatic}/>{r.error&&<small className="warn">{r.error}</small>}{r.status==='sent_manually'&&<small className="muted">You marked this as sent on {sastText(r.updatedAt)}.</small>}</div>
     <div className="toolbar">{r.channel==='whatsapp'&&!r.automatic&&['pending','failed'].includes(r.status)&&<a className="button outline" href={waLink(r.to,r.text)} target="_blank" rel="noreferrer"><MessageCircle size={14}/> Open WhatsApp</a>}
      <Button variant="ghost" size="sm" onClick={async()=>{try{await navigator.clipboard.writeText(r.text);toast.success('Message copied');}catch{toast.error('Copy failed');}}}><Copy size={14}/></Button>
      {!r.automatic&&['pending','failed'].includes(r.status)&&<Button size="sm" disabled={busy} onClick={()=>mark(b,r,'sent_manually')}>Mark as sent</Button>}
      {['pending','failed'].includes(r.status)&&<Button size="sm" variant="ghost" disabled={busy} onClick={()=>mark(b,r,'skipped')}>Skip</Button>}
      {['failed','skipped','sent_manually'].includes(r.status)&&<Button size="sm" variant="ghost" disabled={busy} onClick={()=>{if(r.status!=='sent_manually'||confirm('Send this message again? The guest may receive it twice.'))mark(b,r,'pending');}}>Retry</Button>}</div>
    </div>)}</div>
    {!!b.siteOnly.length&&<p className="muted small">Website only: {b.siteOnly.map((s:any)=>`${s.name} (${s.reason.toLowerCase()})`).join(', ')}.</p>}
   </details>;})}
  </TabsContent>
  <TabsContent value="questions">
   <div className="inbox"><div className="thread-list">{!threads.length&&<p className="muted"><Inbox size={16}/> No questions yet. Guests ask from the “Ask Us” tab on their page.</p>}
    {threads.map((t:any)=><button type="button" key={t.guestId} className={'thread-row'+(t.unanswered?' unanswered':'')+(thread?.guestId===t.guestId?' active':'')} onClick={()=>openThread(t.guestId)}><strong>{t.name}</strong><small>{t.count} message{t.count===1?'':'s'} · {t.unanswered?'Needs a reply':'Answered'}</small></button>)}</div>
    {thread&&<section className="panel thread-panel"><h2>{guestName(thread.guestId)}</h2><p className="muted small">Private between you and this guest.</p>
     <div className="thread">{thread.messages.map((m:any)=><div key={m.id} className={'bubble '+(m.from==='couple'?'guest':'couple')}><p className="preserve">{m.text}</p><small>{m.from==='couple'?'You':guestName(thread.guestId)} · {sastText(m.at)}</small></div>)}</div>
     <form className="edit-form" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await api('/api/hub',{action:'reply',guestId:thread.guestId,text:reply});toast.success('Reply sent to their page');await openThread(thread.guestId);reloadHub();}catch(err:any){toast.error(err.message);}finally{setBusy(false);}}}><label>Your reply<textarea required value={reply} onChange={e=>setReply(e.target.value)}/></label><Button type="submit" disabled={busy||!reply.trim()}>Send reply</Button><p className="muted small">The reply appears on their page with a notification badge. To also tell them on WhatsApp, use the WhatsApp button below.</p>
      {w.guests.find(g=>g.id===thread.guestId)?.phone&&<a className="button outline" href={waLink(w.guests.find(g=>g.id===thread.guestId)!.phone,`Hi ${guestName(thread.guestId).split(' ')[0]}, we’ve answered your question on your wedding page.`)} target="_blank" rel="noreferrer"><MessageCircle size={14}/> Let them know on WhatsApp</a>}</form></section>}
   </div>
  </TabsContent>
 </Tabs>;
}
