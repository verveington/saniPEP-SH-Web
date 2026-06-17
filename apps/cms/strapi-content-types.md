# Strapi Content-Type Struktur

Strapi ist fuer redaktionelle Inhalte vorgesehen, nicht als fuehrendes System fuer Portal- oder Rezeptdaten.
Omnia bleibt fuehrend fuer Stammdaten, Dauerrezepte, Dauerversorgungen und finale Bestellungen.
Die JSON-Schemas in `apps/cms/content-types` und `apps/cms/components` sind die redaktionelle Quellstruktur.
Die laufende Strapi-App nutzt die kopierte Runtime-Struktur unter `apps/cms/src/api` und `apps/cms/src/components`.

## Public Website

- `landing-page-section`: Homepage-Abschnitte, H1/H2-Level, Reihenfolge, CTA, interne Links und Bildreferenzen.
- `service-page`: Leistungsseiten fuer Lymphoedem, Lipoedem, Narbenkompression, Brustprothetik, Bandagen, Orthesen, Reha, Stoma und weitere Bereiche.
- `symptom`: Patientensprache, Synonyme, Priorisierung nach Symptomen, Produkten und Situationen. Analytics bleibt auf grobe Ziele beschraenkt.
- `product-group`: Produktgruppen als Orientierung, ohne klassischen Katalogfokus und ohne Heilversprechen.
- `faq`: redaktionelle Fragen je Leistungsbereich, Portalprozess und Kontaktweg.
- `legal-page`: Datenschutz, Impressum und Einwilligung mit `reviewStatus`. Platzhalter muessen sichtbar als Platzhalter markiert bleiben.
- `contact-setting`: Standort, Erreichbarkeit, Telefon, Fax, E-Mail, WhatsApp, Locality und Service Area.
- `opening-hour`: strukturierte Oeffnungszeiten fuer lokale SEO und Kontaktmodule.
- `seo-metadata`: Meta Title, Description, Canonical, Robots, H1/H2-Struktur, lokale SEO und interne Links je Route.
- `portal-help-content`: sichere Hilfetexte ohne sensible Listendaten.

## Portal-Hilfe und Formulare

- `form-configuration`: Schritte, Felder, Validierung, Consent-Copy und Request-Ziel.

## Medienbibliothek

Das Seed-Skript legt Ordner fuer Logo, Teamfotos, Standortbilder, Leistungsseitenbilder, Produktgruppenbilder und Downloads an.
Diese Medien sind redaktionelle Assets. Rezeptdateien, Patientendokumente und Formularuploads duerfen nicht in Strapi gespeichert werden.

## Public API

Die Users-&-Permissions-Rolle `Public` wird durch `npm run cms:seed` nur fuer `find` und `findOne` auf oeffentlichen Content-Types freigegeben.
`form-configuration` bleibt oeffentlich gesperrt.
Routenfelder sind in Strapi als Strings modelliert, weil Strapi-v5-Enumerations keine URL-Pfade mit `/` als Werte akzeptieren.

## Pflichtseiten

- `/lymphoedem-lipoedem-narbenkompression`
- `/brustprothetik`
- `/bandagen-orthesen-reha-stoma`
- `/inkontinenz-pflegehilfsmittel`
- `/rezept-upload`
- `/termin-anfragen`
- `/kontakt`
- `/impressum`
- `/datenschutz`
- `/einwilligung`

## Mock-Content

Der Seed unter `apps/cms/mock-content/public-content.seed.json` ist realistisch, aber synthetisch.
Er enthaelt keine echten Patientendaten, keine finalen Rechtstexte und keine Heilversprechen.
Such- und Symptomtexte duerfen nicht in Analytics-Events uebernommen werden.

## Datenschutzgrenze

Keine sensiblen Rezeptinhalte, Patientendaten oder Omnia-Stammdaten werden als Strapi-Content modelliert.
Portalaktionen muessen als Requests in eine gesicherte Backend-Schicht laufen und durch Mitarbeiter freigegeben werden.
