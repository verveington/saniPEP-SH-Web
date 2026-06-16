import type { Route, SearchCategory, SearchIntentResult } from "./types";

type SearchEntry = Omit<SearchIntentResult, "score">;

const categoryBoost: Record<SearchCategory, number> = {
  symptom: 300,
  product: 200,
  situation: 100,
};

export const patientSearchIndex: SearchEntry[] = [
  {
    id: "symptom-heavy-legs",
    category: "symptom",
    term: "geschwollene Beine",
    title: "Geschwollene oder schwere Beine",
    summary: "Passt häufig zu Lymphödem, Lipödem oder Kompressionsbedarf. Empfehlung: qualifizierten Beratungstermin anfragen.",
    recommendedRoute: "/lymphoedem-lipoedem-narbenkompression",
    primaryAction: "appointment",
    relatedTerms: ["schwere Beine", "Lymphödem Versorgung", "Lipödem Schmerzen", "Kompressionsstrümpfe nach Maß"],
    priority: 1,
  },
  {
    id: "symptom-lipoedema-pain",
    category: "symptom",
    term: "Lipödem Schmerzen",
    title: "Lipödem-Schmerzen und Alltagseinschränkung",
    summary: "Premium-Erstberatung mit Fragebogen, Rezeptlage und Terminwunsch.",
    recommendedRoute: "/termin-anfragen",
    primaryAction: "appointment",
    relatedTerms: ["schwere Beine", "Druckschmerz", "Flachstrick-Kompression", "Erstberatung"],
    priority: 1,
  },
  {
    id: "symptom-post-surgery",
    category: "symptom",
    term: "Brustprothese nach Brustkrebs",
    title: "Beratung nach Brustoperation",
    summary: "Diskrete Brustprothetik-Beratung mit geschützter Terminanfrage.",
    recommendedRoute: "/brustprothetik",
    primaryAction: "appointment",
    relatedTerms: ["Erstversorgung", "Brustprothetik", "neue Versorgung", "Rückrufwunsch"],
    priority: 1,
  },
  {
    id: "product-flat-knit",
    category: "product",
    term: "Kompressionsstrümpfe nach Maß",
    title: "Flachstrick- und Maßkompression",
    summary: "Maßnahme, Rezeptupload und Kontrolltermin werden als Fachprozess geführt.",
    recommendedRoute: "/lymphoedem-lipoedem-narbenkompression",
    primaryAction: "upload",
    relatedTerms: ["Flachstrick-Kompression", "Narbenkompression", "Lymphödem", "Rezept erhalten"],
    priority: 2,
  },
  {
    id: "product-care-aids",
    category: "product",
    term: "Pflegehilfsmittel beantragen",
    title: "Pflegehilfsmittel-Pauschale",
    summary: "Automatisierter Fragebogen mit Rezept-/Anspruchsklärung und prüfbarer Bestellanfrage.",
    recommendedRoute: "/inkontinenz-pflege",
    primaryAction: "configure",
    relatedTerms: ["Pflegebox", "monatliche Lieferung", "Bestellanfrage", "Kundenportal"],
    priority: 2,
  },
  {
    id: "product-incontinence",
    category: "product",
    term: "Inkontinenz-Bedarf",
    title: "Inkontinenzversorgung",
    summary: "Bedarf konfigurieren, Rezeptlage klären und wiederkehrende Versorgung als Request starten.",
    recommendedRoute: "/inkontinenz-pflege",
    primaryAction: "configure",
    relatedTerms: ["monatliche Versorgung", "Dauerversorgung", "Rezeptupload", "Bestellanfrage"],
    priority: 2,
  },
  {
    id: "situation-prescription",
    category: "situation",
    term: "Rezept erhalten",
    title: "Ich habe ein Rezept",
    summary: "Rezept sicher hochladen und den passenden Mitarbeiter-Request erzeugen.",
    recommendedRoute: "/rezept-hochladen",
    primaryAction: "upload",
    relatedTerms: ["Verordnung", "Rezeptupload", "neue Versorgung", "Status prüfen"],
    priority: 3,
  },
  {
    id: "situation-existing-customer",
    category: "situation",
    term: "Ich bin bereits Kunde",
    title: "Status, Rezeptablauf oder Wiederbestellung prüfen",
    summary: "Im Portal Status ansehen, Rezept erneuern oder eine prüfbare Bestellanfrage stellen.",
    recommendedRoute: "/portal/login",
    primaryAction: "portal",
    relatedTerms: ["Kundenportal", "Dauerversorgung", "Bestellstatus", "Rezeptablauf"],
    priority: 3,
  },
  {
    id: "situation-written-question",
    category: "situation",
    term: "schriftliche Anfrage",
    title: "Ich möchte saniPEP schreiben",
    summary: "Schriftliche Anfrage an den passenden Fachbereich senden, ohne direkte Omnia-Änderung.",
    recommendedRoute: "/kontakt",
    primaryAction: "inquiry",
    relatedTerms: ["Rückfrage", "Kontaktformular", "Rückrufwunsch", "Nachricht"],
    priority: 3,
  },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreEntry = (entry: SearchEntry, query: string): number => {
  if (!query) return categoryBoost[entry.category] - entry.priority;

  const normalizedTerm = normalize(entry.term);
  const normalizedTitle = normalize(entry.title);
  const normalizedSummary = normalize(entry.summary);
  const normalizedRelated = entry.relatedTerms.map(normalize);
  const tokens = normalize(query).split(" ").filter(Boolean);

  const tokenScore = tokens.reduce((score, token) => {
    if (normalizedTerm.includes(token)) return score + 80;
    if (normalizedTitle.includes(token)) return score + 60;
    if (normalizedRelated.some((term) => term.includes(token))) return score + 45;
    if (normalizedSummary.includes(token)) return score + 20;
    return score;
  }, 0);

  const exactScore = normalizedTerm === normalize(query) ? 100 : 0;
  return categoryBoost[entry.category] + tokenScore + exactScore - entry.priority;
};

export const searchPatientIntent = (query: string): SearchIntentResult[] =>
  patientSearchIndex
    .map((entry) => ({ ...entry, score: scoreEntry(entry, query) }))
    .filter((entry) => !query.trim() || entry.score > categoryBoost[entry.category] - entry.priority)
    .sort((a, b) => b.score - a.score || a.priority - b.priority || a.title.localeCompare(b.title))
    .slice(0, 8);

export const categoryLabel: Record<SearchCategory, string> = {
  symptom: "Symptom",
  product: "Produkt",
  situation: "Situation",
};

export const primaryActionLabel: Record<SearchIntentResult["primaryAction"], string> = {
  appointment: "Termin anfragen",
  upload: "Rezept hochladen",
  configure: "Konfigurator starten",
  portal: "Portal öffnen",
  inquiry: "Anfrage schreiben",
};

export const fallbackRouteByAction: Record<SearchIntentResult["primaryAction"], Route> = {
  appointment: "/termin-anfragen",
  upload: "/rezept-hochladen",
  configure: "/inkontinenz-pflege",
  portal: "/portal/login",
  inquiry: "/kontakt",
};
