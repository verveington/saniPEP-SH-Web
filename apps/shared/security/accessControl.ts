export const appRoles = ["public", "customer", "staff", "admin"] as const;

export type AppRole = (typeof appRoles)[number];
export type ProtectedSurface = "portal" | "admin" | "design-lab";

export type AccessDecision = {
  allowed: boolean;
  role: AppRole | "anonymous";
  surface: ProtectedSurface;
  reason: string;
  productionReady: boolean;
};

export const requiredRoles: Record<ProtectedSurface, AppRole[]> = {
  portal: ["customer", "admin"],
  admin: ["staff", "admin"],
  "design-lab": ["admin"],
};

const defaultMockRole: Record<ProtectedSurface, AppRole> = {
  portal: "customer",
  admin: "staff",
  "design-lab": "admin",
};

const isAppRole = (value: string | undefined): value is AppRole =>
  !!value && (appRoles as readonly string[]).includes(value);

export const serverAuthBoundary = {
  roles: appRoles,
  requiredRoles,
  requiredServerChecks: [
    "verify-session-cookie-or-token",
    "load-user-role-from-server-session",
    "enforce-role-before-serving-protected-app",
    "deny-public-build-access-to-protected-routes",
    "audit-staff-and-admin-access",
  ],
  productionInvariant:
    "Portal, staff admin and design-lab must be served behind server-side auth and role checks. Client gates are only development diagnostics.",
} as const;

export const evaluateDevelopmentMockGate = (surface: ProtectedSurface): AccessDecision => {
  const mockEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK_AUTH === "true";

  if (!mockEnabled) {
    return {
      allowed: false,
      role: "anonymous",
      surface,
      reason:
        "Development mock auth is disabled. Protected builds require server-side auth before production use.",
      productionReady: false,
    };
  }

  const role = isAppRole(import.meta.env.VITE_MOCK_ROLE)
    ? import.meta.env.VITE_MOCK_ROLE
    : defaultMockRole[surface];
  const allowed = requiredRoles[surface].includes(role);

  return {
    allowed,
    role,
    surface,
    reason: allowed
      ? "Development-only mock gate accepted the configured role. This is not a production auth control."
      : `Role ${role} is not allowed for ${surface}.`,
    productionReady: false,
  };
};
