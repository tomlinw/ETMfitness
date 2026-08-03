# Ironforge — Shopify fitness gear store

A complete Online Store 2.0 Shopify theme for a fitness equipment brand, plus a seed
product catalog. Dark, high-contrast, built around a volt accent; every page a
storefront needs is templated.

Passes `shopify theme check` with the **`theme-check:all`** ruleset — zero errors,
zero warnings.

---

## What's here

```
assets/          base.css (design system) + theme.js (no dependencies)
config/          theme settings schema and defaults
data/            products.csv — 15 products / 44 variants, ready to import
layout/          theme.liquid, password.liquid
locales/         en.default.json
sections/        27 sections, incl. 12 with presets for the theme editor
snippets/        product card, price, cart items, facets, icons, meta tags
templates/       every storefront template as JSON, plus customer accounts
```

### Storefront features

| Area | What's implemented |
|---|---|
| Cart | AJAX cart drawer via the Section Rendering API, free-shipping progress bar, order notes, line-item discounts, optional cart-page mode |
| Product | Variant picker with live price/SKU/inventory updates, unavailable-combination greying, quantity stepper, dynamic checkout buttons, collapsible spec rows, JSON-LD |
| Collection | Storefront filters (list, boolean, price range), sorting, pagination, active-filter chips |
| Search | Predictive search with debounced fetch, plus a full results page across products, articles and pages |
| Home | Hero (image or video), value props, featured collections, category grid, marquee, story block, testimonials, newsletter |
| Also | Blog + article with comments, contact form, 404, password page, gift card, and the six customer-account templates |

Accessibility and performance are wired in: skip link, focus-visible rings, `aria-*`
on all interactive controls, `prefers-reduced-motion` support, responsive `srcset`,
eager/lazy image split above and below the fold.

---

## Deploying it

You need a Shopify account — the theme is the storefront, not the store itself.

**1. Create the store** at [shopify.com](https://www.shopify.com) (the trial is enough
to see everything working).

**2. Install the CLI and push the theme:**

```bash
npm install -g @shopify/cli @shopify/theme

# Preview against your store with hot reload
shopify theme dev --store your-store.myshopify.com

# Push as an unpublished theme you can preview in admin
shopify theme push --unpublished --theme "Ironforge"
```

**3. Import the catalog.** In admin go to **Products → Import**, upload
`data/products.csv`, and tick *Publish new products*. The CSV has no image URLs —
Shopify will import cleanly and the theme falls back to placeholder graphics until
you add photos under each product.

**4. Create the collections.** Products are tagged so these can all be *automated*
collections (**Products → Collections → Create → Automated**, condition
`Product tag is equal to …`):

| Collection | Handle | Tag condition |
|---|---|---|
| Strength | `strength` | tag = `strength` |
| Conditioning | `conditioning` | tag = `conditioning` |
| Recovery | `recovery` | tag = `recovery` |
| Accessories | `accessories` | tag = `accessories` |
| Apparel | `apparel` | tag = `apparel` |
| Best sellers | `best-sellers` | tag = `best-seller` |
| New arrivals | `new-arrivals` | tag = `new-arrival` |

**5. Build the navigation** (**Content → Menus**). The header expects a menu with the
handle `main-menu` and the footer expects `footer`. A sensible main menu:

- Strength → `/collections/strength`
- Conditioning → `/collections/conditioning`
- Recovery → `/collections/recovery`
- Apparel → `/collections/apparel`
- Sale → `/collections/all`

**6. Turn on storefront filters.** Install Shopify's free **Search & Discovery** app
and add filters for Price, Product type, Vendor and Availability — the collection and
search templates render whatever you enable there.

**7. Point the homepage sections at real collections.** Open the theme editor and set
the collection on each *Featured collection* and *Collection list* block. Everything
else in `templates/index.json` is pre-filled.

---

## Customising

Nearly all visual choices live in **theme settings** (theme editor → Settings), so you
shouldn't need to touch CSS to rebrand:

- **Colors** — background, surface, text, accent, accent-contrast, sale. The accent
  drives buttons, badges, focus rings, the shipping bar and every hover state.
- **Typography** — heading and body font pickers, a heading size scale, uppercase toggle.
- **Layout** — page width and a global corner radius.
- **Product cards** — image ratio, hover second image, vendor, rating, quick add.
- **Cart** — drawer or page, order notes, free-shipping threshold.

Under the hood everything reads from CSS custom properties defined in
`layout/theme.liquid`, so a settings change cascades through `assets/base.css`
without a rebuild.

### Local development

```bash
shopify theme check          # lint (config in .theme-check.yml)
shopify theme dev            # local preview with hot reload
```

There is no build step. `base.css` and `theme.js` are served as-is.

---

## Notes and gaps

- **Product photography is not included.** The CSV imports without images by design —
  substitute your own, or the theme will render Shopify's placeholder SVGs.
- **Prices and copy are placeholders** written to look plausible for a fitness brand.
  Review them before you sell anything.
- **Product ratings** on cards and the product page read the
  `reviews.rating` metafield, which is written by review apps such as Shopify Product
  Reviews or Judge.me. With no review app installed the rating block simply doesn't render.
- **Related products** use the collection fallback when the Recommendations API hasn't
  populated; wire up `/recommendations/products` if you want ML-driven picks.
- Payments, shipping rates and taxes are store configuration, not theme code — set
  those up in admin.
