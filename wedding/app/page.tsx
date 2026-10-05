import Studio from './studio';
import {getCoupleUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){if(!await getCoupleUser())redirect('/login');return <Studio/>;}
