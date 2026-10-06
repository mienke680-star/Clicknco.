import { guest,saveRsvp,failure,checkOrigin,HttpError,readRsvps,mergeGuest,photoIndex } from '@/lib/server';
import { getCoupleUser } from '@/lib/auth';
import { visibleEvents,guestEvent,visibleUpdates,guestUpdate,visiblePolls,visibleFaq,guestSettings,accommodationStatus,rsvpStatus,todoList,household,eventDeadline,rsvpRequired } from '@/lib/hub';
import { readGuestState,readThread,logActivity } from '@/lib/hub-store';
import { deadlinePassed,sastToday,TZ_LABEL } from '@/lib/time';
import { emailConfigured } from '@/lib/providers';
import { publicOrigin } from '@/lib/origin';
// Everything one guest may see: their invitation, their household, the published events they are
// invited to, the updates meant for them, their own requests and their private conversation with us.
export async function GET(req:Request){try{
 const params=new URL(req.url).searchParams,token=params.get('token')||'';const {w,g}=await guest(token);
 // "Preview as guest" from the dashboard never counts as the guest having looked.
 const preview=params.get('preview')==='1'&&!!await getCoupleUser(req);
 const [state,thread]=await Promise.all([readGuestState(g.id),readThread(g.id)]);
 const now=new Date(),today=sastToday(now);
 const events=visibleEvents(w,g).map(e=>guestEvent(w,e));
 const updates=visibleUpdates(w,g,now).map(u=>({...guestUpdate(u),opened:!!state.opened[u.id],acked:!!state.acked[u.id]})).sort((a,b)=>Number(b.pinned)-Number(a.pinned));
 const unreadReplies=thread.filter(m=>m.from==='couple'&&m.at>(state.seen.questions||'')).length;
 const h=household(g);let members:{name:string;status:string}[]=[];
 if(h){const others=w.guests.filter(x=>x.id!==g.id&&household(x)===h);const rsvps=await readRsvps(others);members=others.map(x=>{const m=mergeGuest(x,rsvps.get(x.id));return {name:m.name,status:rsvpStatus(w,m).label};});}
 const mine=(await photoIndex()).filter(p=>p.guest===g.id&&p.kind==='photo').length;
 const companion=!!g.plusOneAllowed,origin=publicOrigin(req),feed=`${origin}/api/calendar/${encodeURIComponent(g.token)}.ics`;
 const todayEvents=events.filter(e=>e.date&&e.date<=today&&today<=(e.endDate||e.date));
 const required=events.filter(e=>e.rsvpRequired);
 return Response.json({preview,settings:guestSettings(w),events,story:w.story,timezone:TZ_LABEL,today,
  guest:{name:g.name,household:h||'',members,phone:g.phone||'',responses:g.responses||{},meal:g.meal||'',allergy:g.allergy||'',plusOneAllowed:companion,plusOneName:companion?g.plusOneName||'':'',plusOneMeal:companion?g.plusOneMeal||'':'',plusOneAllergy:companion?g.plusOneAllergy||'':'',plusOnePhone:companion?g.plusOnePhone||'':'',song:g.song||'',message:g.message||'',responded:g.responded||''},
  rsvp:{...rsvpStatus(w,g),locked:required.length>0&&required.every(e=>deadlinePassed(e.deadline,now))&&!!g.responded},
  updates,polls:visiblePolls(w,g).map(p=>({id:p.id,question:p.question,options:(p.options||[]).filter(Boolean),answer:state.polls[p.id]||''})),faq:visibleFaq(w).map(f=>({id:f.id,question:f.question,answer:f.answer||''})),
  thread,unreadReplies,accommodation:{...accommodationStatus(w,g,state),request:state.accommodation||null},travel:state.travel||null,lift:state.lift||null,prefs:state.prefs,emailAvailable:emailConfigured(),
  todo:todoList(w,g,state,{unreadReplies},now),photosShared:mine,
  calendar:{feed,webcal:feed.replace(/^https?:/,'webcal:')},
  day:{active:todayEvents.length>0||w.settings.dayMode===true,events:todayEvents,urgent:updates.filter(u=>u.urgent).slice(0,3)}});
}catch(e){return failure(e);}}
const clean=(value:unknown,max:number)=>String(value||'').trim().slice(0,max);
export async function POST(req:Request){try{
 checkOrigin(req);const input=await req.json() as any;
 const {w,g}=await guest(input.token);const now=new Date();
 const name=input.name===undefined?g.name:clean(input.name,150);
 if(!name)throw new HttpError(400,'Please enter your full name.');
 const phone=clean(input.phone===undefined?g.phone:input.phone,50);
 // Replies are needed for the published events this guest is invited to; other answers stay as they were.
 const events=visibleEvents(w,g),previous=g.responses||{},responses:any={...previous};
 for(const e of events){const answer=input.responses?.[e.id];
  if(!['yes','no'].includes(answer)){if(rsvpRequired(e))throw new HttpError(400,'Please reply to every event.');continue;}
  if(previous[e.id]&&previous[e.id]!==answer&&deadlinePassed(eventDeadline(w,e),now))throw new HttpError(400,`The reply date for ${e.name} has passed. Please send us a message in “Ask us” and we’ll update it for you.`);
  responses[e.id]=answer;}
 const attending=events.some(e=>responses[e.id]==='yes'),meal=clean(input.meal,100),meals=String(w.settings.mealOptions).split(',').map(s=>s.trim());
 if(attending&&!meals.includes(meal))throw new HttpError(400,'Please select a meal.');
 if(g.plusOneAllowed&&attending&&input.bringPlusOne===true&&!clean(input.plusOneName,150))throw new HttpError(400,'Please enter your plus-one’s full name.');
 const companion=!!g.plusOneAllowed&&attending&&input.bringPlusOne!==false&&!!clean(input.plusOneName,150);
 if(companion&&!meals.includes(input.plusOneMeal))throw new HttpError(400,'Please select a meal for your plus-one.');
 const required=events.filter(rsvpRequired),locked=required.length>0&&required.every(e=>deadlinePassed(eventDeadline(w,e),now))&&!!g.responded;
 if(locked&&((g.meal||'')!==meal||(companion?clean(input.plusOneName,150):'')!==(g.plusOneName||'')))throw new HttpError(400,'The reply date has passed, so meals and plus-ones can no longer be changed here. Please send us a message in “Ask us”.');
 // Saved in this guest's own record, so replies from different guests never overwrite each other.
 // Seating for events they decline is dropped automatically when the wedding is read.
 const fields={name,phone,responses,meal,allergy:clean(input.allergy,1000),song:clean(input.song,500),message:clean(input.message,1000),plusOneName:companion?clean(input.plusOneName,150):'',plusOneMeal:companion?clean(input.plusOneMeal,100):'',plusOneAllergy:companion?clean(input.plusOneAllergy,1000):'',plusOnePhone:companion?clean(input.plusOnePhone,50):'',responded:new Date().toISOString()};
 await saveRsvp(g.id,fields);
 // Tell the couple about new replies and changed answers that matter for planning.
 const said=(a:string)=>a==='yes'?'attending':'not attending',changes:string[]=[];
 for(const e of events)if(responses[e.id]&&previous[e.id]!==responses[e.id])changes.push(`${e.name}: ${previous[e.id]?said(previous[e.id])+' → ':''}${said(responses[e.id])}`);
 if(g.responded){if((g.meal||'')!==meal)changes.push(`Meal: ${g.meal||'none'} → ${meal||'none'}`);if((g.allergy||'')!==fields.allergy)changes.push('Dietary requirements updated');if((g.plusOneName||'')!==fields.plusOneName)changes.push(fields.plusOneName?`Plus-one: ${fields.plusOneName}`:'Plus-one removed');}
 if(changes.length)await logActivity({actor:'guest',type:g.responded?'rsvp-changed':'rsvp',guestId:g.id,guestName:name,summary:`${name} ${g.responded?'changed their RSVP':'replied'}: ${changes.join('; ')}`,important:true});
 return Response.json({saved:true,guest:{name:fields.name,phone:fields.phone,plusOneAllowed:!!g.plusOneAllowed,plusOneName:fields.plusOneName,plusOneMeal:fields.plusOneMeal,plusOneAllergy:fields.plusOneAllergy,plusOnePhone:fields.plusOnePhone},message:'Your RSVP has been saved. You can return to this link to update it.'});
}catch(e){return failure(e);}}
