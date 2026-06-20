"use client";

import { Clipboard } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, FormControl, Text, TextArea, TextField, View } from "reshaped";
import { validateCareConfigurationInput } from "@frontend/lib/formValidation";
import type { CareConfigurationInput } from "@frontend/lib/types";
import { submitPublicRequest, type PublicRequestReceipt } from "@/lib/publicRequests";
import { ButtonText, FieldError, FormStep, RequestReceipt, inputA11y } from "../common";
import { SecuritySidePanel } from "../SecuritySidePanel";
import { trackPublicConversion } from "./trackPublicConversion";

export function CareConfiguratorForm() {
  const [input, setInput] = useState<CareConfigurationInput>({
    need: "",
    rhythm: "",
    hasPrescription: false,
    note: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [receipt, setReceipt] = useState<PublicRequestReceipt | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const validation = useMemo(() => validateCareConfigurationInput(input), [input]);
  const errors = validation.fieldErrors;
  const update = (key: keyof CareConfigurationInput, value: string | boolean) => setInput((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setSubmitError("");
    if (!validation.valid) return;
    setIsSubmitting(true);
    try {
      const requestReceipt = await submitPublicRequest({
        type: "care",
        need: input.need,
        rhythm: input.rhythm,
        hasPrescription: input.hasPrescription,
        note: input.note,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      });
      setReceipt(requestReceipt);
      trackPublicConversion({ stage: "request-submitted", route: "/inkontinenz-pflegehilfsmittel" });
    } catch {
      setSubmitError("Die Versorgungsanfrage konnte nicht übertragen werden. Bitte prüfen Sie Ihre Angaben oder nutzen Sie Telefon/E-Mail.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <Text as="h1" variant="featured-1" weight="semibold">
            Inkontinenz & Pflegehilfsmittel konfigurieren
          </Text>
          <Text color="neutral-faded">
            Der Flow erzeugt nur eine prüfbare Anfrage. Ohne gültige Pflichtfelder wird kein Request erzeugt.
          </Text>
          <div className="formPanel">
            <View direction="column" gap={5} padding={6}>
              <FormStep number={1} title="Bedarf einordnen" copy="Wiederkehrende Versorgung wird als prüfbare Anfrage vorbereitet.">
                <div className="formGrid">
                  <label>
                    <Text variant="body-2" weight="medium">Bedarf</Text>
                    <select className="nativeSelect" value={input.need} onChange={(event) => update("need", event.target.value)} {...inputA11y("need", errors)}>
                      <option value="">Bitte auswählen</option>
                      <option>Inkontinenzversorgung</option>
                      <option>Pflegehilfsmittel Pauschale</option>
                      <option>Kombinierte Anfrage</option>
                    </select>
                    <FieldError id="need-error" error={errors.need} />
                  </label>
                  <label>
                    <Text variant="body-2" weight="medium">Gewünschter Rhythmus</Text>
                    <select className="nativeSelect" value={input.rhythm} onChange={(event) => update("rhythm", event.target.value)} {...inputA11y("rhythm", errors)}>
                      <option value="">Bitte auswählen</option>
                      <option>monatlich</option>
                      <option>alle 2 Monate</option>
                      <option>nur einmalig</option>
                    </select>
                    <FieldError id="rhythm-error" error={errors.rhythm} />
                  </label>
                  <label>
                    <Text variant="body-2" weight="medium">Rezept vorhanden?</Text>
                    <select className="nativeSelect" value={input.hasPrescription ? "ja" : "nein"} onChange={(event) => update("hasPrescription", event.target.value === "ja")}>
                      <option value="nein">nein, ich reiche nach</option>
                      <option value="ja">ja</option>
                    </select>
                  </label>
                </div>
              </FormStep>
              <FormStep number={2} title="Hinweis ergänzen" copy="Ohne Rezept ist eine kurze Beschreibung erforderlich.">
                <FormControl>
                  <FormControl.Label>Kurze Beschreibung</FormControl.Label>
                  <TextArea
                    name="careNote"
                    value={input.note}
                    onChange={({ value }) => update("note", value)}
                    placeholder="z. B. bisherige Versorgung, Lieferwunsch, Rückrufzeit"
                    resize="auto"
                    inputAttributes={inputA11y("note", errors)}
                  />
                  <FieldError id="note-error" error={errors.note} />
                </FormControl>
              </FormStep>
              <FormStep number={3} title="Kontakt für Rückmeldung" copy="Mindestens E-Mail oder Telefon ist erforderlich.">
                <div className="formGrid">
                  <FormControl>
                    <FormControl.Label>Name</FormControl.Label>
                    <TextField name="careContactName" value={input.contactName} onChange={({ value }) => update("contactName", value)} inputAttributes={inputA11y("contactName", errors)} />
                    <FieldError id="contactName-error" error={errors.contactName} />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>E-Mail</FormControl.Label>
                    <TextField name="careContactEmail" value={input.contactEmail} onChange={({ value }) => update("contactEmail", value)} inputAttributes={{ type: "email", ...inputA11y("contactEmail", errors) }} />
                    <FieldError id="contactEmail-error" error={errors.contactEmail} />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>Telefon</FormControl.Label>
                    <TextField name="careContactPhone" value={input.contactPhone} onChange={({ value }) => update("contactPhone", value)} inputAttributes={inputA11y("contactPhone", errors)} />
                    <FieldError id="contactPhone-error" error={errors.contactPhone} />
                  </FormControl>
                </div>
              </FormStep>
              <Button color="primary" onClick={submit} disabled={!validation.valid || isSubmitting}>
                <ButtonText icon={Clipboard}>{isSubmitting ? "Wird gesendet" : "Bestellanfrage vorbereiten"}</ButtonText>
              </Button>
              {submitError && <p className="fieldError" role="alert">{submitError}</p>}
              {receipt && <RequestReceipt id={receipt.id} />}
            </View>
          </div>
        </View>
        <SecuritySidePanel />
      </div>
    </section>
  );
}
