import type { Session } from "./models.js";

export type SessionStore = {
  save(session: Session): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  revokeByTokenHash(tokenHash: string, revokedAt: string): Promise<void>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
};

export type RedisSessionClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

export type RedisSessionStoreOptions = {
  keyPrefix: string;
};

export function createRedisSessionStore(client: RedisSessionClient, options: RedisSessionStoreOptions): SessionStore {
  const key = (tokenHash: string) => `${options.keyPrefix}:session:${tokenHash}`;

  return {
    async save(session) {
      await client.set(key(session.tokenHash), JSON.stringify(session), {
        EX: secondsUntil(session.absoluteExpiresAt),
      });
    },

    async findByTokenHash(tokenHash) {
      const encoded = await client.get(key(tokenHash));
      if (!encoded) return null;
      return parseSession(encoded);
    },

    async revokeByTokenHash(tokenHash, revokedAt) {
      const session = await this.findByTokenHash(tokenHash);
      if (!session) return;
      await client.set(key(tokenHash), JSON.stringify({ ...session, revokedAt }), {
        EX: secondsUntil(session.absoluteExpiresAt),
      });
    },

    async deleteByTokenHash(tokenHash) {
      await client.del(key(tokenHash));
    },
  };
}

function parseSession(encoded: string): Session | null {
  try {
    const parsed = JSON.parse(encoded) as Session;
    return typeof parsed.id === "string" && typeof parsed.tokenHash === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function secondsUntil(isoDate: string) {
  const seconds = Math.floor((new Date(isoDate).getTime() - Date.now()) / 1000);
  return Math.max(seconds, 1);
}
