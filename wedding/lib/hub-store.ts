import {dataStore,ifUnchanged} from './store';
import {emptyGuestState,type GuestState} from './hub';
import type {RecordItem} from './model';
// Storage for the wedding hub. Netlify Blobs can lose one of two simultaneous writes to the same key,
// so records written by guests are either theirs alone (guest-state/<guest>) or one key per item
// (activity, questions, outgoing-message states). Nothing a guest does rewrites a shared record.
const enc=encodeURIComponent;
const stamp=()=>String(Date.now()).padStart(15,'0')+'-'+crypto.randomUUID().slice(0,8);
async function inBatches<T,R>(items:T[],size:number,run:(item:T)=>Promise<R>){const out:R[]=[];for(let i=0;i<items.length;i+=size)out.push(...await Promise.all(items.slice(i,i+size).map(run)));return out;}
// --- Per-guest state: preferences, read/acknowledged updates, accommodation, travel, lifts, polls --
const stateKey=(guestId:string)=>'guest-state/'+enc(guestId);
export async function readGuestState(guestId:string):Promise<GuestState>{return {...emptyGuestState(),...((await dataStore().get(stateKey(guestId),{type:'json'}))||{})};}
export async function readGuestStates(guests:RecordItem[]){const entries=await inBatches(guests,25,async g=>[g.id,await readGuestState(g.id)] as const);return new Map(entries);}
// Only the guest writes their own state; the ETag check guards against two of their own tabs.
export async function updateGuestState(guestId:string,change:(s:GuestState)=>GuestState){
 const store=dataStore();
 for(let attempt=0;attempt<4;attempt++){
  const cur=await store.getWithMetadata(stateKey(guestId),{type:'json'});
  const next={...change({...emptyGuestState(),...(cur?.data||{})}),updatedAt:new Date().toISOString()};
  const written=await store.setJSON(stateKey(guestId),next,cur?ifUnchanged(cur.etag):{onlyIfNew:true});
  if(written.modified)return next;
 }
 throw new Error('Please try again in a moment.');
}
export async function clearGuestStates(){const store=dataStore();const {blobs}=await store.list({prefix:'guest-state/'});await inBatches(blobs,25,b=>store.delete(b.key));}
// --- Activity history (one key per entry) ------------------------------------------------------
export type Activity={id:string;at:string;actor:'guest'|'couple'|'system';type:string;guestId?:string;guestName?:string;summary:string;details?:any;important?:boolean};
export async function logActivity(entry:Omit<Activity,'id'|'at'>){const id=stamp(),a:Activity={...entry,id,at:new Date().toISOString()};await dataStore().setJSON('activity/'+id,a);return a;}
export async function readActivity(limit=300):Promise<Activity[]>{const store=dataStore();const {blobs}=await store.list({prefix:'activity/'});const keys=blobs.map(b=>b.key).sort().reverse().slice(0,limit);return (await inBatches(keys,25,k=>store.get(k,{type:'json'}))).filter(Boolean) as Activity[];}
// --- Private questions: questions/<guest>/<time>-<id>-<guest|couple> ------------------------------
export type Message={id:string;from:'guest'|'couple';text:string;at:string};
export async function postMessage(guestId:string,from:'guest'|'couple',text:string){const id=stamp();const m:Message={id,from,text,at:new Date().toISOString()};await dataStore().setJSON(`questions/${enc(guestId)}/${id}-${from}`,m);return m;}
export async function readThread(guestId:string):Promise<Message[]>{const store=dataStore();const {blobs}=await store.list({prefix:`questions/${enc(guestId)}/`});const keys=blobs.map(b=>b.key).sort();return (await inBatches(keys,25,k=>store.get(k,{type:'json'}))).filter(Boolean) as Message[];}
// Thread summaries come from the keys alone: whoever wrote last tells us if a reply is owed.
export async function threadIndex(){const {blobs}=await dataStore().list({prefix:'questions/'});const threads=new Map<string,{guestId:string;count:number;last:'guest'|'couple';lastAt:number}>();for(const b of blobs.map(x=>x.key).sort()){const [,g,item]=b.split('/');const guestId=decodeURIComponent(g);const from=item.endsWith('-couple')?'couple':'guest';const t=threads.get(guestId)||{guestId,count:0,last:from,lastAt:0};t.count++;t.last=from;t.lastAt=Number(item.slice(0,15));threads.set(guestId,t);}return threads;}
export async function clearThreads(){const store=dataStore();const {blobs}=await store.list({prefix:'questions/'});await inBatches(blobs,25,b=>store.delete(b.key));}
// --- Couple's private review state ---------------------------------------------------------------
export type CoupleState={reviewed:Record<string,string>;reviewedBefore?:string};
export async function readCoupleState():Promise<CoupleState>{return {reviewed:{},...((await dataStore().get('couple/state',{type:'json'}))||{})};}
export async function writeCoupleState(s:CoupleState){await dataStore().setJSON('couple/state',s);}
// --- Outgoing messages -------------------------------------------------------------------------
// A batch is created once per source (update, change notice, reminder, invitations) and never
// duplicated. Each recipient's state is its own key, so the scheduler and the couple can update
// different recipients at the same time.
export type Channel='whatsapp'|'email';
export type Recipient={guestId:string;name:string;channel:Channel;to:string;text:string;subject?:string;link:string};
export type Batch={id:string;kind:'update'|'change'|'reminder'|'invite'|'custom';sourceId:string;title:string;createdAt:string;createdBy:'couple'|'system';recipients:Recipient[];siteOnly:{guestId:string;name:string;reason:string}[]};
export type DeliveryStatus='pending'|'sending'|'accepted'|'sent_manually'|'failed'|'skipped';
export type RecipientState={status:DeliveryStatus;attempts:number;error?:string;providerId?:string;updatedAt:string;by?:string};
const batchKey=(id:string)=>'outbox/'+enc(id);
const recipientKey=(batchId:string,r:{guestId:string;channel:Channel})=>`outbox-state/${enc(batchId)}/${enc(r.guestId)}~${r.channel}`;
export async function readBatch(id:string):Promise<Batch|null>{return await dataStore().get(batchKey(id),{type:'json'});}
// Returns the existing batch instead of creating a second one for the same source.
export async function createBatch(batch:Batch):Promise<{batch:Batch;created:boolean}>{const existing=await readBatch(batch.id);if(existing)return {batch:existing,created:false};const w=await dataStore().setJSON(batchKey(batch.id),batch,{onlyIfNew:true});if(!w.modified)return {batch:(await readBatch(batch.id))!,created:false};return {batch,created:true};}
export async function listBatches():Promise<Batch[]>{const store=dataStore();const {blobs}=await store.list({prefix:'outbox/'});return ((await inBatches(blobs.map(b=>b.key),25,k=>store.get(k,{type:'json'}))).filter(Boolean) as Batch[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export async function readRecipientStates(batch:Batch){const store=dataStore();const states=await inBatches(batch.recipients,25,async r=>[`${r.guestId}~${r.channel}`,await store.get(recipientKey(batch.id,r),{type:'json'})] as const);const out=new Map<string,RecipientState>();for(const [k,v] of states)out.set(k,(v as RecipientState)||{status:'pending',attempts:0,updatedAt:batch.createdAt});return out;}
export async function readRecipientState(batchId:string,r:{guestId:string;channel:Channel}):Promise<RecipientState|null>{return await dataStore().get(recipientKey(batchId,r),{type:'json'});}
export async function writeRecipientState(batchId:string,r:{guestId:string;channel:Channel},s:Omit<RecipientState,'updatedAt'>){const v={...s,updatedAt:new Date().toISOString()};await dataStore().setJSON(recipientKey(batchId,r),v);return v;}
