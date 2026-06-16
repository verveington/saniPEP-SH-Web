import { strapiContentTypes } from "./mockData";
import type { IntegrationContract } from "./types";

export const integrationContracts: IntegrationContract[] = [
  {
    id: "strapi",
    label: "Strapi Headless CMS",
    status: "ready-for-backend",
    leadingSystem: false,
    boundary:
      "Strapi pflegt öffentliche und redaktionelle Inhalte. Keine sensiblen Rezept-, Portal- oder Omnia-Stammdaten.",
    dataClasses: ["public"],
    operations: [
      {
        id: "read-public-pages",
        label: "Landingpage, Service Pages, FAQ und SEO lesen",
        direction: "read",
        owner: "frontend",
        sensitive: false,
        notes: `${strapiContentTypes.length} Content-Type-Pläne sind modelliert.`,
      },
      {
        id: "read-form-config",
        label: "Formular-Konfigurationen lesen",
        direction: "read",
        owner: "frontend",
        sensitive: false,
        notes: "Feldreihenfolge, Pflichtfelder und Consent-Copy können später CMS-gesteuert werden.",
      },
    ],
    failureMode:
      "Website fällt auf statische Fallback-Inhalte zurück; Portal- und Requestdaten bleiben unberührt.",
    nextStep: "Strapi-Projekt bootstrappen, Content-Schemas anlegen, Preview/Publish-Workflow definieren.",
  },
  {
    id: "omnia",
    label: "Omnia Fachsystem",
    status: "blocked-by-contract",
    leadingSystem: true,
    boundary:
      "Omnia bleibt führend. Das Portal erzeugt Requests und spiegelt geprüfte Statusdaten, schreibt aber nicht final.",
    dataClasses: ["health", "omnia-master"],
    operations: [
      {
        id: "read-status",
        label: "Status, Dauerrezepte und Dauerversorgungen spiegeln",
        direction: "status-mirror",
        owner: "backend",
        sensitive: true,
        notes: "Nur sichere Zusammenfassungen im Portal anzeigen.",
      },
      {
        id: "submit-reviewed-request",
        label: "Mitarbeitergeprüfte Requests für Omnia vorbereiten",
        direction: "write-request",
        owner: "employee",
        sensitive: true,
        notes: "Finale Änderung bleibt ein Mitarbeiter-/Omnia-Prozess.",
      },
    ],
    failureMode:
      "Portal zeigt letzten bekannten sicheren Status und nimmt Requests weiter entgegen; keine Direktänderung möglich.",
    nextStep: "Omnia-API-Vertrag, Feldmapping, Konfliktlogik und Audit-IDs mit Anbieter/Fachteam klären.",
  },
  {
    id: "nextcloud-calendar",
    label: "Nextcloud Kalender",
    status: "mocked",
    leadingSystem: false,
    boundary:
      "Termine werden nur als Hold-Request vorbereitet. Verbindliche Buchung erfolgt nach Mitarbeiterbestätigung.",
    dataClasses: ["contact"],
    operations: [
      {
        id: "create-calendar-hold",
        label: "Wunschtermin als Kalender-Hold vormerken",
        direction: "hold-request",
        owner: "backend",
        sensitive: false,
        notes: "Aktuell im calendarAdapter typisiert und als Mock-Envelope erzeugt.",
      },
    ],
    failureMode:
      "Terminanfrage bleibt als Portal-/Mitarbeiterrequest bestehen; Kalender-Hold kann später manuell nachgetragen werden.",
    nextStep: "Nextcloud CalDAV-Zugang, Kalenderauswahl, Konfliktprüfung und Bestätigungsprozess definieren.",
  },
  {
    id: "notion-calendar",
    label: "Notion Kalender",
    status: "planned",
    leadingSystem: false,
    boundary:
      "Optionaler Kalenderkanal für interne Planung, nicht für finale Patiententermine ohne Bestätigung.",
    dataClasses: ["contact"],
    operations: [
      {
        id: "create-planning-card",
        label: "Terminwunsch als Planungseintrag erzeugen",
        direction: "hold-request",
        owner: "backend",
        sensitive: false,
        notes: "Nur minimale Kontaktdaten und sicheres Anliegen-Label verwenden.",
      },
    ],
    failureMode:
      "Notion-Ausfall blockiert keine Patientenanfrage; Mitarbeiterqueue bleibt führend für die Bearbeitung.",
    nextStep: "Entscheiden, ob Notion Kalender neben Nextcloud wirklich operativ benötigt wird.",
  },
];

export const integrationSummary = {
  total: integrationContracts.length,
  ready: integrationContracts.filter((item) => item.status === "ready-for-backend").length,
  mocked: integrationContracts.filter((item) => item.status === "mocked").length,
  blocked: integrationContracts.filter((item) => item.status === "blocked-by-contract").length,
};
