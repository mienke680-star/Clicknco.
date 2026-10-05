// Loads the TypeScript server modules in Node with an in-memory Netlify Blobs store.
const fs=require('node:fs'),ts=require('typescript');
function memoryStore(){const items=new Map();let n=0;const clone=v=>typeof v==='string'?v:v.slice(0);
 const read=(v,type)=>type==='json'?JSON.parse(typeof v==='string'?v:Buffer.from(v).toString()):type==='arrayBuffer'?(typeof v==='string'?new TextEncoder().encode(v).buffer:clone(v)):typeof v==='string'?v:Buffer.from(v).toString();
 const write=(key,value,o={})=>{const cur=items.get(key);if(o.onlyIfNew&&cur)return {modified:false};if(o.onlyIfMatch!==undefined&&(!cur||cur.etag!==o.onlyIfMatch))return {modified:false};const etag='"e'+(++n)+'"';items.set(key,{value,etag});return {modified:true,etag};};
 return {items,async get(key,o={}){const cur=items.get(key);return cur?read(cur.value,o.type):null;},async getWithMetadata(key,o={}){const cur=items.get(key);return cur?{data:read(cur.value,o.type),etag:cur.etag,metadata:{}}:null;},async getMetadata(key){const cur=items.get(key);return cur?{etag:cur.etag,metadata:{}}:null;},
  async set(key,value,o){if(value instanceof Blob)value=await value.arrayBuffer();if(ArrayBuffer.isView(value))value=value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);return write(key,value,o);},async setJSON(key,value,o){return write(key,JSON.stringify(value),o);},async delete(key){items.delete(key);}};}
function harness(extra={}){const stores=new Map();const blobs={getStore:o=>{const name=typeof o==='string'?o:o.name;if(!stores.has(name))stores.set(name,memoryStore());return stores.get(name);}};const cache={};
 function load(file){if(cache[file])return cache[file].exports;const mod={exports:{}};cache[file]=mod;const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const resolve=id=>{if(id in extra)return typeof extra[id]==='function'?extra[id]():extra[id];if(id==='@netlify/blobs')return blobs;if(id.startsWith('@/'))return load(id.slice(2)+'.ts');if(id.startsWith('./'))return load('lib/'+id.slice(2)+'.ts');return require(id);};
  new Function('require','module','exports',code)(resolve,mod,mod.exports);return mod.exports;}
 return {load,stores,store:name=>blobs.getStore(name)};}
module.exports={harness};
