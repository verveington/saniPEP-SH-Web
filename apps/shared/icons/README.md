# saniPEP Icon-Regel

Diese Icon-Datenbank ist die einzige globale Quelle fuer Fach-, Content- und Service-Icons.

## Erlaubt

- Bedeutungs-, Content- und Service-Icons: `apps/shared/icons/png/outline/**`
- Rendering in React: `SharedIcon`
- CMS/DB-Werte: stabile Keys aus `SharedIconName`, keine freien Pfade
- UI-Control-Glyphen: `lucide-react` oder Reshaped, aber nur fuer Bedienung und Navigation

## Nicht erlaubt

- Fach- oder Service-Icons direkt aus `lucide-react`
- App-lokale Icon-Duplikate
- CMS-Uploads als Icons
- Freie Icon-Pfade aus Content
- Neue Seiten oder Komponenten mit direkten Content-Icon-Imports
- Neue `lucide-react`-Imports ohne bewusste Aufnahme in die Control-/Navigations-Allowlist des Architektur-Checks

## Beispiele

```tsx
<SharedIcon name="devices/orthotics" decorative />
<SharedIcon name="symbols/secure_communication" alt="Sichere Kommunikation" />
```

```tsx
// OK: UI-Control-Glyph fuer Navigation.
<ButtonText icon={ChevronRight}>Mehr zu Orthesen</ButtonText>
```

Wenn ein neues globales Icon gebraucht wird, wird es zuerst in `iconRegistry.ts` aufgenommen.
Danach kann der Key in Website, Portal, Admin, Design-Lab oder CMS-Content verwendet werden.

`npm run check:architecture` prueft:

- die Outline-Datenbank als globale Asset-Quelle
- `SharedIcon` als gemeinsamen Renderer
- keine direkten Outline-Asset-Pfade in App-Code
- neue `lucide-react`-Imports nur nach expliziter Control-/Navigations-Freigabe
