import Link from "next/link";
import { Calendar, Upload } from "lucide-react";
import { Text, View } from "reshaped";
import { serviceAreas } from "@frontend/app/publicContent";
import type { ServicePageRoute } from "../lib/routes/publicRoutes";
import { getServicePageBySlug } from "../lib/cms/strapi";
import { ButtonText } from "./common";
import { SharedIcon, SharedIconBox } from "../../shared/icons/SharedIcon";

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
    lead: "Auffindbar und handlungsorientiert, mit schneller Weiterleitung zu Rezept-Vorabprüfung, Termin oder Kontakt.",
  },
};

export async function ServicePage({ route }: { route: ServicePageRoute }) {
  const content = servicePageContent[route];
  const cmsPage = await getServicePageBySlug(route.slice(1));
  const area = serviceAreas[content.index];
  const title = cmsPage?.headline ?? content.title;
  const lead = cmsPage?.intro ?? content.lead;
  const searchSignals = cmsPage?.searchSignals ?? area.searchSignals;

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <SharedIconBox name={area.icon} />
          <Text as="h1" variant="featured-1" weight="semibold" wrap="balance">
            {title}
          </Text>
          <Text color="neutral-faded">{lead}</Text>
          <div className="gridAuto">
            {searchSignals.map((signal) => (
              <div className="safeRow" key={signal}>
                <SharedIcon name="symbols/question_circle" decorative size={16} />
                <Text variant="body-2">{signal}</Text>
              </div>
            ))}
          </div>
          <View direction="row" gap={3} wrap>
            <Link className="actionLink actionLinkPrimary" href="/termin-anfragen">
              <ButtonText icon={Calendar}>Termin anfragen</ButtonText>
            </Link>
            <Link className="actionLink" href="/rezept-upload">
              <ButtonText icon={Upload}>Rezept vorab einreichen</ButtonText>
            </Link>
          </View>
        </View>
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <SharedIconBox name="symbols/health_data_security" />
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
