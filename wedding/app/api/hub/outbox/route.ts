import {planner,failure,checkOrigin,HttpError} from '@/lib/server';
import {listBatches,readRecipientStates,readRecipientState,writeRecipientState,readBatch,logActivity} from '@/lib/hub-store';
import {updateBatch,inviteBatch,runScheduler} from '@/lib/notify';
import {isLive} from '@/lib/hub';
import {providerStatus,emailConfigured,whatsappConfigured} from '@/lib/providers';
import {publicOrigin} from '@/lib/origin';
// Couple-only message centre: message batches and each recipient's state. Without a provider,
// WhatsApp messages stay "ready to send" until the couple sends them and marks them sent.
export async function GET(req:Request){try{
 await planner(req);const batches=await listBatches();
 const out=await Promise.all(batches.map(async b=>{const states=await readRecipientStates(b);return {...b,recipients:b.recipients.map(r=>{const s=states.get(`${r.guestId}~${r.channel}`)!;return {...r,...s,automatic:r.channel==='email'?emailConfigured():whatsappConfigured()};})};}));
 return Response.json({batches:out,providers:providerStatus()},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
export async function POST(req:Request){try{
 checkOrigin(req);const {w}=await planner(req);const input=await req.json() as any,origin=publicOrigin(req);
 if(input.action==='notify-update'){const u=w.updates.find(x=>x.id===input.updateId);if(!u)throw new HttpError(404,'Update not found.');if(!isLive(u))throw new HttpError(400,'Publish the update before preparing messages.');const res=await updateBatch(w,u,origin,'couple');return Response.json({batch:res.batch.id,created:res.created});}
 if(input.action==='invite'){
  // Guests who already received their link (sent or accepted) are left out unless explicitly included.
  const done=new Set<string>();for(const b of (await listBatches()).filter(b=>b.kind==='invite')){const states=await readRecipientStates(b);for(const r of b.recipients){const s=states.get(`${r.guestId}~${r.channel}`)!;if(['sent_manually','accepted'].includes(s.status))done.add(r.guestId);}}
  const ids:string[]=Array.isArray(input.guestIds)&&input.guestIds.length?input.guestIds:w.guests.map(g=>g.id);
  const guests=w.guests.filter(g=>ids.includes(g.id)&&(input.includeSent||!done.has(g.id)));if(!guests.length)throw new HttpError(400,'Everyone selected has already been sent their invitation link.');
  const res=await inviteBatch(w,guests,origin,`invite-${Date.now()}`);await logActivity({actor:'couple',type:'notify',summary:`Invitation messages prepared for ${guests.length} guest(s)`});return Response.json({batch:res.batch.id});}
 if(input.action==='mark'){
  const b=await readBatch(String(input.batchId||''));if(!b)throw new HttpError(404,'Message not found.');const r=b.recipients.find(x=>x.guestId===input.guestId&&x.channel===input.channel);if(!r)throw new HttpError(404,'Recipient not found.');
  const cur:any=await readRecipientState(b.id,r)||{status:'pending',attempts:0};
  // Only the couple can say a manual message was sent; "accepted" only ever comes from a provider.
  if(!['sent_manually','skipped','pending'].includes(input.status))throw new HttpError(400,'Choose sent, skip or retry.');
  if(input.status==='pending'&&!['failed','skipped','sent_manually'].includes(cur.status))throw new HttpError(400,'Only failed, skipped or marked messages can be retried.');
  if(cur.status==='sending'||cur.status==='accepted')throw new HttpError(409,'This message is already with the delivery provider.');
  const s=await writeRecipientState(b.id,r,{status:input.status,attempts:cur.attempts||0,error:input.status==='pending'?undefined:cur.error,by:'couple'});return Response.json({state:s});}
 if(input.action==='process'){const result=await runScheduler(new Date(),origin);return Response.json(result);}
 throw new HttpError(400,'Unknown action.');
}catch(e){return failure(e);}}
