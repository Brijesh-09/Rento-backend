const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// Digital Ocean Spaces is S3-compatible — we use the AWS SDK pointed at DO's endpoint
const spacesClient = new S3Client({
  endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
  region:   process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId:     process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

/**
 * Delete a file from DO Spaces by its full public URL.
 * Safe to call — silently swallows errors so a missing file never crashes.
 */
async function deleteFromSpaces(fileUrl) {
  if (!fileUrl) return;
  try {
    const url    = new URL(fileUrl);
    // Key is everything after the leading slash
    const key    = url.pathname.replace(/^\//, "");
    await spacesClient.send(
      new DeleteObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key:    key,
      })
    );
  } catch (err) {
    console.error("DO Spaces delete error:", err?.message);
  }
}

/**
 * Build the public CDN URL for a given key.
 * Returns the CDN URL if DO_SPACES_CDN_ENDPOINT is set, otherwise
 * falls back to the standard Spaces URL.
 */
function buildPublicUrl(key) {
  if (process.env.DO_SPACES_CDN_ENDPOINT) {
    return `${process.env.DO_SPACES_CDN_ENDPOINT.replace(/\/$/, "")}/${key}`;
  }
  return `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.digitaloceanspaces.com/${key}`;
}

module.exports = { spacesClient, deleteFromSpaces, buildPublicUrl };
