import { randomBytes, scrypt as nodeScrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

export type PasswordHasher = {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, storedHash: string): Promise<boolean>;
};

export type ScryptPasswordHasherOptions = {
  pepper: string;
  keyLength?: number;
  cost?: number;
  blockSize?: number;
  parallelization?: number;
};

export function createScryptPasswordHasher(options: ScryptPasswordHasherOptions): PasswordHasher {
  const keyLength = options.keyLength ?? 64;
  const cost = options.cost ?? 16384;
  const blockSize = options.blockSize ?? 8;
  const parallelization = options.parallelization ?? 1;

  return {
    async hashPassword(password) {
      assertPasswordCandidate(password);
      const salt = randomBytes(16).toString("base64url");
      const derived = await derive(password, options.pepper, salt, keyLength, cost, blockSize, parallelization);
      return `scrypt$v=1$n=${cost}$r=${blockSize}$p=${parallelization}$l=${keyLength}$${salt}$${derived.toString("base64url")}`;
    },

    async verifyPassword(password, storedHash) {
      const parsed = parseScryptHash(storedHash);
      if (!parsed) return false;
      const derived = await derive(
        password,
        options.pepper,
        parsed.salt,
        parsed.keyLength,
        parsed.cost,
        parsed.blockSize,
        parsed.parallelization,
      );
      const expected = Buffer.from(parsed.hash, "base64url");
      return expected.length === derived.length && timingSafeEqual(expected, derived);
    },
  };
}

export function assertPasswordCandidate(password: string) {
  if (password.length < 12) {
    throw new Error("Password must contain at least 12 characters.");
  }
  if (password.length > 256) {
    throw new Error("Password is too long.");
  }
}

async function derive(
  password: string,
  pepper: string,
  salt: string,
  keyLength: number,
  cost: number,
  blockSize: number,
  parallelization: number,
) {
  return scryptAsync(`${pepper}:${password}`, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: 64 * 1024 * 1024,
  });
}

function parseScryptHash(storedHash: string) {
  const parts = storedHash.split("$");
  if (parts.length !== 8 || parts[0] !== "scrypt" || parts[1] !== "v=1") return null;

  const cost = readTaggedNumber(parts[2], "n");
  const blockSize = readTaggedNumber(parts[3], "r");
  const parallelization = readTaggedNumber(parts[4], "p");
  const keyLength = readTaggedNumber(parts[5], "l");
  if (!cost || !blockSize || !parallelization || !keyLength) return null;

  return {
    cost,
    blockSize,
    parallelization,
    keyLength,
    salt: parts[6],
    hash: parts[7],
  };
}

function readTaggedNumber(value: string, tag: string) {
  const prefix = `${tag}=`;
  if (!value.startsWith(prefix)) return null;
  const parsed = Number.parseInt(value.slice(prefix.length), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function scryptAsync(password: string, salt: string, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}
