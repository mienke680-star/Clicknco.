import {guest,failure} from '@/lib/server';
import {visibleEvents} from '@/lib/hub';
import {icsCalendar} from '@/lib/time';
import {publicOrigin} from '@/lib/origin';
// A guest's personal calendar: download it once, or subscribe (webcal://…) so calendar apps keep
// it up to date. It contains only the published events in that guest's invitation; resetting the
// guest's link stops the feed.
export async function GET(req:Request,{params}:{params:Promise<{token:string}>}){try{
 const {token}=await params,url=new URL(req.url);const {w,g}=await guest(decodeURIComponent(token).replace(/\.ics$/,''));
 const origin=publicOrigin(req),link=`${origin}/invite/${encodeURIComponent(g.token)}#plans`,only=url.searchParams.get('event');
 const events=visibleEvents(w,g).filter(e=>!only||e.id===only).map(e=>({uid:`${e.id}@mienke-luvhan-wedding`,title:e.name,date:e.date,time:e.time,endDate:e.endDate,endTime:e.endTime,location:[e.venue,e.map].filter(Boolean).join(' · '),description:e.description,url:link,updated:e.updatedAt,sequence:Number(e.version||0)}));
 const name=`${w.settings.names||'Mienke & Luvhan'} — wedding`;
 return new Response(icsCalendar(name,events),{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':`${url.searchParams.get('download')?'attachment':'inline'}; filename="${only?'wedding-event':'wedding-weekend'}.ics"`,'Cache-Control':'private, no-store'}});
}catch(e){return failure(e);}}
