// On Netlify the function sees an internal request URL, so the public origin comes from the
// forwarded host/protocol headers. Browsers always send the real Host, so a cross-site
// request still carries a different Origin and is rejected.
export function allowedOrigins(req:Request){
 const url=new URL(req.url),origins=new Set([url.origin]);
 const host=(req.headers.get('x-forwarded-host')||req.headers.get('host')||'').split(',')[0].trim();
 const proto=(req.headers.get('x-forwarded-proto')||url.protocol.replace(':','')).split(',')[0].trim();
 if(host&&/^[a-z0-9.-]+(:\d+)?$/i.test(host)&&/^https?$/.test(proto))origins.add(`${proto}://${host}`);
 return origins;
}
export const fromThisSite=(req:Request,origin:string|null)=>!!origin&&allowedOrigins(req).has(origin);
