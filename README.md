# Archissance — studio website

Static HTML/CSS/JS. No build step required to **deploy** (the `*.html` files are
committed and ready to serve), but content is **generated** from templates in
`build/` so you edit in one place and regenerate.

Clean/modern editorial, keyed to the logo — warm near-white (`#f6f4ef`), pure-white
panels (`#ffffff`), near-black ink (`#161513`). Brand red (`#d10000` / `#b00000`)
is kept deliberately small now — only on catalogue codes (`.cat`) and the eyebrow
dot; everything else that used to be red (nav rules, section markers, focus
rings, process accents) reads in ink/grey.

One typeface throughout: **Instrument Sans** (400–700, Google Fonts) — no serif.
Display headings that used to carry an Instrument Serif accent word ("Projects",
"…single team.", "…the site.", "Start a project.") are now set **uppercase**
(`.display--caps`); the project-title `<h1>` and body copy stay sentence case.
The primary logo is the client-supplied file **`LOGO-A`** (`build/source-images/logo-a.jpg`
→ `assets/img/proc/logo-a-*`), used as-is at its own proportions — header, footer,
favicon, and the Firm-page brand panel. In the header, `.brand` is
`align-items: flex-end` so the "Archissance" wordmark's baseline sits level with
the bottom edge of the logo square. The bold **Archissance** wordmark sits beside
it and again at the foot of every page.

### Home hero — one autoplay-loop clip

The **home hero** (`.hero-reel` / `[data-hero-reel]` in `build/build.mjs`
`home()`, styled `.hero-reel*`) is **one** clip — a Linden Point render
fly-through (`assets/video/linden-hero.mp4`, distinct from `linden-render.mp4`
used on the Linden Point project page itself). No slideshow, no chapters, no
scroll driving it.

- `.hero-reel` is a plain `100svh` section (`min-height: 34rem`); the video +
  scrim + grain live in an absolutely-positioned `.hero-reel-media` (which owns
  the `overflow: hidden` that clips the drift). The `<video>` carries
  `autoplay loop muted playsinline`. It scrolls away normally.
- The **wordmark bleeds the hero/page seam** (FarFrom style): `.hero-seam` is a
  short `--paper` band right after `.hero-reel`; `.hero-seam-word` (the page
  `<h1>`, **700 weight** — the footer's weight) is **left-set to the gutter**
  and sits on the seam's top edge with `translateY(-90%)` desktop / `-87%`
  mobile — most of the word is over the darkened bottom of the video, and the
  bottom ~10% of the glyphs dissolves cleanly into the paper below. **One
  colour** (`var(--paper)`). `12vw` desktop / `15vw` mobile — the whole word
  fits inside the viewport. No hero eyebrow. GSAP rises the word on load; a
  `load` failsafe un-hides it if GSAP fails.
- The logotype (`SITE.wordmark` in `partials.mjs`) is set **lower-case**
  (`archissance`) — header brand, footer wordmark, and this hero seam word only.
  Every other reference to the firm's name (page `<title>`s, meta descriptions,
  the Firm-page body copy, "Archissance Design Group" in the footer) keeps
  normal sentence/title-case capitalization — those are prose, not the logotype.
- Under the wordmark, **`.statement` ("The practice")** is just the Samir Hijazi
  quote, set as a quiet `--ink-70` lead in the **right** columns (`col-7 start-6`)
  to balance the left-set wordmark.
- Full-bleed `object-fit: cover` on `.hero-reel-video`; also (by design, since
  the Foster/MAD rework) on the list thumbnails and project-hero crops —
  `qa.mjs` allow-lists those containers.
- **It plays regardless of `prefers-reduced-motion`** (owner's call — it's a
  muted decorative background). Reduced-motion only turns off the slow CSS
  `hero-drift` zoom/pan on the video layer, not playback.
- **Playback is nudged hard in `main.js`**, because a bare `autoplay` attribute
  is the flaky part: an "autoplay blocker" extension, Chrome/Windows energy
  saver, or a `data:` URI source can leave it on frame 0. So `.play()` is
  retried on every media load event, on a 400 ms timer for the first ~5 s, on
  `visibilitychange`, and on the first user interaction; `.load()` is re-issued
  if the network stalls. All wrapped in `try/catch`.
- **Every hero layer is `pointer-events: none`** (the hero holds no links) so it
  can't intercept a tap.
- The `hero-drift` animation (a slow scale 1.06→1.14 + pan, 32 s, alternating)
  keeps the hero visibly moving even during the quiet stretches of the render,
  and hides the loop seam.
- No HTTP `Range` dependency — autoplay-loop never seeks, so it plays on any host
  (and inlines cleanly as a `data:` URI in the self-contained bundle).
- `overflow-x: hidden` lives on `<html>`, **not `<body>`** — on `<body>` it forces
  `overflow-y: auto`, making `<body>` a nested scroll container, which breaks
  `position: sticky` and swallows scroll events elsewhere on the site.
- The mobile menu (`.nav`, `position: fixed`) is `visibility: hidden` when closed,
  and `.nav-open .site-header { transform: none }`. `.site-header.is-hidden` sets a
  `transform` on the header, which would otherwise make it the containing block for
  the fixed `.nav` — the nav then sizes to the header instead of the viewport and
  its links (last one: "Contact") peek into the top-left corner while the header
  hides on scroll. `.site-header` also carries a permanent `transform: translateZ(0)`
  (own GPU layer) so `position: fixed` + `backdrop-filter` don't ghost the bar during
  iOS momentum scroll — safe because the two rules above already neutralise the
  containing-block effect for the menu.
- Every inner-page header carries a **`.back-link`** (`[data-back]`, `partials.mjs`
  `header()`): `history.back()` when `document.referrer` is same-origin, otherwise
  it follows its `href` to the site root. Label collapses to the arrow alone
  ≤640 px. Hidden on the **home page** (`.site-header[data-over-hero] .back-link
  { display: none }`) — there's nowhere back to go and the wordmark is the home
  link.
- Project-page `<video>`s (muted loops, played while in view by an
  IntersectionObserver in `main.js`) have a watchdog: if one is still
  `readyState 0` 2.5 s after coming into view — the signature of a host that
  ignores `Range` — it's re-fetched as a Blob so it plays from memory, reverting
  to the file if the Blob is rejected. (Skipped for `data:` URI sources, i.e.
  the bundle.) `node build/serve.mjs` is a Range-capable local server.

Encode (`ffmpeg`, from `New Renders/Linden Point/Video_Render.mp4`):
`-c:v libx264 -profile:v high -pix_fmt yuv420p -crf 23 -preset slow -g 120
-an -movflags +faststart -vf scale=1280:720` → ~1.5 MB.

### Editorial pass (revisions 5–7)

- **Image frames — split by context.** The big renders (project hero, gallery,
  before/after, elevation) are **clean-cut**: no border, no background, own
  proportions, never cropped. The hairline `1px solid var(--line)` frame is kept
  only on the list thumbnails (`.work-row-media .figure`, `.other-card .figure`)
  and on media panels (`.video-shell`, `.firm-mark`, `.process-draw`) — those are
  `object-fit: cover` crops inside a fixed frame, where a border reads as
  intentional rather than messy.
- **List rows.** `workRow(p, { prefix, twoUp })` (in `build.mjs`) renders one row:
  catalogue + title + `sector / location` + "View project →" on the left,
  thumbnail(s) on the right, hairline divider between. **One** image
  (`twoUp: false`) on the home **"Selected work"** list; **two** framed
  thumbnails (`twoUp: true`, falls back to one if there's only one image) on
  each category group of the **Projects index** (which keeps its `#mixed-use` …
  anchors for the "What we do" links).
- **Project detail** (`projectPage()`): title top-left → **one** large clean-cut
  hero image (`.project-hero`, natural proportions — no second "peek" image, no
  `aspect-ratio` + absolutely-positioned `<picture>`, which is what made the
  hero silently collapse to 0 height on iOS Safari) → the summary's first
  sentence as a large `.project-statement` → a right-column (`col-6 start-7`,
  left empty) with a small `.project-meta` line, the rest of the summary + `body`,
  and the `.facts` table → media grid → **`.other-strip`** (4–6 other-project
  thumbnails, replaces Previous / Next) → CTA panel.
- **"The practice"** — just the Samir quote, quiet `--ink-70` lead, right columns.
- **CTA panel** is `var(--paper-3)` with a top hairline, unchanged.
- **`.section-head`** — a title-left / link-right row with a bottom rule.
- The scrolling **marquee**, the hero **scroll cue** and the hero **eyebrow**
  were removed as clutter.
- Header brand: `align-items: flex-end` so the "Archissance" baseline sits at the
  bottom edge of the logo tile.
- **`.site-header` carries no `will-change`.** It used to (for an iOS
  momentum-scroll fix); `will-change: transform` — like `transform` itself —
  makes an element the containing block for `position: fixed` descendants, so it
  kept sizing the fixed mobile `.nav` to the ~76px header even after
  `.nav-open .site-header { transform: none }` cleared the transform. The menu
  opened but was squashed into the header's box with "Home" pushed off-screen.
  `transform: translateZ(0)` alone still gives the header its own GPU layer.

### "What we do" → Projects categories

The homepage "What we do" rows are `<a href="projects.html#<id>">` (ids
`mixed-use` / `commercial` / `infrastructure-industrial` / `residential`, from
`catId()` in `home()`). The Projects page category groups carry the matching
`id`. `[id] { scroll-margin-top: 6rem }` (already in the reset) keeps the heading
clear of the fixed header after the jump.

Colour tokens live at the top of `assets/css/main.css` (`:root`) — change them there.

### Self-contained bundle (`build/standalone.mjs`)

`node build/standalone.mjs` writes **`build/index.standalone.html`** (full document)
and **`build/index.artifact.html`** (head-less fragment for an Artifact) — the
*whole* site in one offline file:

- every page's `<main>` becomes a hash route (`#/`, `#/projects`, `#/firm`,
  `#/contact`, `#/projects/<slug>`, plus `#/projects#<category>`); `build/router.js`
  shows one at a time and rewrites every internal link to those hashes
- **`router.js` re-inits the scroll effects per route.** `main.js` exposes
  `window.__archReveal(scope)` and `window.__archScrollFx(scope)`; the router calls
  them on `hashchange`, because the reveal / GSAP-ScrollTrigger animations bind
  once at load and their elements are `display:none` then, so without re-init a
  freshly-shown route's entrance animation never plays. `main.js` also skips
  force-revealing content that isn't currently on the page (`offsetParent` guard).
- CSS / JS / GSAP inlined; each unique image inlined **once** into a shared map
  (`data-img` attributes hydrated by a tiny script) so images used on many pages
  aren't duplicated; the `-sm` (1100 px) variants are used — except that a
  handful of especially heavy ones (dense renders, or technical line drawings)
  can each cost 150–300KB even at `-sm`, enough on their own to push the whole
  bundle over its cap. Those get a further-compressed, bundle-only copy in
  **`build/bundle-img/<name>.jpg`** (generated by `build/bundle_images.py`,
  same idea as `build/bundle-video/` below), which `standalone.mjs` prefers
  when present. `assets/img/proc/*-sm.jpg` itself is never touched for this —
  it's also what the real multi-page site serves on narrower/2×-DPR
  viewports (see `picture()`'s `srcset` in `build.mjs`), so degrading it to
  solve a bundle-only problem would ship blurry images to real visitors too.
  Only add an image to `build/bundle_images.py`'s `TARGETS` after confirming
  via `node build/standalone.mjs` that the bundle is actually over cap.
- **every clip** — the home hero and all project-page videos — is inlined as a
  `data:video/mp4` URI on a real `<video autoplay loop muted playsinline>`, using
  the small 960 px re-encodes in **`build/bundle-video/`** (~300–800 KB each) so
  the whole set fits under the 16 MB artifact cap. Chromium plays them; WebKit /
  iOS can't decode a `data:` video and shows the inlined first-frame poster
  instead. A `<video>` with no `<source>` still degrades to `<img class="bundle-still">`.
  `standalone.mjs` reads `build/bundle-video/<file>` if present, else the
  full-quality `assets/video/<file>`.

`standalone.mjs` never string-substitutes a `data:` URI into the markup and never
regex-slices on `<body>`/`<main>` in a way that a stray tag-like string inside the
CSS could break — an earlier `/* … <body> … */` comment in `main.css` did exactly
that and dumped a second copy of the CSS onto the page as raw text.

---

## Quick start

```bash
# Any static server works. build/serve.mjs adds HTTP Range support, which
# project-page videos prefer (the home hero autoplay-loop needs no server).
node build/serve.mjs 4180
# → http://127.0.0.1:4180
```

To change content, edit files in `build/` then regenerate:

```bash
npm install          # one-time (Node 18+)
npm run build         # regenerates all 17 .html files (4 top-level + 13 projects)
```

---

## Project structure

```
archissance/
├── index.html  firm.html  projects.html  contact.html   ← generated, do not hand-edit
├── projects/<slug>.html                                 ← generated, one per project
├── assets/
│   ├── css/main.css        ← all styles (hand-edited)
│   ├── js/main.js          ← all behaviour (hand-edited)
│   ├── vendor/             ← GSAP + ScrollTrigger (vendored, pinned 3.13.0)
│   └── img/proc/           ← processed images incl. logo-a-* (generated, committed)
├── data/
│   └── projects.json       ← ★ project catalogue — edit this
├── assets/video/           ← H.264 mp4s, no audio: linden-hero (home hero),
│                              fullerton-render, linden-render, bellflower-5/-6, sharif-2
├── build/
│   ├── build.mjs           ← ★ page content + layout — edit this
│   ├── partials.mjs        ← ★ site name, address, nav, footer, logo, motifs — edit this
│   ├── process_images.py   ← image resample + sharpen pipeline (Pillow)
│   ├── bundle_images.py    ← bundle-only extra compression for oversized -sm.jpg (see below)
│   ├── standalone.mjs      ← bundles the WHOLE site into one hash-routed HTML file
│   ├── router.js           ← the hash router used inside that bundle only
│   ├── serve.mjs           ← Range-enabled local static server (for project videos)
│   ├── shoot.mjs / qa.mjs / herotest.mjs / routetest.mjs  ← headless QA (optional)
│   ├── bundle-img/         ← generated by bundle_images.py, bundle-only, not deployed
│   └── source-images/      ← normalised source stills + logo-a.jpg, not deployed
└── package.json
```

`assets/img/proc/` and the generated HTML **are** committed so the site can be
deployed with zero tooling. Re-run the generators when you change source content.

---

## Editing content

| To change… | Edit | Then run |
|---|---|---|
| A project's title, blurb, facts, image list | `data/projects.json` | `npm run build` |
| Home feature + "selected work" list (Fullerton feature; Sharif / Linden Point / West Valley) | `build/build.mjs` → `home()` (`feature`, `selected`) | `npm run build` |
| Project category names + order (Mixed-Use → Commercial → Infrastructure & Industrial → Residential) | `build/build.mjs` — `projectsIndex()` `order`, `home()` `sectors` | `npm run build` |
| Home / Firm / Contact copy | `build/build.mjs` | `npm run build` |
| Studio name, address, email, phone, nav, footer | `build/partials.mjs` (`SITE`, `NAV`) | `npm run build` |
| Colours, type, spacing | `assets/css/main.css` (`:root`) | — |
| Animation | `assets/js/main.js` | — |

### Per-project fields in `projects.json`

- `hero` — image name for the big hero. `"video"` uses `heroVideo` instead.
- `heroVideo` — `{ "src": "file.mp4", "poster": name }` for a video hero (Bellflower).
- `images` — extra views shown in a clean-cut grid below the write-up, and feed
  the list rows' second thumbnail (`workRow`, `twoUp: true`) — `images[0]` first.
  Each entry is either a plain name, or `{ "name": ..., "wide": true }` to force
  that one onto its own full-width row instead of pairing with a neighbour.
  Renders are never cropped, so two very different aspect ratios sharing a row
  (e.g. a near-square photo next to a wide one) leaves a visible gap under the
  shorter one — `wide` sidesteps that for a genuine outlier. Use sparingly;
  most galleries never need it (Fullerton Mixed-Use does, for its one
  near-square shot among otherwise wide ones).
- `beforeAfter` — `{ "before": name, "after": name }` renders a labelled before/after pair (Metro Fusion).
- `elevation` — image name for a full-width elevation strip, shown at its own native ratio (Bellflower).
- `videos` — array of `{ "src": "file.mp4", "poster": name, "caption": "…" }` blocks in the media grid.
  `poster` points at each clip's **first frame** (`*-vframe*`, extracted with
  `ffmpeg select=eq(n\,0)` and run through `process_images.py`) so the still and
  the moving clip always match.
- `client` — agency / owner, shown as a fact and used on cards when there is no `location` (West Valley, Ontario).
- `selected` — `true` marks a homepage Selected Project (informational; `home()` uses explicit slugs).
- `body` — array of paragraphs rendered after the summary. `summary`/`body` copy is the
  client's exact supplied text — do not rewrite.
- `catalogue` — the `A-NN` code shown on list rows, the project meta line and the
  facts table. Numbered in category order (Mixed-Use `A-01…03`, Commercial
  `A-04…09`, Infrastructure & Industrial `A-10…13`, Residential `A-14…16`) —
  but the catalogue string is only ever a label. The actual display order on
  the Projects index and in "Selected work" (within each sector group, via
  `projects.filter(p => p.sector === sec)`, which preserves source order) —
  and the "Other projects" strip on every project page — all come from each
  project's **position in this array**, not from its catalogue number. Editing
  `catalogue` alone re-labels a project without moving it; to reorder projects
  in a listing, move the project's whole block in this file, and keep every
  catalogue number in that sector re-labeled sequentially to match.

Images and gallery/card media are never cropped: `process_images.py` keeps every
source's native aspect ratio and writes final pixel dimensions to
`assets/img/proc/manifest.json`, which `build.mjs` reads to set each `<img>`'s
intrinsic `width`/`height` (reserves the box, no forced ratio). CSS is
`width:100%; height:auto` with no `object-fit: cover` on any figure/gallery/card;
every one wears the same `1px solid var(--line)` hairline frame (see revision 5,
above). The **only** `object-fit: cover` is `.hero-reel-video` — the full-bleed
home hero, where filling the viewport (no black bars) is the deliberate priority.

---

## Images

Source stills live in `build/source-images/`. `process_images.py` runs
`ImageOps.exif_transpose`, resamples each source to a large (≤2400 px wide) and a
small (1100 px) version **at its native aspect ratio**, sharpens lightly, and saves
WebP + JPG for each (`-lg` / `-sm`). It writes `assets/img/proc/manifest.json`
(`{ name: [w, h] }`) so `build.mjs` can set intrinsic dimensions. **Nothing is
cropped** except a thin bottom watermark strip on the CRMLS MLS photos
(`CROP_WATERMARK` set — Chino Hills / Irvine), which removes a watermark, not
composes a crop.

```bash
pip install Pillow
python build/process_images.py
```

To add an image: drop the file in `build/source-images/`, add a
`"filename.ext": "image-name"` line to `MAP` in `process_images.py`, list
`image-name` in that project's `hero` / `images` / etc. in `projects.json`, then
`npm run images && npm run build`.

### Video

All clips are H.264 mp4, audio stripped, `-movflags +faststart`, 1280×720 (16:9),
no crop/scale distortion.

| File | Project | Use |
|---|---|---|
| `linden-hero.mp4` | Linden Point | **home hero** (autoplay + loop) |
| `linden-render.mp4` | Linden Point | Linden project media |
| `fullerton-render.mp4` | Fullerton Mixed-Use | Fullerton project media |
| `sharif-2.mp4` | Sharif Jewelers | the single Sharif project video |
| `bellflower-6.mp4` | Bellflower Residences | project **video hero** (`-crf 23`) |
| `bellflower-5.mp4` | Bellflower Residences | project media ("Approach from the street", `-crf 23`) |

All are plain muted loops (`-crf 23`, standard GOP). Every one **autoplays**
(`autoplay muted playsinline loop`), **regardless of `prefers-reduced-motion`** —
the home hero full-bleed, project-page videos while in view (an
IntersectionObserver just pauses the off-screen ones). `main.js` also `.muted = true`
on each and re-tries `.play()` on a short timer / tab focus / first interaction,
so an autoplay-blocker extension or energy-saver doesn't leave a dead poster.
`<controls>` only appears if the browser has no `IntersectionObserver` at all.

`sharif-1.mp4` was dropped (Sharif is one video).

**`build/bundle-video/`** holds a 960 px / `-crf 30` re-encode of each clip
(~300–800 KB) — the self-contained bundle inlines these instead of the
full-size files so the whole page stays under the 16 MB artifact cap.
Regenerate with:
`ffmpeg -i assets/video/<f>.mp4 -an -c:v libx264 -profile:v main -crf 30 -preset slow -g 90 -movflags +faststart -vf scale=960:-2 build/bundle-video/<f>.mp4`

**`build/bundle-img/`** is the same idea for images: after `node build/
standalone.mjs`, if the bundle is still over its 16MB cap, list the heaviest
offending images in `build/bundle_images.py`'s `TARGETS` dict (name → max
width, JPEG quality) and run `python build/bundle_images.py`. It writes
`build/bundle-img/<name>.jpg`, which `standalone.mjs` prefers over the normal
`assets/img/proc/<name>-sm.jpg` — leaving the real site's own images (which
`-sm.jpg` also serves, on narrower/2×-DPR viewports) untouched. Line
drawings/plans tolerate much more aggressive compression than photos before
any artifacting is visible — check by eye before shipping either way. Don't
pre-emptively add entries; only once `standalone.mjs` actually reports the
bundle over cap.

### Image provenance — which folder went where

`build/source-images/` holds the stills the studio supplied, renamed. The
2026 `New Renders/` drop is the source of truth for every project it covers; the
older stills were removed for those projects (no old/new mix).

| Project | `New Renders/` folder |
|---|---|
| Fullerton Mixed-Use | `Mixed-Use/` — 6 renders (aerial + street) + `Render_video.mp4` |
| 1012 J Street *(was "Zaytuna")* | `1012 J street/` — `1012_2.png` |
| Chino Hills Residence | **no folder** — kept existing CRMLS MLS photos (`colinas-*`), watermark strip trimmed |
| Bellflower Residences | `Bellflower/` — `Bellflower_1.jfif` (wide street elevation) + `ANIMATION-REVISIOV-5/6-HD - Trim.mp4` |
| Linden Point | `Linden Point/` — `LP_1`–`LP_5.png` + `Video_Render.mp4` |
| Irvine Residence Interior | **no folder** — kept existing CRMLS MLS photos (`irvine-*`), watermark strip trimmed |
| Sharif Jewelers | `Sharif/` — `Sharif_roseville_front/right.jfif` + `Video_2/3.mp4` |
| Metro Fusion | `MetroFusion/` — `MF_1/2.jfif`, `Metro_3.png`, `before_mf.jpg` (before = the former Claire's) |
| Power Market Gas Station *(displayed title; slug stays `powermarket-gas-station`; was "Los Alamitos Chevron")* | `Yolo County-Woodland/` — `LosAlimitos_1/2/3.jfif` + `LosAlimitos_axon.jfif` |
| Solano Water Treatment Plant | `WaterTreatment_solano/` — `Solano_1.jfif` (metal building) |
| Ontario Water Treatment Plant 925 | `Ontario925/` — `Ontario925_7/9.png` |
| Ontario Water Treatment Plant — Well 37 & 39 | `Ontario 37&39/` — `Ontario37&39_1/2.jfif` |
| West Valley Water Treatment Plant | `WestValley/` — `WV_1`–`WV_5.png` |
| *(brand logo)* | `LOGO-A.jpg` → `logo-a.jpg` → `assets/img/proc/logo-a-*` |

**Removed this round:** the "Adenmoor" project (it was a duplicate of Linden Point —
same West Sacramento development), and every superseded old still for the projects
that got a new folder.

---

## ⚠️ Before launch — placeholder checklist

Set in `build/partials.mjs` → `SITE`:

- [x] **Email** — `samir@archissance.com` (set)
- [x] **Phone** — `(949) 544-5505 ext 100`, `tel:+19495445505,100` (set, per revision 2)
- [x] **Address** — 3185 Airway Avenue, Suite F1, Costa Mesa CA 92626 (set)
- [ ] **Logo** — using the client's `LOGO-A.jpg` **exactly as supplied**: it's a JPEG
      (no transparency) and the round mark is clipped at the bottom/right edges in the
      source. Reads fine as a small red tile in the nav/footer and as the Firm-page
      red panel, but a clean transparent vector (or an un-cropped export) would be better.
- [ ] **Videos** — the hero *and* every project-page clip autoplay + loop muted,
      regardless of `prefers-reduced-motion`; no special host support needed.
      `main.js` retries the hero's `.play()` aggressively (load events, a short
      timer, tab focus, first interaction). If an autoplay-blocker extension or
      hard energy saver still stops the hero, the `hero-drift` CSS keeps the
      frame moving and the first scroll/tap starts playback. Confirm on the
      deployed pages. NB: WebKit/Safari can't play `data:` URI video in the
      standalone bundle — the artifact shows first-frame posters there (hero
      still drifts). The deployed site's real `<source>` files play in Safari fine.
- [ ] **Domain** — `archissance.com` assumed for `<link rel="canonical">` / Open Graph. Confirm.
- [ ] **Contact form** — posts to `/api/contact` (`build/contact-handler.mjs`),
      which records every enquiry through two independent, best-effort
      channels so neither one's failure loses a submission (the request only
      fails if BOTH fail):
      - **Email**, through GoDaddy Node.js Hosting's built-in gateway
        (`build/email.mjs`). **Set `CONTACT_FORM_RECIPIENT_EMAIL`** (e.g.
        `samir@archissance.com`) as an environment variable in the Node.js
        Hosting UI — with it unset, no email is sent (logged server-side),
        but a submission still succeeds if the DB save below works.
        Because archissance.com mail is on Microsoft 365, the gateway's mail
        can be quarantined as spoofed. If `MS_TENANT_ID`, `MS_CLIENT_ID`,
        `MS_CLIENT_SECRET` and `MS_SENDER` are all set, `build/graph-mail.mjs`
        sends through Microsoft Graph (Mail.Send app permission) as
        `MS_SENDER` instead — authenticated, so it lands normally.
      - **A durable row in GoDaddy managed MySQL** (`build/db.mjs`, table
        `enquiries`, auto-created on first use). **Enable managed MySQL** for
        this app in the Node.js Hosting UI so the platform injects
        `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` — with
        those unset, the DB save is skipped (logged server-side).

      Works with JS disabled (native form POST → 303 redirect to
      `contact.html?sent=1|0`) and is progressively enhanced by
      `assets/js/main.js` (fetch + inline status message) when JS is
      available. Locally, neither the email gateway (`127.0.0.1:2525`) nor a
      real managed-MySQL instance exists outside a GoDaddy container, so both
      channels fail as expected ("email gateway unreachable" /
      "database not configured") — that's fine; the route's validation and
      response logic still exercises correctly. **Both env-var groups need
      to be set once deployed**, or enquiries have nowhere to go.
- [x] **Project data** — titles, locations, clients, statuses, years and the seven
      supplied project descriptions reconciled to the studio's revision-2
      source-of-truth list (`data/projects.json`). `summary`/`body` for Bellflower,
      Irvine and Solano are still the earlier illustrative copy — confirm.
- [ ] **Water-plant narratives** — Ontario 925 and Ontario Well 37 & 39 have no
      descriptive copy (none was provided; body left empty rather than invented).
      West Valley likewise has no narrative. Add real copy when available.
- [ ] **Watermarked photos** — Chino Hills Residence and Irvine Residence Interior
      stills carry CRMLS MLS watermarks in the source (bottom strip trimmed, but the
      studio should replace them with owned or licensed photography). No new renders
      were supplied for these two.
- [ ] **Team** — confirm partners / titles in `build/build.mjs` → `firm()`.
- [ ] **Social links** — none yet; add to the footer in `build/partials.mjs` if wanted.

---

## Deploy

Any static host. The repo root is the web root.

- **Netlify / Vercel / Cloudflare Pages** — no build command needed; publish
  directory = `.` (repo root). Or set build command `npm run build` if you want
  it to regenerate on push.
- **S3 / nginx / Apache** — upload the folder. Ensure `.webp` is served as
  `image/webp`. `.mp4` responses honouring HTTP `Range` (the default everywhere)
  lets project-page videos start faster; the home hero doesn't need it.

---

## QA (optional)

```bash
npm i -D playwright && npx playwright install chromium webkit
python -m http.server 4181 &                    # any static server, in another terminal
node build/qa.mjs        http://127.0.0.1:4181  # broken img / crop / overflow / stale terms
node build/herotest.mjs  http://127.0.0.1:4181  # hero: full-bleed, autoplays+loops (incl. reduced-motion), drift on/off (Chromium + WebKit)
node build/routetest.mjs http://127.0.0.1:4181  # nav / project cards / "What we do" anchors / back-forward
node build/shoot.mjs    http://127.0.0.1:4181   # → build/shots/*.png (desktop + mobile)
```

## Browser support

Modern evergreen browsers. Uses CSS Grid, custom properties, `aspect-ratio`,
`clamp()`, `position: sticky`, `fetch`, `IntersectionObserver`. No JS →
full static content (nav, all copy, images); the hero `<video autoplay loop>`
still plays. GSAP failure → content still shows, just without the wipe /
line-draw. The hero is verified against Chromium **and** WebKit in both
breakpoints and both motion modes via `build/herotest.mjs`.
