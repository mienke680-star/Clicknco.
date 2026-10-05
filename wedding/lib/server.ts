import { getCoupleUser } from './auth';
import { initialWedding, type Wedding, type RecordItem, sections } from './model';
import { dataStore, ifUnchanged } from './store';
import { fromThisSite } from './origin';
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export type WeddingRow={owner:string;revision:number;w:Wedding;etag:string};
export type PhotoRecord={id:string;guest:string;name:string;mime:string;kind:'photo'|'asset';created:string};
// Netlify Blobs cannot make simultaneous conditional writes to ONE key safe, so nothing guests do
// rewrites a shared record: each guest's RSVP lives in its own `rsvp/<guest id>` blob and each
// gallery photo in its own `gallery/…` key. The couple's `wedding` blob holds everything else.
export const RSVP_FIELDS=['name','phone','responses','meal','allergy','song','message','plusOneName','plusOneMeal','plusOneAllergy','plusOnePhone','responded'] as const;
const PLUS_ONE_FIELDS=['plusOneName','plusOneMeal','plusOneAllergy','plusOnePhone'];
export type Rsvp={version:string;fields:Record<string,any>};
const rsvpKey=(guestId:string)=>'rsvp/'+encodeURIComponent(guestId);
async function inBatches<T,R>(items:T[],size:number,run:(item:T)=>Promise<R>){const out:R[]=[];for(let i=0;i<items.length;i+=size)out.push(...await Promise.all(items.slice(i,i+size).map(run)));return out;}
export async function readRsvp(guestId:string):Promise<Rsvp|null>{return await dataStore().get(rsvpKey(guestId),{type:'json'});}
export async function readRsvps(guests:RecordItem[]){const store=dataStore();const entries=await inBatches(guests,25,async g=>[g.id,await store.get(rsvpKey(g.id),{type:'json'})] as const);return new Map(entries.filter(([,r])=>r) as [string,Rsvp][]);}
export async function saveRsvp(guestId:string,fields:Record<string,any>){const rsvp:Rsvp={version:crypto.randomUUID(),fields};await dataStore().setJSON(rsvpKey(guestId),rsvp);return rsvp;}
export async function clearRsvps(){const store=dataStore();const {blobs}=await store.list({prefix:'rsvp/'});await inBatches(blobs,25,b=>store.delete(b.key));}
// Applies a guest's own reply on top of the couple's record, then re-applies the couple's rules.
export function mergeGuest(g:RecordItem,rsvp?:Rsvp|null){const merged:RecordItem={...g,...(rsvp?.fields||{}),rsvpVersion:rsvp?.version||''};if(!merged.plusOneAllowed)for(const key of PLUS_ONE_FIELDS)merged[key]='';delete merged.email;delete merged.plusOneEmail;return merged;}
export function mergeWedding(w:Wedding,rsvps:Map<string,Rsvp>):Wedding{const guests=w.guests.map(g=>mergeGuest(g,rsvps.get(g.id)));const byId=new Map(guests.map(g=>[g.id,g]));return {...w,guests,tables:w.tables.map(t=>({...t,assignments:(t.assignments||[]).filter((id:string)=>byId.get(id)?.responses?.[t.event]==='yes')}))};}
async function storedRow():Promise<WeddingRow|null>{const r=await dataStore().getWithMetadata('wedding',{type:'json'});if(!r?.data)return null;return {...(r.data as Omit<WeddingRow,'etag'>),etag:r.etag||''};}
// The wedding with every guest's latest reply merged in.
export async function row():Promise<WeddingRow|null>{const r=await storedRow();if(!r)return null;return {...r,w:mergeWedding(r.w,await readRsvps(r.w.guests))};}
export async function planner(req?:Request){const user=await getCoupleUser(req);if(!user)throw new HttpError(401,'Please sign in to your wedding dashboard.');let r=await row();if(!r){await dataStore().setJSON('wedding',{owner:'couple',revision:0,w:initialWedding()},{onlyIfNew:true});r=await row();}if(!r)throw new HttpError(503,'Wedding storage is temporarily unavailable. Please try again.');if(r.owner!=='couple')throw new HttpError(503,'Import this wedding using the transfer tool before opening the planner.');return {r,user,w:r.w,owner:r.owner===user.userId};}
export async function guest(token:string){if(!token||token.length>100)throw new HttpError(403,'This invitation link is not valid.');const r=await storedRow();if(!r)throw new HttpError(404,'The invitation is not ready yet.');const w=r.w;const stored=w.guests.find(g=>g.token===token);if(!stored)throw new HttpError(403,'This invitation link is not valid. Please ask the couple for your link.');return {r,w,g:mergeGuest(stored,await readRsvp(stored.id))};}
// Saves the couple's edits. A reply a guest sent after the dashboard loaded is kept; RSVP fields the
// couple changed themselves (same rsvpVersion as loaded) become that guest's current reply.
export async function update(r:WeddingRow,w:Wedding){
 const current=await readRsvps(w.guests);
 await inBatches(w.guests,25,async g=>{const rsvp=current.get(g.id);if(!rsvp||g.rsvpVersion!==rsvp.version)return;const fields=Object.fromEntries(RSVP_FIELDS.filter(k=>g[k]!==undefined).map(k=>[k,g[k]]));if(JSON.stringify(fields)!==JSON.stringify(Object.fromEntries(RSVP_FIELDS.filter(k=>rsvp.fields[k]!==undefined).map(k=>[k,rsvp.fields[k]]))))await saveRsvp(g.id,fields);});
 const stored={...w,guests:w.guests.map(({rsvpVersion:_,...g})=>g)};
 const result=await dataStore().setJSON('wedding',{owner:r.owner,revision:r.revision+1,w:stored},ifUnchanged(r.etag));if(!result.modified)throw new HttpError(409,'Someone else just updated the wedding. Reload before saving again.');return r.revision+1;}
export function failure(e:unknown){console.error(e);return Response.json({error:e instanceof Error?e.message:'Unable to save. Please try again.'},{status:e instanceof HttpError?e.status:503});}
export function checkOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&!fromThisSite(req,origin))throw new HttpError(403,'Invalid request origin.');}
export function validate(w:any):asserts w is Wedding {if(!w||typeof w.settings!=='object')throw new HttpError(400,'Invalid wedding details.');for(const key of sections.slice(1)){if(!Array.isArray(w[key])||w[key].length>5000)throw new HttpError(400,'Invalid wedding records.');for(const item of w[key]){if(typeof item.id!=='string')throw new HttpError(400,'Each record needs an identifier.');}}for(const g of w.guests){if(typeof g.name!=='string'||!g.name.trim()||typeof g.token!=='string'||g.token.length<20)throw new HttpError(400,'Each guest needs a name and a secure invitation link.');}for(const g of w.guests){delete g.email;delete g.plusOneEmail;if(!g.plusOneAllowed){for(const key of PLUS_ONE_FIELDS)g[key]='';}}const guestIds=new Set(w.guests.map((g:any)=>g.id));if(guestIds.size!==w.guests.length||new Set(w.guests.map((g:any)=>g.token)).size!==w.guests.length)throw new HttpError(400,'Guest identifiers must be unique.');for(const t of w.tables){if(!Number.isInteger(Number(t.capacity))||Number(t.capacity)<1)throw new HttpError(400,'Table capacities must be positive.');t.assignments=(t.assignments||[]).filter((id:string)=>guestIds.has(id)&&w.guests.find((g:any)=>g.id===id)?.responses?.[t.event]==='yes');}for(const b of w.budget){for(const p of b.payments||[]){if(!Number.isFinite(Number(p.amount))||Number(p.amount)<0)throw new HttpError(400,'Payment amounts must be positive.');}}}
// Gallery index: one key per item, carrying its details in the key so one list call reads them all.
const encodeKey=(x:object)=>btoa(unescape(encodeURIComponent(JSON.stringify(x)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decodeKey=(s:string)=>JSON.parse(decodeURIComponent(escape(atob(s.replaceAll('-','+').replaceAll('_','/')))));
export async function photoIndex():Promise<PhotoRecord[]>{const {blobs}=await dataStore().list({prefix:'gallery/'});const out:PhotoRecord[]=[];for(const b of blobs){const [,id,data]=b.key.split('/');try{out.push({id,...decodeKey(data)});}catch{}}return out;}
export async function addPhoto(record:PhotoRecord,limit?:number){if(limit!==undefined&&record.kind==='photo'&&(await photoIndex()).filter(p=>p.kind==='photo'&&p.id!==record.id).length>=limit)throw new HttpError(400,'This wedding has reached its 500-photo limit.');const {id,...rest}=record;await removePhoto(id);await dataStore().set(`gallery/${id}/${encodeKey({...rest,guest:rest.guest.slice(0,64),name:rest.name.slice(0,60)})}`,'');}
export async function removePhoto(id:string){const store=dataStore();const {blobs}=await store.list({prefix:`gallery/${id}/`});for(const b of blobs)await store.delete(b.key);}
export async function clearPhotos(){const store=dataStore();const {blobs}=await store.list({prefix:'gallery/'});await inBatches(blobs,25,b=>store.delete(b.key));}
