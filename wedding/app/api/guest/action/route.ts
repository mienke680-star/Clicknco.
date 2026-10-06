import {guest,failure,checkOrigin,HttpError} from '@/lib/server';
import {visibleUpdates,visiblePolls,normalisePhone} from '@/lib/hub';
import {updateGuestState,postMessage,logActivity} from '@/lib/hub-store';
import {emailConfigured} from '@/lib/providers';
// Everything a guest can do besides the RSVP form. Each guest writes only their own records.
const clean=(v:unknown,max:number)=>String(v??'').trim().slice(0,max);
const date=(v:unknown)=>{const s=clean(v,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';};
export async function POST(req:Request){try{
 checkOrigin(req);const input=await req.json() as any;const {w,g}=await guest(input.token);const now=new Date().toISOString();
 switch(input.action){
  // Opening an update is recorded separately from explicitly confirming it ("Got it").
  case 'open-update':{const u=visibleUpdates(w,g).find(x=>x.id===input.id);if(!u)throw new HttpError(404,'This update is not available.');await updateGuestState(g.id,s=>s.opened[u.id]?s:{...s,opened:{...s.opened,[u.id]:now}});return Response.json({opened:true});}
  case 'ack-update':{const u=visibleUpdates(w,g).find(x=>x.id===input.id);if(!u)throw new HttpError(404,'This update is not available.');if(!u.requireAck)throw new HttpError(400,'This update does not need a confirmation.');
   let first=false;await updateGuestState(g.id,s=>{first=!s.acked[u.id];return {...s,opened:{...s.opened,[u.id]:s.opened[u.id]||now},acked:{...s.acked,[u.id]:s.acked[u.id]||now}};});
   if(first)await logActivity({actor:'guest',type:'ack',guestId:g.id,guestName:g.name,summary:`${g.name} confirmed “${u.heading}”`});return Response.json({acked:true});}
  case 'seen':{const what=input.what==='questions'?'questions':'notices';await updateGuestState(g.id,s=>({...s,seen:{...s.seen,[what]:now}}));return Response.json({seen:true});}
  case 'prefs':{let emailAddress='',email=false;
   if(emailConfigured()&&input.email){emailAddress=clean(input.emailAddress,200);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress))throw new HttpError(400,'Please enter a valid email address.');email=true;}
   await updateGuestState(g.id,s=>({...s,prefs:{whatsapp:input.whatsapp!==false,email,emailAddress}}));return Response.json({saved:true});}
  case 'accommodation':{const wanted=input.wanted==='yes'?'yes':'no';const people=Math.min(20,Math.max(1,Number.parseInt(input.people,10)||1));
   const request={wanted,people:wanted==='yes'?people:undefined,from:wanted==='yes'?date(input.from):'',to:wanted==='yes'?date(input.to):'',notes:clean(input.notes,1000),updatedAt:now} as any;
   if(request.from&&request.to&&request.to<request.from)throw new HttpError(400,'Your departure date is before your arrival date.');
   await updateGuestState(g.id,s=>({...s,accommodation:request}));
   await logActivity({actor:'guest',type:'accommodation',guestId:g.id,guestName:g.name,summary:wanted==='yes'?`${g.name} requested accommodation for ${people} ${people===1?'person':'people'}${request.from?` (${request.from} – ${request.to||'?'})`:''}`:`${g.name} doesn’t need accommodation`,important:wanted==='yes'});
   return Response.json({saved:true});}
  case 'travel':{const travel={arrive:date(input.arrive),depart:date(input.depart),transport:clean(input.transport,300),notes:clean(input.notes,1000),updatedAt:now};
   if(travel.arrive&&travel.depart&&travel.depart<travel.arrive)throw new HttpError(400,'Your departure date is before your arrival date.');
   await updateGuestState(g.id,s=>({...s,travel}));await logActivity({actor:'guest',type:'travel',guestId:g.id,guestName:g.name,summary:`${g.name} shared travel plans: ${[travel.arrive&&'arrives '+travel.arrive,travel.depart&&'leaves '+travel.depart,travel.transport].filter(Boolean).join(', ')||'updated'}`,important:!!travel.transport});
   return Response.json({saved:true});}
  // Lift details are shared with other guests only when this guest explicitly agrees.
  case 'lift':{const mode=['offer','need'].includes(input.mode)?input.mode:'none';const share=mode!=='none'&&input.share===true;const contact=share?clean(input.contact,50):'';
   if(share&&!normalisePhone(contact))throw new HttpError(400,'Add a phone number other guests can use, or untick sharing.');
   await updateGuestState(g.id,s=>({...s,lift:{mode,seats:mode==='offer'?Math.min(8,Math.max(1,Number.parseInt(input.seats,10)||1)):undefined,from:clean(input.from,120),share,contact,updatedAt:now}}));
   if(mode!=='none')await logActivity({actor:'guest',type:'lift',guestId:g.id,guestName:g.name,summary:`${g.name} ${mode==='offer'?'offered':'asked for'} a lift${input.from?' from '+clean(input.from,120):''}${share?' (shared with other guests)':' (private)'}`});
   return Response.json({saved:true});}
  case 'poll':{const p=visiblePolls(w,g).find(x=>x.id===input.pollId);if(!p)throw new HttpError(404,'This poll is closed.');const answer=clean(input.answer,200);if(!(p.options||[]).includes(answer))throw new HttpError(400,'Choose one of the options.');
   await updateGuestState(g.id,s=>({...s,polls:{...s.polls,[p.id]:answer}}));return Response.json({saved:true});}
  case 'question':{const text=clean(input.text,2000);if(text.length<2)throw new HttpError(400,'Please write your question.');
   const m=await postMessage(g.id,'guest',text);await logActivity({actor:'guest',type:'question',guestId:g.id,guestName:g.name,summary:`${g.name} asked: ${text.slice(0,140)}`,important:true});return Response.json({message:m});}
  default:throw new HttpError(400,'Unknown action.');
 }
}catch(e){return failure(e);}}
