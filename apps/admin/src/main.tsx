import React from "react";
import { createRoot } from "react-dom/client";
import { Lock, Shield } from "lucide-react";
import { Badge, Reshaped, Text, View } from "reshaped";
import "reshaped/bundle.css";
import "reshaped/themes/slate/theme.css";
import "../../frontend/src/styles/global.css";
import { installDesignTokens } from "../../frontend/src/lib/designTokens";
import { evaluateDevelopmentMockGate, serverAuthBoundary } from "../../shared/security/accessControl";

const gate = evaluateDevelopmentMockGate("admin");
installDesignTokens();

function AdminMockApp() {
  return (
    <section className="section">
      <div className="sectionInner gridTwo">
        <View direction="column" gap={5}>
          <span className="iconBox" aria-hidden>{gate.allowed ? <Shield /> : <Lock />}</span>
          <Text as="h1" variant="featured-1" weight="semibold">Staff Admin Mock</Text>
          <Text color="neutral-faded">
            {gate.reason} Produktiv muss diese App vor Auslieferung serverseitig für staff/admin geschützt werden.
          </Text>
          <div className={gate.allowed ? "safeRow" : "privacyNote privacyNoteCritical"}>
            <View direction="row" justify="space-between" gap={3} wrap>
              <Text weight="semibold">Rollenentscheidung</Text>
              <Badge color={gate.allowed ? "positive" : "warning"} variant="faded">{gate.role}</Badge>
            </View>
            <Text variant="body-2" color="neutral-faded">{serverAuthBoundary.productionInvariant}</Text>
          </div>
        </View>
        <div className="plainPanel">
          <View direction="column" gap={4} padding={6}>
            <Text as="h2" variant="featured-5" weight="semibold">Serverseitig vorzubereiten</Text>
            {serverAuthBoundary.requiredServerChecks.map((check) => (
              <Text variant="body-2" color="neutral-faded" key={check}>{check}</Text>
            ))}
          </View>
        </div>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Reshaped defaultTheme="slate" defaultColorMode="light">
      <AdminMockApp />
    </Reshaped>
  </React.StrictMode>,
);
