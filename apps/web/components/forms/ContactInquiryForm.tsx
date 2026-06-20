"use client";

import { Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, FormControl, Text, TextArea, TextField, View } from "reshaped";
import { validateContactInquiryInput } from "@frontend/lib/formValidation";
import type { ContactInquiryInput } from "@frontend/lib/types";
import { submitPublicRequest, type PublicRequestReceipt } from "@/lib/publicRequests";
import { SharedIconBox } from "../../../shared/icons/SharedIcon";
import { ButtonText, FieldError, FormStep, RequestReceipt, inputA11y } from "../common";
import { trackPublicConversion } from "./trackPublicConversion";

export function ContactInquiryForm() {
  const [input, setInput] = useState<ContactInquiryInput>({
    topic: "",
    serviceContext: "",
    message: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    preferredContactChannel: "email",
    containsHealthData: false,
  });
  const [receipt, setReceipt] = useState<PublicRequestReceipt | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const validation = useMemo(() => validateContactInquiryInput(input), [input]);
  const errors = validation.fieldErrors;
  const update = (key: keyof ContactInquiryInput, value: string | boolean) => setInput((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    setSubmitError("");
    if (!validation.valid) return;
    setIsSubmitting(true);
    try {
      const requestReceipt = await submitPublicRequest({
        type: "contact",
        topic: input.topic,
        serviceContext: input.serviceContext,
        message: input.message,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        preferredContactChannel: input.preferredContactChannel,
        containsHealthData: input.containsHealthData,
      });
      setReceipt(requestReceipt);
      trackPublicConversion({ stage: "request-submitted", route: "/kontakt" });
    } catch {
      setSubmitError("Die Anfrage konnte nicht übertragen werden. Bitte prüfen Sie Ihre Angaben oder nutzen Sie Telefon/E-Mail.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="formPanel">
      <View direction="column" gap={5} padding={6}>
        <View direction="row" gap={3} align="center">
          <SharedIconBox name="symbols/secure_communication" />
          <View direction="column" gap={1}>
            <Text as="h2" variant="featured-5" weight="semibold">Schriftliche Anfrage</Text>
            <Text variant="body-2" color="neutral-faded">Für Rückfragen, Vorabklärung und Kontaktwünsche.</Text>
          </View>
        </View>
        <FormStep number={1} title="Anfrage zuordnen" copy="Thema und Fachbereich helfen bei der qualifizierten Rückmeldung.">
          <div className="formGrid">
            <label>
              <Text variant="body-2" weight="medium">Thema</Text>
              <select className="nativeSelect" value={input.topic} onChange={(event) => update("topic", event.target.value)} {...inputA11y("topic", errors)}>
                <option value="">Bitte auswählen</option>
                <option>Allgemeine Anfrage</option>
                <option>Rückfrage zu Rezept</option>
                <option>Neue Versorgung</option>
                <option>Lieferung oder Status</option>
                <option>Rückrufwunsch</option>
              </select>
              <FieldError id="topic-error" error={errors.topic} />
            </label>
            <label>
              <Text variant="body-2" weight="medium">Fachbereich</Text>
              <select className="nativeSelect" value={input.serviceContext} onChange={(event) => update("serviceContext", event.target.value)} {...inputA11y("serviceContext", errors)}>
                <option value="">Bitte auswählen</option>
                <option>Kompression</option>
                <option>Brustprothetik</option>
                <option>Inkontinenz & Pflege</option>
                <option>Bandagen/Orthesen/Reha/Stoma</option>
              </select>
              <FieldError id="serviceContext-error" error={errors.serviceContext} />
            </label>
          </div>
        </FormStep>
        <FormStep number={2} title="Kontaktweg festlegen" copy="WhatsApp ist für Gesundheitsdaten gesperrt.">
          <div className="formGrid">
            <FormControl>
              <FormControl.Label>Name</FormControl.Label>
              <TextField name="contactInquiryName" value={input.contactName} onChange={({ value }) => update("contactName", value)} inputAttributes={inputA11y("contactName", errors)} />
              <FieldError id="contactName-error" error={errors.contactName} />
            </FormControl>
            <FormControl>
              <FormControl.Label>E-Mail</FormControl.Label>
              <TextField name="contactInquiryEmail" value={input.contactEmail} onChange={({ value }) => update("contactEmail", value)} inputAttributes={{ type: "email", ...inputA11y("contactEmail", errors) }} />
              <FieldError id="contactEmail-error" error={errors.contactEmail} />
            </FormControl>
            <FormControl>
              <FormControl.Label>Telefon</FormControl.Label>
              <TextField name="contactInquiryPhone" value={input.contactPhone} onChange={({ value }) => update("contactPhone", value)} inputAttributes={inputA11y("contactPhone", errors)} />
              <FieldError id="contactPhone-error" error={errors.contactPhone} />
            </FormControl>
            <label>
              <Text variant="body-2" weight="medium">Antwortweg</Text>
              <select className="nativeSelect" value={input.preferredContactChannel} onChange={(event) => update("preferredContactChannel", event.target.value)} {...inputA11y("preferredContactChannel", errors)}>
                <option value="email">E-Mail</option>
                <option value="phone">Telefon</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <FieldError id="preferredContactChannel-error" error={errors.preferredContactChannel} />
            </label>
          </div>
        </FormStep>
        <FormStep number={3} title="Nachricht senden" copy="Bitte keine unnötigen medizinischen Details im freien Text.">
          <div className="formGrid">
            <FormControl>
              <FormControl.Label>Nachricht</FormControl.Label>
              <TextArea name="contactInquiryMessage" value={input.message} onChange={({ value }) => update("message", value)} placeholder="Worum geht es?" resize="auto" inputAttributes={inputA11y("message", errors)} />
              <FieldError id="message-error" error={errors.message} />
            </FormControl>
            <label>
              <Text variant="body-2" weight="medium">Enthält Gesundheitsdaten?</Text>
              <select className="nativeSelect" value={input.containsHealthData ? "ja" : "nein"} onChange={(event) => update("containsHealthData", event.target.value === "ja")}>
                <option value="nein">nein / allgemeine Anfrage</option>
                <option value="ja">ja, bitte geschützt prüfen</option>
              </select>
            </label>
          </div>
        </FormStep>
        <Button color="primary" onClick={submit} disabled={!validation.valid || isSubmitting}>
          <ButtonText icon={Mail}>{isSubmitting ? "Wird gesendet" : "Anfrage senden"}</ButtonText>
        </Button>
        {submitError && <p className="fieldError" role="alert">{submitError}</p>}
        {receipt && <RequestReceipt id={receipt.id} />}
      </View>
    </div>
  );
}
