# StoreX — static frontend (no PHP / MySQL / Laravel)

Open `index.html`, or upload the whole folder to any static host (Netlify, GitHub Pages, cPanel, Vercel...).
Bootstrap, jQuery and Google Fonts load from CDNs, so an internet connection is needed.

## Structure
- Root `*.html` — public store: home, shop, categories (+4 category pages), vendors (+3 store pages), 24 product pages, cart, checkout, order-success, about, contact, login, register, forgot/reset password, 404
- `account/` — customer dashboard (overview, orders, order details, wishlist, addresses, profile)
- `vendor/` — vendor dashboard (overview, products, add product, orders, analytics, payouts, settings)
- `admin/` — admin panel (`admin/login.html`, overview, users, vendors, products, orders, categories, reports, settings)
- `css/`, `js/`, `images/`, `storage/` — original assets. `js/storex-static.js` replaces the Laravel backend; `js/storex-data.js` holds the catalog.

## Demo logins (kept in the browser's localStorage)
| Role | Email | Password | Opens |
|------|-------|----------|-------|
| Customer | john@example.com | password | account/index.html |
| Vendor | nova@storex.com | password | vendor/index.html |
| Admin | admin@storex.com | admin123 | admin/index.html |

Any other email creates a temporary customer account. Registration works (choose vendor or customer).

## What works
Add to cart / change quantity / remove, wishlist hearts, checkout -> order success, new orders appear in My Orders, admin vendor approve/reject, order-status selects, table search filters.
Cart, wishlist and orders are saved per account in localStorage. Everything else (profile, addresses, settings, add-product forms) shows a "demo" toast and stores nothing.

## Notes
- Vendor dashboards are static snapshots of Nova Labs data; the other two vendor accounts see the same dashboard.
- Image file names were matched case-insensitively (the seeders used different casing than the files), so images load on Linux hosts too.
