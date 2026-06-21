# Projekt-Review: Produktionsstatus, UI/UX und Roadmap

Stand: 2026-06-21  
Repository: `/home/staff-1/saniPEP-SH-Web`  
Review-Modus: unabhängige technische, UX-, Produkt-, Security-/DSGVO- und Ops-Einschätzung. Keine Codeänderungen außer diesem Bericht.

## Executive Summary

Das Projekt hat einen belastbaren Staging-MVP-Kern für Public Requests und Staff Admin: Backend-Migrationen, Public-Request-Gates, Staff-Session/CSRF, Postgres-MVP-Repository, No-Upload-Boundaries und interne Staff-Smokes sind grün. Für einen kontrollierten internen MVP-Test ist der Stand brauchbar.

Für echten Produktivbetrieb mit Gesundheitsdaten ist das Gesamtprojekt noch nicht Go. Die größten Blocker sind nicht der Build, sondern Betriebs- und Produktreife: finale Legal-/Datenschutztexte fehlen, echtes IAM/RBAC fehlt, Upload-Architektur ist nicht produktionsfähig, das Kundenportal ist Demo/MVP und nicht livefähig, Audit ist nicht WORM/SIEM, Retention/Löschung/Backup/Incident-Prozesse fehlen, und öffentliches Staging braucht eigene Domains mit HTTPS. Zusätzlich verlinkt die Public Website aktuell auf `/portal/login`, obwohl die Next-Public-Site keine Portal-Login-Route baut; Playwright bestätigte dort `404`.

## Produktionsstatus

| Bereich | Status | Begründung | Go/No-Go | Nächster konkreter Fix | Aufwand |
|---|---|---|---|---|---|
| Public Website | gelb | Next-Build grün, IA/CTAs grundsätzlich vorhanden, aber Legal-Platzhalter, Portal-CTA auf 404 und Content-Tiefe fehlen. | Pilot: Go mit Einschränkungen; Produktion: No-Go | Portal-CTA entfernen/deaktivieren oder gültige noindex-Seite bauen; Legal finalisieren. | M |
| Public Requests | gelb | Checks grün, serverseitige IDs, Audit, Staff-Review, keine UploadObjects, keine Omnia-Writes. Freitext/Health-Daten brauchen Legal/Ops. | Staging: Go; Produktion: No-Go | Retention, DSFA, Einwilligung, Löschprozess und Staff-Betrieb festlegen. | M |
| Staff Admin | gelb | Login, Session, CSRF, Liste/Details/Statuswechsel und noindex sind MVP-fähig. Finales IAM/RBAC fehlt. | Intern: Go; Produktion: No-Go | Rollenmodell, Nutzer-Lifecycle, Rechteprüfung und Prozessabnahme ergänzen. | M |
| Backend | gelb | Migration Runner, Checksums, Advisory Lock, Schema-Gate, Postgres-Repository und Production-Env-Guards sind gut. JSONB bleibt Übergang. | Staging-MVP: Go; Produktion: eingeschränkt | Relationale Kernmodelle, Datenintegritätschecks, Redis/Rate-Limit/Ops absichern. | L |
| Staging/Deployment | gelb | Compose-Config rendert, Staging-Handoff bekannt grün. Aktuell keine echten Staging-Domains/HTTPS validiert. | Intern/IP: Go; öffentlich: No-Go | Eigene Domains, HTTPS, DNS, Proxy-Smoke und Runbook finalisieren. | M |
| Uploads | rot | Upload-Service/Policy sind vorbereitet, aber keine produktive Storage-, Quarantäne-, AV-, Clean-Bucket- und Retention-Pipeline aktiv. | No-Go | Upload-Architektur dokumentieren und freigeben, vor Implementierung. | L |
| Kundenportal | rot | `apps/portal` ist Backend-MVP/Demo mit Dev-Credentials und nicht Teil des Staging-MVP. Public Site verlinkt ins Leere. | No-Go | Portal-MVP-Design mit echter Auth, Self-Service und Betriebsgrenzen. | L |
| CMS/Strapi | gelb | Content Types, Build und Prod-Guards existieren. Staging-Einbindung, RBAC, Public Permissions, Preview, Backup nicht abgenommen. | Späterer Staging-Kandidat; nicht aktuelles MVP | CMS-Permissions/Preview/Seed/Backup abnehmen. | M |
| Omnia-Integration | gelb/rot | Read-mostly Boundary vorbereitet, `OMNIA_WRITE_MODE=read_only`; keine Writes im MVP-Pfad. | Lesen: Design-Go; Schreiben: No-Go | Read-Adapter designen; Writes erst nach Staff-Approval, Audit und Omnia-Freigabe. | L |
| Security/DSGVO/Ops | rot | Technische Guards sind gut, aber Gesundheitsdatenbetrieb braucht finale Legal-Texte, TOMs, DSFA, AVV, Retention, Backup/Restore, Incident. | Produktion: No-Go | Datenschutz-/Ops-Paket vor öffentlichem Go-Live abschließen. | L |
| UI/UX | gelb | Website und Staff Admin sind klar und mobil nutzbar. Portal-CTA 404, Hero zu abstrakt, Fachcontent dünn. | Pilot: Go mit Fixes; Produktion: gelb | Portal-CTA korrigieren, echte Medien/Fachseiten, Staff-Testdaten-UX. | M |
| SEO/Content | gelb | Metadata, Canonicals, OG, Structured Data vorhanden. Keine Next-robots/sitemap gefunden; Legal/Service-Texte teils Platzhalter/dünn. | No-Go für SEO-Go-Live | Sitemap/robots, finale Fachinhalte, lokale SEO-Seiten. | M |
| QA/Testing | gelb | Script-Gates und Builds grün, Playwright-Smoke möglich. Keine vollständige E2E-/a11y-/Lighthouse-Suite. | MVP-Go | E2E-Matrix, a11y, Cross-Browser, realistische Staff-Daten. | M |
| Monitoring/Backup | rot | Keine belastbare Runtime-Abnahme für Monitoring, Backups, Restore, Alerting, SIEM/WORM. | No-Go | Backup/Restore-Probe, Logging/Monitoring/Incident-Runbook. | M |

## Go/No-Go

| Scope | Entscheidung | Begründung |
|---|---|---|
| Public Requests Staging | Go | `check:public-requests` grün, `uploadObjectsCreated: 0`, Staff-Review und Omnia-No-Write-Grenzen intakt. |
| Staff Admin interner MVP-Test | Go | Login/Session/CSRF/Proxy-Smoke funktionierten lokal; Nginx noindex/security headers vorhanden. |
| Internes Staging über IP | Go mit Dokumentation | Für LAN/VPN-Test akzeptabel, wenn klar als HTTP-Development-/Internal-Mode markiert. |
| Öffentliches Staging über Domain/HTTPS | No-Go bis eigene Domains/HTTPS | `.invalid`/Platzhalter-Domains sind korrekt als Platzhalter, dürfen aber nicht öffentlich genutzt werden. |
| Public Website Produktion | No-Go | Legal-Platzhalter, Portal-CTA 404, fehlende SEO-/Content-Finalisierung. |
| Uploads | No-Go | Keine produktive Dateiübertragung, keine Quarantäne-/AV-/Clean-Pipeline. |
| Kundenportal | No-Go | Demo/MVP, keine finale Auth/Self-Service-Betriebsarchitektur. |
| CMS/Strapi Produktion | No-Go | Buildfähig, aber RBAC/Public-Permissions/Preview/Backup/Staging-Abnahme fehlen. |
| Omnia-Leseintegration | Design-Go, nicht Live-Go | Boundary vorbereitet, Adapter nicht produktiv validiert. |
| Omnia-Schreibintegration | No-Go | `OMNIA_WRITE_MODE=read_only`; Writes zuletzt und nur nach separater Freigabe. |

## Architekturstand

Produktionsnah:

- `apps/web`: Next.js Public Website mit statischen Routen, Metadata, Canonicals, OpenGraph, JSON-LD, CMS-Fallback und Public-Request-Formularen.
- `apps/backend`: HTTP-Backend mit Production-Env-Guards, Session-Cookies, CSRF, Role Checks, Postgres-Repository, Migration Runner, Health/Ready Endpoints.
- `compose.yaml` und `compose.staging.yaml`: Compose-Stack mit Postgres, Redis, Backend, Web, Staff Admin und optionalem Caddy-Staging-Proxy.
- `scripts/check-*`: sinnvolle Guardrails für Architektur, Flows, Responsive, Migrationen und Public Requests.

MVP/Übergang:

- `portal_mvp_*` Tabellen speichern JSONB-Daten als Übergang.
- `apps/admin`: intern testbarer Staff-Admin-MVP, noch kein finales IAM/RBAC.
- `apps/portal`: Portal-Demo/MVP, nicht als Kundenbereich livefähig.
- `apps/cms`: Strapi ist modelliert und buildfähig, aber nicht aktueller Staging-MVP.
- `apps/frontend`: Vite-Public-App ist zweite/ältere Public-Oberfläche neben `apps/web` und damit Drift-Risiko.

Gefährlich bei versehentlichem Livegang:

- Portal-CTA auf der Public Website führt in Next zu `404`.
- Legal-Seiten zeigen Platzhalter.
- Upload-UI kann Dateiauswahl suggerieren; aktuell ist sie zwar metadata-only, darf aber nicht als echter Upload verstanden werden.
- `apps/portal` mit Dev-/Mock-Sprache und Development-Seed-Konzept darf nicht öffentlich laufen.
- CMS-Media/Uploads sind redaktionell, nicht als Patienten-/Rezeptupload zu verwenden.

## UI/UX Review

Playwright wurde regulär genutzt; ein Browser-Plugin war nicht verfügbar. Screenshots liegen außerhalb des Repos unter `/tmp/sanipep-project-review/`.

Beobachtungen:

- Desktop-Homepage: klare Navigation, große Hero-Botschaft, sichtbare CTAs, gute Kontakt-Signale.
- Mobile Homepage: gut lesbar, Touch-Ziele wirken ausreichend, CTAs stapeln sauber.
- Rezept-Seite mobil: sehr klare Kommunikation, dass keine Datei übertragen wird; Einwilligung startet nicht vorausgewählt.
- Staff Admin: ruhig, scannbar, gute KPI-/Filter-Struktur; leere Liste ist verständlich.
- Problem: „Kundenportal Login“ ist prominent, aber `/portal/login` liefert in der Next-Site `404`.
- Problem: Hero-Visual ist stark stilisiert; für Sanitätshaus/Patientenvertrauen wären echte Produkt-, Standort- oder Teammedien besser.
- Problem: Fachseiten sind eher Einstiegs-/CTA-Seiten als belastbare fachliche Ratgeberseiten für ältere Patientinnen/Patienten.

## Public Website Review

Stärken:

- Gute Grund-IA: Start, Hilfe finden, Kompression, Brustprothetik, Bandagen/Orthesen/Reha/Stoma, Inkontinenz/Pflege, Rezept, Termin, Kontakt, Legal.
- CTAs sind sichtbar: Termin, Rezept vorab, Kontakt.
- Zielgruppen sind grundsätzlich adressiert: Lymphödem/Lipödem, Brustprothetik, Inkontinenz/Pflegehilfsmittel, Bandagen/Orthesen/Reha/Stoma.
- SEO-Bausteine: Metadata, Canonicals, OG, Twitter, JSON-LD LocalBusiness/WebPage/Breadcrumb/Service.
- Mobile Darstellung ist im Smoke gut nutzbar.

Lücken:

- Keine `robots.ts`/`sitemap.ts` in `apps/web/app` gefunden.
- Legal-Seiten sind Platzhalter.
- Portal-CTA führt ins Leere.
- Inhalte sind für echte Go-Live-Fachautorität zu dünn: Versorgungsschritte, Indikationen, Verordnungslogik, Kosten/Kasse, Diskretion, Nachsorge, FAQ und lokale Suchintentionen fehlen oder sind zu knapp.
- WhatsApp/Kontakt muss im Datenschutz- und Gesundheitsdatenkontext klarer getrennt werden.

Bewertung: Pilotfähig nach Portal-CTA/Legal-Hinweis-Korrektur; echter Go-Live erst nach Legal, Content und SEO-Finalisierung.

## Public Requests Review

Geprüfter Stand:

- Request-Erstellung über `/api/public/requests`.
- Serverseitige IDs.
- Startstatus `new` für Staff-Liste.
- `staffReviewRequired=true`.
- `omniaWriteAllowed=false`.
- `fileUploadIncluded=false`.
- Dokument-/Rezeptrequests bleiben `metadata-only-no-file-transfer`.
- Public Requests erzeugen keine `uploadObject` Payloads und keine `upload_objects` Rows im validierten Postgres-Check-Kontext.
- Audit-Events für create/submit und Staff-Statuswechsel vorhanden.
- Staff-Liste, Details und Statuswechsel sind API-seitig geschützt.

Risiken:

- Public-Contact-/Care-/Appointment-Freitexte können Gesundheitsdaten enthalten. Das ist fachlich erwartbar, aber betriebs- und datenschutzrechtlich vor Produktion zu regeln.
- Audit ist MVP-sanitized und gehasht, aber nicht WORM/SIEM.
- Keine final dokumentierte Retention/Löschung/DSFA/AVV/Incident-Kette.

Bewertung: Staging-MVP Go; Produktivbetrieb mit Gesundheitsdaten No-Go bis DSGVO/Ops-Paket steht.

## Staff Admin Review

Stärken:

- Staff Login nutzt `/api/staff/auth/login`.
- Session läuft über HTTP-only Cookie; CSRF-Token bleibt im React-State.
- Staff-Endpoints verlangen Rolle `staff` oder `admin`.
- Staff-Session ohne Login liefert `401`.
- Statusfilter, Liste, Detail, Audit-Anzeige und Statuswechsel sind vorhanden.
- Nginx-Konfiguration setzt `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Cache-Control: no-store`.
- Vite-Proxy für interne Tests funktionierte ohne `Failed to fetch`.

Lücken:

- Kein finales IAM/RBAC, kein Mitarbeiter-Onboarding/-Offboarding, keine MFA-/SSO-Entscheidung.
- Kein differenziertes Rechtekonzept für Admin vs. Staff vs. Read-only.
- Kein Vier-Augen-/Freigabeprozess für sensible Statusentscheidungen.
- Fehlerzustände sind verständlich, aber produktive Betriebsführung braucht klare Support-Codes und Runbooks.

Bewertung: intern testbar; Produktion No-Go bis IAM/RBAC und Prozessmodell final sind.

## Backend Review

Stärken:

- Migration Runner mit `schema_migrations`, Checksums, Advisory Lock, Sequenzprüfung und Startup-Schema-Assertion.
- Production-Env-Guards blockieren HTTP-Origins/Base-URL in `NODE_ENV=production`, File-Repository, kurze/fehlende Secrets, Dev-Users, Stub-AV und fehlende Upload-/Redis-/Postgres-Konfiguration.
- Postgres Repository trennt Repository-Port vom File-Dev-Store.
- Session Handling mit Token Hash, CSRF Hash, idle/absolute expiry, HTTP-only Cookies.
- CSRF prüft Origin und Token bei sessiongebundenen Mutationen.
- Audit-Metadaten werden gegen offensichtliche sensitive Key-Fragmente redigiert.
- Health/Ready Endpoints vorhanden.

Übergänge/Risiken:

- MVP-Repository speichert Kernobjekte als JSONB; für Live-Betrieb sollten zentrale Felder relational, validierbar und auswertbar werden.
- Login-Rate-Limit ist als Interface/Gate geprüft; konkrete Redis-Produktivwirkung muss runtime-validiert werden.
- Ready-Checks für AV/Object Storage sind vorbereitet, aber produktive Abhängigkeiten nicht implementiert/abgenommen.
- Audit-Hash ist kein WORM/SIEM.
- Fehlerantworten sind technisch knapp; für Staff/Ops fehlen Correlation IDs und Monitoring.

Bewertung: gutes produktionsnahes Fundament, aber noch MVP-Datenmodell/Ops.

## Upload Review

Status:

- Uploads sind nicht produktiv aktiv.
- Public Dokumentenfluss ist metadata-only.
- Keine Dateiübertragung im Public Flow.
- Keine Dateinamenpersistenz im Public Request Gate.
- Keine UploadObject-Erstellung im Public Request Gate.
- Object Storage Port ist bewusst unavailable.
- AV-Stub liefert Fehler und darf Dateien nicht freigeben.

Fehlend für produktive Uploads:

- Quarantäne-Bucket.
- MIME-Sniffing serverseitig am Stream.
- AV-Scan mit Timeout/Retry/Signature-Version.
- Clean Bucket und Promotion nach Scan.
- KMS/Verschlüsselung.
- Zugriffskontrolle und signierte URLs.
- Retention/Löschung.
- Audit-Härtung.
- Betriebs-/Incident-Prozess.

Bewertung: No-Go. Positiv ist, dass der aktuelle Dokumentenfluss metadata-only bleibt.

## Portal Review

Status:

- `apps/portal` existiert als Vite-MVP mit Backend-Login, Dashboard, Request-Erstellung, Staff-Workbench und Audit-Anzeige.
- Dev-/Mock-Build ist grün.
- Portal ist nicht Teil des aktuellen Staging-MVP.
- Public Next-App hat keine `/portal/login` Route, obwohl dorthin verlinkt wird.

Fehlend für echtes Portal-MVP:

- Kundenidentität, Aktivierung, MFA/OTP/Passwort-Reset und Account Recovery.
- Kunden-Self-Service mit echten Versorgungen, Bestellungen, Rezepten, Dokumenten.
- Omnia-read-Snapshots statt Demo-/MVP-Requests.
- Klare Berechtigung, Session-Policy und Datenschutztexte.
- Support-, Lösch-, Retention- und Incident-Prozesse.

Bewertung: produktives Portal No-Go. Nächster Schritt ist Architektur-/Produktdesign, nicht Aktivierung.

## CMS/Strapi Review

Status:

- Content Types für Service Pages, SEO, Legal, FAQ, Kontakt, Öffnungszeiten, Hero, Icons usw. vorhanden.
- Production-Guards blockieren SQLite und leere CORS-Origins.
- CMS-Build mit `HOME=/tmp npm run build:cms` grün.
- Compose hat CMS-Profil, aber CMS ist nicht Teil des Public-Request/Staff-Admin-Staging-MVP.

Risiken/Lücken:

- Public Permissions/RBAC nicht live abgenommen.
- Preview/Publishing-Workflow nicht validiert.
- Backup/Restore und Medienstrategie nicht abgenommen.
- Legal-Content ist Platzhalter.
- Strapi Uploads sind redaktionelle Medien, keine Patienten-/Rezeptuploads.

Bewertung: stagingfähig als nächster eigener Track, aber nicht produktionsreif und aktuell nicht priorisiert vor Staging/Legal/Staff-Härtung.

## Omnia Review

Status:

- `OMNIA_WRITE_MODE` bleibt `read_only`.
- Backend Public-/Portal-Request-Pfade setzen `omniaWriteAllowed=false`.
- Shared Boundary modelliert read-mostly und staff-reviewed preparation.
- Keine aktive Omnia-Schreibintegration im MVP-Pfad gefunden.

Bewertung:

- Omnia-Lesen: Design-Go, Implementierung/Abnahme offen.
- Omnia-Schreiben: No-Go. Vor Writes fehlen Mapping, Idempotenz, Konfliktauflösung, Audit, Staff-Freigabe, Fehler-/Rollback-Konzept und Omnia-Fachfreigabe.

## Security/DSGVO/Ops Review

Stärken:

- `.env.staging` ist nicht getrackt; `.env.staging.example` ist getrackt.
- Echte Env-Dateien sind ignoriert; `apps/cms/.env` ist nicht getrackt.
- Backend blockiert Production-HTTP-Origins und Development-Users.
- Cookies: HttpOnly, in Production Secure, Staff SameSite Strict.
- CORS verlangt Trusted Origins.
- Staff Admin noindex.
- Public Request Audits speichern sanitizte Metadaten.

Kritisch vor Betrieb mit Gesundheitsdaten:

- Finale Datenschutz-/Einwilligungs-/Impressumstexte.
- TOMs, DSFA, AV-Verträge und Verzeichnis der Verarbeitungstätigkeiten.
- Retention, Löschung, Auskunft, Export und Sperrung.
- Backup/Restore-Probe.
- Monitoring/Alerting, Incident-Prozess, Log-Policy.
- SIEM/WORM-Entscheidung für Audit.
- Secret-Rotation, falls jemals echte Secrets committed waren.
- Produktions-CORS/HTTPS mit eigenen Domains.

## SEO/Content Review

Vorhanden:

- Metadata pro Route, Canonicals, OG/Twitter, JSON-LD, lokale Kontaktdaten.
- Service-Routen für Kernbereiche.
- CMS-SEO-Modell und Fallback-Seed.

Fehlend:

- Next `robots`/`sitemap`.
- Tiefe Fachinhalte pro Zielgruppe.
- Lokale Suchseiten/FAQs mit echten Patient:innenfragen.
- Final geprüfte Legal- und Consent-Texte.
- Echte Bild-/Medienstrategie.
- Portal-CTA-Korrektur.

## QA/Testing Review

Ausgeführt:

| Check | Ergebnis |
|---|---|
| `git status --short --untracked-files=all` | clean vor Berichtserstellung |
| `git log --oneline --decorate -10` | `main` auf `3517067 (origin/main) Docker und Staging deaktiviert` |
| `git branch -vv` | `main [origin/main]` synchron |
| `git ls-files .env.staging` | keine Ausgabe |
| `git ls-files .env.staging.example` | `.env.staging.example` |
| `npm run check:backend:migrations` | grün |
| `npm run check:backend` | grün |
| `npm run check:public-requests` | grün: `requests: 4`, `auditEvents: 13`, `staffListItems: 4`, `uploadObjectsCreated: 0` |
| `npm run check:architecture` | grün: 13 Routen, 13 CMS Content Types |
| `npm run check:flows` | grün |
| `npm run check:responsive` | grün |
| `npm run build` | grün |
| `npm run build:backend` | grün |
| `npm run build:frontend:vite` | grün |
| `npm run build:portal:mock` | grün |
| `npm run build:admin` | grün |
| `npm run build:admin:mock` | grün |
| `HOME=/tmp npm run build:cms` | grün |
| `npm run compose:staging:config` | grün, daemonfrei gerendert |
| `npm run check:public-requests:postgres` | nicht ausgeführt: `PORTAL_DATABASE_URL` nicht gesetzt, Docker-Socket Zugriff verweigert |

Playwright-Smoke:

- Web Desktop `http://10.0.60.13:3001/`: `200`.
- Web Mobile `http://10.0.60.13:3001/`: `200`.
- Rezept Mobile `http://10.0.60.13:3001/rezept-upload`: `200`.
- Staff Admin `http://10.0.60.13:5185/`: `200`, Login erfolgreich, kein `Failed to fetch`.
- Staff Session ohne Login: `401`.
- Portal-Login in Next Public Site: `http://10.0.60.13:3001/portal/login` -> `404`.
- Console: Next Dev-HMR WebSocket-Warnung über `10.0.60.13`; betrifft Dev-HMR, nicht gerenderte Seite.

Screenshots:

- `/tmp/sanipep-project-review/web-desktop-home.png`
- `/tmp/sanipep-project-review/web-mobile-home.png`
- `/tmp/sanipep-project-review/web-prescription-mobile.png`
- `/tmp/sanipep-project-review/web-portal-login-route.png`
- `/tmp/sanipep-project-review/staff-initial.png`
- `/tmp/sanipep-project-review/staff-after-login.png`

## Findings

| Prio | Bereich | Problem | Auswirkung | Fundstelle | Konkreter Fix | Aufwand |
|---|---|---|---|---|---|---|
| P0 | Portal/Public Website | Public Website verlinkt auf `/portal/login`, Next baut diese Route nicht; Playwright sieht `404`. | Patient:innen landen auf Fehlerseite; Portal wirkt live, obwohl No-Go. | `apps/web/lib/routes/publicRoutes.ts`, `apps/web/components/SiteHeader.tsx`, `apps/web/components/LandingPage.tsx`, Screenshot `web-portal-login-route.png` | Portal-CTA bis Freigabe entfernen/deaktivieren oder noindex-Warteseite mit klarer Aussage bauen. | S |
| P0 | Legal/DSGVO | Impressum, Datenschutz, Einwilligung sind Platzhalter. | Öffentlicher Betrieb mit Gesundheitsdaten rechtlich nicht freigabefähig. | `apps/web/components/LegalPage.tsx`, CMS Legal Content | Finaltexte juristisch/fachlich freigeben und Versionierung dokumentieren. | M |
| P0 | Uploads | Keine produktive Upload-Architektur aktiv. | Dateiübertragung mit Rezept-/Gesundheitsdaten wäre unsicher. | `apps/backend/src/uploads/*`, `apps/backend/src/uploads/objectStorage.ts` | Architekturfreigabe für Quarantäne, AV, Clean Bucket, KMS, Retention, Audit vor Code. | L |
| P0 | Staff Admin/Auth | Finales IAM/RBAC fehlt; MVP nutzt password-session Boundary. | Produktiver Mitarbeiterzugriff nicht ausreichend kontrolliert. | `apps/backend/src/app.ts`, `apps/admin/src/main.tsx` | Rollenmodell, On-/Offboarding, MFA/SSO-Entscheidung, Admin-Rechte und Audit-Freigabe. | M |
| P0 | Security/Ops | TOMs, DSFA, AVV, Retention, Backup/Restore, Incident fehlen als Abnahme. | Gesundheitsdatenbetrieb nicht produktionsfähig. | Repo-weite Ops-Dokumentation fehlt | Datenschutz-/Ops-Runbook und Restore-/Incident-Probe erstellen. | L |
| P1 | Staging/Deployment | Öffentliches Staging hat keine echten validierten Domains/HTTPS; Platzhalter sind `.invalid`. | Externe Freigabe nicht möglich. | `.env.staging.example`, `compose.staging.yaml`, `ops/caddy/staging/Caddyfile` | Eigene Domains, DNS, TLS, CORS, Smoke-Runbook. | M |
| P1 | Public Requests | Freitextfelder können Gesundheitsdaten enthalten. | Erhöht Datenschutz-/Retention-/Zugriffsanforderungen. | `apps/backend/src/app.ts`, Public Forms | Datenminimierung, Retention, Staff-Prozess, Legal Copy und Logging-Policy finalisieren. | M |
| P1 | Backend Datenmodell | `portal_mvp_*` JSONB bleibt Übergang. | Schwächere Integrität, schwierige Auswertung/Retention. | `apps/backend/src/repositories/postgresPortalMvpRepository.ts`, `0003_portal_mvp_repository.sql` | Relationale Tabellen für Kernfelder und Detailtypen ableiten. | L |
| P1 | Audit | Audit ist MVP-Datenbank/Hash, nicht WORM/SIEM. | Manipulations-/Nachweisrisiko bei reguliertem Betrieb. | `apps/backend/src/audit/*` | WORM/SIEM-Entscheidung, Export/Retention, Correlation IDs. | M |
| P1 | CMS/Strapi | RBAC/Public Permissions/Preview/Backup nicht abgenommen. | Redaktionsbetrieb nicht produktionsreif. | `apps/cms/config/*`, `apps/cms/src/api/*` | CMS-Staging-Sprint mit Permissions, Preview, Seed, Backup/Restore. | M |
| P2 | Architektur | Zwei Public Frontends (`apps/web`, `apps/frontend`). | Drift-Risiko bei Content, Routing, Checks und Deployment. | `apps/web`, `apps/frontend` | Deployment-Quelle festlegen; Vite-Public-App archivieren oder klar als Legacy/Mock markieren. | M |
| P2 | SEO | Keine Next `robots`/`sitemap` gefunden. | Indexierungs- und Search-Console-Lücken. | `apps/web/app` | `robots.ts` und `sitemap.ts` passend zur Route-Policy ergänzen. | S |
| P2 | UX/Content | Fachseiten sind eher CTA-Einstiege als fachliche Versorgungshilfen. | Weniger Vertrauen/SEO für ältere Patient:innen und sensible Zielgruppen. | `apps/web/components/ServicePage.tsx`, CMS Seed | Fachcontent, FAQs, Ablauf, Kasse/Rezept, Nachsorge, lokale Suchintentionen. | M |
| P2 | Monitoring | Keine aktuelle Abnahme für Logs, Alerts, Dashboards. | Betriebsfehler werden spät erkannt. | Ops-Dokumentation/Compose | Minimal-Monitoring und Alert-Kriterien definieren. | M |

## Sprintplan

| Sprint | Ziel | Scope | Nicht anfassen | Erfolgskriterien | Risiken |
|---|---|---|---|---|---|
| 1 | Staging Smoke + interne Staff-Abnahme | Aktuelle Staging-Smokes, Staff-Testdaten, Runbook, Portal-CTA-Entscheidung | Keine Uploads, kein Portal, keine Omnia-Writes | Staff Admin ohne Fetch-Fehler, Public Requests grün, 404-CTA behoben/dokumentiert | Testdaten fehlen für echte Staff-UX |
| 2 | Echte Staging-Domains/HTTPS oder internes IP-Staging final dokumentieren | DNS/TLS/Caddy/CORS/Trusted Origins, `.env.staging` lokal-only | Keine Platzhalter-Domains produktiv verwenden | Web/Staff/API über eigene HTTPS-Domains oder bewusst internes IP-Runbook | Domain-/Zertifikatsblocker |
| 3 | Staff Admin Workflow-Härtung | IAM/RBAC-Konzept, Statusrechte, Fehlercodes, Audit-Anzeige, Testdaten | Kein Kundenportal | Rollen-/Prozessabnahme, Statuswechsel mit Audit und CSRF grün | Scope creep Richtung Portal |
| 4 | Public Website Content/SEO/Legal | Legal final, robots/sitemap, Fachseiten, Portal-CTA, echte Medien | Keine Upload-Implementierung | Search-/Legal-Go, keine 404-CTAs, Content-Review bestanden | Juristische Review-Zyklen |
| 5 | Upload-Architektur-Design | Quarantäne, AV, KMS, Clean Bucket, Retention, Zugriff, Audit | Noch kein Upload-Code live | Design-Doc und Datenschutzfreigabe | Sicherheitsanforderungen unterschätzt |
| 6 | CMS/Strapi Production Readiness | RBAC, Public Permissions, Preview, Seed, Backup/Restore | Keine Patientenuploads im CMS | CMS-Staging-Smoke und Redaktionsrollen abgenommen | Media/Permissions falsch exponiert |
| 7 | Portal Auth/Customer MVP Design | Aktivierung, Kundenrollen, Self-Service-Scope, Supportprozesse | Keine Omnia-Writes | Portal-MVP-Spezifikation mit Datenschutzgrenzen | Identitäts-/Supportaufwand |
| 8 | Omnia Read Integration Design | Safe Status Snapshot, Mapping, Fehlerfälle, Caching | Keine Writes | Read-only Adapter-Konzept und Abnahme | Datenmodell-/API-Drift |
| 9 | Upload-Implementierung nach Freigabe | Quarantäne-Flow, AV, Clean-Promotion, Staff-Freigabe | Keine Omnia-Writes | E2E Upload-Quarantäne grün, Security Review | AV/Storage-Betrieb |
| 10 | Omnia Writes zuletzt | Staff-approved preparation, Idempotenz, Konfliktlösung, Audit | Keine direkten Customer-Writes | Fachliche Omnia-Freigabe, Rollback/Replay-Konzept | Höchstes Betriebsrisiko |

## Nächste 10 konkrete Schritte

1. Portal-CTA auf der Public Website bis Portal-Freigabe entfernen/deaktivieren oder eine noindex Warteseite bauen.
2. Finale Legal-Texte für Impressum, Datenschutz und Einwilligung ersetzen und versionieren.
3. Eigene Staging-Domains plus HTTPS einrichten oder internes IP-Staging offiziell als einzige Testfreigabe dokumentieren.
4. Staff Admin mit realistischen Testdaten und Statuswechseln fachlich abnehmen.
5. IAM/RBAC-Konzept für Staff/Admin inklusive Onboarding, Offboarding und MFA/SSO-Entscheidung erstellen.
6. Public-Request-Retention, Löschung, Auskunft und Incident-Prozess dokumentieren.
7. Next `robots`/`sitemap` ergänzen und Search-Console-/SEO-Abnahme vorbereiten.
8. Upload-Architektur als Design-Doc mit Quarantäne/AV/KMS/Clean/Retention/Audit ausarbeiten, ohne Uploads zu aktivieren.
9. CMS-Staging-Track für RBAC, Public Permissions, Preview, Seed und Backup/Restore planen.
10. Omnia Read-Integration designen; Write-Integration bleibt bis nach Upload/Portal/Ops-Härtung gesperrt.

