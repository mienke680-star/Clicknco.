import {planner,guest,failure,HttpError} from '@/lib/server';
import {readMeta,readRange,CHUNK_SIZE} from '@/lib/media';
type Context={params:Promise<{id:string}>};
async function serve(req:Request,{params}:Context){try{
 const {id}=await params;const token=new URL(req.url).searchParams.get('token');let allowed=false;
 if(token){const {w}=await guest(token);const publicAsset=[w.settings.cover,w.settings.music,w.settings.video,...w.story.map(x=>x.image)].includes('/api/media/'+id);if(publicAsset)allowed=true;else if(w.settings.photoWall){const meta=await readMeta(id);allowed=!!meta?.complete&&meta.kind==='photo';}}
 if(!allowed)await planner(req);
 const metadata=await readMeta(id);if(!metadata?.complete)throw new HttpError(404,'This file was not found.');
 const etag=`"${metadata.id}-${metadata.size}"`;
 const headers=new Headers({'Content-Type':metadata.mime||'application/octet-stream','Cache-Control':'private, max-age=300','Netlify-CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Accept-Ranges':'bytes','Content-Length':String(metadata.size),ETag:etag});
 if(req.method==='HEAD')return new Response(null,{headers});
 // iPhone playback probes bytes 0–1 before fetching or seeking through video.
 const rangeHeader=req.headers.get('range'),ifRange=req.headers.get('if-range');
 const size=metadata.size;let start=0,end=size-1,partial=false;
 if(rangeHeader&&(!ifRange||ifRange===etag)){
  const match=/^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if(match&&(match[1]||match[2])){
   start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
   end=match[1]&&match[2]?Math.min(Number(match[2]),size-1):size-1;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start){headers.set('Content-Range',`bytes */${size}`);headers.set('Content-Length','0');return new Response(null,{status:416,headers});}
   // Keep each partial response small; media players request the next range automatically.
   end=Math.min(end,start+CHUNK_SIZE-1);partial=true;
   headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));
  }
 }
 // Partial responses (at most one part) are sent whole so Netlify keeps an exact Content-Length,
 // which iPhone video playback relies on; full downloads stream part by part.
 if(partial)return new Response(await new Response(readRange(metadata,start,end)).arrayBuffer(),{status:206,headers});
 return new Response(readRange(metadata,start,end),{status:200,headers});
}catch(e){return failure(e);}}
export const GET=serve;
export const HEAD=serve;
