# Portal Auth und Upload Backend Grundgeruest

Dieses Verzeichnis enthaelt serverseitige Vertrage und Serviceskelette. Es ist kein produktives Backend und speichert keine echten Rezeptdateien oder Gesundheitsdaten.

## Module

- `portalAuth.ts`: Einmalpasswort per Brief/Handout, Passwort setzen, Passwort-Login, Rollenpruefung. Magic Link ist absichtlich nur als geplanter Fehlerpfad markiert.
- `uploadBackend.ts`: Upload-ID, Groessenpruefung, Dateiendung, MIME-Signatur, Quarantaene-Storage, AV-Scan-Interface und Audit.
- `portalRequests.ts`: Request-basierte Aktionen fuer Rezeptupload, Bestellanfrage, Abo-Wunsch, Terminwunsch und Gesundheitskontakt.
- `omniaBoundary.ts`: Read-mostly Omnia-Grenze und Vorbereitung von Mitarbeiter-geprueften Aenderungen.
- `auditLog.ts`: Audit-Event-Schema und Memory-Sink fuer Tests/Mocking.

## Nicht produktiv

- keine Datenbankimplementierung
- kein produktiver Password-Hasher
- kein Session-Cookie-Signer
- kein echtes Object Storage
- kein AV-Scanner
- keine Omnia-Anbindung
- keine Verarbeitung echter Patientendaten

Produktive Adapter muessen diese Interfaces implementieren und in einem getrennten Backend laufen.
