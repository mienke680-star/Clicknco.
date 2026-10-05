'use client';
import {useEffect,useState} from 'react';
import {Heart} from 'lucide-react';
import {readZip,readManifest,mediaReferences,TRANSFER_FORMAT} from '@/lib/transfer';
import {uploadFile,fetchMediaBytes} from '@/lib/upload-client';
import {zipFiles} from '@/lib/zip';
type Link={name:string;url:string};
export default function Transfer(){
 const [state,setState]=useState<{exists:boolean;guests:number}|null>(null),[files,setFiles]=useState<File[]>([]),[replace,setReplace]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[links,setLinks]=useState<Link[]>([]);
 useEffect(()=>{fetch('/api/transfer').then(r=>r.json()).then(d=>setState(d)).catch(()=>setError('Could not check this website. Refresh and try again.'));},[]);
 async function importWedding(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{
  setStatus('Reading the transfer files…');const entries=new Map<string,Uint8Array>();
  for(const file of files)readZip(new Uint8Array(await file.arrayBuffer()),entries);
  const manifest=readManifest(entries);
  let done=0;for(const p of manifest.photos){
   setStatus(`Uploading media ${done+1} of ${manifest.photos.length}…`);
   const bytes=entries.get('media/'+p.id)!;
   await uploadFile(new Blob([bytes as BlobPart]),{type:(p.mime||'application/octet-stream').split(';')[0].trim(),kind:p.kind==='photo'?'photo':'asset',transfer:{id:p.id,name:p.name,guest:p.guest,created:p.created}});done++;
  }
  setStatus('Saving your wedding details…');
  const r=await fetch('/api/transfer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({w:manifest.w,photos:manifest.photos,replace})}),d=await r.json() as any;if(!r.ok)throw Error(d.error);
  setStatus(`Transfer complete: ${d.guests} guest${d.guests===1?"":"s"} and ${d.media} media file${d.media===1?"":"s"}. Personal invitation links keep the same codes on this new address.`);setState({exists:true,guests:d.guests});
 }catch(e:any){setError(e.message);setStatus('');}finally{setBusy(false);}}
 async function backup(){setBusy(true);setError('');setLinks([]);try{
  const get=async(path:string)=>{const r=await fetch(path);const d=await r.json() as any;if(!r.ok)throw Error(d.error);return d;};
  const {w}=await get('/api/wedding'),gallery=(await get('/api/photos')).photos||[];
  const items=new Map<string,any>(gallery.map((p:any)=>[p.id,{...p,kind:'photo',guest:'imported'}]));
  for(const id of mediaReferences(w))if(!items.has(id))items.set(id,{id,name:'Wedding asset',kind:'asset',guest:'couple',created:new Date().toISOString()});
  const prepared:Link[]=[],records:any[]=[];let batch:{name:string;bytes:Uint8Array}[]=[],size=0,part=1;
  const flush=()=>{if(batch.length){prepared.push({name:`wedding-transfer-media-${part++}.zip`,url:URL.createObjectURL(zipFiles(batch))});batch=[];size=0;}};
  for(const record of items.values()){setStatus(`Preparing file ${records.length+1} of ${items.size}…`);const {bytes,type}=await fetchMediaBytes('/api/media/'+record.id);record.mime=type;if(size+bytes.length>50000000&&batch.length)flush();batch.push({name:'media/'+record.id,bytes});size+=bytes.length;records.push(record);}
  flush();
  const manifest={format:TRANSFER_FORMAT,exported:new Date().toISOString(),w,photos:records};
  prepared.unshift({name:'wedding-transfer-data.zip',url:URL.createObjectURL(zipFiles([{name:'migration-manifest.json',bytes:new TextEncoder().encode(JSON.stringify(manifest))}]))});
  setLinks(prepared);setStatus('Backup ready. Download EVERY file below and keep them private: they include guest details and invitation links.');
 }catch(e:any){setError(e.message);setStatus('');}finally{setBusy(false);}}
 return <main className="couple-login transfer-page"><section><Heart size={30}/><span className="eyebrow">MIENKE & LUVHAN</span><h1>Transfer &amp; backup</h1>
  <h2>Bring in our existing wedding</h2>
  <p>On the old website, sign in as the couple and run the export tool (<code>scripts/export-current-wedding.js</code>) to download one data ZIP and one or more media ZIPs. Select all of them here together.</p>
  {state?.exists&&<p role="status">This website already has a wedding with {state.guests} guest{state.guests===1?'':'s'}. Download a backup below before replacing it.</p>}
  <form onSubmit={importWedding}><label>Transfer ZIP files<input type="file" accept=".zip,application/zip" multiple required disabled={busy} onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label>
   {state?.exists&&<label className="transfer-check"><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/><span>Replace the wedding on this website</span></label>}
   <button className="button" disabled={busy||!files.length||(!!state?.exists&&!replace)} type="submit">{busy?'Working…':'Start transfer'}</button></form>
  <h2>Download a full backup</h2>
  <p>Creates the same ZIP files from this website, including guest replies and every uploaded photo, video and song.</p>
  <button className="button outline" type="button" disabled={busy} onClick={backup}>Prepare backup</button>
  {status&&<p role="status">{status}</p>}{error&&<p role="alert" className="transfer-error">{error}</p>}
  {links.map(l=><a key={l.name} className="transfer-link" href={l.url} download={l.name}>Download {l.name}</a>)}
  <small><a href="/">← Back to our wedding studio</a></small>
 </section></main>;
}
