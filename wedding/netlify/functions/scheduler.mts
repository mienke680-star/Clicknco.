import {runScheduler} from '../../lib/notify';
// Netlify Scheduled Function: runs every 10 minutes even when nobody has the website open.
// Publishes the notifications for scheduled updates, prepares RSVP reminders and, when a provider
// is configured, sends pending messages.
export default async () => {
 const result=await runScheduler();
 console.log('wedding scheduler',JSON.stringify(result));
};
export const config={schedule:'*/10 * * * *'};
