const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { validate } = require("../middlewares/validate.middleware");
const {
  CreateProductSchema,
  UpdateProductSchema,
  ProductQuerySchema,
  CreateVariantSchema,
  UpdateVariantSchema,
} = require("../validators");
const { ok, created, notFound, serverError, badRequest } = require("../lib/response");
const { deleteFromSpaces } = require("../lib/spaces");

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/products
router.get("/", validate(ProductQuerySchema, "query"), async (req, res) => {
  try {
    const { categoryId, search, page, limit } = req.query;
    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name:        { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    const skip  = (page - 1) * limit;
    const total = await prisma.product.count({ where });
    const products = await prisma.product.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        variants:  true,
        _count:    { select: { variants: true } },
      },
    });
    return ok(res, products, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, variants: { orderBy: { createdAt: "asc" } } },
    });
    if (!product) return notFound(res, "Product not found");
    return ok(res, product);
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/products
// imageUrls[] should already be uploaded via POST /api/upload first
router.post("/", validate(CreateProductSchema), async (req, res) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.body.categoryId } });
    if (!category) return notFound(res, "Category not found");
    const product = await prisma.product.create({
      data: req.body,
      include: { category: true, variants: true },
    });
    return created(res, product);
  } catch (err) {
    return serverError(res, err);
  }
});

// PATCH /api/products/:id
router.patch("/:id", validate(UpdateProductSchema), async (req, res) => {
  try {
    if (req.body.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: req.body.categoryId } });
      if (!category) return notFound(res, "Category not found");
    }
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data:  req.body,
      include: { category: true, variants: true },
    });
    return ok(res, product);
  } catch (err) {
    if (err.code === "P2025") return notFound(res, "Product not found");
    return serverError(res, err);
  }
});

// DELETE /api/products/:id
// Also cleans up all product + variant images from DO Spaces
router.delete("/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where:   { id: req.params.id },
      include: { variants: true },
    });
    if (!product) return notFound(res, "Product not found");

    const allImageUrls = [
      ...(product.imageUrls ?? []),
      ...product.variants.flatMap((v) => v.imageUrls ?? []),
    ];

    await prisma.product.delete({ where: { id: req.params.id } });

    if (allImageUrls.length > 0) {
      Promise.allSettled(allImageUrls.map(deleteFromSpaces)).catch(() => {});
    }

    return ok(res, { deleted: true, imagesRemoved: allImageUrls.length });
  } catch (err) {
    if (err.code === "P2025") return notFound(res, "Product not found");
    return serverError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/:productId/variants", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) return notFound(res, "Product not found");
    const variants = await prisma.productVariant.findMany({
      where: { productId: req.params.productId }, orderBy: { createdAt: "asc" },
    });
    return ok(res, variants);
  } catch (err) {
    return serverError(res, err);
  }
});

router.post("/:productId/variants", validate(CreateVariantSchema), async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) return notFound(res, "Product not found");
    const variant = await prisma.productVariant.create({
      data: { ...req.body, productId: req.params.productId },
    });
    return created(res, variant);
  } catch (err) {
    return serverError(res, err);
  }
});

router.patch("/:productId/variants/:variantId", validate(UpdateVariantSchema), async (req, res) => {
  try {
    const variant = await prisma.productVariant.update({
      where: { id: req.params.variantId },
      data:  req.body,
    });
    return ok(res, variant);
  } catch (err) {
    if (err.code === "P2025") return notFound(res, "Variant not found");
    return serverError(res, err);
  }
});

router.delete("/:productId/variants/:variantId", async (req, res) => {
  try {
    const variant = await prisma.productVariant.findUnique({ where: { id: req.params.variantId } });
    if (!variant) return notFound(res, "Variant not found");
    await prisma.productVariant.delete({ where: { id: req.params.variantId } });
    if (variant.imageUrls?.length > 0) {
      Promise.allSettled(variant.imageUrls.map(deleteFromSpaces)).catch(() => {});
    }
    return ok(res, { deleted: true });
  } catch (err) {
    if (err.code === "P2025") return notFound(res, "Variant not found");
    return serverError(res, err);
  }
});

module.exports = router;
