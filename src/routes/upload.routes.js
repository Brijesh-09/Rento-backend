const { Router } = require("express");
const { createUploader, getFileUrl } = require("../middlewares/upload.middleware");
const { deleteFromSpaces }           = require("../lib/spaces");
const { ok, serverError, badRequest } = require("../lib/response");

const router = Router();

// ── POST /api/upload ──────────────────────────────────────────────────────────
// Upload 1–10 images. Returns array of public URLs.
//
// Request: multipart/form-data
//   images  (file, required, up to 10)
//   folder  (string, optional — default "uploads")  e.g. "products", "variants"
//
// Response:
//   { success: true, data: { urls: ["https://..."], count: 2 } }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", (req, res) => {
  // Create uploader lazily inside the handler so dotenv has already loaded
  const folder = req.query.folder || "uploads";
  const upload = createUploader(folder);

  upload.array("images", 10)(req, res, (err) => {
    if (err) {
      // multer validation errors (size, type, count)
      return badRequest(res, err.message);
    }
    if (!req.files || req.files.length === 0) {
      return badRequest(res, "No images provided. Send files under the field name 'images'.");
    }

    const urls = req.files.map(getFileUrl);
    return ok(res, { urls, count: urls.length });
  });
});

// ── DELETE /api/upload ────────────────────────────────────────────────────────
// Delete one or more files from Spaces by URL.
//
// Request body: { urls: ["https://...", ...] }
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/", async (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) {
    return badRequest(res, "Provide an array of URLs to delete: { urls: [...] }");
  }

  try {
    await Promise.allSettled(urls.map(deleteFromSpaces));
    return ok(res, { deleted: urls.length });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
