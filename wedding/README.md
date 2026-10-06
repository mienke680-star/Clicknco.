# Mienke & Luvhan — Netlify wedding website

The private, single-wedding website for Mienke, Luvhan and their guests, adapted from the Cloudflare edition to run on **Netlify**. Design and features are unchanged: the private couple dashboard (guests, RSVPs, seating and floor layouts, budget, suppliers, checklist, inspiration, gifts, schedule), personal invitation links, individual event RSVPs, couple-controlled plus-one permission with optional companion details, guest photo uploads, a looping invitation video and invitation-wide background music.

Guests never need an account (no ChatGPT, Claude or Netlify login): they open their personal invitation link. There are no AI features, no payment processing and no guest email fields (any `email`/`plusOneEmail` on guest records is removed on save and on transfer).

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
- Personal invitation links are bearer links: anyone with a link can view that guest's invitation and update their RSVP. Share each link only with its guest.
- Private pages and API responses are sent with `Cache-Control: private, no-store` and `Netlify-CDN-Cache-Control: no-store`, so Netlify's CDN never caches them. Media is served only through authorised routes.

## Local development and tests

```sh
npm install
npm run check        # TypeScript
npm test             # API, login, export and transfer tests (in-memory Blobs)
npm run build
npm run test:http    # production build over HTTP against Netlify's local Blobs server
```

`WEDDING_TEST_URL=https://<throwaway-site>.netlify.app WEDDING_TEST_SETUP_CODE=<its code> npm run test:http` runs the same checks against a real Netlify deploy, plus simultaneous RSVPs and uploads. Never point it at the real wedding: it creates test guests and files.

For interactive local development with Blobs, use the Netlify CLI: `netlify dev` (it emulates Blobs and environment variables). A video must be encoded in a format the guest's browser supports (H.264 MP4 is safest); an `.mp4` extension alone does not fix an unsupported codec. Music attempts autoplay and starts on the guest's first tap if the phone blocks sound; guests can pause both video and music.
