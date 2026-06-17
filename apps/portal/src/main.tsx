import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Calendar, CheckCircle, FileText, Lock, PackageCheck, Shield, User } from "lucide-react";
import { Badge, Button, FormControl, Reshaped, Text, TextField, View } from "reshaped";
import "reshaped/bundle.css";
import "reshaped/themes/slate/theme.css";
import "../../frontend/src/styles/global.css";
import { authAdapter, portalAuthPolicy } from "../../frontend/src/lib/authAdapter";
import { installDesignTokens } from "../../shared/design/saniPepDesignTokens";
import { portalDashboard } from "../../frontend/src/lib/mockData";
import { evaluateDevelopmentMockGate, serverAuthBoundary } from "../../shared/security/accessControl";
import type { PortalAuthResult, PortalLoginInput, RequestStatus, ReviewStatus } from "../../frontend/src/lib/types";

const gate = evaluateDevelopmentMockGate("portal");
installDesignTokens();

const statusLabel: Record<RequestStatus, string> = {
  draft: "Entwurf",
  submitted: "Eingereicht",
  "employee-review": "In Prüfung",
  "omnia-prepared": "Vorbereitet",
  confirmed: "Bestätigt",
  delivery: "Lieferung",
  closed: "Geschlossen",
};

const reviewLabel: Record<ReviewStatus, string> = {
  neu: "Neu",
  in_pruefung: "In Prüfung",
  rueckfrage: "Rückfrage",
  freigegeben: "Freigegeben",
};

function GateNotice() {
  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={4}>
          <span className="iconBox" aria-hidden><Lock /></span>
          <Text as="h1" variant="featured-1" weight="semibold">Portal geschützt</Text>
          <Text color="neutral-faded">{gate.reason}</Text>
          <div className="privacyNote">
            <Shield aria-hidden />
            <Text variant="body-2">{serverAuthBoundary.productionInvariant}</Text>
          </div>
        </View>
      </div>
    </section>
  );
}

function PortalMockApp() {
  const [input, setInput] = useState<PortalLoginInput>({ email: "demo@example.test", password: "demo-passwort" });
  const [result, setResult] = useState<PortalAuthResult | null>(null);

  if (!gate.allowed) return <GateNotice />;

  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <span className="iconBox" aria-hidden><User /></span>
          <Text as="h1" variant="featured-1" weight="semibold">Kundenportal Mock</Text>
          <Text color="neutral-faded">
            Development-only Build mit Rolle {gate.role}. Produktiv muss diese App serverseitig für customer/admin geschützt werden.
          </Text>
          <div className="formPanel">
            <View direction="column" gap={4} padding={6}>
              <FormControl>
                <FormControl.Label>E-Mail</FormControl.Label>
                <TextField name="email" value={input.email} onChange={({ value }) => setInput((current) => ({ ...current, email: value }))} inputAttributes={{ type: "email" }} />
              </FormControl>
              <FormControl>
                <FormControl.Label>Passwort</FormControl.Label>
                <TextField name="password" value={input.password} onChange={({ value }) => setInput((current) => ({ ...current, password: value }))} inputAttributes={{ type: "password" }} />
              </FormControl>
              <Button color="primary" onClick={() => setResult(authAdapter.loginWithPassword(input))}>
                <span className="buttonLabel"><Lock aria-hidden />Einloggen</span>
              </Button>
              {result && (
                <div className={result.ok ? "safeRow" : "privacyNote privacyNoteCritical"} role="status">
                  <View direction="row" justify="space-between" gap={3} wrap>
                    <Text weight="semibold">{result.ok ? "Mock-Login akzeptiert" : "Mock-Login abgelehnt"}</Text>
                    <Badge color={result.ok ? "positive" : "warning"} variant="faded">{result.method}</Badge>
                  </View>
                  <Text variant="body-2" color="neutral-faded">{result.message}</Text>
                </div>
              )}
            </View>
          </div>
          {result?.ok && <PortalDashboardCards />}
        </View>
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <span className="iconBox" aria-hidden><CheckCircle /></span>
            <Text as="h2" variant="featured-5" weight="semibold">Auth-Grenze</Text>
            {[
              portalAuthPolicy.localStoragePolicy,
              `Erlaubte Rollen: ${serverAuthBoundary.requiredRoles.portal.join(", ")}`,
              "Mock-Gate ist ausdrücklich nicht produktiv.",
            ].map((item) => <Text variant="body-2" color="neutral-faded" key={item}>{item}</Text>)}
          </View>
        </div>
      </div>
    </section>
  );
}

function PortalDashboardCards() {
  return (
    <View direction="column" gap={5}>
      <View direction="column" gap={1}>
        <Text as="h2" variant="featured-4" weight="semibold">Portal-Dashboard</Text>
        <Text variant="body-2" color="neutral-faded">
          Mobile Card-Ansicht mit Status, Versorgung und Verlauf. Keine Tabellen, keine sensiblen Details in der Übersicht.
        </Text>
      </View>

      <div className="gridAuto" aria-label="Portalstatus">
        <div className="safeRow">
          <View direction="row" gap={3} align="center">
            <span className="iconBox" aria-hidden><FileText /></span>
            <View direction="column" gap={1}>
              <Text variant="body-2" color="neutral-faded">Dokumente</Text>
              <Text weight="semibold">{portalDashboard.prescriptions.length} Statuskarten</Text>
            </View>
          </View>
        </div>
        <div className="safeRow">
          <View direction="row" gap={3} align="center">
            <span className="iconBox" aria-hidden><PackageCheck /></span>
            <View direction="column" gap={1}>
              <Text variant="body-2" color="neutral-faded">Versorgung</Text>
              <Text weight="semibold">{portalDashboard.supplies.length} Demo-Einträge</Text>
            </View>
          </View>
        </div>
        <div className="safeRow">
          <View direction="row" gap={3} align="center">
            <span className="iconBox" aria-hidden><Calendar /></span>
            <View direction="column" gap={1}>
              <Text variant="body-2" color="neutral-faded">Anfragen</Text>
              <Text weight="semibold">{portalDashboard.requests.length} in der Timeline</Text>
            </View>
          </View>
        </div>
      </div>

      <View direction="column" gap={3}>
        <Text as="h3" variant="featured-6" weight="semibold">Aktuelle Anfragen</Text>
        {portalDashboard.requests.map((request) => (
          <div className="safeRow" key={request.id}>
            <View direction="row" justify="space-between" gap={3} wrap>
              <Text weight="semibold">{request.title}</Text>
              <Badge color={request.employeeReview === "freigegeben" ? "positive" : "neutral"} variant="faded">
                {reviewLabel[request.employeeReview]}
              </Badge>
            </View>
            <Text variant="body-2" color="neutral-faded">{request.publicSummary}</Text>
            <Text variant="caption-1" color="neutral-faded">
              {request.createdAt} · {statusLabel[request.status]}
            </Text>
          </div>
        ))}
      </View>
    </View>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Reshaped defaultTheme="slate" defaultColorMode="light">
      <PortalMockApp />
    </Reshaped>
  </React.StrictMode>,
);
