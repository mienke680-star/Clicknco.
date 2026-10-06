import {mediaStore} from './store';
import {buildInvitationPdf,INVITATION_DESIGN_VERSION} from './invitation-pdf';
import type {Wedding,RecordItem} from './model';
// Personalised PDF invitations are stored privately in the `wedding-media` Blobs store under
// `invitations/<guest id>` and are only ever served to the signed-in couple. Each stored PDF carries
// a fingerprint of everything printed on it, so it is generated once, reused while nothing relevant
// changes, and regenerated when the guest's name, their link or the design changes.
// Generating a PDF never touches the guest's invitation token.
const key=(guestId:string)=>'invitations/'+encodeURIComponent(guestId);
export const inviteLink=(origin:string,guest:RecordItem)=>`${origin}/invite/${encodeURIComponent(guest.token)}`;
// Only what is printed or linked: the design, the guest's name and their personal link. Changing the
// design version regenerates every stored PDF the next time it is previewed, downloaded or shared.
export async function invitationFingerprint(guest:RecordItem,link:string){
 const printed={v:INVITATION_DESIGN_VERSION,name:guest.name,link};
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(printed)));
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
export type InvitationResult={guestId:string;status:'generated'|'reused';fingerprint:string;size:number;link:string};
export async function ensureInvitation(w:Wedding,guest:RecordItem,origin:string,withBytes=false):Promise<InvitationResult&{bytes?:Uint8Array}>{
 const link=inviteLink(origin,guest),fingerprint=await invitationFingerprint(guest,link),store=mediaStore();
 const existing=await store.getMetadata(key(guest.id));
 if(existing?.metadata?.fingerprint===fingerprint){
  if(!withBytes)return {guestId:guest.id,status:'reused',fingerprint,size:Number(existing.metadata.size)||0,link};
  const data=await store.get(key(guest.id),{type:'arrayBuffer'});
  if(data)return {guestId:guest.id,status:'reused',fingerprint,size:data.byteLength,link,bytes:new Uint8Array(data)};
 }
 const bytes=await buildInvitationPdf({guest,link,couple:w.settings.names||undefined});
 await store.set(key(guest.id),new Blob([bytes as BlobPart],{type:'application/pdf'}),{metadata:{fingerprint,size:bytes.length,generated:new Date().toISOString()}});
 return {guestId:guest.id,status:'generated',fingerprint,size:bytes.length,link,...(withBytes?{bytes}:{})};
}
// Removes stored PDFs of guests who are no longer on the list.
export async function removeOrphanInvitations(w:Wedding){const store=mediaStore(),ids=new Set(w.guests.map(g=>key(g.id)));const {blobs}=await store.list({prefix:'invitations/'});await Promise.all(blobs.filter(b=>!ids.has(b.key)).map(b=>store.delete(b.key)));}
export function pdfFileName(guest:RecordItem){return `Wedding invitation - ${String(guest.name||'Guest').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'').trim()||'Guest'}.pdf`;}
