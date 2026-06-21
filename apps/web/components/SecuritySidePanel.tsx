import { Text, View } from "reshaped";
import { uploadServerSecurityBoundary } from "@frontend/lib/privacySecurity";
import { SharedIcon } from "../../shared/icons/SharedIcon";

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
          "Rechtstexte und Einwilligungstexte muessen vor oeffentlichem Produktivbetrieb final freigegeben werden.",
          uploadServerSecurityBoundary.productionInvariant,
        ].map((item) => (
          <div className="safeRow" key={item}>
            <SharedIcon name="symbols/yes" decorative size={17} />
            <Text variant="body-2">{item}</Text>
          </div>
        ))}
      </View>
    </div>
  );
}
