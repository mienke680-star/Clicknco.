import GuestView from '@/app/guest-view';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;return <GuestView token={token}/>;}
