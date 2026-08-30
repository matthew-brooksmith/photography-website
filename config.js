/* ══════════════════════════════════════════════════════════════════════
   CONFIG — this is the file you edit. Nothing else needs touching.
   ──────────────────────────────────────────────────────────────────────
   TWO VIEWS
   • Random — one photograph at a time, shuffled, auto-advancing.
   • Grid   — every photograph as a thumbnail, ordered by date. Clicking one
              opens it full-screen, where the arrows move through in date
              order and Escape takes you back.
   The view lives in the URL: /#random and /#grid, so either can be linked.

   ADDING PHOTOS
   • Drop them in the folder below.
   • Name each file by its date so it can be ordered, e.g.  2025-08-12.jpg
     Optionally add a description after the date — it becomes the caption:
        2025-08-12.jpg                          → "12 August 2025"
        2025-08-12 Low tide at first light.jpg  → "12 August 2025 · Low tide at first light"
        2025-08-12_misty_harbour.jpg            → "12 August 2025 · misty harbour"
   • Dates are YYYY-MM-DD and are validated. An impossible date (month 13,
     day 32 …) is ignored rather than silently rolling into the next month —
     the photo still shows, it just has no date on it. Undated photos sort to
     the end of the grid.
   • Serve over HTTP, not file:// — see README.md.

   Everything here is your own text, and it's inserted as text rather than
   markup, so nothing you type can turn into code on the page.
   ══════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  title:     "Matt Brooks",   // wordmark, top-left. "" to hide.
  folder:    "images/",       // where your photos live

  startView: "random",        // which view a bare URL opens in: "random" or "grid"
  autoMs:    20000,           // Random view: auto-advance after 20s (0 turns it off)
  dateOrder: "asc",           // Grid order: "asc" = oldest→newest, "desc" = newest→oldest
  gridCrop:  false,           // false = whole photo inside a square cell (no crop)
                              // true  = photo fills the square, cropped to fit
  grain:     true,            // faint paper texture over the background

  about: {
    heading: "About",
    // One paragraph per string. Rewrite these in your own words.
    body: [
      "I photograph quiet places — coastline, weather, the hour either side of dawn. Most of this is made close to home, on foot, usually alone.",
      "Prints of anything here are available. If you'd like one, or you're after work for a commission, get in touch."
    ],
    // Only http(s) and mailto links are accepted; anything else is dropped.
    links: [
      { label: "Email", href: "mailto:mmattssmith@outlook.com" }
      // Add or remove freely. Delete a line you don't want.
    ]
  },

  meta: {   // optional per-file caption overrides, keyed by EXACT filename
    // "2025-08-12.jpg": { caption: "A custom caption" },
  },
};
