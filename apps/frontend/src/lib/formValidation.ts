import { getMissingConsentScopes } from "./privacySecurity";
import type {
  AppointmentRequestInput,
  CareConfigurationInput,
  ContactInquiryInput,
  UploadInput,
  ValidationResult,
} from "./types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+0-9][0-9\s/()-]{5,}$/;
const defaultUploadLabel = "Noch keine Datei ausgewählt";

const hasText = (value: string | undefined, minLength = 1) =>
  (value ?? "").trim().length >= minLength;

const result = (errors: string[]): ValidationResult => ({
  valid: errors.length === 0,
  errors,
});

const requireEmailOrPhone = (email: string, phone: string, errors: string[]) => {
  if (!hasText(email) && !hasText(phone)) {
    errors.push("Bitte E-Mail oder Telefon für die Rückmeldung angeben.");
    return;
  }

  if (hasText(email) && !emailPattern.test(email.trim())) {
    errors.push("Bitte eine gültige E-Mail-Adresse angeben.");
  }

  if (hasText(phone) && !phonePattern.test(phone.trim())) {
    errors.push("Bitte eine gültige Telefonnummer angeben.");
  }
};

export const validateCareConfigurationInput = (input: CareConfigurationInput): ValidationResult => {
  const errors: string[] = [];

  if (!hasText(input.need)) errors.push("Bitte den Bedarf auswählen.");
  if (!hasText(input.rhythm)) errors.push("Bitte den gewünschten Rhythmus auswählen.");
  if (!input.hasPrescription && !hasText(input.note, 10)) {
    errors.push("Ohne Rezept bitte kurz beschreiben, was vorbereitet werden soll.");
  }

  return result(errors);
};

export const validateUploadInput = (input: UploadInput): ValidationResult => {
  const errors: string[] = [];

  if (!hasText(input.context)) errors.push("Bitte den Versorgungskontext auswählen.");
  if (!hasText(input.fileName) || input.fileName === defaultUploadLabel) {
    errors.push("Bitte eine Rezeptdatei auswählen.");
  }

  const missingConsent = getMissingConsentScopes(input.consentScopes);
  if (missingConsent.length > 0) {
    errors.push("Bitte alle Einwilligungen für Rezeptupload und Gesundheitsdaten bestätigen.");
  }

  return result(errors);
};

export const validateAppointmentInput = (input: AppointmentRequestInput): ValidationResult => {
  const errors: string[] = [];

  if (!hasText(input.concern)) errors.push("Bitte ein Anliegen auswählen.");
  if (!hasText(input.preferredDate)) errors.push("Bitte ein Wunschdatum auswählen.");
  if (!hasText(input.preferredWindow)) errors.push("Bitte ein 1-Stunden-Zeitfenster auswählen.");
  if (!hasText(input.contactName, 2)) errors.push("Bitte einen Namen für die Rückmeldung angeben.");
  requireEmailOrPhone(input.contactEmail, input.contactPhone, errors);

  if (!hasText(input.shortQuestionnaire, 10)) {
    errors.push("Bitte den kurzen Fragebogen mit mindestens einem Satz ausfüllen.");
  }

  return result(errors);
};

export const validateContactInquiryInput = (input: ContactInquiryInput): ValidationResult => {
  const errors: string[] = [];

  if (!hasText(input.topic)) errors.push("Bitte ein Thema auswählen.");
  if (!hasText(input.serviceContext)) errors.push("Bitte einen Fachbereich auswählen.");
  if (!hasText(input.contactName, 2)) errors.push("Bitte einen Namen für die Rückmeldung angeben.");
  requireEmailOrPhone(input.contactEmail, input.contactPhone, errors);

  if (input.preferredContactChannel === "email" && !hasText(input.contactEmail)) {
    errors.push("Für den Antwortweg E-Mail bitte eine E-Mail-Adresse angeben.");
  }

  if ((input.preferredContactChannel === "phone" || input.preferredContactChannel === "whatsapp") && !hasText(input.contactPhone)) {
    errors.push("Für Telefon oder WhatsApp bitte eine Telefonnummer angeben.");
  }

  if (!hasText(input.message, 10)) {
    errors.push("Bitte eine kurze Nachricht mit mindestens einem Satz eingeben.");
  }

  return result(errors);
};
