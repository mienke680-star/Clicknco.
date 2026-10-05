import {getStore} from '@netlify/blobs';
// Netlify Blobs site-wide stores: permanent, not tied to a deploy, and kept until deleted.
// Strong consistency so a reply saved by one guest is immediately visible to the next request.
export const dataStore=()=>getStore({name:'wedding-data',consistency:'strong'});
export const mediaStore=()=>getStore({name:'wedding-media',consistency:'strong'});
// Netlify returns an ETag with every read; the local Blobs emulator does not, so fall back to a plain write there.
export const ifUnchanged=(etag?:string)=>etag?{onlyIfMatch:etag}:{};
