# Mobile-Checkliste

Stand: 2026-06-16

## Gepruefte Viewports

- 360px: statischer Responsive-Check, Breakpoint und Touch-Regeln vorhanden.
- 390px: statischer Responsive-Check, Breakpoint und reduzierte Innenabstaende vorhanden.
- 430px: statischer Responsive-Check, Breakpoint fuer einspaltige Navigation und Formularpanels vorhanden.
- 768px: im Audit-Ziel dokumentiert; Layout faellt vor 980px auf einspaltige Portal-/Admin-Shells.
- 1024px: Desktop-/Tablet-Uebergang ueber 980px-Breakpoint vorbereitet.
- 1280px+: Standard-Container bis 1180px Breite, Desktop-Grids aktiv.

## Pflichtkriterien

- Keine Tabellen im React-Markup; Portalverlauf nutzt Tabs, Timeline und Karten/Reihen.
- Globale horizontale Overflow-Sperre ueber `overflow-x: clip`.
- Touchflaechen fuer Buttons, Links, Inputs, Selects und interaktive Rollen mindestens 44px.
- Header, Hero-CTAs und Formularaktionen brechen auf Mobile auf volle Breite um.
- Rezeptupload bleibt als Formularpanel mit 48px-Selects, FileUpload-Zone und Consent-Karten nutzbar.
- Terminanfrage bleibt als gegliedertes Formular mit Datum, Zeitfenster, Anliegen und Kontaktfeldern nutzbar.
- Kernformulare nutzen mobile Step-Abschnitte: Bedarf, Upload/Consent, Terminfenster, Kontaktweg und Nachricht.
- Portal-Dashboard nutzt mobile Tabs, KPI-Karten, Request-Karten, Dauerversorgungs-Karten und leere Zustände.
- Bestellverlauf/Request-Verlauf wird als Timeline oder Karten dargestellt, nicht als Mobile-Tabelle.
- Sticky Sidebars werden unter 980px statisch, damit Header/Footer keinen Content ueberdecken.
- Lade-, Fehler- und leere Zustände sind im Design-Lab als responsive Kartenmuster sichtbar.

## Ausgefuehrte Checks

```bash
npm run check:responsive
npm run check:flows
npm run check:architecture
npm run build
```

## Bekannte Probleme

- Echte visuelle Browser-QA je Viewport ist in dieser Umgebung weiterhin nicht vollstaendig moeglich, weil Chromium wegen fehlender Linux-Systembibliothek `libatk-1.0.so.0` nicht startet.
- In der aktuellen eingeschraenkten Sandbox kann Vite ausserdem keinen lokalen Port oeffnen (`listen EPERM` auf `127.0.0.1:5175`), daher war nach dieser UI-Aenderung kein neuer HTTP-Routencheck moeglich.
- Der aktuelle Mobile-Nachweis ist deshalb statisch plus erfolgreicher Produktionsbuild. Vor Produktionsfreigabe muessen Screenshots/Klicktests fuer 360, 390, 430, 768, 1024 und 1280px in einer Browser-Umgebung mit installierten Chromium-Abhaengigkeiten und erlaubtem lokalen Port nachgezogen werden.
