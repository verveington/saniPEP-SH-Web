# Staging-Abnahme: Public Requests + Staff Admin MVP

Stand: 2026-06-21

## Ergebnis

Der aktuelle Staging-Stand ist fuer den abgegrenzten MVP einsatzbereit.

| Bereich | Entscheidung | Begruendung |
| --- | --- | --- |
| Public Requests Staging | Go | Staging-Stack lief healthy, Migrationen und Public-Request-Pruefungen liefen gruen. |
| Staff Admin interner MVP-Test | Go | Staff-Admin-Service lief healthy und die Request-/Audit-Daten sind ueber die Backend-Pruefungen vorhanden. |
| Uploads | No-Go | Uploads sind nicht aktiviert; es wurden keine Upload-Objekte erzeugt. |
| Kundenportal | No-Go | Portal ist nicht aktiviert und nicht Teil dieser Abnahme. |

Diese Abnahme gilt nur fuer den Staging-MVP mit oeffentlichen Anfragen und internem Staff Admin. Sie ist keine Produktionsfreigabe fuer Uploads, Kundenportal, CMS oder Omnia-Schreibzugriffe.

Hinweis zum aktuellen Staging-Weg: Die frueher diskutierten `*.example-sanitaetshaus.de` Domains sind Platzhalter und gehoeren uns nicht. Sie duerfen nicht als echte Public-Staging-Domains verwendet werden. Fuer echte Public-Staging-Freigabe braucht es eigene Domains, DNS und HTTPS/TLS. Der aktuelle Testweg ist internes IP-/LAN-Staging ueber `10.0.60.13`; Staff Admin muss mit der dazu passenden `VITE_PORTAL_BACKEND_URL` neu gebaut werden.

## Referenzstand

- Repository: `/home/staff-1/saniPEP-SH-Web`
- Aktueller Commit auf `main`: `9af29ae Stop tracking staging environment file`
- Vorheriger Staging-Handoff-Commit: `c0109cc Prepare staging deployment for public requests staff admin MVP`
- `.env.staging` ist nicht mehr in Git getrackt.
- `.env.staging.example` bleibt getrackt.
- Vor Erstellung dieses Abnahmeberichts war der Working Tree clean.
- Secrets werden in diesem Bericht nicht dokumentiert.

## Abnahmeumfang

In Scope:

- Public Website mit Public-Request-Flows
- Backend mit Postgres-Repository
- Backend-Migrationen
- Redis als Infrastruktur-Service
- Staff Admin als interner MVP-Test
- Audit-Events im MVP-Umfang

Out of Scope:

- Upload-Aktivierung
- Upload-Quarantaene, AV-Pruefung, Storage-Architektur und Retention
- Kundenportal und Portal-Self-Service
- CMS
- Omnia-Schreibzugriffe
- finales IAM/RBAC
- WORM-/SIEM-faehiges Audit

## Deployment-Nachweis

Der Staging-Stack wurde real mit Docker Compose gestartet. Folgende Services liefen healthy:

- `postgres`
- `redis`
- `backend`
- `staff-admin`
- `web`

Der One-Shot-Service `backend-migrate` lief erfolgreich. Der temporaer veroeffentlichte Postgres-Port wurde nach der Pruefung wieder geschlossen. Im Normalbetrieb ist Postgres nur intern als `5432/tcp` sichtbar.

Aktive Betriebsgrenzen:

- Uploads sind nicht aktiviert.
- Portal ist nicht aktiviert.
- CMS ist nicht Teil des Staging-MVP.
- `OMNIA_WRITE_MODE` bleibt `read_only`.
- Die oeffentliche Website zeigt fuer `/portal/login` nur einen noindex Portal-Hinweis; es wird kein Kundenportal aktiviert.

## Validierung

| Pruefung | Ergebnis | Nachweis |
| --- | --- | --- |
| `backend-migrate` | Gruen | One-Shot-Migration lief erfolgreich. |
| `npm run db:migrate` | Gruen | Zweimal erfolgreich ausgefuehrt. |
| Idempotenz Migrationen | Gruen | Zweiter Lauf uebersprang bestehende Migrationen. |
| `npm run check:backend:migrations` | Gruen | Backend-Migrationscheck erfolgreich. |
| `npm run check:public-requests:postgres` | Gruen | Postgres-basierter Public-Request-Check erfolgreich. |
| `npm run check:public-requests` | Gruen | Voller Public-Request-Check erfolgreich. |

Messwerte aus `npm run check:public-requests:postgres`:

- migrations applied: 3
- requests: 4
- auditEvents: 9
- staffListItems: 4
- uploadObjectsCreated: 0

Messwerte aus `npm run check:public-requests`:

- requests: 4
- auditEvents: 13
- staffListItems: 4
- uploadObjectsCreated: 0

Die Upload-Grenze wurde in beiden Checks eingehalten: `uploadObjectsCreated` blieb `0`.

## Risiken und offene Punkte

- Finales IAM/RBAC fehlt. Der Staff Admin ist fuer interne MVP-Tests freigegeben, aber noch nicht als finaler produktiver Rollen- und Rechteverbund abgenommen.
- Upload-Architektur fehlt. Vor einer Upload-Freigabe braucht es Storage, Quarantaene, MIME-/AV-Pruefung, Retention, Monitoring und neue Abnahme.
- Portal-Self-Service fehlt. Das Kundenportal bleibt ausserhalb des MVP und darf ohne eigene Freigabe nicht aktiviert werden.
- Secret-Rotation ist noetig, falls echte Secrets jemals committed waren. Die aktuelle Git-Grenze ist sauberer, ersetzt aber keine Rotation bei frueherer Offenlegung.
- Audit ist MVP, nicht WORM/SIEM. Fuer hoehere Nachweis- und Compliance-Anforderungen braucht es eine haertere Audit-Zielarchitektur.
- JSONB bleibt Uebergang. Die aktuelle Datenform ist fuer den MVP tragfaehig, sollte aber vor groesserer operativer Nutzung in stabilere Datenmodelle ueberfuehrt werden.

## Abnahmeentscheidung

Public Requests Staging und Staff Admin interner MVP-Test koennen auf Basis dieses Standes weiter genutzt und intern vorgefuehrt werden.

Uploads, Kundenportal, CMS und Omnia-Schreibzugriffe bleiben gesperrt. Jede Erweiterung dieser Grenzen benoetigt eine separate technische Umsetzung, Sicherheitspruefung und Abnahme.
