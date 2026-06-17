import { getRouteMetadata } from "./seo";
import type {
  ConversionEvent,
  ConversionGoal,
  ConversionSummary,
  ConversionStage,
  Route,
} from "./types";

type CreateConversionEventInput = {
  stage: ConversionStage;
  route: Route;
};

export const conversionPrivacyBoundary =
  "Nur Route, grobes Conversion-Ziel und Stage. Keine Namen, Dateien, Diagnosen, Fachbereiche, Freitexte, Omnia-IDs oder Browser-Persistenz.";

const timestamp = (offsetMinutes = 0) =>
  new Date(Date.UTC(2026, 5, 16, 8, offsetMinutes, 0)).toISOString();

export const seedConversionEvents: ConversionEvent[] = [
  {
    id: "CV-1001",
    stage: "route-view",
    goal: "appointment",
    at: timestamp(4),
    source: "public-website",
  },
  {
    id: "CV-1002",
    stage: "cta-click",
    goal: "appointment",
    at: timestamp(7),
    source: "public-website",
  },
  {
    id: "CV-1003",
    stage: "request-submitted",
    goal: "appointment",
    at: timestamp(12),
    source: "public-website",
  },
  {
    id: "CV-1004",
    stage: "request-submitted",
    goal: "upload",
    at: timestamp(18),
    source: "public-website",
  },
  {
    id: "CV-1005",
    stage: "request-submitted",
    goal: "contact",
    at: timestamp(25),
    source: "public-website",
  },
  {
    id: "CV-1006",
    stage: "request-submitted",
    goal: "contact",
    at: timestamp(32),
    source: "public-website",
  },
];

export const createConversionEvent = (
  input: CreateConversionEventInput,
  sequence: number,
): ConversionEvent => {
  const metadata = getRouteMetadata(input.route);

  return {
    id: `CV-MOCK-${String(sequence).padStart(4, "0")}`,
    stage: input.stage,
    goal: metadata.primaryConversion,
    at: new Date().toISOString(),
    source: "public-website",
  };
};

const countBy = <T extends string>(values: T[]) =>
  values.reduce<Record<T, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {} as Record<T, number>);

export const summarizeConversionEvents = (events: ConversionEvent[]): ConversionSummary => {
  const goals = countBy(events.map((event) => event.goal));
  const stages = countBy(events.map((event) => event.stage));

  const byGoal = Object.entries(goals)
    .map(([goal, count]) => ({ goal: goal as ConversionGoal, count }))
    .sort((a, b) => b.count - a.count || a.goal.localeCompare(b.goal));

  const byStage = Object.entries(stages)
    .map(([stage, count]) => ({ stage: stage as ConversionStage, count }))
    .sort((a, b) => b.count - a.count || a.stage.localeCompare(b.stage));

  return {
    total: events.length,
    byGoal,
    byStage,
    requestSubmissions: events.filter((event) => event.stage === "request-submitted").length,
    privacyBoundary: conversionPrivacyBoundary,
  };
};

export const conversionGoalLabel: Record<ConversionGoal, string> = {
  appointment: "Termine",
  upload: "Uploads",
  contact: "Kontakt",
  portal_login: "Portal-Login",
};

export const conversionStageLabel: Record<ConversionStage, string> = {
  "route-view": "Seitenaufruf",
  "cta-click": "CTA-Klick",
  "form-start": "Formularstart",
  "request-submitted": "Request erzeugt",
};
