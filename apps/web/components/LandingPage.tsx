import Link from "next/link";
import { Calendar, Sparkles, Upload, User } from "lucide-react";
import { Text, View } from "reshaped";
import { serviceAreas } from "@frontend/app/publicContent";
import { portalLoginHref } from "../lib/routes/publicRoutes";
import { verifiedAddress, verifiedContact } from "../lib/verifiedContact";
import { ButtonText } from "./common";
import { LocationContact } from "./LocationContact";
import { ServiceCard } from "./ServiceCard";
import { SharedIconBox, type SharedIconName } from "../../shared/icons/SharedIcon";

const symptomEntrypoints = [
  {
    title: "Schwere Beine",
    copy: "Kompressionsberatung ruhig vorbereiten.",
    route: "/lymphoedem-lipoedem-narbenkompression",
    icon: "body/lymph_nodes",
  },
  {
    title: "Nach Operation",
    copy: "Diskreten Termin für Brustprothetik anfragen.",
    route: "/brustprothetik",
    icon: "body/breasts",
  },
  {
    title: "Rezept vorhanden",
    copy: "Unterlagen datensparsam hochladen.",
    route: "/rezept-upload",
    icon: "symbols/rx",
  },
  {
    title: "Wiederkehrender Bedarf",
    copy: "Pflegehilfsmittel und Versorgung klären.",
    route: "/inkontinenz-pflegehilfsmittel",
    icon: "symbols/nappy_diaper",
  },
] satisfies Array<{ title: string; copy: string; route: string; icon: SharedIconName }>;

export async function LandingPage() {
  const premium = serviceAreas.filter((area) => area.priority === "primary");
  const secondary = serviceAreas.filter((area) => area.priority !== "primary");

  return (
    <>
      <section className="hero boutiqueHero">
        <div className="heroContent">
          <div className="heroCopy">
            <div className="heroTitle">
              <Text as="h1" variant="headline-2" weight="bold">
                <span className="heroTitleLine">Kompressions- und</span>
                {" "}
                <span className="heroTitleLine">Sanitätshausversorgung</span>
                {" "}
                <span className="heroTitleLine">ohne Kompromisse</span>
              </Text>
            </div>
            <Text as="p" variant="featured-5" color="neutral-faded">
              Digital vorbereiten, persönlich begleitet werden und hochwertige Versorgung mit ruhigem Gefühl starten.
            </Text>
            <Text as="p" color="neutral-faded">
              saniPEP übersetzt sensible Versorgung in klare digitale Wege: Orientierung nach Beschwerden, sichere Vorbereitung und Rückmeldung vom Team.
            </Text>
            <div className="heroActions">
              <Link className="actionLink actionLinkPrimary actionLinkLarge" href="/termin-anfragen">
                <ButtonText icon={Calendar}>Termin anfragen</ButtonText>
              </Link>
              <Link className="actionLink actionLinkLarge" href="/rezept-upload">
                <ButtonText icon={Upload}>Rezept hochladen</ButtonText>
              </Link>
              <a className="portalLoginAnchor portalLoginAnchorLarge" href={portalLoginHref}>
                <ButtonText icon={User}>Kundenportal Login</ButtonText>
              </a>
            </div>
            <div className="heroContactRail" aria-label="Kontakt und Servicezeiten">
              {[
                { icon: "symbols/geo_location" as const, title: "Standort", copy: verifiedAddress },
                { icon: "symbols/i_schedule_school_date_time" as const, title: "Parteiverkehr", copy: "Mo/Mi/Fr nachmittags, Di/Do vormittags" },
                { icon: "objects/phone" as const, title: "Erreichbar", copy: `${verifiedContact.phone} · ${verifiedContact.email}` },
              ].map((item) => (
                <div className="heroContactItem" key={item.title}>
                  <SharedIconBox name={item.icon} />
                  <View direction="column" gap={1}>
                    <Text weight="semibold">{item.title}</Text>
                    <Text variant="body-2" color="neutral-faded">
                      {item.copy}
                    </Text>
                  </View>
                </div>
              ))}
            </div>
          </div>
          <HeroProductStage />
        </div>
      </section>

      <section className="quickAccess">
        <div className="sectionInner gridAuto">
          {symptomEntrypoints.map((item) => (
            <Link className="accessCard" key={item.title} href={item.route}>
              <SharedIconBox name={item.icon} />
              <View direction="column" gap={1}>
                <Text weight="semibold">{item.title}</Text>
                <Text variant="body-2" color="neutral-faded">
                  {item.copy}
                </Text>
              </View>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="sectionInner">
          <div className="sectionHeader">
            <Text as="h2" variant="featured-2" weight="semibold" wrap="balance">
              Versorgungsbereiche
            </Text>
            <Text color="neutral-faded">
              Hochwertige Versorgung soll schnell verständlich sein: nach Beschwerden einsteigen, Unterlagen vorbereiten und den passenden nächsten Schritt wählen.
            </Text>
          </div>
          <div className="gridAuto">
            {[...premium, ...secondary].map((area) => (
              <ServiceCard key={area.id} area={area} />
            ))}
          </div>
        </div>
      </section>

      <LocationContact />
    </>
  );
}

function HeroProductStage() {
  return (
    <div className="heroProductStage" aria-label="Kompression digital vorbereiten">
      <div className="shapeTileGrid">
        <div className="shapeTile shapeTileIndigo">
          <span className="shapeMotif shapeMotifCircle" />
        </div>
        <div className="shapeTile shapeTileLavender">
          <span className="shapeMotif shapeMotifCircle" />
        </div>
        <div className="shapeTile shapeTileRose">
          <span className="shapeMotif shapeMotifHalf" />
        </div>
        <div className="shapeTile shapeTileCream">
          <span className="shapeTileText">Direkt online vorbereiten</span>
        </div>
      </div>
      <div className="productCard productCardTall">
        <span className="productCode">01</span>
        <strong>Kompression</strong>
        <small>digital vorbereitet</small>
      </div>
      <div className="stockingDisplay" aria-hidden>
        <span className="stockingLeg stockingLegBack" />
        <span className="stockingLeg stockingLegFront" />
      </div>
      <div className="qualityBadge">
        <Sparkles aria-hidden />
        <span>Premium Fit</span>
      </div>
    </div>
  );
}
