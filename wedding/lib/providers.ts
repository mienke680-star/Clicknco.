// Optional automatic delivery. Nothing is sent automatically unless the matching provider is
// configured in Netlify's environment variables, and a provider's acceptance is reported as
// "accepted by …", never as delivered or read.
//   Email (Resend):     RESEND_API_KEY, EMAIL_FROM (e.g. "Mienke & Luvhan <wedding@yourdomain.co.za>")
//   WhatsApp (Twilio):  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. +14155238886)
export const env=(k:string)=>String(process.env[k]||'').trim();
export function emailConfigured(){return !!(env('RESEND_API_KEY')&&env('EMAIL_FROM'));}
export function whatsappConfigured(){return !!(env('TWILIO_ACCOUNT_SID')&&env('TWILIO_AUTH_TOKEN')&&env('TWILIO_WHATSAPP_FROM'));}
export function providerStatus(){return {email:emailConfigured()?'Resend':'',whatsapp:whatsappConfigured()?'Twilio WhatsApp':''};}
export type SendResult={ok:true;providerId:string}|{ok:false;error:string;permanent?:boolean};
const html=(text:string)=>`<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#18334d">${text.split(/\n{2,}/).map(p=>`<p>${p.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c]).replace(/\n/g,'<br>').replace(/(https?:\/\/\S+)/g,'<a href="$1">$1</a>')}</p>`).join('')}</div>`;
export async function sendEmail({to,subject,text,idempotencyKey}:{to:string;subject:string;text:string;idempotencyKey:string},fetcher:typeof fetch=fetch):Promise<SendResult>{
 if(!emailConfigured())return {ok:false,error:'Email delivery is not configured.',permanent:true};
 try{const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env('RESEND_API_KEY')}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey.slice(0,256)},body:JSON.stringify({from:env('EMAIL_FROM'),to:[to],subject,text,html:html(text)})});
  const d=await r.json().catch(()=>({})) as any;if(r.ok&&d.id)return {ok:true,providerId:String(d.id)};return {ok:false,error:`Resend ${r.status}: ${d.message||d.name||'request failed'}`,permanent:r.status>=400&&r.status<500&&r.status!==429};
 }catch(e:any){return {ok:false,error:'Could not reach Resend: '+(e?.message||'network error')};}
}
export async function sendWhatsApp({to,body}:{to:string;body:string},fetcher:typeof fetch=fetch):Promise<SendResult>{
 if(!whatsappConfigured())return {ok:false,error:'WhatsApp delivery is not configured.',permanent:true};
 const sid=env('TWILIO_ACCOUNT_SID'),from=env('TWILIO_WHATSAPP_FROM').replace(/^whatsapp:/,'');
 try{const r=await fetcher(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+btoa(`${sid}:${env('TWILIO_AUTH_TOKEN')}`),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({From:`whatsapp:${from}`,To:`whatsapp:${to}`,Body:body}).toString()});
  const d=await r.json().catch(()=>({})) as any;if(r.ok&&d.sid)return {ok:true,providerId:String(d.sid)};return {ok:false,error:`Twilio ${r.status}: ${d.message||'request failed'}`,permanent:r.status>=400&&r.status<500&&r.status!==429};
 }catch(e:any){return {ok:false,error:'Could not reach Twilio: '+(e?.message||'network error')};}
}
