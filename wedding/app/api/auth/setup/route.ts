import {authConfigured,passwordManagedByEnv,getCoupleUser,verifyPassword,hashPassword,savePasswordHash,createSession,sessionCookie,sameOrigin,allowAttempt} from '@/lib/auth';
const json=(body:object,status=200,headers:Record<string,string>={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
function sameText(a:string,b:string){const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let d=x.length^y.length;for(let i=0;i<x.length;i++)d|=x[i]^(y[i]||0);return d===0;}
// Tells the setup page which form to show.
export async function GET(req:Request){try{return json({configured:await authConfigured(),managedByEnv:passwordManagedByEnv(),signedIn:!!await getCoupleUser(req),setupCodeReady:(process.env.SETUP_CODE||'').length>=12});}catch(e){console.error(e);return json({error:'Setup is temporarily unavailable.'},503);}}
// First time: requires the one-time SETUP_CODE from the Netlify environment variables.
// Afterwards: the signed-in couple can change the password by entering the current one.
export async function POST(req:Request){try{
 if(!sameOrigin(req))return json({error:'Please use this website.'},403);
 if(passwordManagedByEnv())return json({error:'The password is managed by the COUPLE_PASSWORD_HASH setting in Netlify.'},409);
 const text=await req.text();if(text.length>2000)return json({error:'Invalid request.'},400);
 const {password,setupCode,currentPassword}=JSON.parse(text);
 if(typeof password!=='string'||password.length<14||password.length>256)return json({error:'Use 14–256 characters. A long phrase works well.'},400);
 if(!await allowAttempt(req,'setup'))return json({error:'Too many attempts. Please try again in 15 minutes.'},429);
 if(await authConfigured()){
  if(!await getCoupleUser(req))return json({error:'Sign in first to change the couple password.'},401);
  if(typeof currentPassword!=='string'||!await verifyPassword(currentPassword))return json({error:'Your current password is not correct.'},401);
 }else{
  const expected=process.env.SETUP_CODE||'';
  if(expected.length<12)return json({error:'Add a SETUP_CODE environment variable in Netlify first.'},503);
  if(typeof setupCode!=='string'||!sameText(setupCode.trim(),expected))return json({error:'That setup code is not correct.'},401);
 }
 await savePasswordHash(await hashPassword(password));
 return json({saved:true},200,{'Set-Cookie':sessionCookie(await createSession())});
}catch(e){console.error(e);return json({error:'Setup is temporarily unavailable. Please try again.'},503);}}
