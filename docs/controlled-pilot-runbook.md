# Controlled Pilot Runbook

Stand: 2026-06-23

## Pilot-Scope

Der kontrollierte Pilot umfasst nur:

- Public Website mit Anfrageformularen
- Public Requests als metadata-only Requests
- Staff Admin fuer interne Sichtung, Statuswechsel und Audit
- Backend mit Postgres Repository, Redis Sessions/Rate Limit und Readiness Checks

Nicht Teil des Pilotbetriebs:

- produktive Dateiuebertragung
- Kundenportal/Self-Service
- CMS als produktive Pflegeoberflaeche
- Omnia-Schreibintegration
- vollstaendige Production-Freigabe fuer Gesundheitsdaten mit Dateiinhalt

## Harte Grenzen

| Bereich | Pilotentscheidung | Technische Grenze |
| --- | --- | --- |
| Uploads | No-Go | `UPLOADS_ENABLED=false`, Public Document Requests bleiben `metadata-only-no-file-transfer`, `uploadObjectsCreated=0` |
| Kundenportal | No-Go | `/portal/login` bleibt noindex-Hinweisseite, kein Self-Service |
| Omnia Writes | No-Go | `OMNIA_WRITE_MODE=read_only`, keine Backend-Schreibpfade |
| Staff Admin | Go intern | Nur hinter Auth/Rolle, Staff-spezifische Session, CSRF, noindex |
| Public Requests | Go Pilot | Staff Review Pflicht, keine Upload-Objekte, keine Dateinamen |

## Repo-Gate Vor Pilotstart

Diese Befehle muessen vor jedem Pilot-Deploy gruen sein:

```bash
npm run check:backend:migrations
npm run check:backend
npm run check:public-requests
npm run check:staff-admin:mvp
npm run check:pilot:readiness
npm run check:architecture
npm run check:flows
npm run check:responsive
npm run build
npm run build:backend
npm run build:frontend:vite
npm run build:admin
```

Falls eine Postgres-Staging-Env erreichbar ist:

```bash
npm run check:pilot:env
npm run db:migrate
npm run db:migrate
npm run check:public-requests:postgres
npm run check:postgres:backup-restore
```

Der zweite Migrationslauf muss idempotent bleiben.

## Env-Gate

Echte Pilot-Env darf keine Beispielwerte enthalten:

- keine `replace-with...` Werte
- keine `.invalid` Hosts
- keine `*.example-sanitaetshaus.de` Platzhalter
- keine echten Secrets im Git
- `.env.staging` bleibt ungetrackt
- `.env.staging.example` und `.env.staging.internal.example` bleiben nur Templates

Erwartete Pilot-Werte:

```dotenv
BACKEND_NODE_ENV=production
PORTAL_REPOSITORY_DRIVER=postgres
UPLOADS_ENABLED=false
OMNIA_WRITE_MODE=read_only
TRUSTED_ORIGINS=https://<owned-web-host>,https://<owned-staff-host>
PORTAL_BACKEND_BASE_URL=https://<owned-api-host>
VITE_PORTAL_BACKEND_URL=https://<owned-api-host>
```

`VITE_PORTAL_BACKEND_URL` wird in das Staff-Admin-Bundle eingebettet. Nach jeder Aenderung muss `staff-admin` neu gebaut werden.

Env-Datei ohne Secret-Ausgabe pruefen:

```bash
PILOT_ENV_FILE=.env.staging npm run check:pilot:env
```

Fuer bewusst internes IP-Staging ueber `10.x` muss die Env zusaetzlich enthalten:

```dotenv
PILOT_INTERNAL_IP_STAGING=true
BACKEND_NODE_ENV=development
```

Das ist kein Production-Relaxing fuer oeffentliche Hosts, sondern nur der dokumentierte LAN/VPN-Pilotmodus.

## Deployment-Gate

1. Eigene Domains/DNS/TLS bereitstellen oder IP-/LAN-Staging ausdruecklich als internen Test kennzeichnen.
2. `.env.staging` aus Secret Store erzeugen, nicht committen.
3. Compose-Konfiguration rendern:

```bash
docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml --profile staff-admin config
```

4. Stack bauen und starten.
5. Migrationen zweimal ausfuehren.
6. Backup/Restore gegen eine Scratch-Datenbank testen:

```bash
export PILOT_RESTORE_DATABASE_URL='postgres://<restore-user>:<secret>@<host>:5432/sanipep_portal_restore'
export PILOT_RESTORE_CONFIRM='restore-to-scratch-db'
npm run check:postgres:backup-restore
```

7. Smoke testen:

```bash
curl -i https://<api-host>/healthz
curl -i https://<api-host>/readyz
curl -i https://<api-host>/api/staff/session
curl -I https://<web-host>/
curl -I https://<staff-host>/
```

Erwartung:

- Web `200`
- Staff Admin `200` mit `X-Robots-Tag: noindex, nofollow`
- Staff Session ohne Login `401`
- `/readyz` `200 ready`
- Upload-Checks in `/readyz` sind `disabled`, solange `UPLOADS_ENABLED=false`

Automatischer Live-Smoke ohne Login-Credentials:

```bash
export PILOT_WEB_URL='https://<web-host>/'
export PILOT_STAFF_URL='https://<staff-host>/'
export PILOT_API_URL='https://<api-host>/'
npm run check:pilot:live
```

Fuer internes IP-Staging:

```bash
export PILOT_WEB_URL='http://10.0.60.13:3000/'
export PILOT_STAFF_URL='http://10.0.60.13:5184/'
export PILOT_API_URL='http://10.0.60.13:4100/'
npm run check:pilot:live
```

## Staff-Zugang Fuer Pilotgruppe

`PORTAL_DEV_STAFF_*` ist in Production verboten. Staff-Zugaenge fuer den kontrollierten Pilot werden gezielt in Postgres provisioniert:

```bash
export PORTAL_STAFF_PROVISION_EMAIL='pilot-staff@example.org'
export PORTAL_STAFF_PROVISION_PASSWORD='<temporary-strong-password>'
export PORTAL_STAFF_PROVISION_DISPLAY_NAME='Pilot Staff'
export PORTAL_STAFF_PROVISION_ROLE='staff'
npm run staff:provision
```

Das Script:

- laeuft nur mit `NODE_ENV=production`
- verlangt `PORTAL_REPOSITORY_DRIVER=postgres`
- schreibt kein Passwort in die Ausgabe
- speichert nur den gepepperten Passwort-Hash im transienten `portal_mvp_users` Repository
- schreibt ein Audit Event `staff-user-provisioned`

Fuer echten Produktivbetrieb ersetzt das kein finales IAM/RBAC. Es ist nur ein kontrollierter Pilotpfad, bis SSO/MFA, On-/Offboarding und Rollenmatrix freigegeben sind.

## Betriebs-Gate

Vor Pilotstart muessen ausserhalb des Repos bestaetigt sein:

- verantwortliche Pilotgruppe und Supportfenster
- Rollen-/Rechtematrix fuer Staff/Admin
- Secret-Rotation, falls echte Secrets jemals committed waren
- Backup- und Restore-Test fuer Postgres
- Log-/Monitoring-Ziel und Alarmierung
- Datenschutz-/Impressum-/Einwilligungstexte final geprueft
- TOMs, AV-Vertraege, Loesch-/Retention-Regeln und Incident-Prozess fuer den Pilotumfang

## Startfreigabe

Die Pilotfreigabe ist erst belastbar, wenn diese Nachweise vorliegen:

| Gate | Nachweis |
| --- | --- |
| Repo | alle Repo-Gates gruen |
| Env | `npm run check:pilot:env` gruen, keine Secrets im Bericht |
| Postgres | Migrationen zweimal gruen, `check:public-requests:postgres` gruen |
| Backup/Restore | `check:postgres:backup-restore` gruen gegen Scratch-DB |
| Runtime | `check:pilot:live` gruen |
| Staff | Pilot-Staffgruppe provisioniert und fachlich abgenommen |
| Legal/DSGVO/Ops | schriftliche Abnahme fuer metadata-only Pilotumfang |

## Abbruchkriterien

Pilot stoppen, wenn einer der Punkte eintritt:

- Upload-Objekte oder Dateinamen werden erzeugt
- `OMNIA_WRITE_MODE` ist nicht `read_only`
- Staff Admin ist oeffentlich indexierbar oder ohne Auth erreichbar
- `/readyz` meldet required Dependency `failed` oder `not_configured`
- Postgres-Migrationen sind nicht reproduzierbar/idempotent
- Audit Events fehlen bei Request-Erstellung oder Statuswechsel

## Go/No-Go

| Bereich | Pilotstatus |
| --- | --- |
| Public Requests metadata-only | Go, wenn alle Repo- und Betriebs-Gates gruen sind |
| Staff Admin intern | Go, wenn IAM/RBAC fuer Pilotgruppe freigegeben ist |
| Public Website | Go, wenn Rechtstexte und Inhalte final fuer Pilot freigegeben sind |
| Uploads | No-Go |
| Kundenportal | No-Go |
| Omnia Writes | No-Go |
| Produktion gesamt | No-Go, bis Upload/Portal/IAM/Ops/Legal separat produktionsreif sind |
