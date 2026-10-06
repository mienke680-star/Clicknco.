import {mediaStore} from './store';
import {readMeta} from './media';
import {buildInvitationPdf,invitedEvents,INVITATION_DESIGN_VERSION,TAGLINE} from './invitation-pdf';
import type {Wedding,RecordItem} from './model';
// Personalised PDF invitations are stored privately in the `wedding-media` Blobs store under
// `invitations/<guest id>` and are only ever served to the signed-in couple. Each stored PDF carries
// a fingerprint of everything printed on it, so it is generated once, reused while nothing relevant
// changes, and regenerated when the name, plus-one permission, wedding details or link change.
// Generating a PDF never touches the guest's invitation token.
const key=(guestId:string)=>'invitations/'+encodeURIComponent(guestId);
export const inviteLink=(origin:string,guest:RecordItem)=>`${origin}/invite/${encodeURIComponent(guest.token)}`;
const MAX_COVER_BYTES=2500000;
export async function invitationFingerprint(w:Wedding,guest:RecordItem,link:string){
 const s=w.settings;
 const printed={v:INVITATION_DESIGN_VERSION,tagline:TAGLINE,link,name:guest.name,plusOne:!!guest.plusOneAllowed,
  names:s.names,date:s.date,venue:s.venue,address:s.address,dress:s.dress,rsvpDeadline:s.rsvpDeadline,cover:s.cover||'',
  events:invitedEvents(w,guest).map(e=>[e.name,e.date,e.time])};
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(printed)));
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
// The couple's uploaded cover (JPEG/PNG up to 2.5 MB keeps the PDF light for WhatsApp); otherwise
// the bundled coastal artwork is used.
async function coverFor(w:Wedding){
 const match=/^\/api\/media\/([a-zA-Z0-9-]+)$/.exec(w.settings.cover||'');if(!match)return null;
 const meta=await readMeta(match[1]);if(!meta?.complete||meta.size>MAX_COVER_BYTES||!['image/jpeg','image/png'].includes(meta.mime))return null;
 const store=mediaStore(),parts=await Promise.all(Array.from({length:meta.parts},(_,n)=>store.get(`${meta.id}/${n}`,{type:'arrayBuffer'})));
 if(parts.some(p=>!p))return null;const bytes=new Uint8Array(meta.size);let at=0;for(const p of parts as ArrayBuffer[]){bytes.set(new Uint8Array(p),at);at+=p.byteLength;}
 return {bytes,type:meta.mime as 'image/jpeg'|'image/png'};
}
export type InvitationResult={guestId:string;status:'generated'|'reused';fingerprint:string;size:number;link:string};
export async function ensureInvitation(w:Wedding,guest:RecordItem,origin:string,withBytes=false):Promise<InvitationResult&{bytes?:Uint8Array}>{
 const link=inviteLink(origin,guest),fingerprint=await invitationFingerprint(w,guest,link),store=mediaStore();
 const existing=await store.getMetadata(key(guest.id));
 if(existing?.metadata?.fingerprint===fingerprint){
  if(!withBytes)return {guestId:guest.id,status:'reused',fingerprint,size:Number(existing.metadata.size)||0,link};
  const data=await store.get(key(guest.id),{type:'arrayBuffer'});
  if(data)return {guestId:guest.id,status:'reused',fingerprint,size:data.byteLength,link,bytes:new Uint8Array(data)};
 }
 const bytes=await buildInvitationPdf({w,guest,link,cover:await coverFor(w)});
 await store.set(key(guest.id),new Blob([bytes as BlobPart],{type:'application/pdf'}),{metadata:{fingerprint,size:bytes.length,generated:new Date().toISOString()}});
 return {guestId:guest.id,status:'generated',fingerprint,size:bytes.length,link,...(withBytes?{bytes}:{})};
}
// Removes stored PDFs of guests who are no longer on the list.
export async function removeOrphanInvitations(w:Wedding){const store=mediaStore(),ids=new Set(w.guests.map(g=>key(g.id)));const {blobs}=await store.list({prefix:'invitations/'});await Promise.all(blobs.filter(b=>!ids.has(b.key)).map(b=>store.delete(b.key)));}
export function pdfFileName(guest:RecordItem){return `Wedding invitation - ${String(guest.name||'Guest').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'').trim()||'Guest'}.pdf`;}
