# Portal-Auth und Upload-Backend: produktionsnahes Konzept

Dieses Dokument definiert die Zielarchitektur fuer Kundenportal-Auth, Request-basierte Portalaktionen, Upload-Backend und Omnia-Grenze.
Strapi bleibt ausschliesslich CMS fuer redaktionelle Inhalte. Rezeptdateien, Gesundheitsdaten, Portalstatus und Omnia-Daten duerfen nicht in Strapi gespeichert werden.

## Architekturprinzipien

- Omnia bleibt fuehrendes System fuer Stammdaten, Dauerrezepte, Dauerversorgungen, Bestellungen und finale Status.
- Das Portal arbeitet request-based: Kunden loesen nur pruefbare Anfragen aus.
- Jede fachliche Aenderung braucht Mitarbeiterpruefung vor Omnia-Vorbereitung.
- Kunden duerfen keine finalen Omnia-Schreibaktionen ausloesen.
- Das Frontend speichert keine sensiblen Inhalte, Dateien, Tokens oder Gesundheitsdaten dauerhaft.
- Uploads gehen ausschliesslich an ein separates Upload-Backend mit Quarantaene und AV-Scan.
- Audit-Logs protokollieren Aktionen, aber keine Freitexte, Dateiinhalte oder Diagnosen.

## Technisches Grundgeruest

Serverseitige Vertrage liegen unter `apps/shared/backend`:

- `portalAuth.ts`: Einmalpasswort, Passwort setzen, Passwort-Login, Rollenpruefung.
- `uploadBackend.ts`: Upload-ID, Dateigroesse, MIME-Signatur, Quarantaene, AV-Scanner-Interface, Audit.
- `portalRequests.ts`: Request-Envelopes fuer Portalaktionen.
- `omniaBoundary.ts`: Read-mostly Omnia-Adapter und Mitarbeiter-gepruefte Vorbereitung.
- `auditLog.ts`: Audit-Event-Schema.
- `.env.example`: benoetigte ENV-Variablen ohne echte Secrets.

Die Dateien sind bewusst framework-neutral. Produktive Implementierungen muessen DB, Object Storage, AV-Scanner, Session-Signing und Omnia-API als Adapter anschliessen.

## Auth-Datenfluss

1. Mitarbeiter erzeugt einen Portalzugang fuer einen bestehenden Kunden in Omnia/Backend.
2. Backend generiert ein Einmalpasswort, speichert nur Hash und Ablaufdatum.
3. Einmalpasswort wird per Brief oder persoenlichem Handout uebergeben.
4. Kunde aktiviert das Portal mit E-Mail, Einmalpasswort und neuem Passwort.
5. Backend verbraucht das Einmalpasswort und speichert nur den Passwort-Hash.
6. Backend erstellt eine serverseitige Session mit sicherem HttpOnly-Cookie.
7. Spaeter optional: Magic Link als zusaetzlicher Login-Kanal, nicht als MVP-Pflicht.

Rollen:

- `customer`: sieht eigene sichere Statuszusammenfassungen und erstellt Requests.
- `staff`: prueft Requests und bereitet Omnia-Aenderungen vor.
- `admin`: verwaltet Backend-Konfiguration und Rollen, aber loest ebenfalls keine Kunden-Direktschreibungen aus.

## Upload-Datenfluss

1. Frontend fragt Upload-Session oder reicht Upload an die sichere Upload-API weiter.
2. Backend authentifiziert Session oder Public-Upload-Kontext und prueft Consent-Version und Scopes.
3. Backend prueft Groesse vor Streaming.
4. Backend liest Dateisignatur und erkennt MIME serverseitig.
5. Backend lehnt ungueltige Datei ab, bevor sie in Mitarbeiterqueues erscheint.
6. Backend schreibt akzeptierte Datei in einen Quarantaene-Bucket mit unguessable Upload-ID.
7. Backend startet AV-Scan.
8. Nur `clean`-Ergebnis erzeugt einen Portal-Request fuer Mitarbeiterpruefung.
9. Mitarbeiter sieht sichere Metadaten und oeffnet Datei nur aus geschuetztem Backend-Kontext.
10. Nach Pruefung wird eine Omnia-Vorbereitung erstellt; finale Omnia-Aenderung bleibt menschlich kontrolliert.

Upload-Sicherheitsanforderungen:

- Upload-ID per UUID/cryptografischer Zufall.
- Maximalgroesse serverseitig, aktuell 20 MB.
- Allowlist: PDF, JPG, PNG, HEIC/HEIF.
- MIME-Sniffing anhand Magic Bytes, nicht nur Browser-MIME.
- Quarantaene-Bucket vor jedem Review.
- AV-Scan vor Mitarbeiterfreigabe.
- SHA-256 pro Objekt fuer Audit und Integritaet.
- Keine Dateinamen oder Gesundheitsdetails in Analytics.

## Portal-Requests

Modellierte Request-Arten:

- `prescription-upload`: Rezept-/Dokumentupload mit Quarantaene und Scan.
- `reorder-request`: Bestellanfrage fuer bestehende Versorgung.
- `subscription-change-request`: Abo- oder Rhythmuswunsch.
- `appointment-request`: Terminwunsch, keine feste Buchung.
- `health-contact-request`: Kontaktanfrage mit moeglichen Gesundheitsdaten.

Alle Request-Envelopes setzen:

- `staffReviewRequired: true`
- `omniaWriteAllowed: false`
- sichere Kurzbeschreibung statt Freitextdetails
- Audit-IDs statt sensibler Payload im Frontend

## Omnia-Grenze

Omnia-Adapter-Modus:

- read-mostly fuer Portalstatus
- sichere Status-Snapshots ohne Detaildiagnosen
- keine finalen Kundenwrites
- keine direkte Dauerversorgungs- oder Stammdaten-Aenderung
- nur Mitarbeiter-gepruefte Vorbereitung
- finale Aenderung bleibt in Omnia oder kontrollierter Staff-Backend-Schicht

Bei Omnia-Ausfall:

- Portal zeigt letzten sicheren Status oder Wartungshinweis.
- Neue Requests koennen weiter angenommen werden, wenn Upload-/Request-Backend verfuegbar ist.
- Keine lokale "Ersatzwahrheit" fuer Omnia-Daten erzeugen.

## DSGVO-Risiken

- Gesundheitsdaten sind besondere Kategorien personenbezogener Daten; Verarbeitung braucht klare Rechtsgrundlage, Einwilligung und Zweckbindung.
- Einmalpasswort per Brief/Handout braucht Identitaetsprozess und Missbrauchsbehandlung.
- Uploads brauchen AV-Scan, Quarantaene, Zugriffskontrolle, Loeschkonzept und Protokollierung.
- Audit-Logs duerfen keine Diagnosen, Freitexte oder Dateiinhalte enthalten.
- Backups, Retention, Betroffenenrechte, Auskunft und Loeschung muessen vor Produktion definiert werden.
- Mitarbeiterzugriffe brauchen Rollen, Protokollierung und Schulung.
- Magic Link spaeter nur mit Rate Limit, kurzer Gueltigkeit und Anti-Enumeration.

## ENV-Variablen

Beispielwerte liegen in `apps/shared/backend/.env.example`.

Wichtige Gruppen:

- Portal-Session: Cookie-Name, TTL, OTP-TTL.
- Secrets: OTP-Hash-Secret, Passwort-Pepper, Audit-Hash-Secret.
- Upload: Maximalgroesse, MIME-Allowlist, Quarantaene-Bucket, Clean-Bucket, KMS-Key, AV-Modus.
- Persistence: Portal-Datenbank, Audit-Retention.
- Omnia: API-Base-URL, Client-ID, Client-Secret, Write-Mode.

Produktive Secrets muessen aus Secret Store, Vercel Env, Vault oder vergleichbarer Infrastruktur kommen. Keine produktiven Secrets committen.

## Was Mock ist

- `apps/portal` bleibt Development-Mock.
- `apps/frontend/src/lib/authAdapter.ts` ist nur Demo-Auth.
- `apps/frontend/src/lib/omniaAdapter.ts` erzeugt Mock-Requests und Mock-Audit.
- `apps/shared/backend/MemoryAuditLogSink` ist nur Test-/Demo-Sink.
- Upload-Storage, AV-Scan, DB, Session-Signing und Omnia-Transport sind Interfaces, keine Produktion.

## Was produktiv noch fehlt

- Datenbankschema und Migrationen fuer Kunden, Credentials, Sessions, Requests, Upload-Metadaten und Audit.
- Passwort-Hasher mit Argon2id oder bcrypt inklusive Pepper-Konzept.
- HttpOnly/SameSite/Secure Session-Cookies und CSRF-Schutz.
- Rate Limits fuer OTP, Login, Magic Link und Upload.
- Object Storage mit KMS, Quarantaene/Clean-Trennung und Lifecycle-Regeln.
- AV-Scanner-Integration und Fehler-/Retry-Strategie.
- Staff-Review-UI mit Rollenpruefung und Audit.
- Omnia-API-Vertrag, Feldmapping, Konfliktlogik und manuelle Freigabeprozesse.
- Datenschutzfolgenabschaetzung, TOMs, AV-Vertraege und finales Loeschkonzept.
- Monitoring, Alerting, Security-Headers und Incident-Prozess.
