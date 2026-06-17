import { Calendar, FileText, MessageCircle, Upload, User } from "lucide-react";
import { Text, View } from "reshaped";
import { serviceAreas } from "../app/publicContent";
import type { Navigate } from "../app/routes";
import { ButtonText, IconBox } from "../components/common";
import { LocationContact } from "../components/LocationContact";
import { RouteLink } from "../components/RouteLink";
import { ServiceCard } from "../components/ServiceCard";

const heroAvifSrcSet = [
  "/images/sanipep-consultation-hero-960.avif 960w",
  "/images/sanipep-consultation-hero-1280.avif 1280w",
  "/images/sanipep-consultation-hero-1672.avif 1672w",
].join(", ");

const heroWebpSrcSet = [
  "/images/sanipep-consultation-hero-960.webp 960w",
  "/images/sanipep-consultation-hero-1280.webp 1280w",
  "/images/sanipep-consultation-hero-1672.webp 1672w",
].join(", ");

export default function LandingPage({ navigate, portalLoginHref }: { navigate: Navigate; portalLoginHref: string }) {
  const premium = serviceAreas.filter((area) => area.priority === "primary");
  const secondary = serviceAreas.filter((area) => area.priority !== "primary");

  return (
    <>
      <section className="hero">
        <div className="heroMedia" aria-hidden>
          <picture>
            <source type="image/avif" srcSet={heroAvifSrcSet} sizes="100vw" />
            <source type="image/webp" srcSet={heroWebpSrcSet} sizes="100vw" />
            <img
              src="/images/sanipep-consultation-hero-1280.webp"
              width={1280}
              height={720}
              alt=""
              decoding="async"
              fetchPriority="high"
            />
          </picture>
        </div>
        <div className="heroContent">
          <div className="heroCopy">
            <div className="heroTitle">
              <Text as="h1" variant="headline-2" weight="bold" wrap="balance">
                Versorgung mit System
              </Text>
            </div>
            <Text as="p" variant="featured-5" color="neutral-faded">
              Persönlich beraten, passgenau versorgt und digital begleitet: von Rezeptupload bis Terminwunsch.
            </Text>
            <div className="heroActions">
              <RouteLink className="actionLink actionLinkPrimary actionLinkLarge" route="/termin-anfragen" navigate={navigate}>
                <ButtonText icon={Calendar}>Termin anfragen</ButtonText>
              </RouteLink>
              <RouteLink className="actionLink actionLinkLarge" route="/rezept-upload" navigate={navigate}>
                <ButtonText icon={Upload}>Rezept hochladen</ButtonText>
              </RouteLink>
              <a className="portalLoginAnchor portalLoginAnchorLarge" href={portalLoginHref}>
                <ButtonText icon={User}>Kundenportal Login</ButtonText>
              </a>
            </div>
            <div className="heroCards" aria-label="Schneller Einstieg">
              {[
                ["Request-based", "Uploads, Wünsche und Anfragen werden geprüft."],
                ["Datensparsam", "Analytics zählt nur grobe Ziele, keine Fachdetails."],
                ["Mitarbeiterprüfung", "Keine automatische Omnia-Änderung aus der Website."],
              ].map(([title, copy]) => (
                <div className="heroCard" key={title}>
                  <Text weight="semibold">{title}</Text>
                  <Text variant="body-2" color="neutral-faded">
                    {copy}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="quickAccess">
        <div className="sectionInner gridAuto">
            {[
              { title: "Ich habe ein Rezept", copy: "Sicher hochladen und als geprüfte Anfrage starten.", route: "/rezept-upload" as const, icon: FileText },
              { title: "Ich brauche einen Termin", copy: "Wunschtermin mit Anliegen und Kontaktweg senden.", route: "/termin-anfragen" as const, icon: Calendar },
              { title: "Ich möchte schreiben", copy: "Schriftliche Anfrage an den passenden Fachbereich.", route: "/kontakt" as const, icon: MessageCircle },
            ].map((item) => (
            <RouteLink className="accessCard" key={item.title} route={item.route} navigate={navigate}>
              <IconBox icon={item.icon} />
              <View direction="column" gap={1}>
                <Text weight="semibold">{item.title}</Text>
                <Text variant="body-2" color="neutral-faded">
                  {item.copy}
                </Text>
              </View>
            </RouteLink>
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
              Die öffentlichen Seiten führen zu Termin, Upload oder Kontakt. Status- und Mitarbeiterbereiche liegen außerhalb dieses Builds.
            </Text>
          </div>
          <div className="gridAuto">
            {[...premium, ...secondary].map((area) => (
              <ServiceCard key={area.id} area={area} navigate={navigate} />
            ))}
          </div>
        </div>
      </section>

      <LocationContact navigate={navigate} />
    </>
  );
}
