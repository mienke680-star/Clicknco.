'use client';
import {useState} from 'react';
import {Checkbox} from '@/components/ui/checkbox';
import {Choice} from '../ui';
import {householdLabels,audienceGuests,type Audience} from '@/lib/hub';
import type {Wedding} from '@/lib/model';
export type Save=(w:Wedding)=>Promise<boolean>;
export type Upload=(file:File,kind?:string,onProgress?:(f:number)=>void)=>Promise<string>;
export type HubData={activity:any[];states:Record<string,any>;threads:any[];providers:{email:string;whatsapp:string}}|null;
export async function api(path:string,body?:object){const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const d=await r.json().catch(()=>({})) as any;if(!r.ok)throw Error(d.error||'Something went wrong. Please try again.');return d;}
export const SAST='All times SAST · Africa/Johannesburg (UTC+2)';
// "2027-04-24T15:00" typed in a datetime field always means South African time.
export const sastLocalToIso=(local:string)=>local?new Date(local+':00+02:00').toISOString():'';
export const isoToSastLocal=(iso:string)=>{if(!iso)return '';const d=new Date(new Date(iso).getTime()+2*3600e3);return d.toISOString().slice(0,16);};
export const sastText=(iso:string)=>iso?new Date(iso).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})+' SAST':'';
export const waLink=(phone:string,text='')=>`https://wa.me/${String(phone||'').replace(/\D/g,'').replace(/^0/,'27')}${text?'?text='+encodeURIComponent(text):''}`;
// Choose everyone, guest groups, households or individual guests; shows how many guests that is.
export function AudiencePicker({w,value,onChange,allLabel='Everyone on our guest list'}:{w:Wedding;value:Audience;onChange:(a:Audience)=>void;allLabel?:string}){
 const [search,setSearch]=useState('');const a=value||{mode:'all'};
 const groups=[...new Set(w.guests.map(g=>String(g.group||'').trim()).filter(Boolean))].sort();
 const households=householdLabels(w).sort((x,y)=>x.label.localeCompare(y.label));
 const toggle=(key:'groups'|'households'|'guests',v:string)=>{const list=new Set(a[key]||[]);if(list.has(v))list.delete(v);else list.add(v);onChange({...a,[key]:[...list]});};
 const count=audienceGuests(w,a).length;
 return <fieldset className="audience"><legend>Who can see this</legend>
  <Choice value={a.mode||'all'} label="Audience" options={[{value:'all',label:allLabel},{value:'groups',label:'Guest groups'},{value:'households',label:'Households'},{value:'guests',label:'Individual guests'}]} onChange={v=>onChange({mode:v as Audience['mode'],groups:a.groups||[],households:a.households||[],guests:a.guests||[]})}/>
  {a.mode==='groups'&&(groups.length?<div className="pick-list">{groups.map(gr=><label className="toggle" key={gr}><Checkbox checked={(a.groups||[]).includes(gr)} onCheckedChange={()=>toggle('groups',gr)}/>{gr}</label>)}</div>:<p className="muted small">Add a guest group to guests first (Guests → guest details).</p>)}
  {a.mode==='households'&&<div className="pick-list">{households.map(h=><label className="toggle" key={h.value}><Checkbox checked={(a.households||[]).includes(h.value)} onCheckedChange={()=>toggle('households',h.value)}/>{h.label}</label>)}</div>}
  {a.mode==='guests'&&<><input aria-label="Find a guest" placeholder="Find a guest" value={search} onChange={e=>setSearch(e.target.value)}/><div className="pick-list">{w.guests.filter(g=>g.name.toLowerCase().includes(search.toLowerCase())).map(g=><label className="toggle" key={g.id}><Checkbox checked={(a.guests||[]).includes(g.id)} onCheckedChange={()=>toggle('guests',g.id)}/>{g.name}</label>)}</div></>}
  <small className="muted">{count} guest{count===1?'':'s'} will see this.</small>
 </fieldset>;
}
export const STATUS_TEXT:Record<string,string>={pending:'Ready — you still need to send this',sending:'Sending…',accepted:'Accepted by the provider (not proof of delivery)',sent_manually:'Marked as sent by you',failed:'Failed',skipped:'Skipped'};
export function StatusBadge({status,automatic}:{status:string;automatic?:boolean}){const text=status==='pending'&&automatic?'Queued for automatic sending':STATUS_TEXT[status]||status;return <span className={'badge status-'+status}>{text}</span>;}
