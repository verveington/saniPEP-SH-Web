import Link from "next/link";
import { Calendar, Upload } from "lucide-react";
import { Card, Text, View } from "reshaped";
import { getContactContent } from "../lib/cms/strapi";
<<<<<<< HEAD
import { verifiedAddress, verifiedContact } from "../lib/verifiedContact";
import { ButtonText, IconBox } from "./common";
=======
import { SharedIconBox, type SharedIconName } from "../../shared/icons/SharedIcon";
import { ButtonText } from "./common";

const contactIconByLabel = {
  Telefon: "objects/phone",
  "E-Mail": "symbols/secure_communication",
  WhatsApp: "symbols/forum",
  Adresse: "symbols/geo_location",
} satisfies Record<string, SharedIconName>;
>>>>>>> origin/main

export async function LocationContact({ standalone = false }: { standalone?: boolean }) {
  const { contactSetting, openingHours } = await getContactContent();
  const publicHours = openingHours.map((item) => [
    item.label,
    `${item.opensAt.slice(0, 5)} - ${item.closesAt.slice(0, 5)}`,
  ]);
  const contactView = {
    name: verifiedContact.name,
    address: verifiedAddress,
    phone: contactSetting.phone ?? verifiedContact.phone,
    email: contactSetting.email ?? verifiedContact.email,
    whatsapp: contactSetting.whatsapp ?? verifiedContact.whatsapp,
    reachable: contactSetting.reachableHours ?? verifiedContact.reachable,
    publicHours: publicHours.length > 0 ? publicHours : verifiedContact.publicHours,
  };

  return (
    <section className={`${standalone ? "section" : "sectionTight"} locationSection`}>
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <View direction="column" gap={2}>
            <Text as={standalone ? "h1" : "h2"} variant="featured-2" weight="semibold">
              Kontakt & Standort
            </Text>
            <Text color="neutral-faded">
              {contactView.name}, {contactView.address}. Erreichbarkeit: {contactView.reachable}.
            </Text>
          </View>
          <div className="gridAuto">
            {[
              ["Telefon", contactView.phone],
              ["E-Mail", contactView.email],
              ["WhatsApp", contactView.whatsapp],
              ["Adresse", contactView.address],
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
            <Link className="actionLink actionLinkPrimary" href="/termin-anfragen">
              <ButtonText icon={Calendar}>Termin anfragen</ButtonText>
            </Link>
            <Link className="actionLink" href="/rezept-upload">
              <ButtonText icon={Upload}>Rezept hochladen</ButtonText>
            </Link>
          </View>
        </View>
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <Text as="h3" variant="featured-5" weight="semibold">
              Parteiverkehr
            </Text>
            {contactView.publicHours.map(([day, hours]) => (
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
