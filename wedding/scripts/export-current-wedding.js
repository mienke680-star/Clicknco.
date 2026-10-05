// Paste this complete script into the developer console on your OLD wedding site
// (ChatGPT-hosted, Cloudflare or Netlify edition),
// while signed in as the couple. It creates a private download panel.
(async()=>{
// Small dependency-free ZIP writer using STORE records (photos are already compressed).
function zipFiles(files){const chunks=[],directory=[];let offset=0;const encoder=new TextEncoder();const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});const crc=(data)=>{let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0};const header=(size)=>{const bytes=new Uint8Array(size);return {bytes,v:new DataView(bytes.buffer)}};for(const file of files){const name=encoder.encode(file.name),sum=crc(file.bytes),local=header(30);local.v.setUint32(0,0x04034b50,true);local.v.setUint16(4,20,true);local.v.setUint16(6,0x800,true);local.v.setUint32(14,sum,true);local.v.setUint32(18,file.bytes.length,true);local.v.setUint32(22,file.bytes.length,true);local.v.setUint16(26,name.length,true);chunks.push(local.bytes,name,file.bytes);const central=header(46);central.v.setUint32(0,0x02014b50,true);central.v.setUint16(4,20,true);central.v.setUint16(6,20,true);central.v.setUint16(8,0x800,true);central.v.setUint32(16,sum,true);central.v.setUint32(20,file.bytes.length,true);central.v.setUint32(24,file.bytes.length,true);central.v.setUint16(28,name.length,true);central.v.setUint32(42,offset,true);directory.push(central.bytes,name);offset+=30+name.length+file.bytes.length;}const length=directory.reduce((n,b)=>n+b.length,0),end=header(22);end.v.setUint32(0,0x06054b50,true);end.v.setUint16(8,files.length,true);end.v.setUint16(10,files.length,true);end.v.setUint32(12,length,true);end.v.setUint32(16,offset,true);return new Blob([...chunks,...directory,end.bytes],{type:'application/zip'});}

const get=async path=>{const r=await fetch(path);if(!r.ok)throw Error('Cannot read '+path+'. Sign in as the couple first.');return r.json();};
const {w}=await get('/api/wedding'),gallery=(await get('/api/photos')).photos||[];
const items=new Map(gallery.map(p=>[p.id,{...p,kind:'photo',guest:'imported'}]));
function collect(value){if(typeof value==='string'){const match=/^\/api\/media\/([a-zA-Z0-9-]+)$/.exec(value);if(match&&!items.has(match[1]))items.set(match[1],{id:match[1],name:'Wedding asset',kind:'asset',guest:'couple',created:new Date().toISOString()});}else if(value&&typeof value==='object')Object.values(value).forEach(collect);}
collect(w);
const panel=document.createElement('section');Object.assign(panel.style,{position:'fixed',inset:'20px',zIndex:'9999',overflow:'auto',background:'white',color:'#18334d',border:'1px solid #ccd9e6',borderRadius:'12px',padding:'24px',font:'16px Arial'});
const heading=document.createElement('h2');heading.textContent='Transfer our wedding';panel.append(heading);
const status=document.createElement('p');status.textContent='Preparing your wedding data and '+items.size+' media files…';panel.append(status);document.body.append(panel);
const close=document.createElement('button');close.textContent='Close';close.onclick=()=>panel.remove();panel.append(close);
const prepared=[],records=[];let files=[],size=0,batch=1;
function flush(){if(files.length){prepared.push({name:'wedding-transfer-media-'+batch+++'.zip',blob:zipFiles(files)});files=[];size=0;}}
try{
for(const record of items.values()){
 status.textContent='Preparing file '+(records.length+1)+' of '+items.size+'…';
 // Download in byte ranges: works on the old site and on Netlify, where large files arrive in parts.
 const chunks=[];let offset=0,total=Infinity;
 while(offset<total){const r=await fetch('/api/media/'+record.id,{headers:{Range:'bytes='+offset+'-'}});if(r.status===416&&offset>0)break;if(!r.ok)throw Error('Could not download media '+record.id);record.mime=r.headers.get('content-type')||record.mime||'application/octet-stream';const part=new Uint8Array(await r.arrayBuffer());if(r.status!==206){chunks.length=0;chunks.push(part);break;}const m=/\/(\d+)$/.exec(r.headers.get('content-range')||'');total=m?Number(m[1]):offset+part.length;if(!part.length)throw Error('Could not download media '+record.id);chunks.push(part);offset+=part.length;}
 const bytes=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));{let p=0;for(const c of chunks){bytes.set(c,p);p+=c.length;}}if(size+bytes.length>50000000&&files.length)flush();
 files.push({name:'media/'+record.id,bytes});size+=bytes.length;records.push(record);
}flush();
const manifest={format:'our-wedding-transfer-v1',exported:new Date().toISOString(),w,photos:records};
prepared.unshift({name:'wedding-transfer-data.zip',blob:zipFiles([{name:'migration-manifest.json',bytes:new TextEncoder().encode(JSON.stringify(manifest))}])});
status.textContent='Ready. Download EVERY file below and keep them together. They include private guest information and invitation links.';
for(const file of prepared){const a=document.createElement('a');a.href=URL.createObjectURL(file.blob);a.download=file.name;a.textContent='Download '+file.name;Object.assign(a.style,{display:'block',padding:'14px',margin:'10px 0',background:'#edf5fe',borderRadius:'8px'});panel.append(a);}
}catch(e){status.textContent='Export stopped: '+e.message+'. No partial export is offered. Refresh and try again.';}
})().catch(e=>alert(e.message));
