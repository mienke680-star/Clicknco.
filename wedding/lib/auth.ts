import {headers} from 'next/headers';
import {dataStore} from './store';
import {fromThisSite} from './origin';
const encoder=new TextEncoder();
export const SESSION_COOKIE='__Host-wedding-session';
const lifetime=7*24*60*60;
const ROUNDS=100000;
const encode=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode=(str:string)=>Uint8Array.from(atob(str.replaceAll('-','+').replaceAll('_','/')),x=>x.charCodeAt(0));
const validHash=(hash:string)=>/^pbkdf2-sha256\$100000\$[\w-]+\$[\w-]+$/.test(hash);
let cachedHash:{value:string;at:number}|null=null;
let cachedSecret='';
// The couple password hash comes from the COUPLE_PASSWORD_HASH environment variable when set,
// otherwise from the hash saved by the first-time setup page in Netlify Blobs.
export async function passwordHash(){
 const fromEnv=process.env.COUPLE_PASSWORD_HASH||'';if(validHash(fromEnv))return fromEnv;
 if(cachedHash&&Date.now()-cachedHash.at<15000)return cachedHash.value;
 const stored=String(await dataStore().get('auth/password-hash')||'');const value=validHash(stored)?stored:'';
 cachedHash={value,at:Date.now()};return value;
}
export function passwordManagedByEnv(){return validHash(process.env.COUPLE_PASSWORD_HASH||'');}
export async function authConfigured(){return !!await passwordHash();}
// A random signing secret is created once and kept privately in Netlify Blobs (or set SESSION_SECRET).
async function sessionSecret(){
 const fromEnv=process.env.SESSION_SECRET||'';if(fromEnv.length>=32)return fromEnv;
 if(cachedSecret)return cachedSecret;
 const store=dataStore();let secret=String(await store.get('auth/session-secret')||'');
 if(secret.length<32){await store.set('auth/session-secret',encode(crypto.getRandomValues(new Uint8Array(48))),{onlyIfNew:true});secret=String(await store.get('auth/session-secret')||'');}
 if(secret.length<32)throw new Error('Couple login is not configured.');
 return cachedSecret=secret;
}
// Sessions are bound to the current password hash: changing the password signs everyone out.
async function signingKey(){const hash=await passwordHash();if(!hash)throw new Error('Couple login is not configured.');return crypto.subtle.importKey('raw',encoder.encode(await sessionSecret()+'\n'+hash),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function createSession(){const payload=encode(encoder.encode(JSON.stringify({role:'couple',expires:Math.floor(Date.now()/1000)+lifetime,nonce:crypto.randomUUID()})));const signature=new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(),encoder.encode(payload)));return payload+'.'+encode(signature);}
export async function verifySession(token:string){try{
 if(!token||token.length>1500||!await authConfigured())return false;
 const parts=token.split('.');if(parts.length!==2)return false;
 const valid=await crypto.subtle.verify('HMAC',await signingKey(),decode(parts[1]),encoder.encode(parts[0]));if(!valid)return false;
 const payload=JSON.parse(new TextDecoder().decode(decode(parts[0])));
 return payload.role==='couple'&&Number.isInteger(payload.expires)&&payload.expires>Math.floor(Date.now()/1000)&&payload.expires<=Math.floor(Date.now()/1000)+lifetime;
}catch{return false;}}
export function readSession(cookie:string){return cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(SESSION_COOKIE+'='))?.slice(SESSION_COOKIE.length+1)||'';}
export async function getCoupleUser(req?:Request){const h=req?.headers||await headers();return await verifySession(readSession(h.get('cookie')||''))?{userId:'couple',email:'',displayName:'Mienke & Luvhan'}:null;}
export function sessionCookie(token:string){return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${lifetime}`;}
export function clearSessionCookie(){return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;}
export async function hashPassword(password:string){const salt=crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:ROUNDS},key,256));return `pbkdf2-sha256$${ROUNDS}$${encode(salt)}$${encode(bits)}`;}
export async function savePasswordHash(hash:string){await dataStore().set('auth/password-hash',hash);cachedHash={value:hash,at:Date.now()};}
export async function verifyPassword(password:string){try{
 const [algorithm,rounds,salt,expected]=(await passwordHash()).split('$');
 if(algorithm!=='pbkdf2-sha256'||Number(rounds)!==ROUNDS)return false;
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:decode(salt),iterations:ROUNDS},key,256));
 const hash=decode(expected);let difference=bits.length^hash.length;for(let i=0;i<bits.length;i++)difference|=bits[i]^(hash[i]||0);return difference===0;
}catch{return false;}}
export function sameOrigin(req:Request){return fromThisSite(req,req.headers.get('origin'));}
export function clientAddress(req:Request){return req.headers.get('x-nf-client-connection-ip')||req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'local';}
// At most ten attempts per client address per 15-minute window. Each attempt is its own key
// (simultaneous writes to one counter could be lost), counted with a single list call.
export async function allowAttempt(req:Request,scope:string){
 const bytes=await crypto.subtle.digest('SHA-256',encoder.encode(clientAddress(req)));
 const prefix=`auth/attempts/${scope}/${Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('')}-${Math.floor(Date.now()/900000)}/`;
 const store=dataStore();await store.set(prefix+crypto.randomUUID(),'1');
 const {blobs}=await store.list({prefix});return blobs.length<=10;
}
