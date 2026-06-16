import { getRequestPolicy } from "./requestWorkflow";
import type {
  AuditEvent,
  EmployeeReviewAction,
  PortalRequest,
  RequestStatus,
  ReviewStatus,
} from "./types";

const actionStatusMap: Record<EmployeeReviewAction, { status: RequestStatus; review: ReviewStatus; label: string }> = {
  "start-review": {
    status: "employee-review",
    review: "in_pruefung",
    label: "in Prüfung gesetzt",
  },
  "request-info": {
    status: "employee-review",
    review: "rueckfrage",
    label: "Rückfrage markiert",
  },
  "prepare-omnia": {
    status: "omnia-prepared",
    review: "in_pruefung",
    label: "für Omnia-Vorbereitung markiert",
  },
  approve: {
    status: "confirmed",
    review: "freigegeben",
    label: "fachlich freigegeben",
  },
  close: {
    status: "closed",
    review: "freigegeben",
    label: "abgeschlossen",
  },
};

const createAuditEvent = (requestId: string, action: string): AuditEvent => ({
  id: `AUD-${Math.floor(Math.random() * 90000) + 10000}`,
  at: new Date().toISOString(),
  actor: "employee",
  action,
  requestId,
});

export const staffReviewAdapter = {
  applyReviewAction(request: PortalRequest, action: EmployeeReviewAction): {
    request: PortalRequest;
    audit: AuditEvent;
    staffNote: string;
  } {
    const policy = getRequestPolicy(request);
    const next = actionStatusMap[action];
    const updatedRequest: PortalRequest = {
      ...request,
      status: next.status,
      employeeReview: next.review,
      publicSummary:
        action === "request-info"
          ? "Mitarbeiter haben eine Rückfrage markiert. Details werden geschützt über den gewählten Kontaktkanal geklärt."
          : request.publicSummary,
    };

    return {
      request: updatedRequest,
      audit: createAuditEvent(request.id, `${request.title} ${next.label}`),
      staffNote: `${next.label}. Policy: ${policy.reason}`,
    };
  },
};
