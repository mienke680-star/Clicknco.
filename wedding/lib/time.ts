// Wedding time is always South African Standard Time (Africa/Johannesburg, UTC+2, no daylight saving),
// whatever timezone the couple's or a guest's device uses.
export const WEDDING_TZ='Africa/Johannesburg';
export const TZ_LABEL='SAST · Africa/Johannesburg (UTC+2)';
const OFFSET_MS=2*60*60*1000;
const isDate=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime=(s:unknown):s is string=>typeof s==='string'&&/^\d{2}:\d{2}$/.test(s);
export function sastParts(now:Date=new Date()){const t=new Date(now.getTime()+OFFSET_MS).toISOString();return {date:t.slice(0,10),time:t.slice(11,16)};}
export function sastToday(now:Date=new Date()){return sastParts(now).date;}
// The instant a SAST wall-clock date/time refers to.
export function sastInstant(date:string,time?:string){return new Date(`${date}T${isTime(time)?time:'00:00'}:00+02:00`);}
export function addDays(date:string,days:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
// A deadline date is open until the end of that day in South Africa.
export function deadlinePassed(deadline:string|undefined,now:Date=new Date()){return isDate(deadline)&&sastToday(now)>deadline;}
export function longDate(date:string){if(!isDate(date))return 'Date to be confirmed';return new Date(date+'T12:00:00Z').toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});}
export function shortDate(date:string){if(!isDate(date))return 'Date to be confirmed';return new Date(date+'T12:00:00Z').toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});}
// Never invents a time: events without one say so.
export function timeRange(e:{date?:string;time?:string;endDate?:string;endTime?:string}){
 const start=isTime(e.time)?e.time:'',end=isTime(e.endTime)?e.endTime:'',multi=isDate(e.endDate)&&e.endDate!==e.date;
 if(multi)return `${shortDate(e.date||'')}${start?' '+start:''} – ${shortDate(e.endDate!)}${end?' '+end:''}`;
 if(start&&end)return `${start} – ${end}`;if(start)return start;return 'Time to be confirmed';
}
export function sastDateTimeText(iso:string){const d=new Date(iso);if(Number.isNaN(d.getTime()))return '';return d.toLocaleString('en-ZA',{timeZone:WEDDING_TZ,day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})+' SAST';}
// --- iCalendar (.ics) -------------------------------------------------------------------------
export type IcsEvent={uid:string;title:string;date:string;time?:string;endDate?:string;endTime?:string;location?:string;description?:string;url?:string;updated?:string;sequence?:number};
const esc=(s:string)=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const utcStamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
// Lines longer than 75 octets are folded, as the iCalendar standard requires.
function fold(line:string){const bytes=new TextEncoder().encode(line);if(bytes.length<=75)return line;const out:string[]=[];let cur='',len=0;for(const ch of line){const n=new TextEncoder().encode(ch).length;if(len+n>(out.length?74:75)){out.push(cur);cur='';len=0;}cur+=ch;len+=n;}out.push(cur);return out.join('\r\n ');}
export function icsEventLines(e:IcsEvent){
 if(!isDate(e.date))return [];
 const lines=['BEGIN:VEVENT',`UID:${e.uid}`,`DTSTAMP:${utcStamp(new Date())}`];
 const endDate=isDate(e.endDate)?e.endDate:e.date;
 if(isTime(e.time)){
  lines.push(`DTSTART:${utcStamp(sastInstant(e.date,e.time))}`);
  if(isTime(e.endTime))lines.push(`DTEND:${utcStamp(sastInstant(endDate,e.endTime))}`);
  // Multi-day with a start time but no end time: runs until the end of the last day (no invented hour).
  else if(endDate!==e.date)lines.push(`DTEND:${utcStamp(sastInstant(addDays(endDate,1),'00:00'))}`);
 }else{lines.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${addDays(endDate,1).replace(/-/g,'')}`);}
 const description=[e.description||'',isTime(e.time)?'':'Time to be confirmed.','All times are '+TZ_LABEL+'.',e.url?`Your invitation: ${e.url}`:''].filter(Boolean).join('\n');
 lines.push(`SUMMARY:${esc(e.title)}`);if(e.location)lines.push(`LOCATION:${esc(e.location)}`);lines.push(`DESCRIPTION:${esc(description)}`);if(e.url)lines.push(`URL:${e.url}`);
 if(e.updated&&!Number.isNaN(Date.parse(e.updated)))lines.push(`LAST-MODIFIED:${utcStamp(new Date(e.updated))}`);lines.push(`SEQUENCE:${Math.max(0,Math.floor(e.sequence||0))}`,'END:VEVENT');
 return lines;
}
export function icsCalendar(name:string,events:IcsEvent[],refreshHours=6){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mienke & Luvhan//Wedding//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',`X-WR-CALNAME:${esc(name)}`,`X-WR-TIMEZONE:${WEDDING_TZ}`,`REFRESH-INTERVAL;VALUE=DURATION:PT${refreshHours}H`,`X-PUBLISHED-TTL:PT${refreshHours}H`,...events.flatMap(icsEventLines),'END:VCALENDAR'];
 return lines.map(fold).join('\r\n')+'\r\n';
}
