import type {Wedding,RecordItem} from './model';
import {visibleEvents,eventDeadline,isLive,inAudience,normalisePhone,guestLink,updateMessage,reminderMessage,inviteMessage,rsvpRequired,type GuestState} from './hub';
import {createBatch,listBatches,readRecipientStates,writeRecipientState,logActivity,readGuestStates,type Batch,type Recipient} from './hub-store';
import {emailConfigured,whatsappConfigured,sendEmail,sendWhatsApp} from './providers';
import {readRsvps,mergeWedding,storedRow} from './records';
import {sastInstant,addDays,sastToday,deadlinePassed} from './time';
// Builds message batches and delivers what a configured provider can send. Without a provider,
// WhatsApp messages wait in the dashboard for the couple to send themselves; nothing is marked
// sent unless the couple says so or a provider accepted it.
export function recipientsFor(w:Wedding,guests:RecordItem[],states:Map<string,GuestState>,text:(g:RecordItem)=>string,subject:string,link:(g:RecordItem)=>string){
 const recipients:Recipient[]=[],siteOnly:Batch['siteOnly']=[];
 for(const g of guests){const s=states.get(g.id),prefs=s?.prefs||{};let any=false;
  const phone=normalisePhone(g.phone||'');
  if(prefs.whatsapp!==false&&phone){recipients.push({guestId:g.id,name:g.name,channel:'whatsapp',to:phone,text:text(g),link:link(g)});any=true;}
  if(emailConfigured()&&prefs.email&&prefs.emailAddress){recipients.push({guestId:g.id,name:g.name,channel:'email',to:prefs.emailAddress,text:text(g),subject,link:link(g)});any=true;}
  if(!any)siteOnly.push({guestId:g.id,name:g.name,reason:prefs.whatsapp===false?'Prefers updates on the website':phone?'No message channel chosen':'No phone number yet'});}
 return {recipients,siteOnly};
}
export async function updateBatch(w:Wedding,u:RecordItem,origin:string,by:'couple'|'system'){
 const guests=w.guests.filter(g=>inAudience(u.audience,g)),states=await readGuestStates(guests);
 const {recipients,siteOnly}=recipientsFor(w,guests,states,g=>updateMessage(w,g,u,guestLink(origin,g,'#updates')),`${u.kind==='change'?'Change':'Update'} from ${w.settings.names||'Mienke & Luvhan'}: ${u.heading}`,g=>guestLink(origin,g,'#updates'));
 const res=await createBatch({id:`update-${u.id}-v${Number(u.version||1)}`,kind:u.kind==='change'?'change':'update',sourceId:u.id,title:u.heading,createdAt:new Date().toISOString(),createdBy:by,recipients,siteOnly});
 if(res.created)await logActivity({actor:by,type:'notify',summary:`Messages prepared for “${u.heading}” (${recipients.length} to send, ${siteOnly.length} website only)`,important:false});
 return res;
}
export async function inviteBatch(w:Wedding,guests:RecordItem[],origin:string,batchId:string){
 const states=await readGuestStates(guests);
 const {recipients,siteOnly}=recipientsFor(w,guests,states,g=>inviteMessage(w,g,guestLink(origin,g)),`Your invitation from ${w.settings.names||'Mienke & Luvhan'}`,g=>guestLink(origin,g));
 return await createBatch({id:batchId,kind:'invite',sourceId:'invitations',title:'Personal invitation links',createdAt:new Date().toISOString(),createdBy:'couple',recipients,siteOnly});
}
// Sends pending automatic messages. "sending" left over from an interrupted run becomes "failed"
// (never re-sent automatically) so a guest can't receive the same message twice.
export async function deliverPending(fetcher:typeof fetch=fetch){
 let accepted=0,failed=0;const autoEmail=emailConfigured(),autoWa=whatsappConfigured();
 if(!autoEmail&&!autoWa)return {accepted,failed};
 const cutoff=Date.now()-45*864e5;
 for(const batch of await listBatches()){if(Date.parse(batch.createdAt)<cutoff)continue;
  const states=await readRecipientStates(batch);
  for(const r of batch.recipients){const s=states.get(`${r.guestId}~${r.channel}`)!;
   if(!(r.channel==='email'?autoEmail:autoWa))continue;
   if(s.status==='sending'&&Date.now()-Date.parse(s.updatedAt)>10*60*1000){await writeRecipientState(batch.id,r,{status:'failed',attempts:s.attempts,error:'Interrupted while sending. Check with the guest before retrying.'});failed++;continue;}
   if(s.status!=='pending')continue;
   await writeRecipientState(batch.id,r,{status:'sending',attempts:s.attempts+1});
   const result=r.channel==='email'?await sendEmail({to:r.to,subject:r.subject||batch.title,text:r.text,idempotencyKey:`${batch.id}:${r.guestId}`},fetcher):await sendWhatsApp({to:r.to,body:r.text},fetcher);
   if(result.ok){await writeRecipientState(batch.id,r,{status:'accepted',attempts:s.attempts+1,providerId:result.providerId});accepted++;}
   else{await writeRecipientState(batch.id,r,{status:'failed',attempts:s.attempts+1,error:result.error});failed++;}
  }}
 return {accepted,failed};
}
// Runs every 10 minutes (netlify/functions/scheduler.mts) and on demand from the dashboard:
// announces scheduled updates that have gone live, prepares RSVP reminders and delivers messages.
export async function runScheduler(now:Date=new Date(),origin:string=process.env.SITE_URL||process.env.URL||'',fetcher:typeof fetch=fetch){
 const r=await storedRow();const created:string[]=[];if(!r)return {created,accepted:0,failed:0};
 const w=mergeWedding(r.w,await readRsvps(r.w.guests));
 for(const u of w.updates)if(u.status==='scheduled'&&u.notify&&isLive(u,now)){const res=await updateBatch(w,u,origin,'system');if(res.created)created.push(res.batch.id);}
 for(const e of w.events){if(e.status==='draft'||!rsvpRequired(e))continue;const deadline=eventDeadline(w,e);if(!deadline||deadlinePassed(deadline,now))continue;
  for(const days of (e.rsvp?.reminders||[]).map(Number).filter((n:number)=>Number.isInteger(n)&&n>=0&&n<=120)){
   if(now.getTime()<sastInstant(addDays(deadline,-days),'09:00').getTime())continue;
   const guests=w.guests.filter(g=>visibleEvents(w,g).some(x=>x.id===e.id)&&!['yes','no'].includes(g.responses?.[e.id]));if(!guests.length)continue;
   const states=await readGuestStates(guests);
   const {recipients,siteOnly}=recipientsFor(w,guests,states,g=>reminderMessage(w,g,e,guestLink(origin,g,'#rsvp')),`A gentle RSVP reminder: ${e.name}`,g=>guestLink(origin,g,'#rsvp'));
   const res=await createBatch({id:`reminder-${e.id}-${deadline}-${days}`,kind:'reminder',sourceId:e.id,title:`RSVP reminder: ${e.name} (${days} day${days===1?'':'s'} before ${deadline})`,createdAt:now.toISOString(),createdBy:'system',recipients,siteOnly});
   if(res.created){created.push(res.batch.id);await logActivity({actor:'system',type:'reminder',summary:`RSVP reminder prepared for ${e.name}: ${guests.length} guest(s) still to reply`});}
  }}
 const delivery=await deliverPending(fetcher);
 return {created,...delivery,today:sastToday(now)};
}
