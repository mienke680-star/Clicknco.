import {planner,guest,failure,checkOrigin,photoIndex,removePhoto} from '@/lib/server';
import {deleteMedia} from '@/lib/media';
// Uploads go through /api/upload in parts; this route lists and removes gallery items.
export async function GET(req:Request){try{const token=new URL(req.url).searchParams.get('token');if(token){const {w}=await guest(token);if(!w.settings.photoWall)return Response.json({photos:[]});}else await planner(req);const photos=(await photoIndex()).filter(p=>p.kind==='photo').sort((a,b)=>b.created.localeCompare(a.created)).map(({id,name,created,mime})=>({id,name,created,mime}));return Response.json({photos});}catch(e){return failure(e);}}
export async function DELETE(req:Request){try{checkOrigin(req);await planner(req);const {id}=await req.json() as any;if(typeof id!=='string')throw new Error('Choose a file to remove.');await deleteMedia(id);await removePhoto(id);return Response.json({deleted:true});}catch(e){return failure(e);}}
