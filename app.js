/* ══════════════════════════════════════════════════════════════════════
   ENGINE — no need to edit this file. Everything you'd want to change
   lives in config.js.

   A note on why this is a separate file rather than an inline <script>:
   the Content Security Policy in index.html is `script-src 'self'`, with no
   'unsafe-inline'. That means the browser will refuse to run any script that
   arrives as part of the HTML — so if markup were ever injected into this
   page, it could not execute. Inline code can't be allowed and blocked at
   the same time, which is why the script sits out here.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var stage      = document.getElementById("stage");
  var gridEl     = document.getElementById("grid");
  var counterEl  = document.getElementById("counter");
  var wordmarkEl = document.getElementById("wordmark");
  var grainEl    = document.getElementById("grain");
  var viewBtns   = Array.prototype.slice.call(document.querySelectorAll(".nav-links .view"));

  var aboutEl     = document.getElementById("about");
  var aboutBtn    = document.getElementById("aboutBtn");
  var aboutClose  = document.getElementById("aboutClose");
  var viewerClose = document.getElementById("viewerClose");

  var ITEMS = [];          // normalised photos
  var ORDER = [];          // item-indices in the current order
  var POS   = 0;           // position within ORDER
  var VIEW  = "random";    // "random" | "grid"
  var VIEWER = false;      // full-screen photo open over the grid?
  var current = null, currentIdx = -1, animating = false, autoTimer = null;
  var lastTile = null;     // the tile that opened the viewer, to restore focus to

  var IMG_RE = /\.(jpe?g|png|webp|gif|avif)$/i;

  /* A filename must be a plain filename. This rejects anything with a path
     separator, a scheme, a leading dot, or a control character — so a
     manifest.json that had been tampered with cannot point the page at
     another origin or walk up out of the images folder. */
  var SAFE_NAME = /^[^\/\\:*?"<>|\x00-\x1f]+$/;
  function isSafeFile(f) {
    return typeof f === "string" &&
           f.length > 0 && f.length < 256 &&
           SAFE_NAME.test(f) &&
           f.indexOf("..") === -1 &&
           f.charAt(0) !== "." &&
           IMG_RE.test(f);
  }

  /* Only ordinary web and email links are allowed out of the About panel.
     Blocks javascript:, data:, vbscript: and friends. */
  function isSafeHref(h) {
    if (typeof h !== "string") return false;
    try {
      var u = new URL(h, location.href);
      return u.protocol === "https:" || u.protocol === "http:" || u.protocol === "mailto:";
    } catch (_) { return false; }
  }

  function folderURL() {
    var f = (CONFIG.folder || "images/");
    return f.charAt(f.length - 1) === "/" ? f : f + "/";
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function pad2(n) { return String(n).length < 2 ? "0" + n : String(n); }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ── dates & captions ──
     Validated: Date.UTC happily turns month 13 into next January, which would
     put a wrong date under a photograph. We check the round-trip instead. */
  function parseDate(str) {
    var m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var dt = new Date(Date.UTC(y, mo - 1, d));
    var ok = dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
    return ok ? dt : null;
  }
  function fmtDate(d) {
    return new Intl.DateTimeFormat("en-GB",
      { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  }
  function compose(date, desc) {
    var ds = date ? fmtDate(date) : "";
    if (ds && desc) return ds + " · " + desc;
    return ds || desc || "";
  }

  function itemFromFile(file) {
    var base = file.replace(/\.[^.]+$/, "");
    var date = parseDate(base);
    // Strip a date-shaped prefix whether or not it turned out to be a real
    // date. Otherwise an impossible one like 2025-13-12 falls through to the
    // description and gets printed under the photograph as a raw filename.
    var dateShaped = /^\d{4}-\d{2}-\d{2}/.test(base);
    var rest = dateShaped ? base.slice(10) : base;
    var desc = rest.replace(/^[\s_\-–—]+/, "").replace(/_+/g, " ").trim();
    var meta = (CONFIG.meta && CONFIG.meta[file]) || {};
    return {
      src: folderURL() + encodeURIComponent(file),
      date: date,
      captionText: typeof meta.caption === "string" ? meta.caption : compose(date, desc)
    };
  }

  /* ── orders ── */
  function dateOrder() {
    var idx = range(ITEMS.length);
    var dated = idx.filter(function (i) { return ITEMS[i].date; });
    var undated = idx.filter(function (i) { return !ITEMS[i].date; });
    dated.sort(function (a, b) { return ITEMS[a].date - ITEMS[b].date; });
    if (CONFIG.dateOrder === "desc") dated.reverse();
    return dated.concat(undated);          // undated always trail
  }
  function reshuffle() {
    var last = currentIdx;
    ORDER = shuffle(range(ITEMS.length));
    if (ORDER.length > 1 && ORDER[0] === last) {
      var t = ORDER[0]; ORDER[0] = ORDER[1]; ORDER[1] = t;
    }
  }

  /* ── slides ──
     Built with createElement and textContent throughout. Nothing on this page
     is ever assigned to innerHTML, so no string can become markup. */
  function buildSlide(idx) {
    var it = ITEMS[idx];
    var fig = document.createElement("figure");
    fig.className = "slide";
    fig.setAttribute("aria-roledescription", "slide");

    var wrap = document.createElement("div");
    wrap.className = "img-wrap";
    var img = document.createElement("img");
    img.src = it.src;
    img.alt = it.captionText || "Photograph";
    img.decoding = "async";
    wrap.appendChild(img);

    var cap = document.createElement("figcaption");
    cap.className = "caption";
    cap.textContent = it.captionText;

    fig.appendChild(wrap);
    fig.appendChild(cap);
    return fig;
  }

  /* Quietly warm the next and previous images so a slide never arrives blank. */
  function preloadNeighbours() {
    if (ORDER.length < 2) return;
    [(POS + 1) % ORDER.length, (POS - 1 + ORDER.length) % ORDER.length]
      .forEach(function (p) { var im = new Image(); im.src = ITEMS[ORDER[p]].src; });
  }

  function transitionTo(target, opts) {
    opts = opts || {};
    var slide = opts.slide !== false;
    var dir = opts.dir || 1;
    if (animating) return;
    if (target === currentIdx && current) return;
    animating = true;

    var incoming = buildSlide(target);
    if (slide) incoming.style.transform = "translateX(" + (dir * 100) + "%)";
    stage.appendChild(incoming);
    void incoming.offsetWidth;                        // reflow → entrance animates

    incoming.classList.add("is-active");
    if (slide) incoming.style.transform = "translateX(0)";

    var old = current;
    if (old) {
      old.classList.add("is-leaving");
      if (slide) old.style.transform = "translateX(" + (-dir * 100) + "%)";
    }

    var expected = slide ? "transform" : "opacity";
    var done = false;
    function finish() {
      if (done) return; done = true;
      if (old) old.remove();
      current = incoming; currentIdx = target; animating = false;
      incoming.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
      preloadNeighbours();
    }
    function onEnd(e) { if (e.target === incoming && e.propertyName === expected) finish(); }
    incoming.addEventListener("transitionend", onEnd);
    var timer = setTimeout(finish, slide ? 800 : 700);
  }

  /* ── navigation ── */
  function updateCounter() {
    counterEl.textContent = ORDER.length ? pad2(POS + 1) + " / " + pad2(ORDER.length) : "";
  }
  function next() {
    if (ORDER.length < 2) return;
    POS++;
    if (POS >= ORDER.length) { if (VIEW === "random" && !VIEWER) reshuffle(); POS = 0; }
    updateCounter();
    transitionTo(ORDER[POS], { slide: true, dir: 1 });
  }
  function prev() {
    if (ORDER.length < 2) return;
    POS--;
    if (POS < 0) POS = ORDER.length - 1;
    updateCounter();
    transitionTo(ORDER[POS], { slide: true, dir: -1 });
  }

  /* ── the grid ── */
  function buildGrid() {
    gridEl.textContent = "";
    dateOrder().forEach(function (idx, i) {
      var it = ITEMS[idx];
      var btn = document.createElement("button");
      btn.className = "tile";
      btn.type = "button";
      btn.setAttribute("aria-label", "Open: " + (it.captionText || "photograph"));

      var frame = document.createElement("div");
      frame.className = "tile-frame";
      var img = document.createElement("img");
      img.src = it.src;
      img.alt = it.captionText || "Photograph";
      // First screenful eagerly, everything below the fold on demand.
      img.setAttribute("loading", i < 6 ? "eager" : "lazy");
      img.decoding = "async";
      frame.appendChild(img);

      var cap = document.createElement("span");
      cap.className = "tile-cap";
      cap.textContent = it.captionText || "—";

      btn.appendChild(frame);
      btn.appendChild(cap);
      btn.addEventListener("click", function () { openViewer(i, btn); });
      gridEl.appendChild(btn);
    });
  }

  /* ── the full-screen viewer, opened from a grid tile ── */
  function openViewer(pos, tile) {
    lastTile = tile || null;
    VIEWER = true;
    document.body.classList.add("viewer-open");
    ORDER = dateOrder();                       // arrows move through in date order
    POS = pos;
    current = null; currentIdx = -1;
    stage.textContent = "";
    updateCounter();
    transitionTo(ORDER[POS], { slide: false });
    viewerClose.focus();
  }
  function closeViewer() {
    VIEWER = false;
    document.body.classList.remove("viewer-open");
    stage.textContent = "";
    current = null; currentIdx = -1;
    if (lastTile) { lastTile.focus(); lastTile = null; }
  }

  /* ── views ── */
  function setView(view, opts) {
    var force = opts && opts.force;
    var v = view === "grid" ? "grid" : "random";
    if (v === VIEW && !force) return;
    VIEW = v;

    if (VIEWER) closeViewer();

    document.body.classList.toggle("view-grid", VIEW === "grid");
    document.body.classList.toggle("view-carousel", VIEW === "random");
    viewBtns.forEach(function (b) {
      var on = b.dataset.view === VIEW;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });

    if (VIEW === "grid") {
      stopAuto();
      stage.textContent = "";
      current = null; currentIdx = -1;
      buildGrid();
      window.scrollTo(0, 0);
    } else {
      ORDER = shuffle(range(ITEMS.length));
      POS = 0;
      updateCounter();
      if (ORDER.length) transitionTo(ORDER[0], { slide: false });
      startAuto();
    }
  }

  /* ── autoplay (Random view only) ── */
  function startAuto() {
    stopAuto();
    if (CONFIG.autoMs > 0 && VIEW === "random" && !VIEWER && !isAboutOpen() && ORDER.length > 1) {
      autoTimer = setInterval(next, CONFIG.autoMs);
    }
  }
  function stopAuto() { clearInterval(autoTimer); autoTimer = null; }
  function bumpAuto() { startAuto(); }

  /* ── about panel ── */
  function isAboutOpen() { return aboutEl.classList.contains("is-open"); }
  function buildAbout() {
    var a = CONFIG.about || {};
    document.getElementById("aboutTitle").textContent = a.heading || "About";
    var body = document.getElementById("aboutBody");
    (a.body || []).forEach(function (t) {
      var p = document.createElement("p");
      p.textContent = String(t);
      body.appendChild(p);
    });
    var links = document.getElementById("aboutLinks");
    var added = 0;
    (a.links || []).forEach(function (l) {
      if (!l || !isSafeHref(l.href)) return;
      var el = document.createElement("a");
      el.href = l.href;
      el.textContent = String(l.label || l.href);
      if (l.href.slice(0, 7) !== "mailto:") {
        el.target = "_blank";
        el.rel = "noopener noreferrer";     // the new tab can't reach back into this page
      }
      links.appendChild(el);
      added++;
    });
    if (!added) links.remove();
  }
  function openAbout() {
    aboutEl.classList.add("is-open");
    aboutEl.setAttribute("aria-hidden", "false");
    stopAuto();
    aboutClose.focus();
  }
  function closeAbout() {
    aboutEl.classList.remove("is-open");
    aboutEl.setAttribute("aria-hidden", "true");
    startAuto();
    aboutBtn.focus();
  }

  /* ── discovery: manifest.json, else a server directory listing ── */
  function discover() {
    var dir = folderURL();
    return fetch(dir + "manifest.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (list) {
        if (Array.isArray(list)) {
          var imgs = list.filter(isSafeFile);
          if (imgs.length) return imgs;
        }
        return null;
      })
      .catch(function () { return null; })
      .then(function (found) {
        if (found) return found;
        // Local `python3 -m http.server` lists the folder; parse that instead.
        return fetch(dir, { cache: "no-store" })
          .then(function (r) { return r.ok ? r.text() : null; })
          .then(function (html) {
            if (!html) return null;
            var doc = new DOMParser().parseFromString(html, "text/html");
            var seen = {}, out = [];
            Array.prototype.forEach.call(doc.querySelectorAll("a[href]"), function (a) {
              var h = a.getAttribute("href") || "";
              var f;
              try { f = decodeURIComponent(h.split("?")[0].split("/").pop() || ""); }
              catch (_) { return; }
              if (isSafeFile(f) && !seen[f]) { seen[f] = 1; out.push(f); }
            });
            return out.length ? out : null;
          })
          .catch(function () { return null; });
      });
  }

  /* ── controls ── */
  document.getElementById("next").addEventListener("click", function () { next(); bumpAuto(); });
  document.getElementById("prev").addEventListener("click", function () { prev(); bumpAuto(); });

  viewBtns.forEach(function (b) {
    b.addEventListener("click", function () { location.hash = b.dataset.view; });
  });
  viewerClose.addEventListener("click", closeViewer);

  aboutBtn.addEventListener("click", openAbout);
  aboutClose.addEventListener("click", closeAbout);
  aboutEl.addEventListener("click", function (e) { if (e.target === aboutEl) closeAbout(); });

  window.addEventListener("keydown", function (e) {
    if (isAboutOpen()) { if (e.key === "Escape") closeAbout(); return; }
    if (VIEW === "grid" && !VIEWER) return;                 // grid scrolls normally
    if (e.key === "Escape" && VIEWER) { closeViewer(); return; }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { next(); bumpAuto(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { prev(); bumpAuto(); }
  });

  var tx = 0, ty = 0;
  stage.addEventListener("touchstart", function (e) {
    tx = e.changedTouches[0].clientX; ty = e.changedTouches[0].clientY;
  }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { (dx < 0 ? next : prev)(); bumpAuto(); }
  }, { passive: true });

  stage.addEventListener("mouseenter", stopAuto);
  stage.addEventListener("mouseleave", startAuto);

  /* The view lives in the URL. "#date" is kept working so any link you'd
     already shared from the previous version lands on the grid. */
  function viewFromHash() {
    var h = location.hash.replace("#", "").toLowerCase();
    if (h === "grid" || h === "date") return "grid";
    if (h === "random") return "random";
    return CONFIG.startView === "grid" ? "grid" : "random";
  }
  window.addEventListener("hashchange", function () { setView(viewFromHash()); });

  /* ── init ── */
  if (CONFIG.title) wordmarkEl.textContent = CONFIG.title;
  if (!CONFIG.grain) grainEl.style.display = "none";
  if (CONFIG.gridCrop) document.body.classList.add("grid-crop");
  buildAbout();

  discover().then(function (files) {
    if (!files || !files.length) {
      // Fail loudly. A silent stock-photo fallback would let a broken
      // manifest look like a working site.
      document.body.classList.add("is-empty");
      return;
    }
    ITEMS = files.map(itemFromFile);
    setView(viewFromHash(), { force: true });
  });
})();
