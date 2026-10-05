import { guest,saveRsvp,failure,checkOrigin,HttpError } from '@/lib/server';
export async function GET(req:Request){try{
 const token=new URL(req.url).searchParams.get('token')||'';const {w,g}=await guest(token);const allowed=w.events.filter(e=>(g.events||[]).includes(e.id));const s={...w.settings};delete s.budget;delete s.catering;s.secondary={...s.secondary};
 const companion=!!g.plusOneAllowed;
 return Response.json({settings:s,events:allowed,story:w.story,guest:{name:g.name,phone:g.phone||'',responses:g.responses||{},meal:g.meal||'',allergy:g.allergy||'',plusOneAllowed:companion,plusOneName:companion?g.plusOneName||'':'',plusOneMeal:companion?g.plusOneMeal||'':'',plusOneAllergy:companion?g.plusOneAllergy||'':'',plusOnePhone:companion?g.plusOnePhone||'':'',song:g.song||'',message:g.message||''}});
}catch(e){return failure(e);}}
export async function POST(req:Request){try{
 checkOrigin(req);const input=await req.json() as any;
 const {w,g}=await guest(input.token);
 const clean=(value:unknown,max:number)=>String(value||'').trim().slice(0,max);
 const name=input.name===undefined?g.name:clean(input.name,150);
 if(!name)throw new HttpError(400,'Please enter your full name.');
 const phone=clean(input.phone===undefined?g.phone:input.phone,50);
 const responses:any={};for(const id of g.events||[]){if(!['yes','no'].includes(input.responses?.[id]))throw new HttpError(400,'Please reply to every event.');responses[id]=input.responses[id];}
 const attending=Object.values(responses).includes('yes'),meal=clean(input.meal,100),meals=String(w.settings.mealOptions).split(',').map(s=>s.trim());
 if(attending&&!meals.includes(meal))throw new HttpError(400,'Please select a meal.');
 if(g.plusOneAllowed&&attending&&input.bringPlusOne===true&&!clean(input.plusOneName,150))throw new HttpError(400,'Please enter your plus-one’s full name.');
 const companion=!!g.plusOneAllowed&&attending&&input.bringPlusOne!==false&&!!clean(input.plusOneName,150);
 if(companion&&!meals.includes(input.plusOneMeal))throw new HttpError(400,'Please select a meal for your plus-one.');
 // Saved in this guest's own record, so replies from different guests never overwrite each other.
 // Seating for events they decline is dropped automatically when the wedding is read.
 const fields={name,phone,responses,meal,allergy:clean(input.allergy,1000),song:clean(input.song,500),message:clean(input.message,1000),plusOneName:companion?clean(input.plusOneName,150):'',plusOneMeal:companion?clean(input.plusOneMeal,100):'',plusOneAllergy:companion?clean(input.plusOneAllergy,1000):'',plusOnePhone:companion?clean(input.plusOnePhone,50):'',responded:new Date().toISOString()};
 await saveRsvp(g.id,fields);
 return Response.json({saved:true,guest:{name:fields.name,phone:fields.phone,plusOneAllowed:!!g.plusOneAllowed,plusOneName:fields.plusOneName,plusOneMeal:fields.plusOneMeal,plusOneAllergy:fields.plusOneAllergy,plusOnePhone:fields.plusOnePhone},message:'Your RSVP has been saved. You can return to this link to update it.'});
}catch(e){return failure(e);}}
