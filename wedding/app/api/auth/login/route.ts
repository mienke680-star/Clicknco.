import {authConfigured,createSession,sessionCookie,verifyPassword,sameOrigin,allowAttempt} from '@/lib/auth';
export async function POST(req:Request){try{
 if(!sameOrigin(req))return Response.json({error:'Please sign in from this website.'},{status:403});
 if(!await authConfigured())return Response.json({error:'The couple password has not been set yet. Open /setup to choose it.'},{status:503});
 const text=await req.text();if(text.length>2000)return Response.json({error:'Invalid sign-in.'},{status:400});
 const {password}=JSON.parse(text);if(typeof password!=='string'||password.length>256)return Response.json({error:'Enter your couple password.'},{status:400});
 if(!await allowAttempt(req,'login'))return Response.json({error:'Too many attempts. Please try again in 15 minutes.'},{status:429,headers:{'Retry-After':'900'}});
 if(!await verifyPassword(password))return Response.json({error:'That password is not correct.'},{status:401});
 return Response.json({signedIn:true},{headers:{'Set-Cookie':sessionCookie(await createSession()),'Cache-Control':'no-store'}});
}catch(e){console.error(e);return Response.json({error:'Sign-in is temporarily unavailable. Please try again.'},{status:503});}}
