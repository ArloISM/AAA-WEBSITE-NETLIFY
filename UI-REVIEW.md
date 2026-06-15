# UI-REVIEW.md — aaaccess.com.au (v9)

**Site:** All Angles Access — Film-First Access Solutions  
**URL:** https://aaaccess.com.au  
**Version:** aaa-site_9  
**Date:** 2026-06-15  
**Standard:** 6-pillar abstract audit (no UI-SPEC baseline)  
**Auditor:** GSD UI Auditor — inline pass (subagent connection failed)

---

## Score Summary

| Pillar | Score | Verdict |
|--------|-------|---------|
| 1. Copywriting | 3/4 | Good — Gmail address and repetitive alt text hold it back |
| 2. Visuals | 3/4 | Good — no srcset on GIFs, lightbox alt empty |
| 3. Color | 3/4 | Good — muted `--a` token fails WCAG AA contrast |
| 4. Typography | 4/4 | Excellent — Manrope variable, clamp scaling, 1.6 line-height |
| 5. Spacing | 4/4 | Excellent — consistent 8px-multiple scale, responsive |
| 6. Experience Design | 3/4 | Good — no lazy on GIFs, lightbox alt not set dynamically |

**Overall: 20/24**

---

## Pillar 1: Copywriting — 3/4

### PASS — Hero headline
`index.html:451` — "Every Frame. Every Angle. Every Time." Three staccato lines, strong weight contrast (bold / light / red), cinematic cadence. Instantly communicates brand character.

### PASS — Value proposition
`index.html:452` — Tagline is specific: *"Australia's specialist provider of telehandler attachments, rigging and access equipment for film and television. Dry hire or fully manned."* Covers who, what, where, and how in two sentences.

### PASS — CTAs
Dual hero CTA (`View Equipment →` + `Get a Quote`) covers browse and convert intent. CTA band (`Start an Enquiry →` + phone) reinforces both action modes. Specific, imperative, well-placed.

### WARN — Gallery alt text is generic/duplicated
`index.html:567–574` — Eight gallery images share only three distinct descriptions:
- "Merlo Telehandler with AlphaTruss" (×2)
- "Telehandler with AlphaTruss" (×2)
- "Magni Telehandler with AlphaTruss" (×2)
- "Manitou Telehandler with AlphaTruss" (×2)

Screen readers read identical descriptions for different images. Alt text should describe the specific scene, angle, or production context.

**Fix:** Update each `alt` to describe the specific shot — e.g. *"Merlo telehandler lifting an AlphaTruss frame on an outdoor film set at golden hour"*, *"Romastor 3D head rigged to Manitou MRT boom at stage height"*.

### FAIL — Business email is Gmail
`index.html:585, 635` — `allanglesaccess@gmail.com` is used as the primary contact email in both the CTA and footer. For a B2B film-industry supplier charging professional rates, Gmail undermines trust.

**Fix:** Register and use `info@aaaccess.com.au` or `hello@aaaccess.com.au`.

---

## Pillar 2: Visuals — 3/4

### PASS — All attachment GIFs have descriptive alt text
`index.html:471–492` — All six attachment card images have meaningful alt: *"Romastor 360 continuous pan"*, *"Romastor Pan and Tilt"*, *"Romastor 3D dual axis"*, *"Rotator vertical"*, *"Magni panning head"*, *"Alpha Truss"*. ✅

### PASS — Fleet images: lazy load + async decode
`index.html:507–511` — All five fleet card images have `loading="lazy"` and `decoding="async"`. ✅

### PASS — Brand logos: all have alt text and lazy load
`index.html:536` — Manitou, Magni, Merlo, Romastor, Atlas Copco, Scania, Hino, Hyundai — all have descriptive alt and `loading="lazy"`. ✅

### WARN — No srcset on any images (GIFs or PNGs)
`index.html:471–511` — All images are served as single-size Wixstatic URLs (e.g. `w_640,h_480` for GIFs, `w_720,h_540` for fleet). No `srcset` or `sizes` attributes. Mobile users download the same file as desktop users.

**Fix (GIFs):** Wixstatic supports width params — serve smaller on mobile with:
```html
<img 
  src="...w_640,h_480,q_80,enc_auto/file.gif"
  srcset="...w_320,h_240,q_80,enc_auto/file.gif 320w,
          ...w_640,h_480,q_80,enc_auto/file.gif 640w"
  sizes="(max-width:680px) 90vw, 360px"
  alt="Romastor 360 continuous pan"
/>
```

### WARN — Lightbox img has empty alt
`index.html:596` — `<img id="glb-img" src="" alt="" />` — when the lightbox opens, the `alt` attribute is never updated. Screen reader users opening a gallery image get no description.

**Fix:** In the lightbox open JS, set `glb-img.alt` to the caption string from the gallery item.

---

## Pillar 3: Color — 3/4

### PASS — Brand palette is cohesive and cinematic
CSS variables `--c:#0a0908` (near-black), `--s:#EA1F27` (signature red), `--p:#f5f1ea` (warm cream). Three-token palette is consistent across both pages, never strays. Selection highlight in brand red is a nice touch.

### PASS — Primary text contrast
`--p:#f5f1ea` on `--c:#0a0908` background — estimated contrast ratio ~17:1. Well above WCAG AA 4.5:1. ✅

### PASS — Dim text contrast
`--pd:#cfc9bf` on `--c:#0a0908` — estimated ratio ~8.5:1. Passes WCAG AA for normal and large text. ✅

### FAIL — Muted text `--a` fails WCAG AA
`--a:#8a857d` is used for stat captions (`index.html:528–531`), fleet hint, gallery hint, footer body copy, and footer links. On `--c:#0a0908` background, estimated contrast ratio ~3.5:1 — below the WCAG AA minimum of 4.5:1 for normal-weight small text.

**Fix:** Lighten `--a` to `#9e9992` minimum (≈4.6:1) or use `--pd` for any text that must pass AA. Footer body copy and stat labels are particularly exposed.

### PASS — CTA color
`--s:#EA1F27` red CTAs with white text — red-on-white is approximately 4.0:1 (borderline AA for large/bold text). The `.btn-primary` uses `font-weight:600` and `font-size:.92rem` which qualifies as large text — passes. ✅

---

## Pillar 4: Typography — 4/4

### PASS — Single family, variable weights
`index.html:43` — Manrope loaded at weights 200–800 in a single request. Variable font used expressively: 200 (`.light` spans), 300 (body), 500–600 (labels, CTAs), 700 (headings), 800 (stat numbers). Full typographic spectrum from one face.

### PASS — Responsive heading scale
`index.html:165, 216, 343` — Hero h1 `clamp(2.6rem, 7.5vw, 5.6rem)`, section h2 `clamp(2rem, 5vw, 3.4rem)`, CTA h2 `clamp(2.2rem, 6vw, 4.4rem)`. Fluid scaling without breakpoint jumps. ✅

### PASS — Line height and measure
`index.html:69` — `line-height:1.6` on body. Taglines and body paragraphs capped at `max-width:46ch` — within the 45–75ch readable range. About statement `max-width:20ch` suits the large display weight. ✅

### PASS — Negative letter-spacing on headings
`letter-spacing:-0.035em` on headings creates tight optical kerning appropriate for display sizes. Combined with `font-weight:700` Manrope, headings have premium editorial feel. ✅

---

## Pillar 5: Spacing — 4/4

### PASS — Consistent section padding
`index.html:207` — `.pad { padding:130px 0; }` used across all major sections. Mobile overrides to `60px 0` at 680px. Consistent rhythm, not section-by-section ad-hoc values. ✅

### PASS — 8px-multiple gap scale
Cards use `gap:20px`, grid gutters `20px`, fleet `26px`, footer `48px`. Mostly multiples of 4/8px. Component internal padding `26–46px`. No wild one-off values. ✅

### PASS — Wrap container
`.wrap { max-width:1180px; margin:0 auto; padding:0 28px; }` — applied consistently. Single container width, never mixed with other max-widths. Mobile narrows padding to `20px`. ✅

### PASS — Card internal spacing
Attachment card `.attach-body { padding:26px 28px 30px; }` — comfortable reading space. Service cards `padding:46px 42px` — generous. Fleet card `padding:0 30px 38px`. ✅

---

## Pillar 6: Experience Design — 3/4

### PASS — Skip link implemented
`index.html:414` — `<a href="#main-content" class="sr-only">Skip to main content</a>` — visually hidden, becomes visible on focus with red background. ✅

### PASS — Hamburger aria-expanded
`index.html:444` — SVG icon hamburger with `aria-label="Open navigation menu"`, `aria-expanded="false"`, toggles label to "Close navigation menu" on open. Mobile nav is a proper slide-in panel with backdrop dim. ✅

### PASS — Keyboard focus states
`index.html:81–85` — `:focus-visible { outline: 2px solid var(--s); outline-offset: 3px; }` — red outline matches brand, visible but not garish. ✅

### PASS — prefers-reduced-motion
`index.html:74–80` — Global `animation-duration: 0.01ms` for reduced-motion preference. Hero slow-zoom, reveal fadeUp, brand marquee scroll all disabled. ✅

### WARN — Attachment GIFs not lazy-loaded
`index.html:471–492` — The six attachment GIFs have no `loading="lazy"` attribute. On page load, all six GIFs (each ~200–600KB at w_640) start downloading immediately, even though three of them are below the fold on most screens.

**Fix:** Add `loading="lazy"` to attachment card images 03–06 (Romastor 3D, Rotator, Magni Panning, Alpha Truss). Keep 01 and 02 eager (above fold).

### WARN — Lightbox keyboard trap incomplete
`index.html:592–600` — The lightbox (`glb`) has prev/next/close buttons with `aria-label`. However: no `Escape` key handler is visible in the HTML. Check the JS for `keydown` → Escape → close handler; if absent, keyboard users cannot dismiss the lightbox without clicking the close button.

**Fix:**
```js
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && glb.classList.contains('open')) closeGlb();
  if (e.key === 'ArrowRight' && glb.classList.contains('open')) nextImg();
  if (e.key === 'ArrowLeft' && glb.classList.contains('open')) prevImg();
});
```

### WARN — No contact form (mailto only)
`index.html:585` — "Start an Enquiry →" is a `mailto:` link, not a form. Users must compose email in their mail client. No confirmation, no validation, no tracking. High drop-off risk on mobile where mail client handoff is disruptive.

**Fix:** Replace with a Netlify Form (already integrated via `netlify-identity-widget`):
```html
<form name="enquiry" method="POST" data-netlify="true">
  <label for="name">Your name</label>
  <input type="text" id="name" name="name" required />
  <label for="email">Email</label>
  <input type="email" id="email" name="email" required />
  <label for="message">Message</label>
  <textarea id="message" name="message" required></textarea>
  <button type="submit">Send Enquiry</button>
</form>
```

---

## Top 5 Priority Fixes

| Priority | Issue | File | Effort |
|----------|-------|------|--------|
| P1 | Replace Gmail with branded email `info@aaaccess.com.au` | index.html:585, 635 + JSON-LD:28 | Low |
| P2 | Fix `--a:#8a857d` contrast — lighten to `#9e9992` | index.html:55 + equipment.html:32 | Low |
| P3 | Populate lightbox `<img alt="">` dynamically from caption on open | index.html:596 + JS | Low |
| P4 | Add `loading="lazy"` to attachment GIFs 03–06 (below-fold) | index.html:479–492 | Low |
| P5 | Add Escape/Arrow key handlers to gallery lightbox | index.html JS | Low |

**Bonus (medium effort):**
- Replace mailto CTA with a Netlify Form for enquiry tracking and mobile UX
- Enrich gallery alt text with specific scene descriptions
- Add srcset to GIF attachment images for mobile bandwidth savings

---

*Audited against 6-pillar UI standards · WCAG 2.1 AA · 2026-06-15*
