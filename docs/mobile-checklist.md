# Mobile-Checkliste

Stand: 2026-06-18

## Gepruefte Viewports

- 360px: statischer Responsive-Check, Breakpoint und Touch-Regeln vorhanden.
- 390px: statischer Responsive-Check, Breakpoint und reduzierte Innenabstaende vorhanden; echter
  Playwright-Chromium-Screenshot fuer Portal-Login und Staff-Filter nachgezogen.
- 430px: statischer Responsive-Check, Breakpoint fuer einspaltige Navigation und Formularpanels vorhanden.
- 768px: im Audit-Ziel dokumentiert; Layout faellt vor 980px auf einspaltige Portal-/Admin-Shells.
- 1024px: Desktop-/Tablet-Uebergang ueber 980px-Breakpoint vorbereitet.
- 1280px+: Standard-Container bis 1180px Breite, Desktop-Grids aktiv; echter
  Playwright-Chromium-Screenshot fuer Staff-Filter nachgezogen.

## Pflichtkriterien

- Keine Tabellen im React-Markup; Portalverlauf nutzt Tabs, Timeline und Karten/Reihen.
- Globale horizontale Overflow-Sperre ueber `overflow-x: clip`.
- Touchflaechen fuer Buttons, Links, Inputs, Selects und interaktive Rollen mindestens 44px.
- Header, Hero-CTAs und Formularaktionen brechen auf Mobile auf volle Breite um.
- Rezeptupload bleibt als Formularpanel mit 48px-Selects, FileUpload-Zone und Consent-Karten nutzbar.
- Terminanfrage bleibt als gegliedertes Formular mit Datum, Zeitfenster, Anliegen und Kontaktfeldern nutzbar.
- Kernformulare nutzen mobile Step-Abschnitte: Bedarf, Upload/Consent, Terminfenster, Kontaktweg und Nachricht.
- Portal-Dashboard nutzt mobile Tabs, KPI-Karten, Request-Karten, Dauerversorgungs-Karten und leere Zustände.
- Portal-MVP nutzt mobile KPI-Karten, drei einspaltig fallende Request-Formulare, Mitarbeiterstatus-Karten
  und Audit-Event-Karten ohne Tabellen.
- Staff/Admin-Workbench nutzt mobile Filter-Controls, Request-Cards, Detailkarten, Status-Buttons und
  Audit-Event-Karten ohne Tabellen.
- Bestellverlauf/Request-Verlauf wird als Timeline oder Karten dargestellt, nicht als Mobile-Tabelle.
- Sticky Sidebars werden unter 980px statisch, damit Header/Footer keinen Content ueberdecken.
- Lade-, Fehler- und leere Zustände sind im Design-Lab als responsive Kartenmuster sichtbar.

## Ausgefuehrte Checks

```bash
npm run check:responsive
npm run check:flows
npm run check:architecture
npm run build:backend
npm run build:portal:mock
npm run demo:portal-mvp
npm run build
# Playwright Chromium: Portal Login + Staff/Admin Filter, 390px und 1280px
```

## Letzte groessere UI-Aenderung: Staff/Admin-Workbench

- 360px: Staff-Filter, Request-Liste, Detailansicht und Statusaktionen sind als einspaltige Karten/Controls
  angelegt; Statusbuttons sind volle Breite und mindestens 44px hoch.
- 390px: Request-Cards und Detail-Metadaten reduzieren Innenabstaende, ohne horizontale Tabellen oder Overflow.
- 430px: Filter-Selects bleiben native 48px Controls; die Detailansicht folgt unter der Liste.
- 768px: Workbench faellt vor 980px auf eine Spalte, dadurch keine ueberlappenden Liste/Details.
- 1024px: Liste und Detailansicht laufen als Zwei-Spalten-Workbench.
- 1280px+: KPI-Zeile, Filterbereich und Audit-Grid bleiben im 1180px-Container.
- Visuelle Playwright-Chromium-Verifikation ist nach installierten Systemabhaengigkeiten fuer 390px
  und 1280px nachgezogen; gemessener horizontaler Overflow: keiner.

## Letzte groessere UI-Aenderung: Portal-MVP

- 360px: Portal-Login, Rezeptupload-Anfrage, Terminwunsch, Bestellanfrage, Mitarbeiterstatus und Audit
  sind als einspaltige Karten/Formularbereiche angelegt; statisch ueber `check:responsive` abgesichert.
- 390px: Request-Formulare nutzen native 44px+ Controls und volle Breite.
- 430px: Datei-Auswahl, Consent-Checkbox und CTA bleiben im Formularfluss; kein Sticky CTA verdeckt Inhalte.
- 768px: Grid-Layouts bleiben flexibel und fallen bei Bedarf auf Karten untereinander.
- 1024px: Zwei-Spaltenbereiche fuer Session/Sicherheitsgrenzen und Status/Audit greifen ohne Tabellen.
- 1280px+: Standard-Container bleibt auf 1180px begrenzt.
- Portal-Login und Staff/Admin-Filter wurden visuell per Playwright Chromium geprueft; die
  Request-Formularpfade bleiben statisch plus HTTP-E2E-Demo abgesichert.

## Bekannte Probleme

- Der alte Chromium-Blocker `libatk-1.0.so.0` ist behoben; Headless Chromium startet in dieser Umgebung.
- Lokale Serverports sind verfuegbar; der Portal-MVP wurde per HTTP-End-to-End-Demo und visueller
  Playwright-Pruefung fuer 390px und 1280px geprueft.
- Vor Produktionsfreigabe sollten die visuellen Klicktests fuer 360, 430, 768 und 1024px sowie die
  Customer-Request-Formularpfade noch nachgezogen werden.
