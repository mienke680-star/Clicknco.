CLICK & CO. WEBSITE — LIVE VERSION

8-page static site (no build step, no framework), deployed to Netlify
at https://clickandco.click. Separate from the older, more experimental
"mascot" build kept at the repo root (index.html at
/home/user/Clicknco./index.html).

BRAND SYSTEM

Rebuilt to match the official Click & Co "Wild Peony" brand guidelines
(Hot Magenta #EC008C used as one sparing accent, Ivory Cream / Charcoal
Grey as the base, Dark Peony for headlines, Sage Green / Warm Taupe as
supporting neutrals). Headings use Cormorant Garamond as a free stand-in
for the brand's commercial "Emilia" font; body uses Alegreya Sans;
"Pinyon Script" is used once per page, sparingly, as the signature
flourish — all three are real Google Fonts. All tokens and shared
component styles live in assets/style.css; shared interactive behaviour
(nav toggle, reveal-on-scroll, active nav link, contact form, process
progress bar) lives in assets/main.js. Every page links both files and
repeats the same header/mobile-menu/footer markup (no templating system
is in use, so each page is self-contained HTML).

PAGES

index.html      Home — hero, services teaser, work teaser, facts strip, CTA
services.html   What we do, who we help, hosting & care
work.html       Clients & business relationships (see below)
about.html      Company story + Strategy/Design/Technology pillars
team.html       Meet the founders
process.html    Discover / Design / Build / Launch
faq.html        Facts strip + FAQ accordion
contact.html    Contact form

SHARED ASSETS

assets/style.css   All brand tokens + component styles for every page
assets/main.js     All shared JS behaviour for every page
assets/clickandco-logo-transparent.png   Icon-only pink "C" mark — header, footer, favicon
assets/clickandco-3d-cursor.png          unused — kept from an earlier hero design
assets/hero-laptop-table.jpg             Home page hero background (laptop/phone mockup on stone table)
assets/hero-desktop.jpg                  unused — replaced by hero-laptop-table.jpg
assets/hero-mobile.jpg                   unused — replaced by hero-laptop-table.jpg
assets/clickandco-campaign-advert.jpeg   used as the og:image meta tag
assets/clickco-earth-night.png           unused — leftover from the retired WebGL globe hero
assets/globe-webgl.js                    unused — leftover from the retired WebGL globe hero
assets/founders.jpg          office photo of both founders — Team page
assets/founders-photo.jpg    unused — kept from an earlier Team section design
assets/mienke-founder.jpg    unused — kept from an earlier Team section design
assets/luvhan-founder.jpg    unused — kept from an earlier Team section design
assets/maglev-africa.jpeg    Maglev Africa client logo
assets/labrite.png           Labrite client logo
assets/clinique-estique.png  Clinique Estique client logo (cropped from the supplied lockup)
assets/nearby.png            Nearby venture logo

OUR WORK PAGE

The client/business-relationship content in work.html (and the teaser
on index.html) is hardcoded HTML — there's no build step or
data-fetching anywhere on the site. clients.json is kept alongside it
purely as a readable reference for editing later; the pages themselves
do not read that file at runtime.

To add Labrite's or Clinique Estique's real URL once live: in work.html
(and index.html's teaser, if the client appears there) find the
`<span class="client-pending">Website coming soon</span>` inside that
client's <article> and replace it with
`<a class="client-link" href="THE_URL" target="_blank" rel="noopener noreferrer">Visit website <span aria-hidden="true">↗</span></a>`
(copy the Maglev Africa link as a template). Update the URL in
clients.json too, to keep it an accurate reference.

The "Our partnerships" block is intentionally left out of the page
(not just hidden with CSS) until real partner names/logos are
supplied — clients.json's "partnerships" array is where to note them
when confirmed.

ADDING A NEW CLIENT LATER

In work.html, copy one of the <article class="client">...</article>
blocks inside .client-grid, swap the logo/name/description, and either
link it (see above) or leave the "Website coming soon" pending state.
Add the logo file to assets/ first.

CLICKANDCO (PTY) LTD
WhatsApp / Call: 069 052 2875
Email: clickandcocmpny@outlook.com
