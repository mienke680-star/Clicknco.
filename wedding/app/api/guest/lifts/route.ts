import {guest,failure,HttpError} from '@/lib/server';
import {readGuestState,readGuestStates} from '@/lib/hub-store';
// The lift board: only guests who chose to share appear, and only to other guests who share too.
// There is no guest directory; nothing else about other guests is returned.
export async function GET(req:Request){try{
 const {w,g}=await guest(new URL(req.url).searchParams.get('token')||'');const mine=await readGuestState(g.id);
 if(!mine.lift?.share||mine.lift.mode==='none')throw new HttpError(403,'Share your own lift offer or request to see others.');
 const states=await readGuestStates(w.guests.filter(x=>x.id!==g.id));
 const lifts=w.guests.filter(x=>x.id!==g.id).map(x=>({g:x,s:states.get(x.id)})).filter(({s})=>s?.lift?.share&&s.lift.mode!=='none').map(({g:x,s})=>({name:x.name,mode:s!.lift!.mode,seats:s!.lift!.seats||0,from:s!.lift!.from||'',contact:s!.lift!.contact||''}));
 return Response.json({lifts},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return failure(e);}}
