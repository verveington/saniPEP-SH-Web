# saniPEP-SH-Web

Modernes Webprojekt fuer saniPEP Sanitaetshaus mit oeffentlicher Website, Kundenportal-MVP
und internem Reshaped Design-Lab.

## Architekturentscheidung

- Frontend: React + TypeScript + Vite, weil Reshaped v4 als React Design System optimal nutzbar ist.
- Design System: Reshaped v4 mit zentralen saniPEP Tokens in `apps/frontend/src/lib/designTokens.ts`
  und CSS-Token-Overrides in `apps/frontend/src/styles/global.css`.
- Portalprinzip: Read-mostly + Request-based Actions. Kunden koennen Uploads, Bestellwuensche,
  Terminanfragen und Kontaktdatenpruefungen ausloesen, aber keine finalen Omnia-Aenderungen schreiben.
- Request-Policy: `apps/frontend/src/lib/requestWorkflow.ts` erzwingt erlaubte Request-Aktionen,
  blockierte Direktaktionen, Mitarbeiterpruefung, Auditpflicht und Datensensitivitaet.
- Omnia: bleibt fuehrendes System fuer Stammdaten, Dauerrezepte, Dauerversorgungen und finale Bestellungen.
- Kalender: Terminanfragen erzeugen nur einen `hold-request`, der spaeter an Nextcloud oder Notion
  angebunden werden kann. Es gibt keine finale Kalenderbuchung ohne Mitarbeiterbestaetigung.
- Strapi: vorbereitet fuer redaktionelle Inhalte, nicht fuer sensible Portal- oder Rezeptdaten.

## Installierte Pakete

- `reshaped`
- `react`
- `react-dom`
- `lucide-react`
- Dev: `vite`, `typescript`, `@vitejs/plugin-react`, `playwright`, React Types

## Projektstruktur

```text
apps/frontend/
  index.html
  vite.config.ts
  src/
    App.tsx
    main.tsx
    lib/
      authAdapter.ts
      calendarAdapter.ts
      designTokens.ts
      integrationContracts.ts
      mockData.ts
      omniaAdapter.ts
      privacySecurity.ts
      requestWorkflow.ts
      searchIndex.ts
      types.ts
    styles/global.css
  public/images/
apps/cms/
  strapi-content-types.md
assets/mock-images/
```

## Routing

- `/` Landingpage
- `/hilfe-finden`
- `/lymphoedem-lipoedem-narbenkompression`
- `/brustprothetik`
- `/bandagen-orthesen-reha-stoma`
- `/inkontinenz-pflege`
- `/rezept-hochladen`
- `/termin-anfragen`
- `/kontakt`
- `/portal/login`
- `/portal`
- `/admin/requests`
- `/admin/integrations`
- `/admin/design-lab`

## Wichtigste Komponenten und Flows

- Apple-artige Landingpage mit Hero, Schnellzugriff, Premium-Versorgungsbereichen, Ablauf,
  Portalvorschau und Standort/Kontakt.
- Patientenorientierte Suche unter `/hilfe-finden` mit Gewichtung Symptome vor Produkte
  vor Situationen und direkten CTAs zu Termin, Upload, Konfigurator, Portal oder Anfrage.
- Terminmodul mit Datum, 1-Stunden-Zeitfenster, Anliegen, kurzem Fragebogen und Hinweis,
  dass Mitarbeiter bestaetigen muessen.
- Rezeptupload als sensible Request-Abstraktion ohne LocalStorage fuer Gesundheitsdaten.
- Consent-/Rollen-/Upload-Policy mit Sicherheitsnachweis fuer Rezeptuploads.
- Schriftliche Kontaktanfrage als eigener Request-Typ fuer qualifizierte Kundenanfragen.
- Inkontinenz-/Pflege-Konfigurator als automatisierter Anfragefluss statt finaler Bestellung.
- Kundenportal mit Login-Mock, Dashboard, Rezepterinnerung, Dauerversorgungen,
  offenen Anfragen, lokaler Bestellanfrage-Aktion, Mitarbeiter-Pruefstatus und Audit-Log-Mock.
- Portal-Onboarding mit Einmalpasswort per Brief/Handout, Passwortsetzung und
  E-Mail-/Passwort-Login-Mock.
- Portal- und Design-Lab-Sicht auf Omnia-Guardrails: erlaubte Requests, blockierte Direktaktionen,
  Auditpflicht, Mitarbeiterpruefung und Omnia-Schreibschutz.
- Interne Mitarbeiter-Pruefqueue unter `/admin/requests` mit Triage, Rueckfrage,
  Omnia-Vorbereitung, Freigabe und Audit-Log-Mock.
- Interne Integrationsuebersicht unter `/admin/integrations` mit Connector-Vertraegen
  fuer Strapi, Omnia, Nextcloud Kalender und Notion Kalender.
- `/admin/design-lab` mit lokalen Varianten fuer Farbschema, Buttons, Terminmodule,
  Portalverlauf, Statusanzeigen, Formularlayouts und Strapi-Vorschau.

## Mockdatenmodell

Mockdaten liegen in `apps/frontend/src/lib/mockData.ts`:

- Kunden
- Rezepte
- Dauerversorgungen
- Bestellanfragen
- Liefer-/Requeststatus
- Rezeptablaufdaten
- Mitarbeiter-Pruefstatus
- Terminwuensche
- Schriftliche Kundenanfragen
- Pflegehilfsmittel-/Inkontinenz-Konfiguration
- Brustprothetik- und Lipoedem-/Lymphoedem-Prozesse

Der Mock-Omnia-Adapter liegt in `apps/frontend/src/lib/omniaAdapter.ts` und modelliert
Uploads und Termine als pruefbare Requests inklusive Audit-Event.
Der Auth-Adapter liegt in `apps/frontend/src/lib/authAdapter.ts` und beschreibt MVP-Login,
Einmalpasswort-Aktivierung, Passwortregeln und spaetere Magic-Link-/2FA-Erweiterung.
Der Kalender-Adapter liegt in `apps/frontend/src/lib/calendarAdapter.ts` und kapselt
spaetere Nextcloud-/Notion-Hold-Requests.
Die Workflow-Policy liegt in `apps/frontend/src/lib/requestWorkflow.ts` und blockiert direkte
Portalaktionen wie finale Omnia-Bestellungen, ungepruefte Stammdatenupdates und finale
Rezeptdatenaenderungen.
Die Datenschutz- und Upload-Grenze liegt in `apps/frontend/src/lib/privacySecurity.ts`:
Rollenfaehigkeiten, Consent-Scopes, verschluesselter Upload-Zielkanal, Virenscanpflicht,
keine lokale Persistenz und Retention-Hinweis.
Der Suchindex liegt in `apps/frontend/src/lib/searchIndex.ts` und bildet Patientensprache
auf priorisierte Wege zu Termin, Rezeptupload, Konfigurator, Portal oder Anfrage ab.
Die Connector-Vertraege liegen in `apps/frontend/src/lib/integrationContracts.ts` und
beschreiben Datenhoheit, erlaubte Operationen, Failure Modes und naechste Backend-Schritte
fuer Strapi, Omnia, Nextcloud Kalender und Notion Kalender.

## Strapi

Der Plan fuer Content-Types steht in `apps/cms/strapi-content-types.md` und deckt ab:
Landingpage Sections, Service Pages, FAQ, Symptoms, Product Groups, Contact Settings,
Opening Hours, Hero Content, SEO Metadata, Legal Pages, Portal Help Content und
Form Configurations.

## Datenschutz- und Sicherheitsvorbereitung

- Public Website und Portal sind logisch getrennt.
- Uploads sind abstrahiert und erzeugen Requests.
- Keine sensiblen Gesundheitsdaten im LocalStorage; Uploads erzeugen einen sicheren Envelope
  mit Consent-Scopes, Scanpflicht und Mitarbeiterpruefung.
- Mitarbeiterpruefung und Audit-Log sind modelliert.
- Blockierte Omnia-Direktaktionen sind als Policy-Matrix im Portal und Design-Lab sichtbar.
- Listenansichten zeigen nur datensparsame Statusinformationen.
- Sichere Fehler-/Hinweistexte vermeiden medizinische Details in generischen UIs.

## Mobile-first Anforderungen

- Ziel-Viewports: 360px, 390px, 430px, 768px, 1024px und 1280px+.
- Layouts vermeiden horizontales Scrollen, setzen auf einspaltige Mobile-Grids, 44px-Touchflaechen,
  responsive Tabs und mobile Karten statt Tabellen.
- Rezeptupload, Terminanfrage, Portal-Dashboard, Bestellverlauf und Admin-/Design-Lab-Ansichten
  besitzen mobile Karten-, Timeline- oder Formularabschnitte.
- Die laufende Mobile-Checkliste steht in `docs/mobile-checklist.md`.

## Entwicklung

```bash
npm run dev
npm run check:responsive
npm run check:flows
npm run build
```

## Offene Risiken und naechste Schritte

- Echte Authentifizierung, Rollenmodell und Upload-Speicher muessen backendseitig umgesetzt werden.
- Omnia-API-Vertrag, Mapping und Konfliktbehandlung muessen mit dem Fachsystem validiert werden.
- Kalenderadapter fuer Nextcloud oder Notion muss nach realem Terminprozess spezifiziert werden.
- Strapi-Projekt und Content-Schemas sind geplant, aber noch nicht als laufender CMS-Service angelegt.
- Browser-QA braucht in dieser Umgebung zusaetzliche Linux-Bibliotheken fuer Chromium.
