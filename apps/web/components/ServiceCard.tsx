import Link from "next/link";
import { Activity, ChevronRight, ShoppingCart } from "lucide-react";
import { Badge, Card, Text, View } from "reshaped";
import type { ServiceArea } from "@frontend/lib/types";
import { ButtonText, IconBox } from "./common";

export function ServiceCard({ area }: { area: ServiceArea }) {
  return (
    <Card padding={5} className="serviceCard" attributes={{ "data-priority": area.priority }}>
      <View direction="column" gap={4}>
        <View direction="row" justify="space-between" align="center" gap={3} wrap>
          <IconBox icon={area.priority === "automated" ? ShoppingCart : Activity} />
          <Badge color={area.priority === "primary" ? "primary" : "neutral"} variant="faded">
            {area.intent}
          </Badge>
        </View>
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
