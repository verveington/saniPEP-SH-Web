# saniPEP Strapi CMS

Strapi ist der redaktionelle CMS-Service für die öffentliche Website. Es ist nicht das System für Portalstatus, Rezeptdateien, Upload-Verarbeitung, Omnia-Stammdaten oder individuelle Gesundheitsdaten.

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

- `HOST`, `PORT`: lokaler Strapi-Server, standardmäßig `127.0.0.1:1337`. In Production muss der Container `HOST=0.0.0.0` verwenden.
- `APP_KEYS`, `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`: pro Umgebung neu generieren.
- `DATABASE_CLIENT`: lokal `sqlite`, in Production `postgres`. SQLite ist in Production absichtlich gesperrt.
- `DATABASE_FILENAME`: lokaler SQLite-Pfad, standardmäßig `.tmp/data.db`.
- `DATABASE_URL`, `DATABASE_SCHEMA`, `DATABASE_SSL`: für PostgreSQL-Deployments.
- `CMS_CORS_ORIGINS`: in Production explizit setzen, z. B. `https://www.example-sanitaetshaus.de`.
- `UPLOAD_SIZE_LIMIT`: redaktionelle Medienbibliothek, aktuell 10 MB.

Next.js liest Strapi serverseitig über:

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

Draft/Publish ist für redaktionelle Inhalte aktiv. `form-configuration` bleibt nicht in der Public-API freigegeben.

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

Nur `find` und `findOne` werden aktiviert. `create`, `update`, `delete` und `form-configuration` bleiben für Public gesperrt.

## Rollen

Die redaktionelle Zielstruktur ist in `config/sanipep.js` vorbereitet:

- `Admin`: technische und fachliche CMS-Administration.
- `Redaktion`: öffentliche Inhalte erstellen und zur Veröffentlichung vorbereiten.
- `Mitarbeiter`: Standort- und Hilfetexte prüfen, keine Gesundheitsdaten verwalten.

Strapi Community startet mit dem ersten Super-Admin über `/admin`. Feingranulare Admin-RBAC muss je Deployment/Admin-Edition im Strapi-Admin final zugewiesen werden.

## Medienbibliothek

Das Seed-Skript legt diese Ordner an:

- `Logo`
- `Teamfotos`
- `Standortbilder`
- `Leistungsseitenbilder`
- `Produktgruppenbilder`
- `Downloads`
- `Icons`

Medien sind nur für redaktionelle Assets vorgesehen. Keine Rezeptdateien, Uploads aus Formularen oder Patientendokumente in Strapi speichern.

## Icon Assets

Globale Content-Icons werden reproduzierbar aus `apps/shared/icons` nach Strapi importiert:

1. Icon-Dateien bleiben im getrackten Shared-Icon-Bestand unter `apps/shared/icons/png/outline`.
2. `npm run cms:icons:import` kopiert die benötigten Dateien zur Laufzeit nach `apps/cms/public/uploads/icons`.
3. Das Skript legt oder aktualisiert Strapi-Media-Einträge und passende `Icon Asset`-Einträge.
4. `key` bleibt stabil, z. B. `body/lymph_nodes`, `symbols/secure_communication` oder `objects/phone`.
5. `safeForPublic=true` und `isGlobal=true` bleiben aktiv, wenn die Website das Icon verwenden darf.
6. Einträge werden veröffentlicht.

Die Website soll weiterhin stabile Icon-Keys referenzieren, nicht freie Upload-URLs. Bedienung und Navigation duerfen Reshaped/Lucide-Glyphen verwenden; Bedeutungs-, Fach- und Service-Icons kommen aus `Icon Asset`.

`apps/cms/public/uploads` ist ein Runtime-Upload-Verzeichnis und wird durch `uploads/` in `.gitignore` bewusst ignoriert. Ein Clean Clone enthält daher keine Dateien aus `apps/cms/public/uploads/icons`; das ist korrekt. Der Import nutzt Shared Icons als Quelle und befüllt den Runtime-Pfad reproduzierbar:

```bash
npm run cms:icons:import
```

Der Import liest `apps/shared/icons/png/outline/**/*.png`, ignoriert standardmäßig `@2x`-Varianten und legt stabile Keys aus dem Pfad an, z. B. `body/lymph_nodes`.

## Seed

Der Seed liegt in `mock-content/public-content.seed.json` und wird mit `npm run cms:seed` importiert. Er enthält synthetische, öffentliche Inhalte und setzt:

- veröffentlichte Dokumente für Public Content
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
