export type BrandSystemVariantId = "A" | "B" | "C";
export type BrandSurfaceId =
  | "landing"
  | "lymph"
  | "breast"
  | "portal"
  | "orders"
  | "appointment"
  | "upload";

export type BrandTokenSet = {
  primary: string;
  secondary: string;
  accent: string;
  action: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  surface: string;
  background: string;
  border: string;
  text: string;
  muted: string;
};

export type BrandSystemVariant = {
  id: BrandSystemVariantId;
  title: string;
  positioning: string;
  visualPrinciple: string;
  tokens: BrandTokenSet;
  typography: {
    family: string;
    headline: string;
    body: string;
    ui: string;
    lineHeight: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadows: {
    outline: string;
    raised: string;
    overlay: string;
  };
  systems: {
    buttons: string;
    forms: string;
    cards: string;
    status: string;
  };
  scores: {
    trust: number;
    readability: number;
    conversion: number;
    mobile: number;
    premium: number;
  };
  recommendation: string;
};

export const brandColorSource = {
  ciUrl: "https://www.ci.permanent.de/sanipepapotheken#sanitaetshauslogo",
  ciBlue: "#364593",
  ciRose: "#b35985",
  svgBlueEvidence: "#354693",
  svgRoseEvidence: "#b45986",
  claimBlue: "#6983bb",
} as const;

export const brandAnalysis = [
  {
    title: "Logo",
    finding:
      "Das breite Wortlogo kombiniert eine stabile, kräftige san-Schrift mit einem expressiven pep-Schriftzug. Die Subline SANITÄTSHAUS ist sachlich und klar.",
    rating: "Hohe Wiedererkennbarkeit, aber die Subline braucht im UI ausreichend Mindestbreite.",
  },
  {
    title: "Farbwirkung",
    finding:
      "CI-Blau wirkt fachlich, ruhig und kompetent. Rosé bringt Wärme, Empathie und Zielgruppen-Nähe in sensible Versorgungsbereiche.",
    rating: "Blau als Primäranker, Rosé als dosierter Akzent statt dominanter Flächenfarbe.",
  },
  {
    title: "Vertrauen",
    finding:
      "Der Markenclaim und die CI-Beschreibung stützen Verlässlichkeit, Innovation und Nahbarkeit. Das passt zu medizinischer Beratung und Portalstatus.",
    rating: "Sehr stark, wenn Status- und Sicherheitsinformationen nüchtern und nicht werblich formuliert bleiben.",
  },
  {
    title: "Premiumwirkung",
    finding:
      "Das tiefe Blau trägt Premium und Seriosität. Premium entsteht zusätzlich durch ruhige Weißräume, präzise Karten und wenig dekorative Effekte.",
    rating: "Stark bei klarer Typografie, zurückhaltenden Schatten und konsequenten 8px-Radien.",
  },
  {
    title: "Lesbarkeit ältere Zielgruppen",
    finding:
      "Logo und Rosé-Subline sind als Marke geeignet, aber UI-Texte brauchen hohe Kontraste, 16-18px Body, 44-48px Controls und klare Statussprache.",
    rating: "Die Marke muss im Interface barriereärmer übersetzt werden als im reinen Logo.",
  },
] as const;

export const brandSurfaces: Array<{ id: BrandSurfaceId; label: string; goal: string }> = [
  { id: "landing", label: "Landingpage", goal: "Erstvertrauen und schnelle Wahl zwischen Termin, Rezept und Portal." },
  { id: "lymph", label: "Lymphödem-Seite", goal: "Fachliche Sicherheit, Therapiekompetenz und Terminmotivation." },
  { id: "breast", label: "Brustprothetik-Seite", goal: "Diskretion, Empathie und persönliche Beratung priorisieren." },
  { id: "portal", label: "Kundenportal Dashboard", goal: "Status und nächste Schritte ohne medizinische Detaildaten erklären." },
  { id: "orders", label: "Bestellverlauf", goal: "Anfrage, Prüfung, Omnia-Vorbereitung und Bestätigung trennen." },
  { id: "appointment", label: "Terminmodul", goal: "Wunschtermin ohne falsche Sofortbuchungszusage erfassen." },
  { id: "upload", label: "Rezeptupload", goal: "Sicheren Upload als prüfbare Anfrage verständlich machen." },
];

export const brandSystemVariants: BrandSystemVariant[] = [
  {
    id: "A",
    title: "Medizinisch-seriös",
    positioning: "Ruhige Fachlichkeit mit maximaler Klarheit für sensible Gesundheitsentscheidungen.",
    visualPrinciple: "CI-Blau führt. Rosé bleibt Signal für Marke und sekundäre Hervorhebung.",
    tokens: {
      primary: brandColorSource.ciBlue,
      secondary: "#27325f",
      accent: brandColorSource.ciRose,
      action: "#9f4778",
      success: "#1f7a57",
      warning: "#946200",
      error: "#b42318",
      info: "#2f6f9f",
      surface: "#ffffff",
      background: "#f7f8fc",
      border: "#d8deef",
      text: "#1c2437",
      muted: "#667085",
    },
    typography: {
      family: "Inter, BlinkMacSystemFont, -apple-system, Roboto, Helvetica, Arial, sans-serif",
      headline: "Semibold, 32-48px, sachlich",
      body: "16px, 1.6 line-height",
      ui: "14-16px, medium labels",
      lineHeight: "1.45-1.65",
    },
    radius: { sm: "6px", md: "8px", lg: "10px" },
    shadows: {
      outline: "0 1px 2px rgba(28,36,55,.08)",
      raised: "0 10px 24px rgba(28,36,55,.10)",
      overlay: "0 18px 42px rgba(28,36,55,.14)",
    },
    systems: {
      buttons: "Primary blau, secondary weiß, action rosé nur mit dunkler AA-konformer Action-Farbe.",
      forms: "Einspaltig mobil, klare Labels, Hilfetext direkt am Feld, 48px Controls.",
      cards: "Weiße Flächen, 1px blauer Border-Tint, wenig Schatten.",
      status: "Blau für Prozess, Grün für erledigt, Gelb für Rückfrage, Rot nur Fehler.",
    },
    scores: { trust: 5, readability: 5, conversion: 4, mobile: 5, premium: 4 },
    recommendation: "Sehr sicher für ältere Zielgruppen, aber weniger differenziert und emotional als Variante C.",
  },
  {
    id: "B",
    title: "Modern-premium",
    positioning: "Reduzierte Premium-Oberfläche mit tieferem Blau, präzisen Linien und hoher Informationsdichte.",
    visualPrinciple: "Blau wird dunkler und edler, Rosé wird als hochwertiger Accent für Conversion eingesetzt.",
    tokens: {
      primary: "#283579",
      secondary: "#111827",
      accent: brandColorSource.ciRose,
      action: "#9f4778",
      success: "#14704d",
      warning: "#8a5a00",
      error: "#a61b16",
      info: "#375c9e",
      surface: "#ffffff",
      background: "#f4f6fb",
      border: "#cfd6eb",
      text: "#111827",
      muted: "#5f6878",
    },
    typography: {
      family: "Inter, BlinkMacSystemFont, -apple-system, Roboto, Helvetica, Arial, sans-serif",
      headline: "Semibold, 36-56px, enger Premium-Rhythmus",
      body: "16px, 1.55 line-height",
      ui: "14px, semibold controls",
      lineHeight: "1.35-1.6",
    },
    radius: { sm: "6px", md: "8px", lg: "12px" },
    shadows: {
      outline: "0 1px 2px rgba(17,24,39,.08)",
      raised: "0 14px 30px rgba(17,24,39,.12)",
      overlay: "0 24px 54px rgba(17,24,39,.18)",
    },
    systems: {
      buttons: "Kompakte Premium-Buttons, klare icon+text CTA, dunkles Rosé für hochwertige Hauptaktion möglich.",
      forms: "Label oben, kurze Hilfetexte, reduzierte Flächen und präzise Fokuslinien.",
      cards: "Knappe Karten, starke Hierarchie, Tabellen und Dashboards sehr effizient.",
      status: "Dunkles Blau plus neutrale Statusflächen, farbige Semantik sparsam.",
    },
    scores: { trust: 4, readability: 4, conversion: 4, mobile: 4, premium: 5 },
    recommendation: "Stark für Portal und interne Qualität, für Brustprothetik und ältere Nutzerinnen etwas kühl.",
  },
  {
    id: "C",
    title: "Modern-premium + freundlich",
    positioning: "Premium-Qualität mit wärmerer, patientennaher Sprache und weichen Rosé-Akzenten.",
    visualPrinciple: "CI-Blau bleibt Primary. Rosé führt sensible Momente, Soft-Flächen geben Ruhe und Nähe.",
    tokens: {
      primary: brandColorSource.ciBlue,
      secondary: "#6f3d66",
      accent: brandColorSource.ciRose,
      action: "#9f4778",
      success: "#1f7a57",
      warning: "#9a6500",
      error: "#b42318",
      info: "#355fa3",
      surface: "#ffffff",
      background: "#f8f6fb",
      border: "#ddd7eb",
      text: "#1f2433",
      muted: "#667085",
    },
    typography: {
      family: "Inter, BlinkMacSystemFont, -apple-system, Roboto, Helvetica, Arial, sans-serif",
      headline: "Semibold, 34-52px, ruhig und zugänglich",
      body: "17px, 1.6 line-height",
      ui: "15-16px, medium labels, 48px controls",
      lineHeight: "1.45-1.65",
    },
    radius: { sm: "6px", md: "8px", lg: "12px" },
    shadows: {
      outline: "0 1px 2px rgba(31,36,51,.07)",
      raised: "0 12px 28px rgba(54,69,147,.12)",
      overlay: "0 22px 48px rgba(54,69,147,.16)",
    },
    systems: {
      buttons: "Primary blau, action rosé für empathische CTA-Momente, secondary weiß mit klarer Border.",
      forms: "Große Felder, einspaltiger mobiler Flow, Sicherheitsnotizen sichtbar vor Absenden.",
      cards: "Weiße Karten auf soft-violettem Hintergrund, 8px Radius, klare Statuszeilen.",
      status: "Prozess blau, Unterstützung rosé, Erfolg grün, Rückfrage gelb, Fehler rot.",
    },
    scores: { trust: 5, readability: 5, conversion: 5, mobile: 5, premium: 5 },
    recommendation: "Beste Balance aus Vertrauen, Premiumwirkung, Lesbarkeit und Zielgruppen-Nähe.",
  },
];

export const recommendedBrandVariantId: BrandSystemVariantId = "C";
export const recommendedBrandVariant = brandSystemVariants.find((variant) => variant.id === recommendedBrandVariantId)!;

const final = recommendedBrandVariant;

export const designTokens = {
  color: {
    brand: final.tokens.primary,
    brandStrong: "#283579",
    brandSoft: "#eef1fb",
    secondary: final.tokens.secondary,
    secondarySoft: "#f5edf4",
    accent: final.tokens.accent,
    accentStrong: final.tokens.action,
    accentSoft: "#f8edf4",
    action: final.tokens.action,
    actionSoft: "#f8edf4",
    coral: final.tokens.action,
    coralSoft: "#f8edf4",
    graphite: final.tokens.text,
    muted: final.tokens.muted,
    line: final.tokens.border,
    page: final.tokens.background,
    white: final.tokens.surface,
    surface: final.tokens.surface,
    background: final.tokens.background,
    border: final.tokens.border,
    focus: final.tokens.info,
    warning: final.tokens.warning,
    warningBg: "#f2b84b",
    warningBorder: "#d39222",
    warningSoft: "#fff7e8",
    success: final.tokens.success,
    successSoft: "#eaf7f1",
    critical: final.tokens.error,
    criticalSoft: "#fff0ee",
    info: final.tokens.info,
    infoSoft: "#eef1fb",
  },
  radius: final.radius,
  shadow: {
    panel: final.shadows.raised,
    subtle: final.shadows.outline,
    overlay: final.shadows.overlay,
  },
  typography: final.typography,
  spacing: {
    page: "clamp(20px, 4vw, 56px)",
    section: "clamp(56px, 8vw, 112px)",
  },
} as const;

export const designLabPalettes = {
  trust: {
    label: "Modern premium freundlich",
    background: designTokens.color.page,
    primary: designTokens.color.brand,
    action: designTokens.color.action,
    surface: designTokens.color.white,
  },
  precision: {
    label: "Modern premium",
    background: brandSystemVariants[1].tokens.background,
    primary: brandSystemVariants[1].tokens.primary,
    action: brandSystemVariants[1].tokens.action,
    surface: brandSystemVariants[1].tokens.surface,
  },
  warmCare: {
    label: "Medizinisch-seriös",
    background: brandSystemVariants[0].tokens.background,
    primary: brandSystemVariants[0].tokens.primary,
    action: brandSystemVariants[0].tokens.action,
    surface: brandSystemVariants[0].tokens.surface,
  },
} as const;

export type DesignLabPalette = keyof typeof designLabPalettes;

export const cssTokenVariables = {
  "--sani-brand": designTokens.color.brand,
  "--sani-brand-strong": designTokens.color.brandStrong,
  "--sani-brand-soft": designTokens.color.brandSoft,
  "--sani-secondary": designTokens.color.secondary,
  "--sani-secondary-soft": designTokens.color.secondarySoft,
  "--sani-accent": designTokens.color.accent,
  "--sani-accent-strong": designTokens.color.accentStrong,
  "--sani-accent-soft": designTokens.color.accentSoft,
  "--sani-action": designTokens.color.action,
  "--sani-action-soft": designTokens.color.actionSoft,
  "--sani-coral": designTokens.color.coral,
  "--sani-coral-soft": designTokens.color.coralSoft,
  "--sani-graphite": designTokens.color.graphite,
  "--sani-muted": designTokens.color.muted,
  "--sani-line": designTokens.color.line,
  "--sani-page": designTokens.color.page,
  "--sani-white": designTokens.color.white,
  "--sani-surface": designTokens.color.surface,
  "--sani-background": designTokens.color.background,
  "--sani-border": designTokens.color.border,
  "--sani-focus": designTokens.color.focus,
  "--sani-warning": designTokens.color.warning,
  "--sani-warning-bg": designTokens.color.warningBg,
  "--sani-warning-border": designTokens.color.warningBorder,
  "--sani-warning-soft": designTokens.color.warningSoft,
  "--sani-success": designTokens.color.success,
  "--sani-success-soft": designTokens.color.successSoft,
  "--sani-critical": designTokens.color.critical,
  "--sani-critical-soft": designTokens.color.criticalSoft,
  "--sani-info": designTokens.color.info,
  "--sani-info-soft": designTokens.color.infoSoft,
  "--sani-radius-sm": designTokens.radius.sm,
  "--sani-radius": designTokens.radius.md,
  "--sani-radius-lg": designTokens.radius.lg,
  "--sani-shadow": designTokens.shadow.panel,
  "--sani-shadow-subtle": designTokens.shadow.subtle,
  "--sani-shadow-overlay": designTokens.shadow.overlay,
} as const;

export const reshapedTokenVariables = {
  "--rs-color-brand": designTokens.color.brand,
  "--rs-color-on-brand": designTokens.color.white,
  "--rs-color-on-background-primary": designTokens.color.white,
  "--rs-color-on-background-critical": designTokens.color.white,
  "--rs-color-on-background-warning": designTokens.color.graphite,
  "--rs-color-on-background-positive": designTokens.color.white,
  "--rs-color-background-primary": designTokens.color.brand,
  "--rs-color-background-primary-faded": designTokens.color.brandSoft,
  "--rs-color-background-primary-highlighted": designTokens.color.brandStrong,
  "--rs-color-background-primary-highlighted-faded": "rgba(54, 69, 147, 0.08)",
  "--rs-color-border-primary": designTokens.color.brand,
  "--rs-color-border-primary-faded": designTokens.color.brandSoft,
  "--rs-color-foreground-primary": designTokens.color.brand,
  "--rs-color-background-critical": designTokens.color.critical,
  "--rs-color-background-critical-faded": designTokens.color.criticalSoft,
  "--rs-color-background-critical-highlighted": "#8f1d15",
  "--rs-color-border-critical": designTokens.color.critical,
  "--rs-color-border-critical-faded": designTokens.color.criticalSoft,
  "--rs-color-foreground-critical": designTokens.color.critical,
  "--rs-color-background-warning": designTokens.color.warningBg,
  "--rs-color-background-warning-faded": designTokens.color.warningSoft,
  "--rs-color-background-warning-highlighted": designTokens.color.warningBorder,
  "--rs-color-border-warning": designTokens.color.warningBorder,
  "--rs-color-border-warning-faded": designTokens.color.warningSoft,
  "--rs-color-foreground-warning": "#7a4d00",
  "--rs-color-background-positive": designTokens.color.success,
  "--rs-color-background-positive-faded": designTokens.color.successSoft,
  "--rs-color-background-positive-highlighted": "#176343",
  "--rs-color-border-positive": designTokens.color.success,
  "--rs-color-border-positive-faded": designTokens.color.successSoft,
  "--rs-color-foreground-positive": designTokens.color.success,
  "--rs-color-background-neutral": designTokens.color.brandSoft,
  "--rs-color-background-neutral-faded": designTokens.color.page,
  "--rs-color-background-neutral-highlighted": "#e5e9f8",
  "--rs-color-border-neutral": designTokens.color.border,
  "--rs-color-border-neutral-faded": "#ebe6f2",
  "--rs-color-foreground-neutral": designTokens.color.graphite,
  "--rs-color-foreground-neutral-faded": designTokens.color.muted,
  "--rs-color-background-elevation-base": designTokens.color.surface,
  "--rs-color-background-elevation-raised": designTokens.color.surface,
  "--rs-color-background-elevation-overlay": designTokens.color.surface,
  "--rs-color-background-page": designTokens.color.page,
  "--rs-color-background-page-faded": "#fbfafe",
  "--rs-radius-small": designTokens.radius.sm,
  "--rs-radius-medium": designTokens.radius.md,
  "--rs-radius-large": designTokens.radius.lg,
  "--rs-shadow-outline": designTokens.shadow.subtle,
  "--rs-shadow-raised": designTokens.shadow.panel,
  "--rs-shadow-overlay": designTokens.shadow.overlay,
  "--rs-font-size-body-1": "1.0625rem",
  "--rs-line-height-body-1": "1.7rem",
  "--rs-font-size-body-2": "0.9375rem",
  "--rs-line-height-body-2": "1.45rem",
  "--rs-letter-spacing-headline-1": "0",
  "--rs-letter-spacing-headline-2": "0",
  "--rs-letter-spacing-headline-3": "0",
} as const;

const cssDeclarationBlock = (variables: Record<string, string>) =>
  Object.entries(variables)
    .map(([token, value]) => `${token}:${value}`)
    .join(";");

export const finalReshapedCssVariables = reshapedTokenVariables;

const reshapedThemeSelector =
  '[data-rs-theme~="slate"][data-rs-color-mode],[data-rs-theme~="sanipep"][data-rs-color-mode],[data-rs-theme~="slate"],[data-rs-theme~="sanipep"]';

export const finalReshapedCssText = `${reshapedThemeSelector}{${cssDeclarationBlock(
  reshapedTokenVariables,
)}}`;

export const designTokenCssText = `:root{${cssDeclarationBlock(cssTokenVariables)}}${finalReshapedCssText}`;

export const installDesignTokens = (targetDocument: Document = document) => {
  const existing = targetDocument.getElementById("sani-design-tokens");
  if (existing) {
    existing.textContent = designTokenCssText;
    return;
  }

  const style = targetDocument.createElement("style");
  style.id = "sani-design-tokens";
  style.textContent = designTokenCssText;
  targetDocument.head.append(style);
};
