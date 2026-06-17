# Entscheidungsdokument: Rendering-Framework fuer saniPEP

Stand: 2026-06-16

## Empfehlung

Empfehlung: **B) Next.js App Router mit SSG/SSR fuer die Public Website nutzen.**

Die aktuelle Vite-React-SPA ist fuer Prototyp, UX, Formularlogik und getrennte Mock-Builds gut geeignet. Fuer eine produktive lokale Website eines Sanitaetshauses ist sie aber an der falschen Stelle schwach: Die oeffentlichen Leistungsseiten liefern initial alle dasselbe HTML-Dokument aus. Route-spezifische Titles, Descriptions, Canonicals und OpenGraph-Tags werden erst nach JavaScript-Ausfuehrung gesetzt. Das ist fuer Google oft renderbar, aber fuer lokale SEO, Social Preview Bots, schnelle Indexierung und robuste Canonicals nicht die beste Grundlage.

Next.js sollte zunaechst nur die **Public Website** uebernehmen. Portal, Admin und Design-Lab koennen getrennte Apps bleiben oder spaeter als eigene Next-Apps migriert werden. Wichtig ist, dass Portal/Admin nicht in den Public-Build fallen.

## Bewertung

| Kriterium | Vite-SPA + Prerendering | Next.js App Router | Remix / React Router Framework |
| --- | --- | --- | --- |
| Lokale SEO Muenchen | Mittel: mit Prerender machbar, aber zusaetzliche Pipeline | Stark: statische/Server-HTML-Seiten pro Route | Stark bei SSR, SSG weniger standardisiert |
| Indexierbarkeit Leistungsseiten | Aktuell schwach, mit Prerender besser | Stark durch echte HTML-Routen | Stark bei SSR |
| Meta Titles/Descriptions | Aktuell clientseitig; Prerender muesste es materialisieren | Native `generateMetadata` je Route | Route-Meta moeglich |
| OpenGraph | Aktuell unzuverlaessig fuer Bots ohne JS | Native serverseitige OG-Meta pro Route | Moeglich, aber mehr Eigenarbeit |
| Strukturierte Daten | Aktuell nur global im `index.html` | Pro Seite serverseitig aus CMS moeglich | Moeglich |
| Ladezeit/LCP | JS muss erst rendern; Hero ist optimiert, aber nicht initiales HTML | Besserer First Paint durch SSG/SSR, weniger Public-JS moeglich | Besser bei SSR |
| Strapi-Anbindung | Build-Script oder Client-Fetch noetig | Server-Fetch, Revalidate, Webhook-freundlich | Server-Loader gut, SSG-Konzept aufwendiger |
| Routing/Redirects | Hosting-spezifisch, SPA-Fallback noetig | `next.config` Redirects, echte Routes | Server-Redirects moeglich |
| Spaeteres Kundenportal | Vite getrennt bleibt okay; Auth muss separat geloest werden | Gute Auth-/Role-Grenze moeglich, aber nur spaeter migrieren | Ebenfalls gut |
| Deployment-Komplexitaet | Niedrig heute, steigt mit Prerender/Redirect-Skripten | Mittel, aber Standardpfad fuer SEO + CMS | Mittel bis hoch im Vergleich zum Nutzen |

## Warum nicht A?

**A) Vite-SPA behalten + Prerendering** ist der schnellste Zwischenweg, aber es erzeugt eine zweite Rendering-Schicht neben der bestehenden SPA-Logik. Fuer saniPEP waeren danach weiterhin diese Punkte aktiv zu pflegen:

- Prerender-Script fuer alle Public Routes.
- Route-spezifische Head-Tags zur Build-Zeit.
- Canonicals, OpenGraph und strukturierte Daten je Route.
- Redirect-Regeln fuer alte Slugs in der Hosting-Plattform.
- Strapi-Build-Fetch inklusive Cache-/Webhook-Strategie.
- Sicherstellen, dass Formular- und Portal-Routen nicht versehentlich prerendered oder indexiert werden.

Das ist fuer eine kleine statische Website akzeptabel. saniPEP hat aber mehrere Leistungsseiten, lokale SEO-Ziele, Strapi-Struktur, Legal-Seiten, spaeter Portal und Redirect-Bedarf. Dadurch wird Prerendering zur eigenen Infrastruktur.

## Warum B?

Next.js passt besser, weil die Public Website inhaltlich eine CMS-getriebene, lokal suchbare Website ist:

- **Leistungsseiten** koennen statisch generiert werden: `/lymphoedem-lipoedem-narbenkompression`, `/brustprothetik`, `/bandagen-orthesen-reha-stoma`, `/inkontinenz-pflegehilfsmittel`.
- **Meta-Daten** koennen pro Route serverseitig aus `seo-metadata` oder `routeMetadata` kommen.
- **OpenGraph** und Canonicals stehen im initialen HTML, nicht erst nach Hydration.
- **Strukturierte Daten** koennen pro Seite eingebettet werden: LocalBusiness, MedicalBusiness/Sanitaetshaus-nahe LocalBusiness-Daten, OpeningHours, Breadcrumbs, FAQ, Service.
- **Strapi** kann serverseitig gelesen werden; statische Seiten koennen per Revalidation/Webhook aktualisiert werden.
- **Redirects** fuer alte Slugs werden zentral und testbar:
  - `/inkontinenz-pflege` -> `/inkontinenz-pflegehilfsmittel`
  - `/rezept-hochladen` -> `/rezept-upload`
- **LCP** profitiert, weil Hero-Markup und sichtbarer Text bereits im HTML stehen. Die bestehenden AVIF/WebP-Assets und festen Groessen bleiben nutzbar.

## Warum nicht C?

Remix bzw. React Router Framework waere technisch moeglich und fuer serverseitige Form-/Route-Logik solide. Fuer saniPEP ist der Mehrwert gegenueber Next.js geringer:

- SSG/ISR/CMS-Revalidation ist in Next.js direkter fuer diesen Use Case.
- Metadata, Redirects, Bildoptimierung und Deployment-Pfade sind fuer contentlastige Public Sites staerker standardisiert.
- Das Team muesste weniger eigene Infrastruktur rund um SEO und statische Generierung bauen.

## Zielarchitektur

```text
apps/
  web/                  Next.js App Router, Public Website
    app/
      (public)/
        page.tsx
        lymphoedem-lipoedem-narbenkompression/page.tsx
        brustprothetik/page.tsx
        bandagen-orthesen-reha-stoma/page.tsx
        inkontinenz-pflegehilfsmittel/page.tsx
        rezept-upload/page.tsx
        termin-anfragen/page.tsx
        kontakt/page.tsx
        impressum/page.tsx
        datenschutz/page.tsx
        einwilligung/page.tsx
      layout.tsx
    components/
    lib/
      cms/
      seo/
      routes/
  portal/               vorerst bestehende Vite-App oder spaeter eigene Next-App
  admin/                vorerst bestehende Vite-App oder spaeter eigene Next-App
  design-lab/           vorerst bestehende Vite-App
  cms/                  Strapi-Schemas und Seed-Content
```

Public Website und Portal/Admin sollten weiterhin logisch und buildseitig getrennt bleiben. Ein gemeinsames Monorepo ist sinnvoll, ein gemeinsamer Public-Bundle nicht.

## Migrationsplan

### Phase 1: Vorbereitung ohne Produktlogikverlust

1. Neues `apps/web` als Next.js App Router anlegen.
2. Reshaped, globale Styles und `designTokens.ts` in ein shared-freundliches Modul ueberfuehren.
3. Gemeinsame Typen fuer Routes, Service Areas, SEO Metadata und CMS-Content aus `apps/frontend/src/lib/types.ts` extrahieren.
4. Bestehende Public Pages in presentational Components zerlegen, damit sie in Server Components mit Client-Islands genutzt werden koennen.

Betroffene Dateien:
- `apps/frontend/src/pages/*`
- `apps/frontend/src/components/*`
- `apps/frontend/src/app/publicContent.ts`
- `apps/frontend/src/lib/routeMetadata.json`
- `apps/frontend/src/lib/designTokens.ts`
- `apps/frontend/src/styles/global.css`

### Phase 2: Public Routes als SSG/SSR abbilden

1. `app/(public)/page.tsx` fuer Landingpage.
2. Eigene `page.tsx` pro Pflichtseite statt SPA-State-Router.
3. `generateMetadata` je Route aus `routeMetadata` oder spaeter Strapi.
4. Canonical, Robots, OpenGraph und Description serverseitig setzen.
5. Strukturierte Daten pro Route serverseitig einbetten.

Prioritaet:
1. Landingpage
2. Leistungsseiten
3. Kontakt
4. Rezeptupload / Termin / Konfigurator
5. Legal-Seiten

### Phase 3: Strapi vorbereiten

1. `apps/web/lib/cms/strapi.ts` mit serverseitigem Fetch-Client.
2. Build-safe lazy Initialisierung, keine SDK-/Token-Initialisierung auf Modulebene.
3. Fallback auf `apps/cms/mock-content/public-content.seed.json`, solange Strapi nicht produktiv laeuft.
4. Revalidation-Strategie definieren: statische Seiten mit tag-/path-basierter Revalidation nach Strapi-Publish.
5. Preview/Draft erst spaeter, nicht im ersten Migrationsschnitt.

Betroffene Dateien:
- `apps/cms/content-types/*`
- `apps/cms/components/shared/*`
- `apps/cms/mock-content/public-content.seed.json`
- neu: `apps/web/lib/cms/*`

### Phase 4: Redirects und Routing

1. Redirects fuer alte Slugs in `next.config.ts`.
2. SPA-Navigation durch echte Next Links ersetzen.
3. `RouteLink` nur noch als duenne Wrapper-Komponente oder entfernen.
4. Public Route-Liste als zentrale Quelle behalten.

Redirects:
- `/inkontinenz-pflege` -> `/inkontinenz-pflegehilfsmittel`
- `/rezept-hochladen` -> `/rezept-upload`

### Phase 5: Client-Islands fuer Formulare

1. Termin-, Kontakt-, Upload- und Pflegehilfsmittel-Formulare als Client Components migrieren.
2. Bestehende `validate*Input`-Funktionen unveraendert uebernehmen.
3. Keine produktive Server Action fuer Upload/Auth in diesem Schritt.
4. Conversion-Tracking weiterhin nur grobe Ziele, keine Diagnosen oder Freitexte.

Betroffene Dateien:
- `apps/frontend/src/pages/AppointmentRequestPage.tsx`
- `apps/frontend/src/pages/PrescriptionUploadPage.tsx`
- `apps/frontend/src/pages/ConfiguratorPage.tsx`
- `apps/frontend/src/pages/ContactPage.tsx`
- `apps/frontend/src/lib/formValidation.ts`
- `apps/frontend/src/lib/privacySecurity.ts`
- `apps/frontend/src/lib/conversionFunnel.ts`

### Phase 6: Portal/Admin getrennt halten

1. Bestehende `apps/portal`, `apps/admin`, `apps/design-lab` nicht in `apps/web` importieren.
2. Public Website verlinkt nur `/portal/login`.
3. Portal kann zunaechst Vite bleiben.
4. Produktive Portal-Migration erst mit echter serverseitiger Auth-/Role-Grenze planen.

## Aufwand

| Phase | Aufwand | Risiko |
| --- | --- | --- |
| Vorbereitung Shared Code | 1-2 Tage | Mittel: Imports und CSS-Grenzen |
| Next Public App scaffolden | 0.5-1 Tag | Niedrig |
| Public Pages migrieren | 2-4 Tage | Mittel: Server/Client-Grenzen mit Reshaped |
| Metadata/Structured Data/Redirects | 1-2 Tage | Niedrig bis mittel |
| Strapi-Fetch-Schicht + Seed-Fallback | 1-2 Tage | Mittel: Content-Mapping |
| Formulare als Client-Islands | 1-2 Tage | Mittel: Validierung erhalten |
| QA/Build/SEO-Checks | 1-2 Tage | Mittel |

Realistisch: **7-13 Arbeitstage** fuer eine saubere Public-Website-Migration ohne Portal-Produktivlogik.

## Hauptrisiken

- Reshaped-Komponenten koennen Client-Provider benoetigen. Der Provider gehoert in ein kleines Client Boundary Layout, waehrend Seiteninhalt so weit wie moeglich serverseitig bleibt.
- Globale CSS-Groesse bleibt ein Performance-Thema und wird durch Next.js nicht automatisch geloest.
- Strapi ist noch nicht als Service provisioniert; bis dahin muss der Seed-Fallback stabil bleiben.
- Legal-Texte bleiben Platzhalter und duerfen durch SSG nicht wie finaler Content wirken.
- Formularseiten sind interaktiv und werden nicht vollstaendig server-only. Das ist akzeptabel, aber Client-JS bleibt dort noetig.
- Portal/Admin duerfen nicht versehentlich in den Public Next-Build importiert werden.

## Reihenfolge der Umsetzung

1. `apps/web` Next.js App Router scaffolden.
2. Shared Public-Komponenten und Tokens vorbereiten.
3. Public Layout, Header, Footer und Landingpage migrieren.
4. Leistungsseiten als statische Routes migrieren.
5. `generateMetadata`, Canonicals, OpenGraph und strukturierte Daten einbauen.
6. Strapi-Seed-Fallback und CMS-Fetch-Abstraktion einbauen.
7. Redirects fuer alte Slugs ergaenzen.
8. Formularseiten als Client-Islands migrieren.
9. Checks erweitern: SEO-HTML pro Route, noindex fuer Portal Login, keine Admin-/Design-Lab-Imports im Public Build.
10. Build, Browser-QA, Lighthouse Mobile und Search-Preview pruefen.

## Entscheidung

Die produktive Public Website sollte auf **Next.js App Router mit SSG/SSR** migriert werden. Vite bleibt kurzfristig als funktionierender Stand und fuer Portal/Admin/Design-Lab akzeptabel. Fuer die oeffentlichen saniPEP-Seiten ist Next.js die robustere Basis, weil lokale SEO, Indexierbarkeit, OpenGraph, strukturierte Daten, Strapi-Anbindung und Redirects Kernanforderungen sind und nicht dauerhaft ueber eine SPA-Prerender-Sonderloesung getragen werden sollten.
