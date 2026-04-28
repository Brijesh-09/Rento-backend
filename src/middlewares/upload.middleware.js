const multer    = require("multer");
const multerS3  = require("multer-s3");
const path      = require("path");
const crypto    = require("crypto");
const { spacesClient, buildPublicUrl } = require("../lib/spaces");

// Allowed MIME types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_SIZE_MB   = 8;

/**
 * createUploader(folder)
 * Returns a configured multer instance that streams files straight to
 * Digital Ocean Spaces under the given folder prefix.
 *
 * Usage:
 *   const upload = createUploader("products");
 *   router.post("/", upload.array("images", 10), handler);
 *
 * After the middleware runs, each file in req.files will have:
 *   file.location  — the public URL on Spaces / CDN
 *   file.key       — the object key inside the bucket
 */
function createUploader(folder = "uploads") {
  return multer({
    storage: multerS3({
      s3:      spacesClient,
      bucket:  process.env.DO_SPACES_BUCKET,
      acl:     "public-read",
      contentType: multerS3.AUTO_CONTENT_TYPE,

      key(req, file, cb) {
        const ext      = path.extname(file.originalname).toLowerCase();
        const random   = crypto.randomBytes(12).toString("hex");
        const filename = `${folder}/${Date.now()}-${random}${ext}`;
        cb(null, filename);
      },

      // Override the location multer-s3 returns so we always get the CDN URL
      // when DO_SPACES_CDN_ENDPOINT is set
      metadata(req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
    }),

    limits: {
      fileSize: MAX_SIZE_MB * 1024 * 1024,
      files:    10,
    },

    fileFilter(_req, file, cb) {
      if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Only JPG, PNG, WebP and AVIF images are allowed (got ${file.mimetype})`));
      }
    },
  });
}

/**
 * Extracts the public URL from an uploaded multer-s3 file object.
 * Prefers the CDN URL if configured, otherwise uses the direct Spaces URL.
 */
function getFileUrl(file) {
  // multer-s3 sets file.location = direct Spaces URL
  // We replace it with the CDN URL when available
  if (process.env.DO_SPACES_CDN_ENDPOINT) {
    return buildPublicUrl(file.key);
  }
  return file.location;
}

module.exports = { createUploader, getFileUrl };
