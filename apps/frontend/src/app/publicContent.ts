import type { ServiceArea } from "../lib/types";

export const contact = {
  name: "saniPEP Sanitätshaus",
  address: "Charles-de-Gaulle-Str. 4, München",
  phone: "089 678048-0",
  fax: "089 678048-70",
  email: "sani@sanipep.de",
  whatsapp: "0171 4715257",
  publicHours: [
    ["Montag", "13:00 - 17:00"],
    ["Dienstag", "08:00 - 13:00"],
    ["Mittwoch", "13:00 - 17:00"],
    ["Donnerstag", "08:00 - 13:00"],
    ["Freitag", "13:00 - 17:00"],
  ],
  reachable: "Montag bis Freitag, 08:00 - 17:00",
};

export const serviceAreas: ServiceArea[] = [
  {
    id: "lymph-lipo-scar",
    title: "Lymphödem, Lipödem & Narbenkompression",
    summary: "Ruhige Beratung, Maßnahme, Verlaufskontrolle und passgenaue Kompressionsversorgung mit Terminwunsch in München.",
    route: "/lymphoedem-lipoedem-narbenkompression",
    priority: "primary",
    intent: "Termin",
    icon: "body/lymph_nodes",
    searchSignals: ["geschwollene Beine", "schwere Beine", "Kompressionsstrümpfe nach Maß"],
  },
  {
    id: "breast-prosthetics",
    title: "Brustprothetik",
    summary: "Diskrete Beratung, hochwertige Auswahl und sensible Begleitung durch den Versorgungsprozess in München.",
    route: "/brustprothetik",
    priority: "primary",
    intent: "Diskreter Termin",
    icon: "body/breasts",
    searchSignals: ["Brustprothetik", "Erstversorgung", "neue Versorgung"],
  },
  {
    id: "ortho-reha-stoma",
    title: "Bandagen, Orthesen, Reha & Stoma",
    summary: "Schnell auffindbare Versorgungsbereiche mit Rezeptupload, Rückfragekanal und klarer Weiterleitung.",
    route: "/bandagen-orthesen-reha-stoma",
    priority: "secondary",
    intent: "Rezept und Beratung",
    icon: "devices/orthotics",
    searchSignals: ["Bandage Rezept", "Orthese Knie", "Reha Hilfsmittel", "Stoma Versorgung"],
  },
  {
    id: "incontinence-care",
    title: "Inkontinenz & Pflegehilfsmittel",
    summary: "Verständlicher Fragebogen, Rezeptklärung und Bestellanfrage für wiederkehrende Versorgung.",
    route: "/inkontinenz-pflegehilfsmittel",
    priority: "automated",
    intent: "Anfrage",
    icon: "symbols/nappy_diaper",
    searchSignals: ["Inkontinenz-Bedarf", "Pflegehilfsmittel beantragen", "monatliche Lieferung"],
  },
];
