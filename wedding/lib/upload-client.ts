// Browser helpers for Netlify's ~6 MB request/response limits: files travel in parts.
async function call(url:string,init:RequestInit){let r:Response;try{r=await fetch(url,init);}catch{throw Error('The connection dropped during the upload. Please check your internet and try again.');}const d=await r.json().catch(()=>({})) as any;if(!r.ok)throw Error(d.error||'Upload failed. Please try again.');return d;}
const post=(body:object)=>call('/api/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const EXTENSION_TYPES:Record<string,string>={mp4:'video/mp4',m4v:'video/mp4',mp3:'audio/mpeg',m4a:'audio/mp4',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
// Some browsers report an empty or unusual type for valid files; fall back to the file extension.
export function mediaType(file:Blob&{name?:string}){const ext=String(file.name||'').toLowerCase().split('.').pop()||'';const byExt=EXTENSION_TYPES[ext];if(byExt&&(!file.type||file.type==='application/octet-stream'||(byExt==='video/mp4'&&file.type==='video/x-m4v')||(byExt==='audio/mp4'&&file.type==='audio/x-m4a')))return byExt;return file.type;}
export type UploadOptions={token?:string;kind?:'photo'|'asset';type?:string;transfer?:{id:string;name?:string;guest?:string;created?:string};onProgress?:(fraction:number)=>void};
export async function uploadFile(file:Blob,options:UploadOptions={}):Promise<{id:string;url:string;name:string;exists?:boolean}>{
 const {token='',kind='photo',transfer,onProgress}=options;const type=options.type||mediaType(file);
 const start=await post({action:'start',token,type,size:file.size,kind,...(transfer?{import:true,...transfer}:{})});
 if(start.exists){onProgress?.(1);return {id:start.id,url:'/api/media/'+start.id,name:transfer?.name||'',exists:true};}
 const parts=Math.max(1,Math.ceil(file.size/start.chunkSize));let done=0,next=0;onProgress?.(0);
 // Up to three parts at a time, each retried twice, so a 50 MB video uploads quickly and survives a hiccup.
 const worker=async()=>{while(next<parts){const part=next++;
  const body=file.slice(part*start.chunkSize,Math.min(file.size,(part+1)*start.chunkSize));
  const query=new URLSearchParams({id:start.id,part:String(part)});if(token)query.set('token',token);
  for(let attempt=0;;attempt++){try{await call('/api/upload?'+query,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body});break;}catch(e){if(attempt>=2)throw e;await new Promise(r=>setTimeout(r,800*(attempt+1)));}}
  onProgress?.(++done/parts);
 }};
 await Promise.all(Array.from({length:Math.min(3,parts)},worker));
 return await post({action:'finish',id:start.id,token});
}
// Confirms the stored file is really there with the expected size and type before it is used.
export async function confirmStored(url:string,size:number,type:string){const r=await fetch(url,{method:'HEAD'});if(!r.ok)throw Error('The file could not be found after uploading. Please try again.');const length=Number(r.headers.get('content-length')),stored=(r.headers.get('content-type')||'').split(';')[0];if(stored!==type||(r.headers.has('content-length')&&length!==size))throw Error('The file was not stored completely. Please try again.');}
// Downloads a media file in byte ranges, so large videos never exceed a single response limit.
export async function fetchMediaBytes(url:string):Promise<{bytes:Uint8Array;type:string}>{
 const chunks:Uint8Array[]=[];let offset=0,total=Infinity,type='application/octet-stream';
 while(offset<total){
  const r=await fetch(url,{headers:{Range:`bytes=${offset}-`}});
  if(r.status===416&&offset>0)break;
  if(!r.ok)throw Error('Could not download '+url);
  type=r.headers.get('content-type')||type;const bytes=new Uint8Array(await r.arrayBuffer());
  if(r.status!==206){chunks.length=0;chunks.push(bytes);offset=total=bytes.length;break;}
  const match=/\/(\d+)$/.exec(r.headers.get('content-range')||'');total=match?Number(match[1]):offset+bytes.length;
  if(!bytes.length)throw Error('Could not download '+url);chunks.push(bytes);offset+=bytes.length;
 }
 const out=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let p=0;for(const c of chunks){out.set(c,p);p+=c.length;}return {bytes:out,type};
}
