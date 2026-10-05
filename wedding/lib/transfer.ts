// Shared by the transfer page (browser) and tests: reads the ZIPs made by the export tool.
export const TRANSFER_FORMAT='our-wedding-transfer-v1';
export type TransferPhoto={id:string;name?:string;guest?:string;created?:string;mime?:string;kind?:string};
export type TransferManifest={format:string;exported?:string;w:any;photos:TransferPhoto[]};
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc=(bytes:Uint8Array)=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
// The export tool writes uncompressed (STORE) records, so no decompression library is needed.
export function readZip(data:Uint8Array,entries=new Map<string,Uint8Array>()){
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength);let pos=0;
 while(pos+30<=data.length&&view.getUint32(pos,true)===0x04034b50){
  if(view.getUint16(pos+8,true)!==0||(view.getUint16(pos+6,true)&8))throw new Error('Use the ZIP files made by the wedding export tool.');
  const length=view.getUint32(pos+18,true),nameLength=view.getUint16(pos+26,true),extraLength=view.getUint16(pos+28,true),start=pos+30+nameLength+extraLength;
  if(start+length>data.length)throw new Error('A transfer ZIP is incomplete. Download it again.');
  const name=new TextDecoder().decode(data.subarray(pos+30,pos+30+nameLength));if(entries.has(name))throw new Error('Duplicate file in export: '+name);
  const bytes=data.subarray(start,start+length);if(crc(bytes)!==view.getUint32(pos+14,true))throw new Error('A transfer file is damaged: '+name);
  entries.set(name,bytes);pos=start+length;
 }
 return entries;
}
export function readManifest(entries:Map<string,Uint8Array>):TransferManifest{
 const raw=entries.get('migration-manifest.json');if(!raw)throw new Error('Include wedding-transfer-data.zip.');
 const manifest=JSON.parse(new TextDecoder().decode(raw));
 if(manifest?.format!==TRANSFER_FORMAT||!manifest.w?.settings||!Array.isArray(manifest.photos))throw new Error('The wedding data ZIP is not valid.');
 for(const key of ['guests','events','tables','budget','vendors','tasks','moodboard','story','gifts'])if(!Array.isArray(manifest.w[key]))throw new Error('Invalid wedding backup: '+key);
 if(!Array.isArray(manifest.w.layout))manifest.w.layout=[];
 const seen=new Set<string>();
 for(const p of manifest.photos){if(typeof p.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(p.id)||seen.has(p.id))throw new Error('Invalid media identifier in the export.');seen.add(p.id);if(!entries.has('media/'+p.id))throw new Error('Missing media file '+p.id+'. Select every media ZIP.');}
 for(const g of manifest.w.guests){delete g.email;delete g.plusOneEmail;}
 return manifest;
}
// Finds every /api/media/<id> reference in the wedding (video, music, artwork, story, inspiration).
export function mediaReferences(value:unknown,found=new Set<string>()){if(typeof value==='string'){const match=/^\/api\/media\/([a-zA-Z0-9-]+)$/.exec(value);if(match)found.add(match[1]);}else if(value&&typeof value==='object')Object.values(value).forEach(v=>mediaReferences(v,found));return found;}
