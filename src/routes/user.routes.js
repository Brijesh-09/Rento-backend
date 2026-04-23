const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { validate } = require("../middlewares/validate.middleware");
const { CreateUserSchema } = require("../validators");
const { ok, created, notFound, serverError, badRequest } = require("../lib/response");

const router = Router();

// GET /api/users
router.get("/", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { quotes: true } } },
    });
    return ok(res, users);
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
          include: { items: { include: { product: true, variant: true } } },
        },
      },
    });
    if (!user) return notFound(res, "User not found");
    return ok(res, user);
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/users
router.post("/", validate(CreateUserSchema), async (req, res) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    return created(res, user);
  } catch (err) {
    if (err.code === "P2002") return badRequest(res, "A user with this email already exists");
    return serverError(res, err);
  }
});

module.exports = router;
