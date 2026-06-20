import { getMissingConsentScopes, getUploadFileSecurityError } from "./privacySecurity";
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

const result = (fieldErrors: Record<string, string>): ValidationResult => ({
  valid: Object.keys(fieldErrors).length === 0,
  errors: Object.values(fieldErrors),
  fieldErrors,
});

const requireEmailOrPhone = (email: string, phone: string, errors: Record<string, string>) => {
  if (!hasText(email) && !hasText(phone)) {
    errors.contactEmail = "Bitte E-Mail oder Telefon für die Rückmeldung angeben.";
    errors.contactPhone = "Bitte E-Mail oder Telefon für die Rückmeldung angeben.";
    return;
  }

  if (hasText(email) && !emailPattern.test(email.trim())) {
    errors.contactEmail = "Bitte eine gültige E-Mail-Adresse angeben.";
  }

  if (hasText(phone) && !phonePattern.test(phone.trim())) {
    errors.contactPhone = "Bitte eine gültige Telefonnummer angeben.";
  }
};

export const validateCareConfigurationInput = (input: CareConfigurationInput): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!hasText(input.need)) errors.need = "Bitte den Bedarf auswählen.";
  if (!hasText(input.rhythm)) errors.rhythm = "Bitte den gewünschten Rhythmus auswählen.";
  if (!hasText(input.contactName, 2)) errors.contactName = "Bitte einen Namen für die Rückmeldung angeben.";
  requireEmailOrPhone(input.contactEmail, input.contactPhone, errors);
  if (!input.hasPrescription && !hasText(input.note, 10)) {
    errors.note = "Ohne Rezept bitte kurz beschreiben, was vorbereitet werden soll.";
  }

  return result(errors);
};

export const validateUploadInput = (input: UploadInput): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!hasText(input.context)) errors.context = "Bitte den Versorgungskontext auswählen.";
  if (!hasText(input.contactName, 2)) errors.contactName = "Bitte einen Namen für die Rückmeldung angeben.";
  requireEmailOrPhone(input.contactEmail, input.contactPhone, errors);
  if (!hasText(input.fileName) || input.fileName === defaultUploadLabel) {
    errors.fileName = "Bitte eine Rezeptdatei auswählen.";
  } else {
    const fileError = getUploadFileSecurityError({
      name: input.fileName,
      size: input.fileSizeBytes ?? 0,
      type: input.fileType ?? "",
    });
    if (fileError) errors.fileName = fileError;
  }

  const missingConsent = getMissingConsentScopes(input.consentScopes);
  if (missingConsent.length > 0) {
    errors.consentScopes = "Bitte alle Einwilligungen für Rezeptupload und Gesundheitsdaten bestätigen.";
  }

  return result(errors);
};

export const validateAppointmentInput = (input: AppointmentRequestInput): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!hasText(input.concern)) errors.concern = "Bitte ein Anliegen auswählen.";
  if (!hasText(input.preferredDate)) errors.preferredDate = "Bitte ein Wunschdatum auswählen.";
  if (!hasText(input.preferredWindow)) errors.preferredWindow = "Bitte ein 1-Stunden-Zeitfenster auswählen.";
  if (!hasText(input.contactName, 2)) errors.contactName = "Bitte einen Namen für die Rückmeldung angeben.";
  requireEmailOrPhone(input.contactEmail, input.contactPhone, errors);

  if (!hasText(input.shortQuestionnaire, 10)) {
    errors.shortQuestionnaire = "Bitte den kurzen Fragebogen mit mindestens einem Satz ausfüllen.";
  }

  return result(errors);
};

export const validateContactInquiryInput = (input: ContactInquiryInput): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!hasText(input.topic)) errors.topic = "Bitte ein Thema auswählen.";
  if (!hasText(input.serviceContext)) errors.serviceContext = "Bitte einen Fachbereich auswählen.";
  if (!hasText(input.contactName, 2)) errors.contactName = "Bitte einen Namen für die Rückmeldung angeben.";
  requireEmailOrPhone(input.contactEmail, input.contactPhone, errors);

  if (input.preferredContactChannel === "email" && !hasText(input.contactEmail)) {
    errors.contactEmail = "Für den Antwortweg E-Mail bitte eine E-Mail-Adresse angeben.";
  }

  if ((input.preferredContactChannel === "phone" || input.preferredContactChannel === "whatsapp") && !hasText(input.contactPhone)) {
    errors.contactPhone = "Für Telefon oder WhatsApp bitte eine Telefonnummer angeben.";
  }

  if (input.containsHealthData && input.preferredContactChannel === "whatsapp") {
    errors.preferredContactChannel = "WhatsApp bitte nicht für Anfragen mit Gesundheitsdaten verwenden.";
  }

  if (!hasText(input.message, 10)) {
    errors.message = "Bitte eine kurze Nachricht mit mindestens einem Satz eingeben.";
  }

  return result(errors);
};
