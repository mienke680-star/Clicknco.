CLICK & CO. WEBSITE — LIVE VERSION

This is the current live website (single index.html + assets folder),
deployed to Netlify (https://clickandco-website.netlify.app). It is
separate from the older, more experimental "mascot" build kept at the
repo root (index.html at /home/user/Clicknco./index.html).

FILES

index.html
clients.json                (reference content config for the Our Work clients section — see below)
assets/clickandco-logo-transparent.png   (icon-only pink "C" mark — current official logo, used for the header, footer and favicon; no wordmark/tagline text is baked into this file, unlike the version used before)
assets/clickandco-3d-cursor.png    (unused — kept from an earlier hero design)
assets/clickandco-campaign-advert.jpeg   (used as the og:image meta tag)
assets/clickco-earth-night.png     (Earth night-lights texture for the hero globe)
assets/globe-webgl.js              (WebGL renderer for the hero's animated globe)
assets/founders.jpg         (office photo of both founders — used by the Team section)
assets/founders-photo.jpg   (unused — kept from an earlier Team section design)
assets/mienke-founder.jpg   (unused — kept from an earlier Team section design)
assets/luvhan-founder.jpg   (unused — kept from an earlier Team section design)
assets/maglev-africa.jpeg   (Maglev Africa client logo — Our Work section)
assets/labrite.png          (Labrite client logo — Our Work section)
assets/nearby.png           (Nearby venture logo — Our Work section)

SECTIONS

Home (cinematic animated-globe hero), Services, Our Work (clients &
business relationships — see below), About, Team ("Meet Our
Founders"), Process, Contact.

OUR WORK SECTION

The #cc-luxury-clean block in the Our Work section is hardcoded HTML
(matching how every other section on this page works — there's no
build step or data-fetching anywhere else on the site). clients.json
is kept alongside it purely as a readable reference for editing later;
the page itself does not read that file at runtime.

To add Labrite's real URL once it's live: in index.html find
`<span class="cc-pending">Website coming soon</span>` inside the
Labrite <article> and replace it with
`<a class="cc-link" href="THE_URL" target="_blank" rel="noopener noreferrer">Visit website <span aria-hidden="true">↗</span></a>`
(copy the Maglev Africa link above it as a template). Update the URL
in clients.json too, to keep it an accurate reference.

The "Our partnerships" block is intentionally left out of the page
(not just hidden with CSS) until real partner names/logos are
supplied — clients.json's "partnerships" array is where to note them
when confirmed.

CLICKANDCO (PTY) LTD
WhatsApp / Call: 069 052 2875
Email: clickandcocmpny@outlook.com
