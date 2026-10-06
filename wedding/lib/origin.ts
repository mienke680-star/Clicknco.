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
// The address guests should use: SITE_URL if set, else Netlify's primary site URL (`URL`, which
// follows a custom domain), else the address this request came in on.
export function publicOrigin(req:Request){
 for(const value of [process.env.SITE_URL,process.env.URL]){try{if(value){const u=new URL(value);if(/^https?:$/.test(u.protocol))return u.origin;}}catch{}}
 const origins=[...allowedOrigins(req)];return origins[origins.length-1];
}
