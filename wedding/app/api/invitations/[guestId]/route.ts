import {planner,failure,HttpError} from '@/lib/server';
import {ensureInvitation,pdfFileName} from '@/lib/invitations';
import {publicOrigin} from '@/lib/origin';
// Couple only: returns one guest's personalised PDF (preview inline or download). PDFs are never
// listed and never served to guests.
export async function GET(req:Request,{params}:{params:Promise<{guestId:string}>}){try{
 const {w}=await planner(req);const {guestId}=await params;const g=w.guests.find(x=>x.id===guestId);if(!g)throw new HttpError(404,'This guest was not found.');
 const result=await ensureInvitation(w,g,publicOrigin(req),true);const name=pdfFileName(g);
 const disposition=new URL(req.url).searchParams.get('download')?'attachment':'inline';
 return new Response(result.bytes as BodyInit,{headers:{'Content-Type':'application/pdf','Content-Disposition':`${disposition}; filename="${name.replace(/[^\x20-\x7e]/g,'_').replace(/"/g,'')}"; filename*=UTF-8''${encodeURIComponent(name)}`,'Cache-Control':'private, no-store','X-Invitation-Status':result.status,'X-Invitation-Link':result.link,'X-Content-Type-Options':'nosniff'}});
}catch(e){return failure(e);}}
