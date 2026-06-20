import type { UploadPurpose } from "./models.js";

export const uploadPolicy = {
  maxBytes: 20 * 1024 * 1024,
  acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif"],
  acceptedExtensions: ["pdf", "jpg", "jpeg", "png", "heic", "heif"],
  requiredConsentScopes: ["health-data-processing", "prescription-upload", "portal-request"],
} as const;

export type UploadPolicyCandidate = {
  originalFileName?: string;
  declaredMimeType?: string;
  sizeBytes: number;
  firstBytes?: Uint8Array;
  purpose: UploadPurpose;
  consentScopes: readonly string[];
};

export type UploadPolicyResult = {
  allowed: boolean;
  detectedMimeType?: string;
  normalizedExtension?: string;
  errors: string[];
};

export function validateUploadPolicy(candidate: UploadPolicyCandidate): UploadPolicyResult {
  const errors: string[] = [];
  const normalizedExtension = candidate.originalFileName?.split(".").pop()?.toLowerCase();
  const detectedMimeType = candidate.firstBytes ? detectMimeType(candidate.firstBytes) : undefined;

  if (candidate.sizeBytes <= 0) errors.push("empty-file");
  if (candidate.sizeBytes > uploadPolicy.maxBytes) errors.push("file-too-large");
  if (!normalizedExtension || !(uploadPolicy.acceptedExtensions as readonly string[]).includes(normalizedExtension)) {
    errors.push("extension-not-allowed");
  }
  if (!detectedMimeType || !(uploadPolicy.acceptedMimeTypes as readonly string[]).includes(detectedMimeType)) {
    errors.push("mime-signature-not-allowed");
  }
  if (candidate.declaredMimeType && detectedMimeType && candidate.declaredMimeType !== detectedMimeType) {
    errors.push("declared-mime-does-not-match-signature");
  }

  const scopes = new Set(candidate.consentScopes);
  for (const requiredScope of uploadPolicy.requiredConsentScopes) {
    if (!scopes.has(requiredScope)) errors.push(`missing-consent:${requiredScope}`);
  }

  return {
    allowed: errors.length === 0,
    detectedMimeType,
    normalizedExtension,
    errors,
  };
}

export function detectMimeType(firstBytes: Uint8Array) {
  const bytes = Array.from(firstBytes.slice(0, 12));
  const ascii = Buffer.from(firstBytes.slice(0, 12)).toString("ascii");

  if (ascii.startsWith("%PDF-")) return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10") return "image/png";
  if (ascii.includes("ftypheic") || ascii.includes("ftypheif")) return "image/heic";
  return undefined;
}
