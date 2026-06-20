import { Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, FileUpload, Text, View } from "reshaped";
import { SharedIconBox } from "../../../shared/icons/SharedIcon";
import { ButtonText, FieldError, FormStep, IconBox, inputA11y } from "../components/common";
import { SecuritySidePanel } from "../components/SecuritySidePanel";
import { validateUploadInput } from "../lib/formValidation";
import {
  consentCopy,
  maxUploadFileSizeBytes,
  prescriptionUploadPolicy,
  uploadAcceptAttribute,
  uploadServerSecurityBoundary,
} from "../lib/privacySecurity";
import type { ConsentScope, UploadInput } from "../lib/types";

const defaultUploadLabel = "Noch keine Datei ausgewählt";

export default function PrescriptionUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [consentScopes, setConsentScopes] = useState<ConsentScope[]>([]);
  const [uploadPaused, setUploadPaused] = useState(false);
  const uploadInput: UploadInput = {
    fileName: selectedFile?.name ?? defaultUploadLabel,
    fileType: selectedFile?.type,
    fileSizeBytes: selectedFile?.size,
    context,
    consentScopes,
  };
  const validation = useMemo(
    () => validateUploadInput(uploadInput),
    [uploadInput.fileName, uploadInput.fileType, uploadInput.fileSizeBytes, uploadInput.context, uploadInput.consentScopes],
  );
  const errors = validation.fieldErrors;
  const toggleConsentScope = (scope: ConsentScope) => {
    setConsentScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  };

  const submit = () => {
    if (!validation.valid) return;
    setUploadPaused(true);
  };

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <Text as="h1" variant="featured-1" weight="semibold">
            Rezeptupload
          </Text>
          <Text color="neutral-faded">
            Consent startet leer. Dateityp und Größe werden vor dem Request geprüft; serverseitige Prüfung bleibt verpflichtend.
          </Text>
          <div className="formPanel">
            <View direction="column" gap={5} padding={6}>
              <FormStep number={1} title="Versorgung zuordnen" copy="Der Kontext steuert nur die Mitarbeiterqueue und wird nicht in Analytics übernommen.">
                <label>
                  <Text variant="body-2" weight="medium">Kontext</Text>
                  <select className="nativeSelect" value={context} onChange={(event) => setContext(event.target.value)} {...inputA11y("context", errors)}>
                    <option value="">Bitte auswählen</option>
                    <option>Kompressionsversorgung</option>
                    <option>Brustprothetik</option>
                    <option>Inkontinenzversorgung</option>
                    <option>Pflegehilfsmittel</option>
                    <option>Bandage/Orthese/Reha/Stoma</option>
                  </select>
                  <FieldError id="context-error" error={errors.context} />
                </label>
              </FormStep>
              <FormStep number={2} title="Rezept auswählen" copy={`Zugelassen: ${prescriptionUploadPolicy.acceptedFileTypes.join(", ")} bis ${prescriptionUploadPolicy.maxFileSizeMb} MB.`}>
                <FileUpload
                  name="prescription"
                  onChange={({ value }) => setSelectedFile(value[0] ?? null)}
                  inputAttributes={{
                    accept: uploadAcceptAttribute,
                    "data-max-file-size": String(maxUploadFileSizeBytes),
                    ...inputA11y("fileName", errors),
                  }}
                >
                  {({ highlighted }) => (
                    <div className="uploadDrop" style={{ background: highlighted ? "var(--sani-brand-soft)" : "var(--sani-page)" }}>
                      <View direction="column" gap={2} align="center">
                        <IconBox icon={Upload} />
                        <Text weight="semibold">Datei hier ablegen oder auswählen</Text>
                        <Text variant="body-2" color="neutral-faded">
                          {selectedFile?.name ?? defaultUploadLabel}
                        </Text>
                      </View>
                    </div>
                  )}
                </FileUpload>
                <FieldError id="fileName-error" error={errors.fileName} />
              </FormStep>
              <FormStep number={3} title="Einwilligung bestätigen" copy="Alle Scopes müssen aktiv bestätigt werden.">
                <View direction="column" gap={3}>
                  {prescriptionUploadPolicy.consentScopes.map((scope) => (
                    <label className="consentLine" key={scope}>
                      <input
                        type="checkbox"
                        checked={consentScopes.includes(scope)}
                        onChange={() => toggleConsentScope(scope)}
                        {...inputA11y("consentScopes", errors)}
                      />
                      <Text variant="body-2">{consentCopy[scope]}</Text>
                    </label>
                  ))}
                  <FieldError id="consentScopes-error" error={errors.consentScopes} />
                </View>
              </FormStep>
              <div className="privacyNote">
                <SharedIconBox name="symbols/health_data_security" />
                <Text variant="body-2">
                  Serverpflicht: {uploadServerSecurityBoundary.requiredServerChecks.join(", ")}.
                </Text>
              </div>
              <Button color="primary" onClick={submit} disabled={!validation.valid}>
                <ButtonText icon={Upload}>Upload-Anfrage erzeugen</ButtonText>
              </Button>
              {uploadPaused && (
                <div className="safeRow" role="status" aria-live="polite">
                  <Text weight="semibold">Upload noch nicht übertragen</Text>
                  <Text variant="body-2" color="neutral-faded">
                    Produktiver Datei-Upload bleibt gesperrt, bis Quarantäne, MIME-Prüfung, AV-Scan, Retention und Clean-Bucket umgesetzt sind.
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
