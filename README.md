# saniPEP-SH-Web

Modernes Webprojekt fuer saniPEP Sanitaetshaus mit Next.js-basierter oeffentlicher Website
und getrennten Development-only Vite-Builds fuer Portal, Staff-Admin und Design-Lab.

## Architekturentscheidung

- Public Website: Next.js App Router mit SSG/ISR-faehigen Public Routes, serverseitigen Meta-Daten,
  Canonicals, OpenGraph und strukturierten Daten.
- Build-Grenze: Die oeffentliche Website ist ein eigener Next.js-Build. Portal, Staff-Admin und
  Design-Lab liegen weiterhin in getrennten Vite-Apps und duerfen produktiv nur hinter serverseitiger
  Auth-/Rollenpruefung ausgeliefert werden.
- Design System: Reshaped v4 mit zentralen saniPEP Tokens in `apps/frontend/src/lib/designTokens.ts`
  und CSS-Token-Overrides in `apps/frontend/src/styles/global.css`. Die Next-App nutzt dafuer eine
  kleine `AppProvider` Client Boundary.
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
- `next`
- `lucide-react`
- Dev: `vite`, `typescript`, `@vitejs/plugin-react`, `playwright`, React Types

## Projektstruktur

```text
apps/web/
  app/
    page.tsx
    */page.tsx
    layout.tsx
  components/
  lib/
    cms/
    seo/
    routes/
  public/images/
apps/frontend/
  # Legacy Vite Public App und gemeinsam weiterverwendete Public Libs
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
  mock-content/
    public-content.seed.json
  components/shared/
  content-types/
assets/mock-images/
```

## Routing

- `/` Landingpage
- `/hilfe-finden`
- `/lymphoedem-lipoedem-narbenkompression`
- `/brustprothetik`
- `/bandagen-orthesen-reha-stoma`
- `/inkontinenz-pflegehilfsmittel`
- `/rezept-upload`
- `/termin-anfragen`
- `/kontakt`
- `/impressum`
- `/datenschutz`
- `/einwilligung`

Getrennte Development-only Apps:

- `apps/portal` mit Rolle `customer` oder `admin`
- `apps/admin` mit Rolle `staff` oder `admin`
- `apps/design-lab` mit Rolle `admin`

## Wichtigste Komponenten und Flows

- Apple-artige Landingpage mit Hero, Schnellzugriff, Premium-Versorgungsbereichen, Ablauf
  und Standort/Kontakt.
- Patientenorientierte Suche unter `/hilfe-finden` mit Gewichtung Symptome vor Produkte
  vor Situationen und direkten CTAs zu Termin, Upload, Konfigurator, Portal oder Anfrage.
- Terminmodul mit Datum, 1-Stunden-Zeitfenster, Anliegen, kurzem Fragebogen und Hinweis,
  dass Mitarbeiter bestaetigen muessen.
- Rezeptupload als sensible Request-Abstraktion ohne LocalStorage fuer Gesundheitsdaten.
- Consent-/Rollen-/Upload-Policy mit Sicherheitsnachweis fuer Rezeptuploads.
- Schriftliche Kontaktanfrage als eigener Request-Typ fuer qualifizierte Kundenanfragen.
- Inkontinenz-/Pflege-Konfigurator als automatisierter Anfragefluss statt finaler Bestellung.
- Oeffentliche Website verlinkt nur den Kundenportal-Login. Portalstatus, Staff-Admin und Design-Lab
  sind nicht Teil des oeffentlichen Produktivbuilds.
- Portal-Mock mit Einmalpasswort-/Passwort-Adapter liegt in `apps/portal` und ist nicht produktiv.
- Development-only Staff-Admin und Design-Lab sind separate Builds mit Mock-Gate und klarer
  Nicht-Produktionskennzeichnung.

## Mockdatenmodell

Development-only Mockdaten liegen in `apps/frontend/src/lib/mockData.ts` und werden vom
oeffentlichen Build nicht importiert:

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
- synthetische, nicht personenbezogene Versorgungsprozesse

Der Mock-Omnia-Adapter liegt in `apps/frontend/src/lib/omniaAdapter.ts` und modelliert
Uploads und Termine als pruefbare Requests inklusive Audit-Event.
Der Auth-Adapter liegt in `apps/frontend/src/lib/authAdapter.ts` und beschreibt MVP-Login,
Einmalpasswort-Aktivierung, Passwortregeln und spaetere Magic-Link-/2FA-Erweiterung.
Der Kalender-Adapter liegt in `apps/frontend/src/lib/calendarAdapter.ts` und kapselt
spaetere Nextcloud-/Notion-Hold-Requests.
Die Workflow-Policy liegt in `apps/frontend/src/lib/requestWorkflow.ts` und blockiert direkte
Portalaktionen wie finale Omnia-Bestellungen, ungepruefte Stammdatenupdates und finale
Rezeptdatenaenderungen in den getrennten Development-only Builds.
Die Datenschutz- und Upload-Grenze liegt in `apps/frontend/src/lib/privacySecurity.ts`:
Rollenfaehigkeiten, Consent-Scopes, verschluesselter Upload-Zielkanal, Virenscanpflicht,
keine lokale Persistenz und Retention-Hinweis.
Der Suchindex liegt in `apps/frontend/src/lib/searchIndex.ts` und bildet Patientensprache
auf priorisierte Wege zu Termin, Rezeptupload, Konfigurator, Portal oder Anfrage ab.
Die Next Public App nutzt diese bestehende Validierungs-, Datenschutz-, Search- und Metadata-Logik
weiter und rendert Public Content serverseitig aus `apps/web`.
Die Connector-Vertraege liegen in `apps/frontend/src/lib/integrationContracts.ts` und
beschreiben Datenhoheit, erlaubte Operationen, Failure Modes und naechste Backend-Schritte
fuer Strapi, Omnia, Nextcloud Kalender und Notion Kalender.

## Strapi

Die vorbereiteten Content-Type-Schemas stehen in `apps/cms/content-types` und `apps/cms/components`.
Die Struktur deckt ab: Landingpage Sections, Service Pages, Symptoms, Product Groups, FAQ,
Legal Pages, Contact Settings, Opening Hours, SEO Metadata, Portal Help Content,
Hero Content und Form Configurations.

Der Mock-Seed in `apps/cms/mock-content/public-content.seed.json` ist synthetisch,
freundlich formuliert und fuer aeltere Patienten verstaendlich gehalten. Er enthaelt
keine echten Patientendaten, keine finalen Rechtstexte und keine Heilversprechen.
Rechtstexte bleiben ausdruecklich als Platzhalter markiert, bis sie juristisch freigegeben sind.

## Datenschutz- und Sicherheitsvorbereitung

- Public Website und Portal sind logisch getrennt.
- Uploads sind abstrahiert und erzeugen Requests.
- Keine sensiblen Gesundheitsdaten im LocalStorage; Uploads erzeugen einen sicheren Envelope
  mit Consent-Scopes, Scanpflicht und Mitarbeiterpruefung.
- Mitarbeiterpruefung und Audit-Log sind modelliert.
- Blockierte Omnia-Direktaktionen sind als Policy-Matrix fuer getrennte interne Builds vorbereitet.
- Listenansichten zeigen nur datensparsame Statusinformationen.
- Sichere Fehler-/Hinweistexte vermeiden medizinische Details in generischen UIs.

## Mobile-first Anforderungen

- Ziel-Viewports: 360px, 390px, 430px, 768px, 1024px und 1280px+.
- Layouts vermeiden horizontales Scrollen, setzen auf einspaltige Mobile-Grids, 44px-Touchflaechen,
  responsive Tabs und mobile Karten statt Tabellen.
- Rezeptupload, Terminanfrage und Kontaktformular besitzen mobile Formularabschnitte.
- Getrennte Portal-, Staff-Admin- und Design-Lab-Builds muessen vor Produktion gesondert visuell
  und serverseitig autorisiert geprueft werden.
- Die laufende Mobile-Checkliste steht in `docs/mobile-checklist.md`.

## Entwicklung

```bash
npm run dev
npm run dev:frontend:vite
npm run dev:portal
npm run dev:admin
npm run dev:design-lab
npm run check:responsive
npm run check:flows
npm run build
npm run build:frontend:vite
npm run build:portal:mock
npm run build:admin:mock
npm run build:design-lab:mock
```

## Offene Risiken und naechste Schritte

- Echte Authentifizierung, Rollenmodell und Upload-Speicher muessen backendseitig umgesetzt werden.
- Portal, Staff-Admin und Design-Lab sind nur mit serverseitiger Auth-/Role-Grenze produktionsreif.
- Omnia-API-Vertrag, Mapping und Konfliktbehandlung muessen mit dem Fachsystem validiert werden.
- Kalenderadapter fuer Nextcloud oder Notion muss nach realem Terminprozess spezifiziert werden.
- Strapi-Projekt und Content-Schemas sind geplant, aber noch nicht als laufender CMS-Service angelegt.
- Der alte Vite-Public-Build bleibt vorerst als Legacy-Vergleich erhalten und sollte nach stabiler
  Next-Abnahme entfernt oder archiviert werden.
- Browser-QA braucht in dieser Umgebung zusaetzliche Linux-Bibliotheken fuer Chromium.
