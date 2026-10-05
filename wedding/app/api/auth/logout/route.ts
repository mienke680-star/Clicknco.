import {sameOrigin,clearSessionCookie} from '@/lib/auth';
export async function POST(req:Request){if(!sameOrigin(req))return Response.json({error:'Invalid request.'},{status:403});return Response.json({signedOut:true},{headers:{'Set-Cookie':clearSessionCookie(),'Cache-Control':'no-store'}});}
