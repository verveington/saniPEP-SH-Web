import type { AuthenticatedActor } from "../users/models.js";

export type OmniaCustomerSnapshot = {
  customerProfileId: string;
  omniaCustomerRef: string;
  safeDisplayName: string;
  mirroredAt: string;
  statusItems: Array<{
    id: string;
    label: string;
    status: string;
    nextAction?: string;
  }>;
};

export type PrepareOmniaChangeInput = {
  actor: AuthenticatedActor;
  portalRequestId: string;
  customerProfileId: string;
  changeKind: "status_note" | "order_preparation" | "appointment_note" | "master_data_review";
  payloadReference: string;
};

export type PreparedOmniaChange = {
  portalRequestId: string;
  preparedByUserId: string;
  preparedAt: string;
  changeKind: PrepareOmniaChangeInput["changeKind"];
  payloadReference: string;
  finalWriteRequiresHumanInOmnia: true;
};

export type OmniaAdapter = {
  readCustomerSnapshot(customerProfileId: string): Promise<OmniaCustomerSnapshot>;
  prepareReviewedChange(input: PrepareOmniaChangeInput): Promise<PreparedOmniaChange>;
};

export function createReadOnlyOmniaAdapterStub(): OmniaAdapter {
  return {
    async readCustomerSnapshot() {
      throw new Error("Omnia adapter is not configured. Do not fabricate customer status in the backend.");
    },
    async prepareReviewedChange(input) {
      return {
        portalRequestId: input.portalRequestId,
        preparedByUserId: input.actor.userId,
        preparedAt: new Date().toISOString(),
        changeKind: input.changeKind,
        payloadReference: input.payloadReference,
        finalWriteRequiresHumanInOmnia: true,
      };
    },
  };
}
