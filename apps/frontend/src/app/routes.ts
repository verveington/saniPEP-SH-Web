import type { ConversionStage, Route } from "../lib/types";

export type PublicRoute = Extract<
  Route,
  | "/"
  | "/hilfe-finden"
  | "/lymphoedem-lipoedem-narbenkompression"
  | "/brustprothetik"
  | "/bandagen-orthesen-reha-stoma"
  | "/inkontinenz-pflegehilfsmittel"
  | "/rezept-upload"
  | "/termin-anfragen"
  | "/kontakt"
  | "/impressum"
  | "/datenschutz"
  | "/einwilligung"
>;

export type ServicePageRoute = Extract<
  PublicRoute,
  | "/lymphoedem-lipoedem-narbenkompression"
  | "/brustprothetik"
  | "/bandagen-orthesen-reha-stoma"
>;

export type Navigate = (route: PublicRoute) => void;
export type TrackConversion = (input: { stage: ConversionStage; route: Route }) => void;

export const portalLoginHref = "/portal/login";

export const publicRoutes = new Set<PublicRoute>([
  "/",
  "/hilfe-finden",
  "/lymphoedem-lipoedem-narbenkompression",
  "/brustprothetik",
  "/bandagen-orthesen-reha-stoma",
  "/inkontinenz-pflegehilfsmittel",
  "/rezept-upload",
  "/termin-anfragen",
  "/kontakt",
  "/impressum",
  "/datenschutz",
  "/einwilligung",
]);

const servicePageRoutes = new Set<ServicePageRoute>([
  "/lymphoedem-lipoedem-narbenkompression",
  "/brustprothetik",
  "/bandagen-orthesen-reha-stoma",
]);

export const normalizePublicRoute = (pathname?: string): PublicRoute => {
  const path = (pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/")) as PublicRoute;
  return publicRoutes.has(path) ? path : "/";
};

export const isPublicRoute = (route: Route): route is PublicRoute =>
  publicRoutes.has(route as PublicRoute);

export const isServicePageRoute = (route: PublicRoute): route is ServicePageRoute =>
  servicePageRoutes.has(route as ServicePageRoute);
