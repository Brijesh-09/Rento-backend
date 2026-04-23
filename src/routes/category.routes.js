const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { validate } = require("../middlewares/validate.middleware");
const { CreateCategorySchema, UpdateCategorySchema } = require("../validators");
const { ok, created, notFound, serverError, badRequest } = require("../lib/response");

const router = Router();

// GET /api/categories
// Returns all categories with a count of how many products are in each
router.get("/", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    });
    return ok(res, categories);
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/categories/:id
// Single category with its products
router.get("/:id", async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        products: {
          orderBy: { name: "asc" },
          include: { variants: true },
        },
      },
    });
    if (!category) return notFound(res, "Category not found");
    return ok(res, category);
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/categories
router.post("/", validate(CreateCategorySchema), async (req, res) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    return created(res, category);
  } catch (err) {
    return serverError(res, err);
  }
});

// PATCH /api/categories/:id
router.patch("/:id", validate(UpdateCategorySchema), async (req, res) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return ok(res, category);
  } catch (err) {
    if (err.code === "P2025") return notFound(res, "Category not found");
    return serverError(res, err);
  }
});

// DELETE /api/categories/:id
// Guards against deleting a category that still has products
router.delete("/:id", async (req, res) => {
  try {
    const productCount = await prisma.product.count({
      where: { categoryId: req.params.id },
    });
    if (productCount > 0) {
      return badRequest(
        res,
        `Cannot delete: ${productCount} product(s) are still linked to this category.`
      );
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  } catch (err) {
    if (err.code === "P2025") return notFound(res, "Category not found");
    return serverError(res, err);
  }
});

module.exports = router;
