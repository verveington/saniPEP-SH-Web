export type PortalRequestKind =
  | "prescription_upload"
  | "reorder_request"
  | "subscription_change_request"
  | "appointment_request"
  | "health_contact_request";

export type PortalRequestStatus =
  | "draft"
  | "submitted"
  | "staff_review"
  | "approved"
  | "rejected"
  | "completed";

export type PortalRequestSensitivity = "contact" | "health" | "omnia_reference";

export type PortalRequest = {
  id: string;
  customerProfileId: string;
  createdByUserId: string;
  kind: PortalRequestKind;
  status: PortalRequestStatus;
  sensitivity: PortalRequestSensitivity;
  safeSummary: string;
  staffReviewRequired: true;
  omniaWriteAllowed: false;
  submittedAt?: string;
  reviewedByStaffUserId?: string;
  reviewedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};
