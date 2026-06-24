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
- Portal Backend: `apps/backend` stellt im Development-MVP Login, HTTP-only Session-Cookie,
  CSRF-Token, Dashboard, Request-Speicherung und Audit Events bereit. Es bleibt ohne Omnia-Anbindung
  und ohne Produktiv-Uploads.

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
apps/backend/
  src/
    app.ts
    auth/
    portalRequests/
    audit/
    uploads/
scripts/
  demo-portal-mvp.mjs
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
  vor Situationen und direkten CTAs zu Termin, Upload, Konfigurator, Portal-Hinweis oder Anfrage.
- Terminmodul mit Datum, 1-Stunden-Zeitfenster, Anliegen, kurzem Fragebogen und Hinweis,
  dass Mitarbeiter bestaetigen muessen.
- Rezeptupload als sensible Request-Abstraktion ohne LocalStorage fuer Gesundheitsdaten.
- Consent-/Rollen-/Upload-Policy mit Sicherheitsnachweis fuer Rezeptuploads.
- Schriftliche Kontaktanfrage als eigener Request-Typ fuer qualifizierte Kundenanfragen.
- Inkontinenz-/Pflege-Konfigurator als automatisierter Anfragefluss statt finaler Bestellung.
- Oeffentliche Website zeigt nur einen noindex Portal-Hinweis. Portalstatus, Staff-Admin und Design-Lab
  sind nicht Teil des oeffentlichen Produktivbuilds; das Kundenportal bleibt bis zur separaten Freigabe No-Go.
- Portal-MVP in `apps/portal` spricht gegen `apps/backend`: Login, Sessionpruefung,
  Rezeptupload-Anfrage, Terminwunsch, Bestellanfrage, Mitarbeiterstatus und Audit Events.
  Uploads speichern nur Metadaten; es gibt keine echten Gesundheitsdaten und keine Produktiv-Uploads.
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
auf priorisierte Wege zu Termin, Rezeptupload, Konfigurator, Portal-Hinweis oder Anfrage ab.
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
- Das Portal-MVP nutzt serverseitige Sessions mit HTTP-only Cookie; CSRF bleibt im Arbeitsspeicher
  der Portal-App und wird nicht persistiert.
- Keine sensiblen Gesundheitsdaten im LocalStorage; Uploads erzeugen einen sicheren Envelope
  mit Consent-Scopes, Scanpflicht und Mitarbeiterpruefung.
- Rezeptupload im Portal-MVP speichert nur Kontext, Dateityp, Groesse, Request-ID und Audit Events,
  keine Dateiinhalte und keine Dateinamen.
- Mitarbeiterpruefung und Audit-Log sind modelliert.
- Omnia-Schreibzugriffe bleiben im Portal-MVP bei `0`.
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
npm run start:backend
npm run dev:admin
npm run dev:design-lab
npm run demo:portal-mvp
npm run check:responsive
npm run check:flows
npm run build
npm run build:backend
npm run build:frontend:vite
npm run build:portal:mock
npm run build:admin
npm run build:admin:mock
npm run build:design-lab:mock
```

Wenn Staff Admin oder Portal als Vite-Dev-Server von einem anderen Host/IP-Namen auf ein laufendes
Backend zugreifen sollen, den Browser-Fetch same-origin lassen und nur den Vite-Proxy umbiegen:

```bash
unset VITE_PORTAL_BACKEND_URL
PORTAL_BACKEND_PROXY_TARGET=http://10.0.60.13:4100 npm run dev:admin -- --host 0.0.0.0 --port 5185
```

`VITE_PORTAL_BACKEND_URL` ist fuer gebaute Deployments gedacht. Im Dev-Server fuehrt es zu
Cross-Origin-Fetches; der `/api`-Proxy vermeidet CORS-Probleme.

## Dauerbetrieb mit Docker Compose

Die oeffentliche Next.js-Website, das Portal-Backend, PostgreSQL und Redis koennen dauerhaft
als Docker-Compose-Stack laufen:

```bash
docker compose up -d --build
```

Danach sind die Dienste hier erreichbar:

- Public Website: `http://localhost:3000`
- Portal Backend Healthcheck: `http://localhost:4100/healthz`

Die Container nutzen `restart: unless-stopped`. Solange Docker beim Systemstart gestartet wird,
kommen die Dienste nach einem Reboot automatisch wieder hoch.

Nuetzliche Befehle:

```bash
npm run compose:ps
npm run compose:logs -- web
npm run compose:logs -- backend
docker compose restart web
npm run compose:down
```

Persistente lokale Daten liegen in benannten Docker-Volumes fuer PostgreSQL, Redis und den
Development-Store des Portal-MVPs. Nur wenn diese Daten bewusst geloescht werden sollen:

```bash
docker compose down -v
```

Optional kann der Compose-Stack als systemd-Service auf dem Host eingetragen werden. Die Vorlage
liegt in `ops/systemd/sanipep-sh-web.service.example`:

```bash
sudo cp ops/systemd/sanipep-sh-web.service.example /etc/systemd/system/sanipep-sh-web.service
sudo systemctl daemon-reload
sudo systemctl enable --now sanipep-sh-web.service
sudo systemctl status sanipep-sh-web.service
```

Falls `docker` auf dem Host nicht unter `/usr/bin/docker` liegt, muss `ExecStart` in der Service-Datei
auf den Pfad aus `command -v docker` angepasst werden.

## Staging: Public Requests + Staff Admin MVP

Der Staging-Pfad fuer Public Requests und Staff Admin liegt in
`docs/staging-public-requests-staff-admin.md`.

Er deployt:

- Public Website
- Backend mit Postgres-Repository, Redis und `backend-migrate`
- Staff Admin Workbench aus `apps/admin`

Er deployt nicht:

- Kundenportal aus `apps/portal`
- produktive Datei-Uploads
- Upload-Quarantaene-Verarbeitung
- Omnia-Integration

Config-Check:

```bash
npm run compose:staging:config
```

Pilot-Readiness-Gate:

```bash
npm run check:pilot:readiness
```

Echte Pilot-Env und laufende Pilot-Instanz pruefen:

```bash
PILOT_ENV_FILE=.env.staging npm run check:pilot:env
npm run check:postgres:backup-restore
npm run check:pilot:live
```

Env-Vorlagen:

- `.env.staging.example`: echtes Staging mit eigenen HTTPS-Domains und Reverse Proxy. Die enthaltenen `.invalid` Werte sind Platzhalter und duerfen nicht produktiv verwendet werden.
- `.env.staging.internal.example`: LAN/VPN-interner Server-IP-Test ueber `10.0.60.13` und direkte Ports `3000`, `4100`, `5184`. Dieser Modus ist keine Public-Staging-Freigabe.

Die frueher verwendeten `*.example-sanitaetshaus.de` Namen sind ebenfalls Platzhalter und gehoeren nicht als reale Staging-Domains in Betrieb. Echte Public-Staging-Freigabe braucht eigene Domains, DNS, TLS und passende `TRUSTED_ORIGINS`. Fuer den aktuellen internen Test wird IP-/LAN-Staging ueber `10.0.60.13` verwendet. Staff Admin muss nach jeder Aenderung von `VITE_PORTAL_BACKEND_URL` neu gebaut werden, weil diese URL in das statische Vite-Bundle eingebettet wird. Uploads bleiben mit `UPLOADS_ENABLED=false` No-Go, das Kundenportal bleibt No-Go und `OMNIA_WRITE_MODE` bleibt `read_only`.

Das kontrollierte Pilot-Runbook liegt in `docs/controlled-pilot-runbook.md`; die Startfreigabe-Checkliste liegt in `docs/controlled-pilot-start-checklist.md`; die fachliche Staff-Abnahme liegt in `docs/staff-pilot-acceptance-plan.md`.

## Offene Risiken und naechste Schritte

- Das Portal-MVP nutzt Development-Seed-Credentials und eine lokale dateibasierte Repository-Persistenz;
  echte PostgreSQL-/Redis-Anbindung, produktive Authentifizierung, Rollenverwaltung und Upload-Speicher
  muessen fuer Produktion backendseitig angebunden werden.
- Portal, Staff-Admin und Design-Lab sind nur mit serverseitiger Auth-/Role-Grenze produktionsreif.
- Omnia-API-Vertrag, Mapping und Konfliktbehandlung muessen mit dem Fachsystem validiert werden.
- Kalenderadapter fuer Nextcloud oder Notion muss nach realem Terminprozess spezifiziert werden.
- Strapi-Projekt und Content-Schemas sind geplant, aber noch nicht als laufender CMS-Service angelegt.
- Der alte Vite-Public-Build bleibt vorerst als Legacy-Vergleich erhalten und sollte nach stabiler
  Next-Abnahme entfernt oder archiviert werden.
- Browser-QA braucht in dieser Umgebung zusaetzliche Linux-Bibliotheken fuer Chromium.
