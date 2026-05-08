const multer   = require("multer");
const multerS3 = require("multer-s3");
const path     = require("path");
const crypto   = require("crypto");
const { spacesClient, buildPublicUrl } = require("../lib/spaces");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_SIZE_MB   = 8;

function createUploader(folder = "uploads") {
  return multer({
    storage: multerS3({
      s3:          spacesClient,
      bucket:      process.env.DO_SPACES_BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,

      metadata(req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },

      key(req, file, cb) {
        const ext      = path.extname(file.originalname).toLowerCase() || ".jpg";
        const random   = crypto.randomBytes(12).toString("hex");
        const filename = `${folder}/${Date.now()}-${random}${ext}`;
        cb(null, filename);
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
 * Always build the public URL from scratch using bucket + region + key.
 * Never trust file.location — multer-s3 v3 builds it from the S3 endpoint
 * which is https://region.digitaloceanspaces.com (no bucket in hostname),
 * producing a 404-causing URL like https://region.digitaloceanspaces.com/key.
 * The correct DO Spaces URL is https://bucket.region.digitaloceanspaces.com/key.
 */
function getFileUrl(file) {
  return buildPublicUrl(file.key);
}

module.exports = { createUploader, getFileUrl };
