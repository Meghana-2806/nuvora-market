# 🛍️ Nuvora — E-Commerce Mini Platform

An Amazon-style online store built for the **Retail / E-commerce** database project.

| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| Frontend | Vanilla HTML / CSS / JS, Chart.js (no build step) |

## ✨ Features

- Product catalog with search, category and price filters, sorting and pagination
- Product detail view, discount badges, low-stock warnings
- **Shopping cart** — add, change quantity, remove items, apply coupons, and view shipping progress
- **Session management** — secure httpOnly cookies, automatic session expiry, and logout
- Register / Sign in (scrypt password hashing)
- **Checkout and order management** — atomic stock reservation and rollback to prevent overselling
- **Top-selling products leaderboard** with live rankings
- **Seller analytics dashboard** — sales by category and city, heatmap, 14-day trend, and KPIs
- Analytics results are cached briefly and refreshed when an order is placed
- Order history page

## 🚀 Run locally

### Requirements
- Node.js 18 or newer

### Setup
1. Open a terminal in the project root.
2. Install the server dependencies:
   ```bash
   cd server
   npm install
   ```
3. Copy `.env.example` to `.env` and adjust the local connection URLs only if needed.
4. Seed the sample catalog and analytics data (run once):
   ```bash
   npm run seed
   ```
5. Start the API and storefront:
   ```bash
   npm start
   ```
6. Open `http://localhost:3000`.

Demo login: **demo@nuvora.com / demo123**. Start the required local services before running the server. The client is plain HTML, CSS and JavaScript served by Express, so it does not need a separate install or build step.


## 🔌 REST API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products?q=&category=&min=&max=&sort=&page=` | Search / filter catalog |
| GET | `/api/products/categories` | Categories with counts |
| GET | `/api/products/:sku` | Product details |
| POST | `/api/auth/register` · `/login` · `/logout` · GET `/me` | Authentication and sessions |
| GET | `/api/cart` | Cart with totals |
| POST | `/api/cart` `{sku, qty}` | Add items to cart |
| PUT / DELETE | `/api/cart/:sku` | Set quantity / remove |
| POST | `/api/orders` | Checkout (needs login) |
| GET | `/api/orders` | My orders |
| GET | `/api/analytics/summary` · `/by-category` · `/by-city` · `/category-city` · `/trend` | Aggregations |
| GET | `/api/analytics/leaderboard?limit=10` | Top-selling products |
| GET | `/api/health` | Service status |

Coupons: `SAVE10` (10% off), `WELCOME100` (₹100 off ≥ ₹999), `FREESHIP`.

## 📁 Structure
```
nuvora-market/
├── client/                    # Frontend (static, served by Express)
│   ├── index.html, orders.html, dashboard.html
│   ├── css/style.css
│   └── js/ common.js, store.js, dashboard.js
├── server/                    # Backend API
│   ├── src/
│   │   ├── server.js          # Express app
│   │   ├── config.js, db.js, keys.js
│   │   ├── middleware/session.js   # Session middleware
│   │   ├── routes/ auth, products, cart, orders, analytics
│   │   └── utils/ pricing, password, asyncRoutes
│   ├── scripts/ seed.js, catalog.js
│   ├── package.json, .env.example
├── package.json               # shortcut scripts
└── README.md
```



- **Data storage design:** business records, temporary cart/session state, and real-time rankings are managed efficiently for their different needs.
- **Why this cart structure?** Each user has a separate cart, and item quantities can be updated efficiently.
- **How are top-selling products ranked?** Product sales are tracked and rankings are refreshed as orders are placed.
- **How is overselling prevented?** `updateOne({sku, stock: {$gte: qty}}, {$inc: {stock: -qty}})` is atomic per document; failures roll back earlier reservations.
- **Why embed items in orders?** Order history must keep the price at purchase time, and analytics can `$unwind` without joins.
- **How does the session expire?** `EXPIRE` is refreshed on every request (sliding window, default 2 h).


## ✨ Nuvora 2.0 UI refresh

The storefront uses a cohesive **deep teal + coral + sage** visual system with a more professional, editorial feel. The refresh includes:
- A cleaner, editorial-style campaign hero and updated store branding.
- Better hierarchy, whitespace, borders, shadows, and consistent rounded controls.
- Clearer category/price filter labels, calmer bestseller cards, and more readable product cards.
- Updated analytics chart colors to match the storefront.
- Improved keyboard focus visibility and reduced-motion support.
- Responsive layouts tuned for mobile, tablet, and desktop.
- More consistent styling for the cart drawer, dialogs, order history, analytics cards, tables, and notifications.

The UI is still plain HTML/CSS/JavaScript and does not require a frontend build step. Existing API routes and application functionality are retained.


## Nuvora authentication and admin access



## Separate role dashboards and data protection

- Customers land on `/customer-dashboard.html`, which shows only their own profile and order history.
- Administrators land on `/dashboard.html`, which shows business-wide analytics.
- The server checks the session role before serving either private dashboard or the customer orders page.
- Customer order endpoints require the `customer` role and scope every query to the authenticated user's account ID.
- Analytics endpoints require the `admin` role (except the public product leaderboard).
- Product catalog browsing remains public; private account/order data is not exposed by the catalog endpoints.
