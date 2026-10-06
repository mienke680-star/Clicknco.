// Personalised PDF invitations: content per guest, real link annotations, reuse vs regeneration,
// token stability and couple-only access. Text and links are read back with PDF.js.
const assert=require('node:assert/strict');const {harness}=require('./harness.cjs');console.error=()=>{};
let user=null;const fakeAuth={getCoupleUser:async()=>user?.userId==='couple'?user:null};
const {load,store}=harness({'./auth':fakeAuth,'@/lib/auth':fakeAuth});
const wedding=load('app/api/wedding/route.ts'),invitations=load('app/api/invitations/route.ts'),one=load('app/api/invitations/[guestId]/route.ts'),server=load('lib/server.ts'),{ensureInvitation,inviteLink}=load('lib/invitations.ts'),{TAGLINE,BUTTON_LABEL,PLUS_ONE_NOTE}=load('lib/invitation-pdf.ts');
const base='https://wedding.test';const json=(path,data,method='POST')=>new Request(base+path,{method,headers:{'content-type':'application/json',origin:base},body:JSON.stringify(data)});
async function read(bytes){const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:false,isEvalSupported:false}).promise;assert.equal(doc.numPages,1);const page=await doc.getPage(1);
 const text=(await page.getTextContent()).items.map(i=>i.str).join(' ').replace(/\s+/g,' ');if(process.env.SHOW)console.log(text);const links=(await page.getAnnotations()).filter(a=>a.subtype==='Link').map(a=>a.url);return {text,links};}
(async()=>{
 user={userId:'couple'};let d=await (await wedding.GET()).json();
 const tokA='a'.repeat(20)+crypto.randomUUID(),tokB='b'.repeat(20)+crypto.randomUUID();
 d.w.settings.venue='Villa Aegea';d.w.settings.address='12 Seaview Road, Paternoster';
 d.w.guests.push({id:'ga',name:'Ouma Ria van der Merwe',token:tokA,events:['ceremony','brunch'],responses:{},plusOneAllowed:true},{id:'gb',name:'Thabo Nkosi',token:tokB,events:['ceremony'],responses:{},plusOneAllowed:false});
 assert.equal((await wedding.PUT(json('/api/wedding',{w:d.w,revision:d.revision},'PUT'))).status,200);
 // Access: couple only.
 user=null;assert.equal((await invitations.POST(json('/api/invitations',{guestIds:['ga']}))).status,401);assert.equal((await one.GET(new Request(base+'/api/invitations/ga'),{params:Promise.resolve({guestId:'ga'})})).status,401);
 assert.equal((await one.GET(new Request(base+'/api/invitations/ga?token='+tokA),{params:Promise.resolve({guestId:'ga'})})).status,401,'a guest link cannot fetch PDFs');
 user={userId:'couple'};
 let r=await invitations.POST(json('/api/invitations',{guestIds:['ga','gb']}));assert.equal(r.status,200);let res=(await r.json()).results;assert.deepEqual(res.map(x=>x.status),['generated','generated']);
 const get=async(id,q='')=>one.GET(new Request(base+'/api/invitations/'+id+q),{params:Promise.resolve({guestId:id})});
 r=await get('ga','?download=1');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');assert.match(r.headers.get('content-disposition'),/^attachment; .*Ouma%20Ria%20van%20der%20Merwe\.pdf/);assert.equal(r.headers.get('x-invitation-status'),'reused');assert.equal(r.headers.get('cache-control'),'private, no-store');
 const A=await read(await r.arrayBuffer()),B=await read(await (await get('gb')).arrayBuffer());
 const linkA=inviteLink(base,{token:tokA}),linkB=inviteLink(base,{token:tokB});
 for(const [P,name,link,other] of [[A,'Ouma Ria van der Merwe',linkA,'Thabo'],[B,'Thabo Nkosi',linkB,'Ouma']]){
  assert(P.text.includes('An invitation especially for'),'invitation line');assert(P.text.includes(name),'own name: '+name);assert(!P.text.includes(other),'no other guest name');
  assert(P.text.includes(TAGLINE));assert(P.text.includes(BUTTON_LABEL));assert(P.text.includes('Mienke & Luvhan'));assert(P.text.includes('SATURDAY, 24 APRIL 2027'));assert(P.text.includes('Villa Aegea'));
  assert(P.links.length>=3&&P.links.every(u=>u===link),'every clickable link opens this guest’s own invitation');
 }
 assert(A.text.includes(PLUS_ONE_NOTE),'plus-one note when allowed');assert(!B.text.includes('plus one'),'no plus-one note otherwise');
 assert(A.text.includes('Farewell brunch')&&!B.text.includes('Farewell brunch'),'only their invited events');
 // Reuse vs regeneration.
 const status=async id=>(await (await invitations.POST(json('/api/invitations',{guestIds:[id]}))).json()).results[0].status;
 assert.equal(await status('ga'),'reused');
 const edit=async change=>{const cur=await (await wedding.GET()).json();change(cur.w);assert.equal((await wedding.PUT(json('/api/wedding',{w:cur.w,revision:cur.revision},'PUT'))).status,200);};
 await edit(w=>{w.settings.budget=999999;w.tasks.push({id:'t',name:'Unrelated task'});});assert.equal(await status('ga'),'reused','unrelated changes reuse the PDF');
 await edit(w=>{w.guests[0].name='Ouma Ria';});assert.equal(await status('ga'),'generated','name change regenerates');assert.equal(await status('gb'),'reused','other guests untouched');
 await edit(w=>{w.guests[1].plusOneAllowed=true;});assert.equal(await status('gb'),'generated','plus-one change regenerates');
 assert((await read(await (await get('gb')).arrayBuffer())).text.includes(PLUS_ONE_NOTE),'plus-one note now included');
 await edit(w=>{w.settings.venue='Olive Grove Chapel';});assert.equal(await status('ga'),'generated','wedding details change regenerates');
 process.env.SITE_URL='https://our-new-domain.test';const moved=await read(await (await get('ga')).arrayBuffer());assert(moved.links.every(u=>u===inviteLink('https://our-new-domain.test',{token:tokA})),'link follows the site address');delete process.env.SITE_URL;
 // Tokens never change because of PDFs.
 const w=(await server.row()).w;assert.equal(w.guests.find(g=>g.id==='ga').token,tokA);assert.equal(w.guests.find(g=>g.id==='gb').token,tokB);
 // Stored privately per guest; removed guests' PDFs are cleaned up.
 assert.deepEqual([...store('wedding-media').items.keys()].filter(k=>k.startsWith('invitations/')).sort(),['invitations/ga','invitations/gb']);
 await edit(w=>{w.guests=w.guests.filter(g=>g.id!=='gb');});await status('ga');assert.deepEqual([...store('wedding-media').items.keys()].filter(k=>k.startsWith('invitations/')),['invitations/ga']);
 assert.equal((await get('gb')).status,404);
 console.log('PASS: personalised PDFs per guest (own name, own link on every clickable area, invited events, plus-one wording), reuse when unchanged, regeneration on name/plus-one/details/link changes, stable tokens, couple-only access and cleanup.');
})().catch(e=>{console.log(e);process.exitCode=1});
