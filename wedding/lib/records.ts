import { type Wedding, type RecordItem, normalizeWedding } from './model';
import { dataStore } from './store';
// Storage helpers shared by the website and the scheduled function (no login code here).
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export type WeddingRow={owner:string;revision:number;w:Wedding;etag:string};
export type PhotoRecord={id:string;guest:string;name:string;mime:string;kind:'photo'|'asset';created:string;status?:'pending'|'approved'|'rejected';official?:boolean};
// Netlify Blobs cannot make simultaneous conditional writes to ONE key safe, so nothing guests do
// rewrites a shared record: each guest's RSVP lives in its own `rsvp/<guest id>` blob and each
// gallery photo in its own `gallery/…` key. The couple's `wedding` blob holds everything else.
export const RSVP_FIELDS=['name','phone','responses','meal','allergy','song','message','plusOneName','plusOneMeal','plusOneAllergy','plusOnePhone','responded'] as const;
export const PLUS_ONE_FIELDS=['plusOneName','plusOneMeal','plusOneAllergy','plusOnePhone'];
export type Rsvp={version:string;fields:Record<string,any>};
const rsvpKey=(guestId:string)=>'rsvp/'+encodeURIComponent(guestId);
export async function inBatches<T,R>(items:T[],size:number,run:(item:T)=>Promise<R>){const out:R[]=[];for(let i=0;i<items.length;i+=size)out.push(...await Promise.all(items.slice(i,i+size).map(run)));return out;}
export async function readRsvp(guestId:string):Promise<Rsvp|null>{return await dataStore().get(rsvpKey(guestId),{type:'json'});}
export async function readRsvps(guests:RecordItem[]){const store=dataStore();const entries=await inBatches(guests,25,async g=>[g.id,await store.get(rsvpKey(g.id),{type:'json'})] as const);return new Map(entries.filter(([,r])=>r) as [string,Rsvp][]);}
export async function saveRsvp(guestId:string,fields:Record<string,any>){const rsvp:Rsvp={version:crypto.randomUUID(),fields};await dataStore().setJSON(rsvpKey(guestId),rsvp);return rsvp;}
export async function clearRsvps(){const store=dataStore();const {blobs}=await store.list({prefix:'rsvp/'});await inBatches(blobs,25,b=>store.delete(b.key));}
// Applies a guest's own reply on top of the couple's record, then re-applies the couple's rules.
export function mergeGuest(g:RecordItem,rsvp?:Rsvp|null){const merged:RecordItem={...g,...(rsvp?.fields||{}),rsvpVersion:rsvp?.version||''};if(!merged.plusOneAllowed)for(const key of PLUS_ONE_FIELDS)merged[key]='';delete merged.email;delete merged.plusOneEmail;return merged;}
export function mergeWedding(w:Wedding,rsvps:Map<string,Rsvp>):Wedding{const guests=w.guests.map(g=>mergeGuest(g,rsvps.get(g.id)));const byId=new Map(guests.map(g=>[g.id,g]));return {...w,guests,tables:w.tables.map(t=>({...t,assignments:(t.assignments||[]).filter((id:string)=>byId.get(id)?.responses?.[t.event]==='yes')}))};}
export async function storedRow():Promise<WeddingRow|null>{const r=await dataStore().getWithMetadata('wedding',{type:'json'});if(!r?.data)return null;const data=r.data as Omit<WeddingRow,'etag'>;normalizeWedding(data.w);return {...data,etag:r.etag||''};}
// The wedding with every guest's latest reply merged in.
// The wedding with every guest's latest reply merged in.
export async function row():Promise<WeddingRow|null>{const r=await storedRow();if(!r)return null;return {...r,w:mergeWedding(r.w,await readRsvps(r.w.guests))};}
// Gallery index: one key per item, carrying its details in the key so one list call reads them all.
const encodeKey=(x:object)=>btoa(unescape(encodeURIComponent(JSON.stringify(x)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decodeKey=(s:string)=>JSON.parse(decodeURIComponent(escape(atob(s.replaceAll('-','+').replaceAll('_','/')))));
export async function photoIndex():Promise<PhotoRecord[]>{const {blobs}=await dataStore().list({prefix:'gallery/'});const out:PhotoRecord[]=[];for(const b of blobs){const [,id,data]=b.key.split('/');try{out.push({id,...decodeKey(data)});}catch{}}return out;}
export async function addPhoto(record:PhotoRecord,limit?:number){if(limit!==undefined&&record.kind==='photo'&&(await photoIndex()).filter(p=>p.kind==='photo'&&p.id!==record.id).length>=limit)throw new HttpError(400,'This wedding has reached its 500-photo limit.');const {id,...rest}=record;await removePhoto(id);await dataStore().set(`gallery/${id}/${encodeKey({...rest,guest:rest.guest.slice(0,64),name:rest.name.slice(0,60)})}`,'');}
export async function removePhoto(id:string){const store=dataStore();const {blobs}=await store.list({prefix:`gallery/${id}/`});for(const b of blobs)await store.delete(b.key);}
export async function clearPhotos(){const store=dataStore();const {blobs}=await store.list({prefix:'gallery/'});await inBatches(blobs,25,b=>store.delete(b.key));}
