const assert=require('node:assert/strict');const {harness}=require('./harness.cjs');console.error=()=>{};
let requestHeaders=new Headers();
const {load,store}=harness({'next/headers':{headers:async()=>requestHeaders}});
const auth=load('lib/auth.ts'),login=load('app/api/auth/login/route.ts'),logout=load('app/api/auth/logout/route.ts'),setup=load('app/api/auth/setup/route.ts');
const password='Our long test password 2027',site='https://wedding.test';
const req=(path,body,{ip='one',origin=site,cookie=''}={})=>new Request(site+path,{method:'POST',headers:{origin,'x-nf-client-connection-ip':ip,'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
const loginReq=(pass,ip='one',origin=site)=>req('/api/auth/login',{password:pass},{ip,origin});
(async()=>{
 delete process.env.COUPLE_PASSWORD_HASH;delete process.env.SESSION_SECRET;delete process.env.SETUP_CODE;
 // Fail closed until a password is chosen.
 assert.equal((await login.POST(loginReq(password))).status,503);
 assert.equal((await setup.POST(req('/api/auth/setup',{password,setupCode:'anything-long-enough'}))).status,503,'setup needs a SETUP_CODE');
 process.env.SETUP_CODE='one-time-setup-code-2027';
 assert.equal((await (await setup.GET(new Request(site+'/api/auth/setup'))).json()).configured,false);
 assert.equal((await setup.POST(req('/api/auth/setup',{password,setupCode:'wrong-code-wrong-code'}))).status,401);
 assert.equal((await setup.POST(req('/api/auth/setup',{password:'short',setupCode:process.env.SETUP_CODE}))).status,400);
 assert.equal((await setup.POST(req('/api/auth/setup',{password,setupCode:process.env.SETUP_CODE},{origin:'https://evil.test'}))).status,403);
 let response=await setup.POST(req('/api/auth/setup',{password,setupCode:process.env.SETUP_CODE}));assert.equal(response.status,200);
 assert(!String(await store('wedding-data').get('auth/password-hash')).includes(password),'only a salted hash is stored');
 // The setup code cannot be reused to take over once a password exists.
 assert.equal((await setup.POST(req('/api/auth/setup',{password:'Attacker password 123456',setupCode:process.env.SETUP_CODE}))).status,401);
 assert(await auth.verifyPassword(password));assert.equal(await auth.verifyPassword('wrong'),false);
 assert.equal((await login.POST(loginReq(password,'one','https://evil.test'))).status,403);
 assert.equal((await login.POST(loginReq('wrong'))).status,401);
 response=await login.POST(loginReq(password));assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert(cookie.includes('HttpOnly'));assert(cookie.includes('Secure'));assert(cookie.includes('SameSite=Lax'));
 const token=auth.readSession(cookie);assert(await auth.verifySession(token));assert.equal(await auth.verifySession(token+'x'),false);
 requestHeaders=new Headers({'oai-authenticated-user-id':'fake','oai-authenticated-user-email':'fake@example.test'});assert.equal(await auth.getCoupleUser(),null);
 requestHeaders=new Headers({cookie});assert.equal((await auth.getCoupleUser()).userId,'couple');
 for(let i=0;i<10;i++)assert.equal((await login.POST(loginReq('wrong','limited'))).status,401);
 assert.equal((await login.POST(loginReq(password,'limited'))).status,429);
 assert.equal((await logout.POST(new Request(site+'/api/auth/logout',{method:'POST',headers:{origin:'https://evil.test'}}))).status,403);
 assert((await logout.POST(new Request(site+'/api/auth/logout',{method:'POST',headers:{origin:site}}))).headers.get('set-cookie').includes('Max-Age=0'));
 // Behind Netlify's proxy the function sees an internal URL; the public Host decides the origin.
 const proxied=(origin,host)=>new Request('http://127.0.0.1:3000/api/auth/login',{method:'POST',headers:{origin,host,'x-forwarded-proto':'https','x-nf-client-connection-ip':'proxy','Content-Type':'application/json'},body:JSON.stringify({password})});
 assert.equal((await login.POST(proxied(site,'wedding.test'))).status,200);
 assert.equal((await login.POST(proxied('https://evil.test','wedding.test'))).status,403);
 // Changing the password needs the current one and signs out every old session.
 const sessionCookie=cookie.split(';')[0];
 assert.equal((await setup.POST(req('/api/auth/setup',{password:'A brand new couple password',currentPassword:'wrong'},{cookie:sessionCookie,ip:'two'}))).status,401);
 assert.equal((await setup.POST(req('/api/auth/setup',{password:'A brand new couple password',currentPassword:password},{ip:'two'}))).status,401,'must be signed in');
 response=await setup.POST(req('/api/auth/setup',{password:'A brand new couple password',currentPassword:password},{cookie:sessionCookie,ip:'two'}));assert.equal(response.status,200);
 assert.equal(await auth.verifySession(token),false,'old sessions end after a password change');
 assert(await auth.verifySession(auth.readSession(response.headers.get('set-cookie'))));
 assert.equal((await login.POST(loginReq(password,'three'))).status,401);assert.equal((await login.POST(loginReq('A brand new couple password','three'))).status,200);
 // Rotating SESSION_SECRET signs everyone out too.
 const current=auth.readSession((await login.POST(loginReq('A brand new couple password','four'))).headers.get('set-cookie'));
 process.env.SESSION_SECRET='x'.repeat(48);assert.equal(await auth.verifySession(current),false);
 console.log('PASS: one-time setup code, hashed password storage, signed secure sessions, rejected fake ChatGPT headers, CSRF checks, login rate limiting, sign-out, password change and secret rotation.');
})().catch(e=>{console.error=console.log;console.error(e);process.exitCode=1});
