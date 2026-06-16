import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Activity,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clipboard,
  Eye,
  FileText,
  Home,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Phone,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Truck,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  FileUpload,
  FormControl,
  ProgressBar,
  Tabs,
  Text,
  TextArea,
  TextField,
  View,
} from "reshaped";
import { designLabPalettes, type DesignLabPalette } from "./lib/designTokens";
import {
  contact,
  portalDashboard,
  serviceAreas,
  strapiContentTypes,
} from "./lib/mockData";
import { omniaAdapter } from "./lib/omniaAdapter";
import {
  getRequestPolicy,
  workflowPolicyMatrix,
} from "./lib/requestWorkflow";
import { staffReviewAdapter } from "./lib/staffReviewAdapter";
import {
  categoryLabel,
  fallbackRouteByAction,
  primaryActionLabel,
  searchPatientIntent,
} from "./lib/searchIndex";
import {
  consentCopy,
  prescriptionUploadPolicy,
  roleCapabilities,
} from "./lib/privacySecurity";
import {
  integrationContracts,
  integrationSummary,
} from "./lib/integrationContracts";
import {
  authAdapter,
  portalAuthPolicy,
} from "./lib/authAdapter";
import { applyRouteMetadata } from "./lib/seo";
import {
  conversionGoalLabel,
  conversionPrivacyBoundary,
  conversionStageLabel,
  createConversionEvent,
  seedConversionEvents,
  summarizeConversionEvents,
} from "./lib/conversionFunnel";
import type {
  ActionPolicyDecision,
  AppointmentRequestInput,
  ContactInquiryInput,
  ConsentScope,
  ConversionEvent,
  ConversionStage,
  EmployeeReviewAction,
  IntegrationContract,
  IntegrationStatus,
  PortalActivationInput,
  PortalAuthResult,
  PortalDashboard,
  PortalLoginInput,
  PortalRequest,
  RequestStatus,
  Route,
  ServiceArea,
  Supply,
  UploadEnvelope,
  UploadInput,
} from "./lib/types";

type Navigate = (route: Route) => void;
type TrackConversion = (input: {
  stage: ConversionStage;
  route: Route;
  requestType?: PortalRequest["type"];
  safeCategory?: string;
}) => void;

const routes = new Set<Route>([
  "/",
  "/hilfe-finden",
  "/lymphoedem-lipoedem-narbenkompression",
  "/brustprothetik",
  "/bandagen-orthesen-reha-stoma",
  "/inkontinenz-pflege",
  "/rezept-hochladen",
  "/termin-anfragen",
  "/kontakt",
  "/portal/login",
  "/portal",
  "/admin/requests",
  "/admin/integrations",
  "/admin/design-lab",
]);

const statusLabels: Record<RequestStatus, string> = {
  draft: "Entwurf",
  submitted: "Eingegangen",
  "employee-review": "Prüfung durch Mitarbeiter",
  "omnia-prepared": "In Omnia vorbereitet",
  confirmed: "Bestätigt",
  delivery: "Lieferung",
  closed: "Abgeschlossen",
};

const statusSteps: Array<{ status: RequestStatus; label: string; description: string }> = [
  {
    status: "submitted",
    label: "Anfrage eingegangen",
    description: "Upload, Terminanfrage oder Bestellwunsch wurde registriert.",
  },
  {
    status: "employee-review",
    label: "Prüfung durch Mitarbeiter",
    description: "Fachbereich prüft Rezept, Bedarf und offene Rückfragen.",
  },
  {
    status: "omnia-prepared",
    label: "In Omnia vorbereitet",
    description: "Dauerrezept, Versorgung oder Bestellung wird im führenden System gepflegt.",
  },
  {
    status: "confirmed",
    label: "Bestätigt",
    description: "Kunde sieht freigegebene Informationen im Portal.",
  },
  {
    status: "delivery",
    label: "Lieferung / Nachsorge",
    description: "Versorgung wird bereitgestellt, versendet oder vor Ort abgeschlossen.",
  },
];

const primaryQuickAccess = [
  {
    title: "Ich habe ein Rezept",
    copy: "Sicher hochladen und direkt den passenden Prozess starten.",
    route: "/rezept-hochladen" as const,
    icon: FileText,
  },
  {
    title: "Ich brauche einen Termin",
    copy: "Wunschtermin mit Anliegen und optionalem Rezept senden.",
    route: "/termin-anfragen" as const,
    icon: Calendar,
  },
  {
    title: "Hilfe bei Lipödem/Lymphödem",
    copy: "Erstberatung, Maßnahme, Verlauf und Kompression planen.",
    route: "/lymphoedem-lipoedem-narbenkompression" as const,
    icon: Activity,
  },
  {
    title: "Ich brauche Brustprothetik",
    copy: "Diskrete Beratung und sensible Terminführung.",
    route: "/brustprothetik" as const,
    icon: Shield,
  },
  {
    title: "Inkontinenz/Pflege bestellen",
    copy: "Fragebogen, Rezept und Bestellanfrage in einem Flow.",
    route: "/inkontinenz-pflege" as const,
    icon: ShoppingCart,
  },
  {
    title: "Ich bin bereits Kunde",
    copy: "Portal, Status, Erinnerung und Dauerversorgung ansehen.",
    route: "/portal/login" as const,
    icon: User,
  },
  {
    title: "Ich möchte schreiben",
    copy: "Schriftliche Anfrage ohne Umweg an den passenden Fachbereich senden.",
    route: "/kontakt" as const,
    icon: MessageCircle,
  },
];

const normalizeRoute = (): Route => {
  const path = window.location.pathname as Route;
  return routes.has(path) ? path : "/";
};

const ButtonText = ({ icon: Icon, children }: { icon: LucideIcon; children: string }) => (
  <span className="buttonLabel">
    <Icon aria-hidden />
    {children}
  </span>
);

const IconBox = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="iconBox" aria-hidden>
    <Icon />
  </span>
);

function StateNotice({
  icon: Icon,
  title,
  copy,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
}) {
  return (
    <div className="stateNotice">
      <IconBox icon={Icon} />
      <View direction="column" gap={1}>
        <Text weight="semibold">{title}</Text>
        <Text variant="body-2" color="neutral-faded">
          {copy}
        </Text>
      </View>
    </div>
  );
}

function FormStep({
  number,
  title,
  copy,
  children,
}: {
  number: number;
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <section className="formStep" aria-label={`${number}. ${title}`}>
      <div className="formStepHeader">
        <span className="stepNumber">{number}</span>
        <View direction="column" gap={1}>
          <Text variant="featured-6" weight="semibold">
            {title}
          </Text>
          <Text variant="body-2" color="neutral-faded">
            {copy}
          </Text>
        </View>
      </div>
      <div className="formStepBody">{children}</div>
    </section>
  );
}

const statusColor = (status: RequestStatus): "neutral" | "positive" | "primary" | "warning" => {
  if (status === "confirmed" || status === "closed") return "positive";
  if (status === "employee-review" || status === "omnia-prepared") return "warning";
  if (status === "submitted" || status === "delivery") return "primary";
  return "neutral";
};

const integrationStatusColor = (status: IntegrationStatus): "neutral" | "positive" | "primary" | "warning" | "critical" => {
  if (status === "ready-for-backend") return "positive";
  if (status === "mocked") return "primary";
  if (status === "blocked-by-contract") return "warning";
  return "neutral";
};

function App() {
  const [route, setRoute] = useState<Route>(normalizeRoute);
  const [conversionEvents, setConversionEvents] = useState<ConversionEvent[]>(seedConversionEvents);

  const trackConversion: TrackConversion = (input) => {
    setConversionEvents((current) => [
      ...current,
      createConversionEvent(input, current.length + 1),
    ]);
  };

  useEffect(() => {
    const handlePopState = () => setRoute(normalizeRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    applyRouteMetadata(route);
    setConversionEvents((current) => [
      ...current,
      createConversionEvent({ stage: "route-view", route }, current.length + 1),
    ]);
  }, [route]);

  const navigate: Navigate = (nextRoute) => {
    window.history.pushState(null, "", nextRoute);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="appShell">
      <SiteHeader route={route} navigate={navigate} />
      <main>
        {route === "/" && <LandingPage navigate={navigate} />}
        {route === "/hilfe-finden" && <HelpFinderPage navigate={navigate} />}
        {route === "/lymphoedem-lipoedem-narbenkompression" && (
          <ServicePage
            area={serviceAreas[0]}
            title="Lymphödem, Lipödem & Narbenkompression"
            lead="Premium-Versorgung braucht Ruhe, Maßarbeit und einen klaren Ablauf. Die Seite führt bewusst in den Termin statt in einen Produktkatalog."
            bullets={[
              "Erstberatung mit Symptomen, Rezeptlage und Versorgungsziel",
              "Maßnahme und Flachstrick-Kompression als hochwertiger Beratungsprozess",
              "Kontroll- und Verlaufstermine mit Upload- und Rückfragekanal",
            ]}
            navigate={navigate}
          />
        )}
        {route === "/brustprothetik" && (
          <ServicePage
            area={serviceAreas[1]}
            title="Brustprothetik"
            lead="Diskrete Beratung, sensible Begleitung und klare Terminführung nach Brustoperation oder bei neuer Versorgung."
            bullets={[
              "Geschützte Terminanfrage mit persönlicher Rückmeldung",
              "Beratung zu Erstversorgung, Wechsel und Zubehör",
              "Rezeptupload empfohlen, aber nicht als Hürde im ersten Kontakt",
            ]}
            navigate={navigate}
          />
        )}
        {route === "/bandagen-orthesen-reha-stoma" && (
          <ServicePage
            area={serviceAreas[2]}
            title="Bandagen, Orthesen, Reha & Stoma"
            lead="Auffindbar und handlungsorientiert, ohne die Premium-Wachstumsbereiche auf der Startseite zu verdrängen."
            bullets={[
              "Rezeptupload und Rückfrage als primärer Einstieg",
              "Klare Zuordnung nach Produktgruppe und Situation",
              "Mitarbeiterprüfung vor finaler Versorgung",
            ]}
            navigate={navigate}
          />
        )}
        {route === "/inkontinenz-pflege" && <ConfiguratorPage navigate={navigate} onConversion={trackConversion} />}
        {route === "/rezept-hochladen" && <PrescriptionUploadPage navigate={navigate} onConversion={trackConversion} />}
        {route === "/termin-anfragen" && <AppointmentRequestPage navigate={navigate} onConversion={trackConversion} />}
        {route === "/kontakt" && <ContactPage navigate={navigate} onConversion={trackConversion} />}
        {route === "/portal/login" && <PortalLoginPage navigate={navigate} />}
        {route === "/portal" && <PortalDashboardPage navigate={navigate} />}
        {route === "/admin/requests" && <AdminRequestsPage navigate={navigate} conversionEvents={conversionEvents} />}
        {route === "/admin/integrations" && <AdminIntegrationsPage navigate={navigate} conversionEvents={conversionEvents} />}
        {route === "/admin/design-lab" && <DesignLabPage conversionEvents={conversionEvents} />}
      </main>
      <SiteFooter navigate={navigate} />
    </div>
  );
}

function SiteHeader({ route, navigate }: { route: Route; navigate: Navigate }) {
  const navItems: Array<{ label: string; route: Route }> = [
    { label: "Start", route: "/" },
    { label: "Hilfe finden", route: "/hilfe-finden" },
    { label: "Lymphödem & Lipödem", route: "/lymphoedem-lipoedem-narbenkompression" },
    { label: "Brustprothetik", route: "/brustprothetik" },
    { label: "Inkontinenz & Pflege", route: "/inkontinenz-pflege" },
    { label: "Kontakt", route: "/kontakt" },
  ];

  return (
    <header className="siteHeader">
      <div className="headerInner">
        <button className="brandButton" onClick={() => navigate("/")} aria-label="Zur Startseite">
          <span className="brandMark">
            <strong>
              sani<span>PEP</span>
            </strong>
            <small>Sanitätshaus München</small>
          </span>
        </button>
        <nav className="navLinks" aria-label="Hauptnavigation">
          {navItems.map((item) => (
            <button
              className="navLink"
              key={item.route}
              onClick={() => navigate(item.route)}
              aria-current={route === item.route ? "page" : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="headerActions">
          <Button variant="ghost" color="neutral" onClick={() => navigate("/rezept-hochladen")}>
            <ButtonText icon={Upload}>Rezept</ButtonText>
          </Button>
          <Button color="primary" onClick={() => navigate("/termin-anfragen")}>
            <ButtonText icon={Calendar}>Termin</ButtonText>
          </Button>
          <Button variant="outline" color="neutral" onClick={() => navigate("/portal/login")}>
            <ButtonText icon={User}>Portal</ButtonText>
          </Button>
        </div>
      </div>
    </header>
  );
}

function LandingPage({ navigate }: { navigate: Navigate }) {
  const premium = serviceAreas.filter((area) => area.priority === "primary");
  const secondary = serviceAreas.filter((area) => area.priority !== "primary");

  return (
    <>
      <section className="hero">
        <div className="heroMedia" aria-hidden>
          <img src="/images/sanipep-consultation-hero.png" alt="" />
        </div>
        <div className="heroContent">
          <div className="heroCopy">
            <div className="heroTitle">
              <Text as="h1" variant="headline-2" weight="bold" wrap="balance">
                Versorgung mit System
              </Text>
            </div>
            <Text variant="featured-5" color="neutral-faded">
              Persönlich beraten, passgenau versorgt und digital begleitet: von Rezeptupload
              bis Terminwunsch und Kundenportal.
            </Text>
            <div className="heroActions">
              <Button color="primary" size="large" onClick={() => navigate("/termin-anfragen")}>
                <ButtonText icon={Calendar}>Termin buchen</ButtonText>
              </Button>
              <Button variant="outline" color="neutral" size="large" onClick={() => navigate("/rezept-hochladen")}>
                <ButtonText icon={Upload}>Rezept hochladen</ButtonText>
              </Button>
              <Button variant="ghost" color="neutral" size="large" onClick={() => navigate("/portal/login")}>
                <ButtonText icon={User}>Kundenportal</ButtonText>
              </Button>
            </div>
          </div>
          <div className="heroCards" aria-label="Schneller Einstieg">
            {[
              ["Persönliche Beratung", "Fachbereiche prüfen Anliegen, Rezept und Versorgungsziel."],
              ["Request-based Actions", "Uploads und Wünsche werden als Mitarbeiteranfrage modelliert."],
              ["Status statt Unsicherheit", "Portal zeigt Prüfung, Dauerrezept, Lieferung und Rückfragen."],
            ].map(([title, copy]) => (
              <div className="heroCard" key={title}>
                <View direction="column" gap={2}>
                  <Text variant="featured-6" weight="semibold">
                    {title}
                  </Text>
                  <Text variant="body-2" color="neutral-faded">
                    {copy}
                  </Text>
                </View>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="quickAccess">
        <div className="sectionInner">
          <div className="gridAuto">
            {primaryQuickAccess.map((item) => (
              <button className="accessCard" key={item.title} onClick={() => navigate(item.route)}>
                <IconBox icon={item.icon} />
                <span>
                  <Text as="span" variant="featured-6" weight="semibold">
                    {item.title}
                  </Text>
                  <Text as="span" variant="body-2" color="neutral-faded">
                    {item.copy}
                  </Text>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Section
        title="Wachstumsbereiche mit Terminqualität"
        lead="Lymphödem, Lipödem, Narbenkompression, Flachstrick-Kompression und Brustprothetik werden bewusst hochwertig, ruhig und beratungsorientiert geführt."
      >
        <div className="gridAuto">
          {premium.map((area) => (
            <ServiceCard key={area.id} area={area} navigate={navigate} />
          ))}
          <Card className="serviceCard" padding={5} raised>
            <View direction="column" gap={5}>
              <div className="serviceMeta">
                <IconBox icon={Clipboard} />
                <Badge color="primary" variant="faded">
                  Maßversorgung
                </Badge>
              </div>
              <View direction="column" gap={2}>
                <Text variant="featured-5" weight="semibold">
                  Flachstrick-Kompression
                </Text>
                <Text color="neutral-faded">
                  Maßnahme, Rezeptlage, Trageziel und Kontrolltermin werden als geführter Beratungsprozess abgebildet.
                </Text>
              </View>
              <Button variant="outline" color="neutral" onClick={() => navigate("/termin-anfragen")}>
                <ButtonText icon={Calendar}>Wunschtermin senden</ButtonText>
              </Button>
            </View>
          </Card>
        </div>
      </Section>

      <Section
        title="Automatisierte Prozesse für wiederkehrende Versorgung"
        lead="Inkontinenz und Pflegehilfsmittel bekommen einen Amazon-artigen Anfragefluss: Bedarf klären, Rezept einreichen, Status verfolgen, Wiederbestellung wünschen."
        tone="soft"
      >
        <div className="gridAuto">
          {secondary.map((area) => (
            <ServiceCard key={area.id} area={area} navigate={navigate} />
          ))}
        </div>
      </Section>

      <Section
        title="So startet Versorgung ohne Medienbruch"
        lead="Der MVP bucht noch keinen echten Kalender. Patienten senden einen Wunschtermin, Mitarbeiter prüfen und bestätigen."
      >
        <div className="gridTwo">
          <div className="processRail">
            {[
              ["Rezept hochladen", "Dokument wird als sensibler Request registriert."],
              ["Fragebogen ausfüllen", "Anliegen, Symptome und Versorgungssituation strukturiert erfassen."],
              ["Wunschtermin wählen", "Datum, 1-Stunden-Zeitfenster und Kontaktweg angeben."],
              ["Mitarbeiter bestätigt", "Fachbereich prüft und bestätigt oder schlägt Alternativen vor."],
              ["Versorgung startet", "Omnia bleibt führend; Portal zeigt freigegebene Statusdaten."],
            ].map(([title, copy], index) => (
              <div className="processStep" key={title}>
                <span className="stepNumber">{index + 1}</span>
                <View direction="column" gap={1}>
                  <Text variant="featured-6" weight="semibold">
                    {title}
                  </Text>
                  <Text color="neutral-faded">{copy}</Text>
                </View>
              </div>
            ))}
          </div>
          <AppointmentMiniModule navigate={navigate} />
        </div>
      </Section>

      <Section
        title="Kundenportal-Vorschau"
        lead="Read-mostly Portal mit sicheren Aktionen: Kunden sehen Status und lösen Anfragen aus, finale Änderungen werden durch Mitarbeiter und Omnia kontrolliert."
        tone="white"
      >
        <PortalPreview dashboard={portalDashboard} navigate={navigate} />
      </Section>

      <LocationContact navigate={navigate} />
    </>
  );
}

function Section({
  title,
  lead,
  children,
  tone = "default",
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
  tone?: "default" | "soft" | "white";
}) {
  return (
    <section
      className="section"
      style={{ background: tone === "white" ? "var(--sani-white)" : tone === "soft" ? "var(--sani-brand-soft)" : undefined }}
    >
      <div className="sectionInner">
        <header className="sectionHeader">
          <Text as="h2" variant="featured-2" weight="semibold" wrap="balance">
            {title}
          </Text>
          <Text variant="body-1" color="neutral-faded">
            {lead}
          </Text>
        </header>
        {children}
      </div>
    </section>
  );
}

function ServiceCard({ area, navigate }: { area: ServiceArea; navigate: Navigate }) {
  return (
    <Card className="serviceCard" padding={5} raised attributes={{ "data-priority": area.priority }}>
      <View direction="column" gap={5}>
        <div className="serviceMeta">
          <IconBox icon={area.priority === "automated" ? Package : Activity} />
          <Badge color={area.priority === "automated" ? "warning" : "primary"} variant="faded">
            {area.intent}
          </Badge>
        </div>
        <View direction="column" gap={2}>
          <Text variant="featured-5" weight="semibold">
            {area.title}
          </Text>
          <Text color="neutral-faded">{area.summary}</Text>
        </View>
        <Button variant="outline" color="neutral" onClick={() => navigate(area.route)}>
          <ButtonText icon={ChevronRight}>Bereich öffnen</ButtonText>
        </Button>
      </View>
    </Card>
  );
}

function AppointmentMiniModule({ navigate }: { navigate: Navigate }) {
  return (
    <div className="formPanel">
      <View direction="column" gap={5} padding={6}>
        <View direction="row" gap={3} align="center">
          <IconBox icon={Calendar} />
          <View direction="column" gap={1}>
            <Text variant="featured-5" weight="semibold">
              Wunschtermin anfragen
            </Text>
            <Text variant="body-2" color="neutral-faded">
              Noch keine verbindliche Kalenderbuchung.
            </Text>
          </View>
        </View>
        <ProgressBar value={58} color="primary" ariaLabel="Ausfüllfortschritt Beispiel" />
        <div className="formGrid">
          <label>
            <Text variant="body-2" weight="medium">
              Anliegen
            </Text>
            <select className="nativeSelect" defaultValue="Lipödem-Erstberatung">
              <option>Lipödem-Erstberatung</option>
              <option>Brustprothetik</option>
              <option>Rezeptbesprechung</option>
            </select>
          </label>
          <label>
            <Text variant="body-2" weight="medium">
              Zeitfenster
            </Text>
            <select className="nativeSelect" defaultValue="10:00 - 11:00">
              <option>08:00 - 09:00</option>
              <option>10:00 - 11:00</option>
              <option>14:00 - 15:00</option>
            </select>
          </label>
        </div>
        <Button color="primary" onClick={() => navigate("/termin-anfragen")}>
          <ButtonText icon={Calendar}>Terminanfrage starten</ButtonText>
        </Button>
      </View>
    </div>
  );
}

function PortalPreview({ dashboard, navigate }: { dashboard: PortalDashboard; navigate: Navigate }) {
  return (
    <div className="portalPreview">
      <div className="portalPanel portalTimeline">
        <View direction="column" gap={5}>
          <View direction="row" justify="space-between" align="center" gap={3}>
            <View direction="column" gap={1}>
              <Text variant="featured-5" weight="semibold">
                Aktueller Vorgang
              </Text>
              <Text color="neutral-faded">Kompressionsversorgung, Details datensparsam ausgeblendet.</Text>
            </View>
            <Badge color="warning" variant="faded">
              Prüfung
            </Badge>
          </View>
          <StatusRail activeStatus="employee-review" />
          <Button variant="outline" color="neutral" onClick={() => navigate("/portal/login")}>
            <ButtonText icon={User}>Portal ansehen</ButtonText>
          </Button>
        </View>
      </div>
      <div className="safeData">
        {dashboard.prescriptions.map((prescription) => (
          <div className="safeRow" key={prescription.id}>
            <View direction="row" justify="space-between" gap={3}>
              <Text variant="featured-6" weight="semibold">
                {prescription.title}
              </Text>
              <Badge color={statusColor(prescription.status)} variant="faded">
                {statusLabels[prescription.status]}
              </Badge>
            </View>
            <Text variant="body-2" color="neutral-faded">
              Rezept erhalten am {prescription.receivedAt}. Medizinische Details erscheinen nicht in Übersichtslisten.
            </Text>
          </div>
        ))}
        <div className="privacyNote">
          <Shield aria-hidden />
          <Text variant="body-2">
            Keine finalen Änderungen direkt in Omnia: Uploads, Abo-Wünsche und Bestellungen bleiben prüfbare Anfragen.
          </Text>
        </div>
      </div>
    </div>
  );
}

function StatusRail({ activeStatus }: { activeStatus: RequestStatus }) {
  const activeIndex = Math.max(
    0,
    statusSteps.findIndex((step) => step.status === activeStatus),
  );

  return (
    <div className="statusRail">
      {statusSteps.map((step, index) => (
        <div className="statusStep" key={step.status}>
          <span className="statusDot" data-state={index < activeIndex ? "done" : index === activeIndex ? "active" : "todo"}>
            {index < activeIndex ? <CheckCircle aria-hidden size={18} /> : index + 1}
          </span>
          <View direction="column" gap={1}>
            <Text variant="body-1" weight="semibold">
              {step.label}
            </Text>
            <Text variant="body-2" color="neutral-faded">
              {step.description}
            </Text>
          </View>
        </div>
      ))}
    </div>
  );
}

function HelpFinderPage({ navigate }: { navigate: Navigate }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => searchPatientIntent(query), [query]);

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={6}>
          <View direction="column" gap={3}>
            <Text as="h1" variant="featured-1" weight="semibold">
              Hilfe finden
            </Text>
            <Text color="neutral-faded">
              Die Suche priorisiert Symptome, danach Produkte und Situationen. So landet der Patient schneller beim passenden Termin, Upload oder Konfigurator.
            </Text>
          </View>
          <FormControl>
            <FormControl.Label>Symptom, Produkt oder Situation</FormControl.Label>
            <TextField
              name="search"
              size="large"
              value={query}
              onChange={({ value }) => setQuery(value)}
              placeholder="z. B. geschwollene Beine"
            />
          </FormControl>
          <div className="gridAuto">
            {matches.map((item) => {
              const actionRoute = fallbackRouteByAction[item.primaryAction];
              return (
                <Card padding={4} key={item.id} onClick={() => navigate(item.recommendedRoute)}>
                  <View direction="column" gap={4}>
                    <View direction="row" justify="space-between" gap={3} wrap>
                      <View direction="row" gap={3} align="center">
                        <IconBox icon={item.primaryAction === "configure" ? ShoppingCart : item.primaryAction === "upload" ? Upload : Search} />
                        <View direction="column" gap={1}>
                          <Text weight="semibold">{item.title}</Text>
                          <Text variant="caption-1" color="neutral-faded">
                            {item.term}
                          </Text>
                        </View>
                      </View>
                      <Badge color={item.category === "symptom" ? "primary" : item.category === "product" ? "warning" : "neutral"} variant="faded">
                        {categoryLabel[item.category]}
                      </Badge>
                    </View>
                    <Text variant="body-2" color="neutral-faded">
                      {item.summary}
                    </Text>
                    <View direction="row" gap={2} wrap>
                      {item.relatedTerms.slice(0, 3).map((term) => (
                        <Badge color="neutral" variant="faded" key={term}>
                          {term}
                        </Badge>
                      ))}
                    </View>
                    <View direction="row" gap={3} wrap>
                      <Button color="primary" onClick={(event) => {
                        event.stopPropagation();
                        navigate(actionRoute);
                      }}>
                        <ButtonText icon={ChevronRight}>{primaryActionLabel[item.primaryAction]}</ButtonText>
                      </Button>
                      {item.recommendedRoute !== actionRoute && (
                        <Button variant="outline" color="neutral" onClick={(event) => {
                          event.stopPropagation();
                          navigate(item.recommendedRoute);
                        }}>
                          <ButtonText icon={Eye}>Mehr dazu</ButtonText>
                        </Button>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })}
          </div>
          {matches.length === 0 && (
            <div className="privacyNote">
              <Search aria-hidden />
              <Text variant="body-2">
                Kein direkter Treffer. Senden Sie eine schriftliche Anfrage oder starten Sie eine Terminanfrage, damit ein Mitarbeiter das Anliegen zuordnet.
              </Text>
            </div>
          )}
        </View>
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <Text variant="featured-5" weight="semibold">
              Priorisierung im MVP
            </Text>
            {[
              ["1", "Symptome", "geschwollene Beine, Schmerzen, Alltagseinschränkung"],
              ["2", "Produkte", "Kompressionsstrümpfe, Brustprothese, Pflegehilfsmittel"],
              ["3", "Situationen", "Rezept erhalten, neue Versorgung, Wiederbestellung"],
            ].map(([number, title, copy]) => (
              <div className="processStep" key={title}>
                <span className="stepNumber">{number}</span>
                <View direction="column" gap={1}>
                  <Text weight="semibold">{title}</Text>
                  <Text variant="body-2" color="neutral-faded">
                    {copy}
                  </Text>
                </View>
              </div>
            ))}
            <div className="safeRow">
              <Text variant="body-2" color="neutral-faded">
                Aktueller Suchmodus
              </Text>
              <Text weight="semibold">
                {query.trim() ? `${matches.length} priorisierte Treffer` : "Top-Einstiege nach Patientensprache"}
              </Text>
            </div>
          </View>
        </div>
      </div>
    </section>
  );
}

function ServicePage({
  area,
  title,
  lead,
  bullets,
  navigate,
}: {
  area: ServiceArea;
  title: string;
  lead: string;
  bullets: string[];
  navigate: Navigate;
}) {
  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={6}>
          <View direction="column" gap={3}>
            <Text as="h1" variant="featured-1" weight="semibold" wrap="balance">
              {title}
            </Text>
            <Text variant="featured-6" color="neutral-faded">
              {lead}
            </Text>
          </View>
          <div className="gridAuto">
            {bullets.map((bullet) => (
              <Card padding={4} key={bullet}>
                <View direction="row" gap={3} align="start">
                  <IconBox icon={CheckCircle} />
                  <Text>{bullet}</Text>
                </View>
              </Card>
            ))}
          </div>
          <View direction="row" gap={3} wrap>
            <Button color="primary" size="large" onClick={() => navigate("/termin-anfragen")}>
              <ButtonText icon={Calendar}>Wunschtermin senden</ButtonText>
            </Button>
            <Button variant="outline" color="neutral" size="large" onClick={() => navigate("/rezept-hochladen")}>
              <ButtonText icon={Upload}>Rezept vorbereiten</ButtonText>
            </Button>
          </View>
        </View>
        <div className="plainPanel">
          <View direction="column" gap={5} padding={6}>
            <Badge color="primary" variant="faded">
              {area.intent}
            </Badge>
            <Text variant="featured-5" weight="semibold">
              Patientensignale
            </Text>
            <View direction="column" gap={2}>
              {area.searchSignals.map((signal) => (
                <View direction="row" gap={2} align="center" key={signal}>
                  <Search aria-hidden size={16} />
                  <Text variant="body-2">{signal}</Text>
                </View>
              ))}
            </View>
            <div className="privacyNote">
              <Shield aria-hidden />
              <Text variant="body-2">
                Fachliche Daten werden im Portal datensparsam angezeigt. Entscheidungen bleiben prüfbar.
              </Text>
            </div>
          </View>
        </div>
      </div>
    </section>
  );
}

function ConfiguratorPage({ navigate, onConversion }: { navigate: Navigate; onConversion: TrackConversion }) {
  const [need, setNeed] = useState("Inkontinenzversorgung");
  const [rhythm, setRhythm] = useState("monatlich");
  const [hasPrescription, setHasPrescription] = useState("ja");
  const [note, setNote] = useState("");
  const [created, setCreated] = useState<PortalRequest | null>(null);
  const recommendation = hasPrescription === "ja" ? "Rezept hochladen und Bestellanfrage senden" : "Fragebogen senden und Rezept nachreichen";

  const createConfigurationRequest = () => {
    const response = omniaAdapter.createCareConfigurationRequest({
      need,
      rhythm,
      hasPrescription: hasPrescription === "ja",
      note,
    });
    setCreated(response.request);
    onConversion({
      stage: "request-submitted",
      route: "/inkontinenz-pflege",
      requestType: response.request.type,
      safeCategory: need,
    });
  };

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <Text as="h1" variant="featured-1" weight="semibold">
            Inkontinenz & Pflege konfigurieren
          </Text>
          <Text color="neutral-faded">
            Der MVP bildet keine finale Bestellung ab. Er erzeugt eine prüfbare Bestellanfrage, die Mitarbeiter freigeben und später in Omnia auslösen.
          </Text>
          <div className="formPanel">
            <View direction="column" gap={5} padding={6}>
              <FormStep number={1} title="Bedarf einordnen" copy="Wiederkehrende Versorgung wird als prüfbare Anfrage vorbereitet.">
                <div className="formGrid">
                  <label>
                    <Text variant="body-2" weight="medium">
                      Bedarf
                    </Text>
                    <select className="nativeSelect" value={need} onChange={(event) => setNeed(event.target.value)}>
                      <option>Inkontinenzversorgung</option>
                      <option>Pflegehilfsmittel Pauschale</option>
                      <option>Kombinierte Anfrage</option>
                    </select>
                  </label>
                  <label>
                    <Text variant="body-2" weight="medium">
                      Gewünschter Rhythmus
                    </Text>
                    <select className="nativeSelect" value={rhythm} onChange={(event) => setRhythm(event.target.value)}>
                      <option>monatlich</option>
                      <option>alle 2 Monate</option>
                      <option>nur einmalig</option>
                    </select>
                  </label>
                  <label>
                    <Text variant="body-2" weight="medium">
                      Rezept vorhanden?
                    </Text>
                    <select className="nativeSelect" value={hasPrescription} onChange={(event) => setHasPrescription(event.target.value)}>
                      <option value="ja">ja</option>
                      <option value="nein">nein, ich reiche nach</option>
                    </select>
                  </label>
                </div>
              </FormStep>
              <FormStep number={2} title="Hinweis ergänzen" copy="Optionaler Freitext hilft der Mitarbeiterprüfung, ersetzt aber keine Omnia-Entscheidung.">
                <FormControl>
                  <FormControl.Label>Kurze Beschreibung</FormControl.Label>
                  <TextArea
                    name="careNote"
                    value={note}
                    onChange={({ value }) => setNote(value)}
                    placeholder="z. B. bisherige Versorgung, Lieferwunsch, Rückrufzeit"
                    resize="auto"
                  />
                </FormControl>
              </FormStep>
              <div className="privacyNote">
                <AlertCircle aria-hidden />
                <Text variant="body-2">
                  Ergebnis: {recommendation}. Es entsteht kein finaler Omnia-Auftrag ohne Mitarbeiterprüfung.
                </Text>
              </div>
              <View direction="row" gap={3} wrap>
                <Button color="primary" onClick={createConfigurationRequest}>
                  <ButtonText icon={Clipboard}>Bestellanfrage vorbereiten</ButtonText>
                </Button>
                <Button variant="outline" color="neutral" onClick={() => navigate("/rezept-hochladen")}>
                  <ButtonText icon={Upload}>Rezept hochladen</ButtonText>
                </Button>
                <Button variant="outline" color="neutral" onClick={() => navigate("/portal/login")}>
                  <ButtonText icon={User}>Im Portal anfragen</ButtonText>
                </Button>
              </View>
            </View>
          </div>
        </View>
        <div className="portalPanel portalTimeline">
          <View direction="column" gap={5}>
            <Text variant="featured-5" weight="semibold">
              Mock-Bestellverlauf
            </Text>
            <StatusRail activeStatus="employee-review" />
            <div className="safeRow">
              <Text weight="semibold">{need}</Text>
              <Text variant="body-2" color="neutral-faded">
                Gewünschter Rhythmus: {rhythm}. Finale Artikel und Mengen werden erst durch Mitarbeiter geprüft.
              </Text>
            </div>
            {created && (
              <div className="safeRow">
                <View direction="row" justify="space-between" gap={3} wrap>
                  <Text weight="semibold">{created.id}</Text>
                  <Badge color="primary" variant="faded">
                    {statusLabels[created.status]}
                  </Badge>
                </View>
                <Text variant="body-2" color="neutral-faded">
                  {created.publicSummary}
                </Text>
              </div>
            )}
          </View>
        </div>
      </div>
    </section>
  );
}

function PrescriptionUploadPage({ navigate, onConversion }: { navigate: Navigate; onConversion: TrackConversion }) {
  const [fileName, setFileName] = useState("Noch keine Datei ausgewählt");
  const [result, setResult] = useState<PortalRequest | null>(null);
  const [uploadEnvelope, setUploadEnvelope] = useState<UploadEnvelope | null>(null);
  const [context, setContext] = useState("Kompressionsversorgung");
  const [consentScopes, setConsentScopes] = useState<ConsentScope[]>([
    "health-data-processing",
    "prescription-upload",
    "portal-request",
  ]);
  const [error, setError] = useState("");

  const toggleConsentScope = (scope: ConsentScope) => {
    setConsentScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  };

  const submit = () => {
    try {
      const input: UploadInput = { fileName, context, consentScopes };
      const response = omniaAdapter.createUploadRequest(input);
      setResult(response.request);
      setUploadEnvelope(response.upload);
      setError("");
      onConversion({
        stage: "request-submitted",
        route: "/rezept-hochladen",
        requestType: response.request.type,
        safeCategory: context,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload-Anfrage konnte nicht erzeugt werden.");
    }
  };

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <Text as="h1" variant="featured-1" weight="semibold">
            Rezept hochladen
          </Text>
          <Text color="neutral-faded">
            Der Upload ist als sensible Anfrage modelliert. Medizinische Inhalte werden nicht in Listen oder Browser-Speicher repliziert.
          </Text>
          <div className="formPanel">
            <View direction="column" gap={5} padding={6}>
              <FormStep number={1} title="Versorgung zuordnen" copy="Der Kontext steuert die Mitarbeiterqueue und vermeidet unsichere Freitextzuordnung.">
                <label>
                  <Text variant="body-2" weight="medium">
                    Kontext
                  </Text>
                  <select className="nativeSelect" value={context} onChange={(event) => setContext(event.target.value)}>
                    <option>Kompressionsversorgung</option>
                    <option>Brustprothetik</option>
                    <option>Inkontinenzversorgung</option>
                    <option>Pflegehilfsmittel</option>
                    <option>Bandage/Orthese/Reha/Stoma</option>
                  </select>
                </label>
              </FormStep>
              <FormStep number={2} title="Rezept auswählen" copy="Die Datei wird als Upload-Request registriert, nicht im Browser gespeichert.">
                <FileUpload
                  name="prescription"
                  onChange={({ value }) => setFileName(value[0]?.name ?? "Noch keine Datei ausgewählt")}
                >
                  {({ highlighted }) => (
                    <div className="uploadDrop" style={{ background: highlighted ? "var(--sani-brand-soft)" : "var(--sani-page)" }}>
                      <View direction="column" gap={2} align="center">
                        <IconBox icon={Upload} />
                        <Text weight="semibold">Datei hier ablegen oder auswählen</Text>
                        <Text variant="body-2" color="neutral-faded">
                          {fileName}
                        </Text>
                      </View>
                    </div>
                  )}
                </FileUpload>
              </FormStep>
              <FormStep number={3} title="Einwilligung bestätigen" copy="Gesundheitsdaten werden nur mit passenden Consent-Scopes verarbeitet.">
                <View direction="column" gap={3}>
                  {prescriptionUploadPolicy.consentScopes.map((scope) => (
                    <label className="consentLine" key={scope}>
                      <input
                        type="checkbox"
                        checked={consentScopes.includes(scope)}
                        onChange={() => toggleConsentScope(scope)}
                      />
                      <Text variant="body-2">{consentCopy[scope]}</Text>
                    </label>
                  ))}
                </View>
              </FormStep>
              <FormControl>
                <FormControl.Label>Hinweis an saniPEP</FormControl.Label>
                <TextArea name="uploadNote" placeholder="Optional: Rückrufwunsch, offene Frage, Dringlichkeit" resize="auto" />
              </FormControl>
              {error && (
                <div className="privacyNote privacyNoteCritical">
                  <AlertCircle aria-hidden />
                  <Text variant="body-2">{error}</Text>
                </div>
              )}
              <Button color="primary" onClick={submit}>
                <ButtonText icon={Shield}>Upload-Anfrage erzeugen</ButtonText>
              </Button>
            </View>
          </div>
        </View>
        <ResultPanel result={result} navigate={navigate} uploadEnvelope={uploadEnvelope} />
      </div>
    </section>
  );
}

function AppointmentRequestPage({ navigate, onConversion }: { navigate: Navigate; onConversion: TrackConversion }) {
  const [input, setInput] = useState<AppointmentRequestInput>({
    concern: "Lipödem-Erstberatung",
    preferredDate: "2026-06-24",
    preferredWindow: "10:00 - 11:00",
    hasPrescription: true,
    shortQuestionnaire: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [created, setCreated] = useState<PortalRequest | null>(null);

  const update = (key: keyof AppointmentRequestInput, value: string | boolean) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    const response = omniaAdapter.createAppointmentRequest(input);
    setCreated(response.request);
    onConversion({
      stage: "request-submitted",
      route: "/termin-anfragen",
      requestType: response.request.type,
      safeCategory: input.concern,
    });
  };

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <Text as="h1" variant="featured-1" weight="semibold">
            Terminanfrage mit Wunschtermin
          </Text>
          <Text color="neutral-faded">
            Patienten wählen Datum, 1-Stunden-Fenster und Anliegen. Die Bestätigung erfolgt durch Mitarbeiter; die Architektur ist für Nextcloud oder Notion Kalender vorbereitet.
          </Text>
          <div className="formPanel">
            <View direction="column" gap={5} padding={6}>
              <FormStep number={1} title="Anliegen wählen" copy="Priorisierte Fachbereiche werden direkt in die richtige Prüfqueue geführt.">
                <div className="formGrid">
                  <label>
                    <Text variant="body-2" weight="medium">
                      Anliegen
                    </Text>
                    <select className="nativeSelect" value={input.concern} onChange={(event) => update("concern", event.target.value)}>
                      <option>Lipödem-Erstberatung</option>
                      <option>Lymphödem Versorgung</option>
                      <option>Narbenkompression</option>
                      <option>Brustprothetik</option>
                      <option>Rezeptbesprechung</option>
                    </select>
                  </label>
                  <label>
                    <Text variant="body-2" weight="medium">
                      Rezept
                    </Text>
                    <select
                      className="nativeSelect"
                      value={input.hasPrescription ? "ja" : "nein"}
                      onChange={(event) => update("hasPrescription", event.target.value === "ja")}
                    >
                      <option value="ja">vorhanden, Upload empfohlen</option>
                      <option value="nein">noch nicht vorhanden</option>
                    </select>
                  </label>
                </div>
              </FormStep>
              <FormStep number={2} title="Wunschfenster nennen" copy="Es entsteht nur ein Terminwunsch; Mitarbeiter bestätigen verbindlich.">
                <div className="formGrid">
                  <FormControl>
                    <FormControl.Label>Wunschdatum</FormControl.Label>
                    <TextField
                      name="preferredDate"
                      value={input.preferredDate}
                      onChange={({ value }) => update("preferredDate", value)}
                      inputAttributes={{ type: "date" }}
                    />
                  </FormControl>
                  <label>
                    <Text variant="body-2" weight="medium">
                      1-Stunden-Fenster
                    </Text>
                    <select
                      className="nativeSelect"
                      value={input.preferredWindow}
                      onChange={(event) => update("preferredWindow", event.target.value)}
                    >
                      <option>08:00 - 09:00</option>
                      <option>10:00 - 11:00</option>
                      <option>13:00 - 14:00</option>
                      <option>16:00 - 17:00</option>
                    </select>
                  </label>
                </div>
              </FormStep>
              <FormStep number={3} title="Kontakt und Fragebogen" copy="Kurze Angaben reichen für die Rückmeldung; Details bleiben prüfbar.">
                <div className="formGrid">
                  <FormControl>
                    <FormControl.Label>Name</FormControl.Label>
                    <TextField name="contactName" value={input.contactName} onChange={({ value }) => update("contactName", value)} />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>E-Mail</FormControl.Label>
                    <TextField
                      name="contactEmail"
                      value={input.contactEmail}
                      onChange={({ value }) => update("contactEmail", value)}
                      inputAttributes={{ type: "email" }}
                    />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>Telefon</FormControl.Label>
                    <TextField name="contactPhone" value={input.contactPhone} onChange={({ value }) => update("contactPhone", value)} />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>Kurzer Fragebogen</FormControl.Label>
                    <TextArea
                      name="shortQuestionnaire"
                      value={input.shortQuestionnaire}
                      onChange={({ value }) => update("shortQuestionnaire", value)}
                      placeholder="Was ist Ihr Anliegen, seit wann besteht es, was soll vorbereitet werden?"
                      resize="auto"
                    />
                  </FormControl>
                </div>
              </FormStep>
              <Button color="primary" onClick={submit}>
                <ButtonText icon={Calendar}>Terminanfrage senden</ButtonText>
              </Button>
            </View>
          </div>
        </View>
        <ResultPanel result={created} navigate={navigate} />
      </div>
    </section>
  );
}

function ResultPanel({
  result,
  navigate,
  uploadEnvelope,
}: {
  result: PortalRequest | null;
  navigate: Navigate;
  uploadEnvelope?: UploadEnvelope | null;
}) {
  return (
    <div className="portalPanel portalTimeline">
      <View direction="column" gap={5}>
        <Text variant="featured-5" weight="semibold">
          Mitarbeiter-Prüfstatus
        </Text>
        {result ? (
          <>
            <Badge color="primary" variant="faded">
              {result.id}
            </Badge>
            <Text weight="semibold">{result.title}</Text>
            <Text color="neutral-faded">{result.publicSummary}</Text>
            <StatusRail activeStatus={result.status} />
            <Button variant="outline" color="neutral" onClick={() => navigate("/portal")}>
              <ButtonText icon={Eye}>Im Portal simulieren</ButtonText>
            </Button>
            {uploadEnvelope && <UploadSecurityReceipt uploadEnvelope={uploadEnvelope} />}
          </>
        ) : (
          <>
            <Text color="neutral-faded">
              Nach dem Absenden erscheint hier der Request. Die finale Übernahme in Omnia wird nicht durch den Kunden ausgelöst.
            </Text>
            <StatusRail activeStatus="submitted" />
          </>
        )}
      </View>
    </div>
  );
}

function UploadSecurityReceipt({ uploadEnvelope }: { uploadEnvelope: UploadEnvelope }) {
  return (
    <div className="safeRow">
      <View direction="row" justify="space-between" gap={3} wrap>
        <Text weight="semibold">Upload-Sicherheitsnachweis</Text>
        <Badge color="warning" variant="faded">
          {uploadEnvelope.sensitivity}
        </Badge>
      </View>
      <Text variant="body-2" color="neutral-faded">
        {uploadEnvelope.uploadId} · {uploadEnvelope.fileName} · {uploadEnvelope.policy.storageTarget}
      </Text>
      <View direction="row" gap={2} wrap>
        <Badge color="positive" variant="faded">
          verschlüsselt
        </Badge>
        <Badge color="positive" variant="faded">
          Virenscan
        </Badge>
        <Badge color="neutral" variant="faded">
          LocalStorage: {uploadEnvelope.localPersistence}
        </Badge>
      </View>
      <Text variant="caption-1" color="neutral-faded">
        {uploadEnvelope.policy.retentionHint}
      </Text>
    </div>
  );
}

function ContactPage({ navigate, onConversion }: { navigate: Navigate; onConversion: TrackConversion }) {
  return (
    <>
      <LocationContact navigate={navigate} standalone />
      <section className="sectionTight" style={{ background: "var(--sani-page)" }}>
        <div className="sectionInner gridTwo">
          <ContactInquiryForm navigate={navigate} onConversion={onConversion} />
          <div className="plainPanel">
            <View direction="column" gap={5} padding={6}>
              <IconBox icon={Shield} />
              <Text variant="featured-5" weight="semibold">
                Sichere schriftliche Anfrage
              </Text>
              <Text color="neutral-faded">
                Das Formular ist als Request modelliert. Medizinische Details werden nicht in offenen Listen wiederholt, sondern durch Mitarbeiter im passenden Fachbereich geprüft.
              </Text>
              <StatusRail activeStatus="submitted" />
            </View>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactInquiryForm({ navigate, onConversion }: { navigate: Navigate; onConversion: TrackConversion }) {
  const [input, setInput] = useState<ContactInquiryInput>({
    topic: "Allgemeine Anfrage",
    serviceContext: "Lymphödem & Lipödem",
    message: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    preferredContactChannel: "email",
    containsHealthData: false,
  });
  const [created, setCreated] = useState<PortalRequest | null>(null);

  const update = (key: keyof ContactInquiryInput, value: string | boolean) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    const response = omniaAdapter.createWrittenInquiryRequest(input);
    setCreated(response.request);
    onConversion({
      stage: "request-submitted",
      route: "/kontakt",
      requestType: response.request.type,
      safeCategory: input.serviceContext,
    });
  };

  return (
    <div className="formPanel">
      <View direction="column" gap={5} padding={6}>
        <View direction="row" gap={3} align="center">
          <IconBox icon={MessageCircle} />
          <View direction="column" gap={1}>
            <Text variant="featured-5" weight="semibold">
              Schriftliche Anfrage
            </Text>
            <Text variant="body-2" color="neutral-faded">
              Für Rückfragen, Vorabklärung und Kontaktwünsche ohne direkte Omnia-Änderung.
            </Text>
          </View>
        </View>
        <div className="formSteps">
          <FormStep number={1} title="Anfrage zuordnen" copy="Thema und Fachbereich helfen bei der qualifizierten Rückmeldung.">
            <div className="formGrid">
              <label>
                <Text variant="body-2" weight="medium">
                  Thema
                </Text>
                <select className="nativeSelect" value={input.topic} onChange={(event) => update("topic", event.target.value)}>
                  <option>Allgemeine Anfrage</option>
                  <option>Rückfrage zu Rezept</option>
                  <option>Neue Versorgung</option>
                  <option>Lieferung oder Status</option>
                  <option>Rückrufwunsch</option>
                </select>
              </label>
              <label>
                <Text variant="body-2" weight="medium">
                  Fachbereich
                </Text>
                <select
                  className="nativeSelect"
                  value={input.serviceContext}
                  onChange={(event) => update("serviceContext", event.target.value)}
                >
                  <option>Lymphödem & Lipödem</option>
                  <option>Narbenkompression</option>
                  <option>Flachstrick-Kompression</option>
                  <option>Brustprothetik</option>
                  <option>Inkontinenz & Pflege</option>
                  <option>Bandagen/Orthesen/Reha/Stoma</option>
                </select>
              </label>
            </div>
          </FormStep>
          <FormStep number={2} title="Kontaktweg festlegen" copy="saniPEP kann per E-Mail, Telefon oder WhatsApp reagieren.">
            <div className="formGrid">
              <FormControl>
                <FormControl.Label>Name</FormControl.Label>
                <TextField name="contactInquiryName" value={input.contactName} onChange={({ value }) => update("contactName", value)} />
              </FormControl>
              <FormControl>
                <FormControl.Label>E-Mail</FormControl.Label>
                <TextField
                  name="contactInquiryEmail"
                  value={input.contactEmail}
                  onChange={({ value }) => update("contactEmail", value)}
                  inputAttributes={{ type: "email" }}
                />
              </FormControl>
              <FormControl>
                <FormControl.Label>Telefon</FormControl.Label>
                <TextField name="contactInquiryPhone" value={input.contactPhone} onChange={({ value }) => update("contactPhone", value)} />
              </FormControl>
              <label>
                <Text variant="body-2" weight="medium">
                  Antwortweg
                </Text>
                <select
                  className="nativeSelect"
                  value={input.preferredContactChannel}
                  onChange={(event) => update("preferredContactChannel", event.target.value)}
                >
                  <option value="email">E-Mail</option>
                  <option value="phone">Telefon</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </label>
            </div>
          </FormStep>
          <FormStep number={3} title="Nachricht senden" copy="Gesundheitsdaten werden als schutzbedürftiger Request behandelt.">
            <div className="formGrid">
              <FormControl>
                <FormControl.Label>Nachricht</FormControl.Label>
                <TextArea
                  name="contactInquiryMessage"
                  value={input.message}
                  onChange={({ value }) => update("message", value)}
                  placeholder="Worum geht es? Bitte keine unnötigen medizinischen Details im freien Text."
                  resize="auto"
                />
              </FormControl>
              <label>
                <Text variant="body-2" weight="medium">
                  Enthält Gesundheitsdaten?
                </Text>
                <select
                  className="nativeSelect"
                  value={input.containsHealthData ? "ja" : "nein"}
                  onChange={(event) => update("containsHealthData", event.target.value === "ja")}
                >
                  <option value="nein">nein / allgemeine Anfrage</option>
                  <option value="ja">ja, bitte geschützt prüfen</option>
                </select>
              </label>
            </div>
          </FormStep>
        </div>
        <div className="privacyNote">
          <Shield aria-hidden />
          <Text variant="body-2">
            Die Anfrage wird an Mitarbeiter zur Sichtung übergeben. Finale Stammdaten- oder Versorgungsänderungen werden nicht automatisch geschrieben.
          </Text>
        </div>
        <View direction="row" gap={3} wrap>
          <Button color="primary" onClick={submit}>
            <ButtonText icon={Mail}>Anfrage senden</ButtonText>
          </Button>
          <Button variant="outline" color="neutral" onClick={() => navigate("/termin-anfragen")}>
            <ButtonText icon={Calendar}>Lieber Termin anfragen</ButtonText>
          </Button>
        </View>
        {created && (
          <div className="safeRow">
            <View direction="row" justify="space-between" gap={3} wrap>
              <Text weight="semibold">{created.id}</Text>
              <Badge color="primary" variant="faded">
                Schriftliche Anfrage
              </Badge>
            </View>
            <Text color="neutral-faded">{created.publicSummary}</Text>
          </div>
        )}
      </View>
    </div>
  );
}

function LocationContact({ navigate, standalone = false }: { navigate: Navigate; standalone?: boolean }) {
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
              [Phone, "Telefon", contact.phone],
              [Mail, "E-Mail", contact.email],
              [MessageCircle, "WhatsApp", contact.whatsapp],
              [MapPin, "Adresse", contact.address],
            ].map(([Icon, label, value]) => (
              <Card padding={4} key={label as string}>
                <View direction="row" gap={3} align="center">
                  <IconBox icon={Icon as LucideIcon} />
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
            <Button color="primary" onClick={() => navigate("/termin-anfragen")}>
              <ButtonText icon={Calendar}>Termin anfragen</ButtonText>
            </Button>
            <Button variant="outline" color="neutral" onClick={() => navigate("/rezept-hochladen")}>
              <ButtonText icon={Upload}>Rezept hochladen</ButtonText>
            </Button>
          </View>
        </View>
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <Text variant="featured-5" weight="semibold">
              Parteiverkehr
            </Text>
            {contact.publicHours.map(([day, hours]) => (
              <View direction="row" justify="space-between" gap={4} key={day}>
                <Text weight="medium">{day}</Text>
                <Text color="neutral-faded">{hours}</Text>
              </View>
            ))}
            <div className="privacyNote">
              <Shield aria-hidden />
              <Text variant="body-2">
                Gesundheitsdaten bitte bevorzugt über Upload oder Portal senden, nicht frei per E-Mail.
              </Text>
            </div>
          </View>
        </div>
      </div>
    </section>
  );
}

function PortalLoginPage({ navigate }: { navigate: Navigate }) {
  const [loginInput, setLoginInput] = useState<PortalLoginInput>({
    email: "frau.muster@example.test",
    password: "demo-passwort",
  });
  const [activationInput, setActivationInput] = useState<PortalActivationInput>({
    email: "frau.muster@example.test",
    oneTimePassword: "SANI-2026",
    newPassword: "sanipep-demo-passwort",
    confirmPassword: "sanipep-demo-passwort",
    supportingLastName: "",
    supportingBirthDate: "",
  });
  const [authResult, setAuthResult] = useState<PortalAuthResult | null>(null);

  const updateLoginInput = (key: keyof PortalLoginInput, value: string) => {
    setLoginInput((current) => ({ ...current, [key]: value }));
  };

  const updateActivationInput = (key: keyof PortalActivationInput, value: string) => {
    setActivationInput((current) => ({ ...current, [key]: value }));
  };

  const submitLogin = () => {
    setAuthResult(authAdapter.loginWithPassword(loginInput));
  };

  const submitActivation = () => {
    setAuthResult(authAdapter.activatePortalAccess(activationInput));
  };

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <Text as="h1" variant="featured-1" weight="semibold">
            Kundenportal Login
          </Text>
          <Text color="neutral-faded">
            MVP-Logik: Einmalpasswort per Brief oder Handout, danach eigenes Passwort. Versicherungsnummer, Nachname und Geburtsdatum sind nur unterstützende Erstverifizierung.
          </Text>
          <div className="formPanel">
            <View direction="column" gap={5} padding={6}>
              <div className="responsiveTabs">
                <Tabs defaultValue="login" variant="bordered">
                <Tabs.List>
                  <Tabs.Item value="login">Einloggen</Tabs.Item>
                  <Tabs.Item value="activate">Portal aktivieren</Tabs.Item>
                </Tabs.List>
                <Tabs.Panel value="login">
                  <View direction="column" gap={4} paddingTop={5}>
                    <FormControl>
                      <FormControl.Label>E-Mail</FormControl.Label>
                      <TextField
                        name="email"
                        value={loginInput.email}
                        onChange={({ value }) => updateLoginInput("email", value)}
                        inputAttributes={{ type: "email" }}
                      />
                    </FormControl>
                    <FormControl>
                      <FormControl.Label>Passwort</FormControl.Label>
                      <TextField
                        name="password"
                        value={loginInput.password}
                        onChange={({ value }) => updateLoginInput("password", value)}
                        inputAttributes={{ type: "password" }}
                      />
                    </FormControl>
                    <Button color="primary" onClick={submitLogin}>
                      <ButtonText icon={Lock}>Einloggen</ButtonText>
                    </Button>
                  </View>
                </Tabs.Panel>
                <Tabs.Panel value="activate">
                  <View direction="column" gap={4} paddingTop={5}>
                    <FormControl>
                      <FormControl.Label>E-Mail</FormControl.Label>
                      <TextField
                        name="activationEmail"
                        value={activationInput.email}
                        onChange={({ value }) => updateActivationInput("email", value)}
                        inputAttributes={{ type: "email" }}
                      />
                    </FormControl>
                    <FormControl>
                      <FormControl.Label>Einmalpasswort</FormControl.Label>
                      <TextField
                        name="oneTimePassword"
                        value={activationInput.oneTimePassword}
                        onChange={({ value }) => updateActivationInput("oneTimePassword", value)}
                      />
                    </FormControl>
                    <div className="formGrid">
                      <FormControl>
                        <FormControl.Label>Neues Passwort</FormControl.Label>
                        <TextField
                          name="newPassword"
                          value={activationInput.newPassword}
                          onChange={({ value }) => updateActivationInput("newPassword", value)}
                          inputAttributes={{ type: "password" }}
                        />
                      </FormControl>
                      <FormControl>
                        <FormControl.Label>Passwort bestätigen</FormControl.Label>
                        <TextField
                          name="confirmPassword"
                          value={activationInput.confirmPassword}
                          onChange={({ value }) => updateActivationInput("confirmPassword", value)}
                          inputAttributes={{ type: "password" }}
                        />
                      </FormControl>
                      <FormControl>
                        <FormControl.Label>Nachname als Zusatzprüfung</FormControl.Label>
                        <TextField
                          name="supportingLastName"
                          value={activationInput.supportingLastName ?? ""}
                          onChange={({ value }) => updateActivationInput("supportingLastName", value)}
                        />
                      </FormControl>
                      <FormControl>
                        <FormControl.Label>Geburtsdatum als Zusatzprüfung</FormControl.Label>
                        <TextField
                          name="supportingBirthDate"
                          value={activationInput.supportingBirthDate ?? ""}
                          onChange={({ value }) => updateActivationInput("supportingBirthDate", value)}
                          inputAttributes={{ type: "date" }}
                        />
                      </FormControl>
                    </div>
                    <div className="privacyNote">
                      <Shield aria-hidden />
                      <Text variant="body-2">
                        {portalAuthPolicy.supportingVerification}
                      </Text>
                    </div>
                    <Button color="primary" onClick={submitActivation}>
                      <ButtonText icon={CheckCircle}>Portal aktivieren</ButtonText>
                    </Button>
                  </View>
                </Tabs.Panel>
                </Tabs>
              </div>
              {authResult && (
                <div className={authResult.ok ? "safeRow" : "privacyNote privacyNoteCritical"}>
                  <View direction="column" gap={2}>
                    <View direction="row" justify="space-between" gap={3} wrap>
                      <Text weight="semibold">{authResult.ok ? "Erfolgreich" : "Prüfung nötig"}</Text>
                      <Badge color={authResult.ok ? "positive" : "warning"} variant="faded">
                        {authResult.method}
                      </Badge>
                    </View>
                    <Text variant="body-2" color="neutral-faded">
                      {authResult.message}
                    </Text>
                    {authResult.ok && (
                      <Button color="primary" onClick={() => navigate("/portal")}>
                        <ButtonText icon={User}>Zum Portal</ButtonText>
                      </Button>
                    )}
                  </View>
                </div>
              )}
            </View>
          </div>
        </View>
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <IconBox icon={Shield} />
            <Text variant="featured-5" weight="semibold">
              Sicherheitsprinzip
            </Text>
            <Text color="neutral-faded">
              Das Portal darf Anfragen auslösen und Status anzeigen. Es schreibt keine finalen Änderungen in Omnia.
            </Text>
            <View direction="column" gap={2}>
              {[
                `Einmalpasswort per ${portalAuthPolicy.oneTimePasswordDelivery}`,
                "Magic Link später optional",
                "2FA später optional",
                "Audit-Log vorbereitet",
                portalAuthPolicy.localStoragePolicy,
              ].map((item) => (
                <View direction="row" gap={2} align="center" key={item}>
                  <CheckCircle aria-hidden size={16} />
                  <Text variant="body-2">{item}</Text>
                </View>
              ))}
            </View>
            <div className="safeRow">
              <Text variant="body-2" color="neutral-faded">
                Passwortregeln
              </Text>
              <View direction="column" gap={1}>
                {portalAuthPolicy.passwordRules.map((rule) => (
                  <Text variant="body-2" key={rule}>
                    {rule}
                  </Text>
                ))}
              </View>
            </div>
          </View>
        </div>
      </div>
    </section>
  );
}

function PortalDashboardPage({ navigate }: { navigate: Navigate }) {
  const [dashboard, setDashboard] = useState<PortalDashboard>(() => omniaAdapter.getPortalDashboard());

  const appendRequest = (request: PortalRequest) => {
    setDashboard((current) => ({
      ...current,
      requests: [request, ...current.requests],
    }));
  };

  const createReorderRequest = (supply: Supply) => {
    const response = omniaAdapter.createReorderRequest({
      supplyId: supply.id,
      supplyName: supply.name,
      rhythm: "naechste Lieferung",
      deliveryPreference: supply.nextDate,
    });
    appendRequest(response.request);
  };

  return (
    <section className="section">
      <div className="sectionInner portalShell">
        <aside className="portalNav plainPanel">
          <View direction="column" gap={4}>
            <View direction="row" gap={3} align="center">
              <IconBox icon={User} />
              <View direction="column" gap={1}>
                <Text weight="semibold">{dashboard.customer.displayName}</Text>
                <Text variant="caption-1" color="neutral-faded">
                  {dashboard.customer.id}
                </Text>
              </View>
            </View>
            {[
              [Home, "Dashboard"],
              [FileText, "Rezepte"],
              [Package, "Dauerversorgungen"],
              [ShoppingCart, "Bestellanfragen"],
              [Settings, "Kontaktdaten prüfen"],
            ].map(([Icon, label]) => (
              <button className="navLink" key={label as string}>
                <ButtonText icon={Icon as LucideIcon}>{label as string}</ButtonText>
              </button>
            ))}
          </View>
        </aside>
        <div className="portalMain">
          <View direction="row" justify="space-between" align="center" gap={4} wrap>
          <View direction="column" gap={2}>
            <Text as="h1" variant="featured-2" weight="semibold">
              Kundenportal
              </Text>
              <Text color="neutral-faded">Status ansehen, Rezepte hochladen und prüfbare Anfragen auslösen.</Text>
            </View>
            <Button color="primary" onClick={() => navigate("/rezept-hochladen")}>
              <ButtonText icon={Upload}>Rezept hochladen</ButtonText>
            </Button>
          </View>
          <div className="kpiGrid">
            {[
              ["Rezepte", dashboard.prescriptions.length.toString(), FileText],
              ["Dauerversorgungen", dashboard.supplies.length.toString(), Package],
              ["Offene Anfragen", dashboard.requests.length.toString(), Clipboard],
            ].map(([label, value, Icon]) => (
              <Card padding={5} key={label as string}>
                <View direction="row" justify="space-between" align="center">
                  <View direction="column" gap={1}>
                    <Text variant="body-2" color="neutral-faded">
                      {label as string}
                    </Text>
                    <Text variant="featured-3" weight="bold">
                      {value as string}
                    </Text>
                  </View>
                  <IconBox icon={Icon as LucideIcon} />
                </View>
              </Card>
            ))}
          </div>
          <PortalTabs dashboard={dashboard} onCreateReorderRequest={createReorderRequest} />
        </div>
      </div>
    </section>
  );
}

function AdminRequestsPage({
  navigate,
  conversionEvents,
}: {
  navigate: Navigate;
  conversionEvents: ConversionEvent[];
}) {
  const [dashboard, setDashboard] = useState<PortalDashboard>(() => omniaAdapter.getPortalDashboard());
  const [selectedId, setSelectedId] = useState(() => dashboard.requests[0]?.id ?? "");
  const [staffNote, setStaffNote] = useState("Noch keine Mitarbeiteraktion ausgeführt.");

  const selectedRequest = dashboard.requests.find((request) => request.id === selectedId) ?? dashboard.requests[0];
  const selectedPolicy = selectedRequest ? getRequestPolicy(selectedRequest) : null;
  const openRequests = dashboard.requests.filter((request) => !["closed", "confirmed"].includes(request.status)).length;

  const applyAction = (action: EmployeeReviewAction) => {
    if (!selectedRequest) return;
    const result = staffReviewAdapter.applyReviewAction(selectedRequest, action);
    setDashboard((current) => ({
      ...current,
      requests: current.requests.map((request) =>
        request.id === result.request.id ? result.request : request,
      ),
      audit: [result.audit, ...current.audit],
    }));
    setStaffNote(result.staffNote);
  };

  return (
    <section className="section">
      <div className="sectionInner">
        <View direction="column" gap={5}>
          <View direction="row" justify="space-between" align="center" gap={4} wrap>
            <View direction="column" gap={2}>
              <Text as="h1" variant="featured-2" weight="semibold">
                Mitarbeiter-Prüfqueue
              </Text>
              <Text color="neutral-faded">
                Interne Mock-Oberfläche für Kontrolle, Rückfragen, Omnia-Vorbereitung und Audit-Nachvollziehbarkeit.
              </Text>
            </View>
            <View direction="row" gap={3} wrap>
              <Button variant="outline" color="neutral" onClick={() => navigate("/admin/design-lab")}>
                <ButtonText icon={Palette}>Design-Lab</ButtonText>
              </Button>
              <Button variant="outline" color="neutral" onClick={() => navigate("/admin/integrations")}>
                <ButtonText icon={Settings}>Integrationen</ButtonText>
              </Button>
              <Button variant="outline" color="neutral" onClick={() => navigate("/portal")}>
                <ButtonText icon={User}>Portal prüfen</ButtonText>
              </Button>
            </View>
          </View>

          <div className="kpiGrid">
            {[
              ["Offen", openRequests.toString(), Clipboard],
              ["Audit-Events", dashboard.audit.length.toString(), Shield],
              ["Omnia-Direktschreibzugriffe", "0", Lock],
            ].map(([label, value, Icon]) => (
              <Card padding={5} key={label as string}>
                <View direction="row" justify="space-between" align="center">
                  <View direction="column" gap={1}>
                    <Text variant="body-2" color="neutral-faded">
                      {label as string}
                    </Text>
                    <Text variant="featured-3" weight="bold">
                      {value as string}
                    </Text>
                  </View>
                  <IconBox icon={Icon as LucideIcon} />
                </View>
              </Card>
            ))}
          </div>
          <div className="plainPanel">
            <View direction="column" gap={4} padding={6}>
              <SecurityBoundaryPanel compact />
            </View>
          </div>
          <div className="plainPanel">
            <View direction="column" gap={4} padding={6}>
              <ConversionFunnelPanel events={conversionEvents} compact />
            </View>
          </div>

          <div className="adminQueue">
            <div className="plainPanel adminList">
              <View direction="column" gap={3} padding={4}>
                <Text variant="featured-6" weight="semibold">
                  Eingehende Requests
                </Text>
                {dashboard.requests.map((request) => {
                  const policy = getRequestPolicy(request);
                  return (
                    <button
                      className="reviewListItem"
                      data-selected={request.id === selectedRequest?.id}
                      key={request.id}
                      onClick={() => setSelectedId(request.id)}
                    >
                      <View direction="column" gap={2}>
                        <View direction="row" justify="space-between" gap={2}>
                          <Text weight="semibold">{request.id}</Text>
                          <Badge color={statusColor(request.status)} variant="faded">
                            {statusLabels[request.status]}
                          </Badge>
                        </View>
                        <Text variant="body-2">{request.title}</Text>
                        <Text variant="caption-1" color="neutral-faded">
                          {policy.label} · {request.createdAt}
                        </Text>
                      </View>
                    </button>
                  );
                })}
              </View>
            </div>

            <div className="plainPanel">
              {selectedRequest && selectedPolicy && (
                <View direction="column" gap={5} padding={6}>
                  <View direction="row" justify="space-between" gap={3} wrap>
                    <View direction="column" gap={1}>
                      <Text variant="featured-4" weight="semibold">
                        {selectedRequest.title}
                      </Text>
                      <Text color="neutral-faded">
                        {selectedRequest.publicSummary}
                      </Text>
                    </View>
                    <Badge color={selectedPolicy.dataSensitivity === "health" ? "warning" : "primary"} variant="faded">
                      {selectedPolicy.dataSensitivity}
                    </Badge>
                  </View>

                  <div className="privacyNote">
                    <Shield aria-hidden />
                    <Text variant="body-2">
                      {selectedPolicy.reason} Diese Ansicht zeigt nur sichere Zusammenfassungen; medizinische Details bleiben in geschützten Fachansichten.
                    </Text>
                  </div>

                  <div className="gridAuto">
                    <div className="safeRow">
                      <Text variant="body-2" color="neutral-faded">
                        Status
                      </Text>
                      <Text weight="semibold">{statusLabels[selectedRequest.status]}</Text>
                    </div>
                    <div className="safeRow">
                      <Text variant="body-2" color="neutral-faded">
                        Mitarbeiterprüfung
                      </Text>
                      <Text weight="semibold">{selectedRequest.employeeReview}</Text>
                    </div>
                    <div className="safeRow">
                      <Text variant="body-2" color="neutral-faded">
                        Omnia-Schreibzugriff
                      </Text>
                      <Text weight="semibold">{selectedPolicy.omniaWriteAllowed ? "erlaubt" : "blockiert"}</Text>
                    </div>
                  </div>

                  <View direction="row" gap={3} wrap>
                    <Button color="primary" onClick={() => applyAction("start-review")}>
                      <ButtonText icon={Eye}>In Prüfung</ButtonText>
                    </Button>
                    <Button variant="outline" color="neutral" onClick={() => applyAction("request-info")}>
                      <ButtonText icon={MessageCircle}>Rückfrage</ButtonText>
                    </Button>
                    <Button variant="outline" color="neutral" onClick={() => applyAction("prepare-omnia")}>
                      <ButtonText icon={Settings}>Omnia vorbereiten</ButtonText>
                    </Button>
                    <Button color="positive" onClick={() => applyAction("approve")}>
                      <ButtonText icon={CheckCircle}>Freigeben</ButtonText>
                    </Button>
                  </View>

                  <div className="safeRow">
                    <Text variant="body-2" color="neutral-faded">
                      Mitarbeiternotiz
                    </Text>
                    <Text>{staffNote}</Text>
                  </div>
                </View>
              )}
            </div>
          </div>

          <div className="plainPanel">
            <View direction="column" gap={4} padding={6}>
              <Text variant="featured-5" weight="semibold">
                Audit-Log
              </Text>
              <div className="gridAuto">
                {dashboard.audit.slice(0, 6).map((event) => (
                  <div className="safeRow" key={event.id}>
                    <View direction="row" justify="space-between" gap={3}>
                      <Text weight="semibold">{event.action}</Text>
                      <Badge color="neutral" variant="faded">
                        {event.actor}
                      </Badge>
                    </View>
                    <Text variant="body-2" color="neutral-faded">
                      {event.at} {event.requestId ? `· ${event.requestId}` : ""}
                    </Text>
                  </div>
                ))}
              </div>
            </View>
          </div>
        </View>
      </div>
    </section>
  );
}

function AdminIntegrationsPage({
  navigate,
  conversionEvents,
}: {
  navigate: Navigate;
  conversionEvents: ConversionEvent[];
}) {
  return (
    <section className="section">
      <div className="sectionInner">
        <View direction="column" gap={5}>
          <View direction="row" justify="space-between" align="center" gap={4} wrap>
            <View direction="column" gap={2}>
              <Text as="h1" variant="featured-2" weight="semibold">
                Integrationsarchitektur
              </Text>
              <Text color="neutral-faded">
                Connector-Verträge für Strapi, Omnia, Nextcloud Kalender und Notion Kalender mit Datenklassen, Grenzen und Failure Modes.
              </Text>
            </View>
            <View direction="row" gap={3} wrap>
              <Button variant="outline" color="neutral" onClick={() => navigate("/admin/requests")}>
                <ButtonText icon={Clipboard}>Prüfqueue</ButtonText>
              </Button>
              <Button variant="outline" color="neutral" onClick={() => navigate("/admin/design-lab")}>
                <ButtonText icon={Palette}>Design-Lab</ButtonText>
              </Button>
            </View>
          </View>

          <div className="kpiGrid">
            {[
              ["Connectoren", integrationSummary.total.toString(), Settings],
              ["Backend-ready", integrationSummary.ready.toString(), CheckCircle],
              ["Mocked/Blockiert", `${integrationSummary.mocked}/${integrationSummary.blocked}`, AlertCircle],
            ].map(([label, value, Icon]) => (
              <Card padding={5} key={label as string}>
                <View direction="row" justify="space-between" align="center">
                  <View direction="column" gap={1}>
                    <Text variant="body-2" color="neutral-faded">
                      {label as string}
                    </Text>
                    <Text variant="featured-3" weight="bold">
                      {value as string}
                    </Text>
                  </View>
                  <IconBox icon={Icon as LucideIcon} />
                </View>
              </Card>
            ))}
          </div>

          <div className="plainPanel">
            <View direction="column" gap={4} padding={6}>
              <ConversionFunnelPanel events={conversionEvents} />
            </View>
          </div>

          <IntegrationReadinessPanel />
        </View>
      </div>
    </section>
  );
}

function IntegrationReadinessPanel({ compact = false }: { compact?: boolean }) {
  const visibleContracts = compact ? integrationContracts.slice(0, 3) : integrationContracts;

  return (
    <View direction="column" gap={4}>
      <View direction="column" gap={1}>
        <Text variant="featured-6" weight="semibold">
          Connector-Verträge
        </Text>
        <Text variant="body-2" color="neutral-faded">
          Jeder Connector definiert Datenhoheit, erlaubte Operationen, Failure Mode und den nächsten Backend-Schritt.
        </Text>
      </View>
      <div className="gridAuto">
        {visibleContracts.map((contract) => (
          <IntegrationContractCard key={contract.id} contract={contract} />
        ))}
      </div>
    </View>
  );
}

function IntegrationContractCard({ contract }: { contract: IntegrationContract }) {
  return (
    <div className="safeRow">
      <View direction="row" justify="space-between" gap={3} wrap>
        <View direction="column" gap={1}>
          <Text weight="semibold">{contract.label}</Text>
          <Text variant="caption-1" color="neutral-faded">
            {contract.leadingSystem ? "führendes System" : "angebundenes System"}
          </Text>
        </View>
        <Badge color={integrationStatusColor(contract.status)} variant="faded">
          {contract.status}
        </Badge>
      </View>
      <Text variant="body-2" color="neutral-faded">
        {contract.boundary}
      </Text>
      <View direction="column" gap={2}>
        {contract.operations.map((operation) => (
          <View direction="row" justify="space-between" gap={3} wrap key={operation.id}>
            <Text variant="body-2" weight="medium">
              {operation.label}
            </Text>
            <Badge color={operation.sensitive ? "warning" : "neutral"} variant="faded">
              {operation.direction}
            </Badge>
          </View>
        ))}
      </View>
      <div className="privacyNote">
        <AlertCircle aria-hidden />
        <Text variant="body-2">{contract.failureMode}</Text>
      </div>
      <Text variant="caption-1" color="neutral-faded">
        Nächster Schritt: {contract.nextStep}
      </Text>
    </div>
  );
}

function PortalTabs({
  dashboard,
  onCreateReorderRequest,
}: {
  dashboard: PortalDashboard;
  onCreateReorderRequest: (supply: Supply) => void;
}) {
  return (
    <div className="responsiveTabs portalTabs">
      <Tabs defaultValue="requests" variant="bordered">
      <Tabs.List>
        <Tabs.Item value="requests">Offene Anfragen</Tabs.Item>
        <Tabs.Item value="supplies">Dauerversorgungen</Tabs.Item>
        <Tabs.Item value="prescriptions">Rezepterinnerung</Tabs.Item>
        <Tabs.Item value="staff">Mitarbeiterprüfung</Tabs.Item>
        <Tabs.Item value="policy">Request-Regeln</Tabs.Item>
      </Tabs.List>
      <Tabs.Panel value="requests">
        <View direction="column" gap={3} paddingTop={5}>
          {dashboard.requests.length === 0 && (
            <StateNotice
              icon={Clipboard}
              title="Keine offenen Anfragen"
              copy="Neue Uploads, Terminwünsche und Bestellanfragen erscheinen hier als prüfbare Karten."
            />
          )}
          {dashboard.requests.map((request) => {
            const policy = getRequestPolicy(request);
            return (
              <div className="requestRow" key={request.id}>
                <View direction="row" justify="space-between" gap={3} wrap>
                  <Text weight="semibold">{request.title}</Text>
                  <View direction="row" gap={2} wrap>
                    <Badge color={statusColor(request.status)} variant="faded">
                      {statusLabels[request.status]}
                    </Badge>
                    <Badge color={policy.allowed ? "primary" : "critical"} variant="faded">
                      {policy.executionMode}
                    </Badge>
                  </View>
                </View>
                <Text variant="body-2" color="neutral-faded">
                  {request.publicSummary}
                </Text>
                <Text variant="caption-1" color="neutral-faded">
                  {policy.reason}
                </Text>
              </div>
            );
          })}
        </View>
      </Tabs.Panel>
      <Tabs.Panel value="supplies">
        <View direction="column" gap={3} paddingTop={5}>
          {dashboard.supplies.length === 0 && (
            <StateNotice
              icon={Package}
              title="Keine Dauerversorgung sichtbar"
              copy="Freigegebene Omnia-Versorgungen werden hier als mobile Karten gespiegelt."
            />
          )}
          {dashboard.supplies.map((supply) => (
            <div className="supplyRow" key={supply.id}>
              <View direction="row" justify="space-between" gap={3} wrap>
                <Text weight="semibold">{supply.name}</Text>
                <Badge color={statusColor(supply.status)} variant="faded">
                  {statusLabels[supply.status]}
                </Badge>
              </View>
              <Text variant="body-2" color="neutral-faded">
                {supply.nextAction} am {supply.nextDate}. Änderungen werden nur als Anfrage gesendet.
              </Text>
              <Button
                variant="outline"
                color="neutral"
                disabled={!supply.canRequestChange}
                onClick={() => onCreateReorderRequest(supply)}
              >
                <ButtonText icon={ShoppingCart}>Bestellanfrage stellen</ButtonText>
              </Button>
            </div>
          ))}
        </View>
      </Tabs.Panel>
      <Tabs.Panel value="prescriptions">
        <View direction="column" gap={3} paddingTop={5}>
          {dashboard.prescriptions.length === 0 && (
            <StateNotice
              icon={FileText}
              title="Keine Rezepterinnerung"
              copy="Sobald ein Rezept sicher geprüft wurde, erscheint hier ein datensparsamer Status."
            />
          )}
          {dashboard.prescriptions.map((prescription) => (
            <div className="safeRow" key={prescription.id}>
              <View direction="row" justify="space-between" gap={3} wrap>
                <Text weight="semibold">{prescription.title}</Text>
                <Badge color={statusColor(prescription.status)} variant="faded">
                  Ablauf {prescription.expiresAt}
                </Badge>
              </View>
              <Text variant="body-2" color="neutral-faded">
                {prescription.hiddenDetails}
              </Text>
            </div>
          ))}
        </View>
      </Tabs.Panel>
      <Tabs.Panel value="staff">
        <View direction="column" gap={3} paddingTop={5}>
          {dashboard.audit.length === 0 && (
            <StateNotice
              icon={Shield}
              title="Noch kein Prüfverlauf"
              copy="Mitarbeiteraktionen und Systemereignisse werden als Timeline-Karten angezeigt."
            />
          )}
          {dashboard.audit.map((event) => (
            <div className="requestRow" key={event.id}>
              <View direction="row" justify="space-between" gap={3}>
                <Text weight="semibold">{event.action}</Text>
                <Badge color="neutral" variant="faded">
                  {event.actor}
                </Badge>
              </View>
              <Text variant="body-2" color="neutral-faded">
                {event.at} {event.requestId ? `- ${event.requestId}` : ""}
              </Text>
            </div>
          ))}
        </View>
      </Tabs.Panel>
      <Tabs.Panel value="policy">
        <View direction="column" gap={4} paddingTop={5}>
          <WorkflowPolicyPanel />
        </View>
      </Tabs.Panel>
      </Tabs>
    </div>
  );
}

function WorkflowPolicyPanel({ compact = false }: { compact?: boolean }) {
  const visiblePolicies = compact
    ? workflowPolicyMatrix.filter((policy) => policy.executionMode === "blocked" || policy.dataSensitivity === "health")
    : workflowPolicyMatrix;

  return (
    <View direction="column" gap={4}>
      <View direction="column" gap={1}>
        <Text variant="featured-6" weight="semibold">
          Omnia-Guardrails
        </Text>
        <Text variant="body-2" color="neutral-faded">
          Kundenaktionen bleiben Requests. Direkte Schreibzugriffe auf Omnia-Stammdaten, Dauerrezepte, Dauerversorgungen oder finale Bestellungen sind blockiert.
        </Text>
      </View>
      <div className="gridAuto">
        {visiblePolicies.map((policy) => (
          <PolicyCard key={policy.intent} policy={policy} />
        ))}
      </div>
    </View>
  );
}

function SecurityBoundaryPanel({ compact = false }: { compact?: boolean }) {
  const visibleRoles = compact
    ? roleCapabilities.filter((role) => role.role !== "anonymous")
    : roleCapabilities;

  return (
    <View direction="column" gap={4}>
      <View direction="column" gap={1}>
        <Text variant="featured-6" weight="semibold">
          DSGVO- und Rollenmodell
        </Text>
        <Text variant="body-2" color="neutral-faded">
          Portal, Mitarbeiterprüfung und Uploads sind getrennt. Sensible Daten bleiben Request- und Review-gebunden.
        </Text>
      </View>
      <div className="gridAuto">
        {visibleRoles.map((role) => (
          <div className="safeRow" key={role.role}>
            <View direction="row" justify="space-between" gap={3} wrap>
              <Text weight="semibold">{role.role}</Text>
              <Badge color={role.canWriteOmniaDirectly ? "critical" : "neutral"} variant="faded">
                Omnia write: {role.canWriteOmniaDirectly ? "ja" : "nein"}
              </Badge>
            </View>
            <Text variant="body-2" color="neutral-faded">
              {role.note}
            </Text>
            <View direction="row" gap={2} wrap>
              {role.canCreateRequest && <Badge color="primary" variant="faded">Requests</Badge>}
              {role.canReviewRequest && <Badge color="warning" variant="faded">Review</Badge>}
              {role.canPrepareOmniaChange && <Badge color="neutral" variant="faded">Omnia Vorbereitung</Badge>}
              {role.canReadPortalStatus && <Badge color="positive" variant="faded">Status lesen</Badge>}
            </View>
          </div>
        ))}
      </div>
      <div className="safeRow">
        <Text weight="semibold">{prescriptionUploadPolicy.label}</Text>
        <Text variant="body-2" color="neutral-faded">
          {prescriptionUploadPolicy.publicCopy}
        </Text>
        <View direction="row" gap={2} wrap>
          <Badge color="positive" variant="faded">Verschlüsselung</Badge>
          <Badge color="positive" variant="faded">Virenscan</Badge>
          <Badge color="neutral" variant="faded">Max {prescriptionUploadPolicy.maxFileSizeMb} MB</Badge>
        </View>
      </div>
    </View>
  );
}

function PolicyCard({ policy }: { policy: ActionPolicyDecision }) {
  return (
    <div className="safeRow">
      <View direction="row" justify="space-between" gap={3} wrap>
        <View direction="row" gap={2} align="center">
          {policy.allowed ? <CheckCircle aria-hidden size={17} /> : <Lock aria-hidden size={17} />}
          <Text weight="semibold">{policy.label}</Text>
        </View>
        <Badge color={policy.allowed ? "primary" : "critical"} variant="faded">
          {policy.executionMode}
        </Badge>
      </View>
      <Text variant="body-2" color="neutral-faded">
        {policy.reason}
      </Text>
      <View direction="row" gap={2} wrap>
        <Badge color={policy.staffReviewRequired ? "warning" : "neutral"} variant="faded">
          Mitarbeiterprüfung
        </Badge>
        <Badge color={policy.auditRequired ? "positive" : "neutral"} variant="faded">
          Audit
        </Badge>
        <Badge color={policy.omniaWriteAllowed ? "critical" : "neutral"} variant="faded">
          Omnia write: {policy.omniaWriteAllowed ? "ja" : "nein"}
        </Badge>
      </View>
    </div>
  );
}

function ConversionFunnelPanel({
  events,
  compact = false,
}: {
  events: ConversionEvent[];
  compact?: boolean;
}) {
  const summary = useMemo(() => summarizeConversionEvents(events), [events]);
  const visibleGoals = compact ? summary.byGoal.slice(0, 4) : summary.byGoal;

  return (
    <View direction="column" gap={4}>
      <View direction="column" gap={1}>
        <Text variant={compact ? "featured-6" : "featured-5"} weight="semibold">
          Conversion-Funnel ohne Gesundheitsdaten
        </Text>
        <Text variant="body-2" color="neutral-faded">
          Termine, Rezeptuploads und schriftliche Anfragen werden nur als sichere Ziel- und Request-Ereignisse gezählt.
        </Text>
      </View>
      <div className="kpiGrid">
        {[
          ["Events", summary.total.toString(), Activity],
          ["Requests", summary.requestSubmissions.toString(), Clipboard],
          ["Omnia-Write", "0", Lock],
        ].map(([label, value, Icon]) => (
          <Card padding={4} key={label as string}>
            <View direction="row" justify="space-between" align="center" gap={3}>
              <View direction="column" gap={1}>
                <Text variant="body-2" color="neutral-faded">
                  {label as string}
                </Text>
                <Text variant="featured-4" weight="bold">
                  {value as string}
                </Text>
              </View>
              <IconBox icon={Icon as LucideIcon} />
            </View>
              </Card>
            ))}
          </div>
          <div className="gridAuto">
        {visibleGoals.map((item) => (
          <div className="safeRow" key={item.goal}>
            <View direction="row" justify="space-between" align="center" gap={3} wrap>
              <Text weight="semibold">{conversionGoalLabel[item.goal]}</Text>
              <Badge color="primary" variant="faded">
                {item.count}
              </Badge>
            </View>
          </div>
        ))}
      </div>
      {!compact && (
        <div className="gridAuto">
          {summary.byStage.map((item) => (
            <div className="safeRow" key={item.stage}>
              <Text variant="body-2" color="neutral-faded">
                {conversionStageLabel[item.stage]}
              </Text>
              <Text weight="semibold">{item.count}</Text>
            </div>
          ))}
        </div>
      )}
      <div className="privacyNote">
        <Shield aria-hidden />
        <Text variant="body-2">{conversionPrivacyBoundary}</Text>
      </div>
    </View>
  );
}

function DesignLabPage({ conversionEvents }: { conversionEvents: ConversionEvent[] }) {
  const [palette, setPalette] = useState<DesignLabPalette>("trust");
  const [appointmentVariant, setAppointmentVariant] = useState("Schritt-für-Schritt-Assistent");
  const [portalVariant, setPortalVariant] = useState("Amazon-artige Timeline");
  const [statusVariant, setStatusVariant] = useState("Timeline");
  const activePalette = designLabPalettes[palette];

  return (
    <section className="section">
      <div className="sectionInner">
        <View direction="column" gap={5}>
          <View direction="column" gap={2}>
            <Text as="h1" variant="featured-1" weight="semibold">
              Admin Design-Lab
            </Text>
            <Text color="neutral-faded">
              Internes Werkzeug für Reshaped-basierte Varianten: Farben, Buttons, Terminmodule, Portalverlauf, Statusanzeigen und Formularlayouts.
            </Text>
          </View>
          <div className="labShell">
            <aside className="labControls labPanel">
              <View direction="column" gap={5}>
                <FormControl>
                  <FormControl.Label>Farbschema</FormControl.Label>
                  <select className="nativeSelect" value={palette} onChange={(event) => setPalette(event.target.value as DesignLabPalette)}>
                    {Object.entries(designLabPalettes).map(([key, value]) => (
                      <option value={key} key={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormControl>
                  <FormControl.Label>Terminmodul</FormControl.Label>
                  <select className="nativeSelect" value={appointmentVariant} onChange={(event) => setAppointmentVariant(event.target.value)}>
                    <option>Kalenderkarten</option>
                    <option>Listenansicht</option>
                    <option>Schritt-für-Schritt-Assistent</option>
                    <option>Kompakter Formularflow</option>
                  </select>
                </FormControl>
                <FormControl>
                  <FormControl.Label>Portal-Bestellverlauf</FormControl.Label>
                  <select className="nativeSelect" value={portalVariant} onChange={(event) => setPortalVariant(event.target.value)}>
                    <option>Amazon-artige Timeline</option>
                    <option>Kartenbasierte Versorgungsliste</option>
                    <option>Mobile Karten-/Reihenansicht</option>
                    <option>Status-Stepper</option>
                  </select>
                </FormControl>
                <FormControl>
                  <FormControl.Label>Rezeptstatus</FormControl.Label>
                  <select className="nativeSelect" value={statusVariant} onChange={(event) => setStatusVariant(event.target.value)}>
                    <option>Ampellogik</option>
                    <option>Timeline</option>
                    <option>Dokumentenkarte</option>
                    <option>Prüfungsausweis mit Mitarbeiterstatus</option>
                  </select>
                </FormControl>
              </View>
            </aside>
            <div
              className="labPreview"
              style={
                {
                  "--lab-primary": activePalette.primary,
                  "--lab-action": activePalette.action,
                  "--lab-surface": activePalette.surface,
                  "--lab-background": activePalette.background,
                } as React.CSSProperties
              }
            >
              <Card padding={5} raised>
                <View direction="column" gap={4}>
                  <View direction="row" justify="space-between" gap={4} wrap>
                    <View direction="column" gap={1}>
                      <Text variant="featured-5" weight="semibold">
                        Farb- und Buttonvergleich
                      </Text>
                      <Text color="neutral-faded">Aktiv: {activePalette.label}</Text>
                    </View>
                    <div className="swatchRow" aria-label="Farbfelder">
                      <span className="swatch" style={{ background: activePalette.primary }} />
                      <span className="swatch" style={{ background: activePalette.action }} />
                      <span className="swatch" style={{ background: activePalette.background }} />
                      <span className="swatch" style={{ background: activePalette.surface }} />
                    </div>
                  </View>
                  <View direction="row" gap={3} wrap>
                    <Button color="primary">
                      <ButtonText icon={Calendar}>Reshaped Primary</ButtonText>
                    </Button>
                    <Button variant="outline" color="neutral">
                      <ButtonText icon={Upload}>Reshaped Outline</ButtonText>
                    </Button>
                    <button className="labAction">
                      <ButtonText icon={Palette}>Aktionsakzent</ButtonText>
                    </button>
                  </View>
                </View>
              </Card>
              <div className="labPanel">
                <View direction="column" gap={4} padding={5}>
                  <ConversionFunnelPanel events={conversionEvents} compact />
                </View>
              </div>

              <div className="gridAuto">
                <Card padding={5}>
                  <View direction="column" gap={4}>
                    <Text variant="featured-6" weight="semibold">
                      Terminmodul: {appointmentVariant}
                    </Text>
                    {appointmentVariant === "Kalenderkarten" ? (
                      <div className="gridAuto">
                        {["Mo 22", "Di 23", "Mi 24"].map((day) => (
                          <div className="safeRow" key={day}>
                            <Text weight="semibold">{day}</Text>
                            <Text variant="body-2" color="neutral-faded">
                              10:00 - 11:00
                            </Text>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <StatusRail activeStatus={appointmentVariant === "Kompakter Formularflow" ? "submitted" : "employee-review"} />
                    )}
                  </View>
                </Card>
                <Card padding={5}>
                  <View direction="column" gap={4}>
                    <Text variant="featured-6" weight="semibold">
                      Portalverlauf: {portalVariant}
                    </Text>
                    {portalVariant === "Mobile Karten-/Reihenansicht" ? (
                      <div className="mobileCardList">
                        {portalDashboard.requests.map((request) => (
                          <div className="requestRow" key={request.id}>
                            <Text variant="body-2">{request.id}</Text>
                            <Badge color={statusColor(request.status)} variant="faded">
                              {statusLabels[request.status]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <StatusRail activeStatus="omnia-prepared" />
                    )}
                  </View>
                </Card>
                <Card padding={5}>
                  <View direction="column" gap={4}>
                    <Text variant="featured-6" weight="semibold">
                      Responsive Zustände
                    </Text>
                    <div className="stateGrid">
                      <StateNotice icon={Activity} title="Lädt" copy="Fortschritt und Skeleton-Flächen bleiben auf 360px lesbar." />
                      <StateNotice icon={AlertCircle} title="Fehler" copy="Fehlertexte umbrechen ohne CTAs oder Formularfelder zu verdecken." />
                      <StateNotice icon={Clipboard} title="Leer" copy="Leere Listen zeigen eine klare nächste Aktion statt einer leeren Fläche." />
                    </div>
                  </View>
                </Card>
                <Card padding={5}>
                  <View direction="column" gap={4}>
                    <Text variant="featured-6" weight="semibold">
                      Rezeptstatus: {statusVariant}
                    </Text>
                    <div className="privacyNote">
                      <Shield aria-hidden />
                      <Text variant="body-2">
                        Default, error, disabled und success sind über Reshaped-Komponenten sichtbar zu testen.
                      </Text>
                    </div>
                    <View direction="row" gap={2} wrap>
                      <Badge color="positive">success</Badge>
                      <Badge color="warning">review</Badge>
                      <Badge color="critical">error</Badge>
                      <Badge color="neutral">disabled</Badge>
                    </View>
                  </View>
                </Card>
                <Card padding={5}>
                  <View direction="column" gap={4}>
                    <Text variant="featured-6" weight="semibold">
                      Konzeptreferenz
                    </Text>
                    <img className="conceptImage" src="/images/sanipep-ui-concept.png" alt="Designkonzept Website und Portal" />
                  </View>
                </Card>
              </div>

              <Card padding={5}>
                <View direction="column" gap={4}>
                  <Text variant="featured-5" weight="semibold">
                    Strapi Content-Type Vorschau
                  </Text>
                  <div className="gridAuto">
                    {strapiContentTypes.slice(0, 6).map((type) => (
                      <div className="safeRow" key={type.uid}>
                        <Text weight="semibold">{type.uid}</Text>
                        <Text variant="body-2" color="neutral-faded">
                          {type.purpose}
                        </Text>
                        <Badge color={type.privacy === "public" ? "primary" : "neutral"} variant="faded">
                          {type.privacy}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </View>
              </Card>
              <Card padding={5}>
                <WorkflowPolicyPanel compact />
              </Card>
              <Card padding={5}>
                <SecurityBoundaryPanel compact />
              </Card>
              <Card padding={5}>
                <IntegrationReadinessPanel compact />
              </Card>
            </div>
          </div>
        </View>
      </div>
    </section>
  );
}

function SiteFooter({ navigate }: { navigate: Navigate }) {
  return (
    <footer className="footer">
      <div className="sectionInner">
        <View direction="row" justify="space-between" gap={5} wrap>
          <View direction="column" gap={1}>
            <Text weight="semibold">saniPEP Sanitätshaus</Text>
            <Text variant="body-2" color="neutral-faded">
              {contact.address} · {contact.phone} · {contact.email}
            </Text>
          </View>
          <View direction="row" gap={2} wrap>
            <button className="textButton" onClick={() => navigate("/admin/design-lab")}>
              /admin/design-lab
            </button>
            <button className="textButton" onClick={() => navigate("/admin/requests")}>
              /admin/requests
            </button>
            <button className="textButton" onClick={() => navigate("/admin/integrations")}>
              /admin/integrations
            </button>
            <button className="textButton" onClick={() => navigate("/portal/login")}>
              Kundenportal
            </button>
            <button className="textButton" onClick={() => navigate("/kontakt")}>
              Kontakt
            </button>
          </View>
        </View>
      </div>
    </footer>
  );
}

export default App;
