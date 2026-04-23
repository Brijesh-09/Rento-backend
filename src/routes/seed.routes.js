const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { ok, serverError } = require("../lib/response");

const router = Router();

const SEED_DATA = {
  categories: [
    {
      name: "Seating",
      products: [
        {
          name: "Chair",
          description: "Standard banquet/event chair suitable for all occasions",
          basePrice: 80,
          variants: [
            { color: "Black",  dimensions: "45x45x90 cm", stock: 200 },
            { color: "White",  dimensions: "45x45x90 cm", stock: 150 },
            { color: "Golden", dimensions: "45x45x90 cm", stock: 100 },
          ],
        },
        {
          name: "Bar Stool",
          description: "High bar stool for cocktail tables and bar counters",
          basePrice: 120,
          variants: [
            { color: "Black",  dimensions: "40x40x75 cm", stock: 80 },
            { color: "Chrome", dimensions: "40x40x75 cm", stock: 60 },
          ],
        },
        {
          name: "Sofa",
          description: "Premium 3-seater sofa for lounge and VIP areas",
          basePrice: 800,
          variants: [
            { color: "White",  dimensions: "200x85x90 cm", stock: 20 },
            { color: "Black",  dimensions: "200x85x90 cm", stock: 15 },
            { color: "Beige",  dimensions: "200x85x90 cm", stock: 10 },
          ],
        },
      ],
    },
    {
      name: "Tables",
      products: [
        {
          name: "Discussion Table",
          description: "Round discussion table ideal for small group meetings",
          basePrice: 300,
          variants: [
            { color: "White",  dimensions: "120x75 cm (D x H)", stock: 40 },
            { color: "Wooden", dimensions: "120x75 cm (D x H)", stock: 30 },
          ],
        },
        {
          name: "Coffee Table",
          description: "Low coffee table for lounge and waiting areas",
          basePrice: 200,
          variants: [
            { color: "White",  dimensions: "90x90x45 cm", stock: 35 },
            { color: "Black",  dimensions: "90x90x45 cm", stock: 25 },
            { color: "Wooden", dimensions: "90x90x45 cm", stock: 20 },
          ],
        },
        {
          name: "Dining Table",
          description: "Rectangular dining table seats 6-8 guests",
          basePrice: 600,
          variants: [
            { color: "White",  dimensions: "180x90x75 cm", stock: 25 },
            { color: "Wooden", dimensions: "180x90x75 cm", stock: 20 },
          ],
        },
        {
          name: "Conference Table",
          description: "Large oval conference table for board meetings and seminars",
          basePrice: 1200,
          variants: [
            { color: "Black",  dimensions: "300x120x75 cm", stock: 10 },
            { color: "Wooden", dimensions: "300x120x75 cm", stock: 8  },
          ],
        },
        {
          name: "Conference + Dining Table",
          description: "Convertible table suitable for both conference and dining setups",
          basePrice: 900,
          variants: [
            { color: "White",  dimensions: "240x100x75 cm", stock: 12 },
            { color: "Wooden", dimensions: "240x100x75 cm", stock: 10 },
          ],
        },
        {
          name: "Coffee + Discussion Table Set",
          description: "Bundled set — one discussion table with two matching coffee tables",
          basePrice: 450,
          variants: [
            { color: "White",  dimensions: "Set (see individual)", stock: 15 },
            { color: "Wooden", dimensions: "Set (see individual)", stock: 10 },
          ],
        },
      ],
    },
    {
      name: "Storage & Cooling",
      products: [
        {
          name: "Cold Storage Unit",
          description: "Commercial cold storage for beverages and perishables at events",
          basePrice: 2500,
          variants: [
            { color: "Silver", dimensions: "120x80x200 cm", stock: 5 },
            { color: "White",  dimensions: "90x70x180 cm",  stock: 4 },
          ],
        },
        {
          name: "Cooler and Fan",
          description: "Industrial air cooler with fan for outdoor and semi-open venues",
          basePrice: 1200,
          variants: [
            { color: "White", dimensions: "60x60x150 cm", stock: 20 },
            { color: "Grey",  dimensions: "60x60x150 cm", stock: 15 },
          ],
        },
      ],
    },
    {
      name: "Display & Decor",
      products: [
        {
          name: "Octonorm Display",
          description: "Modular Octonorm display panel system for exhibitions and expos",
          basePrice: 350,
          variants: [
            { color: "White",    dimensions: "100x250 cm (W x H)", stock: 100 },
            { color: "Graphite", dimensions: "100x250 cm (W x H)", stock: 60  },
          ],
        },
      ],
    },
    {
      name: "Others",
      products: [
        {
          name: "Miscellaneous Rental Item",
          description: "Custom or non-catalogued rental items — contact us for details",
          basePrice: null,
          variants: [
            { color: "N/A", dimensions: "Custom", stock: 999 },
          ],
        },
      ],
    },
  ],
};

// ── POST /api/seed ────────────────────────────────────────────────────────────
// Wipes existing categories/products/variants and re-seeds from scratch.
// ONLY enable in development — guard with NODE_ENV check.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      success: false,
      message: "Seeding is disabled in production.",
    });
  }

  try {
    // ── 1. Wipe in dependency order ──────────────────────────────────────────
    await prisma.quoteItem.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    const summary = { categories: 0, products: 0, variants: 0 };

    // ── 2. Re-seed ────────────────────────────────────────────────────────────
    for (const categoryData of SEED_DATA.categories) {
      const category = await prisma.category.create({
        data: { name: categoryData.name },
      });
      summary.categories++;

      for (const productData of categoryData.products) {
        const { variants, ...productFields } = productData;

        const product = await prisma.product.create({
          data: {
            ...productFields,
            categoryId: category.id,
          },
        });
        summary.products++;

        await prisma.productVariant.createMany({
          data: variants.map((v) => ({
            ...v,
            productId: product.id,
          })),
        });
        summary.variants += variants.length;
      }
    }

    // ── 3. Return what was created ─────────────────────────────────────────────
    const seeded = await prisma.category.findMany({
      include: {
        products: {
          include: { variants: true },
        },
      },
    });

    return ok(res, seeded, {
      message: "Database seeded successfully",
      summary,
    });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
