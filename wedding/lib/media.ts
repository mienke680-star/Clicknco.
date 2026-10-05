import {mediaStore} from './store';
// Netlify Functions accept request bodies of about 6 MB, so files are uploaded and stored as
// 3 MB parts. Each response carries at most a few parts, which keeps video byte ranges fast.
export const CHUNK_SIZE=3*1024*1024;
export const MEDIA_TYPES=['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','video/mp4'];
export type MediaMeta={id:string;mime:string;size:number;chunkSize:number;parts:number;uploader:string;kind:'photo'|'asset';name:string;guestId:string;created:string;complete:boolean};
export const partCount=(size:number,chunkSize=CHUNK_SIZE)=>Math.max(1,Math.ceil(size/chunkSize));
export async function readMeta(id:string):Promise<MediaMeta|null>{if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))return null;return await mediaStore().get(id+'/meta',{type:'json'});}
export async function writeMeta(meta:MediaMeta,options?:{onlyIfNew:true}){return await mediaStore().setJSON(meta.id+'/meta',meta,options);}
export async function putPart(id:string,part:number,bytes:ArrayBuffer){await mediaStore().set(`${id}/${part}`,bytes);}
export async function hasAllParts(meta:MediaMeta){const store=mediaStore();for(let n=0;n<meta.parts;n++){if(!await store.getMetadata(`${meta.id}/${n}`))return false;}return true;}
export async function deleteMedia(id:string){const meta=await readMeta(id);const store=mediaStore();if(meta)for(let n=0;n<meta.parts;n++)await store.delete(`${id}/${n}`);await store.delete(id+'/meta');}
// Streams bytes [start, end] (inclusive) by reading only the parts that overlap the range.
export function readRange(meta:MediaMeta,start:number,end:number){
 const store=mediaStore();let position=start;
 return new ReadableStream<Uint8Array>({async pull(controller){
  if(position>end){controller.close();return;}
  const part=Math.floor(position/meta.chunkSize),partStart=part*meta.chunkSize;
  const data=await store.get(`${meta.id}/${part}`,{type:'arrayBuffer'});
  if(!data){controller.error(new Error('Missing media part.'));return;}
  const bytes=new Uint8Array(data).subarray(position-partStart,Math.min(end-partStart+1,data.byteLength));
  if(!bytes.length){controller.error(new Error('Incomplete media part.'));return;}
  position+=bytes.length;controller.enqueue(bytes);
 }});
}
