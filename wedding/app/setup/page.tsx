'use client';
import {useEffect,useState} from 'react';
import {Heart} from 'lucide-react';
export default function Setup(){
 const [info,setInfo]=useState<any>(null),[form,setForm]=useState({setupCode:'',currentPassword:'',password:'',confirm:''}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{fetch('/api/auth/setup').then(r=>r.json()).then(setInfo).catch(()=>setError('Setup is temporarily unavailable.'));},[]);
 const field=(k:string)=>(e:React.ChangeEvent<HTMLInputElement>)=>setForm({...form,[k]:e.target.value});
 async function submit(e:React.FormEvent){e.preventDefault();setError('');if(form.password!==form.confirm){setError('The passwords do not match.');return;}setBusy(true);try{const r=await fetch('/api/auth/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)}),d=await r.json() as any;if(!r.ok)throw Error(d.error);location.replace('/');}catch(e:any){setError(e.message);setBusy(false);}}
 const changing=info?.configured;
 return <main className="couple-login"><section><Heart size={30}/><span className="eyebrow">MIENKE & LUVHAN</span><h1>{changing?'Change our password':'Choose our password'}</h1>
  {!info?<p>Loading…</p>:info.managedByEnv?<p>The couple password is set in Netlify (COUPLE_PASSWORD_HASH). Remove that variable to manage it here.</p>:changing&&!info.signedIn?<p>Please <a href="/login">sign in</a> first, then come back to change the password.</p>:!changing&&!info.setupCodeReady?<p>Add a <code>SETUP_CODE</code> environment variable in Netlify (12 or more characters) and redeploy, then reload this page.</p>:
  <form onSubmit={submit}>
   {changing?<label>Current password<input type="password" autoComplete="current-password" required maxLength={256} value={form.currentPassword} onChange={field('currentPassword')}/></label>:<label>One-time setup code<input autoComplete="off" required maxLength={200} value={form.setupCode} onChange={field('setupCode')}/></label>}
   <label>New couple password (at least 14 characters)<input type="password" autoComplete="new-password" required minLength={14} maxLength={256} value={form.password} onChange={field('password')}/></label>
   <label>Confirm the new password<input type="password" autoComplete="new-password" required minLength={14} maxLength={256} value={form.confirm} onChange={field('confirm')}/></label>
   {error&&<p role="alert">{error}</p>}
   <button className="button" disabled={busy} type="submit">{busy?'Saving…':'Save password'}</button>
  </form>}
  <small>Guests never need this password. They open the personal invitation link you send them.</small>
 </section></main>;
}
