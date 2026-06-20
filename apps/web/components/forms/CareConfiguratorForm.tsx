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
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<keyof CareConfigurationInput, boolean>>({
    need: false,
    rhythm: false,
    hasPrescription: false,
    note: false,
    contactName: false,
    contactEmail: false,
    contactPhone: false,
  });
  const validation = useMemo(() => validateCareConfigurationInput(input), [input]);
  const errors = validation.fieldErrors;
  const visibleErrors = Object.fromEntries(
    Object.entries(errors).filter(([field]) => submitted || touched[field as keyof CareConfigurationInput]),
  );
  const update = (key: keyof CareConfigurationInput, value: string | boolean) => setInput((current) => ({ ...current, [key]: value }));
  const markTouched = (key: keyof CareConfigurationInput) => setTouched((current) => ({ ...current, [key]: true }));

  const submit = async () => {
    setSubmitted(true);
    setSubmitError("");
    if (!validation.valid) {
      setTouched({
        need: true,
        rhythm: true,
        hasPrescription: true,
        note: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
      });
      return;
    }
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
                    <select className="nativeSelect" value={input.need} onBlur={() => markTouched("need")} onChange={(event) => update("need", event.target.value)} {...inputA11y("need", visibleErrors)}>
                      <option value="">Bitte auswählen</option>
                      <option>Inkontinenzversorgung</option>
                      <option>Pflegehilfsmittel Pauschale</option>
                      <option>Kombinierte Anfrage</option>
                    </select>
                    <FieldError id="need-error" error={visibleErrors.need} />
                  </label>
                  <label>
                    <Text variant="body-2" weight="medium">Gewünschter Rhythmus</Text>
                    <select className="nativeSelect" value={input.rhythm} onBlur={() => markTouched("rhythm")} onChange={(event) => update("rhythm", event.target.value)} {...inputA11y("rhythm", visibleErrors)}>
                      <option value="">Bitte auswählen</option>
                      <option>monatlich</option>
                      <option>alle 2 Monate</option>
                      <option>nur einmalig</option>
                    </select>
                    <FieldError id="rhythm-error" error={visibleErrors.rhythm} />
                  </label>
                  <label>
                    <Text variant="body-2" weight="medium">Rezept vorhanden?</Text>
                    <select className="nativeSelect" value={input.hasPrescription ? "ja" : "nein"} onBlur={() => markTouched("hasPrescription")} onChange={(event) => update("hasPrescription", event.target.value === "ja")}>
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
                    inputAttributes={{ onBlur: () => markTouched("note"), ...inputA11y("note", visibleErrors) }}
                  />
                  <FieldError id="note-error" error={visibleErrors.note} />
                </FormControl>
              </FormStep>
              <FormStep number={3} title="Kontakt für Rückmeldung" copy="Mindestens E-Mail oder Telefon ist erforderlich.">
                <div className="formGrid">
                  <FormControl>
                    <FormControl.Label>Name</FormControl.Label>
                    <TextField name="careContactName" value={input.contactName} onChange={({ value }) => update("contactName", value)} inputAttributes={{ onBlur: () => markTouched("contactName"), ...inputA11y("contactName", visibleErrors) }} />
                    <FieldError id="contactName-error" error={visibleErrors.contactName} />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>E-Mail</FormControl.Label>
                    <TextField name="careContactEmail" value={input.contactEmail} onChange={({ value }) => update("contactEmail", value)} inputAttributes={{ type: "email", onBlur: () => markTouched("contactEmail"), ...inputA11y("contactEmail", visibleErrors) }} />
                    <FieldError id="contactEmail-error" error={visibleErrors.contactEmail} />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>Telefon</FormControl.Label>
                    <TextField name="careContactPhone" value={input.contactPhone} onChange={({ value }) => update("contactPhone", value)} inputAttributes={{ onBlur: () => markTouched("contactPhone"), ...inputA11y("contactPhone", visibleErrors) }} />
                    <FieldError id="contactPhone-error" error={visibleErrors.contactPhone} />
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
