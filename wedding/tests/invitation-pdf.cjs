// Personalised envelope PDFs: the guest's name is the only text, one page at the picture's exact
// proportions, one link annotation over the envelope opening that guest's link, reuse vs
// regeneration, stable tokens and couple-only access. Read back with PDF.js.
const assert=require('node:assert/strict');const {harness}=require('./harness.cjs');console.error=()=>{};
let user=null;const fakeAuth={getCoupleUser:async()=>user?.userId==='couple'?user:null};
const {load,store}=harness({'./auth':fakeAuth,'@/lib/auth':fakeAuth});
const wedding=load('app/api/wedding/route.ts'),invitations=load('app/api/invitations/route.ts'),one=load('app/api/invitations/[guestId]/route.ts'),server=load('lib/server.ts'),{inviteLink}=load('lib/invitations.ts'),{PAGE,ENVELOPE_RECT}=load('lib/invitation-pdf.ts');
const base='https://wedding.test';const json=(path,data,method='POST')=>new Request(base+path,{method,headers:{'content-type':'application/json',origin:base},body:JSON.stringify(data)});
async function read(bytes){const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:false,isEvalSupported:false}).promise;const page=await doc.getPage(1);const [x0,y0,x1,y1]=page.view;
 const text=(await page.getTextContent()).items.map(i=>i.str).join(' ').replace(/\s+/g,' ').trim();const links=(await page.getAnnotations()).filter(a=>a.subtype==='Link').map(a=>({url:a.url,rect:a.rect}));return {pages:doc.numPages,size:[x1-x0,y1-y0],text,links};}
(async()=>{
 user={userId:'couple'};let d=await (await wedding.GET()).json();
 const tokA='a'.repeat(20)+crypto.randomUUID(),tokB='b'.repeat(20)+crypto.randomUUID();
 d.w.guests.push({id:'ga',name:'Ouma Ria van der Merwe',token:tokA,events:['ceremony','brunch'],responses:{},plusOneAllowed:true},{id:'gb',name:'Thabo Nkosi',token:tokB,events:['ceremony'],responses:{},plusOneAllowed:false});
 assert.equal((await wedding.PUT(json('/api/wedding',{w:d.w,revision:d.revision},'PUT'))).status,200);
 // Access: couple only.
 user=null;assert.equal((await invitations.POST(json('/api/invitations',{guestIds:['ga']}))).status,401);assert.equal((await one.GET(new Request(base+'/api/invitations/ga'),{params:Promise.resolve({guestId:'ga'})})).status,401);
 assert.equal((await one.GET(new Request(base+'/api/invitations/ga?token='+tokA),{params:Promise.resolve({guestId:'ga'})})).status,401,'a guest link cannot fetch PDFs');
 user={userId:'couple'};
 let r=await invitations.POST(json('/api/invitations',{guestIds:['ga','gb']}));assert.equal(r.status,200);assert.deepEqual((await r.json()).results.map(x=>x.status),['generated','generated']);
 const get=async(id,q='')=>one.GET(new Request(base+'/api/invitations/'+id+q),{params:Promise.resolve({guestId:id})});
 r=await get('ga','?download=1');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');assert.match(r.headers.get('content-disposition'),/^attachment; .*Ouma%20Ria%20van%20der%20Merwe\.pdf/);assert.equal(r.headers.get('x-invitation-status'),'reused');
 const A=await read(await r.arrayBuffer()),B=await read(await (await get('gb')).arrayBuffer());
 for(const [P,name,tok] of [[A,'Ouma Ria van der Merwe',tokA],[B,'Thabo Nkosi',tokB]]){
  assert.equal(P.pages,1,'one page');
  assert(Math.abs(P.size[0]-PAGE.width)<0.01&&Math.abs(P.size[1]-PAGE.height)<0.01,'page is the picture size');assert(Math.abs(P.size[0]/P.size[1]-1122/1402)<1e-9,'picture proportions, no stretching');
  assert.equal(P.text,name,'the guest name is the only text');
  assert.equal(P.links.length,1,'one link annotation');assert.equal(P.links[0].url,inviteLink(base,{token:tok}),'opens this guest’s own invitation');
  const [lx0,ly0,lx1,ly1]=P.links[0].rect;assert.deepEqual([lx0,ly0,lx1,ly1].map(v=>+v.toFixed(2)),[ENVELOPE_RECT.x,ENVELOPE_RECT.y,ENVELOPE_RECT.x+ENVELOPE_RECT.width,ENVELOPE_RECT.y+ENVELOPE_RECT.height].map(v=>+v.toFixed(2)),'link covers the envelope');
 }
 // Reuse vs regeneration: only the name, the link or the design change what is printed.
 const status=async id=>(await (await invitations.POST(json('/api/invitations',{guestIds:[id]}))).json()).results[0].status;
 assert.equal(await status('ga'),'reused');
 const edit=async change=>{const cur=await (await wedding.GET()).json();change(cur.w);assert.equal((await wedding.PUT(json('/api/wedding',{w:cur.w,revision:cur.revision},'PUT'))).status,200);};
 await edit(w=>{w.settings.venue='Olive Grove Chapel';w.settings.budget=1;w.guests[1].plusOneAllowed=true;});assert.equal(await status('ga'),'reused');assert.equal(await status('gb'),'reused','details not printed on the envelope do not regenerate');
 await edit(w=>{w.guests[0].name='Ouma Ria';});assert.equal(await status('ga'),'generated','name change regenerates');assert.equal(await status('gb'),'reused','other guests untouched');
 assert.equal((await read(await (await get('ga')).arrayBuffer())).text,'Ouma Ria');
 process.env.SITE_URL='https://our-new-domain.test';assert.equal(await status('ga'),'generated','new site address regenerates');const moved=await read(await (await get('ga')).arrayBuffer());assert.equal(moved.links[0].url,inviteLink('https://our-new-domain.test',{token:tokA}));delete process.env.SITE_URL;
 // PDFs made with the earlier design are replaced automatically the next time they are used.
 const media=store('wedding-media');const old=media.items.get('invitations/gb');old.metadata={...old.metadata,fingerprint:'greek-coastal-1-era'};
 assert.equal(await status('gb'),'generated','older design is regenerated');assert.equal((await read(await (await get('gb')).arrayBuffer())).links[0].url,inviteLink(base,{token:tokB}));
 // Tokens never change because of PDFs.
 const w=(await server.row()).w;assert.equal(w.guests.find(g=>g.id==='ga').token,tokA);assert.equal(w.guests.find(g=>g.id==='gb').token,tokB);
 assert.deepEqual([...media.items.keys()].filter(k=>k.startsWith('invitations/')).sort(),['invitations/ga','invitations/gb']);
 await edit(w=>{w.guests=w.guests.filter(g=>g.id!=='gb');});await status('ga');assert.deepEqual([...media.items.keys()].filter(k=>k.startsWith('invitations/')),['invitations/ga']);assert.equal((await get('gb')).status,404);
 console.log('PASS: envelope PDFs per guest (only their name as text, one page at the picture’s proportions, one link over the envelope to their own invitation), reuse when unchanged, regeneration on name/link/design changes incl. older PDFs, stable tokens, couple-only access and cleanup.');
})().catch(e=>{console.log(e);process.exitCode=1});
