export type PutQuarantineObjectInput = {
  uploadObjectId: string;
  quarantineKey: string;
  body: AsyncIterable<Uint8Array>;
  metadata: Record<string, string>;
};

export type PromoteCleanObjectInput = {
  uploadObjectId: string;
  quarantineKey: string;
  cleanKey: string;
};

export type ObjectStoragePort = {
  putQuarantineObject(input: PutQuarantineObjectInput): Promise<{ sha256: string; sizeBytes: number }>;
  promoteToClean(input: PromoteCleanObjectInput): Promise<void>;
  createReadUrl(input: { cleanKey: string; ttlSeconds: number }): Promise<string>;
  deleteObject(input: { storageKey: string; reason: string }): Promise<void>;
};

export function createUnavailableObjectStorage(): ObjectStoragePort {
  return {
    async putQuarantineObject() {
      throw new Error("Object storage is not configured. The scaffold must not persist uploads.");
    },
    async promoteToClean() {
      throw new Error("Object storage is not configured. The scaffold must not persist uploads.");
    },
    async createReadUrl() {
      throw new Error("Object storage is not configured. The scaffold must not persist uploads.");
    },
    async deleteObject() {
      throw new Error("Object storage is not configured. The scaffold must not persist uploads.");
    },
  };
}
