import { useState, type CSSProperties } from "react";
import { Badge, Text, View } from "reshaped";
import { Calendar, CheckCircle, FileText, PackageCheck, Shield, Upload, User } from "lucide-react";
import logoUrl from "../../../assets/logos/sanipep_sanitaetshaus_logo.svg";
import claimLogoUrl from "../../../assets/logos/Sanipep_SH_Claim.svg";
import { portalDashboard, serviceAreas } from "../../frontend/src/lib/mockData";
import {
  brandAnalysis,
  brandColorSource,
  brandSurfaces,
  brandSystemVariants,
  finalReshapedCssText,
  finalReshapedCssVariables,
  recommendedBrandVariantId,
  type BrandSurfaceId,
  type BrandSystemVariant,
  type BrandSystemVariantId,
} from "../../shared/design/saniPepDesignTokens";

const scoreLabels = [
  ["trust", "Vertrauen"],
  ["readability", "Lesbarkeit"],
  ["conversion", "Conversion"],
  ["mobile", "Mobile Nutzbarkeit"],
  ["premium", "Premiumwirkung"],
] as const;

const surfaceIcons: Record<BrandSurfaceId, typeof Shield> = {
  landing: Shield,
  lymph: CheckCircle,
  breast: User,
  portal: FileText,
  orders: PackageCheck,
  appointment: Calendar,
  upload: Upload,
};

const scoreStyle = (score: number) => ({ "--score": `${score * 20}%` }) as CSSProperties;

export function BrandSystemWorkshop() {
  const [variantId, setVariantId] = useState<BrandSystemVariantId>(recommendedBrandVariantId);
  const [surfaceId, setSurfaceId] = useState<BrandSurfaceId>("landing");
  const selectedVariant = brandSystemVariants.find((variant) => variant.id === variantId) ?? brandSystemVariants[0];
  const selectedSurface = brandSurfaces.find((surface) => surface.id === surfaceId) ?? brandSurfaces[0];

  return (
    <section
      className="brandWorkshop"
      style={
        {
          "--brand-primary": selectedVariant.tokens.primary,
          "--brand-secondary": selectedVariant.tokens.secondary,
          "--brand-accent": selectedVariant.tokens.accent,
          "--brand-bg": selectedVariant.tokens.background,
          "--brand-surface": selectedVariant.tokens.surface,
          "--brand-border": selectedVariant.tokens.border,
          "--brand-text": selectedVariant.tokens.text,
          "--brand-muted": selectedVariant.tokens.muted,
        } as CSSProperties
      }
    >
      <div className="brandWorkshopHeader">
        <View direction="column" gap={2}>
          <Text as="h2" variant="featured-2" weight="semibold">
            Finales saniPEP Design System
          </Text>
          <Text color="neutral-faded">
            Grundlage: lokale Logo-Dateien, CI-Farben des Sanitätshaus-Logos und Reshaped Design System v4.
          </Text>
        </View>
        <span className="labBadge">Empfehlung: Variante {recommendedBrandVariantId}</span>
      </div>

      <div className="brandWorkshopGrid">
        <LogoAnalysisPanel />
        <VariantSystemPanel selectedVariant={selectedVariant} variantId={variantId} onVariantChange={setVariantId} />
      </div>

      <div className="brandSimulationGrid">
        <section className="brandPanel">
          <View direction="column" gap={4}>
            <View direction="column" gap={1}>
              <Text as="h3" variant="featured-4" weight="semibold">
                Anwendung simulieren
              </Text>
              <Text color="neutral-faded">{selectedSurface.goal}</Text>
            </View>
            <div className="brandSurfaceTabs" aria-label="Anwendungsfläche wählen">
              {brandSurfaces.map((surface) => {
                const Icon = surfaceIcons[surface.id];
                return (
                  <button
                    className="brandSurfaceTab"
                    type="button"
                    aria-pressed={surfaceId === surface.id}
                    onClick={() => setSurfaceId(surface.id)}
                    key={surface.id}
                  >
                    <Icon aria-hidden />
                    <span>{surface.label}</span>
                  </button>
                );
              })}
            </div>
            <SurfaceSimulation variant={selectedVariant} surfaceId={surfaceId} />
          </View>
        </section>

        <section className="brandPanel">
          <View direction="column" gap={4}>
            <View direction="column" gap={1}>
              <Text as="h3" variant="featured-4" weight="semibold">
                Finale Reshaped Tokens
              </Text>
              <Text color="neutral-faded">
                Generiert aus Variante {recommendedBrandVariantId}: modern-premium + freundlich.
              </Text>
            </View>
            <TokenDefinitionGrid variant={selectedVariant} />
            <pre className="brandCodeBlock">{finalReshapedCssText}</pre>
          </View>
        </section>
      </div>
    </section>
  );
}

function LogoAnalysisPanel() {
  return (
    <section className="brandPanel">
      <View direction="column" gap={4}>
        <View direction="column" gap={1}>
          <Text as="h3" variant="featured-4" weight="semibold">
            Markenanalyse
          </Text>
          <Text color="neutral-faded">
            Die CI-Quelle nennt für das Sanitätshaus-Logo Blau {brandColorSource.ciBlue} und Rosé{" "}
            {brandColorSource.ciRose}.
          </Text>
        </View>

        <div className="brandLogoStage">
          <div className="brandLogoCard">
            <img src={logoUrl} alt="saniPEP Sanitätshaus Logo" />
          </div>
          <div className="brandClaimCard">
            <img src={claimLogoUrl} alt="saniPEP Claim Unterstützung, nur smarter." />
          </div>
        </div>

        <div className="brandColorStrip" aria-label="Markenfarben">
          <ColorChip label="Primary Blau" color={brandColorSource.ciBlue} />
          <ColorChip label="Accent Rosé" color={brandColorSource.ciRose} />
          <ColorChip label="Claim Soft Blau" color={brandColorSource.claimBlue} />
          <ColorChip label="Logo SVG Blau" color={brandColorSource.svgBlueEvidence} />
          <ColorChip label="Logo SVG Rosé" color={brandColorSource.svgRoseEvidence} />
        </div>

        <div className="brandAnalysisList">
          {brandAnalysis.map((item) => (
            <article className="brandAnalysisItem" key={item.title}>
              <Text weight="semibold">{item.title}</Text>
              <Text variant="body-2" color="neutral-faded">
                {item.finding}
              </Text>
              <Text variant="body-2">{item.rating}</Text>
            </article>
          ))}
        </div>
      </View>
    </section>
  );
}

function VariantSystemPanel({
  selectedVariant,
  variantId,
  onVariantChange,
}: {
  selectedVariant: BrandSystemVariant;
  variantId: BrandSystemVariantId;
  onVariantChange: (id: BrandSystemVariantId) => void;
}) {
  return (
    <section className="brandPanel">
      <View direction="column" gap={4}>
        <View direction="column" gap={2}>
          <Text as="h3" variant="featured-4" weight="semibold">
            Drei Varianten
          </Text>
          <div className="brandVariantTabs">
            {brandSystemVariants.map((variant) => (
              <button
                type="button"
                className="brandVariantTab"
                aria-pressed={variantId === variant.id}
                onClick={() => onVariantChange(variant.id)}
                key={variant.id}
              >
                <strong>{variant.id}</strong>
                <span>{variant.title}</span>
              </button>
            ))}
          </div>
        </View>

        <div className="brandVariantHero">
          <View direction="column" gap={2}>
            <Badge color="neutral" variant="faded">
              Variante {selectedVariant.id}
            </Badge>
            <Text as="h4" variant="featured-3" weight="semibold">
              {selectedVariant.title}
            </Text>
            <Text color="neutral-faded">{selectedVariant.positioning}</Text>
            <Text variant="body-2">{selectedVariant.visualPrinciple}</Text>
          </View>
        </div>

        <div className="brandScoreGrid">
          {scoreLabels.map(([key, label]) => (
            <div className="brandScore" key={key}>
              <div>
                <span>{label}</span>
                <strong>{selectedVariant.scores[key]}/5</strong>
              </div>
              <div className="labMetricBar" aria-hidden>
                <span style={scoreStyle(selectedVariant.scores[key])} />
              </div>
            </div>
          ))}
        </div>

        <div className="brandSystemSpecs">
          <SystemSpec title="Typografie" items={selectedVariant.typography} />
          <SystemSpec title="Radius" items={selectedVariant.radius} />
          <SystemSpec title="Shadow Scale" items={selectedVariant.shadows} />
          <SystemSpec title="Komponenten" items={selectedVariant.systems} />
        </div>

        <div className="brandRecommendation">
          <Text weight="semibold">Bewertung</Text>
          <Text variant="body-2">{selectedVariant.recommendation}</Text>
        </div>
      </View>
    </section>
  );
}

function SurfaceSimulation({ variant, surfaceId }: { variant: BrandSystemVariant; surfaceId: BrandSurfaceId }) {
  const prescription = portalDashboard.prescriptions[0];
  const request = portalDashboard.requests[0];
  const supply = portalDashboard.supplies[0];

  const surfaceContent: Record<BrandSurfaceId, { title: string; copy: string; action: string; support: string }> = {
    landing: {
      title: "Persönlich beraten. Digital begleitet.",
      copy: "Schneller Einstieg für Termin, Rezeptupload und Portalstatus mit saniPEP Sanitätshaus.",
      action: "Termin anfragen",
      support: "Rezept sicher hochladen",
    },
    lymph: {
      title: "Lymphödem & Lipödem sicher versorgen",
      copy: serviceAreas[0].summary,
      action: "Beratungstermin anfragen",
      support: "Kompression vorbereiten",
    },
    breast: {
      title: "Brustprothetik mit Ruhe und Diskretion",
      copy: serviceAreas[1].summary,
      action: "Diskreten Termin wählen",
      support: "Rückruf vereinbaren",
    },
    portal: {
      title: "Heute wichtig",
      copy: `${prescription.title}: ${prescription.hiddenDetails}`,
      action: "Status ansehen",
      support: request.publicSummary,
    },
    orders: {
      title: supply.name,
      copy: `${supply.nextAction}. Nächster Schritt am ${supply.nextDate}.`,
      action: "Bestellanfrage prüfen",
      support: "Mitarbeiterfreigabe vor finaler Bestellung.",
    },
    appointment: {
      title: "Wunschtermin anfragen",
      copy: "Anliegen, Zeitfenster und Kontaktweg werden als Anfrage gesendet. Ein Mitarbeiter bestätigt verbindlich.",
      action: "Wunsch senden",
      support: "Telefonische Rückfrage möglich",
    },
    upload: {
      title: "Rezeptupload",
      copy: "Der Upload erzeugt eine prüfbare Anfrage. Keine automatische Omnia-Schreibung, keine lokale Speicherung sensibler Daten.",
      action: "Upload prüfen",
      support: "Einwilligung und Mitarbeiterprüfung sichtbar",
    },
  };

  const content = surfaceContent[surfaceId];

  return (
    <div className="brandSurfacePreview">
      <header className="brandPreviewHeader">
        <img src={logoUrl} alt="saniPEP Sanitätshaus" />
        <nav aria-label="Simulierte Navigation">
          <span>Beratung</span>
          <span>Rezepte</span>
          <span>Portal</span>
        </nav>
      </header>
      <div className="brandPreviewBody">
        <section className="brandPreviewHero">
          <Text as="h4" variant="featured-2" weight="semibold">
            {content.title}
          </Text>
          <Text color="neutral-faded">{content.copy}</Text>
          <div className="brandPreviewActions">
            <button className="brandPrimaryButton" type="button">
              {content.action}
            </button>
            <button className="brandSecondaryButton" type="button">
              {content.support}
            </button>
          </div>
        </section>
        <aside className="brandPreviewStatus">
          <View direction="column" gap={3}>
            <Text weight="semibold">Statussystem</Text>
            <StatusRow label="Eingegangen" color={variant.tokens.info} />
            <StatusRow label="Mitarbeiterprüfung" color={variant.tokens.accent} />
            <StatusRow label="Bestätigt" color={variant.tokens.success} />
          </View>
        </aside>
      </div>
      <footer className="brandPreviewFooter">
        <span>Primary {variant.tokens.primary}</span>
        <span>Accent {variant.tokens.accent}</span>
        <span>Surface {variant.tokens.surface}</span>
      </footer>
    </div>
  );
}

function TokenDefinitionGrid({ variant }: { variant: BrandSystemVariant }) {
  const tokenRows = [
    ["Primary Color", variant.tokens.primary],
    ["Secondary Color", variant.tokens.secondary],
    ["Accent Color", variant.tokens.accent],
    ["Success", variant.tokens.success],
    ["Warning", variant.tokens.warning],
    ["Error", variant.tokens.error],
    ["Info", variant.tokens.info],
    ["Surface", variant.tokens.surface],
    ["Background", variant.tokens.background],
    ["Border", variant.tokens.border],
  ];

  return (
    <div className="brandTokenGrid">
      {tokenRows.map(([label, color]) => (
        <ColorChip label={label} color={color} key={label} />
      ))}
      <div className="brandTokenMeta">
        <Text weight="semibold">Reshaped v4 Mapping</Text>
        <Text variant="body-2" color="neutral-faded">
          {Object.keys(finalReshapedCssVariables).length} CSS-Variablen für Slate-basierte Light-Theme-Overrides.
        </Text>
      </div>
    </div>
  );
}

function ColorChip({ label, color }: { label: string; color: string }) {
  return (
    <div className="brandColorChip">
      <span style={{ background: color }} aria-hidden />
      <div>
        <Text variant="body-2" weight="medium">
          {label}
        </Text>
        <Text variant="caption-1" color="neutral-faded">
          {color}
        </Text>
      </div>
    </div>
  );
}

function SystemSpec({ title, items }: { title: string; items: Record<string, string> }) {
  return (
    <article className="brandSpecCard">
      <Text weight="semibold">{title}</Text>
      <dl>
        {Object.entries(items).map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function StatusRow({ label, color }: { label: string; color: string }) {
  return (
    <div className="brandStatusRow">
      <span style={{ background: color }} aria-hidden />
      <Text variant="body-2">{label}</Text>
    </div>
  );
}
