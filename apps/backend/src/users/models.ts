export type UserRole = "customer" | "staff" | "admin";

export type UserStatus = "invited" | "active" | "locked" | "disabled";

export type User = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  passwordHash?: string;
  passwordSetAt?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
  disabledAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerProfile = {
  id: string;
  userId: string;
  omniaCustomerRef: string;
  safeDisplayName: string;
  portalEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StaffUser = {
  id: string;
  userId: string;
  displayName: string;
  staffNumber?: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthenticatedActor = {
  userId: string;
  role: UserRole;
  customerProfileId?: string;
  staffUserId?: string;
};
