import GuestView from '@/app/guest-view';
import {getCoupleUser} from '@/lib/auth';
import {storedRow} from '@/lib/records';
import {redirect,notFound} from 'next/navigation';
export const dynamic='force-dynamic';
// "Preview as guest": the couple sees exactly what this guest sees; nothing is recorded as read
// and every action is disabled.
export default async function Page({params}:{params:Promise<{guestId:string}>}){
 if(!await getCoupleUser())redirect('/login');const {guestId}=await params;const r=await storedRow();const g=r?.w.guests.find(x=>x.id===decodeURIComponent(guestId));if(!g)notFound();
 return <GuestView token={g.token} preview/>;
}
