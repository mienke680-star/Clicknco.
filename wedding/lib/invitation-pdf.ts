import {PDFDocument,PDFName,PDFString,PDFPage,PDFFont,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {INVITATION_ASSETS} from './invitation-assets.generated';
import type {RecordItem} from './model';
// Personalised invitation: the couple's navy envelope picture fills the whole page exactly as supplied
// (same proportions, no crop, no stretch, lossless pixels), the guest's name is set in gold above the
// envelope, and a real PDF link annotation over the envelope opens that guest's invitation.
export const INVITATION_DESIGN_VERSION='navy-envelope-1';
// Picture: 1122 × 1402 px. Printed at 0.375 pt/px → 420.75 × 525.75 pt (A5 width, picture's own ratio).
const PX_W=1122,PX_H=1402,SCALE=0.375;
export const PAGE={width:PX_W*SCALE,height:PX_H*SCALE};
// The envelope (seal included), measured on the picture in pixels from its top-left corner.
export const ENVELOPE_PX={left:117,top:373,right:1004,bottom:1014};
export const ENVELOPE_RECT={x:ENVELOPE_PX.left*SCALE,y:(PX_H-ENVELOPE_PX.bottom)*SCALE,width:(ENVELOPE_PX.right-ENVELOPE_PX.left)*SCALE,height:(ENVELOPE_PX.bottom-ENVELOPE_PX.top)*SCALE};
export const LINK_DESCRIPTION='Open your personal invitation & RSVP';
const GOLD=rgb(214/255,178/255,114/255);
const NO_LIGATURES={liga:false,dlig:false,clig:false,hlig:false,calt:false};
const b64=(s:string)=>Uint8Array.from(Buffer.from(s,'base64'));
const clean=(s:unknown)=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
export type InvitationInput={guest:RecordItem;link:string;couple?:string};
// Long names shrink first, then wrap onto two lines, always inside the navy space above the envelope.
function nameLines(font:PDFFont,name:string,maxWidth:number){
 for(let size=34;size>=24;size-=1)if(font.widthOfTextAtSize(name,size)<=maxWidth)return {size,lines:[name]};
 const words=name.split(' ');let best={size:15,lines:[name]};
 for(let size=28;size>=15;size-=1){let a='',lines:string[]=[];for(const w of words){const t=a?a+' '+w:w;if(a&&font.widthOfTextAtSize(t,size)>maxWidth){lines.push(a);a=w;}else a=t;}if(a)lines.push(a);
  if(lines.length<=2&&lines.every(l=>font.widthOfTextAtSize(l,size)<=maxWidth)){best={size,lines};break;}}
 return best;
}
function linkAnnotation(doc:PDFDocument,page:PDFPage,rect:{x:number;y:number;width:number;height:number},url:string){
 const annot=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[rect.x,rect.y,rect.x+rect.width,rect.y+rect.height],Border:[0,0,0],F:4,Contents:PDFString.of(LINK_DESCRIPTION),A:{Type:'Action',S:'URI',URI:PDFString.of(url)}}));
 page.node.set(PDFName.of('Annots'),doc.context.obj([annot]));
}
export async function buildInvitationPdf({guest,link,couple='Mienke & Luvhan'}:InvitationInput):Promise<Uint8Array>{
 const name=clean(guest.name)||'Our guest';
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 doc.setTitle(`${couple} — An invitation for ${name}`);doc.setAuthor(couple);doc.setSubject('Wedding invitation');doc.setCreator('Our wedding website');doc.setProducer('Our wedding website');doc.setLanguage('en');
 // Cormorant is embedded whole: fontkit's subsetting drops its glyphs.
 const font=await doc.embedFont(b64(INVITATION_ASSETS.nameFont),{features:NO_LIGATURES});
 const picture=await doc.embedPng(b64(INVITATION_ASSETS.envelope));
 if(picture.width!==PX_W||picture.height!==PX_H)throw new Error('Unexpected envelope picture size.');
 const page=doc.addPage([PAGE.width,PAGE.height]);
 page.drawImage(picture,{x:0,y:0,width:PAGE.width,height:PAGE.height});
 // The name sits centred in the navy space between the top of the page and the envelope.
 const space={top:PAGE.height,bottom:ENVELOPE_RECT.y+ENVELOPE_RECT.height},{size,lines}=nameLines(font,name,PAGE.width-72);
 const lineGap=size*1.12,blockCentre=(space.top+space.bottom)/2+4,capHeight=size*0.62;
 let y=blockCentre+((lines.length-1)*lineGap)/2-capHeight/2;
 for(const line of lines){page.drawText(line,{x:(PAGE.width-font.widthOfTextAtSize(line,size))/2,y,size,font,color:GOLD});y-=lineGap;}
 linkAnnotation(doc,page,ENVELOPE_RECT,link);
 return await doc.save({useObjectStreams:false});
}
