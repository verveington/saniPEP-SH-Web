export const verifiedContact = {
  name: "saniPEP Sanitätshaus",
  streetAddress: "Charles-de-Gaulle-Str. 4",
  postalCode: "81737",
  locality: "München",
  phone: "089 678048-0",
  fax: "089 678048-70",
  email: "sani@sanipep.de",
  whatsapp: "0171 4715257",
  reachable: "Montag bis Freitag, 08:00 - 17:00",
  publicHours: [
    ["Montag", "13:00 - 17:00"],
    ["Dienstag", "08:00 - 13:00"],
    ["Mittwoch", "13:00 - 17:00"],
    ["Donnerstag", "08:00 - 13:00"],
    ["Freitag", "13:00 - 17:00"],
  ],
  serviceHoursEffectiveFrom: "02.03.2026",
} as const;

export const verifiedAddress = `${verifiedContact.streetAddress}, ${verifiedContact.postalCode} ${verifiedContact.locality}`;
