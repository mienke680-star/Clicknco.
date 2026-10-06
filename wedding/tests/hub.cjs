// Wedding hub server rules: visibility, audiences, privacy between guests, deadlines,
// accommodation capacity, questions, lifts, notifications (no simulated delivery) and the scheduler.
const assert=require('node:assert/strict');const {harness}=require('./harness.cjs');console.error=()=>{};
let user=null;const fakeAuth={getCoupleUser:async()=>user?.userId==='couple'?user:null};
const {load,store}=harness({'./auth':fakeAuth,'@/lib/auth':fakeAuth});
const wedding=load('app/api/wedding/route.ts'),guestApi=load('app/api/guest/route.ts'),action=load('app/api/guest/action/route.ts'),lifts=load('app/api/guest/lifts/route.ts'),cal=load('app/api/calendar/[token]/route.ts'),hub=load('app/api/hub/route.ts'),outbox=load('app/api/hub/outbox/route.ts'),photos=load('app/api/photos/route.ts'),upload=load('app/api/upload/route.ts'),media=load('app/api/media/[id]/route.ts');
const notify=load('lib/notify.ts'),{sastToday,addDays}=load('lib/time.ts');
const base='https://wedding.test';const req=(path,data,method='POST')=>new Request(base+path,{method,headers:{'content-type':'application/json',origin:base},body:JSON.stringify(data)});
const couple={userId:'couple'};const T=n=>'t'.repeat(10)+n+crypto.randomUUID();
const tok={a:T('a'),b:T('b'),c:T('c')};
const getGuest=async(t,q='')=>{const r=await guestApi.GET(new Request(base+'/api/guest?token='+t+q));assert.equal(r.status,200,await r.clone().text());return r.json();};
const act=async(t,data)=>action.POST(req('/api/guest/action',{token:t,...data}));
const edit=async change=>{user=couple;const cur=await (await wedding.GET()).json();change(cur.w);const r=await wedding.PUT(req('/api/wedding',{w:cur.w,revision:cur.revision},'PUT'));user=null;return r;};
(async()=>{
 const today=sastToday(),future=addDays(today,30),past=addDays(today,-1),soon=addDays(today,2);
 user=couple;let d=await (await wedding.GET()).json();
 assert.deepEqual(d.w.planner,[],'older weddings gain empty hub sections');
 Object.assign(d.w.settings,{rsvpDeadline:future,secretCoupleNote:'private!',helperName:'Anna',helperPhone:'0821234567',accommodationOffered:true});
 d.w.events=[{id:'ceremony',name:'The wedding',date:future,time:'15:00',venue:'Chapel',image:'/api/media/ev-img'},{id:'secret',name:'Surprise dinner',date:future,time:'19:00',status:'draft',image:'/api/media/draft-img'},{id:'brunch',name:'Farewell brunch',date:addDays(future,1),venue:'Garden',rsvp:{required:true,deadline:soon,reminders:[3]}}];
 d.w.planner=[{id:'p1',name:'Florist call',date:future,time:'09:00',category:'supplier'}];
 d.w.guests=[{id:'a',name:'Ouma Ria',token:tok.a,events:['ceremony','secret','brunch'],group:'Family',household:'Van der Merwe',responses:{},notes:'INTERNAL NOTE',phone:'082 111 2222'},{id:'b',name:'Oupa Jan',token:tok.b,events:['ceremony'],group:'Family',household:'Van der Merwe',responses:{}},{id:'c',name:'Thabo',token:tok.c,events:['ceremony','brunch'],group:'Friends',responses:{},phone:'+27 83 555 0000'}];
 const now=Date.now(),iso=ms=>new Date(ms).toISOString();
 d.w.updates=[{id:'u1',heading:'Welcome',message:'Hello all',status:'published',publishedAt:iso(now-5e6),audience:{mode:'all'}},
  {id:'u2',heading:'Friends only',status:'published',publishedAt:iso(now-4e6),audience:{mode:'groups',groups:['Friends']},media:'/api/media/friends-img'},
  {id:'u3',heading:'Future',status:'scheduled',publishAt:iso(now+864e5),audience:{mode:'all'}},
  {id:'u4',heading:'Went live',status:'scheduled',publishAt:iso(now-1e5),notify:true,audience:{mode:'all'}},
  {id:'u5',heading:'Draft',status:'draft',audience:{mode:'all'}},{id:'u6',heading:'Archived',status:'archived',publishedAt:iso(now-9e6),audience:{mode:'all'}},
  {id:'u7',heading:'Household note',status:'published',publishedAt:iso(now-1e6),audience:{mode:'households',households:['Van der Merwe']},requireAck:true,pinned:true}];
 d.w.polls=[{id:'q1',question:'Dance song?',options:['Waltz','Jive'],status:'open',audience:{mode:'all'}},{id:'q2',question:'Friends poll',options:['x','y'],status:'open',audience:{mode:'groups',groups:['Friends']}}];
 d.w.faq=[{id:'f1',question:'Parking?',answer:'Yes',published:true},{id:'f2',question:'Hidden',published:false}];
 d.w.rooms=[{id:'r1',name:'Sea room',place:'Villa',capacity:2}];
 assert.equal((await wedding.PUT(req('/api/wedding',{w:d.w,revision:d.revision},'PUT'))).status,200);user=null;
 // --- Visibility & privacy ---
 let A=await getGuest(tok.a);
 assert.deepEqual(A.events.map(e=>e.id),['ceremony','brunch'],'drafts and private planner items never reach guests');
 assert.deepEqual(A.updates.map(u=>u.id),['u7','u4','u1'],'pinned first, then newest; only live updates for their audience');
 assert(!('budget' in A.settings)&&!('secretCoupleNote' in A.settings)&&A.settings.helperName==='Anna','settings allow-list');
 const raw=JSON.stringify(A);for(const leak of ['INTERNAL NOTE',tok.b,tok.c,'Thabo','Florist','Surprise dinner','Friends only','Hidden'])assert(!raw.includes(leak),'guest A must not see: '+leak);
 assert.deepEqual(A.guest.members,[{name:'Oupa Jan',status:'Awaiting your reply'}],'household members only');
 assert.deepEqual(A.polls.map(p=>p.id),['q1']);assert.deepEqual(A.faq.map(f=>f.id),['f1']);
 assert(A.todo.some(t=>t.id==='rsvp')&&A.todo.some(t=>t.id==='ack-u7')&&A.todo.some(t=>t.id==='poll-q1'));
 assert.equal(A.events.find(e=>e.id==='brunch').when,'Time to be confirmed','no invented times');
 const C=await getGuest(tok.c);assert.deepEqual(C.updates.map(u=>u.id).sort(),['u1','u2','u4']);assert(!JSON.stringify(C).includes('Ouma'),'no other guests in C’s data');assert.deepEqual(C.guest.members,[]);
 assert.equal((await guestApi.GET(new Request(base+'/api/guest?token=nope'))).status,403);
 // --- Opened vs acknowledged ---
 assert.equal((await act(tok.a,{action:'open-update',id:'u7'})).status,200);A=await getGuest(tok.a);let u7=A.updates.find(u=>u.id==='u7');assert(u7.opened&&!u7.acked,'opening is not confirming');
 assert.equal((await act(tok.a,{action:'ack-update',id:'u1'})).status,400,'only updates asking for it can be confirmed');
 assert.equal((await act(tok.c,{action:'ack-update',id:'u7'})).status,404,'not their update');
 assert.equal((await act(tok.a,{action:'ack-update',id:'u7'})).status,200);A=await getGuest(tok.a);assert(A.updates.find(u=>u.id==='u7').acked&&!A.todo.some(t=>t.id==='ack-u7'));
 // Preview by the couple is flagged; a guest can't claim to be a preview.
 user=couple;assert.equal((await getGuest(tok.a,'&preview=1')).preview,true);user=null;assert.equal((await getGuest(tok.a,'&preview=1')).preview,false);
 // --- RSVP: visible events only, deadlines ---
 let r=await guestApi.POST(req('/api/guest',{token:tok.a,responses:{ceremony:'yes'},meal:'Standard'}));assert.equal(r.status,400,'brunch still needs an answer');
 r=await guestApi.POST(req('/api/guest',{token:tok.a,responses:{ceremony:'yes',brunch:'no'},meal:'Standard'}));assert.equal(r.status,200,await r.clone().text());
 A=await getGuest(tok.a);assert.equal(A.rsvp.status,'attending');assert(!('secret' in A.guest.responses));
 await edit(w=>{w.events.find(e=>e.id==='brunch').rsvp.deadline=past;});
 r=await guestApi.POST(req('/api/guest',{token:tok.a,responses:{ceremony:'yes',brunch:'yes'},meal:'Standard'}));assert.equal(r.status,400,'changing after the deadline is blocked');assert.match((await r.json()).error,/reply date for Farewell brunch has passed/);
 r=await guestApi.POST(req('/api/guest',{token:tok.c,responses:{ceremony:'yes',brunch:'yes'},meal:'Vegan'}));assert.equal(r.status,200,'a first, late reply is still accepted');
 await edit(w=>{w.events.find(e=>e.id==='brunch').rsvp.deadline=soon;});
 r=await guestApi.POST(req('/api/guest',{token:tok.a,responses:{ceremony:'no',brunch:'yes'},meal:'Standard'}));assert.equal(r.status,200);
 // --- Accommodation: requests vs allocations, no overbooking ---
 assert.equal((await act(tok.a,{action:'accommodation',wanted:'yes',people:2,from:future,to:addDays(future,2)})).status,200);
 A=await getGuest(tok.a);assert.equal(A.accommodation.status,'requested');
 assert.equal((await edit(w=>{w.allocations=[{id:'al1',guestId:'a',roomId:'r1',people:2,status:'pending'},{id:'al2',guestId:'c',roomId:'r1',people:1,status:'confirmed'}];})).status,400,'overbooking is refused');
 assert.equal((await edit(w=>{w.allocations=[{id:'al1',guestId:'a',roomId:'r1',people:2,status:'pending'}];})).status,200);
 A=await getGuest(tok.a);assert.equal(A.accommodation.status,'allocated');assert.equal((await getGuest(tok.c)).accommodation.status,'none','C sees only their own');
 await edit(w=>{w.allocations[0].status='confirmed';});A=await getGuest(tok.a);assert.equal(A.accommodation.status,'confirmed');assert.equal(A.accommodation.room.name,'Sea room');
 // --- Private questions ---
 assert.equal((await act(tok.a,{action:'question',text:'Can we bring our dog?'})).status,200);
 assert.deepEqual((await getGuest(tok.c)).thread,[],'other guests never see the question');
 user=couple;let H=await (await hub.GET(new Request(base+'/api/hub'))).json();assert.deepEqual(H.threads.filter(t=>t.unanswered).map(t=>t.guestId),['a']);
 assert(H.activity.some(a=>a.type==='question'&&a.important)&&H.activity.some(a=>a.type==='rsvp-changed'),'changes reach the dashboard');
 assert.equal((await hub.POST(req('/api/hub',{action:'reply',guestId:'a',text:'Of course!'}))).status,200);user=null;
 A=await getGuest(tok.a);assert.equal(A.unreadReplies,1);assert(A.todo.some(t=>t.id==='replies'));await act(tok.a,{action:'seen',what:'questions'});assert.equal((await getGuest(tok.a)).unreadReplies,0);
 user=null;assert.equal((await hub.GET(new Request(base+'/api/hub'))).status,401,'hub is couple-only');
 // --- Lifts: shared only with consent ---
 assert.equal((await lifts.GET(new Request(base+'/api/guest/lifts?token='+tok.b))).status,403);
 assert.equal((await act(tok.a,{action:'lift',mode:'offer',seats:3,from:'Cape Town',share:true,contact:'082 111 2222'})).status,200);
 assert.equal((await act(tok.b,{action:'lift',mode:'need',from:'Paarl',share:false})).status,200);
 assert.equal((await act(tok.c,{action:'lift',mode:'need',from:'Stellenbosch',share:true,contact:'083 555 0000'})).status,200);
 let L=await (await lifts.GET(new Request(base+'/api/guest/lifts?token='+tok.c))).json();assert.deepEqual(L.lifts.map(x=>x.name),['Ouma Ria'],'B did not agree to share');
 // --- Notifications: no simulated delivery, no duplicates ---
 user=couple;r=await outbox.POST(req('/api/hub/outbox',{action:'notify-update',updateId:'u1'}));let N=await r.json();assert(N.created);
 r=await outbox.POST(req('/api/hub/outbox',{action:'notify-update',updateId:'u1'}));assert.equal((await r.json()).created,false,'no duplicate batch');
 assert.equal((await outbox.POST(req('/api/hub/outbox',{action:'notify-update',updateId:'u5'}))).status,400,'drafts can’t be announced');
 let O=(await (await outbox.GET(new Request(base+'/api/hub/outbox'))).json());let b=O.batches.find(x=>x.id===N.batch);
 assert.deepEqual(b.recipients.map(x=>[x.guestId,x.channel,x.status,x.automatic]).sort(),[['a','whatsapp','pending',false],['c','whatsapp','pending',false]]);assert.deepEqual(b.siteOnly.map(x=>x.guestId),['b']);
 assert(b.recipients.find(x=>x.guestId==='a').text.includes(base+'/invite/'+encodeURIComponent(tok.a)),'message links to the guest’s own invitation');
 assert.equal((await outbox.POST(req('/api/hub/outbox',{action:'mark',batchId:b.id,guestId:'a',channel:'whatsapp',status:'accepted'}))).status,400,'only providers report acceptance');
 assert.equal((await outbox.POST(req('/api/hub/outbox',{action:'mark',batchId:b.id,guestId:'a',channel:'whatsapp',status:'pending'}))).status,400,'nothing to retry yet');
 assert.equal((await outbox.POST(req('/api/hub/outbox',{action:'mark',batchId:b.id,guestId:'a',channel:'whatsapp',status:'sent_manually'}))).status,200);
 let res=await notify.deliverPending(async()=>{throw Error('must not call a provider when none is configured')});assert.deepEqual(res,{accepted:0,failed:0});
 // Provider configured: mocked Twilio accepts one and rejects one; nothing already sent is re-sent.
 Object.assign(process.env,{TWILIO_ACCOUNT_SID:'AC1',TWILIO_AUTH_TOKEN:'x',TWILIO_WHATSAPP_FROM:'+14155238886'});const calls=[];
 res=await notify.deliverPending(async(url,init)=>{const p=new URLSearchParams(init.body);calls.push(p.get('To'));return p.get('To')==='whatsapp:+27835550000'?Response.json({message:'Invalid number'},{status:400}):Response.json({sid:'SM1'},{status:201});});
 O=(await (await outbox.GET(new Request(base+'/api/hub/outbox'))).json());b=O.batches.find(x=>x.id===N.batch);
 assert.deepEqual(calls,['whatsapp:+27835550000'],'the manually-sent message is not sent again');assert.equal(b.recipients.find(x=>x.guestId==='c').status,'failed');assert.match(b.recipients.find(x=>x.guestId==='c').error,/Invalid number/);
 assert.equal((await outbox.POST(req('/api/hub/outbox',{action:'mark',batchId:b.id,guestId:'c',channel:'whatsapp',status:'pending'}))).status,200,'failed can be retried');
 res=await notify.deliverPending(async()=>Response.json({sid:'SM2'},{status:201}));assert.equal(res.accepted,1);
 O=(await (await outbox.GET(new Request(base+'/api/hub/outbox'))).json());assert.equal(O.batches.find(x=>x.id===N.batch).recipients.find(x=>x.guestId==='c').status,'accepted');
 for(const k of ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_WHATSAPP_FROM'])delete process.env[k];
 // --- Scheduler: scheduled update + RSVP reminders, each only once ---
 await edit(w=>{w.guests.find(g=>g.id==='b').events=['ceremony','brunch'];});user=couple;
 let S=await notify.runScheduler(new Date(),base);assert(S.created.includes('update-u4-v1'),'scheduled update announced');assert(S.created.some(x=>x.startsWith('reminder-brunch-')),'reminder prepared');
 S=await notify.runScheduler(new Date(),base);assert.deepEqual(S.created,[],'nothing duplicated on the next run');
 O=(await (await outbox.GET(new Request(base+'/api/hub/outbox'))).json());const rem=O.batches.find(x=>x.id.startsWith('reminder-brunch-'));assert.deepEqual([...rem.recipients.map(x=>x.guestId),...rem.siteOnly.map(x=>x.guestId)].sort(),['b'],'only guests who haven’t replied are reminded');
 // --- Calendar feed ---
 const ics=await (await cal.GET(new Request(base+'/api/calendar/'+tok.a+'.ics'),{params:Promise.resolve({token:tok.a+'.ics'})})).text();
 assert(ics.includes('SUMMARY:The wedding')&&ics.includes('SUMMARY:Farewell brunch')&&!ics.includes('Surprise')&&!ics.includes('Florist'));
 assert(ics.includes(`DTSTART:${future.replace(/-/g,'')}T130000Z`),'15:00 SAST is 13:00 UTC');assert(ics.includes(`DTSTART;VALUE=DATE:${addDays(future,1).replace(/-/g,'')}`),'no time → all-day');
 assert.equal((await cal.GET(new Request(base+'/api/calendar/nope.ics'),{params:Promise.resolve({token:'nope.ics'})})).status,403);
 // --- Revoking a link ---
 const newTok=T('a2');await edit(w=>{w.guests.find(g=>g.id==='a').token=newTok;});user=null;
 assert.equal((await guestApi.GET(new Request(base+'/api/guest?token='+tok.a))).status,403,'old link stops working');assert.equal((await getGuest(newTok)).guest.name,'Ouma Ria');tok.a=newTok;
 // --- Photo moderation & media access ---
 const send=async(t,bytes)=>{let r=await upload.POST(req('/api/upload',{action:'start',token:t,type:'image/png',size:bytes.length,kind:'photo'}));const s=await r.json();await upload.PUT(new Request(base+'/api/upload?id='+s.id+'&part=0&token='+t,{method:'PUT',headers:{origin:base},body:bytes}));return (await (await upload.POST(req('/api/upload',{action:'finish',id:s.id,token:t}))).json()).id;};
 const pid=await send(tok.c,new Uint8Array([137,80,78,71,1]));
 const getMedia=(id,t)=>media.GET(new Request(base+'/api/media/'+id+(t?'?token='+t:'')),{params:Promise.resolve({id})});
 assert.equal((await getMedia(pid,tok.c)).status,200,'uploader sees their own pending photo');assert.equal((await getMedia(pid,tok.a)).status,401,'others don’t until approved');
 let P=await (await photos.GET(new Request(base+'/api/photos?token='+tok.a))).json();assert.equal(P.photos.length,0);P=await (await photos.GET(new Request(base+'/api/photos?token='+tok.c))).json();assert.equal(P.mine[0].status,'pending');
 user=couple;assert.equal((await photos.PATCH(req('/api/photos',{id:pid,status:'approved'},'PATCH'))).status,200);user=null;
 assert.equal((await getMedia(pid,tok.a)).status,200);P=await (await photos.GET(new Request(base+'/api/photos?token='+tok.a))).json();assert.deepEqual(P.photos.map(p=>p.id),[pid]);
 // Media from drafts or other audiences is not reachable with a guest link.
 assert.equal((await getMedia('draft-img',tok.a)).status,401);assert.equal((await getMedia('friends-img',tok.a)).status,401);
 console.log('PASS: hub visibility (drafts, private items, audiences, scheduled/archived), settings allow-list, household-only data, opened vs acknowledged, preview flag, RSVP deadlines, accommodation capacity, private questions, consent-only lifts, notification batches without duplicates or simulated delivery, provider accepted/failed/retry, scheduler, calendar feed, link revocation and photo moderation.');
})().catch(e=>{console.log(e);process.exitCode=1});
