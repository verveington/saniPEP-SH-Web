export type PublicRequestReceipt = {
  id: string;
  status: "new" | "in_review" | "waiting_for_customer" | "completed" | "cancelled";
  statusLabel: string;
  safeSummary: string;
  createdAt: string;
  fileUploadIncluded: false;
  omniaWriteAllowed: false;
  staffReviewRequired: true;
};

export type PublicRequestPayload =
  | {
      type: "appointment";
      concern: string;
      preferredDate: string;
      preferredWindow: string;
      hasPrescription: boolean;
      shortQuestionnaire: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
    }
  | {
      type: "contact";
      topic: string;
      serviceContext: string;
      message: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      preferredContactChannel: "email" | "phone" | "whatsapp";
      containsHealthData: boolean;
    }
  | {
      type: "care";
      need: string;
      rhythm: string;
      hasPrescription: boolean;
      note: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
    };

export class PublicRequestApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const publicRequestBackendUrl =
  process.env.NEXT_PUBLIC_PORTAL_BACKEND_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:4100" : undefined);

export async function submitPublicRequest(payload: PublicRequestPayload) {
  if (!publicRequestBackendUrl) {
    throw new PublicRequestApiError("public_request_api_not_configured", 0);
  }

  const response = await fetch(`${publicRequestBackendUrl.replace(/\/$/, "")}/api/public/requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : `public_request_${response.status}`;
    throw new PublicRequestApiError(message, response.status);
  }

  if (!body.request || typeof body.request.id !== "string") {
    throw new PublicRequestApiError("invalid_public_request_response", response.status);
  }

  return body.request as PublicRequestReceipt;
}
