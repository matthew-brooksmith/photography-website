/* ══════════════════════════════════════════════════════════════════════
   CONFIG — this is the file you edit. Nothing else needs touching.
   ──────────────────────────────────────────────────────────────────────
   TWO VIEWS
   • Gallery — one photograph at a time, shuffled, auto-advancing.
   • Grid    — every photograph as an edge-to-edge thumbnail, ordered by
               date (no caption shown on the tile itself). Clicking one
               opens it full-screen, where the arrows move through in date
               order and Escape takes you back.
   The view lives in the URL: /#gallery and /#grid, so either can be linked.
   (/#random still works too, for any link shared from an earlier version.)

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

  startView: "gallery",       // which view a bare URL opens in: "gallery" or "grid"
  autoMs:    20000,           // Gallery view: auto-advance after 20s (0 turns it off)
  dateOrder: "asc",           // Grid order: "asc" = oldest→newest, "desc" = newest→oldest
  gridCrop:  true,            // Grid tiles sit edge-to-edge with no gap or caption
                              // either way. true  = photo fills its square, cropped
                              //                      to fit (a tight mosaic)
                              //             false = whole photo inside its square,
                              //                      letterboxed, not cropped
  grain:     true,            // faint paper texture over the background

  about: {
    heading: "About",
    // One paragraph per string. Rewrite these in your own words.
    body: [
      "I am a student who has taken great inspiration from their grandfather to shoot on film.",
      "I dislike social media, so I am using this website as a personal archive and a point of contact for those who are interested in my style and may wish to work on a project together."
    ],
    // Only http(s) and mailto links are accepted; anything else is dropped.
    links: [
      { label: "Email", href: "mailto:mattbrooksphotography@outlook.com" }
      // Add or remove freely. Delete a line you don't want.
    ]
  },

  meta: {   // optional per-file caption overrides, keyed by EXACT filename
    // "2025-08-12.jpg": { caption: "A custom caption" },
  },
};
