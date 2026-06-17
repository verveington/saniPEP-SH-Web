import type { DesignLabPalette } from "../../shared/design/saniPepDesignTokens";

export const evaluationMetrics = [
  { key: "conversion", label: "Conversion" },
  { key: "clarity", label: "Verständlichkeit ältere Patienten" },
  { key: "mobile", label: "Mobile Nutzbarkeit" },
  { key: "readability", label: "Lesbarkeit" },
  { key: "trust", label: "Vertrauen" },
] as const;

export type MetricKey = (typeof evaluationMetrics)[number]["key"];
export type VariantId = "A" | "B" | "C";
export type LabComponentId =
  | "tokens"
  | "palettes"
  | "appointment"
  | "portalDashboard"
  | "orderHistory"
  | "prescriptionStatus"
  | "uploadFlow"
  | "viewportPreview";

export type VariantScores = Record<MetricKey, number>;

export type DesignLabVariant = {
  id: VariantId;
  title: string;
  thesis: string;
  mockData: string;
  scores: VariantScores;
  strengths: string[];
  risks: string[];
  paletteId?: DesignLabPalette;
};

export type LabComponent = {
  id: LabComponentId;
  title: string;
  goal: string;
  dataSource: string;
  recommendedVariant: VariantId;
  recommendation: string;
  variants: DesignLabVariant[];
};

export const labComponents: LabComponent[] = [
  {
    id: "tokens",
    title: "Design Token Playground",
    goal: "Token-Sets für patientennahe und interne Oberflächen vergleichen.",
    dataSource: "Design Tokens, Demo-Kunde, Demo-Requests",
    recommendedVariant: "B",
    recommendation:
      "Variante B ist die beste Basis für patientennahe Flows: größere Schrift, stärkere Kontraste und ruhigere Abstände reduzieren Rückfragen.",
    variants: [
      {
        id: "A",
        title: "Sani Default",
        thesis: "Ausgewogenes Basisset mit 8px-Radius, medizinischer Markenfarbe und normaler Dichte.",
        mockData: "Demo-Termin, Demo-Rezept und Demo-Bestellanfrage in Standard-Dichte.",
        scores: { conversion: 4, clarity: 4, mobile: 4, readability: 4, trust: 4 },
        strengths: ["Markennah", "Gute Balance zwischen Ruhe und Nutzlast", "Einfach auf bestehende Screens übertragbar"],
        risks: ["Für ältere Patienten in Formularen teilweise etwas dicht", "Primäre Aktionen konkurrieren mit Statusflächen"],
      },
      {
        id: "B",
        title: "Senior Kontrast",
        thesis: "Größere UI-Schrift, 48px-Controls und stärkerer Fokus auf Primäraktionen.",
        mockData: "Demo-Rezeptstatus mit großen Statuszeilen und klarer Nächster-Schritt-Aktion.",
        scores: { conversion: 5, clarity: 5, mobile: 5, readability: 5, trust: 5 },
        strengths: ["Sehr gut lesbar", "Beruhigt kritische Flows", "Bessere Touch-Ziele auf Mobilgeräten"],
        risks: ["Weniger Informationsdichte im Mitarbeiterkontext", "Desktop wirkt bei sehr langen Listen etwas großzügig"],
      },
      {
        id: "C",
        title: "Ops Kompakt",
        thesis: "Dichtere Tabellen, kurze Labels und kleinere Abstände für interne Review-Arbeit.",
        mockData: "Demo-Audit und drei Demo-Anfragen als kompakte Prüfliste.",
        scores: { conversion: 3, clarity: 3, mobile: 3, readability: 3, trust: 4 },
        strengths: ["Viele Fälle pro Bildschirm", "Gut für interne Admin-Queues", "Schneller Vergleich von Statuswerten"],
        risks: ["Patientenfluss wirkt technisch", "Mobile Umbrüche brauchen Disziplin", "Höheres Fehlbedienungsrisiko"],
      },
    ],
  },
  {
    id: "palettes",
    title: "Farbschemata vergleichen",
    goal: "Visuelle Tonalität und Kontrastwirkung für medizinische Vertrauensbildung prüfen.",
    dataSource: "designLabPalettes aus Frontend-Design-Tokens",
    recommendedVariant: "A",
    recommendation:
      "Variante A bleibt die Empfehlung: grün-medizinisch, vertrauensbildend und gut mit Coral-Aktionen kombinierbar.",
    variants: [
      {
        id: "A",
        title: "Trust Medical",
        thesis: "Grün als führendes Vertrauenssignal, Coral nur für handlungsnahe Aktionen.",
        mockData: "Demo-Termin und Demo-Rezeptstatus mit Trust-Medical-Palette.",
        paletteId: "trust",
        scores: { conversion: 5, clarity: 4, mobile: 4, readability: 5, trust: 5 },
        strengths: ["Sofort medizinisch", "Starke Primäraktion", "Sehr gute Statuslesbarkeit"],
        risks: ["Viele grüne Statusflächen müssen klar differenziert werden"],
      },
      {
        id: "B",
        title: "Precision Graphite",
        thesis: "Sachlicher Graphit-Look für interne Präzision und seriöse Admin-Module.",
        mockData: "Demo-Portal-Dashboard mit neutralem Graphit-Fokus.",
        paletteId: "precision",
        scores: { conversion: 4, clarity: 4, mobile: 4, readability: 5, trust: 4 },
        strengths: ["Sehr klar", "Gut für Tabellen und Review", "Wenig visuelle Ablenkung"],
        risks: ["Für Patientinnen und Patienten weniger warm", "Aktionen wirken administrativer"],
      },
      {
        id: "C",
        title: "Warm Care",
        thesis: "Weichere Hintergrundflächen für sensible Rezept- und Upload-Situationen.",
        mockData: "Demo-Upload mit Warm-Care-Hintergrund und Sicherheitsnotiz.",
        paletteId: "warmCare",
        scores: { conversion: 4, clarity: 5, mobile: 4, readability: 4, trust: 5 },
        strengths: ["Einladend", "Sensible Flows fühlen sich weniger technisch an", "Gute Ruhe für Beratungskontext"],
        risks: ["Kann bei langen Seiten zu flächig wirken", "Kontraste müssen streng geprüft werden"],
      },
    ],
  },
  {
    id: "appointment",
    title: "Terminmodul vergleichen",
    goal: "Terminwunsch ohne falsche Buchungszusage verständlich und konversionsstark führen.",
    dataSource: "Demo-Terminwunsch, Kontaktzeiten, Servicebereiche",
    recommendedVariant: "A",
    recommendation:
      "Variante A ist am robustesten: ältere Patienten sehen nur einen Schritt auf einmal und verstehen, dass ein Mitarbeiter bestätigt.",
    variants: [
      {
        id: "A",
        title: "Schritt-für-Schritt-Assistent",
        thesis: "Vier klare Schritte: Anliegen, Wunschzeit, Kontakt, Prüfung durch Mitarbeiter.",
        mockData: "Demo-Terminwunsch vom 14.06.2026 mit Zeitfenster und Rückrufoption.",
        scores: { conversion: 5, clarity: 5, mobile: 5, readability: 5, trust: 5 },
        strengths: ["Reduziert kognitive Last", "Sehr mobilfreundlich", "Bestätigungspflicht ist sichtbar"],
        risks: ["Etwas längerer Weg für geübte Nutzer"],
      },
      {
        id: "B",
        title: "Kompaktformular",
        thesis: "Alle Pflichtfelder auf einer Oberfläche für schnelle interne Tests und kurze Wege.",
        mockData: "Demo-Anliegen, Wunschdatum und Kontaktdaten in einem Formularraster.",
        scores: { conversion: 4, clarity: 3, mobile: 3, readability: 4, trust: 4 },
        strengths: ["Schnell ausfüllbar", "Gut für Desktop", "Wenige Klicks"],
        risks: ["Mobil schnell lang", "Ältere Patienten können Pflichtfelder übersehen"],
      },
      {
        id: "C",
        title: "Rückruf zuerst",
        thesis: "Telefonische Sicherheit vor Dateneingabe, danach nur noch Wunschfenster.",
        mockData: "Demo-Kontaktweg Telefon mit Hinweis auf Mitarbeiterbestätigung.",
        scores: { conversion: 3, clarity: 5, mobile: 4, readability: 5, trust: 5 },
        strengths: ["Sehr vertrauensbildend", "Niedrige Hemmschwelle bei Unsicherheit", "Gut für komplexe Anliegen"],
        risks: ["Weniger digitale Abschlüsse", "Mehr Mitarbeiteraufwand"],
      },
    ],
  },
  {
    id: "portalDashboard",
    title: "Portal-Dashboard vergleichen",
    goal: "Portalstart für Status, offene Anfragen und nächste Schritte verständlich machen.",
    dataSource: "portalDashboard: Rezepte, Dauerversorgungen, Requests, Audit",
    recommendedVariant: "A",
    recommendation:
      "Variante A priorisiert das, was Patientinnen und Patienten heute wissen müssen, und versteckt Komplexität ohne Informationen zu verlieren.",
    variants: [
      {
        id: "A",
        title: "Heute wichtig",
        thesis: "Ein priorisierter Startbereich mit Rezept, offener Anfrage und nächstem Versorgungsschritt.",
        mockData: "Demo-Kunde mit zwei Rezepten, zwei Dauerversorgungen und drei Anfragen.",
        scores: { conversion: 5, clarity: 5, mobile: 5, readability: 5, trust: 5 },
        strengths: ["Sehr scanbar", "Nächste Aktion ist eindeutig", "Gut auf Mobilgeräten"],
        risks: ["Weniger geeignet für interne Massensichtung"],
      },
      {
        id: "B",
        title: "Modul-Kacheln",
        thesis: "Rezepte, Versorgung und Anfragen als gleichwertige Module mit Kennzahlen.",
        mockData: "Portal-Zähler aus Demo-Rezepten, Demo-Supplies und Demo-Requests.",
        scores: { conversion: 4, clarity: 4, mobile: 4, readability: 4, trust: 4 },
        strengths: ["Gute Übersicht", "Bekanntes Dashboard-Muster", "Skalierbar für mehr Module"],
        risks: ["Alle Bereiche wirken gleich wichtig", "Kann auf kleinen Geräten kachelig werden"],
      },
      {
        id: "C",
        title: "Aktivitäts-Timeline",
        thesis: "Chronologischer Verlauf mit Detailspalte für Audit- und Statusnachvollziehbarkeit.",
        mockData: "Demo-Audit AUD-1 bis AUD-3 mit zugehörigen Requests.",
        scores: { conversion: 3, clarity: 4, mobile: 3, readability: 4, trust: 5 },
        strengths: ["Sehr transparent", "Gut für Vertrauen und Nachvollziehbarkeit", "Stark für Supportfälle"],
        risks: ["Timeline braucht Erklärung", "Mobile Detailspalte muss kollabieren"],
      },
    ],
  },
  {
    id: "orderHistory",
    title: "Bestellverlauf vergleichen",
    goal: "Dauerversorgung und Bestellanfragen ohne finalen Omnia-Schreibzugriff erklären.",
    dataSource: "portalDashboard.supplies und portalDashboard.requests",
    recommendedVariant: "B",
    recommendation:
      "Variante B ist am verständlichsten: der Status-Tracker trennt Anfrage, Prüfung, Omnia-Vorbereitung und Bestätigung sichtbar.",
    variants: [
      {
        id: "A",
        title: "Zeitstrahl",
        thesis: "Bestellungen und Rückfragen werden chronologisch als Verlauf geführt.",
        mockData: "Demo-Bestellanfrage vom 12.06.2026 plus nächste Versorgung am 02.07.2026.",
        scores: { conversion: 4, clarity: 4, mobile: 4, readability: 4, trust: 4 },
        strengths: ["Natürliches Verlaufsmuster", "Gut für Rückfragen", "Einfach mobil stapelbar"],
        risks: ["Nächster Schritt kann zwischen Einträgen untergehen"],
      },
      {
        id: "B",
        title: "Status-Tracker",
        thesis: "Bekannter Paketstatus mit klarer Trennung zwischen Anfrage und finaler Freigabe.",
        mockData: "Demo-Dauerversorgung A mit Omnia-vorbereitetem Status.",
        scores: { conversion: 5, clarity: 5, mobile: 5, readability: 5, trust: 5 },
        strengths: ["Sehr vertraut", "Klärt Mitarbeiterprüfung", "Nächster Schritt ist eindeutig"],
        risks: ["Bei vielen parallelen Versorgungen braucht es Filter"],
      },
      {
        id: "C",
        title: "Tabellarischer Verlauf",
        thesis: "Interne, dichte Darstellung mit Datum, Status, Kanal und Kategorie.",
        mockData: "Alle Demo-Requests als Review-Tabelle.",
        scores: { conversion: 3, clarity: 3, mobile: 2, readability: 4, trust: 4 },
        strengths: ["Präzise", "Gut für Mitarbeiter", "Viele Zeilen vergleichbar"],
        risks: ["Für ältere Patienten zu technisch", "Mobile Tabelle braucht horizontales Scrollen"],
      },
    ],
  },
  {
    id: "prescriptionStatus",
    title: "Rezeptstatus vergleichen",
    goal: "Rezeptprüfung ohne sensible Detaildaten verständlich anzeigen.",
    dataSource: "portalDashboard.prescriptions",
    recommendedVariant: "B",
    recommendation:
      "Variante B liefert die beste Kombination aus Vertrauen und Handlungsklarheit: Status zuerst, Erklärung direkt darunter.",
    variants: [
      {
        id: "A",
        title: "Prüf-Checkliste",
        thesis: "Jeder Prüfpunkt wird als erledigt, in Prüfung oder ausstehend markiert.",
        mockData: "Demo-Dokument A in Mitarbeiterprüfung und Demo-Dokument B freigegeben.",
        scores: { conversion: 4, clarity: 4, mobile: 4, readability: 4, trust: 5 },
        strengths: ["Transparent", "Mitarbeiterprüfung wird sichtbar", "Gut für Vertrauen"],
        risks: ["Mehr Text als nötig", "Nicht jeder Prüfpunkt ist patientenrelevant"],
      },
      {
        id: "B",
        title: "Statuskarte mit nächstem Schritt",
        thesis: "Ein großer Status, eine kurze Erklärung und eine klare Folgeaktion pro Rezept.",
        mockData: "Aktives Demo-Rezept mit Status Mitarbeiterprüfung.",
        scores: { conversion: 5, clarity: 5, mobile: 5, readability: 5, trust: 5 },
        strengths: ["Schnell verständlich", "Sehr gut mobil", "Keine sensiblen Details sichtbar"],
        risks: ["Weniger Detailtiefe für Supportgespräche"],
      },
      {
        id: "C",
        title: "Detail-Akkordeon",
        thesis: "Mehrere Rezeptdetails bleiben geschlossen und werden bei Bedarf geöffnet.",
        mockData: "Zwei Demo-Rezepte mit versteckten Detailhinweisen.",
        scores: { conversion: 3, clarity: 4, mobile: 4, readability: 4, trust: 4 },
        strengths: ["Gute Informationskontrolle", "Skaliert bei mehreren Rezepten", "Sensible Daten bleiben verdeckt"],
        risks: ["Wichtige Status können eingeklappt bleiben", "Interaktion muss sehr klar sein"],
      },
    ],
  },
  {
    id: "uploadFlow",
    title: "Upload-Prozess vergleichen",
    goal: "Rezeptupload als sichere Anfrage mit Einwilligung und Mitarbeiterprüfung bewerten.",
    dataSource: "Demo-Upload, Upload-Policy, Consent-Scopes",
    recommendedVariant: "A",
    recommendation:
      "Variante A bleibt die Empfehlung: geführter Upload, klare Einwilligung und sichtbare Sicherheitsgrenze vor dem Absenden.",
    variants: [
      {
        id: "A",
        title: "Geführter Upload",
        thesis: "Kontext, Datei, Einwilligung und Zusammenfassung laufen als sichere Schrittfolge.",
        mockData: "Demo-Datei rezept-demo.pdf mit Kontext Folgeversorgung.",
        scores: { conversion: 5, clarity: 5, mobile: 5, readability: 5, trust: 5 },
        strengths: ["Sehr klarer Fortschritt", "Einwilligung wird nicht übersehen", "Gut auf kleinen Displays"],
        risks: ["Mehr Klicks als Ein-Seiten-Formular"],
      },
      {
        id: "B",
        title: "Drag-and-Drop kompakt",
        thesis: "Uploadbereich, Kontext und Einwilligung direkt auf einer Oberfläche.",
        mockData: "Demo-Datei und drei Consent-Scopes als kompakter Uploadblock.",
        scores: { conversion: 4, clarity: 3, mobile: 3, readability: 4, trust: 4 },
        strengths: ["Schnell", "Gut für Desktop", "Bekanntes Upload-Muster"],
        risks: ["Drag-and-Drop ist mobil schwach", "Einwilligung kann wie Kleingedrucktes wirken"],
      },
      {
        id: "C",
        title: "Sicherheits-Check zuerst",
        thesis: "Erst Sicherheitsversprechen und Rückrufoption, danach Upload.",
        mockData: "Demo-Sicherheitsgrenze mit Quarantäne, Mitarbeiterprüfung und Rückruf.",
        scores: { conversion: 3, clarity: 5, mobile: 4, readability: 5, trust: 5 },
        strengths: ["Maximales Vertrauen", "Gut für sensible Nutzer", "Erklärt Upload-Grenze"],
        risks: ["Kann vor dem Upload bremsen", "Mehr Text vor der eigentlichen Aktion"],
      },
    ],
  },
  {
    id: "viewportPreview",
    title: "Mobile/Tablet/Desktop Vorschau",
    goal: "Varianten kontrolliert in Gerätegrößen prüfen, ohne echte Runtime-Daten zu benötigen.",
    dataSource: "Dieselben Portal- und Request-Mockdaten in drei Viewport-Rahmen",
    recommendedVariant: "A",
    recommendation:
      "Variante A sollte der Standard-Startpunkt sein: mobile Lesbarkeit entscheidet über ältere Patienten und über die kritischsten Formflows.",
    variants: [
      {
        id: "A",
        title: "Mobile zuerst",
        thesis: "Einspaltiger 390px-Rahmen mit großen Aktionen und gestapelten Statuskarten.",
        mockData: "Demo-Rezeptstatus und Demo-Termin als mobile Vorschau.",
        scores: { conversion: 5, clarity: 5, mobile: 5, readability: 5, trust: 5 },
        strengths: ["Härtester Lesbarkeitstest", "Touch-Ziele sofort sichtbar", "Formularrisiken fallen früh auf"],
        risks: ["Desktop-Dichte wird nicht bewertet"],
      },
      {
        id: "B",
        title: "Tablet Split",
        thesis: "768px-Rahmen mit Navigation und Detailbereich nebeneinander.",
        mockData: "Demo-Portalübersicht mit Rezepten links und Verlauf rechts.",
        scores: { conversion: 4, clarity: 4, mobile: 4, readability: 4, trust: 4 },
        strengths: ["Guter Zwischenzustand", "Nützlich für Beratung vor Ort", "Zeigt erste Split-Layout-Probleme"],
        risks: ["Kann mobile Engstellen verdecken"],
      },
      {
        id: "C",
        title: "Desktop Review Board",
        thesis: "Breiter Vergleich für drei Varianten, Scores und Empfehlungen auf einen Blick.",
        mockData: "Alle Demo-Module als Review-Board mit A/B/C-Spalten.",
        scores: { conversion: 4, clarity: 4, mobile: 3, readability: 5, trust: 4 },
        strengths: ["Sehr gut für internes Design-Review", "Viele Varianten gleichzeitig sichtbar", "Empfehlungen vergleichbar"],
        risks: ["Nicht repräsentativ für Patientenmobilität", "Gefahr, mobile Probleme zu spät zu sehen"],
      },
    ],
  },
];
