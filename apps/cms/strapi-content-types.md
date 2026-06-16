# Strapi Content-Type Plan

Strapi ist fuer redaktionelle Inhalte vorgesehen, nicht als fuehrendes System fuer Portal- oder Rezeptdaten.
Omnia bleibt fuehrend fuer Stammdaten, Dauerrezepte, Dauerversorgungen und finale Bestellungen.

## Public Website

- `landing-page-section`: Homepage-Abschnitte, Reihenfolge, CTA, Bildreferenzen.
- `service-page`: Leistungsseiten fuer Lymphoedem, Lipoedem, Narbenkompression, Brustprothetik und weitere Bereiche.
- `faq`: redaktionelle Fragen je Leistungsbereich und Portalprozess.
- `symptom`: Suchbegriffe, Synonyme, Priorisierung nach Symptomen, Produkten und Situationen.
- `product-group`: Produktgruppen ohne klassische Katalogdominanz.
- `contact-setting`: Standort, Parteiverkehr, Erreichbarkeit, Telefon, Fax, E-Mail, WhatsApp.
- `opening-hour`: strukturierte Oeffnungszeiten fuer Standortmodule.
- `hero-content`: Hero-Copy, Media, CTA und Zielroute.
- `seo-metadata`: Title, Description, Canonical, OpenGraph.
- `legal-page`: Datenschutz, Impressum und versionierte Rechtstexte.

## Portal-Hilfe und Formulare

- `portal-help-content`: sichere Hilfetexte ohne sensible Listendaten.
- `form-configuration`: Schritte, Felder, Validierung, Consent-Copy und Request-Ziel.

## Datenschutzgrenze

Keine sensiblen Rezeptinhalte, Patientendaten oder Omnia-Stammdaten werden als Strapi-Content modelliert.
Portalaktionen muessen als Requests in eine gesicherte Backend-Schicht laufen und durch Mitarbeiter freigegeben werden.
