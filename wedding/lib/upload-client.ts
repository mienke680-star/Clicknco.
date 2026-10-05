// Browser helpers for Netlify's ~6 MB request/response limits: files travel in parts.
async function call(url:string,init:RequestInit){const r=await fetch(url,init);const d=await r.json().catch(()=>({})) as any;if(!r.ok)throw Error(d.error||'Upload failed. Please try again.');return d;}
const post=(body:object)=>call('/api/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export type UploadOptions={token?:string;kind?:'photo'|'asset';type?:string;transfer?:{id:string;name?:string;guest?:string;created?:string};onProgress?:(fraction:number)=>void};
export async function uploadFile(file:Blob,options:UploadOptions={}):Promise<{id:string;url:string;name:string;exists?:boolean}>{
 const {token='',kind='photo',transfer,onProgress}=options;const type=options.type||file.type;
 const start=await post({action:'start',token,type,size:file.size,kind,...(transfer?{import:true,...transfer}:{})});
 if(start.exists)return {id:start.id,url:'/api/media/'+start.id,name:transfer?.name||'',exists:true};
 const parts=Math.max(1,Math.ceil(file.size/start.chunkSize));
 for(let part=0;part<parts;part++){
  const body=file.slice(part*start.chunkSize,Math.min(file.size,(part+1)*start.chunkSize));
  const query=new URLSearchParams({id:start.id,part:String(part)});if(token)query.set('token',token);
  for(let attempt=0;;attempt++){try{await call('/api/upload?'+query,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body});break;}catch(e){if(attempt>=2)throw e;await new Promise(r=>setTimeout(r,800*(attempt+1)));}}
  onProgress?.((part+1)/parts);
 }
 return await post({action:'finish',id:start.id,token});
}
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
