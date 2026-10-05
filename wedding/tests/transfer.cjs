const assert=require('node:assert/strict');const {harness}=require('./harness.cjs');
const {load}=harness();const {readZip,readManifest,mediaReferences}=load('lib/transfer.ts'),{zipFiles}=load('lib/zip.ts');
(async()=>{
 const w={settings:{cover:'/api/media/a-1',music:'https://example.test/x'},guests:[{id:'g',name:'G',token:'x'.repeat(30),email:'g@example.test',plusOneEmail:'p@example.test'}],events:[],tables:[],budget:[],vendors:[],tasks:[],moodboard:[{image:'/api/media/b-2'}],story:[],gifts:[]};
 assert.deepEqual([...mediaReferences(w)].sort(),['a-1','b-2']);
 const manifest={format:'our-wedding-transfer-v1',w,photos:[{id:'a-1',kind:'asset'},{id:'b-2',kind:'asset'}]};
 const data=new Uint8Array(await zipFiles([{name:'migration-manifest.json',bytes:new TextEncoder().encode(JSON.stringify(manifest))}]).arrayBuffer());
 const media=new Uint8Array(await zipFiles([{name:'media/a-1',bytes:new Uint8Array([1])},{name:'media/b-2',bytes:new Uint8Array([2,3])}]).arrayBuffer());
 const entries=new Map();readZip(data,entries);readZip(media,entries);const out=readManifest(entries);
 assert.equal(out.w.guests[0].email,undefined);assert.equal(out.w.guests[0].plusOneEmail,undefined);assert.deepEqual(out.w.layout,[]);
 assert.throws(()=>readManifest(readZip(data,new Map())),/Missing media file/);
 const damaged=media.slice();damaged[damaged.indexOf(2)]=9;assert.throws(()=>readZip(damaged,new Map()),/damaged/);
 assert.throws(()=>readZip(media,readZip(media,new Map())),/Duplicate/);
 console.log('PASS: transfer ZIP reading, corruption and missing-file detection, media reference discovery and guest email removal.');
})().catch(e=>{console.error(e);process.exitCode=1});
