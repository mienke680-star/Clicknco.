# Mienke & Luvhan — Netlify wedding website

The private, single-wedding website for Mienke, Luvhan and their guests, adapted from the Cloudflare edition to run on **Netlify**. Design and features are unchanged: the private couple dashboard (guests, RSVPs, seating and floor layouts, budget, suppliers, checklist, inspiration, gifts, schedule), personal invitation links, individual event RSVPs, couple-controlled plus-one permission with optional companion details, guest photo uploads, a looping invitation video and invitation-wide background music.

Guests never need an account (no ChatGPT, Claude or Netlify login): they open their personal invitation link. There are no AI features and no payment processing. Guest records never hold email addresses (any `email`/`plusOneEmail` on guest records is removed on save and on transfer). The only exception is optional: if you connect an email provider (see **Automatic delivery** below), guests may choose to give an address for update emails on their own page. It is kept only in that guest's private notification settings. Without a provider, guests are never asked for one.

## What changed from the Cloudflare edition

| Cloudflare | Netlify |
| --- | --- |
| Worker + `vinext` build | Standard Next.js 16 build, run by Netlify's Next.js runtime |
| D1 database (`wedding`, `photos`, `login_attempts`) | Netlify Blobs store `wedding-data` (`wedding`, `rsvp/…`, `gallery/…`, `auth/…` keys) |
| R2 bucket | Netlify Blobs store `wedding-media` (each file stored as 3 MB parts) |
| `pnpm setup` / `pnpm secrets` in a terminal | Browser only: one-time `/setup` page with a `SETUP_CODE` |
| `import-migration.mjs` via Wrangler | Browser only: **Transfer & backup** page (`/transfer`) |

Data and media are kept in site-wide Netlify Blobs stores. They are permanent: they are not tied to a deploy and remain until deleted, so redeploying or changing the code never removes guest replies or uploads.

Netlify Blobs cannot safely combine simultaneous writes to one record, so nothing a guest does rewrites a shared record:

- each guest's RSVP is saved in its own `rsvp/<guest id>` record and merged into the dashboard when it loads;
- each gallery photo has its own `gallery/<id>/…` index key;
- each login attempt is its own key under `auth/attempts/`.

If a guest replies while the dashboard is open, saving the dashboard keeps that reply. RSVP details you correct yourself in the dashboard (for example after a phone call) are saved as that guest's current reply. Saving from a dashboard opened before another dashboard save is refused with "Reload before saving".

Netlify Functions accept requests of about 6 MB, so the browser uploads files in 3 MB parts, and video is served in byte ranges (what iPhones and other browsers request for playback and seeking). Limits are unchanged: guest photos up to 10 MB (JPEG, PNG, WebP; 500 photos), couple uploads up to 10 MB, invitation MP4 video up to 50 MB.

The cover image, invitation video and music are saved to the invitation as soon as they finish uploading: the dashboard shows upload progress, checks the stored file's type and size, saves its link in the wedding settings, reads it back, and only then reports success. MP4 videos are checked to be real MP4 files. The video plays muted, looped and inline (iPhone-friendly) above the invitation artwork; the music plays separately and starts on the guest's first tap if the phone blocks autoplay.

## Deploy (browser only)

1. Create the Netlify project from this folder (base directory `wedding`). `netlify.toml` sets the build command (`npm run build`), Node 22 and the Next.js runtime.
2. In **Project configuration → Environment variables**, add `SETUP_CODE` with a random value of 12+ characters, then deploy.
3. Open `https://<your-site>.netlify.app/setup`, enter the setup code and choose the couple password (14+ characters). You are signed in immediately. The setup code only works while no password exists; afterwards you can delete the variable.
4. To bring over your existing wedding, follow **Transfer** below **before** editing the new dashboard. Otherwise, edit the example settings and add your guests.
5. Share each guest's personal link from **Guests & RSVPs** (e.g. on WhatsApp).

A random session-signing secret is created automatically and stored privately in Blobs. Optional overrides: `COUPLE_PASSWORD_HASH` (a `pbkdf2-sha256$100000$salt$hash` value) and `SESSION_SECRET` (32+ characters).

## Personalised PDF invitations

Saving a guest (or importing guests from CSV) automatically creates their own one-page PDF. The page is the couple's navy envelope picture (`assets/invitation/envelope.png`, embedded losslessly at its own 1122 × 1402 proportions as a 420.75 × 525.75 pt page: no cropping or stretching), with the guest's name set in gold Cormorant italic (SIL Open Font License) above the envelope. The name is the only added text. A real PDF link annotation covers the whole envelope, seal included, and opens that guest's personal invitation.

Each guest row has **Preview PDF**, **Download PDF** and **Send via WhatsApp**. A PDF is stored privately in Blobs (`wedding-media` → `invitations/<guest id>`) with a fingerprint of what it shows and links to (design version, guest name, invitation link), so it is generated once and reused, and regenerated only when the name, the site address or the design changes. PDFs made with an earlier design are regenerated automatically the next time they are previewed, downloaded or shared. Generating PDFs never changes invitation links. PDFs are only available to the signed-in couple; there is no listing route and guest links cannot fetch them. The guest link uses `SITE_URL` if set, otherwise Netlify's primary site address.

**Send via WhatsApp** prepares the PDF and a warm message you can edit. Where the browser can share files (most phones), **Share PDF and message…** opens the system share sheet with the actual PDF attached; choose WhatsApp and the guest, review and send. Otherwise the dialog offers **Download invitation PDF** and **Open WhatsApp message** (a WhatsApp link can only fill in the text), with steps to attach the PDF yourself. Nothing is sent automatically and no email is used.

## Private wedding hub

All of this is in the same dashboard and on each guest's existing personal link. Every date and time is **SAST, Africa/Johannesburg (UTC+2)**, and the page says so.

**Couple dashboard (sidebar)**
- **Our wedding** opens with **Needs our attention**. It lists unanswered questions, accommodation requests waiting, changed RSVPs, outstanding "Got it" confirmations, photos waiting for approval, and WhatsApp messages still to send or that failed. Each has a button straight to the right place. It also shows new guest activity and a history of important changes.
- **Calendar & Schedule** has month, week and agenda views; click a day to add something.
  - **Guest events** have a title, dates (multi-day allowed), optional start and end times (no time means "time to be confirmed", never an invented one), location, map link, description and photo.
  - You choose who sees an event: everyone, groups, households or individual guests. You can also require an RSVP with a deadline and reminders 14/7/3/1 days before.
  - **Drafts** are invisible to guests until published.
  - **Private planning items, checklist tasks and supplier dates** are only ever visible to the two of you.
  - Events can be moved a day, duplicated (as a draft) or deleted after a confirmation.
  - Changing a published event shows the previous and new details side by side. You can **Save changes** or **Save and notify affected guests**. The second also posts a change notice to those guests' pages and prepares their WhatsApp messages.
- **Updates** ("Latest from Mienke & Luvhan") have a heading, message, optional photo or video, and an optional button.
  - You can save a draft, preview it as a chosen guest, publish now or schedule it.
  - Audience: everyone, groups or households. Updates can be pinned, archived, marked urgent (shown on the wedding-day view), or set to ask guests for a **Got it**.
  - Each update shows how many guests **opened** it and, separately, how many **confirmed** with Got it. Opening is never counted as confirming.
  - **Quick polls** are on the same page.
- **Messages** lists ready-to-send messages per guest (see below), and **Guest questions** holds private threads with each guest.
- **Guests & RSVPs** adds households, group and household filters, private notes, **Preview as guest** and **Reset link**. Reset link revokes the old link at once and makes a new one; the PDF is regenerated.
- **Accommodation & travel**:
  - Rooms with a number of beds.
  - Guests' requests, which you allocate as **Held (pending)** or **Confirmed**. The site refuses to allocate more people than a room has beds.
  - Guests' travel dates, transport needs and lift offers or requests.
- **Questions & Answers** shows the questions every guest sees on their Ask Us tab.
- **Photos**: guest uploads wait for your **Approve** before anyone else sees them. Your own uploads are "official" photos.
- **Wedding weekend** includes wedding-day settings:
  - helper name and phone, and an urgent notice;
  - when to show the wedding-day view;
  - an after-the-wedding thank-you message.

**Guest page (their existing personal link)**

- **Summary**: household name, RSVP status, accommodation status, new updates and a "You still need to…" list with deadlines.
- **Tabs**: My Invitation · Weekend Plans · Updates · My RSVP · Ask Us.
- **Weekend Plans** shows only the published events they are invited to, plus Add to calendar.
  - A single event or the whole weekend can be downloaded as an `.ics` file. The page explains that downloaded files do not change later.
  - **Subscribe** adds a calendar feed (`/api/calendar/<their link code>.ics`) that phones refresh automatically.
- **My RSVP** has attendance per event, changeable until each deadline (a first reply after the deadline is still accepted), plus meal and dietary details.
- Further sections, shown when switched on:
  - an accommodation request;
  - travel dates and transport;
  - lift offers or requests, with contact details shared only if the guest ticks consent;
  - polls, a song request and a message to you.
- **Ask Us**: your Q&A, plus a private thread with you. Guests also choose how they want to hear about updates.
- On the wedding day it also shows today's events, directions, urgent notices and the helper contact. Afterwards it shows the thank-you message, approved photos and the video, on the same link.

Guests only ever see their own household's details and the events and updates meant for them. Other guests' replies, dietary details, questions and contact details are never sent to their browser. Every rule is enforced on the server, and there is no guest directory. Data lives in Netlify Blobs (`wedding-data`): guest-written data uses one record per guest (`guest-state/…`, `questions/…`), so simultaneous guests never overwrite each other.

### Messages and delivery: what is real

- **Without a provider (the default)**, nothing is sent automatically.
  - Publishing an update with "notify", saving a change notice, an RSVP reminder or **Prepare invitation messages** creates one message per guest, with their personal link. Each is shown as **"Ready — you still need to send this"**.
  - **Open WhatsApp** opens WhatsApp with the text filled in. You choose the chat and press send, then tap **Mark as sent**.
  - Messages are never prepared twice for the same update, reminder or guest. You can **Skip** a message, or **Retry** a skipped or failed one.
- **Every update also appears on the guest's page**, whatever happens with messages.
- **The scheduler** is a Netlify Scheduled Function (`netlify/functions/scheduler.mts`) that runs every 10 minutes, even with no one on the site. It:
  - publishes scheduled updates;
  - prepares RSVP reminders at 09:00 SAST on the chosen days, only for guests who haven't replied;
  - hands pending messages to a provider if one is connected.

  Netlify runs scheduled functions on published deploys only (not deploy previews).

### Automatic delivery (awaiting configuration)

Add these in **Project configuration → Environment variables**, then redeploy.

| Feature | Variables | Notes |
| --- | --- | --- |
| Email updates | `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Mienke & Luvhan <hello@yourdomain>`) | A [Resend](https://resend.com) account with a verified sending domain. Once set, guests see an optional "Email me updates" choice. |
| Automatic WhatsApp | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (e.g. `whatsapp:+27…`) | A [Twilio](https://www.twilio.com/whatsapp) WhatsApp sender approved by Meta. WhatsApp only allows business-started messages through **approved templates**, so free-text messages to guests who haven't messaged that number in the last 24 hours will fail. They are shown as **Failed** with the provider's reason, and you can send them yourself instead. |
| Link address | `SITE_URL` (optional) | The address used in messages and PDFs when you use a custom domain. |

With a provider, a message shows **"Accepted by the provider"** only when the provider accepted it. That is not proof it was read or delivered, and the page says so. Failures show the provider's error and can be retried. A message that was being sent when a run was interrupted is marked failed rather than resent, so a guest never gets it twice without you choosing **Retry**.

## Transfer your existing wedding and media

1. On a laptop, open the OLD wedding site (for example `https://ever-after-wedding-studio.mienke680.chatgpt.site`, or the Cloudflare deployment) and sign in as the couple.
2. Open the browser developer console, paste the full contents of `scripts/export-current-wedding.js` and press Enter. Only run the script supplied in this project.
3. In the **Transfer our wedding** panel, download EVERY ZIP: `wedding-transfer-data.zip` and each `wedding-transfer-media-N.zip`. Keep them private: they contain guests' personal links and dietary details.
4. On the NEW site, sign in, choose **Transfer & backup** in the sidebar (or open `/transfer`), select all the ZIPs together and press **Start transfer**. If the new site already has a wedding (for example the example wedding created when you first opened the dashboard), tick **Replace** after making a backup.
5. Check names, venue, dates, video/music, gallery and a guest's RSVP. Freeze edits on the old site during the switch; if anyone replies on the old site afterwards, export and transfer again.
6. Re-send guests their links from the new dashboard. Invitation codes and media IDs are preserved, but the website address changes.

Re-running a transfer is safe: files that already finished uploading are skipped.

The same page has **Prepare backup**, which downloads the same ZIP format from the Netlify site (wedding data, guest replies and every referenced photo, video and song). Use it before big changes; the ZIPs can be transferred into a fresh site the same way.

## Changing the password

Signed in, choose **Change password** in the sidebar (or open `/setup`), enter the current password and the new one. This signs out every other session. There is no reset email: if you forget it, delete the `auth/password-hash` blob in Netlify (**Blobs → wedding-data**), set a new `SETUP_CODE`, redeploy and use `/setup` again.

## Security notes

- Dashboard sessions last seven days, use signed `Secure`/`HttpOnly`/`SameSite=Lax` cookies and are bound to the current password.
- Login and setup allow at most ten attempts per client IP per 15-minute window. Mutating requests require a same-origin `Origin`.
- Personal invitation links are long random bearer links: anyone with a link can view that guest's page and update their RSVP. Share each link only with its guest; **Reset link** revokes it immediately.
- The couple can open **Preview as guest** while signed in; preview views never mark updates as opened or change anything.
- Private pages and API responses are sent with `Cache-Control: private, no-store` and `Netlify-CDN-Cache-Control: no-store`, so Netlify's CDN never caches them. Media is served only through authorised routes.

## Local development and tests

```sh
npm install
npm run check        # TypeScript
npm test             # API, login, export, transfer, PDF and hub tests (in-memory Blobs)
npm run build
npm run test:http    # production build over HTTP against Netlify's local Blobs server
```

`WEDDING_TEST_URL=https://<throwaway-site>.netlify.app WEDDING_TEST_SETUP_CODE=<its code> npm run test:http` runs the same checks against a real Netlify deploy, plus simultaneous RSVPs and uploads. Never point it at the real wedding: it creates test guests and files.

For interactive local development with Blobs, use the Netlify CLI: `netlify dev` (it emulates Blobs and environment variables). A video must be encoded in a format the guest's browser supports (H.264 MP4 is safest); an `.mp4` extension alone does not fix an unsupported codec. Music attempts autoplay and starts on the guest's first tap if the phone blocks sound; guests can pause both video and music.
