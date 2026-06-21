import { Text, View } from "reshaped";
import { getLegalPageByKind } from "../lib/cms/strapi";
import { SecuritySidePanel } from "./SecuritySidePanel";
import { SharedIconBox, type SharedIconName } from "../../shared/icons/SharedIcon";

const legalIconByKind = {
  imprint: "symbols/i_documents_accepted",
  privacy: "symbols/health_data_security",
  consent: "symbols/medical_advice",
} satisfies Record<"imprint" | "privacy" | "consent", SharedIconName>;

export async function LegalPage({ kind, title }: { kind: "imprint" | "privacy" | "consent"; title: string }) {
  const cmsPage = await getLegalPageByKind(kind);
  const fallbackCopy = {
    imprint: [
      "Platzhalter: Diese Seite ist noch nicht juristisch final freigegeben.",
      "Anbieterkennzeichnung und Kontaktangaben werden für die öffentliche Website getrennt von internen Funktionen bereitgestellt.",
      "Der finale Impressumstext muss vor Produktivgang rechtlich geprüft und vervollständigt werden.",
    ],
    privacy: [
      "Platzhalter: Diese Seite ist noch nicht juristisch final freigegeben.",
      "Die öffentliche Website verarbeitet Kontakt-, Termin- und Vorab-Anfragen datensparsam. Analytics zählt nur grobe Ziele.",
      "Der finale Datenschutztext muss vor Produktivgang mit Datenschutzberatung geprüft und vervollständigt werden.",
    ],
    consent: [
      "Platzhalter: Diese Seite ist noch nicht juristisch final freigegeben.",
      "Einwilligungen für Gesundheitsdaten starten nicht vorausgewählt und müssen aktiv bestätigt werden.",
      "Die finale Einwilligungscopy muss vor Produktivgang fachlich und juristisch geprüft werden.",
    ],
  }[kind];
  const copy = cmsPage ? [cmsPage.placeholderNotice, cmsPage.body] : fallbackCopy;

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <SharedIconBox name={legalIconByKind[kind]} />
          <Text as="h1" variant="featured-1" weight="semibold">
            {title}
          </Text>
          <div className="privacyNote">
            <Text variant="body-2">
              Rechtstexte und Einwilligungstexte muessen vor einer oeffentlichen Produktivveroeffentlichung final
              geprueft und freigegeben werden. Diese Seite ersetzt keine juristische Freigabe.
            </Text>
          </div>
          {copy.map((paragraph) => (
            <Text color="neutral-faded" key={paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
        <SecuritySidePanel />
      </div>
    </section>
  );
}
