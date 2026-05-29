// ── Cloudflare R2 Storage ─────────────────────────────────────────────
// S3-compatible API: https://developers.cloudflare.com/r2/api/s3/api/
import { createHash } from "node:crypto";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET_NAME || "";

const R2_ENDPOINT = R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "";
const OUTPUT_DIR = join(homedir(), "agent-outputs");

export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);
}

// ── AWS Signature V4 helper ───────────────────────────────────────────
async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? encoder.encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data)));
}

async function hmacSha256Hex(key: Uint8Array | string, data: string): Promise<string> {
  const result = await hmacSha256(key, data);
  return Array.from(result).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSigningKey(service: string, date: string, region: string): Promise<Uint8Array> {
  const kDate = await hmacSha256(("AWS4" + R2_SECRET_ACCESS_KEY).slice(0, 32), date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  return kSigning;
}

async function r2Request(
  method: string,
  key: string,
  body?: Uint8Array | Buffer,
  contentType = "application/octet-stream"
): Promise<Response> {
  const now = new Date();
  const date = now.toISOString().replace(/[-:]/g, "").slice(0, 8); // YYYYMMDD
  const datetime = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"; // YYYYMMDDTHHmmssZ
  const region = "auto";
  const host = `${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const scheme = "https";
  const url = `${scheme}://${host}/${key}`;

  // Empty payload hash
  const payloadHash = await sha256Hex(body ? Buffer.from(body).toString("hex") : "");

  // Canonical request
  const headers: Record<string, string> = {
    "host": host,
    "x-amz-date": datetime,
    "x-amz-content-sha256": payloadHash,
  };
  if (body && contentType) {
    headers["content-type"] = contentType;
  }

  const signedHeaders = Object.keys(headers).sort().map(k => k.toLowerCase()).join(";");
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k.toLowerCase()}:${headers[k]}`).join("\n") + "\n";
  const canonicalRequest = [method, "/" + key, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");

  // String to sign
  const scope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", datetime, scope, await sha256Hex(canonicalRequest)].join("\n");

  // Sign
  const signingKey = await getSigningKey("s3", date, region);
  const signature = await hmacSha256Hex(signingKey, stringToSign);

  const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, {
    method,
    headers: {
      ...headers,
      "Authorization": authHeader,
    },
    body: body || undefined,
  });
}

// ── Upload a file to R2 ───────────────────────────────────────────────
export async function uploadToR2(localPath: string, key?: string): Promise<string> {
  if (!isR2Configured()) throw new Error("R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME");

  const filename = key || localPath.split("/").pop() || "image.png";
  const imageKey = `images/${filename}`;

  const fileData = await readFile(localPath);
  const ext = localPath.split(".").pop()?.toLowerCase() || "png";
  const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";

  const resp = await r2Request("PUT", imageKey, new Uint8Array(fileData), contentType);
  if (!resp.ok) {
    const err = await resp.text().catch(() => "unknown");
    throw new Error(`R2 upload failed ${resp.status}: ${err.slice(0, 200)}`);
  }

  return imageKey;
}

// ── List files in R2 bucket ───────────────────────────────────────────
export async function listR2Files(prefix = "images/", maxKeys = 100): Promise<any[]> {
  if (!isR2Configured()) return [];

  const now = new Date();
  const date = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
  const datetime = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const region = "auto";
  const host = `${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const queryParams = new URLSearchParams({
    "list-type": "2",
    "prefix": prefix,
    "max-keys": String(maxKeys),
  });

  const canonicalQueryString = queryParams.toString();
  const payloadHash = await sha256Hex("");
  const headers: Record<string, string> = {
    "host": host,
    "x-amz-date": datetime,
    "x-amz-content-sha256": payloadHash,
  };

  const signedHeaders = Object.keys(headers).sort().map(k => k.toLowerCase()).join(";");
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k.toLowerCase()}:${headers[k]}`).join("\n") + "\n";
  const canonicalRequest = ["GET", "/", canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const scope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", datetime, scope, await sha256Hex(canonicalRequest)].join("\n");
  const signingKey = await getSigningKey("s3", date, region);
  const signature = await hmacSha256Hex(signingKey, stringToSign);
  const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${host}/?${canonicalQueryString}`;
  const resp = await fetch(url, {
    headers: {
      ...headers,
      "Authorization": authHeader,
    },
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "unknown");
    throw new Error(`R2 list failed ${resp.status}: ${err.slice(0, 200)}`);
  }

  const text = await resp.text();
  // Parse XML response
  const items: any[] = [];
  const keyRegex = /<Key>([^<]+)<\/Key>/g;
  const sizeRegex = /<Size>(\d+)<\/Size>/g;
  const dateRegex = /<LastModified>([^<]+)<\/LastModified>/g;

  let match;
  const keys: string[] = [];
  const sizes: string[] = [];
  const dates: string[] = [];

  while ((match = keyRegex.exec(text)) !== null) keys.push(match[1]);
  while ((match = sizeRegex.exec(text)) !== null) sizes.push(match[1]);
  while ((match = dateRegex.exec(text)) !== null) dates.push(match[1]);

  for (let i = 0; i < keys.length; i++) {
    const filename = keys[i].split("/").pop() || keys[i];
    // Extract model name from filename: img-promptSlug-modelSlug-index.png
    const parts = filename.replace(/\.\w+$/, "").split("-");
    // Model slug is the part between prompt words and the numeric index
    let modelSlug = "unknown";
    for (let j = parts.length - 1; j >= 0; j--) {
      if (/^\d+$/.test(parts[j]) && j > 0) {
        // The part before the number is the model slug (may contain hyphens)
        // Walk back to find where prompt words end
        modelSlug = parts.slice(j - 1, j).join("-");
        break;
      }
    }

    items.push({
      key: keys[i],
      filename,
      size: parseInt(sizes[i] || "0"),
      lastModified: dates[i] || "",
      serveUrl: `/api/r2/file?key=${encodeURIComponent(keys[i])}`,
      modelSlug,
    });
  }

  return items;
}

// ── Get file from R2 ───────────────────────────────────────────────────
export async function getR2File(key: string): Promise<{ data: Uint8Array; contentType: string } | null> {
  if (!isR2Configured()) return null;

  const resp = await r2Request("GET", key);
  if (!resp.ok) return null;

  const contentType = resp.headers.get("content-type") || "application/octet-stream";
  const data = new Uint8Array(await resp.arrayBuffer());
  return { data, contentType };
}
