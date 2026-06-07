# AAA Website — CMS Setup & Usage Guide

Your site uses **Decap CMS** (the open-source successor to Netlify CMS) with **Netlify Identity** for login. Once set up, you edit all content at `yoursite.netlify.app/admin` — no code required.

---

## What's editable (and where the data lives)

| CMS Section | Edits this file | Drives these pages |
|-------------|-----------------|--------------------|
| **Homepage** | `content/home.json` | Homepage hero, about text, contact details |
| **All Equipment** | `content/equipment.json` | All Equipment page + every item detail page |
| **Image Gallery** | `content/gallery.json` | Item-page bundled galleries (matched by tags) |

Every page reads its content from these JSON files at load time, so any save in the CMS appears on the live site after Netlify rebuilds (usually 30–60 seconds).

---

## One-time setup on Netlify

1. **Deploy the site.** Connect the project folder to a GitHub repo, then link that repo to Netlify (New site from Git). The branch must be `main` (matches `admin/config.yml`).

2. **Enable Identity.** In Netlify: **Site configuration → Identity → Enable Identity.**

3. **Enable Git Gateway.** In Netlify: **Identity → Services → Git Gateway → Enable.** This lets the CMS save changes back to GitHub on your behalf.

4. **Set registration to invite-only** (recommended). **Identity → Registration → Invite only.**

5. **Invite yourself.** **Identity → Invite users →** enter your email. Open the email, click the link, set a password.

6. **Log in to the CMS.** Go to `yoursite.netlify.app/admin` and sign in.

---

## Editing content

### Homepage
Edit the hero headline/tagline, the About statement and paragraph, and contact details (email, phone, location). The contact email and phone automatically update every button and link across the homepage.

**Formatting tip:** in the Hero Heading, wrap words in `<span class="light">...</span>` for grey or `<span class="red">...</span>` for red. In the About Statement, `<em>...</em>` shows red and `<span class="dim">...</span>` shows muted grey.

### All Equipment
Add or edit any attachment, telehandler, plant item, vehicle or service. Each item has:
- **Name, Category, Brand, Spec label, descriptions**
- **Image / GIF** — leave blank for an "AAA" placeholder tile
- **Detailed Specifications** — label + value rows shown in the item-page spec table
- **Media (slideshow)** — extra images, videos (YouTube/Vimeo/MP4) or PDF spec sheets shown in the item-page slideshow
- **Tags** — the key to bundling (see below)
- **Page Slug** — the item's detail-page URL; leave blank to auto-generate from the name
- **Display Order** — controls ordering within its category

### Image Gallery
Add on-set and field photos. Each gets a **title**, the **image**, **tags**, and a **display order**.

---

## How tags & bundling work

Tags connect everything. When you tag the **Magni Panning Head**, the **Magni telehandlers**, and any **gallery photo featuring a Magni machine** all with `magni`:

- The **All Equipment** page brand filter for *Magni* shows all of them together
- Each item's **detail page** automatically pulls in related equipment and gallery images that share its tags

So to bundle a brand's gear, give every related item, machine and photo the same brand tag (e.g. `magni`, `manitou`). Add capability tags too (`panning`, `tilt`, `6t`, `rigging`) for finer grouping and search.

---

## Testing the CMS locally (optional, advanced)

Decap can run against a local proxy without Netlify:

```bash
npx netlify-cms-proxy-server   # in the site folder
```

Then temporarily add `local_backend: true` to the top of `admin/config.yml` and serve the site locally. Remove that line before deploying.

---

## Files reference

```
index.html              Homepage (reads content/home.json)
equipment.html          All Equipment page (reads content/equipment.json + gallery.json)
item.html               Dynamic item detail page (reads both JSON files via ?id=slug)
admin/index.html        CMS editor + Identity login
admin/config.yml        CMS configuration (collections & fields)
content/home.json       Homepage text
content/equipment.json  Full equipment catalogue
content/gallery.json    Gallery images
images/brands/          Brand logos
netlify.toml            Netlify build/deploy config
```
