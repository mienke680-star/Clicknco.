import {planner,failure,checkOrigin,HttpError} from '@/lib/server';
import {readActivity,readGuestStates,threadIndex,readThread,postMessage,logActivity,readCoupleState,writeCoupleState} from '@/lib/hub-store';
import {providerStatus} from '@/lib/providers';
// Couple-only hub data: what needs attention, the change history, every guest's own requests,
// and private question threads. Guests never reach this route.
export async function GET(req:Request){try{
 const {w}=await planner(req);const params=new URL(req.url).searchParams;
 if(params.get('thread')){const id=params.get('thread')!;if(!w.guests.some(g=>g.id===id))throw new HttpError(404,'Guest not found.');return Response.json({thread:await readThread(id)},{headers:{'Cache-Control':'no-store'}});}
 const [activity,states,threads,couple]=await Promise.all([readActivity(),readGuestStates(w.guests),threadIndex(),readCoupleState()]);
 const names=new Map(w.guests.map(g=>[g.id,g.name]));
 return Response.json({activity:activity.map(a=>({...a,reviewed:!!couple.reviewed[a.id]||(!!couple.reviewedBefore&&a.at<=couple.reviewedBefore)})),
  states:Object.fromEntries(states),threads:[...threads.values()].filter(t=>names.has(t.guestId)).map(t=>({...t,name:names.get(t.guestId),unanswered:t.last==='guest'})).sort((a,b)=>b.lastAt-a.lastAt),
  providers:providerStatus()},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
export async function POST(req:Request){try{
 checkOrigin(req);const {w}=await planner(req);const input=await req.json() as any;
 if(input.action==='review'){const s=await readCoupleState();for(const id of (input.ids||[]).slice(0,500))s.reviewed[String(id)]=new Date().toISOString();await writeCoupleState(s);return Response.json({saved:true});}
 if(input.action==='review-all'){const s=await readCoupleState();s.reviewedBefore=new Date().toISOString();s.reviewed={};await writeCoupleState(s);return Response.json({saved:true});}
 if(input.action==='reply'){const g=w.guests.find(x=>x.id===input.guestId);if(!g)throw new HttpError(404,'Guest not found.');const text=String(input.text||'').trim().slice(0,2000);if(!text)throw new HttpError(400,'Write a reply first.');
  const m=await postMessage(g.id,'couple',text);await logActivity({actor:'couple',type:'reply',guestId:g.id,guestName:g.name,summary:`We replied to ${g.name}`});return Response.json({message:m});}
 if(input.action==='log'){const summary=String(input.summary||'').slice(0,500);if(!summary)throw new HttpError(400,'Nothing to record.');await logActivity({actor:'couple',type:String(input.type||'change').slice(0,40),summary,details:input.details??undefined,important:true});return Response.json({saved:true});}
 throw new HttpError(400,'Unknown action.');
}catch(e){return failure(e);}}
