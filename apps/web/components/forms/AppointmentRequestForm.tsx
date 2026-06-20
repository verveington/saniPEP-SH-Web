"use client";

import { Calendar } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, FormControl, Text, TextArea, TextField, View } from "reshaped";
import { validateAppointmentInput } from "@frontend/lib/formValidation";
import type { AppointmentRequestInput } from "@frontend/lib/types";
import { submitPublicRequest, type PublicRequestReceipt } from "@/lib/publicRequests";
import { ButtonText, FieldError, FormStep, RequestReceipt, inputA11y } from "../common";
import { SecuritySidePanel } from "../SecuritySidePanel";
import { trackPublicConversion } from "./trackPublicConversion";

export function AppointmentRequestForm() {
  const [input, setInput] = useState<AppointmentRequestInput>({
    concern: "",
    preferredDate: "",
    preferredWindow: "",
    hasPrescription: false,
    shortQuestionnaire: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [receipt, setReceipt] = useState<PublicRequestReceipt | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<keyof AppointmentRequestInput, boolean>>({
    concern: false,
    preferredDate: false,
    preferredWindow: false,
    hasPrescription: false,
    shortQuestionnaire: false,
    contactName: false,
    contactEmail: false,
    contactPhone: false,
  });
  const validation = useMemo(() => validateAppointmentInput(input), [input]);
  const errors = validation.fieldErrors;
  const visibleErrors = Object.fromEntries(
    Object.entries(errors).filter(([field]) => submitted || touched[field as keyof AppointmentRequestInput]),
  );
  const update = (key: keyof AppointmentRequestInput, value: string | boolean) => setInput((current) => ({ ...current, [key]: value }));
  const markTouched = (key: keyof AppointmentRequestInput) => setTouched((current) => ({ ...current, [key]: true }));
  const submit = async () => {
    setSubmitted(true);
    setSubmitError("");
    if (!validation.valid) {
      setTouched({
        concern: true,
        preferredDate: true,
        preferredWindow: true,
        hasPrescription: true,
        shortQuestionnaire: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const requestReceipt = await submitPublicRequest({
        type: "appointment",
        concern: input.concern,
        preferredDate: input.preferredDate,
        preferredWindow: input.preferredWindow,
        hasPrescription: input.hasPrescription,
        shortQuestionnaire: input.shortQuestionnaire,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      });
      setReceipt(requestReceipt);
      trackPublicConversion({ stage: "request-submitted", route: "/termin-anfragen" });
    } catch {
      setSubmitError("Die Terminanfrage konnte nicht übertragen werden. Bitte prüfen Sie Ihre Angaben oder nutzen Sie Telefon/E-Mail.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <Text as="h1" variant="featured-1" weight="semibold">
            Terminanfrage mit Wunschtermin
          </Text>
          <Text color="neutral-faded">
            Patienten wählen Datum, Zeitfenster und Kontaktweg. Die Bestätigung erfolgt durch Mitarbeiter.
          </Text>
          <div className="formPanel">
            <View direction="column" gap={5} padding={6}>
              <FormStep number={1} title="Anliegen wählen" copy="Das Anliegen wird nicht in Analytics übernommen.">
                <div className="formGrid">
                  <label>
                    <Text variant="body-2" weight="medium">Anliegen</Text>
                    <select className="nativeSelect" value={input.concern} onBlur={() => markTouched("concern")} onChange={(event) => update("concern", event.target.value)} {...inputA11y("concern", visibleErrors)}>
                      <option value="">Bitte auswählen</option>
                      <option>Erstberatung</option>
                      <option>Kontrolltermin</option>
                      <option>Rezeptbesprechung</option>
                      <option>Rückfrage</option>
                    </select>
                    <FieldError id="concern-error" error={visibleErrors.concern} />
                  </label>
                  <label>
                    <Text variant="body-2" weight="medium">Rezept</Text>
                    <select className="nativeSelect" value={input.hasPrescription ? "ja" : "nein"} onChange={(event) => update("hasPrescription", event.target.value === "ja")}>
                      <option value="nein">noch nicht vorhanden</option>
                      <option value="ja">vorhanden, Upload empfohlen</option>
                    </select>
                  </label>
                </div>
              </FormStep>
              <FormStep number={2} title="Wunschfenster nennen" copy="Es entsteht nur ein Terminwunsch.">
                <div className="formGrid">
                  <FormControl>
                    <FormControl.Label>Wunschdatum</FormControl.Label>
                    <TextField name="preferredDate" value={input.preferredDate} onChange={({ value }) => update("preferredDate", value)} inputAttributes={{ type: "date", onBlur: () => markTouched("preferredDate"), ...inputA11y("preferredDate", visibleErrors) }} />
                    <FieldError id="preferredDate-error" error={visibleErrors.preferredDate} />
                  </FormControl>
                  <label>
                    <Text variant="body-2" weight="medium">1-Stunden-Fenster</Text>
                    <select className="nativeSelect" value={input.preferredWindow} onBlur={() => markTouched("preferredWindow")} onChange={(event) => update("preferredWindow", event.target.value)} {...inputA11y("preferredWindow", visibleErrors)}>
                      <option value="">Bitte auswählen</option>
                      <option>08:00 - 09:00</option>
                      <option>10:00 - 11:00</option>
                      <option>13:00 - 14:00</option>
                      <option>16:00 - 17:00</option>
                    </select>
                    <FieldError id="preferredWindow-error" error={visibleErrors.preferredWindow} />
                  </label>
                </div>
              </FormStep>
              <FormStep number={3} title="Kontakt und Fragebogen" copy="Mindestens E-Mail oder Telefon ist erforderlich.">
                <div className="formGrid">
                  <FormControl>
                    <FormControl.Label>Name</FormControl.Label>
                    <TextField name="contactName" value={input.contactName} onChange={({ value }) => update("contactName", value)} inputAttributes={{ onBlur: () => markTouched("contactName"), ...inputA11y("contactName", visibleErrors) }} />
                    <FieldError id="contactName-error" error={visibleErrors.contactName} />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>E-Mail</FormControl.Label>
                    <TextField name="contactEmail" value={input.contactEmail} onChange={({ value }) => update("contactEmail", value)} inputAttributes={{ type: "email", onBlur: () => markTouched("contactEmail"), ...inputA11y("contactEmail", visibleErrors) }} />
                    <FieldError id="contactEmail-error" error={visibleErrors.contactEmail} />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>Telefon</FormControl.Label>
                    <TextField name="contactPhone" value={input.contactPhone} onChange={({ value }) => update("contactPhone", value)} inputAttributes={{ onBlur: () => markTouched("contactPhone"), ...inputA11y("contactPhone", visibleErrors) }} />
                    <FieldError id="contactPhone-error" error={visibleErrors.contactPhone} />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>Kurzer Fragebogen</FormControl.Label>
                    <TextArea name="shortQuestionnaire" value={input.shortQuestionnaire} onChange={({ value }) => update("shortQuestionnaire", value)} placeholder="Was ist Ihr Anliegen, was soll vorbereitet werden?" resize="auto" inputAttributes={{ onBlur: () => markTouched("shortQuestionnaire"), ...inputA11y("shortQuestionnaire", visibleErrors) }} />
                    <FieldError id="shortQuestionnaire-error" error={visibleErrors.shortQuestionnaire} />
                  </FormControl>
                </div>
              </FormStep>
              <Button color="primary" onClick={submit} disabled={!validation.valid || isSubmitting}>
                <ButtonText icon={Calendar}>{isSubmitting ? "Wird gesendet" : "Terminanfrage senden"}</ButtonText>
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
