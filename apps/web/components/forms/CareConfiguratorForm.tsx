"use client";

import { Clipboard } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, FormControl, Text, TextArea, View } from "reshaped";
import { createRequestId } from "@frontend/app/requestIds";
import { validateCareConfigurationInput } from "@frontend/lib/formValidation";
import type { CareConfigurationInput } from "@frontend/lib/types";
import { ButtonText, FieldError, FormStep, RequestReceipt, inputA11y } from "../common";
import { SecuritySidePanel } from "../SecuritySidePanel";
import { trackPublicConversion } from "./trackPublicConversion";

export function CareConfiguratorForm() {
  const [input, setInput] = useState<CareConfigurationInput>({
    need: "",
    rhythm: "",
    hasPrescription: false,
    note: "",
  });
  const [createdId, setCreatedId] = useState("");
  const validation = useMemo(() => validateCareConfigurationInput(input), [input]);
  const errors = validation.fieldErrors;
  const update = (key: keyof CareConfigurationInput, value: string | boolean) => setInput((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!validation.valid) return;
    setCreatedId(createRequestId("CARE"));
    trackPublicConversion({ stage: "request-submitted", route: "/inkontinenz-pflegehilfsmittel" });
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
              <Button color="primary" onClick={submit} disabled={!validation.valid}>
                <ButtonText icon={Clipboard}>Bestellanfrage vorbereiten</ButtonText>
              </Button>
              {createdId && <RequestReceipt id={createdId} />}
            </View>
          </div>
        </View>
        <SecuritySidePanel />
      </div>
    </section>
  );
}
