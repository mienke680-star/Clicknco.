import {PDFDocument,PDFName,PDFString,PDFPage,PDFFont,PDFImage,rgb,pushGraphicsState,popGraphicsState,rectangle,clip,endPath,setCharacterSpacing,type Color} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import {INVITATION_ASSETS} from './invitation-assets.generated';
import type {Wedding,RecordItem} from './model';
// Personalised A5 invitation: ivory paper, royal-blue serif lettering, Greek key bands and olive
// sprigs, the couple's cover artwork, real selectable text and a clickable personal RSVP button.
export const INVITATION_DESIGN_VERSION='greek-coastal-1';
export const TAGLINE='A little piece of Greece. A lifetime together.';
export const BUTTON_LABEL='Open your personal invitation & RSVP';
export const PLUS_ONE_NOTE='You are welcome to bring a plus one. Please add their details when you RSVP.';
export type InvitationInput={w:Wedding;guest:RecordItem;link:string;cover?:{bytes:Uint8Array;type:'image/jpeg'|'image/png'}|null};
const W=419.53,H=595.28;
const IVORY=rgb(0.988,0.976,0.949),ROYAL=rgb(0.098,0.243,0.557),DEEP=rgb(0.067,0.165,0.392),SOFT=rgb(0.36,0.45,0.62),OLIVE=rgb(0.42,0.5,0.32),GOLD=rgb(0.72,0.62,0.4);
// Decorative ligatures (e.g. Cormorant's "ta", "st") leave gaps in pdf-lib's layout; plain letters read better.
const NO_LIGATURES={liga:false,dlig:false,clig:false,hlig:false,calt:false};
const b64=(s:string)=>Uint8Array.from(Buffer.from(s,'base64'));
const clean=(s:unknown)=>String(s??'').replace(/[\u0000-\u0008\u000b-\u001f]/g,'').trim();
export function longDate(iso:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return '';return new Date(iso+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});}
export function invitedEvents(w:Wedding,guest:RecordItem){return w.events.filter(e=>(guest.events||[]).includes(e.id));}
type Fonts={serif:PDFFont;italic:PDFFont;bold:PDFFont;caps:PDFFont};
function textWidth(font:PDFFont,text:string,size:number,spacing=0){return font.widthOfTextAtSize(text,size)+Math.max(0,text.length-1)*spacing;}
function centred(page:PDFPage,text:string,y:number,font:PDFFont,size:number,color:Color,spacing=0){
 const x=(W-textWidth(font,text,size,spacing))/2;
 if(spacing)page.pushOperators(pushGraphicsState(),setCharacterSpacing(spacing));
 page.drawText(text,{x,y,size,font,color});
 if(spacing)page.pushOperators(setCharacterSpacing(0),popGraphicsState());
 return x;
}
function wrap(font:PDFFont,text:string,size:number,max:number){const lines:string[]=[];for(const para of text.split(/\n+/)){let line='';for(const word of para.split(/\s+/).filter(Boolean)){const next=line?line+' '+word:word;if(line&&font.widthOfTextAtSize(next,size)>max){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);}return lines;}
// Shrinks long text (e.g. a long guest name) until it fits the width.
function fit(font:PDFFont,text:string,size:number,max:number,min:number){while(size>min&&font.widthOfTextAtSize(text,size)>max)size-=0.5;return size;}
function link(doc:PDFDocument,page:PDFPage,x:number,y:number,w:number,h:number,url:string){
 const annot=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[x,y,x+w,y+h],Border:[0,0,0],F:4,A:{Type:'Action',S:'URI',URI:PDFString.of(url)}}));
 const existing=page.node.lookup(PDFName.of('Annots'));
 if(existing&&'push' in (existing as any))(existing as any).push(annot);else page.node.set(PDFName.of('Annots'),doc.context.obj([annot]));
}
// A running Greek key between two rules.
function greekKey(page:PDFPage,y:number,x0:number,x1:number,color:Color){
 const h=9,unit=12,t=0.8;
 page.drawLine({start:{x:x0,y:y+h+2.2},end:{x:x1,y:y+h+2.2},thickness:t,color});
 page.drawLine({start:{x:x0,y:y-2.2},end:{x:x1,y:y-2.2},thickness:t,color});
 const count=Math.floor((x1-x0)/unit),start=x0+((x1-x0)-count*unit)/2+1.5;
 for(let i=0;i<count;i++){const x=start+i*unit,s=h;
  const pts=[[0,0],[0,s],[s,s],[s,s*0.25],[s*0.33,s*0.25],[s*0.33,s*0.66],[s*0.66,s*0.66],[s*0.66,s*0.48]];
  for(let k=0;k<pts.length-1;k++)page.drawLine({start:{x:x+pts[k][0],y:y+pts[k][1]},end:{x:x+pts[k+1][0],y:y+pts[k+1][1]},thickness:t,color});
  page.drawLine({start:{x,y},end:{x:x+unit,y},thickness:t,color});
 }
}
// Olive sprig: a gently curved stem with alternating leaves and two olives, drawn as vector paths.
function oliveSprig(page:PDFPage,cx:number,cy:number,length:number,flip=false){
 const dir=flip?-1:1,leaves:string[]=[];
 const stem=(t:number)=>({x:cx+dir*t*length,y:cy-Math.sin(t*Math.PI)*4});
 const p0=stem(0),p1=stem(1);
 page.drawSvgPath(`M ${p0.x} ${-p0.y} Q ${cx+dir*length/2} ${-(cy-9)} ${p1.x} ${-p1.y}`,{x:0,y:0,borderColor:OLIVE,borderWidth:0.8});
 for(let i=1;i<=5;i++){const t=i/6,p=stem(t),side=i%2?1:-1,angle=(dir>0?0:Math.PI)+side*0.75+dir*0.15,L=10-i*0.6,Wd=2.6;
  const ca=Math.cos(angle),sa=Math.sin(angle),pt=(u:number,v:number)=>`${p.x+u*ca-v*sa} ${-(p.y+u*sa+v*ca)}`;
  leaves.push(`M ${pt(0,0)} Q ${pt(L/2,Wd)} ${pt(L,0)} Q ${pt(L/2,-Wd)} ${pt(0,0)} Z`);}
 page.drawSvgPath(leaves.join(' '),{x:0,y:0,color:OLIVE,opacity:0.9});
 for(const t of [0.42,0.75]){const p=stem(t);page.drawEllipse({x:p.x+dir*1.5,y:p.y-4.2,xScale:2.1,yScale:2.6,color:rgb(0.3,0.36,0.24)});}
}
function coverImage(page:PDFPage,image:PDFImage,x:number,y:number,w:number,h:number){
 const scale=Math.max(w/image.width,h/image.height),iw=image.width*scale,ih=image.height*scale;
 page.pushOperators(pushGraphicsState(),rectangle(x,y,w,h),clip(),endPath());
 page.drawImage(image,{x:x+(w-iw)/2,y:y+(h-ih)/2,width:iw,height:ih});
 page.pushOperators(popGraphicsState());
 page.drawRectangle({x,y,width:w,height:h,borderColor:GOLD,borderWidth:0.6});
}
async function qr(page:PDFPage,url:string,x:number,y:number,size:number){
 const code=QRCode.create(url,{errorCorrectionLevel:'M'}),n=code.modules.size,cell=size/n;
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(code.modules.get(r,c))page.drawRectangle({x:x+c*cell,y:y+size-(r+1)*cell,width:cell+0.05,height:cell+0.05,color:DEEP});
}
export async function buildInvitationPdf({w,guest,link:url,cover}:InvitationInput):Promise<Uint8Array>{
 const s=w.settings,guestName=clean(guest.name)||'our guest',couple=clean(s.names)||'Mienke & Luvhan';
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 doc.setTitle(`${couple} — An invitation especially for ${guestName}`);doc.setAuthor(couple);doc.setSubject('Wedding invitation');doc.setCreator('Our wedding website');doc.setProducer('Our wedding website');doc.setLanguage('en');
 // Cormorant is embedded whole: fontkit's subsetting drops its glyphs. Cinzel subsets cleanly.
 const fonts:Fonts={serif:await doc.embedFont(b64(INVITATION_ASSETS.serif),{features:NO_LIGATURES}),italic:await doc.embedFont(b64(INVITATION_ASSETS.serifItalic),{features:NO_LIGATURES}),bold:await doc.embedFont(b64(INVITATION_ASSETS.serifBold),{features:NO_LIGATURES}),caps:await doc.embedFont(b64(INVITATION_ASSETS.capitals),{subset:true,features:NO_LIGATURES})};
 let art:PDFImage;try{art=cover?.type==='image/png'?await doc.embedPng(cover.bytes):cover?.type==='image/jpeg'?await doc.embedJpg(cover.bytes):await doc.embedJpg(b64(INVITATION_ASSETS.coast));}catch{art=await doc.embedJpg(b64(INVITATION_ASSETS.coast));}
 const page=doc.addPage([W,H]);
 page.drawRectangle({x:0,y:0,width:W,height:H,color:IVORY});
 page.drawRectangle({x:13,y:13,width:W-26,height:H-26,borderColor:ROYAL,borderWidth:1.1});
 page.drawRectangle({x:17.5,y:17.5,width:W-35,height:H-35,borderColor:ROYAL,borderWidth:0.45});
 greekKey(page,H-40,30,W-30,ROYAL);
 greekKey(page,29,30,W-30,ROYAL);
 // Lay the text out once without drawing to measure it, then give the artwork whatever height is
 // left so long names, addresses or event lists never collide with the RSVP button.
 const body=(top:number,draw:boolean)=>{
  let y=top;const T=(text:string,at:number,font:PDFFont,size:number,color:Color,spacing=0)=>{if(draw)centred(page,text,at,font,size,color,spacing);};
  T('TOGETHER WITH OUR FAVOURITE PEOPLE',y,fonts.caps,7.6,SOFT);
  y-=34;T(couple,y,fonts.bold,fit(fonts.bold,couple,33,W-80,22),ROYAL);
  y-=21;T(TAGLINE,y,fonts.italic,13.5,DEEP);
  y-=17;if(draw){oliveSprig(page,W/2-6,y,46,true);oliveSprig(page,W/2+6,y,46);page.drawCircle({x:W/2,y:y-1,size:1.6,color:GOLD});}
  y-=24;T('An invitation especially for',y,fonts.italic,12.5,SOFT);
  y-=27;T(guestName,y,fonts.bold,fit(fonts.bold,guestName,25,W-90,14),ROYAL);
  y-=26;const date=longDate(s.date);if(date){T(date.toUpperCase(),y,fonts.caps,10.5,DEEP);y-=18;}
  const venue=clean(s.venue);if(venue){T(venue,y,fonts.bold,13.5,DEEP);y-=14;}
  for(const line of wrap(fonts.serif,clean(s.address),10.5,W-110).slice(0,2)){T(line,y,fonts.serif,10.5,SOFT);y-=12.5;}
  const events=invitedEvents(w,guest).slice(0,4);
  if(events.length){y-=5;for(const e of events){const when=[longDate(e.date).replace(/ \d{4}$/,''),clean(e.time)].filter(Boolean).join(' · ');const line=[clean(e.name),when].filter(Boolean).join(' — ');T(line,y,fonts.serif,fit(fonts.serif,line,10.5,W-90,8),DEEP);y-=12.5;}}
  const deadline=longDate(s.rsvpDeadline).replace(/^\w+, /,'');
  const details=[...(clean(s.dress)?wrap(fonts.italic,`Dress code: ${clean(s.dress)}`,10.5,W-100).slice(0,2):[]),...(deadline?[`Kindly reply by ${deadline}`]:[])];
  if(details.length){y-=3;for(const d of details){T(d,y,fonts.italic,10.5,SOFT);y-=12.5;}}
  if(guest.plusOneAllowed){y-=6;const lines=wrap(fonts.italic,PLUS_ONE_NOTE,10.5,W-120);const boxH=lines.length*12.5+8;if(draw)page.drawRectangle({x:52,y:y-boxH+12,width:W-104,height:boxH,color:rgb(0.94,0.95,0.98),borderColor:rgb(0.8,0.84,0.92),borderWidth:0.5});for(const l of lines){T(l,y,fonts.italic,10.5,ROYAL);y-=12.5;}y-=6;}
  return y;
 };
 const artTop=H-50,gap=20,lowest=114+34;
 const artH=Math.max(56,Math.min(128,128-(lowest-body(artTop-128-gap,false))));
 coverImage(page,art,34,artTop-artH,W-68,artH);
 const y=body(artTop-artH-gap,true);
 // The personal RSVP button: a real link annotation over the drawn button, plus the printed address
 // and a QR code for anyone holding a paper copy.
 const bw=232,bh=30,bx=(W-bw)/2,by=Math.max(100,Math.min(y-34,114));
 page.drawRectangle({x:bx,y:by,width:bw,height:bh,color:ROYAL,borderColor:GOLD,borderWidth:0.8});
 centred(page,BUTTON_LABEL,by+10.2,fonts.bold,12,rgb(1,1,1));
 link(doc,page,bx,by,bw,bh,url);
 const shown=url.replace(/^https?:\/\//,''),cut=shown.indexOf('/invite/'),urlLines=cut>0?[shown.slice(0,cut+8),shown.slice(cut+8)]:[shown];
 let uy=by-12;for(const line of urlLines){const size=fit(fonts.serif,line,7.5,W-200,5);const ux=centred(page,line,uy,fonts.serif,size,SOFT);link(doc,page,ux,uy-2.5,textWidth(fonts.serif,line,size),10,url);uy-=9;}
 const qs=40,qx=W-34-qs-4,qy=56;await qr(page,url,qx,qy,qs);link(doc,page,qx,qy,qs,qs,url);
 page.drawText('Scan to RSVP',{x:qx+(qs-textWidth(fonts.italic,'Scan to RSVP',7))/2,y:qy-8,size:7,font:fonts.italic,color:SOFT});
 return await doc.save({useObjectStreams:false});
}
