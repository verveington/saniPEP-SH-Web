# Staff Admin MVP Abnahme

Stand: 2026-06-21

## Gepruefter Workflow

- Staff Login ueber `/api/staff/auth/login`
- Session-Reload ueber `/api/staff/session`
- Request-Liste mit Statusfilter `all`, `new`, `in_review`, `waiting_for_customer`, `completed`, `cancelled`
- Request-Details mit Kontakt, Request-Typ, Schutzklasse, Staff-Status, Public-Request-Metadaten und Audit
- Statuswechsel ueber serverseitigen Staff-Endpunkt mit CSRF
- Logout ueber `/api/auth/logout` und anschliessender Session-Check
- Leere Liste bei Filter ohne Treffer
- Lade-/Fehlerzustand bei Session-, Listen-, Detail- und Statusfehlern
- Tablet/Desktop-Lesbarkeit der zweispaltigen Workbench
- Staff Admin Nginx-Header: `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Cache-Control: no-store`

## Testdaten-Szenarien

Der zusaetzliche Check `npm run check:staff-admin:mvp` erzeugt nur temporaere, synthetische Testdaten in einem lokalen Store unter `/tmp`:

| Szenario | Request-Typ | Zielstatus | Besonderheit |
| --- | --- | --- | --- |
| Termin-Anfrage | appointment | `new` | neuer ungelesener Public Request |
| Kontakt-Anfrage | contact | `in_review` | interne Sichtung aktiv |
| Pflege-/Versorgungs-Anfrage | care | `waiting_for_customer` | Rueckfrage offen |
| Dokument-/Rezept-Metadaten | document | `completed` | keine Datei, kein Dateiname, kein Upload-Objekt |
| Kontakt-Abbruch | contact | `cancelled` | abgebrochener Vorgang |

Alle Testdaten nutzen `.example.test`-Adressen und frei erfundene Namen. Es werden keine echten Kundendaten, keine echten Gesundheitsdaten, keine Dateinamen und keine Upload-Objekte erzeugt.

## Sicherheitspruefung

- Staff-Endpunkte ohne Session geben `401`.
- Customer-Rolle auf Staff-Liste gibt `403`.
- Falsches Staff-Passwort gibt `401`.
- Ungueltiger CSRF-Token bei Statuswechsel gibt `403`.
- Logout setzt das Session-Cookie auf abgelaufen.
- Session nach Logout gibt `401`.
- Staff-Cookie ist `HttpOnly` und `SameSite=Strict`.
- Staff UI haelt CSRF nur im React-State und nutzt keine Browser-Persistenz fuer sensible Daten.
- Production-Env blockiert `PORTAL_DEV_STAFF_*`.
- Public Document Requests bleiben `metadata-only-no-file-transfer`.
- `fileUploadIncluded=false`, `omniaWriteAllowed=false`, `staffReviewRequired=true`.
- `uploadObjectsCreated=0` bleibt Pflicht.

## Gerenderter Smoke-Test

Am 2026-06-21 wurde ein lokaler Playwright-Smoke gegen synthetische Testdaten ausgefuehrt:

- Backend lokal auf `http://127.0.0.1:4101`
- Staff Admin lokal auf `http://127.0.0.1:5190`
- Staff Login mit synthetischem `.example.test`-Account
- Request-Liste, Request-Details, Dokument-/Rezept-Hinweis und Statuswechsel geprueft
- Desktop-Breite und Tablet-Breite gerendert
- `localStorage`, `sessionStorage` und `indexedDB` nach Login leer
- erwarteter Session-Check ohne Login: `401`

Fuer lokale Browser-Smokes muss der Staff Admin mit der tatsaechlichen Backend-URL gebaut oder gestartet werden, z. B. `VITE_PORTAL_BACKEND_URL=http://127.0.0.1:4101`. Ein Dev-Proxy ist nur eine Komfortschicht und ersetzt nicht den Nachweis, dass die gebaute Staff-Admin-URL zur Backend-Origin passt.

## Staff Admin Go/No-Go

| Bereich | Entscheidung | Begruendung |
| --- | --- | --- |
| Staff Admin interner MVP-Test | Go | Login, Session, Liste, Filter, Details, Statuswechsel und Audit sind fuer interne Abnahme pruefbar. |
| Produktiver Staff-Betrieb | No-Go | Finales IAM/RBAC, Nutzer-Lifecycle, MFA/SSO-Entscheidung, Prozessrechte und Betriebsfreigabe fehlen. |
| Uploads | No-Go | Kein Storage, keine Quarantaene, kein AV, keine Clean-Bucket-Pipeline, keine Retention. |
| Kundenportal | No-Go | Kein freigeschalteter Kunden-Self-Service, keine finale Kundenidentitaet, keine Portal-Betriebsprozesse. |
| Omnia Writes | No-Go | `OMNIA_WRITE_MODE` bleibt `read_only`; keine Schreibintegration im MVP. |

## Bekannte Einschraenkungen

- Audit ist MVP-Datenbank-Audit, nicht WORM/SIEM.
- JSONB bleibt Uebergang fuer Staff-Abnahme und muss vor breiterem Betrieb relational gehaertet werden.
- Statusmodell ist fachlich minimal und braucht Prozessabnahme mit echten Mitarbeiterrollen.
- Es gibt noch keine produktive IAM/RBAC-Anbindung, kein On-/Offboarding und keine MFA.
- Dokument-/Rezept-Requests enthalten nur Metadaten; echte Dateiuebertragung bleibt gesperrt.
- Interne IP-/LAN-Tests sind kein Ersatz fuer echtes HTTPS-Staging mit eigenen Domains.
- Staff Admin muss nach Aenderungen an `VITE_PORTAL_BACKEND_URL` neu gebaut werden; sonst zeigen Browser-Smokes auf eine veraltete Backend-Origin.

## Was Vor Produktivem IAM/RBAC Fehlt

- Rollenmatrix fuer Staff, Admin, Filiale, Fachbereich und Support.
- Benutzer-Lifecycle mit Anlage, Deaktivierung, Rollenwechsel und Audit.
- MFA/SSO-Entscheidung und Session-Policy.
- Rechtepruefung pro Statuswechsel und Request-Typ.
- Nachweis, dass Staff-URLs nur hinter serverseitiger Auth erreichbar sind.

## Was Vor Uploads Fehlt

- Quarantaene-Bucket und Clean-Bucket.
- MIME-Sniffing am Server.
- AV-Scan mit Timeout, Retry und Audit.
- KMS/Verschluesselung.
- Zugriffskontrolle und signierte URLs.
- Retention, Loeschkonzept und Incident-Prozess.

## Was Vor Portal Fehlt

- Kundenidentitaet, Aktivierung, Passwort-Reset und Supportprozess.
- Kunden-Self-Service-Scope fuer Bestellungen, Versorgungen, Rezepte und Dokumente.
- Omnia-Read-Snapshots und Konfliktmodell.
- Datenschutz-/Einwilligungs-Texte fuer Portalbetrieb.
- Produktive Betriebs- und Supportabnahme.

## Naechste Fachliche Testschritte

1. Mitarbeiter pruefen alle fuenf Status-Szenarien mit synthetischen Testdaten.
2. Fachlich bewerten, ob Request-Typ, naechster Schritt und Status eindeutig sind.
3. Dokument-/Rezept-Hinweis gegenlesen: keine Datei, keine Dateiuebertragung, nur Metadaten.
4. Statuswechsel mit Audit pruefen und fachlich erlaubte Uebergaenge bestaetigen.
5. Fehlerfaelle testen: abgelaufene Session, falsche Rolle, falscher CSRF, fehlender Request.
6. Rollen-/Prozessmatrix fuer produktives IAM/RBAC separat freigeben.
