import type {
  AppointmentRequestInput,
  CalendarIntegrationTarget,
  CalendarRequestEnvelope,
} from "./types";

export const calendarAdapter = {
  createHoldRequest(
    input: AppointmentRequestInput,
    target: CalendarIntegrationTarget = "nextcloud-calendar",
  ): CalendarRequestEnvelope {
    return {
      id: `CAL-${Math.floor(Math.random() * 90000) + 10000}`,
      target,
      mode: "hold-request",
      preferredDate: input.preferredDate,
      preferredWindow: input.preferredWindow,
      staffConfirmationRequired: true,
      summary: `${input.concern} am ${input.preferredDate}, ${input.preferredWindow}`,
    };
  },
};
