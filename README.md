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

- `server.js`: API, page routes and JSON storage
- `public/`: pages, styles, scripts and images
- `data/`: products, orders, users, reviews and coupons

Data is stored in local JSON files. Hosted writes need a persistent database or storage service. This is a coursework demo.
