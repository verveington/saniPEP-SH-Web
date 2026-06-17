import type { AuthenticatedActor, UserRole } from "../users/models.js";

export function assertRole(actor: AuthenticatedActor, allowedRoles: readonly UserRole[]) {
  if (!allowedRoles.includes(actor.role)) {
    throw new Error(`Role ${actor.role} is not allowed for this backend action.`);
  }
}

export function assertCustomerScope(actor: AuthenticatedActor, customerProfileId: string) {
  if (actor.role === "customer" && actor.customerProfileId !== customerProfileId) {
    throw new Error("Customer actor cannot access another customer profile.");
  }
}

export function canReviewPortalRequests(actor: AuthenticatedActor) {
  return actor.role === "staff" || actor.role === "admin";
}
