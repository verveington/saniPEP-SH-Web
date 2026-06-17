import type {
  PortalDashboard,
  ServiceArea,
  StrapiContentType,
} from "./types";

export const contact = {
  name: "saniPEP Sanitätshaus",
  address: "Charles-de-Gaulle-Str. 4, München",
  phone: "089 678048-0",
  fax: "089 678048-70",
  email: "sani@sanipep.de",
  whatsapp: "0171 4715257",
  publicHours: [
    ["Montag", "13:00 - 17:00"],
    ["Dienstag", "08:00 - 13:00"],
    ["Mittwoch", "13:00 - 17:00"],
    ["Donnerstag", "08:00 - 13:00"],
    ["Freitag", "13:00 - 17:00"],
  ],
  reachable: "Montag bis Freitag, 08:00 - 17:00",
};

export const serviceAreas: ServiceArea[] = [
  {
    id: "lymph-lipo-scar",
    title: "Lymphödem, Lipödem & Narbenkompression",
    summary:
      "Persönliche Erstberatung, Maßnahme, Verlaufskontrolle und passgenaue Kompressionsversorgung mit Terminwunsch.",
    route: "/lymphoedem-lipoedem-narbenkompression",
    priority: "primary",
    intent: "Premium-Termin",
    searchSignals: [
      "geschwollene Beine",
      "schwere Beine",
      "Druckschmerz an den Beinen",
      "Kompressionsberatung",
      "Kompressionsstrümpfe nach Maß",
    ],
  },
  {
    id: "breast-prosthetics",
    title: "Brustprothetik",
    summary:
      "Diskrete Beratung nach Brustoperation, hochwertige Auswahl und sensible Begleitung durch den Versorgungsprozess.",
    route: "/brustprothetik",
    priority: "primary",
    intent: "Diskreter Termin",
    searchSignals: ["Brustprothese nach Operation", "Erstversorgung", "neue Versorgung"],
  },
  {
    id: "ortho-reha-stoma",
    title: "Bandagen, Orthesen, Reha & Stoma",
    summary:
      "Schnell auffindbare Versorgungsbereiche mit Rezeptupload, Rückfragekanal und klarer Weiterleitung.",
    route: "/bandagen-orthesen-reha-stoma",
    priority: "secondary",
    intent: "Rezept und Beratung",
    searchSignals: ["Bandage Rezept", "Orthese Knie", "Reha Hilfsmittel", "Stoma Versorgung"],
  },
  {
    id: "incontinence-care",
    title: "Inkontinenz & Pflegehilfsmittel",
    summary:
      "Automatisierter Fragebogen, Bedarfskonfigurator, Rezeptupload und Bestellanfrage für wiederkehrende Versorgung.",
    route: "/inkontinenz-pflegehilfsmittel",
    priority: "automated",
    intent: "Konfigurator",
    searchSignals: ["Inkontinenz-Bedarf", "Pflegehilfsmittel beantragen", "monatliche Lieferung"],
  },
];

export const portalDashboard: PortalDashboard = {
  customer: {
    id: "DEMO-CUSTOMER",
    displayName: "Demo-Kunde",
    email: "demo.customer@example.test",
    verification: "password-created",
  },
  prescriptions: [
    {
      id: "DEMO-RX-1",
      title: "Demo-Dokument A",
      receivedAt: "2026-06-10",
      expiresAt: "2026-09-30",
      status: "employee-review",
      employeeReview: "in_pruefung",
      hiddenDetails:
        "Sensible Details werden im Listenbereich nicht ausgegeben. Detailansicht erfordert Portalberechtigung.",
    },
    {
      id: "DEMO-RX-2",
      title: "Demo-Dokument B",
      receivedAt: "2026-05-22",
      expiresAt: "2027-05-21",
      status: "confirmed",
      employeeReview: "freigegeben",
      hiddenDetails: "Freigegebener Demo-Status liegt im führenden System.",
    },
  ],
  supplies: [
    {
      id: "DEMO-SUP-1",
      name: "Demo-Dauerversorgung A",
      category: "Demo",
      nextAction: "Bestellanfrage für Juli prüfen lassen",
      nextDate: "2026-07-02",
      status: "omnia-prepared",
      canRequestChange: true,
    },
    {
      id: "DEMO-SUP-2",
      name: "Demo-Dauerversorgung B",
      category: "Demo",
      nextAction: "Kontrolltermin empfohlen",
      nextDate: "2026-08-15",
      status: "confirmed",
      canRequestChange: false,
    },
  ],
  requests: [
    {
      id: "DEMO-REQ-1",
      type: "appointment",
      title: "Demo-Terminwunsch",
      createdAt: "2026-06-14",
      status: "submitted",
      employeeReview: "neu",
      publicSummary: "Wunschtermin eingegangen, Bestätigung durch Mitarbeiter ausstehend.",
    },
    {
      id: "DEMO-REQ-2",
      type: "reorder",
      title: "Demo-Bestellanfrage",
      createdAt: "2026-06-12",
      status: "employee-review",
      employeeReview: "in_pruefung",
      publicSummary: "Wird geprüft. Finale Bestellung erfolgt erst nach Mitarbeiterfreigabe in Omnia.",
      safeCategory: "Demo",
      requestedChannel: "portal",
    },
    {
      id: "DEMO-REQ-3",
      type: "written-inquiry",
      title: "Demo-Rückfrage",
      createdAt: "2026-06-11",
      status: "employee-review",
      employeeReview: "rueckfrage",
      publicSummary: "Rückfrage ist beim Fachbereich. Antwort erfolgt ohne medizinische Details in der Übersicht.",
      safeCategory: "Demo",
      requestedChannel: "email",
    },
  ],
  audit: [
    {
      id: "AUD-1",
      at: "2026-06-14 09:12",
      actor: "customer",
      action: "Terminanfrage angelegt",
      requestId: "DEMO-REQ-1",
    },
    {
      id: "AUD-2",
      at: "2026-06-12 15:44",
      actor: "employee",
      action: "Bestellanfrage in Prüfung gesetzt",
      requestId: "DEMO-REQ-2",
    },
    {
      id: "AUD-3",
      at: "2026-06-10 11:20",
      actor: "system",
      action: "Rezeptupload als Anfrage registriert",
      requestId: "DEMO-RX-1",
    },
  ],
};

export const strapiContentTypes: StrapiContentType[] = [
  {
    uid: "api::landing-page-section.landing-page-section",
    purpose: "Homepage-Abschnitte, Heading-Level, Reihenfolge, CTA, interne Links und Bildreferenzen redaktionell pflegen.",
    owner: "marketing",
    privacy: "public",
    fields: ["sectionKey", "title", "lead", "body", "sectionHeadingLevel", "primaryCta", "internalLinks", "media", "sortOrder"],
  },
  {
    uid: "api::service-page.service-page",
    purpose: "Fachliche Leistungsseiten für Primär-, Sekundär- und automatisierte Bereiche.",
    owner: "medical-editorial",
    privacy: "public",
    fields: ["title", "slug", "headline", "intro", "searchSignals", "processSteps", "faq", "internalLinks", "seo"],
  },
  {
    uid: "api::symptom.symptom",
    purpose: "Patientenorientierte Suchlogik nach Beschwerden, Produkten und Situationen ohne Tracking einzelner Begriffe.",
    owner: "medical-editorial",
    privacy: "public",
    fields: ["term", "synonyms", "priority", "recommendedRoute", "primaryAction", "analyticsGoal"],
  },
  {
    uid: "api::product-group.product-group",
    purpose: "Produktgruppen als Orientierung, ohne Katalogdominanz und ohne Heilversprechen.",
    owner: "medical-editorial",
    privacy: "public",
    fields: ["name", "slug", "summary", "priority", "visibleOnLanding", "defaultRoute"],
  },
  {
    uid: "api::faq.faq",
    purpose: "Haeufige Fragen mit sicheren Antworten und internen Zielrouten.",
    owner: "medical-editorial",
    privacy: "public",
    fields: ["question", "answer", "safeTopic", "relatedRoute", "claimSafe", "sortOrder"],
  },
  {
    uid: "api::contact-setting.contact-setting",
    purpose: "Standort, Parteiverkehr, Erreichbarkeit und Kontaktkanäle.",
    owner: "operations",
    privacy: "public",
    fields: ["name", "address", "openingHours", "reachableHours", "phone", "fax", "email", "whatsapp", "locality", "serviceArea"],
  },
  {
    uid: "api::opening-hour.opening-hour",
    purpose: "Strukturierte Oeffnungszeiten fuer lokale SEO und Kontaktmodule.",
    owner: "operations",
    privacy: "public",
    fields: ["locationKey", "weekday", "label", "opensAt", "closesAt", "appointmentRecommended", "publicNote", "sortOrder"],
  },
  {
    uid: "api::seo-metadata.seo-metadata",
    purpose: "Meta Title, Description, Canonical, H1/H2-Struktur und interne Links je Route.",
    owner: "marketing",
    privacy: "public",
    fields: ["route", "seo", "h1", "h2Structure", "internalLinks", "localSeoFocus", "claimReviewStatus"],
  },
  {
    uid: "api::portal-help-content.portal-help-content",
    purpose: "Hilfetexte im Portal ohne Offenlegung sensibler Gesundheitsdaten.",
    owner: "operations",
    privacy: "portal-help",
    fields: ["topic", "safeSummary", "nextAction", "roleVisibility"],
  },
  {
    uid: "api::form-configuration.form-configuration",
    purpose: "Konfiguration für Fragebogen, Rezeptupload, Terminanfrage und Bestellanfragen.",
    owner: "operations",
    privacy: "internal",
    fields: ["formKey", "steps", "fields", "validationRules", "consentCopy", "requestTarget"],
  },
  {
    uid: "api::legal-page.legal-page",
    purpose: "Platzhalter und spaeter final freigegebene Rechtstexte fuer Impressum, Datenschutz und Einwilligung.",
    owner: "legal",
    privacy: "public",
    fields: ["title", "slug", "body", "placeholderNotice", "reviewStatus", "version", "seo"],
  },
];

export const searchSuggestions = [
  "geschwollene Beine",
  "schwere Beine",
  "Druckschmerz an den Beinen",
  "Lymphödem Versorgung",
  "Kompressionsstrümpfe nach Maß",
  "Brustprothese nach Operation",
  "Rezept erhalten",
  "neue Versorgung",
  "Inkontinenz-Bedarf",
  "Pflegehilfsmittel beantragen",
];
