import { Calendar, Upload } from "lucide-react";
import { Card, Text, View } from "reshaped";
import { contact } from "../app/publicContent";
import type { Navigate } from "../app/routes";
import { SharedIconBox, type SharedIconName } from "../../../shared/icons/SharedIcon";
import { ButtonText } from "./common";
import { RouteLink } from "./RouteLink";

const contactIconByLabel = {
  Telefon: "objects/phone",
  "E-Mail": "symbols/secure_communication",
  WhatsApp: "symbols/forum",
  Adresse: "symbols/geo_location",
} satisfies Record<string, SharedIconName>;

export function LocationContact({ navigate, standalone = false }: { navigate: Navigate; standalone?: boolean }) {
  return (
    <section className={standalone ? "section" : "sectionTight"} style={{ background: "var(--sani-white)" }}>
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <View direction="column" gap={2}>
            <Text as={standalone ? "h1" : "h2"} variant="featured-2" weight="semibold">
              Kontakt & Standort
            </Text>
            <Text color="neutral-faded">
              {contact.name}, {contact.address}. Erreichbarkeit: {contact.reachable}.
            </Text>
          </View>
          <div className="gridAuto">
            {[
              ["Telefon", contact.phone],
              ["E-Mail", contact.email],
              ["WhatsApp", contact.whatsapp],
              ["Adresse", contact.address],
            ].map(([label, value]) => (
              <Card padding={4} key={label as string}>
                <View direction="row" gap={3} align="center">
                  <SharedIconBox name={contactIconByLabel[label as keyof typeof contactIconByLabel]} />
                  <View direction="column" gap={1}>
                    <Text variant="body-2" color="neutral-faded">
                      {label as string}
                    </Text>
                    <Text weight="semibold">{value as string}</Text>
                  </View>
                </View>
              </Card>
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
            <Text as="h3" variant="featured-5" weight="semibold">
              Parteiverkehr
            </Text>
            {contact.publicHours.map(([day, hours]) => (
              <View direction="row" justify="space-between" gap={4} key={day}>
                <Text weight="medium">{day}</Text>
                <Text color="neutral-faded">{hours}</Text>
              </View>
            ))}
            <div className="privacyNote">
              <SharedIconBox name="symbols/health_data_security" />
              <Text variant="body-2">
                Gesundheitsdaten bitte bevorzugt über Upload oder das getrennte Portal senden, nicht frei per E-Mail oder WhatsApp.
              </Text>
            </div>
          </View>
        </div>
      </div>
    </section>
  );
}
