import Link from "next/link";
import { Armchair, ArrowRight, Bandage, Droplets, HeartPulse } from "lucide-react";
import { Text } from "reshaped";
import { serviceAreas } from "@frontend/app/publicContent";
import type { PublicRoute } from "../lib/routes/publicRoutes";
import { LocationContact } from "./LocationContact";
import { ServiceCard } from "./ServiceCard";

const topicCards = [
  {
    title: "Bandagen & Orthesen",
    copy: "Unterstützung und Stabilität für Gelenke, Muskeln und Wirbelsäule.",
    route: "/bandagen-orthesen-reha-stoma",
    tone: "green",
    Icon: Bandage,
  },
  {
    title: "Kompression & Brustversorgung",
    copy: "Kompression, Lymphversorgung und Brustprothetik – individuell angepasst.",
    route: "/lymphoedem-lipoedem-narbenkompression",
    tone: "rose",
    Icon: HeartPulse,
  },
  {
    title: "Inkontinenz, Stoma & Pflege",
    copy: "Diskrete Versorgung und zuverlässige Produkte für den Alltag.",
    route: "/inkontinenz-pflegehilfsmittel",
    tone: "aqua",
    Icon: Droplets,
  },
  {
    title: "Mobilität & Alltagshilfen",
    copy: "Hilfsmittel für mehr Sicherheit und Selbstständigkeit zu Hause.",
    route: "/hilfe-finden",
    tone: "sand",
    Icon: Armchair,
  },
] satisfies Array<{ title: string; copy: string; route: PublicRoute; tone: "green" | "rose" | "aqua" | "sand"; Icon: typeof Bandage }>;

export async function LandingPage() {
  const premium = serviceAreas.filter((area) => area.priority === "primary");
  const secondary = serviceAreas.filter((area) => area.priority !== "primary");

  return (
    <>
      <section className="landingStart">
        <div className="sectionInner landingStartInner">
          <div className="landingIntro">
            <Text as="h1" variant="headline-2" weight="bold" wrap="balance">
              Wir sind für Sie da – für mehr Lebensqualität im Alltag.
            </Text>
            <Text as="p" variant="featured-5" color="neutral-faded" wrap="balance">
              Ihr Sanitätshaus für individuelle Beratung, hochwertige Produkte und persönliche Betreuung.
            </Text>
            <p className="landingAccent">Wir nehmen uns Zeit für Sie.</p>
          </div>

          <div className="topicGrid" aria-label="Themenbereiche">
            {topicCards.map(({ Icon, ...item }) => (
              <Link className="topicCard" data-tone={item.tone} href={item.route} key={item.title}>
                <span className="topicIcon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="topicTitle">{item.title}</span>
                <span className="topicDescription">{item.copy}</span>
                <span className="topicCta">
                  Mehr erfahren
                  <ArrowRight aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
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
