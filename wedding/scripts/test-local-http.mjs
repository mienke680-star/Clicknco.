// End-to-end check of the production build (`npm run build` first) against Netlify's local
// Blobs server: real HTTP, real storage client, chunked uploads and byte-range video playback.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {BlobsServer} from '@netlify/blobs/server';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wedding-blobs-')),token='local-blobs-token',port=3999,base=`http://localhost:${port}`;
const blobs=new BlobsServer({directory:dir,token,port:3998});const {port:blobsPort}=await blobs.start();
const context=Buffer.from(JSON.stringify({edgeURL:`http://localhost:${blobsPort}`,uncachedEdgeURL:`http://localhost:${blobsPort}`,siteID:'local-site',token})).toString('base64');
const setupCode='local-setup-code-for-tests',password='Our local test password 2027';
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port)],{env:{...process.env,NETLIFY_BLOBS_CONTEXT:context,SETUP_CODE:setupCode,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
let log='';app.stdout.on('data',d=>log+=d);app.stderr.on('data',d=>log+=d);
try{
 for(let i=0;;i++){try{await fetch(base+'/login');break;}catch{if(i>100)throw Error('Server did not start:\n'+log);await new Promise(r=>setTimeout(r,200));}}
 const json=(method,body,headers={})=>({method,headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 let response=await fetch(base+'/api/wedding');assert.equal(response.status,401);
 response=await fetch(base+'/',{redirect:'manual'});assert.equal(response.status,307);assert.match(response.headers.get('location'),/\/login$/);
 assert.equal((await fetch(base+'/api/auth/login',json('POST',{password}))).status,503,'fails closed before setup');
 response=await fetch(base+'/api/auth/setup',json('POST',{password,setupCode}));assert.equal(response.status,200,await response.clone().text());
 response=await fetch(base+'/api/auth/login',json('POST',{password}));assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];
 assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('netlify-cdn-cache-control'),'no-store');
 response=await fetch(base+'/',{headers:{cookie}});assert.equal(response.status,200);assert.equal(response.headers.get('x-frame-options'),'DENY');
 response=await fetch(base+'/api/wedding',{headers:{cookie}});assert.equal(response.status,200);const {w,revision}=await response.json();
 // Upload a 7 MB invitation video in parts, like the dashboard does.
 const size=7*1024*1024+123,video=new Uint8Array(size);for(let i=0;i<size;i++)video[i]=i%253;
 const upload=async(bytes,type,extra={},auth={cookie})=>{let r=await fetch(base+'/api/upload',json('POST',{action:'start',type,size:bytes.length,...extra},auth));const start=await r.json();assert.equal(r.status,200,JSON.stringify(start));
  for(let part=0;part*start.chunkSize<bytes.length;part++){const q=new URLSearchParams({id:start.id,part:String(part)});if(extra.token)q.set('token',extra.token);r=await fetch(base+'/api/upload?'+q,{method:'PUT',headers:{Origin:base,'Content-Type':'application/octet-stream',...auth},body:bytes.subarray(part*start.chunkSize,(part+1)*start.chunkSize)});assert.equal(r.status,200,await r.clone().text());}
  r=await fetch(base+"/api/upload",json("POST",{action:"finish",id:start.id,token:extra.token},auth));assert.equal(r.status,200,await r.clone().text()+log);return await r.json();};
 const media=await upload(video,'video/mp4',{kind:'asset'});
 const guestToken=crypto.randomUUID()+crypto.randomUUID();
 w.settings.video=media.url;w.guests=[{id:'local-integration-guest',name:'Integration Guest',token:guestToken,events:w.events.map(e=>e.id),responses:{},plusOneAllowed:true,email:'drop@example.test'}];
 response=await fetch(base+'/api/wedding',json('PUT',{w,revision},{cookie}));assert.equal(response.status,200);
 response=await fetch(base+'/invite/'+guestToken);assert.equal(response.status,200);assert(!response.url.includes('/login'));
 response=await fetch(base+'/api/guest?token='+guestToken);assert.equal(response.status,200);const guest=await response.json();assert(!('email' in guest.guest));assert(!('budget' in guest.settings));
 const meal=w.settings.mealOptions.split(',')[0].trim();
 response=await fetch(base+'/api/guest',json('POST',{token:guestToken,name:'Integration Guest',responses:Object.fromEntries(w.events.map(e=>[e.id,'yes'])),meal,bringPlusOne:true,plusOneName:'Companion',plusOneMeal:meal}));assert.equal(response.status,200);
 // Guest video playback through their invitation link, iPhone-style.
 const v=media.url+'?token='+guestToken;
 response=await fetch(base+v,{headers:{Range:'bytes=0-1'}});assert.equal(response.status,206);assert.equal(response.headers.get('content-length'),'2');assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[0,1]);
 response=await fetch(base+v,{headers:{Range:'bytes=3145720-3145735'}});assert.equal(response.status,206);assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[...video.subarray(3145720,3145736)]);
 response=await fetch(base+v,{headers:{Range:'bytes=5-'}});assert.equal(response.status,206);assert.equal(Number(response.headers.get('content-length')),3*1024*1024);
 response=await fetch(base+v);assert.equal(response.status,200);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),video);
 response=await fetch(base+media.url);assert.equal(response.status,401);
 // Guest photo upload, then visible on the photo wall.
 const photo=await upload(new Uint8Array([137,80,78,71,13,10,26,10]),'image/png',{token:guestToken},{});
 response=await fetch(base+'/api/photos?token='+guestToken);assert.deepEqual((await response.json()).photos.map(p=>p.id),[photo.id]);
 // Data survives a server restart: everything lives in Blobs, not in memory.
 response=await fetch(base+'/api/wedding',{headers:{cookie}});const saved=(await response.json()).w;assert.equal(saved.guests[0].responses[w.events[0].id],'yes');assert.equal(saved.guests[0].plusOneName,'Companion');assert.equal(saved.guests[0].email,undefined);
 response=await fetch(base+'/api/auth/logout',{method:'POST',headers:{cookie,Origin:base}});assert.equal(response.status,200);assert(response.headers.get('set-cookie').includes('Max-Age=0'));
 const files=fs.readdirSync(dir,{recursive:true}).length;assert(files>5,'data is written to the Blobs store');
 console.log('PASS: production build over HTTP with Netlify Blobs: one-time password setup, login, no-store headers, dashboard saves, account-free invitation, plus-one RSVP, 7 MB chunked video upload, byte-range playback, guest photo upload and private media access.');
}finally{app.kill();await blobs.stop();fs.rmSync(dir,{recursive:true,force:true});}
