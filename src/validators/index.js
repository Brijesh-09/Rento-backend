const { z } = require("zod");

// ── Category ──────────────────────────────────────────────────────────────────

const CreateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// ── Product ───────────────────────────────────────────────────────────────────

const CreateProductSchema = z.object({
  name:        z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  categoryId:  z.string().uuid("categoryId must be a valid UUID"),
  basePrice:   z.number().positive().optional(),
});

const UpdateProductSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  categoryId:  z.string().uuid().optional(),
  basePrice:   z.number().positive().optional(),
});

const ProductQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  search:     z.string().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
});

// ── Variant ───────────────────────────────────────────────────────────────────

const CreateVariantSchema = z.object({
  color:      z.string().min(1).optional(),
  dimensions: z.string().min(1).optional(),  // e.g. "120x60x75 cm"
  stock:      z.number().int().min(0).optional(),
});

const UpdateVariantSchema = CreateVariantSchema.partial();

// ── User ──────────────────────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  name:  z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
  phone: z.string().min(7, "Phone is required"),
});

// ── Quote ─────────────────────────────────────────────────────────────────────

const QuoteItemSchema = z.object({
  productId: z.string().uuid("productId must be a valid UUID"),
  variantId: z.string().uuid().optional(),
  quantity:  z.number().int().min(1, "Quantity must be at least 1"),
});

const CreateQuoteSchema = z.object({
  // User can be created on the fly or pass an existing userId
  userId:    z.string().uuid().optional(),
  user: z.object({
    name:  z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
  }).optional(),

  eventName: z.string().min(1).optional(),
  eventType: z.string().min(1).optional(),
  location:  z.string().min(1, "Location is required"),
  startDate: z.coerce.date({ required_error: "Start date is required" }),
  endDate:   z.coerce.date({ required_error: "End date is required" }),
  notes:     z.string().optional(),

  items: z.array(QuoteItemSchema).min(1, "At least one item is required"),
}).refine(
  (data) => data.userId || data.user,
  { message: "Either userId or user details (name, email, phone) must be provided" }
).refine(
  (data) => data.endDate >= data.startDate,
  { message: "endDate must be on or after startDate", path: ["endDate"] }
);

const UpdateQuoteStatusSchema = z.object({
  status: z.enum(["PENDING", "REVIEWING", "QUOTED", "CONFIRMED", "CLOSED"]),
});

const QuoteQuerySchema = z.object({
  status: z.enum(["PENDING", "REVIEWING", "QUOTED", "CONFIRMED", "CLOSED"]).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateProductSchema,
  UpdateProductSchema,
  ProductQuerySchema,
  CreateVariantSchema,
  UpdateVariantSchema,
  CreateUserSchema,
  CreateQuoteSchema,
  UpdateQuoteStatusSchema,
  QuoteQuerySchema,
};
