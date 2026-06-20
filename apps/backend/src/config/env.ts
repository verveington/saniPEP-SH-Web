export type RuntimeMode = "development" | "test" | "staging" | "production";
export type PortalRepositoryDriver = "file" | "postgres";

export type BackendDevelopmentUser = {
  role: "customer" | "staff" | "admin";
  email: string;
  password: string;
  safeDisplayName: string;
};

export type BackendEnv = {
  nodeEnv: RuntimeMode;
  port: number;
  backendBaseUrl: string;
  trustedOrigins: string[];
  databaseUrl?: string;
  databaseSsl: boolean;
  databasePoolMax: number;
  databaseIdleTimeoutMs: number;
  databaseConnectionTimeoutMs: number;
  databaseStatementTimeoutMs: number;
  redisUrl?: string;
  redisTls: boolean;
  redisKeyPrefix: string;
  sessionCookieName: string;
  sessionSecret: string;
  sessionIdleTtlMinutes: number;
  sessionAbsoluteTtlHours: number;
  csrfSecret: string;
  otpTtlDays: number;
  otpMaxAttempts: number;
  otpHashSecret: string;
  passwordPepper: string;
  passwordResetTtlMinutes: number;
  magicLinkEnabled: boolean;
  rateLimitLoginWindowSeconds: number;
  rateLimitLoginMaxAttempts: number;
  rateLimitUploadMaxPerHour: number;
  rateLimitGlobalWindowSeconds: number;
  rateLimitGlobalMaxRequests: number;
  accountLockoutMaxAttempts: number;
  accountLockoutWindowSeconds: number;
  accountLockoutBaseSeconds: number;
  accountLockoutMaxSeconds: number;
  uploadMaxBytes: number;
  uploadAllowedMimeTypes: string[];
  uploadQuarantineBucket?: string;
  uploadCleanBucket?: string;
  uploadKmsKeyId?: string;
  uploadSignedUrlTtlSeconds: number;
  avScannerMode: "stub-disabled" | "clamav" | "managed" | "vendor";
  avScannerEndpoint?: string;
  avScanTimeoutSeconds: number;
  uploadAbortedRetentionHours: number;
  uploadRejectedRetentionDays: number;
  uploadCleanRetentionDays: number;
  auditLogSink: "database" | "worm" | "siem" | "hybrid";
  auditLogHashSecret: string;
  auditLogRetentionDays: number;
  omniaApiBaseUrl?: string;
  omniaClientId?: string;
  omniaClientSecret?: string;
  omniaWriteMode: "read_only" | "prepared_only" | "staff_approved";
  logLevel: "debug" | "info" | "warn" | "error";
  errorTrackingDsn?: string;
  otelExporterOtlpEndpoint?: string;
  portalRepositoryDriver: PortalRepositoryDriver;
  portalStorePath: string;
  portalDevStorePath: string;
  developmentUsers: BackendDevelopmentUser[];
  developmentWarnings: string[];
};

const defaultDevelopmentSecret = "local-development-fallback-secret-32-plus-chars";

export function loadBackendEnv(source: NodeJS.ProcessEnv = process.env): BackendEnv {
  const nodeEnv = readRuntimeMode(source.NODE_ENV);
  const production = nodeEnv === "production";
  const errors: string[] = [];
  const developmentWarnings: string[] = [];

  const requireInProduction = (name: string, value: string | undefined) => {
    if (production && !value) errors.push(`${name} is required in production.`);
  };

  const readSecret = (name: string) => {
    const value = source[name];
    if (production && (!value || value.length < 32)) {
      errors.push(`${name} must be set to at least 32 characters in production.`);
    }
    if (!production && !value) {
      developmentWarnings.push(`${name} is using a development-only fallback.`);
      return defaultDevelopmentSecret;
    }
    return value ?? defaultDevelopmentSecret;
  };

  requireInProduction("PORTAL_DATABASE_URL", source.PORTAL_DATABASE_URL);
  requireInProduction("REDIS_URL", source.REDIS_URL);
  requireInProduction("UPLOAD_QUARANTINE_BUCKET", source.UPLOAD_QUARANTINE_BUCKET);
  requireInProduction("UPLOAD_CLEAN_BUCKET", source.UPLOAD_CLEAN_BUCKET);
  requireInProduction("UPLOAD_KMS_KEY_ID", source.UPLOAD_KMS_KEY_ID);
  const avScannerMode = readEnum(
    source.AV_SCANNER_MODE,
    "AV_SCANNER_MODE",
    ["stub-disabled", "clamav", "managed", "vendor"] as const,
    "stub-disabled",
  );
  if (production && avScannerMode === "stub-disabled") {
    errors.push("AV_SCANNER_MODE=stub-disabled is not allowed in production.");
  }

  const portalRepositoryDriver = readEnum(
    source.PORTAL_REPOSITORY_DRIVER,
    "PORTAL_REPOSITORY_DRIVER",
    ["file", "postgres"] as const,
    production ? "postgres" : "file",
  );
  if (production && portalRepositoryDriver === "file") {
    errors.push("PORTAL_REPOSITORY_DRIVER=file is not allowed in production.");
  }
  if (portalRepositoryDriver === "postgres" && !source.PORTAL_DATABASE_URL) {
    errors.push("PORTAL_DATABASE_URL is required when PORTAL_REPOSITORY_DRIVER=postgres.");
  }
  if (!production && portalRepositoryDriver === "file") {
    developmentWarnings.push("PORTAL_REPOSITORY_DRIVER=file is development-only and blocked in production.");
  }
  const developmentUsers = readDevelopmentUsers(source, production, errors, developmentWarnings);

  const trustedOrigins = readCsv(source.TRUSTED_ORIGINS);
  if (production && trustedOrigins.length === 0) {
    errors.push("TRUSTED_ORIGINS must be explicit in production.");
  }
  if (production && trustedOrigins.some((origin) => !origin.startsWith("https://"))) {
    errors.push("TRUSTED_ORIGINS must use https:// in production.");
  }

  const backendBaseUrl = source.PORTAL_BACKEND_BASE_URL ?? "http://localhost:4100";
  if (production && !backendBaseUrl.startsWith("https://")) {
    errors.push("PORTAL_BACKEND_BASE_URL must use https:// in production.");
  }

  const sessionCookieName = source.PORTAL_SESSION_COOKIE_NAME ?? (production ? "__Host-sanipep_portal_session" : "sanipep_portal_session");
  if (production && !sessionCookieName.startsWith("__Host-")) {
    errors.push("PORTAL_SESSION_COOKIE_NAME must use the __Host- prefix in production.");
  }

  const env: BackendEnv = {
    nodeEnv,
    port: readInt(source.PORT, "PORT", 4100, 1, 65535),
    backendBaseUrl,
    trustedOrigins,
    databaseUrl: source.PORTAL_DATABASE_URL,
    databaseSsl: readBoolean(source.PORTAL_DATABASE_SSL, production),
    databasePoolMax: readInt(source.POSTGRES_POOL_MAX, "POSTGRES_POOL_MAX", 10, 1, 100),
    databaseIdleTimeoutMs: readInt(source.POSTGRES_IDLE_TIMEOUT_MS, "POSTGRES_IDLE_TIMEOUT_MS", 30000, 1000, 600000),
    databaseConnectionTimeoutMs: readInt(source.POSTGRES_CONNECTION_TIMEOUT_MS, "POSTGRES_CONNECTION_TIMEOUT_MS", 5000, 1000, 60000),
    databaseStatementTimeoutMs: readInt(source.POSTGRES_STATEMENT_TIMEOUT_MS, "POSTGRES_STATEMENT_TIMEOUT_MS", 15000, 1000, 300000),
    redisUrl: source.REDIS_URL,
    redisTls: readBoolean(source.REDIS_TLS, production),
    redisKeyPrefix: source.REDIS_KEY_PREFIX ?? "sanipep:portal",
    sessionCookieName,
    sessionSecret: readSecret("PORTAL_SESSION_SECRET"),
    sessionIdleTtlMinutes: readInt(source.PORTAL_SESSION_IDLE_TTL_MINUTES, "PORTAL_SESSION_IDLE_TTL_MINUTES", 30, 5, 240),
    sessionAbsoluteTtlHours: readInt(source.PORTAL_SESSION_ABSOLUTE_TTL_HOURS, "PORTAL_SESSION_ABSOLUTE_TTL_HOURS", 12, 1, 72),
    csrfSecret: readSecret("CSRF_SECRET"),
    otpTtlDays: readInt(source.PORTAL_OTP_TTL_DAYS, "PORTAL_OTP_TTL_DAYS", 14, 1, 30),
    otpMaxAttempts: readInt(source.PORTAL_OTP_MAX_ATTEMPTS, "PORTAL_OTP_MAX_ATTEMPTS", 5, 1, 20),
    otpHashSecret: readSecret("PORTAL_OTP_HASH_SECRET"),
    passwordPepper: readSecret("PORTAL_PASSWORD_PEPPER"),
    passwordResetTtlMinutes: readInt(source.PASSWORD_RESET_TTL_MINUTES, "PASSWORD_RESET_TTL_MINUTES", 30, 5, 1440),
    magicLinkEnabled: readBoolean(source.MAGIC_LINK_ENABLED, false),
    rateLimitLoginWindowSeconds: readInt(source.RATE_LIMIT_LOGIN_WINDOW_SECONDS, "RATE_LIMIT_LOGIN_WINDOW_SECONDS", 900, 60, 86400),
    rateLimitLoginMaxAttempts: readInt(source.RATE_LIMIT_LOGIN_MAX_ATTEMPTS, "RATE_LIMIT_LOGIN_MAX_ATTEMPTS", 5, 1, 100),
    rateLimitUploadMaxPerHour: readInt(source.RATE_LIMIT_UPLOAD_MAX_PER_HOUR, "RATE_LIMIT_UPLOAD_MAX_PER_HOUR", 10, 1, 1000),
    rateLimitGlobalWindowSeconds: readInt(source.RATE_LIMIT_GLOBAL_WINDOW_SECONDS, "RATE_LIMIT_GLOBAL_WINDOW_SECONDS", 60, 10, 3600),
    rateLimitGlobalMaxRequests: readInt(source.RATE_LIMIT_GLOBAL_MAX_REQUESTS, "RATE_LIMIT_GLOBAL_MAX_REQUESTS", 120, 1, 10000),
    accountLockoutMaxAttempts: readInt(source.ACCOUNT_LOCKOUT_MAX_ATTEMPTS, "ACCOUNT_LOCKOUT_MAX_ATTEMPTS", 5, 1, 100),
    accountLockoutWindowSeconds: readInt(source.ACCOUNT_LOCKOUT_WINDOW_SECONDS, "ACCOUNT_LOCKOUT_WINDOW_SECONDS", 900, 60, 86400),
    accountLockoutBaseSeconds: readInt(source.ACCOUNT_LOCKOUT_BASE_SECONDS, "ACCOUNT_LOCKOUT_BASE_SECONDS", 900, 60, 86400),
    accountLockoutMaxSeconds: readInt(source.ACCOUNT_LOCKOUT_MAX_SECONDS, "ACCOUNT_LOCKOUT_MAX_SECONDS", 86400, 60, 604800),
    uploadMaxBytes: readInt(source.UPLOAD_MAX_BYTES, "UPLOAD_MAX_BYTES", 20 * 1024 * 1024, 1, 50 * 1024 * 1024),
    uploadAllowedMimeTypes: readCsv(source.UPLOAD_ALLOWED_MIME_TYPES ?? "application/pdf,image/jpeg,image/png,image/heic,image/heif"),
    uploadQuarantineBucket: source.UPLOAD_QUARANTINE_BUCKET,
    uploadCleanBucket: source.UPLOAD_CLEAN_BUCKET,
    uploadKmsKeyId: source.UPLOAD_KMS_KEY_ID,
    uploadSignedUrlTtlSeconds: readInt(source.UPLOAD_SIGNED_URL_TTL_SECONDS, "UPLOAD_SIGNED_URL_TTL_SECONDS", 300, 30, 3600),
    avScannerMode,
    avScannerEndpoint: source.AV_SCANNER_ENDPOINT || undefined,
    avScanTimeoutSeconds: readInt(source.AV_SCAN_TIMEOUT_SECONDS, "AV_SCAN_TIMEOUT_SECONDS", 30, 5, 300),
    uploadAbortedRetentionHours: readInt(source.UPLOAD_ABORTED_RETENTION_HOURS, "UPLOAD_ABORTED_RETENTION_HOURS", 24, 1, 168),
    uploadRejectedRetentionDays: readInt(source.UPLOAD_REJECTED_RETENTION_DAYS, "UPLOAD_REJECTED_RETENTION_DAYS", 7, 1, 90),
    uploadCleanRetentionDays: readInt(source.UPLOAD_CLEAN_RETENTION_DAYS, "UPLOAD_CLEAN_RETENTION_DAYS", 30, 1, 3650),
    auditLogSink: readEnum(source.AUDIT_LOG_SINK, "AUDIT_LOG_SINK", ["database", "worm", "siem", "hybrid"] as const, "database"),
    auditLogHashSecret: readSecret("AUDIT_LOG_HASH_SECRET"),
    auditLogRetentionDays: readInt(source.AUDIT_LOG_RETENTION_DAYS, "AUDIT_LOG_RETENTION_DAYS", 2555, 30, 36500),
    omniaApiBaseUrl: source.OMNIA_API_BASE_URL || undefined,
    omniaClientId: source.OMNIA_CLIENT_ID || undefined,
    omniaClientSecret: source.OMNIA_CLIENT_SECRET || undefined,
    omniaWriteMode: readEnum(source.OMNIA_WRITE_MODE, "OMNIA_WRITE_MODE", ["read_only", "prepared_only", "staff_approved"] as const, "read_only"),
    logLevel: readEnum(source.LOG_LEVEL, "LOG_LEVEL", ["debug", "info", "warn", "error"] as const, "info"),
    errorTrackingDsn: source.ERROR_TRACKING_DSN || undefined,
    otelExporterOtlpEndpoint: source.OTEL_EXPORTER_OTLP_ENDPOINT || undefined,
    portalRepositoryDriver,
    portalStorePath: source.PORTAL_STORE_PATH ?? source.PORTAL_DEV_STORE_PATH ?? "/tmp/sanipep-portal-mvp-store.json",
    portalDevStorePath: source.PORTAL_STORE_PATH ?? source.PORTAL_DEV_STORE_PATH ?? "/tmp/sanipep-portal-mvp-store.json",
    developmentUsers,
    developmentWarnings,
  };

  if (production && env.omniaWriteMode !== "read_only" && !env.omniaApiBaseUrl) {
    errors.push("OMNIA_API_BASE_URL is required when OMNIA_WRITE_MODE is not read_only.");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid backend environment:\n- ${errors.join("\n- ")}`);
  }

  return env;
}

function readRuntimeMode(value: string | undefined): RuntimeMode {
  if (value === "production" || value === "staging" || value === "test" || value === "development") return value;
  return "development";
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readInt(value: string | undefined, name: string, fallback: number, min: number, max: number) {
  const parsed = value === undefined || value === "" ? fallback : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function readEnum<const Options extends readonly string[]>(
  value: string | undefined,
  name: string,
  options: Options,
  fallback: Options[number],
): Options[number] {
  if (value === undefined || value === "") return fallback;
  if ((options as readonly string[]).includes(value)) return value as Options[number];
  throw new Error(`${name} must be one of: ${options.join(", ")}.`);
}

function readDevelopmentUsers(
  source: NodeJS.ProcessEnv,
  production: boolean,
  errors: string[],
  warnings: string[],
): BackendDevelopmentUser[] {
  const specs = [
    { role: "customer", prefix: "PORTAL_DEV_CUSTOMER", fallbackName: "Lokales Kundenkonto" },
    { role: "staff", prefix: "PORTAL_DEV_STAFF", fallbackName: "Lokaler Staff-Zugang" },
    { role: "admin", prefix: "PORTAL_DEV_ADMIN", fallbackName: "Lokaler Admin-Zugang" },
  ] as const;
  const users: BackendDevelopmentUser[] = [];

  for (const spec of specs) {
    const emailName = `${spec.prefix}_EMAIL`;
    const passwordName = `${spec.prefix}_PASSWORD`;
    const displayNameName = `${spec.prefix}_DISPLAY_NAME`;
    const email = source[emailName];
    const password = source[passwordName];

    if (production && (email || password || source[displayNameName])) {
      errors.push(`${spec.prefix}_* is development-only and must not be set in production.`);
      continue;
    }

    if (!email && !password) continue;
    if (!email || !password) {
      errors.push(`${emailName} and ${passwordName} must be set together.`);
      continue;
    }
    if (password.length < 16) {
      errors.push(`${passwordName} must be at least 16 characters.`);
      continue;
    }

    users.push({
      role: spec.role,
      email,
      password,
      safeDisplayName: source[displayNameName] || spec.fallbackName,
    });
  }

  if (!production && users.length > 0) {
    warnings.push("Development portal users are seeded from PORTAL_DEV_* environment variables.");
  }

  return users;
}
