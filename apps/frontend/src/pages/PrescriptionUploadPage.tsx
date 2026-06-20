import { Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, FileUpload, FormControl, Text, TextField, View } from "reshaped";
import { SharedIconBox } from "../../../shared/icons/SharedIcon";
import type { TrackConversion } from "../app/routes";
import { ButtonText, FieldError, FormStep, IconBox, RequestReceipt, inputA11y } from "../components/common";
import { SecuritySidePanel } from "../components/SecuritySidePanel";
import { validateUploadInput } from "../lib/formValidation";
import { submitPublicRequest, type PublicRequestReceipt } from "../lib/publicRequestApi";
import {
  consentCopy,
  maxUploadFileSizeBytes,
  prescriptionUploadPolicy,
  uploadAcceptAttribute,
  uploadServerSecurityBoundary,
} from "../lib/privacySecurity";
import type { ConsentScope, UploadInput } from "../lib/types";

const defaultUploadLabel = "Noch keine Datei ausgewählt";
type UploadField = "context" | "fileName" | "consentScopes" | "contactName" | "contactEmail" | "contactPhone";

export default function PrescriptionUploadPage({ onConversion }: { onConversion: TrackConversion }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [consentScopes, setConsentScopes] = useState<ConsentScope[]>([]);
  const [uploadPaused, setUploadPaused] = useState(false);
  const [receipt, setReceipt] = useState<PublicRequestReceipt | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<UploadField, boolean>>({
    context: false,
    fileName: false,
    consentScopes: false,
    contactName: false,
    contactEmail: false,
    contactPhone: false,
  });
  const uploadInput: UploadInput = {
    fileName: selectedFile?.name ?? defaultUploadLabel,
    fileType: selectedFile?.type,
    fileSizeBytes: selectedFile?.size,
    context,
    contactName,
    contactEmail,
    contactPhone,
    consentScopes,
  };
  const validation = useMemo(
    () => validateUploadInput(uploadInput),
    [
      uploadInput.fileName,
      uploadInput.fileType,
      uploadInput.fileSizeBytes,
      uploadInput.context,
      uploadInput.contactName,
      uploadInput.contactEmail,
      uploadInput.contactPhone,
      uploadInput.consentScopes,
    ],
  );
  const errors = validation.fieldErrors;
  const visibleErrors = Object.fromEntries(
    Object.entries(errors).filter(([field]) => submitted || touched[field as UploadField]),
  );
  const markTouched = (field: UploadField) => setTouched((current) => ({ ...current, [field]: true }));
  const toggleConsentScope = (scope: ConsentScope) => {
    markTouched("consentScopes");
    setConsentScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  };

  const submit = async () => {
    setSubmitted(true);
    setSubmitError("");
    if (!validation.valid) {
      setTouched({
        context: true,
        fileName: true,
        consentScopes: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
      });
      return;
    }
    if (!selectedFile) return;
    setIsSubmitting(true);
    try {
      const requestReceipt = await submitPublicRequest({
        type: "document",
        context,
        fileExtension: extensionFromFileName(selectedFile.name),
        mimeType: mimeTypeForFile(selectedFile),
        sizeBytes: selectedFile.size,
        consentAccepted: true,
        contactName,
        contactEmail,
        contactPhone,
      });
      setReceipt(requestReceipt);
      setUploadPaused(true);
      onConversion({ stage: "request-submitted", route: "/rezept-upload" });
    } catch {
      setSubmitError("Die Rezept-/Dokumentenanfrage konnte nicht übertragen werden. Bitte prüfen Sie Ihre Angaben oder nutzen Sie Telefon/E-Mail.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <Text as="h1" variant="featured-1" weight="semibold">
            Rezept vorab einreichen
          </Text>
          <Text color="neutral-faded">
            Aktuell wird keine Datei an saniPEP übertragen. Die Auswahl bleibt lokal im Browser und dient nur der Vorprüfung von Dateityp, Größe und Einwilligung.
          </Text>
          <div className="formPanel">
            <View direction="column" gap={5} padding={6}>
              <FormStep number={1} title="Versorgung zuordnen" copy="Der Kontext steuert nur die Mitarbeiterqueue und wird nicht in Analytics übernommen.">
                <label>
                  <Text variant="body-2" weight="medium">Kontext</Text>
                  <select className="nativeSelect" value={context} onBlur={() => markTouched("context")} onChange={(event) => setContext(event.target.value)} {...inputA11y("context", visibleErrors)}>
                    <option value="">Bitte auswählen</option>
                    <option>Kompressionsversorgung</option>
                    <option>Brustprothetik</option>
                    <option>Inkontinenzversorgung</option>
                    <option>Pflegehilfsmittel</option>
                    <option>Bandage/Orthese/Reha/Stoma</option>
                  </select>
                  <FieldError id="context-error" error={visibleErrors.context} />
                </label>
              </FormStep>
              <FormStep number={2} title="Rezept auswählen" copy={`Nur lokale Vorprüfung, keine Dateiübertragung. Zugelassen: ${prescriptionUploadPolicy.acceptedFileTypes.join(", ")} bis ${prescriptionUploadPolicy.maxFileSizeMb} MB.`}>
                <FileUpload
                  name="prescription"
                  onChange={({ value }) => {
                    markTouched("fileName");
                    setSelectedFile(value[0] ?? null);
                  }}
                  inputAttributes={{
                    accept: uploadAcceptAttribute,
                    "data-max-file-size": String(maxUploadFileSizeBytes),
                    ...inputA11y("fileName", visibleErrors),
                  }}
                >
                  {({ highlighted }) => (
                    <div className="uploadDrop" style={{ background: highlighted ? "var(--sani-brand-soft)" : "var(--sani-page)" }}>
                      <View direction="column" gap={2} align="center">
                        <IconBox icon={Upload} />
                        <Text weight="semibold">Datei lokal auswählen</Text>
                        <Text variant="body-2" color="neutral-faded">
                          {selectedFile ? selectedFile.name : "Noch keine Datei lokal ausgewählt"}
                        </Text>
                      </View>
                    </div>
                  )}
                </FileUpload>
                <FieldError id="fileName-error" error={visibleErrors.fileName} />
              </FormStep>
              <FormStep number={3} title="Einwilligung bestätigen" copy="Alle Scopes müssen aktiv bestätigt werden.">
                <View direction="column" gap={3}>
                  {prescriptionUploadPolicy.consentScopes.map((scope) => (
                    <label className="consentLine" key={scope}>
                      <input
                        type="checkbox"
                        checked={consentScopes.includes(scope)}
                        onChange={() => toggleConsentScope(scope)}
                        {...inputA11y("consentScopes", visibleErrors)}
                      />
                      <Text variant="body-2">{consentCopy[scope]}</Text>
                    </label>
                  ))}
                  <FieldError id="consentScopes-error" error={visibleErrors.consentScopes} />
                </View>
              </FormStep>
              <FormStep number={4} title="Kontakt für Rückmeldung" copy="Mindestens E-Mail oder Telefon ist erforderlich.">
                <div className="formGrid">
                  <FormControl>
                    <FormControl.Label>Name</FormControl.Label>
                    <TextField name="documentContactName" value={contactName} onChange={({ value }) => setContactName(value)} inputAttributes={{ onBlur: () => markTouched("contactName"), ...inputA11y("contactName", visibleErrors) }} />
                    <FieldError id="contactName-error" error={visibleErrors.contactName} />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>E-Mail</FormControl.Label>
                    <TextField name="documentContactEmail" value={contactEmail} onChange={({ value }) => setContactEmail(value)} inputAttributes={{ type: "email", onBlur: () => markTouched("contactEmail"), ...inputA11y("contactEmail", visibleErrors) }} />
                    <FieldError id="contactEmail-error" error={visibleErrors.contactEmail} />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>Telefon</FormControl.Label>
                    <TextField name="documentContactPhone" value={contactPhone} onChange={({ value }) => setContactPhone(value)} inputAttributes={{ onBlur: () => markTouched("contactPhone"), ...inputA11y("contactPhone", visibleErrors) }} />
                    <FieldError id="contactPhone-error" error={visibleErrors.contactPhone} />
                  </FormControl>
                </div>
              </FormStep>
              <div className="privacyNote">
                <SharedIconBox name="symbols/health_data_security" />
                <Text variant="body-2">
                  Upload bleibt blockiert. Übertragen werden nur Anfrage- und Dateimetadaten; vor Produktion erforderlich: {uploadServerSecurityBoundary.requiredServerChecks.join(", ")}.
                </Text>
              </div>
              <Button color="primary" onClick={submit} disabled={!validation.valid || isSubmitting}>
                <ButtonText icon={Upload}>{isSubmitting ? "Wird gesendet" : "Metadaten-Anfrage senden"}</ButtonText>
              </Button>
              {submitError && <p className="fieldError" role="alert">{submitError}</p>}
              {receipt && <RequestReceipt id={receipt.id} />}
              {uploadPaused && (
                <div className="safeRow" role="status" aria-live="polite">
                  <Text weight="semibold">Keine Datei übertragen</Text>
                  <Text variant="body-2" color="neutral-faded">
                    Produktiver Datei-Upload bleibt gesperrt. Die Anfrage enthält nur Metadaten und wartet auf Mitarbeiterprüfung.
                  </Text>
                </div>
              )}
            </View>
          </div>
        </View>
        <SecuritySidePanel />
      </div>
    </section>
  );
}

function extensionFromFileName(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function mimeTypeForFile(file: File) {
  if (file.type) return file.type;
  const extension = extensionFromFileName(file.name);
  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  return "";
}
