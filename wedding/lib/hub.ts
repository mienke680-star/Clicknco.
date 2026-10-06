import type {Wedding,RecordItem} from './model';
import {deadlinePassed,longDate,timeRange} from './time';
// Pure rules for the wedding hub: who may see what, deadlines, accommodation capacity and the
// "You still need to…" list. No storage here, so the website, the scheduler and tests share them.
export type Audience={mode:'all'|'groups'|'households'|'guests';groups?:string[];households?:string[];guests?:string[]};
export const household=(g:RecordItem)=>String(g.household||'').trim();
export const groupOf=(g:RecordItem)=>String(g.group||'').trim();
export function inAudience(a:Audience|undefined,g:RecordItem){
 if(!a||a.mode==='all'||!a.mode)return true;
 if(a.mode==='groups')return !!groupOf(g)&&(a.groups||[]).includes(groupOf(g));
 if(a.mode==='households')return (a.households||[]).includes(household(g)||'guest:'+g.id);
 if(a.mode==='guests')return (a.guests||[]).includes(g.id);
 return false;
}
export function audienceGuests(w:Wedding,a:Audience|undefined){return w.guests.filter(g=>inAudience(a,g));}
export function householdLabels(w:Wedding){const seen=new Map<string,string>();for(const g of w.guests){const h=household(g);if(h)seen.set(h,h);else seen.set('guest:'+g.id,g.name);}return [...seen].map(([value,label])=>({value,label}));}
export function audienceText(w:Wedding,a:Audience|undefined){if(!a||a.mode==='all')return 'All guests';const n=audienceGuests(w,a).length;const what=a.mode==='groups'?`Groups: ${(a.groups||[]).join(', ')}`:a.mode==='households'?`${(a.households||[]).length} household(s)`:`${(a.guests||[]).length} guest(s)`;return `${what} · ${n} guest${n===1?'':'s'}`;}
// --- Events ------------------------------------------------------------------------------------
// Events saved before the calendar existed have no status: they are already published.
export const isPublished=(e:RecordItem)=>e.status!=='draft';
const startKey=(e:RecordItem)=>(e.date||'9999-12-31')+(e.time||'99:99');
export const byStart=(a:RecordItem,b:RecordItem)=>startKey(a).localeCompare(startKey(b));
export function visibleEvents(w:Wedding,g:RecordItem){return w.events.filter(e=>isPublished(e)&&(g.events||[]).includes(e.id)).sort(byStart);}
export function eventDeadline(w:Wedding,e:RecordItem){return String(e.rsvp?.deadline||w.settings.rsvpDeadline||'');}
export const rsvpRequired=(e:RecordItem)=>e.rsvp?.required!==false;
// What a guest may see of an event (never the couple's private notes or audience lists).
export function guestEvent(w:Wedding,e:RecordItem){return {id:e.id,name:e.name,date:e.date||'',time:e.time||'',endDate:e.endDate||'',endTime:e.endTime||'',venue:e.venue||'',map:/^https?:\/\//.test(e.map||'')?e.map:'',description:e.description||'',image:e.image||'',secondaryName:e.secondaryName||'',secondaryDescription:e.secondaryDescription||'',rsvpRequired:rsvpRequired(e),deadline:eventDeadline(w,e),when:timeRange(e as any),updated:e.updatedAt||'',version:Number(e.version||0)};}
// --- Updates -----------------------------------------------------------------------------------
export function liveAt(u:RecordItem){return String(u.status==='scheduled'?u.publishAt:u.publishedAt||u.createdAt||'');}
export function isLive(u:RecordItem,now:Date=new Date()){if(u.status==='archived'||u.status==='draft')return false;if(u.status==='published')return true;if(u.status==='scheduled')return !!u.publishAt&&Date.parse(u.publishAt)<=now.getTime();return false;}
export function visibleUpdates(w:Wedding,g:RecordItem,now:Date=new Date()){return w.updates.filter(u=>isLive(u,now)&&inAudience(u.audience,g)).sort((a,b)=>liveAt(b).localeCompare(liveAt(a)));}
export function guestUpdate(u:RecordItem){return {id:u.id,kind:u.kind||'news',heading:u.heading||'',message:u.message||'',media:u.media||'',mediaType:u.mediaType||'',action:u.action?.url&&/^https?:\/\/|^\//.test(u.action.url)?{label:u.action.label||'Open',url:u.action.url}:null,pinned:!!u.pinned,urgent:!!u.urgent,requireAck:!!u.requireAck,date:liveAt(u),change:u.change?{event:u.change.event||'',before:u.change.before||{},after:u.change.after||{}}:null};}
export function visiblePolls(w:Wedding,g:RecordItem){return w.polls.filter(p=>p.status==='open'&&inAudience(p.audience,g));}
export function visibleFaq(w:Wedding){return w.faq.filter(f=>f.published!==false&&f.question);}
// --- Settings shown to guests (an allow-list, so new private settings never leak) ---------------
const GUEST_SETTINGS=['names','date','venue','address','map','welcome','message','dress','travel','theme','accent','cover','music','video','language','photoWall','mealOptions','banking','registry','rsvpDeadline','rsvpQuestion','rsvpTextSize','secondary','helperName','helperPhone','helperNote','dayNotice','accommodationOffered','accommodationNote','travelNote','thanksMessage'];
export function guestSettings(w:Wedding){const s:Record<string,any>={};for(const k of GUEST_SETTINGS)if(w.settings[k]!==undefined)s[k]=w.settings[k];s.secondary={...(s.secondary||{})};return s;}
// --- Accommodation -----------------------------------------------------------------------------
// Allocations hold beds whether pending or confirmed, so a room can never be promised twice.
export function roomUsage(w:Wedding){const usage=new Map<string,{capacity:number;confirmed:number;pending:number}>();for(const r of w.rooms)usage.set(r.id,{capacity:Math.max(0,Number(r.capacity)||0),confirmed:0,pending:0});for(const a of w.allocations){const u=usage.get(a.roomId);if(!u)continue;const n=Math.max(1,Number(a.people)||1);if(a.status==='confirmed')u.confirmed+=n;else u.pending+=n;}return usage;}
export function validateHub(w:Wedding):string|null{
 const ids=new Set(w.guests.map(g=>g.id)),rooms=new Set(w.rooms.map(r=>r.id));
 for(const r of w.rooms){if(!String(r.name||'').trim())return 'Each room needs a name.';if(!Number.isInteger(Number(r.capacity))||Number(r.capacity)<1)return `Room “${r.name}” needs a capacity of at least 1.`;}
 const perGuest=new Set<string>();
 for(const a of w.allocations){if(!ids.has(a.guestId))return 'An accommodation allocation refers to a guest who is no longer on the list.';if(!rooms.has(a.roomId))return 'An accommodation allocation refers to a room that no longer exists.';if(!['pending','confirmed'].includes(a.status))return 'Allocations must be pending or confirmed.';if(!Number.isInteger(Number(a.people))||Number(a.people)<1)return 'Allocations need at least one person.';if(perGuest.has(a.guestId))return 'A guest can only have one room allocation.';perGuest.add(a.guestId);}
 for(const [roomId,u] of roomUsage(w))if(u.confirmed+u.pending>u.capacity){const r=w.rooms.find(x=>x.id===roomId);return `“${r?.name}” would be overbooked: ${u.confirmed+u.pending} people for ${u.capacity} beds.`;}
 for(const u of w.updates){if(!['draft','scheduled','published','archived'].includes(u.status))return 'Each update needs a valid status.';if(u.status==='scheduled'&&Number.isNaN(Date.parse(u.publishAt||'')))return `Choose a publication time for “${u.heading}”.`;}
 for(const e of w.events){if(e.endDate&&e.date&&e.endDate<e.date)return `“${e.name}” ends before it starts.`;if(e.endDate===e.date&&e.time&&e.endTime&&e.endTime<e.time)return `“${e.name}” ends before it starts.`;}
 for(const e of w.planner){if(e.endDate&&e.date&&e.endDate<e.date)return `“${e.name}” ends before it starts.`;}
 return null;
}
export type GuestState={opened:Record<string,string>;acked:Record<string,string>;prefs:{whatsapp?:boolean;email?:boolean;emailAddress?:string};accommodation?:{wanted:'yes'|'no';people?:number;from?:string;to?:string;notes?:string;updatedAt?:string};travel?:{arrive?:string;depart?:string;transport?:string;notes?:string;updatedAt?:string};lift?:{mode:'none'|'offer'|'need';seats?:number;from?:string;share?:boolean;contact?:string;updatedAt?:string};polls:Record<string,string>;seen:{questions?:string;notices?:string};updatedAt?:string};
export const emptyGuestState=():GuestState=>({opened:{},acked:{},prefs:{whatsapp:true},polls:{},seen:{}});
export function accommodationStatus(w:Wedding,g:RecordItem,state:GuestState){
 const a=w.allocations.find(x=>x.guestId===g.id),room=a&&w.rooms.find(r=>r.id===a.roomId);
 if(a&&room)return {status:a.status==='confirmed'?'confirmed':'allocated',label:a.status==='confirmed'?'Confirmed':'Room held — awaiting confirmation',room:{name:room.name,place:room.place||'',notes:room.guestNotes||''},people:Number(a.people)||1,from:a.from||'',to:a.to||''};
 if(state.accommodation?.wanted==='yes')return {status:'requested',label:'Requested — waiting for us to confirm',people:state.accommodation.people||1,from:state.accommodation.from||'',to:state.accommodation.to||''};
 if(state.accommodation?.wanted==='no')return {status:'not-needed',label:'Not needed'};
 return {status:'none',label:'Not requested'};
}
// --- RSVP --------------------------------------------------------------------------------------
export function rsvpStatus(w:Wedding,g:RecordItem){const events=visibleEvents(w,g).filter(rsvpRequired);const answered=events.filter(e=>['yes','no'].includes(g.responses?.[e.id]));if(!events.length)return {status:'none',label:'No reply needed'};if(answered.length<events.length)return {status:answered.length?'partial':'pending',label:answered.length?'Partly answered':'Awaiting your reply'};return events.some(e=>g.responses?.[e.id]==='yes')?{status:'attending',label:'Attending'}:{status:'declined',label:'Not attending'};}
// The guest's outstanding actions, each with a destination tab on their page.
export function todoList(w:Wedding,g:RecordItem,state:GuestState,extra:{unreadReplies:number},now:Date=new Date()){
 const todo:{id:string;text:string;tab:string;deadline?:string;urgent?:boolean}[]=[];
 const events=visibleEvents(w,g).filter(rsvpRequired),missing=events.filter(e=>!['yes','no'].includes(g.responses?.[e.id]));
 if(missing.length){const deadlines=missing.map(e=>eventDeadline(w,e)).filter(Boolean).sort();todo.push({id:'rsvp',text:missing.length===events.length?'Reply to your invitation':`Reply for ${missing.map(e=>e.name).join(', ')}`,tab:'rsvp',deadline:deadlines[0],urgent:!!deadlines[0]&&deadlinePassed(deadlines[0],new Date(now.getTime()+7*864e5))});}
 const attending=events.some(e=>g.responses?.[e.id]==='yes');
 for(const u of visibleUpdates(w,g,now))if(u.requireAck&&!state.acked[u.id])todo.push({id:'ack-'+u.id,text:`Let us know you’ve seen “${u.heading}”`,tab:'updates',urgent:!!u.urgent});
 for(const p of visiblePolls(w,g))if(!state.polls[p.id])todo.push({id:'poll-'+p.id,text:`Answer: ${p.question}`,tab:'rsvp',deadline:p.closes||undefined});
 if(attending&&w.settings.accommodationOffered&&!state.accommodation)todo.push({id:'stay',text:'Tell us whether you need accommodation',tab:'rsvp'});
 if(attending&&w.settings.travelQuestions!==false&&!state.travel?.arrive)todo.push({id:'travel',text:'Share your travel dates',tab:'rsvp'});
 if(extra.unreadReplies)todo.push({id:'replies',text:extra.unreadReplies===1?'Read our reply to your question':`Read our ${extra.unreadReplies} replies`,tab:'ask'});
 return todo;
}
// --- Messages ----------------------------------------------------------------------------------
export const firstName=(name:string)=>String(name||'').trim().split(/\s+/)[0]||'there';
// South African numbers in any common format become +27…; returns '' when it can't be a phone number.
export function normalisePhone(phone:string){let d=String(phone||'').replace(/[^\d+]/g,'');if(d.startsWith('+'))d=d.slice(1);else if(d.startsWith('00'))d=d.slice(2);else if(d.startsWith('0'))d='27'+d.slice(1);d=d.replace(/\D/g,'');return d.length>=10&&d.length<=15?'+'+d:'';}
export function inviteMessage(w:Wedding,g:RecordItem,link:string){return `Dear ${g.name},\n\nWith so much joy, we would love you to celebrate our wedding with us${w.settings.date?' on '+longDate(w.settings.date):''}${w.settings.venue?' at '+w.settings.venue:''}. 💙\n\nYour personal invitation and RSVP are here:\n${link}\n\nWith love,\n${w.settings.names||'Mienke & Luvhan'}`;}
export function updateMessage(w:Wedding,g:RecordItem,u:RecordItem,link:string){const couple=w.settings.names||'Mienke & Luvhan';if(u.kind==='change')return `Hi ${firstName(g.name)}, please note a change from ${couple}: ${u.heading}.\n\n${u.message||''}\n\nYour updated plans: ${link}`.replace(/\n\n\n/g,'\n\n');return `Hi ${firstName(g.name)}, there’s a new update from ${couple}: “${u.heading}”.${u.requireAck?' Please let us know you’ve seen it.':''}\n\nRead it here: ${link}`;}
export function reminderMessage(w:Wedding,g:RecordItem,e:RecordItem,link:string){return `Hi ${firstName(g.name)}, a gentle reminder from ${w.settings.names||'Mienke & Luvhan'}: please reply for ${e.name} by ${longDate(eventDeadline(w,e))}. It only takes a minute:\n${link}`;}
// Change notices show the previous and new details side by side.
export const CHANGE_FIELDS:[string,string][]=[['name','Event'],['date','Date'],['endDate','Ends'],['time','Starts'],['endTime','Finishes'],['venue','Location'],['map','Map link'],['description','Details']];
export function eventChanges(before:RecordItem,after:RecordItem){return CHANGE_FIELDS.filter(([k])=>String(before[k]||'')!==String(after[k]||'')).map(([k,label])=>({field:k,label,before:String(before[k]||''),after:String(after[k]||'')}));}
export const guestLink=(origin:string,g:RecordItem,hash='')=>`${origin}/invite/${encodeURIComponent(g.token)}${hash}`;
