const { Router } = require("express");
const { createUploader, getFileUrl } = require("../middlewares/upload.middleware");
const { deleteFromSpaces, makePublic } = require("../lib/spaces");
const { ok, serverError, badRequest }  = require("../lib/response");

const router = Router();

// POST /api/upload?folder=products
router.post("/", (req, res) => {
  const folder = req.query.folder || "uploads";
  const upload = createUploader(folder);

  upload.array("images", 10)(req, res, async (err) => {
    if (err) return badRequest(res, err.message);
    if (!req.files || req.files.length === 0) {
      return badRequest(res, "No images provided. Send files under the field name 'images'.");
    }

    // Make each object public (multer-s3 v3 dropped acl support)
    await Promise.allSettled(req.files.map((f) => makePublic(f.key)));

    // Build correct public URLs — never use file.location (broken in multer-s3 v3)
    const urls = req.files.map(getFileUrl);

    console.log("[upload] keys  :", req.files.map((f) => f.key));
    console.log("[upload] urls  :", urls);

    return ok(res, { urls, count: urls.length });
  });
});

// DELETE /api/upload
router.delete("/", async (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) {
    return badRequest(res, "Provide an array of URLs: { urls: [...] }");
  }
  try {
    await Promise.allSettled(urls.map(deleteFromSpaces));
    return ok(res, { deleted: urls.length });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
