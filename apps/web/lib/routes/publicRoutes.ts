import type { Route } from "@frontend/lib/types";

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

export const portalLoginHref = "/portal/login";

export const publicRoutes: PublicRoute[] = [
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
];

export const servicePageRoutes: ServicePageRoute[] = [
  "/lymphoedem-lipoedem-narbenkompression",
  "/brustprothetik",
  "/bandagen-orthesen-reha-stoma",
];

export const isPublicRoute = (route: Route): route is PublicRoute =>
  publicRoutes.includes(route as PublicRoute);
