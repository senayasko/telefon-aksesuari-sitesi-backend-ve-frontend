# vitrin

A phone accessories store built for a university e-commerce project. The frontend uses HTML, CSS and JavaScript; the backend uses Node.js and Express.

[Live site](https://telefon-aksesuari-sitesi-backend-ve.vercel.app/)

## Run locally

Install Node.js, then run:

```sh
npm install
npm start
```

The server uses port 3000 by default. Set `PORT` to use a different port.

- Store: http://localhost:3000
- Order tracking: http://localhost:3000/takip
- Admin panel: http://localhost:3000/admin

## Features

- Product catalog with search, filters and variants
- Cart, coupons and a buy-three-pay-for-two offer
- Checkout with bank transfer, cash on delivery and simulated card payment
- User accounts, reviews and stock notifications
- Order tracking and an admin panel for orders and stock

The storefront is in Turkish. Card payments are a demo; they do not process real payments.

## Project layout

- `server.js`: API and page routes
- `lib/storage.js`: PostgreSQL transactions and local JSON storage
- `public/`: pages, styles, scripts and images
- `data/`: products, orders, users, reviews and coupons

Set `DATABASE_URL` to use PostgreSQL (Neon on Vercel). The app creates its storage table and imports the files in `data/` once. Existing database records are preserved on later deployments. Related writes, such as an order and its stock changes, commit together.

Without `DATABASE_URL` or `POSTGRES_URL`, local development uses JSON files. Keep database credentials in environment variables, outside Git. This is a coursework demo.

Run the tests with `node --test test/*.test.js`.

## Admin email verification

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `GMAIL_APP_PASSWORD` in the server's private environment variables. The Gmail account must have two-step verification and a dedicated app password. Never commit these values or use the Gmail account password.

Admin login requires a password followed by a six-digit email code. Codes expire after five minutes and can be used once. Password attempts, code attempts and email sends are limited. Admin access stays disabled when email configuration is missing or delivery fails. The database account is updated only after successful email verification.
