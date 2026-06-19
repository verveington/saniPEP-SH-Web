# saniPEP Strapi CMS

Strapi ist der redaktionelle CMS-Service fuer die oeffentliche Website. Es ist nicht das System fuer Portalstatus, Rezeptdateien, Upload-Verarbeitung, Omnia-Stammdaten oder individuelle Gesundheitsdaten.

## Startbefehle

Aus dem Repo-Root:

```bash
npm --prefix apps/cms install
npm run dev:cms
npm run cms:seed
npm run cms:icons:import
npm run build:cms
```

Direkt aus `apps/cms`:

```bash
npm install
npm run develop
npm run seed
npm run icons:import
npm run build
npm run start
```

Lokaler Admin: `http://localhost:1337/admin`

## ENV

Vor dem Start:

```bash
cp apps/cms/.env.example apps/cms/.env
```

Wichtige Variablen:

- `HOST`, `PORT`: lokaler Strapi-Server, standardmaessig `127.0.0.1:1337`.
- `APP_KEYS`, `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`: pro Umgebung neu generieren.
- `DATABASE_CLIENT`: lokal `sqlite`, produktiv bevorzugt `postgres`.
- `DATABASE_FILENAME`: lokaler SQLite-Pfad, standardmaessig `.tmp/data.db`.
- `DATABASE_URL`, `DATABASE_SCHEMA`, `DATABASE_SSL`: fuer PostgreSQL-Deployments.
- `UPLOAD_SIZE_LIMIT`: redaktionelle Medienbibliothek, aktuell 10 MB.

Next.js liest Strapi serverseitig ueber:

```bash
STRAPI_API_URL=http://127.0.0.1:1337
STRAPI_API_TOKEN=<optional-read-only-api-token>
```

Ohne `STRAPI_API_URL` nutzt die Public Website weiterhin den Seed-Fallback.

## Content-Types

- `landing-page-section`
- `service-page`
- `symptom`
- `product-group`
- `faq`
- `legal-page`
- `contact-setting`
- `opening-hour`
- `seo-metadata`
- `portal-help-content`
- `form-configuration`
- `hero-content`
- `icon-asset`

Draft/Publish ist fuer redaktionelle Inhalte aktiv. `form-configuration` bleibt nicht in der Public-API freigegeben.

## Public API

Der Seed setzt die Users-&-Permissions-Rolle `Public` auf read-only fuer:

- `contact-setting`
- `faq`
- `hero-content`
- `icon-asset`
- `landing-page-section`
- `legal-page`
- `opening-hour`
- `portal-help-content`
- `product-group`
- `seo-metadata`
- `service-page`
- `symptom`

Nur `find` und `findOne` werden aktiviert. `create`, `update`, `delete` und `form-configuration` bleiben fuer Public gesperrt.

## Rollen

Die redaktionelle Zielstruktur ist in `config/sanipep.js` vorbereitet:

- `Admin`: technische und fachliche CMS-Administration.
- `Redaktion`: oeffentliche Inhalte erstellen und zur Veroeffentlichung vorbereiten.
- `Mitarbeiter`: Standort- und Hilfetexte pruefen, keine Gesundheitsdaten verwalten.

Strapi Community startet mit dem ersten Super-Admin ueber `/admin`. Feingranulare Admin-RBAC muss je Deployment/Admin-Edition im Strapi-Admin final zugewiesen werden.

## Medienbibliothek

Das Seed-Skript legt diese Ordner an:

- `Logo`
- `Teamfotos`
- `Standortbilder`
- `Leistungsseitenbilder`
- `Produktgruppenbilder`
- `Downloads`
- `Icons`

Medien sind nur fuer redaktionelle Assets vorgesehen. Keine Rezeptdateien, Uploads aus Formularen oder Patientendokumente in Strapi speichern.

## Icon Assets

Globale Content-Icons werden lokal in Strapi verwaltet:

1. Datei in der Medienbibliothek in den Ordner `Icons` hochladen.
2. Content Manager -> `Icon Asset` -> neuen Eintrag anlegen.
3. `key` stabil setzen, z. B. `body/lymph_nodes`, `symbols/secure_communication` oder `objects/phone`.
4. `file` mit dem hochgeladenen Medium verknuepfen.
5. `safeForPublic=true` und `isGlobal=true` lassen, wenn die Website das Icon verwenden darf.
6. Eintrag veroeffentlichen.

Die Website soll weiterhin stabile Icon-Keys referenzieren, nicht freie Upload-URLs. Bedienung und Navigation duerfen Reshaped/Lucide-Glyphen verwenden; Bedeutungs-, Fach- und Service-Icons kommen aus `Icon Asset`.

Wenn die Icon-Datenbank als Dateien unter `apps/cms/public/uploads/icons` liegt, importiert dieser Befehl die erlaubten Outline-PNGs in Strapi Media Library und legt passende `Icon Asset`-Eintraege an:

```bash
npm run cms:icons:import
```

Der Import liest nur `public/uploads/icons/png/outline/**/*.png`, ignoriert standardmaessig `@2x`-Varianten und legt stabile Keys aus dem Pfad an, z. B. `body/lymph_nodes`.

## Seed

Der Seed liegt in `mock-content/public-content.seed.json` und wird mit `npm run cms:seed` importiert. Er enthaelt synthetische, oeffentliche Inhalte und setzt:

- veroeffentlichte Dokumente fuer Public Content
- Medienordner
- Public-Read-Permissions

Der Seed blockiert, wenn `contentPolicy.containsRealPatientData` nicht `false` ist.

## Datenschutzgrenze

Nicht in Strapi speichern:

- Rezeptdateien oder Upload-Dateien aus Patientenformularen
- Freitextanfragen aus Formularen
- individuelle Gesundheitsdaten
- Portalstatus
- Omnia-Stammdaten
- finale Bestellungen oder Dauerversorgungen

Strapi bleibt redaktionelles CMS. Upload-, Auth- und Portal-Backends bleiben getrennte produktive Systeme.
