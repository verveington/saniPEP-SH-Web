# Controlled Pilot Start Checklist

Stand: 2026-06-23

Diese Checkliste ist fuer die Startfreigabe des kontrollierten internen Pilotbetriebs. Keine Secrets, keine echten Kundendaten und keine personenbezogenen Details eintragen.

## Scope

| Bereich | Entscheidung |
| --- | --- |
| Public Website | Pilot-Go nach Legal-/Content-Abnahme |
| Public Requests | Go, metadata-only |
| Staff Admin | Go fuer interne Pilotgruppe |
| Uploads | No-Go, `UPLOADS_ENABLED=false` |
| Kundenportal | No-Go |
| Omnia Writes | No-Go, `OMNIA_WRITE_MODE=read_only` |
| Produktion gesamt | No-Go ausserhalb des kontrollierten Pilotumfangs |

## Technische Gates

| Gate | Ergebnis | Datum | Verantwortlich |
| --- | --- | --- | --- |
| `npm run check:backend:migrations` | offen |  |  |
| `npm run check:backend` | offen |  |  |
| `npm run check:public-requests` | offen |  |  |
| `npm run check:staff-admin:mvp` | offen |  |  |
| `npm run check:pilot:readiness` | offen |  |  |
| `PILOT_ENV_FILE=.env.staging npm run check:pilot:env` | offen |  |  |
| `npm run db:migrate` Lauf 1 | offen |  |  |
| `npm run db:migrate` Lauf 2 idempotent | offen |  |  |
| `npm run check:public-requests:postgres` | offen |  |  |
| `npm run check:postgres:backup-restore` | offen |  |  |
| `npm run check:pilot:live` | offen |  |  |

## Runtime-Nachweise

| Nachweis | Erwartung | Ergebnis |
| --- | --- | --- |
| Web erreichbar | `200` | offen |
| Staff Admin erreichbar | `200`, `X-Robots-Tag: noindex, nofollow` | offen |
| API Health | `/healthz` `200 ok` | offen |
| API Readiness | `/readyz` `200 ready` | offen |
| Staff Session ohne Login | `401 authentication_required` | offen |
| Uploads | `/readyz` AV/ObjectStorage `disabled` | offen |
| Public Requests | `uploadObjectsCreated=0` | offen |

## Staff-Pilotgruppe

| Punkt | Ergebnis |
| --- | --- |
| Pilotgruppe benannt | offen |
| Rollen/Verantwortlichkeiten bestaetigt | offen |
| Staff-Zugaenge provisioniert via `npm run staff:provision` | offen |
| Abnahme: Request-Liste, Detail, Statuswechsel, Audit | offen |
| Supportfenster und Eskalationsweg bestaetigt | offen |

## Legal/DSGVO/Ops

| Punkt | Ergebnis |
| --- | --- |
| Impressum final fuer Pilot | offen |
| Datenschutzhinweise final fuer metadata-only Public Requests | offen |
| Einwilligungstexte final fuer Anfrage-/Gesundheitsdaten-Metadaten | offen |
| TOMs fuer Pilotumfang bestaetigt | offen |
| AV-Vertraege/AVV bestaetigt | offen |
| Loesch-/Retention-Regeln bestaetigt | offen |
| Backup-/Restore-Probe dokumentiert | offen |
| Incident-Prozess bestaetigt | offen |
| Secret-Rotation bewertet und falls noetig erledigt | offen |

## Abbruchkriterien

Pilot sofort stoppen, wenn:

- Upload-Objekte oder Dateinamen entstehen.
- Staff Admin ohne Auth/Rolle erreichbar ist.
- `OMNIA_WRITE_MODE` nicht `read_only` ist.
- `/readyz` eine required Dependency als `failed` oder `not_configured` meldet.
- Migrationen nicht reproduzierbar/idempotent sind.
- Audit Events fuer Request-Erstellung oder Statuswechsel fehlen.

## Startentscheidung

| Entscheidung | Ergebnis |
| --- | --- |
| Kontrollierter Pilotstart | offen |
| Startdatum | offen |
| Freigabe Technik | offen |
| Freigabe Fachbereich | offen |
| Freigabe Legal/DSGVO/Ops | offen |
