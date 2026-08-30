# Photography portfolio — website

A single-page gallery. The only two things you change are the contents of
`images/` and the settings at the top of `config.js`.

```
photo-website/
├── index.html                    page structure
├── config.js                     ← your settings. This is the file you edit
├── app.js                        the gallery engine (leave alone)
├── style.css                     the design
├── fonts.css                     self-hosted fonts (generated, see §7)
├── favicon.svg  grain.svg        small graphics
├── _headers                      security headers, for if you leave GitHub Pages
├── README.md                     this file
├── .gitignore                    keeps .DS_Store and friends out of the repo
├── tools/fetch-fonts.py          downloads the fonts once, so Google isn't involved
├── .github/
│   ├── workflows/deploy.yml      strips photo metadata, builds the manifest, publishes
│   └── dependabot.yml            watches the actions above for security updates
└── images/
    ├── 2025-01-12.jpg            your photos, named by date
    └── manifest.json             the list of them (generated — don't hand-edit)
```

**Why it isn't one file any more.** It was, until the security pass. Browsers
can't be told "run this inline script but no other" — so as long as the code
lived inside `index.html`, the page had to permit inline scripts in general.
Splitting them out lets the Content Security Policy say `script-src 'self'`,
which means the browser will refuse to execute anything that arrives as part of
the HTML. `config.js` is the only file you'd normally open.

**Note:** the page used to be called `portfolio.html`. It's now `index.html`,
which is what web servers look for by default — the difference between
`yoursite.com` and `yoursite.com/portfolio.html`. The old file has been removed.

---

## 1. Previewing it locally

Double-clicking `index.html` **won't work**. Browsers block folder reads on
`file://`, so the page can't find `images/` and you'll get the "no photographs
found" screen.

Open a terminal in this folder and run:

```
python3 -m http.server
```

Then go to **http://localhost:8000/**. Python's built-in directory listing is
parsed automatically, so while you're working locally you don't need to think
about `manifest.json` at all.

Ctrl-C in the terminal stops it.

---

## 2. The two views

The toggle in the header switches between them, and the view lives in the URL,
so you can link straight to either.

**Gallery** (`/#gallery`) — one photograph at a time, shuffled, filling the screen.
Arrow keys, on-screen arrows, swipe on mobile, 20-second auto-advance. Hovering
the photo pauses it. When the shuffle runs out it reshuffles, and never repeats
the photo you were just looking at.

**Grid** (`/#grid`) — every photograph as an edge-to-edge tile, oldest first, no
gap and no caption. Click one and it opens full-screen; from there the arrows
move through in date order and **Escape** (or *Close*) takes you back to where
you were in the grid. Undated photos sort to the end.

By default tiles are cropped to fill their square (`gridCrop: true`). Set it to
`false` for the whole photo inside its square instead, letterboxed rather than
cropped — still no gap, still no caption.

Any old `/#date` or `/#random` link still works — they land on the grid and
gallery respectively.

### What changed in the design

| Before | Now |
|---|---|
| Background colour extracted from each photo, blooming as you moved between them | One fixed ground: `#faf6f0` warm off-white, `#082e57` deep navy for everything else |
| Text colour flipped light/dark per photo to stay readable | Not needed any more — navy on off-white throughout |
| Fraunces + IBM Plex Mono | Anton, one weight, used throughout — wordmark, captions, About and the small interface type alike |
| Heavy drop shadow (built for a dark ground) | A much lighter one on the single photograph view; none in the grid, whose tiles sit edge-to-edge |
| Chrome scattered into all four corners | A single header — wordmark left, `Gallery / Grid / About` right |
| `Random` / `By date` reordered the same carousel | Two genuinely different views |
| No About section | About panel with your bio and contact links |

**One real bug fixed.** `2025-13-12.jpg` isn't a valid date — there's no
thirteenth month. The old code passed it to `Date.UTC` anyway, which silently
rolled it over and printed **"12 January 2026"** under the photograph. Dates are
now validated, so an impossible one is ignored: the photo still shows, it just
has no caption. See §5 if that file is meant to have a date.

---

## 3. Putting it online with GitHub Pages

Free, and it takes a custom domain later.

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Make a new **public** repository. `photography` or similar. Don't add a README —
   you already have one.
3. Upload the files with **GitHub Desktop**: install it, *Add local repository* →
   point it at this folder → *Publish repository*. After that, adding photos is one
   click.

   > **Don't use the browser uploader for the first push.** GitHub's *Add file →
   > Upload files* page silently skips folders whose names start with a dot, so
   > `.github/` never arrives — and with it you lose both the automatic manifest
   > *and* the metadata stripping described in §6. You'd be publishing photos with
   > their GPS coordinates intact and no warning that anything was missing.
   > GitHub Desktop pushes everything, dotfolders included.

4. Go to **Settings → Pages**. Under *Source* choose **GitHub Actions** (not
   "Deploy from a branch" — the included workflow handles it).
5. Wait a minute or two. Your site appears at
   `https://YOUR-USERNAME.github.io/photography/`.

### Adding your domain when you buy one

1. Buy the domain — Namecheap, Cloudflare Registrar and Gandi are all reasonable.
2. In GitHub: **Settings → Pages → Custom domain**, enter it, save. Tick
   **Enforce HTTPS** once it becomes available.
3. At your registrar, add these DNS records:

   | Type  | Name  | Value                     |
   |-------|-------|---------------------------|
   | A     | `@`   | `185.199.108.153`         |
   | A     | `@`   | `185.199.109.153`         |
   | A     | `@`   | `185.199.110.153`         |
   | A     | `@`   | `185.199.111.153`         |
   | CNAME | `www` | `YOUR-USERNAME.github.io` |

4. DNS takes ten minutes to a few hours. HTTPS then turns on by itself.

---

## 4. Adding and removing photos

Drop files into `images/`, named by date:

```
2025-08-12.jpg                          →  12 August 2025
2025-08-12 Low tide at first light.jpg  →  12 August 2025 · Low tide at first light
2025-08-12_misty_harbour.jpg            →  12 August 2025 · misty harbour
```

Then push. **The GitHub Action strips each photo's metadata, regenerates
`images/manifest.json` and redeploys** — you don't run anything by hand. See §6
for why the metadata step matters.

<details>
<summary>Doing it by hand, if the Action isn't running</summary>

Two things the workflow does that you'd have to do yourself. Run both in the
project folder every time you add or remove a photo:

```
# 1. Strip metadata — GPS coordinates, camera serial, timestamps — while
#    keeping the colour profile and the rotate flag.
#    Needs exiftool:  brew install exiftool
exiftool -all= -tagsfromfile @ -icc_profile -Orientation -overwrite_original images/*

# 2. Rebuild the manifest, or the new photo won't appear at all.
python3 -c "import os,json,re;print(json.dumps(sorted(f for f in os.listdir('images') if re.search(r'\.(jpe?g|png|webp|gif|avif)$',f,re.I))))" > images/manifest.json
```

Then commit `images/manifest.json` along with the photos. Forgetting step 2 is the
most common reason a photo doesn't show up; forgetting step 1 is the one that
actually matters.
</details>

### Sizing

This matters more now that there's a grid. There are no separate thumbnails — the
grid loads the full-size files and scales them down, so 13 photos at 1 MB each is
a 13 MB page. Images below the fold are lazy-loaded, which softens it but doesn't
fix it.

Your photos are already a sensible **1272px on the long edge** — the problem isn't
their dimensions, it's that they're saved at 0.7–1.4 MB for that size, which is
very light compression. Recompressing rather than resizing should get them to
150–300 KB with nothing visible lost:

```
# needs ImageMagick:  brew install imagemagick
mogrify -quality 80 -strip images/*.jpg
```

`-strip` removes metadata locally as well, which is belt-and-braces given the
deploy does it too. **Keep your originals somewhere else first** — `mogrify`
overwrites in place.

---

## 5. Things you might want to change

All in `config.js`:

| What | Setting |
|---|---|
| Wordmark, top-left | `title` — set to `""` to hide it |
| Which view a bare URL opens in | `startView: "gallery"` or `"grid"` |
| Your bio | `about.body` — one string per paragraph |
| Contact links | `about.links` — add, remove or reorder freely |
| Auto-advance speed (Gallery view) | `autoMs` — milliseconds; `0` turns it off |
| Grid order, oldest vs newest first | `dateOrder: "asc"` or `"desc"` |
| Crop grid tiles to fill their square, vs. letterboxed | `gridCrop: true` / `false` |
| Paper texture | `grain: true` / `false` |
| A caption for one specific file | `meta`, e.g. `"2025-13-12.jpg": { caption:"Blue hour, Anglesey" }` |

Colours are the `:root` block at the top of `style.css`: `--paper` and `--ink`.
Everything else in the design is one of those two at reduced opacity, so changing
those two values re-skins the whole site.

**About that thirteenth photo:** `2025-13-12.jpg` currently shows with no caption
at all — there's no thirteenth month, so the date is dropped rather than printed
wrongly, and the filename isn't shown in its place. If the files are actually
numbered 01–13 rather than dated, rename them to real dates. If it *is* meant to
be a date, rename it (`2025-12-13.jpg`?). Or give it a caption via `meta` and
leave the filename alone.

---

## 6. Security

Worth being straight about the shape of the risk first. This is a static gallery:
no form, no login, no database, no server-side code, and nothing a visitor can
type into. There is no way for a stranger to attack *the site* in the usual sense
— there's nothing to inject into and nothing to steal. So the two things that
actually matter here are:

1. **What your photo files reveal about you**, and
2. **who can change the site** — i.e. your GitHub account.

Everything below is built around those. The rest is defence in depth: cheap to
have, and it means that if the site ever grows a form or a third-party script,
the protections are already in place rather than being remembered later.

### The one that matters: photo metadata

Photos from a camera or a phone carry EXIF data — **GPS coordinates**, camera
make, model and serial number, and the exact timestamp. Publishing a landscape
photographer's GPS tags maps out where they live and work, and it's invisible
unless you go looking.

Your current 13 photos are clean; they went through Instagram, which strips this.
That protection disappears the moment you add a file straight off a camera or SD
card, and you'd never notice.

So the deploy workflow **strips all metadata from every image on the way out**.
It's a tag-level edit, not a re-encode: the pixels are untouched and there's no
quality loss. Two tags are deliberately put back, because both are harmless and
removing them breaks the photographs:

- **The ICC colour profile.** Without it, a Display-P3 or Adobe RGB photo gets
  read as sRGB and the colours shift visibly.
- **The orientation flag.** Without it, a portrait photo straight from a camera
  displays on its side.

The build then **checks that no GPS coordinates, camera serial numbers, owner
names or artist tags survived, and fails rather than deploying if any did** — so
this can't quietly stop working after some future change.

Your local copies in `images/` keep their metadata untouched. Only what gets
published is stripped.

### What's protected in the page

| Protection | What it does |
|---|---|
| **Content Security Policy** | Starts from `default-src 'none'` — nothing is permitted — then allows only `'self'` for scripts, styles, images, fonts and network requests. The page cannot load or contact *any* other origin. |
| **No `'unsafe-inline'`** | There is no inline script or style anywhere, so the browser can be told to refuse inline code outright. If markup were ever injected into the page, it could not execute. This is why the site is several files rather than one. |
| **`object-src`/`frame-src`/`worker-src` `'none'`** | No plugins, no iframes, no web workers. Nothing that could be used as a foothold. |
| **`base-uri 'none'`** | Stops an injected `<base>` tag re-pointing every relative URL on the page at somewhere else. |
| **`form-action 'none'`** | There is no form; if one appeared, it couldn't submit anywhere. |
| **No `innerHTML`, anywhere** | Every element is built with `createElement` and `textContent`. No string on this page can become markup — including anything you type into `config.js`. |
| **Manifest entries are validated** | `images/manifest.json` is generated, but the page doesn't trust it. Entries containing a path separator, a scheme, `..`, a leading dot, or a non-image extension are discarded, so a tampered manifest can't point the gallery at another origin or walk out of the folder. |
| **Link scheme allow-list** | Only `http:`, `https:` and `mailto:` links are accepted from `config.js`. `javascript:` and `data:` URLs are dropped. |
| **`rel="noopener noreferrer"`** | External links can't reach back into the page they came from, and don't leak the URL. |
| **`referrer: no-referrer`** | No referrer information leaves the site, to anyone. |
| **No third parties at all** | No CDN, no analytics, no fonts from Google (see §7). Nobody but your host sees your visitors. |
| **`upgrade-insecure-requests`** | Any stray `http://` reference is upgraded to HTTPS rather than being loaded in the clear. |

### What's protected in the deploy

- **An allow-list of published files.** The workflow copies named files into a
  clean `_site/` directory rather than publishing the repository wholesale, so the
  README, the `tools/` folder and anything else you leave lying around never reach
  the web.
- **`.DS_Store` files are deleted at build time** as well as being gitignored.
  They list every filename in a folder, including ones you never published.
- **Least-privilege token.** The workflow can read the repo and publish Pages, and
  nothing else. It can't write to the repository.
- **`persist-credentials: false`** so no usable credential is left in
  `.git/config` for the rest of the job.
- **Dependabot** watches the GitHub Actions the workflow uses and opens a PR when
  one gets a security update.

<details>
<summary>Pinning actions to commit hashes (optional, stricter)</summary>

The workflow refers to actions by tag — `actions/checkout@v4`. A tag can in
principle be moved to point at different code. Pinning to a commit hash removes
that. These are all first-party actions in GitHub's own `actions/` organisation,
which is the lowest-risk case, so this is a nicety rather than a must.

If you want it, on the repo page open `.github/workflows/deploy.yml`, and for each
`uses:` line look up the tag's commit on that action's releases page, then write:

```yaml
- uses: actions/checkout@<40-character-sha>  # v4
```

Dependabot understands pinned hashes and will keep updating them.
</details>

### What you still need to do

1. **Turn on 2FA on your GitHub account.** This is genuinely the biggest risk to
   the site, and nothing in the page can help with it: anyone who gets into your
   account can replace the site with whatever they like. Settings → Password and
   authentication.
2. **Tick "Enforce HTTPS"** in Settings → Pages once your custom domain verifies.
3. **Look at a photo's properties before adding it** if it's from a camera or
   phone and you're at all unsure. The deploy strips it, but knowing what you're
   handing over is a good habit.

### Two things GitHub Pages can't do

- **Clickjacking.** Stopping your site being loaded inside a hostile iframe needs
  a real `frame-ancestors` / `X-Frame-Options` HTTP header. Browsers deliberately
  ignore `frame-ancestors` in a `<meta>` tag, and GitHub Pages doesn't let you set
  headers, so it can't be done there. The practical risk on a photo gallery is
  very low — there's no button worth tricking someone into clicking.
- **HSTS, `nosniff`, `Permissions-Policy`.** Same reason.

There's a `_headers` file in the repo with all of these written out. GitHub Pages
ignores it; **Netlify and Cloudflare Pages read that exact format**, so if you ever
move — both are free and both take a custom domain — the protections switch on
with no further work.

---

## 7. Fonts

The site uses one font, Anton, everywhere — wordmark, captions, About panel and
the small interface type alike. It does **not** load it from Google.

Loading a font from `fonts.googleapis.com` sends every visitor's IP address and
user-agent to Google on every page view, without their knowledge. A German court
(LG München I, 20 January 2022) found that doing this without consent breaches
GDPR. It's also an external dependency and an extra origin the Content Security
Policy would have to permit.

So the fonts are self-hosted. To fetch them, run this once:

```
python3 tools/fetch-fonts.py
```

It downloads the `.woff2` file into `fonts/` and rewrites `fonts.css` to point at
it. Commit both. **Until you run it, the site falls back to Impact / Arial
Narrow Bold** — a reasonable stand-in, just not the same.

---

## 8. Worth knowing

- **Accessibility.** Every photo gets its caption as alt text, the arrows and grid
  tiles are labelled, the viewer traps and restores focus, focus rings are visible
  on keyboard navigation, and the whole thing respects `prefers-reduced-motion` —
  animations collapse to nothing for anyone who's asked their system to reduce
  them.
- **No photographs found.** If you see that screen on the live site,
  `images/manifest.json` is missing or stale. There's deliberately no stock-photo
  fallback: a broken gallery should look broken rather than quietly looking fine.
- **Data protection.** The site collects nothing — no form, no cookies, no
  analytics, no third-party requests once the fonts are self-hosted. There is no
  personal data here to protect, and no privacy policy needed. That changes the
  day you add a contact form.
