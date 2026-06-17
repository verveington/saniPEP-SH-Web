import { CheckCircle } from "lucide-react";
import { Text, View } from "reshaped";
import { uploadServerSecurityBoundary } from "../lib/privacySecurity";

export function SecuritySidePanel() {
  return (
    <div className="portalPanel portalTimeline">
      <View direction="column" gap={5}>
        <Text as="h2" variant="featured-5" weight="semibold">
          Sicherheitsgrenze
        </Text>
        {[
          "Öffentliche Website enthält keinen internen App-Code.",
          "Formulare erzeugen keine Requests ohne gültige Pflichtfelder.",
          "Conversion-Tracking zählt nur grobe Ziele.",
          uploadServerSecurityBoundary.productionInvariant,
        ].map((item) => (
          <div className="safeRow" key={item}>
            <CheckCircle aria-hidden size={17} />
            <Text variant="body-2">{item}</Text>
          </div>
        ))}
      </View>
    </div>
  );
}
