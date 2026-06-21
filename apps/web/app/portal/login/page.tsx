import Link from "next/link";
import { Calendar, Mail, Upload } from "lucide-react";
import { Text, View } from "reshaped";
import { StructuredData } from "../../../components/StructuredData";
import { ButtonText } from "../../../components/common";
import { buildRouteMetadata } from "../../../lib/seo/metadata";
import { SharedIconBox } from "../../../../shared/icons/SharedIcon";

export const revalidate = 3600;

export const generateMetadata = () => buildRouteMetadata("/portal/login");

export default function PortalLoginNoticePage() {
  return (
    <>
      <StructuredData route="/portal/login" />
      <section className="section">
        <div className="sectionInner gridTwo">
          <View direction="column" gap={5}>
            <SharedIconBox name="symbols/ui_secure" />
            <Text as="h1" variant="featured-1" weight="semibold">
              Kundenportal in Vorbereitung
            </Text>
            <Text color="neutral-faded">
              Der Kundenbereich ist aktuell nicht freigeschaltet. Es gibt keinen oeffentlichen Portal-Login und keine
              Selbstbedienung fuer Bestellungen, Dokumente oder Rezepte.
            </Text>
            <div className="privacyNote">
              <Text variant="body-2">
                Fuer den aktuellen MVP bleiben Public Requests und Staff Admin getrennt. Uploads,
                Portal-Self-Service und Omnia-Schreibzugriffe sind nicht aktiviert.
              </Text>
            </div>
            <View direction="row" gap={3} wrap>
              <Link className="actionLink actionLinkPrimary" href="/termin-anfragen">
                <ButtonText icon={Calendar}>Termin anfragen</ButtonText>
              </Link>
              <Link className="actionLink" href="/rezept-upload">
                <ButtonText icon={Upload}>Rezept vorab anfragen</ButtonText>
              </Link>
              <Link className="actionLink" href="/kontakt">
                <ButtonText icon={Mail}>Kontakt aufnehmen</ButtonText>
              </Link>
            </View>
          </View>
          <div className="plainPanel">
            <View direction="column" gap={4} padding={6}>
              <SharedIconBox name="symbols/health_data_security" />
              <Text as="h2" variant="featured-5" weight="semibold">
                Nicht produktiv aktiviert
              </Text>
              <Text color="neutral-faded">
                Diese Hinweisseite ersetzt keinen Portalzugang. Demo-Zugaenge und interne Testdaten werden nicht
                oeffentlich bereitgestellt.
              </Text>
            </View>
          </div>
        </div>
      </section>
    </>
  );
}
