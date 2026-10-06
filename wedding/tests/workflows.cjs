const assert=require('node:assert/strict');console.error=()=>{};const {harness}=require('./harness.cjs');
let user=null;const fakeAuth={getCoupleUser:async()=>user?.userId==='couple'?user:null};
const {load,store}=harness({'./auth':fakeAuth,'@/lib/auth':fakeAuth});
const model=load('lib/model.ts'),server=load('lib/server.ts'),wedding=load('app/api/wedding/route.ts'),guest=load('app/api/guest/route.ts'),photos=load('app/api/photos/route.ts'),upload=load('app/api/upload/route.ts'),media=load('app/api/media/[id]/route.ts'),transfer=load('app/api/transfer/route.ts'),{CHUNK_SIZE}=load('lib/media.ts');
const base='https://wedding.test';
const request=(path,data,method='POST')=>new Request(base+path,{method,headers:{'content-type':'application/json','origin':base},body:JSON.stringify(data)});
const couple={userId:'couple',email:''};
async function send(bytes,type,{token='',kind='photo'}={}){
 let r=await upload.POST(request('/api/upload',{action:'start',token,type,size:bytes.length,kind}));const start=await r.json();if(r.status!==200)return {status:r.status,...start};
 for(let part=0;part*start.chunkSize<bytes.length||part===0;part++){const q=new URLSearchParams({id:start.id,part:String(part)});if(token)q.set('token',token);r=await upload.PUT(new Request(base+'/api/upload?'+q,{method:'PUT',headers:{origin:base},body:bytes.subarray(part*start.chunkSize,(part+1)*start.chunkSize)}));assert.equal(r.status,200,await r.clone().text());}
 r=await upload.POST(request('/api/upload',{action:'finish',id:start.id,token}));return {status:r.status,...await r.json()};
}
const get=(id,{token,range,method='GET'}={})=>media[method](new Request(base+'/api/media/'+id+(token?'?token='+token:''),{method,headers:range?{range}:{}}),{params:Promise.resolve({id})});
(async()=>{
 assert.equal((await wedding.GET()).status,401);
 user=couple;let response=await wedding.GET();assert.equal(response.status,200);let d=await response.json();assert.equal(d.w.guests.length,0);assert.equal(d.revision,0);
 const token=crypto.randomUUID()+crypto.randomUUID(),token2=crypto.randomUUID()+crypto.randomUUID();
 d.w.guests.push({id:'guest-1',name:'Guest One',email:'guest@example.test',events:['ceremony'],responses:{},token,plusOneAllowed:true},{id:'guest-2',name:'Guest Two',events:['ceremony','brunch'],responses:{},token:token2});
 d.w.tables.push({id:'table-1',name:'Family',capacity:8,event:'ceremony',assignments:[]});d.w.settings.catering=250;
 response=await wedding.PUT(request('/api/wedding',{w:d.w,revision:0},'PUT'));assert.equal(response.status,200);assert.equal((await response.json()).revision,1);
 assert.equal((await wedding.PUT(request('/api/wedding',{w:d.w,revision:0},'PUT'))).status,409);
 assert.equal((await server.row()).w.guests[0].email,undefined,'guest email fields are never stored');
 user={userId:'other'};assert.equal((await wedding.GET()).status,401);
 user=null;assert.equal((await guest.GET(new Request(base+'/api/guest?token=invalid'))).status,403);
 response=await guest.GET(new Request(base+'/api/guest?token='+token));let publicData=await response.json();assert.equal(publicData.events.length,1);assert(!('budget' in publicData.settings));assert(!('catering' in publicData.settings));assert(!('guests' in publicData));assert(!('vendors' in publicData));assert(!('email' in publicData.guest));assert(!('plusOneEmail' in publicData.guest));
 assert.equal((await guest.POST(request('/api/guest',{token,responses:{ceremony:'yes'},meal:'Standard',bringPlusOne:true,plusOneName:''}))).status,400);
 assert.equal((await guest.POST(request('/api/guest',{token,responses:{ceremony:'yes'},meal:'Standard',plusOneName:'Partner',plusOneMeal:'invalid'}))).status,400);
 assert.equal((await guest.POST(request('/api/guest',{token,responses:{}}))).status,400);
 // Two guests replying at the same moment: both replies must be kept.
 const [a,b]=await Promise.all([
  guest.POST(request('/api/guest',{token,responses:{ceremony:'yes'},meal:'Standard',plusOneName:'Partner',plusOneMeal:'Vegetarian',plusOneEmail:'companion@example.test',plusOnePhone:'0712345678',name:'Guest Full Name',email:'guest@example.test',phone:'0823456789',allergy:'Nuts'})),
  guest.POST(request('/api/guest',{token:token2,responses:{ceremony:'yes',brunch:'no'},meal:'Vegan'}))]);
 assert.equal(a.status,200);assert.equal(b.status,200);
 let r=await server.row(),w=r.w;assert.equal(model.countGuests(w),3);assert.equal(model.totals(w).catering,750);assert.equal(w.guests[0].name,'Guest Full Name');assert.equal(w.guests[0].email,undefined);assert.equal(w.guests[0].phone,'0823456789');assert.equal(w.guests[0].plusOneEmail,undefined);assert.equal(w.guests[0].plusOnePhone,'0712345678');assert.equal(w.guests[1].responses.brunch,'no');
 user=couple;w.tables[0].assignments=['guest-1'];assert.equal((await wedding.PUT(request('/api/wedding',{w,revision:r.revision},'PUT'))).status,200);
 user=null;assert.equal((await guest.POST(request('/api/guest',{token,responses:{ceremony:'no'}}))).status,200);w=(await server.row()).w;assert.equal(model.countGuests(w),1);assert.equal(w.tables[0].assignments.length,0);
 // Guest photo upload in parts, then visible to guests on the photo wall.
 const png=new Uint8Array([137,80,78,71,1,2,3]);let photo=await send(png,'image/png',{token});assert.equal(photo.status,200);
 response=await get(photo.id,{token});assert.equal(response.status,200);assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[...png]);
 assert.equal((await send(new Uint8Array([1]),'video/mp4',{token})).status,400,'guests upload photos only');
 assert.equal((await send(new Uint8Array(10000001),'image/jpeg',{token})).status,400,'guest photo size limit');
 // Another guest cannot finish or add parts to someone else's upload.
 let started=await (await upload.POST(request('/api/upload',{action:'start',token,type:'image/png',size:3}))).json();
 assert.equal((await upload.PUT(new Request(base+'/api/upload?id='+started.id+'&part=0&token='+token2,{method:'PUT',headers:{origin:base},body:new Uint8Array(3)}))).status,403);
 assert.equal((await upload.POST(request('/api/upload',{action:'finish',id:started.id,token}))).status,400,'incomplete uploads are refused');
 assert.equal((await get(started.id,{token})).status,401);user=couple;assert.equal((await get(started.id)).status,404);user=null;
 // Private couple assets stay private.
 user=couple;const asset=await send(new TextEncoder().encode('image'),'image/png',{kind:'asset'});assert.equal(asset.status,200);
 user=null;assert.equal((await get(asset.id,{token})).status,401);assert.equal((await (await photos.GET(new Request(base+'/api/photos?token='+token))).json()).photos.length,1);
 // Invitation video: multi-part storage, iPhone-style byte ranges, capped partial responses.
 user=couple;const size=CHUNK_SIZE*2+1000,video=new Uint8Array(size);for(let i=0;i<size;i++)video[i]=i%251;video.set([0,0,0,24,...new TextEncoder().encode('ftypisom')]);
 assert.equal((await send(new TextEncoder().encode('not really a video file'),'video/mp4',{kind:'asset'})).status,400,'non-MP4 bytes are refused');
 const uploaded=await send(video,'video/mp4',{kind:'asset'});assert.equal(uploaded.status,200);const id=uploaded.id;
 r=await server.row();w=r.w;w.settings.video='/api/media/'+id;assert.equal((await wedding.PUT(request('/api/wedding',{w,revision:r.revision},'PUT'))).status,200);
 user=null;const bytes=async res=>new Uint8Array(await res.arrayBuffer());
 response=await get(id,{token,range:'bytes=0-1'});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes 0-1/${size}`);assert.equal(response.headers.get('content-length'),'2');assert.deepEqual([...await bytes(response)],[...video.subarray(0,2)]);
 response=await get(id,{token,range:`bytes=${CHUNK_SIZE-2}-${CHUNK_SIZE+1}`});assert.equal(response.status,206);assert.deepEqual([...await bytes(response)],[...video.subarray(CHUNK_SIZE-2,CHUNK_SIZE+2)],'range across parts');
 response=await get(id,{token,range:'bytes=10-'});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes 10-${10+CHUNK_SIZE-1}/${size}`);assert.equal((await bytes(response)).length,CHUNK_SIZE);
 response=await get(id,{token,range:'bytes=-5'});assert.deepEqual([...await bytes(response)],[...video.subarray(size-5)]);
 response=await get(id,{token,range:`bytes=${size}-`});assert.equal(response.status,416);assert.equal(response.headers.get('content-range'),`bytes */${size}`);
 response=await get(id,{token});assert.equal(response.status,200);assert.deepEqual(await bytes(response),video);
 response=await get(id,{token,method:'HEAD'});assert.equal(response.status,200);assert.equal(response.headers.get('content-length'),String(size));
 assert.equal((await get(id,{range:'bytes=0-1'})).status,401);
 // A guest replies while the couple has the dashboard open: the couple's later save keeps the reply.
 user=couple;let open=(await (await wedding.GET()).json());user=null;
 assert.equal((await guest.POST(request('/api/guest',{token:token2,responses:{ceremony:'no',brunch:'yes'},meal:'Vegetarian',message:'See you at brunch'}))).status,200);
 user=couple;open.w.settings.venue='A lovely new venue';assert.equal((await wedding.PUT(request('/api/wedding',{w:open.w,revision:open.revision},'PUT'))).status,200);
 w=(await server.row()).w;assert.equal(w.settings.venue,'A lovely new venue');assert.deepEqual(w.guests[1].responses,{ceremony:'no',brunch:'yes'});assert.equal(w.guests[1].message,'See you at brunch');
 // The couple corrects a reply themselves (e.g. a guest phoned): that edit is saved.
 open=(await (await wedding.GET()).json());open.w.guests[1].meal='Vegan';open.w.guests[1].responses={ceremony:'yes',brunch:'yes'};
 assert.equal((await wedding.PUT(request('/api/wedding',{w:open.w,revision:open.revision},'PUT'))).status,200);
 w=(await server.row()).w;assert.equal(w.guests[1].meal,'Vegan');assert.equal(w.guests[1].responses.ceremony,'yes');assert.equal(w.guests[1].message,'See you at brunch');
 assert(!JSON.stringify((await store('wedding-data').get('wedding',{type:'json'}))).includes('rsvpVersion'),'merge markers are not stored');
 user=null;
 // Plus-one permission is controlled by the couple only.
 user=couple;r=await server.row();w=r.w;w.guests[0].plusOneAllowed=false;w.guests[0].plusOneName='Old companion';
 assert.equal((await wedding.PUT(request('/api/wedding',{w,revision:r.revision},'PUT'))).status,200);assert.equal((await server.row()).w.guests[0].plusOneName,'');
 user=null;response=await guest.POST(request('/api/guest',{token,name:'Guest Full Name',responses:{ceremony:'yes'},meal:'Standard',plusOneAllowed:true,plusOneName:'Unapproved guest',plusOneMeal:'Standard',events:['not-invited']}));assert.equal(response.status,200);
 w=(await server.row()).w;assert.equal(w.guests[0].plusOneAllowed,false);assert.equal(w.guests[0].plusOneName,'');assert.deepEqual(w.guests[0].events,['ceremony']);
 assert.equal((await guest.POST(request('/api/guest',{token,name:'',responses:{ceremony:'no'}}))).status,400);
 // Couple removes a gallery photo: file parts and index entry are deleted.
 user=couple;assert.equal((await photos.DELETE(request('/api/photos',{id:photo.id},'DELETE'))).status,200);assert.equal((await get(photo.id)).status,404);assert.equal([...store('wedding-media').items.keys()].filter(k=>k.startsWith(photo.id)).length,0);
 // Transfer: keeps original media IDs, refuses to overwrite without "replace".
 const oldId='0f8fad5b-d9cb-469f-a165-70867728950e';let res=await upload.POST(request('/api/upload',{action:'start',import:true,id:oldId,type:'image/jpeg',size:4,kind:'photo',name:'Aunt May',guest:'g-old',created:'2026-01-01T00:00:00.000Z'}));assert.equal(res.status,200);
 assert.equal((await upload.PUT(new Request(base+'/api/upload?id='+oldId+'&part=0',{method:'PUT',headers:{origin:base},body:new Uint8Array([9,9,9,9])}))).status,200);
 assert.equal((await upload.POST(request('/api/upload',{action:'finish',id:oldId}))).status,200);
 assert.equal((await (await upload.POST(request('/api/upload',{action:'start',import:true,id:oldId,type:'image/jpeg',size:4}))).json()).exists,true,'re-running a transfer skips finished files');
 const imported={...model.initialWedding(),guests:[{id:'g-old',name:'Old Guest',token:'t'.repeat(40),email:'old@example.test',events:['ceremony'],responses:{ceremony:'yes'}}]};
 assert.equal((await transfer.POST(request('/api/transfer',{w:imported,photos:[{id:oldId,kind:'photo',name:'Aunt May',created:'2026-01-01T00:00:00.000Z'}]}))).status,409);
 res=await transfer.POST(request('/api/transfer',{w:imported,photos:[{id:oldId,kind:'photo',name:'Aunt May',created:'2026-01-01T00:00:00.000Z'}],replace:true}));assert.equal(res.status,200);
 w=(await server.row()).w;assert.equal(w.guests[0].token,'t'.repeat(40));assert.equal(w.guests[0].email,undefined);
 const list=(await (await photos.GET(new Request(base+'/api/photos?token='+'t'.repeat(40)))).json()).photos;assert.deepEqual(list.map(p=>p.id),[oldId]);
 user=null;assert.equal((await transfer.POST(request('/api/transfer',{w:imported,photos:[],replace:true}))).status,401);
 const zip=load('lib/zip.ts');assert.equal((await zip.zipFiles([{name:'photo.txt',bytes:new TextEncoder().encode('hello wedding')}]).arrayBuffer()).byteLength>0,true);
 console.log('PASS: private couple access, stale-save protection, simultaneous RSVPs, replies kept while the couple edits, couple RSVP corrections, event visibility, RSVP + plus-one rules, email-free guests, catering, seating cleanup, multi-part uploads, upload ownership, private assets, video byte ranges, photo removal and transfer import.');
})().catch(e=>{console.log(e);process.exitCode=1});
