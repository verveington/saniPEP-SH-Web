import Link from "next/link";
import { Calendar, FileText, MessageCircle, Upload, User } from "lucide-react";
import { Text, View } from "reshaped";
import { serviceAreas } from "@frontend/app/publicContent";
import { getLandingPageSections } from "../lib/cms/strapi";
import { portalLoginHref } from "../lib/routes/publicRoutes";
import { ButtonText, IconBox } from "./common";
import { LocationContact } from "./LocationContact";
import { ServiceCard } from "./ServiceCard";

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

export async function LandingPage() {
  const sections = await getLandingPageSections();
  const hero = sections.find((section) => section.sectionKey === "home-hero");
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
                {hero?.title ?? "Versorgung mit System"}
              </Text>
            </div>
            <Text as="p" variant="featured-5" color="neutral-faded">
              {hero?.lead ?? "Persönlich beraten, passgenau versorgt und digital begleitet: von Rezeptupload bis Terminwunsch."}
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
            { title: "Ich habe ein Rezept", copy: "Sicher hochladen und als geprüfte Anfrage starten.", route: "/rezept-upload", icon: FileText },
            { title: "Ich brauche einen Termin", copy: "Wunschtermin mit Anliegen und Kontaktweg senden.", route: "/termin-anfragen", icon: Calendar },
            { title: "Ich möchte schreiben", copy: "Schriftliche Anfrage an den passenden Fachbereich.", route: "/kontakt", icon: MessageCircle },
          ].map((item) => (
            <Link className="accessCard" key={item.title} href={item.route}>
              <IconBox icon={item.icon} />
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
              Die öffentlichen Seiten führen zu Termin, Upload oder Kontakt. Status- und Mitarbeiterbereiche liegen außerhalb dieses Builds.
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
