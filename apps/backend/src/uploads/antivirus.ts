import type { AntivirusScanStatus } from "./models.js";

export type AntivirusScanInput = {
  uploadObjectId: string;
  quarantineKey: string;
  sizeBytes: number;
  sha256?: string;
};

export type AntivirusScanResult = {
  status: Exclude<AntivirusScanStatus, "not_started">;
  scannerName: string;
  signatureVersion?: string;
  scannedAt: string;
  reason?: string;
};

export type AntivirusScanner = {
  scan(input: AntivirusScanInput): Promise<AntivirusScanResult>;
};

export function createStubAntivirusScanner(): AntivirusScanner {
  return {
    async scan() {
      return {
        status: "scanner_error",
        scannerName: "stub-disabled",
        scannedAt: new Date().toISOString(),
        reason: "No AV scanner is configured. Files must not be released from quarantine.",
      };
    },
  };
}
