import {planner,guest,failure,checkOrigin,photoIndex,removePhoto,addPhoto,HttpError} from '@/lib/server';
import {deleteMedia,readMeta,writeMeta} from '@/lib/media';
import {logActivity} from '@/lib/hub-store';
// Uploads go through /api/upload in parts; this route lists, moderates and removes gallery items.
// Guests see approved photos only (plus their own, with their status); the couple sees everything.
const view=(p:any)=>({id:p.id,name:p.name,created:p.created,mime:p.mime,status:p.status||'approved',official:!!p.official});
export async function GET(req:Request){try{
 const token=new URL(req.url).searchParams.get('token');const all=(await photoIndex()).filter(p=>p.kind==='photo').sort((a,b)=>b.created.localeCompare(a.created));
 if(token){const {w,g}=await guest(token);const mine=all.filter(p=>p.guest===g.id).map(view);
  const shared=all.filter(p=>(p.status||'approved')==='approved'&&(w.settings.photoWall||p.official)).map(view);
  return Response.json({photos:shared,mine});}
 await planner(req);return Response.json({photos:all.map(view)});
}catch(e){return failure(e);}}
export async function PATCH(req:Request){try{
 checkOrigin(req);await planner(req);const {id,status}=await req.json() as any;
 if(!['approved','rejected','pending'].includes(status))throw new HttpError(400,'Choose approve or reject.');
 const meta=await readMeta(String(id||''));if(!meta?.complete||meta.kind!=='photo')throw new HttpError(404,'This photo was not found.');
 meta.moderation=status;await writeMeta(meta);
 const record=(await photoIndex()).find(p=>p.id===meta.id);if(record)await addPhoto({...record,status});
 await logActivity({actor:'couple',type:'photo-moderation',guestId:meta.guestId,summary:`Photo by ${meta.name} ${status}`});
 return Response.json({id:meta.id,status});
}catch(e){return failure(e);}}
export async function DELETE(req:Request){try{checkOrigin(req);await planner(req);const {id}=await req.json() as any;if(typeof id!=='string')throw new Error('Choose a file to remove.');await deleteMedia(id);await removePhoto(id);return Response.json({deleted:true});}catch(e){return failure(e);}}
