import { Clipboard, Lock, Shield } from "lucide-react";
import { Text, View } from "reshaped";
import { getLegalPageByKind } from "../lib/cms/strapi";
import { IconBox } from "./common";
import { SecuritySidePanel } from "./SecuritySidePanel";

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
      "Die öffentliche Website verarbeitet Kontakt-, Termin- und Upload-Anfragen datensparsam. Analytics zählt nur grobe Ziele.",
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
          <IconBox icon={kind === "imprint" ? Clipboard : kind === "privacy" ? Lock : Shield} />
          <Text as="h1" variant="featured-1" weight="semibold">
            {title}
          </Text>
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
