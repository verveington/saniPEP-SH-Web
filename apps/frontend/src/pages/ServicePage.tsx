import { Activity, Calendar, Search, Shield, Upload } from "lucide-react";
import { Text, View } from "reshaped";
import { serviceAreas } from "../app/publicContent";
import type { Navigate, ServicePageRoute } from "../app/routes";
import { ButtonText, IconBox } from "../components/common";
import { RouteLink } from "../components/RouteLink";

const servicePageContent: Record<ServicePageRoute, { index: number; title: string; lead: string }> = {
  "/lymphoedem-lipoedem-narbenkompression": {
    index: 0,
    title: "Lymphödem, Lipödem & Narbenkompression",
    lead: "Die Versorgung braucht Ruhe, Maßarbeit und einen klaren Ablauf. Die Seite führt bewusst in den Termin statt in einen Produktkatalog.",
  },
  "/brustprothetik": {
    index: 1,
    title: "Brustprothetik",
    lead: "Diskrete Beratung, sensible Begleitung und klare Terminführung.",
  },
  "/bandagen-orthesen-reha-stoma": {
    index: 2,
    title: "Bandagen, Orthesen, Reha & Stoma",
    lead: "Auffindbar und handlungsorientiert, mit schneller Weiterleitung zu Rezeptupload, Termin oder Kontakt.",
  },
};

export default function ServicePage({ route, navigate }: { route: ServicePageRoute; navigate: Navigate }) {
  const content = servicePageContent[route];
  const area = serviceAreas[content.index];

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <IconBox icon={Activity} />
          <Text as="h1" variant="featured-1" weight="semibold" wrap="balance">
            {content.title}
          </Text>
          <Text color="neutral-faded">{content.lead}</Text>
          <div className="gridAuto">
            {area.searchSignals.map((signal) => (
              <div className="safeRow" key={signal}>
                <Search aria-hidden size={16} />
                <Text variant="body-2">{signal}</Text>
              </div>
            ))}
          </div>
          <View direction="row" gap={3} wrap>
            <RouteLink className="actionLink actionLinkPrimary" route="/termin-anfragen" navigate={navigate}>
              <ButtonText icon={Calendar}>Termin anfragen</ButtonText>
            </RouteLink>
            <RouteLink className="actionLink" route="/rezept-upload" navigate={navigate}>
              <ButtonText icon={Upload}>Rezept hochladen</ButtonText>
            </RouteLink>
          </View>
        </View>
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <IconBox icon={Shield} />
            <Text as="h2" variant="featured-5" weight="semibold">
              Prüfbarer Ablauf
            </Text>
            <Text color="neutral-faded">
              Öffentliche Formulare erzeugen nur geprüfte Anfragen. Status, Mitarbeiterprüfung und Omnia-Übernahme bleiben in getrennten geschützten Bereichen.
            </Text>
          </View>
        </div>
      </div>
    </section>
  );
}
