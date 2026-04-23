const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { validate } = require("../middlewares/validate.middleware");
const { CreateQuoteSchema, UpdateQuoteStatusSchema, QuoteQuerySchema } = require("../validators");
const { ok, created, notFound, serverError, badRequest } = require("../lib/response");

const router = Router();

// Shared include block — used in GET single and POST response
const quoteInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, basePrice: true } },
      variant: { select: { id: true, color: true, dimensions: true } },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/quotes
// ?status=PENDING  ?page=1  ?limit=20
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", validate(QuoteQuerySchema, "query"), async (req, res) => {
  try {
    const { status, page, limit } = req.query;

    const where = {};
    if (status) where.status = status;

    const skip  = (page - 1) * limit;
    const total = await prisma.quote.count({ where });

    const quotes = await prisma.quote.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: quoteInclude,
    });

    return ok(res, quotes, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return serverError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/quotes/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({
      where:   { id: req.params.id },
      include: quoteInclude,
    });
    if (!quote) return notFound(res, "Quote not found");
    return ok(res, quote);
  } catch (err) {
    return serverError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/quotes
// Accepts either an existing userId OR inline user details (creates user if new)
// Creates quote + all items in a single transaction
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", validate(CreateQuoteSchema), async (req, res) => {
  try {
    const { userId, user, items, ...quoteData } = req.body;

    // Validate all product + variant IDs exist before touching the DB
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return notFound(res, `Product not found: ${item.productId}`);

      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
        if (!variant) return notFound(res, `Variant not found: ${item.variantId}`);
        if (variant.productId !== item.productId) {
          return badRequest(res, `Variant ${item.variantId} does not belong to product ${item.productId}`);
        }
      }
    }

    const quote = await prisma.$transaction(async (tx) => {
      // 1. Resolve the user — find existing or create new
      let resolvedUserId = userId;

      if (!resolvedUserId) {
        const existing = await tx.user.findUnique({ where: { email: user.email } });
        if (existing) {
          resolvedUserId = existing.id;
        } else {
          const newUser = await tx.user.create({ data: user });
          resolvedUserId = newUser.id;
        }
      } else {
        const existing = await tx.user.findUnique({ where: { id: resolvedUserId } });
        if (!existing) throw { code: "USER_NOT_FOUND" };
      }

      // 2. Create the quote
      const newQuote = await tx.quote.create({
        data: {
          ...quoteData,
          userId: resolvedUserId,
        },
      });

      // 3. Create all quote items
      await tx.quoteItem.createMany({
        data: items.map((item) => ({
          quoteId:   newQuote.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity:  item.quantity,
        })),
      });

      // 4. Return full quote with relations
      return tx.quote.findUnique({
        where:   { id: newQuote.id },
        include: quoteInclude,
      });
    });

    return created(res, quote);
  } catch (err) {
    if (err.code === "USER_NOT_FOUND") return notFound(res, "User not found");
    return serverError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/quotes/:id/status
// Your team uses this to move a quote through the workflow
// PENDING → REVIEWING → QUOTED → CONFIRMED → CLOSED
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/status", validate(UpdateQuoteStatusSchema), async (req, res) => {
  try {
    const quote = await prisma.quote.update({
      where:   { id: req.params.id },
      data:    { status: req.body.status },
      include: quoteInclude,
    });
    return ok(res, quote);
  } catch (err) {
    if (err.code === "P2025") return notFound(res, "Quote not found");
    return serverError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/quotes/:id
// Only allow deleting quotes that are still PENDING
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({ where: { id: req.params.id } });
    if (!quote) return notFound(res, "Quote not found");

    if (quote.status !== "PENDING") {
      return badRequest(res, `Cannot delete a quote with status "${quote.status}". Only PENDING quotes can be deleted.`);
    }

    // Delete items first (no cascade in schema), then the quote
    await prisma.$transaction([
      prisma.quoteItem.deleteMany({ where: { quoteId: req.params.id } }),
      prisma.quote.delete({ where: { id: req.params.id } }),
    ]);

    return ok(res, { deleted: true });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
