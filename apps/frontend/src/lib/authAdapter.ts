import type {
  PortalActivationInput,
  PortalAuthMethod,
  PortalAuthResult,
  PortalLoginInput,
} from "./types";

export const portalAuthPolicy = {
  mvpMethods: ["one-time-password", "email-password"] satisfies PortalAuthMethod[],
  futureMethods: ["magic-link", "two-factor"] satisfies PortalAuthMethod[],
  oneTimePasswordDelivery: "Brief oder persönliches Handout",
  supportingVerification:
    "Versicherungsnummer, Nachname und Geburtsdatum dürfen nur unterstützend verwendet werden, nicht als alleiniger Login.",
  passwordRules: [
    "mindestens 10 Zeichen",
    "nicht identisch mit dem Einmalpasswort",
    "Bestätigung muss übereinstimmen",
  ],
  localStoragePolicy:
    "MVP speichert keine Auth-Tokens oder Gesundheitsdaten im LocalStorage; echte Sessions gehören in ein sicheres Backend.",
};

const demoActivationCode = "SANI-2026";

const validPassword = (password: string, oneTimePassword?: string) =>
  password.length >= 10 && password !== oneTimePassword;

export const authAdapter = {
  activatePortalAccess(input: PortalActivationInput): PortalAuthResult {
    if (input.oneTimePassword.trim().toUpperCase() !== demoActivationCode) {
      return {
        ok: false,
        method: "one-time-password",
        message: "Einmalpasswort konnte im Mock nicht verifiziert werden.",
        nextStep: "retry",
        auditLabel: "Aktivierung fehlgeschlagen",
      };
    }

    if (!validPassword(input.newPassword, input.oneTimePassword)) {
      return {
        ok: false,
        method: "one-time-password",
        message: "Bitte ein neues Passwort mit mindestens 10 Zeichen verwenden.",
        nextStep: "set-password",
        auditLabel: "Passwortregel nicht erfüllt",
      };
    }

    if (input.newPassword !== input.confirmPassword) {
      return {
        ok: false,
        method: "one-time-password",
        message: "Passwort und Bestätigung stimmen nicht überein.",
        nextStep: "set-password",
        auditLabel: "Passwortbestätigung fehlgeschlagen",
      };
    }

    return {
      ok: true,
      method: "one-time-password",
      customerId: "CUS-MOCK-1007",
      message:
        "Portal aktiviert. Das Einmalpasswort ist verbraucht; der nächste Login erfolgt mit E-Mail und Passwort.",
      nextStep: "enter-portal",
      auditLabel: "Portal per Einmalpasswort aktiviert",
    };
  },

  loginWithPassword(input: PortalLoginInput): PortalAuthResult {
    if (!input.email.includes("@") || input.password.length < 6) {
      return {
        ok: false,
        method: "email-password",
        message: "E-Mail oder Passwort wirken im Mock unvollständig.",
        nextStep: "retry",
        auditLabel: "Login fehlgeschlagen",
      };
    }

    return {
      ok: true,
      method: "email-password",
      customerId: "CUS-MOCK-1007",
      message: "Login erfolgreich. Portalstatus wird read-mostly angezeigt.",
      nextStep: "enter-portal",
      auditLabel: "Portal-Login erfolgreich",
    };
  },
};
