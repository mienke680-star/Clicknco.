'use client';
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {mediaType,confirmStored} from '@/lib/upload-client';
type Props={label:string;noun:string;accept:string;types:string[];maxBytes:number;limitText:string;value:string;
 upload:(file:File,onProgress:(fraction:number)=>void)=>Promise<string>;persist:(url:string)=>Promise<void>};
// Uploads one invitation file (cover, video or music), saves its reference to the wedding straight away,
// and only reports success once the stored file and the saved setting have both been confirmed.
export function MediaField({label,noun,accept,types,maxBytes,limitText,value,upload,persist}:Props){
 const [progress,setProgress]=useState<number|null>(null),[removing,setRemoving]=useState(false),[status,setStatus]=useState<{ok:boolean;text:string}|null>(null),input=useRef<HTMLInputElement>(null);
 const busy=progress!==null||removing;
 async function choose(file?:File){
  if(!file)return;setStatus(null);
  const type=mediaType(file);
  try{
   if(!types.includes(type))throw Error(`Please choose ${limitText}.`);
   if(!file.size)throw Error('This file is empty. Please choose another one.');
   if(file.size>maxBytes)throw Error(`This file is ${(file.size/1e6).toFixed(1)} MB. Please choose ${limitText}.`);
   setProgress(0);
   const url=await upload(file,f=>setProgress(Math.min(0.97,f)));
   await confirmStored(url,file.size,type);
   await persist(url);
   setProgress(1);setStatus({ok:true,text:`${noun} saved. It now appears in your invitation preview and in every guest’s invitation.`});
  }catch(e:any){setStatus({ok:false,text:e.message||'Upload failed. Please try again.'});}
  finally{setProgress(null);if(input.current)input.current.value='';}
 }
 async function remove(){setStatus(null);setRemoving(true);try{await persist('');setStatus({ok:true,text:`${noun} removed from your invitation.`});}catch(e:any){setStatus({ok:false,text:e.message});}finally{setRemoving(false);}}
 return <label className="media-field">{label}
  <input ref={input} type="file" accept={accept} disabled={busy} onChange={e=>choose(e.target.files?.[0])}/>
  {progress!==null&&<span className="media-progress" aria-live="polite"><Progress value={Math.round(progress*100)}/><small>{progress>=0.97?'Saving to your invitation…':`Uploading… ${Math.round(progress*100)}%`}</small></span>}
  {status&&<small role={status.ok?'status':'alert'} className={status.ok?'media-status ok':'media-status error'}>{status.text}</small>}
  {removing&&<small className="media-status">Removing…</small>}{value&&!busy&&<Button type="button" variant="ghost" onClick={remove}>Remove {noun.toLowerCase()}</Button>}
 </label>;
}
