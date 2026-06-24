# Staff Pilot Acceptance Plan

Stand: 2026-06-24

Diese Abnahme beschreibt den kontrollierten internen Staff-Pilot auf internem IP-Staging. Sie ist fachlich und organisatorisch; sie erweitert keine Produktlogik und ersetzt keine technische Freigabe.

## Ziel Des Pilotlaufs

Der Pilotlauf soll nachweisen, dass Pilot-Mitarbeiter eingehende metadata-only Public Requests im Staff Admin fachlich sichten, priorisieren, Statuswechsel setzen, Audit-Spuren pruefen und Feedback zum Arbeitsablauf geben koennen.

Der Pilot ist erfolgreich, wenn die Staff-Arbeit fuer den vereinbarten internen Testumfang nachvollziehbar, datenschutzkonform und ohne Scope-Bruch ausgefuehrt werden kann.

## Pilotumfang

Im Scope sind:

- interne Staff-Sichtung von metadata-only Public Requests
- Bearbeitung von Termin-, Kontakt-, Pflege-/Versorgungs- und Dokument-/Rezept-Metadaten-Anfragen
- Statuswechsel innerhalb des Staff-MVP-Modells
- Audit-Pruefung fuer Request-Erstellung und Statuswechsel
- Login, Logout und Session-Grenzen des Staff Admin
- fachliches Feedback zu Verstaendlichkeit, fehlenden Informationen und UX-Problemen
- Dokumentation von Entscheidungen vor einer moeglichen Erweiterung des Pilotumfangs

## Nicht Im Scope

Nicht im Scope sind:

- Uploads
- Kundenportal
- Omnia Writes
- produktiver Regelbetrieb
- echte Kundendaten
- echte Gesundheitsdaten
- produktive Dateiuebertragung
- oeffentliches HTTPS-Staging ohne eigene Domains, DNS und TLS

Die technischen Grenzen bleiben unveraendert: `UPLOADS_ENABLED=false`, Kundenportal deaktiviert, `OMNIA_WRITE_MODE=read_only`, keine Secrets im Git.

## Rollen

| Rolle | Verantwortung |
| --- | --- |
| Pilot-Mitarbeiter | Fuehrt die fachlichen Testfaelle im Staff Admin aus, dokumentiert Ergebnis und Feedback, verwendet nur freigegebene Testdaten. |
| Verantwortlicher Admin | Provisioniert temporaere Pilot-Zugaenge, ordnet Testfaelle zu, sammelt Feedback, entscheidet ueber Abbruch oder Abschluss. |
| Technischer Ansprechpartner | Klaert technische Fehler, prueft Logs/Audit bei Bedarf, bestaetigt Scope-Grenzen und technische Gates. |

## Voraussetzungen

Vor dem fachlichen Pilot muessen vorliegen:

- technische Runtime-Gates gruen
- Live-Smoke gruen
- Public Requests Postgres Gatekeeper gruen
- Backup/Restore Gate gruen
- Postgres-Port nach dem technischen Test wieder geschlossen
- internes IP-Staging als aktueller Testweg bestaetigt
- Uploads deaktiviert
- Kundenportal deaktiviert
- Omnia Writes `read_only`
- Pilot-Mitarbeiter, verantwortlicher Admin und technischer Ansprechpartner benannt
- temporaere Staff-Zugaenge pro Pilot-Mitarbeiter provisioniert
- Testdaten- und Datenschutzregeln bestaetigt
- Feedbackbogen vorbereitet

## Testdatenregeln

- Nur synthetische Testpersonen und Testkontakte verwenden.
- Keine echten Kundennamen, Telefonnummern, E-Mail-Adressen, Versichertendaten, Diagnosen, Verordnungen oder Gesundheitsdaten verwenden.
- Keine echten Dateien hochladen oder Dateinamen erfassen.
- Dokument-/Rezept-Szenarien nur als Metadaten testen, zum Beispiel "Rezept liegt vor Ort vor" oder "Rueckfrage zu Rezept-Metadaten".
- Screenshots nur ohne personenbezogene Daten, Tokens, Cookies, Passwoerter oder interne Secrets erstellen.
- Testfall-IDs und Request-IDs duerfen dokumentiert werden, solange sie keine personenbezogenen Daten enthalten.
- Nach Pilotabschluss klaert der verantwortliche Admin, ob Testdaten geloescht, anonymisiert oder fuer technische Nachweise befristet aufbewahrt werden.

## Datenschutzregeln

- Der Pilot bleibt metadata-only.
- Es werden keine Upload-Objekte, keine Dateiinhalte und keine Dateinamen erzeugt.
- Staff-Mitarbeiter arbeiten nur mit eigenen persoenlichen Pilot-Zugaengen.
- Keine Shared Accounts im echten Betrieb.
- Keine Secrets, Passwoerter oder Session-Daten in Tickets, Screenshots, Chat oder Git eintragen.
- Feedback darf fachliche Probleme beschreiben, aber keine personenbezogenen Inhalte aus Testanfragen wiederholen.
- Bei Verdacht auf echte Kundendaten oder echte Gesundheitsdaten wird der Pilot sofort gestoppt und der technische Ansprechpartner informiert.

## Staff Provisioning

Pilot-Zugaenge werden ueber `npm run staff:provision` erstellt oder aktualisiert. Das Script baut zuerst das Backend und provisioniert dann einen Staff-User in der Postgres-Pilot-Env.

Beispiel ohne echte Secrets:

```bash
export NODE_ENV='production'
export PORTAL_REPOSITORY_DRIVER='postgres'
export PORTAL_DATABASE_URL='<postgres-url-aus-secret-store>'
export PORTAL_STAFF_PROVISION_EMAIL='pilot.mitarbeiter@example.org'
export PORTAL_STAFF_PROVISION_PASSWORD='<temporary-strong-password>'
export PORTAL_STAFF_PROVISION_DISPLAY_NAME='Pilot Mitarbeiter'
export PORTAL_STAFF_PROVISION_ROLE='staff'
npm run staff:provision
```

Regeln:

- keine Passwoerter im Git
- keine echten Secrets in Markdown, Tickets oder Chat
- pro Mitarbeiter ein eigener Account
- temporaere Pilot-Zugaenge verwenden
- Account nach Pilot deaktivieren oder Passwort rotieren
- keine Shared Accounts fuer echten Betrieb
- Provisioning-Ergebnis ohne Passwort dokumentieren
- Rollen nur nach Pilotauftrag vergeben; Standard fuer Pilot-Mitarbeiter ist `staff`

## Fachliche Testfaelle

| ID | Testfall | Erwartung | Nachweis |
| --- | --- | --- | --- |
| SP-01 | Termin-Anfrage bearbeiten | Staff erkennt Terminwunsch, fehlende Angaben und naechsten internen Schritt. | Ergebnis und Rueckfragebedarf im Feedbackbogen dokumentiert. |
| SP-02 | Kontakt-Anfrage bearbeiten | Staff kann bevorzugten Kontaktweg und Rueckruf-/E-Mail-Bedarf erkennen. | Ergebnis und fachliche Rueckfrage dokumentiert. |
| SP-03 | Pflege-/Versorgungs-Anfrage bearbeiten | Staff kann Versorgungsanliegen metadata-only einordnen, ohne Gesundheitsdetails zu erheben. | Ergebnis, fehlende Information und Prioritaet dokumentiert. |
| SP-04 | Dokument-/Rezept-Metadaten-Anfrage bearbeiten | Staff erkennt, dass keine Datei vorliegt oder verarbeitet wird, und klaert nur Metadaten. | Keine Upload-Objekte, kein Dateiname, Feedback dokumentiert. |
| SP-05 | Statuswechsel `new` -> `in_review` | Statuswechsel wird gespeichert und im Detail sichtbar. | Request-ID und Ergebnis dokumentiert. |
| SP-06 | Statuswechsel `in_review` -> `waiting_for_customer` | Rueckfrage-Status wird gespeichert und Staff sieht naechsten Schritt. | Request-ID und Ergebnis dokumentiert. |
| SP-07 | Statuswechsel `completed` | Abschlussstatus wird gespeichert; keine weitere Statusaktion im MVP erforderlich. | Request-ID und Ergebnis dokumentiert. |
| SP-08 | Statuswechsel `cancelled` | Abbruchstatus wird gespeichert; keine weitere Statusaktion im MVP erforderlich. | Request-ID und Grundkategorie dokumentiert. |
| SP-09 | Audit pruefen | Request-Erstellung und Statuswechsel sind im Audit nachvollziehbar. | Audit-Eintrag vorhanden, ohne Secrets zu kopieren. |
| SP-10 | Logout pruefen | Logout beendet die Staff-Session. | Nach Logout ist keine Staff-Ansicht mehr erreichbar. |
| SP-11 | Staff ohne Session pruefen | Staff-Endpunkte oder Staff UI verlangen Authentifizierung. | Zugriff ohne Session wird abgelehnt. |
| SP-12 | Fehlerfall bei ungueltigem Status pruefen | Ungueltiger oder nicht erlaubter Statuswechsel wird abgelehnt. | Fehler dokumentiert, kein Status wurde gespeichert. |

## Feedbackbogen

| Testfall | Ergebnis | Verstaendlichkeit | fehlende Information | UX-Problem | fachliche Rueckfrage | Prioritaet | Entscheidung |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SP-01 | offen | offen | offen | offen | offen | offen | offen |
| SP-02 | offen | offen | offen | offen | offen | offen | offen |
| SP-03 | offen | offen | offen | offen | offen | offen | offen |
| SP-04 | offen | offen | offen | offen | offen | offen | offen |
| SP-05 | offen | offen | offen | offen | offen | offen | offen |
| SP-06 | offen | offen | offen | offen | offen | offen | offen |
| SP-07 | offen | offen | offen | offen | offen | offen | offen |
| SP-08 | offen | offen | offen | offen | offen | offen | offen |
| SP-09 | offen | offen | offen | offen | offen | offen | offen |
| SP-10 | offen | offen | offen | offen | offen | offen | offen |
| SP-11 | offen | offen | offen | offen | offen | offen | offen |
| SP-12 | offen | offen | offen | offen | offen | offen | offen |

## Abbruchkriterien

Pilot sofort stoppen, wenn:

- echte Kundendaten oder echte Gesundheitsdaten eingegeben werden
- Upload-Objekte, Dateiinhalte oder Dateinamen entstehen
- das Kundenportal aktiviert oder fachlich verwendet wird
- `OMNIA_WRITE_MODE` nicht `read_only` ist
- Staff Admin ohne eigene Session oder ohne passende Rolle nutzbar ist
- Statuswechsel ohne Audit-Spur bleiben
- technische Runtime-, Live-, Public-Requests- oder Backup/Restore-Gates rot werden
- oeffentliches HTTPS-Staging ohne eigene Domains, DNS und TLS verwendet werden soll
- ein Pilot-Mitarbeiter Shared Credentials verwendet

## Erfolgskriterien

Der Staff Pilot ist fachlich erfolgreich, wenn:

- alle fachlichen Testfaelle ausgefuehrt und bewertet sind
- jeder Pilot-Mitarbeiter mit eigenem temporaerem Account gearbeitet hat
- Termin-, Kontakt-, Pflege-/Versorgungs- und Dokument-/Rezept-Metadaten-Anfragen bearbeitbar sind
- die Statuswechsel `new`, `in_review`, `waiting_for_customer`, `completed` und `cancelled` fachlich verstanden wurden
- Audit fuer Erstellung und Statuswechsel nachvollziehbar ist
- Logout und Staff-ohne-Session-Grenze bestaetigt sind
- ungueltige Statuswechsel abgelehnt werden
- keine Uploads, kein Kundenportal und keine Omnia Writes beobachtet wurden
- Feedback priorisiert und je Punkt eine Entscheidung dokumentiert ist
- der verantwortliche Admin die naechste Entscheidung trifft: fortsetzen, nachbessern, abbrechen oder Scope spaeter separat erweitern
