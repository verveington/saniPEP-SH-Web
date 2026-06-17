import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Calendar,
  CheckCircle,
  FileText,
  Lock,
  Monitor,
  PackageCheck,
  Palette,
  Shield,
  Smartphone,
  Tablet,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";
import { Badge, Reshaped, Text, View } from "reshaped";
import "reshaped/bundle.css";
import "reshaped/themes/slate/theme.css";
import "../../frontend/src/styles/global.css";
import "./designLab.css";
import {
  designLabPalettes,
  designTokens,
  installDesignTokens,
  type DesignLabPalette,
} from "../../shared/design/saniPepDesignTokens";
import { contact, portalDashboard, serviceAreas } from "../../frontend/src/lib/mockData";
import type { RequestStatus } from "../../frontend/src/lib/types";
import { evaluateDevelopmentMockGate, serverAuthBoundary } from "../../shared/security/accessControl";
import { BrandSystemWorkshop } from "./BrandSystemWorkshop";
import {
  evaluationMetrics,
  labComponents,
  type DesignLabVariant,
  type LabComponent,
  type LabComponentId,
  type VariantId,
} from "./designLabData";

type DeviceId = "mobile" | "tablet" | "desktop";
type LabPalette = (typeof designLabPalettes)[DesignLabPalette];

const gate = evaluateDevelopmentMockGate("design-lab");
installDesignTokens();

const paletteOptions = Object.keys(designLabPalettes) as DesignLabPalette[];

const deviceOptions: Array<{ id: DeviceId; label: string; icon: LucideIcon }> = [
  { id: "mobile", label: "Mobile", icon: Smartphone },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "desktop", label: "Desktop", icon: Monitor },
];

const componentIcons: Record<LabComponentId, LucideIcon> = {
  tokens: Activity,
  palettes: Palette,
  appointment: Calendar,
  portalDashboard: User,
  orderHistory: PackageCheck,
  prescriptionStatus: FileText,
  uploadFlow: Upload,
  viewportPreview: Monitor,
};

const statusLabels: Record<RequestStatus, string> = {
  draft: "Entwurf",
  submitted: "Eingegangen",
  "employee-review": "Mitarbeiterprüfung",
  "omnia-prepared": "In Omnia vorbereitet",
  confirmed: "Bestätigt",
  delivery: "Lieferung",
  closed: "Abgeschlossen",
};

const statusProgress: Record<RequestStatus, number> = {
  draft: 10,
  submitted: 28,
  "employee-review": 48,
  "omnia-prepared": 68,
  confirmed: 84,
  delivery: 92,
  closed: 100,
};

const mockUpload = {
  fileName: "rezept-demo.pdf",
  context: "Folgeversorgung Kompression",
  consentScopes: ["Gesundheitsdaten verarbeiten", "Rezeptupload prüfen", "Anfrage im Portal anlegen"],
  security: ["Quarantäne-Speicher", "Mitarbeiterprüfung", "Kein lokales Speichern sensibler Daten"],
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );

const averageScore = (variant: DesignLabVariant) => {
  const total = evaluationMetrics.reduce((sum, metric) => sum + variant.scores[metric.key], 0);
  return total / evaluationMetrics.length;
};

const scoreStyle = (score: number) => ({ "--score": `${score * 20}%` }) as React.CSSProperties;
const progressStyle = (progress: number) => ({ "--progress": `${progress}%` }) as React.CSSProperties;

function AccessDenied() {
  return (
    <section className="labAccessDenied">
      <div className="labAccessDeniedIcon" aria-hidden>
        <Lock />
      </div>
      <View direction="column" gap={3}>
        <Text as="h1" variant="featured-2" weight="semibold">
          Design Lab gesperrt
        </Text>
        <Text color="neutral-faded">{gate.reason}</Text>
        <Text variant="body-2">{serverAuthBoundary.productionInvariant}</Text>
      </View>
    </section>
  );
}

function DesignLabApp() {
  const [selectedComponentId, setSelectedComponentId] = useState<LabComponentId>("tokens");
  const [selectedVariantId, setSelectedVariantId] = useState<VariantId>("A");
  const [device, setDevice] = useState<DeviceId>("desktop");
  const [palette, setPalette] = useState<DesignLabPalette>("trust");

  const selectedComponent = labComponents.find((component) => component.id === selectedComponentId) ?? labComponents[0];
  const selectedVariant =
    selectedComponent.variants.find((variant) => variant.id === selectedVariantId) ?? selectedComponent.variants[0];
  const paletteId =
    selectedComponent.id === "palettes" && selectedVariant.paletteId ? selectedVariant.paletteId : palette;
  const activePalette = designLabPalettes[paletteId];
  const appStyle = {
    "--lab-bg": activePalette.background,
    "--lab-primary": activePalette.primary,
    "--lab-action": activePalette.action,
    "--lab-surface": activePalette.surface,
  } as React.CSSProperties;

  const selectComponent = (componentId: LabComponentId) => {
    setSelectedComponentId(componentId);
    setSelectedVariantId("A");
  };

  if (!gate.allowed) return <AccessDenied />;

  return (
    <section className="designLabApp" style={appStyle}>
      <header className="labHeader">
        <div className="labHeaderInner">
          <div className="labBrand">
            <strong>
              sani<span>PEP</span> Design Lab
            </strong>
            <Text variant="body-2" color="neutral-faded">
              Internes UX-Werkzeug mit Mockdaten, A/B/C-Scores und Geräte-Vorschau
            </Text>
          </div>

          <div className="labToolbar" aria-label="Design-Lab Steuerung">
            <div className="labControl">
              <label htmlFor="paletteSelect">Farbschema</label>
              <select
                id="paletteSelect"
                className="labSelect"
                value={palette}
                onChange={(event) => setPalette(event.target.value as DesignLabPalette)}
              >
                {paletteOptions.map((key) => (
                  <option value={key} key={key}>
                    {designLabPalettes[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="labControl" aria-label="Vorschaugerät">
              <span className="labControlLabel">Vorschau</span>
              <div className="labSegmented">
                {deviceOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      className="labIconButton"
                      type="button"
                      aria-label={`${option.label} Vorschau`}
                      aria-pressed={device === option.id}
                      title={`${option.label} Vorschau`}
                      onClick={() => setDevice(option.id)}
                      key={option.id}
                    >
                      <Icon aria-hidden />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="labMain">
        <LabIntro />
        <BrandSystemWorkshop />

        <div className="labWorkspace">
          <LabNavigation selectedComponentId={selectedComponent.id} onSelect={selectComponent} />

          <section className="labCenter" aria-live="polite">
            <VariantWorkbench
              component={selectedComponent}
              variant={selectedVariant}
              selectedVariantId={selectedVariant.id}
              onVariantSelect={setSelectedVariantId}
              device={device}
              activePalette={activePalette}
            />
          </section>

          <aside className="labEvaluation">
            <VariantScoreCard component={selectedComponent} variant={selectedVariant} />
            <RecommendationPanel component={selectedComponent} />
            <VariantMatrix component={selectedComponent} />
          </aside>
        </div>

        <section className="labPanel" style={{ marginTop: 18 }}>
          <View direction="column" gap={4}>
            <View direction="column" gap={1}>
              <Text as="h2" variant="featured-4" weight="semibold">
                Komponentenmatrix
              </Text>
              <Text color="neutral-faded">
                Jede Komponente enthält Variante A, B, C und eine Empfehlung. Alle Bewertungen nutzen dieselben Mockdaten.
              </Text>
            </View>
            <ComponentSummaryGrid selectedComponentId={selectedComponent.id} onSelect={selectComponent} />
          </View>
        </section>
      </main>
    </section>
  );
}

function LabIntro() {
  const facts = [
    { label: "Komponenten", value: labComponents.length },
    { label: "Varianten", value: labComponents.length * 3 },
    { label: "Rezepte", value: portalDashboard.prescriptions.length },
    { label: "Anfragen", value: portalDashboard.requests.length },
  ];

  return (
    <section className="labIntro">
      <div className="labHero">
        <div className="labHeroTitle">
          <span className="labHeroIcon" aria-hidden>
            <Palette />
          </span>
          <View direction="column" gap={2}>
            <Text as="h1" variant="featured-1" weight="semibold">
              UX- und Designentscheidungen vergleichen
            </Text>
            <Text color="neutral-faded">
              Das Lab bewertet Token, Farben, Termin, Portal, Bestellverlauf, Rezeptstatus, Upload und
              Geräteverhalten anhand realistischer Demo-Daten.
            </Text>
          </View>
        </div>

        <div className="labFacts">
          {facts.map((fact) => (
            <div className="labFact" key={fact.label}>
              <strong>{fact.value}</strong>
              <Text variant="body-2" color="neutral-faded">
                {fact.label}
              </Text>
            </div>
          ))}
        </div>
      </div>

      <div className="labGuard labPanel">
        <div className="labGuardRow">
          <span className="labGuardIcon" aria-hidden>
            <Shield />
          </span>
          <View direction="column" gap={1}>
            <Text weight="semibold">Interne Grenze aktiv</Text>
            <Text variant="body-2" color="neutral-faded">
              {gate.reason}
            </Text>
          </View>
        </div>
        <Text variant="body-2">
          Mockdaten: {portalDashboard.customer.displayName}, {portalDashboard.prescriptions.length} Rezepte,{" "}
          {portalDashboard.supplies.length} Dauerversorgungen, {portalDashboard.requests.length} Anfragen und{" "}
          {portalDashboard.audit.length} Audit-Einträge.
        </Text>
      </div>
    </section>
  );
}

function LabNavigation({
  selectedComponentId,
  onSelect,
}: {
  selectedComponentId: LabComponentId;
  onSelect: (id: LabComponentId) => void;
}) {
  return (
    <nav className="labNav" aria-label="Design-Lab Komponenten">
      {labComponents.map((component) => {
        const Icon = componentIcons[component.id];
        return (
          <button
            className="labTab"
            type="button"
            aria-current={selectedComponentId === component.id}
            onClick={() => onSelect(component.id)}
            key={component.id}
          >
            <Icon aria-hidden />
            <span>{component.title}</span>
          </button>
        );
      })}
    </nav>
  );
}

function VariantWorkbench({
  component,
  variant,
  selectedVariantId,
  onVariantSelect,
  device,
  activePalette,
}: {
  component: LabComponent;
  variant: DesignLabVariant;
  selectedVariantId: VariantId;
  onVariantSelect: (id: VariantId) => void;
  device: DeviceId;
  activePalette: LabPalette;
}) {
  return (
    <>
      <section className="labPanel">
        <div className="labPanelHeader">
          <View direction="column" gap={2}>
            <Text as="h2" variant="featured-3" weight="semibold">
              {component.title}
            </Text>
            <Text color="neutral-faded">{component.goal}</Text>
            <Badge color="neutral" variant="faded">
              Mockdaten: {component.dataSource}
            </Badge>
          </View>

          <div className="labVariantTabs" aria-label="Varianten">
            {component.variants.map((item) => (
              <button
                className="labVariantButton"
                type="button"
                aria-pressed={selectedVariantId === item.id}
                onClick={() => onVariantSelect(item.id)}
                key={item.id}
              >
                Variante {item.id}
              </button>
            ))}
          </div>
        </div>

        <div className="labStatusCard">
          <View direction="column" gap={2}>
            <View direction="row" justify="space-between" align="center" gap={3} wrap>
              <Text as="h3" variant="featured-5" weight="semibold">
                Variante {variant.id}: {variant.title}
              </Text>
              {component.recommendedVariant === variant.id && <span className="labBadge">Empfehlung</span>}
            </View>
            <Text color="neutral-faded">{variant.thesis}</Text>
            <Text variant="body-2">Mockdatenlauf: {variant.mockData}</Text>
          </View>
        </div>
      </section>

      <section className="labPreview" aria-label={`${component.title} Vorschau`}>
        <div className="labDeviceFrame" data-device={device}>
          <div className="labDeviceTop">
            <div className="labDeviceDots" aria-hidden>
              <span />
              <span />
              <span />
            </div>
            <span>{device.toUpperCase()} Preview</span>
          </div>
          <div className="labCanvas">{renderVariantPreview(component, variant, activePalette, device)}</div>
        </div>
      </section>
    </>
  );
}

function VariantScoreCard({ component, variant }: { component: LabComponent; variant: DesignLabVariant }) {
  return (
    <section className="labScoreCard">
      <div className="labScoreTop">
        <View direction="column" gap={1}>
          <Text weight="semibold">Bewertung</Text>
          <Text variant="body-2" color="neutral-faded">
            {component.title} / Variante {variant.id}
          </Text>
        </View>
        <span className="labAverage">{averageScore(variant).toFixed(1)}</span>
      </div>

      {evaluationMetrics.map((metric) => (
        <div className="labMetric" key={metric.key}>
          <div className="labMetricLabel">
            <span>{metric.label}</span>
            <span>{variant.scores[metric.key]}/5</span>
          </div>
          <div className="labMetricBar" aria-hidden>
            <span style={scoreStyle(variant.scores[metric.key])} />
          </div>
        </div>
      ))}
    </section>
  );
}

function RecommendationPanel({ component }: { component: LabComponent }) {
  const recommended = component.variants.find((variant) => variant.id === component.recommendedVariant);

  return (
    <section className="labRecommendation">
      <View direction="column" gap={2}>
        <Text weight="semibold">Empfehlung: Variante {component.recommendedVariant}</Text>
        <Text variant="body-2">{component.recommendation}</Text>
        {recommended && (
          <Text variant="body-2" color="neutral-faded">
            Score: {averageScore(recommended).toFixed(1)}/5 mit Schwerpunkt auf Verständlichkeit, Mobile und Vertrauen.
          </Text>
        )}
      </View>
    </section>
  );
}

function VariantMatrix({ component }: { component: LabComponent }) {
  return (
    <section className="labScoreCard">
      <View direction="column" gap={3}>
        <Text weight="semibold">A/B/C Vergleich</Text>
        <div className="labMatrix">
          {component.variants.map((variant) => (
            <div
              className="labMatrixRow"
              data-recommended={component.recommendedVariant === variant.id}
              key={variant.id}
            >
              <span className="labVariantId">{variant.id}</span>
              <View direction="column" gap={1}>
                <Text variant="body-2" weight="medium">
                  {variant.title}
                </Text>
                <Text variant="caption-1" color="neutral-faded">
                  {variant.thesis}
                </Text>
              </View>
              <Text weight="semibold">{averageScore(variant).toFixed(1)}</Text>
            </div>
          ))}
        </div>
      </View>
    </section>
  );
}

function ComponentSummaryGrid({
  selectedComponentId,
  onSelect,
}: {
  selectedComponentId: LabComponentId;
  onSelect: (id: LabComponentId) => void;
}) {
  return (
    <div className="labSummaryGrid">
      {labComponents.map((component) => (
        <button
          className="labSummaryCard"
          type="button"
          onClick={() => onSelect(component.id)}
          aria-current={selectedComponentId === component.id}
          key={component.id}
        >
          <div className="labSummaryHeader">
            <Text as="h3" variant="featured-6" weight="semibold">
              {component.title}
            </Text>
            <span className="labBadge">Empfehlung {component.recommendedVariant}</span>
          </div>
          <div className="labSummaryVariants">
            {component.variants.map((variant) => (
              <div className="labSummaryVariant" key={variant.id}>
                <strong>{variant.id}</strong>
                <span>{variant.title}</span>
                <span>{averageScore(variant).toFixed(1)}</span>
              </div>
            ))}
          </div>
          <Text variant="body-2" color="neutral-faded">
            {component.recommendation}
          </Text>
        </button>
      ))}
    </div>
  );
}

function renderVariantPreview(
  component: LabComponent,
  variant: DesignLabVariant,
  activePalette: LabPalette,
  device: DeviceId,
) {
  switch (component.id) {
    case "tokens":
      return <TokenPlaygroundPreview variant={variant} activePalette={activePalette} />;
    case "palettes":
      return <PalettePreview variant={variant} activePalette={activePalette} />;
    case "appointment":
      return <AppointmentPreview variantId={variant.id} />;
    case "portalDashboard":
      return <PortalDashboardPreview variantId={variant.id} />;
    case "orderHistory":
      return <OrderHistoryPreview variantId={variant.id} />;
    case "prescriptionStatus":
      return <PrescriptionStatusPreview variantId={variant.id} />;
    case "uploadFlow":
      return <UploadFlowPreview variantId={variant.id} />;
    case "viewportPreview":
      return <ViewportPreview variantId={variant.id} device={device} />;
  }
}

function PreviewHeader({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="labCanvasHeader">
      <View direction="column" gap={1}>
        <Text as="h3" variant="featured-5" weight="semibold">
          {title}
        </Text>
        <Text variant="body-2" color="neutral-faded">
          {copy}
        </Text>
      </View>
      <span className="labBadge">Mockdaten</span>
    </div>
  );
}

function TokenPlaygroundPreview({
  variant,
  activePalette,
}: {
  variant: DesignLabVariant;
  activePalette: LabPalette;
}) {
  const profile =
    variant.id === "B"
      ? { body: "18px", control: "48px", spacing: "20px", radius: designTokens.radius.md, sample: "labLargeText" }
      : variant.id === "C"
        ? { body: "14px", control: "40px", spacing: "10px", radius: designTokens.radius.sm, sample: "labCompactText" }
        : { body: "16px", control: "44px", spacing: "16px", radius: designTokens.radius.md, sample: "" };

  const rows = [
    { name: "--sani-brand", value: activePalette.primary, sample: "Primärfarbe" },
    { name: "--sani-action", value: activePalette.action, sample: "Aktion" },
    { name: "--sani-radius", value: profile.radius, sample: "Ecken" },
    { name: "--control-height", value: profile.control, sample: "Touch-Ziel" },
    { name: "--body-size", value: profile.body, sample: "Textgröße" },
    { name: "--flow-spacing", value: profile.spacing, sample: "Abstand" },
  ];

  return (
    <>
      <PreviewHeader title="Token Playground" copy="Tokenprofil wirkt direkt auf Statuskarten, Buttons und Formularabstände." />
      <div className="labPreviewGrid two">
        <div className="labMiniPanel">
          <View direction="column" gap={3}>
            <Text weight="semibold">Aktives Profil</Text>
            <Text className={profile.sample} color="neutral-faded">
              {variant.title}: {variant.thesis}
            </Text>
            <div className="labActionRow">
              <button className="labPrimaryAction" type="button">
                Termin anfragen
              </button>
              <button className="labSecondaryAction" type="button">
                Rezept prüfen
              </button>
            </div>
          </View>
        </div>

        <div className="labTokenTable">
          {rows.map((row) => (
            <div className="labTokenRow" key={row.name}>
              <Text variant="body-2" weight="medium">
                {row.name}
              </Text>
              <Text variant="body-2" color="neutral-faded">
                {row.sample}
              </Text>
              <span>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PalettePreview({ variant, activePalette }: { variant: DesignLabVariant; activePalette: LabPalette }) {
  return (
    <>
      <PreviewHeader title={variant.title} copy="Farben werden an einem Termin- und Rezeptstatus-Muster geprüft." />
      <div className="labPreviewGrid">
        <div className="labMiniPanel">
          <View direction="column" gap={3}>
            <Text weight="semibold">Swatches</Text>
            <div className="labSwatches">
              {[activePalette.primary, activePalette.action, activePalette.background, activePalette.surface].map(
                (color) => (
                  <span className="labSwatch" style={{ background: color }} title={color} key={color} />
                ),
              )}
            </div>
            <Text variant="body-2" color="neutral-faded">
              {variant.thesis}
            </Text>
          </View>
        </div>

        <div className="labStatusCard">
          <div className="labStatusHeader">
            <div>
              <Text weight="semibold">Demo-Terminwunsch</Text>
              <Text variant="body-2" color="neutral-faded">
                {serviceAreas[0].title}
              </Text>
            </div>
            <span className="labStatusDot" aria-hidden />
          </div>
          <Text variant="body-2">Wunschtermin eingegangen. Bestätigung durch Mitarbeiter steht aus.</Text>
          <div className="labActionRow">
            <button className="labPrimaryAction" type="button">
              Status prüfen
            </button>
          </div>
        </div>

        <div className="labStatusCard">
          <div className="labStatusHeader">
            <div>
              <Text weight="semibold">Demo-Rezept</Text>
              <Text variant="body-2" color="neutral-faded">
                {portalDashboard.prescriptions[0].title}
              </Text>
            </div>
            <Badge color="neutral" variant="faded">
              {statusLabels[portalDashboard.prescriptions[0].status]}
            </Badge>
          </div>
          <Text variant="body-2">{portalDashboard.prescriptions[0].hiddenDetails}</Text>
        </div>
      </div>
    </>
  );
}

function AppointmentPreview({ variantId }: { variantId: VariantId }) {
  const appointment = {
    concern: serviceAreas[0].title,
    date: "2026-06-24",
    window: "10:00 - 11:00",
    channel: "Telefon",
    note: "Schmerzen beim Anziehen, bitte Rückruf vor Bestätigung.",
  };

  if (variantId === "B") {
    return (
      <>
        <PreviewHeader title="Kompaktformular" copy="Alle Felder bleiben sichtbar und werden in einer Oberfläche geprüft." />
        <div className="labPreviewGrid two">
          {[
            ["Anliegen", appointment.concern],
            ["Wunschdatum", formatDate(appointment.date)],
            ["Zeitfenster", appointment.window],
            ["Antwortweg", appointment.channel],
          ].map(([label, value]) => (
            <div className="labListItem" key={label}>
              <Text variant="caption-1" color="neutral-faded">
                {label}
              </Text>
              <Text weight="medium">{value}</Text>
            </div>
          ))}
          <div className="labListItem" style={{ gridColumn: "1 / -1" }}>
            <Text variant="caption-1" color="neutral-faded">
              Kurzer Fragebogen
            </Text>
            <Text>{appointment.note}</Text>
          </div>
        </div>
        <div className="labActionRow">
          <button className="labPrimaryAction" type="button">
            Terminwunsch senden
          </button>
          <button className="labSecondaryAction" type="button">
            Rückruf erbitten
          </button>
        </div>
      </>
    );
  }

  if (variantId === "C") {
    return (
      <>
        <PreviewHeader title="Rückruf zuerst" copy="Patienten können Unsicherheit telefonisch klären, bevor sie Details senden." />
        <div className="labPreviewGrid two">
          <div className="labStatusCard">
            <View direction="column" gap={2}>
              <Text weight="semibold">Wir rufen zur Terminabstimmung zurück</Text>
              <Text variant="body-2" color="neutral-faded">
                {contact.phone} · erreichbar {contact.reachable}
              </Text>
              <Text>{appointment.note}</Text>
            </View>
          </div>
          <div className="labStepList">
            {["Telefonnummer prüfen", "Wunschfenster nennen", "Mitarbeiter bestätigt verbindlich"].map((step, index) => (
              <div className="labStep" key={step}>
                <span className="labStepNumber">{index + 1}</span>
                <Text>{step}</Text>
              </div>
            ))}
          </div>
        </div>
        <div className="labActionRow">
          <button className="labPrimaryAction" type="button">
            Rückruf anfragen
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PreviewHeader title="Schritt-für-Schritt-Assistent" copy="Ein Schritt pro Entscheidung, mit sichtbarer Mitarbeiterbestätigung." />
      <div className="labStepList">
        {[
          ["Anliegen", appointment.concern],
          ["Wunschzeit", `${formatDate(appointment.date)}, ${appointment.window}`],
          ["Kontaktweg", `${appointment.channel}, ${contact.phone}`],
          ["Prüfung", "Mitarbeiter bestätigt oder schlägt ein alternatives Fenster vor."],
        ].map(([label, value], index) => (
          <div className="labStep" key={label}>
            <span className="labStepNumber">{index + 1}</span>
            <View direction="column" gap={1}>
              <Text weight="semibold">{label}</Text>
              <Text variant="body-2" color="neutral-faded">
                {value}
              </Text>
            </View>
          </div>
        ))}
      </div>
      <div className="labActionRow">
        <button className="labPrimaryAction" type="button">
          Weiter zur Kontaktprüfung
        </button>
      </div>
    </>
  );
}

function PortalDashboardPreview({ variantId }: { variantId: VariantId }) {
  const activePrescription = portalDashboard.prescriptions[0];
  const openRequest = portalDashboard.requests[0];
  const nextSupply = portalDashboard.supplies[0];

  if (variantId === "B") {
    return (
      <>
        <PreviewHeader title="Modul-Kacheln" copy="Gleichwertige Bereiche mit Kennzahlen und kurzer Statuszeile." />
        <div className="labPreviewGrid">
          <DashboardModule
            title="Rezepte"
            value={portalDashboard.prescriptions.length}
            detail={`${activePrescription.title}: ${statusLabels[activePrescription.status]}`}
          />
          <DashboardModule
            title="Versorgung"
            value={portalDashboard.supplies.length}
            detail={`${nextSupply.name}: ${nextSupply.nextAction}`}
          />
          <DashboardModule
            title="Anfragen"
            value={portalDashboard.requests.length}
            detail={openRequest.publicSummary}
          />
        </div>
      </>
    );
  }

  if (variantId === "C") {
    return (
      <>
        <PreviewHeader title="Aktivitäts-Timeline" copy="Chronologischer Portalverlauf mit Detailkontext." />
        <div className="labPreviewGrid two">
          <div className="labTimeline">
            {portalDashboard.audit.map((event) => (
              <div className="labTimelineItem" key={event.id}>
                <View direction="column" gap={1}>
                  <Text weight="medium">{event.action}</Text>
                  <Text variant="body-2" color="neutral-faded">
                    {event.actor} · {event.requestId}
                  </Text>
                </View>
                <span className="labTimelineDate">{event.at}</span>
              </div>
            ))}
          </div>
          <div className="labStatusCard">
            <Text weight="semibold">Detail</Text>
            <Text variant="body-2" color="neutral-faded">
              {openRequest.publicSummary}
            </Text>
            <div className="labProgress" style={{ marginTop: 12 }}>
              <Text variant="body-2">{statusLabels[openRequest.status]}</Text>
              <div className="labProgressTrack" aria-hidden>
                <span style={progressStyle(statusProgress[openRequest.status])} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PreviewHeader title="Heute wichtig" copy={`Start für ${portalDashboard.customer.displayName} mit priorisierten nächsten Schritten.`} />
      <div className="labList">
        <PriorityRow
          title={activePrescription.title}
          label={statusLabels[activePrescription.status]}
          detail="Rezept ist eingegangen. Mitarbeiterprüfung läuft."
        />
        <PriorityRow title={openRequest.title} label={statusLabels[openRequest.status]} detail={openRequest.publicSummary} />
        <PriorityRow title={nextSupply.name} label={statusLabels[nextSupply.status]} detail={nextSupply.nextAction} />
      </div>
      <div className="labActionRow">
        <button className="labPrimaryAction" type="button">
          Nächsten Schritt ansehen
        </button>
      </div>
    </>
  );
}

function DashboardModule({ title, value, detail }: { title: string; value: number; detail: string }) {
  return (
    <div className="labMiniPanel">
      <View direction="column" gap={2}>
        <Text variant="caption-1" color="neutral-faded">
          {title}
        </Text>
        <Text variant="featured-2" weight="semibold">
          {value}
        </Text>
        <Text variant="body-2">{detail}</Text>
      </View>
    </div>
  );
}

function PriorityRow({ title, label, detail }: { title: string; label: string; detail: string }) {
  return (
    <div className="labListItem">
      <div className="labRowSplit">
        <Text weight="semibold">{title}</Text>
        <span className="labBadge">{label}</span>
      </div>
      <Text variant="body-2" color="neutral-faded">
        {detail}
      </Text>
    </div>
  );
}

function OrderHistoryPreview({ variantId }: { variantId: VariantId }) {
  const supply = portalDashboard.supplies[0];
  const reorder = portalDashboard.requests.find((request) => request.type === "reorder") ?? portalDashboard.requests[1];

  if (variantId === "C") {
    return (
      <>
        <PreviewHeader title="Tabellarischer Verlauf" copy="Dichte Darstellung für interne Review- und Vergleichssituationen." />
        <div className="labTable">
          <div className="labTableRow labTableHead">
            <span>Datum</span>
            <span>Vorgang</span>
            <span>Status</span>
            <span>Kanal</span>
          </div>
          {portalDashboard.requests.map((request) => (
            <div className="labTableRow" key={request.id}>
              <span>{formatDate(request.createdAt)}</span>
              <span>{request.title}</span>
              <span>{statusLabels[request.status]}</span>
              <span>{request.requestedChannel ?? "Portal"}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (variantId === "B") {
    const steps: Array<[string, RequestStatus]> = [
      ["Anfrage erhalten", "submitted"],
      ["Mitarbeiterprüfung", "employee-review"],
      ["Omnia vorbereitet", "omnia-prepared"],
      ["Bestätigung", "confirmed"],
    ];

    return (
      <>
        <PreviewHeader title="Status-Tracker" copy="Paketähnlicher Verlauf mit sicherer Trennung der Prozessschritte." />
        <div className="labStatusCard">
          <div className="labStatusHeader">
            <View direction="column" gap={1}>
              <Text weight="semibold">{supply.name}</Text>
              <Text variant="body-2" color="neutral-faded">
                Nächster Termin: {formatDate(supply.nextDate)}
              </Text>
            </View>
            <span className="labBadge">{statusLabels[supply.status]}</span>
          </div>
          <div className="labStepList">
            {steps.map(([label, status], index) => (
              <div className="labStep" key={label}>
                <span className="labStepNumber">{index + 1}</span>
                <View direction="column" gap={1}>
                  <Text weight="medium">{label}</Text>
                  <Text variant="body-2" color="neutral-faded">
                    {statusProgress[status] <= statusProgress[supply.status] ? "Erreicht" : "Ausstehend"}
                  </Text>
                </View>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PreviewHeader title="Zeitstrahl" copy="Chronologische Patientensicht auf Bestellanfragen und Dauerversorgung." />
      <div className="labTimeline">
        <div className="labTimelineItem">
          <View direction="column" gap={1}>
            <Text weight="semibold">{reorder.title}</Text>
            <Text variant="body-2" color="neutral-faded">
              {reorder.publicSummary}
            </Text>
          </View>
          <span className="labTimelineDate">{formatDate(reorder.createdAt)}</span>
        </div>
        <div className="labTimelineItem">
          <View direction="column" gap={1}>
            <Text weight="semibold">{supply.name}</Text>
            <Text variant="body-2" color="neutral-faded">
              {supply.nextAction}
            </Text>
          </View>
          <span className="labTimelineDate">{formatDate(supply.nextDate)}</span>
        </div>
      </div>
    </>
  );
}

function PrescriptionStatusPreview({ variantId }: { variantId: VariantId }) {
  const activePrescription = portalDashboard.prescriptions[0];

  if (variantId === "C") {
    return (
      <>
        <PreviewHeader title="Detail-Akkordeon" copy="Details bleiben verborgen, bis Patientinnen und Patienten sie bewusst öffnen." />
        <div className="labList">
          {portalDashboard.prescriptions.map((prescription) => (
            <div className="labListItem" key={prescription.id}>
              <div className="labRowSplit">
                <Text weight="semibold">{prescription.title}</Text>
                <span className="labBadge">{statusLabels[prescription.status]}</span>
              </div>
              <Text variant="body-2" color="neutral-faded">
                Eingegangen: {formatDate(prescription.receivedAt)} · Gültig bis: {formatDate(prescription.expiresAt)}
              </Text>
              <Text variant="body-2">{prescription.hiddenDetails}</Text>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (variantId === "A") {
    return (
      <>
        <PreviewHeader title="Prüf-Checkliste" copy="Sichtbare Prüfstationen ohne medizinische Detaildaten." />
        <div className="labChecklist">
          {["Dokument eingegangen", "Datei sicher gespeichert", "Mitarbeiterprüfung läuft", "Freigabe in Omnia ausstehend"].map(
            (item, index) => (
              <div className="labCheck" key={item}>
                <CheckCircle aria-hidden />
                <View direction="column" gap={1}>
                  <Text weight="medium">{item}</Text>
                  <Text variant="body-2" color="neutral-faded">
                    {index < 3 ? "Aktiv im Demo-Prozess" : "Noch nicht abgeschlossen"}
                  </Text>
                </View>
              </div>
            ),
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <PreviewHeader title="Statuskarte mit nächstem Schritt" copy="Ein Rezeptstatus, eine Erklärung, eine nächste Aktion." />
      <div className="labStatusCard">
        <div className="labStatusHeader">
          <View direction="column" gap={1}>
            <Text as="h4" variant="featured-5" weight="semibold">
              {activePrescription.title}
            </Text>
            <Text variant="body-2" color="neutral-faded">
              Eingegangen am {formatDate(activePrescription.receivedAt)}
            </Text>
          </View>
          <span className="labBadge">{statusLabels[activePrescription.status]}</span>
        </div>
        <Text>{activePrescription.hiddenDetails}</Text>
        <div className="labProgress" style={{ marginTop: 14 }}>
          <Text variant="body-2">Prüffortschritt</Text>
          <div className="labProgressTrack" aria-hidden>
            <span style={progressStyle(statusProgress[activePrescription.status])} />
          </div>
        </div>
        <div className="labActionRow">
          <button className="labPrimaryAction" type="button">
            Rückfrage senden
          </button>
        </div>
      </div>
    </>
  );
}

function UploadFlowPreview({ variantId }: { variantId: VariantId }) {
  if (variantId === "B") {
    return (
      <>
        <PreviewHeader title="Drag-and-Drop kompakt" copy="Datei, Kontext und Einwilligung auf einer Seite." />
        <div className="labPreviewGrid two">
          <div className="labDropZone">
            <View direction="column" gap={2} align="center">
              <Upload aria-hidden />
              <Text weight="semibold">{mockUpload.fileName}</Text>
              <Text variant="body-2" color="neutral-faded">
                PDF · Demo-Upload · {mockUpload.context}
              </Text>
            </View>
          </div>
          <div className="labChecklist">
            {mockUpload.consentScopes.map((scope) => (
              <div className="labCheck" key={scope}>
                <CheckCircle aria-hidden />
                <Text variant="body-2">{scope}</Text>
              </div>
            ))}
          </div>
        </div>
        <div className="labActionRow">
          <button className="labPrimaryAction" type="button">
            Als Anfrage senden
          </button>
        </div>
      </>
    );
  }

  if (variantId === "C") {
    return (
      <>
        <PreviewHeader title="Sicherheits-Check zuerst" copy="Vor dem Upload wird die Verarbeitungsgrenze erklärt." />
        <div className="labStatusCard">
          <View direction="column" gap={3}>
            <div className="labGuardRow">
              <span className="labGuardIcon" aria-hidden>
                <Shield />
              </span>
              <View direction="column" gap={1}>
                <Text weight="semibold">Ihre Datei wird nicht automatisch verarbeitet</Text>
                <Text variant="body-2" color="neutral-faded">
                  Der Upload erzeugt eine prüfbare Anfrage. Ein Mitarbeiter kontrolliert den Vorgang.
                </Text>
              </View>
            </div>
            <div className="labChecklist">
              {mockUpload.security.map((item) => (
                <div className="labCheck" key={item}>
                  <CheckCircle aria-hidden />
                  <Text variant="body-2">{item}</Text>
                </div>
              ))}
            </div>
          </View>
        </div>
        <div className="labActionRow">
          <button className="labPrimaryAction" type="button">
            Weiter zum Upload
          </button>
          <button className="labSecondaryAction" type="button">
            Rückruf statt Upload
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PreviewHeader title="Geführter Upload" copy="Kontext, Datei, Einwilligung und Zusammenfassung als sichere Schrittfolge." />
      <div className="labStepList">
        {[
          ["Kontext", mockUpload.context],
          ["Datei", mockUpload.fileName],
          ["Einwilligung", mockUpload.consentScopes.join(", ")],
          ["Prüfung", "Mitarbeiterprüfung vor Omnia-Weitergabe"],
        ].map(([title, detail], index) => (
          <div className="labStep" key={title}>
            <span className="labStepNumber">{index + 1}</span>
            <View direction="column" gap={1}>
              <Text weight="semibold">{title}</Text>
              <Text variant="body-2" color="neutral-faded">
                {detail}
              </Text>
            </View>
          </div>
        ))}
      </div>
      <div className="labActionRow">
        <button className="labPrimaryAction" type="button">
          Upload prüfen
        </button>
      </div>
    </>
  );
}

function ViewportPreview({ variantId, device }: { variantId: VariantId; device: DeviceId }) {
  if (variantId === "C") {
    return (
      <>
        <PreviewHeader title="Desktop Review Board" copy="A/B/C-Spalten für internes Design-Review." />
        <div className="labPreviewGrid">
          {labComponents.slice(0, 3).map((component) => (
            <div className="labMiniPanel" key={component.id}>
              <Text weight="semibold">{component.title}</Text>
              <Text variant="body-2" color="neutral-faded">
                Empfehlung {component.recommendedVariant}:{" "}
                {component.variants.find((variant) => variant.id === component.recommendedVariant)?.title}
              </Text>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (variantId === "B") {
    return (
      <>
        <PreviewHeader title="Tablet Split" copy="Beratungsnaher Zwischenzustand mit Liste und Detailbereich." />
        <div className="labPreviewGrid two">
          <div className="labList">
            {portalDashboard.prescriptions.map((prescription) => (
              <div className="labListItem" key={prescription.id}>
                <Text weight="medium">{prescription.title}</Text>
                <Text variant="body-2" color="neutral-faded">
                  {statusLabels[prescription.status]}
                </Text>
              </div>
            ))}
          </div>
          <div className="labStatusCard">
            <Text weight="semibold">Detailbereich</Text>
            <Text variant="body-2" color="neutral-faded">
              {portalDashboard.requests[0].publicSummary}
            </Text>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PreviewHeader title="Mobile zuerst" copy={`Aktiver Rahmen: ${device}. Kritische Lesbarkeit wird eng geprüft.`} />
      <div className="labList">
        <PriorityRow
          title={portalDashboard.prescriptions[0].title}
          label={statusLabels[portalDashboard.prescriptions[0].status]}
          detail="Große Statuskarte mit sicherem Rückfrageweg."
        />
        <PriorityRow
          title={portalDashboard.requests[0].title}
          label={statusLabels[portalDashboard.requests[0].status]}
          detail={portalDashboard.requests[0].publicSummary}
        />
      </div>
      <div className="labActionRow">
        <button className="labPrimaryAction" type="button">
          Primäre Aktion prüfen
        </button>
      </div>
    </>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Reshaped defaultTheme="slate" defaultColorMode="light">
      <DesignLabApp />
    </Reshaped>
  </React.StrictMode>,
);
