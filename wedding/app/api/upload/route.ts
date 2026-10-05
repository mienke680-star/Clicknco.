import {planner,guest,failure,checkOrigin,HttpError,photoIndex,addPhoto} from '@/lib/server';
import {CHUNK_SIZE,MEDIA_TYPES,partCount,readMeta,writeMeta,putPart,hasAllParts,type MediaMeta} from '@/lib/media';
const GUEST_PHOTO_LIMIT=500;
// Couple uploads use the signed-in session; guest uploads use their personal invitation token.
async function uploader(req:Request,token:string){if(token){const {g}=await guest(token);return {uploader:'guest:'+g.id,guestId:String(g.id),name:String(g.name)};}await planner(req);return {uploader:'couple',guestId:'couple',name:'The couple'};}
async function authorise(req:Request,meta:MediaMeta,token:string){const who=await uploader(req,token);if(who.uploader!==meta.uploader)throw new HttpError(403,'This upload belongs to someone else.');}
export async function POST(req:Request){try{
 checkOrigin(req);const input=await req.json() as any;const token=String(input.token||'');
 if(input.action==='start'){
  const who=await uploader(req,token);const type=String(input.type||''),size=Number(input.size);
  if(input.import===true){
   // Transfer from the previous website: keeps the original media IDs so existing links still work.
   if(who.uploader!=='couple')throw new HttpError(403,'Only the couple can transfer media.');
   const id=String(input.id||'');if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw new HttpError(400,'Invalid media identifier.');
   if(!/^(image|audio|video)\/[\w.+-]+$/.test(type)||type.includes('svg')||!Number.isSafeInteger(size)||size<1||size>250000000)throw new HttpError(400,'Unsupported media file '+id+'.');
   const existing=await readMeta(id);if(existing?.complete)return Response.json({id,exists:true,chunkSize:existing.chunkSize});
   await writeMeta({id,mime:type,size,chunkSize:CHUNK_SIZE,parts:partCount(size),uploader:'couple',kind:input.kind==='photo'?'photo':'asset',name:String(input.name||'Wedding asset').slice(0,150),guestId:String(input.guest||'imported').slice(0,100),created:String(input.created||new Date().toISOString()).slice(0,40),complete:false});
   return Response.json({id,chunkSize:CHUNK_SIZE});
  }
  if(!MEDIA_TYPES.includes(type)||!Number.isSafeInteger(size)||size<1||size>(type==='video/mp4'&&!token?50000000:10000000))throw new HttpError(400,'Choose a photo or audio file under 10 MB, or an MP4 video under 50 MB.');
  if(token&&!type.startsWith('image/'))throw new HttpError(400,'Guests can upload photos only.');
  if(token&&(await photoIndex()).filter(p=>p.kind==='photo').length>=GUEST_PHOTO_LIMIT)throw new HttpError(400,'This wedding has reached its 500-photo limit.');
  const id=crypto.randomUUID();
  await writeMeta({id,mime:type,size,chunkSize:CHUNK_SIZE,parts:partCount(size),uploader:who.uploader,kind:!token&&input.kind==='asset'?'asset':'photo',name:who.name,guestId:who.guestId,created:new Date().toISOString(),complete:false},{onlyIfNew:true});
  return Response.json({id,chunkSize:CHUNK_SIZE});
 }
 if(input.action==='finish'){
  const meta=await readMeta(String(input.id||''));if(!meta)throw new HttpError(404,'This upload was not found.');await authorise(req,meta,token);
  if(!meta.complete){if(!await hasAllParts(meta))throw new HttpError(400,'The upload is incomplete. Please try again.');meta.complete=true;await writeMeta(meta);}
  await addPhoto({id:meta.id,guest:meta.guestId,name:meta.name,mime:meta.mime,kind:meta.kind,created:meta.created},meta.uploader==='couple'?undefined:GUEST_PHOTO_LIMIT);
  return Response.json({id:meta.id,url:'/api/media/'+meta.id,name:meta.name});
 }
 throw new HttpError(400,'Unknown upload step.');
}catch(e){return failure(e);}}
export async function PUT(req:Request){try{
 checkOrigin(req);const params=new URL(req.url).searchParams;
 const meta=await readMeta(params.get('id')||'');if(!meta||meta.complete)throw new HttpError(404,'This upload was not found.');await authorise(req,meta,params.get('token')||'');
 const part=Number(params.get('part'));if(!Number.isInteger(part)||part<0||part>=meta.parts)throw new HttpError(400,'Invalid upload part.');
 const bytes=await req.arrayBuffer();const expected=part<meta.parts-1?meta.chunkSize:meta.size-meta.chunkSize*(meta.parts-1);
 if(bytes.byteLength!==expected)throw new HttpError(400,'The upload was interrupted. Please try again.');
 await putPart(meta.id,part,bytes);return Response.json({saved:part});
}catch(e){return failure(e);}}
