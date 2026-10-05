import {getStore} from '@netlify/blobs';
// Netlify Blobs site-wide stores: permanent, not tied to a deploy, and kept until deleted.
// Strong consistency so a reply saved by one guest is immediately visible to the next request.
export const dataStore=()=>getStore({name:'wedding-data',consistency:'strong'});
export const mediaStore=()=>getStore({name:'wedding-media',consistency:'strong'});
// Netlify returns an ETag with every read; the local Blobs emulator does not, so fall back to a plain write there.
export const ifUnchanged=(etag?:string)=>etag?{onlyIfMatch:etag}:{};
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
// Read-modify-write a JSON blob with an ETag check so concurrent saves never overwrite each other.
export async function mutateJSON<T,R=T>(key:string,change:(current:T|null)=>{value:T;result?:R}|null,attempts=8):Promise<R|undefined>{
 const store=dataStore();
 for(let attempt=0;attempt<attempts;attempt++){
  const current=await store.getWithMetadata(key,{type:'json'});
  const next=change(current?(current.data as T):null);
  if(!next)return undefined;
  const written=await store.setJSON(key,next.value,current?ifUnchanged(current.etag):{onlyIfNew:true});
  if(written.modified)return next.result===undefined?next.value as unknown as R:next.result;
  await pause(40+Math.random()*120*(attempt+1));
 }
 throw new Error('The wedding is busy right now. Please try again.');
}
