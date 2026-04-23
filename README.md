# Furniture Rental API

Express + Prisma + PostgreSQL backend for the furniture rental quote system.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env and fill in your DB credentials
cp .env.example .env

# 3. Run Prisma migrations
npx prisma migrate dev --name init

# 4. Generate Prisma client
npx prisma generate

# 5. Start dev server
npm run dev
```

Server runs at **http://localhost:4000**

---

## API Routes

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/categories | All categories with product counts |
| GET | /api/categories/:id | Single category with its products |
| POST | /api/categories | Create category |
| PATCH | /api/categories/:id | Update category |
| DELETE | /api/categories/:id | Delete (blocked if products exist) |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | Paginated list (?categoryId ?search ?page ?limit) |
| GET | /api/products/:id | Single product with variants |
| POST | /api/products | Create product |
| PATCH | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete product |

### Variants
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products/:productId/variants | All variants for a product |
| POST | /api/products/:productId/variants | Add variant |
| PATCH | /api/products/:productId/variants/:variantId | Update variant |
| DELETE | /api/products/:productId/variants/:variantId | Delete variant |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | All users |
| GET | /api/users/:id | User with their quote history |
| POST | /api/users | Create user |

### Quotes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/quotes | Paginated (?status ?page ?limit) |
| GET | /api/quotes/:id | Full quote with items |
| POST | /api/quotes | Submit quote (new or existing user) |
| PATCH | /api/quotes/:id/status | Update status (your team uses this) |
| DELETE | /api/quotes/:id | Delete PENDING quote only |

---

## Quote Status Flow
```
PENDING → REVIEWING → QUOTED → CONFIRMED → CLOSED
```

## Postman
Import `FurnitureRentalAPI.postman_collection.json` into Postman.
Collection variables auto-populate IDs as you run requests in order:
1. Create Category → sets `category_id`
2. Create Product → sets `product_id`
3. Add Variant → sets `variant_id`
4. Submit Quote → sets `quote_id`
