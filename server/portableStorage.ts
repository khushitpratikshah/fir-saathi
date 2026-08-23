import { randomUUID } from "node:crypto";

const BUCKET = "fir-saathi-evidence";

function storageConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceRoleKey) throw new Error("Portable evidence storage is not configured.");
  return { baseUrl, serviceRoleKey };
}

export async function portableEvidencePut(publicId: string, data: Buffer) {
  const { baseUrl, serviceRoleKey } = storageConfig();
  const key = `${publicId}/${randomUUID()}.enc`;
  const response = await fetch(`${baseUrl}/storage/v1/object/${BUCKET}/${key}`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/octet-stream", "x-upsert": "false" },
    body: new Blob([new Uint8Array(data)], { type: "application/octet-stream" }),
  });
  if (!response.ok) throw new Error(`Portable evidence upload failed (${response.status}).`);
  return { key };
}

export async function portableEvidenceSignedUrl(key: string) {
  const { baseUrl, serviceRoleKey } = storageConfig();
  const response = await fetch(`${baseUrl}/storage/v1/object/sign/${BUCKET}/${key}`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  });
  if (!response.ok) throw new Error(`Portable evidence download preparation failed (${response.status}).`);
  const payload = await response.json() as { signedURL?: string };
  if (!payload.signedURL) throw new Error("Portable evidence storage did not return a signed URL.");
  return `${baseUrl}/storage/v1${payload.signedURL}`;
}

export async function portableEvidenceRemove(key: string) {
  const { baseUrl, serviceRoleKey } = storageConfig();
  const response = await fetch(`${baseUrl}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [key] }),
  });
  if (!response.ok) throw new Error(`Portable evidence removal failed (${response.status}).`);
}
