import { createHash, randomUUID } from "node:crypto";
import { createAuditEvent } from "./auditLog.js";
import type {
  AntivirusScanResult,
  AuditLogSink,
  QuarantineObject,
  UploadIntakeCandidate,
  UploadIntakeResult,
  UploadValidationResult,
} from "./types.js";

export const uploadBackendPolicy = {
  maxFileSizeBytes: 20 * 1024 * 1024,
  acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif"],
  acceptedExtensions: ["pdf", "jpg", "jpeg", "png", "heic", "heif"],
  requiredConsentScopes: ["health-data-processing", "prescription-upload", "portal-request"],
  quarantinePrefix: "quarantine/",
} as const;

export type QuarantineStorage = {
  put(input: {
    uploadId: string;
    storageKey: string;
    body: AsyncIterable<Uint8Array>;
    metadata: Record<string, string>;
  }): Promise<QuarantineObject>;
};

export type AntivirusScanner = {
  scan(input: QuarantineObject): Promise<AntivirusScanResult>;
};

export type UploadRequestLinker = {
  createUploadBackedRequest(input: {
    uploadId: string;
    customerId: string;
    safeSummary: string;
    actorId: string;
  }): Promise<{ requestId: string }>;
};

export type UploadBackendOptions = {
  quarantineStorage: QuarantineStorage;
  antivirusScanner: AntivirusScanner;
  requestLinker: UploadRequestLinker;
  auditLog: AuditLogSink;
};

export function createSecureUploadId() {
  return `UP-${randomUUID()}`;
}

export function detectMimeType(firstBytes: Uint8Array): string | undefined {
  const bytes = Array.from(firstBytes.slice(0, 12));
  const ascii = Buffer.from(firstBytes.slice(0, 12)).toString("ascii");

  if (ascii.startsWith("%PDF-")) return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10") return "image/png";
  if (ascii.includes("ftypheic") || ascii.includes("ftypheif")) return "image/heic";
  return undefined;
}

export function validateUploadCandidate(candidate: UploadIntakeCandidate): UploadValidationResult {
  const errors: string[] = [];
  const extension = candidate.originalFileName.split(".").pop()?.toLowerCase() ?? "";
  const detectedMimeType = detectMimeType(candidate.firstBytes);

  if (candidate.sizeBytes <= 0) errors.push("empty-file");
  if (candidate.sizeBytes > uploadBackendPolicy.maxFileSizeBytes) errors.push("file-too-large");
  if (!uploadBackendPolicy.acceptedExtensions.includes(extension as never)) errors.push("extension-not-allowed");
  if (!detectedMimeType || !uploadBackendPolicy.acceptedMimeTypes.includes(detectedMimeType as never)) {
    errors.push("mime-signature-not-allowed");
  }
  if (candidate.declaredMimeType && detectedMimeType && candidate.declaredMimeType !== detectedMimeType) {
    errors.push("declared-mime-does-not-match-signature");
  }

  const providedScopes = new Set(candidate.consentScopes);
  const missingConsent = uploadBackendPolicy.requiredConsentScopes.filter((scope) => !providedScopes.has(scope));
  for (const scope of missingConsent) errors.push(`missing-consent:${scope}`);

  return {
    valid: errors.length === 0,
    detectedMimeType,
    normalizedExtension: extension,
    errors,
  };
}

export async function sha256Stream(chunks: AsyncIterable<Uint8Array>) {
  const hash = createHash("sha256");
  for await (const chunk of chunks) hash.update(chunk);
  return hash.digest("hex");
}

export function createUploadBackend(options: UploadBackendOptions) {
  return {
    async receive(candidate: UploadIntakeCandidate): Promise<UploadIntakeResult> {
      const uploadId = createSecureUploadId();
      const validation = validateUploadCandidate(candidate);

      if (!validation.valid || !candidate.customerId) {
        await options.auditLog.append(createAuditEvent({
          actor: candidate.submittedBy,
          action: "upload-intake-rejected-before-quarantine",
          outcome: "rejected",
          uploadId,
          metadata: {
            errors: validation.errors.join(","),
            sizeBytes: candidate.sizeBytes,
            hasCustomerId: Boolean(candidate.customerId),
          },
        }));
        throw new Error(`Upload rejected: ${validation.errors.join(", ")}`);
      }

      const storageKey = `${uploadBackendPolicy.quarantinePrefix}${uploadId}`;
      const quarantine = await options.quarantineStorage.put({
        uploadId,
        storageKey,
        body: candidate.body,
        metadata: {
          purpose: candidate.purpose,
          consentVersion: candidate.consentVersion,
          detectedMimeType: validation.detectedMimeType ?? "unknown",
        },
      });

      const antivirus = await options.antivirusScanner.scan(quarantine);
      const clean = antivirus.status === "clean";
      const linked = clean
        ? await options.requestLinker.createUploadBackedRequest({
            uploadId,
            customerId: candidate.customerId,
            actorId: candidate.submittedBy.id,
            safeSummary: "Rezept-/Dokumentupload wartet auf Mitarbeiterpruefung.",
          })
        : { requestId: "" };

      await options.auditLog.append(createAuditEvent({
        actor: clean ? candidate.submittedBy : "system",
        action: clean ? "upload-quarantined-and-queued-for-staff-review" : "upload-quarantined-but-not-released",
        outcome: clean ? "queued" : "blocked",
        uploadId,
        requestId: linked.requestId || undefined,
        metadata: {
          scanner: antivirus.scanner,
          scanStatus: antivirus.status,
          sizeBytes: quarantine.sizeBytes,
          sha256: quarantine.sha256,
        },
      }));

      return {
        uploadId,
        requestId: linked.requestId,
        quarantine,
        validation,
        antivirus,
        acceptedForStaffReview: clean,
      };
    },
  };
}
