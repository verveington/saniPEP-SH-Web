import Link from "next/link";
import { ChevronRight } from "lucide-react";
<<<<<<< HEAD
import { Card, Text, View } from "reshaped";
import type { ServiceArea } from "@frontend/lib/types";
import { ButtonText } from "./common";

const serviceToneByPriority = {
  primary: "Persönliche Beratung",
  secondary: "Rezept & Versorgung",
  automated: "Wiederkehrender Bedarf",
} as const;
=======
import { Badge, Card, Text, View } from "reshaped";
import type { ServiceArea } from "@frontend/lib/types";
import { ButtonText } from "./common";
import { SharedIconBox } from "../../shared/icons/SharedIcon";
>>>>>>> origin/main

export function ServiceCard({ area }: { area: ServiceArea }) {
  return (
    <Card padding={5} className="serviceCard" attributes={{ "data-priority": area.priority }}>
      <View direction="column" gap={4}>
<<<<<<< HEAD
        <div className="serviceCardMeta">
          <span className="serviceCardRule" aria-hidden />
          <Text variant="body-2" weight="semibold">
            {serviceToneByPriority[area.priority]}
          </Text>
        </div>
=======
        <View direction="row" justify="space-between" align="center" gap={3} wrap>
          <SharedIconBox name={area.icon} />
          <Badge color={area.priority === "primary" ? "primary" : "neutral"} variant="faded">
            {area.intent}
          </Badge>
        </View>
>>>>>>> origin/main
        <View direction="column" gap={2}>
          <Text as="h3" variant="featured-5" weight="semibold">
            {area.title}
          </Text>
          <Text color="neutral-faded">{area.summary}</Text>
        </View>
      </View>
      <Link className="actionLink" href={area.route}>
        <ButtonText icon={ChevronRight}>{`Mehr zu ${area.title}`}</ButtonText>
      </Link>
    </Card>
  );
}
