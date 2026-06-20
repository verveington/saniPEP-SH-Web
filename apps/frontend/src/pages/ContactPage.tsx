import { Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, FormControl, Text, TextArea, TextField, View } from "reshaped";
import type { Navigate, TrackConversion } from "../app/routes";
import { SharedIconBox } from "../../../shared/icons/SharedIcon";
import { ButtonText, FieldError, FormStep, RequestReceipt, inputA11y } from "../components/common";
import { LocationContact } from "../components/LocationContact";
import { SecuritySidePanel } from "../components/SecuritySidePanel";
import { validateContactInquiryInput } from "../lib/formValidation";
import { submitPublicRequest, type PublicRequestReceipt } from "../lib/publicRequestApi";
import type { ContactInquiryInput } from "../lib/types";

export default function ContactPage({ navigate, onConversion }: { navigate: Navigate; onConversion: TrackConversion }) {
  return (
    <>
      <LocationContact navigate={navigate} standalone />
      <section className="sectionTight" style={{ background: "var(--sani-page)" }}>
        <div className="sectionInner gridTwo">
          <ContactInquiryForm onConversion={onConversion} />
          <SecuritySidePanel />
        </div>
      </section>
    </>
  );
}

function ContactInquiryForm({ onConversion }: { onConversion: TrackConversion }) {
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
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<keyof ContactInquiryInput, boolean>>({
    topic: false,
    serviceContext: false,
    message: false,
    contactName: false,
    contactEmail: false,
    contactPhone: false,
    preferredContactChannel: false,
    containsHealthData: false,
  });
  const validation = useMemo(() => validateContactInquiryInput(input), [input]);
  const errors = validation.fieldErrors;
  const visibleErrors = Object.fromEntries(
    Object.entries(errors).filter(([field]) => submitted || touched[field as keyof ContactInquiryInput]),
  );
  const update = (key: keyof ContactInquiryInput, value: string | boolean) => setInput((current) => ({ ...current, [key]: value }));
  const markTouched = (key: keyof ContactInquiryInput) => setTouched((current) => ({ ...current, [key]: true }));
  const submit = async () => {
    setSubmitted(true);
    setSubmitError("");
    if (!validation.valid) {
      setTouched({
        topic: true,
        serviceContext: true,
        message: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        preferredContactChannel: true,
        containsHealthData: true,
      });
      return;
    }
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
      onConversion({ stage: "request-submitted", route: "/kontakt" });
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
              <select className="nativeSelect" value={input.topic} onBlur={() => markTouched("topic")} onChange={(event) => update("topic", event.target.value)} {...inputA11y("topic", visibleErrors)}>
                <option value="">Bitte auswählen</option>
                <option>Allgemeine Anfrage</option>
                <option>Rückfrage zu Rezept</option>
                <option>Neue Versorgung</option>
                <option>Lieferung oder Status</option>
                <option>Rückrufwunsch</option>
              </select>
              <FieldError id="topic-error" error={visibleErrors.topic} />
            </label>
            <label>
              <Text variant="body-2" weight="medium">Fachbereich</Text>
              <select className="nativeSelect" value={input.serviceContext} onBlur={() => markTouched("serviceContext")} onChange={(event) => update("serviceContext", event.target.value)} {...inputA11y("serviceContext", visibleErrors)}>
                <option value="">Bitte auswählen</option>
                <option>Kompression</option>
                <option>Brustprothetik</option>
                <option>Inkontinenz & Pflege</option>
                <option>Bandagen/Orthesen/Reha/Stoma</option>
              </select>
              <FieldError id="serviceContext-error" error={visibleErrors.serviceContext} />
            </label>
          </div>
        </FormStep>
        <FormStep number={2} title="Kontaktweg festlegen" copy="WhatsApp ist für Gesundheitsdaten gesperrt.">
          <div className="formGrid">
            <FormControl>
              <FormControl.Label>Name</FormControl.Label>
              <TextField name="contactInquiryName" value={input.contactName} onChange={({ value }) => update("contactName", value)} inputAttributes={{ onBlur: () => markTouched("contactName"), ...inputA11y("contactName", visibleErrors) }} />
              <FieldError id="contactName-error" error={visibleErrors.contactName} />
            </FormControl>
            <FormControl>
              <FormControl.Label>E-Mail</FormControl.Label>
              <TextField name="contactInquiryEmail" value={input.contactEmail} onChange={({ value }) => update("contactEmail", value)} inputAttributes={{ type: "email", onBlur: () => markTouched("contactEmail"), ...inputA11y("contactEmail", visibleErrors) }} />
              <FieldError id="contactEmail-error" error={visibleErrors.contactEmail} />
            </FormControl>
            <FormControl>
              <FormControl.Label>Telefon</FormControl.Label>
              <TextField name="contactInquiryPhone" value={input.contactPhone} onChange={({ value }) => update("contactPhone", value)} inputAttributes={{ onBlur: () => markTouched("contactPhone"), ...inputA11y("contactPhone", visibleErrors) }} />
              <FieldError id="contactPhone-error" error={visibleErrors.contactPhone} />
            </FormControl>
            <label>
              <Text variant="body-2" weight="medium">Antwortweg</Text>
              <select className="nativeSelect" value={input.preferredContactChannel} onBlur={() => markTouched("preferredContactChannel")} onChange={(event) => update("preferredContactChannel", event.target.value)} {...inputA11y("preferredContactChannel", visibleErrors)}>
                <option value="email">E-Mail</option>
                <option value="phone">Telefon</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <FieldError id="preferredContactChannel-error" error={visibleErrors.preferredContactChannel} />
            </label>
          </div>
        </FormStep>
        <FormStep number={3} title="Nachricht senden" copy="Bitte keine unnötigen medizinischen Details im freien Text.">
          <div className="formGrid">
            <FormControl>
              <FormControl.Label>Nachricht</FormControl.Label>
              <TextArea name="contactInquiryMessage" value={input.message} onChange={({ value }) => update("message", value)} placeholder="Worum geht es?" resize="auto" inputAttributes={{ onBlur: () => markTouched("message"), ...inputA11y("message", visibleErrors) }} />
              <FieldError id="message-error" error={visibleErrors.message} />
            </FormControl>
            <label>
              <Text variant="body-2" weight="medium">Enthält Gesundheitsdaten?</Text>
              <select className="nativeSelect" value={input.containsHealthData ? "ja" : "nein"} onBlur={() => markTouched("containsHealthData")} onChange={(event) => update("containsHealthData", event.target.value === "ja")}>
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
