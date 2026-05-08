const { S3Client, DeleteObjectCommand, PutObjectAclCommand } = require("@aws-sdk/client-s3");

const spacesClient = new S3Client({
  endpoint:    `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
  region:      process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId:     process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

/**
 * Make an uploaded object publicly readable.
 * Call this after multer-s3 upload completes (multer-s3 v3 dropped acl support).
 */
async function makePublic(key) {
  try {
    await spacesClient.send(
      new PutObjectAclCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key:    key,
        ACL:    "public-read",
      })
    );
  } catch (err) {
    // Non-fatal — log and continue. The file is still uploaded.
    console.error("makePublic error:", err?.message);
  }
}

async function deleteFromSpaces(fileUrl) {
  if (!fileUrl) return;
  try {
    const url = new URL(fileUrl);
    const key = url.pathname.replace(/^\//, "");
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

function buildPublicUrl(key) {
  if (process.env.DO_SPACES_CDN_ENDPOINT) {
    return `${process.env.DO_SPACES_CDN_ENDPOINT.replace(/\/$/, "")}/${key}`;
  }
  return `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.digitaloceanspaces.com/${key}`;
}

module.exports = { spacesClient, deleteFromSpaces, makePublic, buildPublicUrl };
