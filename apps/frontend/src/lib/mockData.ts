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
      "Lipödem Schmerzen",
      "Lymphödem Versorgung",
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
    searchSignals: ["Brustprothese nach Brustkrebs", "Erstversorgung", "neue Versorgung"],
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
    route: "/inkontinenz-pflege",
    priority: "automated",
    intent: "Konfigurator",
    searchSignals: ["Inkontinenz-Bedarf", "Pflegehilfsmittel beantragen", "monatliche Lieferung"],
  },
];

export const portalDashboard: PortalDashboard = {
  customer: {
    id: "CUS-MOCK-1007",
    displayName: "Frau M.",
    email: "frau.muster@example.test",
    verification: "password-created",
  },
  prescriptions: [
    {
      id: "RX-24051",
      title: "Kompressionsversorgung",
      receivedAt: "2026-06-10",
      expiresAt: "2026-09-30",
      status: "employee-review",
      employeeReview: "in_pruefung",
      hiddenDetails:
        "Sensible Rezeptdetails werden im Listenbereich nicht ausgegeben. Detailansicht erfordert Portalberechtigung.",
    },
    {
      id: "RX-23918",
      title: "Pflegehilfsmittel Pauschale",
      receivedAt: "2026-05-22",
      expiresAt: "2027-05-21",
      status: "confirmed",
      employeeReview: "freigegeben",
      hiddenDetails: "Dauerrezept liegt in Omnia als führendem System.",
    },
  ],
  supplies: [
    {
      id: "SUP-802",
      name: "Monatliche Inkontinenzversorgung",
      category: "Inkontinenz",
      nextAction: "Bestellanfrage für Juli prüfen lassen",
      nextDate: "2026-07-02",
      status: "omnia-prepared",
      canRequestChange: true,
    },
    {
      id: "SUP-611",
      name: "Flachstrick-Kompression",
      category: "Kompression",
      nextAction: "Kontrolltermin empfohlen",
      nextDate: "2026-08-15",
      status: "confirmed",
      canRequestChange: false,
    },
  ],
  requests: [
    {
      id: "REQ-7781",
      type: "appointment",
      title: "Lipödem-Erstberatung",
      createdAt: "2026-06-14",
      status: "submitted",
      employeeReview: "neu",
      publicSummary: "Wunschtermin eingegangen, Bestätigung durch Mitarbeiter ausstehend.",
    },
    {
      id: "REQ-7715",
      type: "reorder",
      title: "Pflegehilfsmittel-Bestellanfrage",
      createdAt: "2026-06-12",
      status: "employee-review",
      employeeReview: "in_pruefung",
      publicSummary: "Wird geprüft. Finale Bestellung erfolgt erst nach Mitarbeiterfreigabe in Omnia.",
      safeCategory: "Pflegehilfsmittel",
      requestedChannel: "portal",
    },
    {
      id: "REQ-7684",
      type: "written-inquiry",
      title: "Schriftliche Rückfrage zur Brustprothetik",
      createdAt: "2026-06-11",
      status: "employee-review",
      employeeReview: "rueckfrage",
      publicSummary: "Rückfrage ist beim Fachbereich. Antwort erfolgt ohne medizinische Details in der Übersicht.",
      safeCategory: "Beratung",
      requestedChannel: "email",
    },
  ],
  audit: [
    {
      id: "AUD-1",
      at: "2026-06-14 09:12",
      actor: "customer",
      action: "Terminanfrage angelegt",
      requestId: "REQ-7781",
    },
    {
      id: "AUD-2",
      at: "2026-06-12 15:44",
      actor: "employee",
      action: "Bestellanfrage in Prüfung gesetzt",
      requestId: "REQ-7715",
    },
    {
      id: "AUD-3",
      at: "2026-06-10 11:20",
      actor: "system",
      action: "Rezeptupload als Anfrage registriert",
      requestId: "RX-24051",
    },
  ],
};

export const strapiContentTypes: StrapiContentType[] = [
  {
    uid: "api::landing-page-section.landing-page-section",
    purpose: "Homepage-Abschnitte, Reihenfolge, CTA und Bildreferenzen redaktionell pflegen.",
    owner: "marketing",
    privacy: "public",
    fields: ["title", "body", "ctaLabel", "ctaRoute", "priority", "media", "sortOrder"],
  },
  {
    uid: "api::service-page.service-page",
    purpose: "Fachliche Leistungsseiten für Primär-, Sekundär- und automatisierte Bereiche.",
    owner: "medical-editorial",
    privacy: "public",
    fields: ["title", "slug", "intro", "symptoms", "processSteps", "faq", "seo"],
  },
  {
    uid: "api::symptom.symptom",
    purpose: "Patientenorientierte Suchlogik nach Symptomen, Produkten und Situationen.",
    owner: "medical-editorial",
    privacy: "public",
    fields: ["term", "synonyms", "priority", "relatedServices", "recommendedRoute"],
  },
  {
    uid: "api::contact-setting.contact-setting",
    purpose: "Standort, Parteiverkehr, Erreichbarkeit und Kontaktkanäle.",
    owner: "operations",
    privacy: "public",
    fields: ["address", "openingHours", "reachableHours", "phone", "fax", "email", "whatsapp"],
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
    purpose: "Datenschutz, Impressum und DSGVO-Hinweise.",
    owner: "legal",
    privacy: "public",
    fields: ["title", "slug", "body", "version", "publishedAt"],
  },
];

export const searchSuggestions = [
  "geschwollene Beine",
  "schwere Beine",
  "Lipödem Schmerzen",
  "Lymphödem Versorgung",
  "Kompressionsstrümpfe nach Maß",
  "Brustprothese nach Brustkrebs",
  "Rezept erhalten",
  "neue Versorgung",
  "Inkontinenz-Bedarf",
  "Pflegehilfsmittel beantragen",
];
