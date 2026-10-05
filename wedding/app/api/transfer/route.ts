import {getCoupleUser} from '@/lib/auth';
import {row,failure,checkOrigin,HttpError,clearRsvps,clearPhotos,addPhoto,type PhotoRecord} from '@/lib/server';
import {dataStore,ifUnchanged} from '@/lib/store';
import {readMeta} from '@/lib/media';
async function couple(req:Request){if(!await getCoupleUser(req))throw new HttpError(401,'Please sign in to your wedding dashboard.');}
// Lets the transfer page warn before replacing a wedding that already exists here.
export async function GET(req:Request){try{await couple(req);const r=await row();return Response.json({exists:!!r,guests:r?.w.guests.length||0,revision:r?.revision??null},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
// Final transfer step: media parts are already uploaded with their original IDs; this saves the wedding and gallery index.
export async function POST(req:Request){try{
 checkOrigin(req);await couple(req);const body=await req.text();if(body.length>4000000)throw new HttpError(413,'Wedding data is too large.');
 const {w,photos,replace}=JSON.parse(body);
 if(!w?.settings||typeof w.settings!=='object')throw new HttpError(400,'Invalid wedding details.');
 for(const key of ['guests','events','tables','budget','vendors','tasks','moodboard','story','gifts','layout'])if(!Array.isArray(w[key]))throw new HttpError(400,'Invalid wedding backup: '+key);
 for(const g of w.guests){delete g.email;delete g.plusOneEmail;}
 if(!Array.isArray(photos)||photos.length>5000)throw new HttpError(400,'Invalid media list.');
 const records:PhotoRecord[]=[];
 for(const p of photos){const meta=await readMeta(String(p?.id||''));if(!meta?.complete)throw new HttpError(400,'Media file '+p?.id+' has not finished uploading. Run the transfer again.');records.push({id:meta.id,guest:String(p.guest||'imported'),name:String(p.name||'Wedding asset').slice(0,150),mime:meta.mime,kind:p.kind==='photo'?'photo':'asset',created:String(p.created||meta.created)});}
 const existing=await row();if(existing&&!replace)throw new HttpError(409,'A wedding already exists on this website. Tick “Replace” to overwrite it after making a backup.');
 const value={owner:'couple',revision:(existing?.revision??-1)+1,w};
 const written=existing?await dataStore().setJSON('wedding',value,ifUnchanged(existing.etag)):await dataStore().setJSON('wedding',value,{onlyIfNew:true});
 if(!written.modified)throw new HttpError(409,'The wedding changed during the transfer. Please run it again.');
 // The imported replies are authoritative: clear per-guest replies, then index the gallery.
 await clearRsvps();if(replace)await clearPhotos();for(const record of records)await addPhoto(record);
 return Response.json({imported:true,guests:w.guests.length,media:records.length});
}catch(e){return failure(e);}}
