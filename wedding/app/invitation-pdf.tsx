'use client';
import {useEffect,useRef,useState} from 'react';
import {Download,FileText,Send,Copy,ExternalLink} from 'lucide-react';
import {toast} from 'sonner';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {dateText} from './ui';
export type PdfMode='preview'|'download'|'whatsapp';
type Guest={id:string;name:string;phone?:string;plusOneAllowed?:boolean};
type Prepared={file:File;url:string;link:string;status:string};
async function readError(r:Response){const d=await r.json().catch(()=>null) as any;return d?.error||'The invitation PDF could not be prepared. Please try again.';}
// Makes sure the guests' PDFs exist and are current (the server reuses a saved copy when nothing changed).
export async function ensureInvitationPdfs(guestIds:string[]){
 const out:{guestId:string;status?:string;error?:string}[]=[];
 for(let i=0;i<guestIds.length;i+=5){const r=await fetch('/api/invitations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guestIds:guestIds.slice(i,i+5)})});if(!r.ok)throw Error(await readError(r));out.push(...((await r.json() as any).results||[]));}
 return out;
}
// Called after a guest is saved: creates (or confirms) their PDF in the background with a progress toast.
export async function prepareAfterSave(guests:Guest[]){
 if(!guests.length)return;const id=toast.loading(guests.length===1?`Creating ${guests[0].name}’s invitation PDF…`:`Creating invitation PDFs… 0 of ${guests.length}`);
 try{let done=0,failed=0;for(let i=0;i<guests.length;i+=5){const part=guests.slice(i,i+5);const results=await ensureInvitationPdfs(part.map(g=>g.id));failed+=results.filter(r=>r.error).length;done+=part.length;if(guests.length>1)toast.loading(`Creating invitation PDFs… ${done} of ${guests.length}`,{id});}
  if(failed)toast.error(`${failed} invitation PDF${failed===1?'':'s'} could not be created. Use “Preview PDF” to try again.`,{id});
  else toast.success(guests.length===1?`${guests[0].name}’s invitation PDF is ready`:`${guests.length} invitation PDFs are ready`,{id});
 }catch(e:any){toast.error(e.message,{id});}
}
export function invitationMessage(g:Guest,settings:any,link:string){
 const couple=settings.names||'Mienke & Luvhan',when=settings.date?` on ${dateText(settings.date)}`:'',where=settings.venue?` at ${settings.venue}`:'';
 return [`Dear ${g.name},`,'',`With so much joy, we would love you to celebrate our wedding with us${when}${where}. 💙`,'',`Your personal invitation is attached. Please open it to RSVP, or use your private link:`,link,'',...(g.plusOneAllowed?['You are welcome to bring a plus one. Please add their details when you RSVP.','']:[]),'With love,',couple].join('\n');
}
const waLink=(phone:string,text:string)=>{const digits=String(phone||'').replace(/\D/g,'').replace(/^0/,'27');return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;};
// Whether this browser can hand a real PDF file to the system share sheet (e.g. to WhatsApp).
export function canShareFile(file:File){try{return typeof navigator!=='undefined'&&typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[file]});}catch{return false;}}
export function InvitationPdfDialog({guest,mode,settings,onClose}:{guest:Guest|null;mode:PdfMode;settings:any;onClose:()=>void}){
 const [stage,setStage]=useState<{progress:number;text:string}|null>(null),[error,setError]=useState(''),[ready,setReady]=useState<Prepared|null>(null),[message,setMessage]=useState(''),[shareNote,setShareNote]=useState(''),[fallback,setFallback]=useState(false);
 const run=useRef(0);
 function save(p:Prepared){const a=document.createElement('a');a.href=p.url;a.download=p.file.name;document.body.append(a);a.click();a.remove();}
 async function prepare(g:Guest){
  const ticket=++run.current;setError('');setReady(null);setShareNote('');setFallback(false);
  try{
   setStage({progress:15,text:'Checking for a saved invitation…'});
   const [result]=await ensureInvitationPdfs([g.id]);if(result?.error)throw Error(result.error);if(ticket!==run.current)return;
   setStage({progress:60,text:result.status==='generated'?'Invitation designed with your latest details. Loading…':'Using the saved invitation. Loading…'});
   const r=await fetch(`/api/invitations/${encodeURIComponent(g.id)}`,{cache:'no-store'});if(!r.ok)throw Error(await readError(r));
   const blob=await r.blob();if(blob.type!=='application/pdf'||blob.size<1000)throw Error('The invitation PDF could not be loaded. Please try again.');
   const name=decodeURIComponent((/filename\*=UTF-8''([^;]+)/.exec(r.headers.get('content-disposition')||'')||[])[1]||'Wedding invitation.pdf');
   const file=new File([blob],name,{type:'application/pdf'}),link=r.headers.get('x-invitation-link')||'';
   if(ticket!==run.current)return;
   const prepared={file,url:URL.createObjectURL(file),link,status:result.status||''};
   setReady(prepared);setMessage(invitationMessage(g,settings,link));setFallback(!canShareFile(file));setStage(null);
   if(mode==='download'){save(prepared);toast.success('Invitation PDF downloaded');}
  }catch(e:any){if(ticket===run.current){setError(e.message||'Something went wrong. Please try again.');setStage(null);}}
 }
 useEffect(()=>{if(guest)prepare(guest);return ()=>{run.current++;};// eslint-disable-next-line react-hooks/exhaustive-deps
 },[guest?.id,mode]);
 useEffect(()=>()=>{if(ready)URL.revokeObjectURL(ready.url);},[ready]);
 async function share(){
  if(!ready||!guest)return;setShareNote('');
  // Copy the message too: some apps keep only the attachment from a share sheet.
  try{await navigator.clipboard?.writeText(message);}catch{}
  try{await navigator.share({files:[ready.file],text:message,title:ready.file.name});setShareNote('Shared. Check WhatsApp to make sure the invitation and message were sent.');}
  catch(e:any){if(e?.name==='AbortError')setShareNote('Sharing was cancelled. Nothing was sent.');else{setFallback(true);setShareNote('This browser could not attach the PDF. Use the steps below instead.');}}
 }
 async function copy(){try{await navigator.clipboard.writeText(message);toast.success('Message copied');}catch{toast.error('Select the message and copy it');}}
 const title=mode==='preview'?'Invitation PDF':mode==='download'?'Download invitation PDF':'Send via WhatsApp';
 return <Dialog open={!!guest} onOpenChange={v=>!v&&onClose()}><DialogContent className="pdf-dialog"><DialogHeader><DialogTitle>{title}{guest?` · ${guest.name}`:''}</DialogTitle><DialogDescription>{mode==='whatsapp'?'Review the invitation and message, then send it yourself from WhatsApp.':'Personalised with this guest’s name and private RSVP link.'}</DialogDescription></DialogHeader>
  {stage&&<div className="pdf-progress" aria-live="polite"><Progress value={stage.progress}/><small>{stage.text}</small></div>}
  {error&&<div className="pdf-error" role="alert"><p>{error}</p>{guest&&<Button variant="outline" onClick={()=>prepare(guest)}>Try again</Button>}</div>}
  {ready&&<>
   {ready.status==='reused'?<small className="pdf-meta">Saved invitation reused — nothing relevant has changed.</small>:<small className="pdf-meta">Freshly created with your latest wedding details.</small>}
   {mode==='preview'&&<object className="pdf-frame" data={ready.url} type="application/pdf" aria-label="Invitation PDF preview"><p className="muted">Your browser can’t show the PDF here. Use “Open PDF” instead.</p></object>}
   {mode!=='whatsapp'&&<div className="toolbar"><a className="button outline" href={ready.url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Open PDF</a><Button onClick={()=>save(ready)}><Download size={15}/> {mode==='download'?'Download again':'Download PDF'}</Button></div>}
   {mode==='whatsapp'&&<>
    <label className="pdf-message">Message<textarea value={message} onChange={e=>setMessage(e.target.value)} rows={9}/></label>
    {!fallback?<>
     <Button className="pdf-share" onClick={share}><Send size={16}/> Share PDF and message…</Button>
     <p className="muted">Your phone’s share sheet opens with the PDF attached. Choose <strong>WhatsApp</strong>, pick {guest?.name}, review and send. The message is also copied, so you can paste it if WhatsApp only keeps the PDF.</p>
    </>:<div className="pdf-fallback">
     <p><strong>This browser can’t attach files to WhatsApp directly.</strong> Send it in two quick steps:</p>
     <ol><li><Button variant="outline" onClick={()=>save(ready)}><Download size={15}/> Download invitation PDF</Button></li>
      <li><a className="button outline" href={waLink(guest?.phone||'',message)} target="_blank" rel="noreferrer"><Send size={15}/> Open WhatsApp message</a></li>
      <li>In WhatsApp, tap the attachment (📎 or +), choose <em>Document</em> and select <em>{ready.file.name}</em>, then send.</li></ol>
     <p className="muted">WhatsApp links can only fill in the message; the PDF must be attached by you.{guest?.phone?'':' No phone number is saved for this guest, so WhatsApp will ask you to choose the chat.'}</p>
    </div>}
    <div className="toolbar"><Button variant="ghost" onClick={copy}><Copy size={15}/> Copy message</Button><a className="button ghost" href={ready.url} target="_blank" rel="noreferrer"><FileText size={15}/> Preview PDF</a></div>
    {shareNote&&<p role="status" className="pdf-note">{shareNote}</p>}
   </>}
  </>}
 </DialogContent></Dialog>;
}
