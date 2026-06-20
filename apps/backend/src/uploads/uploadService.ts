import { createHash, randomUUID } from "node:crypto";
import type { AuditSink } from "../audit/auditEvent.js";
import { createAuditEvent } from "../audit/auditEvent.js";
import type { AuthenticatedActor } from "../users/models.js";
import type { UploadObject, UploadPurpose } from "./models.js";
import { validateUploadPolicy } from "./policy.js";

export type PrepareUploadMetadataInput = {
  actor: AuthenticatedActor;
  customerProfileId: string;
  purpose: UploadPurpose;
  originalFileName?: string;
  declaredMimeType?: string;
  sizeBytes: number;
  firstBytes?: Uint8Array;
  consentVersion: string;
  consentScopes: readonly string[];
  auditSink: AuditSink;
  auditHashSecret?: string;
};

export async function prepareUploadMetadata(input: PrepareUploadMetadataInput) {
  const validation = validateUploadPolicy(input);
  const now = new Date().toISOString();
  const uploadObject: UploadObject = {
    id: randomUUID(),
    customerProfileId: input.customerProfileId,
    createdByUserId: input.actor.userId,
    purpose: input.purpose,
    storageState: validation.allowed ? "created" : "rejected",
    scanStatus: "not_started",
    quarantineKey: validation.allowed ? buildQuarantineKey(input.customerProfileId) : undefined,
    declaredMimeType: input.declaredMimeType,
    detectedMimeType: validation.detectedMimeType,
    normalizedExtension: validation.normalizedExtension,
    sizeBytes: input.sizeBytes,
    originalFileNameHash: input.originalFileName ? hashOriginalFileName(input.originalFileName) : undefined,
    consentVersion: input.consentVersion,
    createdAt: now,
    updatedAt: now,
  };

  await input.auditSink.append(createAuditEvent({
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    action: validation.allowed ? "upload-metadata-prepared" : "upload-metadata-rejected",
    outcome: validation.allowed ? "accepted" : "rejected",
    objectType: "upload_object",
    objectId: uploadObject.id,
    uploadObjectId: uploadObject.id,
    metadata: {
      purpose: input.purpose,
      sizeBytes: input.sizeBytes,
      detectedMimeType: validation.detectedMimeType,
      errors: validation.errors.join(","),
    },
    hashSecret: input.auditHashSecret,
  }));

  return {
    uploadObject,
    validation,
  };
}

export function buildQuarantineKey(customerProfileId: string) {
  return `quarantine/${customerProfileId}/${randomUUID()}`;
}

function hashOriginalFileName(fileName: string) {
  return createHash("sha256").update(fileName.trim().toLowerCase()).digest("hex");
}
