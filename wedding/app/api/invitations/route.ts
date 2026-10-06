import {planner,failure,checkOrigin,HttpError} from '@/lib/server';
import {ensureInvitation,removeOrphanInvitations} from '@/lib/invitations';
import {publicOrigin} from '@/lib/origin';
// Couple only: makes sure each listed guest has an up-to-date PDF (generated once, then reused).
export async function POST(req:Request){try{
 checkOrigin(req);const {w}=await planner(req);const input=await req.json().catch(()=>({})) as any;
 const ids:string[]=Array.isArray(input.guestIds)?input.guestIds.map(String).slice(0,25):[];if(!ids.length)throw new HttpError(400,'Choose a guest.');
 const origin=publicOrigin(req),results=[];
 for(const id of ids){const g=w.guests.find(x=>x.id===id);if(!g){results.push({guestId:id,error:'This guest was not found. Save the guest first.'});continue;}
  try{const {bytes:_,...r}=await ensureInvitation(w,g,origin);results.push(r);}catch(e){console.error(e);results.push({guestId:id,error:'The invitation PDF could not be created. Please try again.'});}}
 await removeOrphanInvitations(w).catch(()=>{});
 return Response.json({results},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
