'use client';
import {useState} from 'react';
import {toast} from 'sonner';
import {ArrowDown,ArrowUp,Plus,Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {uid,type Wedding,type RecordItem} from '@/lib/model';
import type {Save} from './common';
const SUGGESTIONS=['What should I wear?','Can I bring my children?','Is there parking at the venue?','Where should I stay?','When should I arrive?','Is there a gift registry?'];
// Questions & Answers shown to every guest on their "Ask Us" tab.
export default function FaqView({w,save}:{w:Wedding;save:Save}){
 const [items,setItems]=useState<RecordItem[]>(w.faq),[dirty,setDirty]=useState(false);
 const set=(next:RecordItem[])=>{setItems(next);setDirty(true);};
 const move=(i:number,d:number)=>{const n=[...items];const [x]=n.splice(i,1);n.splice(i+d,0,x);set(n);};
 return <>
  <div className="toolbar"><Button onClick={()=>set([...items,{id:uid(),question:'',answer:'',published:true}])}><Plus size={16}/> Add a question</Button><Button disabled={!dirty} onClick={async()=>{const clean=items.filter(f=>String(f.question||'').trim());if(await save({...w,faq:clean})){setItems(clean);setDirty(false);toast.success('Questions & answers saved');}}}>Save changes</Button></div>
  {!items.length&&<section className="panel"><p className="muted">Answer common questions once, and every guest sees them in “Ask Us”. Ideas:</p><div className="toolbar">{SUGGESTIONS.map(s=><Button key={s} variant="outline" size="sm" onClick={()=>set([...items,{id:uid(),question:s,answer:'',published:false}])}>{s}</Button>)}</div></section>}
  {items.map((f,i)=><section className="panel faq-edit" key={f.id}>
   <label>Question<input value={f.question} onChange={e=>set(items.map(x=>x.id===f.id?{...x,question:e.target.value}:x))}/></label>
   <label>Answer<textarea value={f.answer} onChange={e=>set(items.map(x=>x.id===f.id?{...x,answer:e.target.value}:x))}/></label>
   <div className="toolbar"><label className="toggle"><Switch checked={f.published!==false} onCheckedChange={v=>set(items.map(x=>x.id===f.id?{...x,published:v}:x))}/> Visible to guests</label>
    <Button variant="ghost" size="icon" aria-label="Move up" disabled={i===0} onClick={()=>move(i,-1)}><ArrowUp size={15}/></Button><Button variant="ghost" size="icon" aria-label="Move down" disabled={i===items.length-1} onClick={()=>move(i,1)}><ArrowDown size={15}/></Button>
    <Button variant="ghost" size="icon" aria-label="Delete question" onClick={()=>set(items.filter(x=>x.id!==f.id))}><Trash2 size={15}/></Button></div></section>)}
  {dirty&&<p className="muted small">You have unsaved changes.</p>}
 </>;
}
