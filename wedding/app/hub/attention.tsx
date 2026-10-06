'use client';
import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import {AlertCircle,BedDouble,Camera,Check,History,MessageCircle,Send,ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {api,sastText,type HubData} from './common';
import {audienceGuests,isLive} from '@/lib/hub';
import type {Wedding} from '@/lib/model';
// "Needs our attention": everything waiting for the couple, with a button straight to it.
export default function Attention({w,hub,reloadHub,goto,openQuestion}:{w:Wedding;hub:HubData;reloadHub:()=>void;goto:(v:string)=>void;openQuestion:(guestId:string)=>void}){
 const [extra,setExtra]=useState<{photos:number;toSend:number;failed:number}|null>(null),[showAll,setShowAll]=useState(false);
 useEffect(()=>{Promise.all([api('/api/photos'),api('/api/hub/outbox')]).then(([p,o])=>{const rec=o.batches.flatMap((b:any)=>b.recipients);setExtra({photos:p.photos.filter((x:any)=>x.status==='pending').length,toSend:rec.filter((r:any)=>r.status==='pending'&&!r.automatic).length,failed:rec.filter((r:any)=>r.status==='failed').length});}).catch(()=>setExtra(null));},[hub]);
 if(!hub)return <section className="panel attention"><p className="muted">Loading what needs your attention…</p></section>;
 const unanswered=hub.threads.filter(t=>t.unanswered);
 const waitingRooms=w.guests.filter(g=>hub.states[g.id]?.accommodation?.wanted==='yes'&&!w.allocations.some(a=>a.guestId===g.id));
 const fresh=hub.activity.filter(a=>a.important&&!a.reviewed&&a.actor==='guest'&&['rsvp-changed','rsvp','travel','accommodation','photo'].includes(a.type));
 const changed=fresh.filter(a=>a.type==='rsvp-changed');
 const acks=w.updates.filter(u=>u.requireAck&&isLive(u)).map(u=>({u,missing:audienceGuests(w,u.audience).filter(g=>!hub.states[g.id]?.acked?.[u.id])})).filter(x=>x.missing.length);
 async function review(ids:string[]){try{await api('/api/hub',{action:'review',ids});reloadHub();}catch(e:any){toast.error(e.message);}}
 const items=[
  unanswered.length&&{icon:MessageCircle,text:`${unanswered.length} unanswered question${unanswered.length===1?'':'s'}`,detail:unanswered.map(t=>t.name).join(', '),action:()=>openQuestion(unanswered[0].guestId),label:'Reply'},
  waitingRooms.length&&{icon:BedDouble,text:`${waitingRooms.length} accommodation request${waitingRooms.length===1?'':'s'} waiting`,detail:waitingRooms.map(g=>g.name).join(', '),action:()=>goto('stay'),label:'Allocate'},
  changed.length&&{icon:AlertCircle,text:`${changed.length} changed RSVP${changed.length===1?'':'s'}`,detail:changed.slice(0,3).map(a=>a.summary).join(' · '),action:()=>review(changed.map(a=>a.id)),label:'Mark reviewed'},
  acks.length&&{icon:ShieldCheck,text:`${acks.reduce((n,x)=>n+x.missing.length,0)} outstanding “Got it” confirmation(s)`,detail:acks.map(x=>`${x.u.heading}: ${x.missing.length} to go`).join(' · '),action:()=>goto('updates'),label:'View'},
  extra?.photos&&{icon:Camera,text:`${extra.photos} guest photo${extra.photos===1?'':'s'} waiting for approval`,detail:'Photos appear in the shared gallery only after you approve them.',action:()=>goto('photos'),label:'Review'},
  extra?.toSend&&{icon:Send,text:`${extra.toSend} WhatsApp message${extra.toSend===1?'':'s'} ready for you to send`,detail:'Nothing is sent until you send it yourself.',action:()=>goto('messages'),label:'Send'},
  extra?.failed&&{icon:AlertCircle,text:`${extra.failed} message${extra.failed===1?'':'s'} failed`,detail:'Check and retry in Messages.',action:()=>goto('messages'),label:'Retry'},
 ].filter(Boolean) as any[];
 const otherNew=fresh.filter(a=>a.type!=='rsvp-changed');
 return <section className="panel attention"><div className="panel-heading"><h2>Needs our attention</h2>{fresh.length>0&&<Button variant="ghost" size="sm" onClick={()=>api('/api/hub',{action:'review-all'}).then(reloadHub)}><Check size={14}/> Mark all reviewed</Button>}</div>
  {!items.length&&!otherNew.length&&<p className="todo-done"><Check size={16}/> Nothing is waiting for you right now.</p>}
  <ul className="attention-list">{items.map((i,n)=><li key={n}><i.icon size={18}/><div><strong>{i.text}</strong><small>{i.detail}</small></div><Button size="sm" variant="outline" onClick={i.action}>{i.label}</Button></li>)}</ul>
  {otherNew.length>0&&<><h3>New from guests</h3><ul className="history">{otherNew.slice(0,8).map(a=><li key={a.id}><span>{a.summary}</span><small>{sastText(a.at)}</small><Button size="sm" variant="ghost" onClick={()=>review([a.id])}>Reviewed</Button></li>)}</ul></>}
  <details open={showAll} onToggle={e=>setShowAll((e.target as HTMLDetailsElement).open)}><summary><History size={14}/> History of important changes</summary>
   <ul className="history">{hub.activity.filter(a=>a.important||a.actor!=='guest').slice(0,150).map(a=><li key={a.id} className={a.reviewed?'':'unreviewed'}><span><em>{a.actor==='guest'?'Guest':a.actor==='couple'?'Us':'Automatic'}</em> {a.summary}</span><small>{sastText(a.at)}</small></li>)}</ul></details>
 </section>;
}
