# Trendings — Men's Storefront

Premium menswear e-commerce storefront — shirts, t-shirts, and wide leg denim.

## 🚀 Live Site

**Deploy on Vercel:**

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **"New Project"** → Import your GitHub repo
4. Settings:
   - **Framework Preset:** Other
   - **Build Command:** _(leave empty)_
   - **Output Directory:** `./`
5. Click **Deploy** — Done! ✅

## 📁 Project Structure

```
├── index.html        # Homepage (hero, sections, products)
├── shop.html         # Shop All page (filter, sort, grid)
├── product.html      # Product details page
├── style.css         # Global styles
├── shop.css          # Shop + product page styles
├── script.js         # Global JS (cart, quick add, nav)
├── vercel.json       # Vercel deployment config
└── README.md
```

## ✨ Features

- **Zara-style hero** — Shop All / Shirts / Denim buttons
- **Product cards** — Click → product details, "+" → quick add popup
- **Cart drawer** — Slide-in cart with size + quantity
- **Quick add popup** — Size select + add to bag from any page
- **Product details** — Image zoom, gallery, accordions, Add to Bag + Buy Now
- **"You May Also Like"** — Horizontal slider with arrows
- **Shop page** — Filter tabs + sort dropdown
- **Fully responsive** — Mobile, tablet, desktop
- **Prices in BDT (৳)** — Bangladeshi Taka

## 🛠️ Tech Stack

- HTML5
- CSS3 (custom properties, grid, flexbox)
- Vanilla JavaScript (no frameworks)
- Google Fonts (Inter + Playfair Display)

## 📱 Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero, sections, product previews |
| Shop | `/shop` | All products with filter/sort |
| Shop (Shirts) | `/shop?cat=shirts` | Filtered shirts |
| Shop (T-Shirts) | `/shop?cat=tshirts` | Filtered t-shirts |
| Shop (Denim) | `/shop?cat=denim` | Filtered denim |
| Product | `/product?slug=product-name` | Product details |

## 💰 Products

| Category | Count | Price Range |
|----------|-------|-------------|
| Shirts | 4 | ৳1,695 – ৳2,195 |
| T-Shirts | 4 | ৳995 – ৳1,295 |
| Wide Leg Denim | 4 | ৳2,395 – ৳2,695 |