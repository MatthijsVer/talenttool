import { put } from "@vercel/blob";

const BLOB_RW_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export interface BlobUploadResult {
  url: string;
  pathname?: string;
  size?: number;
  uploadedAt?: string;
  contentType?: string;
}

export async function uploadToBlob(
  key: string,
  data: ArrayBuffer | Uint8Array | Blob | Buffer,
  contentType?: string,
): Promise<BlobUploadResult> {
  if (!BLOB_RW_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN environment variable.");
  }

  const blob = await put(key, data, {
    access: "private",
    contentType: contentType ?? "application/octet-stream",
    token: BLOB_RW_TOKEN,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    size: blob.size,
    uploadedAt: blob.uploadedAt,
    contentType: blob.contentType,
  };
}
