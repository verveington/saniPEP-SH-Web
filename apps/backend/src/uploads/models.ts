export type UploadPurpose = "prescription" | "care_document" | "staff_requested_document";

export type UploadStorageState =
  | "created"
  | "quarantined"
  | "scanning"
  | "clean"
  | "rejected"
  | "deleted";

export type AntivirusScanStatus =
  | "not_started"
  | "pending"
  | "clean"
  | "infected"
  | "suspicious"
  | "timeout"
  | "scanner_error";

export type UploadObject = {
  id: string;
  portalRequestId?: string;
  customerProfileId: string;
  createdByUserId: string;
  purpose: UploadPurpose;
  storageState: UploadStorageState;
  scanStatus: AntivirusScanStatus;
  quarantineKey?: string;
  cleanKey?: string;
  declaredMimeType?: string;
  detectedMimeType?: string;
  normalizedExtension?: string;
  sizeBytes: number;
  sha256?: string;
  originalFileNameHash?: string;
  consentVersion: string;
  scannerName?: string;
  scannerSignatureVersion?: string;
  scannedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};
