import bodyBreasts from "./png/outline/body/breasts.png";
import bodyLymphNodes from "./png/outline/body/lymph_nodes.png";
import devicesCrutches from "./png/outline/devices/crutches.png";
import devicesOrthotics from "./png/outline/devices/orthotics.png";
import objectsPhone from "./png/outline/objects/phone.png";
import objectsPrescriptionDocument from "./png/outline/objects/prescription_document.png";
import symbolsForum from "./png/outline/symbols/forum.png";
import symbolsGeoLocation from "./png/outline/symbols/geo_location.png";
import symbolsHealthDataSecurity from "./png/outline/symbols/health_data_security.png";
import symbolsDocumentsAccepted from "./png/outline/symbols/i_documents_accepted.png";
import symbolsScheduleDateTime from "./png/outline/symbols/i_schedule_school_date_time.png";
import symbolsMedicalAdvice from "./png/outline/symbols/medical_advice.png";
import symbolsNappyDiaper from "./png/outline/symbols/nappy_diaper.png";
import symbolsPharmacy from "./png/outline/symbols/pharmacy.png";
import symbolsQuestionCircle from "./png/outline/symbols/question_circle.png";
import symbolsRx from "./png/outline/symbols/rx.png";
import symbolsSecureCommunication from "./png/outline/symbols/secure_communication.png";
import symbolsSecureUi from "./png/outline/symbols/ui_secure.png";
import symbolsYes from "./png/outline/symbols/yes.png";

type BundledImage = string | { src: string };

export const sharedIconRegistry = {
  "body/breasts": bodyBreasts,
  "body/lymph_nodes": bodyLymphNodes,
  "devices/crutches": devicesCrutches,
  "devices/orthotics": devicesOrthotics,
  "objects/phone": objectsPhone,
  "objects/prescription_document": objectsPrescriptionDocument,
  "symbols/forum": symbolsForum,
  "symbols/geo_location": symbolsGeoLocation,
  "symbols/health_data_security": symbolsHealthDataSecurity,
  "symbols/i_documents_accepted": symbolsDocumentsAccepted,
  "symbols/i_schedule_school_date_time": symbolsScheduleDateTime,
  "symbols/medical_advice": symbolsMedicalAdvice,
  "symbols/nappy_diaper": symbolsNappyDiaper,
  "symbols/pharmacy": symbolsPharmacy,
  "symbols/question_circle": symbolsQuestionCircle,
  "symbols/rx": symbolsRx,
  "symbols/secure_communication": symbolsSecureCommunication,
  "symbols/ui_secure": symbolsSecureUi,
  "symbols/yes": symbolsYes,
} satisfies Record<string, BundledImage>;

export type SharedIconName = keyof typeof sharedIconRegistry;

function normalizeIconSource(source: BundledImage) {
  return typeof source === "string" ? source : source.src;
}

export function getSharedIconSrc(name: SharedIconName) {
  return normalizeIconSource(sharedIconRegistry[name]);
}
